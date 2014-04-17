// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function pivotInit(global, WinJS, undefined) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Pivot">
        /// Tab control which displays a item of content.
        /// </summary>
        /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
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
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Pivot: WinJS.Namespace._lazy(function () {

            function pivotDefaultHeaderTemplate(item) {
                var element = document.createTextNode(typeof item.header === "object" ? JSON.stringify(item.header) : ('' + item.header));
                return element;
            }

            var createEvent = WinJS.Utilities._createEventProperty;
            var eventNames = {
                selectionChanged: "selectionchanged",
                itemAnimationStart: "itemanimationstart",
                itemAnimationEnd: "itemanimationend",
            };
            var MSManipulationEventStates = WinJS.Utilities._MSManipulationEvent;

            var Pivot = WinJS.Class.define(function Pivot_ctor(element, options) {
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
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </signature>

                element = element || document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new WinJS.ErrorFromName("WinJS.UI.Pivot.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._id = element.id || WinJS.Utilities._uniqueID(element);
                this._writeProfilerMark("constructor,StartTM");

                // Attaching JS control to DOM element
                element.winControl = this;
                this._element = element;
                this._element.setAttribute('role', 'tablist');
                if (!this._element.getAttribute("aria-label")) {
                    this._element.setAttribute('aria-label', strings.pivotAriaLabel);
                }
                WinJS.Utilities.addClass(this.element, WinJS.UI.Pivot._ClassName.pivot);
                WinJS.Utilities.addClass(this.element, "win-disposable");

                this._titleElement = document.createElement("DIV");
                this._titleElement.style.display = "none";
                WinJS.Utilities.addClass(this._titleElement, WinJS.UI.Pivot._ClassName.pivotTitle);
                this._element.appendChild(this._titleElement);

                this._headersContainerElement = document.createElement("DIV");
                WinJS.Utilities.addClass(this._headersContainerElement, WinJS.UI.Pivot._ClassName.pivotHeaders);
                this._element.appendChild(this._headersContainerElement);

                this._element.addEventListener('click', this._headerClickedHandler.bind(this));

                this._viewportElement = document.createElement("DIV");
                this._viewportElement.className = WinJS.UI.Pivot._ClassName.pivotViewport;
                this._element.appendChild(this._viewportElement);
                this._viewportElement.setAttribute("role", "group");
                this._viewportElement.setAttribute("aria-label", strings.pivotViewportAriaLabel);

                this.element.addEventListener("mselementresize", this._resizeHandler.bind(this));
                this._viewportWidth = null;
                this._viewportElement.addEventListener("scroll", this._scrollHandler.bind(this));
                this._viewportElement.addEventListener("MSManipulationStateChanged", this._MSManipulationStateChangedHandler.bind(this));
                WinJS.Utilities._addEventListener(this._viewportElement, "pointerdown", this._pointerDownHandler.bind(this));

                this._surfaceElement = document.createElement("DIV");
                this._surfaceElement.className = WinJS.UI.Pivot._ClassName.pivotSurface;
                this._viewportElement.appendChild(this._surfaceElement);

                this._offsetFromCenter = 0;
                this._currentIndexOnScreen = 0;
                this._loadId = 0;
                this._navMode = WinJS.UI.Pivot._NavigationModes.none;
                this._currentManipulationState = MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED;

                // This internally assigns this.items which causes item to be used (even from options) before selectedIndex
                this._parse();

                options = WinJS.Utilities._shallowCopy(options);
                if (options.items) {
                    // Set this first so selectedIndex and selectedItem can work against the new items.
                    this.items = options.items;
                    delete options.items;
                }

                WinJS.UI.setOptions(this, options);

                this._handleItemChangedBound = this._handleItemChanged.bind(this);
                this._handleItemInsertedBound = this._handleItemInserted.bind(this);
                this._handleItemMovedBound = this._handleItemMoved.bind(this);
                this._handleItemRemovedBound = this._handleItemRemoved.bind(this);
                this._handleItemReloadBound = this._handleItemReload.bind(this);

                this._refresh();

                this._writeProfilerMark("constructor,StopTM");
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Pivot.element" helpKeyword="WinJS.UI.Pivot.element">
                /// Gets the DOM element that hosts the Pivot.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.Pivot.locked" helpKeyword="WinJS.UI.Pivot.locked">
                /// Gets or sets a value that specifies whether the Pivot is locked to the current item.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </field>
                locked: {
                    get: function () {
                        return WinJS.Utilities.hasClass(this.element, WinJS.UI.Pivot._ClassName.pivotLocked);
                    },
                    set: function (value) {
                        WinJS.Utilities[value ? 'addClass' : 'removeClass'](this.element, WinJS.UI.Pivot._ClassName.pivotLocked);
                    }
                },

                /// <field type="WinJS.Binding.List" locid="WinJS.UI.Pivot.items" helpKeyword="WinJS.UI.Pivot.items">
                /// Gets or sets the WinJS.Binding.List of PivotItem objects that belong to this Pivot.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </field>
                items: {
                    get: function () {
                        if (this._pendingItems) {
                            return this._pendingItems;
                        }
                        return this._items;
                    },
                    set: function (value) {
                        var resetScrollPosition = !this._pendingItems;
                        this._pendingItems = value;
                        this._refresh();
                        if (resetScrollPosition) {
                            this._pendingIndexOnScreen = 0;
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.Pivot.title" helpKeyword="WinJS.UI.Pivot.title">
                /// Gets or sets the title of the Pivot.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
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
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
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
                                this._navMode = this._navMode || WinJS.UI.Pivot._NavigationModes.api;
                                this._loadItem(value);
                            }
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.Pivot.selectedItem" helpKeyword="WinJS.UI.Pivot.selectedItem">
                /// Gets or sets the item in view. This property is useful for restoring a previous view when your app launches or resumes.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
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

                /// <field type="Function" locid="WinJS.UI.Pivot.onselectionchanged" helpKeyword="WinJS.UI.Pivot.onselectionchanged">
                /// Raised when the user changes to a different item.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </field>
                onselectionchanged: createEvent(eventNames.selectionChanged),

                /// <field type="Function" locid="WinJS.UI.Pivot.onitemanimationstart" helpKeyword="WinJS.UI.Pivot.onitemanimationstart">
                /// Raised when the item's animation starts.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </field>
                onitemanimationstart: createEvent(eventNames.itemAnimationStart),

                /// <field type="Function" locid="WinJS.UI.Pivot.onitemanimationend" helpKeyword="WinJS.UI.Pivot.onitemanimationend">
                /// Raised when the item's animation ends.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </field>
                onitemanimationend: createEvent(eventNames.itemAnimationEnd),

                _getDirectionAccessor: function () {
                    return this._rtl ? "right" : "left";
                },

                _fireEvent: function pivot_fireEvent(type, canBubble, cancelable, detail) {
                    // Returns true if ev.preventDefault() was not called
                    var event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, !!canBubble, !!cancelable, detail);
                    return this.element.dispatchEvent(event);
                },

                _headerClickedHandler: function pivot_headerClickedHandler(ev) {
                    var header;

                    if (this.locked) {
                        return;
                    }

                    var src = ev.target;
                    if (WinJS.Utilities.hasClass(src, WinJS.UI.Pivot._ClassName.pivotHeader)) {
                        // UIA invoke clicks on the real header elements.
                        header = src;
                    } else {
                        var hitSrcElement = false;
                        var hitTargets = WinJS.Utilities._elementsFromPoint(ev.clientX, ev.clientY);
                        if (hitTargets &&
                            // Make sure there aren't any elements obscuring the Pivot headers.
                            // WinJS.Utilities._elementsFromPoint sorts by z order.
                                hitTargets[0] === this._viewportElement) {
                            for (var i = 0, len = hitTargets.length; i < len; i++) {
                                if (hitTargets[i] === src) {
                                    hitSrcElement = true;
                                }
                                if (WinJS.Utilities.hasClass(hitTargets[i], WinJS.UI.Pivot._ClassName.pivotHeader)) {
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
                        var item = header._item;
                        var index = this._items.indexOf(item);
                        if (index !== this.selectedIndex) {
                            if (!header.previousSibling) {
                                // prevent clicking the previous header
                                return;
                            }
                            this.selectedIndex = index;
                        } else {
                            // Move focus into content for Narrator.
                            WinJS.Utilities._setActiveFirstFocusableElement(this.selectedItem.element);
                        }
                    }
                },

                _resizeHandler: function (ev) {
                    if (this._disposed) {
                        return;
                    }

                    var oldViewportWidth = this._viewportWidth;
                    // Invalidate the viewportWidth
                    this._viewportWidth = null;
                    if (oldViewportWidth !== this._viewportWidth) {
                        WinJS.log && WinJS.log('_resizeHandler from:' + oldViewportWidth + " to: " + this._viewportWidth);

                        this._hidePivotItemAnimation && this._hidePivotItemAnimation.cancel();
                        this._showPivotItemAnimation && this._showPivotItemAnimation.cancel();
                        this._slideHeadersAnimation && this._slideHeadersAnimation.cancel();

                        this._recenterUI();

                        this._renderHeaders();
                    } else {
                        WinJS.log && WinJS.log('_resizeHandler worthless resize');
                    }
                },

                _recenterUI: function pivot_recenterUI() {
                    this._offsetFromCenter = 0;

                    if (this._viewportElement.scrollLeft !== this._currentScrollTargetLocation) {
                        // If recentering causes a scroll, then we need to make sure that the next
                        // scroll event event doesn't trigger another navigation
                        this._recentering = true;
                    } else {
                        this._stoppedAndRecenteredSignal.complete();
                        this._stoppedAndRecenteredSignal = null;
                    }
                    WinJS.log && WinJS.log('_recenterUI index:' + this.selectedIndex + ' offset: ' + this._offsetFromCenter + ' scrollLeft: ' + this._currentScrollTargetLocation);
                    this.selectedItem.element.style[this._getDirectionAccessor()] = this._currentScrollTargetLocation + 'px';
                    this._viewportElement.scrollLeft = this._currentScrollTargetLocation;
                },

                _scrollHandler: function pivot_scrollHandler() {
                    if (this._disposed) {
                        return;
                    }

                    if (this._recentering && this._stoppedAndRecenteredSignal) {
                        this._stoppedAndRecenteredSignal.complete();
                        this._stoppedAndRecenteredSignal = null;
                        this._recentering = false;
                        return;
                    }

                    if ((this._navMode === WinJS.UI.Pivot._NavigationModes.none || this._navMode === WinJS.UI.Pivot._NavigationModes.scroll)
                            && this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {

                        this._navMode = WinJS.UI.Pivot._NavigationModes.scroll;
                        WinJS.log && WinJS.log('_scrollHandler ScrollPosition: ' + this._viewportElement.scrollLeft, "winjs pivot", "log");
                        // Check if narrator user panned/scrolled the Pivot and we are now at an unsupported location.
                        var diff = this._viewportElement.scrollLeft - this._currentScrollTargetLocation;
                        this._cachedRTL = getComputedStyle(this._element, null).direction === "rtl";
                        if (diff > 10) {
                            WinJS.log && WinJS.log('_scrollHandler diff > 1: ' + diff, "winjs pivot", "log");
                            this._goNext();
                        } else if (diff < -10) {
                            WinJS.log && WinJS.log('_scrollHandler diff < -1: ' + diff, "winjs pivot", "log");
                            this._goPrevious();
                        }
                    }
                },

                _MSManipulationStateChangedHandler: function pivot_MSManipulationStateChangedHandler(ev) {
                    this._currentManipulationState = ev.currentState;
                    if (ev.target !== this._viewportElement) {
                        // Ignore sub scroller manipulations.
                        return;
                    }
                    if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                        WinJS.log && WinJS.log('MSManipulation: Stopped', "winjs pivot", "log");
                    } else if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_INERTIA) {
                        WinJS.log && WinJS.log('MSManipulation: Inertia', "winjs pivot", "log");
                    } else {
                        WinJS.log && WinJS.log('MSManipulation: Active', "winjs pivot", "log");
                    }

                    if (!this._stoppedAndRecenteredSignal) {
                        this._stoppedAndRecenteredSignal = new WinJS._Signal();
                    }

                    this._manipulationRecenterPromise && this._manipulationRecenterPromise.cancel();

                    if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                        this._navMode = WinJS.UI.Pivot._NavigationModes.none;
                        this._scrollHandler();

                        var that = this;
                        this._manipulationRecenterPromise = WinJS.Promise._cancelBlocker(
                            WinJS.Promise.join([
                                WinJS.Utilities.Scheduler.schedulePromiseNormal(null, "WinJS.UI.Pivot._MSManipulationStateChangedHandler_animationPlaceholder"),
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
                                WinJS.log && WinJS.log('Still in Stopped state: calling _recenterUI', "winjs pivot", "log");
                                that._recenterUI();
                            } else {
                                this._stoppedAndRecenteredSignal.complete();
                                this._stoppedAndRecenteredSignal = null;
                            }
                        });
                    } else if (this._currentManipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_INERTIA) {
                        var destinationX = ev.inertiaDestinationX;
                        if (+destinationX === destinationX) {
                            WinJS.log && WinJS.log('MSManipulation: inertiaDestinationX: ' + destinationX);
                            var diff = destinationX - this._currentScrollTargetLocation;
                            if (diff > 1) {
                                WinJS.log && WinJS.log('MSManipulation: Inertia diff > 1', "winjs pivot", "log");
                                this._navMode = WinJS.UI.Pivot._NavigationModes.inertia;
                                this._goNext();
                            } else if (diff < -1) {
                                WinJS.log && WinJS.log('MSManipulation: Stopped diff < -1', "winjs pivot", "log");
                                this._navMode = WinJS.UI.Pivot._NavigationModes.inertia;
                                this._goPrevious();
                            }
                        }
                    }
                },

                _pointerDownHandler: function pivot_pointerDownHandler(ev) {
                    WinJS.log && WinJS.log('_pointerDown', "winjs pivot", "log");
                    // Don't do recentering if a finger is down.
                    this._manipulationRecenterPromise && this._manipulationRecenterPromise.cancel();
                    // If another finger comes down stop animations.
                    this._slideHeadersAnimation && this._slideHeadersAnimation.cancel();
                    this._hidePivotItemAnimation && this._hidePivotItemAnimation.cancel();
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

                _goNext: function pivot_goNext() {
                    if (this.selectedIndex < this._items.length - 1) {
                        this.selectedIndex++;
                    } else {
                        this.selectedIndex = 0;
                    }
                },

                _renderHeaders: function pivot_renderHeaders(goPrevious) {
                    if (this._pendingRefresh || !this._items) {
                        return;
                    }

                    var template = WinJS.Utilities._syncRenderer(pivotDefaultHeaderTemplate);

                    WinJS.Utilities._disposeElement(this._headersContainerElement);
                    WinJS.Utilities.empty(this._headersContainerElement);

                    var that = this;
                    function renderHeader(index) {
                        var item = that._items.getAt(index);

                        var headerContainerEl = document.createElement("BUTTON");
                        if (index === that.selectedIndex) {
                            WinJS.Utilities.addClass(headerContainerEl, WinJS.UI.Pivot._ClassName.pivotHeaderSelected);
                            headerContainerEl.setAttribute('aria-selected', true);
                        } else {
                            headerContainerEl.setAttribute('aria-selected', false);
                        }
                        WinJS.Utilities.addClass(headerContainerEl, WinJS.UI.Pivot._ClassName.pivotHeader);
                        headerContainerEl._item = item;
                        template(item, headerContainerEl)
                        headerContainerEl.setAttribute('role', 'tab');
                        that._headersContainerElement.appendChild(headerContainerEl);

                        function ariaSelectedMutated() {
                            if (that._disposed) {
                                return;
                            }

                            if (that._headersContainerElement.contains(headerContainerEl) &&
                                index !== that.selectedIndex &&
                                headerContainerEl.getAttribute('aria-selected') === "true") {
                                // Ignore aria selected changes on selected item.
                                // By selecting another tab we change to it.
                                that.selectedIndex = index;
                            }
                        }

                        new MutationObserver(ariaSelectedMutated).observe(headerContainerEl, { attributes: true, attributeFilter: ["aria-selected"] });
                    }

                    if (this._items.length === 1) {
                        renderHeader(0);
                        this._viewportElement.style.overflow = "hidden"
                        this._headersContainerElement.style.marginLeft = "0px";
                        this._headersContainerElement.style.marginRight = "0px";
                    } else if (this._items.length > 1) {
                        // We always render 1 additional header before the current item.
                        // When going backwards, we render 2 additional headers, the first one as usual, and the second one for
                        // fading out the previous last header.
                        var numberOfHeadersToRender = this._items.length + (goPrevious ? 2 : 1);
                        var indexToRender = this.selectedIndex - 1;

                        if (this._viewportElement.style.overflow) {
                            this._viewportElement.style.overflow = "";
                        }

                        for (var i = 0; i < numberOfHeadersToRender; i++) {
                            if (indexToRender === -1) {
                                indexToRender = this._items.length - 1;
                            } else if (indexToRender === this._items.length) {
                                indexToRender = 0;
                            }

                            renderHeader(indexToRender);
                            indexToRender++;
                        }
                        if (!this._skipHeaderSlide) {
                            var start, end;
                            if (goPrevious) {
                                start = "";
                                end = "0";
                            } else {
                                start = "0";
                                end = "";
                            }

                            var lastHeader = this._headersContainerElement.children[numberOfHeadersToRender - 1];
                            lastHeader.style.opacity = start;
                            // @TODO, add unit testing hook for animation performance
                            var lastHeaderFadeInDuration = 0.167;
                            lastHeader.style[WinJS.Utilities._browserStyleEquivalents["transition"].scriptName] = "opacity " + WinJS.UI._animationTimeAdjustment(time) + "s";
                            getComputedStyle(lastHeader).opacity;
                            lastHeader.style.opacity = end;
                        }

                        this._headersContainerElement.children[0].setAttribute("aria-hidden", "true");
                        this._headersContainerElement.style.marginLeft = "0px";
                        this._headersContainerElement.style.marginRight = "0px";
                        var leadingMargin = this._rtl ? "marginRight" : "marginLeft";
                        var trailingPadding = this._rtl ? "paddingLeft" : "paddingRight";
                        var firstHeader = this._headersContainerElement.children[0];
                        var leadingSpace = firstHeader.offsetWidth + parseFloat(getComputedStyle(firstHeader)[leadingMargin]) - parseFloat(getComputedStyle(firstHeader)[trailingPadding]);
                        if (firstHeader !== this._headersContainerElement.children[0]) {
                            // Calling offsetWidth caused a layout which can trigger a synchronous resize which in turn
                            // calls renderHeaders. We can ignore this one since its the old headers which are not in the DOM.
                            return;
                        }
                        this._headersContainerElement.style[leadingMargin] = (-1 * leadingSpace) + "px";
                    }
                },

                _refresh: function pivot_refresh() {
                    if (this._pendingRefresh) {
                        return;
                    }

                    // This is to coalesce property setting operations such as items and scrollPosition.
                    this._pendingRefresh = true;

                    WinJS.Utilities.Scheduler.schedule(this._applyProperties.bind(this), WinJS.Utilities.Scheduler.Priority.high);
                },

                _applyProperties: function pivot_applyProperties() {
                    if (this._disposed) {
                        return;
                    }

                    this._pendingRefresh = false;

                    if (this._pendingItems) {
                        this._updateEvents(this._items, this._pendingItems);
                        this._items = this._pendingItems;
                        this._pendingItems = null;
                        // Remove any declaratively specified pivot items before attachItems.
                        while (this.element.firstElementChild !== this._titleElement) {
                            var toRemove = this.element.firstElementChild;
                            toRemove.parentNode.removeChild(toRemove);
                        }
                        WinJS.Utilities.empty(this._surfaceElement);
                    }

                    this._attachItems();

                    var pendingIndexOnScreen = this._pendingIndexOnScreen;
                    this._pendingIndexOnScreen = null;
                    this._currentIndexOnScreen = 0;
                    this._skipHeaderSlide = true;
                    this.selectedIndex = Math.min(pendingIndexOnScreen, this.items.length - 1);
                    this._skipHeaderSlide = false;
                },

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
                            throw new WinJS.ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
                        }

                        newItem.element.style.visibility = "hidden";
                        newItem.element.style.opacity = 0;

                        this._surfaceElement.insertBefore(newItem.element, oldItem.element);
                        this._surfaceElement.removeChild(oldItem.element);

                        if (index === this._currentIndexOnScreen) {
                            this.selectedIndex = this._currentIndexOnScreen;
                        }
                    }

                    this._renderHeaders();
                },

                _handleItemInserted: function pivot_handleItemInserted(ev) {
                    // Insert is triggered by binding list insert APIs such as splice(), push(), and unshift().
                    if (this._pendingItems) {
                        return;
                    }

                    var index = ev.detail.index;
                    var item = ev.detail.value;

                    if (item.element.parentNode === this._surfaceElement) {
                        throw new WinJS.ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
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

                    this._renderHeaders();
                },

                _rtl: {
                    get: function () {
                        return this._cachedRTL;
                    }
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

                    this._renderHeaders();
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
                    } else if (index == this._currentIndexOnScreen) {
                        this.selectedIndex = Math.min(this.items.length - 1, this._currentIndexOnScreen);
                    }

                    this._renderHeaders();
                },

                _handleItemReload: function pivot_handleItemReload(ev) {
                    // Reload is triggered by large operations on the binding list such as reverse(). This causes 
                    // _pendingItems to be true which ignores future insert/remove/modified/moved events until the new 
                    // items list is applied.
                    this.items = this.items;
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

                _attachItems: function pivot_attachItems() {
                    this._measured = false;
                    for (var i = 0, len = this.items.length; i < len; i++) {
                        var item = this._items.getAt(i);

                        if (item.element.parentNode === this._surfaceElement) {
                            throw new WinJS.ErrorFromName("WinJS.UI.Pivot.DuplicateItem", strings.duplicateItem);
                        }

                        item.element.style.visibility = "hidden";
                        item.element.style.opacity = 0;

                        this._surfaceElement.appendChild(item.element);
                    }
                },

                _currentScrollTargetLocation: {
                    get: function () {
                        // 49 pages before + current one is 50. There are also 50 afterwards.
                        return (50 + this._offsetFromCenter) * Math.ceil(this._viewportWidth);
                    }
                },

                _viewportWidth: {
                    get: function () {
                        if (!this._viewportElWidth) {
                            this._viewportElWidth = parseFloat(getComputedStyle(this._viewportElement).width);
                            this._viewportElement.style[WinJS.Utilities._browserStyleEquivalents["scroll-snap-points-x"].scriptName] = "snapInterval(0%, " + Math.ceil(this._viewportElWidth) + "px)";
                        }
                        return this._viewportElWidth || 1;
                    },
                    set: function (value) {
                        this._viewportElWidth = value;
                    }
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

                    if (WinJS.UI.isAnimationEnabled()) {
                        this._hidePivotItemAnimation = WinJS.UI.Animation[negativeTransform ? "slideRightOut" : "slideLeftOut"](element);
                    } else {
                        this._hidePivotItemAnimation = WinJS.Utilities.Scheduler.schedulePromiseNormal(null, "WinJS.UI.Pivot._hidePivotItem_animationPlaceholder");
                    }

                    this._hidePivotItemAnimation.then(cleanup, cleanup);
                },

                _showPivotItem: function pivot_showPivotItem(element, goPrevious) {
                    // Fire the event even if animations are disabled to enable apps to know what is happening
                    this._writeProfilerMark("itemAnimationStart,info");
                    this._fireEvent(WinJS.UI.Pivot._EventName.itemAnimationStart, true);

                    if (!WinJS.UI.isAnimationEnabled()) {
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

                    this._showPivotItemAnimation = WinJS.UI.Animation[negativeTransform ? "slideRightIn" : "slideLeftIn"](element, slideGroup1Els, slideGroup2Els, slideGroup3Els);

                    var that = this;
                    function showCleanup() {
                        if (that._disposed) {
                            return;
                        }

                        that._showPivotItemAnimation = null;
                    }

                    this._showPivotItemAnimation.then(showCleanup, showCleanup);
                },

                _slideHeaders: function pivot_slideHeaders(goPrevious, index, oldIndex) {
                    if (index < 0 || this._skipHeaderSlide) {
                        this._renderHeaders(goPrevious);
                        return;
                    }

                    var targetHeader;

                    if (goPrevious) {
                        targetHeader = this._headersContainerElement.children[0];
                    } else {
                        if (index < oldIndex) {
                            index += this._items.length;
                        }
                        targetHeader = this._headersContainerElement.children[1 + index - oldIndex]
                    }

                    if (!targetHeader) {
                        this._renderHeaders(goPrevious);
                        return;
                    }

                    // Update the selected one:
                    WinJS.Utilities.removeClass(this._headersContainerElement.children[1], WinJS.UI.Pivot._ClassName.pivotHeaderSelected);
                    WinJS.Utilities.addClass(targetHeader, WinJS.UI.Pivot._ClassName.pivotHeaderSelected);

                    var rtl = this._rtl;

                    function offset(element) {
                        if (rtl) {
                            return element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth;
                        } else {
                            return element.offsetLeft;
                        }
                    }

                    var endPosition = offset(this._headersContainerElement.children[1]) - offset(targetHeader);
                    if (rtl) {
                        endPosition *= -1;
                    }

                    var that = this;
                    function headerCleanup() {
                        if (that._disposed) {
                            return;
                        }

                        that._renderHeaders(goPrevious);
                        that._slideHeadersAnimation = null;
                    }

                    var headerAnimation;
                    if (WinJS.UI.isAnimationEnabled()) {
                        headerAnimation = WinJS.UI.executeTransition(
                        this._headersContainerElement.children,
                        {
                            property: WinJS.Utilities._browserStyleEquivalents["transform"].cssName,
                            delay: 0,
                            duration: 250,
                            timing: "ease-out",
                            to: "translateX(" + endPosition + "px)"
                        });
                    } else {
                        headerAnimation = WinJS.Promise.wrap();
                    }

                    this._slideHeadersAnimation = headerAnimation.then(headerCleanup, headerCleanup);
                },

                _loadItem: function pivot_loadItem(index) {
                    var goPrevious = this._animateToPrevious;
                    this._cachedRTL = getComputedStyle(this._element, null).direction === "rtl";
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
                    this._slideHeaders(goPrevious, index, oldIndex);

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

                    if (this._currentManipulationState !== MSManipulationEventStates.MS_MANIPULATION_STATE_INERTIA) {
                        if (this._skipHeaderSlide) {
                            WinJS.log && WinJS.log('_skipHeaderSlide index:' + this.selectedIndex + ' offset: ' + this._offsetFromCenter + ' scrollLeft: ' + this._currentScrollTargetLocation, "winjs pivot", "log");
                            this._viewportElement.scrollLeft = this._currentScrollTargetLocation;
                        } else {
                            WinJS.log && WinJS.log('zoomTo index:' + this.selectedIndex + ' offset: ' + this._offsetFromCenter + ' scrollLeft: ' + this._currentScrollTargetLocation, "winjs pivot", "log");
                            WinJS.Utilities._zoomTo(this._viewportElement, { contentX: this._currentScrollTargetLocation, contentY: 0, viewportX: 0, viewportY: 0 });
                        }
                    }

                    var that = this;
                    var eventFired = false;
                    var selectionChangedDetail = {
                        index: index,
                        direction: goPrevious ? "backwards" : "forward",
                        item: item
                    };
                    this._writeProfilerMark("selectionChanged,info");
                    this._fireEvent(WinJS.UI.Pivot._EventName.selectionChanged, true, false, selectionChangedDetail);

                    // Start it hidden until it is loaded
                    item._process().then(function () {
                        if (that._disposed) {
                            return;
                        }
                        if (loadId === that._loadId) {
                            // Position item:
                            item.element.style[that._getDirectionAccessor()] = that._currentScrollTargetLocation + "px";

                            // Once the item is loaded show it and animate it in.
                            that._showPivotItem(item.element, goPrevious);

                            WinJS.Promise.join([that._slideHeadersAnimation, that._showPivotItemAnimation, that._hidePivotItemAnimation]).then(function () {
                                (that._stoppedAndRecenteredSignal ? that._stoppedAndRecenteredSignal.promise : WinJS.Promise.wrap()).then(function () {
                                    WinJS.Promise.timeout(50).then(function () {
                                        if (that._disposed) {
                                            return;
                                        }
                                        if (loadId === that._loadId) {
                                            that._navMode = WinJS.UI.Pivot._NavigationModes.none;

                                            // Fire event even if animation didn't occur:
                                            that._writeProfilerMark("itemAnimationStop,info");
                                            that._fireEvent(WinJS.UI.Pivot._EventName.itemAnimationEnd, true);
                                        }
                                    });
                                });
                            });
                        }
                    });
                },

                _parse: function pivot_parse() {
                    var pivotItems = []
                    var pivotItemEl = this.element.firstElementChild;

                    while (pivotItemEl !== this._titleElement) {
                        WinJS.UI.processAll(pivotItemEl);

                        var pivotItemContent = pivotItemEl.winControl;
                        if (pivotItemContent) {
                            pivotItems.push(pivotItemContent);
                        } else {
                            throw new WinJS.ErrorFromName("WinJS.UI.Pivot.InvalidContent", strings.invalidContent);
                        }

                        var nextItemEl = pivotItemEl.nextElementSibling;
                        pivotItemEl = nextItemEl;
                    }

                    this.items = new WinJS.Binding.List(pivotItems);
                },

                _writeProfilerMark: function pivot_writeProfilerMark(text) {
                    var message = "WinJS.UI.Pivot:" + this._id + ":" + text;
                    WinJS.Utilities._writeProfilerMark(message);
                    WinJS.log && WinJS.log(message, null, "pivotprofiler");
                },

                dispose: function pivot_dispose() {
                    /// <signature helpKeyword="WinJS.UI.Pivot.dispose">
                    /// <summary locid="WinJS.UI.Pivot.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._updateEvents(this._items);

                    WinJS.Utilities._disposeElement(this._headersContainerElement);

                    for (var i = 0, len = this.items.length; i < len; i++) {
                        this.items.getAt(i).dispose();
                    }
                }
            }, {
                // Names of classes used by the Pivot.
                _ClassName: {
                    pivot: "win-pivot",
                    pivotLocked: "win-pivot-locked",
                    pivotTitle: "win-pivot-title",
                    pivotHeaders: "win-pivot-headers",
                    pivotHeader: "win-pivot-header",
                    pivotHeaderSelected: "win-pivot-header-selected",
                    pivotViewport: "win-pivot-viewport",
                    pivotSurface: "win-pivot-surface",
                },
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
            })
            WinJS.Class.mix(Pivot, WinJS.UI.DOMEventMixin);

            var strings = {
                get duplicateConstruction() { return WinJS.Resources._getWinJSString("ui/duplicateConstruction").value; },
                get duplicateItem() { return WinJS.Resources._getWinJSString("ui/duplicateItem").value; },
                get invalidContent() { return WinJS.Resources._getWinJSString("ui/invalidPivotContent").value; },
                get pivotAriaLabel() { return WinJS.Resources._getWinJSString("ui/pivotAriaLabel").value; },
                get pivotViewportAriaLabel() { return WinJS.Resources._getWinJSString("ui/pivotViewportAriaLabel").value; }
            };

            return Pivot;
        })
    });

})(this, WinJS);