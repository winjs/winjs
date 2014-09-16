// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Promise = require("Promise");

/**
     * Applies declarative control binding to all elements, starting at the specified root element.
     * @param rootElement The element at which to start applying the binding. If this parameter is not specified, the binding is applied to the entire document.
     * @param skipRoot If true, the elements to be bound skip the specified root element and include only the children.
     * @returns A promise that is fulfilled when binding has been applied to all the controls.
    **/
export declare function processAll(rootElement?: Element, skipRoot?: boolean): Promise<any>;

/**
 * Applies declarative control binding to the specified element.
 * @param element The element to bind.
 * @returns A promise that is fulfilled after the control is activated. The value of the promise is the control that is attached to element.
**/
export declare function process(element: Element): Promise<any>;

/**
 * Walks the DOM tree from the given element to the root of the document. Whenever a selector scope is encountered, this method performs a lookup within that scope for the specified selector string. The first matching element is returned.
 * @param selector The selector string.
 * @param element The element to begin walking to the root of the document from.
 * @returns The target element, if found.
**/
export declare function scopedSelect(selector: string, element: HTMLElement): HTMLElement;
