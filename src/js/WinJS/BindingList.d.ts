// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Promise = require("Promise");

/**
 * Do not instantiate. A list returned by the createFiltered method.
**/
export declare class FilteredListProjection<T> extends ListProjection<T> {
    //#region Methods

    /**
     * Returns a key/data pair for the specified index.
     * @param index The index of the value to retrieve.
     * @returns An object that has two properties: key and data.
    **/
    getItem(index: number): IKeyDataPair<T>;

    /**
     * Returns the index of the first occurrence of a key in a list.
     * @param key The key to locate in the list.
     * @returns The index of the first occurrence of a key in a list, or -1 if not found.
    **/
    indexOfKey(key: string): number;

    /**
     * Forces the list to send a itemmutated notification to any listeners for the value at the specified index.
     * @param index The index of the value that was mutated.
    **/
    notifyMutated(index: number): void;

    /**
     * Replaces the value at the specified index with a new value.
     * @param index The index of the value that was replaced.
     * @param newValue The new value.
    **/
    setAt(index: number, newValue: T): void;

    //#endregion Methods

    //#region Properties

    /**
     * The length of the list. Returns an integer value one higher than the highest element defined in an list.
    **/
    length: number;

    //#endregion Properties

}

/**
 * Do not instantiate. A list of groups.
**/
export declare class GroupsListProjection<T> extends ListBase<T> {
    //#region Methods

    /**
     * Gets a key/data pair for the specified index.
     * @param index The index of the value to retrieve.
     * @returns An object that has two properties: key and data.
    **/
    getItem(index: number): IKeyDataPair<T>;

    /**
     * Gets a key/data pair for the specified key.
     * @param key The key of the value to retrieve.
     * @returns An object with two properties: key and data.
    **/
    getItemFromKey(key: string): IKeyDataPair<T>;

    /**
     * Returns the index of the first occurrence of a key in a list.
     * @param key The key to locate in the list.
     * @returns The index of the first occurrence of a key in a list, or -1 if not found.
    **/
    indexOfKey(key: string): number;

    //#endregion Methods

    //#region Properties

    /**
     * The length of the list. Returns an integer value one higher than the highest element defined in an list.
    **/
    length: number;

    //#endregion Properties

}

/**
 * Do not instantiate. Sorts the underlying list by group key and within a group respects the position of the item in the underlying list. Returned by createGrouped.
**/
export declare class GroupedSortedListProjection<T> extends SortedListProjection<T> {
    //#region Properties

    /**
     * Gets a List, which is a projection of the groups that were identified in this list.
    **/
    groups: GroupsListProjection<T>;

    //#endregion Properties

}

/**
 * Represents a list of objects that can be accessed by index or by a string key. Provides methods to search, sort, filter, and manipulate the data.
**/
export declare class List<T> extends ListBaseWithMutators<T> {
    //#region Constructors

    /**
     * Creates a List object.
     * @constructor 
     * @param list The array containing the elements to initalize the list.
     * @param options You can set two Boolean options: binding and proxy. If options.binding is true, the list contains the result of calling as on the element values. If options.proxy is true, the list specified as the first parameter is used as the storage for the List. This option should be used with care, because uncoordinated edits to the data storage may result in errors.
    **/
    constructor(list?: T[], options?: any);

    //#endregion Constructors

    //#region Methods

    /**
     * Gets a key/data pair for the specified list index.
     * @param index The index of value to retrieve.
     * @returns An object with .key and .data properties.
    **/
    getItem(index: number): IKeyDataPair<T>;

    /**
     * Gets a key/data pair for the list item key specified.
     * @param key The key of the value to retrieve.
     * @returns An object with .key and .data properties.
    **/
    getItemFromKey(key: string): IKeyDataPair<T>;

    /**
     * Gets the index of the first occurrence of a key in a list.
     * @param key The key to locate in the list.
     * @returns The index of the first occurrence of a key in a list, or -1 if not found.
    **/
    indexOfKey(key: string): number;

    /**
     * Moves the value at index to the specified position.
     * @param index The original index of the value.
     * @param newIndex The index of the value after the move.
    **/
    move(index: number, newIndex: number): void;

    /**
     * Forces the list to send a itemmutated notification to any listeners for the value at the specified index.
     * @param index The index of the value that was mutated.
    **/
    notifyMutated(index: number): void;

    /**
     * Returns a list with the elements reversed. This method reverses the elements of a list object in place. It does not create a new list object during execution.
    **/
    reverse(): void;

    /**
     * Replaces the value at the specified index with a new value.
     * @param index The index of the value that was replaced.
     * @param newValue The new value.
    **/
    setAt(index: number, newValue: T): void;

    /**
     * Returns a list with the elements sorted. This method sorts the elements of a list object in place. It does not create a new list object during execution.
     * @param sortFunction The function used to determine the order of the elements. If omitted, the elements are sorted in ascending, ASCII character order. This function must always return the same results, given the same inputs. The results should not depend on values that are subject to change. You must call notifyMutated each time an item changes. Do not batch change notifications.
    **/
    sort(sortFunction: (left: T, right: T) => number): void;

