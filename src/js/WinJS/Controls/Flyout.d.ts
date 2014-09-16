// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/**
 * Displays lightweight UI that is either information, or requires user interaction. Unlike a dialog, a Flyout can be light dismissed by clicking or tapping off of it.
**/
export declare class Flyout {
    //#region Constructors

    /**
     * Creates a new Flyout object.
     * @constructor 
     * @param element The DOM element that will host the control.
     * @param options The set of properties and values to apply to the new Flyout.
    **/
    constructor(element?: HTMLElement, options?: any);

    //#endregion Constructors

    //#region Events

    /**
     * Raised immediately after a flyout is fully hidden.
     * @param eventInfo An object that contains information about the event.
    **/
    onafterhide(eventInfo: Event): void;

    /**
     * Raised immediately after a flyout is fully shown.
     * @param eventInfo An object that contains information about the event.
    **/
    onaftershow(eventInfo: Event): void;

    /**
     * Raised just before hiding a flyout.
     * @param eventInfo An object that contains information about the event.
    **/
    onbeforehide(eventInfo: Event): void;

    /**
     * Raised just before showing a flyout.
     * @param eventInfo An object that contains information about the event.
    **/
    onbeforeshow(eventInfo: Event): void;

    //#endregion Events

    //#region Methods

    /**
     * Registers an event handler for the specified event.
     * @param type The event type to register. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to associate with the event.
     * @param useCapture Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Releases resources held by this object. Call this method when the object is no longer needed. After calling this method, the object becomes unusable.
    **/
    dispose(): void;

    /**
     * Hides the Flyout, if visible, regardless of other states.
    **/
    hide(): void;

    /**
     * Removes an event handler that the addEventListener method registered.
     * @param type The event type to unregister. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to remove.
     * @param useCapture Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Shows the Flyout, if hidden, regardless of other states.
     * @param anchor Required. The DOM element to anchor the Flyout.
     * @param placement The placement of the Flyout to the anchor: the string literal "top", "bottom", "left", "right", "auto", "autohorizontal", or "autovertical".
     * @param alignment For "top" or "bottom" placement, the alignment of the Flyout to the anchor's edge: the string literal "center", "left", or "right".
    **/
    show(anchor: HTMLElement, placement: string, alignment: string): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the default alignment to be used for this Flyout.
    **/
    alignment: string;

    /**
     * Gets or sets the default anchor to be used for this Flyout.
    **/
    anchor: HTMLElement;

    /**
     * Gets the DOM element that hosts the Flyout.
    **/
    element: HTMLElement;

    /**
     * Gets a value that indicates whether the Flyout is hidden or in the process of becoming hidden.
    **/
    hidden: boolean;

    /**
     * Gets or sets the default placement to be used for this Flyout.
    **/
    placement: string;

    //#endregion Properties

}
