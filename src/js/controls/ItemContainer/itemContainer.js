// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
﻿(function itemContainerInit(global, WinJS, undefined) {
    "use strict";

    var utilities = WinJS.Utilities;
    var createEvent = utilities._createEventProperty;
    var eventNames = {
        invoked: "invoked",
        selectionchanging: "selectionchanging",
        selectionchanged: "selectionchanged"
    };

    WinJS.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.ItemContainer">
        /// Defines an item that can be pressed, swiped, and dragged. 
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.itemcontainer.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.itemcontainer.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[
        /// <div data-win-control="WinJS.UI.ItemContainer" data-win-options="{swipeBehavior: 'select'}">HTML content</div>
        /// ]]></htmlSnippet>
        /// <event name="invoked" bubbles="true" locid="WinJS.UI.ItemContainer_e:invoked">Raised when the user taps or clicks the item.</event>
        /// <event name="selectionchanging" bubbles="true" locid="WinJS.UI.ItemContainer_e:selectionchanging">Raised before the item is selected or deselected.</event>
        /// <event name="selectionchanged" bubbles="true" locid="WinJS.UI.ItemContainer_e:selectionchanged">Raised after the item is selected or deselected.</event>
        /// <part name="itemcontainer" class="win-itemcontainer" locid="WinJS.UI.ItemContainer_part:itemcontainer">Main container for the selection item control.</part>
        /// <part name="selectionbackground" class="win-selectionbackground" locid="WinJS.UI.ItemContainer_part:selectionbackground">The background of a selection checkmark.</part>
        /// <part name="selectioncheckmark" class="win-selectioncheckmark" locid="WinJS.UI.ItemContainer_part:selectioncheckmark">A selection checkmark.</part>
        /// <part name="focusedoutline" class="win-focusedoutline" locid="WinJS.UI.ItemContainer_part:focusedoutline">Used to display an outline when the main container has keyboard focus.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ItemContainer: WinJS.Namespace._lazy(function () {
            var strings = {
                get duplicateConstruction() { return WinJS.Resources._getWinJSString("ui/duplicateConstruction").value; }
            };

            var ItemContainer = WinJS.Class.define(function ItemContainer_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.ItemContainer.ItemContainer">
                /// <summary locid="WinJS.UI.ItemContainer.constructor">
                /// Creates a new ItemContainer control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.ItemContainer.constructor_p:element">
                /// The DOM element that hosts the ItemContainer control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.ItemContainer.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the selectionchanging event,
                /// add a property named "onselectionchanging" to the options object and set its value to the event handler.
                /// </param>
                /// <returns type="WinJS.UI.ItemContainer" locid="WinJS.UI.ItemContainer.constructor_returnValue">
                /// The new ItemContainer control.
                /// </returns>
                /// </signature>
                element = element || document.createElement("DIV");
                this._id = element.id || WinJS.Utilities._uniqueID(element);
                this._writeProfilerMark("constructor,StartTM");

                options = options || {};

                if (element.winControl) {
                    throw new WinJS.ErrorFromName("WinJS.UI.ItemContainer.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Attaching JS control to DOM element
                element.winControl = this;

                this._element = element;
                WinJS.Utilities.addClass(element, "win-disposable");
                this._selectionMode = WinJS.UI.SelectionMode.single;
                this._draggable = false;
                this._pressedEntity = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };

                this.tapBehavior = WinJS.UI.TapBehavior.invokeOnly;
                this.swipeOrientation = WinJS.UI.Orientation.vertical;
                this.swipeBehavior = WinJS.UI.SwipeBehavior.select;

                WinJS.Utilities.addClass(this.element, WinJS.UI.ItemContainer._ClassName.itemContainer + " " + WinJS.UI._containerClass);

                this._setupInternalTree();

                this._selection = new WinJS.UI._SingleItemSelectionManager(element, this._itemBox);
                this._setTabIndex();

                WinJS.UI.setOptions(this, options);

                this._mutationObserver = new MutationObserver(this._itemPropertyChange.bind(this));
                this._mutationObserver.observe(element, { attributes: true, attributeFilter: ["aria-selected"] });
                this._setAriaRole();

                var that = this;
                if (!this.selectionDisabled) {
                    WinJS.Utilities.Scheduler.schedule(function ItemContainer_async_initialize() {
                        that._setDirectionClass();
                    }, WinJS.Utilities.Scheduler.Priority.normal, null, "WinJS.UI.ItemContainer_async_initialize");
                }
                this._itemEventsHandler = new WinJS.UI._ItemEventsHandler(Object.create({
                    containerFromElement: function (element) {
                        return that.element;
                    },
                    indexForItemElement: function (element) {
                        return 1;
                    },
                    indexForHeaderElement: function () {
                        return WinJS.UI._INVALID_INDEX;
                    },
                    itemBoxAtIndex: function (index) {
                        return that._itemBox;
                    },
                    itemAtIndex: function (index) {
                        return that.element;
                    },
                    headerAtIndex: function (index) {
                        return null;
                    },
                    containerAtIndex: function (index) {
                        return that.element;
                    },
                    isZombie: function () {
                        return this._disposed;
                    },
                    getItemPosition: function (index) {
                        return that._getItemPosition();
                    },
                    rtl: function () {
                        return that._rtl();
                    },
                    fireInvokeEvent: function (itemIndex, itemElement) {
                        that._fireInvokeEvent();
                    },
                    verifySelectionAllowed: function (index) {
                        return that._verifySelectionAllowed();
                    },
                    changeFocus: function (newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused) { },
                    selectRange: function (firstIndex, lastIndex, additive) {
                        return that._selection.set({ firstIndex: firstIndex, lastIndex: lastIndex });
                    }
                }, {
                    pressedEntity: {
                        get: function () {
                            return that._pressedEntity;
                        },
                        set: function (value) {
                            that._pressedEntity = value;
                        }
                    },
                    pressedElement: {
                        enumerable: true,
                        set: function (value) {
                            that._pressedElement = value;
                        }
                    },
                    eventHandlerRoot: {
                        enumerable: true,
                        get: function () {
                            return that.element;
                        }
                    },
                    swipeBehavior: {
                        enumerable: true,
                        get: function () {
                            return that._swipeBehavior;
                        }
                    },
                    selectionMode: {
                        enumerable: true,
                        get: function () {
                            return that._selectionMode;
                        }
                    },
                    accessibleItemClass: {
                        enumerable: true,
                        get: function () {
                            // CSS class of the element with the aria role
                            return WinJS.UI._containerClass;
                        }
                    },
                    canvasProxy: {
                        enumerable: true,
                        get: function () {
                            return that._captureProxy;
                        }
                    },
                    tapBehavior: {
                        enumerable: true,
                        get: function () {
                            return that._tapBehavior;
                        }
                    },
                    draggable: {
                        enumerable: true,
                        get: function () {
                            return that._draggable;
                        }
                    },
                    selection: {
                        enumerable: true,
                        get: function () {
                            return that._selection;
                        }
                    },
                    horizontal: {
                        enumerable: true,
                        get: function () {
                            return that._swipeOrientation === WinJS.UI.Orientation.vertical;
                        }
                    },
                    customFootprintParent: {
                        enumerable: true,
                        get: function () {
                            // Use the main container as the footprint
                            return null;
                        }
                    },
                    skipPreventDefaultOnPointerDown: {
                        enumerable: true,
                        get: function () {
                            return true;
                        }
                    }
                }));

                function eventHandler(eventName, caseSensitive, capture) {
                    return {
                        name: (caseSensitive ? eventName : eventName.toLowerCase()),
                        handler: function (eventObject) {
                            that["_on" + eventName](eventObject);
                        },
                        capture: capture
                    };
                }
                var events = [
                    eventHandler("MSManipulationStateChanged", true, true),
                    eventHandler("PointerDown"),
                    eventHandler("Click"),
                    eventHandler("PointerUp"),
                    eventHandler("PointerCancel"),
                    eventHandler("LostPointerCapture"),
                    eventHandler("ContextMenu"),
                    eventHandler("MSHoldVisual", true),
                    eventHandler("FocusIn"),
                    eventHandler("FocusOut"),
                    eventHandler("DragStart"),
                    eventHandler("DragEnd"),
                    eventHandler("KeyDown")
                ];
                events.forEach(function (eventHandler) {
                    WinJS.Utilities._addEventListener(that.element, eventHandler.name, eventHandler.handler, !!eventHandler.capture);
                });

                this._writeProfilerMark("constructor,StopTM");
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ItemContainer.element" helpKeyword="WinJS.UI.ItemContainer.element">
                /// Gets the DOM element that hosts the itemContainer control.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ItemContainer.draggable" helpKeyword="WinJS.UI.ItemContainer.draggable">
                /// Gets or sets a value that specifies whether the item can be dragged. The default value is false. 
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                draggable: {
                    get: function () {
                        return this._draggable;
                    },

                    set: function (value) {
                        if (utilities.isPhone) {
                            return;
                        }
                        if (this._draggable !== value) {
                            this._draggable = value;
                            this._updateDraggableAttribute();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ItemContainer.selected" helpKeyword="WinJS.UI.ItemContainer.selected">
                /// Gets or sets a value that specifies whether the item is selected.
                /// </field>
                selected: {
                    get: function () {
                        return this._selection.selected;
                    },

                    set: function (value) {
                        if (this._selection.selected !== value) {
                            this._selection.selected = value;
                        }
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.ItemContainer.swipeOrientation" helpKeyword="WinJS.UI.ItemContainer.swipeOrientation">
                /// Gets or sets the swipe orientation of the ItemContainer control.
                /// The default value is "vertical".
                /// </field>
                swipeOrientation: {
                    get: function () {
                        return this._swipeOrientation;
                    },
                    set: function (value) {
                        if (value === WinJS.UI.Orientation.vertical) {
                            WinJS.Utilities.removeClass(this.element, WinJS.UI.ItemContainer._ClassName.horizontal);
                            WinJS.Utilities.addClass(this.element, WinJS.UI.ItemContainer._ClassName.vertical);
                        } else {
                            value = WinJS.UI.Orientation.horizontal;
                            WinJS.Utilities.removeClass(this.element, WinJS.UI.ItemContainer._ClassName.vertical);
                            WinJS.Utilities.addClass(this.element, WinJS.UI.ItemContainer._ClassName.horizontal);
                        }
                        this._swipeOrientation = value;
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.TapBehavior" locid="WinJS.UI.ItemContainer.tapBehavior" helpKeyword="WinJS.UI.ItemContainer.tapBehavior">
                /// Gets or sets how the ItemContainer control reacts when the user taps or clicks an item.
                /// The tap or click can invoke the item, select it and invoke it, or have no effect. 
                /// Possible values: "toggleSelect", "invokeOnly", and "none". The default value is "invokeOnly".
                /// </field>
                tapBehavior: {
                    get: function () {
                        return this._tapBehavior;
                    },
                    set: function (value) {
                        if (utilities.isPhone && value === WinJS.UI.TapBehavior.directSelect) {
                            return;
                        }
                        this._tapBehavior = value;
                        this._setAriaRole();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.SwipeBehavior" locid="WinJS.UI.ItemContainer.swipeBehavior" helpKeyword="WinJS.UI.ItemContainer.swipeBehavior">
                /// Gets or sets how the ItemContainer control reacts to the swipe interaction.
                /// The swipe gesture can select the item or it can have no effect on the current selection.
                /// Possible values: "select", "none". The default value is: "select".
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                swipeBehavior: {
                    get: function () {
                        return this._swipeBehavior;
                    },
                    set: function (value) {
                        this._swipeBehavior = value;
                        this._setSwipeClass();
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ItemContainer.selectionDisabled" helpKeyword="WinJS.UI.ItemContainer.selectionDisabled">
                /// Gets or sets whether the item selection is disabled. The default value is false. 
                /// </field>
                selectionDisabled: {
                    get: function () {
                        return this._selectionMode === WinJS.UI.SelectionMode.none;
                    },

                    set: function (value) {
                        if (value) {
                            this._selectionMode = WinJS.UI.SelectionMode.none;
                        } else {
                            this._setDirectionClass();
                            this._selectionMode = WinJS.UI.SelectionMode.single;
                        }
                        this._setSwipeClass();
                        this._setAriaRole();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ItemCotrol.oninvoked" helpKeyword="WinJS.UI.ItemCotrol.oninvoked">
                /// Raised when the item is invoked. You can use the tapBehavior property to specify whether taps and clicks invoke the item. 
                /// </field>
                oninvoked: createEvent(eventNames.invoked),

                /// <field type="Function" locid="WinJS.UI.ItemCotrol.onselectionchanging" helpKeyword="WinJS.UI.ItemCotrol.onselectionchanging">
                /// Raised just before the item is selected or deselected.
                /// </field>
                onselectionchanging: createEvent(eventNames.selectionchanging),

                /// <field type="Function" locid="WinJS.UI.ItemCotrol.onselectionchanged" helpKeyword="WinJS.UI.ItemCotrol.onselectionchanged">
                /// Raised after the item is selected or deselected.
                /// </field>
                onselectionchanged: createEvent(eventNames.selectionchanged),

                forceLayout: function () {
                    /// <signature helpKeyword="WinJS.UI.ItemContainer.forceLayout">
                    /// <summary locid="WinJS.UI.ItemContainer.forceLayout">
                    /// Forces the ItemContainer control to update its layout.
                    /// Use this function when the reading direction  of the app changes after the control has been initialized.
                    /// </summary>
                    /// </signature>
                    this._forceLayout();
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ItemContainer.dispose">
                    /// <summary locid="WinJS.UI.ItemContainer.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>

                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._itemEventsHandler.dispose();
                    WinJS.Utilities.disposeSubTree(this.element);
                },

                _onMSManipulationStateChanged: function ItemContainer_onMSManipulationStateChanged(eventObject) {
                    this._itemEventsHandler.onMSManipulationStateChanged(eventObject);
                },

                _onPointerDown: function ItemContainer_onPointerDown(eventObject) {
                    this._itemEventsHandler.onPointerDown(eventObject);
                },

                _onClick: function ItemContainer_onClick(eventObject) {
                    this._itemEventsHandler.onClick(eventObject);
                },

                _onPointerUp: function ItemContainer_onPointerUp(eventObject) {
                    if (utilities.hasClass(this._itemBox, WinJS.UI._itemFocusClass)) {
                        this._onFocusOut(eventObject);
                    }
                    this._itemEventsHandler.onPointerUp(eventObject);
                },

                _onPointerCancel: function ItemContainer_onPointerCancel(eventObject) {
                    this._itemEventsHandler.onPointerCancel(eventObject);
                },

                _onLostPointerCapture: function ItemContainer_onLostPointerCapture(eventObject) {
                    this._itemEventsHandler.onLostPointerCapture(eventObject);
                },

                _onContextMenu: function ItemContainer_onContextMenu(eventObject) {
                    this._itemEventsHandler.onContextMenu(eventObject);
                },

                _onMSHoldVisual: function ItemContainer_onMSHoldVisual(eventObject) {
                    this._itemEventsHandler.onMSHoldVisual(eventObject);
                },

                _onFocusIn: function ItemContainer_onFocusIn(eventObject) {
                    if (this._itemBox.querySelector("." + WinJS.UI._itemFocusOutlineClass) || !WinJS.UI._keyboardSeenLast) {
                        return;
                    }
                    utilities.addClass(this._itemBox, WinJS.UI._itemFocusClass);
                    var outline = document.createElement("div");
                    outline.className = WinJS.UI._itemFocusOutlineClass;
                    this._itemBox.appendChild(outline);
                },

                _onFocusOut: function ItemContainer_onFocusOut(eventObject) {
                    utilities.removeClass(this._itemBox, WinJS.UI._itemFocusClass);
                    var outline = this._itemBox.querySelector("." + WinJS.UI._itemFocusOutlineClass);
                    if (outline) {
                        outline.parentNode.removeChild(outline);
                    }
                },

                _onDragStart: function ItemContainer_onDragStart(eventObject) {
                    // Drag shouldn't be initiated when the user holds down the mouse on a win-interactive element and moves.
                    // The problem is that the dragstart event's srcElement+target will both be an itembox (which has draggable=true), so we can't check for win-interactive in the dragstart event handler.
                    // The itemEventsHandler sets our _pressedElement field on PointerDown, so we use that instead when checking for interactive.
                    if (this._pressedElement && this._itemEventsHandler._isInteractive(this._pressedElement)) {
                        eventObject.preventDefault();
                    } else {
                        this._dragging = true;
                        var that = this;
                        // We delay setting the win-dragsource CSS class so that IE has time to create a thumbnail before me make it opaque
                        WinJS.Utilities._yieldForDomModification(function () {
                            if (that._dragging) {
                                utilities.addClass(that._itemBox, WinJS.UI._dragSourceClass);
                            }
                        });
                    }
                },

                _onDragEnd: function ItemContainer_onDragEnd(eventObject) {
                    this._dragging = false;
                    utilities.removeClass(this._itemBox, WinJS.UI._dragSourceClass);
                    this._itemEventsHandler.resetPointerDownState();
                },

                _onKeyDown: function ItemContainer_onKeyDown(eventObject) {
                    if (!this._itemEventsHandler._isInteractive(eventObject.target)) {
                        var Key = utilities.Key,
                            keyCode = eventObject.keyCode,
                            swipeEnabled = this._swipeBehavior === WinJS.UI.SwipeBehavior.select;

                        var handled = false;
                        if (!eventObject.ctrlKey && keyCode === Key.enter) {
                            var allowed = this._verifySelectionAllowed();
                            if (allowed.canTapSelect) {
                                this.selected = !this.selected;
                            }
                            this._fireInvokeEvent();
                            handled = true;
                        } else if (eventObject.ctrlKey && keyCode === Key.enter ||
                            (swipeEnabled && eventObject.shiftKey && keyCode === Key.F10) ||
                            (swipeEnabled && keyCode === Key.menu) ||
                            keyCode === Key.space) {
                            if (!this.selectionDisabled) {
                                this.selected = !this.selected;
                                handled = WinJS.Utilities._setActive(this.element);
                            }
                        } else if (keyCode === Key.escape && this.selected) {
                            this.selected = false;
                            handled = true;
                        }

                        if (handled) {
                            eventObject.stopPropagation();
                            eventObject.preventDefault();
                        }
                    }
                },

                _setTabIndex: function ItemContainer_setTabIndex() {
                    var currentTabIndex = this.element.getAttribute("tabindex");
                    if (!currentTabIndex) {
                        // Set the tabindex to 0 only if the application did not already
                        // provide a tabindex
                        this.element.setAttribute("tabindex", "0")
                    }
                },

                _rtl: function ItemContainer_rtl() {
                    if (typeof this._cachedRTL !== "boolean") {
                        this._cachedRTL = window.getComputedStyle(this.element, null).direction === "rtl";
                    }
                    return this._cachedRTL;
                },

                _setDirectionClass: function ItemContainer_setDirectionClass() {
                    utilities[this._rtl() ? "addClass" : "removeClass"](this.element, WinJS.UI._rtlListViewClass);
                },

                _forceLayout: function ItemContainer_forceLayout() {
                    this._cachedRTL = window.getComputedStyle(this.element, null).direction === "rtl";
                    this._setDirectionClass();
                },

                _getItemPosition: function ItemContainer_getItemPosition() {
                    var container = this.element;
                    if (container) {
                        return WinJS.Promise.wrap({
                            left: (this._rtl() ?
                                container.offsetParent.offsetWidth - container.offsetLeft - container.offsetWidth :
                                container.offsetLeft),
                            top: container.offsetTop,
                            totalWidth: utilities.getTotalWidth(container),
                            totalHeight: utilities.getTotalHeight(container),
                            contentWidth: utilities.getContentWidth(container),
                            contentHeight: utilities.getContentHeight(container)
                        });
                    } else {
                        return WinJS.Promise.cancel;
                    }
                },

                _itemPropertyChange: function ItemContainer_itemPropertyChange(list) {
                    if (this._disposed) { return; }

                    var container = list[0].target;
                    var ariaSelected = container.getAttribute("aria-selected") === "true";

                    // Only respond to aria-selected changes coming from UIA. This check
                    // relies on the fact that, in renderSelection, we update the selection
                    // visual before aria-selected.
                    if (ariaSelected !== WinJS.UI._isSelectionRendered(this._itemBox)) {
                        if (this.selectionDisabled) {
                            // Revert the change made by UIA since the control has selection disabled
                            WinJS.UI._setAttribute(container, "aria-selected", !ariaSelected);
                        } else {
                            this.selected = ariaSelected;
                            // Revert the change because the update was prevented on the selectionchanging event
                            if (ariaSelected !== this.selected) {
                                WinJS.UI._setAttribute(container, "aria-selected", !ariaSelected);
                            }
                        }
                    }
                },

                _setSwipeClass: function ItemContainer_setSwipeClass() {
                    if (utilities.isPhone) {
                        // Cross-slide is disabled on phone
                        return;
                    }
                    // We apply an -ms-touch-action style to block panning and swiping from occurring at the same time.
                    if ((this._swipeBehavior === WinJS.UI.SwipeBehavior.select && this._selectionMode !== WinJS.UI.SelectionMode.none) || this._draggable) {
                        utilities.addClass(this._element, WinJS.UI._swipeableClass);
                    } else {
                        utilities.removeClass(this._element, WinJS.UI._swipeableClass);
                    }
                },

                _updateDraggableAttribute: function ItemContainer_updateDraggableAttribute() {
                    this._setSwipeClass();
                    this._itemBox.setAttribute("draggable", this._draggable);
                },

                _verifySelectionAllowed: function ItemContainer_verifySelectionAllowed() {
                    if (this._selectionMode !== WinJS.UI.SelectionMode.none && (this._tapBehavior === WinJS.UI.TapBehavior.toggleSelect || this._swipeBehavior === WinJS.UI.SwipeBehavior.select)) {
                        var canSelect = this._selection.fireSelectionChanging();
                        return {
                            canSelect: canSelect,
                            canTapSelect: canSelect && this._tapBehavior === WinJS.UI.TapBehavior.toggleSelect
                        };
                    } else {
                        return {
                            canSelect: false,
                            canTapSelect: false
                        };
                    }
                },

                _setupInternalTree: function ItemContainer_setupInternalTree() {
                    var item = document.createElement("div");
                    item.className = WinJS.UI._itemClass;
                    this._captureProxy = document.createElement("div");
                    this._itemBox = document.createElement("div");
                    this._itemBox.className = WinJS.UI._itemBoxClass;
                    var child = this.element.firstChild;
                    while (child) {
                        var sibling = child.nextSibling;
                        item.appendChild(child);
                        child = sibling;
                    }
                    this.element.appendChild(this._itemBox);
                    this._itemBox.appendChild(item);
                    this.element.appendChild(this._captureProxy);
                },

                _fireInvokeEvent: function ItemContainer_fireInvokeEvent() {
                    if (this.tapBehavior !== WinJS.UI.TapBehavior.none) {
                        var eventObject = document.createEvent("CustomEvent");
                        eventObject.initCustomEvent(eventNames.invoked, true, false, {});
                        this.element.dispatchEvent(eventObject);
                    }
                },

                _setAriaRole: function ItemContainer_setAriaRole() {
                    if (!this.element.getAttribute("role") || this._usingDefaultItemRole) {
                        this._usingDefaultItemRole = true;
                        var defaultItemRole;
                        if (this.tapBehavior === WinJS.UI.TapBehavior.none && this.selectionDisabled) {
                            defaultItemRole = "listitem";
                        } else {
                            defaultItemRole = "option";
                        }
                        WinJS.UI._setAttribute(this.element, "role", defaultItemRole);
                    }
                },

                _writeProfilerMark: function ItemContainer_writeProfilerMark(text) {
                    var message = "WinJS.UI.ItemContainer:" + this._id + ":" + text;
                    WinJS.Utilities._writeProfilerMark(message);
                    WinJS.log && WinJS.log(message, null, "itemcontainerprofiler");
                }
            }, {
                // Names of classes used by the ItemContainer.
                _ClassName: {
                    itemContainer: "win-itemcontainer",
                    vertical: "win-vertical",
                    horizontal: "win-horizontal",
                }
            });
            WinJS.Class.mix(ItemContainer, WinJS.UI.DOMEventMixin);
            return ItemContainer;
        }),

        _SingleItemSelectionManager: WinJS.Namespace._lazy(function () {
            return WinJS.Class.define(function SingleItemSelectionManager_ctor(element, itemBox) {
                this._selected = false;
                this._element = element;
                this._itemBox = itemBox;
            }, {
                selected: {
                    get: function () {
                        return this._selected;
                    },
                    set: function (value) {
                        value = !!value;
                        if (this._selected !== value) {
                            if (this.fireSelectionChanging()) {
                                this._selected = value;
                                WinJS.UI._ItemEventsHandler.renderSelection(this._itemBox, this._element, value, true, this._element);
                                this.fireSelectionChanged();
                            }
                        }
                    }
                },

                count: function SingleItemSelectionManager_count() {
                    return this._selected ? 1 : 0;
                },

                getIndices: function SingleItemSelectionManager_getIndices() {
                    // not used
                },

                getItems: function SingleItemSelectionManager_getItems() {
                    // not used
                },

                getRanges: function SingleItemSelectionManager_getRanges() {
                    // not used
                },

                isEverything: function SingleItemSelectionManager_isEverything() {
                    return false;
                },

                set: function SingleItemSelectionManager_set(items) {
                    this.selected = true;
                },

                clear: function SingleItemSelectionManager_clear() {
                    this.selected = false;
                },

                add: function SingleItemSelectionManager_add(items) {
                    this.selected = true;
                },

                remove: function SingleItemSelectionManager_remove(items) {
                    this.selected = false;
                },

                selectAll: function SingleItemSelectionManager_selectAll() {
                    // not used
                },

                fireSelectionChanging: function SingleItemSelectionManager_fireSelectionChanging() {
                    var eventObject = document.createEvent("CustomEvent");
                    eventObject.initCustomEvent(eventNames.selectionchanging, true, true, {});
                    return this._element.dispatchEvent(eventObject);
                },

                fireSelectionChanged: function ItemContainer_fireSelectionChanged() {
                    var eventObject = document.createEvent("CustomEvent");
                    eventObject.initCustomEvent(eventNames.selectionchanged, true, false, {});
                    this._element.dispatchEvent(eventObject);
                },

                _isIncluded: function SingleItemSelectionManager_isIncluded(index) {
                    return this._selected;
                },

                _getFocused: function SingleItemSelectionManager_getFocused(index) {
                    return { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };
                }
            })
        })
    });

})(this, WinJS);
