// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

export declare var document: HTMLDocument;
export declare var parent: Window;
export declare var screen: Screen;
export declare var top: Window;
export declare var Math: Math;
export declare var window: Window;

export declare function addEventListener(type: string, handler: EventListener, useCapture?: boolean): void;
export declare function getComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;
export declare function setTimeout(expression: any, msec?: number, language?: any): number;
