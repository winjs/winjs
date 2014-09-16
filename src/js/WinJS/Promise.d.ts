// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/**
 * Provides a mechanism to schedule work to be done on a value that has not yet been computed. It is an abstraction for managing interactions with asynchronous APIs. For more information about asynchronous programming, see Asynchronous programming. For more information about promises in JavaScript, see Asynchronous programming in JavaScript. For more information about using promises, see the WinJS Promise sample.
**/
declare class Promise<T> {
    //#region Constructors

    /**
     * A promise provides a mechanism to schedule work to be done on a value that has not yet been computed. It is a convenient abstraction for managing interactions with asynchronous APIs. For more information about asynchronous programming, see Asynchronous programming. For more information about promises in JavaScript, see Asynchronous programming in JavaScript. For more information about using promises, see the WinJS Promise sample.
     * @constructor 
     * @param init The function that is called during construction of the Promise that contains the implementation of the operation that the Promise will represent. This can be synchronous or asynchronous, depending on the nature of the operation. Note that placing code within this function does not automatically run it asynchronously; that must be done explicitly with other asynchronous APIs such as setImmediate, setTimeout, requestAnimationFrame, and the Windows Runtime asynchronous APIs. The init function is given three arguments: completeDispatch, errorDispatch, progressDispatch. This parameter is optional.
     * @param onCancel The function to call if a consumer of this promise wants to cancel its undone work. Promises are not required to support cancellation.
    **/
    constructor(init?: (completeDispatch: any, errorDispatch: any, progressDispatch: any) => void, onCancel?: Function);

    //#endregion Constructors

    //#region Events

    /**
     * Occurs when there is an error in processing a promise.
     * @param eventInfo An object that contains information about the event.
    **/
    onerror(eventInfo: CustomEvent): void;

    //#endregion Events

    //#region Methods

    /**
     * Adds an event listener for the promise.
     * @param type The type (name) of the event.
     * @param listener The listener to invoke when the event is raised.
     * @param capture true to initiate capture, otherwise false.
    **/
    static addEventListener(type: string, listener: Function, capture?: boolean): void;

    /**
     * Returns a promise that is fulfilled when one of the input promises has been fulfilled.
     * @param value An array that contains Promise objects or objects whose property values include Promise objects.
     * @returns A promise that on fulfillment yields the value of the input (complete or error).
    **/
    static any(value: Promise<any>[]): Promise<any>;

    /**
     * Returns a promise. If the object is already a Promise it is returned; otherwise the object is wrapped in a Promise. You can use this function when you need to treat a non-Promise object like a Promise, for example when you are calling a function that expects a promise, but already have the value needed rather than needing to get it asynchronously.
     * @param value The value to be treated as a Promise.
     * @returns The promise.
    **/
    static as<U>(value: U): Promise<U>;

    /**
     * Attempts to cancel the fulfillment of a promised value. If the promise hasn't already been fulfilled and cancellation is supported, the promise enters the error state with a value of Error("Canceled").
    **/
    cancel(): void;

    /**
     * Raises an event of the specified type and properties.
     * @param type The type (name) of the event.
     * @param details The set of additional properties to be attached to the event object.
     * @returns true if preventDefault was called on the event; otherwise, false.
    **/
    dispatchEvent(type: string, details: any): boolean;

    /**
     * Allows you to specify the work to be done on the fulfillment of the promised value, the error handling to be performed if the promise fails to fulfill a value, and the handling of progress notifications along the way. After the handlers have finished executing, this function throws any error that would have been returned from then as a promise in the error state. For more information about the differences between then and done, see the following topics: Quickstart: using promises in JavaScript How to handle errors when using promises in JavaScript Chaining promises in JavaScript.
     * @param onComplete The function to be called if the promise is fulfilled successfully with a value. The fulfilled value is passed as the single argument. If the value is null, the fulfilled value is returned. The value returned from the function becomes the fulfilled value of the promise returned by then. If an exception is thrown while executing the function, the promise returned by then moves into the error state.
     * @param onError The function to be called if the promise is fulfilled with an error. The error is passed as the single argument. If it is null, the error is forwarded. The value returned from the function is the fulfilled value of the promise returned by then.
     * @param onProgress The function to be called if the promise reports progress. Data about the progress is passed as the single argument. Promises are not required to support progress.
    **/
    done<U>(onComplete?: (value: T) => any, onError?: (error: any) => any, onProgress?: (progress: any) => void): void;

