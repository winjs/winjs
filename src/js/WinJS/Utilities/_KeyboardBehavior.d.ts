// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

export declare var _keyboardSeenLast: boolean;

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
