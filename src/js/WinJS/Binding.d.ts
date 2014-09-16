// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Promise = require("Promise");

/**
 * Determines whether or not binding should automatically set the ID of an element. This property should be set to true in apps that use WinJS (WinJS) binding.
**/
export declare var optimizeBindingReferences: boolean;

//#endregion Properties

//#region Objects

/**
 * Allows you to add bindable properties dynamically.
**/
export declare var dynamicObservableMixin: {
    //#region Methods

    /**
     * Adds a property with change notification to this object, including a ECMAScript5 property definition.
     * @param name The name of the property to add.
     * @param value This object is returned.
    **/
    addProperty(name: string, value: any): void;

    /**
     * Links the specified action to the property specified in the name parameter. This function is invoked when the value of the property may have changed. It is not guaranteed that the action will be called only when a value has actually changed, nor is it guaranteed that the action will be called for every value change. The implementation of this function coalesces change notifications, such that multiple updates to a property value may result in only a single call to the specified action.
     * @param name The name of the property to which to bind the action.
     * @param action The function to invoke asynchronously when the property may have changed.
     * @returns This object is returned.
    **/
    bind(name: string, action: any): Function;

    /**
     * Gets a property value by name.
     * @param name The name of the property to get.
     * @returns The value of the property as an observable object.
    **/
    getProperty(name: string): any;

    /**
     * Notifies listeners that a property value was updated.
     * @param name The name of the property that is being updated.
     * @param newValue The new value for the property.
     * @param oldValue The old value for the property.
     * @returns A promise that is completed when the notifications are complete.
    **/
    notify(name: string, newValue: string, oldValue: string): Promise<any>;

    /**
     * Removes a property value.
     * @param name The name of the property to remove.
     * @returns This object is returned.
    **/
    removeProperty(name: string): any;

    /**
     * Updates a property value and notifies any listeners.
     * @param name The name of the property to update.
     * @param value The new value of the property.
     * @returns This object is returned.
    **/
    setProperty(name: string, value: any): any;

    /**
     * Removes one or more listeners from the notification list for a given property.
     * @param name The name of the property to unbind. If this parameter is omitted, all listeners for all events are removed.
     * @param action The function to remove from the listener list for the specified property. If this parameter is omitted, all listeners are removed for the specific property.
     * @returns This object is returned.
    **/
    unbind(name: string, action: Function): any;

    /**
     * Updates a property value and notifies any listeners.
     * @param name The name of the property to update.
     * @param value The new value of the property.
     * @returns A promise that completes when the notifications for this property change have been processed. If multiple notifications are coalesced, the promise may be canceled or the value of the promise may be updated. The fulfilled value of the promise is the new value of the property for which the notifications have been completed.
    **/
    updateProperty(name: string, value: any): Promise<any>;

    //#endregion Methods

};
