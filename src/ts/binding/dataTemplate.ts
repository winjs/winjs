// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function dataTemplateInit(global, WinJS) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    var P = WinJS.Promise;
    var cancelBlocker = P._cancelBlocker;
    var markSupportedForProcessing = WinJS.Utilities.markSupportedForProcessing;

    WinJS.Namespace.define("WinJS.Binding", {

        /// <field>
        /// <summary locid="WinJS.Binding.Template">
        /// Provides a reusable declarative binding element.
        /// </summary>
        /// </field>
        /// <name locid="WinJS.Binding.Template_name">Template</name>
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.Binding.Template"><div>Place content here</div></div>]]></htmlSnippet>
        /// <icon src="base_winjs.ui.template.12x12.png" width="12" height="12" />
        /// <icon src="base_winjs.ui.template.16x16.png" width="16" height="16" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Template: WinJS.Namespace._lazy(function () {
            function interpretedRender(template, dataContext, container?) {
                WinJS.Utilities._writeProfilerMark("WinJS.Binding:templateRender" + template._profilerMarkIdentifier + ",StartTM");

                if (++template._counter === 1 && (template.debugBreakOnRender || WinJS.Binding.Template._debugBreakOnRender)) {
                    debugger;
                }

                var workPromise = WinJS.Promise.wrap();
                var d = container || document.createElement(template.element.tagName);

                WinJS.Utilities.addClass(d, "win-template");
                WinJS.Utilities.addClass(d, "win-loading");
                var that = template;
                function done() {
                    WinJS.Utilities.removeClass(d, "win-loading");
                    WinJS.Utilities._writeProfilerMark("WinJS.Binding:templateRender" + template._profilerMarkIdentifier + ",StopTM");
                    return extractedChild || d;
                }
                var initial = d.children.length;
                var element;
                var extractedChild;
                var dispose = function () {
                    var bindings = WinJS.Utilities.data(d).winBindings;
                    if (bindings) {
                        bindings.forEach(function (item) {
                            item.cancel();
                        });
                    }
                    workPromise.cancel();
                };
                if (template.extractChild) {
                    element = WinJS.UI.Fragments.renderCopy(that.href || that.element, document.createElement(that.element.tagName)).then(function (frag) {
                        var child = frag.firstElementChild;
                        extractedChild = child;
                        WinJS.Utilities.markDisposable(child, dispose);
                        d.appendChild(child);
                        return child;
                    });
                } else {
                    WinJS.Utilities.markDisposable(d, dispose);
                    element = WinJS.UI.Fragments.renderCopy(that.href || that.element, d);
                }
                var renderComplete = element.
                    then(function Template_renderImpl_renderComplete_then() {
                        var work;
                        // If no existing children, we can do the faster path of just calling
                        // on the root element...
                        //
                        if (initial === 0) {
                            work = function (f, a, b, c) { return f(extractedChild || d, a, b, c); };
                        }
                            // We only grab the newly added nodes (always at the end)
                            // and in the common case of only adding a single new element
                            // we avoid the "join" overhead
                            //
                        else {
                            var all = d.children;
                            if (all.length === initial + 1) {
                                work = function (f, a, b, c) { return f(all[initial], a, b, c); };
                            }
                            else {
                                // we have to capture the elements first, in case
                                // doing the work affects the children order/content
                                //
                                var elements = [];
                                for (var i = initial, l = all.length; i < l; i++) {
                                    elements.push(all[i]);
                                }
                                work = function (f, a, b, c) {
                                    var join = [];
                                    elements.forEach(function (e) {
                                        join.push(f(e, a, b, c));
                                    });
                                    return WinJS.Promise.join(join);
                                };
                            }
                        }

                        var child = d.firstElementChild;
                        while (child) {
                            child.msParentSelectorScope = true;
                            child = child.nextElementSibling;
                        }

                        // This allows "0" to mean no timeout (at all) and negative values
                        // mean setImmediate (no setTimeout). Since Promise.timeout uses
                        // zero to mean setImmediate, we have to coerce.
                        //
                        var timeout = that.processTimeout;
                        function complete() {
                            return work(WinJS.UI.processAll).
                                then(function () { return cancelBlocker(dataContext); }).
                                then(function Template_renderImpl_Binding_processAll(data) {
                                    return work(WinJS.Binding.processAll, data, !extractedChild && !initial, that.bindingCache);
                                }).
                                then(null, function (e) {
                                    if (typeof e === "object" && e.name === "Canceled") {
                                        (extractedChild || d).dispose();
                                    }
                                    return WinJS.Promise.wrapError(e);
                                });
                        }
                        if (timeout) {
                            if (timeout < 0) { timeout = 0; }
                            return WinJS.Promise.timeout(timeout).then(function () {
                                return workPromise = complete();
                            });
                        }
                        else {
                            return workPromise = complete();
                        }
                    }).then(done, function (err) { done(); return WinJS.Promise.wrapError(err); });

                return { element: element, renderComplete: renderComplete };
            }

            return WinJS.Class.define(function Template_ctor(element, options) {
                /// <signature helpKeyword="WinJS.Binding.Template.Template">
                /// <summary locid="WinJS.Binding.Template.constructor">
                /// Creates a template that provides a reusable declarative binding element.
                /// </summary>
                /// <param name="element" type="DOMElement" locid="WinJS.Binding.Template.constructor_p:element">
                /// The DOM element to convert to a template.
                /// </param>
                /// <param name="options" type="{href:String}" optional="true" locid="WinJS.Binding.Template.constructor_p:options">
                /// If this parameter is supplied, the template is loaded from the URI and
                /// the content of the element parameter is ignored.
                /// </param>
                /// </signature>

                this._element = element || document.createElement("div");
                this._element.winControl = this;

                this._profilerMarkIdentifier = WinJS.Utilities._getProfilerMarkIdentifier(this._element);
                WinJS.Utilities._writeProfilerMark("WinJS.Binding:newTemplate" + this._profilerMarkIdentifier + ",StartTM");

                var that = this;
                this._element.renderItem = function (itemPromise, recycled) { return that._renderItemImpl(itemPromise, recycled); };

                options = options || {};
                this.href = options.href;
                this.enableRecycling = !!options.enableRecycling;
                this.processTimeout = options.processTimeout || 0;
                this.bindingInitializer = options.bindingInitializer;
                this.debugBreakOnRender = options.debugBreakOnRender;
                this.disableOptimizedProcessing = options.disableOptimizedProcessing;
                this.extractChild = options.extractChild;
                this._counter = 0;

                // This will eventually change name and reverse polarity, starting opt-in.
                //
                this._compile = !!options._compile;

                if (!this.href) {
                    this.element.style.display = "none";
                }
                this.bindingCache = { expressions: {} };

                WinJS.Utilities._writeProfilerMark("WinJS.Binding:newTemplate" + this._profilerMarkIdentifier + ",StopTM");
            }, {
                _shouldCompile: {
                    get: function () {
                        // This is the temporary switch to opt-in to compilation, eventually replaced
                        //  by default opt-in with an opt-out switch.
                        //
                        var shouldCompile = true;
                        shouldCompile = shouldCompile && !WinJS.Binding.Template._interpretAll;
                        shouldCompile = shouldCompile && !this.disableOptimizedProcessing;

                        if (shouldCompile) {
                            shouldCompile = shouldCompile && this.processTimeout === 0;
                            shouldCompile = shouldCompile && (!this.href || this.href instanceof HTMLElement);

                            if (!shouldCompile) {
                                WinJS.log && WinJS.log("Cannot compile templates which use processTimeout or href properties", "winjs binding", "warn");
                            }
                        }

                        return shouldCompile;
                    }
                },

                /// <field type="Function" locid="WinJS.Binding.Template.bindingInitializer" helpKeyword="WinJS.Binding.Template.bindingInitializer">
                /// If specified this function is used as the default initializer for any data bindings which do not explicitly specify one. The
                /// provided function must be marked as supported for processing.
                /// </field>
                bindingInitializer: {
                    get: function () { return this._bindingInitializer; },
                    set: function (value) {
                        this._bindingInitializer = value;
                        this._reset();
                    }
                },

                /// <field type="Boolean" locid="WinJS.Binding.Template.debugBreakOnRender" helpKeyword="WinJS.Binding.Template.debugBreakOnRender">
                /// Indicates whether a templates should break in the debugger on first render
                /// </field>
                debugBreakOnRender: {
                    get: function () { return this._debugBreakOnRender; },
                    set: function (value) {
                        this._debugBreakOnRender = !!value;
                        this._reset();
                    }
                },

                /// <field type="Boolean" locid="WinJS.Binding.Template.disableOptimizedProcessing" helpKeyword="WinJS.Binding.Template.disableOptimizedProcessing">
                /// Set this property to true to resotre classic template processing and data binding and disable template compilation.
                /// </field>
                disableOptimizedProcessing: {
                    get: function () { return this._disableOptimizedProcessing; },
                    set: function (value) {
                        this._disableOptimizedProcessing = !!value;
                        this._reset();
                    }
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.Binding.Template.element" helpKeyword="WinJS.Binding.Template.element">
                /// Gets the DOM element that is used as the template.
                /// </field>
                element: {
                    get: function () { return this._element; },
                },

                /// <field type="Boolean" locid="WinJS.Binding.Template.extractChild" helpKeyword="WinJS.Binding.Template.extractChild">
                /// Return the first element child of the template instead of a wrapper element hosting all the template content.
                /// </field>
                extractChild: {
                    get: function () { return this._extractChild; },
                    set: function (value) {
                        this._extractChild = !!value;
                        this._reset();
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.Binding.Template.processTimeout" helpKeyword="WinJS.Binding.Template.processTimeout">
                /// Number of milliseconds to delay instantiating declarative controls. Zero (0) will result in no delay, any negative number
                /// will result in a setImmediate delay, any positive number will be treated as the number of milliseconds.
                /// </field>
                processTimeout: {
                    get: function () { return this._processTimeout || 0; },
                    set: function (value) {
                        this._processTimeout = value;
                        this._reset();
                    }
                },

                render: WinJS.Utilities.markSupportedForProcessing(function (dataContext, container) {
                    /// <signature helpKeyword="WinJS.Binding.Template.render">
                    /// <summary locid="WinJS.Binding.Template.render">
                    /// Binds values from the specified data context to elements that are descendents of the specified root element
                    /// and have the declarative binding attributes (data-win-bind).
                    /// </summary>
                    /// <param name="dataContext" type="Object" optional="true" locid="WinJS.Binding.Template.render_p:dataContext">
                    /// The object to use for default data binding.
                    /// </param>
                    /// <param name="container" type="DOMElement" optional="true" locid="WinJS.Binding.Template.render_p:container">
                    /// The element to which to add this rendered template. If this parameter is omitted, a new DIV is created.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Binding.Template.render_returnValue">
                    /// A promise that is completed after binding has finished. The value is
                    /// either the element specified in the container parameter or the created DIV.
                    /// </returns>
                    /// </signature>

                    return this._renderImpl(dataContext, container);
                }),

                // Hook point for compiled template
                //
                _renderImpl: function (dataContext, container) {
                    if (this._shouldCompile) {
                        try {
                            this._renderImpl = this._compileTemplate({ target: "render" });
                            return this._renderImpl(dataContext, container);
                        } catch (e) {
                            return WinJS.Promise.wrapError(e);
                        }
                    }

                    var render = interpretedRender(this, dataContext, container);
                    return render.element.then(function () { return render.renderComplete; });
                },

                _renderInterpreted: function (dataContext, container) {
                    return interpretedRender(this, dataContext, container);
                },

                renderItem: function (item, recycled) {
                    /// <signature helpKeyword="WinJS.Binding.Template.renderItem">
                    /// <summary locid="WinJS.Binding.Template.renderItem">
                    /// Renders an instance of this template bound to the data contained in item. If
                    /// the recycled parameter is present, and enableRecycling is true, then the template attempts
                    /// to reuse the DOM elements from the recycled parameter.
                    /// </summary>
                    /// <param name="item" type="Object" optional="false" locid="WinJS.Binding.Template.renderItem_p:item">
                    /// The object that contains the data to bind to. Only item.data is required.
                    /// </param>
                    /// <param name="recycled" type="DOMElement" optional="true" locid="WinJS.Binding.Template.renderItem_p:recycled">
                    /// A previously-generated template instance.
                    /// </param>
                    /// <returns type="DOMElement" locid="WinJS.Binding.Template.renderItem_returnValue">
                    /// The DOM element.
                    /// </returns>
                    /// </signature>
                    return this._renderItemImpl(item, recycled);
                },

                // Hook point for compiled template
                //
                _renderItemImpl: function (item, recycled) {
                    if (this._shouldCompile) {
                        try {
                            this._renderItemImpl = this._compileTemplate({ target: "renderItem" });
                            return this._renderItemImpl(item);
                        } catch (e) {
                            return {
                                element: WinJS.Promise.wrapError(e),
                                renderComplete: WinJS.Promise.wrapError(e),
                            };
                        }
                    }

                    var that = this;

                    // we only enable element cache when we are trying
                    // to recycle. Otherwise our element cache would
                    // grow unbounded.
                    //
                    if (this.enableRecycling && !this.bindingCache.elements) {
                        this.bindingCache.elements = {};
                    }

                    if (this.enableRecycling
                        && recycled
                        && recycled.msOriginalTemplate === this) {

                        // If we are asked to recycle, we cleanup any old work no matter what
                        //
                        var cacheEntry = this.bindingCache.elements[recycled.id];
                        var okToReuse = true;
                        if (cacheEntry) {
                            cacheEntry.bindings.forEach(function (v) { v(); });
                            cacheEntry.bindings = [];
                            okToReuse = !cacheEntry.nocache;
                        }

                        // If our cache indicates that we hit a non-cancelable thing, then we are
                        // in an unknown state, so we actually can't recycle the tree. We have
                        // cleaned up what we can, but at this point we need to reset and create
                        // a new tree.
                        //
                        if (okToReuse) {
                            // Element recycling requires that there be no other content in "recycled" other than this
                            // templates' output.
                            //
                            return {
                                element: recycled,
                                renderComplete: item.then(function (item) {
                                    return WinJS.Binding.processAll(recycled, item.data, true, that.bindingCache);
                                }),
                            };
                        }
                    }

                    var render = interpretedRender(this, item.then(function (item) { return item.data; }));
                    render.element = render.element.then(function (e) { e.msOriginalTemplate = that; return e; });
                    return render;
                },

                _compileTemplate: function (options) {

                    var that = this;

                    var result = WinJS.Binding._TemplateCompiler.compile(this, this.href || this.element, {
                        debugBreakOnRender: this.debugBreakOnRender || WinJS.Binding.Template._debugBreakOnRender,
                        defaultInitializer: this.bindingInitializer || options.defaultInitializer,
                        disableTextBindingOptimization: options.disableTextBindingOptimization || false,
                        target: options.target,
                        extractChild: this.extractChild,
                        profilerMarkIdentifier: this._profilerMarkIdentifier
                    });

                    var resetOnFragmentChange = options.resetOnFragmentChange || ((<any>window).Windows && Windows.ApplicationModel && Windows.ApplicationModel.DesignMode && Windows.ApplicationModel.DesignMode.designModeEnabled);
                    if (resetOnFragmentChange) {
                        var mo = new (<any>MutationObserver)(function () {
                            that._reset();
                            mo.disconnect();
                        });
                        mo.observe(WinJS.Utilities.data(this.element).docFragment, {
                            childList: true,
                            attributes: true,
                            characterData: true,
                            subtree: true,
                        });
                    }

                    return result;

                },

                _reset: function () {
                    // Reset the template to being not compiled. In design mode this triggers on a mutation
                    //  of the original document fragment.
                    delete this._renderImpl;
                    delete this._renderItemImpl;
                },

            }, {
                isDeclarativeControlContainer: { value: true, writable: false, configurable: false },
                render: {
                    value: function (href, dataContext, container) {
                        /// <signature helpKeyword="WinJS.Binding.Template.render.value">
                        /// <summary locid="WinJS.Binding.Template.render.value">
                        /// Renders a template based on a URI.
                        /// </summary>
                        /// <param name="href" type="String" locid="WinJS.Binding.Template.render.value_p:href">
                        /// The URI from which to load the template.
                        /// </param>
                        /// <param name="dataContext" type="Object" optional="true" locid="WinJS.Binding.Template.render.value_p:dataContext">
                        /// The object to use for default data binding.
                        /// </param>
                        /// <param name="container" type="DOMElement" optional="true" locid="WinJS.Binding.Template.render.value_p:container">
                        /// The element to which to add this rendered template. If this parameter is omitted, a new DIV is created.
                        /// </param>
                        /// <returns type="WinJS.Promise" locid="WinJS.Binding.Template.render.value_returnValue">
                        /// A promise that is completed after binding has finished. The value is
                        /// either the object in the container parameter or the created DIV.
                        /// </returns>
                        /// </signature>
                        return new WinJS.Binding.Template(null, { href: href }).render(dataContext, container);
                    }
                }
            });
        })
    });
        
    if (WinJS.Utilities && WinJS.Utilities.QueryCollection) {
        WinJS.Class.mix(WinJS.Utilities.QueryCollection, {
            template: function (templateElement, data, renderDonePromiseCallback) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.template">
                /// <summary locid="WinJS.Utilities.QueryCollection.template">
                /// Renders a template that is bound to the given data
                /// and parented to the elements included in the QueryCollection.
                /// If the QueryCollection contains multiple elements, the template
                /// is rendered multiple times, once at each element in the QueryCollection
                /// per item of data passed.
                /// </summary>
                /// <param name="templateElement" type="DOMElement" locid="WinJS.Utilities.QueryCollection.template_p:templateElement">
                /// The DOM element to which the template control is attached to.
                /// </param>
                /// <param name="data" type="Object" locid="WinJS.Utilities.QueryCollection.template_p:data">
                /// The data to render. If the data is an array (or any other object
                /// that has a forEach method) then the template is rendered
                /// multiple times, once for each item in the collection.
                /// </param>
                /// <param name="renderDonePromiseCallback" type="Function" locid="WinJS.Utilities.QueryCollection.template_p:renderDonePromiseCallback">
                /// If supplied, this function is called
                /// each time the template gets rendered, and is passed a promise
                /// that is fulfilled when the template rendering is complete.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.template_returnValue">
                /// The QueryCollection.
                /// </returns>
                /// </signature>
                if (templateElement instanceof WinJS.Utilities.QueryCollection) {
                    templateElement = templateElement[0];
                }
                var template = templateElement.winControl;

                if (data === null || data === undefined || !data.forEach) {
                    data = [data];
                }

                renderDonePromiseCallback = renderDonePromiseCallback || function () { };

                var that = this;
                var donePromises = [];
                data.forEach(function (datum) {
                    that.forEach(function (element) {
                        donePromises.push(template.render(datum, element));
                    });
                });
                renderDonePromiseCallback(WinJS.Promise.join(donePromises));

                return this;
            }
        });
    }

})(this, WinJS);
