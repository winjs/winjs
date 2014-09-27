// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations/_TransitionAnimation',
    '../BindingList',
    '../Promise',
    '../Scheduler',
    '../_Signal',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_ItemsManager',
    '../Utilities/_SafeHtml',
    '../Utilities/_TabContainer',
    '../Utilities/_UI',
    '../Utilities/_VersionManager',
    './ItemContainer/_Constants',
    './ItemContainer/_ItemEventsHandler',
    './ListView/_BrowseMode',
    './ListView/_ErrorMessages',
    './ListView/_GroupFocusCache',
    './ListView/_GroupsContainer',
    './ListView/_Helpers',
    './ListView/_ItemsContainer',
    './ListView/_Layouts',
    './ListView/_SelectionManager',
    './ListView/_VirtualizeContentsView',
    'require-style!less/controls'
], function listViewImplInit(_Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, _TransitionAnimation, BindingList, Promise, Scheduler, _Signal, _Control, _Dispose, _ElementUtilities, _Hoverable, _ItemsManager, _SafeHtml, _TabContainer, _UI, _VersionManager, _Constants, _ItemEventsHandler, _BrowseMode, _ErrorMessages, _GroupFocusCache, _GroupsContainer, _Helpers, _ItemsContainer, _Layouts, _SelectionManager, _VirtualizeContentsView) {
    "use strict";

    var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
    var DISPOSE_TIMEOUT = 1000;
    var controlsToDispose = [];
    var disposeControlTimeout;
    var uniqueID = _ElementUtilities._uniqueID;

    function disposeControls() {
        var temp = controlsToDispose;
        controlsToDispose = [];
        temp = temp.filter(function (c) {
            if (c._isZombie()) {
                c._dispose();
                return false;
            } else {
                return true;
            }
        });
        controlsToDispose = controlsToDispose.concat(temp);
    }
    function scheduleForDispose(lv) {
        controlsToDispose.push(lv);
        disposeControlTimeout && disposeControlTimeout.cancel();
        disposeControlTimeout = Promise.timeout(DISPOSE_TIMEOUT).then(disposeControls);
    }

    function getOffsetRight(element) {
        return element.offsetParent ? (element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth) : 0;
    }

    var AnimationHelper = _Helpers._ListViewAnimationHelper;

    var strings = {
        get notCompatibleWithSemanticZoom() { return "ListView can only be used with SemanticZoom if randomAccess loading behavior is specified."; },
        get listViewInvalidItem() { return "Item must provide index, key or description of corresponding item."; },
        get listViewViewportAriaLabel() { return _Resources._getWinJSString("ui/listViewViewportAriaLabel").value; }
    };

    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    var ListViewAnimationType = {
        /// <field locid="WinJS.UI.ListView.ListViewAnimationType.entrance" helpKeyword="WinJS.UI.ListViewAnimationType.entrance">
        /// The animation plays when the ListView is first displayed.
        /// </field>
        entrance: "entrance",
        /// <field locid="WinJS.UI.ListView.ListViewAnimationType.contentTransition" helpKeyword="WinJS.UI.ListViewAnimationType.contentTransition">
        /// The animation plays when the ListView is changing its content.
        /// </field>
        contentTransition: "contentTransition"
    };

    // ListView implementation

    _Base.Namespace.define("WinJS.UI", {

        /// <field locid="WinJS.UI.ListView.ListViewAnimationType" helpKeyword="WinJS.UI.ListViewAnimationType">
        /// Specifies whether the ListView animation is an entrance animation or a transition animation.
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        ListViewAnimationType: ListViewAnimationType,

        /// <field>
        /// <summary locid="WinJS.UI.ListView">
        /// Displays items in a customizable list or grid.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.listview.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.listview.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.ListView"></div>]]></htmlSnippet>
        /// <event name="contentanimating" bubbles="true" locid="WinJS.UI.ListView_e:contentanimating">Raised when the ListView is about to play an entrance or a transition animation.</event>
        /// <event name="iteminvoked" bubbles="true" locid="WinJS.UI.ListView_e:iteminvoked">Raised when the user taps or clicks an item.</event>
        /// <event name="groupheaderinvoked" bubbles="true" locid="WinJS.UI.ListView_e:groupheaderinvoked">Raised when the user taps or clicks a group header.</event>
        /// <event name="selectionchanging" bubbles="true" locid="WinJS.UI.ListView_e:selectionchanging">Raised before items are selected or deselected.</event>
        /// <event name="selectionchanged" bubbles="true" locid="WinJS.UI.ListView_e:selectionchanged">Raised after items are selected or deselected.</event>
        /// <event name="loadingstatechanged" bubbles="true" locid="WinJS.UI.ListView_e:loadingstatechanged">Raised when the loading state changes.</event>
        /// <event name="keyboardnavigating" bubbles="true" locid="WinJS.UI.ListView_e:keyboardnavigating">Raised when the focused item changes.</event>
        /// <event name="itemdragstart" bubbles="true" locid="WinJS.UI.ListView_e:itemdragstart">Raised when the the user begins dragging ListView items.</event>
        /// <event name="itemdragenter" bubbles="true" locid="WinJS.UI.ListView_e:itemdragenter">Raised when the user drags into the ListView.</event>
        /// <event name="itemdragend" bubbles="true" locid="WinJS.UI.ListView_e:itemdragend">Raised when a drag operation begun in a ListView ends.</event>
        /// <event name="itemdragbetween" bubbles="true" locid="WinJS.UI.ListView_e:itemdragbetween">Raised when the user drags between two ListView items.</event>
        /// <event name="itemdragleave" bubbles="true" locid="WinJS.UI.ListView_e:itemdragleave">Raised when the user drags outside of the ListView region.</event>
        /// <event name="itemdragchanged" bubbles="true" locid="WinJS.UI.ListView_e:itemdragchanged">Raised when the items being dragged are changed due to a datasource modification.</event>
        /// <event name="itemdragdrop" bubbles="true" locid="WinJS.UI.ListView_e:itemdragdrop">Raised when the user drops items into the ListView.</event>
        /// <event name="accessibilityannotationcomplete" bubbles="true" locid="WinJS.UI.ListView_e:accessibilityannotationcomplete">Raised when the accessibility attributes have been added to the ListView items.</event>
        /// <part name="listView" class="win-listview" locid="WinJS.UI.ListView_part:listView">The entire ListView control.</part>
        /// <part name="viewport" class="win-viewport" locid="WinJS.UI.ListView_part:viewport">The viewport of the ListView. </part>
        /// <part name="surface" class="win-surface" locid="WinJS.UI.ListView_part:surface">The scrollable region of the ListView.</part>
        /// <part name="item" class="win-item" locid="WinJS.UI.ListView_part:item">An item in the ListView.</part>
        /// <part name="selectionbackground" class="win-selectionbackground" locid="WinJS.UI.ListView_part:selectionbackground">The background of a selection checkmark.</part>
        /// <part name="selectioncheckmark" class="win-selectioncheckmark" locid="WinJS.UI.ListView_part:selectioncheckmark">A selection checkmark.</part>
        /// <part name="groupHeader" class="win-groupheader" locid="WinJS.UI.ListView_part:groupHeader">The header of a group.</part>
        /// <part name="progressbar" class="win-progress" locid="WinJS.UI.ListView_part:progressbar">The progress indicator of the ListView.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ListView: _Base.Namespace._lazy(function () {
            var AffectedRange = _Base.Class.define(function () {
                this.clear();
            }, {
                // Marks the union of the current affected range and range as requiring layout
                add: function (range, itemsCount) {
                    range._lastKnownSizeOfData = itemsCount; // store this in order to make unions.
                    if (!this._range) {
                        this._range = range;
                    } else {
                        // Take the union of these two ranges.
                        this._range.start = Math.min(this._range.start, range.start);
                        // To accurately calculate the new unioned range 'end' value, we need to convert the current and new range end
                        // positions into values that represent the remaining number of un-modified items in between the end of the range
                        // and the end of the list of data.
                        var previousUnmodifiedItemsFromEnd = (this._range._lastKnownSizeOfData - this._range.end);
                        var newUnmodifiedItemsFromEnd = (range._lastKnownSizeOfData - range.end);
                        var finalUnmodifiedItemsFromEnd = Math.min(previousUnmodifiedItemsFromEnd, newUnmodifiedItemsFromEnd);
                        this._range._lastKnownSizeOfData = range._lastKnownSizeOfData;
                        // Convert representation of the unioned end position back into a value which matches the above definition of _affecteRange.end
                        this._range.end = this._range._lastKnownSizeOfData - finalUnmodifiedItemsFromEnd;
                    }
                },

                // Marks everything as requiring layout
                addAll: function () {
                    this.add({ start: 0, end: Number.MAX_VALUE }, Number.MAX_VALUE);
                },

                // Marks nothing as requiring layout
                clear: function () {
                    this._range = null;
                },

                get: function () {
                    return this._range;
                }
            });

            var ZoomableView = _Base.Class.define(function ZoomableView_ctor(listView) {
                // Constructor

                this._listView = listView;
            }, {
                // Public methods

                getPanAxis: function () {
                    return this._listView._getPanAxis();
                },

                configureForZoom: function (isZoomedOut, isCurrentView, triggerZoom, prefetchedPages) {
                    this._listView._configureForZoom(isZoomedOut, isCurrentView, triggerZoom, prefetchedPages);
                },

                setCurrentItem: function (x, y) {
                    this._listView._setCurrentItem(x, y);
                },

                getCurrentItem: function () {
                    return this._listView._getCurrentItem();
                },

                beginZoom: function () {
                    return this._listView._beginZoom();
                },

                positionItem: function (item, position) {
                    return this._listView._positionItem(item, position);
                },

                endZoom: function (isCurrentView) {
                    this._listView._endZoom(isCurrentView);
                },

                pinching: {
                    get: function () {
                        return this._listView._pinching;
                    },
                    set: function (value) {
                        this._listView._pinching = value;
                    }
                }
            });

            var ListView = _Base.Class.define(function ListView_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.ListView.ListView">
                /// <summary locid="WinJS.UI.ListView.constructor">
                /// Creates a new ListView.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.ListView.constructor_p:element">
                /// The DOM element that hosts the ListView control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.ListView.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the selectionchanged event,
                /// add a property named "onselectionchanged" to the options object and set its value to the event handler.
                /// </param>
                /// <returns type="WinJS.UI.ListView" locid="WinJS.UI.ListView.constructor_returnValue">
                /// The new ListView.
                /// </returns>
                /// </signature>
                element = element || _Global.document.createElement("div");
                if (_ElementUtilities._supportsTouchActionCrossSlide) {
                    element.classList.add(_Constants._listViewSupportsCrossSlideClass);
                }

                this._id = element.id || "";
                this._writeProfilerMark("constructor,StartTM");

                options = options || {};

                // Attaching JS control to DOM element
                element.winControl = this;
                _ElementUtilities.addClass(element, "win-disposable");
                this._affectedRange = new AffectedRange();
                this._mutationObserver = new _ElementUtilities._MutationObserver(this._itemPropertyChange.bind(this));
                this._versionManager = null;
                this._insertedItems = {};
                this._element = element;
                this._startProperty = null;
                this._scrollProperty = null;
                this._scrollLength = null;
                this._scrolling = false;
                this._zooming = false;
                this._pinching = false;
                this._itemsManager = null;
                this._canvas = null;
                this._cachedCount = _Constants._UNINITIALIZED;
                this._loadingState = this._LoadingState.complete;
                this._firstTimeDisplayed = true;
                this._currentScrollPosition = 0;
                this._lastScrollPosition = 0;
                this._notificationHandlers = [];
                this._itemsBlockExtent = -1;
                this._viewportWidth = _Constants._UNINITIALIZED;
                this._viewportHeight = _Constants._UNINITIALIZED;
                this._manipulationState = _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED;
                this._maxDeferredItemCleanup = Number.MAX_VALUE;
                this._groupsToRemove = {};
                this._setupInternalTree();
                this._isCurrentZoomView = true;
                this._dragSource = false;
                this._reorderable = false;
                this._groupFocusCache = new _GroupFocusCache._UnsupportedGroupFocusCache();
                this._viewChange = _Constants._ViewChange.rebuild;
                this._scrollToFunctor = null;
                this._setScrollbarPosition = false;
                // The view needs to be initialized after the internal tree is setup, because the view uses the canvas node immediately to insert an element in its constructor
                this._view = new _VirtualizeContentsView._VirtualizeContentsView(this);
                this._selection = new _SelectionManager._SelectionManager(this);
                this._createTemplates();
                this._groupHeaderRenderer = _ItemsManager._trivialHtmlRenderer;
                this._itemRenderer = _ItemsManager._trivialHtmlRenderer;
                this._groupHeaderRelease = null;
                this._itemRelease = null;
                if (!options.itemDataSource) {
                    var list = new BindingList.List();
                    this._dataSource = list.dataSource;
                } else {
                    this._dataSource = options.itemDataSource;
                }
                this._selectionMode = _UI.SelectionMode.multi;
                this._tap = _UI.TapBehavior.invokeOnly;
                this._groupHeaderTap = _UI.GroupHeaderTapBehavior.invoke;
                this._swipeBehavior = _UI.SwipeBehavior.select;
                this._mode = new _BrowseMode._SelectionMode(this);

                // Call after swipeBehavior and modes are set
                this._setSwipeClass();

                this._groups = new _GroupsContainer._NoGroups(this);
                this._updateItemsAriaRoles();
                this._updateGroupHeadersAriaRoles();
                this._element.setAttribute("aria-multiselectable", this._multiSelection());
                this._element.tabIndex = -1;
                this._tabManager.tabIndex = this._tabIndex;
                if (this._element.style.position !== "absolute" && this._element.style.position !== "relative") {
                    this._element.style.position = "relative";
                }
                this._updateItemsManager();
                if (!options.layout) {
                    this._updateLayout(new _Layouts.GridLayout());
                }
                this._attachEvents();

                this._runningInit = true;
                _Control.setOptions(this, options);
                this._runningInit = false;

                this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0);
                this._writeProfilerMark("constructor,StopTM");
            }, {
                // Public properties

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ListView.element" helpKeyword="WinJS.UI.ListView.element">
                /// Gets the DOM element that hosts the ListView.
                /// </field>
                element: {
                    get: function () { return this._element; }
                },

                /// <field type="WinJS.UI.Layout" locid="WinJS.UI.ListView.layout" helpKeyword="WinJS.UI.ListView.layout">
                /// Gets or sets an object that controls the layout of the ListView.
                /// </field>
                layout: {
                    get: function () {
                        return this._layoutImpl;
                    },
                    set: function (layoutObject) {
                        this._updateLayout(layoutObject);

                        if (!this._runningInit) {
                            this._view.reset();
                            this._updateItemsManager();
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.pagesToLoad" helpKeyword="WinJS.UI.ListView.pagesToLoad" isAdvanced="true">
                /// Gets or sets the number of pages to load when the user scrolls beyond the
                /// threshold specified by the pagesToLoadThreshold property if
                /// the loadingBehavior property is set to incremental.
                /// <deprecated type="deprecate">
                /// pagesToLoad is deprecated. The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                pagesToLoad: {
                    get: function () {
                        return (_VirtualizeContentsView._VirtualizeContentsView._pagesToPrefetch * 2) + 1;
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.pagesToLoadIsDeprecated);
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.pagesToLoadThreshold" helpKeyword="WinJS.UI.ListView.pagesToLoadThreshold" isAdvanced="true">
                /// Gets or sets the threshold (in pages) for initiating an incremental load. When the last visible item is
                /// within the specified number of pages from the end of the loaded portion of the list,
                /// and if automaticallyLoadPages is true and loadingBehavior is set to "incremental",
                /// the ListView initiates an incremental load.
                /// <deprecated type="deprecate">
                /// pagesToLoadThreshold is deprecated.  The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                pagesToLoadThreshold: {
                    get: function () {
                        return 0;
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.pagesToLoadThresholdIsDeprecated);
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.groupDataSource" helpKeyword="WinJS.UI.ListView.groupDataSource">
                /// Gets or sets the data source that contains the groups for the items in the itemDataSource.
                /// </field>
                groupDataSource: {
                    get: function () {
                        return this._groupDataSource;
                    },
                    set: function (newValue) {
                        this._writeProfilerMark("set_groupDataSource,info");

                        var that = this;

                        function groupStatusChanged(eventObject) {
                            if (eventObject.detail === _UI.DataSourceStatus.failure) {
                                that.itemDataSource = null;
                                that.groupDataSource = null;
                            }
                        }

                        if (this._groupDataSource && this._groupDataSource.removeEventListener) {
                            this._groupDataSource.removeEventListener("statuschanged", groupStatusChanged, false);
                        }

                        this._groupDataSource = newValue;
                        this._groupFocusCache = (newValue && this._supportsGroupHeaderKeyboarding) ? new _GroupFocusCache._GroupFocusCache(this) : new _GroupFocusCache._UnsupportedGroupFocusCache();

                        if (this._groupDataSource && this._groupDataSource.addEventListener) {
                            this._groupDataSource.addEventListener("statuschanged", groupStatusChanged, false);
                        }

                        this._createGroupsContainer();

                        if (!this._runningInit) {
                            this._view.reset();
                            this._pendingLayoutReset = true;
                            this._pendingGroupWork = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        } else {
                            this._updateGroupWork();
                            this._resetLayout();
                        }
                    }
                },

                _updateGroupWork: function () {
                    this._pendingGroupWork = false;

                    if (this._groupDataSource) {
                        _ElementUtilities.addClass(this._element, _Constants._groupsClass);
                    } else {
                        _ElementUtilities.removeClass(this._element, _Constants._groupsClass);
                    }
                    this._resetLayout();
                },

                /// <field type="Boolean" locid="WinJS.UI.ListView.automaticallyLoadPages" helpKeyword="WinJS.UI.ListView.automaticallyLoadPages">
                /// Gets or sets a value that indicates whether the next set of pages is automatically loaded
                /// when the user scrolls beyond the number of pages specified by the
                /// pagesToLoadThreshold property.
                /// <deprecated type="deprecate">
                /// automaticallyLoadPages is deprecated. The control will default this property to false. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                automaticallyLoadPages: {
                    get: function () {
                        return false;
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.automaticallyLoadPagesIsDeprecated);
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.ListView.LoadingBehavior" locid="WinJS.UI.ListView.loadingBehavior" helpKeyword="WinJS.UI.ListView.loadingBehavior">
                /// Gets or sets a value that determines how many data items are loaded into the DOM.
                /// <deprecated type="deprecate">
                /// pagesToLoadThreshold is deprecated. The control will default this property to 'randomAccess'. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                loadingBehavior: {
                    get: function () {
                        return "randomAccess";
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.loadingBehaviorIsDeprecated);
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.ListView.SelectionMode" locid="WinJS.UI.ListView.selectionMode" helpKeyword="WinJS.UI.ListView.selectionMode">
                /// Gets or sets a value that specifies how many ListView items the user can select: "none", "single", or "multi".
                /// </field>
                selectionMode: {
                    get: function () {
                        return this._selectionMode;
                    },
                    set: function (newMode) {
                        if (typeof newMode === "string") {
                            if (newMode.match(/^(none|single|multi)$/)) {
                                if (_BaseUtils.isPhone && newMode === _UI.SelectionMode.single) {
                                    return;
                                }
                                this._selectionMode = newMode;
                                this._element.setAttribute("aria-multiselectable", this._multiSelection());
                                this._updateItemsAriaRoles();
                                this._setSwipeClass();
                                this._configureSelectionMode();
                                return;
                            }
                        }
                        throw new _ErrorFromName("WinJS.UI.ListView.ModeIsInvalid", _ErrorMessages.modeIsInvalid);
                    }
                },

                /// <field type="String" oamOptionsDatatype="_UI.TapBehavior" locid="WinJS.UI.ListView.tapBehavior" helpKeyword="WinJS.UI.ListView.tapBehavior">
                /// Gets or sets how the ListView reacts when the user taps or clicks an item.
                /// The tap or click can invoke the item, select it and invoke it, or have no
                /// effect.
                /// </field>
                tapBehavior: {
                    get: function () {
                        return this._tap;
                    },
                    set: function (tap) {
                        if (_BaseUtils.isPhone && tap === _UI.TapBehavior.directSelect) {
                            return;
                        }
                        this._tap = tap;
                        this._updateItemsAriaRoles();
                        this._configureSelectionMode();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.GroupHeaderTapBehavior" locid="WinJS.UI.ListView.groupHeaderTapBehavior" helpKeyword="WinJS.UI.ListView.groupHeaderTapBehavior">
                /// Gets or sets how the ListView reacts when the user taps or clicks a group header.
                /// </field>
                groupHeaderTapBehavior: {
                    get: function () {
                        return this._groupHeaderTap;
                    },
                    set: function (tap) {
                        this._groupHeaderTap = tap;
                        this._updateGroupHeadersAriaRoles();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.SwipeBehavior" locid="WinJS.UI.ListView.swipeBehavior" helpKeyword="WinJS.UI.ListView.swipeBehavior">
                /// Gets or sets how the ListView reacts to the swipe interaction.
                /// The swipe gesture can select the swiped items or it can
                /// have no effect on the current selection.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                swipeBehavior: {
                    get: function () {
                        return this._swipeBehavior;
                    },
                    set: function (swipeBehavior) {
                        this._swipeBehavior = swipeBehavior;
                        this._setSwipeClass();
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.itemDataSource" helpKeyword="WinJS.UI.ListView.itemDataSource">
                /// Gets or sets the data source that provides items for the ListView.
                /// </field>
                itemDataSource: {
                    get: function () {
                        return this._itemsManager.dataSource;
                    },
                    set: function (newData) {
                        this._writeProfilerMark("set_itemDataSource,info");
                        this._dataSource = newData || new BindingList.List().dataSource;
                        this._groupFocusCache.clear();

                        if (!this._runningInit) {
                            this._selection._reset();
                            this._cancelAsyncViewWork(true);
                            this._updateItemsManager();
                            this._pendingLayoutReset = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.itemTemplate" helpKeyword="WinJS.UI.ListView.itemTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets the templating function that creates the DOM elements
                /// for each item in the itemDataSource. Each item can contain multiple
                /// DOM elements, but we recommend that it have a single root element.
                /// </field>
                itemTemplate: {
                    get: function () {
                        return this._itemRenderer;
                    },
                    set: function (newRenderer) {
                        this._setRenderer(newRenderer, false);

                        if (!this._runningInit) {
                            this._cancelAsyncViewWork(true);
                            this._updateItemsManager();
                            this._pendingLayoutReset = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ListView.resetItem" helpKeyword="WinJS.UI.ListView.resetItem">
                /// Gets or sets the function that is called when the ListView recycles the
                /// element representation of an item.
                /// <deprecated type="deprecate">
                /// resetItem may be altered or unavailable in future versions. Instead, mark the element as disposable using WinJS.Utilities.markDisposable.
                /// </deprecated>
                /// </field>
                resetItem: {
                    get: function () {
                        return this._itemRelease;
                    },
                    set: function (release) {
                        _ElementUtilities._deprecated(_ErrorMessages.resetItemIsDeprecated);
                        this._itemRelease = release;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.groupHeaderTemplate" helpKeyword="WinJS.UI.ListView.groupHeaderTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets the templating function that creates the DOM elements
                /// for each group header in the groupDataSource. Each group header
                /// can contain multiple elements, but it must have a single root element.
                /// </field>
                groupHeaderTemplate: {
                    get: function () {
                        return this._groupHeaderRenderer;
                    },
                    set: function (newRenderer) {
                        this._setRenderer(newRenderer, true);

                        if (!this._runningInit) {
                            this._cancelAsyncViewWork(true);
                            this._pendingLayoutReset = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ListView.resetGroupHeader" helpKeyword="WinJS.UI.ListView.resetGroupHeader" isAdvanced="true">
                /// Gets or sets the function that is called when the ListView recycles the DOM element representation
                /// of a group header.
                /// <deprecated type="deprecate">
                /// resetGroupHeader may be altered or unavailable in future versions. Instead, mark the header element as disposable using WinJS.Utilities.markDisposable.
                /// </deprecated>
                /// </field>
                resetGroupHeader: {
                    get: function () {
                        return this._groupHeaderRelease;
                    },
                    set: function (release) {
                        _ElementUtilities._deprecated(_ErrorMessages.resetGroupHeaderIsDeprecated);
                        this._groupHeaderRelease = release;
                    }
                },

                /// <field type="String" hidden="true" locid="WinJS.UI.ListView.loadingState" helpKeyword="WinJS.UI.ListView.loadingState">
                /// Gets a value that indicates whether the ListView is still loading or whether
                /// loading is complete.  This property can return one of these values:
                /// "itemsLoading", "viewPortLoaded", "itemsLoaded", or "complete".
                /// </field>
                loadingState: {
                    get: function () {
                        return this._loadingState;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.selection" helpKeyword="WinJS.UI.ListView.selection" isAdvanced="true">
                /// Gets an ISelection object that contains the currently selected items.
                /// </field>
                selection: {
                    get: function () {
                        return this._selection;
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.indexOfFirstVisible" helpKeyword="WinJS.UI.ListView.indexOfFirstVisible" isAdvanced="true">
                /// Gets or sets the first visible item. When setting this property, the ListView scrolls so that the
                /// item with the specified index is at the top of the list.
                /// </field>
                indexOfFirstVisible: {
                    get: function () {
                        return this._view.firstIndexDisplayed;
                    },

                    set: function (itemIndex) {
                        if (itemIndex < 0) {
                            return;
                        }

                        this._writeProfilerMark("set_indexOfFirstVisible(" + itemIndex + "),info");
                        this._raiseViewLoading(true);

                        var that = this;
                        this._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                            var range;
                            return that._entityInRange({ type: _UI.ObjectType.item, index: itemIndex }).then(function (validated) {
                                if (!validated.inRange) {
                                    return {
                                        position: 0,
                                        direction: "left"
                                    };
                                } else {
                                    return that._getItemOffset({ type: _UI.ObjectType.item, index: validated.index }).then(function (r) {
                                        range = r;
                                        return that._ensureFirstColumnRange(_UI.ObjectType.item);
                                    }).then(function () {
                                        range = that._correctRangeInFirstColumn(range, _UI.ObjectType.item);
                                        range = that._convertFromCanvasCoordinates(range);

                                        return that._view.waitForValidScrollPosition(range.begin);
                                    }).then(function (begin) {
                                        var direction = (begin < that._lastScrollPosition) ? "left" : "right";
                                        var max = that._viewport[that._scrollLength] - that._getViewportLength();
                                        begin = _ElementUtilities._clamp(begin, 0, max);

                                        return {
                                            position: begin,
                                            direction: direction
                                        };
                                    });
                                }
                            });
                        }, true);
                    }
                },

                /// <field type="Number" integer="true" readonly="true" locid="WinJS.UI.ListView.indexOfLastVisible" helpKeyword="WinJS.UI.ListView.indexOfLastVisible" isAdvanced="true">
                /// Gets the index of the last visible item.
                /// </field>
                indexOfLastVisible: {
                    get: function () {
                        return this._view.lastIndexDisplayed;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.currentItem" helpKeyword="WinJS.UI.ListView.currentItem" isAdvanced="true">
                /// Gets or sets an object that indicates which item should get keyboard focus and its focus status.
                /// The object has these properties:
                /// index: the index of the item in the itemDataSource.
                /// key: the key of the item in the itemDataSource.
                /// hasFocus: when getting this property, this value is true if the item already has focus; otherwise, it's false.
                /// When setting this property, set this value to true if the item should get focus immediately; otherwise, set it to
                /// false and the item will get focus eventually.
                /// showFocus: true if the item displays the focus rectangle; otherwise, false.
                /// </field>
                currentItem: {
                    get: function () {
                        var focused = this._selection._getFocused();
                        var retVal = {
                            index: focused.index,
                            type: focused.type,
                            key: null,
                            hasFocus: !!this._hasKeyboardFocus,
                            showFocus: false
                        };
                        if (focused.type === _UI.ObjectType.groupHeader) {
                            var group = this._groups.group(focused.index);
                            if (group) {
                                retVal.key = group.key;
                                retVal.showFocus = !!(group.header && _ElementUtilities.hasClass(group.header, _Constants._itemFocusClass));
                            }
                        } else {
                            var item = this._view.items.itemAt(focused.index);
                            if (item) {
                                var record = this._itemsManager._recordFromElement(item);
                                retVal.key = record.item && record.item.key;
                                retVal.showFocus = !!item.parentNode.querySelector("." + _Constants._itemFocusOutlineClass);
                            }
                        }
                        return retVal;
                    },

                    set: function (data) {
                        this._hasKeyboardFocus = data.hasFocus || this._hasKeyboardFocus;
                        var that = this;
                        function setItemFocused(item, isInTree, entity) {
                            var drawKeyboardFocus = !!data.showFocus && that._hasKeyboardFocus;
                            that._unsetFocusOnItem(isInTree);
                            that._selection._setFocused(entity, drawKeyboardFocus);
                            if (that._hasKeyboardFocus) {
                                that._keyboardFocusInbound = drawKeyboardFocus;
                                that._setFocusOnItem(entity);
                            } else {
                                that._tabManager.childFocus = (isInTree ? item : null);
                            }
                            if (entity.type !== _UI.ObjectType.groupHeader) {
                                that._updateFocusCache(entity.index);
                                if (that._updater) {
                                    that._updater.newSelectionPivot = entity.index;
                                    that._updater.oldSelectionPivot = -1;
                                }
                                that._selection._pivot = entity.index;
                            }
                        }

                        if (data.key &&
                            ((data.type !== _UI.ObjectType.groupHeader && this._dataSource.itemFromKey) ||
                            (data.type === _UI.ObjectType.groupHeader && this._groupDataSource && this._groupDataSource.itemFromKey))) {
                            if (this.oldCurrentItemKeyFetch) {
                                this.oldCurrentItemKeyFetch.cancel();
                            }
                            var dataSource = (data.type === _UI.ObjectType.groupHeader ? this._groupDataSource : this._dataSource);
                            this.oldCurrentItemKeyFetch = dataSource.itemFromKey(data.key).then(function (item) {
                                that.oldCurrentItemKeyFetch = null;
                                if (item) {
                                    var element = (data.type === _UI.ObjectType.groupHeader ? that._groups.group(item.index).header : that._view.items.itemAt(item.index));
                                    setItemFocused(element, !!element, { type: data.type || _UI.ObjectType.item, index: item.index });
                                }
                            });
                        } else {
                            if (data.index !== undefined) {
                                var element;
                                if (data.type === _UI.ObjectType.groupHeader) {
                                    var group = that._groups.group(data.index);
                                    element = group && group.header;
                                } else {
                                    element = that._view.items.itemAt(data.index);
                                }
                                setItemFocused(element, !!element, { type: data.type || _UI.ObjectType.item, index: data.index });
                            }
                        }
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.zoomableView" helpKeyword="WinJS.UI.ListView.zoomableView" isAdvanced="true">
                /// Gets a ZoomableView. This API supports the SemanticZoom infrastructure
                /// and is not intended to be used directly from your code.
                /// </field>
                zoomableView: {
                    get: function () {
                        if (!this._zoomableView) {
                            this._zoomableView = new ZoomableView(this);
                        }

                        return this._zoomableView;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ListView.itemsDraggable" helpKeyword="WinJS.UI.ListView.itemsDraggable">
                /// Gets or sets whether the ListView's items can be dragged via drag and drop.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                itemsDraggable: {
                    get: function () {
                        return this._dragSource;
                    },

                    set: function (value) {
                        if (_BaseUtils.isPhone) {
                            return;
                        }
                        if (this._dragSource !== value) {
                            this._dragSource = value;
                            this._setSwipeClass();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ListView.itemsReorderable" helpKeyword="WinJS.UI.ListView.itemsReorderable">
                /// Gets or sets whether the ListView's items can be reordered within itself via drag and drop. When a ListView is marked as reorderable, its items can be dragged about inside itself, but it will not require the itemdrag events it fires to be handled.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                itemsReorderable: {
                    get: function () {
                        return this._reorderable;
                    },

                    set: function (value) {
                        if (_BaseUtils.isPhone) {
                            return;
                        }
                        if (this._reorderable !== value) {
                            this._reorderable = value;
                            this._setSwipeClass();
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.maxDeferredItemCleanup" helpKeyword="WinJS.UI.ListView.maxDeferredItemCleanup" isAdvanced="true">
                /// Gets or sets the maximum number of realized items.
                /// </field>
                maxDeferredItemCleanup: {
                    get: function () {
                        return this._maxDeferredItemCleanup;
                    },

                    set: function (value) {
                        this._maxDeferredItemCleanup = Math.max(0, +value || 0);
                    }
                },

                // Public methods

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ListView.dispose">
                    /// <summary locid="WinJS.UI.ListView.dispose">
                    /// Disposes this ListView.
                    /// </summary>
                    /// </signature>
                    this._dispose();
                },

                elementFromIndex: function (itemIndex) {
                    /// <signature helpKeyword="WinJS.UI.ListView.elementFromIndex">
                    /// <summary locid="WinJS.UI.ListView.elementFromIndex">
                    /// Returns the DOM element that represents the item at the specified index.
                    /// </summary>
                    /// <param name="itemIndex" type="Number" integer="true" locid="WinJS.UI.ListView.elementFromIndex_p:itemIndex">
                    /// The index of the item.
                    /// </param>
                    /// <returns type="Object" domElement="true" locid="WinJS.UI.ListView.elementFromIndex_returnValue">
                    /// The DOM element that represents the specified item.
                    /// </returns>
                    /// </signature>

                    return this._view.items.itemAt(itemIndex);
                },

                indexOfElement: function (element) {
                    /// <signature helpKeyword="WinJS.UI.ListView.indexOfElement">
                    /// <summary locid="WinJS.UI.ListView.indexOfElement">
                    /// Returns the index of the item that the specified DOM element displays.
                    /// </summary>
                    /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.ListView.indexOfElement_p:element">
                    /// The DOM element that displays the item.
                    /// </param>
                    /// <returns type="Number" integer="true" locid="WinJS.UI.ListView.indexOfElement_returnValue">
                    /// The index of item that the specified DOM element displays.
                    /// </returns>
                    /// </signature>

                    return this._view.items.index(element);
                },

                ensureVisible: function ListView_ensureVisible(value) {
                    /// <signature helpKeyword="WinJS.UI.ListView.ensureVisible">
                    /// <summary locid="WinJS.UI.ListView.ensureVisible">
                    /// Makes the specified item visible. The ListView scrolls to the item if needed.
                    /// </summary>
                    /// <param name="value" type="Number|IListViewEntity" integer="true" locid="WinJS.UI.ListView.ensureVisible_p:value">
                    /// The index of the ListView item or IListViewEntity to bring into view.
                    /// </param>
                    /// </signature>
                    var type = _UI.ObjectType.item,
                        itemIndex = value;
                    if (+value !== value) {
                        type = value.type;
                        itemIndex = value.index;
                    }
                    this._writeProfilerMark("ensureVisible(" + type + ": " + itemIndex + "),info");

                    if (itemIndex < 0) {
                        return;
                    }

                    this._raiseViewLoading(true);

                    var that = this;
                    this._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                        var range;

                        return that._entityInRange({ type: type, index: itemIndex }).then(function (validated) {
                            if (!validated.inRange) {
                                return {
                                    position: 0,
                                    direction: "left"
                                };
                            } else {
                                return that._getItemOffset({ type: type, index: validated.index }).then(function (r) {
                                    range = r;
                                    return that._ensureFirstColumnRange(type);
                                }).then(function () {
                                    range = that._correctRangeInFirstColumn(range, type);

                                    var viewportLength = that._getViewportLength(),
                                        left = that._viewportScrollPosition,
                                        right = left + viewportLength,
                                        newPosition = that._viewportScrollPosition,
                                        entityWidth = range.end - range.begin;

                                    range = that._convertFromCanvasCoordinates(range);

                                    var handled = false;
                                    if (type === _UI.ObjectType.groupHeader && left <= range.begin) {
                                        // EnsureVisible on a group where the entire header is fully visible does not
                                        // scroll. This prevents tabbing from an item in a very large group to align
                                        // the scroll to the header element.
                                        var header = that._groups.group(validated.index).header;
                                        if (header) {
                                            var headerEnd;
                                            var margins = _Layouts._getMargins(header);
                                            if (that._horizontalLayout) {
                                                var rtl = that._rtl();
                                                var headerStart = (rtl ? getOffsetRight(header) - margins.right : header.offsetLeft - margins.left);
                                                headerEnd = headerStart + header.offsetWidth + (rtl ? margins.left : margins.right);
                                            } else {
                                                headerEnd = header.offsetTop + header.offsetHeight + margins.top;
                                            }
                                            handled = headerEnd <= right;
                                        }
                                    }
                                    if (!handled) {
                                        if (entityWidth >= right - left) {
                                            // This item is larger than the viewport so we will just set
                                            // the scroll position to the beginning of the item.
                                            newPosition = range.begin;
                                        } else {
                                            if (range.begin < left) {
                                                newPosition = range.begin;
                                            } else if (range.end > right) {
                                                newPosition = range.end - viewportLength;
                                            }
                                        }
                                    }

                                    var direction = (newPosition < that._lastScrollPosition) ? "left" : "right";
                                    var max = that._viewport[that._scrollLength] - viewportLength;
                                    newPosition = _ElementUtilities._clamp(newPosition, 0, max);

                                    return {
                                        position: newPosition,
                                        direction: direction
                                    };
                                });
                            }
                        });
                    }, true);
                },

                loadMorePages: function ListView_loadMorePages() {
                    /// <signature helpKeyword="WinJS.UI.ListView.loadMorePages">
                    /// <summary locid="WinJS.UI.ListView.loadMorePages">
                    /// Loads the next set of pages if the ListView object's loadingBehavior is set to incremental.
                    /// <deprecated type="deprecate">
                    /// loadMorePages is deprecated. Invoking this function will not have any effect. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                    /// </deprecated>
                    /// </summary>
                    /// </signature>
                    _ElementUtilities._deprecated(_ErrorMessages.loadMorePagesIsDeprecated);
                },

                recalculateItemPosition: function ListView_recalculateItemPosition() {
                    /// <signature helpKeyword="WinJS.UI.ListView.recalculateItemPosition">
                    /// <summary locid="WinJS.UI.ListView.recalculateItemPosition">
                    /// Repositions all the visible items in the ListView to adjust for items whose sizes have changed. Use this function or forceLayout when making the ListView visible again after you set its style.display property to "none" or after style changes have been made that affect the size or position of the ListView or its items. Unlike forceLayout, this method doesn’t recreate items and it doesn’t display entrance animation.
                    /// </summary>
                    /// </signature>
                    this._writeProfilerMark("recalculateItemPosition,info");
                    this._forceLayoutImpl(_Constants._ViewChange.relayout);
                },

                forceLayout: function ListView_forceLayout() {
                    /// <signature helpKeyword="WinJS.UI.ListView.forceLayout">
                    /// <summary locid="WinJS.UI.ListView.forceLayout">
                    /// Forces the ListView to update its layout. Use this function or relcaculateItemPosition when making the ListView visible again after you set its style.display property to "none” or after style changes have been made that affect the size or position of the ListView or its items.
                    /// after you set its style.display property to "none".
                    /// </summary>
                    /// </signature>
                    this._writeProfilerMark("forceLayout,info");
                    this._forceLayoutImpl(_Constants._ViewChange.remeasure);
                },

                _entityInRange: function ListView_entityInRange(entity) {
                    if (entity.type === _UI.ObjectType.item) {
                        return this._itemsCount().then(function (itemsCount) {
                            var index = _ElementUtilities._clamp(entity.index, 0, itemsCount - 1);
                            return {
                                inRange: index >= 0 && index < itemsCount,
                                index: index
                            };
                        });
                    } else {
                        var index = _ElementUtilities._clamp(entity.index, 0, this._groups.length() - 1);
                        return Promise.wrap({
                            inRange: index >= 0 && index < this._groups.length(),
                            index: index
                        });
                    }
                },

                _forceLayoutImpl: function ListView_forceLayoutImpl(viewChange) {
                    var that = this;
                    this._versionManager.unlocked.then(function () {
                        that._writeProfilerMark("_forceLayoutImpl viewChange(" + viewChange + "),info");

                        that._cancelAsyncViewWork();
                        that._pendingLayoutReset = true;
                        that._resizeViewport();

                        that._batchViewUpdates(viewChange, _Constants._ScrollToPriority.low, function () {
                            return {
                                position: that._lastScrollPosition,
                                direction: "right"
                            };
                        }, true, true);
                    });
                },

                _configureSelectionMode: function () {
                    if (_BaseUtils.isPhone) {
                        if (this.tapBehavior === _UI.TapBehavior.toggleSelect && this.selectionMode === _UI.SelectionMode.multi) {
                            _ElementUtilities.addClass(this._canvas, _Constants._selectionModeClass);
                        } else {
                            _ElementUtilities.removeClass(this._canvas, _Constants._selectionModeClass);
                        }
                    }
                },

                _lastScrollPosition: {
                    get: function () {
                        return this._lastScrollPositionValue;
                    },
                    set: function (position) {
                        if (position === 0) {
                            this._lastDirection = "right";
                            this._direction  = "right";
                            this._lastScrollPositionValue = 0;
                        } else {
                            var currentDirection = position < this._lastScrollPositionValue ? "left" : "right";
                            this._direction = this._scrollDirection(position);
                            this._lastDirection = currentDirection;
                            this._lastScrollPositionValue = position;
                        }
                    }
                },

                _supportsGroupHeaderKeyboarding: {
                    get: function () {
                        return this._groupDataSource;
                    }
                },

                _viewportScrollPosition: {
                    get: function () {
                        this._currentScrollPosition = _ElementUtilities.getScrollPosition(this._viewport)[this._scrollProperty];
                        return this._currentScrollPosition;
                    },
                    set: function (value) {
                        var newScrollPos = {};
                        newScrollPos[this._scrollProperty] = value;
                        _ElementUtilities.setScrollPosition(this._viewport, newScrollPos);
                        this._currentScrollPosition = value;
                    }
                },

                _canvasStart: {
                    get: function () {
                        return this._canvasStartValue || 0;
                    },
                    set: function (value) {
                        var transformX = this._horizontal() ? (this._rtl() ? -value : value) : 0,
                            transformY = this._horizontal() ? 0 : value;
                        if (value !== 0) {
                            this._canvas.style[transformNames.scriptName] = "translate( " + transformX + "px, " + transformY + "px)";
                        } else {
                            this._canvas.style[transformNames.scriptName] = "";
                        }
                        this._canvasStartValue = value;
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.scrollPosition" helpKeyword="WinJS.UI.ListView.scrollPosition">
                /// Gets or sets the position of the ListView's scrollbar.
                /// </field>
                scrollPosition: {
                    get: function () {
                        return this._viewportScrollPosition;
                    },
                    set: function (newPosition) {
                        var that = this;
                        this._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                            return that._view.waitForValidScrollPosition(newPosition).then(function () {
                                var max = that._viewport[that._scrollLength] - that._getViewportLength();
                                newPosition = _ElementUtilities._clamp(newPosition, 0, max);
                                var direction = (newPosition < that._lastScrollPosition) ? "left" : "right";
                                return {
                                    position: newPosition,
                                    direction: direction
                                };
                            });
                        }, true);
                    }
                },

                _setRenderer: function ListView_setRenderer(newRenderer, isGroupHeaderRenderer) {
                    var renderer;
                    if (!newRenderer) {
                        if (_BaseUtils.validation) {
                            throw new _ErrorFromName("WinJS.UI.ListView.invalidTemplate", _ErrorMessages.invalidTemplate);
                        }
                        renderer = _ItemsManager.trivialHtmlRenderer;
                    } else if (typeof newRenderer === "function") {
                        renderer = newRenderer;
                    } else if (typeof newRenderer === "object") {
                        if (_BaseUtils.validation && !newRenderer.renderItem) {
                            throw new _ErrorFromName("WinJS.UI.ListView.invalidTemplate", _ErrorMessages.invalidTemplate);
                        }
                        renderer = newRenderer.renderItem;
                    }

                    if (renderer) {
                        if (isGroupHeaderRenderer) {
                            this._groupHeaderRenderer = renderer;
                        } else {
                            this._itemRenderer = renderer;
                        }
                    }
                },

                _renderWithoutReuse: function ListView_renderWithoutReuse(itemPromise, oldElement) {
                    if (oldElement) {
                        _Dispose._disposeElement(oldElement);
                    }
                    var templateResult = this._itemRenderer(itemPromise);
                    if (templateResult.then) {
                        return templateResult.then(function (element) {
                            element.tabIndex = 0;
                            return element;
                        });
                    } else {
                        var element = templateResult.element || templateResult;
                        element.tabIndex = 0;
                        return templateResult;
                    }
                },

                _isInsertedItem: function ListView_isInsertedItem(itemPromise) {
                    return !!this._insertedItems[itemPromise.handle];
                },

                _clearInsertedItems: function ListView_clearInsertedItems() {
                    var keys = Object.keys(this._insertedItems);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        this._insertedItems[keys[i]].release();
                    }
                    this._insertedItems = {};
                    this._modifiedElements = [];
                    this._countDifference = 0;
                },

                // Private methods
                _cancelAsyncViewWork: function (stopTreeCreation) {
                    this._view.stopWork(stopTreeCreation);
                },

                _updateView: function ListView_updateView() {
                    if (this._isZombie()) { return; }

                    var that = this;
                    function resetCache() {
                        that._itemsBlockExtent = -1;
                        that._firstItemRange = null;
                        that._firstHeaderRange = null;
                        that._itemMargins = null;
                        that._headerMargins = null;
                        that._canvasMargins = null;
                        that._cachedRTL = null;
                        // Retrieve the values before DOM modifications occur
                        that._rtl();
                    }

                    var viewChange = this._viewChange;
                    this._viewChange = _Constants._ViewChange.realize;

                    function functorWrapper() {
                        that._scrollToPriority = _Constants._ScrollToPriority.uninitialized;
                        var setScrollbarPosition = that._setScrollbarPosition;
                        that._setScrollbarPosition = false;

                        var position = typeof that._scrollToFunctor === "number" ? { position: that._scrollToFunctor } : that._scrollToFunctor();
                        return Promise.as(position).then(
                            function (scroll) {
                                scroll = scroll || {};
                                if (setScrollbarPosition && +scroll.position === scroll.position) {
                                    that._lastScrollPosition = scroll.position;
                                    that._viewportScrollPosition = scroll.position;
                                }
                                return scroll;
                            },
                            function (error) {
                                that._setScrollbarPosition |= setScrollbarPosition;
                                return Promise.wrapError(error);
                            }
                        );
                    }

                    if (viewChange === _Constants._ViewChange.rebuild) {
                        if (this._pendingGroupWork) {
                            this._updateGroupWork();
                        }
                        if (this._pendingLayoutReset) {
                            this._resetLayout();
                        }
                        resetCache();
                        if (!this._firstTimeDisplayed) {
                            this._view.reset();
                        }
                        this._view.reload(functorWrapper, true);
                        this._setFocusOnItem(this._selection._getFocused());
                    } else if (viewChange === _Constants._ViewChange.remeasure) {
                        this._view.resetItems(true);
                        this._resetLayout();
                        resetCache();
                        this._view.refresh(functorWrapper);
                        this._setFocusOnItem(this._selection._getFocused());
                    } else if (viewChange === _Constants._ViewChange.relayout) {
                        if (this._pendingLayoutReset) {
                            this._resetLayout();
                            resetCache();
                        }
                        this._view.refresh(functorWrapper);
                    } else {
                        this._view.onScroll(functorWrapper);
                    }
                },

                _batchViewUpdates: function ListView_batchViewUpdates(viewChange, scrollToPriority, positionFunctor, setScrollbarPosition, skipFadeout) {
                    this._viewChange = Math.min(this._viewChange, viewChange);

                    if (this._scrollToFunctor === null || scrollToPriority >= this._scrollToPriority) {
                        this._scrollToPriority = scrollToPriority;
                        this._scrollToFunctor = positionFunctor;
                    }

                    this._setScrollbarPosition |= !!setScrollbarPosition;

                    if (!this._batchingViewUpdates) {
                        this._raiseViewLoading();

                        var that = this;
                        this._batchingViewUpdatesSignal = new _Signal();
                        this._batchingViewUpdates = Promise.any([this._batchingViewUpdatesSignal.promise, Scheduler.schedulePromiseHigh(null, "WinJS.UI.ListView._updateView")]).then(function () {
                            if (that._isZombie()) { return; }

                            // If we're displaying for the first time, or there were no items visible in the view, we can skip the fade out animation
                            // and go straight to the refresh. _view.items._itemData.length is the most trustworthy way to find how many items are visible.
                            if (that._viewChange === _Constants._ViewChange.rebuild && !that._firstTimeDisplayed && Object.keys(that._view.items._itemData).length !== 0 && !skipFadeout) {
                                return that._fadeOutViewport();
                            }
                        }).then(
                            function () {
                                that._batchingViewUpdates = null;
                                that._batchingViewUpdatesSignal = null;
                                that._updateView();
                                that._firstTimeDisplayed = false;
                            },
                            function () {
                                that._batchingViewUpdates = null;
                                that._batchingViewUpdatesSignal = null;
                            }
                        );
                    }

                    return this._batchingViewUpdatesSignal;
                },

                _resetCanvas: function () {
                    if (this._disposed) {
                        return;
                    }

                    // Layouts do not currently support saving the scroll position when forceLayout() is called.
                    // Layouts need to recreate the canvas because the tabManager is there and you don't want to
                    // construct 2 instances of WinJS.UI.TabContainer for the same element.
                    var newCanvas = _Global.document.createElement('div');
                    newCanvas.className = this._canvas.className;
                    this._viewport.replaceChild(newCanvas, this._canvas);
                    this._canvas = newCanvas;
                    this._groupsToRemove = {};
                    // We reset the itemCanvas on _resetCanvas in case a ListView client uses two separate custom layouts, and each layout
                    // changes different styles on the itemCanvas without resetting it.
                    this._canvas.appendChild(this._canvasProxy);
                },

                _setupInternalTree: function ListView_setupInternalTree() {
                    _ElementUtilities.addClass(this._element, _Constants._listViewClass);
                    _ElementUtilities[this._rtl() ? "addClass" : "removeClass"](this._element, _Constants._rtlListViewClass);

                    this._element.innerHTML =
                        '<div tabIndex="-1" role="group" class="' + _Constants._viewportClass + ' ' + _Constants._horizontalClass + '">' +
                            '<div class="' + _Constants._scrollableClass + '">' +
                                // Create a proxy element inside the canvas so that during an MSPointerDown event we can call
                                // msSetPointerCapture on it. This allows hover to not be passed to it which saves a large invalidation.
                                '<div class="' + _Constants._proxyClass + '"></div>' +
                            '</div>' +
                            '<div></div>' +
                        '</div>' +
                        // The keyboard event helper is a dummy node that allows us to keep getting keyboard events when a virtualized element
                        // gets discarded. It has to be positioned in the center of the viewport, though, otherwise calling .focus() on it
                        // can move our viewport around when we don't want it moved.
                        // The keyboard event helper element will be skipped in the tab order if it doesn't have width+height set on it.
                       '<div aria-hidden="true" style="position:absolute;left:50%;top:50%;width:0px;height:0px;" tabindex="-1"></div>';

                    this._viewport = this._element.firstElementChild;
                    this._canvas = this._viewport.firstElementChild;
                    this._canvasProxy = this._canvas.firstElementChild;
                    // The deleteWrapper div is used to maintain the scroll width (after delete(s)) until the animation is done
                    this._deleteWrapper = this._canvas.nextElementSibling;
                    this._keyboardEventsHelper = this._viewport.nextElementSibling;
                    this._tabIndex = _ElementUtilities.getTabIndex(this._element);
                    if (this._tabIndex < 0) {
                        this._tabIndex = 0;
                    }
                    this._tabManager = new _TabContainer.TabContainer(this._viewport);
                    this._tabManager.tabIndex = this._tabIndex;

                    this._progressBar = _Global.document.createElement("progress");
                    _ElementUtilities.addClass(this._progressBar, _Constants._progressClass);
                    this._progressBar.style.position = "absolute";
                    this._progressBar.max = 100;
                },

                _unsetFocusOnItem: function ListView_unsetFocusOnItem(newFocusExists) {
                    if (this._tabManager.childFocus) {
                        this._clearFocusRectangle(this._tabManager.childFocus);
                    }
                    if (this._isZombie()) {
                        return;
                    }
                    if (!newFocusExists) {
                        // _setFocusOnItem may run asynchronously so prepare the keyboardEventsHelper
                        // to receive focus.
                        if (this._tabManager.childFocus) {
                            this._tabManager.childFocus = null;
                        }

                        this._keyboardEventsHelper._shouldHaveFocus = false;
                        // If the viewport has focus, leave it there. This will prevent focus from jumping
                        // from the viewport to the keyboardEventsHelper when scrolling with Narrator Touch.
                        if (_Global.document.activeElement !== this._viewport && this._hasKeyboardFocus) {
                            this._keyboardEventsHelper._shouldHaveFocus = true;
                            _ElementUtilities._setActive(this._keyboardEventsHelper);
                        }
                    }
                    this._itemFocused = false;
                },

                _setFocusOnItem: function ListView_setFocusOnItem(entity) {
                    this._writeProfilerMark("_setFocusOnItem,info");
                    if (this._focusRequest) {
                        this._focusRequest.cancel();
                    }
                    if (this._isZombie()) {
                        return;
                    }
                    var that = this;
                    var setFocusOnItemImpl = function (item) {
                        if (that._isZombie()) {
                            return;
                        }

                        if (that._tabManager.childFocus !== item) {
                            that._tabManager.childFocus = item;
                        }
                        that._focusRequest = null;
                        if (that._hasKeyboardFocus && !that._itemFocused) {
                            if (that._selection._keyboardFocused()) {
                                that._drawFocusRectangle(item);
                            }
                            // The requestItem promise just completed so _cachedCount will
                            // be initialized.
                            that._view.updateAriaForAnnouncement(item, (entity.type === _UI.ObjectType.groupHeader ? that._groups.length() : that._cachedCount));

                            // Some consumers of ListView listen for item invoked events and hide the listview when an item is clicked.
                            // Since keyboard interactions rely on async operations, sometimes an invoke event can be received before we get
                            // to WinJS.Utilities._setActive(item), and the listview will be made invisible. If that happens and we call item.setActive(), an exception
                            // is raised for trying to focus on an invisible item. Checking visibility is non-trivial, so it's best
                            // just to catch the exception and ignore it.
                            that._itemFocused = true;
                            _ElementUtilities._setActive(item);
                        }
                    };

                    if (entity.type !== _UI.ObjectType.groupHeader) {
                        this._focusRequest = this._view.items.requestItem(entity.index);
                    } else {
                        this._focusRequest = this._groups.requestHeader(entity.index);
                    }
                    this._focusRequest.then(setFocusOnItemImpl);
                },

                _attachEvents: function ListView_attachEvents() {
                    var that = this;

                    function listViewHandler(eventName, caseSensitive, capture) {
                        return {
                            name: (caseSensitive ? eventName : eventName.toLowerCase()),
                            handler: function (eventObject) {
                                that["_on" + eventName](eventObject);
                            },
                            capture: capture
                        };
                    }

                    function modeHandler(eventName, caseSensitive, capture) {
                        return {
                            capture: capture,
                            name: (caseSensitive ? eventName : eventName.toLowerCase()),
                            handler: function (eventObject) {
                                var currentMode = that._mode,
                                    name = "on" + eventName;
                                if (!that._disposed && currentMode[name]) {
                                    currentMode[name](eventObject);
                                }
                            }
                        };
                    }

                    function observerHandler(handlerName, attributesFilter) {
                        return {
                            handler: function (listOfChanges) {
                                that["_on" + handlerName](listOfChanges);
                            },
                            filter: attributesFilter
                        };
                    }

                    // Observers for specific element attribute changes
                    var elementObservers = [
                        observerHandler("PropertyChange", ["dir", "style", "tabindex"])
                    ];
                    this._cachedStyleDir = this._element.style.direction;

                    elementObservers.forEach(function (elementObserver) {
                        new _ElementUtilities._MutationObserver(elementObserver.handler).observe(that._element, { attributes: true, attributeFilter: elementObserver.filter });
                    });

                    // KeyDown handler needs to be added explicitly via addEventListener instead of using attachEvent.
                    // If it's not added via addEventListener, the eventObject given to us on event does not have the functions stopPropagation() and preventDefault().
                    var events = [
                        modeHandler("PointerDown"),
                        modeHandler("click", false),
                        modeHandler("PointerUp"),
                        modeHandler("LostPointerCapture"),
                        modeHandler("MSHoldVisual", true),
                        modeHandler("PointerCancel", true),
                        modeHandler("DragStart"),
                        modeHandler("DragOver"),
                        modeHandler("DragEnter"),
                        modeHandler("DragLeave"),
                        modeHandler("Drop"),
                        modeHandler("ContextMenu"),
                        modeHandler("MSManipulationStateChanged", true, true)
                    ];
                    events.forEach(function (eventHandler) {
                        _ElementUtilities._addEventListener(that._viewport, eventHandler.name, eventHandler.handler, !!eventHandler.capture);
                    });

                    var elementEvents = [
                        listViewHandler("FocusIn", false, false),
                        listViewHandler("FocusOut", false, false),
                        modeHandler("KeyDown"),
                        modeHandler("KeyUp"),
                        listViewHandler("MSElementResize", false, false)
                    ];
                    elementEvents.forEach(function (eventHandler) {
                        _ElementUtilities._addEventListener(that._element, eventHandler.name, eventHandler.handler, !!eventHandler.capture);
                    });
                    this._onMSElementResizeBound = this._onMSElementResize.bind(this);
                    _ElementUtilities._resizeNotifier.subscribe(this._element, this._onMSElementResizeBound);

                    var initiallyParented = _Global.document.body.contains(this._element);
                    _ElementUtilities._addInsertedNotifier(this._element);
                    this._element.addEventListener("WinJSNodeInserted", function (event) {
                        // WinJSNodeInserted fires even if the element is already in the DOM
                        if (initiallyParented) {
                            initiallyParented = false;
                            return;
                        }
                        that._onMSElementResizeBound(event);
                    }, false);

                    var viewportEvents = [
                        listViewHandler("MSManipulationStateChanged", true),
                        listViewHandler("Scroll")
                    ];
                    viewportEvents.forEach(function (viewportEvent) {
                        that._viewport.addEventListener(viewportEvent.name, viewportEvent.handler, false);
                    });
                    this._viewport.addEventListener("onTabEnter", this._onTabEnter.bind(this));
                    this._viewport.addEventListener("onTabExit", this._onTabExit.bind(this));
                    this._viewport.addEventListener("onTabEntered", function (e) {
                        that._mode.onTabEntered(e);
                    });
                    this._viewport.addEventListener("onTabExiting", function (e) {
                        that._mode.onTabExiting(e);
                    });
                },

                _updateItemsManager: function ListView_updateItemsManager() {
                    var that = this,
                        notificationHandler = {
                            // Following methods are used by ItemsManager
                            beginNotifications: function ListView_beginNotifications() {
                            },

                            changed: function ListView_changed(newItem, oldItem) {
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                var elementInfo = that._updater.elements[uniqueID(oldItem)];
                                if (elementInfo) {
                                    var selected = that.selection._isIncluded(elementInfo.index);
                                    if (selected) {
                                        that._updater.updateDrag = true;
                                    }

                                    if (oldItem !== newItem) {
                                        if (that._tabManager.childFocus === oldItem || that._updater.newFocusedItem === oldItem) {
                                            that._updater.newFocusedItem = newItem;
                                            that._tabManager.childFocus = null;
                                        }

                                        if (elementInfo.itemBox) {
                                            _ElementUtilities.addClass(newItem, _Constants._itemClass);
                                            that._setupAriaSelectionObserver(newItem);

                                            var next = oldItem.nextElementSibling;
                                            elementInfo.itemBox.removeChild(oldItem);
                                            elementInfo.itemBox.insertBefore(newItem, next);
                                        }

                                        that._setAriaSelected(newItem, selected);
                                        that._view.items.setItemAt(elementInfo.newIndex, {
                                            element: newItem,
                                            itemBox: elementInfo.itemBox,
                                            container: elementInfo.container,
                                            itemsManagerRecord: elementInfo.itemsManagerRecord
                                        });
                                        delete that._updater.elements[uniqueID(oldItem)];
                                        _Dispose._disposeElement(oldItem);
                                        that._updater.elements[uniqueID(newItem)] = {
                                            item: newItem,
                                            container: elementInfo.container,
                                            itemBox: elementInfo.itemBox,
                                            index: elementInfo.index,
                                            newIndex: elementInfo.newIndex,
                                            itemsManagerRecord: elementInfo.itemsManagerRecord
                                        };
                                    } else if (elementInfo.itemBox && elementInfo.container) {
                                        _ItemEventsHandler._ItemEventsHandler.renderSelection(elementInfo.itemBox, newItem, selected, true);
                                        _ElementUtilities[selected ? "addClass" : "removeClass"](elementInfo.container, _Constants._selectedClass);
                                    }
                                    that._updater.changed = true;
                                }
                                for (var i = 0, len = that._notificationHandlers.length; i < len; i++) {
                                    that._notificationHandlers[i].changed(newItem, oldItem);
                                }
                                that._writeProfilerMark("changed,info");
                            },

                            removed: function ListView_removed(item, mirage, handle) {
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                function removeFromSelection(index) {
                                    that._updater.updateDrag = true;
                                    if (that._currentMode()._dragging && that._currentMode()._draggingUnselectedItem && that._currentMode()._dragInfo._isIncluded(index)) {
                                        that._updater.newDragInfo = new _SelectionManager._Selection(that, []);
                                    }

                                    var firstRange = that._updater.selectionFirst[index],
                                        lastRange = that._updater.selectionLast[index],
                                        range = firstRange || lastRange;

                                    if (range) {
                                        delete that._updater.selectionFirst[range.oldFirstIndex];
                                        delete that._updater.selectionLast[range.oldLastIndex];
                                        that._updater.selectionChanged = true;
                                    }
                                }

                                var insertedItem = that._insertedItems[handle];
                                if (insertedItem) {
                                    delete that._insertedItems[handle];
                                }

                                var index;
                                if (item) {
                                    var elementInfo = that._updater.elements[uniqueID(item)],
                                        itemObject = that._itemsManager.itemObject(item);

                                    if (itemObject) {
                                        that._groupFocusCache.deleteItem(itemObject.key);
                                    }

                                    if (elementInfo) {
                                        index = elementInfo.index;

                                        // We track removed elements for animation purposes (layout
                                        // component consumes this).
                                        //
                                        if (elementInfo.itemBox) {
                                            var itemBox = elementInfo.itemBox,
                                                oddStripe = _Constants._containerOddClass,
                                                evenStripe = _Constants._containerEvenClass,
                                                // Store the even/odd container class from the container the itemBox was in before being removed. 
                                                // We want to reapply that class on whichever container we use to perform the itemBox's exit animation.
                                                containerStripe = _ElementUtilities.hasClass(itemBox.parentElement, evenStripe)? evenStripe: oddStripe;

                                            that._updater.removed.push({
                                                index: index,
                                                itemBox: itemBox,
                                                containerStripe: containerStripe,
                                            });
                                        }
                                        that._updater.deletesCount++;

                                        // The view can't access the data from the itemsManager
                                        // anymore, so we need to flag the itemData that it
                                        // has been removed.
                                        //
                                        var itemData = that._view.items.itemDataAt(index);
                                        itemData.removed = true;

                                        delete that._updater.elements[uniqueID(item)];
                                    } else {
                                        index = itemObject && itemObject.index;
                                    }

                                    if (that._updater.oldFocus.type !== _UI.ObjectType.groupHeader && that._updater.oldFocus.index === index) {
                                        that._updater.newFocus.index = index; // If index is too high, it'll be fixed in endNotifications
                                        that._updater.focusedItemRemoved = true;
                                    }

                                    removeFromSelection(index);
                                } else {
                                    index = that._updater.selectionHandles[handle];
                                    if (index === +index) {
                                        removeFromSelection(index);
                                    }
                                }
                                that._writeProfilerMark("removed(" + index + "),info");

                                that._updater.changed = true;
                            },

                            updateAffectedRange: function ListView_updateAffectedRange(newerRange) {
                                that._itemsCount().then(function (count) {
                                    // When we receive insertion notifications before all of the containers have
                                    // been created and the affected range is beyond the container range, the
                                    // affected range indices will not correspond to the indices of the containers
                                    // created by updateContainers. In this case, start the affected range at the end
                                    // of the containers so that the affected range includes any containers that get
                                    // appended due to this batch of notifications.
                                    var containerCount = that._view.containers ? that._view.containers.length : 0;
                                    newerRange.start = Math.min(newerRange.start, containerCount);

                                    that._affectedRange.add(newerRange, count);
                                });
                                that._createUpdater();
                                that._updater.changed = true;
                            },

                            indexChanged: function ListView_indexChanged(item, newIndex, oldIndex) {
                                // We should receive at most one indexChanged notification per oldIndex
                                // per notification cycle.
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                if (item) {
                                    var itemObject = that._itemsManager.itemObject(item);
                                    if (itemObject) {
                                        that._groupFocusCache.updateItemIndex(itemObject.key, newIndex);
                                    }

                                    var elementInfo = that._updater.elements[uniqueID(item)];
                                    if (elementInfo) {
                                        elementInfo.newIndex = newIndex;
                                        that._updater.changed = true;
                                    }
                                    that._updater.itemsMoved = true;
                                }
                                if (that._currentMode()._dragging && that._currentMode()._draggingUnselectedItem && that._currentMode()._dragInfo._isIncluded(oldIndex)) {
                                    that._updater.newDragInfo = new _SelectionManager._Selection(that, [{ firstIndex: newIndex, lastIndex: newIndex }]);
                                    that._updater.updateDrag = true;
                                }

                                if (that._updater.oldFocus.type !== _UI.ObjectType.groupHeader && that._updater.oldFocus.index === oldIndex) {
                                    that._updater.newFocus.index = newIndex;
                                    that._updater.changed = true;
                                }

                                if (that._updater.oldSelectionPivot === oldIndex) {
                                    that._updater.newSelectionPivot = newIndex;
                                    that._updater.changed = true;
                                }

                                var range = that._updater.selectionFirst[oldIndex];
                                if (range) {
                                    range.newFirstIndex = newIndex;
                                    that._updater.changed = true;
                                    that._updater.updateDrag = true;
                                }
                                range = that._updater.selectionLast[oldIndex];
                                if (range) {
                                    range.newLastIndex = newIndex;
                                    that._updater.changed = true;
                                    that._updater.updateDrag = true;
                                }
                            },

                            endNotifications: function ListView_endNotifications() {
                                that._update();
                            },

                            inserted: function ListView_inserted(itemPromise) {
                                if (that._ifZombieDispose()) { return; }
                                that._writeProfilerMark("inserted,info");

                                that._createUpdater();
                                that._updater.changed = true;
                                itemPromise.retain();
                                that._updater.insertsCount++;
                                that._insertedItems[itemPromise.handle] = itemPromise;
                            },

                            moved: function ListView_moved(item, previous, next, itemPromise) {
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                that._updater.movesCount++;
                                if (item) {
                                    that._updater.itemsMoved = true;

                                    var elementInfo = that._updater.elements[uniqueID(item)];
                                    if (elementInfo) {
                                        elementInfo.moved = true;
                                    }
                                }

                                var index = that._updater.selectionHandles[itemPromise.handle];
                                if (index === +index) {
                                    that._updater.updateDrag = true;

                                    var firstRange = that._updater.selectionFirst[index],
                                        lastRange = that._updater.selectionLast[index],
                                        range = firstRange || lastRange;

                                    if (range && range.oldFirstIndex !== range.oldLastIndex) {
                                        delete that._updater.selectionFirst[range.oldFirstIndex];
                                        delete that._updater.selectionLast[range.oldLastIndex];
                                        that._updater.selectionChanged = true;
                                        that._updater.changed = true;
                                    }
                                }
                                that._writeProfilerMark("moved(" + index + "),info");
                            },

                            countChanged: function ListView_countChanged(newCount, oldCount) {
                                if (that._ifZombieDispose()) { return; }
                                that._writeProfilerMark("countChanged(" + newCount + "),info");

                                that._cachedCount = newCount;
                                that._createUpdater();

                                if ((that._view.lastIndexDisplayed + 1) === oldCount) {
                                    that._updater.changed = true;
                                }

                                that._updater.countDifference += newCount - oldCount;
                            },

                            reload: function ListView_reload() {
                                if (that._ifZombieDispose()) {
                                    return;
                                }
                                that._writeProfilerMark("reload,info");

                                that._processReload();
                            }
                        };

                    function statusChanged(eventObject) {
                        if (eventObject.detail === _UI.DataSourceStatus.failure) {
                            that.itemDataSource = null;
                            that.groupDataSource = null;
                        }
                    }

                    if (this._versionManager) {
                        this._versionManager._dispose();
                    }

                    this._versionManager = new _VersionManager._VersionManager();
                    this._updater = null;

                    var ranges = this._selection.getRanges();
                    this._selection._selected.clear();

                    if (this._itemsManager) {

                        if (this._itemsManager.dataSource && this._itemsManager.dataSource.removeEventListener) {
                            this._itemsManager.dataSource.removeEventListener("statuschanged", statusChanged, false);
                        }

                        this._clearInsertedItems();
                        this._itemsManager.release();
                    }

                    if (this._itemsCountPromise) {
                        this._itemsCountPromise.cancel();
                        this._itemsCountPromise = null;
                    }
                    this._cachedCount = _Constants._UNINITIALIZED;

                    this._itemsManager = _ItemsManager._createItemsManager(
                        this._dataSource,
                        this._renderWithoutReuse.bind(this),
                        notificationHandler,
                        {
                            ownerElement: this._element,
                            versionManager: this._versionManager,
                            indexInView: function (index) {
                                return (index >= that.indexOfFirstVisible && index <= that.indexOfLastVisible);
                            },
                            viewCallsReady: true,
                            profilerId: this._id
                        });

                    if (this._dataSource.addEventListener) {
                        this._dataSource.addEventListener("statuschanged", statusChanged, false);
                    }

                    this._selection._selected.set(ranges);
                },

                _processReload: function () {
                    this._affectedRange.addAll();

                    // Inform scroll view that a realization pass is coming so that it doesn't restart the
                    // realization pass itself.
                    this._cancelAsyncViewWork(true);
                    if (this._currentMode()._dragging) {
                        this._currentMode()._clearDragProperties();
                    }

                    this._groupFocusCache.clear();
                    this._selection._reset();
                    this._updateItemsManager();
                    this._pendingLayoutReset = true;
                    this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.low, this.scrollPosition);
                },

                _createUpdater: function ListView_createUpdater() {
                    if (!this._updater) {
                        if (this.itemDataSource._isVirtualizedDataSource) {
                            // VDS doesn't support the _updateAffectedRange notification so assume
                            // that everything needs to be relaid out.
                            this._affectedRange.addAll();
                        }
                        this._versionManager.beginUpdating();

                        // Inform scroll view that a realization pass is coming so that it doesn't restart the
                        // realization pass itself.
                        this._cancelAsyncViewWork();

                        var updater = {
                            changed: false,
                            elements: {},
                            selectionFirst: {},
                            selectionLast: {},
                            selectionHandles: {},
                            oldSelectionPivot: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            newSelectionPivot: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            removed: [],
                            selectionChanged: false,
                            oldFocus: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            newFocus: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            hadKeyboardFocus: this._hasKeyboardFocus,
                            itemsMoved: false,
                            lastVisible: this.indexOfLastVisible,
                            updateDrag: false,
                            movesCount: 0,
                            insertsCount: 0,
                            deletesCount: 0,
                            countDifference: 0
                        };

                        this._view.items.each(function (index, item, itemData) {
                            updater.elements[uniqueID(item)] = {
                                item: item,
                                container: itemData.container,
                                itemBox: itemData.itemBox,
                                index: index,
                                newIndex: index,
                                itemsManagerRecord: itemData.itemsManagerRecord,
                                detached: itemData.detached
                            };
                        });

                        var selection = this._selection._selected._ranges;
                        for (var i = 0, len = selection.length; i < len; i++) {
                            var range = selection[i];
                            var newRange = {
                                newFirstIndex: selection[i].firstIndex,
                                oldFirstIndex: selection[i].firstIndex,
                                newLastIndex: selection[i].lastIndex,
                                oldLastIndex: selection[i].lastIndex
                            };
                            updater.selectionFirst[newRange.oldFirstIndex] = newRange;
                            updater.selectionLast[newRange.oldLastIndex] = newRange;
                            updater.selectionHandles[range.firstPromise.handle] = newRange.oldFirstIndex;
                            updater.selectionHandles[range.lastPromise.handle] = newRange.oldLastIndex;
                        }
                        updater.oldSelectionPivot = this._selection._pivot;
                        updater.newSelectionPivot = updater.oldSelectionPivot;
                        updater.oldFocus = this._selection._getFocused();
                        updater.newFocus = this._selection._getFocused();

                        this._updater = updater;
                    }
                },

                _synchronize: function ListView_synchronize() {
                    var updater = this._updater;
                    this._updater = null;
                    this._groupsChanged = false;

                    this._countDifference = this._countDifference || 0;

                    if (updater && updater.changed) {
                        if (updater.itemsMoved) {
                            this._layout.itemsMoved && this._layout.itemsMoved();
                        }
                        if (updater.removed.length) {
                            this._layout.itemsRemoved && this._layout.itemsRemoved(updater.removed.map(function (node) {
                                return node.itemBox;
                            }));
                        }

                        if (updater.itemsMoved || updater.removed.length || Object.keys(this._insertedItems).length) {
                            this._layout.setupAnimations && this._layout.setupAnimations();
                        }

                        if (this._currentMode().onDataChanged) {
                            this._currentMode().onDataChanged();
                        }

                        var newSelection = [];
                        for (var i in updater.selectionFirst) {
                            if (updater.selectionFirst.hasOwnProperty(i)) {
                                var range = updater.selectionFirst[i];
                                updater.selectionChanged = updater.selectionChanged || ((range.newLastIndex - range.newFirstIndex) !== (range.oldLastIndex - range.oldFirstIndex));
                                if (range.newFirstIndex <= range.newLastIndex) {
                                    newSelection.push({
                                        firstIndex: range.newFirstIndex,
                                        lastIndex: range.newLastIndex
                                    });
                                }
                            }
                        }

                        if (updater.selectionChanged) {
                            var newSelectionItems = new _SelectionManager._Selection(this, newSelection);

                            // We do not allow listeners to cancel the selection
                            // change because the cancellation would also have to
                            // prevent the deletion.
                            this._selection._fireSelectionChanging(newSelectionItems);
                            this._selection._selected.set(newSelection);
                            this._selection._fireSelectionChanged();
                            newSelectionItems.clear();
                        } else {
                            this._selection._selected.set(newSelection);
                        }
                        this._selection._updateCount(this._cachedCount);
                        updater.newSelectionPivot = Math.min(this._cachedCount - 1, updater.newSelectionPivot);
                        this._selection._pivot = (updater.newSelectionPivot >= 0 ? updater.newSelectionPivot : _Constants._INVALID_INDEX);

                        if (updater.newFocus.type !== _UI.ObjectType.groupHeader) {
                            updater.newFocus.index = Math.max(0, Math.min(this._cachedCount - 1, updater.newFocus.index));
                        }
                        this._selection._setFocused(updater.newFocus, this._selection._keyboardFocused());

                        // If there are 2 edits before layoutAnimations runs we need to merge the 2 groups of modified elements.
                        // For example:
                        // If you start with A, B, C and add item Z to the beginning you will have
                        // [ -1 -> 0, 0 -> 1, 1 -> 2, 2 -> 3]
                        // However before layout is called an insert of Y to the beginning also happens you should get
                        // [ -1 -> 0, -1 -> 1, 0 -> 2, 1 -> 3, 2 -> 4]
                        var previousModifiedElements = this._modifiedElements || [];
                        var previousModifiedElementsHash = {};
                        this._modifiedElements = [];
                        this._countDifference += updater.countDifference;

                        for (i = 0; i < previousModifiedElements.length; i++) {
                            var modifiedElement = previousModifiedElements[i];
                            if (modifiedElement.newIndex === -1) {
                                this._modifiedElements.push(modifiedElement);
                            } else {
                                previousModifiedElementsHash[modifiedElement.newIndex] = modifiedElement;
                            }
                        }

                        for (i = 0; i < updater.removed.length; i++) {
                            var removed = updater.removed[i];
                            var modifiedElement = previousModifiedElementsHash[removed.index];
                            if (modifiedElement) {
                                delete previousModifiedElementsHash[removed.index];
                            } else {
                                modifiedElement = {
                                    oldIndex: removed.index
                                };
                            }
                            modifiedElement.newIndex = -1;
                            if (!modifiedElement._removalHandled) {
                                modifiedElement._itemBox = removed.itemBox;
                                modifiedElement._containerStripe = removed.containerStripe;
                            }
                            this._modifiedElements.push(modifiedElement);
                        }

                        var insertedKeys = Object.keys(this._insertedItems);
                        for (i = 0; i < insertedKeys.length; i++) {
                            this._modifiedElements.push({
                                oldIndex: -1,
                                newIndex: this._insertedItems[insertedKeys[i]].index
                            });
                        }

                        this._writeProfilerMark("_synchronize:update_modifiedElements,StartTM");
                        var newItems = {};
                        for (i in updater.elements) {
                            if (updater.elements.hasOwnProperty(i)) {
                                var elementInfo = updater.elements[i];
                                newItems[elementInfo.newIndex] = {
                                    element: elementInfo.item,
                                    container: elementInfo.container,
                                    itemBox: elementInfo.itemBox,
                                    itemsManagerRecord: elementInfo.itemsManagerRecord,
                                    detached: elementInfo.detached
                                };

                                var modifiedElement = previousModifiedElementsHash[elementInfo.index];
                                if (modifiedElement) {
                                    delete previousModifiedElementsHash[elementInfo.index];
                                    modifiedElement.newIndex = elementInfo.newIndex;
                                } else {
                                    modifiedElement = {
                                        oldIndex: elementInfo.index,
                                        newIndex: elementInfo.newIndex
                                    };
                                }
                                modifiedElement.moved = elementInfo.moved;
                                this._modifiedElements.push(modifiedElement);
                            }
                        }
                        this._writeProfilerMark("_synchronize:update_modifiedElements,StopTM");

                        var previousIndices = Object.keys(previousModifiedElementsHash);
                        for (i = 0; i < previousIndices.length; i++) {
                            var key = previousIndices[i];
                            var modifiedElement = previousModifiedElementsHash[key];
                            if (modifiedElement.oldIndex !== -1) {
                                this._modifiedElements.push(modifiedElement);
                            }
                        }

                        this._view.items._itemData = newItems;
                        if (updater.updateDrag && this._currentMode()._dragging) {
                            if (!this._currentMode()._draggingUnselectedItem) {
                                this._currentMode()._dragInfo = this._selection;
                            } else if (updater.newDragInfo) {
                                this._currentMode()._dragInfo = updater.newDragInfo;
                            }
                            this._currentMode().fireDragUpdateEvent();
                        }

                        // If the focused item is removed, or the item we're trying to focus on has been moved before we can focus on it,
                        // we need to update our focus request to get the item from the appropriate index.
                        if (updater.focusedItemRemoved || (this._focusRequest && (updater.oldFocus.index !== updater.newFocus.index) || (updater.oldFocus.type !== updater.newFocus.type))) {
                            this._itemFocused = false;
                            this._setFocusOnItem(this._selection._getFocused());
                        } else if (updater.newFocusedItem) {
                            // We need to restore the value of _hasKeyboardFocus because a changed item
                            // gets removed from the DOM at the time of the notification. If the item
                            // had focus at that time, then our value of _hasKeyboardFocus will have changed.
                            this._hasKeyboardFocus = updater.hadKeyboardFocus;
                            this._itemFocused = false;
                            this._setFocusOnItem(this._selection._getFocused());
                        }

                        var that = this;
                        return this._groups.synchronizeGroups().then(function () {
                            if (updater.newFocus.type === _UI.ObjectType.groupHeader) {
                                updater.newFocus.index = Math.min(that._groups.length() - 1, updater.newFocus.index);

                                if (updater.newFocus.index < 0) {
                                    // An empty listview has currentFocus = item 0
                                    updater.newFocus = { type: _UI.ObjectType.item, index: 0 };
                                }
                                that._selection._setFocused(updater.newFocus, that._selection._keyboardFocused());
                            }

                            that._versionManager.endUpdating();
                            if (updater.deletesCount > 0) {
                                that._updateDeleteWrapperSize();
                            }

                            return that._view.updateTree(that._cachedCount, that._countDifference, that._modifiedElements);
                        }).then(function () {
                            return that._lastScrollPosition;
                        });
                    } else {
                        this._countDifference += updater ? updater.countDifference : 0;

                        var that = this;
                        return this._groups.synchronizeGroups().then(function ListView_synchronizeGroups_success_groupsChanged() {
                            updater && that._versionManager.endUpdating();
                            return that._view.updateTree(that._cachedCount, that._countDifference, that._modifiedElements);
                        }).then(function () {
                            return that.scrollPosition;
                        });
                    }
                },

                _updateDeleteWrapperSize: function ListView_updateDeleteWrapperSize(clear) {
                    var sizeProperty = this._horizontal() ? "width" : "height";
                    this._deleteWrapper.style["min-" + sizeProperty] = (clear ? 0 : this.scrollPosition + this._getViewportSize()[sizeProperty]) + "px";
                },

                _verifyRealizationNeededForChange: function ListView_skipRealization() {
                    // If the updater indicates that only deletes occurred, and we have not lost a viewport full of items,
                    // we skip realizing all the items and appending new ones until other action causes a full realize (e.g. scrolling).
                    //
                    var skipRealization = false;
                    var totalInViewport = (this._view.lastIndexDisplayed || 0) - (this._view.firstIndexDisplayed || 0);
                    var deletesOnly = this._updater && this._updater.movesCount === 0 && this._updater.insertsCount === 0 && this._updater.deletesCount > 0 && (this._updater.deletesCount === Math.abs(this._updater.countDifference));
                    if (deletesOnly && this._updater.elements) {
                        // Verify that the indices of the elements in the updater are within the valid range
                        var elementsKeys = Object.keys(this._updater.elements);
                        for (var i = 0, len = elementsKeys.length; i < len; i++) {
                            var element = this._updater.elements[elementsKeys[i]];
                            var delta = element.index - element.newIndex;
                            if (delta < 0 || delta > this._updater.deletesCount) {
                                deletesOnly = false;
                                break;
                            }
                        }
                    }
                    this._view.deletesWithoutRealize = this._view.deletesWithoutRealize || 0;

                    if (deletesOnly &&
                        (this._view.lastIndexDisplayed < this._view.end - totalInViewport) &&
                        (this._updater.deletesCount + this._view.deletesWithoutRealize) < totalInViewport) {

                        skipRealization = true;
                        this._view.deletesWithoutRealize += Math.abs(this._updater.countDifference);
                        this._writeProfilerMark("skipping realization on delete,info");
                    } else {
                        this._view.deletesWithoutRealize = 0;
                    }
                    this._view._setSkipRealizationForChange(skipRealization);
                },

                _update: function ListView_update() {
                    this._writeProfilerMark("update,StartTM");
                    if (this._ifZombieDispose()) { return; }

                    this._updateJob = null;

                    var that = this;
                    if (this._versionManager.noOutstandingNotifications) {
                        if (this._updater || this._groupsChanged) {
                            this._cancelAsyncViewWork();
                            this._verifyRealizationNeededForChange();
                            this._synchronize().then(function (scrollbarPos) {
                                that._writeProfilerMark("update,StopTM");
                                that._batchViewUpdates(_Constants._ViewChange.relayout, _Constants._ScrollToPriority.low, scrollbarPos).complete();
                            });
                        } else {
                            // Even if nothing important changed we need to restart aria work if it was canceled.
                            this._batchViewUpdates(_Constants._ViewChange.relayout, _Constants._ScrollToPriority.low, this._lastScrollPosition).complete();
                        }
                    }
                },

                _scheduleUpdate: function ListView_scheduleUpdate() {
                    if (!this._updateJob) {
                        var that = this;
                        // Batch calls to _scheduleUpdate
                        this._updateJob = Scheduler.schedulePromiseHigh(null, "WinJS.UI.ListView._update").then(function () {
                            if (that._updateJob) {
                                that._update();
                            }
                        });

                        this._raiseViewLoading();
                    }
                },

                _createGroupsContainer: function () {
                    if (this._groups) {
                        this._groups.cleanUp();
                    }

                    if (this._groupDataSource) {
                        this._groups = new _GroupsContainer._UnvirtualizedGroupsContainer(this, this._groupDataSource);
                    } else {
                        this._groups = new _GroupsContainer._NoGroups(this);
                    }
                },

                _createLayoutSite: function () {
                    var that = this;
                    return Object.create({
                        invalidateLayout: function () {
                            that._pendingLayoutReset = true;
                            var orientationChanged = (that._layout.orientation === "horizontal") !== that._horizontalLayout;
                            that._affectedRange.addAll();
                            that._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.low, orientationChanged ? 0 : that.scrollPosition, false, true);
                        },
                        itemFromIndex: function (itemIndex) {
                            return that._itemsManager._itemPromiseAtIndex(itemIndex);
                        },
                        groupFromIndex: function (groupIndex) {
                            if (that._groupsEnabled()) {
                                return groupIndex < that._groups.length() ? that._groups.group(groupIndex).userData : null;
                            } else {
                                return { key: "-1" };
                            }
                        },
                        groupIndexFromItemIndex: function (itemIndex) {
                            // If itemIndex < 0, returns 0. If itemIndex is larger than the
                            // biggest item index, returns the last group index.
                            itemIndex = Math.max(0, itemIndex);
                            return that._groups.groupFromItem(itemIndex);
                        },
                        renderItem: function (itemPromise) {
                            return Promise._cancelBlocker(that._itemsManager._itemFromItemPromise(itemPromise)).then(function (element) {
                                if (element) {
                                    var record = that._itemsManager._recordFromElement(element);
                                    if (record.pendingReady) {
                                        record.pendingReady();
                                    }

                                    element = element.cloneNode(true);

                                    _ElementUtilities.addClass(element, _Constants._itemClass);

                                    var itemBox = _Global.document.createElement("div");
                                    _ElementUtilities.addClass(itemBox, _Constants._itemBoxClass);
                                    itemBox.appendChild(element);

                                    var container = _Global.document.createElement("div");
                                    _ElementUtilities.addClass(container, _Constants._containerClass);
                                    container.appendChild(itemBox);

                                    return container;
                                } else {
                                    return Promise.cancel;
                                }
                            });
                        },
                        renderHeader: function (group) {
                            var rendered = _ItemsManager._normalizeRendererReturn(that.groupHeaderTemplate(Promise.wrap(group)));
                            return rendered.then(function (headerRecord) {
                                _ElementUtilities.addClass(headerRecord.element, _Constants._headerClass);
                                var container = _Global.document.createElement("div");
                                _ElementUtilities.addClass(container, _Constants._headerContainerClass);
                                container.appendChild(headerRecord.element);
                                return container;
                            });
                        },
                        readyToMeasure: function () {
                            that._getViewportLength();
                            that._getCanvasMargins();
                        },
                        _isZombie: function () {
                            return that._isZombie();
                        },
                        _writeProfilerMark: function (text) {
                            that._writeProfilerMark(text);
                        }
                    }, {
                        _itemsManager: {
                            enumerable: true,
                            get: function () {
                                return that._itemsManager;
                            }
                        },
                        rtl: {
                            enumerable: true,
                            get: function () {
                                return that._rtl();
                            }
                        },
                        surface: {
                            enumerable: true,
                            get: function () {
                                return that._canvas;
                            }
                        },
                        viewport: {
                            enumerable: true,
                            get: function () {
                                return that._viewport;
                            }
                        },
                        scrollbarPos: {
                            enumerable: true,
                            get: function () {
                                return that.scrollPosition;
                            }
                        },
                        viewportSize: {
                            enumerable: true,
                            get: function () {
                                return that._getViewportSize();
                            }
                        },
                        loadingBehavior: {
                            enumerable: true,
                            get: function () {
                                return that.loadingBehavior;
                            }
                        },
                        animationsDisabled: {
                            enumerable: true,
                            get: function () {
                                return that._animationsDisabled();
                            }
                        },
                        tree: {
                            enumerable: true,
                            get: function () {
                                return that._view.tree;
                            }
                        },
                        realizedRange: {
                            enumerable: true,
                            get: function () {
                                return {
                                    firstPixel: Math.max(0, that.scrollPosition - 2 * that._getViewportLength()),
                                    lastPixel: that.scrollPosition + 3 * that._getViewportLength() - 1
                                };
                            }
                        },
                        visibleRange: {
                            enumerable: true,
                            get: function () {
                                return {
                                    firstPixel: that.scrollPosition,
                                    lastPixel: that.scrollPosition + that._getViewportLength() - 1
                                };
                            }
                        },
                        itemCount: {
                            enumerable: true,
                            get: function () {
                                return that._itemsCount();
                            }
                        },
                        groupCount: {
                            enumerable: true,
                            get: function () {
                                return that._groups.length();
                            }
                        }
                    });
                },

                _initializeLayout: function () {
                    this._affectedRange.addAll();
                    var layoutSite = this._createLayoutSite();
                    this._layout.initialize(layoutSite, this._groupsEnabled());
                    return this._layout.orientation === "horizontal";
                },

                _resetLayoutOrientation: function ListView_resetLayoutOrientation(resetScrollPosition) {
                    if (this._horizontalLayout) {
                        this._startProperty = "left";
                        this._scrollProperty = "scrollLeft";
                        this._scrollLength = "scrollWidth";
                        this._deleteWrapper.style.minHeight = "";
                        _ElementUtilities.addClass(this._viewport, _Constants._horizontalClass);
                        _ElementUtilities.removeClass(this._viewport, _Constants._verticalClass);
                        if (resetScrollPosition) {
                            this._viewport.scrollTop = 0;
                        }
                    } else {
                        this._startProperty = "top";
                        this._scrollProperty = "scrollTop";
                        this._scrollLength = "scrollHeight";
                        this._deleteWrapper.style.minWidth = "";
                        _ElementUtilities.addClass(this._viewport, _Constants._verticalClass);
                        _ElementUtilities.removeClass(this._viewport, _Constants._horizontalClass);
                        if (resetScrollPosition) {
                            _ElementUtilities.setScrollPosition(this._viewport, {scrollLeft: 0});
                        }
                    }
                },

                _resetLayout: function ListView_resetLayout() {
                    this._pendingLayoutReset = false;
                    this._affectedRange.addAll();
                    if (this._layout) {
                        this._layout.uninitialize();
                        this._horizontalLayout = this._initializeLayout();
                        this._resetLayoutOrientation();
                    }
                },

                _updateLayout: function ListView_updateLayout(layoutObject) {
                    var hadPreviousLayout = false;
                    if (this._layout) {
                        // The old layout is reset here in case it was in the middle of animating when the layout got changed. Reset
                        // will cancel out the animations.
                        this._cancelAsyncViewWork(true);
                        this._layout.uninitialize();
                        hadPreviousLayout = true;
                    }

                    var layoutImpl;
                    if (layoutObject && typeof layoutObject.type === "function") {
                        var LayoutCtor = requireSupportedForProcessing(layoutObject.type);
                        layoutImpl = new LayoutCtor(layoutObject);
                    } else if (layoutObject && (layoutObject.initialize)) {
                        layoutImpl = layoutObject;
                    } else {
                        layoutImpl = new _Layouts.GridLayout(layoutObject);
                    }

                    hadPreviousLayout && this._resetCanvas();

                    this._layoutImpl = layoutImpl;
                    this._layout = new _Layouts._LayoutWrapper(layoutImpl);

                    hadPreviousLayout && this._unsetFocusOnItem();
                    this._setFocusOnItem({ type: _UI.ObjectType.item, index: 0 });
                    this._selection._setFocused({ type: _UI.ObjectType.item, index: 0 });

                    this._horizontalLayout = this._initializeLayout();
                    this._resetLayoutOrientation(hadPreviousLayout);

                    if (hadPreviousLayout) {
                        this._canvas.style.width = this._canvas.style.height = "";
                    }
                },

                _currentMode: function ListView_currentMode() {
                    return this._mode;
                },

                _setSwipeClass: function ListView_setSwipeClass() {
                    // We apply an -ms-touch-action style to block panning and swiping from occurring at the same time. It is
                    // possible to pan in the margins between items and on lists without the swipe ability.
                    // Phone does not support swipe; therefore, we don't add them swipeable CSS class.
                    if (!_BaseUtils.isPhone && ((this._currentMode() instanceof _BrowseMode._SelectionMode && this._selectionAllowed() && this._swipeBehavior === _UI.SwipeBehavior.select) ||
                        this._dragSource || this._reorderable)) {
                        this._swipeable = true;
                        _ElementUtilities.addClass(this._element, _Constants._swipeableClass);
                    } else {
                        this._swipeable = false;
                        _ElementUtilities.removeClass(this._element, _Constants._swipeableClass);
                    }
                    var dragEnabled = (this.itemsDraggable || this.itemsReorderable),
                        swipeSelectEnabled = (this._selectionAllowed() && this._swipeBehavior === _UI.SwipeBehavior.select),
                        swipeEnabled = this._swipeable;

                    this._view.items.each(function (index, item, itemData) {
                        if (itemData.itemBox) {
                            var dragDisabledOnItem = _ElementUtilities.hasClass(item, _Constants._nonDraggableClass),
                                selectionDisabledOnItem = _ElementUtilities.hasClass(item, _Constants._nonSelectableClass),
                                nonSwipeable = _ElementUtilities.hasClass(itemData.itemBox, _Constants._nonSwipeableClass);
                            itemData.itemBox.draggable = (dragEnabled && !dragDisabledOnItem);
                            if (!swipeEnabled && nonSwipeable) {
                                _ElementUtilities.removeClass(itemData.itemBox, _Constants._nonSwipeableClass);
                            } else if (swipeEnabled) {
                                var makeNonSwipeable = (dragEnabled && !swipeSelectEnabled && dragDisabledOnItem) ||
                                                        (swipeSelectEnabled && !dragEnabled && selectionDisabledOnItem) ||
                                                        (dragDisabledOnItem && selectionDisabledOnItem);
                                if (makeNonSwipeable && !nonSwipeable) {
                                    _ElementUtilities.addClass(itemData.itemBox, _Constants._nonSwipeableClass);
                                } else if (!makeNonSwipeable && nonSwipeable) {
                                    _ElementUtilities.removeClass(itemData.itemBox, _Constants._nonSwipeableClass);
                                }
                            }
                            var makeNonSelectable = _BaseUtils.isPhone && selectionDisabledOnItem;
                            _ElementUtilities[makeNonSelectable ? "addClass" : "removeClass"](itemData.itemBox, _Constants._nonSelectableClass);
                        }
                    });
                },

                _resizeViewport: function ListView_resizeViewport() {
                    this._viewportWidth = _Constants._UNINITIALIZED;
                    this._viewportHeight = _Constants._UNINITIALIZED;
                },

                _onMSElementResize: function ListView_onResize() {
                    this._writeProfilerMark("_onMSElementResize,info");
                    Scheduler.schedule(function ListView_async_msElementResize() {
                        if (this._isZombie()) { return; }
                        // If these values are uninitialized there is already a realization pass pending.
                        if (this._viewportWidth !== _Constants._UNINITIALIZED && this._viewportHeight !== _Constants._UNINITIALIZED) {
                            var newWidth = this._element.offsetWidth,
                                newHeight = this._element.offsetHeight;
                            if ((this._previousWidth !== newWidth) || (this._previousHeight !== newHeight)) {

                                this._writeProfilerMark("resize (" + this._previousWidth + "x" + this._previousHeight + ") => (" + newWidth + "x" + newHeight + "),info");

                                this._previousWidth = newWidth;
                                this._previousHeight = newHeight;

                                this._resizeViewport();

                                var that = this;
                                this._affectedRange.addAll();
                                this._batchViewUpdates(_Constants._ViewChange.relayout, _Constants._ScrollToPriority.low, function () {
                                    return {
                                        position: that.scrollPosition,
                                        direction: "right"
                                    };
                                });
                            }
                        }
                    }, Scheduler.Priority.max, this, "WinJS.UI.ListView._onMSElementResize");
                },

                _onFocusIn: function ListView_onFocusIn(event) {
                    this._hasKeyboardFocus = true;
                    var that = this;
                    function moveFocusToItem(keyboardFocused) {
                        that._changeFocus(that._selection._getFocused(), true, false, false, keyboardFocused);
                    }
                    // The keyboardEventsHelper object can get focus through three ways: We give it focus explicitly, in which case _shouldHaveFocus will be true,
                    // or the item that should be focused isn't in the viewport, so keyboard focus could only go to our helper. The third way happens when
                    // focus was already on the keyboard helper and someone alt tabbed away from and eventually back to the app. In the second case, we want to navigate
                    // back to the focused item via changeFocus(). In the third case, we don't want to move focus to a real item. We differentiate between cases two and three
                    // by checking if the flag _keyboardFocusInbound is true. It'll be set to true when the tab manager notifies us about the user pressing tab
                    // to move focus into the listview.
                    if (event.target === this._keyboardEventsHelper) {
                        if (!this._keyboardEventsHelper._shouldHaveFocus && this._keyboardFocusInbound) {
                            moveFocusToItem(true);
                        } else {
                            this._keyboardEventsHelper._shouldHaveFocus = false;
                        }
                    } else if (event.target === this._element) {
                        // If someone explicitly calls .focus() on the listview element, we need to route focus to the item that should be focused
                        moveFocusToItem();
                    } else {
                        if (this._mode.inboundFocusHandled) {
                            this._mode.inboundFocusHandled = false;
                            return;
                        }

                        // In the event that .focus() is explicitly called on an element, we need to figure out what item got focus and set our state appropriately.
                        var items = this._view.items,
                            entity = {},
                            element = this._groups.headerFrom(event.target),
                            winItem = null;
                        if (element) {
                            entity.type = _UI.ObjectType.groupHeader;
                            entity.index = this._groups.index(element);
                        } else {
                            entity.index = items.index(event.target);
                            entity.type = _UI.ObjectType.item;
                            element = items.itemBoxAt(entity.index);
                            winItem = items.itemAt(entity.index);
                        }

                        // In the old layouts, index will be -1 if a group header got focus
                        if (entity.index !== _Constants._INVALID_INDEX) {
                            if (this._keyboardFocusInbound || this._selection._keyboardFocused()) {
                                if ((entity.type === _UI.ObjectType.groupHeader && event.target === element) ||
                                        (entity.type === _UI.ObjectType.item && event.target.parentNode === element)) {
                                    // For items we check the parentNode because the srcElement is win-item and element is win-itembox,
                                    // for header, they should both be the win-groupheader
                                    this._drawFocusRectangle(element);
                                }
                            }
                            if (this._tabManager.childFocus !== element && this._tabManager.childFocus !== winItem) {
                                this._selection._setFocused(entity, this._keyboardFocusInbound || this._selection._keyboardFocused());
                                this._keyboardFocusInbound = false;
                                element = entity.type === _UI.ObjectType.groupHeader ? element : items.itemAt(entity.index);
                                this._tabManager.childFocus = element;

                                if (that._updater) {
                                    var elementInfo = that._updater.elements[uniqueID(element)],
                                        focusIndex = entity.index;
                                    if (elementInfo && elementInfo.newIndex) {
                                        focusIndex = elementInfo.newIndex;
                                    }

                                    // Note to not set old and new focus to the same object
                                    that._updater.oldFocus = { type: entity.type, index: focusIndex };
                                    that._updater.newFocus = { type: entity.type, index: focusIndex };
                                }
                            }
                        }
                    }
                },

                _onFocusOut: function ListView_onFocusOut(event) {
                    if (this._disposed) {
                        return;
                    }

                    this._hasKeyboardFocus = false;
                    this._itemFocused = false;
                    var element = this._view.items.itemBoxFrom(event.target) || this._groups.headerFrom(event.target);
                    if (element) {
                        this._clearFocusRectangle(element);
                    }
                },

                _onMSManipulationStateChanged: function ListView_onMSManipulationStateChanged(ev) {
                    var that = this;
                    function done() {
                        that._manipulationEndSignal = null;
                    }

                    this._manipulationState = ev.currentState;
                    that._writeProfilerMark("_onMSManipulationStateChanged state(" + ev.currentState + "),info");

                    if (this._manipulationState !== _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED && !this._manipulationEndSignal) {
                        this._manipulationEndSignal = new _Signal();
                        this._manipulationEndSignal.promise.done(done, done);
                    }

                    if (this._manipulationState === _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED) {
                        this._manipulationEndSignal.complete();
                    }
                },

                _pendingScroll: false,

                _onScroll: function ListView_onScroll() {
                    if (!this._zooming && !this._pendingScroll) {
                        this._checkScroller();
                    }
                },

                _checkScroller: function ListView_checkScroller() {
                    if (this._isZombie()) { return; }

                    var currentScrollPosition = this._viewportScrollPosition;
                    if (currentScrollPosition !== this._lastScrollPosition) {
                        this._pendingScroll = _BaseUtils._requestAnimationFrame(this._checkScroller.bind(this));

                        currentScrollPosition = Math.max(0, currentScrollPosition);
                        var direction =  this._scrollDirection(currentScrollPosition);

                        this._lastScrollPosition = currentScrollPosition;
                        this._raiseViewLoading(true);
                        var that = this;
                        this._view.onScroll(function () {
                            return {
                                position: that._lastScrollPosition,
                                direction: direction
                            };
                        },
                            this._manipulationEndSignal ? this._manipulationEndSignal.promise : Promise.timeout(_Constants._DEFERRED_SCROLL_END));
                    } else {
                        this._pendingScroll = null;
                    }
                },

                _scrollDirection: function ListView_scrollDirectionl(currentScrollPosition) {
                    var currentDirection = currentScrollPosition < this._lastScrollPosition ? "left" : "right";

                    // When receiving a sequence of scroll positions, the browser may give us one scroll position
                    // which doesn't fit (e.g. the scroll positions were increasing but just this one is decreasing).
                    // To filter out this noise, _scrollDirection and _direction are stubborn -- they only change
                    // when we've received a sequence of 3 scroll position which all indicate the same direction.
                    return currentDirection === this._lastDirection ? currentDirection : this._direction;
                },

                _onTabEnter: function ListView_onTabEnter() {
                    this._keyboardFocusInbound = true;
                },

                _onTabExit: function ListView_onTabExit() {
                    this._keyboardFocusInbound = false;
                },

                _onPropertyChange: function ListView_onPropertyChange(list) {
                    var that = this;
                    list.forEach(function (record) {
                        var dirChanged = false;
                        if (record.attributeName === "dir") {
                            dirChanged = true;
                        } else if (record.attributeName === "style") {
                            dirChanged = (that._cachedStyleDir !== record.target.style.direction);
                        }
                        if (dirChanged) {
                            that._cachedStyleDir = record.target.style.direction;
                            that._cachedRTL = null;
                            _ElementUtilities[that._rtl() ? "addClass" : "removeClass"](that._element, _Constants._rtlListViewClass);

                            that._lastScrollPosition = 0;
                            that._viewportScrollPosition = 0;

                            that.forceLayout();
                        }

                        if (record.attributeName === "tabIndex") {
                            var newTabIndex = that._element.tabIndex;
                            if (newTabIndex >= 0) {
                                that._view.items.each(function (index, item) {
                                    item.tabIndex = newTabIndex;
                                });
                                that._tabIndex = newTabIndex;
                                that._tabManager.tabIndex = newTabIndex;
                                that._element.tabIndex = -1;
                            }
                        }
                    });
                },

                _getCanvasMargins: function ListView_getCanvasMargins() {
                    if (!this._canvasMargins) {
                        this._canvasMargins = _Layouts._getMargins(this._canvas);
                    }
                    return this._canvasMargins;
                },

                // Convert between canvas coordinates and viewport coordinates
                _convertCoordinatesByCanvasMargins: function ListView_convertCoordinatesByCanvasMargins(coordinates, conversionCallback) {
                    function fix(field, offset) {
                        if (coordinates[field] !== undefined) {
                            coordinates[field] = conversionCallback(coordinates[field], offset);
                        }
                    }

                    var offset;
                    if (this._horizontal()) {
                        offset = this._getCanvasMargins()[this._rtl() ? "right" : "left"];
                        fix("left", offset);
                    } else {
                        offset = this._getCanvasMargins().top;
                        fix("top", offset);
                    }
                    fix("begin", offset);
                    fix("end", offset);

                    return coordinates;
                },
                _convertFromCanvasCoordinates: function ListView_convertFromCanvasCoordinates(coordinates) {
                    return this._convertCoordinatesByCanvasMargins(coordinates, function (coordinate, canvasMargin) {
                        return coordinate + canvasMargin;
                    });
                },
                _convertToCanvasCoordinates: function ListView_convertToCanvasCoordinates(coordinates) {
                    return this._convertCoordinatesByCanvasMargins(coordinates, function (coordinate, canvasMargin) {
                        return coordinate - canvasMargin;
                    });
                },

                // Methods in the site interface used by ScrollView
                _getViewportSize: function ListView_getViewportSize() {
                    if (this._viewportWidth === _Constants._UNINITIALIZED || this._viewportHeight === _Constants._UNINITIALIZED) {
                        this._viewportWidth = Math.max(0, _ElementUtilities.getContentWidth(this._element));
                        this._viewportHeight = Math.max(0, _ElementUtilities.getContentHeight(this._element));
                        this._writeProfilerMark("viewportSizeDetected width:" + this._viewportWidth + " height:" + this._viewportHeight);

                        this._previousWidth = this._element.offsetWidth;
                        this._previousHeight = this._element.offsetHeight;
                    }
                    return {
                        width: this._viewportWidth,
                        height: this._viewportHeight
                    };
                },

                _itemsCount: function ListView_itemsCount() {
                    var that = this;
                    function cleanUp() {
                        that._itemsCountPromise = null;
                    }

                    if (this._cachedCount !== _Constants._UNINITIALIZED) {
                        return Promise.wrap(this._cachedCount);
                    } else {
                        var retVal;
                        if (!this._itemsCountPromise) {
                            retVal = this._itemsCountPromise = this._itemsManager.dataSource.getCount().then(
                                function (count) {
                                    if (count === _UI.CountResult.unknown) {
                                        count = 0;
                                    }
                                    that._cachedCount = count;
                                    that._selection._updateCount(that._cachedCount);
                                    return count;
                                },
                                function () {
                                    return Promise.cancel;
                                }
                            );

                            this._itemsCountPromise.then(cleanUp, cleanUp);
                        } else {
                            retVal = this._itemsCountPromise;
                        }

                        return retVal;
                    }
                },

                _isSelected: function ListView_isSelected(index) {
                    return this._selection._isIncluded(index);
                },

                _LoadingState: {
                    itemsLoading: "itemsLoading",
                    viewPortLoaded: "viewPortLoaded",
                    itemsLoaded: "itemsLoaded",
                    complete: "complete"
                },

                _raiseViewLoading: function ListView_raiseViewLoading(scrolling) {
                    if (this._loadingState !== this._LoadingState.itemsLoading) {
                        this._scrolling = !!scrolling;
                    }
                    this._setViewState(this._LoadingState.itemsLoading);
                },

                _raiseViewComplete: function ListView_raiseViewComplete() {
                    if (!this._disposed && !this._view.animating) {
                        this._setViewState(this._LoadingState.complete);
                    }
                },

                _setViewState: function ListView_setViewState(state) {
                    if (state !== this._loadingState) {
                        var detail = null;
                        // We can go from any state to itemsLoading but the rest of the states transitions must follow this
                        // order: itemsLoading -> viewPortLoaded -> itemsLoaded -> complete.
                        // Recursively set the previous state until you hit the current state or itemsLoading.
                        switch (state) {
                            case this._LoadingState.viewPortLoaded:
                                if (!this._scheduledForDispose) {
                                    scheduleForDispose(this);
                                    this._scheduledForDispose = true;
                                }
                                this._setViewState(this._LoadingState.itemsLoading);
                                break;

                            case this._LoadingState.itemsLoaded:
                                detail = {
                                    scrolling: this._scrolling
                                };
                                this._setViewState(this._LoadingState.viewPortLoaded);
                                break;

                            case this._LoadingState.complete:
                                this._setViewState(this._LoadingState.itemsLoaded);
                                this._updateDeleteWrapperSize(true);
                                break;
                        }

                        this._writeProfilerMark("loadingStateChanged:" + state + ",info");
                        this._loadingState = state;
                        var eventObject = _Global.document.createEvent("CustomEvent");
                        eventObject.initCustomEvent("loadingstatechanged", true, false, detail);
                        this._element.dispatchEvent(eventObject);
                    }
                },

                _createTemplates: function ListView_createTemplates() {

                    function createNodeWithClass(className, skipAriaHidden) {
                        var element = _Global.document.createElement("div");
                        element.className = className;
                        if (!skipAriaHidden) {
                            element.setAttribute("aria-hidden", true);
                        }
                        return element;
                    }

                    this._itemBoxTemplate = createNodeWithClass(_Constants._itemBoxClass, true);
                },

                // Methods used by SelectionManager
                _updateSelection: function ListView_updateSelection() {
                    var indices = this._selection.getIndices(),
                        selectAll = this._selection.isEverything(),
                        selectionMap = {};

                    if (!selectAll) {
                        for (var i = 0, len = indices.length ; i < len; i++) {
                            var index = indices[i];
                            selectionMap[index] = true;
                        }
                    }

                    this._view.items.each(function (index, element, itemData) {
                        if (itemData.itemBox && !_ElementUtilities.hasClass(itemData.itemBox, _Constants._swipeClass)) {
                            var selected = selectAll || !!selectionMap[index];
                            _ItemEventsHandler._ItemEventsHandler.renderSelection(itemData.itemBox, element, selected, true);
                            if (itemData.container) {
                                _ElementUtilities[selected ? "addClass" : "removeClass"](itemData.container, _Constants._selectedClass);
                            }
                        }
                    });
                },

                _getViewportLength: function ListView_getViewportLength() {
                    return this._getViewportSize()[this._horizontal() ? "width" : "height"];
                },

                _horizontal: function ListView_horizontal() {
                    return this._horizontalLayout;
                },

                _rtl: function ListView_rtl() {
                    if (typeof this._cachedRTL !== "boolean") {
                        this._cachedRTL = _Global.getComputedStyle(this._element, null).direction === "rtl";
                    }
                    return this._cachedRTL;
                },

                _showProgressBar: function ListView_showProgressBar(parent, x, y) {
                    var progressBar = this._progressBar,
                        progressStyle = progressBar.style;

                    if (!progressBar.parentNode) {
                        this._fadingProgressBar = false;
                        if (this._progressIndicatorDelayTimer) {
                            this._progressIndicatorDelayTimer.cancel();
                        }
                        var that = this;
                        this._progressIndicatorDelayTimer = Promise.timeout(_Constants._LISTVIEW_PROGRESS_DELAY).then(function () {
                            if (!that._isZombie()) {
                                parent.appendChild(progressBar);
                                AnimationHelper.fadeInElement(progressBar);
                                that._progressIndicatorDelayTimer = null;
                            }
                        });
                    }
                    progressStyle[this._rtl() ? "right" : "left"] = x;
                    progressStyle.top = y;
                },

                _hideProgressBar: function ListView_hideProgressBar() {
                    if (this._progressIndicatorDelayTimer) {
                        this._progressIndicatorDelayTimer.cancel();
                        this._progressIndicatorDelayTimer = null;
                    }

                    var progressBar = this._progressBar;
                    if (progressBar.parentNode && !this._fadingProgressBar) {
                        this._fadingProgressBar = true;
                        var that = this;
                        AnimationHelper.fadeOutElement(progressBar).then(function () {
                            if (progressBar.parentNode) {
                                progressBar.parentNode.removeChild(progressBar);
                            }
                            that._fadingProgressBar = false;
                        });
                    }
                },

                _getPanAxis: function () {
                    return this._horizontal() ? "horizontal" : "vertical";
                },

                _configureForZoom: function (isZoomedOut, isCurrentView, triggerZoom) {
                    if (_BaseUtils.validation) {
                        if (!this._view.realizePage || typeof this._view.begin !== "number") {
                            throw new _ErrorFromName("WinJS.UI.ListView.NotCompatibleWithSemanticZoom", strings.notCompatibleWithSemanticZoom);
                        }
                    }

                    this._isZoomedOut = isZoomedOut;
                    this._disableEntranceAnimation = !isCurrentView;

                    this._isCurrentZoomView = isCurrentView;

                    this._triggerZoom = triggerZoom;
                },

                _setCurrentItem: function (x, y) {
                    // First, convert the position into canvas coordinates
                    if (this._rtl()) {
                        x = this._viewportWidth - x;
                    }
                    if (this._horizontal()) {
                        x += this.scrollPosition;
                    } else {
                        y += this.scrollPosition;
                    }

                    var result = this._view.hitTest(x, y),
                        entity = { type: result.type ? result.type : _UI.ObjectType.item, index: result.index };
                    if (entity.index >= 0) {
                        if (this._hasKeyboardFocus) {
                            this._changeFocus(entity, true, false, true);
                        } else {
                            this._changeFocusPassively(entity);
                        }
                    }
                },

                _getCurrentItem: function () {
                    var focused = this._selection._getFocused();

                    if (focused.type === _UI.ObjectType.groupHeader) {
                        focused = { type: _UI.ObjectType.item, index: this._groups.group(focused.index).startIndex };
                    }

                    if (typeof focused.index !== "number") {
                        // Do a hit-test in the viewport center
                        this._setCurrentItem(0.5 * this._viewportWidth, 0.5 * this._viewportHeight);

                        focused = this._selection._getFocused();
                    }

                    var that = this;
                    var promisePosition = this._getItemOffsetPosition(focused.index).
                            then(function (posCanvas) {
                                var scrollOffset = that._canvasStart;

                                posCanvas[that._startProperty] += scrollOffset;

                                return posCanvas;
                            });

                    return Promise.join({
                        item: this._dataSource.itemFromIndex(focused.index),
                        position: promisePosition
                    });
                },

                _animateItemsForPhoneZoom: function () {
                    var containersOnScreen = [],
                        itemRows = [],
                        promises = [],
                        minRow = Number.MAX_VALUE,
                        that = this;

                    for (var i = this._view.firstIndexDisplayed, len = Math.min(this._cachedCount, this._view.lastIndexDisplayed + 1) ; i < len; i++) {
                        promises.push(this._view.waitForEntityPosition({ type: _UI.ObjectType.item, index: i }).then(function () {
                            containersOnScreen.push(that._view.items.containerAt(i));
                            var itemRow = 0;
                            if (that.layout._getItemPosition) {
                                var itemPosition = that.layout._getItemPosition(i);
                                if (itemPosition.row) {
                                    itemRow = itemPosition.row;
                                }
                            }
                            itemRows.push(itemRow);
                            minRow = Math.min(itemRow, minRow);
                        }));
                    }

                    function rowStaggerDelay(minRow, rows, delayBetweenRows) {
                        return function (index) {
                            return ((rows[index] - minRow) * delayBetweenRows);
                        };
                    }

                    function clearTransform() {
                        for (var i = 0, len = containersOnScreen.length; i < len; i++) {
                            containersOnScreen[i].style[transformNames.scriptName] = "";
                        }
                    }

                    return Promise.join(promises).then(function () {
                        return (containersOnScreen.length === 0 ? Promise.wrap() : _TransitionAnimation.executeTransition(
                            containersOnScreen,
                            {
                                property: transformNames.cssName,
                                delay: rowStaggerDelay(minRow, itemRows, 30),
                                duration: 100,
                                timing: "ease-in-out",
                                from: (!that._isCurrentZoomView ? "rotateX(-90deg)" : "rotateX(0deg)"),
                                to: (!that._isCurrentZoomView ? "rotateX(0deg)" : "rotateX(90deg)")
                            })).then(clearTransform, clearTransform);
                    }).then(clearTransform, clearTransform);
                },

                _beginZoom: function () {
                    this._zooming = true;
                    var zoomPromise = null;

                    if (_BaseUtils.isPhone) {
                        if (this._isZoomedOut) {
                            this._zoomAnimationPromise && this._zoomAnimationPromise.cancel();
                            // The phone's zoom animations need to be handled in two different spots.
                            // When zooming out, we need to wait for _positionItem to be called so that we have the right items in view before trying to animate.
                            // When zooming back in, the items we need to animate are already ready (and _positionItem won't be called on the zoomed out view, since it's
                            // being dismissed), so we play the animation in _beginZoom.
                            if (this._isCurrentZoomView) {
                                var that = this;
                                var animationComplete = function animationComplete() {
                                    that._zoomAnimationPromise = null;
                                };
                                this._zoomAnimationPromise = zoomPromise = this._animateItemsForPhoneZoom().then(animationComplete, animationComplete);
                            } else {
                                this._zoomAnimationPromise = new _Signal();
                                zoomPromise = this._zoomAnimationPromise.promise;
                            }
                        }
                    } else {
                        // Hide the scrollbar and extend the content beyond the ListView viewport
                        var horizontal = this._horizontal(),
                            scrollOffset = -this.scrollPosition;

                        _ElementUtilities.addClass(this._viewport, horizontal ? _Constants._zoomingXClass : _Constants._zoomingYClass);
                        this._canvasStart = scrollOffset;
                        _ElementUtilities.addClass(this._viewport, horizontal ? _Constants._zoomingYClass : _Constants._zoomingXClass);
                    }
                    return zoomPromise;
                },

                _positionItem: function (item, position) {
                    var that = this;
                    function positionItemAtIndex(index) {
                        return that._getItemOffsetPosition(index).then(function positionItemAtIndex_then_ItemOffsetPosition(posCanvas) {
                            var horizontal = that._horizontal(),
                                canvasSize = that._viewport[horizontal ? "scrollWidth" : "scrollHeight"],
                                viewportSize = (horizontal ? that._viewportWidth : that._viewportHeight),
                                headerSizeProp = (horizontal ? "headerContainerWidth" : "headerContainerHeight"),
                                layoutSizes = that.layout._sizes,
                                headerSize = 0,
                                scrollPosition;

                            if (layoutSizes && layoutSizes[headerSizeProp]) {
                                headerSize = layoutSizes[headerSizeProp];
                            }
                            // Align the leading edge
                            var start = (_BaseUtils.isPhone ? headerSize : position[that._startProperty]),
                                startMax = viewportSize - (horizontal ? posCanvas.width : posCanvas.height);

                            // Ensure the item ends up within the viewport
                            start = Math.max(0, Math.min(startMax, start));

                            scrollPosition = posCanvas[that._startProperty] - start;


                            // Ensure the scroll position is valid
                            var adjustedScrollPosition = Math.max(0, Math.min(canvasSize - viewportSize, scrollPosition)),
                            scrollAdjustment = adjustedScrollPosition - scrollPosition;

                            scrollPosition = adjustedScrollPosition;

                            var entity = { type: _UI.ObjectType.item, index: index };
                            if (that._hasKeyboardFocus) {
                                that._changeFocus(entity, true);
                            } else {
                                that._changeFocusPassively(entity);
                            }

                            that._raiseViewLoading(true);
                            // Since a zoom is in progress, adjust the div position
                            if (!_BaseUtils.isPhone) {
                                var scrollOffset = -scrollPosition;
                                that._canvasStart = scrollOffset;
                            } else {
                                that._viewportScrollPosition = scrollPosition;
                            }
                            that._view.realizePage(scrollPosition, true);

                            if (_BaseUtils.isPhone && that._isZoomedOut) {
                                var animationComplete = function animationComplete() {
                                    that._zoomAnimationPromise && that._zoomAnimationPromise.complete && that._zoomAnimationPromise.complete();
                                    that._zoomAnimationPromise = null;
                                };
                                that._animateItemsForPhoneZoom().then(animationComplete, animationComplete);
                            }
                            return (
                                horizontal ?
                            { x: scrollAdjustment, y: 0 } :
                            { x: 0, y: scrollAdjustment }
                            );
                        });
                    }

                    var itemIndex = 0;
                    if (item) {
                        itemIndex = (this._isZoomedOut ? item.groupIndexHint : item.firstItemIndexHint);
                    }

                    if (typeof itemIndex === "number") {
                        return positionItemAtIndex(itemIndex);
                    } else {
                        // We'll need to obtain the index from the data source
                        var itemPromise;

                        var key = (this._isZoomedOut ? item.groupKey : item.firstItemKey);
                        if (typeof key === "string" && this._dataSource.itemFromKey) {
                            itemPromise = this._dataSource.itemFromKey(key, (this._isZoomedOut ? {
                                groupMemberKey: item.key,
                                groupMemberIndex: item.index
                            } : null));
                        } else {
                            var description = (this._isZoomedOut ? item.groupDescription : item.firstItemDescription);

                            if (_BaseUtils.validation) {
                                if (description === undefined) {
                                    throw new _ErrorFromName("WinJS.UI.ListView.InvalidItem", strings.listViewInvalidItem);
                                }
                            }

                            itemPromise = this._dataSource.itemFromDescription(description);
                        }

                        return itemPromise.then(function (item) {
                            return positionItemAtIndex(item.index);
                        });
                    }
                },

                _endZoom: function (isCurrentView) {
                    if (this._isZombie()) {
                        return;
                    }

                    // Crop the content again and re-enable the scrollbar
                    if (!_BaseUtils.isPhone) {
                        var scrollOffset = this._canvasStart;

                        _ElementUtilities.removeClass(this._viewport, _Constants._zoomingYClass);
                        _ElementUtilities.removeClass(this._viewport, _Constants._zoomingXClass);
                        this._canvasStart = 0;
                        this._viewportScrollPosition = -scrollOffset;
                    }
                    this._disableEntranceAnimation = !isCurrentView;
                    this._isCurrentZoomView = isCurrentView;
                    this._zooming = false;
                    this._view.realizePage(this.scrollPosition, false);
                },

                _getItemOffsetPosition: function (index) {
                    var that = this;
                    return this._getItemOffset({ type: _UI.ObjectType.item, index: index }).then(function (position) {
                        return that._ensureFirstColumnRange(_UI.ObjectType.item).then(function () {
                            position = that._correctRangeInFirstColumn(position, _UI.ObjectType.item);
                            position = that._convertFromCanvasCoordinates(position);
                            if (that._horizontal()) {
                                position.left = position.begin;
                                position.width = position.end - position.begin;
                                position.height = position.totalHeight;
                            } else {
                                position.top = position.begin;
                                position.height = position.end - position.begin;
                                position.width = position.totalWidth;
                            }
                            return position;
                        });
                    });
                },

                _groupRemoved: function (key) {
                    this._groupFocusCache.deleteGroup(key);
                },

                _updateFocusCache: function (itemIndex) {
                    if (this._updateFocusCacheItemRequest) {
                        this._updateFocusCacheItemRequest.cancel();
                    }

                    var that = this;
                    this._updateFocusCacheItemRequest = this._view.items.requestItem(itemIndex).then(function () {
                        that._updateFocusCacheItemRequest = null;
                        var itemData = that._view.items.itemDataAt(itemIndex);
                        var groupIndex = that._groups.groupFromItem(itemIndex);
                        var groupKey = that._groups.group(groupIndex).key;
                        if (itemData.itemsManagerRecord.item) {
                            that._groupFocusCache.updateCache(groupKey, itemData.itemsManagerRecord.item.key, itemIndex);
                        }
                    });
                },

                _changeFocus: function (newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused) {
                    if (this._isZombie()) {
                        return;
                    }
                    var targetItem;
                    if (newFocus.type !== _UI.ObjectType.groupHeader) {
                        targetItem = this._view.items.itemAt(newFocus.index);
                        if (!skipSelection && targetItem && _ElementUtilities.hasClass(targetItem, _Constants._nonSelectableClass)) {
                            skipSelection = true;
                        }
                        this._updateFocusCache(newFocus.index);
                    } else {
                        var group = this._groups.group(newFocus.index);
                        targetItem = group && group.header;
                    }
                    this._unsetFocusOnItem(!!targetItem);
                    this._hasKeyboardFocus = true;
                    this._selection._setFocused(newFocus, keyboardFocused);
                    if (!skipEnsureVisible) {
                        this.ensureVisible(newFocus);
                    }

                    // _selection.set() needs to know which item has focus so we
                    // must call it after _selection._setFocused() has been called.
                    if (!skipSelection && this._selectFocused(ctrlKeyDown)) {
                        this._selection.set(newFocus.index);
                    }
                    this._setFocusOnItem(newFocus);
                },

                // Updates ListView's internal focus state and, if ListView currently has focus, moves
                // Trident's focus to the item at index newFocus.
                // Similar to _changeFocus except _changeFocusPassively doesn't:
                // - ensure the item is selected or visible
                // - set Trident's focus to newFocus when ListView doesn't have focus
                _changeFocusPassively: function (newFocus) {
                    var targetItem;
                    if (newFocus.type !== _UI.ObjectType.groupHeader) {
                        targetItem = this._view.items.itemAt(newFocus.index);
                        this._updateFocusCache(newFocus.index);
                    } else {
                        var group = this._groups.group(newFocus.index);
                        targetItem = group && group.header;
                    }
                    this._unsetFocusOnItem(!!targetItem);
                    this._selection._setFocused(newFocus);
                    this._setFocusOnItem(newFocus);
                },

                _drawFocusRectangle: function (item) {
                    if (_ElementUtilities.hasClass(item, _Constants._headerClass)) {
                        _ElementUtilities.addClass(item, _Constants._itemFocusClass);
                    } else {
                        var itemBox = this._view.items.itemBoxFrom(item);
                        if (itemBox.querySelector("." + _Constants._itemFocusOutlineClass)) {
                            return;
                        }
                        _ElementUtilities.addClass(itemBox, _Constants._itemFocusClass);
                        var outline = _Global.document.createElement("div");
                        outline.className = _Constants._itemFocusOutlineClass;
                        itemBox.appendChild(outline);
                    }
                },

                _clearFocusRectangle: function (item) {
                    if (!item || this._isZombie()) {
                        return;
                    }

                    var itemBox = this._view.items.itemBoxFrom(item);
                    if (itemBox) {
                        _ElementUtilities.removeClass(itemBox, _Constants._itemFocusClass);
                        var outline = itemBox.querySelector("." + _Constants._itemFocusOutlineClass);
                        if (outline) {
                            outline.parentNode.removeChild(outline);
                        }
                    } else {
                        var header = this._groups.headerFrom(item);
                        if (header) {
                            _ElementUtilities.removeClass(header, _Constants._itemFocusClass);
                        }
                    }
                },

                _defaultInvoke: function (entity) {
                    if (this._isZoomedOut || (_BaseUtils.isPhone && this._triggerZoom && entity.type === _UI.ObjectType.groupHeader)) {
                        this._changeFocusPassively(entity);
                        this._triggerZoom();
                    }
                },

                _selectionAllowed: function ListView_selectionAllowed(itemIndex) {
                    var item = (itemIndex !== undefined ? this.elementFromIndex(itemIndex) : null),
                        itemSelectable = !(item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass));
                    return itemSelectable && this._selectionMode !== _UI.SelectionMode.none;
                },

                _multiSelection: function ListView_multiSelection() {
                    return this._selectionMode === _UI.SelectionMode.multi;
                },

                _selectOnTap: function ListView_selectOnTap() {
                    return this._tap === _UI.TapBehavior.toggleSelect || this._tap === _UI.TapBehavior.directSelect;
                },

                _selectFocused: function ListView_selectFocused(ctrlKeyDown) {
                    return this._tap === _UI.TapBehavior.directSelect && this._selectionMode === _UI.SelectionMode.multi && !ctrlKeyDown;
                },

                _dispose: function () {
                    if (!this._disposed) {
                        this._disposed = true;
                        var clear = function clear(e) {
                            e && (e.textContent = "");
                        };

                        _ElementUtilities._resizeNotifier.unsubscribe(this._element, this._onMSElementResizeBound);

                        this._batchingViewUpdates && this._batchingViewUpdates.cancel();

                        this._view && this._view._dispose && this._view._dispose();
                        this._mode && this._mode._dispose && this._mode._dispose();
                        this._groups && this._groups._dispose && this._groups._dispose();
                        this._selection && this._selection._dispose && this._selection._dispose();
                        this._layout && this._layout.uninitialize && this._layout.uninitialize();

                        this._itemsCountPromise && this._itemsCountPromise.cancel();
                        this._versionManager && this._versionManager._dispose();
                        this._clearInsertedItems();
                        this._itemsManager && this._itemsManager.release();
                        this._zoomAnimationPromise && this._zoomAnimationPromise.cancel();

                        clear(this._viewport);
                        clear(this._canvas);
                        clear(this._canvasProxy);

                        this._versionManager = null;
                        this._view = null;
                        this._mode = null;
                        this._element = null;
                        this._viewport = null;
                        this._itemsManager = null;
                        this._canvas = null;
                        this._canvasProxy = null;
                        this._itemsCountPromise = null;
                        this._scrollToFunctor = null;

                        var index = controlsToDispose.indexOf(this);
                        if (index >= 0) {
                            controlsToDispose.splice(index, 1);
                        }
                    }
                },

                _isZombie: function () {
                    // determines if this ListView is no longer in the DOM or has been cleared
                    //
                    return this._disposed || !(this.element.firstElementChild && _Global.document.body.contains(this.element));
                },

                _ifZombieDispose: function () {
                    var zombie = this._isZombie();
                    if (zombie && !this._disposed) {
                        scheduleForDispose(this);
                    }
                    return zombie;
                },

                _animationsDisabled: function () {
                    if (this._viewportWidth === 0 || this._viewportHeight === 0) {
                        return true;
                    }

                    return !_TransitionAnimation.isAnimationEnabled();
                },

                _fadeOutViewport: function ListView_fadeOutViewport() {
                    var that = this;
                    return new Promise(function (complete) {
                        if (that._animationsDisabled()) {
                            complete();
                            return;
                        }

                        if (!that._fadingViewportOut) {
                            if (that._waitingEntranceAnimationPromise) {
                                that._waitingEntranceAnimationPromise.cancel();
                                that._waitingEntranceAnimationPromise = null;
                            }
                            var eventDetails = that._fireAnimationEvent(ListViewAnimationType.contentTransition);
                            that._firedAnimationEvent = true;
                            var overflowStyle = _BaseUtils._browserStyleEquivalents["overflow-style"];
                            var animatedElement = overflowStyle ? that._viewport : that._canvas;
                            if (!eventDetails.prevented) {
                                that._fadingViewportOut = true;
                                if (overflowStyle) {
                                    animatedElement.style[overflowStyle.scriptName] = "none";
                                }
                                AnimationHelper.fadeOutElement(animatedElement).then(function () {
                                    if (that._isZombie()) { return; }
                                    that._fadingViewportOut = false;
                                    animatedElement.style.opacity = 1.0;
                                    complete();
                                });
                            } else {
                                that._disableEntranceAnimation = true;
                                animatedElement.style.opacity = 1.0;
                                complete();
                            }
                        }
                    });
                },

                _animateListEntrance: function (firstTime) {
                    var eventDetails = {
                        prevented: false,
                        animationPromise: Promise.wrap()
                    };
                    var that = this;
                    var overflowStyle = _BaseUtils._browserStyleEquivalents["overflow-style"];
                    var animatedElement = overflowStyle ? this._viewport : this._canvas;
                    function resetViewOpacity() {
                        that._canvas.style.opacity = 1;
                        if (overflowStyle) {
                            animatedElement.style[overflowStyle.scriptName] = "";
                        }
                    }

                    if (this._disableEntranceAnimation || this._animationsDisabled()) {
                        resetViewOpacity();
                        if (this._waitingEntranceAnimationPromise) {
                            this._waitingEntranceAnimationPromise.cancel();
                            this._waitingEntranceAnimationPromise = null;
                        }
                        return Promise.wrap();
                    }

                    if (!this._firedAnimationEvent) {
                        eventDetails = this._fireAnimationEvent(ListViewAnimationType.entrance);
                    } else {
                        this._firedAnimationEvent = false;
                    }

                    // The listview does not have an entrance animation on Phone
                    if (eventDetails.prevented || _BaseUtils.isPhone) {
                        resetViewOpacity();
                        return Promise.wrap();
                    } else {
                        if (this._waitingEntranceAnimationPromise) {
                            this._waitingEntranceAnimationPromise.cancel();
                        }
                        this._canvas.style.opacity = 0;
                        if (overflowStyle) {
                            animatedElement.style[overflowStyle.scriptName] = "none";
                        }
                        this._waitingEntranceAnimationPromise = eventDetails.animationPromise.then(function () {
                            if (!that._isZombie()) {
                                that._canvas.style.opacity = 1;
                                return AnimationHelper.animateEntrance(animatedElement, firstTime).then(function () {
                                    if (!that._isZombie()) {
                                        if (overflowStyle) {
                                            animatedElement.style[overflowStyle.scriptName] = "";
                                        }
                                        that._waitingEntranceAnimationPromise = null;
                                    }
                                });
                            }
                        });
                        return this._waitingEntranceAnimationPromise;
                    }
                },

                _fireAnimationEvent: function (type) {
                    var animationEvent = _Global.document.createEvent("CustomEvent"),
                        animationPromise = Promise.wrap();

                    animationEvent.initCustomEvent("contentanimating", true, true, {
                        type: type
                    });
                    if (type === ListViewAnimationType.entrance) {
                        animationEvent.detail.setPromise = function (delayPromise) {
                            animationPromise = delayPromise;
                        };
                    }
                    var prevented = !this._element.dispatchEvent(animationEvent);
                    return {
                        prevented: prevented,
                        animationPromise: animationPromise
                    };
                },

                // If they don't yet exist, create the start and end markers which are required
                // by Narrator's aria-flowto/flowfrom implementation. They mark the start and end
                // of ListView's set of out-of-order DOM elements and so they must surround the
                // headers and groups in the DOM.
                _createAriaMarkers: function ListView_createAriaMarkers() {
                    if (!this._viewport.getAttribute("aria-label")) {
                        this._viewport.setAttribute("aria-label", strings.listViewViewportAriaLabel);
                    }

                    if (!this._ariaStartMarker) {
                        this._ariaStartMarker = _Global.document.createElement("div");
                        this._ariaStartMarker.id = uniqueID(this._ariaStartMarker);
                        this._viewport.insertBefore(this._ariaStartMarker, this._viewport.firstElementChild);
                    }
                    if (!this._ariaEndMarker) {
                        this._ariaEndMarker = _Global.document.createElement("div");
                        this._ariaEndMarker.id = uniqueID(this._ariaEndMarker);
                        this._viewport.appendChild(this._ariaEndMarker);
                    }
                },

                // If the ListView is in static mode, then the roles of the list and items should be "list" and "listitem", respectively.
                // Otherwise, the roles should be "listbox" and "option." If the ARIA roles are out of sync with the ListView's
                // static/interactive state, update the role of the ListView and the role of each realized item.
                _updateItemsAriaRoles: function ListView_updateItemsAriaRoles() {
                    var that = this;
                    var listRole = this._element.getAttribute("role"),
                        expectedListRole,
                        expectedItemRole;

                    if (this._currentMode().staticMode()) {
                        expectedListRole = "list";
                        expectedItemRole = "listitem";
                    } else {
                        expectedListRole = "listbox";
                        expectedItemRole = "option";
                    }

                    if (listRole !== expectedListRole || this._itemRole !== expectedItemRole) {
                        this._element.setAttribute("role", expectedListRole);
                        this._itemRole = expectedItemRole;
                        this._view.items.each(function (index, itemElement) {
                            itemElement.setAttribute("role", that._itemRole);
                        });
                    }
                },

                _updateGroupHeadersAriaRoles: function ListView_updateGroupHeadersAriaRoles() {
                    var headerRole = (this.groupHeaderTapBehavior === _UI.GroupHeaderTapBehavior.none ? "separator" : "link");
                    if (this._headerRole !== headerRole) {
                        this._headerRole = headerRole;
                        for (var i = 0, len = this._groups.length() ; i < len; i++) {
                            var header = this._groups.group(i).header;
                            if (header) {
                                header.setAttribute("role", this._headerRole);
                            }
                        }
                    }
                },

                // Avoids unnecessary UIA selection events by only updating aria-selected if it has changed
                _setAriaSelected: function ListView_setAriaSelected(itemElement, isSelected) {
                    var ariaSelected = (itemElement.getAttribute("aria-selected") === "true");

                    if (isSelected !== ariaSelected) {
                        itemElement.setAttribute("aria-selected", isSelected);
                    }
                },

                _setupAriaSelectionObserver: function ListView_setupAriaSelectionObserver(item) {
                    if (!item._mutationObserver) {
                        this._mutationObserver.observe(item, { attributes: true, attributeFilter: ["aria-selected"] });
                        item._mutationObserver = true;
                    }
                },

                _itemPropertyChange: function ListView_itemPropertyChange(list) {
                    if (this._isZombie()) { return; }

                    var that = this;
                    var singleSelection = that._selectionMode === _UI.SelectionMode.single;
                    var changedItems = [];
                    var unselectableItems = [];

                    function revertAriaSelected(items) {
                        items.forEach(function (entry) {
                            entry.item.setAttribute("aria-selected", !entry.selected);
                        });
                    }

                    for (var i = 0, len = list.length; i < len; i++) {
                        var item = list[i].target;
                        var itemBox = that._view.items.itemBoxFrom(item);
                        var selected = item.getAttribute("aria-selected") === "true";

                        // Only respond to aria-selected changes coming from UIA. This check
                        // relies on the fact that, in renderSelection, we update the selection
                        // visual before aria-selected.
                        if (itemBox && (selected !== _ElementUtilities._isSelectionRendered(itemBox))) {
                            var index = that._view.items.index(itemBox);
                            var entry = { index: index, item: item, selected: selected };
                            (that._selectionAllowed(index) ? changedItems : unselectableItems).push(entry);
                        }
                    }
                    if (changedItems.length > 0) {
                        var signal = new _Signal();
                        that.selection._synchronize(signal).then(function () {
                            var newSelection = that.selection._cloneSelection();

                            changedItems.forEach(function (entry) {
                                if (entry.selected) {
                                    newSelection[singleSelection ? "set" : "add"](entry.index);
                                } else {
                                    newSelection.remove(entry.index);
                                }
                            });

                            return that.selection._set(newSelection);
                        }).then(function (approved) {
                            if (!that._isZombie() && !approved) {
                                // A selectionchanging event handler rejected the selection change
                                revertAriaSelected(changedItems);
                            }

                            signal.complete();
                        });
                    }

                    revertAriaSelected(unselectableItems);
                },

                _groupsEnabled: function () {
                    return !!this._groups.groupDataSource;
                },

                _getItemPosition: function ListView_getItemPosition(entity, preserveItemsBlocks) {
                    var that = this;
                    return this._view.waitForEntityPosition(entity).then(function () {
                        var container = (entity.type === _UI.ObjectType.groupHeader ? that._view._getHeaderContainer(entity.index) : that._view.getContainer(entity.index));
                        if (container) {
                            that._writeProfilerMark("WinJS.UI.ListView:getItemPosition,info");
                            var itemsBlockFrom;
                            var itemsBlockTo;
                            if (that._view._expandedRange) {
                                itemsBlockFrom = that._view._expandedRange.first.index;
                                itemsBlockTo = that._view._expandedRange.last.index;
                            } else {
                                preserveItemsBlocks = false;
                            }

                            if (entity.type === _UI.ObjectType.item) {
                                preserveItemsBlocks = !!preserveItemsBlocks;
                                preserveItemsBlocks &= that._view._ensureContainerInDOM(entity.index);
                            } else {
                                preserveItemsBlocks = false;
                            }

                            var margins = that._getItemMargins(entity.type),
                                position = {
                                    left: (that._rtl() ? getOffsetRight(container) - margins.right : container.offsetLeft - margins.left),
                                    top: container.offsetTop - margins.top,
                                    totalWidth: _ElementUtilities.getTotalWidth(container),
                                    totalHeight: _ElementUtilities.getTotalHeight(container),
                                    contentWidth: _ElementUtilities.getContentWidth(container),
                                    contentHeight: _ElementUtilities.getContentHeight(container)
                                };

                            if (preserveItemsBlocks) {
                                that._view._forceItemsBlocksInDOM(itemsBlockFrom, itemsBlockTo + 1);
                            }

                            // When a translation is applied to the surface during zooming, offsetLeft includes the canvas margins, so the left/top position will already be in canvas coordinates.
                            // If we're not zooming, we need to convert the position to canvas coordinates before returning.
                            return (that._zooming && that._canvasStart !== 0 ? position : that._convertToCanvasCoordinates(position));
                        } else {
                            return Promise.cancel;
                        }
                    });
                },

                _getItemOffset: function ListView_getItemOffset(entity, preserveItemsBlocks) {
                    var that = this;
                    return this._getItemPosition(entity, preserveItemsBlocks).then(function (pos) {
                        // _getItemOffset also includes the right/bottom margin of the previous row/column of items, so that ensureVisible/indexOfFirstVisible will jump such that
                        // the previous row/column is directly offscreen of the target item.
                        var margins = that._getItemMargins(entity.type);
                        if (that._horizontal()) {
                            var rtl = that._rtl();
                            pos.begin = pos.left - margins[rtl ? "left" : "right"];
                            pos.end = pos.left + pos.totalWidth + margins[rtl ? "right" : "left"];
                        } else {
                            pos.begin = pos.top - margins.bottom;
                            pos.end = pos.top + pos.totalHeight + margins.top;
                        }
                        return pos;
                    });
                },

                _getItemMargins: function ListView_getItemMargins(type) {
                    type = type || _UI.ObjectType.item;
                    var that = this;
                    var calculateMargins = function (className) {
                        var item = that._canvas.querySelector("." + className),
                                cleanup;

                        if (!item) {
                            item = _Global.document.createElement("div"),
                            _ElementUtilities.addClass(item, className);
                            that._viewport.appendChild(item);

                            cleanup = true;
                        }

                        var margins = _Layouts._getMargins(item);

                        if (cleanup) {
                            that._viewport.removeChild(item);
                        }
                        return margins;
                    };

                    if (type !== _UI.ObjectType.groupHeader) {
                        return (this._itemMargins ? this._itemMargins : (this._itemMargins = calculateMargins(_Constants._containerClass)));
                    } else {
                        return (this._headerMargins ? this._headerMargins : (this._headerMargins = calculateMargins(_Constants._headerContainerClass)));
                    }
                },

                _fireAccessibilityAnnotationCompleteEvent: function ListView_fireAccessibilityAnnotationCompleteEvent(firstIndex, lastIndex, firstHeaderIndex, lastHeaderIndex) {
                    // This event is fired in these cases:
                    // - When the data source count is 0, it is fired after the aria markers have been
                    //   updated. The event detail will be { firstIndex: -1, lastIndex: -1 }.
                    // - When the data source count is non-zero, it is fired after the aria markers
                    //   have been updated and the deferred work for the aria properties on the items
                    //   has completed.
                    // - When an item gets focus. The event will be { firstIndex: indexOfItem, lastIndex: indexOfItem }.
                    var detail = {
                        firstIndex: firstIndex,
                        lastIndex: lastIndex,
                        firstHeaderIndex: (+firstHeaderIndex) || -1,
                        lastHeaderIndex: (+lastHeaderIndex) || -1
                    };
                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent("accessibilityannotationcomplete", true, false, detail);
                    this._element.dispatchEvent(eventObject);
                },

                _ensureFirstColumnRange: function ListView_ensureFirstColumnRange(type) {
                    var propName = (type === _UI.ObjectType.item ? "_firstItemRange" : "_firstHeaderRange");
                    if (!this[propName]) {
                        var that = this;
                        return this._getItemOffset({ type: type, index: 0 }, true).then(function (firstRange) {
                            that[propName] = firstRange;
                        });
                    } else {
                        return Promise.wrap();
                    }
                },

                _correctRangeInFirstColumn: function ListView_correctRangeInFirstColumn(range, type) {
                    var firstRange = (type === _UI.ObjectType.groupHeader ? this._firstHeaderRange : this._firstItemRange);
                    if (firstRange.begin === range.begin) {
                        if (this._horizontal()) {
                            range.begin = -this._getCanvasMargins()[this._rtl() ? "right" : "left"];
                        } else {
                            range.begin = -this._getCanvasMargins().top;
                        }
                    }
                    return range;
                },

                _updateContainers: function ListView_updateContainers(groups, count, containersDelta, modifiedElements) {
                    var that = this;

                    var maxContainers = this._view.containers.length + (containersDelta > 0 ? containersDelta : 0);

                    var newTree = [];
                    var newKeyToGroupIndex = {};
                    var newContainers = [];
                    var removedContainers = [];

                    function createContainer() {
                        var element = _Global.document.createElement("div");
                        element.className = _Constants._containerClass;
                        return element;
                    }

                    function updateExistingGroupWithBlocks(groupNode, firstItem, newSize) {
                        if (firstItem + newSize > maxContainers) {
                            newSize = maxContainers - firstItem;
                        }

                        var itemsContainer = groupNode.itemsContainer,
                            blocks = itemsContainer.itemsBlocks,
                            blockSize = that._view._blockSize,
                            lastBlock = blocks.length ? blocks[blocks.length - 1] : null,
                            indexOfNextGroupItem = blocks.length ? (blocks.length - 1) * blockSize + lastBlock.items.length : 0,
                            delta = newSize - indexOfNextGroupItem,
                            children;

                        if (delta > 0) {
                            // Insert new containers.
                            var toAdd = delta,
                                sizeOfOldLastBlock;
                            if (lastBlock && lastBlock.items.length < blockSize) {
                                // 1) Add containers to the last itemsblock in the group if it's not already full.
                                var emptySpotsToFill = Math.min(toAdd, blockSize - lastBlock.items.length);
                                sizeOfOldLastBlock = lastBlock.items.length;

                                var containersMarkup = _Helpers._stripedContainers(emptySpotsToFill, indexOfNextGroupItem);

                                _SafeHtml.insertAdjacentHTMLUnsafe(lastBlock.element, "beforeend", containersMarkup);
                                children = lastBlock.element.children;

                                for (var j = 0; j < emptySpotsToFill; j++) {
                                    lastBlock.items.push(children[sizeOfOldLastBlock + j]);
                                }

                                toAdd -= emptySpotsToFill;
                            }
                            indexOfNextGroupItem = blocks.length * blockSize;

                            // 2) Generate as many full itemblocks of containers as we can.                        
                            var newBlocksCount = Math.floor(toAdd / blockSize),
                                markup = "",
                                firstBlockFirstItemIndex = indexOfNextGroupItem,
                                secondBlockFirstItemIndex = indexOfNextGroupItem + blockSize;

                            var pairOfItemBlocks = [
                                // Use pairs to ensure that the container striping pattern is maintained regardless if blockSize is even or odd.
                                "<div class='win-itemsblock'>" + _Helpers._stripedContainers(blockSize, firstBlockFirstItemIndex) + "</div>",
                                "<div class='win-itemsblock'>" + _Helpers._stripedContainers(blockSize, secondBlockFirstItemIndex) + "</div>"
                            ];
                            markup = _Helpers._repeat(pairOfItemBlocks, newBlocksCount);
                            indexOfNextGroupItem += (newBlocksCount * blockSize);

                            // 3) Generate and partially fill, one last itemblock if there are any remaining containers to add.
                            var sizeOfNewLastBlock = toAdd % blockSize;
                            if (sizeOfNewLastBlock) {
                                markup += "<div class='win-itemsblock'>" + _Helpers._stripedContainers(sizeOfNewLastBlock, indexOfNextGroupItem) + "</div>";
                                indexOfNextGroupItem += sizeOfNewLastBlock;
                                newBlocksCount++;
                            }

                            var blocksTemp = _Global.document.createElement("div");
                            _SafeHtml.setInnerHTMLUnsafe(blocksTemp, markup);
                            var children = blocksTemp.children;

                            for (var j = 0; j < newBlocksCount; j++) {
                                var block = children[j],
                                    blockNode = {
                                        element: block,
                                        items: _Helpers._nodeListToArray(block.children)
                                    };
                                blocks.push(blockNode);
                            }
                        } else if (delta < 0) {
                            // Remove Containers
                            for (var n = delta; n < 0; n++) {

                                var container = lastBlock.items.pop();

                                if (!that._view._requireFocusRestore && container.contains(_Global.document.activeElement)) {
                                    that._view._requireFocusRestore = _Global.document.activeElement;
                                    that._unsetFocusOnItem();
                                }

                                lastBlock.element.removeChild(container);
                                removedContainers.push(container);

                                if (!lastBlock.items.length) {
                                    if (itemsContainer.element === lastBlock.element.parentNode) {
                                        itemsContainer.element.removeChild(lastBlock.element);
                                    }

                                    blocks.pop();
                                    lastBlock = blocks[blocks.length - 1];
                                }
                            }
                        }

                        // Update references to containers.
                        for (var j = 0, len = blocks.length; j < len; j++) {
                            var block = blocks[j];
                            for (var n = 0; n < block.items.length; n++) {
                                newContainers.push(block.items[n]);
                            }
                        }
                    }

                    function addInserted(groupNode, firstItemIndex, newSize) {
                        var added = modifiedElements.filter(function (entry) {
                            return (entry.oldIndex === -1 && entry.newIndex >= firstItemIndex && entry.newIndex < (firstItemIndex + newSize));
                        }).sort(function (left, right) {
                            return left.newIndex - right.newIndex;
                        });

                        var itemsContainer = groupNode.itemsContainer;

                        for (var i = 0, len = added.length; i < len; i++) {
                            var entry = added[i],
                                offset = entry.newIndex - firstItemIndex;

                            var container = createContainer(),
                                next = offset < itemsContainer.items.length ? itemsContainer.items[offset] : null;
                            itemsContainer.items.splice(offset, 0, container);
                            itemsContainer.element.insertBefore(container, next);
                        }
                    }

                    function updateExistingGroup(groupNode, firstItem, newSize) {
                        if (firstItem + newSize > maxContainers) {
                            newSize = maxContainers - firstItem;
                        }

                        var itemsContainer = groupNode.itemsContainer,
                            delta = newSize - itemsContainer.items.length;

                        if (delta > 0) {
                            var children = itemsContainer.element.children,
                                oldSize = children.length;

                            _SafeHtml.insertAdjacentHTMLUnsafe(itemsContainer.element, "beforeend", _Helpers._repeat("<div class='win-container win-backdrop'></div>", delta));

                            for (var n = 0; n < delta; n++) {
                                var container = children[oldSize + n];
                                itemsContainer.items.push(container);
                            }
                        }

                        for (var n = delta; n < 0; n++) {
                            var container = itemsContainer.items.pop();
                            itemsContainer.element.removeChild(container);
                            removedContainers.push(container);
                        }

                        for (var n = 0, len = itemsContainer.items.length; n < len; n++) {
                            newContainers.push(itemsContainer.items[n]);
                        }
                    }

                    function addNewGroup(groupInfo, firstItem) {
                        var header = that._view._createHeaderContainer(prevElement);

                        var groupNode = {
                            header: header,
                            itemsContainer: {
                                element: that._view._createItemsContainer(header),
                            }
                        };

                        groupNode.itemsContainer[that._view._blockSize ? "itemsBlocks" : "items"] = [];

                        if (that._view._blockSize) {
                            updateExistingGroupWithBlocks(groupNode, firstItem, groupInfo.size);
                        } else {
                            updateExistingGroup(groupNode, firstItem, groupInfo.size);
                        }

                        return groupNode;
                    }

                    function shift(groupNode, oldFirstItemIndex, currentFirstItemIndex, newSize) {
                        var currentLast = currentFirstItemIndex + newSize - 1,
                            firstShifted,
                            delta;

                        for (var i = 0, len = modifiedElements.length; i < len; i++) {
                            var entry = modifiedElements[i];
                            if (entry.newIndex >= currentFirstItemIndex && entry.newIndex <= currentLast && entry.oldIndex !== -1) {
                                if (firstShifted !== +firstShifted || entry.newIndex < firstShifted) {
                                    firstShifted = entry.newIndex;
                                    delta = entry.newIndex - entry.oldIndex;
                                }
                            }
                        }

                        if (firstShifted === +firstShifted) {
                            var addedBeforeShift = 0;
                            for (i = 0, len = modifiedElements.length; i < len; i++) {
                                var entry = modifiedElements[i];
                                if (entry.newIndex >= currentFirstItemIndex && entry.newIndex < firstShifted && entry.oldIndex === -1) {
                                    addedBeforeShift++;
                                }
                            }
                            var removedBeforeShift = 0,
                                oldFirstShifted = firstShifted - delta;
                            for (i = 0, len = modifiedElements.length; i < len; i++) {
                                var entry = modifiedElements[i];
                                if (entry.oldIndex >= oldFirstItemIndex && entry.oldIndex < oldFirstShifted && entry.newIndex === -1) {
                                    removedBeforeShift++;
                                }
                            }

                            delta += removedBeforeShift;
                            delta -= addedBeforeShift;
                            delta -= currentFirstItemIndex - oldFirstItemIndex;

                            var itemsContainer = groupNode.itemsContainer;

                            if (delta > 0) {
                                var children = itemsContainer.element.children;

                                _SafeHtml.insertAdjacentHTMLUnsafe(itemsContainer.element, "afterBegin", _Helpers._repeat("<div class='win-container win-backdrop'></div>", delta));

                                for (var n = 0; n < delta; n++) {
                                    var container = children[n];
                                    itemsContainer.items.splice(n, 0, container);
                                }
                            }

                            for (var n = delta; n < 0; n++) {
                                var container = itemsContainer.items.shift();
                                itemsContainer.element.removeChild(container);
                            }

                            if (delta) {
                                // Invalidate the layout of the entire group because we do not know the exact indices which were added/modified since they were before the realization range.
                                that._affectedRange.add({
                                    start: currentFirstItemIndex,
                                    end: currentFirstItemIndex + newSize
                                }, count);
                            }
                        }
                    }

                    function flatIndexToGroupIndex(index) {
                        var firstItem = 0;
                        for (var i = 0, len = that._view.tree.length; i < len; i++) {
                            var group = that._view.tree[i],
                                size = group.itemsContainer.items.length,
                                lastItem = firstItem + size - 1;

                            if (index >= firstItem && index <= lastItem) {
                                return {
                                    group: i,
                                    item: index - firstItem
                                };
                            }

                            firstItem += size;
                        }
                    }

                    var oldFirstItem = [];
                    var firstItem = 0;
                    if (!that._view._blockSize) {
                        for (var i = 0, len = this._view.tree.length; i < len; i++) {
                            oldFirstItem.push(firstItem);
                            firstItem += this._view.tree[i].itemsContainer.items.length;
                        }
                    }

                    if (!that._view._blockSize) {
                        var removed = modifiedElements.filter(function (entry) {
                            return entry.newIndex === -1 && !entry._removalHandled;
                        }).sort(function (left, right) {
                            return right.oldIndex - left.oldIndex;
                        });

                        for (var i = 0, len = removed.length; i < len; i++) {
                            var entry = removed[i];
                            entry._removalHandled = true;
                            var itemBox = entry._itemBox;
                            entry._itemBox = null;

                            var groupIndex = flatIndexToGroupIndex(entry.oldIndex);
                            var group = this._view.tree[groupIndex.group];

                            var container = group.itemsContainer.items[groupIndex.item];
                            container.parentNode.removeChild(container);

                            if (_ElementUtilities.hasClass(itemBox, _Constants._selectedClass)) {
                                _ElementUtilities.addClass(container, _Constants._selectedClass);
                            }

                            group.itemsContainer.items.splice(groupIndex.item, 1);

                            entry.element = container;
                        }
                    }

                    this._view._modifiedGroups = [];

                    var prevElement = this._canvasProxy;
                    firstItem = 0;
                    // When groups are disabled, loop thru all of the groups (there's only 1).
                    // When groups are enabled, loop until either we exhaust all of the groups in the data source
                    // or we exhaust all of the containers that have been created so far.
                    for (var i = 0, len = groups.length; i < len && (!this._groupsEnabled() || firstItem < maxContainers) ; i++) {
                        var groupInfo = groups[i],
                            existingGroupIndex = this._view.keyToGroupIndex[groupInfo.key],
                            existingGroup = this._view.tree[existingGroupIndex];

                        if (existingGroup) {
                            if (that._view._blockSize) {
                                updateExistingGroupWithBlocks(existingGroup, firstItem, groupInfo.size);
                            } else {
                                shift(existingGroup, oldFirstItem[existingGroupIndex], firstItem, groupInfo.size);
                                addInserted(existingGroup, firstItem, groupInfo.size);
                                updateExistingGroup(existingGroup, firstItem, groupInfo.size);
                            }
                            newTree.push(existingGroup);
                            newKeyToGroupIndex[groupInfo.key] = newTree.length - 1;
                            delete this._view.keyToGroupIndex[groupInfo.key];

                            prevElement = existingGroup.itemsContainer.element;

                            this._view._modifiedGroups.push({
                                oldIndex: existingGroupIndex,
                                newIndex: newTree.length - 1,
                                element: existingGroup.header
                            });
                        } else {
                            var newGroup = addNewGroup(groupInfo, firstItem);
                            newTree.push(newGroup);
                            newKeyToGroupIndex[groupInfo.key] = newTree.length - 1;

                            this._view._modifiedGroups.push({
                                oldIndex: -1,
                                newIndex: newTree.length - 1,
                                element: newGroup.header
                            });

                            prevElement = newGroup.itemsContainer.element;
                        }
                        firstItem += groupInfo.size;
                    }

                    var removedItemsContainers = [],
                        removedHeaders = [],
                        removedGroups = this._view.keyToGroupIndex ? Object.keys(this._view.keyToGroupIndex) : [];

                    for (var i = 0, len = removedGroups.length; i < len; i++) {
                        var groupIndex = this._view.keyToGroupIndex[removedGroups[i]],
                            groupNode = this._view.tree[groupIndex];

                        removedHeaders.push(groupNode.header);
                        removedItemsContainers.push(groupNode.itemsContainer.element);

                        if (this._view._blockSize) {
                            for (var b = 0; b < groupNode.itemsContainer.itemsBlocks.length; b++) {
                                var block = groupNode.itemsContainer.itemsBlocks[b];
                                for (var n = 0; n < block.items.length; n++) {
                                    removedContainers.push(block.items[n]);
                                }
                            }
                        } else {
                            for (var n = 0; n < groupNode.itemsContainer.items.length; n++) {
                                removedContainers.push(groupNode.itemsContainer.items[n]);
                            }
                        }

                        this._view._modifiedGroups.push({
                            oldIndex: groupIndex,
                            newIndex: -1,
                            element: groupNode.header
                        });
                    }

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        if (modifiedElements[i].newIndex === -1 && !modifiedElements[i]._removalHandled) {
                            modifiedElements[i]._removalHandled = true;
                            var itemBox = modifiedElements[i]._itemBox;
                            modifiedElements[i]._itemBox = null;
                            var container;
                            if (removedContainers.length) {
                                container = removedContainers.pop();
                                _ElementUtilities.empty(container);
                            } else {
                                container = createContainer();
                            }
                            if (_ElementUtilities.hasClass(itemBox, _Constants._selectedClass)) {
                                _ElementUtilities.addClass(container, _Constants._selectedClass);
                            }
                            if (modifiedElements._containerStripe === _Constants._containerEvenClass) {
                                _ElementUtilities.addClass(container, _Constants._containerEvenClass);
                                _ElementUtilities.removeClass(container, _Constants._containerOddClass);
                            } else {
                                _ElementUtilities.addClass(container, _Constants._containerOddClass);
                                _ElementUtilities.removeClass(container, _Constants._containerEvenClass);
                            }
                            container.appendChild(itemBox);
                            modifiedElements[i].element = container;
                        }
                    }

                    this._view.tree = newTree;
                    this._view.keyToGroupIndex = newKeyToGroupIndex;
                    this._view.containers = newContainers;

                    return {
                        removedHeaders: removedHeaders,
                        removedItemsContainers: removedItemsContainers
                    };
                },

                _writeProfilerMark: function ListView_writeProfilerMark(text) {
                    var message = "WinJS.UI.ListView:" + this._id + ":" + text;
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, null, "listviewprofiler");
                }
            }, {
                // Static members

                triggerDispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ListView.triggerDispose">
                    /// <summary locid="WinJS.UI.ListView.triggerDispose">
                    /// Triggers the ListView disposal service manually. In normal operation this is triggered
                    /// at ListView instantiation. However in some scenarios it may be appropriate to run
                    /// the disposal service manually.
                    /// </summary>
                    /// </signature>
                    disposeControls();
                }

            });
            _Base.Class.mix(ListView, _Events.createEventProperties(
                "iteminvoked",
                "groupheaderinvoked",
                "selectionchanging",
                "selectionchanged",
                "loadingstatechanged",
                "keyboardnavigating",
                "contentanimating",
                "itemdragstart",
                "itemdragenter",
                "itemdragend",
                "itemdragbetween",
                "itemdragleave",
                "itemdragchanged",
                "itemdragdrop",
                "accessibilityannotationcomplete"));
            _Base.Class.mix(ListView, _Control.DOMEventMixin);
            return ListView;
        })
    });

});
