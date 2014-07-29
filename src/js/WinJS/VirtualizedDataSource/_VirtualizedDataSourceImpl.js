// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Virtualized Data Source
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../Scheduler',
    '../_Signal',
    '../Utilities/_UI'
    ], function listDataSourceInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Promise, Scheduler, _Signal, _UI) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        VirtualizedDataSource: _Base.Namespace._lazy(function () {
            var MAX_BEGINREFRESH_COUNT = 100;
            var uniqueID = 1;

            var DataSourceStatus = _UI.DataSourceStatus,
            CountResult = _UI.CountResult,
            FetchError = _UI.FetchError,
            EditError = _UI.EditError;

            // Private statics

            var strings = {
                get listDataAdapterIsInvalid() { return "Invalid argument: listDataAdapter must be an object or an array."; },
                get indexIsInvalid() { return "Invalid argument: index must be a non-negative integer."; },
                get keyIsInvalid() { return "Invalid argument: key must be a string."; },
                get invalidItemReturned() { return "Error: data adapter returned item that is not an object."; },
                get invalidKeyReturned() { return "Error: data adapter returned item with undefined or null key."; },
                get invalidIndexReturned() { return "Error: data adapter should return undefined, null or a non-negative integer for the index."; },
                get invalidCountReturned() { return "Error: data adapter should return undefined, null, CountResult.unknown, or a non-negative integer for the count."; },
                get invalidRequestedCountReturned() { return "Error: data adapter should return CountResult.unknown, CountResult.failure, or a non-negative integer for the count."; },
                get refreshCycleIdentified() { return "refresh cycle found, likely data inconsistency"; },
            };

            var statusChangedEvent = "statuschanged";

            function _baseDataSourceConstructor(listDataAdapter, options) {
                /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource._baseDataSourceConstructor">
                /// <summary locid="WinJS.UI.VirtualizedDataSource._baseDataSourceConstructor">
                /// Initializes the VirtualizedDataSource base class of a custom data source.
                /// </summary>
                /// <param name="listDataAdapter" type="IListDataAdapter" locid="WinJS.UI.VirtualizedDataSource._baseDataSourceConstructor_p:itemIndex">
                /// An object that implements IListDataAdapter and supplies data to the VirtualizedDataSource.  
                /// </param>
                /// <param name="options" optional="true" type="Object" locid="WinJS.UI.VirtualizedDataSource._baseDataSourceConstructor_p:options">
                /// An object that contains properties that specify additonal options for the VirtualizedDataSource:
                ///
                /// cacheSize
                /// A Number that specifies minimum number of unrequested items to cache in case they are requested.
                ///
                /// The options parameter is optional.
                /// </param>
                /// </signature>

                // Private members

                /*jshint validthis: true */

                var listDataNotificationHandler,
                    cacheSize,
                    status,
                    statusPending,
                    statusChangePosted,
                    bindingMap,
                    nextListBindingID,
                    nextHandle,
                    nextListenerID,
                    getCountPromise,
                    resultsProcessed,
                    beginEditsCalled,
                    editsInProgress,
                    firstEditInProgress,
                    editQueue,
                    editsQueued,
                    synchronousEdit,
                    waitForRefresh,
                    dataNotificationsInProgress,
                    countDelta,
                    indexUpdateDeferred,
                    nextTempKey,
                    currentRefreshID,
                    fetchesPosted,
                    nextFetchID,
                    fetchesInProgress,
                    fetchCompleteCallbacks,
                    startMarker,
                    endMarker,
                    knownCount,
                    slotsStart,
                    slotListEnd,
                    slotsEnd,
                    handleMap,
                    keyMap,
                    indexMap,
                    releasedSlots,
                    lastSlotReleased,
                    reduceReleasedSlotCountPosted,
                    refreshRequested,
                    refreshInProgress,
                    refreshSignal,
                    refreshFetchesInProgress,
                    refreshItemsFetched,
                    refreshCount,
                    refreshStart,
                    refreshEnd,
                    keyFetchIDs,
                    refreshKeyMap,
                    refreshIndexMap,
                    deletedKeys,
                    synchronousProgress,
                    reentrantContinue,
                    synchronousRefresh,
                    reentrantRefresh;

                var beginRefreshCount = 0,
                    refreshHistory = new Array(100),
                    refreshHistoryPos = -1;

                var itemsFromKey,
                    itemsFromIndex,
                    itemsFromStart,
                    itemsFromEnd,
                    itemsFromDescription;

                if (listDataAdapter.itemsFromKey) {
                    itemsFromKey = function (fetchID, key, countBefore, countAfter, hints) {
                        var perfID = "fetchItemsFromKey id=" + fetchID + " key=" + key + " countBefore=" + countBefore + " countAfter=" + countAfter;
                        profilerMarkStart(perfID);
                        refreshHistory[++refreshHistoryPos % refreshHistory.length] = { kind: "itemsFromKey", key: key, countBefore: countBefore, countAfter: countAfter };
                        var result = listDataAdapter.itemsFromKey(key, countBefore, countAfter, hints);
                        profilerMarkEnd(perfID);
                        return result;
                    };
                }
                if (listDataAdapter.itemsFromIndex) {
                    itemsFromIndex = function (fetchID, index, countBefore, countAfter) {
                        var perfID = "fetchItemsFromIndex id=" + fetchID + " index=" + index + " countBefore=" + countBefore + " countAfter=" + countAfter;
                        profilerMarkStart(perfID);
                        refreshHistory[++refreshHistoryPos % refreshHistory.length] = { kind: "itemsFromIndex", index: index, countBefore: countBefore, countAfter: countAfter };
                        var result = listDataAdapter.itemsFromIndex(index, countBefore, countAfter);
                        profilerMarkEnd(perfID);
                        return result;
                    };
                }
                if (listDataAdapter.itemsFromStart) {
                    itemsFromStart = function (fetchID, count) {
                        var perfID = "fetchItemsFromStart id=" + fetchID + " count=" + count;
                        profilerMarkStart(perfID);
                        refreshHistory[++refreshHistoryPos % refreshHistory.length] = { kind: "itemsFromStart", count: count };
                        var result = listDataAdapter.itemsFromStart(count);
                        profilerMarkEnd(perfID);
                        return result;
                    };
                }
                if (listDataAdapter.itemsFromEnd) {
                    itemsFromEnd = function (fetchID, count) {
                        var perfID = "fetchItemsFromEnd id=" + fetchID + " count=" + count;
                        profilerMarkStart(perfID);
                        refreshHistory[++refreshHistoryPos % refreshHistory.length] = { kind: "itemsFromEnd", count: count };
                        var result = listDataAdapter.itemsFromEnd(count);
                        profilerMarkEnd(perfID);
                        return result;
                    };
                }
                if (listDataAdapter.itemsFromDescription) {
                    itemsFromDescription = function (fetchID, description, countBefore, countAfter) {
                        var perfID = "fetchItemsFromDescription id=" + fetchID + " desc=" + description + " countBefore=" + countBefore + " countAfter=" + countAfter;
                        profilerMarkStart(perfID);
                        refreshHistory[++refreshHistoryPos % refreshHistory.length] = { kind: "itemsFromDescription", description: description, countBefore: countBefore, countAfter: countAfter };
                        var result = listDataAdapter.itemsFromDescription(description, countBefore, countAfter);
                        profilerMarkEnd(perfID);
                        return result;
                    };
                }

                var dataSourceID = ++uniqueID;

                function profilerMarkStart(text) {
                    var message = "WinJS.UI.VirtualizedDataSource:" + dataSourceID + ":" + text + ",StartTM";
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, "winjs vds", "perf");
                }
                function profilerMarkEnd(text) {
                    var message = "WinJS.UI.VirtualizedDataSource:" + dataSourceID + ":" + text + ",StopTM";
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, "winjs vds", "perf");
                }

                function isNonNegativeNumber(n) {
                    return (typeof n === "number") && n >= 0;
                }

                function isNonNegativeInteger(n) {
                    return isNonNegativeNumber(n) && n === Math.floor(n);
                }

                function validateIndexReturned(index) {
                    // Ensure that index is always undefined or a non-negative integer
                    if (index === null) {
                        index = undefined;
                    } else if (index !== undefined && !isNonNegativeInteger(index)) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidIndexReturned", strings.invalidIndexReturned);
                    }

                    return index;
                }

                function validateCountReturned(count) {
                    // Ensure that count is always undefined or a non-negative integer
                    if (count === null) {
                        count = undefined;
                    } else if (count !== undefined && !isNonNegativeInteger(count) && count !== CountResult.unknown) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidCountReturned", strings.invalidCountReturned);
                    }

                    return count;
                }

                // Slot List

                function createSlot() {
                    var handle = (nextHandle++).toString(),
                        slotNew = {
                            handle: handle,
                            item: null,
                            itemNew: null,
                            fetchListeners: null,
                            cursorCount: 0,
                            bindingMap: null
                        };

                    // Deliberately not initialized:
                    //   - directFetchListeners

                    handleMap[handle] = slotNew;

                    return slotNew;
                }

                function createPrimarySlot() {
                    return createSlot();
                }

                function insertSlot(slot, slotNext) {
                    slot.prev = slotNext.prev;
                    slot.next = slotNext;

                    slot.prev.next = slot;
                    slotNext.prev = slot;
                }

                function removeSlot(slot) {
                    if (slot.lastInSequence) {
                        delete slot.lastInSequence;
                        slot.prev.lastInSequence = true;
                    }
                    if (slot.firstInSequence) {
                        delete slot.firstInSequence;
                        slot.next.firstInSequence = true;
                    }
                    slot.prev.next = slot.next;
                    slot.next.prev = slot.prev;
                }

                function sequenceStart(slot) {
                    while (!slot.firstInSequence) {
                        slot = slot.prev;
                    }

                    return slot;
                }

                function sequenceEnd(slot) {
                    while (!slot.lastInSequence) {
                        slot = slot.next;
                    }

                    return slot;
                }

                // Does a little careful surgery to the slot sequence from slotFirst to slotLast before slotNext
                function moveSequenceBefore(slotNext, slotFirst, slotLast) {
                    slotFirst.prev.next = slotLast.next;
                    slotLast.next.prev = slotFirst.prev;

                    slotFirst.prev = slotNext.prev;
                    slotLast.next = slotNext;

                    slotFirst.prev.next = slotFirst;
                    slotNext.prev = slotLast;

                    return true;
                }

                // Does a little careful surgery to the slot sequence from slotFirst to slotLast after slotPrev
                function moveSequenceAfter(slotPrev, slotFirst, slotLast) {
                    slotFirst.prev.next = slotLast.next;
                    slotLast.next.prev = slotFirst.prev;

                    slotFirst.prev = slotPrev;
                    slotLast.next = slotPrev.next;

                    slotPrev.next = slotFirst;
                    slotLast.next.prev = slotLast;

                    return true;
                }

                function mergeSequences(slotPrev) {
                    delete slotPrev.lastInSequence;
                    delete slotPrev.next.firstInSequence;
                }

                function splitSequence(slotPrev) {
                    var slotNext = slotPrev.next;

                    slotPrev.lastInSequence = true;
                    slotNext.firstInSequence = true;

                    if (slotNext === slotListEnd) {
                        // Clear slotListEnd's index, as that's now unknown
                        changeSlotIndex(slotListEnd, undefined);
                    }
                }

                // Inserts a slot in the middle of a sequence or between sequences.  If the latter, mergeWithPrev and mergeWithNext
                // parameters specify whether to merge the slot with the previous sequence, or next, or neither.
                function insertAndMergeSlot(slot, slotNext, mergeWithPrev, mergeWithNext) {
                    insertSlot(slot, slotNext);

                    var slotPrev = slot.prev;

                    if (slotPrev.lastInSequence) {
                        if (mergeWithPrev) {
                            delete slotPrev.lastInSequence;
                        } else {
                            slot.firstInSequence = true;
                        }

                        if (mergeWithNext) {
                            delete slotNext.firstInSequence;
                        } else {
                            slot.lastInSequence = true;
                        }
                    }
                }

                // Keys and Indices

                function setSlotKey(slot, key) {
                    slot.key = key;

                    // Add the slot to the keyMap, so it is possible to quickly find the slot given its key
                    keyMap[slot.key] = slot;
                }

                function setSlotIndex(slot, index, indexMapForSlot) {
                    // Tolerate NaN, so clients can pass (undefined - 1) or (undefined + 1)
                    if (+index === index) {
                        slot.index = index;

                        // Add the slot to the indexMap, so it is possible to quickly find the slot given its index
                        indexMapForSlot[index] = slot;

                        if (!indexUpdateDeferred) {
                            // See if any sequences should be merged
                            if (slot.firstInSequence && slot.prev && slot.prev.index === index - 1) {
                                mergeSequences(slot.prev);
                            }
                            if (slot.lastInSequence && slot.next && slot.next.index === index + 1) {
                                mergeSequences(slot);
                            }
                        }
                    }
                }

                // Creates a new slot and adds it to the slot list before slotNext
                function createAndAddSlot(slotNext, indexMapForSlot) {
                    var slotNew = (indexMapForSlot === indexMap ? createPrimarySlot() : createSlot());

                    insertSlot(slotNew, slotNext);

                    return slotNew;
                }

                function createSlotSequence(slotNext, index, indexMapForSlot) {
                    var slotNew = createAndAddSlot(slotNext, indexMapForSlot);

                    slotNew.firstInSequence = true;
                    slotNew.lastInSequence = true;

                    setSlotIndex(slotNew, index, indexMapForSlot);

                    return slotNew;
                }

                function createPrimarySlotSequence(slotNext, index) {
                    return createSlotSequence(slotNext, index, indexMap);
                }

                function addSlotBefore(slotNext, indexMapForSlot) {
                    var slotNew = createAndAddSlot(slotNext, indexMapForSlot);
                    delete slotNext.firstInSequence;

                    // See if we've bumped into the previous sequence
                    if (slotNew.prev.index === slotNew.index - 1) {
                        delete slotNew.prev.lastInSequence;
                    } else {
                        slotNew.firstInSequence = true;
                    }

                    setSlotIndex(slotNew, slotNext.index - 1, indexMapForSlot);

                    return slotNew;
                }

                function addSlotAfter(slotPrev, indexMapForSlot) {
                    var slotNew = createAndAddSlot(slotPrev.next, indexMapForSlot);
                    delete slotPrev.lastInSequence;

                    // See if we've bumped into the next sequence
                    if (slotNew.next.index === slotNew.index + 1) {
                        delete slotNew.next.firstInSequence;
                    } else {
                        slotNew.lastInSequence = true;
                    }

                    setSlotIndex(slotNew, slotPrev.index + 1, indexMapForSlot);

                    return slotNew;
                }

                function reinsertSlot(slot, slotNext, mergeWithPrev, mergeWithNext) {
                    insertAndMergeSlot(slot, slotNext, mergeWithPrev, mergeWithNext);
                    keyMap[slot.key] = slot;
                    if (slot.index !== undefined) {
                        indexMap[slot.index] = slot;
                    }
                }

                function removeSlotPermanently(slot) {
                    removeSlot(slot);

                    if (slot.key) {
                        delete keyMap[slot.key];
                    }
                    if (slot.index !== undefined && indexMap[slot.index] === slot) {
                        delete indexMap[slot.index];
                    }

                    var bindingMap = slot.bindingMap;
                    for (var listBindingID in bindingMap) {
                        var handle = bindingMap[listBindingID].handle;
                        if (handle && handleMap[handle] === slot) {
                            delete handleMap[handle];
                        }
                    }

                    // Invalidating the slot's handle marks it as deleted
                    if (handleMap[slot.handle] === slot) {
                        delete handleMap[slot.handle];
                    }
                }

                function slotPermanentlyRemoved(slot) {
                    return !handleMap[slot.handle];
                }

                function successorFromIndex(index, indexMapForSlot, listStart, listEnd, skipPreviousIndex) {
                    // Try the previous index
                    var slotNext = (skipPreviousIndex ? null : indexMapForSlot[index - 1]);
                    if (slotNext && (slotNext.next !== listEnd || listEnd.firstInSequence)) {
                        // We want the successor
                        slotNext = slotNext.next;
                    } else {
                        // Try the next index
                        slotNext = indexMapForSlot[index + 1];
                        if (!slotNext) {
                            // Resort to a linear search
                            slotNext = listStart.next;
                            var lastSequenceStart;
                            while (true) {
                                if (slotNext.firstInSequence) {
                                    lastSequenceStart = slotNext;
                                }

                                if (!(index >= slotNext.index) || slotNext === listEnd) {
                                    break;
                                }

                                slotNext = slotNext.next;
                            }

                            if (slotNext === listEnd && !listEnd.firstInSequence) {
                                // Return the last insertion point between sequences, or undefined if none
                                slotNext = (lastSequenceStart && lastSequenceStart.index === undefined ? lastSequenceStart : undefined);
                            }
                        }
                    }

                    return slotNext;
                }

                // Slot Items

                function isPlaceholder(slot) {
                    return !slot.item && !slot.itemNew && slot !== slotListEnd;
                }

                function defineHandleProperty(item, handle) {
                    Object.defineProperty(item, "handle", {
                        value: handle,
                        writable: false,
                        enumerable: false,
                        configurable: true
                    });
                }

                function defineCommonItemProperties(item, slot, handle) {
                    defineHandleProperty(item, handle);

                    Object.defineProperty(item, "index", {
                        get: function () {
                            while (slot.slotMergedWith) {
                                slot = slot.slotMergedWith;
                            }

                            return slot.index;
                        },
                        enumerable: false,
                        configurable: true
                    });
                }

                function validateData(data) {
                    if (data === undefined) {
                        return data;
                    } else {
                        // Convert the data object to JSON to enforce the constraints we want.  For example, we don't want
                        // functions, arrays with extra properties, DOM objects, cyclic or acyclic graphs, or undefined values.
                        var dataValidated = JSON.stringify(data);

                        if (dataValidated === undefined) {
                            throw new _ErrorFromName("WinJS.UI.ListDataSource.ObjectIsNotValidJson", strings.objectIsNotValidJson);
                        }

                        return dataValidated;
                    }
                }

                function itemSignature(item) {
                    return (
                        listDataAdapter.itemSignature ?
                            listDataAdapter.itemSignature(item.data) :
                            validateData(item.data)
                    );
                }

                function prepareSlotItem(slot) {
                    var item = slot.itemNew;
                    slot.itemNew = null;

                    if (item) {
                        item = Object.create(item);
                        defineCommonItemProperties(item, slot, slot.handle);

                        if (!listDataAdapter.compareByIdentity) {
                            // Store the item signature or a stringified copy of the data for comparison later
                            slot.signature = itemSignature(item);
                        }
                    }

                    slot.item = item;

                    delete slot.indexRequested;
                    delete slot.keyRequested;
                }

                // Slot Caching

                function slotRetained(slot) {
                    return slot.bindingMap || slot.cursorCount > 0;
                }

                function slotRequested(slot) {
                    return slotRetained(slot) || slot.fetchListeners || slot.directFetchListeners;
                }

                function slotLive(slot) {
                    return slotRequested(slot) || (!slot.firstInSequence && slotRetained(slot.prev)) || (!slot.lastInSequence && slotRetained(slot.next)) ||
                        (!itemsFromIndex && (
                            (!slot.firstInSequence && slot.prev !== slotsStart && !(slot.prev.item || slot.prev.itemNew)) |
                            (!slot.lastInSequence && slot.next !== slotListEnd && !(slot.next.item || slot.next.itemNew))
                        ));
                }

                function deleteUnnecessarySlot(slot) {
                    splitSequence(slot);
                    removeSlotPermanently(slot);
                }

                function reduceReleasedSlotCount() {
                    // Must not release slots while edits are queued, as undo queue might refer to them
                    if (!editsQueued) {
                        // If lastSlotReleased is no longer valid, use the end of the list instead
                        if (!lastSlotReleased || slotPermanentlyRemoved(lastSlotReleased)) {
                            lastSlotReleased = slotListEnd.prev;
                        }

                        // Now use the simple heuristic of walking outwards in both directions from lastSlotReleased until the
                        // desired cache size is reached, then removing everything else.
                        var slotPrev = lastSlotReleased.prev,
                            slotNext = lastSlotReleased.next,
                            releasedSlotsFound = 0;

                        var considerDeletingSlot = function (slotToDelete) {
                            if (slotToDelete !== slotListEnd && !slotLive(slotToDelete)) {
                                if (releasedSlotsFound <= cacheSize) {
                                    releasedSlotsFound++;
                                } else {
                                    deleteUnnecessarySlot(slotToDelete);
                                }
                            }
                        };

                        while (slotPrev || slotNext) {
                            if (slotPrev) {
                                var slotPrevToDelete = slotPrev;
                                slotPrev = slotPrevToDelete.prev;
                                if (slotPrevToDelete !== slotsStart) {
                                    considerDeletingSlot(slotPrevToDelete);
                                }
                            }
                            if (slotNext) {
                                var slotNextToDelete = slotNext;
                                slotNext = slotNextToDelete.next;
                                if (slotNextToDelete !== slotsEnd) {
                                    considerDeletingSlot(slotNextToDelete);
                                }
                            }
                        }

                        // Reset the count to zero, so this method is only called periodically
                        releasedSlots = 0;
                    }
                }

                function releaseSlotIfUnrequested(slot) {
                    if (!slotRequested(slot)) {

                        releasedSlots++;

                        // Must not release slots while edits are queued, as undo queue might refer to them.  If a refresh is in
                        // progress, retain all slots, just in case the user re-requests some of them before the refresh completes.
                        if (!editsQueued && !refreshInProgress) {
                            // Track which slot was released most recently
                            lastSlotReleased = slot;

                            // See if the number of released slots has exceeded the cache size.  In practice there will be more
                            // live slots than retained slots, so this is just a heuristic to periodically shrink the cache.
                            if (releasedSlots > cacheSize && !reduceReleasedSlotCountPosted) {
                                reduceReleasedSlotCountPosted = true;
                                Scheduler.schedule(function VDS_async_releaseSlotIfUnrequested() {
                                    reduceReleasedSlotCountPosted = false;
                                    reduceReleasedSlotCount();
                                }, Scheduler.Priority.idle, null, "WinJS.UI.VirtualizedDataSource.releaseSlotIfUnrequested");
                            }
                        }
                    }
                }

                // Notifications

                function forEachBindingRecord(callback) {
                    for (var listBindingID in bindingMap) {
                        callback(bindingMap[listBindingID]);
                    }
                }

                function forEachBindingRecordOfSlot(slot, callback) {
                    for (var listBindingID in slot.bindingMap) {
                        callback(slot.bindingMap[listBindingID].bindingRecord, listBindingID);
                    }
                }

                function handlerToNotify(bindingRecord) {
                    if (!bindingRecord.notificationsSent) {
                        bindingRecord.notificationsSent = true;

                        if (bindingRecord.notificationHandler.beginNotifications) {
                            bindingRecord.notificationHandler.beginNotifications();
                        }
                    }
                    return bindingRecord.notificationHandler;
                }

                function finishNotifications() {
                    if (!editsInProgress && !dataNotificationsInProgress) {
                        forEachBindingRecord(function (bindingRecord) {
                            if (bindingRecord.notificationsSent) {
                                bindingRecord.notificationsSent = false;

                                if (bindingRecord.notificationHandler.endNotifications) {
                                    bindingRecord.notificationHandler.endNotifications();
                                }
                            }
                        });
                    }
                }

                function handleForBinding(slot, listBindingID) {
                    var bindingMap = slot.bindingMap;
                    if (bindingMap) {
                        var slotBinding = bindingMap[listBindingID];
                        if (slotBinding) {
                            var handle = slotBinding.handle;
                            if (handle) {
                                return handle;
                            }
                        }
                    }
                    return slot.handle;
                }

                function itemForBinding(item, handle) {
                    if (item && item.handle !== handle) {
                        item = Object.create(item);
                        defineHandleProperty(item, handle);
                    }
                    return item;
                }

                function changeCount(count) {
                    var oldCount = knownCount;
                    knownCount = count;

                    forEachBindingRecord(function (bindingRecord) {
                        if (bindingRecord.notificationHandler && bindingRecord.notificationHandler.countChanged) {
                            handlerToNotify(bindingRecord).countChanged(knownCount, oldCount);
                        }
                    });
                }

                function sendIndexChangedNotifications(slot, indexOld) {
                    forEachBindingRecordOfSlot(slot, function (bindingRecord, listBindingID) {
                        if (bindingRecord.notificationHandler.indexChanged) {
                            handlerToNotify(bindingRecord).indexChanged(handleForBinding(slot, listBindingID), slot.index, indexOld);
                        }
                    });
                }

                function changeSlotIndex(slot, index) {
                    var indexOld = slot.index;

                    if (indexOld !== undefined && indexMap[indexOld] === slot) {
                        // Remove the slot's old index from the indexMap
                        delete indexMap[indexOld];
                    }

                    // Tolerate NaN, so clients can pass (undefined - 1) or (undefined + 1)
                    if (+index === index) {
                        setSlotIndex(slot, index, indexMap);
                    } else if (+indexOld === indexOld) {
                        delete slot.index;
                    } else {
                        // If neither the new index or the old index is defined then there was no index changed.
                        return;
                    }

                    sendIndexChangedNotifications(slot, indexOld);
                }

                function insertionNotificationRecipients(slot, slotPrev, slotNext, mergeWithPrev, mergeWithNext) {
                    var bindingMapRecipients = {};

                    // Start with the intersection of the bindings for the two adjacent slots
                    if ((mergeWithPrev || !slotPrev.lastInSequence) && (mergeWithNext || !slotNext.firstInSequence)) {
                        if (slotPrev === slotsStart) {
                            if (slotNext === slotListEnd) {
                                // Special case: if the list was empty, broadcast the insertion to all ListBindings with
                                // notification handlers.
                                for (var listBindingID in bindingMap) {
                                    bindingMapRecipients[listBindingID] = bindingMap[listBindingID];
                                }
                            } else {
                                // Include every binding on the next slot
                                for (var listBindingID in slotNext.bindingMap) {
                                    bindingMapRecipients[listBindingID] = bindingMap[listBindingID];
                                }
                            }
                        } else if (slotNext === slotListEnd || slotNext.bindingMap) {
                            for (var listBindingID in slotPrev.bindingMap) {
                                if (slotNext === slotListEnd || slotNext.bindingMap[listBindingID]) {
                                    bindingMapRecipients[listBindingID] = bindingMap[listBindingID];
                                }
                            }
                        }
                    }

                    // Use the union of that result with the bindings for the slot being inserted
                    for (var listBindingID in slot.bindingMap) {
                        bindingMapRecipients[listBindingID] = bindingMap[listBindingID];
                    }

                    return bindingMapRecipients;
                }

                function sendInsertedNotification(slot) {
                    var slotPrev = slot.prev,
                        slotNext = slot.next,
                        bindingMapRecipients = insertionNotificationRecipients(slot, slotPrev, slotNext),
                        listBindingID;

                    for (listBindingID in bindingMapRecipients) {
                        var bindingRecord = bindingMapRecipients[listBindingID];
                        if (bindingRecord.notificationHandler) {
                            handlerToNotify(bindingRecord).inserted(bindingRecord.itemPromiseFromKnownSlot(slot),
                                slotPrev.lastInSequence || slotPrev === slotsStart ? null : handleForBinding(slotPrev, listBindingID),
                                slotNext.firstInSequence || slotNext === slotListEnd ? null : handleForBinding(slotNext, listBindingID)
                            );
                        }
                    }
                }

                function changeSlot(slot) {
                    var itemOld = slot.item;
                    prepareSlotItem(slot);

                    forEachBindingRecordOfSlot(slot, function (bindingRecord, listBindingID) {
                        var handle = handleForBinding(slot, listBindingID);
                        handlerToNotify(bindingRecord).changed(itemForBinding(slot.item, handle), itemForBinding(itemOld, handle));
                    });
                }

                function moveSlot(slot, slotMoveBefore, mergeWithPrev, mergeWithNext, skipNotifications) {
                    var slotMoveAfter = slotMoveBefore.prev,
                        listBindingID;

                    // If the slot is being moved before or after itself, adjust slotMoveAfter or slotMoveBefore accordingly. If
                    // nothing is going to change in the slot list, don't send a notification.
                    if (slotMoveBefore === slot) {
                        if (!slot.firstInSequence || !mergeWithPrev) {
                            return;
                        }
                        slotMoveBefore = slot.next;
                    } else if (slotMoveAfter === slot) {
                        if (!slot.lastInSequence || !mergeWithNext) {
                            return;
                        }
                        slotMoveAfter = slot.prev;
                    }

                    if (!skipNotifications) {
                        // Determine which bindings to notify

                        var bindingMapRecipients = insertionNotificationRecipients(slot, slotMoveAfter, slotMoveBefore, mergeWithPrev, mergeWithNext);

                        // Send the notification before the move
                        for (listBindingID in bindingMapRecipients) {
                            var bindingRecord = bindingMapRecipients[listBindingID];
                            handlerToNotify(bindingRecord).moved(bindingRecord.itemPromiseFromKnownSlot(slot),
                                ((slotMoveAfter.lastInSequence || slotMoveAfter === slot.prev) && !mergeWithPrev) || slotMoveAfter === slotsStart ? null : handleForBinding(slotMoveAfter, listBindingID),
                                ((slotMoveBefore.firstInSequence || slotMoveBefore === slot.next) && !mergeWithNext) || slotMoveBefore === slotListEnd ? null : handleForBinding(slotMoveBefore, listBindingID)
                            );
                        }

                        // If a ListBinding cursor is at the slot that's moving, adjust the cursor
                        forEachBindingRecord(function (bindingRecord) {
                            bindingRecord.adjustCurrentSlot(slot);
                        });
                    }

                    removeSlot(slot);
                    insertAndMergeSlot(slot, slotMoveBefore, mergeWithPrev, mergeWithNext);
                }

                function deleteSlot(slot, mirage) {
                    completeFetchPromises(slot, true);

                    forEachBindingRecordOfSlot(slot, function (bindingRecord, listBindingID) {
                        handlerToNotify(bindingRecord).removed(handleForBinding(slot, listBindingID), mirage);
                    });

                    // If a ListBinding cursor is at the slot that's being removed, adjust the cursor
                    forEachBindingRecord(function (bindingRecord) {
                        bindingRecord.adjustCurrentSlot(slot);
                    });

                    removeSlotPermanently(slot);
                }

                function deleteMirageSequence(slot) {
                    // Remove the slots in order

                    while (!slot.firstInSequence) {
                        slot = slot.prev;
                    }

                    var last;
                    do {
                        last = slot.lastInSequence;

                        var slotNext = slot.next;
                        deleteSlot(slot, true);
                        slot = slotNext;
                    } while (!last);
                }

                // Deferred Index Updates

                // Returns the index of the slot taking into account any outstanding index updates
                function adjustedIndex(slot) {
                    var undefinedIndex;

                    if (!slot) {
                        return undefinedIndex;
                    }

                    var delta = 0;
                    while (!slot.firstInSequence) {
                        delta++;
                        slot = slot.prev;
                    }

                    return (
                        typeof slot.indexNew === "number" ?
                            slot.indexNew + delta :
                        typeof slot.index === "number" ?
                            slot.index + delta :
                            undefinedIndex
                    );
                }

                // Updates the new index of the first slot in each sequence after the given slot
                function updateNewIndicesAfterSlot(slot, indexDelta) {
                    // Adjust all the indexNews after this slot
                    for (slot = slot.next; slot; slot = slot.next) {
                        if (slot.firstInSequence) {
                            var indexNew = (slot.indexNew !== undefined ? slot.indexNew : slot.index);
                            if (indexNew !== undefined) {
                                slot.indexNew = indexNew + indexDelta;
                            }
                        }
                    }

                    // Adjust the overall count
                    countDelta += indexDelta;

                    indexUpdateDeferred = true;

                    // Increment currentRefreshID so any outstanding fetches don't cause trouble.  If a refresh is in progress,
                    // restart it (which will also increment currentRefreshID).
                    if (refreshInProgress) {
                        beginRefresh();
                    } else {
                        currentRefreshID++;
                    }
                }

                // Updates the new index of the given slot if necessary, and all subsequent new indices
                function updateNewIndices(slot, indexDelta) {
                    // If this slot is at the start of a sequence, transfer the indexNew
                    if (slot.firstInSequence) {
                        var indexNew;

                        if (indexDelta < 0) {
                            // The given slot is about to be removed
                            indexNew = slot.indexNew;
                            if (indexNew !== undefined) {
                                delete slot.indexNew;
                            } else {
                                indexNew = slot.index;
                            }

                            if (!slot.lastInSequence) {
                                // Update the next slot now
                                slot = slot.next;
                                if (indexNew !== undefined) {
                                    slot.indexNew = indexNew;
                                }
                            }
                        } else {
                            // The given slot was just inserted
                            if (!slot.lastInSequence) {
                                var slotNext = slot.next;

                                indexNew = slotNext.indexNew;
                                if (indexNew !== undefined) {
                                    delete slotNext.indexNew;
                                } else {
                                    indexNew = slotNext.index;
                                }

                                if (indexNew !== undefined) {
                                    slot.indexNew = indexNew;
                                }
                            }
                        }
                    }

                    updateNewIndicesAfterSlot(slot, indexDelta);
                }

                // Updates the new index of the first slot in each sequence after the given new index
                function updateNewIndicesFromIndex(index, indexDelta) {
                    for (var slot = slotsStart; slot !== slotListEnd; slot = slot.next) {
                        var indexNew = slot.indexNew;

                        if (indexNew !== undefined && index <= indexNew) {
                            updateNewIndicesAfterSlot(slot, indexDelta);
                            break;
                        }
                    }
                }

                // Adjust the indices of all slots to be consistent with any indexNew properties, and strip off the indexNews
                function updateIndices() {
                    var slot,
                        slotFirstInSequence,
                        indexNew;

                    for (slot = slotsStart; ; slot = slot.next) {
                        if (slot.firstInSequence) {
                            slotFirstInSequence = slot;
                            if (slot.indexNew !== undefined) {
                                indexNew = slot.indexNew;
                                delete slot.indexNew;
                                if (isNaN(indexNew)) {
                                    break;
                                }
                            } else {
                                indexNew = slot.index;
                            }

                            // See if this sequence should be merged with the previous one
                            if (slot !== slotsStart && slot.prev.index === indexNew - 1) {
                                mergeSequences(slot.prev);
                            }
                        }

                        if (slot.lastInSequence) {
                            var index = indexNew;
                            for (var slotUpdate = slotFirstInSequence; slotUpdate !== slot.next; slotUpdate = slotUpdate.next) {
                                if (index !== slotUpdate.index) {
                                    changeSlotIndex(slotUpdate, index);
                                }
                                if (+index === index) {
                                    index++;
                                }
                            }
                        }

                        if (slot === slotListEnd) {
                            break;
                        }
                    }

                    // Clear any indices on slots that were moved adjacent to slots without indices
                    for (; slot !== slotsEnd; slot = slot.next) {
                        if (slot.index !== undefined && slot !== slotListEnd) {
                            changeSlotIndex(slot, undefined);
                        }
                    }

                    indexUpdateDeferred = false;

                    if (countDelta && +knownCount === knownCount) {
                        if (getCountPromise) {
                            getCountPromise.reset();
                        } else {
                            changeCount(knownCount + countDelta);
                        }

                        countDelta = 0;
                    }
                }

                // Fetch Promises

                function createFetchPromise(slot, listenersProperty, listenerID, listBindingID, onComplete) {
                    if (slot.item) {
                        return new Promise(function (complete) {
                            if (onComplete) {
                                onComplete(complete, slot.item);
                            } else {
                                complete(slot.item);
                            }
                        });
                    } else {
                        var listener = {
                            listBindingID: listBindingID,
                            retained: false
                        };

                        if (!slot[listenersProperty]) {
                            slot[listenersProperty] = {};
                        }
                        slot[listenersProperty][listenerID] = listener;

                        listener.promise = new Promise(function (complete, error) {
                            listener.complete = (onComplete ? function (item) {
                                onComplete(complete, item);
                            } : complete);
                            listener.error = error;
                        }, function () {
                            // By now the slot might have been merged with another

                            while (slot.slotMergedWith) {
                                slot = slot.slotMergedWith;
                            }

                            var fetchListeners = slot[listenersProperty];
                            if (fetchListeners) {
                                delete fetchListeners[listenerID];

                                // See if there are any other listeners
                                if(Object.keys(fetchListeners).length > 0) {
                                    return;
                                }
                                delete slot[listenersProperty];
                            }
                            releaseSlotIfUnrequested(slot);
                        });

                        return listener.promise;
                    }
                }

                function completePromises(item, listeners) {
                    for (var listenerID in listeners) {
                        listeners[listenerID].complete(item);
                    }
                }

                function completeFetchPromises(slot, completeSynchronously) {
                    var fetchListeners = slot.fetchListeners,
                        directFetchListeners = slot.directFetchListeners;

                    if (fetchListeners || directFetchListeners) {
                        prepareSlotItem(slot);

                        // By default, complete asynchronously to minimize reentrancy

                        var item = slot.item;

                        var completeOrQueuePromises = function (listeners) {
                            if (completeSynchronously) {
                                completePromises(item, listeners);
                            } else {
                                fetchCompleteCallbacks.push(function () {
                                    completePromises(item, listeners);
                                });
                            }
                        };

                        if (directFetchListeners) {
                            slot.directFetchListeners = null;
                            completeOrQueuePromises(directFetchListeners);
                        }

                        if (fetchListeners) {
                            slot.fetchListeners = null;
                            completeOrQueuePromises(fetchListeners);
                        }

                        releaseSlotIfUnrequested(slot);
                    }
                }

                function callFetchCompleteCallbacks() {
                    var callbacks = fetchCompleteCallbacks;

                    // Clear fetchCompleteCallbacks first to avoid reentrancy problems
                    fetchCompleteCallbacks = [];

                    for (var i = 0, len = callbacks.length; i < len; i++) {
                        callbacks[i]();
                    }
                }

                function returnDirectFetchError(slot, error) {
                    var directFetchListeners = slot.directFetchListeners;
                    if (directFetchListeners) {
                        slot.directFetchListeners = null;

                        for (var listenerID in directFetchListeners) {
                            directFetchListeners[listenerID].error(error);
                        }

                        releaseSlotIfUnrequested(slot);
                    }
                }

                // Item Requests

                function requestSlot(slot) {
                    // Ensure that there's a slot on either side of each requested item
                    if (slot.firstInSequence) {
                        addSlotBefore(slot, indexMap);
                    }
                    if (slot.lastInSequence) {
                        addSlotAfter(slot, indexMap);
                    }

                    // If the item has already been fetched, prepare it now to be returned to the client
                    if (slot.itemNew) {
                        prepareSlotItem(slot);
                    }

                    // Start a new fetch if necessary
                    postFetch();

                    return slot;
                }

                function requestSlotBefore(slotNext) {
                    // First, see if the previous slot already exists
                    if (!slotNext.firstInSequence) {
                        var slotPrev = slotNext.prev;

                        // Next, see if the item is known to not exist
                        return (slotPrev === slotsStart ? null : requestSlot(slotPrev));
                    }

                    return requestSlot(addSlotBefore(slotNext, indexMap));
                }

                function requestSlotAfter(slotPrev) {
                    // First, see if the next slot already exists
                    if (!slotPrev.lastInSequence) {
                        var slotNext = slotPrev.next;

                        // Next, see if the item is known to not exist
                        return (slotNext === slotListEnd ? null : requestSlot(slotNext));
                    }

                    return requestSlot(addSlotAfter(slotPrev, indexMap));
                }

                function itemDirectlyFromSlot(slot) {
                    // Return a complete promise for a non-existent slot
                    return (
                        slot ?
                            createFetchPromise(slot, "directFetchListeners", (nextListenerID++).toString()) :
                            Promise.wrap(null)
                    );
                }

                function validateKey(key) {
                    if (typeof key !== "string" || !key) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.KeyIsInvalid", strings.keyIsInvalid);
                    }
                }

                function createSlotForKey(key) {
                    var slot = createPrimarySlotSequence(slotsEnd);

                    setSlotKey(slot, key);
                    slot.keyRequested = true;

                    return slot;
                }

                function slotFromKey(key, hints) {
                    validateKey(key);

                    var slot = keyMap[key];

                    if (!slot) {
                        slot = createSlotForKey(key);
                        slot.hints = hints;
                    }

                    return requestSlot(slot);
                }

                function slotFromIndex(index) {
                    if (typeof index !== "number" || index < 0) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.IndexIsInvalid", strings.indexIsInvalid);
                    }

                    if (slotListEnd.index <= index) {
                        return null;
                    }

                    var slot = indexMap[index];

                    if (!slot) {
                        var slotNext = successorFromIndex(index, indexMap, slotsStart, slotListEnd);

                        if (!slotNext) {
                            // The complete list has been observed, and this index isn't a part of it; a refresh may be necessary
                            return null;
                        }

                        if (slotNext === slotListEnd && index >= slotListEnd) {
                            // Clear slotListEnd's index, as that's now unknown
                            changeSlotIndex(slotListEnd, undefined);
                        }

                        // Create a new slot and start a request for it
                        if (slotNext.prev.index === index - 1) {
                            slot = addSlotAfter(slotNext.prev, indexMap);
                        } else if (slotNext.index === index + 1) {
                            slot = addSlotBefore(slotNext, indexMap);
                        } else {
                            slot = createPrimarySlotSequence(slotNext, index);
                        }
                    }

                    if (!slot.item) {
                        slot.indexRequested = true;
                    }

                    return requestSlot(slot);
                }

                function slotFromDescription(description) {
                    // Create a new slot and start a request for it
                    var slot = createPrimarySlotSequence(slotsEnd);

                    slot.description = description;

                    return requestSlot(slot);
                }

                // Status
                var that = this;
                function setStatus(statusNew) {
                    statusPending = statusNew;
                    if (status !== statusPending) {
                        var dispatch = function () {
                            statusChangePosted = false;

                            if (status !== statusPending) {
                                status = statusPending;
                                that.dispatchEvent(statusChangedEvent, status);
                            }
                        };
                        if (statusPending === DataSourceStatus.failure) {
                            dispatch();
                        } else if (!statusChangePosted) {
                            statusChangePosted = true;

                            // Delay the event to filter out rapid changes
                            _Global.setTimeout(dispatch, 40);
                        }
                    }
                }

                // Slot Fetching

                function slotFetchInProgress(slot) {
                    var fetchID = slot.fetchID;
                    return fetchID && fetchesInProgress[fetchID];
                }

                function setFetchID(slot, fetchID) {
                    slot.fetchID = fetchID;
                }

                function newFetchID() {
                    var fetchID = nextFetchID;
                    nextFetchID++;

                    fetchesInProgress[fetchID] = true;

                    return fetchID;
                }

                function setFetchIDs(slot, countBefore, countAfter) {
                    var fetchID = newFetchID();
                    setFetchID(slot, fetchID);

                    var slotBefore = slot;
                    while (!slotBefore.firstInSequence && countBefore > 0) {
                        slotBefore = slotBefore.prev;
                        countBefore--;
                        setFetchID(slotBefore, fetchID);
                    }

                    var slotAfter = slot;
                    while (!slotAfter.lastInSequence && countAfter > 0) {
                        slotAfter = slotAfter.next;
                        countAfter--;
                        setFetchID(slotAfter, fetchID);
                    }

                    return fetchID;
                }

                // Adds markers on behalf of the data adapter if their presence can be deduced
                function addMarkers(fetchResult) {
                    var items = fetchResult.items,
                        offset = fetchResult.offset,
                        totalCount = fetchResult.totalCount,
                        absoluteIndex = fetchResult.absoluteIndex,
                        atStart = fetchResult.atStart,
                        atEnd = fetchResult.atEnd;

                    if (isNonNegativeNumber(absoluteIndex)) {
                        if (isNonNegativeNumber(totalCount)) {
                            var itemsLength = items.length;
                            if (absoluteIndex - offset + itemsLength === totalCount) {
                                atEnd = true;
                            }
                        }

                        if (offset === absoluteIndex) {
                            atStart = true;
                        }
                    }

                    if (atStart) {
                        items.unshift(startMarker);
                        fetchResult.offset++;
                    }

                    if (atEnd) {
                        items.push(endMarker);
                    }
                }

                function resultsValid(slot, refreshID, fetchID) {
                    // This fetch has completed, whatever it has returned
                    delete fetchesInProgress[fetchID];

                    if (refreshID !== currentRefreshID || slotPermanentlyRemoved(slot)) {
                        // This information is out of date, or the slot has since been discarded

                        postFetch();
                        return false;
                    }

                    return true;
                }

                function fetchItems(slot, fetchID, promiseItems, index) {
                    var refreshID = currentRefreshID;
                    promiseItems.then(function (fetchResult) {
                        if (fetchResult.items && fetchResult.items.length) {
                            var perfID = "itemsFetched id=" + fetchID + " count=" + fetchResult.items.length;
                            profilerMarkStart(perfID);
                            if (resultsValid(slot, refreshID, fetchID)) {
                                if (+index === index) {
                                    fetchResult.absoluteIndex = index;
                                }
                                addMarkers(fetchResult);
                                processResults(slot, fetchResult.items, fetchResult.offset, fetchResult.totalCount, fetchResult.absoluteIndex);
                            }
                            profilerMarkEnd(perfID);
                        } else {
                            return Promise.wrapError(new _ErrorFromName(FetchError.doesNotExist));
                        }
                    }).then(null, function (error) {
                        if (resultsValid(slot, refreshID, fetchID)) {
                            processErrorResult(slot, error);
                        }
                    });
                }

                function fetchItemsForIndex(indexRequested, slot, fetchID, promiseItems) {
                    var refreshID = currentRefreshID;
                    promiseItems.then(function (fetchResult) {
                        if (fetchResult.items && fetchResult.items.length) {
                            var perfID = "itemsFetched id=" + fetchID + " count=" + fetchResult.items.length;
                            profilerMarkStart(perfID);
                            if (resultsValid(slot, refreshID, fetchID)) {
                                fetchResult.absoluteIndex = indexRequested;
                                addMarkers(fetchResult);
                                processResultsForIndex(indexRequested, slot, fetchResult.items, fetchResult.offset, fetchResult.totalCount, fetchResult.absoluteIndex);
                            }
                            profilerMarkEnd(perfID);
                        } else {
                            return Promise.wrapError(new _ErrorFromName(FetchError.doesNotExist));
                        }
                    }).then(null, function () {
                        if (resultsValid(slot, refreshID, fetchID)) {
                            processErrorResultForIndex(indexRequested, slot, refreshID);
                        }
                    });
                }

                function fetchItemsFromStart(slot, count) {
                    var fetchID = setFetchIDs(slot, 0, count - 1);
                    if (itemsFromStart) {
                        fetchItems(slot, fetchID, itemsFromStart(fetchID, count), 0);
                    } else {
                        fetchItems(slot, fetchID, itemsFromIndex(fetchID, 0, 0, count - 1), 0);
                    }
                }

                function fetchItemsFromEnd(slot, count) {
                    var fetchID = setFetchIDs(slot, count - 1, 0);
                    fetchItems(slot, fetchID, itemsFromEnd(fetchID, count));
                }

                function fetchItemsFromKey(slot, countBefore, countAfter) {
                    var fetchID = setFetchIDs(slot, countBefore, countAfter);
                    fetchItems(slot, fetchID, itemsFromKey(fetchID, slot.key, countBefore, countAfter, slot.hints));
                }

                function fetchItemsFromIndex(slot, countBefore, countAfter) {
                    var index = slot.index;

                    // Don't ask for items with negative indices
                    if (countBefore > index) {
                        countBefore = index;
                    }

                    if (itemsFromIndex) {
                        var fetchID = setFetchIDs(slot, countBefore, countAfter);
                        fetchItems(slot, fetchID, itemsFromIndex(fetchID, index, countBefore, countAfter), index);
                    } else {
                        // If the slot key is known, we just need to request the surrounding items
                        if (slot.key) {
                            fetchItemsFromKey(slot, countBefore, countAfter);
                        } else {
                            // Search for the slot with the closest index that has a known key (using the start of the list as a
                            // last resort).
                            var slotClosest = slotsStart,
                                closestDelta = index + 1,
                                slotSearch,
                                delta;

                            // First search backwards
                            for (slotSearch = slot.prev; slotSearch !== slotsStart; slotSearch = slotSearch.prev) {
                                if (slotSearch.index !== undefined && slotSearch.key) {
                                    delta = index - slotSearch.index;
                                    if (closestDelta > delta) {
                                        closestDelta = delta;
                                        slotClosest = slotSearch;
                                    }
                                    break;
                                }
                            }

                            // Then search forwards
                            for (slotSearch = slot.next; slotSearch !== slotListEnd; slotSearch = slotSearch.next) {
                                if (slotSearch.index !== undefined && slotSearch.key) {
                                    delta = slotSearch.index - index;
                                    if (closestDelta > delta) {
                                        closestDelta = delta;
                                        slotClosest = slotSearch;
                                    }
                                    break;
                                }
                            }

                            if (slotClosest === slotsStart) {
                                var fetchID = setFetchIDs(slot, 0, index + 1);
                                fetchItemsForIndex(0, slot, fetchID, itemsFromStart(fetchID, index + 1));
                            } else {
                                var fetchBefore = Math.max(slotClosest.index - index, 0);
                                var fetchAfter = Math.max(index - slotClosest.index, 0);
                                var fetchID = setFetchIDs(slotClosest, fetchBefore, fetchAfter);
                                fetchItemsForIndex(slotClosest.index, slot, fetchID, itemsFromKey(fetchID,
                                    slotClosest.key,
                                    fetchBefore,
                                    fetchAfter,
                                    slot.hints
                                ));
                            }
                        }
                    }
                }

                function fetchItemsFromDescription(slot, countBefore, countAfter) {
                    var fetchID = setFetchIDs(slot, countBefore, countAfter);
                    fetchItems(slot, fetchID, itemsFromDescription(fetchID, slot.description, countBefore, countAfter));
                }

                function fetchItemsForAllSlots() {
                    if (!refreshInProgress) {
                        var slotFirstPlaceholder,
                            placeholderCount,
                            fetchInProgress = false,
                            fetchesInProgress = false,
                            slotRequestedByKey,
                            requestedKeyOffset,
                            slotRequestedByDescription,
                            requestedDescriptionOffset,
                            slotRequestedByIndex,
                            requestedIndexOffset;

                        for (var slot = slotsStart.next; slot !== slotsEnd;) {
                            var slotNext = slot.next;

                            if (slot !== slotListEnd && isPlaceholder(slot)) {
                                fetchesInProgress = true;

                                if (!slotFirstPlaceholder) {
                                    slotFirstPlaceholder = slot;
                                    placeholderCount = 1;
                                } else {
                                    placeholderCount++;
                                }

                                if (slotFetchInProgress(slot)) {
                                    fetchInProgress = true;
                                }

                                if (slot.keyRequested && !slotRequestedByKey) {
                                    slotRequestedByKey = slot;
                                    requestedKeyOffset = placeholderCount - 1;
                                }

                                if (slot.description !== undefined && !slotRequestedByDescription) {
                                    slotRequestedByDescription = slot;
                                    requestedDescriptionOffset = placeholderCount - 1;
                                }

                                if (slot.indexRequested && !slotRequestedByIndex) {
                                    slotRequestedByIndex = slot;
                                    requestedIndexOffset = placeholderCount - 1;
                                }

                                if (slot.lastInSequence || slotNext === slotsEnd || !isPlaceholder(slotNext)) {
                                    if (fetchInProgress) {
                                        fetchInProgress = false;
                                    } else {
                                        resultsProcessed = false;

                                        // Start a new fetch for this placeholder sequence

                                        // Prefer fetches in terms of a known item
                                        if (!slotFirstPlaceholder.firstInSequence && slotFirstPlaceholder.prev.key && itemsFromKey) {
                                            fetchItemsFromKey(slotFirstPlaceholder.prev, 0, placeholderCount);
                                        } else if (!slot.lastInSequence && slotNext.key && itemsFromKey) {
                                            fetchItemsFromKey(slotNext, placeholderCount, 0);
                                        } else if (slotFirstPlaceholder.prev === slotsStart && !slotFirstPlaceholder.firstInSequence && (itemsFromStart || itemsFromIndex)) {
                                            fetchItemsFromStart(slotFirstPlaceholder, placeholderCount);
                                        } else if (slotNext === slotListEnd && !slot.lastInSequence && itemsFromEnd) {
                                            fetchItemsFromEnd(slot, placeholderCount);
                                        } else if (slotRequestedByKey) {
                                            fetchItemsFromKey(slotRequestedByKey, requestedKeyOffset, placeholderCount - 1 - requestedKeyOffset);
                                        } else if (slotRequestedByDescription) {
                                            fetchItemsFromDescription(slotRequestedByDescription, requestedDescriptionOffset, placeholderCount - 1 - requestedDescriptionOffset);
                                        } else if (slotRequestedByIndex) {
                                            fetchItemsFromIndex(slotRequestedByIndex, requestedIndexOffset, placeholderCount - 1 - requestedIndexOffset);
                                        } else if (typeof slotFirstPlaceholder.index === "number") {
                                            fetchItemsFromIndex(slotFirstPlaceholder, placeholderCount - 1, 0);
                                        } else {
                                            // There is no way to fetch anything in this sequence
                                            deleteMirageSequence(slotFirstPlaceholder);
                                        }

                                        if (resultsProcessed) {
                                            // A re-entrant fetch might have altered the slots list - start again
                                            postFetch();
                                            return;
                                        }

                                        if (refreshInProgress) {
                                            // A re-entrant fetch might also have caused a refresh
                                            return;
                                        }
                                    }

                                    slotFirstPlaceholder = slotRequestedByIndex = slotRequestedByKey = null;
                                }
                            }

                            slot = slotNext;
                        }

                        setStatus(fetchesInProgress ? DataSourceStatus.waiting : DataSourceStatus.ready);
                    }
                }

                function postFetch() {
                    if (!fetchesPosted) {
                        fetchesPosted = true;
                        Scheduler.schedule(function VDS_async_postFetch() {
                            fetchesPosted = false;
                            fetchItemsForAllSlots();

                            // A mirage sequence might have been removed
                            finishNotifications();
                        }, Scheduler.Priority.max, null, "WinJS.UI.ListDataSource._fetch");
                    }
                }

                // Fetch Result Processing

                function itemChanged(slot) {
                    var itemNew = slot.itemNew;

                    if (!itemNew) {
                        return false;
                    }

                    var item = slot.item;

                    for (var property in item) {
                        switch (property) {
                            case "data":
                                // This is handled below
                                break;

                            default:
                                if (item[property] !== itemNew[property]) {
                                    return true;
                                }
                                break;
                        }
                    }

                    return (
                        listDataAdapter.compareByIdentity ?
                            item.data !== itemNew.data :
                            slot.signature !== itemSignature(itemNew)
                    );
                }

                function changeSlotIfNecessary(slot) {
                    if (!slotRequested(slot)) {
                        // There's no need for any notifications, just delete the old item
                        slot.item = null;
                    } else if (itemChanged(slot)) {
                        changeSlot(slot);
                    } else {
                        slot.itemNew = null;
                    }
                }

                function updateSlotItem(slot) {
                    if (slot.item) {
                        changeSlotIfNecessary(slot);
                    } else {
                        completeFetchPromises(slot);
                    }
                }

                function updateSlot(slot, item) {
                    if (!slot.key) {
                        setSlotKey(slot, item.key);
                    }
                    slot.itemNew = item;

                    updateSlotItem(slot);
                }

                function sendMirageNotifications(slot, slotToDiscard, listBindingIDsToDelete) {
                    var bindingMap = slotToDiscard.bindingMap;
                    if (bindingMap) {
                        for (var listBindingID in listBindingIDsToDelete) {
                            if (bindingMap[listBindingID]) {
                                var fetchListeners = slotToDiscard.fetchListeners;
                                for (var listenerID in fetchListeners) {
                                    var listener = fetchListeners[listenerID];

                                    if (listener.listBindingID === listBindingID && listener.retained) {
                                        delete fetchListeners[listenerID];
                                        listener.complete(null);
                                    }
                                }

                                var bindingRecord = bindingMap[listBindingID].bindingRecord;
                                handlerToNotify(bindingRecord).removed(handleForBinding(slotToDiscard, listBindingID), true, handleForBinding(slot, listBindingID));

                                // A re-entrant call to release from the removed handler might have cleared slotToDiscard.bindingMap
                                if (slotToDiscard.bindingMap) {
                                    delete slotToDiscard.bindingMap[listBindingID];
                                }
                            }
                        }
                    }
                }

                function mergeSlots(slot, slotToDiscard) {
                    // This shouldn't be called on a slot that has a pending change notification
                    // Only one of the two slots should have a key
                    // If slotToDiscard is about to acquire an index, send the notifications now; in rare cases, multiple
                    // indexChanged notifications will be sent for a given item during a refresh, but that's fine.
                    if (slot.index !== slotToDiscard.index) {
                        // If slotToDiscard has a defined index, that should have been transferred already
                        var indexOld = slotToDiscard.index;
                        slotToDiscard.index = slot.index;
                        sendIndexChangedNotifications(slotToDiscard, indexOld);
                    }

                    slotToDiscard.slotMergedWith = slot;

                    // Transfer the slotBindings from slotToDiscard to slot
                    var bindingMap = slotToDiscard.bindingMap;
                    for (var listBindingID in bindingMap) {
                        if (!slot.bindingMap) {
                            slot.bindingMap = {};
                        }

                        var slotBinding = bindingMap[listBindingID];

                        if (!slotBinding.handle) {
                            slotBinding.handle = slotToDiscard.handle;
                        }
                        handleMap[slotBinding.handle] = slot;

                        slot.bindingMap[listBindingID] = slotBinding;
                    }

                    // Update any ListBinding cursors pointing to slotToDiscard
                    forEachBindingRecord(function (bindingRecord) {
                        bindingRecord.adjustCurrentSlot(slotToDiscard, slot);
                    });

                    // See if the item needs to be transferred from slotToDiscard to slot
                    var item = slotToDiscard.itemNew || slotToDiscard.item;
                    if (item) {
                        item = Object.create(item);
                        defineCommonItemProperties(item, slot, slot.handle);
                        updateSlot(slot, item);
                    }

                    // Transfer the fetch listeners from slotToDiscard to slot, or complete them if item is known
                    if (slot.item) {
                        if (slotToDiscard.directFetchListeners) {
                            fetchCompleteCallbacks.push(function () {
                                completePromises(slot.item, slotToDiscard.directFetchListeners);
                            });
                        }
                        if (slotToDiscard.fetchListeners) {
                            fetchCompleteCallbacks.push(function () {
                                completePromises(slot.item, slotToDiscard.fetchListeners);
                            });
                        }
                    } else {
                        var listenerID;

                        for (listenerID in slotToDiscard.directFetchListeners) {
                            if (!slot.directFetchListeners) {
                                slot.directFetchListeners = {};
                            }
                            slot.directFetchListeners[listenerID] = slotToDiscard.directFetchListeners[listenerID];
                        }

                        for (listenerID in slotToDiscard.fetchListeners) {
                            if (!slot.fetchListeners) {
                                slot.fetchListeners = {};
                            }
                            slot.fetchListeners[listenerID] = slotToDiscard.fetchListeners[listenerID];
                        }
                    }

                    // This might be the first time this slot's item can be prepared
                    if (slot.itemNew) {
                        completeFetchPromises(slot);
                    }

                    // Give slotToDiscard an unused handle so it appears to be permanently removed
                    slotToDiscard.handle = (nextHandle++).toString();

                    splitSequence(slotToDiscard);
                    removeSlotPermanently(slotToDiscard);
                }

                function mergeSlotsAndItem(slot, slotToDiscard, item) {
                    if (slotToDiscard && slotToDiscard.key) {
                        if (!item) {
                            item = slotToDiscard.itemNew || slotToDiscard.item;
                        }

                        // Free up the key for the promoted slot
                        delete slotToDiscard.key;
                        delete keyMap[item.key];

                        slotToDiscard.itemNew = null;
                        slotToDiscard.item = null;
                    }

                    if (item) {
                        updateSlot(slot, item);
                    }

                    if (slotToDiscard) {
                        mergeSlots(slot, slotToDiscard);
                    }
                }

                function slotFromResult(result) {
                    if (typeof result !== "object") {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidItemReturned", strings.invalidItemReturned);
                    } else if (result === startMarker) {
                        return slotsStart;
                    } else if (result === endMarker) {
                        return slotListEnd;
                    } else if (!result.key) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidKeyReturned", strings.invalidKeyReturned);
                    } else {
                        if (_BaseUtils.validation) {
                            validateKey(result.key);
                        }
                        return keyMap[result.key];
                    }
                }

                function matchSlot(slot, result) {
                    // First see if there is an existing slot that needs to be merged
                    var slotExisting = slotFromResult(result);
                    if (slotExisting === slot) {
                        slotExisting = null;
                    }

                    if (slotExisting) {
                        sendMirageNotifications(slot, slotExisting, slot.bindingMap);
                    }

                    mergeSlotsAndItem(slot, slotExisting, result);
                }

                function promoteSlot(slot, item, index, insertionPoint) {
                    if (item && slot.key && slot.key !== item.key) {
                        // A contradiction has been found
                        beginRefresh();
                        return false;
                    }

                    // The slot with the key "wins"; slots without bindings can be merged without any change in observable behavior

                    var slotWithIndex = indexMap[index];
                    if (slotWithIndex) {
                        if (slotWithIndex === slot) {
                            slotWithIndex = null;
                        } else if (slotWithIndex.key && (slot.key || (item && slotWithIndex.key !== item.key))) {
                            // A contradiction has been found
                            beginRefresh();
                            return false;
                        } else if (!slot.key && slotWithIndex.bindingMap) {
                            return false;
                        }
                    }

                    var slotWithKey;
                    if (item) {
                        slotWithKey = keyMap[item.key];

                        if (slotWithKey === slot) {
                            slotWithKey = null;
                        } else if (slotWithKey && slotWithKey.bindingMap) {
                            return false;
                        }
                    }

                    if (slotWithIndex) {
                        sendMirageNotifications(slot, slotWithIndex, slot.bindingMap);

                        // Transfer the index to the promoted slot
                        delete indexMap[index];
                        changeSlotIndex(slot, index);

                        // See if this sequence should be merged with its neighbors
                        if (slot.prev.index === index - 1) {
                            mergeSequences(slot.prev);
                        }
                        if (slot.next.index === index + 1) {
                            mergeSequences(slot);
                        }

                        insertionPoint.slotNext = slotWithIndex.slotNext;

                        if (!item) {
                            item = slotWithIndex.itemNew || slotWithIndex.item;
                            if (item) {
                                slotWithKey = keyMap[item.key];
                            }
                        }
                    } else {
                        changeSlotIndex(slot, index);
                    }

                    if (slotWithKey && slotWithIndex !== slotWithKey) {
                        sendMirageNotifications(slot, slotWithKey, slot.bindingMap);
                    }

                    mergeSlotsAndItem(slot, slotWithKey, item);

                    // Do this after mergeSlotsAndItem, since its call to updateSlot might send changed notifications, and those
                    // wouldn't make sense to clients that never saw the old item.
                    if (slotWithIndex && slotWithIndex !== slotWithKey) {
                        mergeSlots(slot, slotWithIndex);
                    }

                    return true;
                }

                function mergeAdjacentSlot(slotExisting, slot, listBindingIDsToDelete) {
                    if (slot.key && slotExisting.key && slot.key !== slotExisting.key) {
                        // A contradiction has been found
                        beginRefresh();
                        return false;
                    }

                    for (var listBindingID in slotExisting.bindingMap) {
                        listBindingIDsToDelete[listBindingID] = true;
                    }

                    sendMirageNotifications(slotExisting, slot, listBindingIDsToDelete);
                    mergeSlotsAndItem(slotExisting, slot);

                    return true;
                }

                function mergeSlotsBefore(slot, slotExisting) {
                    var listBindingIDsToDelete = {};

                    while (slot) {
                        var slotPrev = (slot.firstInSequence ? null : slot.prev);

                        if (!slotExisting.firstInSequence && slotExisting.prev === slotsStart) {
                            deleteSlot(slot, true);
                        } else {
                            if (slotExisting.firstInSequence) {
                                slotExisting = addSlotBefore(slotExisting, indexMap);
                            } else {
                                slotExisting = slotExisting.prev;
                            }

                            if (!mergeAdjacentSlot(slotExisting, slot, listBindingIDsToDelete)) {
                                return;
                            }
                        }

                        slot = slotPrev;
                    }
                }

                function mergeSlotsAfter(slot, slotExisting) {
                    var listBindingIDsToDelete = {};

                    while (slot) {
                        var slotNext = (slot.lastInSequence ? null : slot.next);

                        if (!slotExisting.lastInSequence && slotExisting.next === slotListEnd) {
                            deleteSlot(slot, true);
                        } else {
                            if (slotExisting.lastInSequence) {
                                slotExisting = addSlotAfter(slotExisting, indexMap);
                            } else {
                                slotExisting = slotExisting.next;
                            }

                            if (!mergeAdjacentSlot(slotExisting, slot, listBindingIDsToDelete)) {
                                return;
                            }
                        }

                        slot = slotNext;
                    }
                }

                function mergeSequencePairs(sequencePairsToMerge) {
                    for (var i = 0; i < sequencePairsToMerge.length; i++) {
                        var sequencePairToMerge = sequencePairsToMerge[i];
                        mergeSlotsBefore(sequencePairToMerge.slotBeforeSequence, sequencePairToMerge.slotFirstInSequence);
                        mergeSlotsAfter(sequencePairToMerge.slotAfterSequence, sequencePairToMerge.slotLastInSequence);
                    }
                }

                // Removes any placeholders with indices that exceed the given upper bound on the count
                function removeMirageIndices(countMax, indexFirstKnown) {
                    var placeholdersAtEnd = 0;

                    function removePlaceholdersAfterSlot(slotRemoveAfter) {
                        for (var slot2 = slotListEnd.prev; !(slot2.index < countMax) && slot2 !== slotRemoveAfter;) {
                            var slotPrev2 = slot2.prev;
                            if (slot2.index !== undefined) {
                                deleteSlot(slot2, true);
                            }
                            slot2 = slotPrev2;
                        }

                        placeholdersAtEnd = 0;
                    }

                    for (var slot = slotListEnd.prev; !(slot.index < countMax) || placeholdersAtEnd > 0;) {
                        var slotPrev = slot.prev;

                        if (slot === slotsStart) {
                            removePlaceholdersAfterSlot(slotsStart);
                            break;
                        } else if (slot.key) {
                            if (slot.index >= countMax) {
                                beginRefresh();
                                return false;
                            } else if (slot.index >= indexFirstKnown) {
                                removePlaceholdersAfterSlot(slot);
                            } else {
                                if (itemsFromKey) {
                                    fetchItemsFromKey(slot, 0, placeholdersAtEnd);
                                } else {
                                    fetchItemsFromIndex(slot, 0, placeholdersAtEnd);
                                }

                                // Wait until the fetch has completed before doing anything
                                return false;
                            }
                        } else if (slot.indexRequested || slot.firstInSequence) {
                            removePlaceholdersAfterSlot(slotPrev);
                        } else {
                            placeholdersAtEnd++;
                        }

                        slot = slotPrev;
                    }

                    return true;
                }

                // Merges the results of a fetch into the slot list data structure, and determines if any notifications need to be
                // synthesized.
                function processResults(slot, results, offset, count, index) {
                    var perfId = "WinJS.UI.ListDataSource.processResults";
                    profilerMarkStart(perfId);

                    index = validateIndexReturned(index);
                    count = validateCountReturned(count);

                    // If there are edits queued, we need to wait until the slots get back in sync with the data
                    if (editsQueued) {
                        profilerMarkEnd(perfId);
                        return;
                    }

                    if (indexUpdateDeferred) {
                        updateIndices();
                    }

                    // If the count has changed, and the end of the list has been reached, that's a contradiction
                    if ((isNonNegativeNumber(count) || count === CountResult.unknown) && count !== knownCount && !slotListEnd.firstInSequence) {
                        beginRefresh();
                        profilerMarkEnd(perfId);
                        return;
                    }

                    resultsProcessed = true;

                    (function () {
                        var i,
                            j,
                            resultsCount = results.length,
                            slotExisting,
                            slotBefore;

                        // If an index wasn't passed in, see if the indices of these items can be determined
                        if (typeof index !== "number") {
                            for (i = 0; i < resultsCount; i++) {
                                slotExisting = slotFromResult(results[i]);
                                if (slotExisting && slotExisting.index !== undefined) {
                                    index = slotExisting.index + offset - i;
                                    break;
                                }
                            }
                        }

                        // See if these results include the end of the list
                        if (typeof index === "number" && results[resultsCount - 1] === endMarker) {
                            // If the count wasn't known, it is now
                            count = index - offset + resultsCount - 1;
                        } else if (isNonNegativeNumber(count) && (index === undefined || index === null)) {
                            // If the index wasn't known, it is now
                            index = count - (resultsCount - 1) + offset;
                        }

                        // If the count is known, remove any mirage placeholders at the end
                        if (isNonNegativeNumber(count) && !removeMirageIndices(count, index - offset)) {
                            // "Forget" the count - a subsequent fetch or refresh will update the count and list end
                            count = undefined;
                        }

                        // Find any existing slots that correspond to the results, and check for contradictions
                        var offsetMap = new Array(resultsCount);
                        for (i = 0; i < resultsCount; i++) {
                            var slotBestMatch = null;

                            slotExisting = slotFromResult(results[i]);

                            if (slotExisting) {
                                // See if this item is currently adjacent to a different item, or has a different index
                                if ((i > 0 && !slotExisting.firstInSequence && slotExisting.prev.key && slotExisting.prev.key !== results[i - 1].key) ||
                                        (typeof index === "number" && slotExisting.index !== undefined && slotExisting.index !== index - offset + i)) {
                                    // A contradiction has been found, so we can't proceed further
                                    beginRefresh();
                                    return;
                                }

                                if (slotExisting === slotsStart || slotExisting === slotListEnd || slotExisting.bindingMap) {
                                    // First choice is a slot with the given key and at least one binding (or an end of the list)
                                    slotBestMatch = slotExisting;
                                }
                            }

                            if (typeof index === "number") {
                                slotExisting = indexMap[index - offset + i];

                                if (slotExisting) {
                                    if (slotExisting.key && slotExisting.key !== results[i].key) {
                                        // A contradiction has been found, so we can't proceed further
                                        beginRefresh();
                                        return;
                                    }

                                    if (!slotBestMatch && slotExisting.bindingMap) {
                                        // Second choice is a slot with the given index and at least one binding
                                        slotBestMatch = slotExisting;
                                    }
                                }
                            }

                            if (i === offset) {
                                if ((slot.key && slot.key !== results[i].key) || (typeof slot.index === "number" && typeof index === "number" && slot.index !== index)) {
                                    // A contradiction has been found, so we can't proceed further
                                    beginRefresh();
                                    return;
                                }

                                if (!slotBestMatch) {
                                    // Third choice is the slot that was passed in
                                    slotBestMatch = slot;
                                }
                            }

                            offsetMap[i] = slotBestMatch;
                        }

                        // Update items with known indices (and at least one binding) first, as they will not be merged with
                        // anything.
                        for (i = 0; i < resultsCount; i++) {
                            slotExisting = offsetMap[i];
                            if (slotExisting && slotExisting.index !== undefined && slotExisting !== slotsStart && slotExisting !== slotListEnd) {
                                matchSlot(slotExisting, results[i]);
                            }
                        }

                        var sequencePairsToMerge = [];

                        // Now process the sequences without indices
                        var firstSequence = true;
                        var slotBeforeSequence;
                        var slotAfterSequence;
                        for (i = 0; i < resultsCount; i++) {
                            slotExisting = offsetMap[i];
                            if (slotExisting && slotExisting !== slotListEnd) {
                                var iLast = i;

                                if (slotExisting.index === undefined) {
                                    var insertionPoint = {};

                                    promoteSlot(slotExisting, results[i], index - offset + i, insertionPoint);

                                    // Find the extents of the sequence of slots that we can use
                                    var slotFirstInSequence = slotExisting,
                                        slotLastInSequence = slotExisting,
                                        result;

                                    for (j = i - 1; !slotFirstInSequence.firstInSequence; j--) {
                                        // Keep going until we hit the start marker or a slot that we can't use or promote (it's ok
                                        // if j leaves the results range).

                                        result = results[j];
                                        if (result === startMarker) {
                                            break;
                                        }

                                        // Avoid assigning negative indices to slots
                                        var index2 = index - offset + j;
                                        if (index2 < 0) {
                                            break;
                                        }

                                        if (promoteSlot(slotFirstInSequence.prev, result, index2, insertionPoint)) {
                                            slotFirstInSequence = slotFirstInSequence.prev;
                                            if (j >= 0) {
                                                offsetMap[j] = slotFirstInSequence;
                                            }
                                        } else {
                                            break;
                                        }
                                    }

                                    for (j = i + 1; !slotLastInSequence.lastInSequence; j++) {
                                        // Keep going until we hit the end marker or a slot that we can't use or promote (it's ok
                                        // if j leaves the results range).

                                        // If slotListEnd is in this sequence, it should not be separated from any predecessor
                                        // slots, but they may need to be promoted.
                                        result = results[j];
                                        if ((result === endMarker || j === count) && slotLastInSequence.next !== slotListEnd) {
                                            break;
                                        }

                                        if (slotLastInSequence.next === slotListEnd || promoteSlot(slotLastInSequence.next, result, index - offset + j, insertionPoint)) {
                                            slotLastInSequence = slotLastInSequence.next;
                                            if (j < resultsCount) {
                                                offsetMap[j] = slotLastInSequence;
                                            }

                                            iLast = j;

                                            if (slotLastInSequence === slotListEnd) {
                                                break;
                                            }
                                        } else {
                                            break;
                                        }
                                    }

                                    slotBeforeSequence = (slotFirstInSequence.firstInSequence ? null : slotFirstInSequence.prev);
                                    slotAfterSequence = (slotLastInSequence.lastInSequence ? null : slotLastInSequence.next);

                                    if (slotBeforeSequence) {
                                        splitSequence(slotBeforeSequence);
                                    }
                                    if (slotAfterSequence) {
                                        splitSequence(slotLastInSequence);
                                    }

                                    // Move the sequence if necessary
                                    if (typeof index === "number") {
                                        if (slotLastInSequence === slotListEnd) {
                                            // Instead of moving the list end, move the sequence before out of the way
                                            if (slotBeforeSequence) {
                                                moveSequenceAfter(slotListEnd, sequenceStart(slotBeforeSequence), slotBeforeSequence);
                                            }
                                        } else {
                                            var slotInsertBefore = insertionPoint.slotNext;
                                            if (!slotInsertBefore) {
                                                slotInsertBefore = successorFromIndex(slotLastInSequence.index, indexMap, slotsStart, slotListEnd, true);
                                            }
                                            moveSequenceBefore(slotInsertBefore, slotFirstInSequence, slotLastInSequence);
                                        }
                                        if (slotFirstInSequence.prev.index === slotFirstInSequence.index - 1) {
                                            mergeSequences(slotFirstInSequence.prev);
                                        }
                                        if (slotLastInSequence.next.index === slotLastInSequence.index + 1) {
                                            mergeSequences(slotLastInSequence);
                                        }
                                    } else if (!firstSequence) {
                                        slotBefore = offsetMap[i - 1];

                                        if (slotBefore) {
                                            if (slotFirstInSequence.prev !== slotBefore) {
                                                if (slotLastInSequence === slotListEnd) {
                                                    // Instead of moving the list end, move the sequence before out of the way and
                                                    // the predecessor sequence into place.
                                                    if (slotBeforeSequence) {
                                                        moveSequenceAfter(slotListEnd, sequenceStart(slotBeforeSequence), slotBeforeSequence);
                                                    }
                                                    moveSequenceBefore(slotFirstInSequence, sequenceStart(slotBefore), slotBefore);
                                                } else {
                                                    moveSequenceAfter(slotBefore, slotFirstInSequence, slotLastInSequence);
                                                }
                                            }
                                            mergeSequences(slotBefore);
                                        }
                                    }
                                    firstSequence = false;

                                    if (refreshRequested) {
                                        return;
                                    }

                                    sequencePairsToMerge.push({
                                        slotBeforeSequence: slotBeforeSequence,
                                        slotFirstInSequence: slotFirstInSequence,
                                        slotLastInSequence: slotLastInSequence,
                                        slotAfterSequence: slotAfterSequence
                                    });
                                }

                                // See if the fetched slot needs to be merged
                                if (i === offset && slotExisting !== slot && !slotPermanentlyRemoved(slot)) {
                                    slotBeforeSequence = (slot.firstInSequence ? null : slot.prev);
                                    slotAfterSequence = (slot.lastInSequence ? null : slot.next);

                                    sendMirageNotifications(slotExisting, slot, slotExisting.bindingMap);
                                    mergeSlots(slotExisting, slot);

                                    sequencePairsToMerge.push({
                                        slotBeforeSequence: slotBeforeSequence,
                                        slotFirstInSequence: slotExisting,
                                        slotLastInSequence: slotExisting,
                                        slotAfterSequence: slotAfterSequence
                                    });
                                }

                                // Skip past all the other items in the sequence we just processed
                                i = iLast;
                            }
                        }

                        // If the count is known, set the index of the list end (wait until now because promoteSlot can sometimes
                        // delete it; do this before mergeSequencePairs so the list end can have slots inserted immediately before
                        // it).
                        if (isNonNegativeNumber(count) && slotListEnd.index !== count) {
                            changeSlotIndex(slotListEnd, count);
                        }

                        // Now that all the sequences have been moved, merge any colliding slots
                        mergeSequencePairs(sequencePairsToMerge);

                        // Match or cache any leftover items
                        for (i = 0; i < resultsCount; i++) {
                            // Find the first matched item
                            slotExisting = offsetMap[i];
                            if (slotExisting) {
                                for (j = i - 1; j >= 0; j--) {
                                    var slotAfter = offsetMap[j + 1];
                                    matchSlot(offsetMap[j] = (slotAfter.firstInSequence ? addSlotBefore(offsetMap[j + 1], indexMap) : slotAfter.prev), results[j]);
                                }
                                for (j = i + 1; j < resultsCount; j++) {
                                    slotBefore = offsetMap[j - 1];
                                    slotExisting = offsetMap[j];
                                    if (!slotExisting) {
                                        matchSlot(offsetMap[j] = (slotBefore.lastInSequence ? addSlotAfter(slotBefore, indexMap) : slotBefore.next), results[j]);
                                    } else if (slotExisting.firstInSequence) {
                                        // Adding the cached items may result in some sequences merging
                                        if (slotExisting.prev !== slotBefore) {
                                            moveSequenceAfter(slotBefore, slotExisting, sequenceEnd(slotExisting));
                                        }
                                        mergeSequences(slotBefore);
                                    }
                                }
                                break;
                            }
                        }

                        // The description is no longer required
                        delete slot.description;
                    })();

                    if (!refreshRequested) {
                        // If the count changed, but that's the only thing, just send the notification
                        if (count !== undefined && count !== knownCount) {
                            changeCount(count);
                        }

                        // See if there are more requests we can now fulfill
                        postFetch();
                    }

                    finishNotifications();

                    // Finally complete any promises for newly obtained items
                    callFetchCompleteCallbacks();
                    profilerMarkEnd(perfId);
                }

                function processErrorResult(slot, error) {
                    switch (error.name) {
                        case FetchError.noResponse:
                            setStatus(DataSourceStatus.failure);
                            returnDirectFetchError(slot, error);
                            break;

                        case FetchError.doesNotExist:
                            // Don't return an error, just complete with null (when the slot is deleted)

                            if (slot.indexRequested) {
                                // We now have an upper bound on the count
                                removeMirageIndices(slot.index);
                            } else if (slot.keyRequested || slot.description) {
                                // This item, and any items in the same sequence, count as mirages, since they might never have
                                // existed.
                                deleteMirageSequence(slot);
                            }

                            finishNotifications();

                            // It's likely that the client requested this item because something has changed since the client's
                            // latest observations of the data.  Begin a refresh just in case.
                            beginRefresh();
                            break;
                    }
                }

                function processResultsForIndex(indexRequested, slot, results, offset, count, index) {
                    index = validateIndexReturned(index);
                    count = validateCountReturned(count);

                    var indexFirst = indexRequested - offset;

                    var resultsCount = results.length;
                    if (slot.index >= indexFirst && slot.index < indexFirst + resultsCount) {
                        // The item is in this batch of results - process them all
                        processResults(slot, results, slot.index - indexFirst, count, slot.index);
                    } else if ((offset === resultsCount - 1 && indexRequested < slot.index) || (isNonNegativeNumber(count) && count <= slot.index)) {
                        // The requested index does not exist
                        processErrorResult(slot, new _ErrorFromName(FetchError.doesNotExist));
                    } else {
                        // We didn't get all the results we requested - pick up where they left off
                        if (slot.index < indexFirst) {
                            var fetchID = setFetchIDs(slot, 0, indexFirst - slot.index);
                            fetchItemsForIndex(indexFirst, slot, fetchID, itemsFromKey(
                                fetchID,
                                results[0].key,
                                indexFirst - slot.index,
                                0
                            ));
                        } else {
                            var indexLast = indexFirst + resultsCount - 1;
                            var fetchID = setFetchIDs(slot, slot.index - indexLast, 0);
                            fetchItemsForIndex(indexLast, slot, fetchID, itemsFromKey(
                                fetchID,
                                results[resultsCount - 1].key,
                                0,
                                slot.index - indexLast
                            ));
                        }
                    }
                }

                function processErrorResultForIndex(indexRequested, slot, error) {
                    // If the request was for an index other than the initial one, and the result was doesNotExist, this doesn't
                    switch (error.name) {
                        case FetchError.doesNotExist:
                            if (indexRequested === slotsStart.index) {
                                // The request was for the start of the list, so the item must not exist, and we now have an upper
                                // bound of zero for the count.
                                removeMirageIndices(0);

                                processErrorResult(slot, error);

                                // No need to check return value of removeMirageIndices, since processErrorResult is going to start
                                // a refresh anyway.
                            } else {
                                // Something has changed, but this index might still exist, so request a refresh
                                beginRefresh();
                            }
                            break;

                        default:
                            processErrorResult(slot, error);
                            break;
                    }
                }

                // Refresh

                function identifyRefreshCycle() {
                    // find refresh cycles, find the first beginRefresh in the refreshHistory and see whether it 
                    // matches the next beginRefresh, if so then move the data source into an error state and stop 
                    // refreshing.
                    var start = 0;
                    for (; start < refreshHistory.length; start++) {
                        if (refreshHistory[start].kind === "beginRefresh") {
                            break;
                        }
                    }
                    var end = start;
                    for (; end < refreshHistory.length; end++) {
                        if (refreshHistory[end].kind === "beginRefresh") {
                            break;
                        }
                    }
                    if (end > start && (end + (end - start) < refreshHistory.length)) {
                        var match = true;
                        var length = end - start;
                        for (var i = 0; i < length; i++) {
                            if (refreshHistory[start + i].kind !== refreshHistory[end + i].kind) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            if (_Log.log) {
                                _Log.log(strings.refreshCycleIdentified, "winjs vds", "error");
                                for (var i = start; i < end; i++) {
                                    _Log.log("" + (i - start) + ": " + JSON.stringify(refreshHistory[i]), "winjs vds", "error");
                                }
                            }
                        }
                        return match;
                    }
                }

                function resetRefreshState() {
                    if (++beginRefreshCount > MAX_BEGINREFRESH_COUNT) {
                        if (identifyRefreshCycle()) {
                            setStatus(DataSourceStatus.failure);
                            return;
                        }
                    }
                    refreshHistory[++refreshHistoryPos % refreshHistory.length] = { kind: "beginRefresh" };

                    // Give the start sentinel an index so we can always use predecessor + 1
                    refreshStart = {
                        firstInSequence: true,
                        lastInSequence: true,
                        index: -1
                    };
                    refreshEnd = {
                        firstInSequence: true,
                        lastInSequence: true
                    };
                    refreshStart.next = refreshEnd;
                    refreshEnd.prev = refreshStart;

                    refreshItemsFetched = false;
                    refreshCount = undefined;
                    keyFetchIDs = {};
                    refreshKeyMap = {};
                    refreshIndexMap = {};
                    refreshIndexMap[-1] = refreshStart;
                    deletedKeys = {};
                }

                function beginRefresh() {
                    if (refreshRequested) {
                        // There's already a refresh that has yet to start
                        return;
                    }

                    refreshRequested = true;

                    setStatus(DataSourceStatus.waiting);

                    if (waitForRefresh) {
                        waitForRefresh = false;

                        // The edit queue has been paused until the next refresh - resume it now
                        applyNextEdit();
                        return;
                    }

                    if (editsQueued) {
                        // The refresh will be started once the edit queue empties out
                        return;
                    }

                    var refreshID = ++currentRefreshID;
                    refreshInProgress = true;
                    refreshFetchesInProgress = 0;

                    // Batch calls to beginRefresh
                    Scheduler.schedule(function VDS_async_beginRefresh() {
                        if (currentRefreshID !== refreshID) {
                            return;
                        }

                        refreshRequested = false;

                        resetRefreshState();

                        // Remove all slots that aren't live, so we don't waste time fetching them
                        for (var slot = slotsStart.next; slot !== slotsEnd;) {
                            var slotNext = slot.next;

                            if (!slotLive(slot) && slot !== slotListEnd) {
                                deleteUnnecessarySlot(slot);
                            }

                            slot = slotNext;
                        }

                        startRefreshFetches();
                    }, Scheduler.Priority.high, null, "WinJS.VirtualizedDataSource.beginRefresh");
                }

                function requestRefresh() {
                    refreshSignal = refreshSignal || new _Signal();

                    beginRefresh();

                    return refreshSignal.promise;
                }

                function resultsValidForRefresh(refreshID, fetchID) {
                    // This fetch has completed, whatever it has returned
                    delete fetchesInProgress[fetchID];

                    if (refreshID !== currentRefreshID) {
                        // This information is out of date.  Ignore it.
                        return false;
                    }

                    refreshFetchesInProgress--;

                    return true;
                }

                function fetchItemsForRefresh(key, fromStart, fetchID, promiseItems, index) {
                    var refreshID = currentRefreshID;

                    refreshFetchesInProgress++;

                    promiseItems.then(function (fetchResult) {
                        if (fetchResult.items && fetchResult.items.length) {
                            var perfID = "itemsFetched id=" + fetchID + " count=" + fetchResult.items.length;
                            profilerMarkStart(perfID);
                            if (resultsValidForRefresh(refreshID, fetchID)) {
                                addMarkers(fetchResult);
                                processRefreshResults(key, fetchResult.items, fetchResult.offset, fetchResult.totalCount, (typeof index === "number" ? index : fetchResult.absoluteIndex));
                            }
                            profilerMarkEnd(perfID);
                        } else {
                            return Promise.wrapError(new _ErrorFromName(FetchError.doesNotExist));
                        }
                    }).then(null, function (error) {
                        if (resultsValidForRefresh(refreshID, fetchID)) {
                            processRefreshErrorResult(key, fromStart, error);
                        }
                    });
                }

                function refreshRange(slot, fetchID, countBefore, countAfter) {
                    if (itemsFromKey) {
                        // Keys are the preferred identifiers when the item might have moved
                        fetchItemsForRefresh(slot.key, false, fetchID, itemsFromKey(fetchID, slot.key, countBefore, countAfter, slot.hints));
                    } else {
                        // Request additional items to try to locate items that have moved
                        var searchDelta = 10,
                            index = slot.index;

                        if (refreshIndexMap[index] && refreshIndexMap[index].firstInSequence) {
                            // Ensure at least one element is observed before this one
                            fetchItemsForRefresh(slot.key, false, fetchID, itemsFromIndex(fetchID, index - 1, Math.min(countBefore + searchDelta, index) - 1, countAfter + 1 + searchDelta), index - 1);
                        } else if (refreshIndexMap[index] && refreshIndexMap[index].lastInSequence) {
                            // Ask for the next index we need directly
                            fetchItemsForRefresh(slot.key, false, fetchID, itemsFromIndex(fetchID, index + 1, Math.min(countBefore + searchDelta, index) + 1, countAfter - 1 + searchDelta), index + 1);
                        } else {
                            fetchItemsForRefresh(slot.key, false, fetchID, itemsFromIndex(fetchID, index, Math.min(countBefore + searchDelta, index), countAfter + searchDelta), index);
                        }
                    }
                }

                function refreshFirstItem(fetchID) {
                    if (itemsFromStart) {
                        fetchItemsForRefresh(null, true, fetchID, itemsFromStart(fetchID, 1), 0);
                    } else if (itemsFromIndex) {
                        fetchItemsForRefresh(null, true, fetchID, itemsFromIndex(fetchID, 0, 0, 0), 0);
                    }
                }

                function keyFetchInProgress(key) {
                    return fetchesInProgress[keyFetchIDs[key]];
                }

                function refreshRanges(slotFirst, allRanges) {
                    // Fetch a few extra items each time, to catch insertions without requiring an extra fetch
                    var refreshFetchExtra = 3;

                    var refreshID = currentRefreshID;

                    var slotFetchFirst,
                        slotRefreshFirst,
                        fetchCount = 0,
                        fetchID;

                    // Walk through the slot list looking for keys we haven't fetched or attempted to fetch yet.  Rely on the
                    // heuristic that items that were close together before the refresh are likely to remain so after, so batched
                    // fetches will locate most of the previously fetched items.
                    for (var slot = slotFirst; slot !== slotsEnd; slot = slot.next) {
                        if (!slotFetchFirst && slot.key && !deletedKeys[slot.key] && !keyFetchInProgress(slot.key)) {
                            var slotRefresh = refreshKeyMap[slot.key];

                            // Keep attempting to fetch an item until at least one item on either side of it has been observed, so
                            // we can determine its position relative to others.
                            if (!slotRefresh || slotRefresh.firstInSequence || slotRefresh.lastInSequence) {
                                slotFetchFirst = slot;
                                slotRefreshFirst = slotRefresh;
                                fetchID = newFetchID();
                            }
                        }

                        if (!slotFetchFirst) {
                            // Also attempt to fetch placeholders for requests for specific keys, just in case those items no
                            // longer exist.
                            if (slot.key && isPlaceholder(slot) && !deletedKeys[slot.key]) {
                                // Fulfill each "itemFromKey" request
                                if (!refreshKeyMap[slot.key]) {
                                    // Fetch at least one item before and after, just to verify item's position in list
                                    fetchID = newFetchID();
                                    fetchItemsForRefresh(slot.key, false, fetchID, itemsFromKey(fetchID, slot.key, 1, 1, slot.hints));
                                }
                            }
                        } else {
                            var keyAlreadyFetched = keyFetchInProgress(slot.key);

                            if (!deletedKeys[slot.key] && !refreshKeyMap[slot.key] && !keyAlreadyFetched) {
                                if (slot.key) {
                                    keyFetchIDs[slot.key] = fetchID;
                                }
                                fetchCount++;
                            }

                            if (slot.lastInSequence || slot.next === slotListEnd || keyAlreadyFetched) {
                                refreshRange(slotFetchFirst, fetchID, (!slotRefreshFirst || slotRefreshFirst.firstInSequence ? refreshFetchExtra : 0), fetchCount - 1 + refreshFetchExtra);

                                if (!allRanges) {
                                    break;
                                }

                                slotFetchFirst = null;
                                fetchCount = 0;
                            }
                        }
                    }

                    if (refreshFetchesInProgress === 0 && !refreshItemsFetched && currentRefreshID === refreshID) {
                        // If nothing was successfully fetched, try fetching the first item, to detect an empty list
                        refreshFirstItem(newFetchID());
                    }

                }

                function startRefreshFetches() {
                    var refreshID = currentRefreshID;

                    do {
                        synchronousProgress = false;
                        reentrantContinue = true;
                        refreshRanges(slotsStart.next, true);
                        reentrantContinue = false;
                    } while (refreshFetchesInProgress === 0 && synchronousProgress && currentRefreshID === refreshID && refreshInProgress);

                    if (refreshFetchesInProgress === 0 && currentRefreshID === refreshID) {
                        concludeRefresh();
                    }
                }

                function continueRefresh(key) {
                    var refreshID = currentRefreshID;

                    // If the key is absent, then the attempt to fetch the first item just completed, and there is nothing else to
                    // fetch.
                    if (key) {
                        var slotContinue = keyMap[key];
                        if (!slotContinue) {
                            // In a rare case, the slot might have been deleted; just start scanning from the beginning again
                            slotContinue = slotsStart.next;
                        }

                        do {
                            synchronousRefresh = false;
                            reentrantRefresh = true;
                            refreshRanges(slotContinue, false);
                            reentrantRefresh = false;
                        } while (synchronousRefresh && currentRefreshID === refreshID && refreshInProgress);
                    }

                    if (reentrantContinue) {
                        synchronousProgress = true;
                    } else {
                        if (refreshFetchesInProgress === 0 && currentRefreshID === refreshID) {
                            // Walk through the entire list one more time, in case any edits were made during the refresh
                            startRefreshFetches();
                        }
                    }
                }

                function slotRefreshFromResult(result) {
                    if (typeof result !== "object" || !result) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidItemReturned", strings.invalidItemReturned);
                    } else if (result === startMarker) {
                        return refreshStart;
                    } else if (result === endMarker) {
                        return refreshEnd;
                    } else if (!result.key) {
                        throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidKeyReturned", strings.invalidKeyReturned);
                    } else {
                        return refreshKeyMap[result.key];
                    }
                }

                function processRefreshSlotIndex(slot, expectedIndex) {
                    while (slot.index === undefined) {
                        setSlotIndex(slot, expectedIndex, refreshIndexMap);

                        if (slot.firstInSequence) {
                            return true;
                        }

                        slot = slot.prev;
                        expectedIndex--;
                    }

                    if (slot.index !== expectedIndex) {
                        // Something has changed since the refresh began; start again
                        beginRefresh();
                        return false;
                    }

                    return true;
                }

                function setRefreshSlotResult(slotRefresh, result) {
                    slotRefresh.key = result.key;
                    refreshKeyMap[slotRefresh.key] = slotRefresh;

                    slotRefresh.item = result;
                }

                // Returns the slot after the last insertion point between sequences
                function lastRefreshInsertionPoint() {
                    var slotNext = refreshEnd;
                    while (!slotNext.firstInSequence) {
                        slotNext = slotNext.prev;

                        if (slotNext === refreshStart) {
                            return null;
                        }
                    }

                    return slotNext;
                }

                function processRefreshResults(key, results, offset, count, index) {
                    index = validateIndexReturned(index);
                    count = validateCountReturned(count);

                    var keyPresent = false;

                    refreshItemsFetched = true;

                    var indexFirst = index - offset,
                        result = results[0];

                    if (result.key === key) {
                        keyPresent = true;
                    }

                    var slot = slotRefreshFromResult(result);
                    if (!slot) {
                        if (refreshIndexMap[indexFirst]) {
                            // Something has changed since the refresh began; start again
                            beginRefresh();
                            return;
                        }

                        // See if these results should be appended to an existing sequence
                        var slotPrev;
                        if (index !== undefined && (slotPrev = refreshIndexMap[indexFirst - 1])) {
                            if (!slotPrev.lastInSequence) {
                                // Something has changed since the refresh began; start again
                                beginRefresh();
                                return;
                            }
                            slot = addSlotAfter(slotPrev, refreshIndexMap);
                        } else {
                            // Create a new sequence
                            var slotSuccessor = (
                                +indexFirst === indexFirst ?
                                    successorFromIndex(indexFirst, refreshIndexMap, refreshStart, refreshEnd) :
                                    lastRefreshInsertionPoint(refreshStart, refreshEnd)
                            );

                            if (!slotSuccessor) {
                                // Something has changed since the refresh began; start again
                                beginRefresh();
                                return;
                            }

                            slot = createSlotSequence(slotSuccessor, indexFirst, refreshIndexMap);
                        }

                        setRefreshSlotResult(slot, results[0]);
                    } else {
                        if (+indexFirst === indexFirst) {
                            if (!processRefreshSlotIndex(slot, indexFirst)) {
                                return;
                            }
                        }
                    }

                    var resultsCount = results.length;
                    for (var i = 1; i < resultsCount; i++) {
                        result = results[i];

                        if (result.key === key) {
                            keyPresent = true;
                        }

                        var slotNext = slotRefreshFromResult(result);

                        if (!slotNext) {
                            if (!slot.lastInSequence) {
                                // Something has changed since the refresh began; start again
                                beginRefresh();
                                return;
                            }
                            slotNext = addSlotAfter(slot, refreshIndexMap);
                            setRefreshSlotResult(slotNext, result);
                        } else {
                            if (slot.index !== undefined && !processRefreshSlotIndex(slotNext, slot.index + 1)) {
                                return;
                            }

                            // If the slots aren't adjacent, see if it's possible to reorder sequences to make them so
                            if (slotNext !== slot.next) {
                                if (!slot.lastInSequence || !slotNext.firstInSequence) {
                                    // Something has changed since the refresh began; start again
                                    beginRefresh();
                                    return;
                                }

                                var slotLast = sequenceEnd(slotNext);
                                if (slotLast !== refreshEnd) {
                                    moveSequenceAfter(slot, slotNext, slotLast);
                                } else {
                                    var slotFirst = sequenceStart(slot);
                                    if (slotFirst !== refreshStart) {
                                        moveSequenceBefore(slotNext, slotFirst, slot);
                                    } else {
                                        // Something has changed since the refresh began; start again
                                        beginRefresh();
                                        return;
                                    }
                                }

                                mergeSequences(slot);
                            } else if (slot.lastInSequence) {
                                mergeSequences(slot);
                            }
                        }

                        slot = slotNext;
                    }

                    if (!keyPresent) {
                        deletedKeys[key] = true;
                    }

                    // If the count wasn't provided, see if it can be determined from the end of the list.
                    if (!isNonNegativeNumber(count) && !refreshEnd.firstInSequence) {
                        var indexLast = refreshEnd.prev.index;
                        if (indexLast !== undefined) {
                            count = indexLast + 1;
                        }
                    }

                    if (isNonNegativeNumber(count) || count === CountResult.unknown) {
                        if (isNonNegativeNumber(refreshCount)) {
                            if (count !== refreshCount) {
                                // Something has changed since the refresh began; start again
                                beginRefresh();
                                return;
                            }
                        } else {
                            refreshCount = count;
                        }

                        if (isNonNegativeNumber(refreshCount) && !refreshIndexMap[refreshCount]) {
                            setSlotIndex(refreshEnd, refreshCount, refreshIndexMap);
                        }
                    }

                    if (reentrantRefresh) {
                        synchronousRefresh = true;
                    } else {
                        continueRefresh(key);
                    }
                }

                function processRefreshErrorResult(key, fromStart, error) {
                    switch (error.name) {
                        case FetchError.noResponse:
                            setStatus(DataSourceStatus.failure);
                            break;

                        case FetchError.doesNotExist:
                            if (fromStart) {
                                // The attempt to fetch the first item failed, so the list must be empty
                                setSlotIndex(refreshEnd, 0, refreshIndexMap);
                                refreshCount = 0;

                                concludeRefresh();
                            } else {
                                deletedKeys[key] = true;

                                if (reentrantRefresh) {
                                    synchronousRefresh = true;
                                } else {
                                    continueRefresh(key);
                                }
                            }
                            break;
                    }
                }

                function slotFromSlotRefresh(slotRefresh) {
                    if (slotRefresh === refreshStart) {
                        return slotsStart;
                    } else if (slotRefresh === refreshEnd) {
                        return slotListEnd;
                    } else {
                        return keyMap[slotRefresh.key];
                    }
                }

                function slotRefreshFromSlot(slot) {
                    if (slot === slotsStart) {
                        return refreshStart;
                    } else if (slot === slotListEnd) {
                        return refreshEnd;
                    } else {
                        return refreshKeyMap[slot.key];
                    }
                }

                function mergeSequencesForRefresh(slotPrev) {
                    mergeSequences(slotPrev);

                    // Mark the merge point, so we can distinguish insertions from unrequested items
                    slotPrev.next.mergedForRefresh = true;
                }

                function copyRefreshSlotData(slotRefresh, slot) {
                    setSlotKey(slot, slotRefresh.key);
                    slot.itemNew = slotRefresh.item;
                }

                function addNewSlotFromRefresh(slotRefresh, slotNext, insertAfter) {
                    var slotNew = createPrimarySlot();

                    copyRefreshSlotData(slotRefresh, slotNew);
                    insertAndMergeSlot(slotNew, slotNext, insertAfter, !insertAfter);

                    var index = slotRefresh.index;
                    if (+index !== index) {
                        index = (insertAfter ? slotNew.prev.index + 1 : slotNext.next.index - 1);
                    }

                    setSlotIndex(slotNew, index, indexMap);

                    return slotNew;
                }

                function matchSlotForRefresh(slotExisting, slot, slotRefresh) {
                    if (slotExisting) {
                        sendMirageNotifications(slotExisting, slot, slotExisting.bindingMap);
                        mergeSlotsAndItem(slotExisting, slot, slotRefresh.item);
                    } else {
                        copyRefreshSlotData(slotRefresh, slot);

                        // If the index was requested, complete the promises now, as the index might be about to change
                        if (slot.indexRequested) {
                            updateSlotItem(slot);
                        }
                    }
                }

                function updateSlotForRefresh(slotExisting, slot, slotRefresh) {
                    if (!slot.key) {
                        if (slotExisting) {
                            // Record the relationship between the slot to discard and its neighbors
                            slotRefresh.mergeWithPrev = !slot.firstInSequence;
                            slotRefresh.mergeWithNext = !slot.lastInSequence;
                        } else {
                            slotRefresh.stationary = true;
                        }
                        matchSlotForRefresh(slotExisting, slot, slotRefresh);
                        return true;
                    } else {
                        return false;
                    }
                }

                function indexForRefresh(slot) {
                    var indexNew;

                    if (slot.indexRequested) {
                        indexNew = slot.index;
                    } else {
                        var slotRefresh = slotRefreshFromSlot(slot);
                        if (slotRefresh) {
                            indexNew = slotRefresh.index;
                        }
                    }

                    return indexNew;
                }

                function concludeRefresh() {
                    beginRefreshCount = 0;
                    refreshHistory = new Array(100);
                    refreshHistoryPos = -1;

                    indexUpdateDeferred = true;

                    keyFetchIDs = {};

                    var i,
                        j,
                        slot,
                        slotPrev,
                        slotNext,
                        slotBefore,
                        slotAfter,
                        slotRefresh,
                        slotExisting,
                        slotFirstInSequence,
                        sequenceCountOld,
                        sequencesOld = [],
                        sequenceOld,
                        sequenceOldPrev,
                        sequenceOldBestMatch,
                        sequenceCountNew,
                        sequencesNew = [],
                        sequenceNew,
                        index,
                        offset;

                    // Assign a sequence number to each refresh slot
                    sequenceCountNew = 0;
                    for (slotRefresh = refreshStart; slotRefresh; slotRefresh = slotRefresh.next) {
                        slotRefresh.sequenceNumber = sequenceCountNew;

                        if (slotRefresh.firstInSequence) {
                            slotFirstInSequence = slotRefresh;
                        }

                        if (slotRefresh.lastInSequence) {
                            sequencesNew[sequenceCountNew] = {
                                first: slotFirstInSequence,
                                last: slotRefresh,
                                matchingItems: 0
                            };
                            sequenceCountNew++;
                        }
                    }

                    // Remove unnecessary information from main slot list, and update the items
                    lastSlotReleased = null;
                    releasedSlots = 0;
                    for (slot = slotsStart.next; slot !== slotsEnd;) {
                        slotRefresh = refreshKeyMap[slot.key];
                        slotNext = slot.next;

                        if (slot !== slotListEnd) {
                            if (!slotLive(slot)) {
                                // Some more items might have been released since the refresh started.  Strip them away from the
                                // main slot list, as they'll just get in the way from now on.  Since we're discarding these, but
                                // don't know if they're actually going away, split the sequence as our starting assumption must be
                                // that the items on either side are in separate sequences.
                                deleteUnnecessarySlot(slot);
                            } else if (slot.key && !slotRefresh) {
                                // Remove items that have been deleted (or moved far away) and send removed notifications
                                deleteSlot(slot, false);
                            } else if (refreshCount === 0 || (slot.indexRequested && slot.index >= refreshCount)) {
                                // Remove items that can't exist in the list and send mirage removed notifications
                                deleteSlot(slot, true);
                            } else if (slot.item || slot.keyRequested) {
                                // Store the new item; this value will be compared with that stored in slot.item later
                                slot.itemNew = slotRefresh.item;
                            } else {
                                // Clear keys and items that have never been observed by client
                                if (slot.key) {
                                    if (!slot.keyRequested) {
                                        delete keyMap[slot.key];
                                        delete slot.key;
                                    }
                                    slot.itemNew = null;
                                }
                            }
                        }

                        slot = slotNext;
                    }

                    // Placeholders generated by itemsAtIndex should not move.  Match these to items now if possible, or merge them
                    // with existing items if necessary.
                    for (slot = slotsStart.next; slot !== slotListEnd;) {
                        slotNext = slot.next;

                        if (slot.indexRequested) {
                            slotRefresh = refreshIndexMap[slot.index];
                            if (slotRefresh) {
                                matchSlotForRefresh(slotFromSlotRefresh(slotRefresh), slot, slotRefresh);
                            }
                        }

                        slot = slotNext;
                    }

                    // Match old sequences to new sequences
                    var bestMatch,
                        bestMatchCount,
                        previousBestMatch = 0,
                        newSequenceCounts = [],
                        slotIndexRequested,
                        sequenceIndexEnd,
                        sequenceOldEnd;

                    sequenceCountOld = 0;
                    for (slot = slotsStart; slot !== slotsEnd; slot = slot.next) {
                        if (slot.firstInSequence) {
                            slotFirstInSequence = slot;
                            slotIndexRequested = null;
                            for (i = 0; i < sequenceCountNew; i++) {
                                newSequenceCounts[i] = 0;
                            }
                        }

                        if (slot.indexRequested) {
                            slotIndexRequested = slot;
                        }

                        slotRefresh = slotRefreshFromSlot(slot);
                        if (slotRefresh) {
                            newSequenceCounts[slotRefresh.sequenceNumber]++;
                        }

                        if (slot.lastInSequence) {
                            // Determine which new sequence is the best match for this old one.  Use a simple greedy algorithm to
                            // ensure the relative ordering of matched sequences is the same; out-of-order sequences will require
                            // move notifications.
                            bestMatchCount = 0;
                            for (i = previousBestMatch; i < sequenceCountNew; i++) {
                                if (bestMatchCount < newSequenceCounts[i]) {
                                    bestMatchCount = newSequenceCounts[i];
                                    bestMatch = i;
                                }
                            }

                            sequenceOld = {
                                first: slotFirstInSequence,
                                last: slot,
                                sequenceNew: (bestMatchCount > 0 ? sequencesNew[bestMatch] : undefined),
                                matchingItems: bestMatchCount
                            };

                            if (slotIndexRequested) {
                                sequenceOld.indexRequested = true;
                                sequenceOld.stationarySlot = slotIndexRequested;
                            }

                            sequencesOld[sequenceCountOld] = sequenceOld;

                            if (slot === slotListEnd) {
                                sequenceIndexEnd = sequenceCountOld;
                                sequenceOldEnd = sequenceOld;
                            }

                            sequenceCountOld++;

                            if (sequencesNew[bestMatch].first.index !== undefined) {
                                previousBestMatch = bestMatch;
                            }
                        }
                    }

                    // Special case: split the old start into a separate sequence if the new start isn't its best match
                    if (sequencesOld[0].sequenceNew !== sequencesNew[0]) {
                        splitSequence(slotsStart);
                        sequencesOld[0].first = slotsStart.next;
                        sequencesOld.unshift({
                            first: slotsStart,
                            last: slotsStart,
                            sequenceNew: sequencesNew[0],
                            matchingItems: 1
                        });
                        sequenceIndexEnd++;
                        sequenceCountOld++;
                    }

                    var listEndObserved = !slotListEnd.firstInSequence;

                    // Special case: split the old end into a separate sequence if the new end isn't its best match
                    if (sequenceOldEnd.sequenceNew !== sequencesNew[sequenceCountNew - 1]) {
                        splitSequence(slotListEnd.prev);
                        sequenceOldEnd.last = slotListEnd.prev;
                        sequenceIndexEnd++;
                        sequencesOld.splice(sequenceIndexEnd, 0, {
                            first: slotListEnd,
                            last: slotListEnd,
                            sequenceNew: sequencesNew[sequenceCountNew - 1],
                            matchingItems: 1
                        });
                        sequenceCountOld++;
                        sequenceOldEnd = sequencesOld[sequenceIndexEnd];
                    }

                    // Map new sequences to old sequences
                    for (i = 0; i < sequenceCountOld; i++) {
                        sequenceNew = sequencesOld[i].sequenceNew;
                        if (sequenceNew && sequenceNew.matchingItems < sequencesOld[i].matchingItems) {
                            sequenceNew.matchingItems = sequencesOld[i].matchingItems;
                            sequenceNew.sequenceOld = sequencesOld[i];
                        }
                    }

                    // The old end must always be the best match for the new end (if the new end is also the new start, they will
                    // be merged below).
                    sequencesNew[sequenceCountNew - 1].sequenceOld = sequenceOldEnd;
                    sequenceOldEnd.stationarySlot = slotListEnd;

                    // The old start must always be the best match for the new start
                    sequencesNew[0].sequenceOld = sequencesOld[0];
                    sequencesOld[0].stationarySlot = slotsStart;

                    // Merge additional indexed old sequences when possible

                    // First do a forward pass
                    for (i = 0; i <= sequenceIndexEnd; i++) {
                        sequenceOld = sequencesOld[i];

                        if (sequenceOld.sequenceNew && (sequenceOldBestMatch = sequenceOld.sequenceNew.sequenceOld) === sequenceOldPrev && sequenceOldPrev.last !== slotListEnd) {
                            mergeSequencesForRefresh(sequenceOldBestMatch.last);
                            sequenceOldBestMatch.last = sequenceOld.last;
                            delete sequencesOld[i];
                        } else {
                            sequenceOldPrev = sequenceOld;
                        }
                    }

                    // Now do a reverse pass
                    sequenceOldPrev = null;
                    for (i = sequenceIndexEnd; i >= 0; i--) {
                        sequenceOld = sequencesOld[i];
                        // From this point onwards, some members of sequencesOld may be undefined
                        if (sequenceOld) {
                            if (sequenceOld.sequenceNew && (sequenceOldBestMatch = sequenceOld.sequenceNew.sequenceOld) === sequenceOldPrev && sequenceOld.last !== slotListEnd) {
                                mergeSequencesForRefresh(sequenceOld.last);
                                sequenceOldBestMatch.first = sequenceOld.first;
                                delete sequencesOld[i];
                            } else {
                                sequenceOldPrev = sequenceOld;
                            }
                        }
                    }

                    // Since we may have forced the list end into a separate sequence, the mergedForRefresh flag may be incorrect
                    if (listEndObserved) {
                        delete slotListEnd.mergedForRefresh;
                    }

                    var sequencePairsToMerge = [];

                    // Find unchanged sequences without indices that can be merged with existing sequences without move
                    // notifications.
                    for (i = sequenceIndexEnd + 1; i < sequenceCountOld; i++) {
                        sequenceOld = sequencesOld[i];
                        if (sequenceOld && (!sequenceOld.sequenceNew || sequenceOld.sequenceNew.sequenceOld !== sequenceOld)) {
                            // If the order of the known items in the sequence is unchanged, then the sequence probably has not
                            // moved, but we now know where it belongs relative to at least one other sequence.
                            var orderPreserved = true,
                                slotRefreshFirst = null,
                                slotRefreshLast = null,
                                sequenceLength = 0;
                            slotRefresh = slotRefreshFromSlot(sequenceOld.first);
                            if (slotRefresh) {
                                slotRefreshFirst = slotRefreshLast = slotRefresh;
                                sequenceLength = 1;
                            }
                            for (slot = sequenceOld.first; slot !== sequenceOld.last; slot = slot.next) {
                                var slotRefreshNext = slotRefreshFromSlot(slot.next);

                                if (slotRefresh && slotRefreshNext && (slotRefresh.lastInSequence || slotRefresh.next !== slotRefreshNext)) {
                                    orderPreserved = false;
                                    break;
                                }

                                if (slotRefresh && !slotRefreshFirst) {
                                    slotRefreshFirst = slotRefreshLast = slotRefresh;
                                }

                                if (slotRefreshNext && slotRefreshFirst) {
                                    slotRefreshLast = slotRefreshNext;
                                    sequenceLength++;
                                }

                                slotRefresh = slotRefreshNext;
                            }

                            // If the stationary sequence has indices, verify that there is enough space for this sequence - if
                            // not, then something somewhere has moved after all.
                            if (orderPreserved && slotRefreshFirst && slotRefreshFirst.index !== undefined) {
                                var indexBefore;
                                if (!slotRefreshFirst.firstInSequence) {
                                    slotBefore = slotFromSlotRefresh(slotRefreshFirst.prev);
                                    if (slotBefore) {
                                        indexBefore = slotBefore.index;
                                    }
                                }

                                var indexAfter;
                                if (!slotRefreshLast.lastInSequence) {
                                    slotAfter = slotFromSlotRefresh(slotRefreshLast.next);
                                    if (slotAfter) {
                                        indexAfter = slotAfter.index;
                                    }
                                }

                                if ((!slotAfter || slotAfter.lastInSequence || slotAfter.mergedForRefresh) &&
                                        (indexBefore === undefined || indexAfter === undefined || indexAfter - indexBefore - 1 >= sequenceLength)) {
                                    sequenceOld.locationJustDetermined = true;

                                    // Mark the individual refresh slots as not requiring move notifications
                                    for (slotRefresh = slotRefreshFirst; ; slotRefresh = slotRefresh.next) {
                                        slotRefresh.locationJustDetermined = true;

                                        if (slotRefresh === slotRefreshLast) {
                                            break;
                                        }
                                    }

                                    // Store any adjacent placeholders so they can be merged once the moves and insertions have
                                    // been processed.
                                    var slotFirstInSequence = slotFromSlotRefresh(slotRefreshFirst),
                                        slotLastInSequence = slotFromSlotRefresh(slotRefreshLast);
                                    sequencePairsToMerge.push({
                                        slotBeforeSequence: (slotFirstInSequence.firstInSequence ? null : slotFirstInSequence.prev),
                                        slotFirstInSequence: slotFirstInSequence,
                                        slotLastInSequence: slotLastInSequence,
                                        slotAfterSequence: (slotLastInSequence.lastInSequence ? null : slotLastInSequence.next)
                                    });
                                }
                            }
                        }
                    }

                    // Remove placeholders in old sequences that don't map to new sequences (and don't contain requests for a
                    // specific index or key), as they no longer have meaning.
                    for (i = 0; i < sequenceCountOld; i++) {
                        sequenceOld = sequencesOld[i];
                        if (sequenceOld && !sequenceOld.indexRequested && !sequenceOld.locationJustDetermined && (!sequenceOld.sequenceNew || sequenceOld.sequenceNew.sequenceOld !== sequenceOld)) {
                            sequenceOld.sequenceNew = null;

                            slot = sequenceOld.first;

                            var sequenceEndReached;
                            do {
                                sequenceEndReached = (slot === sequenceOld.last);

                                slotNext = slot.next;

                                if (slot !== slotsStart && slot !== slotListEnd && slot !== slotsEnd && !slot.item && !slot.keyRequested) {
                                    deleteSlot(slot, true);
                                    if (sequenceOld.first === slot) {
                                        if (sequenceOld.last === slot) {
                                            delete sequencesOld[i];
                                            break;
                                        } else {
                                            sequenceOld.first = slot.next;
                                        }
                                    } else if (sequenceOld.last === slot) {
                                        sequenceOld.last = slot.prev;
                                    }
                                }

                                slot = slotNext;
                            } while (!sequenceEndReached);
                        }
                    }

                    // Locate boundaries of new items in new sequences
                    for (i = 0; i < sequenceCountNew; i++) {
                        sequenceNew = sequencesNew[i];
                        for (slotRefresh = sequenceNew.first; !slotFromSlotRefresh(slotRefresh) && !slotRefresh.lastInSequence; slotRefresh = slotRefresh.next) {
                            /*@empty*/
                        }
                        if (slotRefresh.lastInSequence && !slotFromSlotRefresh(slotRefresh)) {
                            sequenceNew.firstInner = sequenceNew.lastInner = null;
                        } else {
                            sequenceNew.firstInner = slotRefresh;
                            for (slotRefresh = sequenceNew.last; !slotFromSlotRefresh(slotRefresh) ; slotRefresh = slotRefresh.prev) {
                                /*@empty*/
                            }
                            sequenceNew.lastInner = slotRefresh;
                        }
                    }

                    // Determine which items to move
                    for (i = 0; i < sequenceCountNew; i++) {
                        sequenceNew = sequencesNew[i];
                        if (sequenceNew && sequenceNew.firstInner) {
                            sequenceOld = sequenceNew.sequenceOld;
                            if (sequenceOld) {
                                // Number the slots in each new sequence with their offset in the corresponding old sequence (or
                                // undefined if in a different old sequence).
                                var ordinal = 0;
                                for (slot = sequenceOld.first; true; slot = slot.next, ordinal++) {
                                    slotRefresh = slotRefreshFromSlot(slot);
                                    if (slotRefresh && slotRefresh.sequenceNumber === sequenceNew.firstInner.sequenceNumber) {
                                        slotRefresh.ordinal = ordinal;
                                    }

                                    if (slot.lastInSequence) {
                                        break;
                                    }
                                }

                                // Determine longest subsequence of items that are in the same order before and after
                                var piles = [];
                                for (slotRefresh = sequenceNew.firstInner; true; slotRefresh = slotRefresh.next) {
                                    ordinal = slotRefresh.ordinal;
                                    if (ordinal !== undefined) {
                                        var searchFirst = 0,
                                            searchLast = piles.length - 1;
                                        while (searchFirst <= searchLast) {
                                            var searchMidpoint = Math.floor(0.5 * (searchFirst + searchLast));
                                            if (piles[searchMidpoint].ordinal < ordinal) {
                                                searchFirst = searchMidpoint + 1;
                                            } else {
                                                searchLast = searchMidpoint - 1;
                                            }
                                        }
                                        piles[searchFirst] = slotRefresh;
                                        if (searchFirst > 0) {
                                            slotRefresh.predecessor = piles[searchFirst - 1];
                                        }
                                    }

                                    if (slotRefresh === sequenceNew.lastInner) {
                                        break;
                                    }
                                }

                                // The items in the longest ordered subsequence don't move; everything else does
                                var stationaryItems = [],
                                    stationaryItemCount = piles.length;
                                slotRefresh = piles[stationaryItemCount - 1];
                                for (j = stationaryItemCount; j--;) {
                                    slotRefresh.stationary = true;
                                    stationaryItems[j] = slotRefresh;
                                    slotRefresh = slotRefresh.predecessor;
                                }
                                sequenceOld.stationarySlot = slotFromSlotRefresh(stationaryItems[0]);

                                // Try to match new items before the first stationary item to placeholders
                                slotRefresh = stationaryItems[0];
                                slot = slotFromSlotRefresh(slotRefresh);
                                slotPrev = slot.prev;
                                var sequenceBoundaryReached = slot.firstInSequence;
                                while (!slotRefresh.firstInSequence) {
                                    slotRefresh = slotRefresh.prev;
                                    slotExisting = slotFromSlotRefresh(slotRefresh);
                                    if (!slotExisting || slotRefresh.locationJustDetermined) {
                                        // Find the next placeholder walking backwards
                                        while (!sequenceBoundaryReached && slotPrev !== slotsStart) {
                                            slot = slotPrev;
                                            slotPrev = slot.prev;
                                            sequenceBoundaryReached = slot.firstInSequence;

                                            if (updateSlotForRefresh(slotExisting, slot, slotRefresh)) {
                                                break;
                                            }
                                        }
                                    }
                                }

                                // Try to match new items between stationary items to placeholders
                                for (j = 0; j < stationaryItemCount - 1; j++) {
                                    slotRefresh = stationaryItems[j];
                                    slot = slotFromSlotRefresh(slotRefresh);
                                    var slotRefreshStop = stationaryItems[j + 1],
                                        slotRefreshMergePoint = null,
                                        slotStop = slotFromSlotRefresh(slotRefreshStop),
                                        slotExisting;
                                    // Find all the new items
                                    slotNext = slot.next;
                                    for (slotRefresh = slotRefresh.next; slotRefresh !== slotRefreshStop && !slotRefreshMergePoint && slot !== slotStop; slotRefresh = slotRefresh.next) {
                                        slotExisting = slotFromSlotRefresh(slotRefresh);
                                        if (!slotExisting || slotRefresh.locationJustDetermined) {
                                            // Find the next placeholder
                                            while (slotNext !== slotStop) {
                                                // If a merge point is reached, match the remainder of the placeholders by walking backwards
                                                if (slotNext.mergedForRefresh) {
                                                    slotRefreshMergePoint = slotRefresh.prev;
                                                    break;
                                                }

                                                slot = slotNext;
                                                slotNext = slot.next;

                                                if (updateSlotForRefresh(slotExisting, slot, slotRefresh)) {
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    // Walk backwards to the first merge point if necessary
                                    if (slotRefreshMergePoint) {
                                        slotPrev = slotStop.prev;
                                        for (slotRefresh = slotRefreshStop.prev; slotRefresh !== slotRefreshMergePoint && slotStop !== slot; slotRefresh = slotRefresh.prev) {
                                            slotExisting = slotFromSlotRefresh(slotRefresh);
                                            if (!slotExisting || slotRefresh.locationJustDetermined) {
                                                // Find the next placeholder walking backwards
                                                while (slotPrev !== slot) {
                                                    slotStop = slotPrev;
                                                    slotPrev = slotStop.prev;

                                                    if (updateSlotForRefresh(slotExisting, slotStop, slotRefresh)) {
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Delete remaining placeholders, sending notifications
                                    while (slotNext !== slotStop) {
                                        slot = slotNext;
                                        slotNext = slot.next;

                                        if (slot !== slotsStart && isPlaceholder(slot) && !slot.keyRequested) {
                                            // This might occur due to two sequences - requested by different clients - being
                                            // merged.  However, since only sequences with indices are merged, if this placehholder
                                            // is no longer necessary, it means an item actually was removed, so this doesn't count
                                            // as a mirage.
                                            deleteSlot(slot);
                                        }
                                    }
                                }

                                // Try to match new items after the last stationary item to placeholders
                                slotRefresh = stationaryItems[stationaryItemCount - 1];
                                slot = slotFromSlotRefresh(slotRefresh);
                                slotNext = slot.next;
                                sequenceBoundaryReached = slot.lastInSequence;
                                while (!slotRefresh.lastInSequence) {
                                    slotRefresh = slotRefresh.next;
                                    slotExisting = slotFromSlotRefresh(slotRefresh);
                                    if (!slotExisting || slotRefresh.locationJustDetermined) {
                                        // Find the next placeholder
                                        while (!sequenceBoundaryReached && slotNext !== slotListEnd) {
                                            slot = slotNext;
                                            slotNext = slot.next;
                                            sequenceBoundaryReached = slot.lastInSequence;

                                            if (updateSlotForRefresh(slotExisting, slot, slotRefresh)) {
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Move items and send notifications
                    for (i = 0; i < sequenceCountNew; i++) {
                        sequenceNew = sequencesNew[i];

                        if (sequenceNew.firstInner) {
                            slotPrev = null;
                            for (slotRefresh = sequenceNew.firstInner; true; slotRefresh = slotRefresh.next) {
                                slot = slotFromSlotRefresh(slotRefresh);
                                if (slot) {
                                    if (!slotRefresh.stationary) {
                                        var slotMoveBefore,
                                            mergeWithPrev = false,
                                            mergeWithNext = false;
                                        if (slotPrev) {
                                            slotMoveBefore = slotPrev.next;
                                            mergeWithPrev = true;
                                        } else {
                                            // The first item will be inserted before the first stationary item, so find that now
                                            var slotRefreshStationary;
                                            for (slotRefreshStationary = sequenceNew.firstInner; !slotRefreshStationary.stationary && slotRefreshStationary !== sequenceNew.lastInner; slotRefreshStationary = slotRefreshStationary.next) {
                                                /*@empty*/
                                            }

                                            if (!slotRefreshStationary.stationary) {
                                                // There are no stationary items, as all the items are moving from another old
                                                // sequence.

                                                index = slotRefresh.index;

                                                // Find the best place to insert the new sequence
                                                if (index === 0) {
                                                    // Index 0 is a special case
                                                    slotMoveBefore = slotsStart.next;
                                                    mergeWithPrev = true;
                                                } else if (index === undefined) {
                                                    slotMoveBefore = slotsEnd;
                                                } else {
                                                    // Use a linear search; unlike successorFromIndex, prefer the last insertion
                                                    // point between sequences over the precise index
                                                    slotMoveBefore = slotsStart.next;
                                                    var lastSequenceStart = null;
                                                    while (true) {
                                                        if (slotMoveBefore.firstInSequence) {
                                                            lastSequenceStart = slotMoveBefore;
                                                        }

                                                        if ((index < slotMoveBefore.index && lastSequenceStart) || slotMoveBefore === slotListEnd) {
                                                            break;
                                                        }

                                                        slotMoveBefore = slotMoveBefore.next;
                                                    }

                                                    if (!slotMoveBefore.firstInSequence && lastSequenceStart) {
                                                        slotMoveBefore = lastSequenceStart;
                                                    }
                                                }
                                            } else {
                                                slotMoveBefore = slotFromSlotRefresh(slotRefreshStationary);
                                                mergeWithNext = true;
                                            }
                                        }

                                        // Preserve merge boundaries
                                        if (slot.mergedForRefresh) {
                                            delete slot.mergedForRefresh;
                                            if (!slot.lastInSequence) {
                                                slot.next.mergedForRefresh = true;
                                            }
                                        }

                                        mergeWithPrev = mergeWithPrev || slotRefresh.mergeWithPrev;
                                        mergeWithNext = mergeWithNext || slotRefresh.mergeWithNext;

                                        var skipNotifications = slotRefresh.locationJustDetermined;

                                        moveSlot(slot, slotMoveBefore, mergeWithPrev, mergeWithNext, skipNotifications);

                                        if (skipNotifications && mergeWithNext) {
                                            // Since this item was moved without a notification, this is an implicit merge of
                                            // sequences.  Mark the item's successor as mergedForRefresh.
                                            slotMoveBefore.mergedForRefresh = true;
                                        }
                                    }

                                    slotPrev = slot;
                                }

                                if (slotRefresh === sequenceNew.lastInner) {
                                    break;
                                }
                            }
                        }
                    }

                    // Insert new items (with new indices) and send notifications
                    for (i = 0; i < sequenceCountNew; i++) {
                        sequenceNew = sequencesNew[i];

                        if (sequenceNew.firstInner) {
                            slotPrev = null;
                            for (slotRefresh = sequenceNew.firstInner; true; slotRefresh = slotRefresh.next) {
                                slot = slotFromSlotRefresh(slotRefresh);
                                if (!slot) {
                                    var slotInsertBefore;
                                    if (slotPrev) {
                                        slotInsertBefore = slotPrev.next;
                                    } else {
                                        // The first item will be inserted *before* the first old item, so find that now
                                        var slotRefreshOld;
                                        for (slotRefreshOld = sequenceNew.firstInner; !slotFromSlotRefresh(slotRefreshOld) ; slotRefreshOld = slotRefreshOld.next) {
                                            /*@empty*/
                                        }
                                        slotInsertBefore = slotFromSlotRefresh(slotRefreshOld);
                                    }

                                    // Create a new slot for the item
                                    slot = addNewSlotFromRefresh(slotRefresh, slotInsertBefore, !!slotPrev);

                                    var slotRefreshNext = slotRefreshFromSlot(slotInsertBefore);

                                    if (!slotInsertBefore.mergedForRefresh && (!slotRefreshNext || !slotRefreshNext.locationJustDetermined)) {
                                        prepareSlotItem(slot);

                                        // Send the notification after the insertion
                                        sendInsertedNotification(slot);
                                    }
                                }
                                slotPrev = slot;

                                if (slotRefresh === sequenceNew.lastInner) {
                                    break;
                                }
                            }
                        }
                    }

                    // Rebuild the indexMap from scratch, so it is possible to detect colliding indices
                    indexMap = [];

                    // Send indexChanged and changed notifications
                    var indexFirst = -1;
                    for (slot = slotsStart, offset = 0; slot !== slotsEnd; offset++) {
                        var slotNext = slot.next;

                        if (slot.firstInSequence) {
                            slotFirstInSequence = slot;
                            offset = 0;
                        }

                        if (indexFirst === undefined) {
                            var indexNew = indexForRefresh(slot);
                            if (indexNew !== undefined) {
                                indexFirst = indexNew - offset;
                            }
                        }

                        // See if the next slot would cause a contradiction, in which case split the sequences
                        if (indexFirst !== undefined && !slot.lastInSequence) {
                            var indexNewNext = indexForRefresh(slot.next);
                            if (indexNewNext !== undefined && indexNewNext !== indexFirst + offset + 1) {
                                splitSequence(slot);

                                // 'Move' the items in-place individually, so move notifications are sent.  In rare cases, this
                                // will result in multiple move notifications being sent for a given item, but that's fine.
                                var first = true;
                                for (var slotMove = slot.next, lastInSequence = false; !lastInSequence && slotMove !== slotListEnd;) {
                                    var slotMoveNext = slotMove.next;

                                    lastInSequence = slotMove.lastInSequence;

                                    moveSlot(slotMove, slotMoveNext, !first, false);

                                    first = false;
                                    slotMove = slotMoveNext;
                                }
                            }
                        }

                        if (slot.lastInSequence) {
                            index = indexFirst;
                            for (var slotUpdate = slotFirstInSequence; slotUpdate !== slotNext;) {
                                var slotUpdateNext = slotUpdate.next;

                                if (index >= refreshCount && slotUpdate !== slotListEnd) {
                                    deleteSlot(slotUpdate, true);
                                } else {
                                    var slotWithIndex = indexMap[index];

                                    if (index !== slotUpdate.index) {
                                        delete indexMap[index];
                                        changeSlotIndex(slotUpdate, index);
                                    } else if (+index === index && indexMap[index] !== slotUpdate) {
                                        indexMap[index] = slotUpdate;
                                    }

                                    if (slotUpdate.itemNew) {
                                        updateSlotItem(slotUpdate);
                                    }

                                    if (slotWithIndex) {
                                        // Two slots' indices have collided - merge them
                                        if (slotUpdate.key) {
                                            sendMirageNotifications(slotUpdate, slotWithIndex, slotUpdate.bindingMap);
                                            mergeSlots(slotUpdate, slotWithIndex);
                                            if (+index === index) {
                                                indexMap[index] = slotUpdate;
                                            }
                                        } else {
                                            sendMirageNotifications(slotWithIndex, slotUpdate, slotWithIndex.bindingMap);
                                            mergeSlots(slotWithIndex, slotUpdate);
                                            if (+index === index) {
                                                indexMap[index] = slotWithIndex;
                                            }
                                        }
                                    }

                                    if (+index === index) {
                                        index++;
                                    }
                                }

                                slotUpdate = slotUpdateNext;
                            }

                            indexFirst = undefined;
                        }

                        slot = slotNext;
                    }

                    // See if any sequences need to be moved and/or merged
                    var indexMax = -2,
                        listEndReached;

                    for (slot = slotsStart, offset = 0; slot !== slotsEnd; offset++) {
                        var slotNext = slot.next;

                        if (slot.firstInSequence) {
                            slotFirstInSequence = slot;
                            offset = 0;
                        }

                        // Clean up during this pass
                        delete slot.mergedForRefresh;

                        if (slot.lastInSequence) {
                            // Move sequence if necessary
                            if (slotFirstInSequence.index === undefined) {
                                slotBefore = slotFirstInSequence.prev;
                                var slotRefreshBefore;
                                if (slotBefore && (slotRefreshBefore = slotRefreshFromSlot(slotBefore)) && !slotRefreshBefore.lastInSequence &&
                                        (slotRefresh = slotRefreshFromSlot(slot)) && slotRefresh.prev === slotRefreshBefore) {
                                    moveSequenceAfter(slotBefore, slotFirstInSequence, slot);
                                    mergeSequences(slotBefore);
                                } else if (slot !== slotListEnd && !listEndReached) {
                                    moveSequenceBefore(slotsEnd, slotFirstInSequence, slot);
                                }
                            } else {
                                if (indexMax < slot.index && !listEndReached) {
                                    indexMax = slot.index;
                                } else {
                                    // Find the correct insertion point
                                    for (slotAfter = slotsStart.next; slotAfter.index < slot.index; slotAfter = slotAfter.next) {
                                        /*@empty*/
                                    }

                                    // Move the items individually, so move notifications are sent
                                    for (var slotMove = slotFirstInSequence; slotMove !== slotNext;) {
                                        var slotMoveNext = slotMove.next;
                                        slotRefresh = slotRefreshFromSlot(slotMove);
                                        moveSlot(slotMove, slotAfter, slotAfter.prev.index === slotMove.index - 1, slotAfter.index === slotMove.index + 1, slotRefresh && slotRefresh.locationJustDetermined);
                                        slotMove = slotMoveNext;
                                    }
                                }

                                // Store slotBefore here since the sequence might have just been moved
                                slotBefore = slotFirstInSequence.prev;

                                // See if this sequence should be merged with the previous one
                                if (slotBefore && slotBefore.index === slotFirstInSequence.index - 1) {
                                    mergeSequences(slotBefore);
                                }
                            }
                        }

                        if (slot === slotListEnd) {
                            listEndReached = true;
                        }

                        slot = slotNext;
                    }

                    indexUpdateDeferred = false;

                    // Now that all the sequences have been moved, merge any colliding slots
                    mergeSequencePairs(sequencePairsToMerge);

                    // Send countChanged notification
                    if (refreshCount !== undefined && refreshCount !== knownCount) {
                        changeCount(refreshCount);
                    }

                    finishNotifications();

                    // Before discarding the refresh slot list, see if any fetch requests can be completed by pretending each range
                    // of refresh slots is an incoming array of results.
                    var fetchResults = [];
                    for (i = 0; i < sequenceCountNew; i++) {
                        sequenceNew = sequencesNew[i];

                        var results = [];

                        slot = null;
                        offset = 0;

                        var slotOffset;

                        for (slotRefresh = sequenceNew.first; true; slotRefresh = slotRefresh.next, offset++) {
                            if (slotRefresh === refreshStart) {
                                results.push(startMarker);
                            } else if (slotRefresh === refreshEnd) {
                                results.push(endMarker);
                            } else {
                                results.push(slotRefresh.item);

                                if (!slot) {
                                    slot = slotFromSlotRefresh(slotRefresh);
                                    slotOffset = offset;
                                }
                            }

                            if (slotRefresh.lastInSequence) {
                                break;
                            }
                        }

                        if (slot) {
                            fetchResults.push({
                                slot: slot,
                                results: results,
                                offset: slotOffset
                            });
                        }
                    }

                    resetRefreshState();
                    refreshInProgress = false;

                    // Complete any promises for newly obtained items
                    callFetchCompleteCallbacks();

                    // Now process the 'extra' results from the refresh list
                    for (i = 0; i < fetchResults.length; i++) {
                        var fetchResult = fetchResults[i];
                        processResults(fetchResult.slot, fetchResult.results, fetchResult.offset, knownCount, fetchResult.slot.index);
                    }

                    if (refreshSignal) {
                        var signal = refreshSignal;

                        refreshSignal = null;

                        signal.complete();
                    }

                    // Finally, kick-start fetches for any remaining placeholders
                    postFetch();
                }

                // Edit Queue

                // Queues an edit and immediately "optimistically" apply it to the slots list, sending re-entrant notifications
                function queueEdit(applyEdit, editType, complete, error, keyUpdate, updateSlots, undo) {
                    var editQueueTail = editQueue.prev,
                        edit = {
                            prev: editQueueTail,
                            next: editQueue,
                            applyEdit: applyEdit,
                            editType: editType,
                            complete: complete,
                            error: error,
                            keyUpdate: keyUpdate
                        };
                    editQueueTail.next = edit;
                    editQueue.prev = edit;
                    editsQueued = true;

                    // If there's a refresh in progress, abandon it, but request that a new one be started once the edits complete
                    if (refreshRequested || refreshInProgress) {
                        currentRefreshID++;
                        refreshInProgress = false;
                        refreshRequested = true;
                    }

                    if (editQueue.next === edit) {
                        // Attempt the edit immediately, in case it completes synchronously
                        applyNextEdit();
                    }

                    // If the edit succeeded or is still pending, apply it to the slots (in the latter case, "optimistically")
                    if (!edit.failed) {
                        updateSlots();

                        // Supply the undo function now
                        edit.undo = undo;
                    }

                    if (!editsInProgress) {
                        completeEdits();
                    }
                }

                function dequeueEdit() {
                    firstEditInProgress = false;

                    var editNext = editQueue.next.next;

                    editQueue.next = editNext;
                    editNext.prev = editQueue;
                }

                // Undo all queued edits, starting with the most recent
                function discardEditQueue() {
                    while (editQueue.prev !== editQueue) {
                        var editLast = editQueue.prev;

                        if (editLast.error) {
                            editLast.error(new _ErrorFromName(EditError.canceled));
                        }

                        // Edits that haven't been applied to the slots yet don't need to be undone
                        if (editLast.undo && !refreshRequested) {
                            editLast.undo();
                        }

                        editQueue.prev = editLast.prev;
                    }
                    editQueue.next = editQueue;

                    editsInProgress = false;

                    completeEdits();
                }

                var EditType = {
                    insert: "insert",
                    change: "change",
                    move: "move",
                    remove: "remove"
                };

                function attemptEdit(edit) {
                    if (firstEditInProgress) {
                        return;
                    }

                    var reentrant = true;

                    function continueEdits() {
                        if (!waitForRefresh) {
                            if (reentrant) {
                                synchronousEdit = true;
                            } else {
                                applyNextEdit();
                            }
                        }
                    }

                    var keyUpdate = edit.keyUpdate;

                    function onEditComplete(item) {
                        if (item) {
                            var slot;
                            if (keyUpdate && keyUpdate.key !== item.key) {
                                var keyNew = item.key;
                                if (!edit.undo) {
                                    // If the edit is in the process of being queued, we can use the correct key when we update the
                                    // slots, so there's no need for a later update.
                                    keyUpdate.key = keyNew;
                                } else {
                                    slot = keyUpdate.slot;
                                    if (slot) {
                                        var keyOld = slot.key;
                                        if (keyOld) {
                                            delete keyMap[keyOld];
                                        }
                                        setSlotKey(slot, keyNew);
                                        slot.itemNew = item;
                                        if (slot.item) {
                                            changeSlot(slot);
                                            finishNotifications();
                                        } else {
                                            completeFetchPromises(slot);
                                        }
                                    }
                                }
                            } else if (edit.editType === EditType.change) {
                                slot.itemNew = item;

                                if (!reentrant) {
                                    changeSlotIfNecessary(slot);
                                }
                            }
                        }

                        dequeueEdit();

                        if (edit.complete) {
                            edit.complete(item);
                        }

                        continueEdits();
                    }

                    function onEditError(error) {
                        switch (error.Name) {
                            case EditError.noResponse:
                                // Report the failure to the client, but do not dequeue the edit
                                setStatus(DataSourceStatus.failure);
                                waitForRefresh = true;

                                firstEditInProgress = false;

                                // Don't report the error, as the edit will be attempted again on the next refresh
                                return;

                            case EditError.notPermitted:
                                break;

                            case EditError.noLongerMeaningful:
                                // Something has changed, so request a refresh
                                beginRefresh();
                                break;

                            default:
                                break;
                        }

                        // Discard all remaining edits, rather than try to determine which subsequent ones depend on this one
                        edit.failed = true;
                        dequeueEdit();

                        discardEditQueue();

                        if (edit.error) {
                            edit.error(error);
                        }

                        continueEdits();
                    }

                    if (listDataAdapter.beginEdits && !beginEditsCalled) {
                        beginEditsCalled = true;
                        listDataAdapter.beginEdits();
                    }

                    // Call the applyEdit function for the given edit, passing in our own wrapper of the error handler that the
                    // client passed in.
                    firstEditInProgress = true;
                    edit.applyEdit().then(onEditComplete, onEditError);
                    reentrant = false;
                }

                function applyNextEdit() {
                    // See if there are any outstanding edits, and try to process as many as possible synchronously
                    while (editQueue.next !== editQueue) {
                        synchronousEdit = false;
                        attemptEdit(editQueue.next);
                        if (!synchronousEdit) {
                            return;
                        }
                    }

                    // The queue emptied out synchronously (or was empty to begin with)
                    concludeEdits();
                }

                function completeEdits() {
                    updateIndices();

                    finishNotifications();

                    callFetchCompleteCallbacks();

                    if (editQueue.next === editQueue) {
                        concludeEdits();
                    }
                }

                // Once the edit queue has emptied, update state appropriately and resume normal operation
                function concludeEdits() {
                    editsQueued = false;

                    if (listDataAdapter.endEdits && beginEditsCalled && !editsInProgress) {
                        beginEditsCalled = false;
                        listDataAdapter.endEdits();
                    }

                    // See if there's a refresh that needs to begin
                    if (refreshRequested) {
                        refreshRequested = false;
                        beginRefresh();
                    } else {
                        // Otherwise, see if anything needs to be fetched
                        postFetch();
                    }
                }

                // Editing Operations

                function getSlotForEdit(key) {
                    validateKey(key);

                    return keyMap[key] || createSlotForKey(key);
                }

                function insertNewSlot(key, itemNew, slotInsertBefore, mergeWithPrev, mergeWithNext) {
                    // Create a new slot, but don't worry about its index, as indices will be updated during endEdits
                    var slot = createPrimarySlot();

                    insertAndMergeSlot(slot, slotInsertBefore, mergeWithPrev, mergeWithNext);
                    if (key) {
                        setSlotKey(slot, key);
                    }
                    slot.itemNew = itemNew;

                    updateNewIndices(slot, 1);

                    // If this isn't part of a batch of changes, set the slot index now so renderers can see it
                    if (!editsInProgress && !dataNotificationsInProgress) {
                        if (!slot.firstInSequence && typeof slot.prev.index === "number") {
                            setSlotIndex(slot, slot.prev.index + 1, indexMap);
                        } else if (!slot.lastInSequence && typeof slot.next.index === "number") {
                            setSlotIndex(slot, slot.next.index - 1, indexMap);
                        }
                    }

                    prepareSlotItem(slot);

                    // Send the notification after the insertion
                    sendInsertedNotification(slot);

                    return slot;
                }

                function insertItem(key, data, slotInsertBefore, append, applyEdit) {
                    var keyUpdate = { key: key };

                    return new Promise(function (complete, error) {
                        queueEdit(
                            applyEdit, EditType.insert, complete, error, keyUpdate,

                            // updateSlots
                            function () {
                                if (slotInsertBefore) {
                                    var itemNew = {
                                        key: keyUpdate.key,
                                        data: data
                                    };

                                    keyUpdate.slot = insertNewSlot(keyUpdate.key, itemNew, slotInsertBefore, append, !append);
                                }
                            },

                            // undo
                            function () {
                                var slot = keyUpdate.slot;

                                if (slot) {
                                    updateNewIndices(slot, -1);
                                    deleteSlot(slot, false);
                                }
                            }
                        );
                    });
                }

                function moveItem(slot, slotMoveBefore, append, applyEdit) {
                    return new Promise(function (complete, error) {
                        var mergeAdjacent,
                            slotNext,
                            firstInSequence,
                            lastInSequence;

                        queueEdit(
                            applyEdit, EditType.move, complete, error,

                            // keyUpdate
                            null,

                            // updateSlots
                            function () {
                                slotNext = slot.next;
                                firstInSequence = slot.firstInSequence;
                                lastInSequence = slot.lastInSequence;

                                var slotPrev = slot.prev;

                                mergeAdjacent = (typeof slot.index !== "number" && (firstInSequence || !slotPrev.item) && (lastInSequence || !slotNext.item));

                                updateNewIndices(slot, -1);
                                moveSlot(slot, slotMoveBefore, append, !append);
                                updateNewIndices(slot, 1);

                                if (mergeAdjacent) {
                                    splitSequence(slotPrev);

                                    if (!firstInSequence) {
                                        mergeSlotsBefore(slotPrev, slot);
                                    }
                                    if (!lastInSequence) {
                                        mergeSlotsAfter(slotNext, slot);
                                    }
                                }
                            },

                            // undo
                            function () {
                                if (!mergeAdjacent) {
                                    updateNewIndices(slot, -1);
                                    moveSlot(slot, slotNext, !firstInSequence, !lastInSequence);
                                    updateNewIndices(slot, 1);
                                } else {
                                    beginRefresh();
                                }
                            }
                        );
                    });
                }

                function ListDataNotificationHandler() {
                    /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler">
                    /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler">
                    /// An implementation of IListDataNotificationHandler that is passed to the
                    /// IListDataAdapter.setNotificationHandler method. 
                    /// </summary>
                    /// </signature>

                    this.invalidateAll = function () {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.invalidateAll">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.invalidateAll">
                        /// Notifies the VirtualizedDataSource that some data has changed, without specifying which data. It might
                        /// be impractical for some data sources to call this method for any or all changes, so this call is optional.
                        /// But if a given data adapter never calls it, the application should periodically call
                        /// invalidateAll on the VirtualizedDataSource to refresh the data.
                        /// </summary>
                        /// <returns type="Promise" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.invalidateAll_returnValue">
                        /// A Promise that completes when the data has been completely refreshed and all change notifications have
                        /// been sent.
                        /// </returns>
                        /// </signature>

                        if (knownCount === 0) {
                            this.reload();
                            return Promise.wrap();
                        }

                        return requestRefresh();
                    };

                    this.reload = function () {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.reload">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.reload">
                        /// Notifies the list data source that the list data has changed so much that it is better
                        /// to reload the data from scratch. 
                        /// </summary>
                        /// </signature>

                        // Cancel all promises

                        if (getCountPromise) {
                            getCountPromise.cancel();
                        }

                        if (refreshSignal) {
                            refreshSignal.cancel();
                        }

                        for (var slot = slotsStart.next; slot !== slotsEnd; slot = slot.next) {
                            var fetchListeners = slot.fetchListeners;
                            for (var listenerID in fetchListeners) {
                                fetchListeners[listenerID].promise.cancel();
                            }
                            var directFetchListeners = slot.directFetchListeners;
                            for (var listenerID in directFetchListeners) {
                                directFetchListeners[listenerID].promise.cancel();
                            }
                        }

                        resetState();

                        forEachBindingRecord(function (bindingRecord) {
                            if (bindingRecord.notificationHandler) {
                                bindingRecord.notificationHandler.reload();
                            }
                        });
                    };

                    this.beginNotifications = function () {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.beginNotifications">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.beginNotifications">
                        /// Indicates the start of a notification batch. 
                        /// Call it before a sequence of other notification calls to minimize the number of countChanged and
                        /// indexChanged notifications sent to the client of the VirtualizedDataSource. You must pair it with a call
                        /// to endNotifications, and pairs can't be nested.
                        /// </summary>
                        /// </signature>

                        dataNotificationsInProgress = true;
                    };

                    function completeNotification() {
                        if (!dataNotificationsInProgress) {
                            updateIndices();
                            finishNotifications();

                            callFetchCompleteCallbacks();
                        }
                    }

                    this.inserted = function (newItem, previousKey, nextKey, index) {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.inserted">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.inserted">
                        /// Raises a notification that an item was inserted.
                        /// </summary>
                        /// <param name="newItem" type="Object" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.inserted_p:newItem">
                        /// The inserted item. It must have a key and a data property (it must implement the IItem interface). 
                        /// </param>
                        /// <param name="previousKey" mayBeNull="true" type="String" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.inserted_p:previousKey">
                        /// The key of the item before the insertion point, or null if the item was inserted at the start of the
                        /// list.  It can be null if you specified nextKey.
                        /// </param>
                        /// <param name="nextKey" mayBeNull="true" type="String" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.inserted_p:nextKey">
                        /// The key of the item after the insertion point, or null if the item was inserted at the end of the list.
                        /// It can be null if you specified previousKey.
                        /// </param>
                        /// <param name="index" optional="true" type="Number" integer="true" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.inserted_p:index">
                        /// The index of the inserted item.
                        /// </param>
                        /// </signature>

                        if (editsQueued) {
                            // We can't change the slots out from under any queued edits
                            beginRefresh();
                        } else {
                            var key = newItem.key,
                                slotPrev = keyMap[previousKey],
                                slotNext = keyMap[nextKey];

                            var havePreviousKey = typeof previousKey === "string",
                                haveNextKey = typeof nextKey === "string";

                            // Only one of previousKey, nextKey needs to be passed in
                            //
                            if (havePreviousKey) {
                                if (slotNext && !slotNext.firstInSequence) {
                                    slotPrev = slotNext.prev;
                                }
                            } else if (haveNextKey) {
                                if (slotPrev && !slotPrev.lastInSequence) {
                                    slotNext = slotPrev.next;
                                }
                            }

                            // If the VDS believes the list is empty but the data adapter believes the item has
                            // a adjacent item start a refresh.
                            //
                            if ((havePreviousKey || haveNextKey) && !(slotPrev || slotNext) && (slotsStart.next === slotListEnd)) {
                                beginRefresh();
                                return;
                            }

                            // If this key is known, something has changed, start a refresh.
                            //
                            if (keyMap[key]) {
                                beginRefresh();
                                return;
                            }

                            // If the slots aren't adjacent or are thought to be distinct sequences by the
                            //  VDS something has changed so start a refresh.
                            //
                            if (slotPrev && slotNext) {
                                if (slotPrev.next !== slotNext || slotPrev.lastInSequence || slotNext.firstInSequence) {
                                    beginRefresh();
                                    return;
                                }
                            }

                            // If one of the adjacent keys or indicies has only just been requested - rare, 
                            //  and easier to deal with in a refresh.
                            //
                            if ((slotPrev && (slotPrev.keyRequested || slotPrev.indexRequested)) ||
                                (slotNext && (slotNext.keyRequested || slotNext.indexRequested))) {
                                beginRefresh();
                                return;
                            }

                            if (slotPrev || slotNext) {
                                insertNewSlot(key, newItem, (slotNext ? slotNext : slotPrev.next), !!slotPrev, !!slotNext);
                            } else if (slotsStart.next === slotListEnd) {
                                insertNewSlot(key, newItem, slotsStart.next, true, true);
                            } else if (index !== undefined) {
                                updateNewIndicesFromIndex(index, 1);
                            } else {
                                // We could not find a previous or next slot and an index was not provided, start a refresh
                                //
                                beginRefresh();
                                return;
                            }

                            completeNotification();
                        }
                    };

                    this.changed = function (item) {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.changed">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.changed">
                        /// Raises a notification that an item changed. 
                        /// </summary>
                        /// <param name="item" type="Object" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.changed_p:item">
                        /// An IItem that represents the item that changed.
                        /// </param>
                        /// </signature>

                        if (editsQueued) {
                            // We can't change the slots out from under any queued edits
                            beginRefresh();
                        } else {
                            var key = item.key,
                                slot = keyMap[key];

                            if (slot) {
                                if (slot.keyRequested) {
                                    // The key has only just been requested - rare, and easier to deal with in a refresh
                                    beginRefresh();
                                } else {
                                    slot.itemNew = item;

                                    if (slot.item) {
                                        changeSlot(slot);

                                        completeNotification();
                                    }
                                }
                            }
                        }
                    };

                    this.moved = function (item, previousKey, nextKey, oldIndex, newIndex) {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved">
                        /// Raises a notfication that an item was moved. 
                        /// </summary>
                        /// <param name="item" type="Object" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved_p:item">
                        /// The item that was moved. 
                        /// </param>
                        /// <param name="previousKey" mayBeNull="true" type="String" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved_p:previousKey">
                        /// The key of the item before the insertion point, or null if the item was moved to the beginning of the list.
                        /// It can be null if you specified nextKey.
                        /// </param>
                        /// <param name="nextKey" mayBeNull="true" type="String" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved_p:nextKey">
                        /// The key of the item after the insertion point, or null if the item was moved to the end of the list.
                        /// It can be null if you specified previousKey.
                        /// </param>
                        /// <param name="oldIndex" optional="true" type="Number" integer="true" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved_p:oldIndex">
                        /// The index of the item before it was moved.
                        /// </param>
                        /// <param name="newIndex" optional="true" type="Number" integer="true" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.moved_p:newIndex">
                        /// The index of the item after it was moved.
                        /// </param>
                        /// </signature>

                        if (editsQueued) {
                            // We can't change the slots out from under any queued edits
                            beginRefresh();
                        } else {
                            var key = item.key,
                                slot = keyMap[key],
                                slotPrev = keyMap[previousKey],
                                slotNext = keyMap[nextKey];

                            if ((slot && slot.keyRequested) || (slotPrev && slotPrev.keyRequested) || (slotNext && slotNext.keyRequested)) {
                                // One of the keys has only just been requested - rare, and easier to deal with in a refresh
                                beginRefresh();
                            } else if (slot) {
                                if (slotPrev && slotNext && (slotPrev.next !== slotNext || slotPrev.lastInSequence || slotNext.firstInSequence)) {
                                    // Something has changed, start a refresh
                                    beginRefresh();
                                } else if (!slotPrev && !slotNext) {
                                    // If we can't tell where the item moved to, treat this like a removal
                                    updateNewIndices(slot, -1);
                                    deleteSlot(slot, false);

                                    if (oldIndex !== undefined) {
                                        if (oldIndex < newIndex) {
                                            newIndex--;
                                        }

                                        updateNewIndicesFromIndex(newIndex, 1);
                                    }

                                    completeNotification();
                                } else {
                                    updateNewIndices(slot, -1);
                                    moveSlot(slot, (slotNext ? slotNext : slotPrev.next), !!slotPrev, !!slotNext);
                                    updateNewIndices(slot, 1);

                                    completeNotification();
                                }
                            } else if (slotPrev || slotNext) {
                                // If previousKey or nextKey is known, but key isn't, treat this like an insertion.

                                if (oldIndex !== undefined) {
                                    updateNewIndicesFromIndex(oldIndex, -1);

                                    if (oldIndex < newIndex) {
                                        newIndex--;
                                    }
                                }

                                this.inserted(item, previousKey, nextKey, newIndex);
                            } else if (oldIndex !== undefined) {
                                updateNewIndicesFromIndex(oldIndex, -1);

                                if (oldIndex < newIndex) {
                                    newIndex--;
                                }

                                updateNewIndicesFromIndex(newIndex, 1);

                                completeNotification();
                            }
                        }
                    };

                    this.removed = function (key, index) {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.removed">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.removed">
                        /// Raises a notification that an item was removed.
                        /// </summary>
                        /// <param name="key" mayBeNull="true" type="String" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.removed_p:key">
                        /// The key of the item that was removed.
                        /// </param>
                        /// <param name="index" optional="true" type="Number" integer="true" locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.removed_p:index">
                        /// The index of the item that was removed. 
                        /// </param>
                        /// </signature>

                        if (editsQueued) {
                            // We can't change the slots out from under any queued edits
                            beginRefresh();
                        } else {
                            var slot;

                            if (typeof key === "string") {
                                slot = keyMap[key];
                            } else {
                                slot = indexMap[index];
                            }

                            if (slot) {
                                if (slot.keyRequested) {
                                    // The key has only just been requested - rare, and easier to deal with in a refresh
                                    beginRefresh();
                                } else {
                                    updateNewIndices(slot, -1);
                                    deleteSlot(slot, false);

                                    completeNotification();
                                }
                            } else if (index !== undefined) {
                                updateNewIndicesFromIndex(index, -1);
                                completeNotification();
                            }
                        }
                    };

                    this.endNotifications = function () {
                        /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.endNotifications">
                        /// <summary locid="WinJS.UI.VirtualizedDataSource.ListDataNotificationHandler.endNotifications">
                        /// Concludes a sequence of notifications that began with a call to beginNotifications.
                        /// </summary>
                        /// </signature>

                        dataNotificationsInProgress = false;
                        completeNotification();
                    };

                } // ListDataNotificationHandler

                function resetState() {
                    setStatus(DataSourceStatus.ready);

                    // Track count promises
                    getCountPromise = null;

                    // Track whether listDataAdapter.endEdits needs to be called
                    beginEditsCalled = false;

                    // Track whether finishNotifications should be called after each edit
                    editsInProgress = false;

                    // Track whether the first queued edit should be attempted
                    firstEditInProgress = false;

                    // Queue of edis that have yet to be completed
                    editQueue = {};
                    editQueue.next = editQueue;
                    editQueue.prev = editQueue;

                    // Track whether there are currently edits queued
                    editsQueued = false;

                    // If an edit has returned noResponse, the edit queue will be reapplied when the next refresh is requested
                    waitForRefresh = false;

                    // Change to count while multiple edits are taking place
                    countDelta = 0;

                    // True while the indices are temporarily in a bad state due to multiple edits
                    indexUpdateDeferred = false;

                    // Next temporary key to use
                    nextTempKey = 0;

                    // Set of fetches for which results have not yet arrived
                    fetchesInProgress = {};

                    // Queue of complete callbacks for fetches
                    fetchCompleteCallbacks = [];

                    // Tracks the count returned explicitly or implicitly by the data adapter
                    knownCount = CountResult.unknown;

                    // Sentinel objects for list of slots
                    // Give the start sentinel an index so we can always use predecessor + 1.
                    slotsStart = {
                        firstInSequence: true,
                        lastInSequence: true,
                        index: -1
                    };
                    slotListEnd = {
                        firstInSequence: true,
                        lastInSequence: true
                    };
                    slotsEnd = {
                        firstInSequence: true,
                        lastInSequence: true
                    };
                    slotsStart.next = slotListEnd;
                    slotListEnd.prev = slotsStart;
                    slotListEnd.next = slotsEnd;
                    slotsEnd.prev = slotListEnd;

                    // Map of request IDs to slots
                    handleMap = {};

                    // Map of keys to slots
                    keyMap = {};

                    // Map of indices to slots
                    indexMap = {};
                    indexMap[-1] = slotsStart;

                    // Count of slots that have been released but not deleted
                    releasedSlots = 0;

                    lastSlotReleased = null;

                    // At most one call to reduce the number of refresh slots should be posted at any given time
                    reduceReleasedSlotCountPosted = false;

                    // Multiple refresh requests are coalesced
                    refreshRequested = false;

                    // Requests do not cause fetches while a refresh is in progress
                    refreshInProgress = false;

                    // Refresh requests yield the same promise until a refresh completes
                    refreshSignal = null;
                }

                // Construction

                // Process creation parameters
                if (!listDataAdapter) {
                    throw new _ErrorFromName("WinJS.UI.ListDataSource.ListDataAdapterIsInvalid", strings.listDataAdapterIsInvalid);
                }

                // Minimum number of released slots to retain
                cacheSize = (listDataAdapter.compareByIdentity ? 0 : 200);

                if (options) {
                    if (typeof options.cacheSize === "number") {
                        cacheSize = options.cacheSize;
                    }
                }

                // Cached listDataNotificationHandler initially undefined
                if (listDataAdapter.setNotificationHandler) {
                    listDataNotificationHandler = new ListDataNotificationHandler();

                    listDataAdapter.setNotificationHandler(listDataNotificationHandler);
                }

                // Current status
                status = DataSourceStatus.ready;

                // Track whether a change to the status has been posted already
                statusChangePosted = false;

                // Map of bindingIDs to binding records
                bindingMap = {};

                // ID to assign to the next ListBinding, incremented each time one is created
                nextListBindingID = 0;

                // ID assigned to a slot, incremented each time one is created - start with 1 so "if (handle)" tests are valid
                nextHandle = 1;

                // ID assigned to a fetch listener, incremented each time one is created
                nextListenerID = 0;

                // ID of the refresh in progress, incremented each time a new refresh is started
                currentRefreshID = 0;

                // Track whether fetchItemsForAllSlots has been posted already
                fetchesPosted = false;

                // ID of a fetch, incremented each time a new fetch is initiated - start with 1 so "if (fetchID)" tests are valid
                nextFetchID = 1;

                // Sentinel objects for results arrays
                startMarker = {};
                endMarker = {};

                resetState();

                // Public methods

                this.createListBinding = function (notificationHandler) {
                    /// <signature helpKeyword="WinJS.UI.IListDataSource.createListBinding">
                    /// <summary locid="WinJS.UI.IListDataSource.createListBinding">
                    /// Creates an IListBinding object that allows a client to read from the list and receive notifications for
                    /// changes that affect those portions of the list that the client already read.
                    /// </summary>
                    /// <param name="notificationHandler" optional="true" locid="WinJS.UI.IListDataSource.createListBinding_p:notificationHandler">
                    /// An object that implements the IListNotificationHandler interface.  If you omit this parameter,
                    /// change notifications won't be available. 
                    /// </param>
                    /// <returns type="IListBinding" locid="WinJS.UI.IListDataSource.createListBinding_returnValue">
                    /// An object that implements the IListBinding interface.
                    /// </returns>
                    /// </signature>

                    var listBindingID = (nextListBindingID++).toString(),
                        slotCurrent = null,
                        released = false;

                    function retainSlotForCursor(slot) {
                        if (slot) {
                            slot.cursorCount++;
                        }
                    }

                    function releaseSlotForCursor(slot) {
                        if (slot) {
                            if (--slot.cursorCount === 0) {
                                releaseSlotIfUnrequested(slot);
                            }
                        }
                    }

                    function moveCursor(slot) {
                        // Retain the new slot first just in case it's the same slot
                        retainSlotForCursor(slot);
                        releaseSlotForCursor(slotCurrent);
                        slotCurrent = slot;
                    }

                    function adjustCurrentSlot(slot, slotNew) {
                        if (slot === slotCurrent) {
                            if (!slotNew) {
                                slotNew = (
                                    !slotCurrent || slotCurrent.lastInSequence || slotCurrent.next === slotListEnd ?
                                        null :
                                        slotCurrent.next
                                );
                            }
                            moveCursor(slotNew);
                        }
                    }

                    function releaseSlotFromListBinding(slot) {
                        var bindingMap = slot.bindingMap,
                            bindingHandle = bindingMap[listBindingID].handle;

                        delete slot.bindingMap[listBindingID];

                        // See if there are any listBindings left in the map
                        var releaseBindingMap = true,
                            releaseHandle = true;
                        for (var listBindingID2 in bindingMap) {
                            releaseBindingMap = false;
                            if (bindingHandle && bindingMap[listBindingID2].handle === bindingHandle) {
                                releaseHandle = false;
                                break;
                            }
                        }

                        if (bindingHandle && releaseHandle) {
                            delete handleMap[bindingHandle];
                        }
                        if (releaseBindingMap) {
                            slot.bindingMap = null;
                            releaseSlotIfUnrequested(slot);
                        }
                    }

                    function retainItem(slot, listenerID) {
                        if (!slot.bindingMap) {
                            slot.bindingMap = {};
                        }

                        var slotBinding = slot.bindingMap[listBindingID];
                        if (slotBinding) {
                            slotBinding.count++;
                        } else {
                            slot.bindingMap[listBindingID] = {
                                bindingRecord: bindingMap[listBindingID],
                                count: 1
                            };
                        }

                        if (slot.fetchListeners) {
                            var listener = slot.fetchListeners[listenerID];
                            if (listener) {
                                listener.retained = true;
                            }
                        }
                    }

                    function releaseItem(handle) {
                        var slot = handleMap[handle];

                        if (slot) {
                            var slotBinding = slot.bindingMap[listBindingID];
                            if (--slotBinding.count === 0) {
                                var fetchListeners = slot.fetchListeners;
                                for (var listenerID in fetchListeners) {
                                    var listener = fetchListeners[listenerID];
                                    if (listener.listBindingID === listBindingID) {
                                        listener.retained = false;
                                    }
                                }

                                releaseSlotFromListBinding(slot);
                            }
                        }
                    }

                    function itemPromiseFromKnownSlot(slot) {
                        var handle = handleForBinding(slot, listBindingID),
                            listenerID = (nextListenerID++).toString();

                        var itemPromise = createFetchPromise(slot, "fetchListeners", listenerID, listBindingID,
                            function (complete, item) {
                                complete(itemForBinding(item, handle));
                            }
                        );

                        defineCommonItemProperties(itemPromise, slot, handle);

                        // Only implement retain and release methods if a notification handler has been supplied
                        if (notificationHandler) {
                            itemPromise.retain = function () {
                                listBinding._retainItem(slot, listenerID);
                                return itemPromise;
                            };

                            itemPromise.release = function () {
                                listBinding._releaseItem(handle);
                            };
                        }

                        return itemPromise;
                    }

                    bindingMap[listBindingID] = {
                        notificationHandler: notificationHandler,
                        notificationsSent: false,
                        adjustCurrentSlot: adjustCurrentSlot,
                        itemPromiseFromKnownSlot: itemPromiseFromKnownSlot,
                    };

                    function itemPromiseFromSlot(slot) {
                        var itemPromise;

                        if (!released && slot) {
                            itemPromise = itemPromiseFromKnownSlot(slot);
                        } else {
                            // Return a complete promise for a non-existent slot
                            if (released) {
                                itemPromise = new Promise(function () { });
                                itemPromise.cancel();
                            } else {
                                itemPromise = Promise.wrap(null);
                            }
                            defineHandleProperty(itemPromise, null);
                            // Only implement retain and release methods if a notification handler has been supplied
                            if (notificationHandler) {
                                itemPromise.retain = function () { return itemPromise; };
                                itemPromise.release = function () { };
                            }
                        }

                        moveCursor(slot);

                        return itemPromise;
                    }

                    /// <signature helpKeyword="WinJS.UI.IListBinding">
                    /// <summary locid="WinJS.UI.IListBinding">
                    /// An interface that enables a client to read from the list and receive notifications for changes that affect
                    /// those portions of the list that the client already read.  IListBinding can also enumerate through lists
                    /// that can change at any time. 
                    /// </summary>
                    /// </signature>
                    var listBinding = {
                        _retainItem: function (slot, listenerID) {
                            retainItem(slot, listenerID);
                        },

                        _releaseItem: function (handle) {
                            releaseItem(handle);
                        },

                        jumpToItem: function (item) {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.jumpToItem">
                            /// <summary locid="WinJS.UI.IListBinding.jumpToItem">
                            /// Makes the specified item the current item. 
                            /// </summary>
                            /// <param name="item" type="Object" locid="WinJS.UI.IListBinding.jumpToItem_p:item">
                            /// The IItem or IItemPromise to make the current item. 
                            /// </param>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.jumpToItem_returnValue">
                            /// An object that implements the IItemPromise interface and serves as a promise for the specified item.  If
                            /// the specified item is not in the list, the promise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(item ? handleMap[item.handle] : null);
                        },

                        current: function () {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.current">
                            /// <summary locid="WinJS.UI.IListBinding.current">
                            /// Retrieves the current item.
                            /// </summary>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.current_returnValue">
                            /// An object that implements the IItemPromise interface and serves as a promise for the current item.
                            /// If the cursor has moved past the start or end of the list, the promise completes with a value
                            /// of null.  If the current item has been deleted or moved, the promise returns an error.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(slotCurrent);
                        },

                        previous: function () {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.previous">
                            /// <summary locid="WinJS.UI.IListBinding.previous">
                            /// Retrieves the item before the current item and makes it the current item.
                            /// </summary>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.previous_returnValue">
                            /// An object that implements the IItemPromise interface and serves as a promise for the previous item.
                            /// If the cursor moves past the start of the list, the promise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(slotCurrent ? requestSlotBefore(slotCurrent) : null);
                        },

                        next: function () {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.next">
                            /// <summary locid="WinJS.UI.IListBinding.next">
                            /// Retrieves the item after the current item and makes it the current item.
                            /// </summary>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.next_returnValue">
                            /// An object that implements the IItemPromise interface and serves as a promise for the next item.  If
                            /// the cursor moves past the end of the list, the promise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(slotCurrent ? requestSlotAfter(slotCurrent) : null);
                        },

                        releaseItem: function (item) {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.releaseItem">
                            /// <summary locid="WinJS.UI.IListBinding.releaseItem">
                            /// Creates a request to stop change notfications for the specified item. The item is released only when the
                            /// number of release calls matches the number of IItemPromise.retain calls. The number of release calls cannot
                            /// exceed the number of retain calls. This method is present only if you passed an IListNotificationHandler
                            /// to IListDataSource.createListBinding when it created this IListBinding.
                            /// </summary>
                            /// <param name="item" type="Object" locid="WinJS.UI.IListBinding.releaseItem_p:item">
                            /// The IItem or IItemPromise to release.
                            /// </param>
                            /// </signature>

                            this._releaseItem(item.handle);
                        },

                        release: function () {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.release">
                            /// <summary locid="WinJS.UI.IListBinding.release">
                            /// Releases resources, stops notifications, and cancels outstanding promises 
                            /// for all tracked items that this IListBinding returned. 
                            /// </summary>
                            /// </signature>

                            released = true;

                            releaseSlotForCursor(slotCurrent);
                            slotCurrent = null;

                            for (var slot = slotsStart.next; slot !== slotsEnd;) {
                                var slotNext = slot.next;

                                var fetchListeners = slot.fetchListeners;
                                for (var listenerID in fetchListeners) {
                                    var listener = fetchListeners[listenerID];
                                    if (listener.listBindingID === listBindingID) {
                                        listener.promise.cancel();
                                        delete fetchListeners[listenerID];
                                    }
                                }

                                if (slot.bindingMap && slot.bindingMap[listBindingID]) {
                                    releaseSlotFromListBinding(slot);
                                }

                                slot = slotNext;
                            }

                            delete bindingMap[listBindingID];
                        }
                    };

                    // Only implement each navigation method if the data adapter implements certain methods

                    if (itemsFromStart || itemsFromIndex) {
                        listBinding.first = function () {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.first">
                            /// <summary locid="WinJS.UI.IListBinding.first">
                            /// Retrieves the first item in the list and makes it the current item. 
                            /// </summary>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.first_returnValue">
                            /// An IItemPromise that serves as a promise for the requested item.
                            /// If the list is empty, the Promise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(requestSlotAfter(slotsStart));
                        };
                    }

                    if (itemsFromEnd) {
                        listBinding.last = function () {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.last">
                            /// <summary locid="WinJS.UI.IListBinding.last">
                            /// Retrieves the last item in the list and makes it the current item. 
                            /// </summary>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.last_returnValue">
                            /// An IItemPromise that serves as a promise for the requested item.
                            /// If the list is empty, the Promise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(requestSlotBefore(slotListEnd));
                        };
                    }

                    if (itemsFromKey) {
                        listBinding.fromKey = function (key, hints) {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.fromKey">
                            /// <summary locid="WinJS.UI.IListBinding.fromKey">
                            /// Retrieves the item with the specified key and makes it the current item. 
                            /// </summary>
                            /// <param name="key" type="String" locid="WinJS.UI.IListBinding.fromKey_p:key">
                            /// The key of the requested item. It must be a non-empty string.
                            /// </param>
                            /// <param name="hints" locid="WinJS.UI.IListBinding.fromKey_p:hints">
                            /// Domain-specific hints to the IListDataAdapter 
                            /// about the location of the item to improve retrieval time.
                            /// </param>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.fromKey_returnValue">
                            /// An IItemPromise that serves as a promise for the requested item.
                            /// If the list doesn't contain an item with the specified key, the Promise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(slotFromKey(key, hints));
                        };
                    }

                    if (itemsFromIndex || (itemsFromStart && itemsFromKey)) {
                        listBinding.fromIndex = function (index) {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.fromIndex">
                            /// <summary locid="WinJS.UI.IListBinding.fromIndex">
                            /// Retrieves the item with the specified index and makes it the current item. 
                            /// </summary>
                            /// <param name="index" type="Nunmber" integer="true" locid="WinJS.UI.IListBinding.fromIndex_p:index">
                            /// A value greater than or equal to 0 that is the index of the item to retrieve. 
                            /// </param>
                            /// <returns type="IItemPromise" locid="WinJS.UI.IListBinding.fromIndex_returnValue">
                            /// An IItemPromise that serves as a promise for the requested item.
                            /// If the list doesn't contain an item with the specified index, the IItemPromise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(slotFromIndex(index));
                        };
                    }

                    if (itemsFromDescription) {
                        listBinding.fromDescription = function (description) {
                            /// <signature helpKeyword="WinJS.UI.IListBinding.fromDescription">
                            /// <summary locid="WinJS.UI.IListBinding.fromDescription">
                            /// Retrieves the item with the specified description and makes it the current item. 
                            /// </summary>
                            /// <param name="description" locid="WinJS.UI.IListDataSource.fromDescription_p:description">
                            /// The domain-specific description of the requested item, to be interpreted by the list data adapter.
                            /// </param>
                            /// <returns type="Promise" locid="WinJS.UI.IListDataSource.fromDescription_returnValue">
                            /// A Promise for the requested item. If the list doesn't contain an item with the specified description,
                            /// the IItemPromise completes with a value of null.
                            /// </returns>
                            /// </signature>

                            return itemPromiseFromSlot(slotFromDescription(description));
                        };
                    }

                    return listBinding;
                };

                this.invalidateAll = function () {
                    /// <signature helpKeyword="WinJS.UI.IListDataSource.invalidateAll">
                    /// <summary locid="WinJS.UI.IListDataSource.invalidateAll">
                    /// Makes the data source refresh its cached items by re-requesting them from the data adapter.
                    /// The data source generates notifications if the data has changed. 
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI.IListDataSource.invalidateAll_returnValue">
                    /// A Promise that completes when the data has been completely refreshed and all change notifications have been
                    /// sent.
                    /// </returns>
                    /// </signature>

                    return requestRefresh();
                };

                // Create a helper which issues new promises for the result of the input promise
                //  but have their cancelations ref-counted so that any given consumer canceling
                //  their promise doesn't result in the incoming promise being canceled unless
                //  all consumers are no longer interested in the result.
                //
                var countedCancelation = function (incomingPromise, dataSource) {
                    var signal = new _Signal();
                    incomingPromise.then(
                        function (v) { signal.complete(v); },
                        function (e) { signal.error(e); }
                    );
                    var resultPromise = signal.promise.then(null, function (e) {
                        if (e.name === "WinJS.UI.VirtualizedDataSource.resetCount") {
                            getCountPromise = null;
                            return incomingPromise = dataSource.getCount();
                        }
                        return Promise.wrapError(e);
                    });
                    var count = 0;
                    var currentGetCountPromise = {
                        get: function () {
                            count++;
                            return new Promise(
                                function (c, e) { resultPromise.then(c, e); },
                                function () {
                                    if (--count === 0) {
                                        // when the count reaches zero cancel the incoming promise
                                        signal.promise.cancel();
                                        incomingPromise.cancel();
                                        if (currentGetCountPromise === getCountPromise) {
                                            getCountPromise = null;
                                        }
                                    }
                                }
                            );
                        },
                        reset: function () {
                            signal.error(new _ErrorFromName("WinJS.UI.VirtualizedDataSource.resetCount"));
                        },
                        cancel: function () {
                            // if explicitly asked to cancel the incoming promise
                            signal.promise.cancel();
                            incomingPromise.cancel();
                            if (currentGetCountPromise === getCountPromise) {
                                getCountPromise = null;
                            }
                        }
                    };
                    return currentGetCountPromise;
                };

                this.getCount = function () {
                    /// <signature helpKeyword="WinJS.UI.IListDataSource.getCount">
                    /// <summary locid="WinJS.UI.IListDataSource.getCount">
                    /// Retrieves the number of items in the data source. 
                    /// </summary>
                    /// </signature>

                    if (listDataAdapter.getCount) {
                        // Always do a fetch, even if there is a cached result
                        //
                        var that = this;
                        return Promise.wrap().then(function () {
                            if (editsInProgress || editsQueued) {
                                return knownCount;
                            }

                            var requestPromise;

                            if (!getCountPromise) {

                                var relatedGetCountPromise;

                                // Make a request for the count
                                //
                                requestPromise = listDataAdapter.getCount();
                                var synchronous;
                                requestPromise.then(
                                    function () {
                                        if (getCountPromise === relatedGetCountPromise) {
                                            getCountPromise = null;
                                        }
                                        synchronous = true;
                                    },
                                    function () {
                                        if (getCountPromise === relatedGetCountPromise) {
                                            getCountPromise = null;
                                        }
                                        synchronous = true;
                                    }
                                );

                                // Every time we make a new request for the count we can consider the 
                                //  countDelta to be invalidated
                                //
                                countDelta = 0;

                                // Wrap the result in a cancelation counter which will block cancelation
                                //  of the outstanding promise unless all consumers cancel.
                                //
                                if (!synchronous) {
                                    relatedGetCountPromise = getCountPromise = countedCancelation(requestPromise, that);
                                }
                            }

                            return getCountPromise ? getCountPromise.get() : requestPromise;

                        }).then(function (count) {
                            if (!isNonNegativeInteger(count) && count !== undefined) {
                                throw new _ErrorFromName("WinJS.UI.ListDataSource.InvalidRequestedCountReturned", strings.invalidRequestedCountReturned);
                            }

                            if (count !== knownCount) {
                                if (knownCount === CountResult.unknown) {
                                    knownCount = count;
                                } else {
                                    changeCount(count);
                                    finishNotifications();
                                }
                            }

                            if (count === 0) {
                                if (slotsStart.next !== slotListEnd || slotListEnd.next !== slotsEnd) {
                                    // A contradiction has been found
                                    beginRefresh();
                                } else if (slotsStart.lastInSequence) {
                                    // Now we know the list is empty
                                    mergeSequences(slotsStart);
                                    slotListEnd.index = 0;
                                }
                            }

                            return count;
                        }).then(null, function (error) {
                            if (error.name === _UI.CountError.noResponse) {
                                // Report the failure, but still report last known count
                                setStatus(DataSourceStatus.failure);
                                return knownCount;
                            }
                            return Promise.wrapError(error);
                        });
                    } else {
                        // If the data adapter doesn't support the count method, return the VirtualizedDataSource's 
                        //  reckoning of the count.
                        return Promise.wrap(knownCount);
                    }
                };

                if (itemsFromKey) {
                    this.itemFromKey = function (key, hints) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.itemFromKey">
                        /// <summary locid="WinJS.UI.IListDataSource.itemFromKey">
                        /// Retrieves the item with the specified key.
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.itemFromKey_p:key">
                        /// The key of the requested item. It must be a non-empty string.
                        /// </param>
                        /// <param name="hints" locid="WinJS.UI.IListDataSource.itemFromKey_p:hints">
                        /// Domain-specific hints to IListDataAdapter about the location of the item 
                        /// to improve the retrieval time.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.itemFromKey_returnValue">
                        /// A Promise for the requested item. If the list doesn't contain an item with the specified key,
                        /// the Promise completes with a value of null. 
                        /// </returns>
                        /// </signature>

                        return itemDirectlyFromSlot(slotFromKey(key, hints));
                    };
                }

                if (itemsFromIndex || (itemsFromStart && itemsFromKey)) {
                    this.itemFromIndex = function (index) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.itemFromIndex">
                        /// <summary locid="WinJS.UI.IListDataSource.itemFromIndex">
                        /// Retrieves the item at the specified index.
                        /// </summary>
                        /// <param name="index" type="Number" integer="true" locid="WinJS.UI.IListDataSource.itemFromIndex_p:index">
                        /// A value greater than or equal to zero that is the index of the requested item.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.itemFromIndex_returnValue">
                        /// A Promise for the requested item. If the list doesn't contain an item with the specified index,
                        /// the Promise completes with a value of null. 
                        /// </returns>
                        /// </signature>

                        return itemDirectlyFromSlot(slotFromIndex(index));
                    };
                }

                if (itemsFromDescription) {
                    this.itemFromDescription = function (description) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.itemFromDescription">
                        /// <summary locid="WinJS.UI.IListDataSource.itemFromDescription">
                        /// Retrieves the item with the specified description.
                        /// </summary>
                        /// <param name="description" locid="WinJS.UI.IListDataSource.itemFromDescription_p:description">
                        /// Domain-specific info that describes the item to retrieve, to be interpreted by the IListDataAdapter, 
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.itemFromDescription_returnValue">
                        /// A Promise for the requested item. If the list doesn't contain an item with the specified description,
                        /// the Promise completes with a value of null. 
                        /// </returns>
                        /// </signature>

                        return itemDirectlyFromSlot(slotFromDescription(description));
                    };
                }

                this.beginEdits = function () {
                    /// <signature helpKeyword="WinJS.UI.IListDataSource.beginEdits">
                    /// <summary locid="WinJS.UI.IListDataSource.beginEdits">
                    /// Notifies the data source that a sequence of edits is about to begin.  The data source calls
                    /// IListNotificationHandler.beginNotifications and endNotifications each one time for a sequence of edits.
                    /// </summary>
                    /// </signature>

                    editsInProgress = true;
                };

                // Only implement each editing method if the data adapter implements the corresponding ListDataAdapter method

                if (listDataAdapter.insertAtStart) {
                    this.insertAtStart = function (key, data) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.insertAtStart">
                        /// <summary locid="WinJS.UI.IListDataSource.insertAtStart">
                        /// Adds an item to the beginning of the data source. 
                        /// </summary>
                        /// <param name="key" mayBeNull="true" type="String" locid="WinJS.UI.IListDataSource.insertAtStart_p:key">
                        /// The key of the item to insert, if known; otherwise, null. 
                        /// </param>
                        /// <param name="data" locid="WinJS.UI.IListDataSource.insertAtStart_p:data">
                        /// The data for the item to add.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.insertAtStart_returnValue">
                        /// A Promise that contains the IItem that was added or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        // Add item to start of list, only notify if the first item was requested
                        return insertItem(
                            key, data,

                            // slotInsertBefore, append
                            (slotsStart.lastInSequence ? null : slotsStart.next), true,

                            // applyEdit
                            function () {
                                return listDataAdapter.insertAtStart(key, data);
                            }
                        );
                    };
                }

                if (listDataAdapter.insertBefore) {
                    this.insertBefore = function (key, data, nextKey) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.insertBefore">
                        /// <summary locid="WinJS.UI.IListDataSource.insertBefore">
                        /// Inserts an item before another item.
                        /// </summary>
                        /// <param name="key" mayBeNull="true" type="String" locid="WinJS.UI.IListDataSource.insertBefore_p:key">
                        /// The key of the item to insert, if known; otherwise, null. 
                        /// </param>
                        /// <param name="data" locid="WinJS.UI.IListDataSource.insertBefore_p:data">
                        /// The data for the item to insert.
                        /// </param>
                        /// <param name="nextKey" type="String" locid="WinJS.UI.IListDataSource.insertBefore_p:nextKey">
                        /// The key of an item in the data source. The new data is inserted before this item. 
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.insertBefore_returnValue">
                        /// A Promise that contains the IItem that was added or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slotNext = getSlotForEdit(nextKey);

                        // Add item before given item and send notification
                        return insertItem(
                            key, data,

                            // slotInsertBefore, append
                            slotNext, false,

                            // applyEdit
                            function () {
                                return listDataAdapter.insertBefore(key, data, nextKey, adjustedIndex(slotNext));
                            }
                        );
                    };
                }

                if (listDataAdapter.insertAfter) {
                    this.insertAfter = function (key, data, previousKey) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.insertAfter">
                        /// <summary locid="WinJS.UI.IListDataSource.insertAfter">
                        /// Inserts an item after another item.
                        /// </summary>
                        /// <param name="key" mayBeNull="true" type="String" locid="WinJS.UI.IListDataSource.insertAfter_p:key">
                        /// The key of the item to insert, if known; otherwise, null. 
                        /// </param>
                        /// <param name="data" locid="WinJS.UI.IListDataSource.insertAfter_p:data">
                        /// The data for the item to insert.
                        /// </param>
                        /// <param name="previousKey" type="String" locid="WinJS.UI.IListDataSource.insertAfter_p:previousKey">
                        /// The key for an item in the data source. The new item is added after this item. 
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.insertAfter_returnValue">
                        /// A Promise that contains the IItem that was added or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slotPrev = getSlotForEdit(previousKey);

                        // Add item after given item and send notification
                        return insertItem(
                            key, data,

                            // slotInsertBefore, append
                            (slotPrev ? slotPrev.next : null), true,

                            // applyEdit
                            function () {
                                return listDataAdapter.insertAfter(key, data, previousKey, adjustedIndex(slotPrev));
                            }
                        );
                    };
                }

                if (listDataAdapter.insertAtEnd) {
                    this.insertAtEnd = function (key, data) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.insertAtEnd">
                        /// <summary locid="WinJS.UI.IListDataSource.insertAtEnd">
                        /// Adds an item to the end of the data source. 
                        /// </summary>
                        /// <param name="key" mayBeNull="true" type="String" locid="WinJS.UI.IListDataSource.insertAtEnd_p:key">
                        /// The key of the item to insert, if known; otherwise, null. 
                        /// </param>
                        /// <param name="data" locid="WinJS.UI.IListDataSource.insertAtEnd_data">
                        /// The data for the item to insert.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.insertAtEnd_returnValue">
                        /// A Promise that contains the IItem that was added or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        // Add item to end of list, only notify if the last item was requested
                        return insertItem(
                            key, data,

                            // slotInsertBefore, append
                            (slotListEnd.firstInSequence ? null : slotListEnd), false,

                            // applyEdit
                            function () {
                                return listDataAdapter.insertAtEnd(key, data);
                            }
                        );
                    };
                }

                if (listDataAdapter.change) {
                    this.change = function (key, newData) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.change">
                        /// <summary locid="WinJS.UI.IListDataSource.change">
                        /// Overwrites the data of the specified item. 
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.change_p:key">
                        /// The key for the item to replace. 
                        /// </param>
                        /// <param name="newData" type="Object" locid="WinJS.UI.IListDataSource.change_p:newData">
                        /// The new data for the item. 
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.change_returnValue">
                        /// A Promise that contains the IItem that was updated or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slot = getSlotForEdit(key);

                        return new Promise(function (complete, error) {
                            var itemOld;

                            queueEdit(
                                // applyEdit
                                function () {
                                    return listDataAdapter.change(key, newData, adjustedIndex(slot));
                                },

                                EditType.change, complete, error,

                                // keyUpdate
                                null,

                                // updateSlots
                                function () {
                                    itemOld = slot.item;

                                    slot.itemNew = {
                                        key: key,
                                        data: newData
                                    };

                                    if (itemOld) {
                                        changeSlot(slot);
                                    } else {
                                        completeFetchPromises(slot);
                                    }
                                },

                                // undo
                                function () {
                                    if (itemOld) {
                                        slot.itemNew = itemOld;
                                        changeSlot(slot);
                                    } else {
                                        beginRefresh();
                                    }
                                }
                            );
                        });
                    };
                }

                if (listDataAdapter.moveToStart) {
                    this.moveToStart = function (key) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.moveToStart">
                        /// <summary locid="WinJS.UI.IListDataSource.moveToStart">
                        /// Moves the specified item to the beginning of the data source. 
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.moveToStart_p:key">
                        /// The key of the item to move.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.moveToStart_returnValue">
                        /// A Promise that contains the IItem that was moved or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slot = getSlotForEdit(key);

                        return moveItem(
                            slot,

                            // slotMoveBefore, append
                            slotsStart.next, true,

                            // applyEdit
                            function () {
                                return listDataAdapter.moveToStart(key, adjustedIndex(slot));
                            }
                        );
                    };
                }

                if (listDataAdapter.moveBefore) {
                    this.moveBefore = function (key, nextKey) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.moveBefore">
                        /// <summary locid="WinJS.UI.IListDataSource.moveBefore">
                        /// Moves the specified item before another item. 
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.moveBefore_p:key">
                        /// The key of the item to move.
                        /// </param>
                        /// <param name="nextKey" type="String" locid="WinJS.UI.IListDataSource.moveBefore_p:nextKey">
                        /// The key of another item in the data source. The item specified by the key parameter
                        /// is moved to a position immediately before this item. 
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.moveBefore_returnValue">
                        /// A Promise that contains the IItem that was moved or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slot = getSlotForEdit(key),
                            slotNext = getSlotForEdit(nextKey);

                        return moveItem(
                            slot,

                            // slotMoveBefore, append
                            slotNext, false,

                            // applyEdit
                            function () {
                                return listDataAdapter.moveBefore(key, nextKey, adjustedIndex(slot), adjustedIndex(slotNext));
                            }
                        );
                    };
                }

                if (listDataAdapter.moveAfter) {
                    this.moveAfter = function (key, previousKey) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.moveAfter">
                        /// <summary locid="WinJS.UI.IListDataSource.moveAfter">
                        /// Moves an item after another item. 
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.moveAfter_p:key">
                        /// The key of the item to move.
                        /// </param>
                        /// <param name="previousKey" type="String" locid="WinJS.UI.IListDataSource.moveAfter_p:previousKey">
                        /// The key of another item in the data source. The item specified by the key parameter will
                        /// is moved to a position immediately after this item. 
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.moveAfter_returnValue">
                        /// A Promise that contains the IItem that was moved or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slot = getSlotForEdit(key),
                            slotPrev = getSlotForEdit(previousKey);

                        return moveItem(
                            slot,

                            // slotMoveBefore, append
                            slotPrev.next, true,

                            // applyEdit
                            function () {
                                return listDataAdapter.moveAfter(key, previousKey, adjustedIndex(slot), adjustedIndex(slotPrev));
                            }
                        );
                    };
                }

                if (listDataAdapter.moveToEnd) {
                    this.moveToEnd = function (key) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.moveToEnd">
                        /// <summary locid="WinJS.UI.IListDataSource.moveToEnd">
                        /// Moves an item to the end of the data source. 
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.moveToEnd_p:key">
                        /// The key of the item to move.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.moveToEnd_returnValue">
                        /// A Promise that contains the IItem that was moved or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        var slot = getSlotForEdit(key);

                        return moveItem(
                            slot,

                            // slotMoveBefore, append
                            slotListEnd, false,

                            // applyEdit
                            function () {
                                return listDataAdapter.moveToEnd(key, adjustedIndex(slot));
                            }
                        );
                    };
                }

                if (listDataAdapter.remove) {
                    this.remove = function (key) {
                        /// <signature helpKeyword="WinJS.UI.IListDataSource.remove">
                        /// <summary locid="WinJS.UI.IListDataSource.remove">
                        /// Removes an item from the data source. 
                        /// </summary>
                        /// <param name="key" type="String" locid="WinJS.UI.IListDataSource.remove_p:key">
                        /// The key of the item to remove.
                        /// </param>
                        /// <returns type="Promise" locid="WinJS.UI.IListDataSource.remove_returnValue">
                        /// A Promise that contains nothing if the operation was successful or an EditError if an error occurred.
                        /// </returns>
                        /// </signature>

                        validateKey(key);

                        var slot = keyMap[key];

                        return new Promise(function (complete, error) {
                            var slotNext,
                                firstInSequence,
                                lastInSequence;

                            queueEdit(
                                // applyEdit
                                function () {
                                    return listDataAdapter.remove(key, adjustedIndex(slot));
                                },

                                EditType.remove, complete, error,

                                // keyUpdate
                                null,

                                // updateSlots
                                function () {
                                    if (slot) {
                                        slotNext = slot.next;
                                        firstInSequence = slot.firstInSequence;
                                        lastInSequence = slot.lastInSequence;

                                        updateNewIndices(slot, -1);
                                        deleteSlot(slot, false);
                                    }
                                },

                                // undo
                                function () {
                                    if (slot) {
                                        reinsertSlot(slot, slotNext, !firstInSequence, !lastInSequence);
                                        updateNewIndices(slot, 1);
                                        sendInsertedNotification(slot);
                                    }
                                }
                            );
                        });
                    };
                }

                this.endEdits = function () {
                    /// <signature helpKeyword="WinJS.UI.IListDataSource.endEdits">
                    /// <summary locid="WinJS.UI.IListDataSource.endEdits">
                    /// Notifies the data source that a sequence of edits has ended.  The data source will call
                    /// IListNotificationHandler.beginNotifications and endNotifications once each for a sequence of edits.
                    /// </summary>
                    /// </signature>

                    editsInProgress = false;
                    completeEdits();
                };

            } // _baseDataSourceConstructor

            var VDS = _Base.Class.define(function () {
                /// <signature helpKeyword="WinJS.UI.VirtualizedDataSource">
                /// <summary locid="WinJS.UI.VirtualizedDataSource">
                /// Use as a base class when defining a custom data source. Do not instantiate directly. 
                /// </summary>
                /// <event name="statuschanged" locid="WinJS.UI.VirtualizedDataSource_e:statuschanged">
                /// Raised when the status of the VirtualizedDataSource changes between ready, waiting, and failure states.
                /// </event>
                /// </signature>
            }, {
                _baseDataSourceConstructor: _baseDataSourceConstructor,
                _isVirtualizedDataSource: true
            }, { // Static Members
                supportedForProcessing: false
            });
            _Base.Class.mix(VDS, _Events.eventMixin);
            return VDS;
        })

    });

});