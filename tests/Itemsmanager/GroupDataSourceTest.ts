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

    var itemCountDefault = 200,
        groupSizeDefault = 7;

    function groupKey(item) {
        return "" + item.data.group;
    }

    function groupData(item) {
        return "Group " + item.data.group;
    }

    function createItemDataSource(itemCount, groupSize) {
        var array = new Array(itemCount);
        for (var i = 0; i < itemCount; i++) {
            array[i] = {
                group: Math.floor(i / groupSize),
                member: i % groupSize
            };
        }

        return TestComponents.testDataSourceWithDirectives(function (controller, abilities) {
            return TestComponents.createTestDataSource(array, controller, abilities);
        });
    }

    function testGetCount(itemCount, signalTestCaseCompleted) {
        var groupSize = groupSizeDefault;

        var itemDataSource = createItemDataSource(itemCount, groupSize),
            groupDataSource = WinJS.UI.computeDataSourceGroups(itemDataSource, groupKey, groupData, { groupCountEstimate: -1 }).groups;

        TestComponents.ensureAllAsynchronousRequestsFulfilled(itemDataSource);

        groupDataSource.getCount().
            then(
            function (count) {
                LiveUnit.Assert.areEqual(Math.ceil(itemCount / groupSize), count, "Incorrect group count returned");
                signalTestCaseCompleted();
            },
            function (error) {
                LiveUnit.Assert.fail("GroupDataSource.getCount returned " + error.name);
                signalTestCaseCompleted();
            }
            );
    }

    function verifyGroup(group, groupItem, itemCount, groupSize) {
        LiveUnit.Assert.areEqual("" + group, groupItem.key);
        LiveUnit.Assert.areEqual("Group " + group, groupItem.data);
        LiveUnit.Assert.areEqual("" + (group * groupSize), groupItem.firstItemKey);
        LiveUnit.Assert.areEqual(group * groupSize, groupItem.firstItemIndexHint);
        LiveUnit.Assert.areEqual(Math.min(itemCount - groupItem.firstItemIndexHint, groupSize), groupItem.groupSize);
    }


    export class GroupDataSourceTests {

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



        testGetCount(signalTestCaseCompleted) {
            testGetCount(itemCountDefault, signalTestCaseCompleted);
        }

        testGetCountEmpty(signalTestCaseCompleted) {
            testGetCount(0, signalTestCaseCompleted);
        }


        testGetItemFromKey(signalTestCaseCompleted) {
            var itemCount = 2000,
                groupSize = groupSizeDefault;

            var itemDataSource = createItemDataSource(itemCount, groupSize),
                groupDataSource = WinJS.UI.computeDataSourceGroups(itemDataSource, groupKey, groupData).groups;

            TestComponents.ensureAllAsynchronousRequestsFulfilled(itemDataSource);

            // Pass an index as the hint
            var group1 = 5;
            var listBinding = groupDataSource.createListBinding();
            listBinding.fromKey("" + group1, { groupMemberIndex: group1 * groupSize + 3 }).
                then(function (item1) {
                    verifyGroup(group1, item1, itemCount, groupSize);

                    // Pass a key as the hint
                    var group2 = 55;
                    listBinding.fromKey("" + group2, { groupMemberKey: "" + (group2 * groupSize + 2) }).
                        then(function (item2) {
                            verifyGroup(group2, item2, itemCount, groupSize);

                            // Don't pass a hint
                            var group3 = 105;
                            listBinding.fromKey("" + group3).
                                then(function (item3) {
                                    verifyGroup(group3, item3, itemCount, groupSize);

                                    // Pass an index hint that's too high
                                    var group4 = 155;
                                    listBinding.fromKey("" + group4, { groupMemberIndex: group4 * groupSize + 300 }).
                                        then(function (item4) {
                                            verifyGroup(group4, item4, itemCount, groupSize);

                                            // Pass a non-existent key as a hint
                                            var group5 = 255
                                        listBinding.fromKey("" + group5, { groupMemberKey: "Blargles" }).
                                                then(function (item5) {
                                                    verifyGroup(group5, item5, itemCount, groupSize);

                                                    // Request a non-existent group key
                                                    listBinding.fromKey("Zurch!").
                                                        then(function (item6) {
                                                            LiveUnit.Assert.areEqual(null, item6);

                                                            listBinding.release();
                                                            signalTestCaseCompleted();
                                                        });
                                                });
                                        });
                                });
                        });
                });
        }

        testGetItemFromIndex(signalTestCaseCompleted) {
            var itemCount = 4000,
                groupSize = groupSizeDefault;

            var itemDataSource = createItemDataSource(itemCount, groupSize),
                groupDataSource = WinJS.UI.computeDataSourceGroups(itemDataSource, groupKey, groupData).groups;

            TestComponents.ensureAllAsynchronousRequestsFulfilled(itemDataSource);

            var group1 = 5;
            var listBinding = groupDataSource.createListBinding();
            listBinding.fromIndex(group1).
                then(function (item1) {
                    verifyGroup(group1, item1, itemCount, groupSize);

                    listBinding.release();
                    signalTestCaseCompleted();
                });
        }

        testEnumeration(signalTestCaseCompleted) {
            // For this test, use large groups relative to the batch size
            var itemCount = 300,
                groupSize = 44,
                batchSize = 11;

            var itemDataSource = createItemDataSource(itemCount, groupSize),
                groupDataSource = WinJS.UI.computeDataSourceGroups(itemDataSource, groupKey, groupData, { batchSize: batchSize }).groups;

            TestComponents.ensureAllAsynchronousRequestsFulfilled(itemDataSource);

            // Pass a key as the hint, near the end of a large group
            var groupStart = 3,
                group1 = groupStart;
            var listBinding = groupDataSource.createListBinding(TestComponents.simpleListNotificationHandler());
            listBinding.fromKey("" + group1, { groupMemberKey: "" + ((group1 + 0.5) * groupSize) }).retain().
                then(function getPrevious(item1) {
                    if (item1) {
                        verifyGroup(group1--, item1, itemCount, groupSize);

                        // Walk backwards to the start
                        listBinding.previous().retain().then(getPrevious);
                    } else {
                        LiveUnit.Assert.areEqual(-1, group1);

                        var group2 = groupStart;
                        listBinding.fromKey("" + group2, { groupMemberKey: "" + ((group2 + 0.5) * groupSize) }).retain().
                            then(function getNext(item2) {
                                if (item2) {
                                    verifyGroup(group2++, item2, itemCount, groupSize);

                                    // Walk forwards to the end
                                    listBinding.next().retain().then(getNext);
                                } else {
                                    LiveUnit.Assert.areEqual(Math.ceil(itemCount / groupSize), group2);

                                    listBinding.release();
                                    signalTestCaseCompleted();
                                }
                            });
                    }
                });
        }

        testDeletion(signalTestCaseCompleted) {
            var itemCount = 60,
                groupSize = 7;

            var itemDataSource = createItemDataSource(itemCount, groupSize),
                groupDataSource = WinJS.UI.computeDataSourceGroups(itemDataSource, groupKey, groupData).groups;

            TestComponents.ensureAllAsynchronousRequestsFulfilled(itemDataSource);

            var handler = TestComponents.simpleListNotificationHandler(),
                listBinding = groupDataSource.createListBinding(handler),
                group = 0;
            handler.appendItemPromise(listBinding.first()).
                then(function getNext(item1) {
                    if (item1) {
                        handler.updateItem(item1);
                        verifyGroup(group++, item1, itemCount, groupSize);

                        // Walk forwards to the end
                        handler.appendItemPromise(listBinding.next()).then(getNext);
                    } else {
                        LiveUnit.Assert.areEqual(Math.ceil(itemCount / groupSize), group);

                        handler.clearNotifications();

                        // Now delete all the items in a couple of groups
                        for (var i = Math.floor(2.5 * groupSize); i < Math.floor(5.5 * groupSize); i++) {
                            itemDataSource.remove("" + i);
                        }

                        // Continue the test asynchronously once the current round of notifications has completed
                        handler.setContinuation(function () {
                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "removed",
                                "removed",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "countChanged",
                                "endNotifications"
                            ]);

                            listBinding.release();
                            signalTestCaseCompleted();
                        });
                    }
                });
        }

        testInsertion(signalTestCaseCompleted) {
            var itemCount = 60,
                groupSize = 7;

            var itemDataSource = createItemDataSource(itemCount, groupSize),
                groupDataSource = WinJS.UI.computeDataSourceGroups(itemDataSource, groupKey, groupData).groups;

            TestComponents.ensureAllAsynchronousRequestsFulfilled(itemDataSource);

            var handler = TestComponents.simpleListNotificationHandler(),
                listBinding = groupDataSource.createListBinding(handler),
                group = 0;
            handler.appendItemPromise(listBinding.first()).
                then(function getNext(item1) {
                    if (item1) {
                        handler.updateItem(item1);
                        verifyGroup(group++, item1, itemCount, groupSize);

                        // Walk forwards to the end
                        handler.appendItemPromise(listBinding.next()).then(getNext);
                    } else {
                        LiveUnit.Assert.areEqual(Math.ceil(itemCount / groupSize), group);

                        handler.clearNotifications();

                        // Now insert three new items in two new groups
                        itemDataSource.insertAfter(null, { group: 42, member: 0 }, "" + (5 * groupSize - 1));
                        itemDataSource.insertBefore(null, { group: 56, member: 0 }, "" + (3 * groupSize));
                        itemDataSource.insertBefore(null, { group: 56, member: 1 }, "" + (3 * groupSize));

                        // And add one item at the start of an existing group
                        itemDataSource.insertBefore(null, { group: 1, member: -1 }, "" + (1 * groupSize));

                        // Continue the test asynchronously once the current round of notifications has completed
                        handler.setContinuation(function () {
                            handler.verifyExpectedNotifications([
                                "beginNotifications",
                                "inserted",
                                "inserted",
                                "changed",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "indexChanged",
                                "changed",
                                "countChanged",
                                "endNotifications"
                            ]);

                            listBinding.release();
                            signalTestCaseCompleted();
                        });
                    }
                });
        }

    };
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.GroupDataSourceTests");
