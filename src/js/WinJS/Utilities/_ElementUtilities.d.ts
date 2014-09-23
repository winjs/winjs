// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Promise = require("../Promise");

//#region Enumerations
/**
    * Defines a set of keyboard values.
**/
export declare enum Key {
    /**
        * The BACKSPACE key.
    **/
    backspace,
    /**
        * The TAB key.
    **/
    tab,
    /**
        * The ENTER key.
    **/
    enter,
    /**
        * The SHIFT key.
    **/
    shift,
    /**
        * The CTRL key.
    **/
    ctrl,
    /**
        * The ALT key.
    **/
    alt,
    /**
        * The PAUSE key.
    **/
    pause,
    /**
        * The CAPS LOCK key.
    **/
    capsLock,
    /**
        * The ESCAPE key.
    **/
    escape,
    /**
        * The SPACE key.
    **/
    space,
    /**
        * The PAGE UP key.
    **/
    pageUp,
    /**
        * The PAGE DOWN key.
    **/
    pageDown,
    /**
        * The END key.
    **/
    end,
    /**
        * The HOME key.
    **/
    home,
    /**
        * The LEFT ARROW key.
    **/
    leftArrow,
    /**
        * The UP ARROW key.
    **/
    upArrow,
    /**
        * The RIGHT ARROW key.
    **/
    rightArrow,
    /**
        * The DOWN ARROW key.
    **/
    downArrow,
    /**
        * The INSERT key.
    **/
    insert,
    /**
        * The DELETE key.
    **/
    deleteKey,
    /**
        * The 0 key.
    **/
    num0,
    /**
        * The 1 key.
    **/
    num1,
    /**
        * The 2 key.
    **/
    num2,
    /**
        * The 3 key.
    **/
    num3,
    /**
        * The 4 key.
    **/
    num4,
    /**
        * The 5 key.
    **/
    num5,
    /**
        * The 6 key.
    **/
    num6,
    /**
        * The 7 key.
    **/
    num7,
    /**
        * The 8 key.
    **/
    num8,
    /**
        * The 9 key.
    **/
    num9,
    /**
        * The a key.
    **/
    a,
    /**
        * The b key.
    **/
    b,
    /**
        * The c key.
    **/
    c,
    /**
        * The d key.
    **/
    d,
    /**
        * The e key.
    **/
    e,
    /**
        * The f key.
    **/
    f,
    /**
        * The g key.
    **/
    g,
    /**
        * The h key.
    **/
    h,
    /**
        * The i key.
    **/
    i,
    /**
        * The j key.
    **/
    j,
    /**
        * The k key.
    **/
    k,
    /**
        * The l key.
    **/
    l,
    /**
        * The m key.
    **/
    m,
    /**
        * The n key.
    **/
    n,
    /**
        * The o key.
    **/
    o,
    /**
        * The p key.
    **/
    p,
    /**
        * The q key.
    **/
    q,
    /**
        * The r key.
    **/
    r,
    /**
        * The s key.
    **/
    s,
    /**
        * The t key.
    **/
    t,
    /**
        * The u key.
    **/
    u,
    /**
        * The v key.
    **/
    v,
    /**
        * The w key.
    **/
    w,
    /**
        * The x key.
    **/
    x,
    /**
        * The y key.
    **/
    y,
    /**
        * The z key.
    **/
    z,
    /**
        * The left Windows key.
    **/
    leftWindows,
    /**
        * The right Windows key.
    **/
    rightWindows,
    /**
        * The menu key.
    **/
    menu,
    /**
        * The 0 key on the numerical keypad.
    **/
    numPad0,
    /**
        * The 1 key on the numerical keypad.
    **/
    numPad1,
    /**
        * The 2 key on the numerical keypad.
    **/
    numPad2,
    /**
        * The 3 key on the numerical keypad.
    **/
    numPad3,
    /**
        * The 4 key on the numerical keypad.
    **/
    numPad4,
    /**
        * The 5 key on the numerical keypad.
    **/
    numPad5,
    /**
        * The 6 key on the numerical keypad.
    **/
    numPad6,
    /**
        * The 7 key on the numerical keypad.
    **/
    numPad7,
    /**
        * The 8 key on the numerical keypad.
    **/
    numPad8,
    /**
        * The 9 key on the numerical keypad.
    **/
    numPad9,
    /**
        * The multiplication key (*).
    **/
    multiply,
    /**
        * The addition key (+).
    **/
    add,
    /**
        * The subtraction key (-).
    **/
    subtract,
    /**
        * The decimal point key (.)
    **/
    decimalPoint,
    /**
        * The division key (/).
    **/
    divide,
    /**
        * The F1 key.
    **/
    F1,
    /**
        * The F2 key.
    **/
    F2,
    /**
        * The F3 key.
    **/
    F3,
    /**
        * The F4 key.
    **/
    F4,
    /**
        * The F5 key.
    **/
    F5,
    /**
        * The F6 key.
    **/
    F6,
    /**
        * The F7 key.
    **/
    F7,
    /**
        * The F8 key.
    **/
    F8,
    /**
        * The F9 key.
    **/
    F9,
    /**
        * The F10 key.
    **/
    F10,
    /**
        * The F11 key.
    **/
    F11,
    /**
        * The F12 key.
    **/
    F12,
    /**
        * The NUMBER LOCK key.
    **/
    numLock,
    /**
        * The SCROLL LOCK key.
    **/
    scrollLock,
    /**
        * The browser BACK key.
    **/
    browserBack,
    /**
        * The browser FORWARD key.
    **/
    browserForward,
    /**
        * The semicolon key (;).
    **/
    semicolon,
    /**
        * The equals key (=).
    **/
    equal,
    /**
        * The comma key (,).
    **/
    comma,
    /**
        * The dash key (-).
    **/
    dash,
    /**
        * The period key (.).
    **/
    period,
    /**
        * The forward slash key (/).
    **/
    forwardSlash,
    /**
        * The grave accent key (`).
    **/
    graveAccent,
    /**
        * The open bracket key ([).
    **/
    openBracket,
    /**
        * The backslash key (\).
    **/
    backSlash,
    /**
        * The close bracket key (]).
    **/
    closeBracket,
    /**
        * The single quote key (').
    **/
    singleQuote
}

