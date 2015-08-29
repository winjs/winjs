// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../../typings/require.d.ts" />

import _Global = require("../../Core/_Global");

import Animations = require("../../Animations");
import BindingList = require("../../BindingList");
import ControlProcessor = require("../../ControlProcessor");
import Promise = require("../../Promise");
import Scheduler = require("../../Scheduler");

import _Base = require("../../Core/_Base");
import _BaseUtils = require("../../Core/_BaseUtils");
import _Control = require("../../Utilities/_Control");
import _Dispose = require("../../Utilities/_Dispose");
import _ElementUtilities = require("../../Utilities/_ElementUtilities");
import _ErrorFromName = require("../../Core/_ErrorFromName");
import _Events = require("../../Core/_Events");
import _Hoverable = require("../../Utilities/_Hoverable");
import _KeyboardBehavior = require("../../Utilities/_KeyboardBehavior");
import _Log = require("../../Core/_Log");
import _Resources = require("../../Core/_Resources");
import _Signal = require("../../_Signal");
import _TransitionAnimation = require("../../Animations/_TransitionAnimation");
import _WriteProfilerMark = require("../../Core/_WriteProfilerMark");

import _Constants = require("./_Constants");
import _PivotItem = require("./_Item");

// Force-load Dependencies
_Hoverable.isHoverable;

require(["require-style!less/styles-pivot"]);
require(["require-style!less/colors-pivot"]);

"use strict";

var _EventNames = {
    selectionChanged: "selectionchanged",
    itemAnimationStart: "itemanimationstart",
    itemAnimationEnd: "itemanimationend",
};

var strings = {
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
    get duplicateItem() { return _Resources._getWinJSString("ui/duplicateItem").value; },
    get invalidContent() { return "Invalid content: Pivot content must be made up of PivotItems."; },
    get pivotAriaLabel() { return _Resources._getWinJSString("ui/pivotAriaLabel").value; },
    get pivotViewportAriaLabel() { return _Resources._getWinJSString("ui/pivotViewportAriaLabel").value; }
};

var supportsSnap = !!(_ElementUtilities._supportsSnapPoints && "inertiaDestinationX" in _Global["MSManipulationEvent"].prototype);
var PT_MOUSE = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE || "mouse";
var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
var Keys = _ElementUtilities.Key;

var _headerSlideAnimationDuration = 250;
var _invalidMeasurement = -1;

function pivotDefaultHeaderTemplate(item: { header: any }) {
    var element = _Global.document.createTextNode(typeof item.header === "object" ? JSON.stringify(item.header) : ('' + item.header));
    return element;
}

export class Pivot {
    static supportedForProcessing = true;
    static _ClassNames = _Constants._ClassNames;
    static _EventNames = _EventNames;

    _customLeftHeader: HTMLElement;
    _customRightHeader: HTMLElement;
    _element: HTMLElement;
    _headerAreaElement: HTMLElement;
    _headerItemsElement: HTMLElement;
    _headersContainerElement: HTMLElement;
    _nextButton: HTMLButtonElement;
    _prevButton: HTMLButtonElement;
    _surfaceElement: HTMLElement;
    _titleElement: HTMLElement;
    _viewportElement: HTMLElement;

    _animateToPrevious: boolean;
    _disposed = false;
    _elementPointerDownPoint: { x: number; y: number; type: string; inHeaders: boolean; time: number; };
    _firstLoad = true;
    _headerItemsElWidth: number;
    private _headersState: HeaderStateBase; // Must be private since HeaderStateBase type is not exported
    _hidePivotItemAnimation = Promise.wrap<any>();
    _id: string;
    _items: BindingList.List<_PivotItem.PivotItem>;
    _loadPromise = Promise.wrap<any>();
    _navigationHandled: boolean;
    _pendingItems: BindingList.List<_PivotItem.PivotItem>;
    _pendingRefresh = false;
    _pointerType: string;
    _rtl: boolean;
    _selectedIndex = 0;
    _showPivotItemAnimation = Promise.wrap<any>();
    _slideHeadersAnimation = Promise.wrap<any>();
    _viewportElWidth: number;
    _winKeyboard: _KeyboardBehavior._WinKeyboard;

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Pivot.element" helpKeyword="WinJS.UI.Pivot.element">
    /// Gets the DOM element that hosts the Pivot.
    /// </field>
    get element() {
        return this._element;
    }

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Pivot.customLeftHeader" helpKeyword="WinJS.UI.Pivot.customLeftHeader">
    /// Gets or sets the left custom header.
    /// </field>
    get customLeftHeader() {
        return <HTMLElement>this._customLeftHeader.firstElementChild;
    }
    set customLeftHeader(value: HTMLElement) {
        _ElementUtilities.empty(this._customLeftHeader);
        if (value) {
            this._customLeftHeader.appendChild(value);
            _ElementUtilities.addClass(this._element, _Constants._ClassNames.pivotCustomHeaders);
        } else {
            if (!this._customLeftHeader.children.length && !this._customRightHeader.childNodes.length) {
                _ElementUtilities.removeClass(this._element, _Constants._ClassNames.pivotCustomHeaders);
            }
        }
        this.forceLayout();
    }

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Pivot.customRightHeader" helpKeyword="WinJS.UI.Pivot.customRightHeader">
    /// Gets or sets the right custom header.
    /// </field>
    get customRightHeader() {
        return <HTMLElement>this._customRightHeader.firstElementChild;
    }
    set customRightHeader(value: HTMLElement) {
        _ElementUtilities.empty(this._customRightHeader);
        if (value) {
            this._customRightHeader.appendChild(value);
            _ElementUtilities.addClass(this._element, _Constants._ClassNames.pivotCustomHeaders);
        } else {
            if (!this._customLeftHeader.children.length && !this._customRightHeader.childNodes.length) {
                _ElementUtilities.removeClass(this._element, _Constants._ClassNames.pivotCustomHeaders);
            }
        }
        this.forceLayout();

    }

    /// <field type="Boolean" locid="WinJS.UI.Pivot.locked" helpKeyword="WinJS.UI.Pivot.locked">
    /// Gets or sets a value that specifies whether the Pivot is locked to the current item.
    /// </field>
    get locked() {
        return _ElementUtilities.hasClass(this.element, _Constants._ClassNames.pivotLocked);
    }
    set locked(value: boolean) {
        _ElementUtilities[value ? "addClass" : "removeClass"](this.element, _Constants._ClassNames.pivotLocked);
        if (value) {
            this._hideNavButtons();
        }
    }

    /// <field type="WinJS.Binding.List" locid="WinJS.UI.Pivot.items" helpKeyword="WinJS.UI.Pivot.items">
    /// Gets or sets the WinJS.Binding.List of PivotItem objects that belong to this Pivot.
    /// </field>
    get items() {
        if (this._pendingItems) {
            return this._pendingItems;
        }
        return this._items;
    }
    set items(value: BindingList.List<_PivotItem.PivotItem>) {
        this._pendingItems = value;
        this._refresh();
    }

    /// <field type="String" locid="WinJS.UI.Pivot.title" helpKeyword="WinJS.UI.Pivot.title">
    /// Gets or sets the title of the Pivot.
    /// </field>
    get title() {
        return this._titleElement.textContent;
    }
    set title(value: string) {
        if (value) {
            this._titleElement.style.display = "block";
            this._titleElement.textContent = value;
        } else {
            this._titleElement.style.display = "none";
            this._titleElement.textContent = "";
        }
    }

