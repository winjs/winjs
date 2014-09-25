// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

// Code shared by Items Manager unit tests

module Helper.ItemsManager {
    "use strict";

    var Scheduler = WinJS.Utilities.Scheduler;

    // Override this on the WebUnit command line to desired multiplier
    export var stressLevel = 1;

    export function setTimeout(callback, delay) {
        return window.setTimeout(LiveUnit.GetWrappedCallback(callback), delay);
    };

    export function setImmediate(callback) {
        return WinJS.Utilities._setImmediate(LiveUnit.GetWrappedCallback(callback));
    };

    var seed = 0;
    
    export function seedPseudorandom(n) {
        seed = n;
    };

    export function pseudorandom(nMax) {
        seed = (seed + 0.81282849124) * 2375.238208308;
        seed -= Math.floor(seed);
        
        return Math.floor(seed * nMax);
    };

    export function runStressTest(testOnce, repetitionMultiplier, signalTestCaseCompleted) {
        var test = 0,
            testMax = repetitionMultiplier * Helper.ItemsManager.stressLevel;

        (function continueTest() {
            LiveUnit.LoggingCore.logComment("Test " + test + " of " + testMax);
            Helper.ItemsManager.seedPseudorandom(test);
            testOnce(function () {
                if (++test < testMax) {
                    WinJS.Utilities._setImmediate(continueTest);
                } else {
                    signalTestCaseCompleted();
                }
            });
        })();
    }

    export function simpleItem(index) {
        return "Item" + index;
    }

    function simpleItemArray(count) {
        var array = [];
        for (var i = 0; i < count; ++i) {
            array[i] = Helper.ItemsManager.simpleItem(i);
        }
        return array;
    }

    function bindingList(count) {
        var list = new WinJS.Binding.List();
        for (var i = 0; i < count; ++i) {
            list.push(Helper.ItemsManager.simpleItem(i));
        }
        return list.dataSource;
    }

    function bindingListSimpleFilter(count) {
        var list = new WinJS.Binding.List();
        for (var i = 0; i < count; ++i) {
            list.push(Helper.ItemsManager.simpleItem(i));
        }
        return list.createFiltered(function () { return true; }).dataSource;
    }

    export function simpleTestDataSource(controller, abilities, count) {
        return Helper.ItemsManager.createTestDataSource(simpleItemArray(count), controller, abilities);
    };

    export var defaultLength = 80;

    function listLength(length) {
        return length === undefined ? Helper.ItemsManager.defaultLength : length;
    }

    export function testDataSourceWithDirectives(createTestDataSource) {
        var directives = {
            callMethodsSynchronously: false,
            sendChangeNotifications: false,
            countBeforeDelta: 0,
            countAfterDelta: 0,
            countBeforeOverride: -1,
            countAfterOverride: -1,
            returnIndices: false,
            returnCount: false,
            delay: null
        };
        var controller = {
            directivesForMethod: function (method, args) {
                return {
                    // Copy the current directives
                    callMethodSynchronously: directives.callMethodsSynchronously,
                    sendChangeNotifications: directives.sendChangeNotifications,
                    countBeforeDelta: directives.countBeforeDelta,
                    countAfterDelta: directives.countAfterDelta,
                    countBeforeOverride: directives.countBeforeOverride,
                    countAfterOverride: directives.countAfterOverride,
                    returnIndices: directives.returnIndices,
                    returnCount: directives.returnCount,
                    delay: directives.delay
                };
            }
        };
        // All abilities are enabled
        var dataSource = createTestDataSource(controller);
        dataSource.testDataAdapter.directives = directives;
        return dataSource;
    };

    export function ensureAllAsynchronousRequestsFulfilled(dataSource) {
        dataSource.testDataAdapter.directives.delay = 0;
    }

    export function simpleAsynchronousDataSource(length) {
        return Helper.ItemsManager.testDataSourceWithDirectives(function (controller) {
            // All abilities are enabled
            return Helper.ItemsManager.simpleTestDataSource(controller, null, listLength(length));
        });
    };