    /**
     * Removes elements from a list and, if necessary, inserts new elements in their place, returning the deleted elements.
     * @param start The zero-based location in the list from which to start removing elements.
     * @param howMany The number of elements to remove.
     * @param item The elements to insert into the list in place of the deleted elements.
     * @returns The deleted elements.
    **/
    splice(start: number, howMany?: number, ...item: T[]): T[];

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the length of the list, which is an integer value one higher than the highest element defined in the list.
    **/
    length: number;

    //#endregion Properties

}

/**
 * Represents a base class for lists.
**/
export declare class ListBase<T> {
    //#region Events

    /**
     * An item in the list has changed its value.
     * @param eventInfo An object that contains information about the event. The detail contains the following information: index, key, newItem, newValue, oldItem, oldValue.
    **/
    onitemchanged(eventInfo: CustomEvent): void;

    /**
     * A new item has been inserted into the list.
     * @param eventInfo An object that contains information about the event. The detail contains the following information: index, key, value.
    **/
    oniteminserted(eventInfo: CustomEvent): void;

    /**
     * An item has been changed locations in the list.
     * @param eventInfo An object that contains information about the event. The detail contains the following information: index, key, value.
    **/
    onitemmoved(eventInfo: CustomEvent): void;

    /**
     * An item has been mutated. This event occurs as a result of calling the notifyMutated method.
     * @param eventInfo An object that contains information about the event. The detail contains the following information: index, key, value.
    **/
    onitemmutated(eventInfo: CustomEvent): void;

    /**
     * An item has been removed from the list.
     * @param eventInfo An object that contains information about the event. The detail contains the following information: index, key, value.
    **/
    onitemremoved(eventInfo: CustomEvent): void;

    /**
     * The list has been refreshed. Any references to items in the list may be incorrect.
     * @param eventInfo An object that contains information about the event. The detail property of this object is null.
    **/
    onreload(eventInfo: CustomEvent): void;

    //#endregion Events

    //#region Methods

    /**
     * Adds an event listener to the control.
     * @param type The type (name) of the event.
     * @param listener The listener to invoke when the event gets raised.
     * @param useCapture If true, initiates capture, otherwise false.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Links the specified action to the property specified in the name parameter. This function is invoked when the value of the property may have changed. It is not guaranteed that the action will be called only when a value has actually changed, nor is it guaranteed that the action will be called for every value change. The implementation of this function coalesces change notifications, such that multiple updates to a property value may result in only a single call to the specified action.
     * @param name The name of the property to which to bind the action.
     * @param action The function to invoke asynchronously when the property may have changed.
     * @returns A reference to this observableMixin object.
    **/
    bind(name: string, action: Function): any;

    /**
     * Returns a new list consisting of a combination of two arrays.
     * @param item Additional items to add to the end of the list.
     * @returns An array containing the concatenation of the list and any other supplied items.
    **/
    concat(...item: T[]): T[];

    /**
     * Creates a live filtered projection over this list. As the list changes, the filtered projection reacts to those changes and may also change.
     * @param predicate A function that accepts a single argument. The createFiltered function calls the callback with each element in the list. If the function returns true, that element will be included in the filtered list. This function must always return the same results, given the same inputs. The results should not depend on values that are subject to change. You must call notifyMutated each time an item changes. Do not batch change notifications.
     * @returns A filtered projection over the list.
    **/
    createFiltered(predicate: (x: T) => boolean): FilteredListProjection<T>;

    /**
     * Creates a live grouped projection over this list. As the list changes, the grouped projection reacts to those changes and may also change. The grouped projection sorts all the elements of the list to be in group-contiguous order. The grouped projection also contains a .groups property, which is a List representing the groups that were found in the list.
     * @param groupKey A function that accepts a single argument. The function is called with each element in the list, the function should return a string representing the group containing the element. This function must always return the same results, given the same inputs. The results should not depend on values that are subject to change. You must call notifyMutated each time an item changes. Do not batch change notifications.
     * @param groupData A function that accepts a single argument. The function is called once, on one element per group. It should return the value that should be set as the data of the .groups list element for this group. The data value usually serves as summary or header information for the group.
     * @param groupSorter A function that accepts two arguments. The function is called with pairs of group keys found in the list. It must return one of the following numeric values: negative if the first argument is less than the second (sorted before), zero if the two arguments are equivalent, positive if the first argument is greater than the second (sorted after).
     * @returns A grouped projection over the list.
    **/
    createGrouped(groupKey: (x: T) => string, groupData: (x: T) => any, groupSorter?: (left: string, right: string) => number): GroupedSortedListProjection<T>;

    /**
     * Creates a live sorted projection over this list. As the list changes, the sorted projection reacts to those changes and may also change.
     * @param sorter A function that accepts two arguments. The function is called with elements in the list. It must return one of the following numeric values: negative if the first argument is less than the second, zero if the two arguments are equivalent, positive if the first argument is greater than the second. This function must always return the same results, given the same inputs. The results should not depend on values that are subject to change. You must call notifyMutated each time an item changes. Do not batch change notifications.
     * @returns A sorted projection over the list.
    **/
    createSorted(sorter: (left: T, right: T) => number): SortedListProjection<T>;

    /**
     * Raises an event of the specified type and with the specified additional properties.
     * @param type The type (name) of the event.
     * @param eventProperties The set of additional properties to be attached to the event object when the event is raised.
     * @returns true if preventDefault was called on the event.
    **/
    dispatchEvent(type: string, eventProperties: any): boolean;

