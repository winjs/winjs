// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

/**
 * Provides application-level functionality, for example activation, storage, and application events.
**/

import Promise = require("Promise");

/**
 * Utility class for easy access to operations on application folders
**/
export interface IOHelper {
    /**
     * Determines whether the specified file exists in the folder.
     * @param filename The name of the file.
     * @returns A promise that completes with a value of either true (if the file exists) or false.
    **/
    exists(filename: string): Promise<boolean>;

    /**
     * Reads the specified file. If the file doesn't exist, the specified default value is returned.
     * @param fileName The file to read from.
     * @param def The default value to be returned if the file failed to open.
     * @returns A promise that completes with a value that is either the contents of the file, or the specified default value.
     **/
    readText(fileName: string, def?: string): Promise<string>;

    /**
     * Deletes a file from the folder.
     * @param fileName The file to be deleted.
     * @returns A promise that is fulfilled when the file has been deleted.
    **/
    remove(fileName: string): Promise<void>;

    /**
     * Writes the specified text to the specified file.
     * @param fileName The name of the file.
     * @param text The content to be written to the file.
     * @returns A promise that is completed when the file has been written.
     **/
    writeText(fileName: string, text: string): Promise<number>;
}

//#region Objects

/**
 * The local storage of the application.
**/
export declare var local: IOHelper;

/**
 * The roaming storage of the application.
**/
export declare var roaming: IOHelper;

/**
 * The temp storage of the application.
**/
export declare var temp: IOHelper;

/**
 * An object used for storing app information that can be used to restore the app's state after it has been suspended and then resumed. Data that can usefully be contained in this object includes the current navigation page or any information the user has added to the input controls on the page. You should not add information about customization (for example colors) or user-defined lists of content.
**/
export declare var sessionState: any;

//#endregion Objects

//#region Methods

/**
 * Informs the application object that asynchronous work is being performed, and that this event handler should not be considered complete until the promise completes. This function can be set inside the handlers for all WinJS.Application events: onactivated oncheckpoint onerror onloaded onready onsettings onunload.
 * @param promise The promise that should complete before processing is complete.
**/
export declare function setPromise(promise: Promise<any>): void;

//#endregion Methods

//#region Functions

/**
 * Adds an event listener for application-level events: activated, checkpoint, error, loaded, ready, settings, and unload.
 * @param type The type (name) of the event. You can use any of the following:"activated", "checkpoint", "error", "loaded", "ready", "settings", and" unload".
 * @param listener The listener to invoke when the event is raised.
 * @param capture true to initiate capture, otherwise false.
**/
export declare function addEventListener(type: string, listener: Function, capture?: boolean): void;

/**
 * Queues a checkpoint event.
**/
export declare function checkpoint(): void;

/**
 * Queues an event to be processed by the WinJS.Application event queue.
 * @param eventRecord The event object is expected to have a type property that is used as the event name when dispatching on the WinJS.Application event queue. The entire object is provided to event listeners in the detail property of the event.
**/
export declare function queueEvent(eventRecord: any): void;

/**
 * Removes an event listener from the control.
 * @param type The type (name) of the event.
 * @param listener The listener to remove.
 * @param useCapture Specifies whether or not to initiate capture.
**/
export declare function removeEventListener(type: string, listener: Function, useCapture?: any): void;

/**
 * Starts dispatching application events (the activated, checkpoint, error, loaded, ready, settings, and unload events).
**/
export declare function start(): void;

/**
 * Stops application event processing and resets WinJS.Application to its initial state. All WinJS.Application event listeners (for the activated, checkpoint, error, loaded, ready, settings, and unload events) are removed.
**/
export declare function stop(): void;

//#endregion Functions

//#region Events

/**
 * Occurs when WinRT activation has occurred. The name of this event is "activated" (and also "mainwindowactivated"). This event occurs after the loaded event and before the ready event.
 * @param eventInfo An object that contains information about the event. For more information about event arguments, see the WinRT event argument classes: WebUICachedFileUpdaterActivatedEventArgs, WebUICameraSettingsActivatedEventArgs, WebUIContactPickerActivatedEventArgs, WebUIDeviceActivatedEventArgs, WebUIFileActivatedEventArgs, WebUIFileOpenPickerActivatedEventArgs, WebUIFileSavePickerActivatedEventArgs, WebUILaunchActivatedEventArgs, WebUIPrintTaskSettingsActivatedEventArgs, WebUIProtocolActivatedEventArgs, WebUISearchActivatedEventArgs, WebUIShareTargetActivatedEventArgs.
**/
export declare function onactivated(eventInfo: CustomEvent): void;

/**
 * Occurs when receiving PLM notification or when the checkpoint function is called.
 * @param eventInfo An object that contains information about the event. The detail property of this object includes the following subproperties: type, setPromise.
**/
export declare function oncheckpoint(eventInfo: CustomEvent): void;

/**
 * Occurs when an unhandled error has been raised.
 * @param eventInfo An object that contains information about the event.
**/
export declare function onerror(eventInfo: CustomEvent): void;

/**
 * Occurs after the DOMContentLoaded event, which fires after the page has been parsed but before all the resources are loaded. This event occurs before the activated event and the ready event.
 * @param eventInfo An object that contains information about the event. The detail property of this object includes the following subproperties: type, setPromise.
**/
export declare function onloaded(eventInfo: CustomEvent): void;

/**
 * Occurs when the application is ready. This event occurs after the loaded event and the activated event.
 * @param eventInfo An object that contains information about the event. The detail property of this object includes the following sub-properties: type, setPromise.
**/
export declare function onready(eventInfo: CustomEvent): void;

/**
 * Occurs when the settings charm is invoked.
 * @param eventInfo An object that contains information about the event. The detail property of this object contains the following sub-properties: type, applicationcommands.
**/
export declare function onsettings(eventInfo: CustomEvent): void;

/**
 * Occurs when the application is about to be unloaded.
 * @param eventInfo An object that contains information about the event. The detail property of this object includes the following sub-properties: type, setPromise.
**/
export declare function onunload(eventInfo: CustomEvent): void;

//#endregion Events