    /// <field type="Number" integer="true" locid="WinJS.UI.Pivot.selectedIndex" helpKeyword="WinJS.UI.Pivot.selectedIndex">
    /// Gets or sets the index of the item in view. This property is useful for restoring a previous view when your app launches or resumes.
    /// </field>
    get selectedIndex() {
        if (this.items.length === 0) {
            return -1;
        }
        return this._selectedIndex;
    }
    set selectedIndex(value: number) {
        if (value >= 0 && value < this.items.length) {
            if (this._pendingRefresh) {
                this._selectedIndex = value;
            } else {
                this._loadItem(value);
            }
        }
    }

    /// <field type="WinJS.UI.PivotItem" locid="WinJS.UI.Pivot.selectedItem" helpKeyword="WinJS.UI.Pivot.selectedItem">
    /// Gets or sets the item in view. This property is useful for restoring a previous view when your app launches or resumes.
    /// </field>
    get selectedItem() {
        return this.items.getAt(this.selectedIndex);
    }
    set selectedItem(value: _PivotItem.PivotItem) {
        var index = this.items.indexOf(value);
        if (index !== -1) {
            this.selectedIndex = index;
        }
    }

    constructor(element?: HTMLElement, options: any = {}) {
        /// <signature helpKeyword="WinJS.UI.Pivot.Pivot">
        /// <summary locid="WinJS.UI.Pivot.constructor">
        /// Creates a new Pivot control.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.Pivot.constructor_p:element">
        /// The DOM element that hosts the Pivot control.
        /// </param>
        /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.Pivot.constructor_p:options">
        /// An object that contains one or more property/value pairs to apply to the new control.
        /// Each property of the options object corresponds to one of the control's properties or events.
        /// Event names must begin with "on". For example, to provide a handler for the index changed event,
        /// add a property named "onselectionchanged" to the options object and set its value to the event handler.
        /// </param>
        /// <returns type="WinJS.UI.Pivot" locid="WinJS.UI.Pivot.constructor_returnValue">
        /// The new Pivot.
        /// </returns>
        /// </signature>
        element = element || _Global.document.createElement("DIV");
        if (element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateConstruction", strings.duplicateConstruction);
        }

        this._handleItemChanged = this._handleItemChanged.bind(this);
        this._handleItemInserted = this._handleItemInserted.bind(this);
        this._handleItemMoved = this._handleItemMoved.bind(this);
        this._handleItemRemoved = this._handleItemRemoved.bind(this);
        this._handleItemReload = this._handleItemReload.bind(this);
        this._resizeHandler = this._resizeHandler.bind(this);
        this._updatePointerType = this._updatePointerType.bind(this);

        this._id = element.id || _ElementUtilities._uniqueID(element);
        this._writeProfilerMark("constructor,StartTM");

        // Attaching JS control to DOM element
        element["winControl"] = this;
        this._element = element;
        this._element.setAttribute("role", "tablist");
        if (!this._element.getAttribute("aria-label")) {
            this._element.setAttribute('aria-label', strings.pivotAriaLabel);
        }
        _ElementUtilities.addClass(this.element, _Constants._ClassNames.pivot);
        _ElementUtilities.addClass(this.element, "win-disposable");
        _ElementUtilities._addEventListener(this.element, "pointerenter", this._updatePointerType);
        _ElementUtilities._addEventListener(this.element, "pointerout", this._updatePointerType);

        // Title element
        this._titleElement = _Global.document.createElement("DIV");
        this._titleElement.style.display = "none";
        _ElementUtilities.addClass(this._titleElement, _Constants._ClassNames.pivotTitle);
        this._element.appendChild(this._titleElement);

        // Header Area
        this._headerAreaElement = _Global.document.createElement("DIV");
        _ElementUtilities.addClass(this._headerAreaElement, _Constants._ClassNames.pivotHeaderArea);
        this._element.appendChild(this._headerAreaElement);

        // Header Items
        this._headerItemsElement = _Global.document.createElement("DIV");
        _ElementUtilities.addClass(this._headerItemsElement, _Constants._ClassNames.pivotHeaderItems);
        this._headerAreaElement.appendChild(this._headerItemsElement);
        this._headerItemsElWidth = null;

        // Headers Container
        this._headersContainerElement = _Global.document.createElement("DIV");
        this._headersContainerElement.tabIndex = 0;
        _ElementUtilities.addClass(this._headersContainerElement, _Constants._ClassNames.pivotHeaders);
        this._headersContainerElement.addEventListener("keydown", this._headersKeyDown.bind(this));
        _ElementUtilities._addEventListener(this._headersContainerElement, "pointerenter", this._showNavButtons.bind(this));
        _ElementUtilities._addEventListener(this._headersContainerElement, "pointerout", this._hideNavButtons.bind(this));
        this._headerItemsElement.appendChild(this._headersContainerElement);
        this._element.addEventListener("click", this._elementClickedHandler.bind(this));
        this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this._headersContainerElement);

        // Custom Headers
        this._customLeftHeader = _Global.document.createElement("DIV");
        _ElementUtilities.addClass(this._customLeftHeader, _Constants._ClassNames.pivotHeaderLeftCustom);
        this._headerAreaElement.insertBefore(this._customLeftHeader, this._headerAreaElement.children[0]);
        this._customRightHeader = _Global.document.createElement("DIV");
        _ElementUtilities.addClass(this._customRightHeader, _Constants._ClassNames.pivotHeaderRightCustom);
        this._headerAreaElement.appendChild(this._customRightHeader);

        // Viewport
        this._viewportElement = _Global.document.createElement("DIV");
        this._viewportElement.className = _Constants._ClassNames.pivotViewport;
        this._element.appendChild(this._viewportElement);
        this._viewportElement.setAttribute("role", "group");
        this._viewportElement.setAttribute("aria-label", strings.pivotViewportAriaLabel);
        this.element.addEventListener("mselementresize", this._resizeHandler);
        _ElementUtilities._resizeNotifier.subscribe(this.element, this._resizeHandler);
        this._viewportElWidth = null;

        // Surface
        this._surfaceElement = _Global.document.createElement("DIV");
        this._surfaceElement.className = _Constants._ClassNames.pivotSurface;
        this._viewportElement.appendChild(this._surfaceElement);

        this._headersState = new HeaderStateBase(this);

        // Navigation handlers
        if (supportsSnap) {
            this._viewportElement.addEventListener("MSManipulationStateChanged", this._MSManipulationStateChangedHandler.bind(this));
        } else {
            _ElementUtilities.addClass(this.element, _Constants._ClassNames.pivotNoSnap);
            _ElementUtilities._addEventListener(this._element, "pointerdown", this._elementPointerDownHandler.bind(this));
            _ElementUtilities._addEventListener(this._element, "pointerup", this._elementPointerUpHandler.bind(this));
        }

        // This internally assigns this.items which causes item to be used (even from options) before selectedIndex
        this._parse();

        options = _BaseUtils._shallowCopy(options);
        if (options.items) {
            // Set this first so selectedIndex and selectedItem can work against the new items.
            this.items = options.items;
            delete options.items;
        }

