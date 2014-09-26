// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Animations/_TransitionAnimation',
    '../BindingList',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_ItemsManager',
    '../Utilities/_UI',
    './FlipView/_Constants',
    './FlipView/_PageManager',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
], function flipperInit(_Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, _TransitionAnimation, BindingList, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _Hoverable, _ItemsManager, _UI, _Constants, _PageManager) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.FlipView">
        /// Displays a collection, such as a set of photos, one item at a time.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.flipview.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.flipview.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.FlipView"></div>]]></htmlSnippet>
        /// <event name="datasourcecountchanged" bubbles="true" locid="WinJS.UI.FlipView_e:datasourcecountchanged">Raised when the number of items in the itemDataSource changes.</event>
        /// <event name="pagevisibilitychanged" bubbles="true" locid="WinJS.UI.FlipView_e:pagevisibilitychanged">Raised when a FlipView page becomes visible or invisible.</event>
        /// <event name="pageselected" bubbles="true" locid="WinJS.UI.FlipView_e:pageselected">Raised when the FlipView flips to a page.</event>
        /// <event name="pagecompleted" bubbles="true" locid="WinJS.UI.FlipView_e:pagecompleted">Raised when the FlipView flips to a page and its renderer function completes.</event>
        /// <part name="flipView" class="win-flipview" locid="WinJS.UI.FlipView_part:flipView">The entire FlipView control.</part>
        /// <part name="navigationButton" class="win-navbutton" locid="WinJS.UI.FlipView_part:navigationButton">The general class for all FlipView navigation buttons.</part>
        /// <part name="leftNavigationButton" class="win-navleft" locid="WinJS.UI.FlipView_part:leftNavigationButton">The left navigation button.</part>
        /// <part name="rightNavigationButton" class="win-navright" locid="WinJS.UI.FlipView_part:rightNavigationButton">The right navigation button.</part>
        /// <part name="topNavigationButton" class="win-navtop" locid="WinJS.UI.FlipView_part:topNavigationButton">The top navigation button.</part>
        /// <part name="bottomNavigationButton" class="win-navbottom" locid="WinJS.UI.FlipView_part:bottomNavigationButton">The bottom navigation button.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        FlipView: _Base.Namespace._lazy(function () {

            // Class names
            var navButtonClass = "win-navbutton",
                flipViewClass = "win-flipview",
                navButtonLeftClass = "win-navleft",
                navButtonRightClass = "win-navright",
                navButtonTopClass = "win-navtop",
                navButtonBottomClass = "win-navbottom";

            // Aria labels
            var previousButtonLabel = "Previous",
                nextButtonLabel = "Next";

            var buttonFadeDelay = 3000,
                avoidTrapDelay = 500,
                leftArrowGlyph = "&#57570;",
                rightArrowGlyph = "&#57571;",
                topArrowGlyph = "&#57572;",
                bottomArrowGlyph = "&#57573;",
                animationMoveDelta = 40;

            function flipViewPropertyChanged(list) {
                var that = list[0].target.winControl;
                if (that && that instanceof FlipView) {
                    if (list.some(function (record) {
                        if (record.attributeName === "dir") {
                            return true;
                    } else if (record.attributeName === "style") {
                            return (that._cachedStyleDir !== record.target.style.direction);
                    } else {
                            return false;
                    }
                    })) {
                        that._cachedStyleDir = that._flipviewDiv.style.direction;
                        that._rtl = _Global.getComputedStyle(that._flipviewDiv, null).direction === "rtl";
                        that._setupOrientation();
                    }
                }
            }

            function flipviewResized(e) {
                var that = e.target && e.target.winControl;
                if (that && that instanceof FlipView) {
                    _WriteProfilerMark("WinJS.UI.FlipView:resize,StartTM");
                    that._resize();
                }
            }

            var strings = {
                get badAxis() { return "Invalid argument: orientation must be a string, either 'horizontal' or 'vertical'"; },
                get badCurrentPage() { return "Invalid argument: currentPage must be a number greater than or equal to zero and be within the bounds of the datasource"; },
                get noitemsManagerForCount() { return "Invalid operation: can't get count if no dataSource has been set"; },
                get badItemSpacingAmount() { return "Invalid argument: itemSpacing must be a number greater than or equal to zero"; },
                get navigationDuringStateChange() { return "Error: After changing itemDataSource or itemTemplate, any navigation in the FlipView control should be delayed until the pageselected event is fired."; },
                get panningContainerAriaLabel() { return _Resources._getWinJSString("ui/flipViewPanningContainerAriaLabel").value; }
            };

            var FlipView = _Base.Class.define(function FlipView_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.FlipView.FlipView">
                /// <summary locid="WinJS.UI.FlipView.constructor">
                /// Creates a new FlipView.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.FlipView.constructor_p:element">
                /// The DOM element that hosts the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.FlipView.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the pageselected event,
                /// add a property named "onpageselected" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.FlipView" locid="WinJS.UI.FlipView.constructor_returnValue">
                /// The new FlipView control.
                /// </returns>
                /// </signature>
                _WriteProfilerMark("WinJS.UI.FlipView:constructor,StartTM");

                this._disposed = false;

                element = element || _Global.document.createElement("div");

                var isHorizontal = true,
                    dataSource = null,
                    itemRenderer = _ItemsManager._trivialHtmlRenderer,
                    initialIndex = 0,
                    itemSpacing = 0;

                if (options) {
                    // flipAxis parameter checking. Must be a string, either "horizontal" or "vertical"
                    if (options.orientation) {
                        if (typeof options.orientation === "string") {
                            switch (options.orientation.toLowerCase()) {
                                case "horizontal":
                                    isHorizontal = true;
                                    break;

                                case "vertical":
                                    isHorizontal = false;
                                    break;
                            }
                        }
                    }

                    if (options.currentPage) {
                        initialIndex = options.currentPage >> 0;
                        initialIndex = initialIndex < 0 ? 0 : initialIndex;
                    }

                    if (options.itemDataSource) {
                        dataSource = options.itemDataSource;
                    }

                    if (options.itemTemplate) {
                        itemRenderer = this._getItemRenderer(options.itemTemplate);
                    }

                    if (options.itemSpacing) {
                        itemSpacing = options.itemSpacing >> 0;
                        itemSpacing = itemSpacing < 0 ? 0 : itemSpacing;
                    }
                }

                if (!dataSource) {
                    var list = new BindingList.List();
                    dataSource = list.dataSource;
                }
                _ElementUtilities.empty(element);

                // Set _flipviewDiv so the element getter works correctly, then call _setOption with eventsOnly flag on before calling _initializeFlipView
                // so that event listeners are added before page loading
                this._flipviewDiv = element;
                element.winControl = this;
                _Control._setOptions(this, options, true);
                this._initializeFlipView(element, isHorizontal, dataSource, itemRenderer, initialIndex, itemSpacing);
                _ElementUtilities.addClass(element, "win-disposable");
                this._avoidTrappingTime = 0;
                this._windowWheelHandlerBound = this._windowWheelHandler.bind(this);
                _ElementUtilities._globalListener.addEventListener(element, 'wheel', this._windowWheelHandlerBound);
                _ElementUtilities._globalListener.addEventListener(element, 'mousewheel', this._windowWheelHandlerBound);

                _WriteProfilerMark("WinJS.UI.FlipView:constructor,StopTM");
            }, {

                // Public methods

                dispose: function FlipView_dispose() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.dispose">
                    /// <summary locid="WinJS.UI.FlipView.dispose">
                    /// Disposes this FlipView.
                    /// </summary>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:dispose,StopTM");
                    if (this._disposed) {
                        return;
                    }

                    _ElementUtilities._globalListener.removeEventListener(this._flipviewDiv, 'wheel', this._windowWheelHandlerBound);
                    _ElementUtilities._globalListener.removeEventListener(this._flipviewDiv, 'mousewheel', this._windowWheelHandlerBound);
                    _ElementUtilities._resizeNotifier.unsubscribe(this._flipviewDiv, flipviewResized);


                    this._disposed = true;
                    this._pageManager.dispose();
                    this._itemsManager.release();
                    this.itemDataSource = null;
                },

                next: function FlipView_next() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.next">
                    /// <summary locid="WinJS.UI.FlipView.next">
                    /// Navigates to the next item.
                    /// </summary>
                    /// <returns type="Boolean" locid="WinJS.UI.FlipView.next_returnValue">
                    /// true if the FlipView begins navigating to the next page;
                    /// false if the FlipView is at the last page or is in the middle of another navigation animation.
                    /// </returns>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:next,info");
                    var cancelAnimationCallback = this._nextAnimation ? null : this._cancelDefaultAnimation;
                    return this._navigate(true, cancelAnimationCallback);
                },

                previous: function FlipView_previous() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.previous">
                    /// <summary locid="WinJS.UI.FlipView.previous">
                    /// Navigates to the previous item.
                    /// </summary>
                    /// <returns type="Boolean" locid="WinJS.UI.FlipView.previous_returnValue">
                    /// true if FlipView begins navigating to the previous page;
                    /// false if the FlipView is already at the first page or is in the middle of another navigation animation.
                    /// </returns>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:prev,info");
                    var cancelAnimationCallback = this._prevAnimation ? null : this._cancelDefaultAnimation;
                    return this._navigate(false, cancelAnimationCallback);
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.FlipView.element" helpKeyword="WinJS.UI.FlipView.element">
                /// The DOM element that hosts the FlipView control.
                /// </field>
                element: {
                    get: function () {
                        return this._flipviewDiv;
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.FlipView.currentPage" helpKeyword="WinJS.UI.FlipView.currentPage" minimum="0">
                /// Gets or sets the index of the currently displayed page. The minimum value is 0 and the maximum value is one less than the total number of items returned by the data source.
                /// </field>
                currentPage: {
                    get: function () {
                        return this._getCurrentIndex();
                    },
                    set: function (index) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_currentPage,info");

                        if (this._pageManager._notificationsEndedSignal) {
                            var that = this;
                            this._pageManager._notificationsEndedSignal.promise.done(function () {
                                that._pageManager._notificationsEndedSignal = null;
                                that.currentPage = index;
                            });
                            return;
                        }

                        if (this._animating && !this._cancelAnimation()) {
                            return;
                        }

                        index = index >> 0;
                        index = index < 0 ? 0 : index;

                        if (this._refreshTimer) {
                            this._indexAfterRefresh = index;
                        } else {
                            if (this._pageManager._cachedSize > 0) {
                                index = Math.min(this._pageManager._cachedSize - 1, index);
                            } else if (this._pageManager._cachedSize === 0) {
                                index = 0;
                            }

                            var that = this;
                            if (this._jumpingToIndex === index) {
                                return;
                            }
                            var clearJumpToIndex = function () {
                                that._jumpingToIndex = null;
                            };
                            this._jumpingToIndex = index;
                            var jumpAnimation = (this._jumpAnimation ? this._jumpAnimation : this._defaultAnimation.bind(this)),
                                cancelAnimationCallback = (this._jumpAnimation ? null : this._cancelDefaultAnimation),
                                completionCallback = function () { that._completeJump(); };
                            this._pageManager.startAnimatedJump(index, cancelAnimationCallback, completionCallback).
                            then(function (elements) {
                                if (elements) {
                                    that._animationsStarted();
                                    var currElement = elements.oldPage.pageRoot;
                                    var newCurrElement = elements.newPage.pageRoot;
                                    that._contentDiv.appendChild(currElement);
                                    that._contentDiv.appendChild(newCurrElement);

                                    that._completeJumpPending = true;
                                    jumpAnimation(currElement, newCurrElement).
                                        then(function () {
                                            if (that._completeJumpPending) {
                                                completionCallback();
                                                _WriteProfilerMark("WinJS.UI.FlipView:set_currentPage.animationComplete,info");
                                            }
                                        }).done(clearJumpToIndex, clearJumpToIndex);
                                } else {
                                    clearJumpToIndex();
                                }
                            }, clearJumpToIndex);
                        }
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.FlipView.orientation" helpKeyword="WinJS.UI.FlipView.orientation">
                /// Gets or sets the layout orientation of the FlipView, horizontal or vertical.
                /// </field>
                orientation: {
                    get: function () {
                        return this._axisAsString();
                    },
                    set: function (orientation) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_orientation,info");
                        var isHorizontal = orientation === "horizontal";
                        if (isHorizontal !== this._isHorizontal) {
                            this._isHorizontal = isHorizontal;
                            this._setupOrientation();
                            this._pageManager.setOrientation(this._isHorizontal);
                        }
                    }
                },

                /// <field type="object" locid="WinJS.UI.FlipView.itemDataSource" helpKeyword="WinJS.UI.FlipView.itemDataSource">
                /// Gets or sets the data source that provides the FlipView with items to display.
                /// The FlipView displays one item at a time, each on its own page.
                /// </field>
                itemDataSource: {
                    get: function () {
                        return this._dataSource;
                    },

                    set: function (dataSource) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_itemDataSource,info");
                        this._dataSourceAfterRefresh = dataSource || new BindingList.List().dataSource;
                        this._refresh();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.FlipView.itemTemplate" helpKeyword="WinJS.UI.FlipView.itemTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets a WinJS.Binding.Template or a function that defines the HTML for each item's page.
                /// </field>
                itemTemplate: {
                    get: function () {
                        return this._itemRenderer;
                    },

                    set: function (itemTemplate) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_itemTemplate,info");
                        this._itemRendererAfterRefresh = this._getItemRenderer(itemTemplate);
                        this._refresh();
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.FlipView.itemSpacing" helpKeyword="WinJS.UI.FlipView.itemSpacing">
                /// Gets or sets the spacing between items, in pixels.
                /// </field>
                itemSpacing: {
                    get: function () {
                        return this._pageManager.getItemSpacing();
                    },

                    set: function (spacing) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_itemSpacing,info");
                        spacing = spacing >> 0;
                        spacing = spacing < 0 ? 0 : spacing;
                        this._pageManager.setItemSpacing(spacing);
                    }
                },

                count: function FlipView_count() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.count">
                    /// <summary locid="WinJS.UI.FlipView.count">
                    /// Returns the number of items in the FlipView object's itemDataSource.
                    /// </summary>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.FlipView.count_returnValue">
                    /// A Promise that contains the number of items in the list
                    /// or WinJS.UI.CountResult.unknown if the count is unavailable.
                    /// </returns>
                    /// </signature>

                    _WriteProfilerMark("WinJS.UI.FlipView:count,info");
                    var that = this;
                    return new Promise(function (complete, error) {
                        if (that._itemsManager) {
                            if (that._pageManager._cachedSize === _UI.CountResult.unknown || that._pageManager._cachedSize >= 0) {
                                complete(that._pageManager._cachedSize);
                            } else {
                                that._dataSource.getCount().then(function (count) {
                                    that._pageManager._cachedSize = count;
                                    complete(count);
                                });
                            }
                        } else {
                            error(FlipView.noitemsManagerForCount);
                        }
                    });
                },

                setCustomAnimations: function FlipView_setCustomAnimations(animations) {
                    /// <signature helpKeyword="WinJS.UI.FlipView.setCustomAnimations">
                    /// <summary locid="WinJS.UI.FlipView.setCustomAnimations">
                    /// Sets custom animations for the FlipView to use when navigating between pages.
                    /// </summary>
                    /// <param name="animations" type="Object" locid="WinJS.UI.FlipView.setCustomAnimations_p:animations">
                    /// An object containing up to three fields, one for each navigation action: next, previous, and jump
                    /// Each of those fields must be a function with this signature: function (outgoingPage, incomingPage).
                    /// This function returns a WinJS.Promise object that completes once the animations are finished.
                    /// If a field is null or undefined, the FlipView reverts to its default animation for that action.
                    /// </param>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:setCustomAnimations,info");

                    if (animations.next !== undefined) {
                        this._nextAnimation = animations.next;
                    }
                    if (animations.previous !== undefined) {
                        this._prevAnimation = animations.previous;
                    }
                    if (animations.jump !== undefined) {
                        this._jumpAnimation = animations.jump;
                    }
                },

                forceLayout: function FlipView_forceLayout() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.forceLayout">
                    /// <summary locid="WinJS.UI.FlipView.forceLayout">
                    /// Forces the FlipView to update its layout.
                    /// Use this function when making the FlipView visible again after its style.display property had been set to "none".
                    /// </summary>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:forceLayout,info");

                    this._pageManager.resized();
                },

                // Private members

                _initializeFlipView: function FlipView_initializeFlipView(element, isHorizontal, dataSource, itemRenderer, initialIndex, itemSpacing) {
                    var that = this;
                    var flipViewInitialized = false;
                    this._flipviewDiv = element;
                    _ElementUtilities.addClass(this._flipviewDiv, flipViewClass);
                    this._contentDiv = _Global.document.createElement("div");
                    this._panningDivContainer = _Global.document.createElement("div");
                    this._panningDivContainer.className = "win-surface";
                    this._panningDiv = _Global.document.createElement("div");
                    this._prevButton = _Global.document.createElement("button");
                    this._nextButton = _Global.document.createElement("button");
                    this._isHorizontal = isHorizontal;
                    this._dataSource = dataSource;
                    this._itemRenderer = itemRenderer;
                    this._itemsManager = null;
                    this._pageManager = null;

                    var stylesRequiredForFullFeatureMode = [
                        "scroll-limit-x-max",
                        "scroll-limit-x-min",
                        "scroll-limit-y-max",
                        "scroll-limit-y-min",
                        "scroll-snap-type",
                        "scroll-snap-x",
                        "scroll-snap-y",
                        "overflow-style",
                    ];

                    var allFeaturesSupported = true,
                        styleEquivalents = _BaseUtils._browserStyleEquivalents;
                    for (var i = 0, len = stylesRequiredForFullFeatureMode.length; i < len; i++) {
                        allFeaturesSupported = allFeaturesSupported && !!(styleEquivalents[stylesRequiredForFullFeatureMode[i]]);
                    }
                    allFeaturesSupported = allFeaturesSupported && !!_BaseUtils._browserEventEquivalents["manipulationStateChanged"];
                    allFeaturesSupported = allFeaturesSupported && _ElementUtilities._supportsSnapPoints;
                    this._environmentSupportsTouch = allFeaturesSupported;

                    var accName = this._flipviewDiv.getAttribute("aria-label");
                    if (!accName) {
                        this._flipviewDiv.setAttribute("aria-label", "");
                    }

                    this._flipviewDiv.setAttribute("role", "listbox");
                    if (!this._flipviewDiv.style.overflow) {
                        this._flipviewDiv.style.overflow = "hidden";
                    }
                    this._contentDiv.style.position = "relative";
                    this._contentDiv.style.zIndex = 0;
                    this._contentDiv.style.width = "100%";
                    this._contentDiv.style.height = "100%";
                    this._panningDiv.style.position = "relative";
                    this._panningDivContainer.style.position = "relative";
                    this._panningDivContainer.style.width = "100%";
                    this._panningDivContainer.style.height = "100%";
                    this._panningDivContainer.setAttribute("role", "group");
                    this._panningDivContainer.setAttribute("aria-label", strings.panningContainerAriaLabel);

                    this._contentDiv.appendChild(this._panningDivContainer);
                    this._flipviewDiv.appendChild(this._contentDiv);

                    this._panningDiv.style.width = "100%";
                    this._panningDiv.style.height = "100%";
                    this._setupOrientation();
                    function setUpButton(button) {
                        button.setAttribute("aria-hidden", true);
                        button.style.visibility = "hidden";
                        button.style.opacity = 0.0;
                        button.tabIndex = -1;
                        button.style.zIndex = 1000;
                    }
                    setUpButton(this._prevButton);
                    setUpButton(this._nextButton);
                    this._prevButton.setAttribute("aria-label", previousButtonLabel);
                    this._nextButton.setAttribute("aria-label", nextButtonLabel);
                    this._prevButton.setAttribute("type", "button");
                    this._nextButton.setAttribute("type", "button");
                    this._panningDivContainer.appendChild(this._panningDiv);
                    this._contentDiv.appendChild(this._prevButton);
                    this._contentDiv.appendChild(this._nextButton);

                    this._itemsManagerCallback = {
                        // Callbacks for itemsManager
                        inserted: function FlipView_inserted(itemPromise, previousHandle, nextHandle) {
                            that._itemsManager._itemFromPromise(itemPromise).then(function (element) {
                                var previous = that._itemsManager._elementFromHandle(previousHandle);
                                var next = that._itemsManager._elementFromHandle(nextHandle);
                                that._pageManager.inserted(element, previous, next, true);
                            });
                        },

                        countChanged: function FlipView_countChanged(newCount, oldCount) {
                            that._pageManager._cachedSize = newCount;

                            // Don't fire the datasourcecountchanged event when there is a state transition
                            if (oldCount !== _UI.CountResult.unknown) {
                                that._fireDatasourceCountChangedEvent();
                            }
                        },

                        changed: function FlipView_changed(newElement, oldElement) {
                            that._pageManager.changed(newElement, oldElement);
                        },

                        moved: function FlipView_moved(element, prev, next, itemPromise) {
                            var elementReady = function (element) {
                                that._pageManager.moved(element, prev, next);
                            };

                            // If we haven't instantiated this item yet, do so now
                            if (!element) {
                                that._itemsManager._itemFromPromise(itemPromise).then(elementReady);
                            } else {
                                elementReady(element);
                            }

                        },

                        removed: function FlipView_removed(element, mirage) {
                            if (element) {
                                that._pageManager.removed(element, mirage, true);
                            }
                        },

                        knownUpdatesComplete: function FlipView_knownUpdatesComplete() {
                        },

                        beginNotifications: function FlipView_beginNotifications() {
                            that._cancelAnimation();
                            that._pageManager.notificationsStarted();
                        },

                        endNotifications: function FlipView_endNotifications() {
                            that._pageManager.notificationsEnded();
                        },

                        itemAvailable: function FlipView_itemAvailable(real, placeholder) {
                            that._pageManager.itemRetrieved(real, placeholder);
                        },

                        reload: function FlipView_reload() {
                            that._pageManager.reload();
                        }
                    };

                    if (this._dataSource) {
                        this._itemsManager = _ItemsManager._createItemsManager(this._dataSource, this._itemRenderer, this._itemsManagerCallback, {
                            ownerElement: this._flipviewDiv
                        });
                    }

                    this._pageManager = new _PageManager._FlipPageManager(this._flipviewDiv, this._panningDiv, this._panningDivContainer, this._itemsManager, itemSpacing, this._environmentSupportsTouch,
                    {
                        hidePreviousButton: function () {
                            that._hasPrevContent = false;
                            that._fadeOutButton("prev");
                            that._prevButton.setAttribute("aria-hidden", true);
                        },

                        showPreviousButton: function () {
                            that._hasPrevContent = true;
                            that._fadeInButton("prev");
                            that._prevButton.setAttribute("aria-hidden", false);
                        },

                        hideNextButton: function () {
                            that._hasNextContent = false;
                            that._fadeOutButton("next");
                            that._nextButton.setAttribute("aria-hidden", true);
                        },

                        showNextButton: function () {
                            that._hasNextContent = true;
                            that._fadeInButton("next");
                            that._nextButton.setAttribute("aria-hidden", false);
                        }
                    });

                    this._pageManager.initialize(initialIndex, this._isHorizontal);

                    this._dataSource.getCount().then(function (count) {
                        that._pageManager._cachedSize = count;
                    });

                    this._prevButton.addEventListener("click", function () {
                        that.previous();
                    }, false);

                    this._nextButton.addEventListener("click", function () {
                        that.next();
                    }, false);

                    new _ElementUtilities._MutationObserver(flipViewPropertyChanged).observe(this._flipviewDiv, { attributes: true, attributeFilter: ["dir", "style"] });
                    this._cachedStyleDir = this._flipviewDiv.style.direction;

                    this._flipviewDiv.addEventListener("mselementresize", flipviewResized);
                    _ElementUtilities._resizeNotifier.subscribe(this._flipviewDiv, flipviewResized);

                    this._contentDiv.addEventListener("mouseleave", function () {
                        that._mouseInViewport = false;
                    }, false);

                    var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
                    function handleShowButtons(e) {
                        if (e.pointerType !== PT_TOUCH) {
                            that._touchInteraction = false;
                            if (e.screenX === that._lastMouseX && e.screenY === that._lastMouseY) {
                                return;
                            }
                            that._lastMouseX = e.screenX;
                            that._lastMouseY = e.screenY;
                            that._mouseInViewport = true;
                            that._fadeInButton("prev");
                            that._fadeInButton("next");
                            that._fadeOutButtons();
                        }
                    }

                    function handlePointerDown(e) {
                        if (e.pointerType === PT_TOUCH) {
                            that._mouseInViewport = false;
                            that._touchInteraction = true;
                            that._fadeOutButtons(true);
                        } else {
                            that._touchInteraction = false;
                            if (!that._isInteractive(e.target)) {
                                // Disable the default behavior of the mouse wheel button to avoid auto-scroll
                                if ((e.buttons & 4) !== 0) {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }
                            }
                        }
                    }

                    function handlePointerUp(e) {
                        if (e.pointerType !== PT_TOUCH) {
                            that._touchInteraction = false;
                        }
                    }

                    if (this._environmentSupportsTouch) {
                        _ElementUtilities._addEventListener(this._contentDiv, "pointerdown", handlePointerDown, false);
                        _ElementUtilities._addEventListener(this._contentDiv, "pointermove", handleShowButtons, false);
                        _ElementUtilities._addEventListener(this._contentDiv, "pointerup", handlePointerUp, false);
                    }

                    this._panningDivContainer.addEventListener("scroll", function () {
                        that._scrollPosChanged();
                    }, false);

                    this._panningDiv.addEventListener("blur", function () {
                        if (!that._touchInteraction) {
                            that._fadeOutButtons();
                        }
                    }, true);

                    // Scroll position isn't maintained when an element is added/removed from
                    // the DOM so every time we are placed back in, let the PageManager
                    // fix the scroll position.
                    var initiallyParented = _Global.document.body.contains(this._flipviewDiv);
                    _ElementUtilities._addInsertedNotifier(this._flipviewDiv);
                    this._flipviewDiv.addEventListener("WinJSNodeInserted", function (event) {
                        // WinJSNodeInserted fires even if the element is already in the DOM
                        if (initiallyParented) {
                            initiallyParented = false;
                            return;
                        }
                        that._pageManager.resized();
                    }, false);

                    this._flipviewDiv.addEventListener("keydown", function (event) {
                        var cancelBubbleIfHandled = true;
                        if (!that._isInteractive(event.target)) {
                            var Key = _ElementUtilities.Key,
                                handled = false;
                            if (that._isHorizontal) {
                                switch (event.keyCode) {
                                    case Key.leftArrow:
                                        (that._rtl ? that.next() : that.previous());
                                        handled = true;
                                        break;

                                    case Key.pageUp:
                                        that.previous();
                                        handled = true;
                                        break;

                                    case Key.rightArrow:
                                        (that._rtl ? that.previous() : that.next());
                                        handled = true;
                                        break;

                                    case Key.pageDown:
                                        that.next();
                                        handled = true;
                                        break;

                                        // Prevent scrolling pixel by pixel, but let the event bubble up
                                    case Key.upArrow:
                                    case Key.downArrow:
                                        handled = true;
                                        cancelBubbleIfHandled = false;
                                        break;
                                }
                            } else {
                                switch (event.keyCode) {
                                    case Key.upArrow:
                                    case Key.pageUp:
                                        that.previous();
                                        handled = true;
                                        break;

                                    case Key.downArrow:
                                    case Key.pageDown:
                                        that.next();
                                        handled = true;
                                        break;

                                    case Key.space:
                                        handled = true;
                                        break;
                                }
                            }

                            switch (event.keyCode) {
                                case Key.home:
                                    that.currentPage = 0;
                                    handled = true;
                                    break;

                                case Key.end:
                                    if (that._pageManager._cachedSize > 0) {
                                        that.currentPage = that._pageManager._cachedSize - 1;
                                    }
                                    handled = true;
                                    break;
                            }

                            if (handled) {
                                event.preventDefault();
                                if (cancelBubbleIfHandled) {
                                    event.stopPropagation();
                                }
                                return true;
                            }
                        }
                    }, false);

                    flipViewInitialized = true;
                },

                _windowWheelHandler: function FlipView_windowWheelHandler(ev) {
                    // When you are using the mouse wheel to scroll a horizontal area such as a WinJS.UI.Hub and one of the sections
                    // has a WinJS.UI.FlipView you may get stuck on that item. This logic is to allow a scroll event to skip the flipview's
                    // overflow scroll div and instead go to the parent scroller. We only skip the scroll wheel event for a fixed amount of time
                    ev = ev.detail.originalEvent;
                    var wheelWithinFlipper = ev.target && (this._flipviewDiv.contains(ev.target) || this._flipviewDiv === ev.target);
                    var that = this;
                    var now = _BaseUtils._now();
                    var withinAvoidTime = this._avoidTrappingTime > now;

                    if (!wheelWithinFlipper || withinAvoidTime) {
                        this._avoidTrappingTime = now + avoidTrapDelay;
                    }

                    if (wheelWithinFlipper && withinAvoidTime) {
                        this._panningDivContainer.style["overflowX"] = "hidden";
                        this._panningDivContainer.style["overflowY"] = "hidden";
                        _BaseUtils._yieldForDomModification(function () {
                            // Avoid being stuck between items
                            that._pageManager._ensureCentered();

                            if (that._isHorizontal) {
                                that._panningDivContainer.style["overflowX"] = (that._environmentSupportsTouch ? "scroll" : "hidden");
                                that._panningDivContainer.style["overflowY"] = "hidden";
                            } else {
                                that._panningDivContainer.style["overflowY"] = (that._environmentSupportsTouch ? "scroll" : "hidden");
                                that._panningDivContainer.style["overflowX"] = "hidden";
                            }
                        });
                    } else if (wheelWithinFlipper) {
                        this._pageManager.simulateMouseWheelScroll(ev);
                    }
                },

                _isInteractive: function FlipView_isInteractive(element) {
                    if (element.parentNode) {
                        var matches = element.parentNode.querySelectorAll(".win-interactive, .win-interactive *");
                        for (var i = 0, len = matches.length; i < len; i++) {
                            if (matches[i] === element) {
                                return true;
                            }
                        }
                    }
                    return false;
                },

                _refreshHandler: function FlipView_refreshHandler() {
                    var dataSource = this._dataSourceAfterRefresh || this._dataSource,
                        renderer = this._itemRendererAfterRefresh || this._itemRenderer,
                        initialIndex = this._indexAfterRefresh || 0;
                    this._setDatasource(dataSource, renderer, initialIndex);
                    this._dataSourceAfterRefresh = null;
                    this._itemRendererAfterRefresh = null;
                    this._indexAfterRefresh = 0;
                    this._refreshTimer = false;
                },

                _refresh: function FlipView_refresh() {
                    if (!this._refreshTimer) {
                        var that = this;
                        this._refreshTimer = true;
                        // Batch calls to _refresh
                        Scheduler.schedule(function FlipView_refreshHandler() {
                            if (that._refreshTimer && !that._disposed) {
                                that._refreshHandler();
                            }
                        }, Scheduler.Priority.high, null, "WinJS.UI.FlipView._refreshHandler");
                    }
                },

                _getItemRenderer: function FlipView_getItemRenderer(itemTemplate) {
                    var itemRenderer = null;
                    if (typeof itemTemplate === "function") {
                        var itemPromise = new Promise(function () { });
                        var itemTemplateResult = itemTemplate(itemPromise);
                        if (itemTemplateResult.element) {
                            if (typeof itemTemplateResult.element === "object" && typeof itemTemplateResult.element.then === "function") {
                                // This renderer returns a promise to an element
                                itemRenderer = function (itemPromise) {
                                    var elementRoot = _Global.document.createElement("div");
                                    elementRoot.className = "win-template";
                                    _Dispose.markDisposable(elementRoot);
                                    return {
                                        element: elementRoot,
                                        renderComplete: itemTemplate(itemPromise).element.then(function (element) {
                                            elementRoot.appendChild(element);
                                        })
                                    };
                                };
                            } else {
                                // This renderer already returns a placeholder
                                itemRenderer = itemTemplate;
                            }
                        } else {
                            // Return a renderer that has return a placeholder
                            itemRenderer = function (itemPromise) {
                                var elementRoot = _Global.document.createElement("div");
                                elementRoot.className = "win-template";
                                _Dispose.markDisposable(elementRoot);
                                // The pagecompleted event relies on this elementRoot
                                // to ensure that we are still looking at the same
                                // item after the render completes.
                                return {
                                    element: elementRoot,
                                    renderComplete: itemPromise.then(function () {
                                        return Promise.as(itemTemplate(itemPromise)).then(function (element) {
                                            elementRoot.appendChild(element);
                                        });
                                    })
                                };
                            };
                        }
                    } else if (typeof itemTemplate === "object") {
                        itemRenderer = itemTemplate.renderItem;
                    }
                    return itemRenderer;
                },

                _navigate: function FlipView_navigate(goForward, cancelAnimationCallback) {
                    if (_BaseUtils.validation && this._refreshTimer) {
                        throw new _ErrorFromName("WinJS.UI.FlipView.NavigationDuringStateChange", strings.navigationDuringStateChange);
                    }

                    if (!this._animating) {
                        this._animatingForward = goForward;
                    }
                    this._goForward = goForward;

                    if (this._animating && !this._cancelAnimation()) {
                        return false;
                    }
                    var that = this;
                    var customAnimation = (goForward ? this._nextAnimation : this._prevAnimation),
                        animation = (customAnimation ? customAnimation : this._defaultAnimation.bind(this)),
                        completionCallback = function (goForward) { that._completeNavigation(goForward); },
                        elements = this._pageManager.startAnimatedNavigation(goForward, cancelAnimationCallback, completionCallback);
                    if (elements) {
                        this._animationsStarted();
                        var outgoingElement = elements.outgoing.pageRoot,
                            incomingElement = elements.incoming.pageRoot;
                        this._contentDiv.appendChild(outgoingElement);
                        this._contentDiv.appendChild(incomingElement);

                        this._completeNavigationPending = true;
                        animation(outgoingElement, incomingElement).then(function () {
                            if (that._completeNavigationPending) {
                                completionCallback(that._goForward);
                            }
                        }).done();
                        return true;
                    } else {
                        return false;
                    }
                },

                _cancelDefaultAnimation: function FlipView_cancelDefaultAnimation(outgoingElement, incomingElement) {
                    // Cancel the fadeOut animation
                    outgoingElement.style.opacity = 0;

                    // Cancel the enterContent animation
                    incomingElement.style.animationName = "";
                    incomingElement.style.opacity = 1;
                },

                _cancelAnimation: function FlipView_cancelAnimation() {
                    if (this._pageManager._navigationAnimationRecord &&
                        this._pageManager._navigationAnimationRecord.completionCallback) {

                        var cancelCallback = this._pageManager._navigationAnimationRecord.cancelAnimationCallback;
                        if (cancelCallback) {
                            cancelCallback = cancelCallback.bind(this);
                        }

                        if (this._pageManager._navigationAnimationRecord && this._pageManager._navigationAnimationRecord.elementContainers) {
                            var outgoingPage = this._pageManager._navigationAnimationRecord.elementContainers[0],
                            incomingPage = this._pageManager._navigationAnimationRecord.elementContainers[1],
                            outgoingElement = outgoingPage.pageRoot,
                            incomingElement = incomingPage.pageRoot;

                            // Invoke the function that will cancel the animation
                            if (cancelCallback) {
                                cancelCallback(outgoingElement, incomingElement);
                            }

                            // Invoke the completion function after cancelling the animation
                            this._pageManager._navigationAnimationRecord.completionCallback(this._animatingForward);

                            return true;
                        }
                    }
                    return false;
                },

                _completeNavigation: function FlipView_completeNavigation(goForward) {
                    if (this._disposed) {
                        return;
                    }

                    this._pageManager._resizing = false;
                    if (this._pageManager._navigationAnimationRecord &&
                        this._pageManager._navigationAnimationRecord.elementContainers) {

                        var outgoingPage = this._pageManager._navigationAnimationRecord.elementContainers[0],
                            incomingPage = this._pageManager._navigationAnimationRecord.elementContainers[1],
                            outgoingElement = outgoingPage.pageRoot,
                            incomingElement = incomingPage.pageRoot;

                        if (outgoingElement.parentNode) {
                            outgoingElement.parentNode.removeChild(outgoingElement);
                        }
                        if (incomingElement.parentNode) {
                            incomingElement.parentNode.removeChild(incomingElement);
                        }
                        this._pageManager.endAnimatedNavigation(goForward, outgoingPage, incomingPage);
                        this._fadeOutButtons();
                        this._scrollPosChanged();
                        this._pageManager._ensureCentered(true);
                        this._animationsFinished();
                    }
                    this._completeNavigationPending = false;
                },

                _completeJump: function FlipView_completeJump() {
                    if (this._disposed) {
                        return;
                    }

                    this._pageManager._resizing = false;
                    if (this._pageManager._navigationAnimationRecord &&
                        this._pageManager._navigationAnimationRecord.elementContainers) {

                        var outgoingPage = this._pageManager._navigationAnimationRecord.elementContainers[0],
                            incomingPage = this._pageManager._navigationAnimationRecord.elementContainers[1],
                            outgoingElement = outgoingPage.pageRoot,
                            incomingElement = incomingPage.pageRoot;

                        if (outgoingElement.parentNode) {
                            outgoingElement.parentNode.removeChild(outgoingElement);
                        }
                        if (incomingElement.parentNode) {
                            incomingElement.parentNode.removeChild(incomingElement);
                        }

                        this._pageManager.endAnimatedJump(outgoingPage, incomingPage);
                        this._animationsFinished();
                    }
                    this._completeJumpPending = false;
                },

                _resize: function FlipView_resize() {
                    this._pageManager.resized();
                },

                _setCurrentIndex: function FlipView_setCurrentIndex(index) {
                    return this._pageManager.jumpToIndex(index);
                },

                _getCurrentIndex: function FlipView_getCurrentIndex() {
                    return this._pageManager.currentIndex();
                },

                _setDatasource: function FlipView_setDatasource(source, template, index) {
                    if (this._animating) {
                        this._cancelAnimation();
                    }

                    var initialIndex = 0;
                    if (index !== undefined) {
                        initialIndex = index;
                    }
                    this._dataSource = source;
                    this._itemRenderer = template;
                    var oldItemsManager = this._itemsManager;
                    this._itemsManager = _ItemsManager._createItemsManager(this._dataSource, this._itemRenderer, this._itemsManagerCallback, {
                        ownerElement: this._flipviewDiv
                    });
                    this._dataSource = this._itemsManager.dataSource;

                    var that = this;
                    this._dataSource.getCount().then(function (count) {
                        that._pageManager._cachedSize = count;
                    });
                    this._pageManager.setNewItemsManager(this._itemsManager, initialIndex);
                    oldItemsManager && oldItemsManager.release();
                },

                _fireDatasourceCountChangedEvent: function FlipView_fireDatasourceCountChangedEvent() {
                    var that = this;
                    Scheduler.schedule(function FlipView_dispatchDataSourceCountChangedEvent() {
                        var event = _Global.document.createEvent("Event");
                        event.initEvent(FlipView.datasourceCountChangedEvent, true, true);
                        _WriteProfilerMark("WinJS.UI.FlipView:dataSourceCountChangedEvent,info");
                        that._flipviewDiv.dispatchEvent(event);
                    }, Scheduler.Priority.normal, null, "WinJS.UI.FlipView._dispatchDataSourceCountChangedEvent");
                },

                _scrollPosChanged: function FlipView_scrollPosChanged() {
                    this._pageManager.scrollPosChanged();
                },

                _axisAsString: function FlipView_axisAsString() {
                    return (this._isHorizontal ? "horizontal" : "vertical");
                },

                _setupOrientation: function FlipView_setupOrientation() {
                    if (this._isHorizontal) {
                        this._panningDivContainer.style["overflowX"] = (this._environmentSupportsTouch ? "scroll" : "hidden");
                        this._panningDivContainer.style["overflowY"] = "hidden";
                        var rtl = _Global.getComputedStyle(this._flipviewDiv, null).direction === "rtl";
                        this._rtl = rtl;
                        if (rtl) {
                            this._prevButton.className = navButtonClass + " " + navButtonRightClass;
                            this._nextButton.className = navButtonClass + " " + navButtonLeftClass;
                        } else {
                            this._prevButton.className = navButtonClass + " " + navButtonLeftClass;
                            this._nextButton.className = navButtonClass + " " + navButtonRightClass;
                        }
                        this._prevButton.innerHTML = (rtl ? rightArrowGlyph : leftArrowGlyph);
                        this._nextButton.innerHTML = (rtl ? leftArrowGlyph : rightArrowGlyph);
                    } else {
                        this._panningDivContainer.style["overflowY"] = (this._environmentSupportsTouch ? "scroll" : "hidden");
                        this._panningDivContainer.style["overflowX"] = "hidden";
                        this._prevButton.className = navButtonClass + " " + navButtonTopClass;
                        this._nextButton.className = navButtonClass + " " + navButtonBottomClass;
                        this._prevButton.innerHTML = topArrowGlyph;
                        this._nextButton.innerHTML = bottomArrowGlyph;
                    }
                    this._panningDivContainer.style["msOverflowStyle"] = "none";
                },

                _fadeInButton: function FlipView_fadeInButton(button, forceShow) {
                    if (this._mouseInViewport || forceShow || !this._environmentSupportsTouch) {
                        if (button === "next" && this._hasNextContent) {
                            if (this._nextButtonAnimation) {
                                this._nextButtonAnimation.cancel();
                                this._nextButtonAnimation = null;
                            }

                            this._nextButton.style.visibility = "visible";
                            this._nextButtonAnimation = this._fadeInFromCurrentValue(this._nextButton);
                        } else if (button === "prev" && this._hasPrevContent) {
                            if (this._prevButtonAnimation) {
                                this._prevButtonAnimation.cancel();
                                this._prevButtonAnimation = null;
                            }

                            this._prevButton.style.visibility = "visible";
                            this._prevButtonAnimation = this._fadeInFromCurrentValue(this._prevButton);
                        }
                    }
                },

                _fadeOutButton: function FlipView_fadeOutButton(button) {
                    var that = this;
                    if (button === "next") {
                        if (this._nextButtonAnimation) {
                            this._nextButtonAnimation.cancel();
                            this._nextButtonAnimation = null;
                        }

                        this._nextButtonAnimation = Animations.fadeOut(this._nextButton).
                            then(function () {
                                that._nextButton.style.visibility = "hidden";
                            });
                        return this._nextButtonAnimation;
                    } else {
                        if (this._prevButtonAnimation) {
                            this._prevButtonAnimation.cancel();
                            this._prevButtonAnimation = null;
                        }

                        this._prevButtonAnimation = Animations.fadeOut(this._prevButton).
                            then(function () {
                                that._prevButton.style.visibility = "hidden";
                            });
                        return this._prevButtonAnimation;
                    }
                },

                _fadeOutButtons: function FlipView_fadeOutButtons(immediately) {
                    if (!this._environmentSupportsTouch) {
                        return;
                    }

                    if (this._buttonFadePromise) {
                        this._buttonFadePromise.cancel();
                        this._buttonFadePromise = null;
                    }

                    var that = this;
                    this._buttonFadePromise = (immediately ? Promise.wrap() : Promise.timeout(_TransitionAnimation._animationTimeAdjustment(buttonFadeDelay))).then(function () {
                        that._fadeOutButton("prev");
                        that._fadeOutButton("next");
                        that._buttonFadePromise = null;
                    });
                },

                _animationsStarted: function FlipView_animationsStarted() {
                    this._animating = true;
                },

                _animationsFinished: function FlipView_animationsFinished() {
                    this._animating = false;
                },

                _defaultAnimation: function FlipView_defaultAnimation(curr, next) {
                    var incomingPageMove = {};
                    next.style.left = "0px";
                    next.style.top = "0px";
                    next.style.opacity = 0.0;
                    var pageDirection = ((curr.itemIndex > next.itemIndex) ? -animationMoveDelta : animationMoveDelta);
                    incomingPageMove.left = (this._isHorizontal ? (this._rtl ? -pageDirection : pageDirection) : 0) + "px";
                    incomingPageMove.top = (this._isHorizontal ? 0 : pageDirection) + "px";
                    var fadeOutPromise = Animations.fadeOut(curr),
                        enterContentPromise = Animations.enterContent(next, [incomingPageMove], { mechanism: "transition" });
                    return Promise.join([fadeOutPromise, enterContentPromise]);
                },

                _fadeInFromCurrentValue: function FlipView_fadeInFromCurrentValue(shown) {
                    // Intentionally not using the PVL fadeIn animation because we don't want
                    // to start always from 0 in some cases
                    return _TransitionAnimation.executeTransition(
                        shown,
                        {
                            property: "opacity",
                            delay: 0,
                            duration: 167,
                            timing: "linear",
                            to: 1
                        });
                }
            }, _Constants);

            _Base.Class.mix(FlipView, _Events.createEventProperties(
                FlipView.datasourceCountChangedEvent,
                FlipView.pageVisibilityChangedEvent,
                FlipView.pageSelectedEvent,
                FlipView.pageCompletedEvent));
            _Base.Class.mix(FlipView, _Control.DOMEventMixin);

            return FlipView;
        })
    });

});