// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

interface Object {
    [key: string]: any;
}

interface IStyleEquivalents {
    cssName: string;
    scriptName: string;
}

interface IStyleEquivalentsMap {
    [key: string]: IStyleEquivalents;
}

declare module WinJS {

    class _Signal<T> {
        constructor(oncancel?: Function);
        promise: Promise<T>;
        cancel();
        complete(value?: T);
        error(value?: any);
        progress(value?: any);
    }

    module Utilities {
        function _bubbleEvent(element: HTMLElement, type: string, eventObject: any): void;
        function _setImmediate(func: () => any): void;

        module _resizeNotifier {
            function subscribe(element: HTMLElement, handler): void;
            function unsubscribe(element: HTMLElement, handler): void;
            function _handleResize(): void;
        }

        var _browserStyleEquivalents: IStyleEquivalentsMap;

        function _setActive(element: HTMLElement, scroller?: HTMLElement);
        function _trySetActive(element: HTMLElement, scroller?: HTMLElement);
        function _setActiveFirstFocusableElement(rootEl: HTMLElement, scroller?: HTMLElement);
        function _setActiveLastFocusableElement(rootEl: HTMLElement, scroller?: HTMLElement);

        function _traceAsyncOperationStarting();
        function _traceAsyncOperationCompleted();
        function _traceAsyncCallbackStarting();
        function _traceAsyncCallbackCompleted();

        function _require(dep: string, callback);
        function _require(deps: string[], callback);
        function _uniqueID(e: HTMLElement):string;
        function _isDOMElement(e: HTMLElement): boolean;

        function _yieldForEvents(handler: Function);
        function _merge(a: any, b: any): any;
        var _isiOS;
        function _setIsiOS(isiOS: boolean);

        class _PointerEventProxy {
            constructor(eventObject, overrideProperties);
        }

        function _linkedListMixin(name: string);

        module Scheduler {
            var _usingWwaScheduler: boolean;
            var _MSApp;
            var _isEmpty;
            var _TIME_SLICE: number;
        }

        function _now();

        function _setHasWinRT(value: boolean);
        var _selectionPartsSelector;
        var _supportsTouchActionCrossSlide;

        function _writeProfilerMark(mark: string);

        var _browserEventEquivalents: { [key: string]: string };

        var _DOMWeakRefTable_sweepPeriod: number;
        var _DOMWeakRefTable_timeout: number;
        var _DOMWeakRefTable_noTimeoutUnderDebugger: boolean;
        function _createWeakRef(element, id: string);
        function _getWeakRefElement(id: string): any;
        var _DOMWeakRefTable_tableSize: number;

        function _matchesSelector(element, selector: string): boolean;

        var _MutationObserver;
        function _isSelectionRendered(itemBox): boolean;

    }

    module Resources {
        function _getWinJSString(resourceId: string): { value: string; empty?: boolean; lang?: string; };
        function _getStringJS(resourceId: string): { value: string; empty?: boolean; lang?: string; };
    }

    module Application {
        var _terminateApp: (data: any, e: any) => void;
        function _loadState(e: any);
    }

    module UI {
        var _optionsLexer;
        var optionsParser;
        var _optionsParser;
        var _CallExpression;
        var _IdentifierExpression;
        var _GroupFocusCache;

        class _ParallelWorkQueue {
            constructor(maxRunning: number);
            sort(sortFunc: (a: any, b: any) => number);
            queue(f:()=>WinJS.Promise<any>, data?:any, first?:boolean);
        }

        class PrivateToggleSwitch extends WinJS.UI.ToggleSwitch {
            _pointerDownHandler(ev: any);
            _pointerUpHandler(ev: any);
            _pointerMoveHandler(ev: any);
        }

        class PrivateTabContainer extends WinJS.UI.TabContainer {
            _elementTabHelper;
            _hasMoreElementsInTabOrder;
        }

        class PrivateTooltip extends WinJS.UI.Tooltip {
            _disposed: boolean;
            _domElement: HTMLElement;

            static _DELAY_INITIAL_TOUCH_SHORT: number;
            static _DELAY_INITIAL_TOUCH_LONG: number;
            static _DEFAULT_MOUSE_HOVER_TIME: number;
            static _DEFAULT_MESSAGE_DURATION: number;
            static _DELAY_RESHOW_NONINFOTIP_TOUCH: number;
            static _DELAY_RESHOW_NONINFOTIP_NONTOUCH: number;
            static _DELAY_RESHOW_INFOTIP_TOUCH: number;
            static _DELAY_RESHOW_INFOTIP_NONTOUCH: number;
            static _RESHOW_THRESHOLD: number;
        }
        
        interface ContentDialogHideInfo {
            reason: string;
        }
        
        interface ContentDialogHideEvent extends Event {
            detail: ContentDialogHideInfo;
        }
        