    /**
     * Determines whether a value fulfills the promise contract.
     * @param value A value that may be a promise.
     * @returns true if the object conforms to the promise contract (has a then function), otherwise false.
    **/
    static is(value: any): boolean;

    /**
     * Creates a Promise that is fulfilled when all the values are fulfilled.
     * @param values An object whose members contain values, some of which may be promises.
     * @returns A Promise whose value is an object with the same field names as those of the object in the values parameter, where each field value is the fulfilled value of a promise.
    **/
    static join(values: any): Promise<any>;

    /**
     * Removes an event listener from the control.
     * @param eventType The type (name) of the event.
     * @param listener The listener to remove.
     * @param capture Specifies whether or not to initiate capture.
    **/
    static removeEventListener(eventType: string, listener: Function, capture?: boolean): void;

    /**
     * Allows you to specify the work to be done on the fulfillment of the promised value, the error handling to be performed if the promise fails to fulfill a value, and the handling of progress notifications along the way. For more information about the differences between then and done, see the following topics: Quickstart: using promises in JavaScript How to handle errors when using promises in JavaScript Chaining promises in JavaScript.
     * @param onComplete The function to be called if the promise is fulfilled successfully with a value. The value is passed as the single argument. If the value is null, the value is returned. The value returned from the function becomes the fulfilled value of the promise returned by then. If an exception is thrown while this function is being executed, the promise returned by then moves into the error state.
     * @param onError The function to be called if the promise is fulfilled with an error. The error is passed as the single argument. In different cases this object may be of different types, so it is necessary to test the object for the properties you expect. If the error is null, it is forwarded. The value returned from the function becomes the value of the promise returned by the then function.
     * @param onProgress The function to be called if the promise reports progress. Data about the progress is passed as the single argument. Promises are not required to support progress.
     * @returns The promise whose value is the result of executing the onComplete function.
    **/
    then<U>(onComplete?: (value: T) => Promise<U>, onError?: (error: any) => Promise<U>, onProgress?: (progress: any) => void): Promise<U>;

    /**
     * Allows you to specify the work to be done on the fulfillment of the promised value, the error handling to be performed if the promise fails to fulfill a value, and the handling of progress notifications along the way. For more information about the differences between then and done, see the following topics: Quickstart: using promises in JavaScript How to handle errors when using promises in JavaScript Chaining promises in JavaScript.
     * @param onComplete The function to be called if the promise is fulfilled successfully with a value. The value is passed as the single argument. If the value is null, the value is returned. The value returned from the function becomes the fulfilled value of the promise returned by then. If an exception is thrown while this function is being executed, the promise returned by then moves into the error state.
     * @param onError The function to be called if the promise is fulfilled with an error. The error is passed as the single argument. In different cases this object may be of different types, so it is necessary to test the object for the properties you expect. If the error is null, it is forwarded. The value returned from the function becomes the value of the promise returned by the then function.
     * @param onProgress The function to be called if the promise reports progress. Data about the progress is passed as the single argument. Promises are not required to support progress.
     * @returns The promise whose value is the result of executing the onComplete function.
    **/
    then<U>(onComplete?: (value: T) => Promise<U>, onError?: (error: any) => U, onProgress?: (progress: any) => void): Promise<U>;

    /**
     * Allows you to specify the work to be done on the fulfillment of the promised value, the error handling to be performed if the promise fails to fulfill a value, and the handling of progress notifications along the way. For more information about the differences between then and done, see the following topics: Quickstart: using promises in JavaScript How to handle errors when using promises in JavaScript Chaining promises in JavaScript.
     * @param onComplete The function to be called if the promise is fulfilled successfully with a value. The value is passed as the single argument. If the value is null, the value is returned. The value returned from the function becomes the fulfilled value of the promise returned by then. If an exception is thrown while this function is being executed, the promise returned by then moves into the error state.
     * @param onError The function to be called if the promise is fulfilled with an error. The error is passed as the single argument. In different cases this object may be of different types, so it is necessary to test the object for the properties you expect. If the error is null, it is forwarded. The value returned from the function becomes the value of the promise returned by the then function.
     * @param onProgress The function to be called if the promise reports progress. Data about the progress is passed as the single argument. Promises are not required to support progress.
     * @returns The promise whose value is the result of executing the onComplete function.
    **/
    then<U>(onComplete?: (value: T) => U, onError?: (error: any) => Promise<U>, onProgress?: (progress: any) => void): Promise<U>;

