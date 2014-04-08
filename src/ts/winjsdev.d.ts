/// <reference path="winjs.d.ts" />

declare var msGetWeakWinRTProperty;
declare var msSetWeakWinRTProperty;

declare module WinJS {

    module Application {
        var _sessionStateLoaded;
        var _terminateApp;
    }

    module Binding {
        var _bindingParser2;
        var _BindingListDataSource;
        var _TemplateCompiler;
    }

<<<<<<< HEAD
    module Namespace {
        var _lazy;
    }

    module Resources {
        var _getResourceContext;
        var _getStringJS;
        var _getStringWinRT;
        var _getWinJSString;

        function _formatString(format: string, ...values: any[]): string;
    }

=======
>>>>>>> Moving base folder to TypeScript modules.
    module UI {
        var optionsParser;
        var _AUTOSCROLL_DELAY;
        var _AUTOSCROLL_THRESHOLD;
        var _backdropClass;
        var _CallExpression;
        var _cellSpanningGridLayoutClass;
        var _clipClass;
        var _containerClass;
        var _createItemsManager;
        var _DEFAULT_PAGE_LOAD_THRESHOLD;
        var _DEFAULT_PAGES_TO_LOAD;
        var _DEFERRED_SCROLL_END;
        var _DEFERRED_ACTION;
        var _disposeControls;
        var _dragOverClass;
        var _dragSourceClass;
        var _ensureId;
        var _FlipPageManager;
        var _footprintClass;
        var _getCursorPos;
        var _getElementsByClasses;
        var _getMargins;
        var _gridLayoutClass;
        var _GroupDataSource;
        var _GroupFocusCache;
        var _groupLeaderClass;
        var _groupsClass;
        var _GroupsContainerBase;
        var _headerClass;
        var _headerContainerClass;
        var _headerPositionLeftClass;
        var _headerPositionTopClass;
        var _horizontalClass;
        var _HORIZONTAL_SWIPE_SELECTION_THRESHOLD;
        var _HORIZONTAL_SWIPE_SELF_REVEAL_GESTURE;
        var _HORIZONTAL_SWIPE_SPEED_BUMP_END;
        var _HORIZONTAL_SWIPE_SPEED_BUMP_START;
        var _IdentifierExpression;
        var _INVALID_INDEX;
        var _isSelectionRendered;
        var _itemBoxClass;
        var _itemClass;
        var _ItemEventsHandler;
        var _itemFocusClass;
        var _itemFocusOutlineClass;
        var _itemsBlockClass;
        var _ItemsContainer;
        var _itemsContainerClass;
        var _ItemSet;
        var _KeyboardBehavior;
        var _keyboardSeenLast;
        var _laidOutClass;
        var _LayoutCommon;
        var _LayoutWrapper;
        var _LegacyLayout;
        var _LEFT_MSPOINTER_BUTTON;
        var _libraryDelay;
        var _listLayoutClass;
        var _ListViewAnimationHelper
        var _LISTVIEW_PROGRESS_DELAY;
        var _listViewClass;
        var _MAX_AUTOSCROLL_RATE;
        var _MIN_AUTOSCROLL_RATE;
        var _nodeListToArray;
        var _NoGroups;
        var _nonDraggableClass;
        var _nonSelectableClass;
        var _nonSwipeableClass;
        var _normalizeRendererReturn;
        var _optionsParser;
        var _Overlay;
        var _padderClass;
        var _ParallelWorkQueue;
        var _PerfMeasurement_leakSlots;
        var _pressedClass;
        var _progressClass;
        var _proxyClass;
        var _revealedClass;
        var _repeat;
        var _RIGHT_MSPOINTER_BUTTON;
        var _rtlListViewClass;
        var _scrollableClass;
        var _Select;
        var _selectedClass;
        var _SELECTION_CHECKMARK;
        var _Selection;
        var _selectionBackgroundClass;
        var _selectionBorderClass;
        var _selectionCheckmarkClass;
        var _selectionCheckmarkBackgroundClass;
        var _selectionHintClass;
        var _selectionPartsSelector;
        var _SelectionManager;
        var _SelectionMode;
        var _selectionModeClass;
        var _setAttribute;
        var _setFlow;
        var _setOptions;
        var _SingleItemSelectionManager;
        var _strings;
        var _structuralNodesClass;
        var _swipeableClass;
        var _swipeClass;
        var _TAP_END_THRESHOLD;
        var _trivialHtmlRenderer;
        var _uniformGridLayoutClass;
        var _uniformListLayoutClass;
        var _UNINITIALIZED;
        var _UnsupportedGroupFocusCache;
        var _UnvirtualizedGroupsContainer;
        var _VersionManager;
        var _VERTICAL_SWIPE_SELECTION_THRESHOLD;
        var _VERTICAL_SWIPE_SELF_REVEAL_GESTURE;
        var _VERTICAL_SWIPE_SPEED_BUMP_END;
        var _VERTICAL_SWIPE_SPEED_BUMP_START;
        var _verticalClass;
        var _viewportClass;
        var _VirtualizeContentsView;
        var _WinKeyboard;
        var _WinPressed;        
        var _zoomingXClass;   
        var _zoomingYClass;     

        var Layout;  
        var simpleItemRenderer;              

        module Fragments {
            var _cleanupDocument;
            var _forceLocal;
            var _populateDocument;
        }

        module Pages {
            var _mixin;
        }

        module _ScrollToPriority {
            var high;
            var low;
        }

        module _ViewChange {
            var realize;
        }
    }

    module Utilities {
        var _clamp;
<<<<<<< HEAD
        var _createEventProperty;
        var _createWeakRef;
        var _dataKey;
        var _deprecated;
        var _disposeElement;
=======
        var _createWeakRef;
        var _dataKey;
        var _deprecated;
>>>>>>> Moving base folder to TypeScript modules.
        var _focusFirstFocusableElement;
        var _focusLastFocusableElement;
        var _getLowestTabIndexInList;
        var _getHighestTabIndexInList;
<<<<<<< HEAD
        var _getMemberFiltered;
        var _getProfilerMarkIdentifier;
        var _getWeakRefElement;
        var _isDOMElement;
        var _linkedListMixin;
=======
        var _getWeakRefElement;
        var _isDOMElement;
>>>>>>> Moving base folder to TypeScript modules.
        var _DOMWeakRefTable_fastLoadPath;
        var _DOMWeakRefTable_noTimeoutUnderDebugger;
        var _DOMWeakRefTable_sweepPeriod;
        var _DOMWeakRefTable_timeout       
        var _setActiveFirstFocusableElement;
<<<<<<< HEAD
        var _shallowCopy;
        var _syncRenderer;
        var _trySetActive;
        var _writeProfilerMark;
        var _traceAsyncOperationStarting;
        var _traceAsyncOperationCompleted;
        var _traceAsyncCallbackStarting;
        var _traceAsyncCallbackCompleted;
        var _setImmediate;
        var _setActive;

        var isPhone;
=======
        var _syncRenderer;
        var _trySetActive;
        var _writeProfilerMark;
        var _setActive;

>>>>>>> Moving base folder to TypeScript modules.
        var supportedForProcessing;
        var testReadyState: string;
    }
}