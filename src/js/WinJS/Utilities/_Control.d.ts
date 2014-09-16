// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/**
    * Adds the set of declaratively specified options (properties and events) to the specified control. If name of the options property begins with "on", the property value is a function and the control supports addEventListener. setControl calls addEventListener on the control.
    * @param control The control on which the properties and events are to be applied.
    * @param options The set of options that are specified declaratively.
**/
export declare function setOptions(control: any, options?: any): void;

/**
    * Adds event-related methods to the control.
**/
export declare class DOMEventMixin {
    //#region Methods

    /**
     * Adds an event listener to the control.
     * @param type The type (name) of the event.
     * @param listener The listener to invoke when the event gets raised.
     * @param useCapture true to initiate capture; otherwise, false.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Raises an event of the specified type, adding the specified additional properties.
     * @param type The type (name) of the event.
     * @param eventProperties The set of additional properties to be attached to the event object when the event is raised.
     * @returns true if preventDefault was called on the event, otherwise false.
    **/
    dispatchEvent(type: string, eventProperties: any): boolean;

    /**
     * Removes an event listener from the control.
     * @param type The type (name) of the event.
     * @param listener The listener to remove.
     * @param useCapture true to initiate capture; otherwise, false.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Adds the set of declaratively specified options (properties and events) to the specified control. If the name of the options property begins with "on", the property value is a function and the control supports addEventListener. This method calls the addEventListener method on the control.
     * @param control The control on which the properties and events are to be applied.
     * @param options The set of options that are specified declaratively.
    **/
    setOptions(control: any, options: any): void;

    //#endregion Methods

}
