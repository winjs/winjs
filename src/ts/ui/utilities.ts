// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function utilitiesInit(global) {
    "use strict";

    var markSupportedForProcessing = WinJS.Utilities.markSupportedForProcessing;

    WinJS.Namespace.define("WinJS.UI", {
        eventHandler: function (handler) {
            /// <signature helpKeyword="WinJS.UI.eventHandler">
            /// <summary locid="WinJS.UI.eventHandler">
            /// Marks a event handler function as being compatible with declarative processing.
            /// </summary>
            /// <param name="handler" type="Object" locid="WinJS.UI.eventHandler_p:handler">
            /// The handler to be marked as compatible with declarative processing.
            /// </param>
            /// <returns type="Object" locid="WinJS.UI.eventHandler_returnValue">
            /// The input handler.
            /// </returns>
            /// </signature>
            return markSupportedForProcessing(handler);
        },
        /// <field locid="WinJS.UI.Orientation" helpKeyword="WinJS.UI.Orientation">
        /// Orientation options for a control's property
        /// </field>
        Orientation: {
            /// <field locid="WinJS.UI.Orientation.horizontal" helpKeyword="WinJS.UI.Orientation.horizontal">
            /// Horizontal
            /// </field>
            horizontal: "horizontal",
            /// <field locid="WinJS.UI.Orientation.vertical" helpKeyword="WinJS.UI.Orientation.vertical">
            /// Vertical
            /// </field>
            vertical: "vertical"
        }
    });


    WinJS.Namespace.define("WinJS.Utilities", {

        _clamp: function (value, lowerBound, upperBound, defaultValue) {
            var n = Math.max(lowerBound, Math.min(upperBound, +value));
            return n === 0 ? 0 : n || Math.max(lowerBound, Math.min(upperBound, defaultValue));
        },

        _deprecated: function (message) {
            console.warn(message);
        }

    });

    WinJS.Namespace.define("WinJS.Utilities", {

        // Take a renderer which may be a function (signature: (data) => element) or a WinJS.Binding.Template
        //  and return a function with a unified synchronous contract which is:
        //
        //  (data, container) => element
        //      
        // Where:
        //
        //  1) if you pass container the content will be rendered into the container and the
        //     container will be returned. 
        //
        //  2) if you don't pass a container the content will be rendered and returned.
        //
        _syncRenderer: function (renderer, tagName) {
            tagName = tagName || "div";
            if (typeof renderer === "function") {
                return function (data, container) {
                    if (container) {
                        container.appendChild(renderer(data));
                        return container;
                    } else {
                        return renderer(data);
                    }
                };
            }

            var template;
            if (typeof renderer.render === "function") {
                template = renderer;
            } else if (renderer.winControl && typeof renderer.winControl.render === "function") {
                template = renderer.winControl;
            }

            return function (data, container) {
                var host = container || document.createElement(tagName);
                template.render(data, host);
                if (container) {
                    return container;
                } else {
                    // The expectation is that the creation of the DOM elements happens synchronously
                    //  and as such we steal the first child and make it the root element.
                    //
                    var element = host.firstElementChild;

                    // Because we have changed the "root" we may need to move the dispose method
                    //  created by the template to the child and do a little switcheroo on dispose.
                    //
                    if (element && host.dispose) {
                        var prev = element.dispose;
                        element.dispose = function () {
                            element.dispose = prev;
                            host.appendChild(element);
                            host.dispose();
                        };
                    }
                    return element;
                }
            };
        },


        _getLowestTabIndexInList: function Utilities_getLowestTabIndexInList(elements) {
            // Returns the lowest positive tabIndex in a list of elements.
            // Returns 0 if there are no positive tabIndices.
            var lowestTabIndex = 0;
            var elmTabIndex;
            for (var i = 0; i < elements.length; i++) {
                elmTabIndex = parseInt(elements[i].getAttribute("tabIndex"), 10);
                if ((0 < elmTabIndex)
                 && ((elmTabIndex < lowestTabIndex) || !lowestTabIndex)) {
                    lowestTabIndex = elmTabIndex;
                }
            }

            return lowestTabIndex;
        },

        _getHighestTabIndexInList: function Utilities_getHighestTabIndexInList(elements) {
            // Returns 0 if any element is explicitly set to 0. (0 is the highest tabIndex)
            // Returns the highest tabIndex in the list of elements.
            // Returns 0 if there are no positive tabIndices.
            var highestTabIndex = 0;
            var elmTabIndex;
            for (var i = 0; i < elements.length; i++) {
                elmTabIndex = parseInt(elements[i].getAttribute("tabIndex"), 10);
                if (elmTabIndex === 0) {
                    return elmTabIndex;
                } else if (highestTabIndex < elmTabIndex) {
                    highestTabIndex = elmTabIndex;
                }
            }

            return highestTabIndex;
        },

        _trySetActive: function Utilities_trySetActive(elem) {
            return this._tryFocus(elem, true);
        },

        _tryFocus: function Utilities_tryFocus(elem, useSetActive) {
            var previousActiveElement = document.activeElement;

            if (elem === previousActiveElement) {
                return true;
            }

            // IE allows focus to go to elements that it shouldn't sometimes.
            // For reference: http://www.w3.org/html/wg/drafts/html/master/single-page.html#specially-focusable
            // Workaround for majority of cases:
            var simpleLogicForValidTabStop =
                (elem.tabIndex >= 0) && 
                ((elem.nodeName === "A" && elem.href) || 
                (elem.nodeName === "LINK" && elem.href) ||
                (elem.nodeName === "BUTTON") ||
                (elem.nodeName === "INPUT" && elem.type !== "hidden") ||
                (elem.nodeName === "SELECT") ||
                (elem.nodeName === "TEXTAREA") ||
                (elem.nodeName === "MENUITEM") ||
                (elem.nodeName === "TH" && elem.sorted) ||
                (elem.draggable) ||
                (elem.getAttribute("tabindex") !== null));
            if (!simpleLogicForValidTabStop) {
                return false;
            }

            if (useSetActive) {
                WinJS.Utilities._setActive(elem);
            } else {
                elem.focus();
            }

            if (previousActiveElement !== document.activeElement) {
                return true;
            }
            return false;
        },

        _setActiveFirstFocusableElement: function Utilities_setActiveFirstFocusableElement(rootEl) {
            return this._focusFirstFocusableElement(rootEl, true);
        },

        _focusFirstFocusableElement: function Utilities_focusFirstFocusableElement(rootEl, useSetActive) {
            var _elms = rootEl.getElementsByTagName("*");

            // Get the tabIndex set to the firstDiv (which is the lowest)
            var _lowestTabIndex = this._getLowestTabIndexInList(_elms);
            var _nextLowestTabIndex = 0;

            // If there are positive tabIndices, set focus to the element with the lowest tabIndex.
            // Keep trying with the next lowest tabIndex until all tabIndices have been exhausted.
            // Otherwise set focus to the first focusable element in DOM order.
            while (_lowestTabIndex) {
                for (var i = 0; i < _elms.length; i++) {
                    if (_elms[i].tabIndex === _lowestTabIndex) {
                        if (this._tryFocus(_elms[i], useSetActive)) {
                            return true;
                        }
                    } else if ((_lowestTabIndex < _elms[i].tabIndex)
                            && ((_elms[i].tabIndex < _nextLowestTabIndex) || (_nextLowestTabIndex === 0))) {
                        // Here if _lowestTabIndex < _elms[i].tabIndex < _nextLowestTabIndex
                        _nextLowestTabIndex = _elms[i].tabIndex;
                    }
                }

                // We weren't able to set focus to anything at that tabIndex
                // If we found a higher valid tabIndex, try that now
                _lowestTabIndex = _nextLowestTabIndex;
                _nextLowestTabIndex = 0;
            }

            // Wasn't able to set focus to anything with a positive tabIndex, try everything now.
            // This is where things with tabIndex of 0 will be tried.
            for (i = 0; i < _elms.length; i++) {
                if (this._tryFocus(_elms[i], useSetActive)) {
                    return true;
                }
            }

            return false;
        },

        _setActiveLastFocusableElement: function Utilities_setActiveLastFocusableElement(rootEl) {
            return this._focusLastFocusableElement(rootEl, true);
        },

        _focusLastFocusableElement: function Utilities_focusLastFocusableElement(rootEl, useSetActive) {
            var _elms = rootEl.getElementsByTagName("*");
            // Get the tabIndex set to the finalDiv (which is the highest)
            var _highestTabIndex = this._getHighestTabIndexInList(_elms);
            var _nextHighestTabIndex = 0;

            var previousActiveElement = document.activeElement;

            // Try all tabIndex 0 first. After this conditional the _highestTabIndex
            // should be equal to the highest positive tabIndex.
            if (_highestTabIndex === 0) {
                for (var i = _elms.length - 1; i >= 0; i--) {
                    if (_elms[i].tabIndex === _highestTabIndex) {
                        if (this._tryFocus(_elms[i], useSetActive)) {
                            return true;
                        }
                    } else if (_nextHighestTabIndex < _elms[i].tabIndex) {
                        _nextHighestTabIndex = _elms[i].tabIndex;
                    }
                }

                _highestTabIndex = _nextHighestTabIndex;
                _nextHighestTabIndex = 0;
            }

            // If there are positive tabIndices, set focus to the element with the highest tabIndex.
            // Keep trying with the next highest tabIndex until all tabIndices have been exhausted.
            // Otherwise set focus to the last focusable element in DOM order.
            while (_highestTabIndex) {
                for (i = _elms.length - 1; i >= 0; i--) {
                    if (_elms[i].tabIndex === _highestTabIndex) {
                        if (this._tryFocus(_elms[i], useSetActive)) {
                            return true;
                        }
                    } else if ((_nextHighestTabIndex < _elms[i].tabIndex) && (_elms[i].tabIndex < _highestTabIndex)) {
                        // Here if _nextHighestTabIndex < _elms[i].tabIndex < _highestTabIndex
                        _nextHighestTabIndex = _elms[i].tabIndex;
                    }
                }

                // We weren't able to set focus to anything at that tabIndex
                // If we found a lower valid tabIndex, try that now
                _highestTabIndex = _nextHighestTabIndex;
                _nextHighestTabIndex = 0;
            }

            // Wasn't able to set focus to anything with a tabIndex, try everything now
            for (i = _elms.length - 2; i > 0; i--) {
                if (this._tryFocus(_elms[i], useSetActive)) {
                    return true;
                }
            }

            return false;
        },

    });

})(this);