        _Control.setOptions(this, options);

        this._refresh();

        this._writeProfilerMark("constructor,StopTM");
    }

    // Public Methods
    dispose() {
        /// <signature helpKeyword="WinJS.UI.Pivot.dispose">
        /// <summary locid="WinJS.UI.Pivot.dispose">
        /// Disposes this control.
        /// </summary>
        /// </signature>
        if (this._disposed) {
            return;
        }
        this._disposed = true;

        this._updateEvents(this._items, null);
        _ElementUtilities._resizeNotifier.unsubscribe(this.element, this._resizeHandler);
        this._headersState.exit();

        _Dispose._disposeElement(this._headersContainerElement);

        for (var i = 0, len = this.items.length; i < len; i++) {
            this.items.getAt(i).dispose();
        }
    }

    forceLayout() {
        /// <signature helpKeyword="WinJS.UI.Pivot.forceLayout">
        /// <summary locid="WinJS.UI.Pivot.forceLayout">
        /// Forces the control to relayout its content. This function is expected to be called
        /// when the pivot element is manually resized.
        /// </summary>
        /// </signature>
        if (this._disposed) {
            return;
        }
        this._resizeHandler();
    }


    // Lifecycle Methods
    _applyProperties() {
        if (this._disposed) {
            return;
        }

        if (this._pendingItems) {
            this._updateEvents(this._items, this._pendingItems);
            this._items = this._pendingItems;
            this._pendingItems = null;
            // Remove any declaratively specified pivot items before attachItems.
            while (this.element.firstElementChild !== this._titleElement) {
                var toRemove = this.element.firstElementChild;
                toRemove.parentNode.removeChild(toRemove);
            }
            _ElementUtilities.empty(this._surfaceElement);
        }

        attachItems(this);

        this._rtl = _ElementUtilities._getComputedStyle(this._element, null).direction === "rtl";
        this._headersState.refreshHeadersState(true);
        this._pendingRefresh = false;

        this._firstLoad = true;
        this.selectedIndex = this._selectedIndex;
        this._firstLoad = false;

        this._recenterViewport();

        function attachItems(pivot: Pivot) {
            for (var i = 0, len = pivot.items.length; i < len; i++) {
                var item = pivot._items.getAt(i);

                if (item.element.parentNode === pivot._surfaceElement) {
                    throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
                }

                item.element.style.display = "none";

                pivot._surfaceElement.appendChild(item.element);
            }
        }
    }

    _parse() {
        var pivotItems: _PivotItem.PivotItem[] = [];
        var pivotItemEl = this.element.firstElementChild;

        while (pivotItemEl !== this._titleElement) {
            ControlProcessor.processAll(pivotItemEl);

            var pivotItemContent: _PivotItem.PivotItem = pivotItemEl["winControl"];
            if (pivotItemContent) {
                pivotItems.push(pivotItemContent);
            } else {
                throw new _ErrorFromName("WinJS.UI.Pivot.InvalidContent", strings.invalidContent);
            }

            var nextItemEl = pivotItemEl.nextElementSibling;
            pivotItemEl = nextItemEl;
        }

        this.items = new BindingList.List(pivotItems);
    }

    _refresh() {
        if (this._pendingRefresh) {
            return;
        }

        // This is to coalesce property setting operations such as items and scrollPosition.
        this._pendingRefresh = true;
        Scheduler.schedule(this._applyProperties.bind(this), Scheduler.Priority.high);
    }

    _resizeHandler() {
        if (this._disposed || this._pendingRefresh) {
            return;
        }

        var oldViewportWidth = this._getViewportWidth();
        var oldHeaderItemsWidth = this._getHeaderItemsWidth();
        this._invalidateMeasures();
        if (oldViewportWidth !== this._getViewportWidth() || oldHeaderItemsWidth !== this._getHeaderItemsWidth()) {
            // Measures have changed
            _Log.log && _Log.log('_resizeHandler, viewport from:' + oldViewportWidth + " to: " + this._getViewportWidth());
            _Log.log && _Log.log('_resizeHandler, headers from:' + oldHeaderItemsWidth + " to: " + this._getHeaderItemsWidth());

            this._hidePivotItemAnimation && this._hidePivotItemAnimation.cancel();
            this._showPivotItemAnimation && this._showPivotItemAnimation.cancel();
            this._slideHeadersAnimation && this._slideHeadersAnimation.cancel();

            this._recenterViewport();
            this._headersState.handleResize();
        } else {
            _Log.log && _Log.log('_resizeHandler worthless resize');
        }
    }

    // Navigation Methods
    _activateHeader(headerElement: HTMLElement) {
        if (this.locked) {
            return;
        }

        var index = this._items.indexOf(headerElement["_item"]);
        if (index !== this.selectedIndex) {
            this._headersState.activateHeader(headerElement);
        } else {
            // Move focus into content for Narrator.
            _ElementUtilities._setActiveFirstFocusableElement(this.selectedItem.element);
        }
    }

    _goNext() {
        if (this.selectedIndex < this._items.length - 1) {
            this.selectedIndex++;
        } else {
            this.selectedIndex = 0;
        }
    }

    _goPrevious() {
        this._animateToPrevious = true;
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
        } else {
            this.selectedIndex = this._items.length - 1;
        }
        this._animateToPrevious = false;
    }

    _loadItem(index: number) {
        this._rtl = _ElementUtilities._getComputedStyle(this._element, null).direction === "rtl";
        this._hidePivotItemAnimation.cancel();
        this._showPivotItemAnimation.cancel();
        this._slideHeadersAnimation.cancel();

        var goPrev = this._animateToPrevious;
        var newItem = this._items.getAt(index);
        var skipAnimation = this._firstLoad;

        var thisLoadPromise = this._loadPromise = this._loadPromise.then(() => {
            var oldItem = this._items.getAt(this.selectedIndex);
            oldItem && this._hidePivotItem(oldItem.element, goPrev, skipAnimation);
            var oldIndex = this._selectedIndex;
            this._selectedIndex = index;

            var selectionChangedDetail = {
                index: index,
                direction: goPrev ? "backwards" : "forward",
                item: newItem
            };
            this._fireEvent(_EventNames.selectionChanged, true, false, selectionChangedDetail);

            this._headersState.handleNavigation(goPrev, index, oldIndex);

            // Note: Adding Promise.timeout to force asynchrony so that thisLoadPromise
            // is set before handler executes and compares thisLoadPromise.
            return Promise.join([newItem._process(), this._hidePivotItemAnimation, Promise.timeout()]).then(() => {
                if (this._disposed || this._loadPromise !== thisLoadPromise) {
                    return;
                }
                this._recenterViewport();
                return this._showPivotItem(newItem.element, goPrev, skipAnimation).then(() => {
                    if (this._disposed || this._loadPromise !== thisLoadPromise) {
                        return;
                    }
                    this._loadPromise = Promise.wrap<any>();
                    this._writeProfilerMark("itemAnimationStop,info");
                    this._fireEvent(_EventNames.itemAnimationEnd, true, false, null);
                });
            });
        });
    }

    _recenterViewport() {
        _ElementUtilities.setScrollPosition(this._viewportElement, { scrollLeft: this._getViewportWidth() });
        if (this.selectedItem) {
            this.selectedItem.element.style[this._getDirectionAccessor()] = this._getViewportWidth() + "px";
        }
    }

    // Utility Methods
    _fireEvent(type: string, canBubble: boolean, cancelable: boolean, detail: any) {
        // Returns true if ev.preventDefault() was not called
        var event = <CustomEvent>_Global.document.createEvent("CustomEvent");
        event.initCustomEvent(type, !!canBubble, !!cancelable, detail);
        return this.element.dispatchEvent(event);
    }

    _getDirectionAccessor() {
        return this._rtl ? "right" : "left";
    }

    _getHeaderItemsWidth() {
        if (!this._headerItemsElWidth) {
            this._headerItemsElWidth = parseFloat(_ElementUtilities._getComputedStyle(this._headerItemsElement).width);
        }
        return this._headerItemsElWidth || _invalidMeasurement;
    }

    _getViewportWidth() {
        if (!this._viewportElWidth) {
            this._viewportElWidth = parseFloat(_ElementUtilities._getComputedStyle(this._viewportElement).width);
            if (supportsSnap) {
                this._viewportElement.style[_BaseUtils._browserStyleEquivalents["scroll-snap-points-x"].scriptName] = "snapInterval(0%, " + Math.ceil(this._viewportElWidth) + "px)";
            }
        }
        return this._viewportElWidth || _invalidMeasurement;
    }

    _invalidateMeasures() {
        this._viewportElWidth = this._headerItemsElWidth = null;
    }

    _updateEvents(oldItems: BindingList.List<_PivotItem.PivotItem>, newItems: BindingList.List<_PivotItem.PivotItem>) {
        if (oldItems) {
            oldItems.removeEventListener("itemchanged", this._handleItemChanged);
            oldItems.removeEventListener("iteminserted", this._handleItemInserted);
            oldItems.removeEventListener("itemmoved", this._handleItemMoved);
            oldItems.removeEventListener("itemremoved", this._handleItemRemoved);
            oldItems.removeEventListener("reload", this._handleItemReload);
        }

        if (newItems) {
            newItems.addEventListener("itemchanged", this._handleItemChanged);
            newItems.addEventListener("iteminserted", this._handleItemInserted);
            newItems.addEventListener("itemmoved", this._handleItemMoved);
            newItems.addEventListener("itemremoved", this._handleItemRemoved);
            newItems.addEventListener("reload", this._handleItemReload);
        }
    }

    _writeProfilerMark(text: string) {
        var message = "WinJS.UI.Pivot:" + this._id + ":" + text;
        _WriteProfilerMark(message);
        _Log.log && _Log.log(message, null, "pivotprofiler");
    }


    // Datasource Mutation Handlers
    _handleItemChanged(ev: CustomEvent) {
        // Change is triggered by binding list setAt() API.
        if (this._pendingItems) {
            return;
        }

        var index = ev.detail.index;
        var newItem = ev.detail.newValue;
        var oldItem = ev.detail.oldValue;
        if (newItem.element !== oldItem.element) {
            if (newItem.element.parentNode === this._surfaceElement) {
                throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
            }

            newItem.element.style.display = "none";

            this._surfaceElement.insertBefore(newItem.element, oldItem.element);
            this._surfaceElement.removeChild(oldItem.element);

            if (index === this.selectedIndex) {
                this.selectedIndex = index;
            }
        }

        this._headersState.render();
        this._headersState.refreshHeadersState(true);
    }

    _handleItemInserted(ev: CustomEvent) {
        // Insert is triggered by binding list insert APIs such as splice(), push(), and unshift().
        if (this._pendingItems) {
            return;
        }

        var index = ev.detail.index;
        var item = ev.detail.value;

        if (item.element.parentNode === this._surfaceElement) {
            throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
        }

        item.element.style.display = "none";

        if (index < this.items.length - 1) {
            this._surfaceElement.insertBefore(item.element, this.items.getAt(index + 1).element);
        } else {
            this._surfaceElement.appendChild(item.element);
        }

        if (index <= this.selectedIndex) {
            this._selectedIndex++;
        }

        if (this._items.length === 1) {
            this.selectedIndex = 0;
        }

        this._headersState.render();
        this._headersState.refreshHeadersState(true);
    }

    _handleItemMoved(ev: CustomEvent) {
        // Move is triggered by binding list move() API.
        if (this._pendingItems) {
            return;
        }

        var oldIndex = ev.detail.oldIndex;
        var newIndex = ev.detail.newIndex;
        var item = ev.detail.value;

        if (newIndex < this.items.length - 1) {
            this._surfaceElement.insertBefore(item.element, this.items.getAt(newIndex + 1).element);
        } else {
            this._surfaceElement.appendChild(item.element);
        }

        if (oldIndex < this.selectedIndex && newIndex >= this.selectedIndex) {
            this._selectedIndex--;
        } else if (newIndex > this.selectedIndex && oldIndex <= this.selectedIndex) {
            this._selectedIndex++;
        } else if (oldIndex === this.selectedIndex) {
            this.selectedIndex = this.selectedIndex;
        }

        this._headersState.render();
        this._headersState.refreshHeadersState(true);
    }

    _handleItemReload() {
        // Reload is triggered by large operations on the binding list such as reverse(). This causes
        // _pendingItems to be true which ignores future insert/remove/modified/moved events until the new
        // items list is applied.
        this.items = this.items;
    }

    _handleItemRemoved(ev: CustomEvent) {
        // Removed is triggered by binding list removal APIs such as splice(), pop(), and shift().
        if (this._pendingItems) {
            return;
        }

        var item = ev.detail.value;
        var index = ev.detail.index;

        this._surfaceElement.removeChild(item.element);

        if (index < this.selectedIndex) {
            this._selectedIndex--;
        } else if (index === this._selectedIndex) {
            this.selectedIndex = Math.min(this.items.length - 1, this._selectedIndex);
        }

        this._headersState.render();
        this._headersState.refreshHeadersState(true);
    }


    // Event Handlers
    _elementClickedHandler(e: MouseEvent) {
        if (this.locked || this._navigationHandled) {
            this._navigationHandled = false;
            return;
        }

        var header: HTMLElement;
        var src = <HTMLElement>e.target;
        if (_ElementUtilities.hasClass(src, _Constants._ClassNames.pivotHeader)) {
            // UIA invoke clicks on the real header elements.
            header = src;
        } else {
            var hitSrcElement = false;
            var hitTargets = _ElementUtilities._elementsFromPoint(e.clientX, e.clientY);
            if (hitTargets &&
                // Make sure there aren't any elements obscuring the Pivot headers.
                // WinJS.Utilities._elementsFromPoint sorts by z order.
                hitTargets[0] === this._viewportElement) {
                for (var i = 0, len = hitTargets.length; i < len; i++) {
                    if (hitTargets[i] === src) {
                        hitSrcElement = true;
                    }
                    if (_ElementUtilities.hasClass(<HTMLElement>hitTargets[i], _Constants._ClassNames.pivotHeader)) {
                        header = <HTMLElement>hitTargets[i];
                    }
                }
            }

            if (!hitSrcElement) {
                // The click's coordinates and source element do not correspond so we
                // can't trust the coordinates. Ignore the click. This case happens in
                // clicks triggered by UIA invoke because UIA invoke uses the top left
                // of the window as the coordinates of every click.
                header = null;
            }
        }

        if (header) {
            this._activateHeader(header);
        }
    }

    _elementPointerDownHandler(e: PointerEvent) {
        if (supportsSnap) {
            return;
        }
        var element = <HTMLElement>e.target;
        this._elementPointerDownPoint = { x: e.clientX, y: e.clientY, type: e.pointerType || "mouse", time: Date.now(), inHeaders: this._headersContainerElement.contains(element) };
    }

    _elementPointerUpHandler(e: PointerEvent) {
        if (!this._elementPointerDownPoint || this.locked) {
            this._elementPointerDownPoint = null;
            return;
        }

        var element = <HTMLElement>e.target;
        var filterDistance = 32;
        var dyDxThresholdRatio = 0.4;

        var dy = Math.abs(e.clientY - this._elementPointerDownPoint.y);
        var dx = e.clientX - this._elementPointerDownPoint.x;
        var thresholdY = Math.abs(dx * dyDxThresholdRatio);

        var doSwipeDetection =
            // Check vertical threshold to prevent accidental swipe detection during vertical pan
            dy < thresholdY
            // Check horizontal threshold to prevent accidental swipe detection when tapping
            && Math.abs(dx) > filterDistance
            // Check that input type is Touch, however, if touch detection is not supported then we do detection for any input type
            && (!_ElementUtilities._supportsTouchDetection || (this._elementPointerDownPoint.type === e.pointerType && e.pointerType === PT_TOUCH))
            // Check if content swipe navigation is disabled, if it is we still run swipe detection if both the up and down points are in the headers container element
            && (!this.element.classList.contains(_Constants._ClassNames.pivotDisableContentSwipeNavigation) || (this._elementPointerDownPoint.inHeaders && this._headersContainerElement.contains(element)));

        this._navigationHandled = false;
        if (doSwipeDetection) {
            // Swipe navigation detection

            // Simulate inertia by multiplying dx by a polynomial function of dt
            var dt = Date.now() - this._elementPointerDownPoint.time;
            dx *= Math.max(1, Math.pow(350 / dt, 2));
            dx = this._rtl ? -dx : dx;

            var vwDiv4 = this._getViewportWidth() / 4;
            if (dx < -vwDiv4) {
                this._goNext();
                this._navigationHandled = true;
            } else if (dx > vwDiv4) {
                this._goPrevious();
                this._navigationHandled = true;
            }
        }
        if (!this._navigationHandled) {
            // Detect header click
            while (element !== null && !_ElementUtilities.hasClass(element, _Constants._ClassNames.pivotHeader)) {
                element = element.parentElement;
            }
            if (element !== null) {
                this._activateHeader(element);
                this._navigationHandled = true;
            }
        }
        this._elementPointerDownPoint = null;
    }

    _headersKeyDown(e: KeyboardEvent) {
        if (this.locked) {
            return;
        }

        if (e.keyCode === Keys.leftArrow || e.keyCode === Keys.pageUp) {
            this._rtl ? this._goNext() : this._goPrevious();
            e.preventDefault();
        } else if (e.keyCode === Keys.rightArrow || e.keyCode === Keys.pageDown) {
            this._rtl ? this._goPrevious() : this._goNext();
            e.preventDefault();
        }
    }

    _hideNavButtons(e?: PointerEvent) {
        if (e && this._headersContainerElement.contains(<HTMLElement>e.relatedTarget)) {
            // Don't hide the nav button if the pointerout event is being fired from going
            // from one element to another within the header track.
            return;
        }
        _ElementUtilities.removeClass(this._headersContainerElement, _Constants._ClassNames.pivotShowNavButtons);
    }

    _hidePivotItem(element: HTMLElement, goPrevious: boolean, skipAnimation: boolean) {
        if (skipAnimation || !_TransitionAnimation.isAnimationEnabled()) {
            element.style.display = "none";
            this._hidePivotItemAnimation = Promise.wrap();
            return this._hidePivotItemAnimation;
        }

        this._hidePivotItemAnimation = _TransitionAnimation.executeTransition(element, {
            property: "opacity",
            delay: 0,
            duration: 67,
            timing: "linear",
            from: "",
            to: "0",
        })
            .then(() => {
                element.style.display = "none";
            });
        return this._hidePivotItemAnimation;
    }

    _MSManipulationStateChangedHandler(e: MSManipulationEvent) {
        if (e.target !== this._viewportElement) {
            // Ignore sub scroller manipulations.
            return;
        }

        if (e.currentState === _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_INERTIA) {
            var delta = e["inertiaDestinationX"] - this._getViewportWidth();
            if (delta > 0) {
                this._goNext();
            } else if (delta < 0) {
                this._goPrevious();
            }
        }
    }

    _updatePointerType(e: PointerEvent) {
        if (this._pointerType === (e.pointerType || PT_MOUSE)) {
            return;
        }

        this._pointerType = e.pointerType || PT_MOUSE;
        if (this._pointerType === PT_TOUCH) {
            _ElementUtilities.removeClass(this.element, _Constants._ClassNames.pivotInputTypeMouse);
            _ElementUtilities.addClass(this.element, _Constants._ClassNames.pivotInputTypeTouch);
            this._hideNavButtons();
        } else {
            _ElementUtilities.removeClass(this.element, _Constants._ClassNames.pivotInputTypeTouch);
            _ElementUtilities.addClass(this.element, _Constants._ClassNames.pivotInputTypeMouse);
        }
    }

    _showNavButtons(e: PointerEvent) {
        if (this.locked || (e && e.pointerType === PT_TOUCH)) {
            return;
        }
        _ElementUtilities.addClass(this._headersContainerElement, _Constants._ClassNames.pivotShowNavButtons);
    }

    _showPivotItem(element: HTMLElement, goPrevious: boolean, skipAnimation: boolean) {
        this._writeProfilerMark("itemAnimationStart,info");
        this._fireEvent(_EventNames.itemAnimationStart, true, false, null);

        element.style.display = "";
        if (skipAnimation || !_TransitionAnimation.isAnimationEnabled()) {
            element.style.opacity = "";
            this._showPivotItemAnimation = Promise.wrap();
            return this._showPivotItemAnimation;
        }

        var negativeTransform = this._rtl ? !goPrevious : goPrevious;

        // Find the elements to slide in
        function filterOnScreen(element: Element) {
            var elementBoundingClientRect = element.getBoundingClientRect();
            // Can't check left/right since it might be scrolled off.
            return elementBoundingClientRect.top < viewportBoundingClientRect.bottom &&
                elementBoundingClientRect.bottom > viewportBoundingClientRect.top;
        }
        var viewportBoundingClientRect = this._viewportElement.getBoundingClientRect();
        var slideGroup1Els = element.querySelectorAll(".win-pivot-slide1");
        var slideGroup2Els = element.querySelectorAll(".win-pivot-slide2");
        var slideGroup3Els = element.querySelectorAll(".win-pivot-slide3");

        //Filter the slide groups to the elements actually on screen to avoid animating extra elements
        slideGroup1Els = Array.prototype.filter.call(slideGroup1Els, filterOnScreen);
        slideGroup2Els = Array.prototype.filter.call(slideGroup2Els, filterOnScreen);
        slideGroup3Els = Array.prototype.filter.call(slideGroup3Els, filterOnScreen);

        this._showPivotItemAnimation = Promise.join([
            _TransitionAnimation.executeTransition(element, {
                property: "opacity",
                delay: 0,
                duration: 333,
                timing: "cubic-bezier(0.1,0.9,0.2,1)",
                from: "0",
                to: "",
            }),
            _TransitionAnimation.executeTransition(element, {
                property: _BaseUtils._browserStyleEquivalents["transform"].cssName,
                delay: 0,
                duration: 767,
                timing: "cubic-bezier(0.1,0.9,0.2,1)",
                from: "translateX(" + (negativeTransform ? "-20px" : "20px") + ")",
                to: "",
            }),
            Animations[negativeTransform ? "slideRightIn" : "slideLeftIn"](null, slideGroup1Els, slideGroup2Els, slideGroup3Els)
        ]);
        return this._showPivotItemAnimation;
    }
}

