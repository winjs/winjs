// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Proxy Data Source

module DatasourceTestComponents {
    "use strict";
        var UI = WinJS.UI;
        var Promise = WinJS.Promise;

        // Private statics

        var errorDoesNotExist = function errorDoesNotExist () {
            return Promise.wrapError(new WinJS.ErrorFromName(UI.FetchError.doesNotExist.toString()));
        };

        var errorNoLongerMeaningful = function errorNoLongerMeaningful () {
            return Promise.wrapError(new WinJS.ErrorFromName(UI.EditError.noLongerMeaningful.toString()));
        };

        var ProxyDataAdapter = WinJS.Class.define(function (array, keyOf) {
            // Constructor

            this._array = array;
            this._keyOf = keyOf;

            // Map from keys to indices
            this._keyCache = {};
            this._cacheSize = 0;
        }, {
            // Public members

            // setNotificationHandler: not implemented

            // compareByIdentity: not set

            // itemSignature: not implemented

            // itemsFromStart: not implemented

            itemsFromEnd: function (count) {
                var len = this._array.length;
                return (
                    len === 0 ?
                        errorDoesNotExist() :
                        this.itemsFromIndex(len - 1, Math.min(count - 1, len - 1), 0)
                );
            },

            itemsFromKey: function (key, countBefore, countAfter) {
                var index = this._indexFromKey(key);
                return (
                    +index === index ?
                        this.itemsFromIndex(index, Math.min(countBefore, index), countAfter) :
                        errorDoesNotExist()
                );
            },

            itemsFromIndex: function (index, countBefore, countAfter) {
                var len = this._array.length;
                if (index >= len) {
                    return errorDoesNotExist();
                } else {
                    var first = index - countBefore,
                        last = Math.min(index + countAfter, len - 1),
                        items = new Array(last - first + 1);

                    for (var i = first; i <= last; i++) {
                        items[i - first] = this._item(i);
                    }

                    return Promise.wrap({
                        items: items,
                        offset: countBefore,
                        absoluteIndex: index,   // Return index because itemsFromKey shares this implementation
                        totalCount: len
                    });
                }
            },

            // itemsFromDescription: not implemented

            getCount: function () {
                return Promise.wrap(this._array.length);
            },

            // beginEdits: not implemented

            insertAtStart: function (key, data) {
                // key parameter is ignored, as keys are determined from data
                return this._insert(0, data);
            },

            insertBefore: function (key, data, nextKey, nextIndexHint) {
                // key parameter is ignored, as keys are determined from data
                return this._insert(this._indexFromKey(nextKey, nextIndexHint), data);
            },

            insertAfter: function (key, data, previousKey, previousIndexHint) {
                // key parameter is ignored, as keys are determined from data
                return this._insert(this._indexFromKey(previousKey, previousIndexHint) + 1, data);
            },

            insertAtEnd: function (key, data) {
                // key parameter is ignored, as keys are determined from data
                return this._insert(this._array.length, data);
            },

            change: function (key, newData, indexHint) {
                var index = this._indexFromKey(key, indexHint);

                if (+index !== index) {
                    return errorNoLongerMeaningful();
                }

                this._array[index] = newData;

                return Promise.wrap();
            },

            moveToStart: function (key, indexHint) {
                return this._move(key, this._indexFromKey(key, indexHint), 0);
            },

            moveBefore: function (key, nextKey, indexHint, nextIndexHint) {
                return this._move(key, this._indexFromKey(key, indexHint), this._indexFromKey(nextKey, nextIndexHint));
            },

            moveAfter: function (key, previousKey, indexHint, previousIndexHint) {
                return this._move(key, this._indexFromKey(key, indexHint), this._indexFromKey(previousKey, previousIndexHint) + 1);
            },

            moveToEnd: function (key, indexHint) {
                return this._move(key, this._indexFromKey(key, indexHint), this._array.length);
            },

            remove: function (key, indexHint) {
                var index = this._indexFromKey(key, indexHint);

                if (+index !== index) {
                    return errorNoLongerMeaningful();
                }

                this._array.splice(index, 1);

                this._removeKeyFromCache(key);
                this._adjustCachedIndices(index, this._array.length, -1);

                return Promise.wrap();
            },

            // endEdits: not implemented

            // Private members

            _keyAtIndex: function (index) {
                var key = this._keyOf(this._array[index]);

                // Opportunistically cache every key
                var cachedIndex = this._keyCache[key];
                if (+cachedIndex === cachedIndex) {
                    if (cachedIndex !== index) {
                        this._keyCache[key] = index;
                    }
                } else {
                    // See if the cache has grown too large
                    if (this._cacheSize > 1.1 * this._array.length) {
                        this._keyCache = {};
                        this._cacheSize = 1;
                    } else {
                        this._cacheSize++;
                    }

                    this._keyCache[key] = index;
                }

                return key;
            },

            _adjustCachedIndices: function (indexFirst, indexMax, delta) {
                for (var key in this._keyCache) {
                    var index = this._keyCache[key];

                    if (index >= indexFirst && index < indexMax) {
                        this._keyCache[key] = index + delta;
                    }
                }
            },

            _removeKeyFromCache: function (key) {
                var indexCached = this._keyCache[key];
                if (+indexCached === indexCached) {
                    delete this._keyCache[key];
                    this._cacheSize--;
                }
            },

            _indexFromKey: function (key, indexHint) {
                var len = this._array.length;

                var indexCached = this._keyCache[key];
                if (indexCached < len) {
                    if (this._keyAtIndex(indexCached) === key) {
                        return indexCached;
                    }

                    // Start looking from the cached index
                    indexHint = indexCached;
                }

                if (+indexHint !== indexHint) {
                    indexHint = 0;
                }

                for (var delta = 1, deltaMax = Math.max(indexHint, len - 1 - indexHint) ; delta <= deltaMax; delta++) {
                    var indexSearch;
                    if (delta <= indexHint) {
                        indexSearch = indexHint - delta;
                        if (this._keyAtIndex(indexSearch) === key) {
                            return indexSearch;
                        }
                    }
                    indexSearch = indexHint + delta;
                    if (indexSearch < len && this._keyAtIndex(indexSearch) === key) {
                        return indexSearch;
                    }
                }

                // The key no longer exists
                this._removeKeyFromCache(key);
                return null;
            },

            _item: function (index) {
                return {
                    key: this._keyAtIndex(index),
                    data: this._array[index]
                };
            },

            _insert: function (index, data) {
                if (+index !== index) {
                    return errorNoLongerMeaningful();
                }

                this._array.splice(index, 0, data);

                this._adjustCachedIndices(index + 1, this._array.length, 1);

                return Promise.wrap(this._item(index));
            },

            _move: function (key, indexFrom, indexTo) {
                if (+indexFrom !== indexFrom || +indexTo !== indexTo) {
                    return errorNoLongerMeaningful();
                }

                var data = this._array[indexFrom];

                this._array.splice(indexFrom, 1);

                if (indexFrom < indexTo) {
                    indexTo--;
                }

                this._array.splice(indexTo, 0, data);

                if (indexFrom < indexTo) {
                    this._adjustCachedIndices(indexFrom, indexTo, -1);
                } else if (indexFrom > indexTo) {
                    this._adjustCachedIndices(indexTo + 1, indexFrom + 1, 1);
                }

                var indexCached = this._keyCache[key];
                if (+indexCached !== indexCached) {
                    this._cacheSize++;
                }
                this._keyCache[key] = indexTo;

                return Promise.wrap();
            }
        });

    // Public definition


    /// <summary>
    /// A data source that wraps a given array.  The array may be manipulated directly, in which case plausible change
    /// notifications will be generated when an inconsistency is detected or the data source is invalidated.
    /// </summary>
    /// <param name="array" type="Array">
    /// The array to wrap.
    /// </param>
    /// <param name="keyOf" type="Function">
    /// A callback that returns a unique and invariant string to serve as the key for the array element passed to it.
    /// </param>
    export var ProxyDataSource = WinJS.Class.derive(UI.VirtualizedDataSource, function (array, keyOf) {
        this._baseDataSourceConstructor(new ProxyDataAdapter(array, keyOf));
    });

       

           
      

}

