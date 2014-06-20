// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    './_ElementUtilities'
    ], function tabManagerInit(exports, _Global, _Base, _BaseUtils, _ElementUtilities) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    function fireEvent(element, name, forward, cancelable) {
        var event = document.createEvent('UIEvent');
        event.initUIEvent(name, false, !!cancelable, _Global, forward ? 1 : 0);
        return !element.dispatchEvent(event);
    }

    var getTabIndex = _ElementUtilities.getTabIndex;

    // tabbableElementsNodeFilter works with the TreeWalker to create a view of the DOM tree that is built up of what we want the focusable tree to look like.
    // When it runs into a tab contained area, it rejects anything except the childFocus element so that any potentially tabbable things that the TabContainer
    // doesn't want tabbed to get ignored. 
    function tabbableElementsNodeFilter(node) {
        var nodeStyle = getComputedStyle(node);
        if (nodeStyle.display === "none" || nodeStyle.visibility === "hidden") {
            return NodeFilter.FILTER_REJECT;
        }
        if (node._tabContainer) {
            return NodeFilter.FILTER_ACCEPT;
        }
        if (node.parentNode && node.parentNode._tabContainer) {
            var managedTarget = node.parentNode._tabContainer.childFocus;
            // Ignore subtrees that are under a tab manager but not the child focus. If a node is contained in the child focus, either accept it (if it's tabbable itself), or skip it and find tabbable content inside of it.
            if (managedTarget && node.contains(managedTarget)) {
                return (getTabIndex(node) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP);
            }
            return NodeFilter.FILTER_REJECT;
        }
        var tabIndex = getTabIndex(node);
        if (tabIndex >= 0) {
            return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
    }

    // We've got to manually scrape the results the walker generated, since the walker will have generated a fairly good representation of the tabbable tree, but
    // won't have a perfect image. Trees like this cause a problem for the walker:
    //     [ tabContainer element ]
    //   [ element containing childFocus ]
    //  [ childFocus ] [ sibling of child focus that has tabIndex >= 0 ]
    // We can't tell the tree walker to jump right to the childFocus, so it'll collect the childFocus but also that sibling element. We don't want that sibling element
    // to appear in our version of the tabOrder, so scrapeTabManagedSubtree will take the pretty accurate representation we get from the TreeWalker, and do a little
    // more pruning to give us only the nodes we're interested in.
    function scrapeTabManagedSubtree(walker) {
        var tabManagedElement = walker.currentNode,
            childFocus = tabManagedElement._tabContainer.childFocus,
            elementsFound = [];

        if (!childFocus) {
            return [];
        }

        walker.currentNode = childFocus;
        function scrapeSubtree() {
            if (walker.currentNode._tabContainer) {
                elementsFound = elementsFound.concat(scrapeTabManagedSubtree(walker));
            } else {
                // A child focus can have tabIndex = -1, so check the tabIndex before marking it as valid
                if (getTabIndex(walker.currentNode) >= 0) {
                    elementsFound.push(walker.currentNode);
                }
                if (walker.firstChild()) {
                    do {
                        scrapeSubtree();
                    } while (walker.nextSibling());
                    walker.parentNode();
                }
            }
        }
        scrapeSubtree();
        walker.currentNode = tabManagedElement;

        return elementsFound;
    }

    function TabHelperObject(element, tabIndex) {
        function createCatcher() {
            var fragment = document.createElement("DIV");
            fragment.tabIndex = (tabIndex ? tabIndex : 0);
            fragment.setAttribute("aria-hidden", true);
            return fragment;
        }

        var parent = element.parentNode;

        // Insert prefix focus catcher
        var catcherBegin = createCatcher();
        parent.insertBefore(catcherBegin, element);

        // Insert postfix focus catcher
        var catcherEnd = createCatcher();
        parent.insertBefore(catcherEnd, element.nextSibling);

        catcherBegin.addEventListener("focus", function () {
            fireEvent(element, "onTabEnter", true);
        }, true);
        catcherEnd.addEventListener("focus", function () {
            fireEvent(element, "onTabEnter", false);
        }, true);

        this._catcherBegin = catcherBegin;
        this._catcherEnd = catcherEnd;
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

    var TrackTabBehavior = {
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
    };

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        TrackTabBehavior: TrackTabBehavior,
        TabContainer: _Base.Class.define(function TabContainer_ctor(element, options) {
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
            this._element = element;
            this._tabIndex = 0;
            element._tabContainer = this;
            if (element.getAttribute("tabindex") === null) {
                element.tabIndex = -1;
            }
            var that = this;

            element.addEventListener("onTabEnter", function (e) {
                var skipDefaultBehavior = fireEvent(that._element, "onTabEntered", e.detail, true);
                if (skipDefaultBehavior) {
                    return;
                }

                if (that.childFocus) {
                    that.childFocus.focus();
                } else {
                    element.focus();
                }
            });
            element.addEventListener("keydown", function (e) {
                var targetElement = e.target;
                if (e.keyCode === _ElementUtilities.Key.tab) {
                    var forwardTab = !e.shiftKey;
                    var canKeepTabbing = that._hasMoreElementsInTabOrder(targetElement, forwardTab);
                    if (!canKeepTabbing) {
                        var skipTabExitHandling = fireEvent(that._element, "onTabExiting", forwardTab, true);
                        if (skipTabExitHandling) {
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        }
                        var allTabbableElements = that._element.querySelectorAll("a[href],area[href],button,command,input,link,menuitem,object,select,textarea,th[sorted],[tabindex]"),
                            len = allTabbableElements.length,
                            originalTabIndices = [];

                        for (var i = 0; i < len; i++) {
                            var element = allTabbableElements[i];
                            originalTabIndices.push(element.tabIndex);
                            element.tabIndex = -1;
                        }
                        // If there's nothing else that can be tabbed to on the page, tab should wrap around back to the tab contained area.
                        // We'll disable the sentinel node that's directly in the path of the tab order (catcherEnd for forward tabs, and 
                        // catcherBegin for shift+tabs), but leave the other sentinel node untouched so tab can wrap around back into the region.
                        that._elementTabHelper[forwardTab ? "_catcherEnd" : "_catcherBegin"].tabIndex = -1;

                        var restoreTabIndicesOnBlur = function () {
                            targetElement.removeEventListener("blur", restoreTabIndicesOnBlur, false);
                            for (var i = 0; i < len; i++) {
                                if (originalTabIndices[i] !== -1) {
                                    // When the original tabIndex was -1, don't try restoring to -1 again. A nested TabContainer might also be in the middle of handling this same code, 
                                    // and so would have set tabIndex = -1 on this element. The nested tab container will restore the element's tabIndex properly.
                                    allTabbableElements[i].tabIndex = originalTabIndices[i];
                                }
                            }
                            that._elementTabHelper._catcherBegin.tabIndex = that._tabIndex;
                            that._elementTabHelper._catcherEnd.tabIndex = that._tabIndex;
                        }
                        targetElement.addEventListener("blur", restoreTabIndicesOnBlur, false);
                        _BaseUtils._yieldForEvents(function () {
                            fireEvent(that._element, "onTabExit", forwardTab);
                        });
                    }
                }
            });

            this._elementTabHelper = TrackTabBehavior.attach(element, this._tabIndex);
            this._elementTabHelper._catcherBegin.tabIndex = 0;
            this._elementTabHelper._catcherEnd.tabIndex = 0;
        }, {

            // Public members

            /// <signature helpKeyword="WinJS.UI.TabContainer.dispose">
            /// <summary locid="WinJS.UI.TabContainer.dispose">
            /// Disposes the Tab Container.
            /// </summary>
            /// </signature>
            dispose: function () {
                TrackTabBehavior.detach(this._element, this._tabIndex);
            },

            /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.TabContainer.childFocus" helpKeyword="WinJS.UI.TabContainer.childFocus">
            /// Gets or sets the child element that has focus.
            /// </field>
            childFocus: {
                set: function (e) {
                    if (e != this._focusElement) {
                        if (e && e.parentNode) {
                            this._focusElement = e;
                        } else {
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
            _hasMoreElementsInTabOrder: function (currentFocus, movingForwards) {
                if (!this.childFocus) {
                    return false;
                }
                var walker = document.createTreeWalker(this._element, NodeFilter.SHOW_ELEMENT, tabbableElementsNodeFilter, false);
                var tabStops = scrapeTabManagedSubtree(walker);
                for (var i = 0; i < tabStops.length; i++) {
                    if (tabStops[i] === currentFocus) {
                        return (movingForwards ? (i < tabStops.length - 1) : (i > 0));
                    }
                }
                return false;
            },
            _focusElement: null

        }, { // Static Members
            supportedForProcessing: false,
        })
    });

});