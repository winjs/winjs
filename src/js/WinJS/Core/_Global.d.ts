// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

export declare var document: HTMLDocument;
export declare var parent: Window;

export declare function addEventListener(type: string, handler: EventListener, useCapture?: boolean): void;
export declare function getComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;
export declare function setTimeout(expression: any, msec?: number, language?: any): number;
