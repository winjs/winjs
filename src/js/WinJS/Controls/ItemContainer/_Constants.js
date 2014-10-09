// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Base'
    ], function constantsInit(exports, _Base) {
    "use strict";

    var members = {};
    members._listViewClass = "win-listview";
    members._listViewSupportsCrossSlideClass = "win-listview-supports-cross-slide";
    members._viewportClass = "win-viewport";
    members._rtlListViewClass = "win-rtl";
    members._horizontalClass = "win-horizontal";
    members._verticalClass = "win-vertical";
    members._scrollableClass = "win-surface";
    members._itemsContainerClass = "win-itemscontainer";
    members._listHeaderContainerClass = "win-listheadercontainer";
    members._listFooterContainerClass = "win-listfootercontainer";
    members._padderClass = "win-itemscontainer-padder";
    members._proxyClass = "_win-proxy";
    members._itemClass = "win-item";
    members._itemBoxClass = "win-itembox";
    members._itemsBlockClass = "win-itemsblock";
    members._containerClass = "win-container";
    members._containerEvenClass = "win-container-even";
    members._containerOddClass = "win-container-odd";
    members._backdropClass = "win-backdrop";
    members._footprintClass = "win-footprint";
    members._groupsClass = "win-groups";
    members._selectedClass = "win-selected";
    members._swipeableClass = "win-swipeable";
    members._swipeClass = "win-swipe";
    members._selectionBorderClass = "win-selectionborder";
    members._selectionBackgroundClass = "win-selectionbackground";
    members._selectionCheckmarkClass = "win-selectioncheckmark";
    members._selectionCheckmarkBackgroundClass = "win-selectioncheckmarkbackground";
    members._pressedClass = "win-pressed";
    members._headerClass = "win-groupheader";
    members._headerContainerClass = "win-groupheadercontainer";
    members._groupLeaderClass = "win-groupleader";
    members._progressClass = "win-progress";
    members._selectionHintClass = "win-selectionhint";
    members._revealedClass = "win-revealed";
    members._itemFocusClass = "win-focused";
    members._itemFocusOutlineClass = "win-focusedoutline";
    members._zoomingXClass = "win-zooming-x";
    members._zoomingYClass = "win-zooming-y";
    members._listLayoutClass = "win-listlayout";
    members._gridLayoutClass = "win-gridlayout";
    members._headerPositionTopClass = "win-headerpositiontop";
    members._headerPositionLeftClass = "win-headerpositionleft";
    members._structuralNodesClass = "win-structuralnodes";
    members._singleItemsBlockClass = "win-single-itemsblock";
    members._uniformGridLayoutClass = "win-uniformgridlayout";
    members._uniformListLayoutClass = "win-uniformlistlayout";
    members._cellSpanningGridLayoutClass = "win-cellspanninggridlayout";
    members._laidOutClass = "win-laidout";
    members._nonDraggableClass = "win-nondraggable";
    members._nonSelectableClass = "win-nonselectable";
    members._nonSwipeableClass = "win-nonswipeable";
    members._dragOverClass = "win-dragover";
    members._dragSourceClass = "win-dragsource";
    members._clipClass = "win-clip";
    members._selectionModeClass = "win-selectionmode";
    members._noCSSGrid = "win-nocssgrid";

    members._INVALID_INDEX = -1;
    members._UNINITIALIZED = -1;

    members._LEFT_MSPOINTER_BUTTON = 0;
    members._RIGHT_MSPOINTER_BUTTON = 2;

    members._TAP_END_THRESHOLD = 10;

    members._DEFAULT_PAGES_TO_LOAD = 5;
    members._DEFAULT_PAGE_LOAD_THRESHOLD = 2;

    members._MIN_AUTOSCROLL_RATE = 150;
    members._MAX_AUTOSCROLL_RATE = 1500;
    members._AUTOSCROLL_THRESHOLD = 100;
    members._AUTOSCROLL_DELAY = 50;

    members._DEFERRED_ACTION = 250;
    members._DEFERRED_SCROLL_END = 250;

    // For horizontal layouts
    members._VERTICAL_SWIPE_SELECTION_THRESHOLD = 39;
    members._VERTICAL_SWIPE_SPEED_BUMP_START = 0;
    members._VERTICAL_SWIPE_SPEED_BUMP_END = 127;
    members._VERTICAL_SWIPE_SELF_REVEAL_GESTURE = 15;

    // For vertical layouts
    members._HORIZONTAL_SWIPE_SELECTION_THRESHOLD = 27;
    members._HORIZONTAL_SWIPE_SPEED_BUMP_START = 0;
    members._HORIZONTAL_SWIPE_SPEED_BUMP_END = 150;
    members._HORIZONTAL_SWIPE_SELF_REVEAL_GESTURE = 23;

    members._SELECTION_CHECKMARK = "\uE081";

    members._LISTVIEW_PROGRESS_DELAY = 2000;

    var ScrollToPriority = {
        uninitialized: 0,
        low: 1,             // used by layoutSite.invalidateLayout, forceLayout, _processReload, _update and _onMSElementResize - operations that preserve the scroll position
        medium: 2,          // used by dataSource change, layout change and etc - operations that reset the scroll position to 0
        high: 3             // used by indexOfFirstVisible, ensureVisible, scrollPosition - operations in which the developer explicitly sets the scroll position
    };

    var ViewChange = {
        rebuild: 0,
        remeasure: 1,
        relayout: 2,
        realize: 3
    };

    members._ScrollToPriority = ScrollToPriority;
    members._ViewChange = ViewChange;

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", members);
});