//#endregion Enumerations

//#region Objects

/**
    * A mixin that contains event-related functions.
**/
export declare var eventMixin: {
    //#region Methods

    /**
        * Adds an event listener to the control.
        * @param type The type (name) of the event.
        * @param listener The listener to invoke when the event gets raised.
        * @param useCapture If true, initiates capture, otherwise false.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
        * Raises an event of the specified type and with the specified additional properties.
        * @param type The type (name) of the event.
        * @param eventProperties The set of additional properties to be attached to the event object when the event is raised.
        * @returns true if preventDefault was called on the event.
    **/
    dispatchEvent(type: string, eventProperties: any): boolean;

    /**
        * Removes an event listener from the control.
        * @param type The type (name) of the event.
        * @param listener The listener to remove.
        * @param useCapture true if capture is to be initiated, otherwise false.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    //#endregion Methods

};

/**
    * Represents the result of a query selector, and provides various operations that perform actions over the elements of the collection.
**/
export interface QueryCollection<T> extends Array<T> {
    //#region Methods

    /**
        * Adds the specified class to all the elements in the collection.
        * @param name The name of the class to add.
        * @returns This QueryCollection object.
    **/
    addClass(name: string): QueryCollection<T>;

    /**
        * Creates a QueryCollection that contains the children of the specified parent element.
        * @param element The parent element.
        * @returns The QueryCollection that contains the children of the element.
    **/
    children(element: HTMLElement): QueryCollection<T>;

    /**
        * Clears the specified style property for all the elements in the collection.
        * @param name The name of the style property to be cleared.
        * @returns This QueryCollection object.
    **/
    clearStyle(name: string): QueryCollection<T>;

    /**
        * Creates controls that are attached to the elements in this QueryCollection, if the ctor parameter is a function, or configures the controls that are attached to the elements in this QueryCollection, if the ctor parameter is an object.
        * @param ctor If this parameter is a function, it is a constructor function that is used to create controls to attach to the elements. If it is an object, it is the set of options passed to the controls.
        * @param options The options passed to the newly-created controls.
        * @returns This QueryCollection object.
    **/
    control(ctor: any, options?: any): QueryCollection<T>;

    /**
        * Performs an action on each item in the QueryCollection.
        * @param callbackFn The action to perform on each item.
        * @param thisArg The argument to bind to callbackFn.
        * @returns The QueryCollection.
    **/
    forEach(callbackFn: (value: T, index: number, array: T[]) => void, thisArg?: any): QueryCollection<T>;

    /**
        * Gets an item from the QueryCollection.
        * @param index The index of the item to return.
        * @returns A single item from the collection.
    **/
    get(index: number): T;

    /**
        * Gets an attribute value from the first element in the collection.
        * @param name The name of the attribute.
        * @returns The value of the attribute.
    **/
    getAttribute(name: string): any;

    /**
        * Determines whether the specified class exists on the first element of the collection.
        * @param name The name of the class.
        * @returns true if the element has the specified class; otherwise, false.
    **/
    hasClass(name: string): boolean;

    /**
        * Looks up an element by ID and wraps the result in a QueryCollection.
        * @param id The ID of the element.
        * @returns A QueryCollection that contains the element, if it is found.
    **/
    id(id: string): QueryCollection<T>;

    /**
        * Adds a set of items to this QueryCollection.
        * @param items The items to add to the QueryCollection. This may be an array-like object, a document fragment, or a single item.
    **/
    include(items: T): void;

    /**
        * Adds a set of items to this QueryCollection.
        * @param items The items to add to the QueryCollection. This may be an array-like object, a document fragment, or a single item.
    **/
    include(items: T[]): void;

    /**
        * Registers the listener for the specified event on all the elements in the collection.
        * @param eventType The name of the event.
        * @param listener The event handler function to be called when the event occurs.
        * @param capture true if capture == true is to be passed to addEventListener; otherwise, false.
    **/
    listen(eventType: string, listener: Function, capture?: boolean): void;

    /**
        * Executes a query selector on all the elements in the collection and aggregates the result into a QueryCollection.
        * @param query The query selector string.
        * @returns A QueryCollection object containing the aggregate results of executing the query on all the elements in the collection.
    **/
    query(query: any): QueryCollection<T>;

    /**
        * Removes the specified class from all the elements in the collection.
        * @param name The name of the class to be removed.
        * @returns his QueryCollection object.
    **/
    removeClass(name: string): QueryCollection<T>;

    /**
        * Unregisters the listener for the specified event on all the elements in the collection.
        * @param eventType The name of the event.
        * @param listener The event handler function.
        * @param capture true if capture == true; otherwise, false.
        * @returns This QueryCollection object.
    **/
    removeEventListener(eventType: string, listener: Function, capture?: boolean): QueryCollection<T>;

    /**
        * Sets an attribute value on all the items in the collection.
        * @param name The name of the attribute to be set.
        * @param value The value of the attribute to be set.
        * @returns This QueryCollection object.
    **/
    setAttribute(name: string, value: any): QueryCollection<T>;

    /**
        * Sets the specified style property for all the elements in the collection.
        * @param name The name of the style property.
        * @param value The value for the property.
        * @returns This QueryCollection object.
    **/
    setStyle(name: string, value: any): QueryCollection<T>;

    /**
        * Renders a template that is bound to the given data and parented to the elements included in the QueryCollection. If the QueryCollection contains multiple elements, the template is rendered multiple times, once at each element in the QueryCollection per item of data passed.
        * @param templateElement The DOM element to which the template control is attached.
        * @param data The data to render. If the data is an array (or any other object that has a forEach method) then the template is rendered multiple times, once for each item in the collection.
        * @param renderDonePromiseCallback If supplied, this function is called each time the template gets rendered, and is passed a promise that is fulfilled when the template rendering is complete.
        * @returns The QueryCollection.
    **/
    template(templateElement: HTMLElement, data: any, renderDonePromiseCallback: Function): QueryCollection<T>;

    /**
        * Toggles (adds or removes) the specified class on all the elements in the collection. If the class is present, it is removed; if it is absent, it is added.
        * @param name The name of the class to be toggled.
        * @returns This QueryCollection object.
    **/
    toggleClass(name: string): QueryCollection<T>;

    //#endregion Methods

}

/**
    * Constructor support for QueryCollection interface
**/
export declare var QueryCollection: {
    new <T>(items: T[]): QueryCollection<T>;
    prototype: QueryCollection<any>;
}

//#endregion Objects

//#region Functions

/**
    * Adds the specified class to the specified element.
    * @param e The element to which to add the class.
    * @param name The name of the class to add.
    * @returns The element.
**/
export declare  function addClass<T extends HTMLElement>(e: T, name: string): T;

/**
    * Gets a collection of elements that are the direct children of the specified element.
    * @param element The parent element.
    * @returns The collection of children of the element.
**/
export declare function children(element: HTMLElement): QueryCollection<HTMLElement>;

/**
    * Converts a CSS positioning string for the specified element to pixels.
    * @param element The element.
    * @param value The CSS positioning string.
    * @returns The number of pixels.
**/
export declare function convertToPixels(element: HTMLElement, value: string): number;

/**
    * Creates an object that has one event for each name passed to the function.
    * @param events A variable list of property names.
    * @returns The object with the specified properties. The names of the properties are prefixed with 'on'.
**/
export declare function createEventProperties(...events: string[]): any;

/**
    * Gets the data value associated with the specified element.
    * @param element The element.
    * @returns The value associated with the element.
**/
export declare function data(element: HTMLElement): any;

/**
    * Disposes all first-generation disposable elements that are descendents of the specified element. The specified element itself is not disposed.
    * @param element The root element whose sub-tree is to be disposed.
**/
export declare function disposeSubTree(element: HTMLElement): void;

/**
    * Removes all the child nodes from the specified element.
    * @param element The element.
    * @returns The element.
**/
export declare function empty<T extends HTMLElement>(element: T): T;

/**
    * Determines whether the specified event occurred within the specified element.
    * @param element The element.
    * @param event The event.
    * @returns true if the event occurred within the element; otherwise, false.
**/
export declare function eventWithinElement(element: HTMLElement, event: Event): boolean;

/**
    * Adds tags and type to a logging message.
    * @param message The message to be formatted.
    * @param tag The tag(s) to be applied to the message. Multiple tags should be separated by spaces.
    * @param type The type of the message.
    * @returns The formatted message.
**/
export declare function formatLog(message: string, tag: string, type: string): string;

/**
    * Gets the height of the content of the specified element. The content height does not include borders or padding.
    * @param element The element.
    * @returns The content height of the element.
**/
export declare function getContentHeight(element: HTMLElement): number;

/**
    * Gets the width of the content of the specified element. The content width does not include borders or padding.
    * @param element The element.
    * @returns The content width of the element.
**/
export declare function getContentWidth(element: HTMLElement): number;

/**
    * Gets the leaf-level type or namespace specified by the name parameter.
    * @param name The name of the member.
    * @param root The root to start in. Defaults to the global object.
    * @returns The leaf-level type or namespace in the specified parent namespace.
**/
export declare function getMember(name: string, root?: any): any;

/**
    * Gets the position of the specified element.
    * @param element The element.
    * @returns An object that contains the left, top, width and height properties of the element.
**/
export declare function getPosition(element: HTMLElement): IPosition;

/**
    * Gets the left coordinate of the specified element relative to the specified parent.
    * @param element The element.
    * @param parent The parent element.
    * @returns The relative left coordinate.
**/
export declare function getRelativeLeft(element: HTMLElement, parent: HTMLElement): number;

/**
    * Gets the top coordinate of the element relative to the specified parent.
    * @param element The element.
    * @param parent The parent element.
    * @returns The relative top coordinate.
**/
export declare function getRelativeTop(element: HTMLElement, parent: HTMLElement): number;

/**
    * Gets the height of the element, including its margins.
    * @param element The element.
    * @returns The height of the element including margins.
**/
export declare function getTotalHeight(element: HTMLElement): number;

/**
    * Gets the width of the element, including margins.
    * @param element The element.
    * @returns The width of the element including margins.
**/
export declare function getTotalWidth(element: HTMLElement): number;

/**
    * Determines whether the specified element has the specified class.
    * @param e The element.
    * @param name The name of the class.
    * @returns true if the element has the class, otherwise false.
**/
export declare function hasClass(e: HTMLElement, name: string): boolean;

/**
    * Returns a collection with zero or one elements matching the specified id.
    * @param id The ID of the element (or elements).
    * @returns A collection of elements whose id matches the id parameter.
**/
export declare function id(id: string): QueryCollection<HTMLElement>;

/**
    * Calls insertAdjacentHTML on the specified element.
    * @param element The element on which insertAdjacentHTML is to be called.
    * @param position The position relative to the element at which to insert the HTML. Possible values are: beforebegin, afterbegin, beforeend, afterend.
    * @param text The text to insert.
**/
export declare function insertAdjacentHTML(element: HTMLElement, position: string, text: string): void;

/**
    * Calls insertAdjacentHTML on the specified element in the context of MSApp.execUnsafeLocalFunction.
    * @param element The element on which insertAdjacentHTML is to be called.
    * @param position The position relative to the element at which to insert the HTML. Possible values are: beforebegin, afterbegin, beforeend, afterend.
    * @param text Value to be provided to insertAdjacentHTML.
**/
export declare function insertAdjacentHTMLUnsafe(element: HTMLElement, position: string, text: string): void;

/**
    * Attaches the default dispose API wrapping the dispose implementation to the specified element.
    * @param element The element to mark as disposable.
    * @param disposeImpl The function containing the element-specific dispose logic, called by the dispose function that markDisposable attaches.
**/
export declare function markDisposable(element: HTMLElement, disposeImpl?: Function): void;

/**
    * Marks a function as being compatible with declarative processing. Declarative processing is performed by WinJS.UI.processAll or WinJS.Binding.processAll.
    * @param func The function to be marked as compatible with declarative processing.
    * @returns The input function, marked as compatible with declarative processing.
**/
export declare function markSupportedForProcessing<U extends Function>(func: U): U;

/**
    * Returns a QueryCollection with zero or one elements matching the specified selector query.
    * @param query The CSS selector to use. See Selectors for more information.
    * @param element Optional. The root element at which to start the query. If this parameter is omitted, the scope of the query is the entire document.
    * @returns A QueryCollection with zero or one elements matching the specified selector query.
**/
export declare function query(query: any, element?: HTMLElement): QueryCollection<HTMLElement>;

/**
    * Ensures that the specified function executes only after the DOMContentLoaded event has fired for the current page. The DOMContentLoaded event occurs after the page has been parsed but before all the resources are loaded.
    * @param callback A function that executes after the DOMContentLoaded event has occurred.
    * @param async If true, the callback should be executed asynchronously.
    * @returns A promise that completes after the DOMContentLoaded event has occurred.
**/
export declare function ready(callback?: Function, async?: boolean): Promise<any>;

/**
    * Removes the specified class from the specified element.
    * @param e The element from which to remove the class.
    * @param name The name of the class to remove.
    * @returns The element.
**/
export declare function removeClass<T extends HTMLElement>(e: T, name: string): T;

/**
    * Asserts that the value is compatible with declarative processing. Declarative processing is performed by WinJS.UI.processAll or WinJS.Binding.processAll. If the value is not compatible, and strictProcessing is on, an exception is thrown. All functions that have been declared using WinJS.Class.define, WinJS.Class.derive, WinJS.UI.Pages.define, or WinJS.Binding.converter are automatically marked as supported for declarative processing. Any other function that you use from a declarative context (that is, a context in which an HTML element has a data-win-control or data-win-options attribute) must be marked manually by calling this function. When you mark a function as supported for declarative processing, you are guaranteeing that the code in the function is secure from injection of third-party content.
    * @param value The value to be tested for compatibility with declarative processing. If the value is a function it must be marked with a property supportedForProcessing with a value of true when strictProcessing is on. For more information, see WinJS.Utilities.markSupportedForProcessing.
    * @returns The input value.
**/
export declare function requireSupportedForProcessing<T>(value: T): T;

/**
    * Sets the innerHTML property of the specified element to the specified text.
    * @param element The element on which the innerHTML property is to be set.
    * @param text The value to be set to the innerHTML property.
**/
export declare function setInnerHTML(element: HTMLElement, text: string): void;

/**
    * Sets the innerHTML property of the specified element to the specified text.
    * @param element The element on which the innerHTML property is to be set.
    * @param text The value to be set to the innerHTML property.
**/
export declare function setInnerHTMLUnsafe(element: HTMLElement, text: string): void;

/**
    * Sets the outerHTML property of the specified element to the specified text.
    * @param element The element on which the outerHTML property is to be set.
    * @param text The value to be set to the outerHTML property.
**/
export declare function setOuterHTML(element: HTMLElement, text: string): void;

/**
    * Sets the outerHTML property of the specified element to the specified text in the context of MSApp.execUnsafeLocalFunction.
    * @param element The element on which the outerHTML property is to be set.
    * @param text The value to be set to the outerHTML property.
**/
export declare function setOuterHTMLUnsafe(element: HTMLElement, text: string): void;

/**
    * Configures a logger that writes messages containing the specified tags to the JavaScript console.
    * @param options The tags for messages to log. Multiple tags should be separated by spaces. May contain type, tags, excludeTags and action properties.
**/
export declare function startLog(options?: ILogOptions): void;
export declare function startLog(tags?: string): void;

/**
    * Removes the WinJS logger that had previously been set up.
**/
export declare function stopLog(): void;

/**
    * Toggles (adds or removes) the specified class on the specified element. If the class is present, it is removed; if it is absent, it is added.
    * @param e The element on which to toggle the class.
    * @param name The name of the class to toggle.
    * @returns The element.
**/
export declare function toggleClass<T extends HTMLElement>(e: T, name: string): T;

//#endregion Functions

//#region Properties

/**
    * Gets whether the current script context has access to WinRT APIs.
**/
export declare var hasWinRT: boolean;

/**
    * Indicates whether the app is running on Windows Phone.
**/
export declare var isPhone: boolean;

//#endregion Properties

//#region Interfaces

export interface ILogOptions {
    type?: string;
    action?: (message: string, tags: string, type: string) => void;
    excludeTags?: string;
    tags?: string;
}

export interface IPosition {
    left: number;
    top: number;
    width: number;
    height: number;
}

//#endregion Interfaces

export declare function _uniqueID(e: HTMLElement): string;

export declare module _resizeNotifier {
    export function subscribe(element: HTMLElement, handler: (ev: any) => any): void;
    export function unsubscribe(element: HTMLElement, handler: (ev: any) => any): void;
}


export declare function _addInsertedNotifier(element: HTMLElement): void;
export declare function _reparentChildren(originalParent: HTMLElement, destinationParent: HTMLElement): void;
export declare function _matchesSelector(element:HTMLElement, selectors: string): boolean;
export declare function _addEventListener(element: HTMLElement, type: string, listener: EventListener, useCapture?: boolean): void;