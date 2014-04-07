// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function tabManagerInit(global, WinJS) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }


    function fireEvent(element, name, forward) {
        var event:UIEvent = <any>document.createEvent('UIEvent');
        event.initUIEvent(name, false, false, window, forward ? 1 : 0);
        element.dispatchEvent(event);
    }

    function onBeforeActivate(tabHelper, e, element, prefixWillHaveFocus) {
        var hasFocus = element.contains(document.activeElement) || tabHelper.sync;
        if (!hasFocus) {
            // The following setImmediate is for firing the correct event type when childFocus === null.
            // When childFocus === null, tabbing will just skip over the entire TabContainer synchronously.
            // Therefore, if the 'sync' flag is still set when we this function is called, then we must be
            // synchronously exiting the TabContainer since any asynchrony will allow the setImmediate to
            // run and unset the 'sync' flag.
            tabHelper.sync = true;
            WinJS.Utilities._yieldForEvents(function () {
                tabHelper.sync = false;
            });
        }
        fireEvent(element, hasFocus ? "onTabExit" : "onTabEnter", (!hasFocus && prefixWillHaveFocus) || (hasFocus && !prefixWillHaveFocus));
        e.stopPropagation();
        e.preventDefault();
    }

    function prefixBeforeActivateHandler(e) {
        return onBeforeActivate(this, e, e.target.nextSibling, true);
    }

    function postfixBeforeActivateHandler(e) {
        return onBeforeActivate(this, e, e.target.previousSibling, false);
    }

    function TabHelperObject(element, tabIndex) {
        function createCatcher(beforeActivateHandler) {
            var fragment = document.createElement("DIV");
            fragment.tabIndex = (tabIndex ? tabIndex : 0);
            fragment.addEventListener("beforeactivate", beforeActivateHandler);
            fragment.setAttribute("aria-hidden", "true");
            return fragment;
        };

        var parent = element.parentNode;

        // Insert prefix focus catcher
        var catcherBegin = createCatcher(prefixBeforeActivateHandler.bind(this));
        parent.insertBefore(catcherBegin, element);

        // Insert postfix focus catcher
        var catcherEnd = createCatcher(postfixBeforeActivateHandler.bind(this));
        parent.insertBefore(catcherEnd, element.nextSibling);

        var refCount = 1;
        this.addRef = function () {
            refCount++;
        };
        this.release = function () {
            if (--refCount === 0) {
                if (catcherBegin.parentElement) {
                    parent.removeChild(catcherBegin);
                }
                if (catcherEnd.parentElement) {
                    parent.removeChild(catcherEnd);
                }
            }
            return refCount;
        };
        this.updateTabIndex = function (tabIndex) {
            catcherBegin.tabIndex = tabIndex;
            catcherEnd.tabIndex = tabIndex;
        }
    }

    WinJS.Namespace.define("WinJS.UI.TrackTabBehavior", {
        attach: function (element, tabIndex) {
            ///
            if (!element["win-trackTabHelperObject"]) {
                element["win-trackTabHelperObject"] = new TabHelperObject(element, tabIndex);
            } else {
                element["win-trackTabHelperObject"].addRef();
            }

            return element["win-trackTabHelperObject"];
        },

        detach: function (element) {
            ///
            if (!element["win-trackTabHelperObject"].release()) {
                delete element["win-trackTabHelperObject"];
            }
        }
    });

    WinJS.Namespace.define("WinJS.UI", {
        TabContainer: WinJS.Class.define(function TabContainer_ctor(element, options) {
            /// <signature helpKeyword="WinJS.UI.TabContainer.TabContainer">
            /// <summary locid="WinJS.UI.TabContainer.constructor">
            /// Constructs the TabContainer.
            /// </summary>
            /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.TabContainer.constructor_p:element">
            /// The DOM element to be associated with the TabContainer.
            /// </param>
            /// <param name="options" type="Object" locid="WinJS.UI.TabContainer.constructor_p:options">
            /// The set of options to be applied initially to the TabContainer.
            /// </param>
            /// <returns type="WinJS.UI.TabContainer" locid="WinJS.UI.TabContainer.constructor_returnValue">
            /// A constructed TabContainer.
            /// </returns>
            /// </signature>
            // TabContainer uses 2 TrackTabBehavior for its implementation: one for itself, another one for the active element.
            // When onTabEnter is caught on TabContainer, it directly set focus on the active element.
            // When onTabExit is caught on the active element (_tabExitHandler), it first prevents focus from being set on any element,
            // effectively letting the focus skip any remaining items in the TabContainer. Then, when onTabExit is caught on
            // TabContainer, it turns back on the possibility to receive focus on child elements.
            this._element = element;
            this._tabIndex = 0;
            var that = this;
            this._tabExitHandler = function () {
                that._canFocus(false);
            };

            element.addEventListener("onTabEnter", function () {
                if (that.childFocus) {
                    that.childFocus.focus();
                } else {
                    that._canFocus(false);
                }
            });

            element.addEventListener("onTabExit", function () {
                that._canFocus(true);
            });

            this._elementTabHelper = WinJS.UI.TrackTabBehavior.attach(element, this._tabIndex);
        }, {

            // Public members

            /// <signature helpKeyword="WinJS.UI.TabContainer.dispose">
            /// <summary locid="WinJS.UI.TabContainer.dispose">
            /// Disposes the Tab Container.
            /// </summary>
            /// </signature>
            dispose: function () {
                WinJS.UI.TrackTabBehavior.detach(this._element, this._tabIndex);
            },

            /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.TabContainer.childFocus" helpKeyword="WinJS.UI.TabContainer.childFocus">
            /// Gets or sets the child element that has focus.
            /// </field>
            childFocus: {
                set: function (e) {
                    if (e != this._focusElement) {
                        if (this._focusElement) {
                            WinJS.UI.TrackTabBehavior.detach(this._focusElement);
                            this._childTabHelper = null;
                            this._focusElement.removeEventListener("onTabExit", this._tabExitHandler);
                        }

                        if (e && e.parentNode) {
                            this._focusElement = e;
                            this._childTabHelper = WinJS.UI.TrackTabBehavior.attach(e, this._tabIndex);
                            this._focusElement.addEventListener("onTabExit", this._tabExitHandler);
                        } else {
                            //#DBG _ASSERT(!!e.parentNode);
                            this._focusElement = null;
                        }
                    }
                },
                get: function () {
                    return this._focusElement;
                }
            },

            /// <field type="Number" integer="true" locid="WinJS.UI.TabContainer.tabIndex" helpKeyword="WinJS.UI.TabContainer.tabIndex">
            /// Gets or sets the tab order of the control within its container.
            /// </field>
            tabIndex: {
                set: function (tabIndex) {
                    this._tabIndex = tabIndex;
                    this._elementTabHelper.updateTabIndex(tabIndex);
                    if (this._childTabHelper) {
                        this._childTabHelper.updateTabIndex(tabIndex);
                    }
                },

                get: function () {
                    return this._tabIndex;
                }
            },

            // Private members

            _element: null,
            _skipper: function (e) {
                e.stopPropagation();
                e.preventDefault();
            },
            _canFocus: function (canfocus) {
                if (canfocus) {
                    this._element.removeEventListener("beforeactivate", this._skipper);
                } else {
                    this._element.addEventListener("beforeactivate", this._skipper);
                }
            },

            _focusElement: null

        }, { // Static Members
            supportedForProcessing: false,
        })
    });
})(this, WinJS);