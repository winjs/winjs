// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function selectionManagerInit(global, WinJS, undefined) {
    "use strict";

    var utilities = WinJS.Utilities,
        Promise = WinJS.Promise;

    WinJS.Namespace.define("WinJS.UI", {
        _ItemSet: WinJS.Namespace._lazy(function () {
            var _ItemSet = WinJS.Class.define(function _ItemSet_ctor(listView, ranges, count) {
                this._listView = listView;
                this._ranges = ranges;
                this._itemsCount = count;
            });
            _ItemSet.prototype = {
                getRanges: function () {
                    var ranges = [];
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        ranges.push({
                            firstIndex: range.firstIndex,
                            lastIndex: range.lastIndex,
                            firstKey: range.firstKey,
                            lastKey: range.lastKey
                        });
                    }
                    return ranges;
                },

                getItems: function () {
                    return WinJS.UI.getItemsFromRanges(this._listView._itemsManager.dataSource, this._ranges);
                },

                isEverything: function () {
                    return this.count() === this._itemsCount;
                },

                count: function () {
                    var count = 0;
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        count += range.lastIndex - range.firstIndex + 1;
                    }
                    return count;
                },

                getIndices: function () {
                    var indices = [];
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        for (var n = range.firstIndex; n <= range.lastIndex; n++) {
                            indices.push(n);
                        }
                    }
                    return indices;
                }
            };
            return _ItemSet;
        }),

        getItemsFromRanges: function (dataSource, ranges) {
            var listBinding = dataSource.createListBinding(),
                promises = [];

            function getIndices() {
                var indices = [];
                for (var i = 0, len = ranges.length; i < len; i++) {
                    var range = ranges[i];
                    for (var j = range.firstIndex; j <= range.lastIndex; j++) {
                        indices.push(j);
                    }
                }
                return Promise.wrap(indices);
            }

            return getIndices().then(function (indices) {
                for (var i = 0; i < indices.length; i++) {
                    promises.push(listBinding.fromIndex(indices[i]));
                }

                return WinJS.Promise.join(promises).then(function (items) {
                    listBinding.release();
                    return items;
                });
            });
        },

        _Selection: WinJS.Namespace._lazy(function () {
            function isEverythingRange(ranges) {
                return ranges && ranges.firstIndex === 0 && ranges.lastIndex === Number.MAX_VALUE;
            }

            return WinJS.Class.derive(WinJS.UI._ItemSet, function (listView, indexesAndRanges) {
                this._listView = listView;
                this._itemsCount = -1;
                this._ranges = [];
                if (indexesAndRanges) {
                    this.set(indexesAndRanges);
                }
            }, {
                clear: function () {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.clear">
                    /// <summary locid="WinJS.UI._Selection.prototype.clear">
                    /// Clears the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.clear_returnValue">
                    /// A Promise that is fulfilled when the clear operation completes.  
                    /// </returns>
                    /// </signature>

                    this._releaseRanges(this._ranges);
                    this._ranges = [];
                    return Promise.wrap();
                },

                set: function (items) {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.set">
                    /// <summary locid="WinJS.UI._Selection.prototype.set">
                    /// Clears the current selection and replaces it with the specified items. 
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._Selection.prototype.set_items">
                    /// The indexes or keys of the items that make up the selection. 
                    /// You can provide different types of objects for the items parameter: 
                    /// you can specify an index, a key, or a range of indexes. 
                    /// It can also be an array that contains one or more of these objects.  
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.set_returnValue">
                    /// A Promise that is fulfilled when the operation completes. 
                    /// </returns>
                    /// </signature>

                    // A range with lastIndex set to Number.MAX_VALUE used to mean selectAll. Passing such range to set was equivalent to selectAll. This code preserves this behavior.
                    if (!isEverythingRange(items)) {
                        this._releaseRanges(this._ranges);
                        this._ranges = [];

                        var that = this;
                        return this._execute("_set", items).then(function () {
                            that._ranges.sort(function (left, right) {
                                return left.firstIndex - right.firstIndex;
                            });
                            return that._ensureKeys();
                        }).then(function () {
                            return that._ensureCount();
                        });
                    } else {
                        return this.selectAll();
                    }
                },

                add: function (items) {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.add">
                    /// <summary locid="WinJS.UI._Selection.prototype.add">
                    /// Adds one or more items to the selection. 
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._Selection.prototype.add_items">
                    /// The indexes or keys of the items to add. 
                    /// You can provide different types of objects for the items parameter: 
                    /// you can specify an index, a key, or a range of indexes. 
                    /// It can also be an array that contains one or more of these objects. 
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.add_returnValue">
                    /// A Promise that is fulfilled when the operation completes. 
                    /// </returns>
                    /// </signature>

                    if (!isEverythingRange(items)) {
                        var that = this;
                        return this._execute("_add", items).then(function () {
                            return that._ensureKeys();
                        }).then(function () {
                            return that._ensureCount();
                        });
                    } else {
                        return this.selectAll();
                    }
                },

                remove: function (items) {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.remove">
                    /// <summary locid="WinJS.UI._Selection.prototype.remove">
                    /// Removes the specified items from the selection. 
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._Selection.prototype.remove_items">
                    /// The indexes or keys of the items to remove. You can provide different types of objects for the items parameter: 
                    /// you can specify an index, a key, or a range of indexes. 
                    /// It can also be an array that contains one or more of these objects.  
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.remove_returnValue">
                    /// A Promise that is fulfilled when the operation completes. 
                    /// </returns>
                    /// </signature>

                    var that = this;
                    return this._execute("_remove", items).then(function () {
                        return that._ensureKeys();
                    });
                },

                selectAll: function () {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.selectAll">
                    /// <summary locid="WinJS.UI._Selection.prototype.selectAll">
                    /// Adds all the items in the ListView to the selection. 
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.selectAll_returnValue">
                    /// A Promise that is fulfilled when the operation completes.  
                    /// </returns>
                    /// </signature>

                    var that = this;
                    return that._ensureCount().then(function () {
                        if (that._itemsCount) {
                            var range = {
                                firstIndex: 0,
                                lastIndex: that._itemsCount - 1,
                            };
                            that._retainRange(range);
                            that._releaseRanges(that._ranges);
                            that._ranges = [range];
                            return that._ensureKeys();
                        }
                    });
                },

                /*#DBG
                _assertValid: function () {
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        _ASSERT(range.firstIndex <= range.lastIndex);
                        _ASSERT(!i || this._ranges[i - 1].lastIndex < range.firstIndex);
                    }
                    return true;
                },
                #DBG*/

                _execute: function (operation, items) {
                    var that = this,
                        keysSupported = !!that._getListBinding().fromKey,
                        array = Array.isArray(items) ? items : [items],
                        promises = [Promise.wrap()];

                    function toRange(type, first, last) {
                        var retVal = {};
                        retVal["first" + type] = first;
                        retVal["last" + type] = last;
                        return retVal;
                    }

                    function handleKeys(range) {
                        var binding = that._getListBinding();

                        var promise = Promise.join([binding.fromKey(range.firstKey), binding.fromKey(range.lastKey)]).then(function (items) {
                            if (items[0] && items[1]) {
                                range.firstIndex = items[0].index;
                                range.lastIndex = items[1].index;
                                that[operation](range);
                            }
                            return range;
                        });
                        promises.push(promise);
                    }

                    for (var i = 0, len = array.length; i < len; i++) {
                        var item = array[i];
                        if (typeof item === "number") {
                            this[operation](toRange("Index", item, item));
                        } else if (item) {
                            if (keysSupported && item.key !== undefined) {
                                handleKeys(toRange("Key", item.key, item.key));
                            } else if (keysSupported && item.firstKey !== undefined && item.lastKey !== undefined) {
                                handleKeys(toRange("Key", item.firstKey, item.lastKey));
                            } else if (item.index !== undefined && typeof item.index === "number") {
                                this[operation](toRange("Index", item.index, item.index));
                            } else if (item.firstIndex !== undefined && item.lastIndex !== undefined &&
                                    typeof item.firstIndex === "number" && typeof item.lastIndex === "number") {
                                this[operation](toRange("Index", item.firstIndex, item.lastIndex));
                            }
                        }
                    }

                    return Promise.join(promises);
                },

                _set: function (range) {
                    this._retainRange(range);
                    this._ranges.push(range);
                },

                _add: function (newRange) {
                    var that = this,
                        prev = null,
                        range,
                        inserted;

                    var merge = function (left, right) {
                        if (right.lastIndex > left.lastIndex) {
                            left.lastIndex = right.lastIndex;
                            left.lastKey = right.lastKey;
                            if (left.lastPromise) {
                                left.lastPromise.release();
                            }
                            left.lastPromise = that._getListBinding().fromIndex(left.lastIndex).retain();
                        }
                    }

                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        range = this._ranges[i];
                        if (newRange.firstIndex < range.firstIndex) {
                            var mergeWithPrev = prev && newRange.firstIndex < (prev.lastIndex + 1);
                            if (mergeWithPrev) {
                                inserted = i - 1;
                                merge(prev, newRange);
                            } else {
                                this._insertRange(i, newRange);
                                inserted = i;
                            }
                            break;
                        } else if (newRange.firstIndex === range.firstIndex) {
                            merge(range, newRange);
                            inserted = i;
                            break;
                        }
                        prev = range;
                    }

                    if (inserted === undefined) {
                        var last = this._ranges.length ? this._ranges[this._ranges.length - 1] : null,
                            mergeWithLast = last && newRange.firstIndex < (last.lastIndex + 1);
                        if (mergeWithLast) {
                            merge(last, newRange);
                        } else {
                            this._retainRange(newRange);
                            this._ranges.push(newRange);
                        }
                    } else {
                        prev = null;
                        for (i = inserted + 1, len = this._ranges.length; i < len; i++) {
                            range = this._ranges[i];
                            if (newRange.lastIndex < range.firstIndex) {
                                mergeWithPrev = prev && prev.lastIndex > newRange.lastIndex;
                                if (mergeWithPrev) {
                                    merge(this._ranges[inserted], prev);
                                }
                                this._removeRanges(inserted + 1, i - inserted - 1);
                                break;
                            } else if (newRange.lastIndex === range.firstIndex) {
                                merge(this._ranges[inserted], range);
                                this._removeRanges(inserted + 1, i - inserted);
                                break;
                            }
                            prev = range;
                        }
                        if (i >= len) {
                            merge(this._ranges[inserted], this._ranges[len - 1]);
                            this._removeRanges(inserted + 1, len - inserted - 1);
                        }
                    }
                },

                _remove: function (toRemove) {
                    var that = this;

                    function retainPromise(index) {
                        return that._getListBinding().fromIndex(index).retain();
                    }

                    // This method is called when a range needs to be unselected.  It is inspecting every range in the current selection comparing 
                    // it to the range which is being unselected and it is building an array of new selected ranges
                    var ranges = [];
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        if (range.lastIndex < toRemove.firstIndex || range.firstIndex > toRemove.lastIndex) {
                            // No overlap with the unselected range
                            ranges.push(range);
                        } else if (range.firstIndex < toRemove.firstIndex && range.lastIndex >= toRemove.firstIndex && range.lastIndex <= toRemove.lastIndex) {
                            // The end of this range is being unselected
                            ranges.push({
                                firstIndex: range.firstIndex,
                                firstKey: range.firstKey,
                                firstPromise: range.firstPromise,
                                lastIndex: toRemove.firstIndex - 1,
                                lastPromise: retainPromise(toRemove.firstIndex - 1)
                            });
                            range.lastPromise.release();
                        } else if (range.lastIndex > toRemove.lastIndex && range.firstIndex >= toRemove.firstIndex && range.firstIndex <= toRemove.lastIndex) {
                            // The beginning of this range is being unselected
                            ranges.push({
                                firstIndex: toRemove.lastIndex + 1,
                                firstPromise: retainPromise(toRemove.lastIndex + 1),
                                lastIndex: range.lastIndex,
                                lastKey: range.lastKey,
                                lastPromise: range.lastPromise
                            });
                            range.firstPromise.release();
                        } else if (range.firstIndex < toRemove.firstIndex && range.lastIndex > toRemove.lastIndex) {
                            // The middle part of this range is being unselected
                            ranges.push({
                                firstIndex: range.firstIndex,
                                firstKey: range.firstKey,
                                firstPromise: range.firstPromise,
                                lastIndex: toRemove.firstIndex - 1,
                                lastPromise: retainPromise(toRemove.firstIndex - 1),
                            });
                            ranges.push({
                                firstIndex: toRemove.lastIndex + 1,
                                firstPromise: retainPromise(toRemove.lastIndex + 1),
                                lastIndex: range.lastIndex,
                                lastKey: range.lastKey,
                                lastPromise: range.lastPromise
                            });
                        } else {
                            // The whole range is being unselected
                            //#DBG _ASSERT(range.firstIndex >= toRemove.firstIndex && range.lastIndex <= toRemove.lastIndex);
                            range.firstPromise.release();
                            range.lastPromise.release();
                        }
                    }
                    this._ranges = ranges;
                },

                _ensureKeys: function () {
                    var promises = [Promise.wrap()];
                    var that = this;

                    var ensureKey = function (which, range) {
                        var keyProperty = which + "Key";

                        if (!range[keyProperty]) {
                            var promise = range[which + "Promise"];
                            promise.then(function (item) {
                                if (item) {
                                    range[keyProperty] = item.key;
                                }
                            });
                            return promise;
                        } else {
                            return Promise.wrap();
                        }
                    }

                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        promises.push(ensureKey("first", range));
                        promises.push(ensureKey("last", range));
                    }

                    Promise.join(promises).then(function () {
                        that._ranges = that._ranges.filter(function (range) {
                            return range.firstKey && range.lastKey;
                        });
                    });
                    return Promise.join(promises);
                },

                _mergeRanges: function (target, source) {
                    //#DBG _ASSERT(!target.lastPromise && !source.lastPromise);
                    target.lastIndex = source.lastIndex;
                    target.lastKey = source.lastKey;
                },

                _isIncluded: function (index) {
                    if (this.isEverything()) {
                        return true;
                    } else {
                        for (var i = 0, len = this._ranges.length; i < len; i++) {
                            var range = this._ranges[i];
                            if (range.firstIndex <= index && index <= range.lastIndex) {
                                return true;
                            }
                        }
                        return false;
                    }
                },

                _ensureCount: function () {
                    var that = this;
                    return this._listView._itemsCount().then(function (count) {
                        that._itemsCount = count;
                    });
                },

                _insertRange: function (index, newRange) {
                    this._retainRange(newRange);
                    this._ranges.splice(index, 0, newRange);
                },

                _removeRanges: function (index, howMany) {
                    for (var i = 0; i < howMany; i++) {
                        this._releaseRange(this._ranges[index + i]);
                    }
                    this._ranges.splice(index, howMany);
                },

                _retainRange: function (range) {
                    if (!range.firstPromise) {
                        range.firstPromise = this._getListBinding().fromIndex(range.firstIndex).retain();
                    }
                    if (!range.lastPromise) {
                        range.lastPromise = this._getListBinding().fromIndex(range.lastIndex).retain();
                    }
                },

                _retainRanges: function () {
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        this._retainRange(this._ranges[i]);
                    }
                },

                _releaseRange: function (range) {
                    range.firstPromise.release();
                    range.lastPromise.release();
                },

                _releaseRanges: function (ranges) {
                    for (var i = 0, len = ranges.length; i < len; ++i) {
                        this._releaseRange(ranges[i]);
                    }
                },

                _getListBinding: function () {
                    return this._listView._itemsManager._listBinding;
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        // This component is responsible for holding selection state
        _SelectionManager: WinJS.Namespace._lazy(function () {
            var _SelectionManager = function (listView) {
                this._listView = listView;
                this._selected = new WinJS.UI._Selection(this._listView);
                // Don't rename this member. Some apps reference it.
                this._pivot = WinJS.UI._INVALID_INDEX;
                this._focused = { type: WinJS.UI.ObjectType.item, index: 0 };
                this._pendingChange = Promise.wrap();
            };
            _SelectionManager.prototype = {
                count: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.count">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.count">
                    /// Returns the number of items in the selection. 
                    /// </summary>
                    /// <returns type="Number" locid="WinJS.UI._SelectionManager.prototype.count_returnValue">
                    /// The number of items in the selection.  
                    /// </returns>
                    /// </signature>
                    return this._selected.count();
                },

                getIndices: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.getIndices">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.getIndices">
                    /// Returns a list of the indexes for the items in the selection.
                    /// </summary>
                    /// <returns type="Array" locid="WinJS.UI._SelectionManager.prototype.getIndices_returnValue">
                    /// The list of indexes for the items in the selection as an array of Number objects.  
                    /// </returns>
                    /// </signature>
                    return this._selected.getIndices();
                },

                getItems: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.getItems">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.getItems">
                    /// Returns an array that contains the items in the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.getItems_returnValue">
                    /// A Promise that contains an array of the requested IItem objects. 
                    /// </returns>
                    /// </signature>

                    return this._selected.getItems();
                },

                getRanges: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.getRanges">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.getRanges">
                    /// Gets an array of the index ranges for the selected items.
                    /// </summary>
                    /// <returns type="Array" locid="WinJS.UI._SelectionManager.prototype.getRanges_returnValue">
                    /// An array that contains an ISelectionRange object for each index range in the selection. 
                    /// </returns>
                    /// </signature>
                    return this._selected.getRanges();
                },

                isEverything: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.isEverything">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.isEverything">
                    /// Returns a value that indicates whether the selection contains every item in the data source.
                    /// </summary>
                    /// <returns type="Boolean" locid="WinJS.UI._SelectionManager.prototype.isEverything_returnValue">
                    /// true if the selection contains every item in the data source; otherwise, false. 
                    /// </returns>
                    /// </signature>
                    return this._selected.isEverything();
                },

                set: function (items) {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.set">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.set">
                    /// Clears the current selection and replaces it with the specified items. 
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._SelectionManager.prototype.set_items">
                    /// The indexes or keys of the items that make up the selection. 
                    /// You can provide different types of objects for the items parameter: 
                    /// you can specify an index, a key, or a range of indexes. 
                    /// It can also be an array that contains one or more of these objects.  
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.set_returnValue">
                    /// A Promise that is fulfilled when the operation completes. 
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new WinJS._Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = new WinJS.UI._Selection(that._listView);
                        return newSelection.set(items).then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return WinJS.Promise.wrapError(error);
                            }
                        );
                    });
                },

                clear: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.clear">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.clear">
                    /// Clears the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.clear_returnValue">
                    /// A Promise that is fulfilled when the clear operation completes.  
                    /// </returns>
                    /// </signature>

                    var that = this,
                        signal = new WinJS._Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = new WinJS.UI._Selection(that._listView);
                        return newSelection.clear().then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return WinJS.Promise.wrapError(error);
                            }
                        );
                    });
                },

                add: function (items) {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.add">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.add">
                    /// Adds one or more items to the selection. 
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._SelectionManager.prototype.add_items">
                    /// The indexes or keys of the items to add. 
                    /// You can provide different types of objects for the items parameter: 
                    /// you can specify an index, a key, or a range of indexes. 
                    /// It can also be an array that contains one or more of these objects. 
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.add_returnValue">
                    /// A Promise that is fulfilled when the operation completes. 
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new WinJS._Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = that._cloneSelection();
                        return newSelection.add(items).then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return WinJS.Promise.wrapError(error);
                            }
                        );
                    });
                },

                remove: function (items) {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.remove">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.remove">
                    /// Removes the specified items from the selection. 
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._SelectionManager.prototype.remove_items">
                    /// The indexes or keys of the items to remove. You can provide different types of objects for the items parameter: 
                    /// you can specify an index, a key, or a range of indexes. 
                    /// It can also be an array that contains one or more of these objects.  
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.remove_returnValue">
                    /// A Promise that is fulfilled when the operation completes. 
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new WinJS._Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = that._cloneSelection();
                        return newSelection.remove(items).then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return WinJS.Promise.wrapError(error);
                            }
                        );
                    });
                },

                selectAll: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.selectAll">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.selectAll">
                    /// Adds all the items in the ListView to the selection. 
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.selectAll_returnValue">
                    /// A Promise that is fulfilled when the operation completes.  
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new WinJS._Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = new WinJS.UI._Selection(that._listView);
                        return newSelection.selectAll().then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return WinJS.Promise.wrapError(error);
                            }
                        );
                    });
                },

                _synchronize: function (signal) {
                    var that = this;
                    return this._listView._versionManager.unlocked.then(function () {
                        var currentPendingChange = that._pendingChange;
                        that._pendingChange = WinJS.Promise.join([currentPendingChange, signal.promise]).then(function () { });
                        return currentPendingChange;
                    });
                },

                _reset: function () {
                    this._pivot = WinJS.UI._INVALID_INDEX;
                    this._setFocused({ type: WinJS.UI.ObjectType.item, index: 0 }, this._keyboardFocused());
                    this._pendingChange.cancel();
                    this._pendingChange = Promise.wrap();
                    this._selected.clear();
                    this._selected = new WinJS.UI._Selection(this._listView);
                },

                _dispose: function () {
                    this._selected.clear();
                    this._selected = null;
                    this._listView = null;
                },

                _set: function (newSelection) {
                    var that = this;
                    return this._fireSelectionChanging(newSelection).then(function (approved) {
                        if (approved) {
                            that._selected.clear();
                            that._selected = newSelection;
                            that._listView._updateSelection();
                            that._fireSelectionChanged();
                        } else {
                            newSelection.clear();
                        }
                        return approved;
                    });
                },

                _fireSelectionChanging: function (newSelection) {
                    var eventObject = document.createEvent("CustomEvent"),
                        newSelectionUpdated = Promise.wrap();

                    eventObject.initCustomEvent("selectionchanging", true, true, {
                        newSelection: newSelection,
                        preventTapBehavior: function () {
                        },
                        setPromise: function (promise) {
                            /// <signature helpKeyword="WinJS.UI.SelectionManager.selectionchanging.setPromise">
                            /// <summary locid="WinJS.UI.SelectionManager.selectionchanging.setPromise">
                            /// Used to inform the ListView that asynchronous work is being performed, and that this
                            /// event handler should not be considered complete until the promise completes. 
                            /// </summary>
                            /// <param name="promise" type="WinJS.Promise" locid="WinJS.UI.SelectionManager.selectionchanging.setPromise_p:promise">
                            /// The promise to wait for.
                            /// </param>
                            /// </signature>

                            newSelectionUpdated = promise;
                        }
                    });

                    var approved = this._listView._element.dispatchEvent(eventObject);
                    return newSelectionUpdated.then(function () {
                        return approved;
                    });
                },

                _fireSelectionChanged: function () {
                    var eventObject = document.createEvent("CustomEvent");
                    eventObject.initCustomEvent("selectionchanged", true, false, null);
                    this._listView._element.dispatchEvent(eventObject);
                },

                _getFocused: function () {
                    return { type: this._focused.type, index: this._focused.index };
                },

                _setFocused: function (entity, keyboardFocused) {
                    this._focused = { type: entity.type, index: entity.index };
                    this._focusedByKeyboard = keyboardFocused;
                },

                _keyboardFocused: function () {
                    return this._focusedByKeyboard;
                },

                _updateCount: function (count) {
                    this._selected._itemsCount = count;
                },

                _isIncluded: function (index) {
                    return this._selected._isIncluded(index);
                },

                _cloneSelection: function () {
                    var newSelection = new WinJS.UI._Selection(this._listView);
                    newSelection._ranges = this._selected.getRanges();
                    newSelection._itemsCount = this._selected._itemsCount;
                    newSelection._retainRanges();
                    return newSelection;
                }
            };
            _SelectionManager.supportedForProcessing = false;
            return _SelectionManager;
        })
    });

})(this, WinJS);