class HeaderStateBase {
    static headersContainerLeadingMargin = 12;
    static headerHorizontalMargin = 12;

    pivot: Pivot;
    cachedHeaderWidth: number;

    constructor(pivot: Pivot) {
        this.pivot = pivot;
    }

    // Called when transitioning away from this state
    exit() { }

    // Render headers
    render(goPrevious?: boolean) { }

    // Called when a header is activated, i.e. tapped, clicked, arrow keyed to
    activateHeader(header: HTMLElement) { }

    // Called when the selectedIndex changed
    handleNavigation(goPrevious: boolean, index: number, oldIndex: number) { }

    // Called when the control size changed
    handleResize() { }

    // Called when the header string of the specified pivotItem changed
    handleHeaderChanged(pivotItem: _PivotItem.PivotItem) { }

    getCumulativeHeaderWidth(index: number) {
        // Computes the total width of headers from 0 up to the specified index
        if (index === 0) {
            return 0;
        }

        var originalLength = this.pivot._headersContainerElement.children.length;
        for (var i = 0; i < index; i++) {
            var header = this.renderHeader(i, false);
            this.pivot._headersContainerElement.appendChild(header);
        }

        var width = 0;
        var leftElement = <HTMLElement>(this.pivot._rtl ? this.pivot._headersContainerElement.lastElementChild : this.pivot._headersContainerElement.children[originalLength]);
        var rightElement = <HTMLElement>(this.pivot._rtl ? this.pivot._headersContainerElement.children[originalLength] : this.pivot._headersContainerElement.lastElementChild);
        width = (rightElement.offsetLeft + rightElement.offsetWidth) - leftElement.offsetLeft;
        width += 2 * HeaderStateBase.headerHorizontalMargin;

        for (var i = 0; i < index; i++) {
            this.pivot._headersContainerElement.removeChild(this.pivot._headersContainerElement.lastElementChild);
        }
        return width;
    }

