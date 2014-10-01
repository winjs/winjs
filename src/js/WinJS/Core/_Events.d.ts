// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/**
 * Creates an object that has one event for each name passed to the function.
 * @param events A variable list of property names.
 * @returns The object with the specified properties. The names of the properties are prefixed with 'on'.
**/
export declare function createEventProperties(...events: string[]): any;
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