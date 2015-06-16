// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Animations/_TransitionAnimation',
    '../BindingList',
    '../ControlProcessor',
    '../Promise',
    '../Scheduler',
    '../_Signal',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_TabContainer',
    '../Utilities/_KeyboardBehavior',
    './Pivot/_Constants',
    './Pivot/_Item',
    'require-style!less/styles-pivot',
    'require-style!less/colors-pivot'
], function pivotInit(_Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Animations, _TransitionAnimation, BindingList, ControlProcessor, Promise, Scheduler, _Signal, _Control, _Dispose, _ElementUtilities, _Hoverable, _TabContainer, _KeyboardBehavior, _Constants, _Item) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Pivot">
        /// Tab control which displays a item of content.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.pivot.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.pivot.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Pivot">
        /// <div data-win-control="WinJS.UI.PivotItem" data-win-options="{header: 'PivotItem Header'}">PivotItem Content</div>
        /// </div>]]></htmlSnippet>
        /// <event name="selectionchanged" bubbles="true" locid="WinJS.UI.Pivot_e:selectionchanged">Raised when the item on screen has changed.</event>
        /// <event name="itemanimationstart" bubbles="true" locid="WinJS.UI.Pivot_e:itemloaded">Raised when the item's animation starts.</event>
        /// <event name="itemanimationend" bubbles="true" locid="WinJS.UI.Pivot_e:itemanimationend">Raised when the item's animation ends.</event>
        /// <part name="pivot" class="win-pivot" locid="WinJS.UI.Pivot_part:pivot">The entire Pivot control.</part>
        /// <part name="title" class="win-pivot-title" locid="WinJS.UI.Pivot_part:title">The title for the Pivot control.</part>
        /// <part name="header" class="win-pivot-header" locid="WinJS.UI.Pivot_part:header">A header of a Pivot Item.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Pivot: _Base.Namespace._lazy(function () {
            var PT_MOUSE = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE || "mouse";
            var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
            var Keys = _ElementUtilities.Key;

            function pivotDefaultHeaderTemplate(item) {
                var element = _Global.document.createTextNode(typeof item.header === "object" ? JSON.stringify(item.header) : ('' + item.header));
                return element;
            }

            var createEvent = _Events._createEventProperty;
            var eventNames = {
                selectionChanged: "selectionchanged",
                itemAnimationStart: "itemanimationstart",
                itemAnimationEnd: "itemanimationend",
            };
            var MSManipulationEventStates = _ElementUtilities._MSManipulationEvent;

            var supportsSnap = !!(_ElementUtilities._supportsSnapPoints && _Global.HTMLElement.prototype.msZoomTo);

            
            var Pivot = _Base.Class.define(function Pivot_ctor(element, options) {
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
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._handleItemChangedBound = this._handleItemChanged.bind(this);
                this._handleItemInsertedBound = this._handleItemInserted.bind(this);
                this._handleItemMovedBound = this._handleItemMoved.bind(this);
                this._handleItemRemovedBound = this._handleItemRemoved.bind(this);
                this._handleItemReloadBound = this._handleItemReload.bind(this);

                
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Pivot.customLeftHeader" helpKeyword="WinJS.UI.Pivot.customLeftHeader">
                /// Gets or sets the left custom header.
                /// </field>
                customLeftHeader: {
                    get: function () {
                        return this._customLeftHeader.firstElementChild;
                    },
                    set: function (value) {
                        _ElementUtilities.empty(this._customLeftHeader);
                        this._customLeftHeader.appendChild(value);
                        this.forceLayout();
                    }
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Pivot.customRightHeader" helpKeyword="WinJS.UI.Pivot.customRightHeader">
                /// Gets or sets the right custom header.
                /// </field>
                customRightHeader: {
                    get: function () {
                        return this._customRightHeader.firstElementChild;
                    },
                    set: function (value) {
                        _ElementUtilities.empty(this._customRightHeader);
                        this._customRightHeader.appendChild(value);
                        this.forceLayout();
                        
                    }
                },

                /// <field type="String" locid="WinJS.UI.Pivot.title" helpKeyword="WinJS.UI.Pivot.title">
                /// Gets or sets the title of the Pivot.
                /// </field>
                title: {
                    get: function () {
                        return this._titleElement.textContent;
                    },
                    set: function (value) {
                        if (value) {
                            this._titleElement.style.display = "block";
                            this._titleElement.textContent = value;
                        } else {
                            this._titleElement.style.display = "none";
                            this._titleElement.textContent = "";
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.Pivot.selectedIndex" helpKeyword="WinJS.UI.Pivot.selectedIndex">
                /// Gets or sets the index of the item in view. This property is useful for restoring a previous view when your app launches or resumes.
                /// </field>
                selectedIndex: {
                    get: function () {
                        if (this.items.length === 0) {
                            return -1;
                        }

                        if (+this._pendingIndexOnScreen === this._pendingIndexOnScreen) {
                            return this._pendingIndexOnScreen;
                        }

                        return this._currentIndexOnScreen;
                    },
                    set: function (value) {
                        if (value >= 0 && value < this.items.length) {
                            if (this._pendingRefresh) {
                                this._pendingIndexOnScreen = value;
                            } else {
                                this._navMode = this._navMode || Pivot._NavigationModes.api;
                                this._loadItem(value);
                            }
                        }
                    }
                },

                /// <field type="WinJS.UI.PivotItem" locid="WinJS.UI.Pivot.selectedItem" helpKeyword="WinJS.UI.Pivot.selectedItem">
                /// Gets or sets the item in view. This property is useful for restoring a previous view when your app launches or resumes.
                /// </field>
                selectedItem: {
                    get: function () {
                        return this.items.getAt(this.selectedIndex);
                    },
                    set: function (value) {
                        var index = this.items.indexOf(value);
                        if (index !== -1) {
                            this.selectedIndex = index;
                        }
                    }
                },

                dispose: function pivot_dispose() {
                    /// <signature helpKeyword="WinJS.UI.Pivot.dispose">
                    /// <summary locid="WinJS.UI.Pivot.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._updateEvents(this._items);
                    _ElementUtilities._resizeNotifier.unsubscribe(this.element, this._resizeHandlerBound);
                    this._headersState.exit();

                    _Dispose._disposeElement(this._headersContainerElement);

                    for (var i = 0, len = this.items.length; i < len; i++) {
                        this.items.getAt(i).dispose();
                    }
                },

                forceLayout: function pivot_forceLayout() {
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
                },

                /// <field type="Function" locid="WinJS.UI.Pivot.onselectionchanged" helpKeyword="WinJS.UI.Pivot.onselectionchanged">
                /// Raised when the user changes to a different item.
                /// </field>
                onselectionchanged: createEvent(eventNames.selectionChanged),

                /// <field type="Function" locid="WinJS.UI.Pivot.onitemanimationstart" helpKeyword="WinJS.UI.Pivot.onitemanimationstart">
                /// Raised when the item's animation starts.
                /// </field>
                onitemanimationstart: createEvent(eventNames.itemAnimationStart),

                /// <field type="Function" locid="WinJS.UI.Pivot.onitemanimationend" helpKeyword="WinJS.UI.Pivot.onitemanimationend">
                /// Raised when the item's animation ends.
                /// </field>
                onitemanimationend: createEvent(eventNames.itemAnimationEnd),

                _currentScrollTargetLocation: {
                    get: function () {
                        if (this._viewportWidth === Pivot._invalidViewportWidth) {
                            // ViewportWidth is invalid, this means that the pivot has not been measured yet. This is either because
                            // the pivot is not in the DOM, or there is a pending refresh operation.
                            return 0;
                        }

                        // 49 pages before + current one is 50. There are also 50 afterwards.
                        return (50 + this._offsetFromCenter) * Math.ceil(this._viewportWidth);
                    }
                },

                _pointerType: {
                    get: function () {
                        return this._pointerTypeValue;
                    },
                    set: function (value) {
                        if (this._pointerTypeValue === value) {
                            return;
                        }

                        this._pointerTypeValue = value;
                        if (value === PT_TOUCH) {
                            _ElementUtilities.removeClass(this.element, Pivot._ClassName.pivotInputTypeMouse);
                            _ElementUtilities.addClass(this.element, Pivot._ClassName.pivotInputTypeTouch);
                            this._hideNavButtons();
                        } else {
                            _ElementUtilities.removeClass(this.element, Pivot._ClassName.pivotInputTypeTouch);
                            _ElementUtilities.addClass(this.element, Pivot._ClassName.pivotInputTypeMouse);
                        }
                    }
                },

                _rtl: {
                    get: function () {
                        return this._cachedRTL;
                    }
                },

                // Lifecycle
                _applyProperties: function pivot_applyProperties() {
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

                    this._attachItems();

                    var pendingIndexOnScreen = this._pendingIndexOnScreen;
                    this._pendingIndexOnScreen = null;
                    this._currentIndexOnScreen = 0;
                    this._firstLoad = true;
                    this._cachedRTL = _Global.getComputedStyle(this._element, null).direction === "rtl";
                    headersStates.common.refreshHeadersState(this, true);
                    this._pendingRefresh = false;

                    this.selectedIndex = Math.min(pendingIndexOnScreen, this.items.length - 1);
                    this._firstLoad = false;
                    this._recenterUI();
                },

                _attachItems: function pivot_attachItems() {
                    this._measured = false;
                    for (var i = 0, len = this.items.length; i < len; i++) {
                        var item = this._items.getAt(i);

                        if (item.element.parentNode === this._surfaceElement) {
                            throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
                        }

                        item.element.style.visibility = "hidden";
                        item.element.style.opacity = 0;

                        this._surfaceElement.appendChild(item.element);
                    }
                },

                _parse: function pivot_parse() {
                    var pivotItems = [];
                    var pivotItemEl = this.element.firstElementChild;

                    while (pivotItemEl !== this._titleElement) {
                        ControlProcessor.processAll(pivotItemEl);

                        var pivotItemContent = pivotItemEl.winControl;
                        if (pivotItemContent) {
                            pivotItems.push(pivotItemContent);
                        } else {
                            throw new _ErrorFromName("WinJS.UI.Pivot.InvalidContent", strings.invalidContent);
                        }

                        var nextItemEl = pivotItemEl.nextElementSibling;
                        pivotItemEl = nextItemEl;
                    }

                    this.items = new BindingList.List(pivotItems);
                },

                _refresh: function pivot_refresh() {
                    if (this._pendingRefresh) {
                        return;
                    }

                    // This is to coalesce property setting operations such as items and scrollPosition.
                    this._pendingRefresh = true;

                    Scheduler.schedule(this._applyProperties.bind(this), Scheduler.Priority.high);
                },

                _resizeHandler: function pivot_resizeHandler() {
                    if (this._disposed || this._pendingRefresh) {
                        return;
                    }

                    var oldViewportWidth = this._viewportWidth;
                    var oldHeaderItemsWidth = this._headerItemsWidth;
                    // Invalidate the viewportWidth and header items width, note that _viewportWidth and _headerItemsWidth are
                    // private properties that remeasure their values on access when their current value is null
                    this._invalidateMeasures();
                    if (oldViewportWidth !== this._viewportWidth || oldHeaderItemsWidth !== this._headerItemsWidth) {
                        _Log.log && _Log.log('_resizeHandler from:' + oldViewportWidth + " to: " + this._viewportWidth);

                        this._hidePivotItemAnimation && this._hidePivotItemAnimation.cancel();
                        this._showPivotItemAnimation && this._showPivotItemAnimation.cancel();
                        this._slideHeadersAnimation && this._slideHeadersAnimation.cancel();

                        this._recenterUI();
                        this._headersState.handleResize();
                    } else {
                        _Log.log && _Log.log('_resizeHandler worthless resize');
                    }
                },


                // Navigation
                _activateHeader: function pivot_activateHeader(headerElement) {
                    if (this.locked) {
                        return;
                    }

                    var index = this._items.indexOf(headerElement._item);
                    if (index !== this.selectedIndex) {
                        this._headersState.activateHeader(headerElement);
                    } else {
                        // Move focus into content for Narrator.
                        _ElementUtilities._setActiveFirstFocusableElement(this.selectedItem.element);
                    }
                },

                _goNext: function pivot_goNext() {
                    if (this.selectedIndex < this._items.length - 1) {
                        this.selectedIndex++;
                    } else {
                        this.selectedIndex = 0;
                    }
                },

                _goPrevious: function pivot_goPrevious() {
                    this._animateToPrevious = true;
                    if (this.selectedIndex > 0) {
                        this.selectedIndex--;
                    } else {
                        this.selectedIndex = this._items.length - 1;
                    }
                    this._animateToPrevious = false;
                },

                _loadItem: function pivot_loadItem(index) {
                    var goPrevious = this._animateToPrevious;
                    this._cachedRTL = _Global.getComputedStyle(this._element, null).direction === "rtl";
                    this._loadId++;
                    var loadId = this._loadId;

                    this._hidePivotItemAnimation && this._hidePivotItemAnimation.cancel();
                    this._showPivotItemAnimation && this._showPivotItemAnimation.cancel();
                    this._slideHeadersAnimation && this._slideHeadersAnimation.cancel();

                    if (this._currentItem) {
                        // Hide existing item
                        this._hidePivotItem(this._currentItem.element, goPrevious);
                    }

                    var oldIndex = this._currentIndexOnScreen;
                    this._currentIndexOnScreen = index;
                    this._headersState.handleNavigation(goPrevious, index, oldIndex);

                    if (index < 0) {
                        return;
                    }

                    // Get next item
                    var item = this._items.getAt(index);
                    this._currentItem = item;

                    if (goPrevious) {
                        this._offsetFromCenter--;
                    } else if (index !== oldIndex) {
                        this._offsetFromCenter++;
                    }

                    var zooming = false;
                    if (supportsSnap && this._currentManipulationState !== MSManipulationEventStates.MS_MANIPULATION_STATE_INERTIA) {
                        if (this._firstLoad) {
                            _Log.log && _Log.log('_firstLoad index:' + this.selectedIndex + ' offset: ' + this._offsetFromCenter + ' scrollLeft: ' + this._currentScrollTargetLocation, "winjs pivot", "log");
                            _ElementUtilities.setScrollPosition(this._viewportElement, { scrollLeft: this._currentScrollTargetLocation });
                        } else {
                            _Log.log && _Log.log('zoomTo index:' + this.selectedIndex + ' offset: ' + this._offsetFromCenter + ' scrollLeft: ' + this._currentScrollTargetLocation, "winjs pivot", "log");
                            this._viewportElement.msZoomTo({ contentX: this._currentScrollTargetLocation, contentY: 0, viewportX: 0, viewportY: 0 });
                            zooming = this._offsetFromCenter !== 0 && this.items.length > 1;
                        }
                    }

                    var that = this;
                    var selectionChangedDetail = {
                        index: index,
                        direction: goPrevious ? "backwards" : "forward",
                        item: item
                    };
                    this._writeProfilerMark("selectionChanged,info");
                    this._fireEvent(Pivot._EventName.selectionChanged, true, false, selectionChangedDetail);

                    // Start it hidden until it is loaded
                    item._process().then(function () {
                        if (that._disposed || loadId !== that._loadId) {
                            return;
                        }
                        if (supportsSnap) {
                            // Position item:
                            item.element.style[that._getDirectionAccessor()] = that._currentScrollTargetLocation + "px";
                            that._showPivotItem(item.element, goPrevious);
                        } else {
                            // Since we aren't msZoomTo'ing when snap points aren't supported, both the show and hide animations would be
                            // executing on top of each other which produces undesirable visuals. Here we wait for the hide to finish before showing.
                            if (that._hidePivotItemAnimation) {
                                that._showPivotItemAnimation = that._hidePivotItemAnimation.then(function () {
                                    if (that._disposed || loadId !== that._loadId) {
                                        return;
                                    }
                                    return that._showPivotItem(item.element, goPrevious);
                                });
                            } else {
                                // During the very first load or when the hide animation is canceled, we just show the pivot item immediately.
                                that._showPivotItem(item.element, goPrevious);
                            }
                        }

                        var recenterPromise;
                        if (zooming) {
                            if (!that._stoppedAndRecenteredSignal) {
                                that._stoppedAndRecenteredSignal = new _Signal();
                            }
                            recenterPromise = that._stoppedAndRecenteredSignal.promise;
                        } else {
                            recenterPromise = (that._stoppedAndRecenteredSignal && that._stoppedAndRecenteredSignal.promise) || Promise.wrap();
                        }
                        Promise.join([that._slideHeadersAnimation, that._showPivotItemAnimation, that._hidePivotItemAnimation]).then(function () {
                            recenterPromise.then(function () {
                                Promise.timeout(50).then(function () {
                                    if (that._disposed || loadId !== that._loadId) {
                                        return;
                                    }
                                    that._navMode = Pivot._NavigationModes.none;

                                    // Fire event even if animation didn't occur:
                                    that._writeProfilerMark("itemAnimationStop,info");
                                    that._fireEvent(Pivot._EventName.itemAnimationEnd, true);
                                });
                            });
                        });
                    });
                },

                _MSManipulationStateChangedHandler: function pivot_MSManipulationStateChangedHandler(ev) {
                    this._currentManipulationState = ev.currentState;
                    if (!supportsSnap || ev.target !== this._viewportElement) {
                        // Ignore sub scroller manipulations.
                        return;
                    }
                    if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                        _Log.log && _Log.log('MSManipulation: Stopped', "winjs pivot", "log");
                    } else if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_INERTIA) {
                        _Log.log && _Log.log('MSManipulation: Inertia', "winjs pivot", "log");
                    } else {
                        _Log.log && _Log.log('MSManipulation: Active', "winjs pivot", "log");
                    }

                    if (!this._stoppedAndRecenteredSignal) {
                        this._stoppedAndRecenteredSignal = new _Signal();
                    }

                    this._manipulationRecenterPromise && this._manipulationRecenterPromise.cancel();

                    if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                        if (this._navMode === Pivot._NavigationModes.scroll) {
                            this._scrollHandler();
                        }
                        this._navMode = Pivot._NavigationModes.none;

                        var that = this;
                        this._manipulationRecenterPromise = Promise._cancelBlocker(
                            Promise.join([
                                Scheduler.schedulePromiseNormal(null, "WinJS.UI.Pivot._MSManipulationStateChangedHandler_animationPlaceholder"),
                                this._hidePivotItemAnimation,
                                this._showPivotItemAnimation,
                                this._slideHeadersAnimation
                            ])
                        ).then(function () {
                            if (that._disposed) {
                                return;
                            }
                            if (that._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                                // If we are still "stopped" we should recenter.
                                _Log.log && _Log.log('Still in Stopped state: calling _recenterUI', "winjs pivot", "log");
                                that._recenterUI();
                            } else {
                                this._stoppedAndRecenteredSignal.complete();
                                this._stoppedAndRecenteredSignal = null;
                            }
                        });
                    } else if (this._navMode !== Pivot._NavigationModes.api && this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_INERTIA) {
                        var destinationX = ev.inertiaDestinationX;
                        if (+destinationX === destinationX) {
                            _Log.log && _Log.log('MSManipulation: inertiaDestinationX: ' + destinationX);
                            var diff = destinationX - this._currentScrollTargetLocation;
                            if (diff > 0) {
                                _Log.log && _Log.log('MSManipulation: Inertia diff > 1', "winjs pivot", "log");
                                this._navMode = Pivot._NavigationModes.inertia;
                                this._goNext();
                            } else if (diff < 0) {
                                _Log.log && _Log.log('MSManipulation: Stopped diff < -1', "winjs pivot", "log");
                                this._navMode = Pivot._NavigationModes.inertia;
                                this._goPrevious();
                            }
                        }
                    }
                },

                _scrollHandler: function pivot_scrollHandler() {
                    if (!supportsSnap || this._disposed) {
                        return;
                    }

                    if (this._recentering && this._stoppedAndRecenteredSignal) {
                        this._stoppedAndRecenteredSignal.complete();
                        this._stoppedAndRecenteredSignal = null;
                        this._recentering = false;
                        return;
                    }

                    if (this._navMode === Pivot._NavigationModes.none || this._navMode === Pivot._NavigationModes.scroll) {
                        this._navMode = Pivot._NavigationModes.scroll;
                        if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                            _Log.log && _Log.log('_scrollHandler ScrollPosition: ' + _ElementUtilities.getScrollPosition(this._viewportElement).scrollLeft, "winjs pivot", "log");
                            // Check if narrator user panned/scrolled the Pivot and we are now at an unsupported location.
                            var diff = _ElementUtilities.getScrollPosition(this._viewportElement).scrollLeft - this._currentScrollTargetLocation;
                            this._cachedRTL = _Global.getComputedStyle(this._element, null).direction === "rtl";
                            if (diff > 0) {
                                _Log.log && _Log.log('_scrollHandler diff > 1: ' + diff, "winjs pivot", "log");
                                this._goNext();
                            } else if (diff < 0) {
                                _Log.log && _Log.log('_scrollHandler diff < -1: ' + diff, "winjs pivot", "log");
                                this._goPrevious();
                            }
                        }
                    }
                },

                _recenterUI: function pivot_recenterUI() {
                    if (!supportsSnap) {
                        return;
                    }

                    this._offsetFromCenter = 0;

                    if (_ElementUtilities.getScrollPosition(this._viewportElement).scrollLeft !== this._currentScrollTargetLocation) {
                        // If recentering causes a scroll, then we need to make sure that the next
                        // scroll event event doesn't trigger another navigation
                        this._recentering = true;
                        this._stoppedAndRecenteredSignal = this._stoppedAndRecenteredSignal || new _Signal();
                    } else if (this._stoppedAndRecenteredSignal) {
                        this._stoppedAndRecenteredSignal.complete();
                        this._stoppedAndRecenteredSignal = null;
                    }
                    if (this.selectedItem) {
                        this.selectedItem.element.style[this._getDirectionAccessor()] = this._currentScrollTargetLocation + 'px';
                    }
                    _Log.log && _Log.log('_recenterUI index:' + this.selectedIndex + ' offset: ' + this._offsetFromCenter + ' scrollLeft: ' + this._currentScrollTargetLocation);
                    _ElementUtilities.setScrollPosition(this._viewportElement, { scrollLeft: this._currentScrollTargetLocation });
                },

                _hidePivotItem: function pivot_hidePivotItem(element, goPrevious) {
                    var that = this;
                    function cleanup() {
                        if (that._disposed) {
                            return;
                        }

                        that._hidePivotItemAnimation = null;

                        element.style.visibility = "hidden";
                        element.style.opacity = 0;
                    }

                    var negativeTransform = (this._rtl && !goPrevious) || (goPrevious && !this._rtl);

                    if (_TransitionAnimation.isAnimationEnabled()) {
                        this._hidePivotItemAnimation = Animations[negativeTransform ? "slideRightOut" : "slideLeftOut"](element);
                    } else {
                        this._hidePivotItemAnimation = Scheduler.schedulePromiseNormal(null, "WinJS.UI.Pivot._hidePivotItem_animationPlaceholder");
                    }

                    this._hidePivotItemAnimation.then(cleanup, cleanup);
                },

                _showPivotItem: function pivot_showPivotItem(element, goPrevious) {
                    // Fire the event even if animations are disabled to enable apps to know what is happening
                    this._writeProfilerMark("itemAnimationStart,info");
                    this._fireEvent(Pivot._EventName.itemAnimationStart, true);

                    if (!_TransitionAnimation.isAnimationEnabled()) {
                        element.style.visibility = "";
                        element.style.opacity = "";
                        this._showPivotItemAnimation = null;
                        return;
                    }

                    // Find the elements to slide in
                    var slideGroup1Els = element.querySelectorAll(".win-pivot-slide1");
                    var slideGroup2Els = element.querySelectorAll(".win-pivot-slide2");
                    var slideGroup3Els = element.querySelectorAll(".win-pivot-slide3");

                    var viewportBoundingClientRect = this._viewportElement.getBoundingClientRect();
                    function filterOnScreen(element) {
                        var elementBoundingClientRect = element.getBoundingClientRect();
                        // Can't check left/right since it might be scrolled off.
                        return elementBoundingClientRect.top < viewportBoundingClientRect.bottom &&
                            elementBoundingClientRect.bottom > viewportBoundingClientRect.top;
                    }

                    //Filter the slide groups to the elements actually on screen to avoid animating extra elements
                    slideGroup1Els = Array.prototype.filter.call(slideGroup1Els, filterOnScreen);
                    slideGroup2Els = Array.prototype.filter.call(slideGroup2Els, filterOnScreen);
                    slideGroup3Els = Array.prototype.filter.call(slideGroup3Els, filterOnScreen);

                    var negativeTransform = (this._rtl && !goPrevious) || (goPrevious && !this._rtl);

                    element.style.visibility = "";

                    this._showPivotItemAnimation = Animations[negativeTransform ? "slideRightIn" : "slideLeftIn"](element, slideGroup1Els, slideGroup2Els, slideGroup3Els);

                    var that = this;
                    function showCleanup() {
                        if (that._disposed) {
                            return;
                        }

                        that._showPivotItemAnimation = null;
                    }

                    this._showPivotItemAnimation.then(showCleanup, showCleanup);
                    return this._showPivotItemAnimation;
                },


                // Input Handlers
                _elementClickedHandler: function pivot_elementClickedHandler(ev) {
                    if (this.locked || this._navigationHandled) {
                        this._navigationHandled = false;
                        return;
                    }

                    var header;
                    var src = ev.target;
                    if (_ElementUtilities.hasClass(src, Pivot._ClassName.pivotHeader)) {
                        // UIA invoke clicks on the real header elements.
                        header = src;
                    } else {
                        var hitSrcElement = false;
                        var hitTargets = _ElementUtilities._elementsFromPoint(ev.clientX, ev.clientY);
                        if (hitTargets &&
                            // Make sure there aren't any elements obscuring the Pivot headers.
                            // WinJS.Utilities._elementsFromPoint sorts by z order.
                                hitTargets[0] === this._viewportElement) {
                            for (var i = 0, len = hitTargets.length; i < len; i++) {
                                if (hitTargets[i] === src) {
                                    hitSrcElement = true;
                                }
                                if (_ElementUtilities.hasClass(hitTargets[i], Pivot._ClassName.pivotHeader)) {
                                    header = hitTargets[i];
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
                },

                _elementPointerDownHandler: function pivot_elementPointerDownHandler(e) {
                    if (supportsSnap) {
                        return;
                    }
                    this._elementPointerDownPoint = { x: e.clientX, y: e.clientY, type: e.pointerType || "mouse", time: Date.now(), inHeaders: this._headersContainerElement.contains(e.target) };
                },

                _elementPointerUpHandler: function pivot_elementPointerUpHandler(e) {
                    if (!this._elementPointerDownPoint || this.locked) {
                        this._elementPointerDownPoint = null;
                        return;
                    }

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
                        && (!this.element.classList.contains(_Constants._ClassName.pivotDisableContentSwipeNavigation) || (this._elementPointerDownPoint.inHeaders && this._headersContainerElement.contains(e.target)));

                    this._navigationHandled = false;
                    if (doSwipeDetection) {
                        // Swipe navigation detection

                        // Simulate inertia by multiplying dx by a polynomial function of dt
                        var dt = Date.now() - this._elementPointerDownPoint.time;
                        dx *= Math.max(1, Math.pow(350 / dt, 2));
                        dx = this._rtl ? -dx : dx;

                        var vwDiv4 = this._viewportWidth / 4;
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
                        var element = e.target;
                        while (element !== null && !_ElementUtilities.hasClass(element, Pivot._ClassName.pivotHeader)) {
                            element = element.parentElement;
                        }
                        if (element !== null) {
                            this._activateHeader(element);
                            this._navigationHandled = true;
                        }
                    }
                    this._elementPointerDownPoint = null;
                },

                _pointerDownHandler: function pivot_pointerDownHandler() {
                    _Log.log && _Log.log('_pointerDown', "winjs pivot", "log");
                    // Don't do recentering if a finger is down.
                    this._manipulationRecenterPromise && this._manipulationRecenterPromise.cancel();
                    // If another finger comes down stop animations.
                    this._slideHeadersAnimation && this._slideHeadersAnimation.cancel();
                    this._hidePivotItemAnimation && this._hidePivotItemAnimation.cancel();
                },

                _showNavButtons: function pivot_showNavButtons(e) {
                    if (this.locked || (e && e.pointerType === PT_TOUCH)) {
                        return;
                    }
                    _ElementUtilities.addClass(this._headersContainerElement, Pivot._ClassName.pivotShowNavButtons);
                },


                // Datasource Mutation Handlers
                _handleItemChanged: function pivot_handleItemChanged(ev) {
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

                        newItem.element.style.visibility = "hidden";
                        newItem.element.style.opacity = 0;

                        this._surfaceElement.insertBefore(newItem.element, oldItem.element);
                        this._surfaceElement.removeChild(oldItem.element);

                        if (index === this._currentIndexOnScreen) {
                            this.selectedIndex = this._currentIndexOnScreen;
                        }
                    }

                    this._headersState.render();
                    headersStates.common.refreshHeadersState(this, true);
                },

                _handleItemInserted: function pivot_handleItemInserted(ev) {
                    // Insert is triggered by binding list insert APIs such as splice(), push(), and unshift().
                    if (this._pendingItems) {
                        return;
                    }

                    var index = ev.detail.index;
                    var item = ev.detail.value;

                    if (item.element.parentNode === this._surfaceElement) {
                        throw new _ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
                    }

                    item.element.style.visibility = "hidden";
                    item.element.style.opacity = 0;

                    if (index < this.items.length - 1) {
                        this._surfaceElement.insertBefore(item.element, this.items.getAt(index + 1).element);
                    } else {
                        this._surfaceElement.appendChild(item.element);
                    }

                    if (index <= this._currentIndexOnScreen) {
                        this._currentIndexOnScreen++;
                    }

                    if (this._items.length === 1) {
                        this.selectedIndex = 0;
                    }

                    this._headersState.render();
                    headersStates.common.refreshHeadersState(this, true);
                },

                _handleItemMoved: function pivot_handleItemMoved(ev) {
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

                    if (oldIndex < this._currentIndexOnScreen && newIndex >= this._currentIndexOnScreen) {
                        this._currentIndexOnScreen--;
                    } else if (newIndex > this._currentIndexOnScreen && oldIndex <= this._currentIndexOnScreen) {
                        this._currentIndexOnScreen++;
                    } else if (oldIndex === this._currentIndexOnScreen) {
                        this.selectedIndex = newIndex;
                    }

                    this._headersState.render();
                    headersStates.common.refreshHeadersState(this, true);
                },

                _handleItemReload: function pivot_handleItemReload() {
                    // Reload is triggered by large operations on the binding list such as reverse(). This causes
                    // _pendingItems to be true which ignores future insert/remove/modified/moved events until the new
                    // items list is applied.
                    this.items = this.items;
                },

                _handleItemRemoved: function pivot_handleItemRemoved(ev) {
                    // Removed is triggered by binding list removal APIs such as splice(), pop(), and shift().
                    if (this._pendingItems) {
                        return;
                    }

                    var item = ev.detail.value;
                    var index = ev.detail.index;

                    this._surfaceElement.removeChild(item.element);

                    if (index < this._currentIndexOnScreen) {
                        this._currentIndexOnScreen--;
                    } else if (index === this._currentIndexOnScreen) {
                        this.selectedIndex = Math.min(this.items.length - 1, this._currentIndexOnScreen);
                    }

                    this._headersState.render();
                    headersStates.common.refreshHeadersState(this, true);
                },


                // Misc helpers
                _fireEvent: function pivot_fireEvent(type, canBubble, cancelable, detail) {
                    // Returns true if ev.preventDefault() was not called
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, !!canBubble, !!cancelable, detail);
                    return this.element.dispatchEvent(event);
                },

                _getDirectionAccessor: function () {
                    return this._rtl ? "right" : "left";
                },

                _updateEvents: function pivot_updateEvents(oldItems, newItems) {
                    if (oldItems) {
                        oldItems.removeEventListener("itemchanged", this._handleItemChangedBound);
                        oldItems.removeEventListener("iteminserted", this._handleItemInsertedBound);
                        oldItems.removeEventListener("itemmoved", this._handleItemMovedBound);
                        oldItems.removeEventListener("itemremoved", this._handleItemRemovedBound);
                        oldItems.removeEventListener("reload", this._handleItemReloadBound);
                    }

                    if (newItems) {
                        newItems.addEventListener("itemchanged", this._handleItemChangedBound);
                        newItems.addEventListener("iteminserted", this._handleItemInsertedBound);
                        newItems.addEventListener("itemmoved", this._handleItemMovedBound);
                        newItems.addEventListener("itemremoved", this._handleItemRemovedBound);
                        newItems.addEventListener("reload", this._handleItemReloadBound);
                    }
                },


            }, {

                // Names of classes used by the Pivot.
                _ClassName: _Constants._ClassName,
                // Names of events fired by the Pivot.
                _EventName: {
                    selectionChanged: eventNames.selectionChanged,
                    itemAnimationStart: eventNames.itemAnimationStart,
                    itemAnimationEnd: eventNames.itemAnimationEnd,
                },
                // These modes keep track of what initiated a scroll/item navigation.
                // The precedence for these modes is inertia > api = scroll, meaning
                // if there is an ongoing pan (inertia), scroll and api calls are
                // ignored. If there is an api call, then scrolling is ignored, and
                // only if there is neither a pan nor api call, scrolling code will
                // execute.
                _NavigationModes: {
                    api: "api",
                    inertia: "inertia",
                    none: "",
                    scroll: "scroll",
                }
            });
            _Base.Class.mix(Pivot, _Control.DOMEventMixin);

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get duplicateItem() { return _Resources._getWinJSString("ui/duplicateItem").value; },
                get invalidContent() { return "Invalid content: Pivot content must be made up of PivotItems."; },
                get pivotAriaLabel() { return _Resources._getWinJSString("ui/pivotAriaLabel").value; },
                get pivotViewportAriaLabel() { return _Resources._getWinJSString("ui/pivotViewportAriaLabel").value; }
            };

            return Pivot;
        }),
    });
});