    refreshHeadersState(invalidateCache: boolean) {
        // Measures the cumulative header length and switches headers states if necessary
        if (invalidateCache) {
            this.cachedHeaderWidth = 0;
        }
        var width = this.cachedHeaderWidth || this.getCumulativeHeaderWidth(this.pivot.items.length);
        this.cachedHeaderWidth = width;

        if (width > this.pivot._getHeaderItemsWidth() && !(this.pivot["_headersState"] instanceof HeaderStateOverflow)) {
            this.exit();
            this.pivot["_headersState"] = new HeaderStateOverflow(this.pivot);
        } else if (width <= this.pivot._getHeaderItemsWidth() && !(this.pivot["_headersState"] instanceof HeaderStateStatic)) {
            this.exit();
            this.pivot["_headersState"] = new HeaderStateStatic(this.pivot);
        }
    }

    renderHeader(index: number, aria: boolean) {
        // Renders a single header
        var that = this;
        var template = _ElementUtilities._syncRenderer(pivotDefaultHeaderTemplate);
        var item = this.pivot.items.getAt(index);

        var headerContainerEl = _Global.document.createElement("BUTTON");
        headerContainerEl.tabIndex = -1;
        headerContainerEl.setAttribute("type", "button");
        headerContainerEl.style.marginLeft = headerContainerEl.style.marginRight = HeaderStateBase.headerHorizontalMargin + "px";
        _ElementUtilities.addClass(headerContainerEl, _Constants._ClassNames.pivotHeader);
        headerContainerEl["_item"] = item;
        headerContainerEl["_pivotItemIndex"] = index;
        template(item, headerContainerEl);

        function ariaSelectedMutated() {
            if (that.pivot._disposed) {
                return;
            }

            if (that.pivot._headersContainerElement.contains(headerContainerEl) &&
                index !== that.pivot.selectedIndex &&
                headerContainerEl.getAttribute('aria-selected') === "true") {
                // Ignore aria selected changes on selected item.
                // By selecting another tab we change to it.
                that.pivot.selectedIndex = index;
            }
        }
        if (aria) {
            headerContainerEl.setAttribute('aria-selected', "" + (index === this.pivot.selectedIndex));
            headerContainerEl.setAttribute('role', 'tab');
            new _ElementUtilities._MutationObserver(ariaSelectedMutated).observe(headerContainerEl, { attributes: true, attributeFilter: ["aria-selected"] });
        }

        return headerContainerEl;
    }

