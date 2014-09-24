// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

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

        class PrivateAutoSuggestBox extends WinJS.UI.AutoSuggestBox {
            _disposed: boolean;
            _inputElement: HTMLInputElement;
            _flyoutElement: HTMLDivElement;
            _lastKeyPressLanguage: string;
            _repeater: WinJS.UI.Repeater;
            _repeaterElement: HTMLDivElement;

            _inputOrImeChangeHandler(eventArg: Event);

            static _sortAndMergeHits(hitsProvided?);
            static _EventNames: {
                querychanged;
                querysubmitted;
                resultsuggestionchosen;
                suggestionsrequested;
            };
        }




        /**
         * A rich input box that provides suggestions as the user types.
        **/
        class AutoSuggestBox {
            //#region Constructors

            /**
             * Creates a new AutoSuggestBox.
             * @constructor 
             * @param element The DOM element hosts the new AutoSuggestBox.
             * @param options An object that contains one or more property/value pairs to apply to the new control. Each property of the options object corresponds to one of the control's properties or events.
            **/
            constructor(element?: HTMLElement, options?: any);

            //#endregion Constructors

            //#region Events

            /**
             * Raised when the user or the app changes the queryText.
             * @param eventInfo An object that contains information about the event. The detail property of this object contains the following sub-properties: detail.language, detail.queryText, detail.linguisticDetails.
            **/
            onquerychanged(eventInfo: CustomEvent): void;

            /**
             * Raised awhen the user presses Enter.
             * @param eventInfo An object that contains information about the event. The detail property of this object contains the following sub-properties: detail.language, detail.queryText, detail.linguisticDetails, detail.keyModifiers.
            **/
            onquerysubmitted(eventInfo: CustomEvent): void;

            /**
             * Raised when the user selects a suggested option for their query.
             * @param eventInfo An object that contains information about the event. The detail property of this object contains the following sub-properties: detail.tag, detail.keyModifiers, detail.storageFile.
            **/
            onresultsuggestionschosen(eventInfo: CustomEvent): void;

            /**
             * Raised when the system requests suggestions from this app.
             * @param eventInfo An object that contains information about the event. The detail property of this object contains the following sub-properties: detail.language, detail.linguisticDetails, detail.queryText, detail.searchSuggestionCollection.
            **/
            onsuggestionsrequested(eventInfo: CustomEvent): void;

            //#endregion Events

            //#region Methods

            /**
             * Registers an event handler for the specified event.
             * @param eventName The name of the event to handle. Note that you drop the "on" when specifying the event name. For example, instead of specifying "onclick", you specify "click".
             * @param eventHandler The event handler function to associate with the event.
             * @param useCapture Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
            **/
            addEventListener(eventName: string, eventHandler: Function, useCapture?: boolean): void;

            /**
             * Raises an event of the specified type and with additional properties.
             * @param type The type (name) of the event.
             * @param eventProperties The set of additional properties to be attached to the event object when the event is raised.
             * @returns true if preventDefault was called on the event, otherwise false.
            **/
            dispatchEvent(type: string, eventProperties: any): boolean;

            /**
             * Releases resources held by this AutoSuggestBox. Call this method when the AutoSuggestBox is no longer needed. After calling this method, the AutoSuggestBox becomes unusable.
            **/
            dispose(): void;

            /**
             * Removes an event handler that the addEventListener method registered.
             * @param eventName The name of the event that the event handler is registered for.
             * @param eventCallback The event handler function to remove.
             * @param useCapture Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
            **/
            removeEventListener(eventName: string, eventCallback: Function, useCapture?: boolean): void;

            //#endregion Methods

            //#region Properties

            /**
             * Gets or sets whether the first suggestion is chosen when the user presses Enter.
            **/
            chooseSuggestionOnEnter: boolean;

            /**
             * Gets or sets a value that specifies whether the AutoSuggestBox is disabled. If the control is disabled, it won't receive focus.
            **/
            disabled: boolean;

            /**
             * Gets the DOM element that hosts the AutoSuggestBox.
            **/
            element: HTMLElement;

            /**
             * Gets or sets the placeholder text for the AutoSuggestBox. This text is displayed if there is no other text in the input box.
            **/
            placeholderText: string;

            /**
             * Gets or sets the query text for the AutoSuggestBox.
            **/
            queryText: string;

            /**
             * Gets or sets the history context. This context is used a secondary key (the app ID is the primary key) for storing history.
            **/
            searchHistoryContext: string;

            /**
             * Gets or sets a value that specifies whether history is disabled.
            **/
            searchHistoryDisabled: boolean;

            //#endregion Properties

            /**
             * Creates the image argument for SearchSuggestionCollection.appendResultSuggestion.
             * @param url The url of the image.
            **/
            static createResultSuggestionImage(url: string): any;

        }
    }
}