    export function simpleSynchronousArrayDataSource(array) {
        var dataSource = Helper.ItemsManager.testDataSourceWithDirectives(function (controller) {
            // All abilities are enabled
            return Helper.ItemsManager.createTestDataSource(array, controller, null);
        });

        dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        return dataSource;
    };

    export function defaultNotificationHandler() {
        function assertUnexpected(methodName) {
            LiveUnit.Assert.isTrue(false, 'Unexpected "' + methodName + '" notification received');
        };

        var countHasChanged = false,
            countChangedBeginNotificationsReceived = false,
            countChangedEndNotificationsReceived = false;

        var notifications = [];

        return {
            dequeueNotification: function () {
                return notifications.shift();
            },

            verifyExpectedNotifications: function (expectedMethods) {
                LiveUnit.Assert.areEqual(expectedMethods.length, notifications.length, "Incorrect number of notifications was received");

                while (notifications.length && expectedMethods.length) {
                    var notification = this.dequeueNotification();
                    var expectedMethod = expectedMethods.shift();
                    LiveUnit.Assert.areEqual(expectedMethod, notification.method, expectedMethod + " notification was not received when expected");
                }

                notifications = [];
            },

            // "Protected" method that should only be called by "derived" notification handlers

            queueNotification: function (method, args) {
                var argsObject;
                switch (method) {
                    case "beginNotifications":
                        argsObject = {};
                        break;

                    case "inserted":
                        argsObject = {
                            item: args[0],
                            previous: args[1],
                            next: args[2]
                        };
                        break;

                    case "changed":
                        argsObject = {
                            newItem: args[0],
                            oldItem: args[1]
                        };
                        break;

                    case "moved":
                        argsObject = {
                            item: args[0],
                            previous: args[1],
                            next: args[2]
                        };
                        break;

                    case "removed":
                        argsObject = {
                            item: args[0],
                            mirage: args[1]
                        };
                        break;

                    case "countChanged":
                        argsObject = {
                            newCount: args[0],
                            oldCount: args[1]
                        };
                        break;

                    case "indexChanged":
                        argsObject = {
                            item: args[0],
                            newIndex: args[1],
                            oldIndex: args[2]
                        };
                        break;

                    case "endNotifications":
                        argsObject = {};
                        break;
                }

                notifications.push({
                    method: method,
                    args: argsObject
                });
            },

            // The following methods should be overridden for notifications that are expected during a test

            beginNotifications: function () {
                // By default, tolerate the one beginNotifications notification caused by countChanged
                if (countChangedBeginNotificationsReceived) {
                    assertUnexpected("endNotifications");
                } else {
                    countChangedBeginNotificationsReceived = true;
                }
            },

            inserted: function (item, previous, next) {
                assertUnexpected("inserted");
            },

            changed: function (newItem, oldItem) {
                assertUnexpected("changed");
            },

            moved: function (item, previous, next) {
                assertUnexpected("moved");
            },
    
            removed: function (item, mirage) {
                assertUnexpected("removed");
            },

            countChanged: function (newCount, oldCount) {
                // By default, tolerate one countChanged notification
                if (countHasChanged) {
                    assertUnexpected("countChanged");
                } else {
                    countHasChanged = true;
                }
            },

            indexChanged: function (item, newIndex, oldIndex) {
                assertUnexpected("indexChanged");
            },

            endNotifications: function () {
                // By default, tolerate the one endNotifications notification caused by countChanged
                if (countChangedEndNotificationsReceived) {
                    assertUnexpected("endNotifications");
                } else {
                    countChangedEndNotificationsReceived = true;
                }
            }
        };
    };
    
    export function verifyRequestCount(testDataSource, expectedCount) {
        LiveUnit.Assert.areEqual(expectedCount, testDataSource.testDataAdapter.requestCount(), "Unexpected number of outstanding requests");
    };