    updateHeader(item: _PivotItem.PivotItem) {
        // Updates the label of a header
        var index = this.pivot.items.indexOf(item);
        var headerElement = <HTMLElement>this.pivot._headersContainerElement.children[index];
        headerElement.innerHTML = "";

        var template = _ElementUtilities._syncRenderer(pivotDefaultHeaderTemplate);
        template(item, headerElement);
    }

    setActiveHeader(newSelectedHeader: HTMLElement) {
        // Updates the selected header and clears the previously selected header if applicable
        var focusWasInHeaders = false;
        var currentSelectedHeader = <HTMLElement>this.pivot._headersContainerElement.querySelector("." + _Constants._ClassNames.pivotHeaderSelected);
        if (currentSelectedHeader) {
            currentSelectedHeader.classList.remove(_Constants._ClassNames.pivotHeaderSelected);
            currentSelectedHeader.setAttribute("aria-selected", "false");
            focusWasInHeaders = this.pivot._headersContainerElement.contains(<HTMLElement>_Global.document.activeElement);
        }

        newSelectedHeader.classList.add(_Constants._ClassNames.pivotHeaderSelected);
        newSelectedHeader.setAttribute("aria-selected", "true");
        focusWasInHeaders && this.pivot._headersContainerElement.focus();
    }
}

// This state renders headers statically in the order they appear in the binding list.
// There is no animation when the selectedIndex changes, only the highlighted header changes.
class HeaderStateStatic extends HeaderStateBase {
    _firstRender = true;
    _transitionAnimation = Promise.wrap<any>();

