// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function declarativeControlsInit(global, WinJS) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    var strings = {
        get errorActivatingControl() { return WinJS.Resources._getWinJSString("base/errorActivatingControl").value; },
    };

    var markSupportedForProcessing = WinJS.Utilities.markSupportedForProcessing;
    var requireSupportedForProcessing = WinJS.Utilities.requireSupportedForProcessing;
    var processedAllCalled = false;

    function createSelect(element) {
        var result = function select(selector) {
            /// <signature helpKeyword="WinJS.UI.select.createSelect">
            /// <summary locid="WinJS.UI.select.createSelect">
            /// Walks the DOM tree from the given  element to the root of the document, whenever
            /// a selector scope is encountered select performs a lookup within that scope for
            /// the given selector string. The first matching element is returned.
            /// </summary>
            /// <param name="selector" type="String" locid="WinJS.UI.select.createSelect_p:selector">The selector string.</param>
            /// <returns type="HTMLElement" domElement="true" locid="WinJS.UI.select.createSelect_returnValue">The target element, if found.</returns>
            /// </signature>
            var current = element;
            var selected;
            while (current) {
                if (current.msParentSelectorScope) {
                    var scope = current.parentNode;
                    if (scope) {
                        selected = WinJS.Utilities._matchesSelector(scope, selector) ? scope : scope.querySelector(selector);
                        if (selected) {
                            break;
                        }
                    }
                }
                current = current.parentNode;
            }

            return selected || document.querySelector(selector);
        }
        return markSupportedForProcessing(result);
    }

    function activate(element, Handler) {
        return new WinJS.Promise(function activate2(complete, error) {
            try {
                var options;
                var optionsAttribute = element.getAttribute("data-win-options");
                if (optionsAttribute) {
                    options = WinJS.UI.optionsParser(optionsAttribute, global, {
                        select: createSelect(element)
                    });
                }

                var ctl;
                var count = 1;

                // handler is required to call complete if it takes that parameter
                //
                if (Handler.length > 2) {
                    count++;
                }
                var checkComplete = function checkComplete() {
                    count--;
                    if (count === 0) {
                        element.winControl = element.winControl || ctl;
                        complete(ctl);
                    }
                };

                // async exceptions from the handler get dropped on the floor...
                //
                ctl = new Handler(element, options, checkComplete);
                checkComplete();
            }
            catch (err) {
                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.errorActivatingControl, err && err.message), "winjs controls", "error");
                error(err);
            }
        });
    };

    function processAllImpl(rootElement:HTMLElement, skipRootElement) {
        return new WinJS.Promise(function processAllImpl2(complete, error) {
            WinJS.Utilities._writeProfilerMark("WinJS.UI:processAll,StartTM");
            rootElement = rootElement || document.body;
            var pending = 0;
            var selector = "[data-win-control]";
            var allElements = rootElement.querySelectorAll(selector);
            var elements = [];
            if (!skipRootElement && getControlHandler(rootElement)) {
                elements.push(rootElement);
            }
            for (var i = 0, len = allElements.length; i < len; i++) {
                elements.push(allElements[i]);
            }

            // bail early if there is nothing to process
            //
            if (elements.length === 0) {
                WinJS.Utilities._writeProfilerMark("WinJS.UI:processAll,StopTM");
                complete(rootElement);
                return;
            }

            var checkAllComplete = function () {
                pending = pending - 1;
                if (pending < 0) {
                    WinJS.Utilities._writeProfilerMark("WinJS.UI:processAll,StopTM");
                    complete(rootElement);
                }
            }

            // First go through and determine which elements to activate
            //
            var controls = new Array(elements.length);
            for (var i = 0, len = elements.length; i < len; i++) {
                var element = elements[i];
                var control;
                var instance = element.winControl;
                if (instance) {
                    control = instance.constructor;
                    // already activated, don't need to add to controls array
                }
                else {
                    controls[i] = control = getControlHandler(element);
                }
                if (control && control.isDeclarativeControlContainer) {
                    i += element.querySelectorAll(selector).length;
                }
            }

            // Now go through and activate those
            //
            WinJS.Utilities._writeProfilerMark("WinJS.UI:processAllActivateControls,StartTM");
            for (var i = 0, len = elements.length; i < len; i++) {
                var ctl = controls[i];
                var element = elements[i];
                if (ctl && !element.winControl) {
                    pending++;
                    activate(element, ctl).then(checkAllComplete, function (e) {
                        WinJS.Utilities._writeProfilerMark("WinJS.UI:processAll,StopTM");
                        error(e);
                    });

                    if (ctl.isDeclarativeControlContainer && typeof ctl.isDeclarativeControlContainer === "function") {
                        var idcc = requireSupportedForProcessing(ctl.isDeclarativeControlContainer);
                        idcc(element.winControl, WinJS.UI.processAll);
                    }
                }
            }
            WinJS.Utilities._writeProfilerMark("WinJS.UI:processAllActivateControls,StopTM");

            checkAllComplete();
        });
    };

    function getControlHandler(element) {
        if (element.getAttribute) {
            var evaluator = element.getAttribute("data-win-control");
            if (evaluator) {
                return WinJS.Utilities._getMemberFiltered(evaluator.trim(), global, requireSupportedForProcessing);
            }
        }
    };

    WinJS.Namespace.define("WinJS.UI", {

        scopedSelect: function (selector, element) {
        /// <signature helpKeyword="WinJS.UI.scopedSelect">
        /// <summary locid="WinJS.UI.scopedSelect">
        /// Walks the DOM tree from the given  element to the root of the document, whenever
        /// a selector scope is encountered select performs a lookup within that scope for
        /// the given selector string. The first matching element is returned.
        /// </summary>
        /// <param name="selector" type="String" locid="WinJS.UI.scopedSelect_p:selector">The selector string.</param>
        /// <returns type="HTMLElement" domElement="true" locid="WinJS.UI.scopedSelect_returnValue">The target element, if found.</returns>
        /// </signature>
            return createSelect(element)(selector);
        },

        processAll: function (rootElement, skipRoot) {
            /// <signature helpKeyword="WinJS.UI.processAll">
            /// <summary locid="WinJS.UI.processAll">
            /// Applies declarative control binding to all elements, starting at the specified root element.
            /// </summary>
            /// <param name="rootElement" type="Object" domElement="true" locid="WinJS.UI.processAll_p:rootElement">
            /// The element at which to start applying the binding. If this parameter is not specified, the binding is applied to the entire document.
            /// </param>
            /// <param name="skipRoot" type="Boolean" optional="true" locid="WinJS.UI.processAll_p:skipRoot">
            /// If true, the elements to be bound skip the specified root element and include only the children.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.processAll_returnValue">
            /// A promise that is fulfilled when binding has been applied to all the controls.
            /// </returns>
            /// </signature>
            if (!processedAllCalled) {
                return WinJS.Utilities.ready().then(function () {
                    processedAllCalled = true;
                    return processAllImpl(rootElement, skipRoot);
                });
            }
            else {
                return processAllImpl(rootElement, skipRoot);
            }
        },

        process: function (element) {
            /// <signature helpKeyword="WinJS.UI.process">
            /// <summary locid="WinJS.UI.process">
            /// Applies declarative control binding to the specified element.
            /// </summary>
            /// <param name="element" type="Object" domElement="true" locid="WinJS.UI.process_p:element">
            /// The element to bind.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.process_returnValue">
            /// A promise that is fulfilled after the control is activated. The value of the
            /// promise is the control that is attached to element.
            /// </returns>
            /// </signature>

            if (element && element.winControl) {
                return WinJS.Promise.as(element.winControl);
            }
            var handler = getControlHandler(element);
            if (!handler) {
                return WinJS.Promise.as(); // undefined, no handler
            }
            else {
                return activate(element, handler);
            }
        }
    });
})(this, WinJS);
