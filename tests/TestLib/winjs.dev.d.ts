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

        function _traceAsyncOperationStarting();
        function _traceAsyncOperationCompleted();
        function _traceAsyncCallbackStarting();
        function _traceAsyncCallbackCompleted();

        function _require(deps: string[], callback);
        function _uniqueID(e: HTMLElement):string;
        function _isDOMElement(e: HTMLElement):boolean;

    }

    module Resources {
        function _getWinJSString(resourceId: string): { value: string; empty?: boolean; lang?: string; };
        function _getStringJS(resourceId: string): { value: string; empty?: boolean; lang?: string; };
    }

    module Application {
        var _terminateApp: (data: any, e: any) => void;
        function _loadState(e: any);
    }
}