    constructor(pivot: Pivot) {
        super(pivot);

        if (pivot._headersContainerElement.children.length && _TransitionAnimation.isAnimationEnabled()) {
            // We transitioned from another headers state, do transition animation

            // Calculate the offset from the selected header to where the selected header should be in static layout
            var selectedHeader = <HTMLElement>pivot._headersContainerElement.querySelector("." + _Constants._ClassNames.pivotHeaderSelected);
            var start = 0;
            var end = 0;
            if (pivot._rtl) {
                start = selectedHeader.offsetLeft + selectedHeader.offsetWidth + HeaderStateBase.headerHorizontalMargin;
                end = pivot._getHeaderItemsWidth() - this.getCumulativeHeaderWidth(pivot.selectedIndex) - HeaderStateBase.headersContainerLeadingMargin;
                end += parseFloat(pivot._headersContainerElement.style.marginLeft);
            } else {
                start = selectedHeader.offsetLeft;
                start += parseFloat(pivot._headersContainerElement.style.marginLeft); // overflow state has a hidden first element that we need to account for
                end = this.getCumulativeHeaderWidth(pivot.selectedIndex) + HeaderStateBase.headersContainerLeadingMargin + HeaderStateBase.headerHorizontalMargin;
            }
            var offset = start - end;

            this.render();

            // Offset every header by the calculated offset so there is no visual difference after the render call
            var transformProperty = _BaseUtils._browserStyleEquivalents["transform"].cssName;
            var transformValue = "translateX(" + offset + "px)";
            for (var i = 0, l = pivot._headersContainerElement.children.length; i < l; i++) {
                (<HTMLElement>pivot._headersContainerElement.children[i]).style[transformProperty] = transformValue;
            }

            // Transition headers back to their original location
            this._transitionAnimation = _TransitionAnimation.executeTransition(
                pivot._headersContainerElement.querySelectorAll("." + _Constants._ClassNames.pivotHeader), {
                    property: transformProperty,
                    delay: 0,
                    duration: _headerSlideAnimationDuration,
                    timing: "ease-out",
                    to: ""
                });
        } else {
            this.render();
        }
    }

    exit() {
        this._transitionAnimation.cancel();
    }

    render() {
        var pivot = this.pivot;
        if (pivot._pendingRefresh || !pivot._items) {
            return;
        }

        _Dispose._disposeElement(pivot._headersContainerElement);
        _ElementUtilities.empty(pivot._headersContainerElement);

        if (pivot._rtl) {
            pivot._headersContainerElement.style.marginLeft = "0px";
            pivot._headersContainerElement.style.marginRight = HeaderStateBase.headersContainerLeadingMargin + "px";
        } else {
            pivot._headersContainerElement.style.marginLeft = HeaderStateBase.headersContainerLeadingMargin + "px";
            pivot._headersContainerElement.style.marginRight = "0px";
        }
        pivot._viewportElement.style.overflow = pivot.items.length === 1 ? "hidden" : "";

        if (pivot.items.length) {
            for (var i = 0; i < pivot.items.length; i++) {
                var header = this.renderHeader(i, true);
                pivot._headersContainerElement.appendChild(header);

                if (i === pivot.selectedIndex) {
                    header.classList.add(_Constants._ClassNames.pivotHeaderSelected);
                }
            }

        }
        this._firstRender = false;
    }

    activateHeader(headerElement: HTMLElement) {
        this.setActiveHeader(headerElement);
        this.pivot._animateToPrevious = headerElement["_pivotItemIndex"] < this.pivot.selectedIndex;
        this.pivot.selectedIndex = headerElement["_pivotItemIndex"];
        this.pivot._animateToPrevious = false;
    }

    handleNavigation(goPrevious: boolean, index: number, oldIndex: number) {
        if (this._firstRender) {
            this.render();
        }
        this.setActiveHeader(<HTMLElement>this.pivot._headersContainerElement.children[index]);
    }

    handleResize() {
        this.refreshHeadersState(false);
    }

    handleHeaderChanged(pivotItem: _PivotItem.PivotItem) {
        this.updateHeader(pivotItem);
        this.refreshHeadersState(true);
    }
}

// This state renders the selected header always left-aligned (in ltr) and
// animates the headers when the selectedIndex changes.
class HeaderStateOverflow extends HeaderStateBase {
    _blocked = false;
    _firstRender = true;
    _transitionAnimation = Promise.wrap<any>();

    constructor(pivot: Pivot) {
        super(pivot);

        pivot._slideHeadersAnimation = Promise.wrap();

        if (pivot._headersContainerElement.children.length && _TransitionAnimation.isAnimationEnabled()) {
            // We transitioned from another headers state, do transition animation
            var that = this;
            var done = function () {
                that._blocked = false;
                that.render();
            };
            this._blocked = true;

            // Calculate the offset from the selected header to the leading edge of the container
            var selectedHeader = <HTMLElement>pivot._headersContainerElement.querySelector("." + _Constants._ClassNames.pivotHeaderSelected);
            var start = 0;
            var end = 0;
            if (pivot._rtl) {
                start = pivot._getHeaderItemsWidth() - HeaderStateBase.headersContainerLeadingMargin;
                end = selectedHeader.offsetLeft;
                end += HeaderStateBase.headerHorizontalMargin;
                end += selectedHeader.offsetWidth;
                end += parseFloat(pivot._headersContainerElement.style.marginLeft);
            } else {
                start = HeaderStateBase.headersContainerLeadingMargin;
                end = selectedHeader.offsetLeft;
                end -= HeaderStateBase.headerHorizontalMargin;
                end += parseFloat(pivot._headersContainerElement.style.marginLeft);
            }
            var offset = start - end;

            // Duplicate all the headers up to the selected header so when the transition occurs there will be
            // headers on the trailing end of the container to replace the ones that are being transitioned off-screen
            for (var i = 0; i < pivot.selectedIndex; i++) {
                pivot._headersContainerElement.appendChild(pivot._headersContainerElement.children[i].cloneNode(true));
            }

            // Transition headers to the leading edge of the container, then render the container as usual
            var transformProperty = _BaseUtils._browserStyleEquivalents["transform"].cssName;
            this._transitionAnimation = _TransitionAnimation.executeTransition(
                pivot._headersContainerElement.querySelectorAll("." + _Constants._ClassNames.pivotHeader), {
                    property: transformProperty,
                    delay: 0,
                    duration: _headerSlideAnimationDuration,
                    timing: "ease-out",
                    to: "translateX(" + offset + "px)"
                }).then(done, done);
        } else {
            this.render();
        }
    }

    exit() {
        this._transitionAnimation.cancel();
        this.pivot._slideHeadersAnimation.cancel();
    }