        class ContentDialog {
            constructor(element?: HTMLElement, options?: any);
            element: HTMLElement;
            hidden: boolean;
            title: string;
            primaryCommandText: string;
            isPrimaryCommandDisabled: boolean;
            secondaryCommandText: string;
            isSecondaryCommandDisabled: boolean;
            show(): Promise<ContentDialogHideInfo>;
            hide(reason?: any): void;
            dispose(): void;
            addEventListener(type: string, listener: Function, useCapture?: boolean): void;
            removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
            onbeforeshow(eventInfo: Event): void;
            onaftershow(eventInfo: Event): void;
            onbeforehide(eventInfo: ContentDialogHideEvent): void;
            onafterhide(eventInfo: ContentDialogHideEvent): void;
        }
        
        class PrivateContentDialog extends WinJS.UI.ContentDialog {
            static _ClassNames: any;
            _playEntranceAnimation(): Promise<any>;
            _playExitAnimation(): Promise<any>;
        }

        interface ISelect {
            value;
            index: number;
            _domElement;
        }

        interface ITimePicker extends WinJS.UI.TimePicker {
            _domElement: HTMLElement;
            _disposed: boolean;
            _ampmControl: ISelect;
            _ampmElement: HTMLSelectElement;
            _hourControl: ISelect;
            _hourElement: HTMLSelectElement;
            _minuteControl: ISelect;
            _minuteElement: HTMLSelectElement;
        }

        interface ISemanticZoom extends WinJS.UI.SemanticZoom {
            _showSemanticZoomButton();
            _onMouseWheel(evt);
            _pinching: boolean;
            _viewportIn;
            _viewportOut;
            _canvasIn;
            _canvasOut;
            _disposed;
        }

        var _listViewClass: string;
        var _viewportClass: string;
        var _horizontalClass: string;
        var _verticalClass: string;
        var _scrollableClass: string;
        var _containerClass: string;
        var _headerContainerClass: string;
        var _listViewSupportsCrossSlideClass: string;

        module _ListViewAnimationHelper {
            function fadeInElement(element): Promise<any>;
            function fadeOutElement(element): Promise < any>;
            function animateEntrance(canvas, firstEntrance): Promise<any>;
        }

        module _VirtualizeContentsView {
            var _maxTimePerCreateContainers;
            var _chunkSize;
            var _disableCustomPagesPrefetch;
            var _pagesToPrefetch;
            var _createContainersJobTimeslice;
            var _startupChunkSize;
            var _customPagesToPrefetchMax;
            var _customPagesToPrefetchMin;
        }

        class PrivateSearchBox extends WinJS.UI.SearchBox {
            _disposed: boolean;
            static _sortAndMergeHits(hitsProvided?);
            static _EventName: {
                querychanged;
                querysubmitted;
                resultsuggestionchosen;
                suggestionsrequested;
                receivingfocusonkeyboardinput;
            };

        }

        class PrivateDatePicker extends DatePicker {
            _domElement;
            _disposed: boolean;
            static _getInformationJS;
            static _getInformationWinRT;
            static getInformation;
        }

        class PrivateFlipView<T> extends FlipView<T> {
            _pageManager;
            _animating: boolean;
        }

        class PrivateSemanticZoom extends SemanticZoom {
        }

        interface IPrivateSelection<T> extends ISelection<T> {
            _isIncluded(i: number): boolean;
            _pivot;
            _selected;
        }

        interface IPrivateListDataSource<T> extends IListDataSource<T> {
            list?: WinJS.Binding.List<T>;
            _list?: WinJS.Binding.List<T>;
        }

        interface IListViewEntity {
            type: WinJS.UI.ObjectType;
            index: number;
        }

        class PrivateListView<T> extends ListView<T> {
            _onMSElementResize();
            _animationsDisabled;
            _view;
            _ariaStartMarker;
            _ariaEndMarker;
            selection: IPrivateSelection<T>
            itemDataSource: IPrivateListDataSource<T>;
            _canvas;
            _viewport;
            _getViewportLength;
            _groups;
            _raiseViewLoading;
            _element;
            _horizontal(): boolean;
            _updateLayout;
            _affectedRange;
            _onFocusOut;
            _onFocusIn;
            _selection;
            _tabManager;
            _layout;
            _deleteWrapper;
            _mode;
            _itemsManager;
            _raiseViewComplete;
            _changeFocus;
            _keyboardFocusInbound: boolean;
            _currentMode;
            _dispose;
            _onMSManipulationStateChanged;
            _beginZoom;
            _endZoom;
            _versionManager;
            _scrollLength;
            _onPropertyChange;

            ensureVisible(itemIndex: number): void;
            ensureVisible(itemIndex: IListViewEntity): void;
        }

        class PrivateListLayout extends ListLayout {
            static _numberOfItemsPerItemsBlock: number;
            _itemsPerBar;
            initialize();
            initialize(layout, groupsEnabled);
            layout(tree: any, changedRange: any, modifiedItems: any, modifiedGroups: any): any;
            itemsFromRange(firstPixel: number, lastPixel: number): any;
            _measuringPromise;
            _envInfo;
            _sizes;
        }

