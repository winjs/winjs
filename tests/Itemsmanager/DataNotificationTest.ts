// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/UnitTestsCommon.ts" />
/// <reference path="vds-tracing.ts" />


module WinJSTests {

    "use strict";

    var previousTracingOptions;

    export class DataNotificationTests {


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

        testDataNotifications(signalTestCaseCompleted) {
            var dataSource = TestComponents.simpleAsynchronousDataSource(0),
                testDataAdapter = dataSource.testDataAdapter,
                handler = TestComponents.simpleListNotificationHandler(),
                listBinding = dataSource.createListBinding(handler);
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
            dataSource.testDataAdapter.directives.sendChangeNotifications = true;

            var state0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

            TestComponents.setState(dataSource, state0);

            // Fetch the first item
            var itemPromise = listBinding.first();
            handler.appendItemPromise(itemPromise);

            itemPromise.then(function (item) {
                handler.updateItem(item);
                handler.verifyItem(item, 0);

                TestComponents.setImmediate(function () {
                    handler.verifyExpectedNotifications([
                        "beginNotifications",
                        "countChanged",
                        "endNotifications"
                    ]);

                    var promises = [];

                    // Fetch the remaining 9 items
                    for (var i = 1; i < 10; i++) {
                        itemPromise = listBinding.next();
                        handler.appendItemPromise(itemPromise);
                        (function (i) {
                            promises.push(itemPromise.then(function (item2) {
                                handler.updateItem(item2);
                                handler.verifyItem(item2, i);
                            }));
                        })(i);
                    }

                    WinJS.Promise.join(promises).then(function () {
                        TestComponents.verifyRequestCount(dataSource, 0);

                        handler.verifyExpectedNotifications([]);
                        handler.verifyState(state0, dataSource);

                        // Now try an insertion at the start of the list

                        var state1 = [10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

                        testDataAdapter.insertAtIndex(TestComponents.simpleItem(10), 0);

                        handler.verifyExpectedNotifications([
                            "beginNotifications",
                            "inserted",
                            "indexChanged",
                            "indexChanged",
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
                        handler.verifyState(state1, dataSource);

                        // Force a refresh, and continue the test once that has completed
                        dataSource.invalidateAll().then(function () {
                            // No notifications should have been sent
                            handler.verifyExpectedNotifications([]);
                            handler.verifyState(state1, dataSource);

                            // Try other kinds of edits

                            var state2 = [10, 0, 1, 3, 4, 5, 6, 7, 8, 9, 11],
                                newData = "A new string";

                            testDataAdapter.beginModifications();
                            testDataAdapter.removeAtIndex(testDataAdapter.indexFromKey("2"));
                            testDataAdapter.changeAtIndex(testDataAdapter.indexFromKey("4"), newData);
                            testDataAdapter.insertAtIndex(TestComponents.simpleItem(11), state2.length - 1);

                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "removed",
                                "changed",
                                "inserted",
                            ]);

                            testDataAdapter.endModifications();

                            handler.verifyExpectedNotifications([
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "endNotifications"
                            ]);

                            // Change item 4 back, so verifyState finds the expected value
                            testDataAdapter.changeAtIndex(testDataAdapter.indexFromKey("4"), TestComponents.simpleItem(4));

                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "changed",
                                "endNotifications"
                            ]);
                            handler.verifyState(state2, dataSource);

                            var state3 = [13, 12, 9, 10, 1, 3, 4, 5, 6, 0, 7, 11, 8];

                            // Try several more singleton edits, going through the following states:
                            //
                            // [10, 0, 1, 3, 4, 5, 6, 7, 8, 9, 11]
                            // [10, 1, 3, 4, 5, 6, 0, 7, 8, 9, 11]
                            // [9, 10, 1, 3, 4, 5, 6, 0, 7, 8, 11]
                            // [9, 10, 1, 12, 3, 4, 5, 6, 0, 7, 8, 11]
                            // [12, 9, 10, 1, 3, 4, 5, 6, 0, 7, 8, 11]
                            // [13, 12, 9, 10, 1, 3, 4, 5, 6, 0, 7, 8, 11]
                            // [13, 12, 9, 10, 1, 3, 4, 5, 6, 0, 7, 11, 8]

                            testDataAdapter.beginModifications();
                            testDataAdapter.moveToIndex(testDataAdapter.indexFromKey("0"), testDataAdapter.indexFromKey("6") + 1);  // Move "0" after "6"
                            testDataAdapter.moveToIndex(testDataAdapter.indexFromKey("9"), 0);                                      // Move "9" to start
                            testDataAdapter.insertAtIndex(TestComponents.simpleItem("12"), testDataAdapter.indexFromKey("1"));      // Insert "12" after "1"
                            testDataAdapter.moveToIndex(testDataAdapter.indexFromKey("12"), testDataAdapter.indexFromKey("9"));     // Move "12" before "9"
                            testDataAdapter.insertAtIndex(TestComponents.simpleItem("13"), testDataAdapter.indexFromKey("12"));     // Insert "13" before "12"
                            testDataAdapter.moveToIndex(testDataAdapter.indexFromKey("8"), state3.length);                          // Move "8" to end
                            testDataAdapter.endModifications();

                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "moved",
                                "moved",
                                "inserted",
                                "moved",
                                "inserted",
                                "moved",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
                                "indexChanged",
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
                            handler.verifyState(state3, dataSource);

                            // Force a refresh, and continue the test once that has completed
                            dataSource.invalidateAll().then(function () {
                                // Again, no notifications should have been sent
                                handler.verifyExpectedNotifications([]);
                                handler.verifyState(state3, dataSource);

                                signalTestCaseCompleted();
                            });
                        });
                    });
                });
            });
        }
    };
}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.DataNotificationTests");