    /**
     * Allows you to specify the work to be done on the fulfillment of the promised value, the error handling to be performed if the promise fails to fulfill a value, and the handling of progress notifications along the way. For more information about the differences between then and done, see the following topics: Quickstart: using promises in JavaScript How to handle errors when using promises in JavaScript Chaining promises in JavaScript.
     * @param onComplete The function to be called if the promise is fulfilled successfully with a value. The value is passed as the single argument. If the value is null, the value is returned. The value returned from the function becomes the fulfilled value of the promise returned by then. If an exception is thrown while this function is being executed, the promise returned by then moves into the error state.
     * @param onError The function to be called if the promise is fulfilled with an error. The error is passed as the single argument. In different cases this object may be of different types, so it is necessary to test the object for the properties you expect. If the error is null, it is forwarded. The value returned from the function becomes the value of the promise returned by the then function.
     * @param onProgress The function to be called if the promise reports progress. Data about the progress is passed as the single argument. Promises are not required to support progress.
     * @returns The promise whose value is the result of executing the onComplete function.
    **/
    then<U>(onComplete?: (value: T) => U, onError?: (error: any) => U, onProgress?: (progress: any) => void): Promise<U>;

    /**
     * Performs an operation on all the input promises and returns a promise that has the shape of the input and contains the result of the operation that has been performed on each input.
     * @param values A set of values (which could be either an array or an object) of which some or all are promises..
     * @param complete The function to be called if the promise is fulfilled with a value. This function takes a single argument, which is the fulfilled value of the promise.
     * @param error The function to be called if the promise is fulfilled with an error. This function takes a single argument, which is the error value of the promise.
     * @param progress The function to be called if the promise reports progress. This function takes a single argument, which is the data about the progress of the promise. Promises are not required to support progress.
     * @returns A Promise that is the result of calling join on the values parameter.
    **/
    static thenEach(values: any, complete?: (value: any) => void, error?: (error: any) => void, progress?: (progress: any) => void): Promise<any>;

    /**
     * This method has two forms: WinJS.Promise.timeout(timeout) and WinJS.Promise.timeout(timeout, promise). WinJS.Promise.timeout(timeout) creates a promise that is completed asynchronously after the specified timeout, essentially wrapping a call to setTimeout within a promise. WinJS.Promise.timeout(timeout, promise) sets a timeout period for completion of the specified promise, automatically canceling the promise if it is not completed within the timeout period.
     * @param timeout The timeout period in milliseconds. If this value is zero or not specified, msSetImmediate is called, otherwise setTimeout is called.
     * @param promise Optional. A promise that will be canceled if it doesn't complete within the timeout period.
     * @returns If the promise parameter is omitted, returns a promise that will be fulfilled after the timeout period. If the promise paramater is provided, the same promise is returned.
    **/
    static timeout(timeout?: number, promise?: Promise<any>): Promise<any>;

    /**
     * Wraps a non-promise value in a promise. This method is like wrapError, which allows you to produce a Promise in error conditions, in that it allows you to return a Promise in success conditions.
     * @param value Some non-promise value to be wrapped in a promise.
     * @returns A promise that is successfully fulfilled with the specified value.
    **/
    static wrap<U>(value: U): Promise<U>;

    /**
     * Wraps a non-promise error value in a promise. You can use this function if you need to pass an error to a function that requires a promise.
     * @param error A non-promise error value to be wrapped in a promise.
     * @returns A promise that is in an error state with the specified value.
    **/
    static wrapError<U>(error: U): Promise<U>;

    //#endregion Methods
}
export = Promise;