    export function defaultListNotificationHandler() {
        function assertUnexpected(methodName) {
            LiveUnit.Assert.isTrue(false, 'Unexpected "' + methodName + '" notification received');
        };

        var countHasChanged = false,
            countChangedBeginNotificationsReceived = false,
            countChangedEndNotificationsReceived = false;

        var notifications = [];

        return {
            dequeueNotification: function () {
                return notifications.shift();
            },

            clearNotifications: function () {
                notifications = [];
            },

            verifyExpectedNotifications: function (expectedMethods) {
                LiveUnit.Assert.areEqual(expectedMethods.length, notifications.length, "Incorrect number of notifications was received");

                while (notifications.length && expectedMethods.length) {
                    var notification = this.dequeueNotification();
                    var expectedMethod = expectedMethods.shift();
                    LiveUnit.Assert.areEqual(expectedMethod, notification.method, expectedMethod + " notification was not received when expected");
                }

                notifications = [];
            },

            // "Protected" method that should only be called by "derived" notification handlers

            queueNotification: function (method, args) {
                var argsObject;
                switch (method) {
                    case "beginNotifications":
                        argsObject = {};
                        break;

                    case "inserted":
                        argsObject = {
                            item: args[0],
                            previousHandle: args[1],
                            nextHandle: args[2]
                        };
                        break;

                    case "changed":
                        argsObject = {
                            newItem: args[0],
                            oldItem: args[1]
                        };
                        break;

                    case "moved":
                        argsObject = {
                            item: args[0],
                            previousHandle: args[1],
                            nextHandle: args[2]
                        };
                        break;

                    case "removed":
                        argsObject = {
                            handle: args[0],
                            mirage: args[1]
                        };
                        break;

                    case "countChanged":
                        argsObject = {
                            newCount: args[0],
                            oldCount: args[1]
                        };
                        break;

                    case "indexChanged":
                        argsObject = {
                            handle: args[0],
                            newIndex: args[1],
                            oldIndex: args[2]
                        };
                        break;

                    case "endNotifications":
                        argsObject = {};
                        break;
                }

                notifications.push({
                    method: method,
                    args: argsObject
                });
            },

            // The following methods should be overridden for notifications that are expected during a test

            beginNotifications: function () {
                // By default, tolerate the one beginNotifications notification caused by countChanged
                if (countChangedBeginNotificationsReceived) {
                    assertUnexpected("endNotifications");
                } else {
                    countChangedBeginNotificationsReceived = true;
                }
            },

            inserted: function (item, previousHandle, nextHandle) {
                assertUnexpected("inserted");
            },

            changed: function (newItem, oldItem) {
                assertUnexpected("changed");
            },

            moved: function (item, previousHandle, nextHandle) {
                assertUnexpected("moved");
            },
    
            removed: function (handle, mirage) {
                assertUnexpected("removed");
            },

            countChanged: function (newCount, oldCount) {
                // By default, tolerate one countChanged notification
                if (countHasChanged) {
                    assertUnexpected("countChanged");
                } else {
                    countHasChanged = true;
                }
            },

            indexChanged: function (handle, newIndex, oldIndex) {
                assertUnexpected("indexChanged");
            },

            endNotifications: function () {
                // By default, tolerate the one endNotifications notification caused by countChanged
                if (countChangedEndNotificationsReceived) {
                    assertUnexpected("endNotifications");
                } else {
                    countChangedEndNotificationsReceived = true;
                }
            },
        };
    };

    export function setState(testDataSource, values) {
        var items = [];

        for (var i = 0, length = values.length; i < length; ++i) {
            var value = values[i];
            items.push({ key: value, data: Helper.ItemsManager.simpleItem(value) });
        }

        testDataSource.testDataAdapter.replaceItems(items);
    };

    function verifyItemIndex(item, index) {
        if (typeof index === "number") {
            LiveUnit.Assert.areEqual(index, item.index, "Item has incorrect index");
        }
    }

    export function verifyItemData(item, index?) {
        var data = item.data;
        LiveUnit.Assert.isTrue(data !== undefined, "Item " + index + " data is undefined, key: " + item.key);
        LiveUnit.Assert.isTrue(data !== null, "Item " + index + " data is null, key: " + item.key);

        if (+index === index) {
            LiveUnit.Assert.areEqual(Helper.ItemsManager.simpleItem(index), data, "Item " + index + " data has incorrect value");
            verifyItemIndex(item, index);
        }
    };

