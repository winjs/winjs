// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
/// <reference path="vds-tracing.ts" />

module WinJSTests {

    "use strict";

    var previousTracingOptions;

    function testAsynchronousRandomEnumerationOnce(complete) {
        var count = 200,
            handleCounts = {},
            handleTotalCounts = {},
            handleMap = {},
            keyMap = {},
            requests = 0,
            results = 0;

        var dummyHandler = {
            inserted: function (itemPromise, previousHandle, nextHandle) { },
            changed: function (newItem, oldItem) { },
            moved: function (itemPromise, previousHandle, nextHandle) { },
            removed: function (handle, mirage) { }
        };

        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(count),
            listBinding = dataSource.createListBinding(dummyHandler);

        function requestItem(itemPromise, index?) {
            requests++;

            var handleCount = handleCounts[itemPromise.handle];
            handleCounts[itemPromise.handle] = (handleCount ? handleCount + 1 : 1);

            var handleTotalCount = handleTotalCounts[itemPromise.handle];
            handleTotalCounts[itemPromise.handle] = (handleTotalCount ? handleTotalCount + 1 : 1);

            itemPromise.retain().then(function (item) {
                if (item) {
                    LiveUnit.Assert.areEqual(itemPromise.handle, item.handle, "Handle for received item does not match that of itemPromise");
                    Helper.ItemsManager.verifyItemData(item, index);

                    LiveUnit.Assert.isTrue(!keyMap[item.key] || keyMap[item.key] === item.handle, "Different handle has already been returned for key");
                    keyMap[item.key] = item.handle;

                    LiveUnit.Assert.isTrue(!handleMap[item.handle] || handleMap[item.handle] === item.key, "Handle has already been returned for different key");
                    handleMap[item.handle] = item.key;
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

        function localWalk(itemPromise, index?) {
            var walkMax = 10;

            requestItem(itemPromise, index);

            // Walk a small distance in each direction

            var j;

            var countBefore = Helper.ItemsManager.pseudorandom(walkMax);
            for (j = 0; j < countBefore; j++) {
                requestItem(listBinding.previous(), index - 1 - j);
            }

            listBinding.jumpToItem(itemPromise);

            var countAfter = Helper.ItemsManager.pseudorandom(walkMax);
            for (j = 0; j < countAfter; j++) {
                requestItem(listBinding.next(), index + 1 + j);
            }
        }

        var walk = 0,
            walkMax = 100;

        (function walkList() {
            // Fulfill some requests

            var fulfillCount = Helper.ItemsManager.pseudorandom(4);
            for (var k = 0; k < fulfillCount; k++) {
                dataSource.testDataAdapter.fulfillNextRequest();
            }

            // Pick a random index in the array
            var index = Helper.ItemsManager.pseudorandom(count);
            localWalk(listBinding.fromIndex(index), index);

            // Pick a random key
            localWalk(listBinding.fromKey(Helper.ItemsManager.pseudorandom(count).toString()));

            if (++walk < walkMax) {
                WinJS.Utilities._setImmediate(walkList);
            } else {
                (function completeAllRequests() {
                    if (dataSource.testDataAdapter.requestCount() === 0) {
                        LiveUnit.Assert.areEqual(requests, results, "Incorrect number of results was received");

                        complete();
                    } else {
                        dataSource.testDataAdapter.fulfillAllRequests();
                        WinJS.Utilities._setImmediate(completeAllRequests);
                    }
                })();
            }
        })();
    }

    function testKeyBasedFetching(signalTestCaseCompleted, synchronous) {
        var count = 1000,
            index1 = 900,
            index2 = 0,
            index3 = 450,
            index4 = 1500;

        var dataSource = Helper.ItemsManager.testDataSourceWithDirectives(function (controller) {
            return Helper.ItemsManager.simpleTestDataSource(controller, {
                itemsFromStart: true,
                itemsFromKey: true
            }, count);
        });

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        // Do not return indices or the count
        dataSource.testDataAdapter.directives.omitIndices = true;
        dataSource.testDataAdapter.directives.omitCount = true;

        // Fulfill requests in arbitrary-sized chunks
        dataSource.testDataAdapter.directives.countAfterOverride = 87;

        dataSource.itemFromIndex(index1).then(function (itemWithIndex1) {
            Helper.ItemsManager.verifyItemData(itemWithIndex1, index1);

            dataSource.itemFromIndex(index2).then(function (itemWithIndex2) {
                Helper.ItemsManager.verifyItemData(itemWithIndex2, index2);

                dataSource.itemFromIndex(index3).then(function (itemWithIndex3) {
                    Helper.ItemsManager.verifyItemData(itemWithIndex3, index3);

                    dataSource.itemFromIndex(index4).then(function (itemWithIndex4) {
                        LiveUnit.Assert.isNull(itemWithIndex4);

                        signalTestCaseCompleted();
                    });
                });
            });
        });
    };

    function testBackwardTraversal(signalTestCaseCompleted, synchronous) {

        var index = 100;
        var dataSource = Helper.ItemsManager.testDataSourceWithDirectives(function (controller) {
            return Helper.ItemsManager.simpleTestDataSource(controller, {
                itemsFromStart: true,
                itemsFromKey: true,
                itemsFromEnd: true
            }, index);
        });

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        var listBinding = dataSource.createListBinding();

        listBinding.last().done(function handleitem(item) {
            index--;
            if (index >= 0) {
                Helper.ItemsManager.verifyItemData(item, index);
                listBinding.previous().then(handleitem);
            }
            else {//  If the cursor moves past the start of the list, the promise completes with a value of null.
                LiveUnit.Assert.isTrue(!item, 'Expecting null when cursor moves past the start of the list.');
                signalTestCaseCompleted();
            }
        });
    };

    // This test verfies next() and previous() functions on the listBinding. The scenario under test is to perform a forward traversal,
    // then reversal the traversal and then forward again with random steps.
    function testRandomTraversal(signalTestCaseCompleted, synchronous) {

        function forwardTraversal(listBinding, startIndex, steps) {

            var testPromises = [];
            var itemPromise;
            var index = startIndex;
            for (var i = 0; i < steps && index < count - 1; index++, i++) {
                itemPromise = listBinding.next();
                (function (index) {
                    testPromises.push(itemPromise.then(function (item) {
                        Helper.ItemsManager.verifyItemData(item, index + 1);
                    }));
                })(index);

            }

            return WinJS.Promise.join(testPromises).then(function () {
                firstIndex = index;
            });
        }

        function reverseTraversal(listBinding, startIndex, steps) {

            var testPromises = [];
            var itemPromise;
            var index = startIndex;
            for (var i = 0; i < steps && index > 0; index--, i++) {
                itemPromise = listBinding.previous();
                (function (index) {
                    testPromises.push(itemPromise.then(function (item) {
                        Helper.ItemsManager.verifyItemData(item, index - 1);
                    }));
                })(index);

            }

            return WinJS.Promise.join(testPromises).then(function () {
                firstIndex = index;
            });
        }

        var count = 100; // total items in datasource
        var firstIndex = Helper.ListView.randomNumber(99);; // index of first item be retrived.
        var maxStep = 30; // max steps

        var log = VDSLogging.options.log || console.log.bind(console);
        LiveUnit.LoggingCore.logComment("Start Traversal at Index: " + firstIndex.toString());

        var dataSource = Helper.ItemsManager.testDataSourceWithDirectives(function (controller) {
            return Helper.ItemsManager.simpleTestDataSource(controller, {
                itemsFromStart: true,
                itemsFromKey: true
            }, count);
        });

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        var listBinding = dataSource.createListBinding();
        var steps = 0;

        // Get the item with index firstIndex. This item is set to current item.
        listBinding.fromIndex(firstIndex).then(function (item) {
            steps = Helper.ListView.randomNumber(maxStep);
            LiveUnit.LoggingCore.logComment("Forward Traversal with Steps: " + steps.toString());
            forwardTraversal(listBinding, firstIndex, steps)
                .then(function (items) {
                    steps = Helper.ListView.randomNumber(maxStep);
                    LiveUnit.LoggingCore.logComment("Reverse Traversal with Steps: " + steps.toString());
                    return reverseTraversal(listBinding, firstIndex, steps);
                })
                .then(function (item) {
                    steps = Helper.ListView.randomNumber(maxStep);
                    LiveUnit.LoggingCore.logComment("Forward Traversal with Steps: " + steps.toString());
                    return forwardTraversal(listBinding, firstIndex, steps);
                })
                .done(function (item) {
                    signalTestCaseCompleted();
                });
        });
    };

    // this test release and regain the binding and verify prevois binding has no effect on new binding
    function testReleaseBinding(signalTestCaseCompleted, synchronous) {
        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(100),
            handler = Helper.ItemsManager.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        var index = 0;
        var currentItemData;

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }


        var itemPromise = listBinding.first();
        itemPromise.retain();
        itemPromise.then(
            function handleItem(item) {
                index++;
                if (index < 10) {
                    itemPromise = listBinding.next();
                    itemPromise.retain();
                    itemPromise.then(handleItem);

                }
                else {
                    currentItemData = ("Item" + (index - 1).toString());
                    verifyCurrent();
                }
            });


        function verifyCurrent() {
            listBinding.current().then(currentItem);
        }

        function currentItem(item) {
            LiveUnit.Assert.areEqual(currentItemData, item.data, "Current item is wrong");
            // release the binding
            listBinding.release();

            // regain the binding
            listBinding = dataSource.createListBinding(handler);
            currentItemData = null;
            listBinding.current().then(function verifyCurrent(item) {
                LiveUnit.Assert.isNull(item, "Current Item should be null on new binding");
                signalTestCaseCompleted();
            });
        }

    };

    // This test verify growing/shrinking data source
    function testChangingDataSource(signalTestCaseCompleted, synchronous) {

        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(10);

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        dataSource.testDataAdapter.setProperty("returnCount", 5);

        // 5 items available. Fetching item 3 should return the item with index 3.
        dataSource.itemFromIndex(3).then(function handleItem(item) {
            LiveUnit.Assert.areEqual(3, item.index, "Wrong item returned when returnCount = 5: expecting item 3, item " + item.index.toString() + " returned.");

            // DataSource growing. 10 items available. Fetching item 7 should return null since we did not invalidateAll.
            dataSource.testDataAdapter.setProperty("returnCount", 10);
            return dataSource.itemFromIndex(7);
        })
            .then(function handleItem(item) {
                LiveUnit.Assert.isNull(item, "Wrong item returned when returnCount = 10: expecting null.");
                // DataSource still have 10 items available. Fetching item 7 should return item 7 after invalidateAll called.
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return dataSource.itemFromIndex(7);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.areEqual(7, item.index, "Wrong item returned when returnCount = 10: expecting item 7, item " + item.index.toString() + " returned.");

                // DataSource shrinking. 9 items available. Fetching item 8.
                dataSource.testDataAdapter.setProperty("returnCount", 9);
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return dataSource.itemFromIndex(8);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.areEqual(8, item.index, "Wrong item returned when returnCount = 9: expecting item 8, item " + item.index.toString() + " returned.");

                //DataSource shrinking. 7 items available. Fetching item 8 should return null.
                dataSource.testDataAdapter.setProperty("returnCount", 7);
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return dataSource.itemFromIndex(8);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.isNull(item, "Wrong item returned when returnCount = 7: expecting null.");

                // DataSource growing. 9 items available. Fetching item 8 should get item 8.
                dataSource.testDataAdapter.setProperty("returnCount", 9);
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return dataSource.itemFromIndex(8);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.areEqual(8, item.index, "Wrong item returned when returnCount = 9: expecting item 8, item " + item.index.toString() + " returned.");

                // DataSource shrinking. 5 items available. Fetching item 3 should return null.
                dataSource.testDataAdapter.setProperty("returnCount", 5);
                return dataSource.itemFromIndex(3);
            })
            .done(function handleItem(item) {
                LiveUnit.Assert.areEqual(3, item.index, "Wrong item returned when returnCount = 5: expecting item 3, item " + item.index.toString() + " returned.");
                signalTestCaseCompleted();
            });
    };

    // This test verify growing/shrinking data source with listbinding
    function testChangingDataSourceListBinding(signalTestCaseCompleted, synchronous) {

        var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(10);

        if (synchronous) {
            dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
        } else {
            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);
        }

        var handler = Helper.ItemsManager.simpleListNotificationHandler(),
            listBinding = dataSource.createListBinding(handler);

        dataSource.testDataAdapter.setProperty("returnCountBeforePromise", 1);
        dataSource.testDataAdapter.setProperty("returnCount", 5);

        // 5 items available. Fetching item 3 should return the item with index 3.
        listBinding.fromIndex(3).then(function handleItem(item) {
            LiveUnit.Assert.areEqual(3, item.index, "Wrong item returned when returnCount = 5: expecting item 3, item " + item.index.toString() + " returned.");

            // DataSource growing. 10 items available. Fetching item 7 should return null since we did not invalidateAll.
            dataSource.testDataAdapter.setProperty("returnCount", 10);
            return listBinding.fromIndex(7);
        })
            .then(function handleItem(item) {
                LiveUnit.Assert.isNull(item, "Wrong item returned when returnCount = 10: expecting null.");
                // DataSource still have 10 items available. Fetching item 7 should return item 7 after invalidateAll called.
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return listBinding.fromIndex(7);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.areEqual(7, item.index, "Wrong item returned when returnCount = 10: expecting item 7, item " + item.index.toString() + " returned.");

                // DataSource shrinking. 9 items available. Fetching item 8.
                dataSource.testDataAdapter.setProperty("returnCount", 9);
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return listBinding.fromIndex(8);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.areEqual(8, item.index, "Wrong item returned when returnCount = 9: expecting item 8, item " + item.index.toString() + " returned.");

                //DataSource shrinking. 7 items available. Fetching item 8 should return null.
                dataSource.testDataAdapter.setProperty("returnCount", 7);
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return listBinding.fromIndex(8);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.isNull(item, "Wrong item returned when returnCount = 7: expecting null.");

                // DataSource growing. 9 items available. Fetching item 8 should get item 8.
                dataSource.testDataAdapter.setProperty("returnCount", 9);
                return dataSource.invalidateAll(); // use invalidateAll to update the cache in VDS
            })
            .then(function handleItem() {
                return listBinding.fromIndex(8);
            })
            .then(function handleItem(item) {
                LiveUnit.Assert.areEqual(8, item.index, "Wrong item returned when returnCount = 9: expecting item 8, item " + item.index.toString() + " returned.");

                // DataSource shrinking. 5 items available. Fetching item 3 should return null.
                dataSource.testDataAdapter.setProperty("returnCount", 5);
                return listBinding.fromIndex(3);
            })
            .done(function handleItem(item) {
                LiveUnit.Assert.areEqual(3, item.index, "Wrong item returned when returnCount = 5: expecting item 3, item " + item.index.toString() + " returned.");
                signalTestCaseCompleted();
            });
    };

    export class EnumerationTests {


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



        testAsynchronousRandomEnumeration(signalTestCaseCompleted) {
            Helper.ItemsManager.runStressTest(testAsynchronousRandomEnumerationOnce, 5, signalTestCaseCompleted);
        }

        testDirectFetching(signalTestCaseCompleted) {
            var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(100);

            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);

            var index1 = 42,
                index2 = 56,
                index3 = 64;

            dataSource.itemFromIndex(index1).then(function (itemWithIndex) {
                Helper.ItemsManager.verifyItemData(itemWithIndex, index1);

                dataSource.itemFromKey("" + index2).then(function (itemWithKey) {
                    Helper.ItemsManager.verifyItemData(itemWithKey, index2);

                    dataSource.itemFromDescription("" + index3).then(function (itemWithDescription) {
                        Helper.ItemsManager.verifyItemData(itemWithDescription, index3);

                        signalTestCaseCompleted();
                    });
                });
            });
        }

        testDescriptionFetching(signalTestCaseCompleted) {
            var dataSource = Helper.ItemsManager.simpleAsynchronousDataSource(0),
                handler = Helper.ItemsManager.simpleListNotificationHandler(),
                listBinding = dataSource.createListBinding(handler);

            Helper.ItemsManager.ensureAllAsynchronousRequestsFulfilled(dataSource);

            var state0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

            Helper.ItemsManager.setState(dataSource, state0);

            // Fetch an item near the end using just its description
            var testIndex1 = 8,
                itemPromise = listBinding.fromDescription("" + testIndex1),
                handle1 = itemPromise.handle;

            itemPromise.retain().then(function (itemWithDescription1) {
                LiveUnit.Assert.areEqual(handle1, itemWithDescription1.handle);
                Helper.ItemsManager.verifyItemData(itemWithDescription1, testIndex1);

                var promises = [],
                    handles = [];

                // Now fetch all the items using simple enumeration
                itemPromise = listBinding.first();
                for (var i = 0; i < state0.length; i++) {
                    handles[i] = itemPromise.handle;
                    (function (i) {
                        promises.push(itemPromise.retain().then(function (item) {
                            Helper.ItemsManager.verifyItemData(item, i);

                            LiveUnit.Assert.areEqual(handles[i], item.handle);
                        }));
                    })(i);
                    itemPromise = listBinding.next();
                }
                itemPromise.then(function (item) {
                    LiveUnit.Assert.isNull(item, "Request for item after last item did not return null");
                });

                // The handles should match
                LiveUnit.Assert.isTrue(handle1, handles[testIndex1]);

                WinJS.Promise.join(promises).then(function () {
                    // Next, fetch another item using its description
                    var testIndex2 = 0;

                    itemPromise = listBinding.fromDescription("" + testIndex2);

                    var handle2 = itemPromise.handle;

                    // This time, we expect a different handle
                    LiveUnit.Assert.isTrue(handle2 !== handle1);

                    itemPromise.retain().then(function (itemWithDescription2) {
                        // This item should be null, since we asked for the same item in two different ways from the same ListBinding
                        LiveUnit.Assert.isNull(itemWithDescription2);

                        // Try from a different ListBinding
                        var handler2 = Helper.ItemsManager.simpleListNotificationHandler(),
                            listBinding2 = dataSource.createListBinding(handler);

                        var testIndex3 = testIndex2;

                        itemPromise = listBinding2.fromDescription("" + testIndex3);

                        var handle3 = itemPromise.handle;

                        // Again, we expect a different handle
                        LiveUnit.Assert.isTrue(itemPromise.handle !== handle1);
                        LiveUnit.Assert.isTrue(itemPromise.handle !== handle2);

                        itemPromise.retain().then(function (itemWithDescription3) {
                            // This time the fetch should have succeeded
                            LiveUnit.Assert.areEqual(handle3, itemWithDescription3.handle);
                            Helper.ItemsManager.verifyItemData(itemWithDescription3, testIndex3);

                            // Finally, verify that a direct fetch also succeeds
                            var testIndex4 = 5;

                            itemPromise = dataSource.itemFromDescription("" + testIndex4);

                            itemPromise.then(function (itemWithDescription4) {
                                // Again, the fetch should have succeeded
                                Helper.ItemsManager.verifyItemData(itemWithDescription4, testIndex4);

                                signalTestCaseCompleted();
                            });
                        });
                    });
                });
            });
        }

        testKeyBasedFetchingAsynchronous(signalTestCaseCompleted) {
            testKeyBasedFetching(signalTestCaseCompleted, false);
        }

        testKeyBasedFetchingSynchronous(signalTestCaseCompleted) {
            testKeyBasedFetching(signalTestCaseCompleted, true);
        }

        testSeenUrls(signalTestCaseCompleted) {
            var seenUrlsMaxSize = WinJS.UI._seenUrlsMaxSize;
            var seenUrlsMRUMaxSize = WinJS.UI._seenUrlsMRUMaxSize;
            var seenUrl = WinJS.UI._seenUrl;
            var seenUrlsMRU = WinJS.UI._getSeenUrlsMRU();
            var seenUrls = WinJS.UI._getSeenUrls();

            // Ensure we don't cache blob: urls
            seenUrl("blob:12345");
            LiveUnit.Assert.isTrue(seenUrlsMRU.length === 0);
            LiveUnit.Assert.isTrue(!seenUrls["blob:12345"]);

            // Ensure adding one item is keep added to the seenUrls and seenUrlsMRU
            seenUrl("0");
            LiveUnit.Assert.isTrue(seenUrlsMRU.length === 1);
            LiveUnit.Assert.isTrue(seenUrls["0"]);

            //Ensure we can add the first seenUrlsMaxSize and keep them in the cache
            for (var i = 1; i < seenUrlsMaxSize + 1; i++) {
                seenUrl(i.toString());
            }
            LiveUnit.Assert.isTrue(seenUrls["1"]);
            LiveUnit.Assert.isTrue(seenUrls[seenUrlsMaxSize.toString()]);
            LiveUnit.Assert.isTrue(!seenUrls[(seenUrlsMaxSize + 1).toString()]);

            // Ensure we can add up to seenUrlsMRUMaxSize to the cache
            LiveUnit.Assert.isTrue(seenUrlsMRU.length === seenUrlsMaxSize + 1);
            for (var i = seenUrlsMaxSize + 1; i < seenUrlsMRUMaxSize; i++) {
                seenUrl(i.toString());
            }
            LiveUnit.Assert.isTrue(seenUrlsMRU.length === seenUrlsMRUMaxSize);

            // Ensure that exceeding seenUrlsMRUMaxSize clears seenUrlsMRU and keeps only up to seenUrlsMaxSize
            // most recent urls.
            seenUrl(seenUrlsMRUMaxSize.toString());
            seenUrlsMRU = WinJS.UI._getSeenUrlsMRU();
            seenUrls = WinJS.UI._getSeenUrls();
            LiveUnit.Assert.isTrue(seenUrlsMRU.length === 0);
            LiveUnit.Assert.isTrue(!seenUrls["1"]);
            LiveUnit.Assert.isTrue(!seenUrls[(seenUrlsMRUMaxSize - seenUrlsMaxSize).toString()]);
            LiveUnit.Assert.isTrue(seenUrls[(seenUrlsMRUMaxSize - seenUrlsMaxSize + 1).toString()]);
            LiveUnit.Assert.isTrue(seenUrls[seenUrlsMRUMaxSize.toString()]);

            signalTestCaseCompleted();
        }

        testBackwardTraversalAsynchronous(signalTestCaseCompleted) {
            testBackwardTraversal(signalTestCaseCompleted, false);
        }

        testBackwardTraversalSynchronous(signalTestCaseCompleted) {
            testBackwardTraversal(signalTestCaseCompleted, true);
        }

        testRandomTraversalAsynchronous(signalTestCaseCompleted) {
            testRandomTraversal(signalTestCaseCompleted, false);
        }

        testRandomTraversalSynchronous(signalTestCaseCompleted) {
            testRandomTraversal(signalTestCaseCompleted, true);
        }

        testReleaseBindingAsynchronous(signalTestCaseCompleted) {
            testReleaseBinding(signalTestCaseCompleted, false);
        }

        testReleaseBindingSynchronous(signalTestCaseCompleted) {
            testReleaseBinding(signalTestCaseCompleted, true);
        }

        testChangingDataSourceAsynchronous(signalTestCaseCompleted) {
            testChangingDataSource(signalTestCaseCompleted, false);
        }

        testChangingDataSourceSynchronous(signalTestCaseCompleted) {
            testChangingDataSource(signalTestCaseCompleted, true);
        }

        testChangingDataSourceListBindingAsynchronous(signalTestCaseCompleted) {
            testChangingDataSourceListBinding(signalTestCaseCompleted, false);
        }

        testChangingDataSourceListBindingSynchronous(signalTestCaseCompleted) {
            testChangingDataSourceListBinding(signalTestCaseCompleted, true);
        }
    };
}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.EnumerationTests");
