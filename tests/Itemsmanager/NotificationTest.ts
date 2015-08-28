// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
/// <reference path="vds-tracing.ts" />

module WinJSTests {

    "use strict";

    var previousTracingOptions;
    var step: number;
    var iteration: number;

    function errorHandler(e) {
        // Currently we're just using this to suppress application termination.
    }

    function testSimpleNotifications(signalTestCaseCompleted, synchronous) {
        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(0),
            handler = Helper.ItemsManager.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        var state0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        Helper.ItemsManager.setState(dataSource, state0);

        var promises = [];

        // Fetch all 10 items
        var itemPromise = listBinding.first();
        for (var i = 0; i < 10; i++) {
            handler.appendItemPromise(itemPromise);
            (function (i) {
                promises.push(itemPromise.then(function (item) {
                    handler.updateItem(item);
                    handler.verifyItem(item, i);
                }));
            })(i);
            itemPromise = listBinding.next();
        }
        itemPromise.then(function (item) {
            LiveUnit.Assert.isNull(item, "Request for item after last item did not return null");
        });

        WinJS.Promise.join(promises).then(function () {
            handler.verifyExpectedNotifications([
                "beginNotifications",
                "countChanged",
                "endNotifications"
            ]);
            handler.verifyState(state0, dataSource);

            // Change the state of the data source, as if it had been changed by an external influence
            var state1 = [0, 1, 2, 7, 3, 4, 5, 6, 8, 9];
            Helper.ItemsManager.setState(dataSource, state1);

            // Force a refresh and wait for it to complete
            dataSource.invalidateAll().then(function () {
                handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "moved",
                    "indexChanged",
                    "indexChanged",
                    "indexChanged",
                    "indexChanged",
                    "indexChanged",
                    "endNotifications"
                ]);
                handler.verifyState(state1, dataSource);

                // Try three moves and and two insertions
                var state2 = [9, 10, 0, 1, 2, 7, 3, 6, 8, 11, 4, 5];
                Helper.ItemsManager.setState(dataSource, state2);

                // Force a refresh and wait for it to complete
                dataSource.invalidateAll().then(function () {
                    handler.verifyExpectedNotifications([
                        "beginNotifications",
                        "moved",
                        "moved",
                        "moved",
                        "inserted",
                        "inserted",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "countChanged",
                        "endNotifications"
                    ]);
                    handler.verifyState(state2, dataSource);

                    // Try a move between two insertions and three deletions
                    var state3 = [10, 0, 1, 7, 3, 12, 2, 13, 8, 11, 4];
                    Helper.ItemsManager.setState(dataSource, state3);

                    // Force a refresh and wait for it to complete
                    dataSource.invalidateAll().then(function () {
                        handler.verifyExpectedNotifications([
                            "beginNotifications",
                            "removed",
                            "removed",
                            "removed",
                            "moved",
                            "inserted",
                            "inserted",
                            "indexChanged",
                            "indexChanged",
                            "indexChanged",
                            "indexChanged",
                            "indexChanged",
                            "indexChanged",
                            "countChanged",
                            "endNotifications"
                        ]);
                        handler.verifyState(state3, dataSource);

                        signalTestCaseCompleted();
                    });
                });
            });
        });
    }

    function testInsertAfterClearNotifications(signalTestCaseCompleted, synchronous) {
        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(5),
            handler = Helper.ItemsManager.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        // Clear the data source
        var state0 = [];
        Helper.ItemsManager.setState(dataSource, state0);

        dataSource.invalidateAll().then(function () {
            handler.verifyExpectedNotifications([
                "beginNotifications",
                "countChanged",
                "endNotifications"
            ]);
            handler.verifyState(state0, dataSource);

            // Append three items to the empty data source
            var state1 = [0, 1, 2];
            Helper.ItemsManager.setState(dataSource, state1);

            dataSource.invalidateAll().then(function () {
                handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
                ]);

                var promises = [];

                // Fetch all the items so that we can verify the state
                var itemPromise = listBinding.first();
                for (var i = 0; ; i++) {
                    handler.appendItemPromise(itemPromise);
                    (function (i) {
                        promises.push(itemPromise.then(function (item) {
                            handler.updateItem(item);
                            handler.verifyItem(item, i);
                        }));
                    })(i);

                    if (i === state1.length - 1) {
                        break;
                    }

                    itemPromise = listBinding.next();
                }

                WinJS.Promise.join(promises).then(function () {
                    handler.verifyState(state1, dataSource);
                    signalTestCaseCompleted();
                });
            });
        });
    }

    var rand = Helper.ItemsManager.pseudorandom;

    function occurs(probability) {
        var granularity = 1000;

        return rand(granularity) < probability * granularity;
    }

    function createTestListBinding(dataSource) {
        var handler = Helper.ItemsManager.stressListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        // Add handler as expando on the ListBinding

        listBinding.handler = handler;

        return listBinding;
    }



    // Stress tests the VirtualizedDataSource by attempting various random operations
    //
    // The following behaviors are currently not configurable:
    //   - Three ListBindings are used to read the data, one by index, one by key/description, and one using index/key
    //   - Random contiguous ranges of items are read using the ListBindings
    //   - Some individual items are read directly from the data source
    //   - Random ranges of items are released
    //   - countBefore/countAfter are often overridden with a random value
    //   - Some random edits are made to the data
    //   - invalidateAll is called periodically
    //   - Requests of the data source are sometimes completed out of order
    //
    // The following parameters control the data source behaviors.  Each is a probability, so a value of 0.0 means the
    // given behavior never occurs, while 1.0 means it always occurs.  Values in between specify frequencies that are
    // interpreted differently depending on the behavior.
    //   - indices: Are the index or count parameters returned with FetchResults? (Occasionally switches "modes".)
    //   - asynchronous: Does a given request completely asynchronously?
    //   - failures: Is the data source connection lost occasionally?
    //   - changes: Is the data changing independently?
    //   - notifications: Does the data source send synchronous change notifications?
    function testRandomUsageOnce(indices, asynchronous, failures, changes, notifications, complete) {
        var count = 300,
            dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(count),
            testDataAdapter = dataSource.testDataAdapter,
            listBinding1 = createTestListBinding(dataSource),
            listBinding2 = createTestListBinding(dataSource),
            listBinding3 = createTestListBinding(dataSource);

        // Probability constants
        var read1 = 0.30,
            read2 = 0.10,
            read3 = 0.20,
            readDirect = 0.03,
            resultsCountOverride = 0.40,
            edit = 0.05,
            refreshDefault = 0.01,
            refreshAfterFailure = 0.20,
            outOfOrder = 0.1;

        // Other constants
        var walkMax = 10,
            countBeforeAfterMax = 20,
            countEditMax = 5,
            countToIndicesSwitchMax = 100,
            countToCountSwitchMax = 100,
            changeCountMax = 10,
            changeSizeMax = 30;

        function localWalk(listBinding, itemPromise, index?) {
            listBinding.handler.requestItem(itemPromise, index);

            var handlePrev = itemPromise.handle;

            // Walk a small distance in each direction

            var j;

            var countBefore = rand(walkMax);
            for (j = 0; j < countBefore; j++) {
                var itemPromisePrevious = listBinding.previous();
                listBinding.handler.requestItem(itemPromisePrevious, index - 1 - j, null, handlePrev);
                handlePrev = itemPromisePrevious.handle;
            }

            listBinding.jumpToItem(itemPromise);
            handlePrev = itemPromise.handle;

            var countAfter = rand(walkMax);
            for (j = 0; j < countAfter; j++) {
                var itemPromiseNext = listBinding.next();
                listBinding.handler.requestItem(itemPromiseNext, index + 1 + j, handlePrev, null);
                handlePrev = itemPromiseNext.handle;
            }
        }

        var newItemID = 0;
        function newData(change?) {
            return "New item " + newItemID++ + (change ? " (change)" : " (edit)");
        }

        var changedItemID = 0;
        function changedData(change?) {
            return "Changed item " + changedItemID++ + (change ? " (change)" : " (edit)");
        }

        function randomIndex(changeSize?) {
            return rand(testDataAdapter.currentCount() - (changeSize ? changeSize - 1 : 0));
        }

        function randomKey() {
            return "" + rand(count);
        }

        var indicesProvided,
            countToIndicesSwitch = 0,
            countProvided,
            countToCountSwitch = 0;

        function setBehaviors() {
            var directives = testDataAdapter.directives;

            // Does the data source return countBefore/countAfter other than those requested?
            var override = occurs(resultsCountOverride);
            directives.countBeforeOverride = (override ? rand(countBeforeAfterMax) : -1);
            directives.countAfterOverride = (override ? rand(countBeforeAfterMax) : -1);

            // Periodically switch between providing and not providing indices
            if (countToIndicesSwitch-- === 0) {
                indicesProvided = occurs(indices);
                countToIndicesSwitch = rand(countToIndicesSwitchMax);
            }
            directives.returnIndices = indicesProvided;

            // Periodically switch between providing and not providing the count
            if (countToCountSwitch-- === 0) {
                countProvided = occurs(indices);    // Use the same probability as for indices
                countToIndicesSwitch = rand(countToCountSwitchMax);
            }
            directives.returnCount = countProvided;

            // Does the request complete asynchronously?
            directives.callMethodsSynchronously = !occurs(asynchronous);

            directives.sendChangeNotifications = occurs(notifications);
        }

        var refresh = refreshDefault;

        dataSource.addEventListener("statuschanged", function (ev) {
            // In the event of a failure, increase the probability of a refresh until one happens
            if (ev.detail === WinJS.UI.DataSourceStatus.failure) {
                refresh = refreshAfterFailure;
            }
        });

        // Run a number of simulation "steps" in each of which the data source fulfills one outstanding request (if
        // there are any) and the clients make various requests at random times.

        var stepCount = 70; //5000;

        step = 0;

        (function stepOnce() {
            var index;

            // Does the next request we fulfill time out?
            testDataAdapter.directives.communicationFailure = occurs(failures);

            // Fulfill one request
            if (occurs(outOfOrder)) {
                testDataAdapter.fulfillRandomRequest();
            } else {
                testDataAdapter.fulfillNextRequest();
            }

            // The first binding reads by index only
            if (occurs(read1)) {
                index = rand(count);
                setBehaviors();
                localWalk(listBinding1, listBinding1.fromIndex(index), index);
            }

            // The second binding reads by key or description
            if (occurs(read2)) {
                index = rand(count);
                setBehaviors();
                localWalk(listBinding2, rand(2) ? listBinding2.fromKey("" + index) : listBinding2.fromDescription("" + index));
            }

            // The third binding reads by index or key
            if (occurs(read3)) {
                index = rand(count);
                setBehaviors();
                localWalk(listBinding3, rand(2) ? listBinding3.fromIndex(index) : listBinding3.fromKey("" + index));
            }

            // Direct reads are by index, key or description
            if (occurs(readDirect)) {
                index = rand(count);
                setBehaviors();

                // This test won't pay attention to the results of these fetches
                switch (rand(3)) {
                    case 0:
                        dataSource.itemFromIndex(index);
                        break;

                    case 1:
                        dataSource.itemFromKey("" + index);
                        break;

                    case 2:
                        dataSource.itemFromDescription("" + index);
                        break;
                }
            }

            // Release items using the same read probabilities
            if (occurs(read1)) {
                listBinding1.handler.releaseSomeItems();
            }
            if (occurs(read2)) {
                listBinding2.handler.releaseSomeItems();
            }
            if (occurs(read3)) {
                listBinding3.handler.releaseSomeItems();
            }

            // Edits can be made to any item, whether or not it has already been requested
            if (occurs(edit)) {
                var editCount = rand(countEditMax);

                // Just use the original keys for the edits; some will have been removed, so some of these edits will
                // fail and be undone
                for (var i = 0; i < editCount; i++) {
                    switch (rand(10)) {
                        case 0:
                            dataSource.insertAtStart(null, newData()).then(null, errorHandler);
                            break;

                        case 1:
                            dataSource.insertBefore(null, newData(), randomKey()).then(null, errorHandler);
                            break;

                        case 2:
                            dataSource.insertAfter(null, newData(), randomKey()).then(null, errorHandler);
                            break;

                        case 3:
                            dataSource.insertAtEnd(null, newData()).then(null, errorHandler);
                            break;

                        case 4:
                            dataSource.change(randomKey(), changedData()).then(null, errorHandler);
                            break;

                        case 5:
                            dataSource.moveToStart(randomKey()).then(null, errorHandler);
                            break;

                        case 6:
                            dataSource.moveBefore(randomKey(), randomKey()).then(null, errorHandler);
                            break;

                        case 7:
                            dataSource.moveAfter(randomKey(), randomKey()).then(null, errorHandler);
                            break;

                        case 8:
                            dataSource.moveToEnd(randomKey()).then(null, errorHandler);
                            break;

                        case 9:
                            dataSource.remove(randomKey()).then(null, errorHandler);
                            break;
                    }
                }
            }

            // Sometimes cause a refresh manually
            if (occurs(refresh)) {
                dataSource.invalidateAll();
                refresh = refreshDefault;
            }

            // Does the underlying data change?
            if (occurs(changes)) {
                var changeCount = rand(changeCountMax);

                testDataAdapter.directives.sendChangeNotifications = false;
                for (var i = 0; i < changeCount; i++) {
                    // Half the time, a single item is moved
                    var changeSize = rand(2) ? 1 : rand(changeSizeMax),
                        indexSource = randomIndex(changeSize),
                        indexDestination = rand(testDataAdapter.currentCount() + 1),
                        operation = rand(4);

                    for (var j = 0; j < changeSize; j++) {
                        switch (operation) {
                            case 0:
                                testDataAdapter.insertAtIndex(newData(true), indexDestination + j);
                                break;

                            case 1:
                                testDataAdapter.changeAtIndex(indexSource + j, changedData(true));
                                break;

                            case 2:
                                testDataAdapter.moveToIndex(indexSource, indexDestination + (indexSource < indexDestination ? 0 : j));
                                break;

                            case 3:
                                testDataAdapter.removeAtIndex(indexSource);
                                break;
                        }
                    }
                }
            }

            listBinding1.handler.verifyIntermediateState();
            listBinding2.handler.verifyIntermediateState();
            listBinding3.handler.verifyIntermediateState();

            var extraIterations = 0;

            // See if it's time to wrap up and wait for everything to complete
            if (++step < stepCount) {
                WinJS.Utilities._setImmediate(stepOnce);
            } else {
                // Refresh one last time in case there were errors and fetching stopped
                dataSource.invalidateAll();

                // Rather than adding a then handler to invalidateAll, enter a loop to keep fulfilling requests until
                // the requests have clearly stopped.
                (function completeAllRequests() {
                    if (testDataAdapter.requestCount() === 0 && !testDataAdapter.requestFulfilledSynchronously()) {
                        extraIterations++;
                    } else {
                        extraIterations = 0;
                    }

                    if (extraIterations === 3) {
                        var itemArray = testDataAdapter.getItems();
                        listBinding1.handler.verifyFinalState(itemArray);
                        listBinding2.handler.verifyFinalState(itemArray);
                        listBinding3.handler.verifyFinalState(itemArray);

                        complete();
                    } else {
                        testDataAdapter.fulfillAllRequests();
                        WinJS.Utilities._setImmediate(completeAllRequests);
                    }
                })();
            }
        })();

        // REVIEW: With groups, no edits, and be careful to keep groups contiguous while inserting/removing in underlying data
        //         (Though GroupDataSource probably needs to tolerate non-contiguous groups, as we can hit that state briefly.)

    }

    function testRandomUsage(indices, asynchronous, failures, changes, notifications, signalTestCaseCompleted) {
        var iterationCount = 5 * Helper.ItemsManager.stressLevel;

        iteration = 0;

        (function continueTest() {
            LiveUnit.LoggingCore.logComment("Test " + iteration + " of " + iterationCount);
            Helper.ItemsManager.seedPseudorandom(iteration);
            testRandomUsageOnce(indices, asynchronous, failures, changes, notifications, function () {
                if (++iteration < iterationCount) {
                    WinJS.Utilities._setImmediate(continueTest);
                } else {
                    signalTestCaseCompleted();
                }
            });
        })();
    }

    // verify the newCount and oldCount returned in countChanged handler are correct. No difference is expected in sync/async mode although testing both of them.
    function testCountChangedNotificationWithChangingDataSource(signalTestCaseCompleted, synchronous) {
        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(5),
            handler = Helper.ItemsManager.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);
        var newCountValue = 0;
        var oldCountValue: any = 0;
        var testCount = 2; // number of countChanged should be called. Using this variable to terminate this test.

        handler.countChanged = function (newCount, oldCount) {
            this.queueNotification("countChanged", arguments);
            LiveUnit.Assert.areEqual(newCount, newCountValue, "Expecting: " + newCountValue.toString() + "; Actual: " + newCount.toString());
            LiveUnit.Assert.areEqual(oldCount, oldCountValue, "Expecting: " + oldCountValue.toString() + "; Actual: " + oldCount.toString());
            testCount--;
            if (testCount === 0) {
                signalTestCaseCompleted();
            }
        };

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        var state0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        Helper.ItemsManager.setState(dataSource, state0);
        newCountValue = 10;
        oldCountValue = "unknown";

        listBinding.first().then(function () {
            var state1 = [0, 1, 2, 3, 4];
            Helper.ItemsManager.setState(dataSource, state1);
            oldCountValue = newCountValue;
            newCountValue = 5;
            return dataSource.invalidateAll();
        })
            .then(function () {
                var state2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
                Helper.ItemsManager.setState(dataSource, state2);
                oldCountValue = newCountValue;
                newCountValue = 12;
                return dataSource.invalidateAll();
            }).done();

    }

    export class NotificationTests {

        setUp() {
            previousTracingOptions = VDSLogging.options;
            VDSLogging.options = {
                log: function (message) { LiveUnit.Assert.fail(message); },
                include: /createListBinding|_retainItem|_releaseItem|release/,
                handleTracking: true,
                logVDS: true,
                stackTraceLimit: 0 // set this to 100 to get good stack traces if you run into a failure.
            };
            VDSLogging.on();
        }

        tearDown() {
            VDSLogging.off();
            VDSLogging.options = previousTracingOptions;
        }

        testEmptyListNotifications(signalTestCaseCompleted) {
            var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(0),
                handler = Helper.ItemsManager.simpleListNotificationHandler(),
                listBinding = dataSource.createListBinding(handler);

            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);

            // Fetch the first item, which should return a placeholder
            var itemPromise = listBinding.first();
            handler.appendItemPromise(itemPromise);

            // Wait for the fetch to discover that the item doesn't exist
            itemPromise.then(function (item) {
                LiveUnit.Assert.isNull(item, "First item in list known to be empty not null");
                Helper.ItemsManager.verifyRequestCount(dataSource, 0);

                // This will actually be called from the refresh - wait for it to complete
                Helper.ItemsManager.setImmediate(function () {
                    Helper.ItemsManager.verifyRequestCount(dataSource, 0);

                    // The notifications will have been sent after the promise completed, so verify them now
                    handler.verifyExpectedNotifications([
                        "beginNotifications",
                        "removed",
                        "countChanged",
                        "endNotifications"
                    ]);

                    // Fetch the last item, which should return null synchronously
                    var synchronous = false;
                    listBinding.last().then(function (item2) {
                        synchronous = true;
                        LiveUnit.Assert.isNull(item2, "Last item in list known to be empty not null");
                    });
                    LiveUnit.Assert.isTrue(synchronous, "Fetching last item did not complete synchronously");

                    // Fetch the first item again, which should return null synchronously this time
                    synchronous = false;
                    listBinding.first().then(function (item2) {
                        synchronous = true;
                        LiveUnit.Assert.isNull(item2, "First item in list known to be empty not null");
                    });
                    LiveUnit.Assert.isTrue(synchronous, "Fetching first item did not complete synchronously");

                    // We don't expect there to be any outstanding requests, or to have received any notifications
                    Helper.ItemsManager.verifyRequestCount(dataSource, 0);
                    handler.verifyExpectedNotifications([]);

                    signalTestCaseCompleted();
                });
            });
        }

        testSimpleNotificationsAsynchronous(signalTestCaseCompleted) {
            testSimpleNotifications(signalTestCaseCompleted, false);
        }

        testSimpleNotificationsSynchronous(signalTestCaseCompleted) {
            testSimpleNotifications(signalTestCaseCompleted, true);
        }

        testInsertNotifications(signalTestCaseCompleted) {
            var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(5),
                handler = Helper.ItemsManager.simpleListNotificationHandler(),
                listBinding = dataSource.createListBinding(handler);

            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;

            var state0 = [0, 1, 2, 3, 4];
            Helper.ItemsManager.setState(dataSource, state0);

            var promises = [];

            // Fetch just the first three items
            var itemPromise = listBinding.first();
            for (var i = 0; ; i++) {
                handler.appendItemPromise(itemPromise);
                (function (i) {
                    promises.push(itemPromise.then(function (item) {
                        handler.updateItem(item);
                        handler.verifyItem(item, i);
                    }));
                })(i);

                if (i === 2) {
                    break;
                }

                itemPromise = listBinding.next();
            }

            WinJS.Promise.join(promises).then(function () {
                handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
                ]);

                // Append three items directly to the data source
                var state1 = [0, 1, 2, 3, 4, 5, 6, 7];
                Helper.ItemsManager.setState(dataSource, state1);

                // Force a refresh and wait for it to complete
                dataSource.invalidateAll().then(function () {
                    // We should have received countChanged, but no inserted notifications
                    handler.verifyExpectedNotifications([
                        "beginNotifications",
                        "countChanged",
                        "endNotifications"
                    ]);

                    // Don't verify state here, since only a portion of the list has been read

                    signalTestCaseCompleted();
                });
            });
        }

        testInsertAtEndNotifications(signalTestCaseCompleted) {
            var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(5),
                handler = Helper.ItemsManager.simpleListNotificationHandler(),
                listBinding = dataSource.createListBinding(handler);

            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;

            var state0 = [0, 1, 2, 3, 4];
            Helper.ItemsManager.setState(dataSource, state0);

            var promises = [];

            // Fetch all the items
            var itemPromise = listBinding.first();
            for (var i = 0; ; i++) {
                handler.appendItemPromise(itemPromise);
                (function (i) {
                    promises.push(itemPromise.then(function (item) {
                        handler.updateItem(item);
                        handler.verifyItem(item, i);
                    }));
                })(i);

                if (i === state0.length - 1) {
                    break;
                }

                itemPromise = listBinding.next();
            }

            WinJS.Promise.join(promises).then(function () {
                handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
                ]);

                // Append three items directly to the data source
                var state1 = [0, 1, 2, 3, 4, 5, 6, 7];
                Helper.ItemsManager.setState(dataSource, state1);

                // Force a refresh and wait for it to complete
                dataSource.invalidateAll().then(function () {
                    // Because we'd "observed" the end of the list, we should have received three inserted notifications,
                    // plus countChanged.
                    handler.verifyExpectedNotifications([
                        "beginNotifications",
                        "inserted",
                        "inserted",
                        "inserted",
                        "countChanged",
                        "endNotifications"
                    ]);

                    // Don't verify state here, since only a portion of the list has been read

                    signalTestCaseCompleted();
                });
            });
        }

        testInsertAfterClearNotificationsAsynchronous(signalTestCaseCompleted) {
            testInsertAfterClearNotifications(signalTestCaseCompleted, false);
        }

        testInsertAfterClearNotificationsSynchronous(signalTestCaseCompleted) {
            testInsertAfterClearNotifications(signalTestCaseCompleted, true);
        }

        testRefreshWithTwoListBindings(signalTestCaseCompleted) {
            var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(0),
                handler1 = Helper.ItemsManager.simpleListNotificationHandler(),
                listBinding1 = dataSource.createListBinding(handler1),
                handler2 = Helper.ItemsManager.simpleListNotificationHandler(),
                listBinding2 = dataSource.createListBinding(handler2);

            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);

            var state0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

            Helper.ItemsManager.setState(dataSource, state0);

            var promises = [];

            // Fetch the first three items using one ListBinding
            var itemPromise = listBinding1.first();
            for (var i = 0; ; i++) {
                handler1.appendItemPromise(itemPromise);
                (function (i) {
                    promises.push(itemPromise.then(function (item) {
                        handler1.updateItem(item);
                        handler1.verifyItem(item, i);
                    }));
                })(i);

                if (i === 2) {
                    break;
                }

                itemPromise = listBinding1.next();
            }

            WinJS.Promise.join(promises).then(function () {
                handler1.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
                ]);
                handler2.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
                ]);

                // Now have the other ListBinding request some items by key
                handler2.appendItemPromise(listBinding2.fromKey("2"));
                handler2.appendItemPromise(listBinding2.fromKey("7"));

                // Before the data source gets a chance to respond, cause a refresh
                dataSource.invalidateAll().then(function () {
                    // Since there were no mirages and nothing actually changed in the data, the only notification received
                    // should be an indexChanged when the index for item "7" was determined.
                    handler1.verifyExpectedNotifications([]);
                    handler2.verifyExpectedNotifications([
                        "beginNotifications",
                        "indexChanged",
                        "endNotifications"
                    ]);

                    signalTestCaseCompleted();
                });
            });
        }

        testRandomUsageWithoutIndependentChanges(signalTestCaseCompleted) {
            testRandomUsage(
                0.30,    // indices
                0.80,    // asynchronous
                0.02,    // failures
                0.00,    // changes
                0.00,    // notifications
                signalTestCaseCompleted
                );
        }

        xtestRandomUsageWithoutNotifications(signalTestCaseCompleted) {
            testRandomUsage(
                0.30,    // indices
                0.80,    // asynchronous
                0.02,    // failures
                0.20,    // changes
                0.00,    // notifications
                signalTestCaseCompleted
                );
        }

        xtestRandomUsageWithNotifications(signalTestCaseCompleted) {
            testRandomUsage(
                0.30,    // indices
                0.80,    // asynchronous
                0.02,    // failures
                0.20,    // changes
                0.30,    // notifications
                signalTestCaseCompleted
                );
        }

        testCountChangedNotificationWithChangingDataSourceAsynchronous(signalTestCaseCompleted) {
            testCountChangedNotificationWithChangingDataSource(signalTestCaseCompleted, false);
        }

        testCountChangedNotificationWithChangingDataSourceSynchronous(signalTestCaseCompleted) {
            testCountChangedNotificationWithChangingDataSource(signalTestCaseCompleted, true);
        }
    };
    
    var disabledTestRegistry = {
        testRandomUsageWithoutIndependentChanges: [Helper.Browsers.chrome, Helper.Browsers.safari]
    };
    Helper.disableTests(NotificationTests, disabledTestRegistry);
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.NotificationTests");
