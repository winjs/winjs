// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/UnitTestsCommon.ts" />
/// <reference path="vds-tracing.js" />

var EditingTests = function () {
    "use strict";

    var previousTracingOptions;

    this.setUp = function () {
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

    this.tearDown = function () {
        VDSLogging.off();
        VDSLogging.options = previousTracingOptions;
    }

    // Store edit result, use "recordEditSuccess" callback, clear it before.
    var editSucceeded = false;

    function clearLastEdit() {
        editSucceeded = false;
    }

    function recordEditSuccess() {
        editSucceeded = true;
    }

    function verifyLastEditSuccessful() {
        LiveUnit.Assert.isTrue(editSucceeded, "Edit did not succeed");
    }

    function testEditing(signalTestCaseCompleted, synchronous) {
        var dataSource = TestComponents.simpleAsynchronousDataSource(0),
            handler = TestComponents.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

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

                    clearLastEdit();
                    var insertPromise = dataSource.insertAtStart(null, TestComponents.simpleItem(10)).then(function () {
                        recordEditSuccess();
                    });

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
                    handler.verifyState(state1, null, true);

                    insertPromise.then(function (item2) {
                        // After an asynchronous insertions, a changed notification will be sent when the edit
                        // completes.
                        handler.verifyExpectedNotifications(synchronous ?
                            [] :
                            [
                                "beginNotifications",
                                "changed",
                                "endNotifications"
                            ]
                        );

                        if (item2) {
                            LiveUnit.Assert.isTrue(typeof item.key === "string");
                        }

                        // Don't have to tolerate null keys now
                        handler.verifyState(state1);

                        // Force a refresh, and continue the test once that has completed
                        dataSource.invalidateAll().then(function () {
                            verifyLastEditSuccessful();

                            // No notifications should have been sent
                            handler.verifyExpectedNotifications([]);
                            handler.verifyState(state1, dataSource);

                            // Try other kinds of edits.  Don't bother to verify success from now on.

                            var state2 = [10, 0, 1, 3, 4, 5, 6, 7, 8, 9, 11],
                                newData = "A new string";

                            dataSource.beginEdits();
                            dataSource.remove("2");
                            dataSource.change("4", newData);
                            dataSource.insertAtEnd(null, TestComponents.simpleItem(11));

                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "removed",
                                "changed",
                                "inserted",
                            ]);

                            dataSource.endEdits();

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
                            var changePromise = dataSource.change("4", TestComponents.simpleItem(4));

                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "changed",
                                "endNotifications"
                            ]);
                            handler.verifyState(state2, null, true);

                            changePromise.then(function (item3) {
                                // After an asynchronous insertions, a changed notification will be sent when the edit
                                // completes.
                                handler.verifyExpectedNotifications(synchronous ?
                                    [] :
                                    [
                                        "beginNotifications",
                                        "changed",
                                        "endNotifications"
                                    ]
                                );

                                // Don't have to tolerate null keys now
                                handler.verifyState(state2);

                                var state3 = [13, 12, 9, 10, 1, 3, 4, 5, 6, 0, 7, 11, 8];

                                // Try all the remaining possible singleton edits
                                dataSource.beginEdits();
                                dataSource.moveAfter("0", "6");
                                dataSource.moveToStart("9");
                                dataSource.insertAfter(null, TestComponents.simpleItem("12"), "1").then(function (item4) {
                                    dataSource.moveBefore("12", "9");
                                    dataSource.insertBefore(null, TestComponents.simpleItem("13"), "12");
                                    var movePromise = dataSource.moveToEnd("8");
                                    dataSource.endEdits();

                                    var expectedNotifications = [
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
                                    ];

                                    if (!synchronous) {
                                        // After an asynchronous insertion, a changed notification will be sent when
                                        // the edit completes.
                                        expectedNotifications.splice(4, 0, "changed");
                                    }

                                    handler.verifyExpectedNotifications(expectedNotifications);
                                    handler.verifyState(state3, null, true);

                                    movePromise.then(function (item5) {
                                        // After an asynchronous insertion, a changed notification will be sent when
                                        // the edit completes.
                                        handler.verifyExpectedNotifications(synchronous ?
                                            [] :
                                            [
                                                "beginNotifications",
                                                "changed",
                                                "endNotifications"
                                            ]
                                        );

                                        handler.verifyState(state3);

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
                    });
                });
            });
        });
    }

    this.testEditingAsynchronous = function (signalTestCaseCompleted) {
        testEditing(signalTestCaseCompleted, false);
    };

    this.testEditingSynchronous = function (signalTestCaseCompleted) {
        testEditing(signalTestCaseCompleted, true);
    };


    // this test will verify the edit error code(notPermitted) by simulating readOnly data source
    this.testEditErrorCodes_NotPermitted= function (signalTestCaseCompleted) {
        var dataSource = TestComponents.simpleAsynchronousDataSource(100),
           handler = TestComponents.simpleListNotificationHandler(),
           listBinding = dataSource.createListBinding(handler);
        dataSource.testDataAdapter.setProperty("readOnly", true);

        TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);

        // Fetch the first item
        var itemPromise = listBinding.first();

        itemPromise.then(itemPromiseHandler);

        function itemPromiseHandler(item){

            TestComponents.verifyItemData(item, 0);
            TestComponents.setImmediate(function () {
                handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
                ]);
            });

            clearLastEdit();
            var newData = "NewData0"
            dataSource.change("0", newData).then(editSuccess, editError);


            function editSuccess() {
                recordEditSuccess();
                LiveUnit.Assert.fail("Expecting an exception when trying to edit a read only data source..");

            }

            function editError(e) {
                LiveUnit.Assert.areEqual("notPermitted", e.name, "Expecting error message while trying to edit a read only data source");
                // Change the data source to allow edits now.
                dataSource.testDataAdapter.setProperty("readOnly", false);
                dataSource.change("0", newData).then(
                    function () {
                        LiveUnit.LoggingCore.logComment("edit is successful after data source is made editable at run time");
                        signalTestCaseCompleted();
                    },

                    function (error) {
                        LiveUnit.Assert.fail("Edit unsuccessful:" + error.name);
                        signalTestCaseCompleted();
                    }
                );
            }
        };

    };//end of test function


    // Testing the edit error code: noLongerMeaningful by changing the deleted item

    this.testEditErrorCodes_NoLongerMeaningful = function (signalTestCaseCompleted) {
        var dataSource = TestComponents.simpleAsynchronousDataSource(100),
           handler = TestComponents.simpleListNotificationHandler(),
           listBinding = dataSource.createListBinding(handler);

        TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
        // Fetch the first item
        var itemPromise = listBinding.first();
        itemPromise.then(function (item) {
            TestComponents.verifyItemData(item, 0);
            handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
            ]);
            clearLastEdit();
            var newData = "NewData0"
            dataSource.remove("0").then(editSuccess, removeError);

            function removeError(error) {
                LiveUnit.Assert.fail("Remove operation failed:" + error.name);
            }

            function editSuccess() {
                recordEditSuccess();
                dataSource.testDataAdapter.setProperty("notMeaningfulEdit", true);
                dataSource.change("0", newData).then(
                    function () {
                        LiveUnit.Assert.fail("Exception is expected for noLongerMeaningful edits");
                    },
                    function (e) {
                        LiveUnit.Assert.areEqual("noLongerMeaningful", e.name, "Expected exception is thrown from VDS");
                        signalTestCaseCompleted();
                    }
                );
            } //end editSuccess

        });
    };//end of test function

    // this test will verify the edit error code(noResponse) by simulating DS communication Failure
    this.testEditErrorCodes_NoResponse = function (signalTestCaseCompleted) {
        var dataSource = TestComponents.simpleAsynchronousDataSource(100),
            handler = TestComponents.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);


        TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);

        // Fetch the first item
        var itemPromise = listBinding.first();
        itemPromise.then(function (item) {
            TestComponents.verifyItemData(item, 0);
            handler.verifyExpectedNotifications([
                    "beginNotifications",
                    "countChanged",
                    "endNotifications"
            ]);

            // This will caue the data adapter to return the error when trying to edit the data.
            dataSource.testDataAdapter.setProperty("communicationFailure", true);
            clearLastEdit();
            var newData = "NewData0"
            dataSource.change("0", newData).then(editSuccess, editError);

            function editSuccess() {
                recordEditSuccess();
                LiveUnit.Assert.fail("Expecting an exception when trying to edit a data source  while communication failure occurs");
            }

            function editError(e) {
                LiveUnit.Assert.areEqual("noResponse", e.name, "Expecting error message while trying to edit a data source when communication to data fails");

                // Reestablish data source connection
                dataSource.testDataAdapter.setProperty("communicationFailure", false);
                dataSource.change("0", newData).then(function () {
                    LiveUnit.LoggingCore.logComment("edit is successful after data source is made editable at run time");
                    signalTestCaseCompleted();
                },

                function (error) {
                    LiveUnit.Assert.fail("Edit unsuccessful:" + error.name);
                });
            }
        });
    };//end of test function noresponse


    this.xtestCountError_NoResponse = function (signalTestCaseCompleted) {
        var dataSource = TestComponents.simpleAsynchronousDataSource(100),
            handler = TestComponents.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        // track how mnay times countChanged notification is thrown
        var countChanged = 0;

        TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
        dataSource.testDataAdapter.setProperty("count_NoResponse", true);

        handler.countChanged = function (newCount, oldCount) {
            countChanged++;
            LiveUnit.Assert.fail("CountChanged Handler should not be thrown when count is not returned from the data source as DS cannot be communicated");
        };
        dataSource.getCount().then(countSuccess, countError);

        function countSuccess(count) {
            LiveUnit.Assert.fail("countSuccess handler should not be called when error is returned from the data adapter");
        }

        function countError(e) {
            LiveUnit.Assert.areEqual("noResponse", e.name, "Wrong  Error code.");
            LiveUnit.Assert.areEqual(0, countChanged, "countChanged notification should not be thrown");
            setTimeout(function () {
                signalTestCaseCompleted();
            }, 2000);
        }

    };//end of test function fetch-noresponse


    this.testCountError_Unknown = function (signalTestCaseCompleted) {
        var dataSource = TestComponents.simpleAsynchronousDataSource(100),
            handler = TestComponents.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        // track how mnay times countChanged notification is thrown
        var countChanged = 0;

        TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
        dataSource.testDataAdapter.setProperty("countUnknown", true);

        handler.countChanged = function (newCount, oldCount) {
            countChanged++;
            LiveUnit.Assert.fail("CountChanged Handler should not be thrown when unknown count is returned" );

        };

        dataSource.getCount().then(countSuccess, countError);

        function countSuccess(count) {
            LiveUnit.Assert.fail("countSuccess handler should not be called when error is returned from the data adapter");
        }

        function countError(e) {
            LiveUnit.Assert.areEqual("unknown", e.name, "Wrong  Error code.");
            LiveUnit.Assert.areEqual(0, countChanged, "countChanged notification should not be thrown");
            setTimeout(function () {
                signalTestCaseCompleted();
            }, 2000);
        }

    };//end of test function fetch-noresponse

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("EditingTests");
