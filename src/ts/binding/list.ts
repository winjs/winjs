// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// WinJS.Binding.List
//
(function listInit(global) {
    "use strict";

    var strings = {
        get sparseArrayNotSupported() { return WinJS.Resources._getWinJSString("base/sparseArrayNotSupported").value; },
        get illegalListLength() { return WinJS.Resources._getWinJSString("base/illegalListLength").value; },
    };

    function copyargs(args) {
        return Array.prototype.slice.call(args, 0);
    }

    function cloneItem(item) {
        return {
            handle: item.handle,
            key: item.key,
            data: item.data,
            groupKey: item.groupKey,
            groupSize: item.groupSize,
            firstItemKey: item.firstItemKey,
            firstItemIndexHint: item.firstItemIndexHint
        };
    }

    function asNumber(n) {
        return n === undefined ? undefined : +n;
    }

    var createEvent = WinJS.Utilities._createEventProperty;

    var emptyOptions = {};

    // We need a stable sort in order to implement SortedListProjection because we want to be able to
    // perform insertions in a predictable location s.t. if we were to apply another sorted projection
    // over the same list (now containing the inserted data) the resulting order would be the same.
    //
    function mergeSort(m, sorter) {
        var length = m.length;
        if (length <= 1) {
            return m;
        }
        var middle = (length / 2) >>> 0;
        var left = mergeSort(m.slice(0, middle), sorter);
        var right = mergeSort(m.slice(middle), sorter);
        return merge(left, right, sorter);
    }
    function merge(left, right, sorter) {
        var result = [];
        while (left.length && right.length) {
            var r = sorter(left[0], right[0]);
            if (r <= 0) {
                result.push(left.shift());
            } else {
                result.push(right.shift());
            }
        }
        if (left.length) {
            result.push.apply(result, left);
        }
        if (right.length) {
            result.push.apply(result, right);
        }
        return result;
    }

    // Private namespace used for local lazily init'd classes
    var ns = WinJS.Namespace.defineWithParent(null, null, {
        ListBase: WinJS.Namespace._lazy(function () {
            var ListBase = WinJS.Class.define(null, {
                _annotateWithIndex: function (item, index) {
                    var result:any = cloneItem(item);
                    result.index = index;
                    return result;
                },

                /// <field type="Function" locid="WinJS.Binding.ListBase.onitemchanged" helpKeyword="WinJS.Binding.ListBase.onitemchanged">
                /// The value identified by the specified key has been replaced with a different value.
                /// </field>
                onitemchanged: createEvent("itemchanged"),

                /// <field type="Function" locid="WinJS.Binding.ListBase.oniteminserted" helpKeyword="WinJS.Binding.ListBase.oniteminserted">
                /// A new value has been inserted into the list.
                /// </field>
                oniteminserted: createEvent("iteminserted"),

                /// <field type="Function" locid="WinJS.Binding.ListBase.onitemmoved" helpKeyword="WinJS.Binding.ListBase.onitemmoved">
                /// The value identified by the specified key has been moved from one index in the list to another index.
                /// </field>
                onitemmoved: createEvent("itemmoved"),

                /// <field type="Function" locid="WinJS.Binding.ListBase.onitemmutated" helpKeyword="WinJS.Binding.ListBase.onitemmutated">
                /// The value identified by the specified key has been mutated.
                /// </field>
                onitemmutated: createEvent("itemmutated"),

                /// <field type="Function" locid="WinJS.Binding.ListBase.onitemremoved" helpKeyword="WinJS.Binding.ListBase.onitemremoved">
                /// The value identified by the specified key has been removed from the list.
                /// </field>
                onitemremoved: createEvent("itemremoved"),

                /// <field type="Function" locid="WinJS.Binding.ListBase.onreload" helpKeyword="WinJS.Binding.ListBase.onreload">
                /// The list has been refreshed. Any references to items in the list may be incorrect.
                /// </field>
                onreload: createEvent("reload"),

                _notifyItemChanged: function (key, index, oldValue, newValue, oldItem, newItem) {
                    if (this._listeners && this._listeners.itemchanged) {
                        this.dispatchEvent("itemchanged", { key: key, index: index, oldValue: oldValue, newValue: newValue, oldItem: oldItem, newItem: newItem });
                    }
                },
                _notifyItemInserted: function (key, index, value) {
                    if (this._listeners && this._listeners.iteminserted) {
                        this.dispatchEvent("iteminserted", { key: key, index: index, value: value });
                    }
                    var len = this.length;
                    if (len !== this._lastNotifyLength) {
                        this.notify("length", len, this._lastNotifyLength);
                        this._lastNotifyLength = len;
                    }
                },
                _notifyItemMoved: function (key, oldIndex, newIndex, value) {
                    if (this._listeners && this._listeners.itemmoved) {
                        this.dispatchEvent("itemmoved", { key: key, oldIndex: oldIndex, newIndex: newIndex, value: value });
                    }
                },
                _notifyItemMutated: function (key, value, item) {
                    if (this._listeners && this._listeners.itemmutated) {
                        this.dispatchEvent("itemmutated", { key: key, value: value, item: item });
                    }
                },
                _notifyItemRemoved: function (key, index, value, item) {
                    if (this._listeners && this._listeners.itemremoved) {
                        this.dispatchEvent("itemremoved", { key: key, index: index, value: value, item: item });
                    }
                    var len = this.length;
                    if (len !== this._lastNotifyLength) {
                        this.notify("length", len, this._lastNotifyLength);
                        this._lastNotifyLength = len;
                    }
                },
                _notifyReload: function () {
                    if (this._listeners && this._listeners.reload) {
                        this.dispatchEvent("reload");
                    }
                    if (len !== this._lastNotifyLength) {
                        var len = this.length;
                        this.notify("length", len, this._lastNotifyLength);
                        this._lastNotifyLength = len;
                    }
                },

                _normalizeIndex: function (index) {
                    index = asNumber(index);
                    return index < 0 ? this.length + index : index;
                },

                // ABSTRACT: length

                // Notifications:
                //
                // ABSTRACT: notifyMutated: function (index)
                _notifyMutatedFromKey: function (key) {
                    var item = this.getItemFromKey(key);
                    this._notifyItemMutated(key, item.data, item);
                },
                notifyReload: function () {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.notifyReload">
                    /// <summary locid="WinJS.Binding.ListBase.notifyReload">
                    /// Forces the list to send a reload notification to any listeners.
                    /// </summary>
                    /// </signature>
                    this._notifyReload();
                },

                // NOTE: performance can be improved in a number of the projections by overriding getAt/_getArray/_getFromKey/_getKey
                //
                getAt: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.getAt">
                    /// <summary locid="WinJS.Binding.ListBase.getAt">
                    /// Gets the value at the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.ListBase.getAt_p:index">The index of the value to get.</param>
                    /// <returns type="Object" mayBeNull="true" locid="WinJS.Binding.ListBase.getAt_returnValue">The value at the specified index.</returns>
                    /// </signature>
                    index = asNumber(index);
                    var item = this.getItem(index);
                    return item && item.data;
                },
                // returns [ data* ]
                _getArray: function () {
                    var results = new Array(this.length);
                    for (var i = 0, len = this.length; i < len; i++) {
                        var item = this.getItem(i);
                        if (item) {
                            results[i] = item.data;
                        }
                    }
                    return results;
                },
                // returns data
                _getFromKey: function (key) {
                    var item = this.getItemFromKey(key);
                    return item && item.data;
                },
                // ABSTRACT: getItem(index)
                // ABSTRACT: getItemFromKey(key)
                // returns string
                _getKey: function (index) {
                    index = asNumber(index);
                    var item = this.getItem(index);
                    return item && item.key;
                },

                // Normal list non-modifiying operations
                //
                concat: function (item) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.concat">
                    /// <summary locid="WinJS.Binding.ListBase.concat">
                    /// Returns a new list consisting of a combination of two arrays.
                    /// </summary>
                    /// <parameter name="item" type="Object" optional="true" parameterArray="true">Additional items to add to the end of the list.</parameter>
                    /// <returns type="Array" locid="WinJS.Binding.ListBase.concat_returnValue">An array containing the concatenation of the list and any other supplied items.</returns>
                    /// </signature>
                    var a = this._getArray();
                    return a.concat.apply(a, arguments);
                },
                join: function (separator) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.join">
                    /// <summary locid="WinJS.Binding.ListBase.join">
                    /// Returns a string consisting of all the elements of a list separated by the specified separator string.
                    /// </summary>
                    /// <param name="separator" type="String" optional="true" locid="WinJS.Binding.ListBase.join_p:separator">A string used to separate the elements of a list. If this parameter is omitted, the list elements are separated with a comma.</param>
                    /// <returns type="String" locid="WinJS.Binding.ListBase.join_returnValue">The elements of a list separated by the specified separator string.</returns>
                    /// </signature>
                    return this._getArray().join(separator || ",");
                },
                slice: function (begin, end) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.slice">
                    /// <summary locid="WinJS.Binding.ListBase.slice">
                    /// Extracts a section of a list and returns a new list.
                    /// </summary>
                    /// <param name="begin" type="Number" integer="true" locid="WinJS.Binding.ListBase.slice_p:begin">The index that specifies the beginning of the section.</param>
                    /// <param name="end" type="Number" integer="true" optional="true" locid="WinJS.Binding.ListBase.slice_p:end">The index that specifies the end of the section.</param>
                    /// <returns type="Array" locid="WinJS.Binding.ListBase.slice_returnValue">Returns a section of an array.</returns>
                    /// </signature>
                    return this._getArray().slice(begin, end);
                },
                indexOf: function (searchElement, fromIndex) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.indexOf">
                    /// <summary locid="WinJS.Binding.ListBase.indexOf">
                    /// Gets the index of the first occurrence of the specified value in a list.
                    /// </summary>
                    /// <param name="searchElement" type="Object" locid="WinJS.Binding.ListBase.indexOf_p:searchElement">The value to locate in the list.</param>
                    /// <param name="fromIndex" type="Number" integer="true" optional="true" locid="WinJS.Binding.ListBase.indexOf_p:fromIndex">The index at which to begin the search. If fromIndex is omitted, the search starts at index 0.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.ListBase.indexOf_returnValue">Index of the first occurrence of a value in a list or -1 if not found.</returns>
                    /// </signature>
                    fromIndex = asNumber(fromIndex);
                    fromIndex = Math.max(0, this._normalizeIndex(fromIndex) || 0);
                    for (var i = fromIndex, len = this.length; i < len; i++) {
                        var item = this.getItem(i);
                        if (item && item.data === searchElement) {
                            return i;
                        }
                    }
                    return -1;
                },
                // ABSTRACT: indexOfKey(key)
                lastIndexOf: function (searchElement, fromIndex) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.lastIndexOf">
                    /// <summary locid="WinJS.Binding.ListBase.lastIndexOf">
                    /// Gets the index of the last occurrence of the specified value in a list.
                    /// </summary>
                    /// <param name="searchElement" type="Object" locid="WinJS.Binding.ListBase.lastIndexOf_p:searchElement">The value to locate in the list.</param>
                    /// <param name="fromIndex" type="Number" integer="true" optional="true" locid="WinJS.Binding.ListBase.lastIndexOf_p:fromIndex">The index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.ListBase.lastIndexOf_returnValue">The index of the last occurrence of a value in a list, or -1 if not found.</returns>
                    /// </signature>
                    fromIndex = asNumber(fromIndex);
                    var length = this.length;
                    fromIndex = Math.min(this._normalizeIndex(fromIndex !== undefined ? fromIndex : length), length - 1);
                    var i;
                    for (i = fromIndex; i >= 0; i--) {
                        var item = this.getItem(i);
                        if (item && item.data === searchElement) {
                            return i;
                        }
                    }
                    return -1;
                },

                //
                // Normal list projection operations
                //

                every: function (callback, thisArg) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.every">
                    /// <summary locid="WinJS.Binding.ListBase.every">
                    /// Checks whether the specified callback function returns true for all elements in a list.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.every_p:callback">A function that accepts up to three arguments. This function is called for each element in the list until it returns false or the end of the list is reached.</param>
                    /// <param name="thisArg" type="Object" optional="true" locid="WinJS.Binding.ListBase.every_p:thisArg">An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.</param>
                    /// <returns type="Boolean" locid="WinJS.Binding.ListBase.every_returnValue">True if the callback returns true for all elements in the list.</returns>
                    /// </signature>
                    return this._getArray().every(callback, thisArg);
                },
                filter: function (callback, thisArg) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.filter">
                    /// <summary locid="WinJS.Binding.ListBase.filter">
                    /// Returns the elements of a list that meet the condition specified in a callback function.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.filter_p:callback">A function that accepts up to three arguments. The function is called for each element in the list.</param>
                    /// <param name="thisArg" type="Object" optional="true" locid="WinJS.Binding.ListBase.filter_p:thisArg">An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.</param>
                    /// <returns type="Array" locid="WinJS.Binding.ListBase.filter_returnValue">An array containing the elements that meet the condition specified in the callback function.</returns>
                    /// </signature>
                    return this._getArray().filter(callback, thisArg);
                },
                forEach: function (callback, thisArg) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.forEach">
                    /// <summary locid="WinJS.Binding.ListBase.forEach">
                    /// Calls the specified callback function for each element in a list.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.forEach_p:callback">A function that accepts up to three arguments. The function is called for each element in the list.</param>
                    /// <param name="thisArg" type="Object" optional="true" locid="WinJS.Binding.ListBase.forEach_p:thisArg">An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.</param>
                    /// </signature>
                    this._getArray().forEach(callback, thisArg);
                },
                map: function (callback, thisArg) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.map">
                    /// <summary locid="WinJS.Binding.ListBase.map">
                    /// Calls the specified callback function on each element of a list, and returns an array that contains the results.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.map_p:callback">A function that accepts up to three arguments. The function is called for each element in the list.</param>
                    /// <param name="thisArg" type="Object" optional="true" locid="WinJS.Binding.ListBase.map_p:thisArg">An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.</param>
                    /// <returns type="Array" locid="WinJS.Binding.ListBase.map_returnValue">An array containing the result of calling the callback function on each element in the list.</returns>
                    /// </signature>
                    return this._getArray().map(callback, thisArg);
                },
                some: function (callback, thisArg) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.some">
                    /// <summary locid="WinJS.Binding.ListBase.some">
                    /// Checks whether the specified callback function returns true for any element of a list.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.some_p:callback">A function that accepts up to three arguments. The function is called for each element in the list until it returns true, or until the end of the list.</param>
                    /// <param name="thisArg" type="Object" optional="true" locid="WinJS.Binding.ListBase.some_p:thisArg">An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used.</param>
                    /// <returns type="Boolean" locid="WinJS.Binding.ListBase.some_returnValue">True if callback returns true for any element in the list.</returns>
                    /// </signature>
                    return this._getArray().some(callback, thisArg);
                },
                reduce: function (callback, initialValue) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.reduce">
                    /// <summary locid="WinJS.Binding.ListBase.reduce">
                    /// Accumulates a single result by calling the specified callback function for all elements in a list. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.reduce_p:callback">A function that accepts up to four arguments. The function is called for each element in the list.</param>
                    /// <param name="initialValue" type="Object" optional="true" locid="WinJS.Binding.ListBase.reduce_p:initialValue">If initialValue is specified, it is used as the value with which to start the accumulation. The first call to the function provides this value as an argument instead of a list value.</param>
                    /// <returns type="Object" locid="WinJS.Binding.ListBase.reduce_returnValue">The return value from the last call to the callback function.</returns>
                    /// </signature>
                    if (arguments.length > 1) {
                        return this._getArray().reduce(callback, initialValue);
                    }
                    return this._getArray().reduce(callback);
                },
                reduceRight: function (callback, initialValue) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.reduceRight">
                    /// <summary locid="WinJS.Binding.ListBase.reduceRight">
                    /// Accumulates a single result by calling the specified callback function for all elements in a list, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
                    /// </summary>
                    /// <param name="callback" type="Function" locid="WinJS.Binding.ListBase.reduceRight_p:callback">A function that accepts up to four arguments. The function is called for each element in the list.</param>
                    /// <param name="initialValue" type="Object" optional="true" locid="WinJS.Binding.ListBase.reduceRight_p:initialValue">If initialValue is specified, it is used as the value with which to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of a list value.</param>
                    /// <returns type="Object" locid="WinJS.Binding.ListBase.reduceRight_returnValue">The return value from last call to callback function.</returns>
                    /// </signature>
                    if (arguments.length > 1) {
                        return this._getArray().reduceRight(callback, initialValue);
                    }
                    return this._getArray().reduceRight(callback);
                },

                //
                // Live Projections - if you want the lifetime of the returned projections to
                //  be shorter than that of the list object on which they are based you have
                //  to remember to call .dispose() on them when done.
                //

                createFiltered: function (predicate) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.createFiltered">
                    /// <summary locid="WinJS.Binding.ListBase.createFiltered">
                    /// Creates a live filtered projection over this list. As the list changes, the filtered projection reacts to those changes and may also change.
                    /// </summary>
                    /// <param name="predicate" type="Function" locid="WinJS.Binding.ListBase.createFiltered_p:predicate">A function that accepts a single argument. The createFiltered function calls the callback with each element in the list. If the function returns true, that element will be included in the filtered list.</param>
                    /// <returns type="WinJS.Binding.List" locid="WinJS.Binding.ListBase.createFiltered_returnValue">Filtered projection over the list.</returns>
                    /// </signature>
                    return new ns.FilteredListProjection(this, predicate);
                },
                createGrouped: function (groupKey, groupData, groupSorter) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.createGrouped">
                    /// <summary locid="WinJS.Binding.ListBase.createGrouped">
                    /// Creates a live grouped projection over this list. As the list changes, the grouped projection reacts to those changes and may also change. The grouped projection sorts all the elements of the list to be in group-contiguous order. The grouped projection also contains a .groups property which is a WinJS.Binding.List representing the groups that were found in the list.
                    /// </summary>
                    /// <param name="groupKey" type="Function" locid="WinJS.Binding.ListBase.createGrouped_p:groupKey">A function that accepts a single argument. The function is called with each element in the list, the function should return a string representing the group containing the element.</param>
                    /// <param name="groupData" type="Function" locid="WinJS.Binding.ListBase.createGrouped_p:groupData">A function that accepts a single argument. The function is called on an element in the list for each group. It should return the value that should be set as the data of the .groups list element for this group.</param>
                    /// <param name="groupSorter" type="Function" optional="true" locid="WinJS.Binding.ListBase.createGrouped_p:groupSorter">A function that accepts two arguments. The function is called with the key of groups found in the list. It must return one of the following numeric values: negative if the first argument is less than the second, zero if the two arguments are equivalent, positive if the first argument is greater than the second. If omitted, the groups are sorted in ascending, ASCII character order.</param>
                    /// <returns type="WinJS.Binding.List" locid="WinJS.Binding.ListBase.createGrouped_returnValue">A grouped projection over the list.</returns>
                    /// </signature>
                    return new ns.GroupedSortedListProjection(this, groupKey, groupData, groupSorter);
                },
                createSorted: function (sorter) {
                    /// <signature helpKeyword="WinJS.Binding.ListBase.createSorted">
                    /// <summary locid="WinJS.Binding.ListBase.createSorted">
                    /// Creates a live sorted projection over this list. As the list changes, the sorted projection reacts to those changes and may also change.
                    /// </summary>
                    /// <param name="sorter" type="Function" locid="WinJS.Binding.ListBase.createSorted_p:sorter">A function that accepts two arguments. The function is called with elements in the list. It must return one of the following numeric values: negative if the first argument is less than the second, zero if the two arguments are equivalent, positive if the first argument is greater than the second.</param>
                    /// <returns type="WinJS.Binding.List" locid="WinJS.Binding.ListBase.createSorted_returnValue">A sorted projection over the list.</returns>
                    /// </signature>
                    return new ns.SortedListProjection(this, sorter);
                },

                dataSource: {
                    get: function () {
                        return (this._dataSource = this._dataSource || new WinJS.Binding._BindingListDataSource(this));
                    }
                },

            }, {
                supportedForProcessing: false,
            })
            WinJS.Class.mix(ListBase, WinJS.Binding.observableMixin);
            WinJS.Class.mix(ListBase, WinJS.Utilities.eventMixin);
            return ListBase;
        }),

        ListBaseWithMutators: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.ListBase, null, {
                // ABSTRACT: setAt(index, value)

                // Normal list modifying operations
                //
                // returns data from tail of list
                pop: function () {
                    /// <signature helpKeyword="WinJS.Binding.ListBaseWithMutators.pop">
                    /// <summary locid="WinJS.Binding.ListBaseWithMutators.pop">
                    /// Removes the last element from a list and returns it.
                    /// </summary>
                    /// <returns type="Object" locid="WinJS.Binding.ListBaseWithMutators.pop_returnValue">Last element from the list.</returns>
                    /// </signature>
                    return this.splice(-1, 1)[0];
                },
                push: function (value) {
                    /// <signature helpKeyword="WinJS.Binding.ListBaseWithMutators.push">
                    /// <summary locid="WinJS.Binding.ListBaseWithMutators.push">
                    /// Appends new element(s) to a list, and returns the new length of the list.
                    /// </summary>
                    /// <param name="value" type="Object" parameterArray="true" locid="WinJS.Binding.ListBaseWithMutators.push_p:value">The element to insert at the end of the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.ListBaseWithMutators.push_returnValue">The new length of the list.</returns>
                    /// </signature>
                    if (arguments.length === 1) {
                        this.splice(this.length, 0, value);
                        return this.length;
                    } else {
                        var args = copyargs(arguments);
                        args.splice(0, 0, this.length, 0);
                        this.splice.apply(this, args);
                        return this.length;
                    }
                },
                // returns data from head of list
                shift: function () {
                    /// <signature helpKeyword="WinJS.Binding.ListBaseWithMutators.shift">
                    /// <summary locid="WinJS.Binding.ListBaseWithMutators.shift">
                    /// Removes the first element from a list and returns it.
                    /// </summary>
                    /// <returns type="Object" locid="WinJS.Binding.ListBaseWithMutators.shift_returnValue">First element from the list.</returns>
                    /// </signature>
                    return this.splice(0, 1)[0];
                },
                unshift: function (value) {
                    /// <signature helpKeyword="WinJS.Binding.ListBaseWithMutators.unshift">
                    /// <summary locid="WinJS.Binding.ListBaseWithMutators.unshift">
                    /// Appends new element(s) to a list, and returns the new length of the list.
                    /// </summary>
                    /// <param name="value" type="Object" parameterArray="true" locid="WinJS.Binding.ListBaseWithMutators.unshift_p:value">The element to insert at the start of the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.ListBaseWithMutators.unshift_returnValue">The new length of the list.</returns>
                    /// </signature>
                    if (arguments.length === 1) {
                        this.splice(0, 0, value);
                    } else {
                        var args = copyargs(arguments);
                        // Wow, this looks weird. Insert 0, 0 at the beginning of splice.
                        args.splice(0, 0, 0, 0);
                        this.splice.apply(this, args);
                    }
                    return this.length;
                }

                // ABSTRACT: splice(index, howMany, values...)
                // ABSTRACT: _spliceFromKey(key, howMany, values...)
            }, {
                supportedForProcessing: false,
            })
        }),

        ListProjection: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.ListBaseWithMutators, null, {
                _list: null,
                _myListeners: null,

                _addListListener: function (name, func) {
                    var l = { name: name, handler: func.bind(this) };
                    this._myListeners = this._myListeners || [];
                    this._myListeners.push(l);
                    this._list.addEventListener(name, l.handler);
                },

                // ABSTRACT: _listReload()

                dispose: function () {
                    /// <signature helpKeyword="WinJS.Binding.ListProjection.dispose">
                    /// <summary locid="WinJS.Binding.ListProjection.dispose">
                    /// Disconnects this WinJS.Binding.List projection from its underlying WinJS.Binding.List. This is important only if they have different lifetimes.
                    /// </summary>
                    /// </signature>
                    var list = this._list;

                    var listeners = this._myListeners;
                    this._myListeners = [];

                    for (var i = 0, len = listeners.length; i < len; i++) {
                        var l = listeners[i];
                        list.removeEventListener(l.name, l.handler);
                    }

                    // Set this to an empty list and tell everyone that they need to reload to avoid
                    //  consumers null-refing on an empty list.
                    this._list = new WinJS.Binding.List();
                    this._listReload();
                },

                getItemFromKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.ListProjection.getItemFromKey">
                    /// <summary locid="WinJS.Binding.ListProjection.getItemFromKey">
                    /// Gets a key/data pair for the specified key.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.ListProjection.getItemFromKey_p:key">The key of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.ListProjection.getItemFromKey_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    return this._list.getItemFromKey(key);
                },

                move: function (index, newIndex) {
                    /// <signature helpKeyword="WinJS.Binding.ListProjection.move">
                    /// <summary locid="WinJS.Binding.ListProjection.move">
                    /// Moves the value at index to position newIndex.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.ListProjection.move_p:index">The original index of the value.</param>
                    /// <param name="newIndex" type="Number" integer="true" locid="WinJS.Binding.ListProjection.move_p:newIndex">The index of the value after the move.</param>
                    /// </signature>
                    index = asNumber(index);
                    newIndex = asNumber(newIndex);
                    if (index === newIndex || index < 0 || newIndex < 0 || index >= this.length || newIndex >= this.length) {
                        return;
                    }
                    index = this._list.indexOfKey(this._getKey(index));
                    newIndex = this._list.indexOfKey(this._getKey(newIndex));
                    this._list.move(index, newIndex);
                },

                _notifyMutatedFromKey: function (key) {
                    this._list._notifyMutatedFromKey(key);
                },

                splice: function (index, howMany, item) {
                    /// <signature helpKeyword="WinJS.Binding.ListProjection.splice">
                    /// <summary locid="WinJS.Binding.ListProjection.splice">
                    /// Removes elements from a list and, if necessary, inserts new elements in their place, returning the deleted elements.
                    /// </summary>
                    /// <param name="start" type="Number" integer="true" locid="WinJS.Binding.ListProjection.splice_p:start">The zero-based location in the list from which to start removing elements.</param>
                    /// <param name="howMany" type="Number" integer="true" locid="WinJS.Binding.ListProjection.splice_p:howMany">The number of elements to remove.</param>
                    /// <param name="item" type="Object" optional="true" parameterArray="true" locid="WinJS.Binding.ListProjection.splice_p:item">The elements to insert into the list in place of the deleted elements.</param>
                    /// <returns type="Array" locid="WinJS.Binding.ListProjection.splice_returnValue">The deleted elements.</returns>
                    /// </signature>
                    index = asNumber(index);
                    index = Math.max(0, this._normalizeIndex(index));
                    var args = copyargs(arguments);
                    if (index === this.length) {
                        // In order to getAt the tail right we just push on to the end of the underlying list
                        args[0] = this._list.length;
                        return this._list.splice.apply(this._list, args);
                    } else {
                        args[0] = this._getKey(index);
                        return this._spliceFromKey.apply(this, args);
                    }
                },

                _setAtKey: function (key, value) {
                    this._list._setAtKey(key, value);
                },

            }, {
                supportedForProcessing: false,
            })
        }),

        FilteredListProjection: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.ListProjection, function (list, filter) {
                this._list = list;
                this._addListListener("itemchanged", this._listItemChanged);
                this._addListListener("iteminserted", this._listItemInserted);
                this._addListListener("itemmutated", this._listItemMutated);
                this._addListListener("itemmoved", this._listItemMoved);
                this._addListListener("itemremoved", this._listItemRemoved);
                this._addListListener("reload", this._listReload);
                this._filter = filter;
                this._initFilteredKeys();
            }, {
                _filter: null,
                _filteredKeys: null,
                _initFilteredKeys: function () {
                    var filter = this._filter;
                    var list = this._list;
                    var keys = [];
                    for (var i = 0, len = list.length; i < len; i++) {
                        var item = list.getItem(i);
                        if (item && filter(item.data)) {
                            keys.push(item.key);
                        }
                    }
                    this._filteredKeys = keys;
                },

                _findInsertionPosition: function (key, index) {
                    // find the spot to insert this by identifing the previous element in the list
                    var filter = this._filter;
                    var previousKey;
                    while ((--index) >= 0) {
                        var item = this._list.getItem(index);
                        if (item && filter(item.data)) {
                            previousKey = item.key;
                            break;
                        }
                    }
                    var filteredKeys = this._filteredKeys;
                    var filteredIndex = previousKey ? (filteredKeys.indexOf(previousKey) + 1) : 0;
                    return filteredIndex;
                },

                _listItemChanged: function (event) {
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var oldValue = event.detail.oldValue;
                    var newValue = event.detail.newValue;
                    var oldItem = event.detail.oldItem;
                    var newItem = event.detail.newItem;
                    var filter = this._filter;
                    var oldInFilter = filter(oldValue);
                    var newInFilter = filter(newValue);
                    if (oldInFilter && newInFilter) {
                        var filteredKeys = this._filteredKeys;
                        var filteredIndex = filteredKeys.indexOf(key);
                        this._notifyItemChanged(key, filteredIndex, oldValue, newValue, oldItem, newItem);
                    } else if (oldInFilter && !newInFilter) {
                        this._listItemRemoved({ detail: { key: key, index: index, value: oldValue, item: oldItem } });
                    } else if (!oldInFilter && newInFilter) {
                        this._listItemInserted({ detail: { key: key, index: index, value: newValue } });
                    }
                },
                _listItemInserted: function (event) {
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var value = event.detail.value;
                    var filter = this._filter;
                    if (filter(value)) {
                        var filteredIndex = this._findInsertionPosition(key, index);
                        var filteredKeys = this._filteredKeys;
                        filteredKeys.splice(filteredIndex, 0, key);
                        this._notifyItemInserted(key, filteredIndex, value);
                    }
                },
                _listItemMoved: function (event) {
                    var key = event.detail.key;
                    var newIndex = event.detail.newIndex;
                    var value = event.detail.value;
                    var filteredKeys = this._filteredKeys;
                    var oldFilteredIndex = filteredKeys.indexOf(key);
                    if (oldFilteredIndex !== -1) {
                        filteredKeys.splice(oldFilteredIndex, 1);
                        var newFilteredIndex = this._findInsertionPosition(key, newIndex);
                        filteredKeys.splice(newFilteredIndex, 0, key);
                        this._notifyItemMoved(key, oldFilteredIndex, newFilteredIndex, value);
                    }
                },
                _listItemMutated: function (event) {
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var item = event.detail.item;
                    var filter = this._filter;
                    var filteredKeys = this._filteredKeys;
                    var filteredIndex = filteredKeys.indexOf(key);
                    var oldInFilter = filteredIndex !== -1;
                    var newInFilter = filter(value);
                    if (oldInFilter && newInFilter) {
                        this._notifyItemMutated(key, value, item);
                    } else if (oldInFilter && !newInFilter) {
                        filteredKeys.splice(filteredIndex, 1);
                        this._notifyItemRemoved(key, filteredIndex, value, item);
                    } else if (!oldInFilter && newInFilter) {
                        this._listItemInserted({ detail: { key: key, index: this._list.indexOfKey(key), value: value } });
                    }
                },
                _listItemRemoved: function (event) {
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var item = event.detail.item;
                    var filteredKeys = this._filteredKeys;
                    var filteredIndex = filteredKeys.indexOf(key);
                    if (filteredIndex !== -1) {
                        filteredKeys.splice(filteredIndex, 1);
                        this._notifyItemRemoved(key, filteredIndex, value, item);
                    }
                },
                _listReload: function () {
                    this._initFilteredKeys();
                    this._notifyReload();
                },

                /// <field type="Number" integer="true" locid="WinJS.Binding.FilteredListProjection.length" helpKeyword="WinJS.Binding.FilteredListProjection.length">Returns an integer value one higher than the highest element defined in an list.</field>
                length: {
                    get: function () { return this._filteredKeys.length; },
                    set: function (value) {
                        if (typeof value === "number" && value >= 0) {
                            var current = this.length;
                            if (current > value) {
                                this.splice(value, current - value);
                            }
                        } else {
                            throw new WinJS.ErrorFromName("WinJS.Binding.List.IllegalLength", strings.illegalListLength);
                        }
                    }
                },

                getItem: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.FilteredListProjection.getItem">
                    /// <summary locid="WinJS.Binding.FilteredListProjection.getItem">
                    /// Returns a key/data pair for the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.FilteredListProjection.getItem_p:index">The index of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.FilteredListProjection.getItem_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    index = asNumber(index);
                    return this.getItemFromKey(this._filteredKeys[index]);
                },

                indexOfKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.FilteredListProjection.indexOfKey">
                    /// <summary locid="WinJS.Binding.FilteredListProjection.indexOfKey">
                    /// Returns the index of the first occurrence of a key in a list.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.FilteredListProjection.indexOfKey_p:key">The key to locate in the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.FilteredListProjection.indexOfKey_returnValue">The index of the first occurrence of a key in a list, or -1 if not found.</returns>
                    /// </signature>
                    return this._filteredKeys.indexOf(key);
                },

                notifyMutated: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.FilteredListProjection.notifyMutated">
                    /// <summary locid="WinJS.Binding.FilteredListProjection.notifyMutated">
                    /// Forces the list to send a itemmutated notification to any listeners for the value at the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.FilteredListProjection.notifyMutated_p:index">The index of the value that was mutated.</param>
                    /// </signature>
                    index = asNumber(index);
                    return this._notifyMutatedFromKey(this._filteredKeys[index]);
                },

                setAt: function (index, value) {
                    /// <signature helpKeyword="WinJS.Binding.FilteredListProjection.setAt">
                    /// <summary locid="WinJS.Binding.FilteredListProjection.setAt">
                    /// Replaces the value at the specified index with a new value.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.FilteredListProjection.setAt_p:index">The index of the value that was replaced.</param>
                    /// <param name="newValue" type="Object" locid="WinJS.Binding.FilteredListProjection.setAt_p:newValue">The new value.</param>
                    /// </signature>
                    index = asNumber(index);
                    this._setAtKey(this._filteredKeys[index], value);
                },

                // returns [ data* ] of removed items
                _spliceFromKey: function (key, howMany) {
                    // first add in all the new items if we have any, this should serve to push key to the right
                    if (arguments.length > 2) {
                        var args = copyargs(arguments);
                        args[1] = 0; // howMany
                        this._list._spliceFromKey.apply(this._list, args);
                    }
                    // now we can remove anything that needs to be removed, since they are not necessarially contiguous
                    // in the underlying list we remove them one by one.
                    var result = [];
                    if (howMany) {
                        var keysToRemove = [];
                        var filteredKeys = this._filteredKeys;
                        var filteredKeyIndex = filteredKeys.indexOf(key);
                        for (var i = filteredKeyIndex, len = filteredKeys.length; i < len && (i - filteredKeyIndex) < howMany; i++) {
                            var key = filteredKeys[i];
                            keysToRemove.push(key);
                        }
                        var that = this;
                        keysToRemove.forEach(function (key) {
                            result.push(that._list._spliceFromKey(key, 1)[0]);
                        });
                    }
                    return result;
                }
            }, {
                supportedForProcessing: false,
            })
        }),

        SortedListProjection: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.ListProjection, function (list, sortFunction) {
                this._list = list;
                this._addListListener("itemchanged", this._listItemChanged);
                this._addListListener("iteminserted", this._listItemInserted);
                this._addListListener("itemmoved", this._listItemMoved);
                this._addListListener("itemmutated", this._listItemMutated);
                this._addListListener("itemremoved", this._listItemRemoved);
                this._addListListener("reload", this._listReload);
                this._sortFunction = sortFunction;
                this._initSortedKeys();
            }, {
                _sortFunction: null,
                _sortedKeys: null,
                _initSortedKeys: function () {
                    var list = this._list;
                    var keys = [];
                    for (var i = 0, len = list.length; i < len; i++) {
                        var item = list.getItem(i);
                        if (item) {
                            keys[i] = item.key;
                        }
                    }
                    var sorter = this._sortFunction;
                    var sorted = mergeSort(keys, function (l, r) {
                        l = list.getItemFromKey(l).data;
                        r = list.getItemFromKey(r).data;
                        return sorter(l, r);
                    });
                    this._sortedKeys = sorted;
                },

                _findInsertionPos: function (key, index, value, startingMin, startingMax) {
                    var sorter = this._sortFunction;
                    var sortedKeys = this._sortedKeys;
                    var min = Math.max(0, startingMin || -1);
                    var max = Math.min(sortedKeys.length, startingMax || Number.MAX_VALUE);
                    var mid = min;
                    while (min <= max) {
                        mid = ((min + max) / 2) >>> 0;
                        var sortedKey = sortedKeys[mid];
                        if (!sortedKey) {
                            break;
                        }
                        var sortedItem = this.getItemFromKey(sortedKey);
                        var r = sorter(sortedItem.data, value);
                        if (r < 0) {
                            min = mid + 1;
                        } else if (r === 0) {
                            return this._findStableInsertionPos(key, index, min, max, mid, value);
                        } else {
                            max = mid - 1;
                        }
                    }
                    return min;
                },
                _findBeginningOfGroup: function (mid, sorter, list, sortedKeys, value) {
                    // we made it to the beginning of the list without finding something
                    // that sorts equal to this value, insert this key at the beginning of
                    // this section of keys.
                    var min = 0;
                    var max = mid;
                    while (min <= max) {
                        mid = ((min + max) / 2) >>> 0;
                        var sortedKey = sortedKeys[mid];
                        var sortedItem = list.getItemFromKey(sortedKey);
                        var r = sorter(sortedItem.data, value);
                        if (r < 0) {
                            min = mid + 1;
                        } else {
                            max = mid - 1;
                        }
                    }
                    return min;
                },
                _findEndOfGroup: function (mid, sorter, list, sortedKeys, value) {
                    // we made it ot the end of the list without finding something that sorts
                    // equal to this value, insert this key at the end of this section of
                    // keys.
                    var min = mid;
                    var max = sortedKeys.length;
                    while (min <= max) {
                        mid = ((min + max) / 2) >>> 0;
                        var sortedKey = sortedKeys[mid];
                        if (!sortedKey) {
                            return sortedKeys.length;
                        }
                        var sortedItem = list.getItemFromKey(sortedKey);
                        var r = sorter(sortedItem.data, value);
                        if (r <= 0) {
                            min = mid + 1;
                        } else {
                            max = mid - 1;
                        }
                    }
                    return min;
                },
                _findStableInsertionPos: function (key, index:number, min, max, mid, value) {
                    var list = this._list;
                    var length = list.length;
                    var sorter = this._sortFunction;
                    var sortedKeys = this._sortedKeys;
                    if (index < (length / 2)) {
                        for (var i = index - 1; i >= 0; i--) {
                            var item = list.getItem(i);
                            if (sorter(item.data, value) === 0) {
                                // we have found the next item to the left, insert this item to
                                // the right of that.
                                if ((length - min) > max) {
                                    return sortedKeys.indexOf(item.key, min) + 1;
                                } else {
                                    return sortedKeys.lastIndexOf(item.key, max) + 1;
                                }
                            }
                        }
                        return this._findBeginningOfGroup(mid, sorter, list, sortedKeys, value);
                    } else {
                        for (var i = index + 1; i < length; i++) {
                            var item = list.getItem(i);
                            if (sorter(item.data, value) === 0) {
                                // we have found the next item to the right, insert this item
                                // to the left of that.
                                if ((length - min) > max) {
                                    return sortedKeys.indexOf(item.key, min);
                                } else {
                                    return sortedKeys.lastIndexOf(item.key, max);
                                }
                            }
                        }
                        return this._findEndOfGroup(mid, sorter, list, sortedKeys, value);
                    }
                },

                _listItemChanged: function (event) {
                    var key = event.detail.key;
                    var newValue = event.detail.newValue;
                    var oldValue = event.detail.oldValue;
                    var sortFunction = this._sortFunction;
                    if (sortFunction(oldValue, newValue) === 0) {
                        var sortedIndex = this.indexOfKey(key);
                        this._notifyItemChanged(key, sortedIndex, oldValue, newValue, event.detail.oldItem, event.detail.newItem);
                    } else {
                        this._listItemRemoved({ detail: { key: key, index: event.detail.index, value: event.detail.oldValue, item: event.detail.oldItem } });
                        this._listItemInserted({ detail: { key: key, index: event.detail.index, value: event.detail.newValue } });
                    }
                },
                _listItemInserted: function (event, knownMin, knownMax) {
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var value = event.detail.value;
                    var sortedIndex = this._findInsertionPos(key, index, value, knownMin, knownMax);
                    this._sortedKeys.splice(sortedIndex, 0, key);
                    this._notifyItemInserted(key, sortedIndex, value);
                },
                _listItemMoved: function (event, knownMin, knownMax) {
                    var key = event.detail.key;
                    var newIndex = event.detail.newIndex;
                    var value = event.detail.value;
                    var sortedKeys = this._sortedKeys;
                    var oldSortedIndex = sortedKeys.indexOf(key, knownMin);
                    sortedKeys.splice(oldSortedIndex, 1);
                    var newSortedIndex = this._findInsertionPos(key, newIndex, value, knownMin, knownMax);
                    sortedKeys.splice(newSortedIndex, 0, key);
                    if (newSortedIndex !== oldSortedIndex) {
                        // The move in the underlying list resulted in a move in the sorted list
                        //
                        this._notifyItemMoved(key, oldSortedIndex, newSortedIndex, value);
                    } else {
                        // The move in the underlying list resulted in no change in the sorted list
                        //
                    }
                },
                _listItemMutated: function (event) {
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var item = event.detail.item;
                    var index = this._list.indexOfKey(key);
                    var sortedIndex = this._sortedKeys.indexOf(key);
                    this._sortedKeys.splice(sortedIndex, 1);
                    var targetIndex = this._findInsertionPos(key, index, value);
                    this._sortedKeys.splice(sortedIndex, 0, key);
                    if (sortedIndex === targetIndex) {
                        this._notifyItemMutated(key, value, item);
                        return;
                    }
                    this._listItemRemoved({ detail: { key: key, index: index, value: value, item: item } });
                    this._listItemInserted({ detail: { key: key, index: index, value: value } });
                },
                _listItemRemoved: function (event, knownMin) {
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var item = event.detail.item;
                    var sortedKeys = this._sortedKeys;
                    var sortedIndex = sortedKeys.indexOf(key, knownMin);
                    sortedKeys.splice(sortedIndex, 1);
                    this._notifyItemRemoved(key, sortedIndex, value, item);
                },
                _listReload: function () {
                    this._initSortedKeys();
                    this._notifyReload();
                },

                /// <field type="Number" integer="true" locid="WinJS.Binding.SortedListProjection.length" helpKeyword="WinJS.Binding.SortedListProjection.length">Gets or sets the length of the list. Returns an integer value one higher than the highest element defined in a list.</field>
                length: {
                    get: function () { return this._sortedKeys.length; },
                    set: function (value) {
                        if (typeof value === "number" && value >= 0) {
                            var current = this.length;
                            if (current > value) {
                                this.splice(value, current - value);
                            }
                        } else {
                            throw new WinJS.ErrorFromName("WinJS.Binding.List.IllegalLength", strings.illegalListLength);
                        }
                    }
                },

                getItem: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.SortedListProjection.getItem">
                    /// <summary locid="WinJS.Binding.SortedListProjection.getItem">
                    /// Returns a key/data pair for the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.SortedListProjection.getItem_p:index">The index of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.SortedListProjection.getItem_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    index = asNumber(index);
                    return this.getItemFromKey(this._sortedKeys[index]);
                },

                indexOfKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.SortedListProjection.getItem">
                    /// <summary locid="WinJS.Binding.SortedListProjection.getItem">
                    /// Returns the index of the first occurrence of a key.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.SortedListProjection.indexOfKey_p:key">The key to locate in the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.SortedListProjection.indexOfKey_returnValue">The index of the first occurrence of a key in a list, or -1 if not found.</returns>
                    /// </signature>
                    return this._sortedKeys.indexOf(key);
                },

                notifyMutated: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.SortedListProjection.notifyMutated">
                    /// <summary locid="WinJS.Binding.SortedListProjection.notifyMutated">
                    /// Forces the list to send a itemmutated notification to any listeners for the value at the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.SortedListProjection.notifyMutated_p:index">The index of the value that was mutated.</param>
                    /// </signature>
                    index = asNumber(index);
                    this._notifyMutatedFromKey(this._sortedKeys[index]);
                },

                setAt: function (index, value) {
                    /// <signature helpKeyword="WinJS.Binding.SortedListProjection.setAt">
                    /// <summary locid="WinJS.Binding.SortedListProjection.setAt">
                    /// Replaces the value at the specified index with a new value.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.SortedListProjection.setAt_p:index">The index of the value that was replaced.</param>
                    /// <param name="newValue" type="Object" locid="WinJS.Binding.SortedListProjection.setAt_p:newValue">The new value.</param>
                    /// </signature>
                    index = asNumber(index);
                    this._setAtKey(this._sortedKeys[index], value);
                },

                // returns [ data* ] of removed items
                _spliceFromKey: function (key, howMany) {
                    // first add in all the new items if we have any, this should serve to push key to the right
                    if (arguments.length > 2) {
                        var args = copyargs(arguments);
                        args[1] = 0; // howMany
                        this._list._spliceFromKey.apply(this._list, args);
                    }
                    // now we can remove anything that needs to be removed, since they are not necessarially contiguous
                    // in the underlying list we remove them one by one.
                    var result = [];
                    if (howMany) {
                        var keysToRemove = [];
                        var sortedKeys = this._sortedKeys;
                        var sortedKeyIndex = sortedKeys.indexOf(key);
                        for (var i = sortedKeyIndex, len = sortedKeys.length; i < len && (i - sortedKeyIndex) < howMany; i++) {
                            keysToRemove.push(sortedKeys[i]);
                        }
                        var that = this;
                        keysToRemove.forEach(function (key) {
                            result.push(that._list._spliceFromKey(key, 1)[0]);
                        });
                    }
                    return result;
                }
            }, {
                supportedForProcessing: false,
            })
        }),

        // This projection sorts the underlying list by group key and within a group
        //  respects the position of the item in the underlying list. It is built on top
        //  of the SortedListProjection and has an intimate contract with
        //  GroupsListProjection.
        //
        GroupedSortedListProjection: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.SortedListProjection, function (list, groupKeyOf, groupDataOf, groupSorter) {
                this._list = list;
                this._addListListener("itemchanged", this._listGroupedItemChanged);
                this._addListListener("iteminserted", this._listGroupedItemInserted);
                this._addListListener("itemmoved", this._listGroupedItemMoved);
                this._addListListener("itemmutated", this._listGroupedItemMutated);
                this._addListListener("itemremoved", this._listGroupedItemRemoved);
                this._addListListener("reload", this._listReload);
                this._sortFunction = function (l, r) {
                    l = groupKeyOf(l);
                    r = groupKeyOf(r);
                    if (groupSorter) {
                        return groupSorter(l, r);
                    } else {
                        return l < r ? -1 : l === r ? 0 : 1;
                    }
                };
                this._groupKeyOf = groupKeyOf;
                this._groupDataOf = groupDataOf;
                this._initSortedKeys();
                this._initGroupedItems();
            }, {
                _groupKeyOf: null,
                _groupDataOf: null,

                _groupedItems: null,
                _initGroupedItems: function () {
                    var groupedItems = {};
                    var list = this._list;
                    var groupKeyOf = this._groupKeyOf;
                    for (var i = 0, len = list.length; i < len; i++) {
                        var item = cloneItem(list.getItem(i));
                        item.groupKey = groupKeyOf(item.data);
                        groupedItems[item.key] = item;
                    }
                    this._groupedItems = groupedItems;
                },

                _groupsProjection: null,

                _listGroupedItemChanged: function (event) {
                    var key = event.detail.key;
                    var oldValue = event.detail.oldValue;
                    var newValue = event.detail.newValue;
                    var groupedItems = this._groupedItems;
                    var oldGroupedItem = groupedItems[key];
                    var newGroupedItem = cloneItem(oldGroupedItem);
                    newGroupedItem.data = newValue;
                    newGroupedItem.groupKey = this._groupKeyOf(newValue);
                    groupedItems[key] = newGroupedItem;
                    var index;
                    if (oldGroupedItem.groupKey === newGroupedItem.groupKey) {
                        index = this.indexOfKey(key);
                        this._notifyItemChanged(key, index, oldValue, newValue, oldGroupedItem, newGroupedItem);
                    } else {
                        index = event.detail.index;
                        this._listItemChanged({ detail: { key: key, index: index, oldValue: oldValue, newValue: newValue, oldItem: oldGroupedItem, newItem: newGroupedItem } });
                    }
                },
                _listGroupedItemInserted: function (event) {
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var groupKey = this._groupKeyOf(value);
                    this._groupedItems[key] = {
                        handle: key,
                        key: key,
                        data: value,
                        groupKey: groupKey
                    };
                    var groupMin, groupMax;
                    if (this._groupsProjection) {
                        var groupItem = this._groupsProjection._groupItems[groupKey];
                        if (groupItem) {
                            groupMin = groupItem.firstItemIndexHint;
                            groupMax = groupMin + groupItem.groupSize;
                        }
                    }
                    this._listItemInserted(event, groupMin, groupMax);
                },
                _listGroupedItemMoved: function (event) {
                    var groupMin, groupMax;
                    var groupKey = this._groupedItems[event.detail.key].groupKey;
                    if (this._groupsProjection) {
                        var groupItem = this._groupsProjection._groupItems[groupKey];
                        groupMin = groupItem.firstItemIndexHint;
                        groupMax = groupMin + groupItem.groupSize;
                    }
                    this._listItemMoved(event, groupMin, groupMax);
                },
                _listGroupedItemMutated: function (event) {
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var groupedItems = this._groupedItems;
                    var oldGroupedItem = groupedItems[key];
                    var groupKey = this._groupKeyOf(value);
                    if (oldGroupedItem.groupKey === groupKey) {
                        this._notifyItemMutated(key, value, oldGroupedItem);
                    } else {
                        var newGroupedItem = cloneItem(oldGroupedItem);
                        newGroupedItem.groupKey = groupKey;
                        groupedItems[key] = newGroupedItem;
                        var index = this._list.indexOfKey(key);
                        this._listItemRemoved({ detail: { key: key, index: index, value: value, item: oldGroupedItem } });
                        this._listItemInserted({ detail: { key: key, index: index, value: value } });
                    }
                },
                _listGroupedItemRemoved: function (event) {
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var value = event.detail.value;
                    var groupedItems = this._groupedItems;
                    var groupedItem = groupedItems[key];
                    delete groupedItems[key];
                    var groupMin, groupMax;
                    if (this._groupsProjection) {
                        var groupItem = this._groupsProjection._groupItems[groupedItem.groupKey];
                        groupMin = groupItem.firstItemIndexHint;
                        groupMax = groupMin + groupItem.groupSize;
                    }
                    this._listItemRemoved({ detail: { key: key, index: index, value: value, item: groupedItem } }, groupMin, groupMax);
                },

                // override _listReload
                _listReload: function () {
                    this._initGroupedItems();
                    ns.SortedListProjection.prototype._listReload.call(this);
                },

                /// <field type="WinJS.Binding.List" locid="WinJS.Binding.GroupedSortedListProjection.groups" helpKeyword="WinJS.Binding.GroupedSortedListProjection.groups">Gets a WinJS.Binding.List, which is a projection of the groups that were identified in this list.</field>
                groups: {
                    get: function () {
                        if (this._groupsProjection === null) {
                            this._groupsProjection = new ns.GroupsListProjection(this, this._groupKeyOf, this._groupDataOf);
                        }
                        return this._groupsProjection;
                    }
                },

                // We have to implement this because we keep our own set of items so that we can
                //  tag them with groupKey.
                //
                getItemFromKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.GroupedSortedListProjection.getItemFromKey">
                    /// <summary locid="WinJS.Binding.GroupedSortedListProjection.getItemFromKey">
                    /// Gets a key/data pair for the specified item key.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.GroupedSortedListProjection.getItemFromKey_p:key">The key of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.GroupedSortedListProjection.getItemFromKey_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    return this._groupedItems[key];
                }
            }, {
                supportedForProcessing: false,
            })
        }),

        // This is really an implementation detail of GroupedSortedListProjection and takes a
        // dependency on its internals and implementation details.
        //
        GroupsListProjection: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.ListBase, function (list, groupKeyOf, groupDataOf) {
                this._list = list;
                this._addListListener("itemchanged", this._listItemChanged);
                this._addListListener("iteminserted", this._listItemInserted);
                this._addListListener("itemmoved", this._listItemMoved);
                // itemmutated is handled by the GroupedSortedListProjection because if the item
                //  changes groups it turns into a remove/insert.
                this._addListListener("itemremoved", this._listItemRemoved);
                this._addListListener("reload", this._listReload);
                this._groupKeyOf = groupKeyOf;
                this._groupDataOf = groupDataOf;
                this._initGroupKeysAndItems();
            }, {
                _list: null,

                _addListListener: function (name, func) {
                    // interestingly, since GroupsListProjection has the same lifetime as the GroupedSortedListProjection
                    // we don't have to worry about cleaning up the cycle here.
                    this._list.addEventListener(name, func.bind(this));
                },

                _groupDataOf: null,
                _groupKeyOf: null,
                _groupOf: function (item) {
                    return this.getItemFromKey(this._groupKeyOf(item.data));
                },

                _groupKeys: null,
                _groupItems: null,
                _initGroupKeysAndItems: function () {
                    var groupDataOf = this._groupDataOf;
                    var list = this._list;
                    var groupItems = {};
                    var groupKeys = [];
                    var currentGroupKey = null;
                    var currentGroupItem = null;
                    var groupCount;
                    for (var i = 0, len = list.length; i < len; i++) {
                        var item = list.getItem(i);
                        var groupKey = item.groupKey;
                        if (groupKey !== currentGroupKey) {
                            // new group
                            if (currentGroupItem) {
                                currentGroupItem.groupSize = groupCount;
                            }
                            groupCount = 1;
                            currentGroupKey = groupKey;
                            currentGroupItem = {
                                handle: groupKey,
                                key: groupKey,
                                data: groupDataOf(item.data),
                                firstItemKey: item.key,
                                firstItemIndexHint: i
                            };
                            groupItems[groupKey] = currentGroupItem;
                            groupKeys.push(groupKey);
                        } else {
                            // existing group
                            groupCount++;
                        }
                    }
                    if (currentGroupItem) {
                        currentGroupItem.groupSize = groupCount;
                    }
                    this._groupKeys = groupKeys;
                    this._groupItems = groupItems;
                },

                _listItemChanged: function (event) {
                    // itemchanged is only interesting if the item that changed is the first item
                    //  of a group at which point we need to regenerate the group item.
                    //
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var newValue = event.detail.newValue;
                    var list = this._list;
                    var groupKey = list.getItemFromKey(key).groupKey;
                    var groupItems = this._groupItems;
                    var groupItem = groupItems[groupKey];
                    if (groupItem.firstItemIndexHint === index) {
                        var newGroupItem = cloneItem(groupItem);
                        newGroupItem.data = this._groupDataOf(newValue);
                        newGroupItem.firstItemKey = key;
                        groupItems[groupKey] = newGroupItem;
                        this._notifyItemChanged(groupKey, this._groupKeys.indexOf(groupKey), groupItem.data, newGroupItem.data, groupItem, newGroupItem);
                    }
                },
                _listItemInserted: function (event) {
                    // iteminserted is only interesting if this is a new group, or is the first
                    //  item of the group at which point the group data is regenerated. It will
                    //  however always result in a +1 to all the following firstItemIndexHints
                    //
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var value = event.detail.value;
                    var list = this._list;
                    var groupKey = list.getItemFromKey(key).groupKey;
                    var groupItems = this._groupItems;
                    var groupKeys = this._groupKeys;
                    var groupItem = groupItems[groupKey];
                    var groupIndex;
                    var oldGroupItem, newGroupItem;

                    var i, len;
                    if (!groupItem) {
                        // we have a new group, add it
                        for (i = 0, len = groupKeys.length; i < len; i++) {
                            groupItem = groupItems[groupKeys[i]];
                            if (groupItem.firstItemIndexHint >= index) {
                                break;
                            }
                        }
                        groupIndex = i;
                        groupItem = {
                            handle: groupKey,
                            key: groupKey,
                            data: this._groupDataOf(value),
                            groupSize: 1,
                            firstItemKey: key,
                            firstItemIndexHint: index
                        };
                        groupKeys.splice(groupIndex, 0, groupKey);
                        groupItems[groupKey] = groupItem;
                        this._notifyItemInserted(groupKey, groupIndex, groupItem.data);
                    } else {
                        oldGroupItem = groupItem;
                        newGroupItem = cloneItem(oldGroupItem);
                        newGroupItem.groupSize++;
                        if (oldGroupItem.firstItemIndexHint === index) {
                            newGroupItem.groupData = this._groupDataOf(value);
                            newGroupItem.firstItemKey = key;
                            newGroupItem.firstItemIndexHint = index;
                        }
                        groupItems[groupKey] = newGroupItem;
                        groupIndex = groupKeys.indexOf(groupKey);
                        this._notifyItemChanged(groupKey, groupIndex, oldGroupItem.data, newGroupItem.data, oldGroupItem, newGroupItem);
                    }
                    // update the firstItemIndexHint on following groups
                    for (i = groupIndex + 1, len = groupKeys.length; i < len; i++) {
                        oldGroupItem = groupItems[groupKeys[i]];
                        newGroupItem = cloneItem(oldGroupItem);
                        newGroupItem.firstItemIndexHint++;
                        groupItems[newGroupItem.key] = newGroupItem;
                        this._notifyItemChanged(newGroupItem.key, i, oldGroupItem.data, newGroupItem.data, oldGroupItem, newGroupItem);
                    }
                },
                _listItemMoved: function (event) {
                    // itemmoved is not important to grouping unless the move resulted in a new
                    //  first item in the group at which point we will regenerate the group data
                    //
                    var key = event.detail.key;
                    var oldIndex = event.detail.oldIndex;
                    var newIndex = event.detail.newIndex;
                    var list = this._list;
                    var groupKey = list.getItemFromKey(key).groupKey;
                    var groupItems = this._groupItems;
                    var groupItem = groupItems[groupKey];
                    if (groupItem.firstItemIndexHint === newIndex ||
                        groupItem.firstItemIndexHint === oldIndex) {
                        // the first item of the group has changed, update it.
                        var item = list.getItem(groupItem.firstItemIndexHint);
                        var newGroupItem = cloneItem(groupItem);
                        newGroupItem.data = this._groupDataOf(item.data);
                        newGroupItem.firstItemKey = item.key;
                        groupItems[groupKey] = newGroupItem;
                        this._notifyItemChanged(groupKey, this._groupKeys.indexOf(groupKey), groupItem.data, newGroupItem.data, groupItem, newGroupItem);
                    }
                },
                _listItemRemoved: function (event) {
                    // itemremoved is only interesting if the group was of size 1 or was the
                    //  first item of the group at which point the group data is regenerated.
                    //  It will however always result in a -1 to all of the following
                    //  firstItemIndexHints.
                    //
                    var index = event.detail.index;
                    var item = event.detail.item;
                    var groupItems = this._groupItems;
                    var groupKeys = this._groupKeys;
                    // since the value is no longer in the list we can't ask for its item and
                    // get the group key from there.
                    var groupKey = item.groupKey;
                    var groupItem = groupItems[groupKey];
                    var groupIndex = groupKeys.indexOf(groupKey);
                    var oldGroupItem, newGroupItem;

                    if (groupItem.groupSize === 1) {
                        groupKeys.splice(groupIndex, 1);
                        delete groupItems[groupKey];
                        this._notifyItemRemoved(groupKey, groupIndex, groupItem.data, groupItem);
                        // after removing the group we need to decrement the index because it is used
                        // for modifying subsequent group firstItemIndexHint's
                        groupIndex--;
                    } else {
                        oldGroupItem = groupItem;
                        newGroupItem = cloneItem(oldGroupItem);
                        newGroupItem.groupSize--;
                        if (oldGroupItem.firstItemIndexHint === index) {
                            // find the next group item, it will be at the same index as the old
                            // first group item.
                            var newFirstItem = this._list.getItem(index);
                            newGroupItem.data = this._groupDataOf(newFirstItem.data);
                            newGroupItem.firstItemKey = newFirstItem.key;
                        }
                        groupItems[groupKey] = newGroupItem;
                        this._notifyItemChanged(groupKey, groupIndex, oldGroupItem.data, newGroupItem.data, oldGroupItem, newGroupItem);
                    }
                    for (var i = groupIndex + 1, len = groupKeys.length; i < len; i++) {
                        oldGroupItem = groupItems[groupKeys[i]];
                        newGroupItem = cloneItem(oldGroupItem);
                        newGroupItem.firstItemIndexHint--;
                        groupItems[newGroupItem.key] = newGroupItem;
                        this._notifyItemChanged(newGroupItem.key, i, oldGroupItem.data, newGroupItem.data, oldGroupItem, newGroupItem);
                    }
                },
                _listReload: function () {
                    this._initGroupKeysAndItems();
                    this._notifyReload();
                },

                /// <field type="Number" integer="true" locid="WinJS.Binding.GroupsListProjection.length" helpKeyword="WinJS.Binding.GroupsListProjection.length">Gets the length of the list. Returns an integer value one higher than the highest element defined in a list.</field>
                length: {
                    get: function () { return this._groupKeys.length; }
                },

                getItem: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.GroupsListProjection.getItem">
                    /// <summary locid="WinJS.Binding.GroupsListProjection.getItem">
                    /// Gets a key/data pair for the specified index .
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.GroupsListProjection.getItem_p:index">The index of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.GroupsListProjection.getItem_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    index = asNumber(index);
                    return this._groupItems[this._groupKeys[index]];
                },
                getItemFromKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.GroupsListProjection.getItemFromKey">
                    /// <summary locid="WinJS.Binding.GroupsListProjection.getItemFromKey">
                    /// Gets a key/data pair for the specified key.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.GroupsListProjection.getItemFromKey_p:key">The key of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.GroupsListProjection.getItemFromKey_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    return this._groupItems[key];
                },

                indexOfKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.GroupsListProjection.indexOfKey">
                    /// <summary locid="WinJS.Binding.GroupsListProjection.indexOfKey">
                    /// Returns the index of the first occurrence of a key in a list.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.GroupsListProjection.indexOfKey_p:key">The key to locate in the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.GroupsListProjection.indexOfKey_returnValue">The index of the first occurrence of a key in a list, or -1 if not found.</returns>
                    /// </signature>
                    return this._groupKeys.indexOf(key);
                }
            }, {
                supportedForProcessing: false,
            })
        }),
    });

    WinJS.Namespace.define("WinJS.Binding", {
        List: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(ns.ListBaseWithMutators, function (list, options) {
                /// <signature helpKeyword="WinJS.Binding.List.List">
                /// <summary locid="WinJS.Binding.List.constructor">
                /// Creates a WinJS.Binding.List object.
                /// </summary>
                /// <param name="list" type="Array" optional="true" locid="WinJS.Binding.List.constructor_p:list">The array containing the elements to initalize the list.</param>
                /// <param name="options" type="Object" optional="true" locid="WinJS.Binding.List.constructor_p:options">If options.binding is true, the list will contain the result of calling WinJS.Binding.as() on the element values. If options.proxy is true, the list specified as the first parameter is used as the storage for the WinJS.Binding.List. This option should be used with care because uncoordinated edits to the data storage will result in errors.</param>
                /// <returns type="WinJS.Binding.List" locid="WinJS.Binding.List.constructor_returnValue">The newly-constructed WinJS.Binding.List instance.</returns>
                /// </signature>

                this._currentKey = 0;
                this._keys = null;
                this._keyMap = {};

                // options:
                //  - binding: binding.as on items
                //  - proxy: proxy over input data
                //
                options = options || emptyOptions;
                this._proxy = options.proxy;
                this._binding = options.binding;
                if (this._proxy) {
                    if (Object.keys(list).length !== list.length) {
                        throw new WinJS.ErrorFromName("WinJS.Binding.List.NotSupported", strings.sparseArrayNotSupported);
                    }
                    this._data = list;
                    this._currentKey = list.length;
                } else if (list) {
                    var keyDataMap = this._keyMap;
                    var pos = 0, i = 0;
                    for (var len = list.length; i < len; i++) {
                        if (i in list) {
                            var item = list[i];
                            if (this._binding) {
                                item = WinJS.Binding.as(item);
                            }
                            var key = pos.toString();
                            pos++;
                            keyDataMap[key] = { handle: key, key: key, data: item };
                        }
                    }
                    if (pos !== i) {
                        this._initializeKeys();
                    }
                    this._currentKey = pos;
                }
            }, {
                _currentKey: 0,

                _keys: null,
                _keyMap: null,

                _modifyingData: 0,

                _initializeKeys: function () {
                    if (this._keys) {
                        return;
                    }

                    var keys = [];
                    if (this._data) {
                        // If this list is a proxy over the data then we will have been lazily initializing
                        // the entries in the list, however the 1:1 mapping between index and key is about
                        // to go away so this is our last chance to pull the items out of the data.
                        //
                        var keyMap = this._keyMap;
                        var data = this._data;
                        for (var i = 0, len = data.length; i < len; i++) {
                            if (i in data) {
                                var key = i.toString();
                                keys[i] = key;
                                if (!(key in keyMap)) {
                                    var item = data[i];
                                    if (this._binding) {
                                        item = WinJS.Binding.as(item);
                                    }
                                    keyMap[key] = { handle: key, key: key, data: item };
                                }
                            }
                        }
                    } else {
                        // In the case where List owns the data we will have created the keyMap at initialization
                        // time and can use that to harvest all the keys into the _keys list.
                        //
                        Object.keys(this._keyMap).forEach(function (key:any) {
                            keys[key >>> 0] = key;
                        });
                    }
                    this._keys = keys;
                },
                _lazyPopulateEntry: function (index) {
                    if (this._data && index in this._data) {
                        var item = this._data[index];
                        if (this._binding) {
                            item = WinJS.Binding.as(item);
                        }
                        var key = index.toString();
                        var entry = { handle: key, key: key, data: item };
                        this._keyMap[entry.key] = entry;
                        return entry;
                    }
                },

                _assignKey: function () {
                    return (++this._currentKey).toString();
                },

                /// <field type="Number" integer="true" locid="WinJS.Binding.List.length" helpKeyword="WinJS.Binding.List.length">Gets or sets the length of the list, which is an integer value one higher than the highest element defined in the list.</field>
                length: {
                    get: function () {
                        // If we are proxying use the underlying list's length
                        // If we have already allocated keys use that length
                        // If we haven't allocated keys then we can use _currentKey which was set at initialization time
                        //  to be length of the input list.
                        if (this._data) {
                            return this._data.length;
                        } else if (this._keys) {
                            return this._keys.length;
                        } else {
                            return this._currentKey;
                        }
                    },
                    set: function (value) {
                        if (typeof value === "number" && value >= 0) {
                            this._initializeKeys();
                            var current = this.length;
                            if (current > value) {
                                this.splice(value, current - value);
                            } else {
                                // We don't support setting lengths to longer in order to have sparse behavior
                                value = current;
                            }
                            if (this._data) {
                                this._modifyingData++;
                                try {
                                    this._data.length = value;
                                } finally {
                                    this._modifyingData--;
                                }
                            }
                            if (this._keys) {
                                this._keys.length = value;
                            }
                        } else {
                            throw new WinJS.ErrorFromName("WinJS.Binding.List.IllegalLength", strings.illegalListLength);
                        }
                    }
                },

                getItem: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.List.getItem">
                    /// <summary locid="WinJS.Binding.List.getItem">
                    /// Gets a key/data pair for the specified list index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.List.getItem_p:index">The index of value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.List.getItem_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    var entry;
                    var key;
                    index = asNumber(index);
                    if (this._keys) {
                        key = this._keys[index];
                        entry = key && this._keyMap[key];
                    } else {
                        key = index.toString();
                        entry = this._keyMap[key] || this._lazyPopulateEntry(index);
                    }
                    return entry;
                },
                getItemFromKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.List.getItemFromKey">
                    /// <summary locid="WinJS.Binding.List.getItemFromKey">
                    /// Gets a key/data pair for the list item key specified.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.List.getItemFromKey_p:key">The key of the value to retrieve.</param>
                    /// <returns type="Object" locid="WinJS.Binding.List.getItemFromKey_returnValue">An object with .key and .data properties.</returns>
                    /// </signature>
                    var entry;
                    // if we have a keys list we know to go through the keyMap, or if we are not
                    // proxying through _data we also know to go through the keyMap.
                    if (this._keys || !this._data) {
                        entry = this._keyMap[key];
                    } else {
                        entry = this.getItem(key >>> 0);
                    }
                    return entry;
                },

                indexOfKey: function (key) {
                    /// <signature helpKeyword="WinJS.Binding.List.indexOfKey">
                    /// <summary locid="WinJS.Binding.List.indexOfKey">
                    /// Gets the index of the first occurrence of a key in a list.
                    /// </summary>
                    /// <param name="key" type="String" locid="WinJS.Binding.List.indexOfKey_p:key">The key to locate in the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.List.indexOfKey_returnValue">The index of the first occurrence of a key in a list, or -1 if not found.</returns>
                    /// </signature>
                    var index = -1;
                    if (this._keys) {
                        index = this._keys.indexOf(key);
                    } else {
                        var t = key >>> 0;
                        if (t < this._currentKey) {
                            index = t;
                        }
                    }
                    return index;
                },

                move: function (index, newIndex) {
                    /// <signature helpKeyword="WinJS.Binding.List.move">
                    /// <summary locid="WinJS.Binding.List.move">
                    /// Moves the value at index to the specified position.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.List.move_p:index">The original index of the value.</param>
                    /// <param name="newIndex" type="Number" integer="true" locid="WinJS.Binding.List.move_p:newIndex">The index of the value after the move.</param>
                    /// </signature>
                    index = asNumber(index);
                    newIndex = asNumber(newIndex);
                    this._initializeKeys();
                    if (index === newIndex || index < 0 || newIndex < 0 || index >= this.length || newIndex >= this.length) {
                        return;
                    }
                    if (this._data) {
                        this._modifyingData++;
                        try {
                            var item = this._data.splice(index, 1)[0];
                            this._data.splice(newIndex, 0, item);
                        } finally {
                            this._modifyingData--;
                        }
                    }
                    var key = this._keys.splice(index, 1)[0];
                    this._keys.splice(newIndex, 0, key);
                    this._notifyItemMoved(key, index, newIndex, this.getItemFromKey(key).data);
                },

                notifyMutated: function (index) {
                    /// <signature helpKeyword="WinJS.Binding.List.notifyMutated">
                    /// <summary locid="WinJS.Binding.List.notifyMutated">
                    /// Forces the list to send a itemmutated notification to any listeners for the value at the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.List.notifyMutated_p:index">The index of the value that was mutated.</param>
                    /// </signature>
                    index = asNumber(index);
                    var key = this._keys ? this._keys[index] : index.toString();
                    this._notifyMutatedFromKey(key);
                },

                setAt: function (index, newValue) {
                    /// <signature helpKeyword="WinJS.Binding.List.setAt">
                    /// <summary locid="WinJS.Binding.List.setAt">
                    /// Replaces the value at the specified index with a new value.
                    /// </summary>
                    /// <param name="index" type="Number" integer="true" locid="WinJS.Binding.List.setAt_p:index">The index of the value that was replaced.</param>
                    /// <param name="newValue" type="Object" locid="WinJS.Binding.List.setAt_p:newValue">The new value.</param>
                    /// </signature>
                    index = asNumber(index);
                    this._initializeKeys();
                    var length = this.length;
                    if (index === length) {
                        this.push(newValue);
                    } else if (index < length) {
                        if (this._data) {
                            this._modifyingData++;
                            try {
                                this._data[index] = newValue;
                            } finally {
                                this._modifyingData--;
                            }
                        }
                        if (this._binding) {
                            newValue = WinJS.Binding.as(newValue);
                        }
                        if (index in this._keys) {
                            var key = this._keys[index];
                            var oldEntry = this._keyMap[key];
                            var newEntry = cloneItem(oldEntry);
                            newEntry.data = newValue;
                            this._keyMap[key] = newEntry;
                            this._notifyItemChanged(key, index, oldEntry.data, newValue, oldEntry, newEntry);
                        }
                    }
                },

                _setAtKey: function (key, newValue) {
                    this.setAt(this.indexOfKey(key), newValue);
                },

                // These are the traditional Array mutators, they don't result in projections. In particular
                //  having both sort and sorted is a bit confusing. It may be the case that we want to eliminate
                //  the various array helpers outside of the standard push/pop,shift/unshift,splice,get*,setAt
                //  and then offer up the specific projections: filter, sorted, grouped. Anything else can be
                //  obtained through _getArray().
                //
                reverse: function () {
                    /// <signature helpKeyword="WinJS.Binding.List.reverse">
                    /// <summary locid="WinJS.Binding.List.reverse">
                    /// Returns a list with the elements reversed. This method reverses the elements of a list object in place. It does not create a new list object during execution.
                    /// </summary>
                    /// <returns type="WinJS.Binding.List" locid="WinJS.Binding.List.reverse_returnValue">The reversed list.</returns>
                    /// </signature>
                    this._initializeKeys();
                    if (this._data) {
                        this._modifyingData++;
                        try {
                            this._data.reverse();
                        } finally {
                            this._modifyingData--;
                        }
                    }
                    this._keys.reverse();
                    this._notifyReload();
                    return this;
                },
                sort: function (sortFunction) {
                    /// <signature helpKeyword="WinJS.Binding.List.sort">
                    /// <summary locid="WinJS.Binding.List.sort">
                    /// Returns a list with the elements sorted. This method sorts the elements of a list object in place. It does not create a new list object during execution.
                    /// </summary>
                    /// <param name="sortFunction" type="Function" locid="WinJS.Binding.List.sort_p:sortFunction">The function used to determine the order of the elements. If omitted, the elements are sorted in ascending, ASCII character order.</param>
                    /// <returns type="WinJS.Binding.List" locid="WinJS.Binding.List.sort_returnValue">The sorted list.</returns>
                    /// </signature>
                    this._initializeKeys();
                    if (this._data) {
                        this._modifyingData++;
                        try {
                            this._data.sort(sortFunction);
                        } finally {
                            this._modifyingData--;
                        }
                    }
                    var that = this;
                    this._keys.sort(function (l, r) {
                        l = that._keyMap[l];
                        r = that._keyMap[r];
                        if (sortFunction) {
                            return sortFunction(l.data, r.data);
                        }
                        l = (l && l.data || "").toString();
                        r = (l && r.data || "").toString();
                        return l < r ? -1 : l === r ? 0 : 1;
                    });
                    this._notifyReload();
                    return this;
                },

                pop: function () {
                    /// <signature helpKeyword="WinJS.Binding.List.pop">
                    /// <summary locid="WinJS.Binding.List.pop">
                    /// Removes the last element from a list and returns it.
                    /// </summary>
                    /// <returns type="Object" locid="WinJS.Binding.List.pop_returnValue">Last element from the list.</returns>
                    /// </signature>
                    if (this.length === 0) {
                        return;
                    }
                    this._initializeKeys();
                    var key = this._keys.pop();
                    var entry = this._keyMap[key];
                    var data = entry && entry.data;
                    if (this._data) {
                        this._modifyingData++;
                        try {
                            this._data.pop();
                        } finally {
                            this._modifyingData--;
                        }
                    }
                    delete this._keyMap[key];
                    this._notifyItemRemoved(key, this._keys.length, data, entry);
                    return data;
                },

                push: function (value) {
                    /// <signature helpKeyword="WinJS.Binding.List.push">
                    /// <summary locid="WinJS.Binding.List.push">
                    /// Appends new element(s) to a list, and returns the new length of the list.
                    /// </summary>
                    /// <param name="value" type="Object" parameterArray="true" locid="WinJS.Binding.List.push_p:value">The element to insert at the end of the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.List.push_returnValue">The new length of the list.</returns>
                    /// </signature>
                    this._initializeKeys();
                    var length = arguments.length;
                    for (var i = 0; i < length; i++) {
                        var item = arguments[i];
                        if (this._binding) {
                            item = WinJS.Binding.as(item);
                        }
                        var key = this._assignKey();
                        this._keys.push(key);
                        if (this._data) {
                            this._modifyingData++;
                            try {
                                this._data.push(arguments[i])
                            } finally {
                                this._modifyingData--;
                            }
                        }
                        this._keyMap[key] = { handle: key, key: key, data: item };
                        this._notifyItemInserted(key, this._keys.length - 1, item);
                    }
                    return this.length;
                },

                shift: function () {
                    /// <signature helpKeyword="WinJS.Binding.List.shift">
                    /// <summary locid="WinJS.Binding.List.shift">
                    /// Removes the first element from a list and returns it.
                    /// </summary>
                    /// <returns type="Object" locid="WinJS.Binding.List.shift_returnValue">First element from the list.</returns>
                    /// </signature>
                    if (this.length === 0) {
                        return;
                    }

                    this._initializeKeys();
                    var key = this._keys.shift();
                    var entry = this._keyMap[key];
                    var data = entry && entry.data;
                    if (this._data) {
                        this._modifyingData++;
                        try {
                            this._data.shift();
                        } finally {
                            this._modifyingData--;
                        }
                    }
                    delete this._keyMap[key];
                    this._notifyItemRemoved(key, 0, data, entry);
                    return data;
                },

                unshift: function (value) {
                    /// <signature helpKeyword="WinJS.Binding.List.unshift">
                    /// <summary locid="WinJS.Binding.List.unshift">
                    /// Appends new element(s) to a list, and returns the new length of the list.
                    /// </summary>
                    /// <param name="value" type="Object" parameterArray="true" locid="WinJS.Binding.List.unshift_p:value">The element to insert at the start of the list.</param>
                    /// <returns type="Number" integer="true" locid="WinJS.Binding.List.unshift_returnValue">The new length of the list.</returns>
                    /// </signature>
                    this._initializeKeys();
                    var length = arguments.length;
                    for (var i = length - 1; i >= 0; i--) {
                        var item = arguments[i];
                        if (this._binding) {
                            item = WinJS.Binding.as(item);
                        }
                        var key = this._assignKey();
                        this._keys.unshift(key);
                        if (this._data) {
                            this._modifyingData++;
                            try {
                                this._data.unshift(arguments[i])
                            } finally {
                                this._modifyingData--;
                            }
                        }
                        this._keyMap[key] = { handle: key, key: key, data: item };
                        this._notifyItemInserted(key, 0, item);
                    }
                    return this.length;
                },

                splice: function (index, howMany, item) {
                    /// <signature helpKeyword="WinJS.Binding.List.splice">
                    /// <summary locid="WinJS.Binding.List.splice">
                    /// Removes elements from a list and, if necessary, inserts new elements in their place, returning the deleted elements.
                    /// </summary>
                    /// <param name="start" type="Number" integer="true" locid="WinJS.Binding.List.splice_p:start">The zero-based location in the list from which to start removing elements.</param>
                    /// <param name="howMany" type="Number" integer="true" locid="WinJS.Binding.List.splice_p:howMany">The number of elements to remove.</param>
                    /// <param name="item" type="Object" optional="true" parameterArray="true" locid="WinJS.Binding.List.splice_p:item">The elements to insert into the list in place of the deleted elements.</param>
                    /// <returns type="Array" locid="WinJS.Binding.List.splice_returnValue">The deleted elements.</returns>
                    /// </signature>
                    index = asNumber(index);
                    this._initializeKeys();
                    index = Math.max(0, this._normalizeIndex(index));
                    howMany = Math.max(0, Math.min(howMany || 0, this.length - index));
                    var result = [];
                    while (howMany) {
                        var key = this._keys[index];
                        var entry = this._keyMap[key];
                        var data = entry && entry.data;
                        result.push(data);
                        this._keys.splice(index, 1);
                        if (this._data) {
                            this._modifyingData++;
                            try {
                                this._data.splice(index, 1);
                            } finally {
                                this._modifyingData--;
                            }
                        }
                        delete this._keyMap[key];
                        this._notifyItemRemoved(key, index, data, entry);
                        --howMany;
                    }
                    if (arguments.length > 2) {
                        for (var i = 2, len = arguments.length; i < len; i++) {
                            var additionalItem = arguments[i];
                            if (this._binding) {
                                additionalItem = WinJS.Binding.as(additionalItem);
                            }
                            var pos = Math.min(index + i - 2, this.length);
                            var newKey = this._assignKey();
                            this._keys.splice(pos, 0, newKey);
                            if (this._data) {
                                this._modifyingData++;
                                try {
                                    this._data.splice(pos, 0, arguments[i]);
                                } finally {
                                    this._modifyingData--;
                                }
                            }
                            this._keyMap[newKey] = { handle: newKey, key: newKey, data: additionalItem };
                            this._notifyItemInserted(newKey, pos, additionalItem);
                        }
                    }
                    return result;
                },
                // returns [ data* ] of removed items
                _spliceFromKey: function (key, howMany) {
                    this._initializeKeys();
                    var args = copyargs(arguments);
                    args[0] = this._keys.indexOf(key);
                    return this.splice.apply(this, args);
                }
            }, {
                supportedForProcessing: false,
            });
        })
    });


})(this);