    export function simpleListNotificationHandler() {
        var handler:any = Helper.ItemsManager.defaultListNotificationHandler();

        var continuationNext;

        handler.setContinuation = function (continuation) {
            LiveUnit.Assert.areEqual(undefined, continuationNext, "Continuation set before previous one has executed");
            continuationNext = continuation;
        }

        // Add methods to build up a list

        var containerHead:any = {},
            containerTail:any = {};

        containerHead.next = containerTail;
        containerTail.prev = containerHead;
        
        var handleMap = {},
            indexMap = [];

        function insertContainer(handle, containerPrev, containerNext) {
            LiveUnit.Assert.areEqual(undefined, handleMap[handle], "Item has already been inserted");

            var container = {
                prev: containerPrev,
                next: containerNext
            };

            containerPrev.next = container;
            containerNext.prev = container;

            handleMap[handle] = container;

            return container;
        }

        function removeContainer(handle) {
            LiveUnit.Assert.isTrue(!!handleMap[handle], "Item is not in list");

            var container = handleMap[handle];

            container.prev.next = container.next;
            container.next.prev = container.prev;

            delete handleMap[handle];
        }

        function insertItem(itemPromise, containerPrev, containerNext) {
            var container:any = insertContainer(itemPromise.handle, containerPrev, containerNext);

            itemPromise.then(function (item) {
                container.item = item;
            });
        }

        handler.prependItemPromise = function (itemPromise) {
            insertContainer(itemPromise.handle, containerHead, containerHead.next);
            itemPromise.retain();

            return itemPromise;
        };

        handler.appendItemPromise = function (itemPromise) {
            insertContainer(itemPromise.handle, containerTail.prev, containerTail);
            itemPromise.retain();

            return itemPromise;
        };

        handler.storeItemPromise = function (itemPromise) {
            LiveUnit.Assert.isTrue(typeof itemPromise.index === "number", "Item does not have a valid index");
            LiveUnit.Assert.isTrue(!indexMap[itemPromise.index], "An item is already stored with the given index");

            indexMap[itemPromise.index] = itemPromise;
            itemPromise.retain();
        };

        handler.removeItemPromiseAtIndex = function (index) {
            LiveUnit.Assert.isTrue(!!indexMap[index], "No item stored at the given index");

            var itemPromise = indexMap[index];
            delete indexMap[index];
            itemPromise.release();
        };

        handler.updateItem = function (item) {
            var container = handleMap[item.handle];

            LiveUnit.Assert.isTrue(!!container, "Item is not in list");
            LiveUnit.Assert.isTrue(!container.item, "Item is already available");

            container.item = item;
        };

        // Add methods for verifying results

        function verifyItemFetched(container, item) {
            LiveUnit.Assert.isTrue(!!container.item, "Item has not been fetched");
        };

        handler.verifyItem = function (item, index) {
            var container = handleMap[item.handle];

            LiveUnit.Assert.isTrue(!!container, "Item has not been stored");

            verifyItemFetched(container, item);

            Helper.ItemsManager.verifyItemData(item, index);
        };

        handler.verifyState = function (values, testDataSource, nullKeysPossible) {
            // Only verify the state of the data source if it's passed in
            var items = testDataSource && testDataSource.testDataAdapter.getItems();

            var container = containerHead.next;

            for (var i = 0, len = values.length; i < len; i++) {
                if (!nullKeysPossible || container.item.key) {
                    LiveUnit.Assert.areEqual(values[i].toString(), container.item.key, "Unexpected key");
                }

                if (items) {
                    if (!nullKeysPossible || container.item.key) {
                        LiveUnit.Assert.areEqual(items[i].key, container.item.key, "Received item key does not match that in data source");
                    }
                    LiveUnit.Assert.areEqual(items[i].data, container.item.data, "Received item data does not match that in data source");
                }

                container = container.next;
            }

            LiveUnit.Assert.areEqual(containerTail, container, "List does not end where expected");
        };

        // Override the notifications we expect in these tests

        handler.beginNotifications = function () {
            this.queueNotification("beginNotifications", arguments);
        };

        function previousContainer(previousHandle, nextHandle) {
            var containerPrev, containerNext;

            if (previousHandle && handleMap[previousHandle]) {
                return handleMap[previousHandle];
            } else if (nextHandle && handleMap[nextHandle]) {
                return handleMap[nextHandle].prev;
            } else if (!previousHandle && !nextHandle) {
                LiveUnit.Assert.isTrue(containerHead.next === containerTail, "null, null notification for a non-empty list");
                return containerHead;
            } else {
                return null;
            }
        }

        handler.inserted = function (itemPromise, previousHandle, nextHandle) {
            this.queueNotification("inserted", arguments);

            itemPromise.retain();

            var containerPrev = previousContainer(previousHandle, nextHandle);
            insertItem(itemPromise, containerPrev, containerPrev.next);
        };

        handler.changed = function (newItem, oldItem) {
            this.queueNotification("changed", arguments);

            LiveUnit.Assert.areEqual(oldItem.handle, newItem.handle, "Changed handles do not match");

            var container = handleMap[newItem.handle];

            LiveUnit.Assert.isTrue(!!container, "Item is not in list");
            LiveUnit.Assert.areEqual(oldItem, container.item, "Wrong item currently in list");

            container.item = newItem;
        };

        handler.moved = function (itemPromise, previousHandle, nextHandle) {
            this.queueNotification("moved", arguments);

            if (handleMap[itemPromise.handle]) {
                removeContainer(itemPromise.handle);
            } else {
                itemPromise.retain();
            }

            var containerPrev = previousContainer(previousHandle, nextHandle);
            insertItem(itemPromise, containerPrev, containerPrev.next);
        };

        handler.removed = function (handle, mirage) {
            this.queueNotification("removed", arguments);

            if (handleMap[handle]) {
                removeContainer(handle);
            }
        };

        handler.countChanged = function (newCount, oldCount) {
            this.queueNotification("countChanged", arguments);
        };

        handler.indexChanged = function (item, newIndex, oldIndex) {
            this.queueNotification("indexChanged", arguments);
        };

        handler.endNotifications = function () {
            this.queueNotification("endNotifications", arguments);

            if (continuationNext) {
                var cn = continuationNext;
                Scheduler.schedule(function () {
                    cn();
                }, Scheduler.Priority.high, null, "TestComponents.simpleListNotificationHandler._continuationNext");
                continuationNext = undefined;
            }
        };

        return handler;
    };