    /**
     * Checks whether the specified callback function returns true for all elements in a list.
     * @param callback A function that accepts up to three arguments. This function is called for each element in the list until it returns false or the end of the list is reached.
     * @param thisArg An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.
     * @returns true if the callback returns true for all elements in the list.
    **/
    every(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;

    /**
     * Returns the elements of a list that meet the condition specified in a callback function.
     * @param callback A function that accepts up to three arguments. The function is called for each element in the list. This function must always return the same results, given the same inputs. The results should not depend on values that are subject to change. You must call notifyMutated each time an item changes. Do not batch change notifications.
     * @param thisArg An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.
     * @returns An array containing the elements that meet the condition specified in the callback function.
    **/
    filter(callback: (value: T, index: number, array: T[]) => any, thisArg?: any): T[];

    /**
     * Calls the specified callback function for each element in a list.
     * @param callback A function that accepts up to three arguments. The function is called for each element in the list. The arguments are as follows: value, index, array.
     * @param thisArg An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.
    **/
    forEach(callback: (value: T, index: number, array: T[]) => void, thisArg?: any): void;

    /**
     * Gets the value at the specified index.
     * @param index The index of the value to get.
     * @returns The value at the specified index.
    **/
    getAt(index: number): T;

    /**
     * Gets the index of the first occurrence of the specified value in a list.
     * @param searchElement The value to locate in the list.
     * @param fromIndex The index at which to begin the search. If fromIndex is omitted, the search starts at index 0.
     * @returns The index of the first occurrence of a value in a list or -1 if not found.
    **/
    indexOf(searchElement: T, fromIndex?: number): number;

    /**
     * Returns a string consisting of all the elements of a list separated by the specified separator string.
     * @param separator A string used to separate the elements of a list. If this parameter is omitted, the list elements are separated with a comma.
     * @returns The elements of a list separated by the specified separator string.
    **/
    join(separator: string): string;

    /**
     * Gets the index of the last occurrence of the specified value in a list.
     * @param searchElement The value to locate in the list.
     * @param fromIndex The index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the list.
     * @returns The index of the last occurrence of a value in a list, or -1 if not found.
    **/
    lastIndexOf(searchElement: T, fromIndex: number): number;

    /**
     * Calls the specified callback function on each element of a list, and returns an array that contains the results.
     * @param callback A function that accepts up to three arguments. The function is called for each element in the list.
     * @param thisArg n object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.
     * @returns An array containing the result of calling the callback function on each element in the list.
    **/
    map<G>(callback: (value: T, index: number, array: T[]) => G, thisArg?: any): G[];

    /**
     * Notifies listeners that a property value was updated.
     * @param name The name of the property that is being updated.
     * @param newValue The new value for the property.
     * @param oldValue The old value for the property.
     * @returns A promise that is completed when the notifications are complete.
    **/
    notify(name: string, newValue: any, oldValue: any): Promise<any>;

    /**
     * Forces the list to send a reload notification to any listeners.
    **/
    notifyReload(): void;

    /**
     * Accumulates a single result by calling the specified callback function for all elements in a list. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callback A function that accepts up to four arguments. These arguments are: previousValue, currentValue, currentIndex, array. The function is called for each element in the list.
     * @param initiallValue If initialValue is specified, it is used as the value with which to start the accumulation. The first call to the function provides this value as an argument instead of a list value.
     * @returns The return value from the last call to the callback function.
    **/
    reduce(callback: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => T, initiallValue?: T): T;

    /**
     * Accumulates a single result by calling the specified callback function for all elements in a list, starting with the last member of the list. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callback A function that accepts up to four arguments. These arguments are: previousValue, currentValue, currentIndex, array. The function is called for each element in the list.
     * @param initialValue If initialValue is specified, it is used as the value with which to start the accumulation. The first call to the callback function provides this value as an argument instead of a list value.
     * @returns The return value from the last call to callback function.
    **/
    reduceRight(callback: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => T, initialValue?: T): T;

    /**
     * Removes an event listener from the control.
     * @param type The type (name) of the event.
     * @param listener The listener to remove.
     * @param useCapture true if capture is to be initiated, otherwise false.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Extracts a section of a list and returns a new list.
     * @param begin The index that specifies the beginning of the section.
     * @param end The index that specifies the end of the section.
     * @returns Returns a section of list.
    **/
    slice(begin: number, end: number): T[];

    /**
     * Checks whether the specified callback function returns true for any element of a list.
     * @param callback A function that accepts up to three arguments. The function is called for each element in the list until it returns true, or until the end of the list.
     * @param thisArg An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.
     * @returns true if callback returns true for any element in the list.
    **/
    some(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;

    /**
     * Removes one or more listeners from the notification list for a given property.
     * @param name The name of the property to unbind. If this parameter is omitted, all listeners for all events are removed.
     * @param action The function to remove from the listener list for the specified property. If this parameter is omitted, all listeners are removed for the specific property.
     * @returns This object is returned.
    **/
    unbind(name: string, action: Function): any;

    //#endregion Methods

    //#region Properties

    /**
     * Gets the IListDataSource for the list. The only purpose of this property is to adapt a List to the data model that is used by ListView and FlipView.
    **/
    dataSource: IListDataSource<T>;

    /**
     * Indicates that the object is compatibile with declarative processing.
    **/
    static supportedForProcessing: boolean;

    //#endregion Properties
}

/**
     * Provides access to a data source and enables you to bind, change, add, remove, and move items in that data source.
    **/
export interface IListDataSource<T> {
    //#region Events

    /**
     * Occurs when the status of the IListDataSource changes.
     * @param eventInfo An object that contains information about the event. The detail property of this object contains the following sub-properties: status.
    **/
    statuschanged(eventInfo: CustomEvent): void;

    //#endregion Events

    //#region Methods

    /**
     * Notifies the IListDataSource that a sequence of edits is about to begin. The IListDataSource will defer notifications until endEdits is called.
    **/
    beginEdits(): void;

    /**
     * Overwrites the data of the specified item.
     * @param key The key for the item to replace.
     * @param newData The new data for the item.
     * @returns A Promise that contains the IItem that was updated or an EditError if an error was encountered.
    **/
    change(key: string, newData: T): Promise<IItem<T>>;

    /**
     * Creates an IListBinding that can retrieve items from the IListDataSource, enumerate the contents of the IListDataSource object's data, and optionally register for change notifications.
     * @param notificationHandler Enables the IListBinding to register for change notifications for individual items obtained from the IListDataSource. If you omit this parameter, change notifications won't be available.
     * @returns The new IListBinding.
    **/
    createListBinding(notificationHandler?: IListNotificationHandler<T>): IListBinding<T>;

    /**
     * Notifies the IListDataSource that the batch of edits that began with the last beginEdits call has completed. The IListDataSource will submit notifications for any changes that occurred between the beginEdits and endEdits calls as a batch and resume normal change notifications.
    **/
    endEdits(): void;

    /**
     * Retrieves the number of items in the data source.
     * @returns A Promise that provides a Number that is the number of items in the data source.
    **/
    getCount(): Promise<number>;

    /**
     * Inserts a new item after another item.
     * @param key The key that can be used to retrieve the new item, if known.
     * @param data The data for the item to add.
     * @param previousKey The key for an item in the data source. The new item will be added after this item.
     * @returns A Promise that contains the IItem that was added or an EditError if an error was encountered.
    **/
    insertAfter(key: string, data: T, previousKey: string): Promise<IItem<T>>;

    /**
     * Adds an item to the end of the data source.
     * @param key The key that can be used to retrieve the new item, if known.
     * @param data The data for the item to add.
     * @returns A Promise that contains the IItem that was added or an EditError if an error was encountered.
    **/
    insertAtEnd(key: string, data: T): Promise<IItem<T>>;

    /**
     * Adds an item to the beginning of the data source.
     * @param key The key that can be used to retrieve the new item, if known.
     * @param data The data for the item to add.
     * @returns A Promise that contains the IItem that was added or an EditError if an error was encountered.
    **/
    insertAtStart(key: string, data: T): Promise<IItem<T>>;

    /**
     * Inserts an item before another item.
     * @param key The key that can be used to retrieve the new item, if known.
     * @param data The data for the item to add.
     * @param nextKey The key of an item in the data source. The new item will be inserted before this item.
     * @returns A Promise that contains the IItem that was added or an EditError if an error was encountered.
    **/
    insertBefore(key: string, data: T, nextKey: string): Promise<IItem<T>>;

    /**
     * Indicates that all previous data obtained from the IListDataAdapter is invalid and should be refreshed.
     * @returns A Promise that completes when the data has been completely refreshed and all notifications have been sent.
    **/
    invalidateAll(): Promise<any>;

    /**
     * Retrieves the item that has the specified description.
     * @param description Domain-specific information, to be interpreted by the IListDataAdapter, that describes the item to retrieve.
     * @returns A Promise that provides an IItem that contains the requested item or a FetchError if an error was encountered. If the item wasn't found, the promise completes with a value of null.
    **/
    itemFromDescription(description: any): Promise<IItem<T>>;

    /**
     * Retrieves the item at the specified index.
     * @param index A value that is greater than or equal to zero that is the index of the item to retrieve.
     * @returns A Promise that provides an IItem that contains the requested item or a FetchError if an error was encountered. If the item wasn't found, the promise completes with a value of null.
    **/
    itemFromIndex(index: number): Promise<IItem<T>>;

    /**
     * Retrieves the item with the specified key.
     * @param key The key of the item to retrieve. It must be a non-empty string.
     * @param description Domain-specific information that IListDataAdapter can use to improve the retrieval time.
     * @returns A Promise that provides an IItem that contains the requested item or a FetchError if an error was encountered. If the item was not found, the promise completes with a null value.
    **/
    itemFromKey(key: string, description?: any): Promise<IItem<T>>;

    /**
     * Moves an item to just after another item.
     * @param key The key that identifies the item to move.
     * @param previousKey The key of another item in the data source. The item specified by the key parameter will be moved after this item.
     * @returns A Promise that contains the IItem that was moved or an EditError if an error was encountered.
    **/
    moveAfter(key: string, previousKey: string): Promise<IItem<T>>;

    /**
     * Moves an item before another item.
     * @param key The key that identifies the item to move.
     * @param nextKey The key of another item in the data source. The item specified by the key parameter will be moved before this item.
     * @returns A Promise that contains the IItem that was moved or an EditError if an error was encountered.
    **/
    moveBefore(key: string, nextKey: string): Promise<IItem<T>>;

    /**
     * Moves an item to the end of the data source.
     * @param key The key that identifies the item to move.
     * @returns A Promise that contains the IItem that was moved or an EditError if an error was encountered.
    **/
    moveToEnd(key: string): Promise<IItem<T>>;

    /**
     * Moves the specified item to the beginning of the data source.
     * @param key The key that identifies the item to move.
     * @returns A Promise that contains the IItem that was moved or an EditError if an error was encountered.
    **/
    moveToStart(key: string): Promise<IItem<T>>;

    /**
     * Removes the specified item from the data source.
     * @param key The key that identifies the item to remove.
     * @returns A Promise that contains nothing if the operation was successful or an EditError if an error was encountered.
    **/
    remove(key: string): Promise<IItem<T>>;

    //#endregion Methods
}

/**
     * Represents an item in a list.
    **/
export interface IItem<T> {
    //#region Properties

    /**
     * Gets or sets the item's data.
    **/
    data: T;

    /**
     * Gets the group key for the item. This property is only available for items that belong to a grouped data source.
    **/
    groupKey: string;

    /**
     * Gets the temporary ID of the item.
    **/
    handle: string;

    /**
     * Gets the item's index in the IListDataSource.
    **/
    index: number;

    /**
     * Gets or sets the key the identifies the item.
    **/
    key: string;

    //#endregion Properties

}

/**
 * Provides a mechanism for retrieving IItem objects asynchronously.
**/
export interface IItemPromise<T> extends IPromise<T> {

    //#region Methods

    /**
     * Stops change notification tracking for the IItem that fulfills this IItemPromise.
    **/
    release(): void;

    /**
     * Begins change notification tracking for the IItem that fulfills this IItemPromise.
    **/
    retain(): IItemPromise<T>;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the temporary ID of the IItem that fulfills this promise.
    **/
    handle: string;

    /**
     * Gets or sets the index of the IItem contained by this IItemPromise.
    **/
    index: number;

    //#endregion Properties

}

export interface IPromise<T> {
    cancel(): void;
    done<U>(onComplete?: (value: T) => any, onError?: (error: any) => any, onProgress?: (progress: any) => void): void;
    then<U>(onComplete?: (value: T) => IPromise<U>, onError?: (error: any) => IPromise<U>, onProgress?: (progress: any) => void): IPromise<U>;
    then<U>(onComplete?: (value: T) => IPromise<U>, onError?: (error: any) => U, onProgress?: (progress: any) => void): IPromise<U>;
    then<U>(onComplete?: (value: T) => U, onError?: (error: any) => IPromise<U>, onProgress?: (progress: any) => void): IPromise<U>;
    then<U>(onComplete?: (value: T) => U, onError?: (error: any) => U, onProgress?: (progress: any) => void): IPromise<U>;
}


/**
 * Retrieves items from a IListDataSource, enumerates the contents of a IListDataSource, and can optionally register for change notifications.
**/
export interface IListBinding<T> {
    //#region Methods

    /**
     * Retrieves the current item.
     * @returns An IItemPromise that contains the current item. If the cursor has moved past the start or end of the list, the promise completes with a value of null. If the current item has been moved or deleted, the promise returns an error.
    **/
    current(): IItemPromise<IItem<T>>;

    /**
     * Gets the first item from the IListDataSource and makes it the current item.
     * @returns An IItemPromise that contains the requested IItem. If the list is empty, the promise completes with a value of null.
    **/
    first(): IItemPromise<IItem<T>>;

    /**
     * Retrieves the item from the IListDataSource that has the specified description and makes it the current item.
     * @param description A domain-specific description, to be interpreted by the IListDataAdapter, that identifies the item to retrieve.
     * @returns An IItemPromise that contains the requested IItem object. If the item wasn't found, the promise completes with a value of null.
    **/
    fromDescription(description: string): IItemPromise<IItem<T>>;

    /**
     * Retrieves the item from the IListDataSource that has the specified index and makes it the current item.
     * @param index A value greater than or equal to 0 that is the index of the item to retrieve.
     * @returns An IItemPromise that contains the requested IItem. If the item wasn't found, the promise completes with a value of null.
    **/
    fromIndex(index: number): IItemPromise<IItem<T>>;

    /**
     * Retrieves the item from the IListDataSource that has the specified key and makes it the current item.
     * @param key The key that identifies the item to retrieve. This value must be a non-empty string.
     * @param hints Domain-specific information that provides additional information to the IListDataAdapter to improve retrieval time.
     * @returns An IItemPromise that contains the requested IItem. If they item couldn't be found, the promise completes with a value of null.
    **/
    fromKey(key: string, hints?: any): IItemPromise<IItem<T>>;

    /**
     * Makes the specified IItem or IItemPromise the current item.
     * @param item The IItem or IItemPromise that will become the current item.
     * @returns An IItemPromise that contains the specified item, if it exists. If the specified item is not in the list, the promise completes with a value of null.
    **/
    jumpToItem(item: IItem<T>): IItemPromise<IItem<T>>;

    /**
     * Retrieves the last item in the IListDataSource and makes it the current item.
     * @returns An IItemPromise that contains the requested IItem. f the list is empty, the promise completes with a value of null.
    **/
    last(): IItemPromise<IItem<T>>;

    /**
     * Retrieves the item after the current item and makes it the current item.
     * @returns An IItemPromise that contains the item after the current item. If the cursor moves past the end of the list, the promise completes with a value of null.
    **/
    next(): IItemPromise<IItem<T>>;

    /**
     * Retrieves the item before the current item and makes it the current item.
     * @returns An IItemPromise that contains the item before the current item. If the cursor moves past the start of the list, the promise completes with a value of null.
    **/
    previous(): IItemPromise<IItem<T>>;

    /**
     * Releases resources, stops notifications, and cancels outstanding promises for all tracked items returned by this IListBinding.
    **/
    release(): void;

    /**
     * Creates a request to stop change notifications for the specified item. The change notifications stop when the number of releaseItem calls matches the number of IIItemPromise.retain calls.
     * @param item The IItem or IItemPromise that should stop receiving notifications.
    **/
    releaseItem(item: IItem<T>): void;

    //#endregion Methods

}


/**
 * Used by an IListBinding to provide change notifications when items in a IListDataSource change.
**/
export interface IListNotificationHandler<T> {
    //#region Methods

    /**
     * Indicates the start of a notification batch. Objects that are listening for notifications should defer making updates until endNotifications is called.
    **/
    beginNotifications(): void;

    /**
     * Indicates that an item changed.
     * @param newItem The updated item.
     * @param oldItem The original item.
    **/
    changed(newItem: IItem<T>, oldItem: IItem<T>): void;

    /**
     * Indicates that the number of items in the IListDataSource has changed.
     * @param newCount The updated count.
     * @param oldCount The original count.
    **/
    countChanged(newCount: number, oldCount: number): void;

    /**
     * Indicates the end of a notification batch. When the beginNotifications method is called, objects listening for notifications should defer making updates until endNotifications is called.
    **/
    endNotifications(): void;

    /**
     * Indicates that the index of an item changed.
     * @param handle The temporary ID of the item.
     * @param newIndex The new index.
     * @param oldIndex The original index.
    **/
    indexChanged(handle: string, newIndex: number, oldIndex: number): void;

    /**
     * Indicates that an item was added to the IListDataSource.
     * @param itemPromise A promise for the new IItem.
     * @param previousHandle The temporary ID of the item that precedes the new item.
     * @param nextHandle The temporary ID of the item that follows the new item.
    **/
    inserted(itemPromise: IItemPromise<T>, previousHandle: string, nextHandle: string): void;

    /**
     * Indicates that an IItemPromise was fulfilled and that the item is now available.
     * @param item The fulfilled item.
    **/
    itemAvailable(item: IItem<T>): void;

    /**
     * Indicates that an item was moved.
     * @param item A promise for the IItem that was moved.
     * @param previousHandle The temporary ID of the item that now precedes the moved item.
     * @param nextHandle The temporary ID of the item that now follows the moved item.
    **/
    moved(item: IItemPromise<T>, previousHandle: string, nextHandle: string): void;

    /**
     * Indicates that an item was removed.
     * @param handle The temporary ID of the item that was removed.
     * @param mirage true if the item never actually existed; false if the item was actually present in the IListDataSource.
    **/
    removed(handle: string, mirage: boolean): void;

    //#endregion Methods

}


/**
 * Represents a base class for normal list modifying operations.
**/
export declare class ListBaseWithMutators<T> extends ListBase<T> {
    //#region Methods

    /**
     * Removes the last element from a list and returns it.
     * @returns The last element from the list.
    **/
    pop(): T;

    /**
     * Appends new element(s) to a list, and returns the new length of the list.
     * @param value The element to insert at the end of the list.
     * @returns The new length of the list.
    **/
    push(value: T): number;
    push(...values: T[]): number;

    /**
     * Removes the first element from a list and returns it.
     * @returns The first element from the list.
    **/
    shift(): T;

    /**
     * Appends new element(s) to a list, and returns the new length of the list.
     * @param value The element to insert at the start of the list.
     * @returns The new length of the list.
    **/
    unshift(value: T): number;

    //#endregion Methods
}

/**
 * Represents a base class for list projections.
**/
export declare class ListProjection<T> extends ListBaseWithMutators<T> {
    //#region Methods

    /**
     * Disconnects a WinJS.Binding.List projection from its underlying WinJS.Binding.List. It's only important to call this method when the WinJS.Binding.List projection and the WinJS.Binding.List have different lifetimes. (Call this method on the WinJS.Binding.List projection, not the underlying WinJS.Binding.List.)
    **/
    dispose(): void;

    /**
     * Gets a key/data pair for the specified key.
     * @param key The key of the value to retrieve.
     * @returns An object with two properties: key and data.
    **/
    getItemFromKey(key: string): IKeyDataPair<T>;

    /**
     * Moves the value at index to position newIndex.
     * @param index The original index of the value.
     * @param newIndex The index of the value after the move.
    **/
    move(index: number, newIndex: number): void;

    /**
     * Removes elements from a list and, if necessary, inserts new elements in their place, returning the deleted elements.
     * @param start The zero-based location in the list from which to start removing elements.
     * @param howMany The number of elements to remove.
     * @param item The elements to insert into the list in place of the deleted elements.
     * @returns The deleted elements.
    **/
    splice(start: number, howMany?: number, ...item: T[]): T[];

    //#endregion Methods
}

/**
 * Provides a standard implementation of the bindable contract, as well as a basic storage mechanism that participates in change notification and an asynchronous notification implementation.
**/
export declare var mixin: {
    //#region Methods

    /**
     * Adds a property to the object. The property includes change notification and an ECMAScript 5 property definition .
     * @param name The name of the property to add.
     * @param value The value of the property.
     * @returns This object is returned.
    **/
    addProperty(name: string, value: any): any;

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

/**
 * Provides functions that can make an object observable.
**/
export declare var observableMixin: {
    //#region Methods

    /**
     * Links the specified action to the property specified in the name parameter. This function is invoked when the value of the property may have changed. It is not guaranteed that the action will be called only when a value has actually changed, nor is it guaranteed that the action will be called for every value change. The implementation of this function coalesces change notifications, such that multiple updates to a property value may result in only a single call to the specified action.
     * @param name The name of the property to which to bind the action.
     * @param action The function to invoke asynchronously when the property may have changed.
     * @returns A reference to this observableMixin object.
    **/
    bind(name: string, action: Function): any;

    /**
     * Notifies listeners that a property value was updated.
     * @param name The name of the property that is being updated.
     * @param newValue The new value for the property.
     * @param oldValue The old value for the property.
     * @returns A promise that is completed when the notifications are complete.
    **/
    notify(name: string, newValue: any, oldValue: any): Promise<any>;

    /**
     * Removes one or more listeners from the notification list for a given property.
     * @param name The name of the property to unbind. If this parameter is omitted, all listeners for all events are removed.
     * @param action The function to remove from the listener list for the specified property. If this parameter is omitted, all listeners are removed for the specific property.
     * @returns This object is returned.
    **/
    unbind(name: string, action: Function): any;

    //#endregion Methods

};

/**
 * Do not instantiate. Returned by the createSorted method.
**/
export declare class SortedListProjection<T> extends ListProjection<T> {
    //#region Methods

    /**
     * Returns a key/data pair for the specified index.
     * @param index The index of the value to retrieve.
     * @returns An object that has two properties: key and data.
    **/
    getItem(index: number): IKeyDataPair<T>;

    /**
     * Returns the index of the first occurrence of a key.
     * @param key The key to locate in the list.
     * @returns The index of the first occurrence of a key in a list, or -1 if not found.
    **/
    indexOfKey(key: string): number;

    /**
     * Forces the list to send a itemmutated notification to any listeners for the value at the specified index.
     * @param index The index of the value that was mutated.
    **/
    notifyMutated(index: number): void;

    /**
     * Replaces the value at the specified index with a new value.
     * @param index The index of the value to be replaced.
     * @param newValue The new value.
    **/
    setAt(index: number, newValue: T): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the length of the list. Returns an integer value one higher than the highest element defined in a list.
    **/
    length: number;

    //#endregion Properties

}

/**
 * Provides a reusable declarative binding element.
**/
export declare class Template {
    //#region Constructors

    /**
     * Creates a template that provides a reusable declarative binding element.
     * @constructor 
     * @param element The DOM element to convert to a template.
     * @param options If this parameter is supplied, the template is loaded from the URI and the content of the element parameter is ignored. You can add the following options: href.
    **/
    constructor(element: HTMLElement, options?: string);

    //#endregion Constructors

    //#region Methods

    /**
      * Binds values from the specified data context to elements that are descendants of the specified root element that have the declarative binding attributes specified (data-win-bind).
      * @param dataContext The object to use for default data binding.
      * @param container The element to which to add this rendered template. If this parameter is omitted, a new DIV is created.
      * @returns A Promise that will be completed after binding has finished. The value is either container or the created DIV. promise that is completed after binding has finished.
    **/
    render(dataContext: any, container?: HTMLElement): Promise<HTMLElement>;

    /**
      * Renders a template based on the specified URI (static method).
      * @param href The URI from which to load the template.
      * @param dataContext The object to use for default data binding.
      * @param container The element to which to add this rendered template. If this parameter is omitted, a new DIV is created.
      * @returns A promise that is completed after binding has finished. The value is either the object in the container parameter or the created DIV.
    **/
    static render(href: string, dataContext: any, container?: HTMLElement): Promise<HTMLElement>;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the default binding initializer for the template.
    **/
    bindingInitializer: any;

    /**
     * Gets or sets a value that specifies whether a debug break is inserted into the first rendering of each template. This property only has an effect when the app is in debug mode.
    **/
    debugBreakOnRender: boolean;

    /**
     * This property is deprecated and might not be available in future versions of the WinJS. Gets or sets a value that specifies whether optimized template processing has been disabled.
    **/
    disableOptimizedProcessing: boolean;

    /**
     * Gets the DOM element that is used as the template.
    **/
    element: HTMLElement;

    /**
     * Gets a value that specifies whether templates should be instantiated without the creation of an additional child element.
    **/
    extractChild: boolean;

    /**
     * Determines whether the Template contains declarative controls that must be processed separately. This property is always true. The controls that belong to a Template object's children are instantiated when a Template instance is rendered.
    **/
    isDeclarativeControlContainer: boolean;

    //#endregion Properties

}

//#endregion Objects

//#region Functions

/**
 * Adds a CSS class from the specified path of the source object to a destination object.
 * @param source The source object that has the class to copy.
 * @param sourceProperties The path on the source object to the source class.
 * @param dest The destination object.
**/
export declare function addClassOneTime(source: any, sourceProperties: any[], dest: HTMLElement): void;

/**
 * Returns an observable object. This may be an observable proxy for the specified object, an existing proxy, or the specified object itself if it directly supports observation.
 * @param data The object to observe.
 * @returns The observable object.
**/
export declare function as<U>(data: U): U;

/**
 * Binds to one or more properties on the observable object or or on child values of that object.
 * @param observable The object to bind to.
 * @param bindingDescriptor An object literal containing the binding declarations. Binding declarations take the form: { propertyName: (function | bindingDeclaration), ... }.
 * @returns An object that contains at least a "cancel" field, which is a function that removes all bindings associated with this bind request.
**/
export declare function bind(observable: any, bindingDescriptor: any): any;

/**
 * Creates a default binding initializer for binding between a source property and a destination property with the specified converter function that is executed on the value of the source property.
 * @param convert The conversion function that takes the source property and produces a value that is set to the destination property. This function must be accessible from the global namespace.
 * @returns The binding initializer.
**/
export declare function converter(convert: Function): Function;

/**
 * Creates a one-way binding between the source object and the destination object. Warning Do not attempt to bind data to the ID of an HTML element.
 * @param source The source object.
 * @param sourceProperties The path on the source object to the source property.
 * @param dest The destination object.
 * @param destProperties The path on the destination object to the destination property.
 * @returns An object with a cancel method that is used to coalesce bindings.
**/
export declare function defaultBind(source: any, sourceProperties: any, dest: any, destProperties: any): any;

/**
 * Creates a new constructor function that supports observability with the specified set of properties.
 * @param data The object to use as the pattern for defining the set of properties.
 * @returns A constructor function with 1 optional argument that is the initial state of the properties.
**/
export declare function define(data: any): Function;

/**
 * Wraps the specified object so that all its properties are instrumented for binding. This is meant to be used in conjunction with the binding mixin.
 * @param shape The specification for the bindable object.
 * @returns An object with a set of properties all of which are wired for binding.
**/
export declare function expandProperties(shape: any): any;

/**
 * Marks a custom initializer function as being compatible with declarative data binding.
 * @param customInitializer The custom initializer to be marked as compatible with declarative data binding.
 * @returns The input customInitializer.
**/
export declare function initializer(customInitializer: Function): Function;

/**
 * Notifies listeners that a property value was updated.
 * @param name The name of the property that is being updated.
 * @param newValue The new value for the property.
 * @param oldValue The old value for the property.
 * @returns A promise that is completed when the notifications are complete.
**/
export declare function notify(name: string, newValue: string, oldValue: string): Promise<any>;

/**
 * Sets the destination property to the value of the source property.
 * @param source The source object.
 * @param sourceProperties The path on the source object to the source property.
 * @param dest The destination object.
 * @param destProperties The path on the destination object to the destination property.
 * @returns An object with a cancel method that is used to coalesce bindings.
**/
export declare function oneTime(source: any, sourceProperties: any, dest: any, destProperties: any): any;

/**
 * Binds the values of an object to the values of a DOM element that has the data-win-bind attribute. If multiple DOM elements are to be bound, you must set the attribute on all of them. See the example below for details.
 * @param rootElement Optional. The element at which to start traversing to find elements to bind to. If this parameter is omitted, the entire document is searched.
 * @param dataContext The object that contains the values to which the DOM element should be bound.
 * @param skipRoot If true, specifies that only the children of rootElement should be bound, otherwise rootElement should be bound as well.
 * @param bindingCache The cached binding data.
 * @param defaultInitializer The binding initializer to use in the case that one is not specified in a binding expression. If not provided, the behavior is the same as Binding.defaultBind.
 * @returns A Promise that completes when every item that contains the data-win-bind attribute has been processed and the update has started.
**/
export declare function processAll(rootElement?: Element, dataContext?: any, skipRoot?: boolean, bindingCache?: any, defaultInitializer?: Function): Promise<void>;

/**
 * Creates a one-way binding between the source object and an attribute on the destination element.
 * @param source The source object.
 * @param sourceProperties The path on the source object to the source property.
 * @param dest The destination object.
 * @param destProperties The path on the destination object to the destination property. This must be a single name.
 * @returns An object with a cancel() method that is used to coalesce bindings.
**/
export declare function setAttribute(source: any, sourceProperties: any[], dest: Element, destProperties: any[]): any;

/**
 * Sets an attribute on the destination element to the value of the source property.
 * @param source The source object.
 * @param sourceProperties The path on the source object to the source property.
 * @param dest The destination object.
 * @param destProperties The path on the destination object to the destination property. This must be a single name.
**/
export declare function setAttributeOneTime(source: any, sourceProperties: any[], dest: Element, destProperties: any[]): void;

/**
 * Returns the original (non-observable) object is returned if the specified object is an observable proxy,
 * @param data The object for which to retrieve the original value.
 * @returns If the specified object is an observable proxy, the original object is returned, otherwise the same object is returned.
**/
export declare function unwrap(data: any): any;

//#endregion Functions

//#region Interfaces

export interface IKeyDataPair<T> {
    key: string;
    data: T;
}

//#endregion Interfaces