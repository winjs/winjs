/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

﻿// Group Data Source

(function groupDataSourceInit() {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {

        _GroupDataSource: WinJS.Namespace._lazy(function () {
            var UI = WinJS.UI;
            var Promise = WinJS.Promise,
                Scheduler = WinJS.Utilities.Scheduler;

            // Private statics

            function errorDoesNotExist() {
                return new WinJS.ErrorFromName(UI.FetchError.doesNotExist);
            }

            var batchSizeDefault = 101;

            function groupReady(group) {
                return group && group.firstReached && group.lastReached;
            }

            var ListNotificationHandler = WinJS.Class.define(function ListNotificationHandler_ctor(groupDataAdapter) {
                // Constructor

                this._groupDataAdapter = groupDataAdapter;
            }, {
                // Public methods

                beginNotifications: function () {
                },

                // itemAvailable: not implemented

                inserted: function (itemPromise, previousHandle, nextHandle) {
                    this._groupDataAdapter._inserted(itemPromise, previousHandle, nextHandle);
                },

                changed: function (newItem, oldItem) {
                    this._groupDataAdapter._changed(newItem, oldItem);
                },

                moved: function (itemPromise, previousHandle, nextHandle) {
                    this._groupDataAdapter._moved(itemPromise, previousHandle, nextHandle);
                },

                removed: function (handle, mirage) {
                    this._groupDataAdapter._removed(handle, mirage);
                },

                countChanged: function (newCount, oldCount) {
                    if (newCount === 0 && oldCount !== 0) {
                        this._groupDataAdapter.invalidateGroups();
                    }
                },

                indexChanged: function (handle, newIndex, oldIndex) {
                    this._groupDataAdapter._indexChanged(handle, newIndex, oldIndex);
                },

                endNotifications: function () {
                    this._groupDataAdapter._endNotifications();
                },

                reload: function () {
                    this._groupDataAdapter._reload();
                }
            }, {
                supportedForProcessing: false,
            });

            var GroupDataAdapter = WinJS.Class.define(function GroupDataAdapater_ctor(listDataSource, groupKey, groupData, options) {
                // Constructor

                this._listBinding = listDataSource.createListBinding(new ListNotificationHandler(this));

                this._groupKey = groupKey;
                this._groupData = groupData;

                // _initializeState clears the count, so call this before processing the groupCountEstimate option
                this._initializeState();

                this._batchSize = batchSizeDefault;
                this._count = null;

                if (options) {
                    if (typeof options.groupCountEstimate === "number") {
                        this._count = (options.groupCountEstimate < 0 ? null : Math.max(options.groupCountEstimate, 1));
                    }
                    if (typeof options.batchSize === "number") {
                        this._batchSize = options.batchSize + 1;
                    }
                }

                if (this._listBinding.last) {
                    this.itemsFromEnd = function (count) {
                        var that = this;
                        return this._fetchItems(
                            // getGroup
                            function () {
                                return that._lastGroup;
                            },

                            // mayExist
                            function (failed) {
                                if (failed) {
                                    return false;
                                }
                                var count = that._count;
                                if (+count !== count) {
                                    return true;
                                }
                                if (count > 0) {
                                    return true;
                                }
                            },

                            // fetchInitialBatch
                            function () {
                                that._fetchBatch(that._listBinding.last(), that._batchSize - 1, 0);
                            },

                            count - 1, 0
                        );
                    };
                }
            }, {
                // Public members

                setNotificationHandler: function (notificationHandler) {
                    this._listDataNotificationHandler = notificationHandler;
                },

                // The ListDataSource should always compare these items by identity; in rare cases, it will do some unnecessary
                // rerendering, but at least fetching will not stringify items we already know to be valid and that we know
                // have not changed.
                compareByIdentity: true,

                // itemsFromStart: not implemented

                // itemsFromEnd: implemented in constructor

                itemsFromKey: function (key, countBefore, countAfter, hints) {
                    var that = this;
                    return this._fetchItems(
                        // getGroup
                        function () {
                            return that._keyMap[key];
                        },

                        // mayExist
                        function (failed) {
                            var lastGroup = that._lastGroup;
                            if (!lastGroup) {
                                return true;
                            }
                            if (+lastGroup.index !== lastGroup.index) {
                                return true;
                            }
                        },

                        // fetchInitialBatch
                        function () {
                            hints = hints || {};
                            var itemPromise = (
                                typeof hints.groupMemberKey === "string" && that._listBinding.fromKey ?
                                    that._listBinding.fromKey(hints.groupMemberKey) :
                                typeof hints.groupMemberIndex === "number" && that._listBinding.fromIndex ?
                                    that._listBinding.fromIndex(hints.groupMemberIndex) :
                                hints.groupMemberDescription !== undefined && that._listBinding.fromDescription ?
                                    that._listBinding.fromDescription(hints.groupMemberDescription) :
                                    that._listBinding.first()
                            );

                            var fetchBefore = Math.floor(0.5 * (that._batchSize - 1));
                            that._fetchBatch(itemPromise, fetchBefore, that._batchSize - 1 - fetchBefore);
                        },

                        countBefore, countAfter
                    );
                },

                itemsFromIndex: function (index, countBefore, countAfter) {
                    var that = this;
                    return this._fetchItems(
                        // getGroup
                        function () {
                            return that._indexMap[index];
                        },

                        // mayExist
                        function (failed) {
                            var lastGroup = that._lastGroup;
                            if (!lastGroup) {
                                return true;
                            }
                            if (+lastGroup.index !== lastGroup.index) {
                                return true;
                            }
                            if (index <= lastGroup.index) {
                                return true;
                            }
                        },

                        // fetchInitialBatch
                        function () {
                            that._fetchNextIndex();
                        },

                        countBefore, countAfter
                    );
                },

                // itemsFromDescription: not implemented

                getCount: function () {
                    if (this._lastGroup && typeof this._lastGroup.index === "number") {
                        //#DBG _ASSERT(this._count === this._lastGroup.index);

                        return Promise.wrap(this._count);
                    } else {
                        // Even if there's a current estimate for _count, consider this call to be a request to determine the true
                        // count.

                        var that = this;
                        var countPromise = new Promise(function (complete) {
                            var fetch = {
                                initialBatch: function () {
                                    that._fetchNextIndex();
                                },
                                getGroup: function () { return null; },
                                countBefore: 0,
                                countAfter: 0,
                                complete: function (failed) {
                                    if (failed) {
                                        that._count = 0;
                                    }

                                    var count = that._count;
                                    if (typeof count === "number") {
                                        complete(count);
                                        return true;
                                    } else {
                                        return false;
                                    }
                                }
                            };

                            that._fetchQueue.push(fetch);

                            if (!that._itemBatch) {
                                //#DBG _ASSERT(that._fetchQueue[0] === fetch);
                                that._continueFetch(fetch);
                            }
                        });

                        return (typeof this._count === "number" ? Promise.wrap(this._count) : countPromise);
                    }
                },

                invalidateGroups: function () {
                    this._beginRefresh();
                    this._initializeState();
                },

                // Editing methods not implemented

                // Private members

                _initializeState: function () {
                    this._count = null;
                    this._indexMax = null;

                    this._keyMap = {};
                    this._indexMap = {};
                    this._lastGroup = null;
                    this._handleMap = {};

                    this._fetchQueue = [];

                    this._itemBatch = null;
                    this._itemsToFetch = 0;

                    this._indicesChanged = false;
                },

                _releaseItem: function (item) {
                    delete this._handleMap[item.handle];
                    this._listBinding.releaseItem(item);
                },

                _processBatch: function () {
                    var previousItem = null,
                        previousGroup = null,
                        firstItemInGroup = null,
                        itemsSinceStart = 0,
                        failed = true;
                    for (var i = 0; i < this._batchSize; i++) {
                        var item = this._itemBatch[i],
                            groupKey = (item ? this._groupKey(item) : null);

                        if (item) {
                            failed = false;
                        }

                        if (previousGroup && groupKey !== null && groupKey === previousGroup.key) {
                            // This item is in the same group as the last item.  The only thing to do is advance the group's
                            // lastItem if this is definitely the last item that has been processed for the group.
                            itemsSinceStart++;
                            if (previousGroup.lastItem === previousItem) {
                                if (previousGroup.lastItem.handle !== previousGroup.firstItem.handle) {
                                    this._releaseItem(previousGroup.lastItem);
                                }
                                previousGroup.lastItem = item;
                                this._handleMap[item.handle] = previousGroup;

                                previousGroup.size++;
                            } else if (previousGroup.firstItem === item) {
                                if (previousGroup.firstItem.handle !== previousGroup.lastItem.handle) {
                                    this._releaseItem(previousGroup.firstItem);
                                }
                                previousGroup.firstItem = firstItemInGroup;
                                this._handleMap[firstItemInGroup.handle] = previousGroup;

                                previousGroup.size += itemsSinceStart;
                            }
                        } else {
                            var index = null;

                            if (previousGroup) {
                                previousGroup.lastReached = true;

                                if (typeof previousGroup.index === "number") {
                                    index = previousGroup.index + 1;
                                }
                            }

                            if (item) {
                                // See if the current group has already been processed
                                var group = this._keyMap[groupKey];

                                if (!group) {
                                    group = {
                                        key: groupKey,
                                        data: this._groupData(item),
                                        firstItem: item,
                                        lastItem: item,
                                        size: 1
                                    };
                                    this._keyMap[group.key] = group;
                                    this._handleMap[item.handle] = group;
                                }

                                if (i > 0) {
                                    group.firstReached = true;

                                    if (!previousGroup) {
                                        index = 0;
                                    }
                                }

                                if (typeof group.index !== "number" && typeof index === "number") {
                                    // Set the indices of as many groups as possible
                                    for (var group2 = group; group2; group2 = this._nextGroup(group2)) {
                                        //#DBG _ASSERT(typeof this._indexMap[index] !== "number");
                                        group2.index = index;
                                        this._indexMap[index] = group2;

                                        index++;
                                    }

                                    this._indexMax = index;
                                    if (typeof this._count === "number" && !this._lastGroup && this._count <= this._indexMax) {
                                        this._count = this._indexMax + 1;
                                    }
                                }

                                firstItemInGroup = item;
                                itemsSinceStart = 0;

                                previousGroup = group;
                            } else {
                                if (previousGroup) {
                                    this._lastGroup = previousGroup;

                                    if (typeof previousGroup.index === "number") {
                                        this._count = (previousGroup.index + 1);
                                    }

                                    // Force a client refresh (which should be fast) to ensure that a countChanged notification is
                                    // sent.
                                    this._listDataNotificationHandler.invalidateAll();

                                    previousGroup = null;
                                }
                            }
                        }

                        previousItem = item;
                    }

                    // See how many fetches have now completed
                    var fetch;
                    for (fetch = this._fetchQueue[0]; fetch && fetch.complete(failed) ; fetch = this._fetchQueue[0]) {
                        this._fetchQueue.splice(0, 1);
                    }

                    // Continue work on the next fetch, if any
                    if (fetch) {
                        var that = this;
                        // Avoid reentering _processBatch
                        Scheduler.schedule(function GroupDataSource_async_processBatch() {
                            that._continueFetch(fetch);
                        }, Scheduler.Priority.normal, null, "WinJS.UI._GroupDataSource._continueFetch");
                    } else {
                        this._itemBatch = null;
                    }
                },

                _processPromise: function (itemPromise, batchIndex) {
                    itemPromise.retain();

                    this._itemBatch[batchIndex] = itemPromise;

                    var that = this;
                    itemPromise.then(function (item) {
                        that._itemBatch[batchIndex] = item;
                        if (--that._itemsToFetch === 0) {
                            that._processBatch();
                        }
                    });
                },

                _fetchBatch: function (itemPromise, countBefore, countAfter) {
                    //#DBG _ASSERT(countBefore + 1 + countAfter === this._batchSize);
                    this._itemBatch = new Array(this._batchSize);
                    this._itemsToFetch = this._batchSize;

                    this._processPromise(itemPromise, countBefore);

                    var batchIndex;

                    this._listBinding.jumpToItem(itemPromise);
                    for (batchIndex = countBefore - 1; batchIndex >= 0; batchIndex--) {
                        this._processPromise(this._listBinding.previous(), batchIndex);
                    }

                    this._listBinding.jumpToItem(itemPromise);
                    for (batchIndex = countBefore + 1; batchIndex < this._batchSize; batchIndex++) {
                        this._processPromise(this._listBinding.next(), batchIndex);
                    }
                },

                _fetchAdjacent: function (item, after) {
                    // Batches overlap by one so group boundaries always fall within at least one batch
                    this._fetchBatch(
                        (this._listBinding.fromKey ? this._listBinding.fromKey(item.key) : this._listBinding.fromIndex(item.index)),
                        (after ? 0 : this._batchSize - 1),
                        (after ? this._batchSize - 1 : 0)
                    );
                },

                _fetchNextIndex: function () {
                    var groupHighestIndex = this._indexMap[this._indexMax - 1];
                    if (groupHighestIndex) {
                        // We've already fetched some of the first items, so continue where we left off
                        //#DBG _ASSERT(groupHighestIndex.firstReached);
                        this._fetchAdjacent(groupHighestIndex.lastItem, true);
                    } else {
                        // Fetch one non-existent item before the list so _processBatch knows the start was reached
                        this._fetchBatch(this._listBinding.first(), 1, this._batchSize - 2);
                    }
                },

                _continueFetch: function (fetch) {
                    if (fetch.initialBatch) {
                        fetch.initialBatch();
                        fetch.initialBatch = null;
                    } else {
                        var group = fetch.getGroup();
                        if (group) {
                            var groupPrev,
                                groupNext;

                            if (!group.firstReached) {
                                this._fetchAdjacent(group.firstItem, false);
                            } else if (!group.lastReached) {
                                this._fetchAdjacent(group.lastItem, true);
                            } else if (fetch.countBefore > 0 && group.index !== 0 && !groupReady(groupPrev = this._previousGroup(group))) {
                                this._fetchAdjacent((groupPrev && groupPrev.lastReached ? groupPrev.firstItem : group.firstItem), false);
                            } else {
                                groupNext = this._nextGroup(group);
                                //#DBG _ASSERT(fetch.countAfter > 0 && !groupReady(groupNext));
                                this._fetchAdjacent((groupNext && groupNext.firstReached ? groupNext.lastItem : group.lastItem), true);
                            }
                        } else {
                            // Assume we're searching for a key, index or the count by brute force
                            this._fetchNextIndex();
                        }
                    }
                },

                _fetchComplete: function (group, countBefore, countAfter, firstRequest, complete, error) {
                    if (groupReady(group)) {
                        // Check if the minimal requirements for the request are met
                        var groupPrev = this._previousGroup(group);
                        if (firstRequest || groupReady(groupPrev) || group.index === 0 || countBefore === 0) {
                            var groupNext = this._nextGroup(group);
                            if (firstRequest || groupReady(groupNext) || this._lastGroup === group || countAfter === 0) {
                                // Time to return the fetch results

                                // Find the first available group to return (don't return more than asked for)
                                var countAvailableBefore = 0,
                                    groupFirst = group;
                                while (countAvailableBefore < countBefore) {
                                    groupPrev = this._previousGroup(groupFirst);

                                    if (!groupReady(groupPrev)) {
                                        break;
                                    }

                                    groupFirst = groupPrev;
                                    countAvailableBefore++;
                                }

                                // Find the last available group to return
                                var countAvailableAfter = 0,
                                    groupLast = group;
                                while (countAvailableAfter < countAfter) {
                                    groupNext = this._nextGroup(groupLast);

                                    if (!groupReady(groupNext)) {
                                        break;
                                    }

                                    groupLast = groupNext;
                                    countAvailableAfter++;
                                }

                                // Now create the items to return
                                var len = countAvailableBefore + 1 + countAvailableAfter,
                                    items = new Array(len);

                                for (var i = 0; i < len; i++) {
                                    var item = {
                                        key: groupFirst.key,
                                        data: groupFirst.data,
                                        firstItemKey: groupFirst.firstItem.key,
                                        groupSize: groupFirst.size
                                    };

                                    var firstItemIndex = groupFirst.firstItem.index;
                                    if (typeof firstItemIndex === "number") {
                                        item.firstItemIndexHint = firstItemIndex;
                                    }

                                    items[i] = item;

                                    groupFirst = this._nextGroup(groupFirst);
                                }

                                var result = {
                                    items: items,
                                    offset: countAvailableBefore
                                };

                                result.totalCount = (
                                    typeof this._count === "number" ?
                                        this._count :
                                        UI.CountResult.unknown
                                );

                                if (typeof group.index === "number") {
                                    result.absoluteIndex = group.index;
                                }

                                if (groupLast === this._lastGroup) {
                                    result.atEnd = true;
                                }

                                complete(result);
                                return true;
                            }
                        }
                    }

                    return false;
                },

                _fetchItems: function (getGroup, mayExist, fetchInitialBatch, countBefore, countAfter) {
                    var that = this;
                    return new Promise(function (complete, error) {
                        var group = getGroup(),
                            firstRequest = !group,
                            failureCount = 0;

                        function fetchComplete(failed) {
                            var group2 = getGroup();

                            if (group2) {
                                return that._fetchComplete(group2, countBefore, countAfter, firstRequest, complete, error);
                            } else if (firstRequest && !mayExist(failed)) {
                                error(errorDoesNotExist());
                                return true;
                            } else if (failureCount > 2) {
                                error(errorDoesNotExist());
                                return true;
                            } else {
                                // only consider consecutive failures
                                if (failed) {
                                    failureCount++;
                                } else {
                                    failureCount = 0;
                                }
                                // _continueFetch will switch to a brute force search
                                return false;
                            }
                        }

                        if (!fetchComplete()) {
                            var fetch = {
                                initialBatch: firstRequest ? fetchInitialBatch : null,
                                getGroup: getGroup,
                                countBefore: countBefore,
                                countAfter: countAfter,
                                complete: fetchComplete
                            };

                            that._fetchQueue.push(fetch);

                            if (!that._itemBatch) {
                                //#DBG _ASSERT(that._fetchQueue[0] === fetch);
                                that._continueFetch(fetch);
                            }
                        }
                    });
                },

                _previousGroup: function (group) {
                    if (group && group.firstReached) {
                        this._listBinding.jumpToItem(group.firstItem);

                        return this._handleMap[this._listBinding.previous().handle];
                    } else {
                        return null;
                    }
                },

                _nextGroup: function (group) {
                    if (group && group.lastReached) {
                        this._listBinding.jumpToItem(group.lastItem);

                        return this._handleMap[this._listBinding.next().handle];
                    } else {
                        return null;
                    }
                },

                _invalidateIndices: function (group) {
                    this._count = null;
                    this._lastGroup = null;

                    if (typeof group.index === "number") {
                        this._indexMax = (group.index > 0 ? group.index : null);
                    }

                    // Delete the indices of this and all subsequent groups
                    for (var group2 = group; group2 && typeof group2.index === "number"; group2 = this._nextGroup(group2)) {
                        delete this._indexMap[group2.index];
                        group2.index = null;
                    }
                },

                _releaseGroup: function (group) {
                    this._invalidateIndices(group);

                    delete this._keyMap[group.key];

                    if (this._lastGroup === group) {
                        this._lastGroup = null;
                    }

                    if (group.firstItem !== group.lastItem) {
                        this._releaseItem(group.firstItem);
                    }
                    this._releaseItem(group.lastItem);
                },

                _beginRefresh: function () {
                    // Abandon all current fetches

                    this._fetchQueue = [];

                    if (this._itemBatch) {
                        for (var i = 0; i < this._batchSize; i++) {
                            var item = this._itemBatch[i];
                            if (item) {
                                if (item.cancel) {
                                    item.cancel();
                                }
                                this._listBinding.releaseItem(item);
                            }
                        }

                        this._itemBatch = null;
                    }

                    this._itemsToFetch = 0;

                    this._listDataNotificationHandler.invalidateAll();
                },

                _processInsertion: function (item, previousHandle, nextHandle) {
                    var groupPrev = this._handleMap[previousHandle],
                        groupNext = this._handleMap[nextHandle],
                        groupKey = null;

                    if (groupPrev) {
                        // If an item in a different group from groupPrev is being inserted after it, no need to discard groupPrev
                        if (!groupPrev.lastReached || previousHandle !== groupPrev.lastItem.handle || (groupKey = this._groupKey(item)) === groupPrev.key) {
                            this._releaseGroup(groupPrev);
                        } else if (this._lastGroup === groupPrev) {
                            this._lastGroup = null;
                            this._count = null;
                        }
                        this._beginRefresh();
                    }

                    if (groupNext && groupNext !== groupPrev) {
                        this._invalidateIndices(groupNext);

                        // If an item in a different group from groupNext is being inserted before it, no need to discard groupNext
                        if (!groupNext.firstReached || nextHandle !== groupNext.firstItem.handle || (groupKey !== null ? groupKey : this._groupKey(item)) === groupNext.key) {
                            this._releaseGroup(groupNext);
                        }
                        this._beginRefresh();
                    }
                },

                _processRemoval: function (handle) {
                    var group = this._handleMap[handle];

                    if (group && (handle === group.firstItem.handle || handle === group.lastItem.handle)) {
                        this._releaseGroup(group);
                        this._beginRefresh();
                    } else if (this._itemBatch) {
                        for (var i = 0; i < this._batchSize; i++) {
                            var item = this._itemBatch[i];
                            if (item && item.handle === handle) {
                                this._beginRefresh();
                                break;
                            }
                        }
                    }
                },

                _inserted: function (itemPromise, previousHandle, nextHandle) {
                    var that = this;
                    itemPromise.then(function (item) {
                        that._processInsertion(item, previousHandle, nextHandle);
                    });
                },

                _changed: function (newItem, oldItem) {
                    // A change to the first item could affect the group item
                    var group = this._handleMap[newItem.handle];
                    if (group && newItem.handle === group.firstItem.handle) {
                        this._releaseGroup(group);
                        this._beginRefresh();
                    }

                    // If the item is now in a different group, treat this as a move
                    if (this._groupKey(newItem) !== this._groupKey(oldItem)) {
                        this._listBinding.jumpToItem(newItem);
                        var previousHandle = this._listBinding.previous().handle;
                        this._listBinding.jumpToItem(newItem);
                        var nextHandle = this._listBinding.next().handle;

                        this._processRemoval(newItem.handle);
                        this._processInsertion(newItem, previousHandle, nextHandle);
                    }
                },

                _moved: function (itemPromise, previousHandle, nextHandle) {
                    this._processRemoval(itemPromise.handle);

                    var that = this;
                    itemPromise.then(function (item) {
                        that._processInsertion(item, previousHandle, nextHandle);
                    });
                },

                _removed: function (handle, mirage) {
                    // Mirage removals will just result in null items, which can be ignored
                    if (!mirage) {
                        this._processRemoval(handle);
                    }
                },

                _indexChanged: function (handle, newIndex, oldIndex) {
                    if (typeof oldIndex === "number") {
                        this._indicesChanged = true;
                    }
                },

                _endNotifications: function () {
                    if (this._indicesChanged) {
                        this._indicesChanged = false;

                        // Update the group sizes
                        for (var key in this._keyMap) {
                            var group = this._keyMap[key];

                            if (group.firstReached && group.lastReached) {
                                var newSize = group.lastItem.index + 1 - group.firstItem.index;
                                if (!isNaN(newSize)) {
                                    group.size = newSize;
                                }
                            }
                        }

                        // Invalidate the client, since some firstItemIndexHint properties have probably changed
                        this._beginRefresh();
                    }
                },

                _reload: function () {
                    this._initializeState();
                    this._listDataNotificationHandler.reload();
                }
            }, {
                supportedForProcessing: false,
            });

            return WinJS.Class.derive(UI.VirtualizedDataSource, function (listDataSource, groupKey, groupData, options) {
                var groupDataAdapter = new GroupDataAdapter(listDataSource, groupKey, groupData, options);

                this._baseDataSourceConstructor(groupDataAdapter);

                this.extensions = {
                    invalidateGroups: function () {
                        groupDataAdapter.invalidateGroups();
                    }
                };
            }, {
                /* empty */
            }, {
                supportedForProcessing: false,
            });
        })

    });

})();

