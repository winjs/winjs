// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function templateCompilerInit(global) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    var strings = {
        get attributeBindingSingleProperty() { return WinJS.Resources._getWinJSString("base/attributeBindingSingleProperty").value; },
        get cannotBindToThis() { return WinJS.Resources._getWinJSString("base/cannotBindToThis").value; },
        get idBindingNotSupported() { return WinJS.Resources._getWinJSString("base/idBindingNotSupported").value; },
    };

    WinJS.Namespace.define("WinJS.Binding", {
        _TemplateCompiler: WinJS.Namespace._lazy(function () {

            var Signal = WinJS._Signal;
            var Promise = WinJS.Promise;
            var cancelBlocker = Promise._cancelBlocker;

            // Eagerly bind to stuff that will be needed by the compiler
            //
            var init_defaultBind = WinJS.Binding.defaultBind;
            var init_oneTime = WinJS.Binding.oneTime;
            var init_setAttribute = WinJS.Binding.setAttribute;
            var init_setAttributeOneTime = WinJS.Binding.setAttributeOneTime;
            var init_addClassOneTime = WinJS.Binding.addClassOneTime;
            var binding_as = WinJS.Binding.as;
            var promise_as = WinJS.Promise.as;
            var supportedForProcessing = WinJS.Utilities.supportedForProcessing;
            var requireSupportedForProcessing = WinJS.Utilities.requireSupportedForProcessing;
            var insertAdjacentHTMLUnsafe = WinJS.Utilities.insertAdjacentHTMLUnsafe;
            var utilities_data = WinJS.Utilities.data;
            var markDisposable = WinJS.Utilities.markDisposable;
            var ui_processAll = WinJS.UI.processAll;
            var binding_processAll = WinJS.Binding.processAll;
            var options_parser = WinJS.UI._optionsParser;
            var CallExpression = WinJS.UI._CallExpression;
            var IdentifierExpression = WinJS.UI._IdentifierExpression;
            var binding_parser = WinJS.Binding._bindingParser2;
            var scopedSelect = WinJS.UI.scopedSelect;
            var writeProfilerMark = WinJS.Utilities._writeProfilerMark;

            // Runtime helper functions
            //
            function disposeInstance(container, workPromise, renderCompletePromise) {
                var bindings = WinJS.Utilities.data(container).bindTokens;
                if (bindings) {
                    bindings.forEach(function (binding) {
                        if (binding && binding.cancel) {
                            binding.cancel();
                        }
                    });
                }
                if (workPromise) {
                    workPromise.cancel();
                }
                if (renderCompletePromise) {
                    renderCompletePromise.cancel();
                }
            }
            function delayedBindingProcessing(data, defaultInitializer) {
                return function (element) {
                    return WinJS.Binding.processAll(element, data, false, null, defaultInitializer);
                }
            }

            function targetSecurityCheck(value) {
                value = requireSupportedForProcessing(value);
                return value instanceof Node ? null : value;
            }

            // Compiler formatting functions
            //
            var identifierRegEx = /^[A-Za-z]\w*$/;
            var identifierCharacterRegEx = /[^A-Za-z\w$]/g;
            var encodeHtmlRegEx = /[&<>'"]/g;
            var encodeHtmlEscapeMap = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            };
            var formatRegEx = /({{)|(}})|{(\w+)}|({)|(})/g;
            var semiColonOnlyLineRegEx = /^\s*;\s*$/;
            var capitalRegEx = /[A-Z]/g;

            function format(string, parts) {
                var multiline = string.indexOf("\n") !== -1;
                var args = arguments;
                //
                // This allows you to format a string like: "hello{there}you{0} {{encased in curlies}}" and will 
                //  replace the holes {there} and {0} while turning the {{ and }} into single curlies.
                //
                // If the replacement is a number then it is inferred to be off of arguments, otherwise it is
                //  a member on parts.
                //
                // If the replacement is a multiline string and the hole is indented then the entirety of the
                //  replacement will have the same indentation as the hole.
                //
                var result = string.replace(formatRegEx, function (unused, left, right, part, illegalLeft, illegalRight, replacementIndex) {
                    if (illegalLeft || illegalRight) {
                        throw new WinJS.ErrorFromName(
                            "Format:MalformedInputString",
                            "Did you forget to escape a: " + (illegalLeft || illegalRight) + " at: " + replacementIndex);
                    }
                    if (left) { return "{"; }
                    if (right) { return "}"; }
                    var result;
                    var index = +part;
                    if (index === +index) {
                        result = args[index + 1];
                    } else {
                        result = parts[part];
                    }
                    if (result === undefined) {
                        throw new WinJS.ErrorFromName(
                            "Format:MissingPart",
                            "Missing part '" + part + "'"
                        );
                    }
                    if (multiline) {
                        var pos = replacementIndex;
                        while (pos > 0 && string[--pos] === " ") { /* empty */ }
                        if (pos >= 0 && string[pos] === "\n") {
                            result = indent(replacementIndex - pos - 1, result);
                        }
                    }
                    return result;
                });
                return result;
            }
            function indent(numberOfSpaces, multilineStringToBeIndented) {
                var indent = "";
                for (var i = 0; i < numberOfSpaces; i++) { indent += " "; }
                return multilineStringToBeIndented.split("\n").map(function (line, index) { return index ? indent + line : line; }).join("\n");
            }
            function trim(s) {
                return s.trim();
            }
            function statements(array) {
                return array.join(";\n");
            }
            function declarationList(array) {
                return array.join(", ") || "empty";
            }
            function identifierAccessExpression(parts) {
                return parts.map(function (part) {
                    // If this can be a member access optimize to that instead of a string lookup
                    //
                    if (part.match(identifierRegEx)) { return "." + part; }
                    if (+part === part) { return format("[{0}]", part); }
                    return format("[{0}]", literal(part));
                }).join("");
            }
            function nullableFilteredIdentifierAccessExpression(initial, parts, temporary, filter) {
                //
                //  generates: "(t = initial) && filter(t = t.p0) && filter(t = t.p1) && t"
                //
                // There are a number of contexts in which we will be derefernceing developer provided
                //  identifier access expressions, in those case we don't know whether or not the target
                //  property exists or in fact if anything exists along the path.
                // 
                // In order to provide 'correct' behavior we dereference conditionally on whether 
                //  we have a non-null value. This results in returning undefined unless the entire
                //  path is defined.
                //
                // In these cases we also want to filter the result for security purposes.
                //
                var parts = parts.map(function (part) {
                    // If this can be a member access optimize to that instead of a string lookup
                    //
                    if (part.match(identifierRegEx)) { return "." + part; }
                    if (+part === part) { part = +part; }
                    return brackets(literal(part));
                }).map(function (part) {
                    return format("{filter}({temp} = {temp}{part})", {
                        filter: filter,
                        temp: temporary,
                        part: part
                    });
                });
                parts.unshift(parens(assignment(temporary, initial)));
                parts.push(temporary);
                return parens(parts.join(" && "));
            }
            function literal(instance) {
                return JSON.stringify(instance);
            }
            function newArray(N) {
                return N ? "new Array(" + (+N) + ")" : "[]";
            }
            function assignment(target, source) {
                return "" + target + " = " + source;
            }
            function parens(expression) {
                return "(" + expression + ")";
            }
            function brackets(expression) {
                return "[" + expression + "]";
            }
            function propertyName(name) {
                if (name.match(identifierRegEx)) { return name; }
                if (+name === name) { return +name; }
                return literal(name);
            }
            function htmlEscape(str) {
                str = "" + str;
                return str.replace(encodeHtmlRegEx, function (m) {
                    return encodeHtmlEscapeMap[m] || " ";
                });
            }
            function createIdentifier(prefix, count, suffix) {
                if (suffix) {
                    return new String("" + prefix + count + "_" + suffix);
                } else {
                    return new String("" + prefix + count);
                }
            }
            function multiline(str) {
                return str.replace(/\\n/g, "\\n\\\n");
            }

            // Compiler helper functions
            //
            function keys(object) {
                return Object.keys(object);
            }
            function values(object) {
                return Object.keys(object).map(function (key) { return object[key]; });
            }
            function merge(a, b) {
                return mergeAll([a, b]);
            }
            function mergeAll(list) {
                var o = {};
                for (var i = 0, len = list.length; i < len; i++) {
                    var part = list[i];
                    var keys = Object.keys(part);
                    for (var j = 0, len2 = keys.length; j < len2; j++) {
                        var key = keys[j];
                        o[key] = part[key];
                    }
                }
                return o;
            }
            function globalLookup(parts) {
                return parts.reduce(
                    function (current, name) {
                        if (current) {
                            return requireSupportedForProcessing(current[name]);
                        }
                        return null;
                    },
                    global
                );
            }
            function visit(node, key, pre, post?) {
                var children = node.children;
                if (children) {
                    var keys = Object.keys(children);
                    (key && pre) && pre(node, key, keys.length);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        var childKey = keys[i];
                        var child = children[childKey];
                        visit(child, childKey, pre, post);
                    }
                    (key && post) && post(node, key, Object.keys(children).length);
                } else {
                    (key && pre) && pre(node, key, 0);
                    (key && post) && post(node, key, 0);
                }
            }

            // Compiler helper types
            //
            var TreeCSE = WinJS.Class.define(function (compiler, name, kind, accessExpression, filter?) {

                var that = this;
                this.compiler = compiler;
                this.kind = kind;
                this.base = new String(name);
                this.tree = {
                    children: {},
                    parent: this.base,
                    reference: function () { return that.base; }
                };
                this.accessExpression = accessExpression;
                this.filter = filter || "";

            }, {

                createPathExpression: function (path, name) {

                    if (path.length) {
                        var that = this;
                        var tail = path.reduce(
                            function (node, part) {
                                node.children = node.children || {};
                                node.children[part] = node.children[part] || { parent: node };
                                return node.children[part];
                            },
                            this.tree
                        );
                        tail.name = tail.name || that.compiler.defineInstance(
                            that.kind,
                            name || "",
                            function () {
                                return that.accessExpression(
                                    /*l*/tail.parent.name ? tail.parent.name : tail.parent.reference(),
                                    /*r*/path.slice(-1)[0],
                                    /*root*/tail.parent.parent === that.base,
                                    /*filter*/that.filter,
                                    /*last*/true
                                );
                            }
                        );
                        return tail.name;
                    } else {
                        return this.base;
                    }

                },

                lower: function () {

                    var that = this;
                    var aggregatedName = [];
                    var reference = function (node, name, last) {
                        return that.accessExpression(
                            /*l*/node.parent.name ? node.parent.name : node.parent.reference(),
                            /*r*/name,
                            /*root*/node.parent.parent === that.base,
                            /*filter*/that.filter,
                            /*last*/last
                        );
                    };

                    // Ensure that all shared internal nodes have names and that all nodes
                    //  know who they reference
                    //
                    visit(this.tree, "",
                        function pre(node, key, childCount) {
                            aggregatedName.push(key);

                            if (childCount > 1) {
                                node.name = node.name || that.compiler.defineInstance(
                                    that.kind,
                                    aggregatedName.join("_"),
                                    reference.bind(null, node, key, true)
                                );
                                node.reference = function () { return node.name; };
                            } else if (childCount === 1) {
                                node.reference = reference.bind(null, node, key);
                            }
                        },
                        function post(node, key, childCount) {
                            aggregatedName.pop();
                        }
                    );

                },

                deadNodeElimination: function () {

                    // Kill all dead nodes from the tree 
                    //
                    visit(this.tree, "", null, function post(node, key, childCount) {
                        if (!node.name || node.name.dead) {
                            if (childCount === 0) {
                                if (node.parent && node.parent.children) {
                                    delete node.parent.children[key];
                                }
                            }
                        }
                    });

                },

                definitions: function () {

                    var nodes = [];

                    // Gather the nodes in a depth first ordering, any node which has a name
                    //  needs to have a definition generated
                    //
                    visit(this.tree, "", function pre(node, key) {
                        if (node.name) {
                            nodes.push(node);
                        }
                    });

                    return nodes.map(function (n) { return n.name.definition(); });

                },

            });

            var InstanceKind = {
                "capture": "capture",
                "temporary": "temporary",
                "variable": "variable",
                "data": "data",
                "global": "global",
            };
            var InstanceKindPrefixes = {
                "capture": "c",
                "temporary": "t",
                "variable": "iv",
                "data": "d",
                "global": "g",
            };

            var StaticKind = {
                "import": "import",
                "variable": "variable",
            };
            var StaticKindPrefixes = {
                "import": "i",
                "variable": "sv",
            };

            var BindingKind = {
                "tree": "tree",
                "text": "text",
                "initializer": "initializer",
                "template": "template",
                "error": "error",
            };

            var TextBindingKind = {
                "attribute": "attribute",
                "booleanAttribute": "booleanAttribute",
                "inlineStyle": "inlineStyle",
                "textContent": "textContent",
            };

            // Constants
            //
            var IMPORTS_ARG_NAME = "imports";

            var Stage = {
                initial: 0,
                analyze: 1,
                optimze: 2,
                lower: 3,
                compile: 4,
                link: 5,
                done: 6,
            };

            // Compiler
            //
            var TemplateCompiler = WinJS.Class.define(function (templateElement, options) {
                this._stage = Stage.initial;
                this._staticVariables = {};
                this._staticVariablesCount = 0;
                this._instanceVariables = {};
                this._instanceVariablesCount = {};
                this._debugBreak = options.debugBreakOnRender;
                this._defaultInitializer = requireSupportedForProcessing(options.defaultInitializer || init_defaultBind);
                this._optimizeTextBindings = !options.disableTextBindingOptimization;
                this._templateElement = templateElement;
                this._templateContent = document.createElement(templateElement.tagName);
                this._extractChild = options.extractChild || false;
                this._controls = null;
                this._bindings = null;
                this._bindTokens = null;
                this._textBindingPrefix = null;
                this._textBindingId = 0;
                this._suffix = [];
                this._htmlProcessors = [];
                this._profilerMarkIdentifier = options.profilerMarkIdentifier;
                this._captureCSE = new TreeCSE(this, "container", InstanceKind.capture, this.generateElementCaptureAccess.bind(this));
                this._dataCSE = new TreeCSE(this, "data", InstanceKind.data, this.generateNormalAccess.bind(this), this.importSafe("dataSecurityCheck", requireSupportedForProcessing));
                this._globalCSE = new TreeCSE(this, this.importSafe("global", global), InstanceKind.global, this.generateNormalAccess.bind(this), this.importSafe("globalSecurityCheck", requireSupportedForProcessing));

                // Clone the template content and import it into its own HTML document for further processing
                WinJS.UI.Fragments.renderCopy(this._templateElement, this._templateContent);

                // If we are extracting the first child we only bother compiling the one child
                if (this._extractChild) {
                    while (this._templateContent.childElementCount > 1) {
                        this._templateContent.removeChild(this._templateContent.lastElementChild);
                    }
                }
            }, {

                addClassOneTimeTextBinding: function (binding) {
                    var that = this;
                    var id = this.createTextBindingHole(binding.elementCapture.element.tagName, "class", ++this._textBindingId);
                    binding.textBindingId = id;
                    binding.kind = BindingKind.text;
                    binding.elementCapture.element.classList.add(id);
                    binding.elementCapture.refCount--;
                    binding.definition = function () {
                        return that.formatCode("{htmlEscape}({value})", {
                            htmlEscape: that._staticVariables.htmlEscape,
                            value: binding.value(),
                        });
                    };
                },

                addClassOneTimeTreeBinding: function (binding) {

                    var that = this;
                    binding.pathExpression = this.bindingExpression(binding);
                    binding.value = function () {
                        return binding.pathExpression;
                    };
                    binding.kind = BindingKind.tree;
                    binding.definition = function () {
                        return that.formatCode("{element}.classList.add({value})", {
                            element: binding.elementCapture,
                            value: binding.value(),
                        });
                    };

                },

                analyze: function () {

                    if (this._stage > Stage.analyze) {
                        throw "Illegal: once we have moved past analyze we cannot revist it";
                    }
                    this._stage = Stage.analyze;

                    // find activatable and bound elements
                    this._controls = this.gatherControls();
                    this._bindings = this.gatherBindings();
                    this._children = this.gatherChildren();

                    // remove attributes which are no longer needed since we will inline bindings and controls
                    this.cleanControlAndBindingAttributes();

                    if (this.async) {
                        this.createAsyncParts();
                    }

                    this.nullableIdentifierAccessTemporary = this.defineInstance(InstanceKind.temporary);

                    // snapshot html
                    var html = this._templateContent.innerHTML;
                    this._html = function () { return multiline(literal(html)); };
                    this._html.text = html;

                },

                bindingExpression: function (binding) {

                    return this._dataCSE.createPathExpression(binding.source, binding.source.join("_"));

                },

                capture: function (element) {

                    var capture = element.capture;
                    if (capture) {
                        capture.refCount++;
                        return capture;
                    }

                    // Find the path to the captured element
                    //
                    var path = [element];
                    var e = element.parentNode;
                    var name = element.tagName;
                    while (e !== this._templateContent) {
                        name = e.tagName + "_" + name;
                        path.unshift(e);
                        e = e.parentNode;
                    }
                    // Identify which child each path member is so we can form an indexed lookup
                    //
                    for (var i = 0, len = path.length; i < len; i++) {
                        var child = path[i];
                        path[i] = Array.prototype.indexOf.call(e.children, child);
                        e = child;
                    }
                    // Create the capture and put it on the 
                    //
                    capture = this._captureCSE.createPathExpression(path, name.toLowerCase());
                    capture.element = element;
                    capture.element.capture = capture;
                    capture.refCount = 1;
                    return capture;

                },

                cleanControlAndBindingAttributes: function () {
                    var selector = "[data-win-bind],[data-win-control]";
                    var elements = this._templateContent.querySelectorAll(selector);
                    for (var i = 0, len = elements.length; i < len; i++) {
                        var element = elements[i];
                        if (element.isDeclarativeControlContainer) {
                            i += element.querySelectorAll("[data-win-bind],[data-win-control]").length;
                        }
                        element.removeAttribute("data-win-bind");
                        element.removeAttribute("data-win-control");
                        element.removeAttribute("data-win-options");
                    }
                },

                compile: function (bodyTemplate, replacements, supportDelayBindings) {

                    if (this._stage > Stage.compile) {
                        throw "Illegal: once we have moved past compile we cannot revist it";
                    }
                    this._stage = Stage.compile;

                    var that = this;

                    this._returnedElement = this._extractChild ? "container.firstElementChild" : "container";

                    var control_processing = this._controls.map(function (control) {
                        var constructionFormatString;
                        if (control.async) {
                            constructionFormatString = "{target}.winControl = {target}.winControl || new {SafeConstructor}({target}, {options}, controlDone)";
                        } else {
                            constructionFormatString = "{target}.winControl = {target}.winControl || new {SafeConstructor}({target}, {options})";
                        }
                        var construction = that.formatCode(
                            constructionFormatString,
                            {
                                target: control.elementCapture,
                                SafeConstructor: control.SafeConstructor,
                                options: that.generateOptionsLiteral(control.optionsParsed, control.elementCapture),
                            }
                        );
                        if (control.isDeclarativeControlContainer && typeof control.isDeclarativeControlContainer.import === "function") {
                            var result = [construction];
                            result.push(that.formatCode(
                                "{isDeclarativeControlContainer}({target}.winControl, {delayedControlProcessing})",
                                {
                                    target: control.elementCapture,
                                    isDeclarativeControlContainer: control.isDeclarativeControlContainer,
                                    delayedControlProcessing: that._staticVariables.ui_processAll
                                }
                            ));
                            result.push(that.formatCode(
                                "{isDeclarativeControlContainer}({target}.winControl, {delayedBindingProcessing}(data, {templateDefaultInitializer}))",
                                {
                                    target: control.elementCapture,
                                    isDeclarativeControlContainer: control.isDeclarativeControlContainer,
                                    delayedBindingProcessing: that._staticVariables.delayedBindingProcessing,
                                    templateDefaultInitializer: that._staticVariables.templateDefaultInitializer || literal(null),
                                }
                            ));
                            return result.join(";\n");
                        } else {
                            return construction;
                        }
                    });

                    var all_binding_processing = this._bindings.map(function (binding) {
                        switch (binding.kind) {
                            case BindingKind.template:
                                return that.formatCode(
                                    "({nestedTemplates}[{nestedTemplate}] = {template}.render({path}, {dest}))",
                                    {
                                        nestedTemplates: that._nestedTemplates,
                                        nestedTemplate: literal(binding.nestedTemplate),
                                        template: binding.template,
                                        path: binding.pathExpression,
                                        dest: binding.elementCapture,
                                    }
                                );

                            case BindingKind.initializer:
                                var formatString;
                                if (binding.initialValue) {
                                    formatString = "({bindTokens}[{bindToken}] = {initializer}(data, {sourceProperties}, {dest}, {destProperties}, {initialValue}))";
                                } else {
                                    formatString = "({bindTokens}[{bindToken}] = {initializer}(data, {sourceProperties}, {dest}, {destProperties}))";
                                }
                                return that.formatCode(
                                    formatString,
                                    {
                                        bindTokens: that._bindTokens,
                                        bindToken: literal(binding.bindToken),
                                        initializer: binding.initializer,
                                        sourceProperties: literal(binding.source),
                                        destProperties: literal(binding.destination),
                                        dest: binding.elementCapture,
                                        initialValue: binding.initialValue,
                                    }
                                );

                            case BindingKind.tree:
                                return binding.definition();

                            case BindingKind.text:
                                // do nothing, text bindings are taken care of seperately
                                break;

                            case BindingKind.error:
                                // do nothing, errors are reported and ignored
                                break;

                            default:
                                throw "NYI";
                        }
                    });
                    var binding_processing, delayed_binding_processing;
                    if (supportDelayBindings) {
                        binding_processing = all_binding_processing.filter(function (unused, index) {
                            return !that._bindings[index].delayable;
                        });
                        delayed_binding_processing = all_binding_processing.filter(function (unused, index) {
                            return that._bindings[index].delayable;
                        });
                    } else {
                        binding_processing = all_binding_processing;
                        delayed_binding_processing = [];
                    }

                    var instances = values(this._instanceVariables);

                    var instanceDefinitions = instances
                        .filter(function (instance) { return instance.kind === InstanceKind.variable; })
                        .map(function (variable) { return variable.definition(); });

                    var captures = this._captureCSE.definitions();
                    var globals = this._globalCSE.definitions();
                    var data = this._dataCSE.definitions();

                    var set_msParentSelectorScope = this._children.map(function (child) {
                        return that.formatCodeN("{0}.msParentSelectorScope = true", child);
                    });
                    var suffix = this._suffix.map(function (statement) {
                        return statement();
                    });

                    var renderComplete = "";
                    if (supportDelayBindings && delayed_binding_processing.length) {
                        renderComplete = that.formatCode(
                            renderItemImplRenderCompleteTemplate,
                            {
                                delayed_binding_processing: statements(delayed_binding_processing)
                            }
                        );
                    }

                    var result = that.formatCode(
                        bodyTemplate,
                        mergeAll([
                            this._staticVariables,
                            replacements || {},
                            {
                                profilerMarkIdentifierStart: literal("WinJS.Binding.Template:render" + this._profilerMarkIdentifier + ",StartTM"),
                                profilerMarkIdentifierStop: literal("WinJS.Binding.Template:render" + this._profilerMarkIdentifier + ",StopTM"),
                                html: this._html(),
                                tagName: literal(this._templateElement.tagName),
                                instance_variable_declarations: declarationList(instances),
                                global_definitions: statements(globals),
                                data_definitions: statements(data),
                                instance_variable_definitions: statements(instanceDefinitions),
                                capture_definitions: statements(captures),
                                set_msParentSelectorScope: statements(set_msParentSelectorScope),
                                debug_break: this.generateDebugBreak(),
                                control_processing: statements(control_processing),
                                control_counter: this._controlCounter,
                                binding_processing: statements(binding_processing),
                                renderComplete: renderComplete,
                                suffix_statements: statements(suffix),
                                nestedTemplates: this._nestedTemplates,
                                returnedElement: this._returnedElement,
                            },
                        ])
                    );

                    return this.prettify(result);

                },

                createAsyncParts: function () {

                    this._nestedTemplates = this._nestedTemplates || this.defineInstance(
                        InstanceKind.variable,
                        "nestedTemplates",
                        function () { return newArray(0); }
                    );

                    this._controlCounter = this._controlCounter || this.defineInstance(
                        InstanceKind.variable,
                        "controlCounter",
                        function () { return literal(1); }
                    );

                },

                createTextBindingHole: function (tagName, attribute, id) {
                    if (!this._textBindingPrefix) {
                        var c:any = "";
                        while (this._html.text.indexOf("textbinding" + c) !== -1) {
                            c = c || 0;
                            c++;
                        }
                        this._textBindingPrefix = "textbinding" + c;
                        // NOTE: the form of this regex needs to be coordinated with any special cases which
                        //  are introduced by the switch below.
                        this._textBindingRegex = new RegExp("(#?" + this._textBindingPrefix + "_\\d+)");
                    }

                    // Sometimes text bindings need to be of a particular form to suppress warnings from
                    //  the host, specifically there is a case with IMG/src attribute where if you assign
                    //  a naked textbinding_X to it you get a warning in the console of an unresolved image
                    //  instead we prefix it with a # which is enough to suppress that message.
                    //
                    var result = this._textBindingPrefix + "_" + id;
                    if (tagName === "IMG" && attribute === "src") {
                        result = "#" + result;
                    }

                    return result;
                },

                deadCodeElimination: function () {
                    var that = this;

                    // Eliminate all captured elements which are no longer in the tree, this can happen if
                    //  these captured elements are children of a node which had a text binding to 'innerText'
                    //  or 'textContent' as those kill the subtree.
                    //
                    Object.keys(this._instanceVariables).forEach(function (key) {
                        var iv = that._instanceVariables[key];
                        if (iv.kind === InstanceKind.capture) {
                            if (!that._templateContent.contains(iv.element)) {
                                iv.dead = true;
                            }
                            if (iv.refCount === 0) {
                                iv.dead = true;
                            }
                            if (iv.dead) {
                                // This dead instance variable returns a blank definition which will then get
                                // cleaned up by prettify.
                                iv.definition = function () { };
                                iv.name = null;
                                delete that._instanceVariables[key];
                            }
                        }
                    });

                    // Eliminate all control activations which target elements which are no longer in the tree
                    //
                    this._controls = this._controls.filter(function (c) { return !c.elementCapture.dead; });

                    // Eliminate all bindings which target elements which are no longer in the tree
                    //
                    this._bindings = this._bindings.filter(function (b) { return !b.elementCapture.dead; });

                    // Cleanup the capture CSE tree now that we know dead nodes are marked as such.
                    //
                    this._captureCSE.deadNodeElimination();

                },

                defineInstance: function (kind, name, definition) {

                    if (this._stage >= Stage.compile) {
                        throw "Illegal: define instance variable after compilation stage has started";
                    }

                    var variableCount = this._instanceVariablesCount[kind] || 0;
                    var suffix = name ? name.replace(identifierCharacterRegEx, "_") : "";
                    var identifier:any = createIdentifier(InstanceKindPrefixes[kind], variableCount, suffix);
                    identifier.definition = function () { return assignment(identifier, definition()); };
                    identifier.kind = kind;
                    this._instanceVariables[identifier] = identifier;
                    this._instanceVariablesCount[kind] = variableCount + 1;
                    return identifier;

                },

                defineStatic: function (kind, name, definition) {

                    if (this._stage >= Stage.link) {
                        throw "Illegal: define static variable after link stage has started";
                    }

                    if (name) {
                        var known = this._staticVariables[name];
                        if (known) {
                            return known;
                        }
                    }
                    var suffix = name ? name.replace(identifierCharacterRegEx, "_") : "";
                    var identifier:any = createIdentifier(StaticKindPrefixes[kind], this._staticVariablesCount, suffix);
                    var that = this;
                    identifier.definition = function () { return assignment(identifier, definition()); }
                    identifier.kind = kind;
                    this._staticVariables[name || identifier] = identifier;
                    this._staticVariablesCount++;
                    return identifier;

                },

                done: function () {

                    if (this._stage > Stage.done) {
                        throw "Illegal: once we have moved past done we cannot revist it";
                    }
                    this._stage = Stage.done;

                },

                emitScopedSelect: function (selector, elementCapture) {
                    return this.formatCode(
                        "{scopedSelect}({selector}, {element})",
                        {
                            scopedSelect: this._staticVariables.scopedSelect,
                            selector: literal(selector),
                            element: elementCapture,
                        }
                    );
                },

                emitOptionsNode: function (node, parts, elementCapture) {

                    var that = this;
                    if (node) {
                        switch (typeof node) {
                            case "object":
                                if (Array.isArray(node)) {
                                    parts.push("[");
                                    for (var i = 0, len = node.length; i < len; i++) {
                                        this.emitOptionsNode(node[i], parts, elementCapture);
                                        parts.push(",");
                                    }
                                    parts.push("]");
                                } else if (node instanceof CallExpression) {
                                    parts.push(node.target === "select" ? this.emitScopedSelect(node.arg0Value, elementCapture) : literal(null));
                                } else if (node instanceof IdentifierExpression && node.parts[0] instanceof CallExpression) {
                                    var call = node.parts[0];
                                    parts.push(
                                        nullableFilteredIdentifierAccessExpression(
                                            call.target === "select" ? this.emitScopedSelect(call.arg0Value, elementCapture) : literal(null),
                                            node.parts.slice(1),
                                            this.nullableIdentifierAccessTemporary,
                                            this.importSafe("requireSupportedForProcessing", requireSupportedForProcessing)
                                        )
                                    );
                                } else if (node instanceof IdentifierExpression) {
                                    parts.push(node.pathExpression);
                                } else {
                                    parts.push("{");
                                    Object.keys(node).forEach(function (key) {

                                        parts.push(propertyName(key));
                                        parts.push(":");
                                        that.emitOptionsNode(node[key], parts, elementCapture);
                                        parts.push(",");

                                    });
                                    parts.push("}");
                                }
                                break;

                            default:
                                parts.push(literal(node));
                                break;
                        }
                    } else {
                        parts.push(literal(null));
                    }

                },

                findGlobalIdentifierExpressions: function (obj, results) {

                    results = results || [];
                    var that = this;
                    Object.keys(obj).forEach(function (key) {
                        var prop = obj[key];
                        if (typeof prop === "object") {
                            if (prop instanceof IdentifierExpression) {
                                if (!(prop.parts[0] instanceof CallExpression)) {
                                    results.push(prop);
                                }
                            } else {
                                that.findGlobalIdentifierExpressions(prop, results);
                            }
                        }
                    });
                    return results;

                },

                formatCodeN: function () {

                    if (this._stage < Stage.compile) {
                        throw "Illegal: format code at before compilation stage has started";
                    }
                    return format.apply(null, arguments);

                },

                formatCode: function (string, parts) {

                    if (this._stage < Stage.compile) {
                        throw "Illegal: format code at before compilation stage has started";
                    }
                    return format(string, parts);

                },

                gatherBindings: function () {

                    var bindTokens = -1;
                    var that = this;
                    var nestedTemplates = -1;
                    var bindings = [];
                    var selector = "[data-win-bind],[data-win-control]";
                    var elements = this._templateContent.querySelectorAll(selector);
                    for (var i = 0, len = elements.length; i < len; i++) {
                        var element = elements[i];

                        // If we run into a declarative control container (e.g. Binding.Template) we don't
                        //  bind its children, but we will give it an opportunity to process later using the
                        //  same data context.
                        if (element.isDeclarativeControlContainer) {
                            i += element.querySelectorAll(selector).length;
                        }

                        // Since we had to look for controls as well as bindings in order to skip controls 
                        //  which are declarative control containers we have to check if this element is bound
                        if (!element.hasAttribute("data-win-bind")) {
                            continue;
                        }

                        var bindingText = element.getAttribute("data-win-bind");
                        var elementBindings = binding_parser(bindingText, global);
                        elementBindings.forEach(function (binding) {
                            if (binding.initializer) {
                                // If an initializer is specified it may be a nested template
                                var initializerName = binding.initializer.join(".");
                                var initializer = globalLookup(binding.initializer);
                                if (initializer.render) {
                                    requireSupportedForProcessing(initializer.render);
                                    // We have already chceked this to be safe for import
                                    binding.template = that.importSafe(initializerName, initializer);
                                    binding.pathExpression = that.bindingExpression(binding);
                                    binding.nestedTemplate = ++nestedTemplates;
                                    binding.kind = BindingKind.template;
                                } else if (initializer.winControl && initializer.winControl.render) {
                                    requireSupportedForProcessing(initializer.winControl.render);
                                    // We have already checked this to be safe to import
                                    binding.template = that.importSafe(initializerName, initializer.winControl);
                                    binding.pathExpression = that.bindingExpression(binding);
                                    binding.nestedTemplate = ++nestedTemplates;
                                    binding.kind = BindingKind.template;
                                } else {
                                    // Don't get the path expression here, we will do it if needed in optimize
                                    binding.initializer = that.import(initializerName, initializer);
                                    binding.bindToken = ++bindTokens;
                                    binding.kind = BindingKind.initializer;
                                }
                            } else {
                                // Don't get the path expression here, we will do it if needed in optimize
                                // We have already checked this to be safe to import
                                binding.initializer = that.importSafe("templateDefaultInitializer", that._defaultInitializer);
                                binding.bindToken = ++bindTokens;
                                binding.kind = BindingKind.initializer;
                            }
                            binding.elementCapture = that.capture(element);
                            binding.bindingText = bindingText;
                        });
                        bindings.push.apply(bindings, elementBindings);
                    }

                    var nestedTemplateCount = nestedTemplates + 1;
                    if (nestedTemplateCount > 0) {
                        this.async = true;
                        this._nestedTemplates = this.defineInstance(
                            InstanceKind.variable,
                            "nestedTemplates",
                            function () { return newArray(nestedTemplateCount); }
                        );
                    }

                    var bindTokenCount = bindTokens + 1;
                    if (bindTokenCount > 0) {
                        this._bindTokens = this.defineInstance(
                            InstanceKind.variable,
                            "bindTokens",
                            function () { return newArray(bindTokenCount); }
                        );
                        this._suffix.push(function () {
                            // NOTE: returnedElement is a local in the template which is set to either be the container
                            //       or in the extractChild: true case the first child.
                            return that.formatCode(
                                "{utilities_data}(returnedElement).bindTokens = {bindTokens}",
                                {
                                    utilities_data: that._staticVariables.utilities_data,
                                    bindTokens: that._bindTokens,
                                }
                            );
                        });
                    }

                    return bindings;

                },

                gatherChildren: function () {

                    var that = this;
                    return Array.prototype.map.call(this._templateContent.children, function (child) { return that.capture(child); });

                },

                gatherControls: function () {

                    var that = this;
                    var asyncCount = 0;
                    var controls = [];
                    var selector = "[data-win-control]";
                    var elements = this._templateContent.querySelectorAll(selector);
                    for (var i = 0, len = elements.length; i < len; i++) {
                        var element = elements[i];
                        var name = element.getAttribute("data-win-control");
                        // Control constructors are checked along the entirety of their path to be supported 
                        //  for processing when they are bound
                        var ControlConstructor = WinJS.Utilities._getMemberFiltered(name.trim(), global, requireSupportedForProcessing);
                        if (!ControlConstructor) {
                            continue;
                        }

                        var optionsText = element.getAttribute("data-win-options") || literal({});
                        var async = ControlConstructor.length > 2;
                        if (async) {
                            asyncCount++;
                            this.async = true;
                        }

                        var isDeclarativeControlContainer = ControlConstructor.isDeclarativeControlContainer;
                        if (isDeclarativeControlContainer) {
                            if (typeof isDeclarativeControlContainer === "function") {
                                isDeclarativeControlContainer = this.import(name + "_isDeclarativeControlContainer", isDeclarativeControlContainer);
                            }

                            element.isDeclarativeControlContainer = isDeclarativeControlContainer;
                            i += element.querySelectorAll(selector).length;
                        }

                        var control = {
                            elementCapture: this.capture(element),
                            name: name,
                            // We have already checked this for requireSupportedForProcessing
                            SafeConstructor: this.importSafe(name, ControlConstructor),
                            async: async,
                            optionsText: literal(optionsText),
                            optionsParsed: options_parser(optionsText),
                            isDeclarativeControlContainer: isDeclarativeControlContainer,
                        };
                        controls.push(control);

                        var globalReferences = this.findGlobalIdentifierExpressions(control.optionsParsed);
                        globalReferences.forEach(function (identifierExpression) {
                            identifierExpression.pathExpression = that.globalExpression(identifierExpression.parts);
                        });
                    }

                    if (asyncCount > 0) {
                        this._controlCounter = this.defineInstance(
                            InstanceKind.variable,
                            "controlCounter",
                            // +1 because we call it once to start in case we have no async controls in the async template
                            function () { return literal(asyncCount + 1); }
                        );
                    }

                    return controls;

                },

                generateElementCaptureAccess: function (l, r, root, filter) {

                    if (root) {
                        // Clean up the right hand side so we don't end up with "startIndex + 0"
                        var right = ("" + r === "0" ? "" : " + " + r);

                        return this.formatCodeN("{0}.children[startIndex{1}]", l, right);
                    }
                    return this.formatCodeN("{0}.children[{1}]", l, r);

                },

                generateNormalAccess: function (left, right, root, filter, last) {

                    // The 'last' parameter indicates that this path access is the last part of a greater
                    // access expression and therefore does not need to be further assigned to the temp.

                    if (left.indexOf(this.nullableIdentifierAccessTemporary) >= 0) {
                        // If the nullableIdentifierAccessTemporary is on the LHS then the
                        // LHS is already an access expression and does not need to be null-checked again
                        var formatString;
                        if (last) {
                            formatString = "{left} && {filter}({temp}{right})";
                        } else {
                            formatString = "{left} && ({temp} = {filter}({temp}{right}))";
                        }
                        return this.formatCode(formatString, {
                            temp: this.nullableIdentifierAccessTemporary,
                            left: left,
                            right: identifierAccessExpression([right]),
                            filter: filter
                        });
                    }
                    var formatString;
                    if (last) {
                        formatString = "({temp} = {left}) && {filter}({temp}{right})";
                    } else {
                        formatString = "({temp} = {left}) && ({temp} = {filter}({temp}{right}))";
                    }
                    return this.formatCode(formatString, {
                        temp: this.nullableIdentifierAccessTemporary,
                        left: left,
                        right: identifierAccessExpression([right]),
                        filter: filter
                    });

                },

                generateOptionsLiteral: function (optionsParsed, elementCapture) {

                    var parts = [];
                    this.emitOptionsNode(optionsParsed, parts, elementCapture);
                    return parts.join(" ");

                },

                generateDebugBreak: function () {

                    if (this._debugBreak) {
                        var counter = this.defineStatic(
                            StaticKind.variable,
                            "debugCounter",
                            function () { return literal(0); }
                        );
                        return this.formatCodeN("if (++{0} === 1) {{ debugger; }}", counter);
                    }
                    return "";

                },

                globalExpression: function (path) {

                    return this._globalCSE.createPathExpression(path, path.join("_"));

                },

                import: function (name, i) {

                    // Used for functions which are gathered from user code (e.g. binding initializers and 
                    //  control constructors). For these functions we need to assert that they are safe for
                    //  use in a declarative context, however since the values are known at compile time we 
                    //  can do that check once.
                    //
                    return this.importSafe(name, requireSupportedForProcessing(i));

                },

                importSafe: function (name, i) {

                    // Used for functions and objects which are intrinsic to the template compiler and are safe
                    //  for their intended usages and don't need to be marked requireSupportedForProcessing.
                    //
                    var that = this;
                    var identifier = this.defineStatic(
                        StaticKind.import,
                        name,
                        function () { return that.formatCodeN("({0}{1})", IMPORTS_ARG_NAME, identifierAccessExpression([name])) }
                    );
                    if (identifier.import && identifier.import !== i) {
                        throw "Duplicate import: '" + name + "'";
                    }
                    identifier.import = i;
                    return identifier;

                },

                importAll: function (imports) {
                    Object.keys(imports).forEach(function (key) {
                        requireSupportedForProcessing(imports[key]);
                    });
                    return this.importAllSafe(imports);
                },

                importAllSafe: function (imports) {

                    var that = this;
                    var result = Object.keys(imports).reduce(
                        function (o, key) {
                            o[key] = that.importSafe(key, imports[key]);
                            return o;
                        },
                        {}
                    );
                    return result;

                },

                link: function (body) {

                    if (this._stage > Stage.link) {
                        throw "Illegal: once we have moved past link we cannot revist it";
                    }
                    this._stage = Stage.link;

                    var that = this;

                    // Gather the set of imported instances (functions mostly). All of these are runtime values which
                    //  are already safety checked for things like requireSupportedForProcessing.
                    //
                    var imports = keys(this._staticVariables)
                        .filter(function (key) { return that._staticVariables[key].kind === StaticKind.import; })
                        .reduce(
                            function (o, key) {
                                o[key] = that._staticVariables[key].import;
                                return o;
                            },
                            {}
                        );

                    var statics = values(this._staticVariables);

                    return new Function(IMPORTS_ARG_NAME,
                        this.formatCode(
                            linkerCodeTemplate,
                            {
                                static_variable_declarations: declarationList(statics),
                                static_variable_definitions: statements(statics.map(function (s) { return s.definition(); })),
                                body: body.trim(),
                            }
                        )
                    )(imports);

                },

                lower: function () {

                    if (this._stage > Stage.lower) {
                        throw "Illegal: once we have moved past lower we cannot revist it";
                    }
                    this._stage = Stage.lower;

                    this._captureCSE.lower();
                    this._dataCSE.lower();
                    this._globalCSE.lower();

                },

                markBindingAsError: function (binding) {
                    if (binding) {
                        binding.kind = BindingKind.error;
                        this.markBindingAsError(binding.original);
                    }
                },

                oneTimeTextBinding: function (binding) {

                    var that = this;
                    var result = this.oneTimeTextBindingAnalyze(binding);
                    if (result) {
                        var initialValue;
                        if (binding.original) {
                            initialValue = binding.original.initialValue;
                        }
                        var id = this.createTextBindingHole(binding.elementCapture.element.tagName, result.attribute, ++this._textBindingId);
                        binding.textBindingId = id;
                        binding.kind = BindingKind.text;
                        binding.elementCapture.refCount--;
                        binding.definition = function () {
                            var formatString;
                            if (initialValue) {
                                formatString = "{htmlEscape}({initialValue})";
                            } else {
                                formatString = "{htmlEscape}({getter})";
                            }
                            return that.formatCode(
                                formatString,
                                {
                                    htmlEscape: that._staticVariables.htmlEscape,
                                    getter: binding.value(),
                                    initialValue: initialValue,
                                }
                            );
                        };

                        switch (result.kind) {
                            case TextBindingKind.attribute:
                                binding.elementCapture.element.setAttribute(result.attribute, id);
                                break;

                            case TextBindingKind.booleanAttribute:
                                // Boolean attributes work differently, the presence of the attribute in any
                                //  form means true and its absence means false. This means that we need to 
                                //  add or remove the whole thing and make the definition of the binding
                                //  expression at runtime add it back.
                                //
                                binding.elementCapture.element.setAttribute(result.attribute, id);

                                // Wrap the definition in a ternary expression which yields either the attribute
                                //  name or an empty string.
                                //
                                var definition = binding.definition;
                                binding.definition = function () {
                                    var formatString;
                                    if (initialValue) {
                                        formatString = "({initialValue} ? {attribute} : \"\")";
                                    } else {
                                        formatString = "({value} ? {attribute} : \"\")";
                                    }
                                    return that.formatCode(
                                        formatString,
                                        {
                                            value: binding.value(),
                                            attribute: literal(result.attribute),
                                            initialValue: initialValue
                                        }
                                    );
                                };

                                // Arrange for the attribute in the HTML with the 'id' as a value to be wholy
                                //  replaced by the ID.
                                //
                                this._htmlProcessors.push(function (html) {
                                    return html.replace(new RegExp(result.attribute + "=\"" + id + "\"", "i"), id);
                                });
                                break;

                            case TextBindingKind.textContent:
                                binding.elementCapture.element.textContent = id;
                                break;

                            case TextBindingKind.inlineStyle:
                                var element = binding.elementCapture.element;
                                // Inline styles require a little finesseing, their form always needs to be 
                                //  legal CSS include in the value space. We could attempt to special case
                                //  all CSS properties and produce something which is legal in their value
                                //  space but instead we wholesale replace the inline CSS with a extension
                                //  property temporarially in order to get valid HTML. Later we go replace
                                //  that well-known hole with the original inline CSS text as well as any
                                //  new properties we are setting as a result of data binding.
                                //
                                if (!element.msReplaceStyle) {
                                    element.msReplaceStyle = element.getAttribute("style") || "";
                                    // Ensure that there is always a trailing ';'
                                    if (element.msReplaceStyle !== "" && element.msReplaceStyle[element.msReplaceStyle.length - 1] !== ";") {
                                        element.msReplaceStyle = element.msReplaceStyle + ";";
                                    }
                                    element.setAttribute("style", "msReplaceStyle:'" + id + "'");
                                    var temp = element.getAttribute("style");
                                    this._htmlProcessors.push(function (html) {
                                        return html.replace(temp, element.msReplaceStyle);
                                    });
                                }
                                element.msReplaceStyle = element.msReplaceStyle + result.property + ":" + id + ";";
                                break;

                            default:
                                throw "NYI";
                        }
                    }

                },

                oneTimeTextBindingAnalyze: function (binding) {
                    var element = binding.elementCapture.element;
                    var elementType = element.tagName;
                    var targetProperty = binding.destination[0];

                    // Properties which can only be optimized for a given element types
                    //
                    switch (elementType) {
                        case "A":
                            switch (targetProperty) {
                                case "href":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };
                            }
                            break;

                        case "IMG":
                            switch (targetProperty) {
                                case "alt":
                                case "src":
                                case "width":
                                case "height":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };
                            }
                            break;

                        case "SELECT":
                            switch (targetProperty) {
                                case "disabled":
                                case "multiple":
                                case "required":
                                    return { kind: TextBindingKind.booleanAttribute, attribute: targetProperty };

                                case "size":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };
                            }
                            break;

                        case "OPTION":
                            switch (targetProperty) {
                                case "label":
                                case "value":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };

                                case "disabled":
                                case "selected":
                                    return { kind: TextBindingKind.booleanAttribute, attribute: targetProperty };
                            }
                            break;

                        case "INPUT":
                            switch (targetProperty) {
                                case "checked":
                                    switch (element.type) {
                                        case "checkbox":
                                        case "radio":
                                            return { kind: TextBindingKind.booleanAttribute, attribute: targetProperty };
                                    }
                                    break;

                                case "disabled":
                                    return { kind: TextBindingKind.booleanAttribute, attribute: targetProperty };

                                case "max":
                                case "maxLength":
                                case "min":
                                case "step":
                                case "value":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };

                                case "size":
                                    switch (element.type) {
                                        case "text":
                                        case "search":
                                        case "tel":
                                        case "url":
                                        case "email":
                                        case "password":
                                            return { kind: TextBindingKind.attribute, attribute: targetProperty };
                                    }
                                    break;

                                case "readOnly":
                                    switch (element.type) {
                                        case "hidden":
                                        case "range":
                                        case "color":
                                        case "checkbox":
                                        case "radio":
                                        case "file":
                                        case "button":
                                            // not supported:
                                            break;

                                        default:
                                            return { kind: TextBindingKind.attribute, attribute: targetProperty };
                                    }
                                    break;
                            }
                            break;

                        case "BUTTON":
                            switch (targetProperty) {
                                case "disabled":
                                    return { kind: TextBindingKind.booleanAttribute, attribute: targetProperty };

                                case "value":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };
                            }
                            break;

                        case "TEXTAREA":
                            switch (targetProperty) {
                                case "disabled":
                                case "readOnly":
                                case "required":
                                    return { kind: TextBindingKind.booleanAttribute, attribute: targetProperty };

                                case "cols":
                                case "maxLength":
                                case "placeholder":
                                case "rows":
                                case "wrap":
                                    return { kind: TextBindingKind.attribute, attribute: targetProperty };
                            }
                            break;
                    }

                    // Properties which can be optimized for all element types
                    //
                    switch (targetProperty) {
                        case "className":
                            return { kind: TextBindingKind.attribute, attribute: "class" };

                        case "dir":
                        case "lang":
                        case "name":
                        case "title":
                        case "tabIndex":
                            return { kind: TextBindingKind.attribute, attribute: targetProperty };

                        case "style":
                            if (binding.destination.length > 1) {
                                var targetCssProperty = binding.destination[1];
                                if (targetCssProperty === "cssText") {
                                    // We don't support optimizing the cssText property on styles
                                    //
                                    return;
                                }
                                // If this is a supported css property we will get a string (frequently empty)
                                //  from the style object.
                                //
                                var supported = typeof element.style[targetCssProperty] === "string";
                                if (supported) {
                                    // The mapping from css property name to JS property name is regular:
                                    //
                                    //  1) -ms- prefix -> ms prefix
                                    //  2) split on interior '-' and make the next word uppercase
                                    //
                                    // We can reverse this to make css property names.
                                    //
                                    if (targetCssProperty[0] === "m" && targetCssProperty[1] === "s" || 
                                            targetCssProperty.substring(0, 6) === "webkit") {
                                        targetCssProperty = "-" + targetCssProperty;
                                    }
                                    targetCssProperty = targetCssProperty.replace(capitalRegEx, function (l) {
                                        return "-" + l.toLowerCase();
                                    });
                                    return { kind: TextBindingKind.inlineStyle, property: targetCssProperty, attribute: "style" };
                                }
                            }
                            break;

                            case "innerText":
                            case "textContent":
                                return { kind: TextBindingKind.textContent, attribute: "textContent" };
                        }
                },

                oneTimeTreeBinding: function (binding) {

                    if (binding.destination.length === 1 && binding.destination[0] === "id") {
                        if (WinJS.validation) {
                            throw new WinJS.ErrorFromName("WinJS.Binding.IdBindingNotSupported", WinJS.Resources._formatString(strings.idBindingNotSupported, binding.bindingText));
                        }
                        WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.idBindingNotSupported, binding.bindingText), "winjs binding", "error");
                        this.markBindingAsError(binding);
                        return;
                    }

                    if (binding.destination.length === 0) {
                        WinJS.log && WinJS.log(strings.cannotBindToThis, "winjs binding", "error");
                        this.markBindingAsError(binding);
                        return;
                    }

                    var that = this;
                    var initialValue;
                    binding.pathExpression = this.bindingExpression(binding);
                    binding.value = function () {
                        return binding.pathExpression;
                    };
                    if (binding.original) {
                        initialValue = binding.pathExpression;
                        binding.original.initialValue = initialValue;
                    }
                    binding.kind = BindingKind.tree;
                    binding.definition = function () {
                        var formatString;
                        if (initialValue) {
                            formatString = "({targetPath} || {{}}){prop} = {initialValue}";
                        } else {
                            formatString = "({targetPath} || {{}}){prop} = {sourcePath}";
                        }
                        return that.formatCode(
                            formatString,
                            {
                                targetPath: nullableFilteredIdentifierAccessExpression(
                                    binding.elementCapture,
                                    binding.destination.slice(0, -1),
                                    that.nullableIdentifierAccessTemporary,
                                    that.importSafe("targetSecurityCheck", targetSecurityCheck)
                                ),
                                prop: identifierAccessExpression(binding.destination.slice(-1)),
                                sourcePath: binding.value(),
                                initialValue: initialValue,
                            }
                        );
                    };

                },

                optimize: function () {

                    if (this._stage > Stage.optimze) {
                        throw "Illegal: once we have moved past link we cannot revist it";
                    }
                    this._stage = Stage.optimze;

                    var that = this;

                    // Identify all bindings which can be turned into tree bindings, in some cases this consists
                    //  of simply changing their type and providing a definition, in other cases it involves 
                    //  adding a new tree binding to complement the other binding
                    //
                    for (var i = 0; i < this._bindings.length; i++) {
                        var binding = this._bindings[i];
                        if (binding.template) {
                            continue;
                        }

                        switch (binding.initializer.import) {
                            case init_defaultBind:
                                // Add a new tree binding for one-time binding and mark the defaultBind as delayable
                                var newBinding:any = merge(binding, {
                                    kind: BindingKind.tree,
                                    initializer: this.importSafe("init_oneTime", init_oneTime),
                                    original: binding,
                                });
                                newBinding.elementCapture.refCount++;
                                this.oneTimeTreeBinding(newBinding);
                                this._bindings.splice(i, 0, newBinding);
                                binding.delayable = true;
                                i++;
                                break;

                            case init_setAttribute:
                                // Add a new tree binding for one-time setAttribute and mark the setAttribute as delayable
                                var newBinding:any = merge(binding, {
                                    kind: BindingKind.tree,
                                    initializer: this.importSafe("init_setAttributeOneTime", init_setAttributeOneTime),
                                    original: binding,
                                });
                                newBinding.elementCapture.refCount++;
                                this.setAttributeOneTimeTreeBinding(newBinding);
                                this._bindings.splice(i, 0, newBinding);
                                binding.delayable = true;
                                i++;
                                break;

                            case init_oneTime:
                                this.oneTimeTreeBinding(binding);
                                break;

                            case init_setAttributeOneTime:
                                this.setAttributeOneTimeTreeBinding(binding);
                                break;

                            case init_addClassOneTime:
                                this.addClassOneTimeTreeBinding(binding);
                                break;

                            default:
                                if (binding.initializer) {
                                    binding.delayable = !!binding.initializer.import.delayable;
                                }
                                break;
                        }
                    }

                    if (this._optimizeTextBindings) {

                        // Identifiy all potential text bindings and generate text replacement expressions
                        //
                        var textBindings = {};
                        for (var i = 0; i < this._bindings.length; i++) {
                            var binding = this._bindings[i];
                            if (binding.template) {
                                continue;
                            }
                            if (binding.kind === BindingKind.error) {
                                continue;
                            }

                            switch (binding.initializer.import) {
                                case init_oneTime:
                                    this.oneTimeTextBinding(binding);
                                    break;

                                case init_setAttributeOneTime:
                                    this.setAttributeOneTimeTextBinding(binding);
                                    break;

                                case init_addClassOneTime:
                                    this.addClassOneTimeTextBinding(binding);
                                    break;

                                default:
                                    break;
                            }
                            if (binding.textBindingId) {
                                textBindings[binding.textBindingId] = binding;
                            }
                        }

                        if (Object.keys(textBindings).length) {
                            var newHtml = this._templateContent.innerHTML;

                            // Perform any adjustments to the HTML that are needed for things like styles and 
                            //  boolean attributes
                            //
                            newHtml = this._htmlProcessors.reduce(
                                function (html, replacer) {
                                    return replacer(html);
                                },
                                newHtml
                            );

                            // All the even indexes are content and all the odds are replacements
                            //
                            // NOTE: this regular expression is 
                            var parts = newHtml.split(this._textBindingRegex);
                            for (var i = 1; i < parts.length; i += 2) {
                                var binding = textBindings[parts[i]];
                                parts[i] = binding.definition;
                            }

                            // Generate the function which will code-gen the HTML replacements.
                            //
                            this._html = function () {
                                var result = parts.map(function (p) {
                                    // the strings are the literal parts of the HTML that came directly from the DOM
                                    // the functions are the definitions for string replacements
                                    return typeof p === "string" ? literal(p) : p();
                                }).join(" + ");
                                return multiline(result);
                            };
                        }

                    }

                },

                prettify: function (result) {

                    // remove all lines which contain nothing but a semi-colon
                    var lines = result.split("\n");
                    return lines.filter(function (line) { return !semiColonOnlyLineRegEx.test(line); }).join("\n");

                },

                setAttributeOneTimeTextBinding: function (binding) {

                    var that = this;
                    var attribute = binding.destination[0];
                    var id = this.createTextBindingHole(binding.elementCapture.element.tagName, attribute, ++this._textBindingId);
                    var initialValue;
                    if (binding.original) {
                        initialValue = binding.original.initialValue;
                    }
                    binding.textBindingId = id;
                    binding.kind = BindingKind.text;
                    binding.elementCapture.element.setAttribute(attribute, id);
                    binding.elementCapture.refCount--;
                    binding.definition = function () {
                        var formatString;
                        if (initialValue) {
                            formatString = "{htmlEscape}({initialValue})";
                        } else {
                            formatString = "{htmlEscape}({value})";
                        }
                        return that.formatCode(
                            formatString,
                            {
                                htmlEscape: that._staticVariables.htmlEscape,
                                initialValue: initialValue,
                                value: binding.value(),
                            }
                        );
                    };

                },

                setAttributeOneTimeTreeBinding: function (binding) {

                    if (binding.destination.length === 1 && binding.destination[0] === "id") {
                        if (WinJS.validation) {
                            throw new WinJS.ErrorFromName("WinJS.Binding.IdBindingNotSupported", WinJS.Resources._formatString(strings.idBindingNotSupported, binding.bindingText));
                        }
                        WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.idBindingNotSupported, binding.bindingText), "winjs binding", "error");
                        this.markBindingAsError(binding);
                        return;
                    }

                    if (binding.destination.length !== 1 || !binding.destination[0]) {
                        WinJS.log && WinJS.log(strings.attributeBindingSingleProperty, "winjs binding", "error");
                        this.markBindingAsError(binding);
                        return;
                    }

                    var that = this;
                    var initialValue;
                    binding.pathExpression = this.bindingExpression(binding);
                    binding.value = function () {
                        return binding.pathExpression;
                    };
                    if (binding.original) {
                        initialValue = this.defineInstance(InstanceKind.variable, "", binding.value);
                        binding.original.initialValue = initialValue;
                    }
                    binding.kind = BindingKind.tree;
                    binding.definition = function () {
                        var formatString;
                        if (initialValue) {
                            formatString = "{element}.setAttribute({attribute}, \"\" + {initialValue})";
                        } else {
                            formatString = "{element}.setAttribute({attribute}, \"\" + {value})";
                        }
                        return that.formatCode(
                            formatString,
                            {
                                element: binding.elementCapture,
                                attribute: literal(binding.destination[0]),
                                initialValue: initialValue,
                                value: binding.value(),
                            }
                        );
                    };

                },

            }, {
                _TreeCSE: TreeCSE,

                compile: function TemplateCompiler_compile(template, templateElement, options) {

                    if (!(templateElement instanceof HTMLElement)) {
                        throw "Illegal";
                    }

                    writeProfilerMark("WinJS.Binding.Template:compile" + options.profilerMarkIdentifier + ",StartTM");

                    var compiler = new TemplateCompiler(templateElement, options);

                    compiler.analyze();

                    var importAliases = compiler.importAllSafe({
                        Signal: WinJS._Signal,
                        global: global,
                        document: document,
                        cancelBlocker: cancelBlocker,
                        promise_as: promise_as,
                        disposeInstance: disposeInstance,
                        markDisposable: markDisposable,
                        ui_processAll: ui_processAll,
                        binding_processAll: binding_processAll,
                        insertAdjacentHTMLUnsafe: insertAdjacentHTMLUnsafe,
                        promise: Promise,
                        utilities_data: utilities_data,
                        requireSupportedForProcessing: requireSupportedForProcessing,
                        htmlEscape: htmlEscape,
                        scopedSelect: scopedSelect,
                        delayedBindingProcessing: delayedBindingProcessing,
                        writeProfilerMark: writeProfilerMark
                    });

                    compiler.optimize();

                    compiler.deadCodeElimination();

                    compiler.lower();

                    var codeTemplate;
                    var delayBindings;
                    switch (options.target) {
                        case "render":
                            codeTemplate = compiler.async ? renderImplCodeAsyncTemplate : renderImplCodeTemplate;
                            delayBindings = false;
                            break;

                        case "renderItem":
                            codeTemplate = compiler.async ? renderItemImplCodeAsyncTemplate : renderItemImplCodeTemplate;
                            delayBindings = true;
                            break;
                    }

                    var body = compiler.compile(codeTemplate, importAliases, delayBindings);
                    var render = compiler.link(body);

                    compiler.done();

                    writeProfilerMark("WinJS.Binding.Template:compile" + options.profilerMarkIdentifier + ",StopTM");

                    return render;
                }
            });

            //
            // Templates
            //

            function trimLinesRight(string) {
                // Replace all empty lines with just a newline
                // Remove all trailing spaces
                return string.replace(/^\s*$/gm, "").replace(/^(.*[^\s])( *)$/gm, function (unused, content) {
                    return content;
                });
            }

            var renderImplMainCodePrefixTemplate = trimLinesRight("\
container.classList.add(\"win-template\");                                                              \n\
var html = {html};                                                                                      \n\
{insertAdjacentHTMLUnsafe}(container, \"beforeend\", html);                                             \n\
returnedElement = {returnedElement};                                                                    \n\
                                                                                                        \n\
// Capture Definitions                                                                                  \n\
{capture_definitions};                                                                                  \n\
{set_msParentSelectorScope};                                                                            \n\
                                                                                                        \n\
");

            var renderImplControlAndBindingProcessing = trimLinesRight("\
// Control Processing                                                                                   \n\
{control_processing};                                                                                   \n\
                                                                                                        \n\
// Binding Processing                                                                                   \n\
{binding_processing};                                                                                   \n\
                                                                                                        \n\
var result = {promise_as}(returnedElement);                                                             \n\
");

            var renderImplAsyncControlAndBindingProcessing = trimLinesRight("\
var controlSignal = new {Signal}();                                                                     \n\
var controlDone = function () {{ if (--{control_counter} === 0) {{ controlSignal.complete(); }} }};     \n\
controlDone();                                                                                          \n\
                                                                                                        \n\
// Control Processing                                                                                   \n\
{control_processing};                                                                                   \n\
                                                                                                        \n\
var result = controlSignal.promise.then(function () {{                                                  \n\
    // Binding Processing                                                                               \n\
    {binding_processing};                                                                               \n\
    return {promise}.join({nestedTemplates});                                                           \n\
}}).then(function () {{                                                                                 \n\
    return returnedElement;                                                                             \n\
}}).then(null, function (e) {{                                                                          \n\
    if (typeof e === \"object\" && e.name === \"Canceled\") {{ returnedElement.dispose(); }}            \n\
    return {promise}.wrapError(e);                                                                      \n\
}});                                                                                                    \n\
");

            var renderImplMainCodeSuffixTemplate = trimLinesRight("\
{markDisposable}(returnedElement, function () {{ {disposeInstance}(returnedElement, result); }});       \n\
{suffix_statements};                                                                                    \n\
");

            var renderImplCodeTemplate = trimLinesRight("\
function render(data, container) {{                                                                     \n\
    {debug_break}                                                                                       \n\
    if (typeof data === \"object\" && typeof data.then === \"function\") {{                             \n\
        // async data + a container falls back to interpreted path                                      \n\
        if (container) {{                                                                               \n\
            var result = this._renderInterpreted(data, container);                                      \n\
            return result.element.then(function () {{ return result.renderComplete; }});                \n\
        }}                                                                                              \n\
        return {cancelBlocker}(data).then(function(data) {{ return render(data); }});                   \n\
    }}                                                                                                  \n\
                                                                                                        \n\
    {writeProfilerMark}({profilerMarkIdentifierStart});                                                 \n\
                                                                                                        \n\
    // Declarations                                                                                     \n\
    var {instance_variable_declarations};                                                               \n\
    var returnedElement;                                                                                \n\
                                                                                                        \n\
    // Global Definitions                                                                               \n\
    {global_definitions};                                                                               \n\
                                                                                                        \n\
    // Data Definitions                                                                                 \n\
    data = (data === {global} ? data : {requireSupportedForProcessing}(data));                          \n\
    {data_definitions};                                                                                 \n\
                                                                                                        \n\
    // Instance Variable Definitions                                                                    \n\
    {instance_variable_definitions};                                                                    \n\
                                                                                                        \n\
    // HTML Processing                                                                                  \n\
    container = container || {document}.createElement({tagName});                                       \n\
    var startIndex = container.childElementCount;                                                       \n\
    " + trim(indent(4, renderImplMainCodePrefixTemplate)) + "                                           \n\
                                                                                                        \n\
    " + trim(indent(4, renderImplControlAndBindingProcessing)) + "                                      \n\
    " + trim(indent(4, renderImplMainCodeSuffixTemplate)) + "                                           \n\
                                                                                                        \n\
    {writeProfilerMark}({profilerMarkIdentifierStop});                                                  \n\
                                                                                                        \n\
    return result;                                                                                      \n\
}}                                                                                                      \n\
");

            var renderImplCodeAsyncTemplate = trimLinesRight("\
function render(data, container) {{                                                                     \n\
    {debug_break}                                                                                       \n\
    if (typeof data === \"object\" && typeof data.then === \"function\") {{                             \n\
        // async data + a container falls back to interpreted path                                      \n\
        if (container) {{                                                                               \n\
            var result = this._renderInterpreted(data, container);                                      \n\
            return result.element.then(function () {{ return result.renderComplete; }});                \n\
        }}                                                                                              \n\
        return {cancelBlocker}(data).then(function(data) {{ return render(data, container); }});        \n\
    }}                                                                                                  \n\
                                                                                                        \n\
    {writeProfilerMark}({profilerMarkIdentifierStart});                                                 \n\
                                                                                                        \n\
    // Declarations                                                                                     \n\
    var {instance_variable_declarations};                                                               \n\
    var returnedElement;                                                                                \n\
                                                                                                        \n\
    // Global Definitions                                                                               \n\
    {global_definitions};                                                                               \n\
                                                                                                        \n\
    // Data Definitions                                                                                 \n\
    data = (data === {global} ? data : {requireSupportedForProcessing}(data));                          \n\
    {data_definitions};                                                                                 \n\
                                                                                                        \n\
    // Instance Variable Definitions                                                                    \n\
    {instance_variable_definitions};                                                                    \n\
                                                                                                        \n\
    // HTML Processing                                                                                  \n\
    container = container || {document}.createElement({tagName});                                       \n\
    var startIndex = container.childElementCount;                                                       \n\
    " + trim(indent(4, renderImplMainCodePrefixTemplate)) + "                                           \n\
                                                                                                        \n\
    " + trim(indent(4, renderImplAsyncControlAndBindingProcessing)) + "                                 \n\
    " + trim(indent(4, renderImplMainCodeSuffixTemplate)) + "                                           \n\
                                                                                                        \n\
    {writeProfilerMark}({profilerMarkIdentifierStop});                                                  \n\
                                                                                                        \n\
    return result;                                                                                      \n\
}}                                                                                                      \n\
");

            var renderItemImplMainCodeSuffixTemplate = trimLinesRight("\
{markDisposable}(returnedElement, function () {{ {disposeInstance}(returnedElement, result, renderComplete); }});\n\
{suffix_statements};                                                                                    \n\
");

            var renderItemImplCodeTemplate = trimLinesRight("\
function renderItem(itemPromise) {{                                                                     \n\
    {debug_break}                                                                                       \n\
    // Declarations                                                                                     \n\
    var {instance_variable_declarations};                                                               \n\
    var element, renderComplete, data, returnedElement;                                                 \n\
                                                                                                        \n\
    element = itemPromise.then(function renderItem(item) {{                                             \n\
        if (typeof item.data === \"object\" && typeof item.data.then === \"function\") {{               \n\
            return {cancelBlocker}(item.data).then(function (data) {{ return renderItem({{ data: data }}); }});\n\
        }}                                                                                              \n\
                                                                                                        \n\
        {writeProfilerMark}({profilerMarkIdentifierStart});                                             \n\
                                                                                                        \n\
        // Global Definitions                                                                           \n\
        {global_definitions};                                                                           \n\
                                                                                                        \n\
        // Data Definitions                                                                             \n\
        data = item.data;                                                                               \n\
        data = (data === {global} ? data : {requireSupportedForProcessing}(data));                      \n\
        {data_definitions};                                                                             \n\
                                                                                                        \n\
        // Instance Variable Definitions                                                                \n\
        {instance_variable_definitions};                                                                \n\
                                                                                                        \n\
        // HTML Processing                                                                              \n\
        var container = {document}.createElement({tagName});                                            \n\
        var startIndex = 0;                                                                             \n\
        " + trim(indent(8, renderImplMainCodePrefixTemplate)) + "                                       \n\
                                                                                                        \n\
        " + trim(indent(8, renderImplControlAndBindingProcessing)) + "                                  \n\
        " + trim(indent(8, renderItemImplMainCodeSuffixTemplate)) + "                                   \n\
                                                                                                        \n\
        {writeProfilerMark}({profilerMarkIdentifierStop});                                              \n\
                                                                                                        \n\
        return result;                                                                                  \n\
    }});                                                                                                \n\
    {renderComplete};                                                                                   \n\
    return {{                                                                                           \n\
        element: element,                                                                               \n\
        renderComplete: renderComplete || element,                                                      \n\
    }};                                                                                                 \n\
}}                                                                                                      \n\
");

            var renderItemImplRenderCompleteTemplate = trimLinesRight("\
renderComplete = element.then(function () {{                                                            \n\
    return itemPromise;                                                                                 \n\
}}).then(function (item) {{                                                                             \n\
    return item.ready || item;                                                                          \n\
}}).then(function (item) {{                                                                             \n\
    {delayed_binding_processing};                                                                       \n\
    return element;                                                                                     \n\
}});                                                                                                    \n\
");

            var renderItemImplCodeAsyncTemplate = trimLinesRight("\
function renderItem(itemPromise) {{                                                                     \n\
    {debug_break}                                                                                       \n\
    // Declarations                                                                                     \n\
    var {instance_variable_declarations};                                                               \n\
    var element, renderComplete, data, returnedElement;                                                 \n\
                                                                                                        \n\
    element = itemPromise.then(function renderItem(item) {{                                             \n\
        if (typeof item.data === \"object\" && typeof item.data.then === \"function\") {{               \n\
            return {cancelBlocker}(item.data).then(function (data) {{ return renderItem({{ data: data }}); }});\n\
        }}                                                                                              \n\
                                                                                                        \n\
        {writeProfilerMark}({profilerMarkIdentifierStart});                                             \n\
                                                                                                        \n\
        // Global Definitions                                                                           \n\
        {global_definitions};                                                                           \n\
                                                                                                        \n\
        // Data Definitions                                                                             \n\
        data = item.data;                                                                               \n\
        data = (data === {global} ? data : {requireSupportedForProcessing}(data));                      \n\
        {data_definitions};                                                                             \n\
                                                                                                        \n\
        // Instance Variable Definitions                                                                \n\
        {instance_variable_definitions};                                                                \n\
                                                                                                        \n\
        // HTML Processing                                                                              \n\
        var container = {document}.createElement({tagName});                                            \n\
        var startIndex = 0;                                                                             \n\
        " + trim(indent(8, renderImplMainCodePrefixTemplate)) + "                                       \n\
                                                                                                        \n\
        " + trim(indent(8, renderImplAsyncControlAndBindingProcessing)) + "                             \n\
        " + trim(indent(8, renderItemImplMainCodeSuffixTemplate)) + "                                   \n\
                                                                                                        \n\
        {writeProfilerMark}({profilerMarkIdentifierStop});                                              \n\
                                                                                                        \n\
        return result;                                                                                  \n\
    }});                                                                                                \n\
    {renderComplete};                                                                                   \n\
    return {{                                                                                           \n\
        element: element,                                                                               \n\
        renderComplete: renderComplete || element,                                                      \n\
    }};                                                                                                 \n\
}}                                                                                                      \n\
");

            var linkerCodeTemplate = trimLinesRight("\
\"use strict\";                                                                                         \n\
                                                                                                        \n\
// statics                                                                                              \n\
var {static_variable_declarations};                                                                     \n\
{static_variable_definitions};                                                                          \n\
                                                                                                        \n\
// generated template rendering function                                                                \n\
return {body};                                                                                          \n\
");

            //
            // End Templates
            // 

            return TemplateCompiler;
        })
    });


}(this));
