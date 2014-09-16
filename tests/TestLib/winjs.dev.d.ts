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

        function _require(deps: string[], callback);
        function _uniqueID(e: HTMLElement):string;
        function _isDOMElement(e: HTMLElement): boolean;

        function _yieldForEvents(handler: Function);

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
            function fadeOutElement(element): Promise < any>;
            function animateEntrance(canvas, firstEntrance): Promise<any>;
        }

        module _VirtualizeContentsView {
            var _maxTimePerCreateContainers;
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
            _selectedCustomCommand: ICommand;
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

        var _seenUrlsMaxSize: number;
        var _seenUrlsMRUMaxSize: number;
        function _seenUrl(url:string);
        function _getSeenUrlsMRU(): string[];
        function _getSeenUrls(): string[];
    }
}