    export function stressListNotificationHandler() {
        var handler:any = {};

        var count;

        var handleCounts = {},
            handleTotalCounts = {},
            handleToKeyMap = {},
            keyToHandleMap = {};

        var beginNotificationsReceived = false;

        // For use in conditional breakpoints
        var requests = 0,
            results = 0;

        // Maintain a simple, sparse linked list

        function insertContainer(container, containerPrev, containerNext) {
            LiveUnit.Assert.isTrue(!containerPrev || !containerPrev.next || containerPrev.next === containerNext, "Items are not adjacent");
            LiveUnit.Assert.isTrue(!containerNext || !containerNext.prev || containerNext.prev === containerPrev, "Items are not adjacent");

            container.prev = containerPrev;
            container.next = containerNext;

            if (containerPrev) {
                containerPrev.next = container;
            }

            if (containerNext) {
                containerNext.prev = container;
            }
        }

        function removeContainer(container, mergeAdjacent) {
            if (container.prev) {
                container.prev.next = (mergeAdjacent ? container.next : null);
            }

            if (container.next) {
                container.next.prev = (mergeAdjacent ? container.prev : null);
            }

            container.prev = null;
            container.next = null;
        }

        // Add methods to retain and release items

        var handleMap = {},
            indexMap = [];

        function containerFromHandle(handle) {
            return handle ? handleMap[handle] : null;
        }

        function createContainer(itemPromise, containerPrev, containerNext) {
            LiveUnit.Assert.isTrue(!!itemPromise.handle, "Null handle on itemPromise");
            LiveUnit.Assert.areEqual(undefined, handleMap[itemPromise.handle], "Item has already been inserted");

            var container = {
                itemPromise: itemPromise
            };

            insertContainer(container, containerPrev, containerNext);

            handleMap[itemPromise.handle] = container;

            return container;
        }

        function destroyContainer(container, mergeAdjacent) {
            var handle = container.itemPromise.handle;

            LiveUnit.Assert.isTrue(!!handleMap[handle], "Item is not in list");

            removeContainer(container, mergeAdjacent);
            
            delete handleMap[handle];
        }

        handler.requestItem = function (itemPromise, index, handlePrev, handleNext) {
            if (!itemPromise.handle) {
                return;
            }

            requests++;

            var handleCount = handleCounts[itemPromise.handle];
            handleCounts[itemPromise.handle] = (handleCount ? handleCount + 1 : 1);

            var handleTotalCount = handleTotalCounts[itemPromise.handle];
            handleTotalCounts[itemPromise.handle] = (handleTotalCount ? handleTotalCount + 1 : 1);

            if (itemPromise.index !== undefined && +index === index) {
                LiveUnit.Assert.areEqual(itemPromise.index, index, "itemPromise has unexpected index");
            }

            if (+index !== index) {
                index = itemPromise.index;
            }

            var containerPrev = containerFromHandle(handlePrev),
                containerNext = containerFromHandle(handleNext);

            var container = containerFromHandle(itemPromise.handle);

            if (container) {
                LiveUnit.Assert.isTrue(!containerPrev || !containerPrev.next || containerPrev.next === container, "Items are not adjacent");
                LiveUnit.Assert.isTrue(!containerNext || !containerNext.prev || containerNext.prev === container, "Items are not adjacent");

                if (container.prev) {
                    if (containerPrev) {
                        LiveUnit.Assert.isTrue(containerPrev === container.prev);
                    }
                } else {
                    container.prev = containerPrev;
                    if (containerPrev) {
                        containerPrev.next = container;
                    }
                }

                if (container.next) {
                    if (containerNext) {
                        LiveUnit.Assert.isTrue(containerNext === container.next);
                    }
                } else {
                    container.next = containerNext;
                    if (containerNext) {
                        containerNext.prev = container;
                    }
                }
            } else {
                container = createContainer(itemPromise, containerPrev, containerNext);

                if (itemPromise.index !== undefined) {
                    LiveUnit.Assert.isTrue(typeof itemPromise.index === "number", "itemPromise does not have a valid index");
                    LiveUnit.Assert.isTrue(beginNotificationsReceived || !indexMap[itemPromise.index], "itemPromise returned with index that is already in use");

                    indexMap[itemPromise.index] = container;
                }

                itemPromise.retain().then(function (item) {
                    if (item && !container.released) {
                        LiveUnit.Assert.isTrue(containerFromHandle(itemPromise.handle) === container, "Duplcate containers created");

                        LiveUnit.Assert.areEqual(itemPromise.handle, item.handle, "Handle for received item does not match that of itemPromise");

                        LiveUnit.Assert.isTrue(!handleToKeyMap[item.handle] || handleToKeyMap[item.handle] === item.key, "Handle has already been returned for different key");
                        handleToKeyMap[item.handle] = item.key;

                        LiveUnit.Assert.isTrue(!keyToHandleMap[item.key] || keyToHandleMap[item.key] === item.handle, "Different handle has already been returned for key");
                        keyToHandleMap[item.key] = item.handle;

                        container.item = item;

                        if (item.index !== undefined) {
                            LiveUnit.Assert.isTrue(typeof item.index === "number", "item does not have a valid index");

                            // In the midst of a batch of notifications, an inserted or moved promise can complete
                            // while the indexes are in a bogus state.
                            if (!beginNotificationsReceived) {
                                // itemPromise or indexChanged handler might have already added container to indexMap
                                LiveUnit.Assert.isTrue(!indexMap[item.index] || indexMap[item.index] === container, "itemPromise completed with index that is already in use");
                            }

                            indexMap[item.index] = container;
                        }
                    }

                    results++;

                    LiveUnit.Assert.isTrue(handleCounts[itemPromise.handle] > 0, "Received more items than requests for given handle");

                    if (handleCounts[itemPromise.handle] > 1) {
                        handleCounts[itemPromise.handle]--;
                    } else {
                        delete handleCounts[itemPromise.handle];
                    }
                });
            }
        }

        function releaseItem(container, mergeAdjacent?) {
            if (container.item) {
                delete handleToKeyMap[container.itemPromise.handle];
                delete keyToHandleMap[container.item.key];
            }

            if (container.itemPromise.index !== undefined && indexMap[container.itemPromise.index] === container) {
                delete indexMap[container.itemPromise.index];
            }

            container.itemPromise.release();

            container.released = true;

            destroyContainer(container, mergeAdjacent);
        }

        handler.releaseSomeItems = function () {
            var keys = Object.keys(handleMap);
            
            if (keys.length > 0) {
                var handle = keys[Helper.ItemsManager.pseudorandom(keys.length)];

                LiveUnit.Assert.isTrue(!!handle, "Invalid handle in map");

                var container = containerFromHandle(handle),
                    i;

                var releaseMax = 20;

                var releaseBefore = Helper.ItemsManager.pseudorandom(releaseMax),
                    containerBefore = container.prev;
                for (i = 0; containerBefore && i < releaseBefore; i++) {
                    var containerPrev = containerBefore.prev;

                    releaseItem(containerBefore);

                    containerBefore = containerPrev;
                }

                var releaseAfter = Helper.ItemsManager.pseudorandom(releaseMax),
                    containerAfter = container.next;
                for (i = 0; containerAfter && i < releaseAfter; i++) {
                    var containerNext = containerAfter.next;

                    releaseItem(containerAfter);

                    containerAfter = containerNext;
                }

                releaseItem(container);
            }
        };

        // Add methods for verifying results

        handler.verifyIntermediateState = function () {
            LiveUnit.Assert.isTrue(!beginNotificationsReceived, "endNotifications not received");

            // Verify that internal data structures are in order and that all observations to date are consistent
            // (i.e. indices are current, all containers retained).
            for (var handle in handleMap) {
                LiveUnit.Assert.isTrue(!!handle, "Invalid handle in map");

                var container = handleMap[handle],
                    index = container.itemPromise.index;

                if (index !== undefined) {
                    LiveUnit.Assert.isTrue(indexMap[index] === container, "Retained item index has changed without notification being sent");
                }

                if (container.prev) {
                    LiveUnit.Assert.isTrue(container.prev.next === container, "Container list malformed");
                    LiveUnit.Assert.isTrue(!!handleMap[container.prev.itemPromise.handle], "Previous item has not been retained properly");

                    if (index !== undefined && container.prev.index !== undefined) {
                        LiveUnit.Assert.areEqual(index - 1, container.prev.index, "Previous item does not have adjacent index");
                    }
                }

                if (container.next) {
                    LiveUnit.Assert.isTrue(container.next.prev === container, "Container list malformed");
                    LiveUnit.Assert.isTrue(!!handleMap[container.next.itemPromise.handle], "Next item has not been retained properly");

                    if (index !== undefined && container.next.index !== undefined) {
                        LiveUnit.Assert.areEqual(index + 1, container.next.index, "Next item does not have adjacent index");
                    }
                }
            }
        };

        function verifyItemFetched(container, item) {
            LiveUnit.Assert.isTrue(!!container.item, "Item has not been fetched");
        };

        handler.verifyItem = function (item, index) {
            LiveUnit.Assert.isTrue(!!item.handle, "Item has invalid handle");

            var container = handleMap[item.handle];

            LiveUnit.Assert.isTrue(!!container, "Item has not been stored");

            verifyItemFetched(container, item);

            Helper.ItemsManager.verifyItemData(item, index);
        };

        handler.verifyFinalState = function (itemArray) {
            // Build a key map
            var keyToIndexMap = {};
            for (var i = 0, len = itemArray.length; i < len; i++) {
                keyToIndexMap[itemArray[i].key] = i;
            }

            // Verify that all observations are true (i.e. "A is in the list", "A's data is blah", "A is before B")
            for (var handle in handleMap) {
                LiveUnit.Assert.isTrue(!!handle, "Invalid handle in map");

                var container = handleMap[handle];

                LiveUnit.Assert.isTrue(!!container.item, "Requested item still has not been fetched");
                LiveUnit.Assert.isTrue(!!container.item.key, "Requested item has null key");

                var index = keyToIndexMap[container.item.key];
                LiveUnit.Assert.isTrue(+index === index, "Retained key no longer in actual list");

                var item = itemArray[index];

                LiveUnit.Assert.areEqual(item.data, container.item.data, "Data of retained and actual items does not match");

                if (container.item.index !== undefined) {
                    LiveUnit.Assert.areEqual(index, container.item.index, "Retained item index does not match actual index");
                    LiveUnit.Assert.isTrue(indexMap[index] === container, "Retained item index has changed without notification being sent");
                }

                if (container.prev) {
                    LiveUnit.Assert.isTrue(!!handleMap[container.prev.itemPromise.handle], "Previous item has not been retained properly");
                    LiveUnit.Assert.areEqual(itemArray[index - 1].key, container.prev.item.key, "Retained previous item does not match actual previous item");
                }

                if (container.next) {
                    LiveUnit.Assert.isTrue(!!handleMap[container.next.itemPromise.handle], "Next item has not been retained properly");
                    LiveUnit.Assert.areEqual(itemArray[index + 1].key, container.next.item.key, "Retained next item does not match actual next item");
                }
            }
        };

        // Override the notifications we expect in these tests

        handler.beginNotifications = function () {
            LiveUnit.Assert.isFalse(beginNotificationsReceived, "Two beginNotifications received in a row");
            beginNotificationsReceived = true;
        };

        handler.inserted = function (itemPromise, previousHandle, nextHandle) {
            // Retain all items we are notified about (since we don't really learn anything by forgetting them)
            handler.requestItem(itemPromise, null, previousHandle, nextHandle);
        };

        handler.changed = function (newItem, oldItem) {
            LiveUnit.Assert.areEqual(oldItem.handle, newItem.handle, "Changed handles do not match");
            LiveUnit.Assert.isTrue(!!oldItem.handle, "Invalid handle on item passed to changed handler");

            var container = containerFromHandle(newItem.handle);
            if (container) {
                LiveUnit.Assert.areEqual(oldItem.handle, container.item.handle, "Wrong item currently in list");
                container.item = newItem;
            }
        };

        handler.moved = function (itemPromise, previousHandle, nextHandle) {
            var container = containerFromHandle(itemPromise.handle);

            if (container) {
                removeContainer(container, true);
                insertContainer(container, containerFromHandle(previousHandle), containerFromHandle(nextHandle));
            } else {
                // Retain all items we are notified about (since we don't really learn anything by forgetting them)
                handler.requestItem(itemPromise, null, previousHandle, nextHandle);
            }
        };

        handler.removed = function (handle, mirage) {
            LiveUnit.Assert.isTrue(!!handle, "Invalid handle passed to removed handler");

            var container = containerFromHandle(handle);
            if (container) {
                releaseItem(container, !mirage);
            }
        };

        handler.countChanged = function (newCount, oldCount) {
            for (var index in indexMap) {
                if (indexMap[index].item) {
                    LiveUnit.Assert.isTrue(index < newCount, "Item with index larger than newCount still retained");
                }
            }

            if (count !== undefined) {
                LiveUnit.Assert.areEqual(oldCount, count, "oldCount does not equal most recent count");
            }
            count = newCount;
        };

        handler.indexChanged = function (handle, newIndex, oldIndex) {
            LiveUnit.Assert.isTrue(!!handle, "Invalid handle passed to indexChanged handler");

            var container = containerFromHandle(handle);
            if (container) {
                if (+oldIndex === oldIndex) {
                    var containerAtIndex = indexMap[oldIndex];
                    if (containerAtIndex && containerAtIndex.itemPromise.handle === handle) {
                        delete indexMap[oldIndex];
                    }
                }

                if (+newIndex === newIndex) {
                    indexMap[newIndex] = container;
                }
            }
        };

        handler.endNotifications = function () {
            LiveUnit.Assert.isTrue(beginNotificationsReceived, "endNotifications received without matching beginNotifications");
            beginNotificationsReceived = false;
        };

        return handler;
    };

}
