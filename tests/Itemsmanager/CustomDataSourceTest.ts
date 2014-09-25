// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ProxyDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
/// <reference path="vds-tracing.ts" />

module WinJSTests {

    "use strict";

    var previousTracingOptions;

    export class CustomDataSourceTests {


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

    testCustomDataSource(signalTestCaseCompleted) {
            function keyOf(data) {
                return data.theKey;
            }

            function sampleData(n) {
                return {
                    theKey: "" + n,
                    theValue: n
                };
            }

            var i;

            var initialCount = 10,
                array = new Array(initialCount);
            for (i = 0; i < initialCount; i++) {
                array[i] = sampleData(i);
            }

            var dataSource = new DatasourceTestComponents.ProxyDataSource(array, keyOf);

            var n1 = 5,
                n2 = 8,
                n3 = 10;

            // Fetch an item by key
            dataSource.itemFromKey("" + n1).then(function (item1) {
                LiveUnit.Assert.areEqual("" + n1, item1.key);
                LiveUnit.Assert.areEqual(n1, item1.data.theValue);

                // Now fetch an item by index
                dataSource.itemFromIndex(n2).then(function (item2) {
                    LiveUnit.Assert.areEqual("" + n2, item2.key);
                    LiveUnit.Assert.areEqual(n2, item2.data.theValue);

                    // Try an insertion at the start of the list
                    dataSource.insertAtStart(null, sampleData(n3)).then(function (item3) {
                        LiveUnit.Assert.areEqual("" + n3, item3.key);
                        LiveUnit.Assert.areEqual(n3, item3.data.theValue);

                        // Try other kinds of edits.  Don't bother to check the result from now on.

                        dataSource.beginEdits();
                        dataSource.remove("2");
                        dataSource.change("4", { theKey: "4", theValue: "Rarpum" });
                        dataSource.insertAtEnd(null, sampleData(11));
                        dataSource.endEdits();

                        // Change item 4 back, so verification code below finds the expected value
                        dataSource.change("4", sampleData(4));

                        // Try all the remaining possible singleton edits
                        dataSource.beginEdits();
                        dataSource.moveAfter("0", "6");
                        dataSource.moveToStart("9");
                        dataSource.insertAfter(null, sampleData(12), "1");
                        dataSource.moveBefore("12", "9");
                        dataSource.insertBefore(null, sampleData(13), "12");
                        dataSource.moveToEnd("8");
                        dataSource.endEdits();

                        // Verify that the array is in the expected state
                        var expectedState = [13, 12, 9, 10, 1, 3, 4, 5, 6, 0, 7, 11, 8],
                            len = expectedState.length;
                        LiveUnit.Assert.areEqual(array.length, len, "Array does not have expected length");
                        for (var i = 0; i < len; i++) {
                            LiveUnit.Assert.areEqual(JSON.stringify(sampleData(expectedState[i])), JSON.stringify(array[i]));
                        }

                        // Now replace the data in the array and read it from the data source
                        array.splice(0, array.length);
                        var finalCount = 8;
                        for (i = 0; i < finalCount; i++) {
                            array[i] = sampleData(i * 2);
                        }

                        dataSource.getCount().then(function (count) {
                            LiveUnit.Assert.areEqual(finalCount, count);

                            var promises = [];

                            for (i = 0; i < finalCount; i++) {
                                (function (n) {
                                    promises.push(dataSource.itemFromKey("" + n).then(function (item) {
                                        LiveUnit.Assert.areEqual("" + n, item.key);
                                        LiveUnit.Assert.areEqual(JSON.stringify(sampleData(n)), JSON.stringify(item.data));
                                    }));
                                })(i * 2);
                            }
                            WinJS.Promise.join(promises).then(function () {
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
LiveUnit.registerTestClass("WinJSTests.CustomDataSourceTests");
