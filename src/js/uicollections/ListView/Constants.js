(function constantsInit(global, WinJS, undefined) {
    "use strict";

    var thisWinUI = WinJS.UI;
    thisWinUI._listViewClass = "win-listview";
    thisWinUI._viewportClass = "win-viewport";
    thisWinUI._rtlListViewClass = "win-rtl";
    thisWinUI._horizontalClass = "win-horizontal";
    thisWinUI._verticalClass = "win-vertical";
    thisWinUI._scrollableClass = "win-surface";
    thisWinUI._itemsContainerClass = "win-itemscontainer";
    thisWinUI._padderClass = "win-itemscontainer-padder";
    thisWinUI._proxyClass = "_win-proxy";
    thisWinUI._itemClass = "win-item";
    thisWinUI._itemBoxClass = "win-itembox";
    thisWinUI._itemsBlockClass = "win-itemsblock";
    thisWinUI._containerClass = "win-container";
    thisWinUI._backdropClass = "win-backdrop";
    thisWinUI._footprintClass = "win-footprint";
    thisWinUI._groupsClass = "win-groups";
    thisWinUI._selectedClass = "win-selected";
    thisWinUI._swipeableClass = "win-swipeable";
    thisWinUI._swipeClass = "win-swipe";
    thisWinUI._selectionBorderClass = "win-selectionborder";
    thisWinUI._selectionBackgroundClass = "win-selectionbackground";
    thisWinUI._selectionCheckmarkClass = "win-selectioncheckmark";
    thisWinUI._selectionCheckmarkBackgroundClass = "win-selectioncheckmarkbackground";
    thisWinUI._selectionPartsSelector = ".win-selectionborder, .win-selectionbackground, .win-selectioncheckmark, .win-selectioncheckmarkbackground";
    thisWinUI._pressedClass = "win-pressed";
    thisWinUI._headerClass = "win-groupheader";
    thisWinUI._headerContainerClass = "win-groupheadercontainer";
    thisWinUI._groupLeaderClass = "win-groupleader";
    thisWinUI._progressClass = "win-progress";
    thisWinUI._selectionHintClass = "win-selectionhint";
    thisWinUI._revealedClass = "win-revealed";
    thisWinUI._itemFocusClass = "win-focused";
    thisWinUI._itemFocusOutlineClass = "win-focusedoutline";
    thisWinUI._zoomingXClass = "win-zooming-x";
    thisWinUI._zoomingYClass = "win-zooming-y";
    thisWinUI._listLayoutClass = "win-listlayout";
    thisWinUI._gridLayoutClass = "win-gridlayout";
    thisWinUI._headerPositionTopClass = "win-headerpositiontop";
    thisWinUI._headerPositionLeftClass = "win-headerpositionleft";
    thisWinUI._structuralNodesClass = "win-structuralnodes";
    thisWinUI._uniformGridLayoutClass = "win-uniformgridlayout";
    thisWinUI._uniformListLayoutClass = "win-uniformlistlayout";
    thisWinUI._cellSpanningGridLayoutClass = "win-cellspanninggridlayout";
    thisWinUI._laidOutClass = "win-laidout";
    thisWinUI._nonDraggableClass = "win-nondraggable";
    thisWinUI._nonSelectableClass = "win-nonselectable";
    thisWinUI._nonSwipeableClass = "win-nonswipeable";
    thisWinUI._dragOverClass = "win-dragover";
    thisWinUI._dragSourceClass = "win-dragsource";
    thisWinUI._clipClass = "win-clip";
    thisWinUI._selectionModeClass = "win-selectionmode";
    
    thisWinUI._INVALID_INDEX = -1;
    thisWinUI._UNINITIALIZED = -1;

    thisWinUI._LEFT_MSPOINTER_BUTTON = 0;
    thisWinUI._RIGHT_MSPOINTER_BUTTON = 2;

    thisWinUI._TAP_END_THRESHOLD = 10;
    
    thisWinUI._DEFAULT_PAGES_TO_LOAD = 5;
    thisWinUI._DEFAULT_PAGE_LOAD_THRESHOLD = 2;

    thisWinUI._MIN_AUTOSCROLL_RATE = 150;
    thisWinUI._MAX_AUTOSCROLL_RATE = 1500;
    thisWinUI._AUTOSCROLL_THRESHOLD = 100;
    thisWinUI._AUTOSCROLL_DELAY = 50;

    thisWinUI._DEFERRED_ACTION = 250;
    thisWinUI._DEFERRED_SCROLL_END = 250;

    // For horizontal layouts
    thisWinUI._VERTICAL_SWIPE_SELECTION_THRESHOLD = 39;
    thisWinUI._VERTICAL_SWIPE_SPEED_BUMP_START = 0;
    thisWinUI._VERTICAL_SWIPE_SPEED_BUMP_END = 127;
    thisWinUI._VERTICAL_SWIPE_SELF_REVEAL_GESTURE = 15;

    // For vertical layouts
    thisWinUI._HORIZONTAL_SWIPE_SELECTION_THRESHOLD = 27;
    thisWinUI._HORIZONTAL_SWIPE_SPEED_BUMP_START = 0;
    thisWinUI._HORIZONTAL_SWIPE_SPEED_BUMP_END = 150;
    thisWinUI._HORIZONTAL_SWIPE_SELF_REVEAL_GESTURE = 23;

    thisWinUI._SELECTION_CHECKMARK = "\uE081";

    thisWinUI._LISTVIEW_PROGRESS_DELAY = 2000;
})(this, WinJS);
