// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

export declare class _KeyboardBehavior {
    constructor(element?: HTMLElement, options?: any);
    element: HTMLElement;
    fixedDirection: string;
    fixedSize: number;
    currentIndex: number;
    getAdjacent: HTMLElement;
    scroller: HTMLElement;
    static FixedDirection: {
        height: string;
        width: string;
    };
}

export declare class _WinKeyboard {
    constructor(element: HTMLElement);
}
