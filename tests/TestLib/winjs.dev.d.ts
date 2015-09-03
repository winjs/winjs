// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

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

interface IOpenCloseMachine {
    _state: { name: string; }
}

interface IMutationRecordShim {
    type: string;
    target: HTMLElement;
    attributeName: string;
}

declare module WinJS {

    interface IPosition {
        left: number;
        top: number;
        width: number;
        height: number;
    }

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
        export function _getPositionRelativeTo(element: HTMLElement, ancestor: HTMLElement): IPosition;

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
        function _uniqueID(e: HTMLElement): string;
        function _isDOMElement(e: HTMLElement): boolean;

        function _yieldForEvents(handler: Function);
        function _merge(a: any, b: any): any;
        function _mergeAll(list: any): any;
        var _isiOS;
        function _setIsiOS(isiOS: boolean);

        class _PointerEventProxy {
            constructor(eventObject, overrideProperties);
        }

        var isPhone: boolean;

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
        var _getHighestTabIndexInList;
        var _getLowestTabIndexInList;
        var _MSPointerEvent;
        var _supportsSnapPoints: boolean;

        function _convertToPrecisePixels(value: string): number;
        function _getPreciseTotalHeight(element: HTMLElement): number;
        function _getPreciseTotalWidth(element: HTMLElement): number;
        function _getPreciseContentHeight(element: HTMLElement): number;
        function _getPreciseContentWidth(element: HTMLElement): number;
        function _getPreciseMargins(element: HTMLElement): { top: number; right: number; bottom: number; left: number; };

    }

    module Resources {
        function _getWinJSString(resourceId: string): { value: string; empty?: boolean; lang?: string; };
        function _getStringJS(resourceId: string): { value: string; empty?: boolean; lang?: string; };
    }

    module Application {
        var _applicationListener: any;
        var _terminateApp: (data: any, e: any) => void;
        function _dispatchEvent(eventRecord: any): void;
        function _loadState(e: any);
    }

    module UI {
        /**
         * Takes a string in the form of "{a: 1, b:2}" 
         * and returns an object in the form of {a: 1, b:2}
        **/
        function optionsParser(value: string, context?: any, functionContext?: any): any; 

        var _optionsLexer;
        var _optionsParser;
        var _CallExpression;
        var _IdentifierExpression;
        var _GroupFocusCache;

        module _LightDismissService {
            interface ILightDismissInfo {
                reason: string;
                active: boolean;
                stopPropagation(): void;
                preventDefault(): void;
            }

            export interface IKeyboardInfo {
                type: string;
                keyCode: number;
                propagationStopped: boolean;
                stopPropagation(): void;
            }

            export interface ILightDismissService {
                keyDown(client: ILightDismissable, eventObject: KeyboardEvent): void;
                keyUp(client: ILightDismissable, eventObject: KeyboardEvent): void;
                keyPress(client: ILightDismissable, eventObject: KeyboardEvent): void;
            }

            export interface ILightDismissable {
                setZIndex(zIndex: string): void;
                getZIndexCount(): number;
                containsElement(element: HTMLElement): boolean;
                onTakeFocus(useSetActive: boolean): void;
                onFocus(element: HTMLElement): void;
                onShow(service: ILightDismissService): void;
                onHide(): void;
                onKeyInStack(info: IKeyboardInfo): void;
                onShouldLightDismiss(info: ILightDismissInfo): boolean;
                onLightDismiss(info: ILightDismissInfo): void;
            }

            function shown(client: ILightDismissable): void;
            function hidden(client: ILightDismissable): void;
            function isShown(client: ILightDismissable): boolean;
            function isTopmost(client: ILightDismissable): boolean;
            function keyDown(client: ILightDismissable, eventObject: KeyboardEvent): void;
            function keyUp(client: ILightDismissable, eventObject: KeyboardEvent): void;
            function keyPress(client: ILightDismissable, eventObject: KeyboardEvent): void;
            function _clickEaterTapped(): void;
        }

        module _Accents {
            export enum ColorTypes {
                accent,
                listSelectRest,
                listSelectHover,
                listSelectPress,
                _listSelectRestInverse,
                _listSelectHoverInverse,
                _listSelectPressInverse
            }

            export function createAccentRule(selector: string, props: { name: string; value: ColorTypes }[]);

            export var _colors: string[];
            export function _reset();
            export var _isDarkTheme: boolean;
        }

        class _ParallelWorkQueue {
            constructor(maxRunning: number);
            sort(sortFunc: (a: any, b: any) => number);
            queue(f: () => WinJS.Promise<any>, data?: any, first?: boolean);
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

        interface IContentDialogDom {
            root: HTMLElement;
            backgroundOverlay: HTMLElement;
            startBodyTab: HTMLElement;
            dialog: HTMLElement;
            title: HTMLElement;
            scroller: HTMLElement;
            commandContainer: HTMLElement;
            commands: HTMLElement;
            endBodyTab: HTMLElement;
            content: HTMLElement;
        }

        class PrivateContentDialog extends WinJS.UI.ContentDialog {
            static _ClassNames: any;
            _playEntranceAnimation(): Promise<any>;
            _playExitAnimation(): Promise<any>;
            _disposed: boolean;
            _state: any;
            _dom: IContentDialogDom;
            _updateTabIndices();
            _updateTabIndicesImpl();
        }

        interface ISplitViewDom {
            root: HTMLElement;
            pane: HTMLElement;
            startPaneTab: HTMLElement;
            endPaneTab: HTMLElement;
            paneOutline: HTMLElement;
            paneWrapper: HTMLElement;
            panePlaceholder: HTMLElement;
            content: HTMLElement;
            contentWrapper: HTMLElement;
        }

        class PrivateSplitView extends WinJS.UI.SplitView {
            static _ClassNames: {
                splitView: string;
                pane: string;
                content: string;
                // closed/opened
                paneOpened: string;
                paneClosed: string;
            }

            _dom: ISplitViewDom;
            _playShowAnimation(): Promise<any>;
            _playHideAnimation(): Promise<any>;
            _prepareAnimation(paneRect: any, contentRect: any): void;
            _clearAnimation(): void;
            _disposed: boolean;
            _machine: IOpenCloseMachine
            _updateTabIndices();
            _updateTabIndicesImpl();
        }

        class PrivateSplitViewPaneToggle extends WinJS.UI.SplitViewPaneToggle {
            static _ClassNames: {
                splitViewPaneToggle: string;
            }

            _onAriaExpandedPropertyChanged(mutations: IMutationRecordShim[]): void;
            _invoked(): void;
            _disposed: boolean;
        }

        class PrivateSplitViewCommand extends SplitViewCommand {
            _buttonEl:  HTMLElement;
            _disposed: boolean;
            static _EventName: {
                invoked: string;
                _splitToggle: string;
            };
        }
                
        var ScrollMode: { text: string; nonModalText: string; list: string; };

        class ScrollViewer {
            element: HTMLElement;
            scrollMode: string;

            _refreshDone: () => any;
            _scrollingContainer: HTMLElement;
            _scrollingIndicatorElement: HTMLElement;
            _vuiActive: boolean;

            constructor(element?: HTMLElement, options?: any);

            dispose(): any;

            _setActive(): any;
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

        module _ListViewAnimationHelper {
            function fadeInElement(element): Promise<any>;
            function fadeOutElement(element): Promise<any>;
            function animateEntrance(canvas, firstEntrance): Promise<any>;
        }

        module _VirtualizeContentsView {
            var _maxTimePerCreateContainers;
            var _chunkSize;
            var _disableCustomPagesPrefetch;
            var _defaultPagesToPrefetch;
            var _createContainersJobTimeslice;
            var _startupChunkSize;
            var _iOSMaxLeadingPages;
            var _iOSMaxTrailingPages;
        }

        class PrivateAutoSuggestBox extends WinJS.UI.AutoSuggestBox {
            _disposed: boolean;
            _inputElement: HTMLInputElement;
            _isFlyoutPointerDown: boolean;
            _flyoutElement: HTMLDivElement;
            _lastKeyPressLanguage: string;
            _repeater: WinJS.UI.Repeater;
            _repeaterElement: HTMLDivElement;

            _inputOrImeChangeHandler(eventArg: Event);
            _tryGetInputContext(): MSInputMethodContext;

            static _sortAndMergeHits(hitsProvided?);
            static _EventNames: {
                querychanged;
                querysubmitted;
                resultsuggestionchosen;
                suggestionsrequested;
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
            maxTrailingPages: number;
            maxLeadingPages: number;
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

        class PrivateCommandingSurface extends WinJS.UI._CommandingSurface {
            _disposed: boolean;
            _primaryCommands: PrivateCommand[];
            _secondaryCommands: PrivateCommand[];
            _getCommandWidth(command: ICommand): number;
            _contentFlyout: WinJS.UI.PrivateFlyout;
            _contentFlyoutInterior: HTMLElement;
            _dom: {
                root: HTMLElement;
                actionArea: HTMLElement;
                actionAreaContainer: HTMLElement;
                spacer: HTMLDivElement;
                overflowButton: HTMLButtonElement;
                overflowArea: HTMLElement;
                overflowAreaContainer: HTMLElement;
                firstTabStop: HTMLElement;
                finalTabStop: HTMLElement;
            };
            _machine: IOpenCloseMachine;
            _batchDataUpdates(updateFn: () => void): void;
            _layoutCompleteCallback(): any;
            _canMeasure(): boolean;
            _menuCommandProjections: PrivateMenuCommand[];
        }

        class PrivateAppBar extends WinJS.UI.AppBar {
            _disposed: boolean;
            _dom: {
                root: HTMLElement;
                commandingSurfaceEl: HTMLElement;
            };
            _commandingSurface: WinJS.UI.PrivateCommandingSurface;
            _shouldAdjustForShowingKeyboard: () => boolean;
            _handleShowingKeyboard: () => Promise<any>;
            _handleHidingKeyboard: () => void;
            _updateDomImpl_renderedState: {
                adjustedOffsets: { top: string; bottom: string; };
            }
            _dismissable: _LightDismissService.ILightDismissable;
        }

        class PrivateToolBar extends WinJS.UI.ToolBar {
            _disposed: boolean;
            _dom: {
                root: HTMLElement;
                commandingSurfaceEl: HTMLElement;
                placeHolder: HTMLElement;
            };
            _commandingSurface: WinJS.UI.PrivateCommandingSurface;
            _dismissable: _LightDismissService.ILightDismissable;
            _handleShowingKeyboard: () => void;
        }

        export interface AppBarCommandPropertyMutatedEventObj {
            detail: {
                command: ICommand;
                oldValue: any;
                newValue: any;
                propertyName: string;
            };
        }

        class PrivateCommand extends WinJS.UI.AppBarCommand {
            winControl: ICommand;
            _commandBarIconButton;
            _disposed;
            _tooltipControl;
            _lastElementFocus;
            _propertyMutations: {
                bind(callback: any): void;
                unbind(callback: any): void;
                dispatchEvent(type: string, eventProperties: any): boolean;
            }
        }

        /**
        * Remnants of the previous implementation of the AppBar control, contains limited functionality. 
          Currently only used by NavBar and is planned to be replaced by a new implementation.
        **/
        class _LegacyAppBar {
            constructor(element?: HTMLElement, options?: any);
            onafterclose(eventInfo: Event): void;
            onafteropen(eventInfo: Event): void;
            onbeforeclose(eventInfo: Event): void;
            onbeforeopen(eventInfo: Event): void;
            addEventListener(type: string, listener: Function, useCapture?: boolean): void;
            dispatchEvent(type: string, eventProperties: any): boolean;
            dispose(): void;
            getCommandById(id: string): AppBarCommand;
            close(): void;
            hideCommands(commands: any[], immediate?: boolean): void;
            removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
            open(): void;
            showCommands(commands: any[], immediate?: boolean): void;
            showOnlyCommands(commands: any[], immediate?: boolean): void;
            closedDisplayMode: string;
            commands: AppBarCommand[];
            element: HTMLElement;
            opened: boolean;
            placement: string;
        }
        class PrivateLegacyAppBar extends _LegacyAppBar {
            getCommandById(id: string): PrivateCommand;
            showCommands(commands: any[], immediate?: boolean): void;
            showCommands(commands: any, immediate?: boolean): void;
            hideCommands(commands: any[], immediate?: boolean): void;
            hideCommands(commands: any, immediate?: boolean): void;
            showOnlyCommands(commands: any[], immediate?: boolean): void;
            showOnlyCommands(commands: any, immediate?: boolean): void;
            commands: any[];
            _disposed;
            _getCommands;
            _uniqueId;
            _updateFirstAndFinalDiv;
            _layout;
            _layoutImpl;
            _visiblePosition;
            _invokeButton: HTMLButtonElement;

            static _currentAppBarId;
            static _appBarsSynchronizationPromise;
        }

        class PrivateFlyout extends Flyout {
            _disposed: boolean;

            static _cascadeManager;
        }

        class PrivateMenuCommand extends MenuCommand {
            _disposed;
            _toggleSpan;
            _labelSpan;
            _flyoutSpan;
            _invoke;
            static _activateFlyoutCommand: (command: WinJS.UI.PrivateMenuCommand) => Promise<any>;
            static _deactivateFlyoutCommand: (command: WinJS.UI.PrivateMenuCommand) => Promise<any>;
        }

        class PrivateMenu extends Menu {
            _disposed;
        }

        class PrivateSettingsFlyout extends SettingsFlyout {
            _disposed;
        }

        class PrivateNavBar extends NavBar {
            _disposed;
        }

        class PrivateNavBarCommand extends NavBarCommand {
            _buttonEl;
            _disposed;
            _splitButtonEl;
            static _EventName;
        }

        class PrivateNavBarContainer extends NavBarContainer {
            _surfaceEl;
            _measured;
            _scrollPosition
            _sizes;
            _disposed;

            static _EventName;
        }

        class PrivateHub extends Hub {
            sections: WinJS.Binding.List<PrivateHubSection>;
            _viewportElement;

            _isInteractive(element: Element): boolean;

            static _EventName;
            static _ClassName;
            static LoadingState;
            static AnimationType;
        }

        class PrivateHubSection extends HubSection {
            _headerContentElement;
            _setHeaderTemplate;
            _headerTabStopElement;

            static _ClassName;
            static _Constants;
        }

        class PrivateBackButton extends BackButton {
            static _getReferenceCount(): number;
        }

        class PrivateRating extends Rating {
            _ensureTooltips;
            _toolTips;
            _disposed;
        }

        class PrivatePivot extends Pivot {

            _viewportElement;
            _goNext;
            _goPrevious;
            _headersContainerElement;
            _headerItemsElement;
            _headersState;
            forceLayout();

            _getHeaderItemsWidth(): number;
            _getViewportWidth(): number;

            static _ClassNames;
            static _EventNames;
        }

        class PrivatePivotItem extends PivotItem {
            static _ClassName;
        }

        class _CommandingSurface {
            public static ClosedDisplayMode: {
                none: string;
                minimal: string;
                compact: string;
                full: string;
            };
            public static OverflowDirection: {
                bottom: string;
                top: string;
            };
            public element: HTMLElement;
            public data: WinJS.Binding.List<ICommand>;
            constructor(element?: HTMLElement, options?: any);
            public dispose(): void;
            public forceLayout(): void;
            public closedDisplayMode: string;
            public createOpenAnimation(): { execute(): Promise<any> };
            public createCloseAnimation(): { execute(): Promise<any> };
            public open(): void;
            public close(): void;
            public opened: boolean;
            public getCommandById(id: string): ICommand;
            public showOnlyCommands(commands: Array<string|ICommand>): void;
            public onbeforeopen: (ev: CustomEvent) => void;
            public onafteropen: (ev: CustomEvent) => void;
            public onbeforeclose: (ev: CustomEvent) => void;
            public onafterclose: (ev: CustomEvent) => void;
            public overflowDirection: string;
            public addEventListener(eventName: string, eventHandler: Function, useCapture?: boolean): void;
            public removeEventListener(eventName: string, eventCallback: Function, useCapture?: boolean): void;
            public dispatchEvent(type: string, eventProperties: any): boolean;
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
        var _lastInputType;
        var _InputTypes: {
            mouse: string;
            keyboard: string;
            touch: string;
            pen: string;
        };
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
        var _INVALID_INDEX;

        var _seenUrlsMaxSize: number;
        var _seenUrlsMRUMaxSize: number;
        function _seenUrl(url: string);
        function _getSeenUrlsMRU(): string[];
        function _getSeenUrls(): string[];

        function _animationTimeAdjustment(time: number);

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
        var _Overlay;
        var _AppBarCommandsLayout;

        module XYFocus {
            var _iframeHelper: any;

            function _xyFocus(direction: string, referenceRect?: IRect): void;
        }

        module Pages {
            function _remove(frag);
            var _cacheStore;
        }

        module Fragments {
            var _cacheStore;
            function clearCache();
            var _getFragmentContents;
            var _writeProfilerMark;
        }
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