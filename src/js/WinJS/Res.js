// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './Core/_Global',
    './Core/_Base',
    './Core/_BaseUtils',
    './Core/_ErrorFromName',
    './Core/_Resources',
    './ControlProcessor/_OptionsParser',
    './Promise'
    ], function resInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _OptionsParser, Promise) {
    "use strict";

    var readyComplete = false;

    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    function processAllImpl(rootElement, count) {
        rootElement = rootElement || _Global.document.body;

        var count = count || 0;

        if (count < 4) {
            // Only 3 depth is supported in the innerHTML
            if (count === 0) {
                if (rootElement.getAttribute) {
                    // Fragment-loaded root element isn't caught by querySelectorAll
                    var rootElementNode = rootElement.getAttribute('data-win-res');
                    if (rootElementNode) {
                        var decls = _OptionsParser.optionsParser(rootElementNode);
                        setMembers(rootElement, rootElement, decls, count);
                    }
                }
            }

            var selector = "[data-win-res],[data-win-control]";
            var elements = rootElement.querySelectorAll(selector);
            if (elements.length === 0) {
                return Promise.as(rootElement);
            }

            for (var i = 0, len = elements.length; i < len; i++) {
                var e = elements[i];

                if (e.winControl && e.winControl.constructor && e.winControl.constructor.isDeclarativeControlContainer) {
                    var idcc = e.winControl.constructor.isDeclarativeControlContainer;
                    if (typeof idcc === "function") {
                        idcc = requireSupportedForProcessing(idcc);
                        idcc(e.winControl, processAll);

                        // Skip all children of declarative control container
                        i += e.querySelectorAll(selector).length;
                    }
                }

                if (!e.hasAttribute("data-win-res")) {
                    continue;
                }
                // Use optionsParser that accept string format
                // {name="value", name2="value2"}
                var decls = _OptionsParser.optionsParser(e.getAttribute('data-win-res'));
                setMembers(e, e, decls, count);
            }

        }
        else if (_BaseUtils.validation) {
            throw new _ErrorFromName("WinJS.Res.NestingExceeded", "NestingExceeded");
        }

        return Promise.as(rootElement);
    }

    function setAttributes(root, descriptor) {
        var names = Object.keys(descriptor);

        for (var k = 0, l = names.length ; k < l; k++) {
            var name = names[k];
            var value = descriptor[name];

            var data = _Resources.getString(value);

            if (!data || !data.empty) {
                root.setAttribute(name, data.value);

                if ((data.lang !== undefined) &&
                    (root.lang !== undefined) &&
                    (root.lang !== data.lang)) {

                        root.lang = data.lang;
                    }
            }
            else if (_BaseUtils.validation) {
                notFound(value);
            }
        }
    }

    function notFound(name) {
        throw new _ErrorFromName("WinJS.Res.NotFound", _Resources._formatString("NotFound: {0}", name));
    }

    function setMembers(root, target, descriptor, count) {
        var names = Object.keys(descriptor);
        target = requireSupportedForProcessing(target);

        for (var k = 0, l = names.length ; k < l; k++) {
            var name = names[k];
            var value = descriptor[name];

            if (typeof value === "string") {
                var data = _Resources.getString(value);

                if (!data || !data.empty) {
                    target[name] = data.value;

                    if ((data.lang !== undefined) &&
                        (root.lang !== undefined) &&
                        (root.lang !== data.lang)) {
                        // When lang property is different, we set the language with selected string's language
                            root.lang = data.lang;
                        }

                    if (name === "innerHTML") {
                        processAllImpl(target, count + 1);
                    }
                }
                else if (_BaseUtils.validation) {
                    notFound(value);
                }
            }
            else if (root === target && name === "attributes") {
                //Exposing setAttribute for attributes that don't have HTML properties, like aria, through a fake 'attributes' property
                setAttributes(root, value);
            }
            else {
                setMembers(root, target[name], value, count);
            }
        }
    }

    function processAll(rootElement) {
            /// <signature helpKeyword="WinJS.Resources.processAll">
            /// <summary locid="WinJS.Resources.processAll">
            /// Processes resources tag and replaces strings
            /// with localized strings.
            /// </summary>
            /// <param name="rootElement" locid="WinJS.Resources.processAll_p:rootElement">
            /// The DOM element at which to start processing. processAll processes the element and its child elements. 
            /// If you don't specify root element, processAll processes the entire document. 
            /// </param>
            /// </signature>

            if (!readyComplete) {
                return _BaseUtils.ready().then(function () {
                    readyComplete = true;
                    return processAllImpl(rootElement);
                });
            }
            else {
                try {
                    return processAllImpl(rootElement);
                }
                catch (e) {
                    return Promise.wrapError(e);
                }
            }
        }

    _Base.Namespace._moduleDefine(exports, "WinJS.Resources", {
        processAll: processAll
    });
});