    render(goPrevious?: boolean) {
        var pivot = this.pivot;
        if (this._blocked || pivot._pendingRefresh || !pivot._items) {
            return;
        }

        var restoreFocus = pivot._headersContainerElement.contains(<HTMLElement>_Global.document.activeElement);

        _Dispose._disposeElement(pivot._headersContainerElement);
        _ElementUtilities.empty(pivot._headersContainerElement);


        if (pivot._items.length === 1) {
            var header = this.renderHeader(0, true);
            header.classList.add(_Constants._ClassNames.pivotHeaderSelected);
            pivot._headersContainerElement.appendChild(header);

            pivot._viewportElement.style.overflow = "hidden";
            pivot._headersContainerElement.style.marginLeft = "0px";
            pivot._headersContainerElement.style.marginRight = "0px";
        } else if (pivot._items.length > 1) {
            // We always render 1 additional header before the current item.
            // When going backwards, we render 2 additional headers, the first one as usual, and the second one for
            // fading out the previous last header.
            var numberOfHeadersToRender = pivot._items.length + (goPrevious ? 2 : 1);
            var maxHeaderWidth = pivot._getHeaderItemsWidth() * 0.8;
            var indexToRender = pivot.selectedIndex - 1;

            if (pivot._viewportElement.style.overflow) {
                pivot._viewportElement.style.overflow = "";
            }

            for (var i = 0; i < numberOfHeadersToRender; i++) {
                if (indexToRender === -1) {
                    indexToRender = pivot._items.length - 1;
                } else if (indexToRender === pivot._items.length) {
                    indexToRender = 0;
                }

                var header = this.renderHeader(indexToRender, true);
                pivot._headersContainerElement.appendChild(header);

                if (header.offsetWidth > maxHeaderWidth) {
                    header.style.textOverflow = "ellipsis";
                    header.style.width = maxHeaderWidth + "px";
                }

                if (indexToRender === pivot.selectedIndex) {
                    header.classList.add(_Constants._ClassNames.pivotHeaderSelected);
                }
                indexToRender++;
            }
            if (!pivot._firstLoad && !this._firstRender) {
                var start: string, end: string;
                if (goPrevious) {
                    start = "";
                    end = "0";
                } else {
                    start = "0";
                    end = "";
                }

                var lastHeader = <HTMLElement>pivot._headersContainerElement.children[numberOfHeadersToRender - 1];
                lastHeader.style.opacity = start;
                var lastHeaderFadeInDuration = 0.167;
                lastHeader.style[_BaseUtils._browserStyleEquivalents["transition"].scriptName] = "opacity " + _TransitionAnimation._animationTimeAdjustment(lastHeaderFadeInDuration) + "s";
                _ElementUtilities._getComputedStyle(lastHeader).opacity;
                lastHeader.style.opacity = end;
            }

            pivot._headersContainerElement.children[0].setAttribute("aria-hidden", "true");
            pivot._headersContainerElement.style.marginLeft = "0px";
            pivot._headersContainerElement.style.marginRight = "0px";
            var leadingMargin = pivot._rtl ? "marginRight" : "marginLeft";
            var firstHeader = <HTMLElement>pivot._headersContainerElement.children[0];
            var leadingSpace = _ElementUtilities.getTotalWidth(firstHeader) - HeaderStateBase.headersContainerLeadingMargin;
            if (firstHeader !== pivot._headersContainerElement.children[0]) {
                // Calling getTotalWidth caused a layout which can trigger a synchronous resize which in turn
                // calls renderHeaders. We can ignore this one since its the old headers which are not in the DOM.
                return;
            }
            pivot._headersContainerElement.style[leadingMargin] = (-1 * leadingSpace) + "px";

            // Create header track nav button elements
            pivot._prevButton = _Global.document.createElement("button");
            pivot._prevButton.setAttribute("type", "button");
            _ElementUtilities.addClass(pivot._prevButton, _Constants._ClassNames.pivotNavButton);
            _ElementUtilities.addClass(pivot._prevButton, _Constants._ClassNames.pivotNavButtonPrev);
            pivot._prevButton.addEventListener("click", function () {
                if (pivot.locked) {
                    return;
                }
                pivot._rtl ? pivot._goNext() : pivot._goPrevious();
            });
            pivot._headersContainerElement.appendChild(pivot._prevButton);
            pivot._prevButton.style.left = pivot._rtl ? "0px" : leadingSpace + "px";

            pivot._nextButton = _Global.document.createElement("button");
            pivot._nextButton.setAttribute("type", "button");
            _ElementUtilities.addClass(pivot._nextButton, _Constants._ClassNames.pivotNavButton);
            _ElementUtilities.addClass(pivot._nextButton, _Constants._ClassNames.pivotNavButtonNext);
            pivot._nextButton.addEventListener("click", function () {
                if (pivot.locked) {
                    return;
                }
                pivot._rtl ? pivot._goPrevious() : pivot._goNext();
            });
            pivot._headersContainerElement.appendChild(pivot._nextButton);
            pivot._nextButton.style.right = pivot._rtl ? leadingSpace + "px" : "0px";
        }
        var firstHeaderIndex = pivot._headersContainerElement.children.length > 1 ? 1 : 0;
        if (restoreFocus) {
            pivot._headersContainerElement.focus();
        }
        this._firstRender = false;
    }

    activateHeader(headerElement: HTMLElement) {
        if (!headerElement.previousSibling) {
            // prevent clicking the previous header
            return;
        }
        this.pivot.selectedIndex = headerElement["_pivotItemIndex"];
    }

    handleNavigation(goPrevious: boolean, index: number, oldIndex: number) {
        var that = this;
        var pivot = this.pivot;
        if (this._blocked || index < 0 || pivot._firstLoad) {
            this.render(goPrevious);
            return;
        }

        var targetHeader: HTMLElement;

        if (goPrevious) {
            targetHeader = <HTMLElement>pivot._headersContainerElement.children[0];
        } else {
            if (index < oldIndex) {
                index += pivot._items.length;
            }
            targetHeader = <HTMLElement>pivot._headersContainerElement.children[1 + index - oldIndex];
        }

        if (!targetHeader) {
            this.render(goPrevious);
            return;
        }

        // Update the selected one:
        _ElementUtilities.removeClass(<HTMLElement>pivot._headersContainerElement.children[1], _Constants._ClassNames.pivotHeaderSelected);
        _ElementUtilities.addClass(targetHeader, _Constants._ClassNames.pivotHeaderSelected);

        var rtl = pivot._rtl;

        function offset(element: HTMLElement) {
            if (rtl) {
                return (<HTMLElement>element.offsetParent).offsetWidth - element.offsetLeft - element.offsetWidth;
            } else {
                return element.offsetLeft;
            }
        }

        var endPosition = offset(<HTMLElement>pivot._headersContainerElement.children[1]) - offset(targetHeader);
        if (rtl) {
            endPosition *= -1;
        }

        function headerCleanup() {
            if (pivot._disposed) {
                return;
            }

            that.render(goPrevious);
            pivot._slideHeadersAnimation = Promise.wrap();
        }

        var headerAnimation: any;
        if (_TransitionAnimation.isAnimationEnabled()) {
            headerAnimation = _TransitionAnimation.executeTransition(
                pivot._headersContainerElement.querySelectorAll("." + _Constants._ClassNames.pivotHeader),
                {
                    property: _BaseUtils._browserStyleEquivalents["transform"].cssName,
                    delay: 0,
                    duration: _headerSlideAnimationDuration,
                    timing: "ease-out",
                    to: "translateX(" + endPosition + "px)"
                });
        } else {
            headerAnimation = Promise.wrap();
        }

        pivot._slideHeadersAnimation = headerAnimation.then(headerCleanup, headerCleanup);
    }

    handleResize() {
        this.refreshHeadersState(false);
    }

    handleHeaderChanged(pivotItem: _PivotItem.PivotItem) {
        this.render();
        this.refreshHeadersState(true);
    }
}

_Base.Class.mix(Pivot, _Events.createEventProperties(
    _EventNames.itemAnimationEnd,
    _EventNames.itemAnimationStart,
    _EventNames.selectionChanged
    ));
_Base.Class.mix(Pivot, _Control.DOMEventMixin);