        class PrivateGridLayout extends GridLayout {
            initialize();
            initialize(layout, groupsEnabled);
            layout(tree: any, changedRange: any, modifiedItems: any, modifiedGroups: any): any;
            itemsFromRange(firstPixel: number, lastPixel: number): any;
            _itemsPerBar;
            _measuringPromise;
            _envInfo;
            _sizes;
            _lastItemFromRange;
            _firstItemFromRange;
            _measureElements;
        }

        class PrivateCellSpanningLayout extends CellSpanningLayout {
            initialize();
            initialize(layout, groupsEnabled);
            layout(tree: any, changedRange: any, modifiedItems: any, modifiedGroups: any): any;
            itemsFromRange(firstPixel: number, lastPixel: number): any;
            _itemsPerBar;
            _measuringPromise;
            _envInfo;
            _sizes;
        }

        class PrivateToolbar extends WinJS.UI.Toolbar {
            _disposed: boolean;
            _primaryCommands: ICommand[];
            _secondaryCommands: ICommand[];
            _overflowButton: HTMLButtonElement;
            _mainActionArea: HTMLElement;
            _menu: WinJS.UI.Menu;
            _separatorWidth: number;
            _standardCommandWidth: number;
            _overflowButtonWidth: number;
            _getCommandWidth(command: ICommand): number;
            _customContentFlyout: WinJS.UI.Flyout;
            _customContentContainer: HTMLElement;
            _attachedOverflowArea: HTMLElement;
        }

        class PrivateCommand extends WinJS.UI.AppBarCommand implements ICommand {
            priority: number;
            winControl: ICommand
        }

        // Move to WinJS.d.ts after the Toolbar API review
        export interface ICommand {
            addEventListener(type: string, listener: Function, useCapture?: boolean): void;
            dispose(): void;
            removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
            disabled: boolean;
            element: HTMLElement;
            extraClass: string;
            firstElementFocus: HTMLElement;
            flyout: WinJS.UI.Flyout;
            hidden: boolean;
            icon: string;
            id: string;
            label: string;
            lastElementFocus: HTMLElement;
            onclick: Function;
            section: string;
            selected: boolean;
            tooltip: string;
            type: string;
            priority: number;
            winControl: ICommand
        }

        class Toolbar {
            public element: HTMLElement;
            public overflowMode: string;
            public data: WinJS.Binding.List<ICommand>;
            constructor(element?: HTMLElement, options?: any);
            public dispose(): void;
            public forceLayout(): void;
        }

        class PrivateItemContainer extends WinJS.UI.ItemContainer {
            _selectionMode: WinJS.UI.SelectionMode;
            _onFocusIn();
            _onFocusOut();
            _onKeyDown(e);
            _itemEventsHandler;
            _itemBox;
            _disposed: boolean;
            static _ClassName;
        }

        var _ItemEventsHandler;
        var _LEFT_MSPOINTER_BUTTON;
        var _RIGHT_MSPOINTER_BUTTON;
        var _selectedClass;
        var _keyboardSeenLast;
        var _swipeableClass;
        var _itemFocusOutlineClass;
        var _itemBoxClass;
        var _itemClass;
        var _headerClass;
        var _itemFocusClass;
        var _pressedClass;
        var _itemsContainerClass;
        var _laidOutClass;
        var _cellSpanningGridLayoutClass;
        var _listLayoutClass;
        var _gridLayoutClass;
        var _uniformGridLayoutClass;
        var _selectionModeClass;
        var _itemsBlockClass;
        var _structuralNodesClass;
        var _progressClass;
        var _nonDraggableClass;
        var _nonSelectableClass;
        var _nonSwipeableClass;
        var _INVALID_INDEX;

        var _seenUrlsMaxSize: number;
        var _seenUrlsMRUMaxSize: number;
        function _seenUrl(url:string);
        function _getSeenUrlsMRU(): string[];
        function _getSeenUrls(): string[];

        function _animationTimeAdjustment(time: number);

        function _rotationTransform3d(angle, axis);
        function _tiltTransform(clickX, clickY, elementRect);

        var ListDataSource;
        var _SelectionMode;
        var _SelectionManager;
        var _NoGroups;
        var _VersionManager;
        var _getMargins;
        var _ItemSet;
        var _Selection;
        var _LayoutCommon;
        var _LISTVIEW_PROGRESS_DELAY;
    }

    module Binding {
        class PrivateList<T> extends List<T> {
            _getKey(index: number): string;
            _getFromKey(key: string): T;
            _spliceFromKey(key: string, howMany: number, ...items: T[]): T[];
            _notifyMutatedFromKey(key: string);
        }
        function _bindingParser(input, context);
        function getValue(obj: any, path: string[]);

        class PrivateTemplate extends Template {
            static _interpretAll: boolean;
            _shouldCompile: boolean;
            _renderImpl;
            _compileTemplate;
            _reset;
        }

        var _TemplateCompiler;
    }
}