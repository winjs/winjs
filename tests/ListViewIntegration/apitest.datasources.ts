// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts"/>
/// <reference path="globals.ts"/>
/// <reference path="../TestLib/Helper.ListView.Utils.ts"/>
/// <reference path="listviewverify.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";

    function AddRemoveFromAdapterItemTest(listView, signalTestCaseCompleted) {
        ///
        // This test inserts 1 item, validates the insertion, then removes
        // the item and validates the final count
        ///
        var testRenderer = listView.itemTemplate,
            count,
            tests;

        Helper.ListView.waitForReady(listView, -1)().
            then(function () {

                // Test 1 - Insertion
                return listView.itemDataSource.getCount();
            }).
            then(function (c) {
                count = c;
                Helper.ListView.Utils.logTestComment("Initial count: " + count);

                Helper.ListView.Utils.logTestComment("Insert an item into empty ListView in grid layout.");
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                count++;
                count++;
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {

                // verification
                var newItem = listView.elementFromIndex(0);
                ListViewVerify.verifyItemContents(newItem, DEF_ITEM_DATA, testRenderer);
                return verifyCount(listView, count);
            }).
            then(function () {
                Helper.ListView.Utils.logTestComment("Delete an item from ListView, leaving in empty state.");
                Helper.ListView.Utils.logTestComment("Removing item at index: 0");
                listView.itemDataSource.testDataAdapter.removeAtIndex(0);
                listView.itemDataSource.testDataAdapter.removeAtIndex(0);
                count--;
                count--;
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {

                //verification
                return verifyCount(listView, count);
            }).
            done(signalTestCaseCompleted, function (e) {
                throw Error(e);
            });
    }

    function SelectionTest(listView, signalTestCaseCompleted) {
        ///
        // This test inserts 1 item, validates the insertion, then removes
        // the item and validates the final count
        ///

        Helper.ListView.waitForReady(listView, -1)().
            then<number>(listView.itemDataSource.getCount).
            then(function (count) {

                // Check test precondition - Initial count > 0
                Helper.ListView.Utils.logTestComment("Initial count: " + count);
                LiveUnit.Assert.isTrue(count > 0, "Cannot run selection test with an empty dataSource");
                return count;
            }).
            then(function (count) {

                // Test 1 - API Selection
                Helper.ListView.Utils.logTestComment("Selection test");

                // Build array of indices for selection test
                var selectionTestIndices = [0, Math.floor(count / 2), count - 1];

                // Build a cumulative test for all indices
                var selectionPromise = WinJS.Promise.wrap();
                var currentSelection = listView.selection.getIndices();
                selectionTestIndices.forEach(function (i) {
                    selectionPromise = selectionPromise.then(function () {

                        // make selection
                        Helper.ListView.Utils.logTestComment("Selection test - Next index: " + i);
                        currentSelection.push(i);
                        if (currentSelection.length > 1) {

                            // all selections except first
                            return listView.selection.add(i);
                        } else {

                            // first selection
                            return listView.selection.set(i);
                        }
                    }).
                        then(function () {

                            // Validation
                            return verifySelection(listView, currentSelection);
                        });
                });

                return selectionPromise.then(function () {
                    return currentSelection;
                });
            }).
            then(function (currentSelection) {

                // Test 2 - API Deselection
                Helper.ListView.Utils.logTestComment("Deselection test");
                var selectionPromise = WinJS.Promise.wrap();
                for (var i = currentSelection.length; i > 0; i--) {

                    // call deselection
                    selectionPromise = selectionPromise.then(function () {
                        var index = currentSelection.pop();
                        return listView.selection.remove(index);
                    }).
                        then(function () {

                            // Validation
                            return verifySelection(listView, currentSelection);
                        });
                }

                return selectionPromise;
            }).
            done(signalTestCaseCompleted, function (e) {
                throw Error(e);
            });
    }

    function EnsureVisibleTest(listView, signalTestCaseCompleted) {
        ///
        // This test inserts 1 item, validates the insertion, then removes
        // the item and validates the final count
        ///
        var count;

        function validateEnsureVisible(listView, previousState) {

            // Validation
            Helper.ListView.Utils.logTestComment('validateEnsureVisible');
            var currentLastVisible = listView.indexOfLastVisible;
            var currentFirstVisible = listView.indexOfFirstVisible;
            var currentScrollPos = listView.scrollPosition;

            LiveUnit.Assert.isTrue(previousState.desiredIndex >= currentFirstVisible && previousState.desiredIndex <= currentLastVisible,
                'EnsureVisibleTest - desiredIndex: ' + previousState.desiredIndex + ' firstVisible: ' +
                currentFirstVisible + ' lastVisible: ' + currentLastVisible);

            LiveUnit.Assert.isFalse(currentScrollPos === previousState.scrollPos,
                'currentScrollPos: ' + currentScrollPos + ' previousScrollPos: ' + previousState.scrollPos);

            return true;
        }

        var testPromise = Helper.ListView.waitForReady(listView, -1)().
            then(listView.itemDataSource.getCount).
            then(function (c) {
                count = c;
                LiveUnit.Assert.isTrue(count > 0, 'Count must be nonzero: ' + count);
            }).
            then(function () {

                // Test 1 - EnsureVisible on an item off screen
                Helper.ListView.Utils.logTestComment('EnsureVisibleTest');

                // find an index off screen
                var initialLastVisible = listView.indexOfLastVisible;
                var initialFirstVisible = listView.indexOfFirstVisible
                var itemsPerPage = initialLastVisible - initialFirstVisible + 1;
                var desiredIndex = initialLastVisible + itemsPerPage;
                desiredIndex = (count <= desiredIndex) ? count - 1 : desiredIndex;

                LiveUnit.Assert.isTrue(desiredIndex > initialLastVisible,
                    'desiredIndex: ' + desiredIndex + ' lastVisible: ' + initialLastVisible);

                // store the scroll position and log initial conditions
                var scrollPos = listView.scrollPosition;
                Helper.ListView.Utils.logTestComment("EnsureVisibleTest - Initial First: " + initialFirstVisible
                    + " Initial Last: " + initialLastVisible
                    + " Initial Scroll: " + scrollPos);
                Helper.ListView.Utils.logTestComment('EnsureVisibleTest - ensureVisible(' + desiredIndex + ')');

                // call ensure visible
                listView.ensureVisible(desiredIndex);

                // pass on the state that we care about
                return { desiredIndex: desiredIndex, scrollPos: scrollPos };
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function (previousState) {
                validateEnsureVisible(listView, previousState);
            }).
            then(function () {

                // Test 3 - EnsureVisible first item in ListView
                var desiredIndex = 0;
                var scrollPos = listView.scrollPosition;

                Helper.ListView.Utils.logTestComment('EnsureVisibleTest - ensureVisible(' + desiredIndex + ')');
                listView.ensureVisible(desiredIndex);

                return { desiredIndex: desiredIndex, scrollPos: scrollPos };
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function (previousState) {
                validateEnsureVisible(listView, previousState);
            });

        testPromise = testPromise.then(function () {

            // Test 5 - EnsureVisible last item in ListView
            var desiredIndex = count - 1;
            var scrollPos = listView.scrollPosition;

            Helper.ListView.Utils.logTestComment('EnsureVisibleTest - ensureVisible(' + desiredIndex + ')');
            listView.ensureVisible(desiredIndex);

            return { desiredIndex: desiredIndex, scrollPos: scrollPos };
        }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function (previousState) {
                validateEnsureVisible(listView, previousState);
            });

        testPromise.done(signalTestCaseCompleted, function (e) {
            throw Error(e);
        });
    }

    function ReplaceAdapterObjectsTest(listView, signalTestCaseCompleted, useReload) {

        // Build dataAdapter objects
        function getNewObjects(count) {
            var newObjects = [];
            for (var i = 0; i < count; i++) {
                newObjects.push({ key: i + '', data: DEF_ITEM_DATA });
            }
            return newObjects;
        }

        var testRenderer = listView.itemTemplate;

        Helper.ListView.waitForReady(listView, -1)().
            then(function () {

                // Test 0 - Set data adapter to one with items
                Helper.ListView.Utils.logTestComment("ReplaceAdapterObjectsTest - Replacing data adapter objects with new objects");
                listView.itemDataSource.testDataAdapter.replaceItems(getNewObjects(DEF_TOTAL_ITEMS));

                if (!useReload) {
                    Helper.ListView.Utils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.invalidateAll()");
                    listView.itemDataSource.testDataAdapter.invalidateAll();
                } else {
                    Helper.ListView.Utils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.reload()");
                    listView.itemDataSource.testDataAdapter.reload();
                }
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {
                return verifyCount(listView, DEF_TOTAL_ITEMS);
            }).
            then(function () {

                // Validate the contents of one item
                var firstVisibleElement = listView.elementFromIndex(listView.indexOfFirstVisible);
                ListViewVerify.verifyItemContents(firstVisibleElement, DEF_ITEM_DATA, testRenderer);
            }).
            then(function () {

                // Test 1 - Set data adapter to an empty one
                Helper.ListView.Utils.logTestComment("ReplaceAdapterObjectsTest - Replacing data adapter objects with empty array and calling invalidateAll()");
                listView.itemDataSource.testDataAdapter.replaceItems([]);

                if (!useReload) {
                    Helper.ListView.Utils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.invalidateAll()");
                    listView.itemDataSource.testDataAdapter.invalidateAll();
                } else {
                    Helper.ListView.Utils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.reload()");
                    listView.itemDataSource.testDataAdapter.reload();
                }
            }).
            then(Helper.ListView.waitForReady(listView, 500)).
            then(function () {
                return verifyCount(listView, 0);
            }).
            then(function () {

                // Validate no items are actually shown
                var winContainerCount = listView.element.querySelectorAll('.' + Expected.ClassName.Container).length;
                LiveUnit.Assert.isTrue(winContainerCount === 0, 'winContainerCount: ' + winContainerCount + ' expecting: 0');

                Helper.ListView.Utils.logTestComment("Insert an item into empty ListView in grid layout.");
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {

                // verification
                var newItem = listView.elementFromIndex(0);
                ListViewVerify.verifyItemContents(newItem, DEF_ITEM_DATA, testRenderer);
                return verifyCount(listView, 2);
            }).
            done(
            signalTestCaseCompleted,
            function (e) {
                throw Error(e);
            }
            );
    }

    function ReplaceDataSourceTest(listView, signalTestCaseCompleted) {
        var testRenderer = listView.itemTemplate;
        Helper.ListView.waitForReady(listView, -1)().
            then(function () {
                // Test 1 - Set data source to a new one
                Helper.ListView.Utils.logTestComment('ReplaceDataSourceTest - Replacing data source with a new one with ' + DEF_TOTAL_ITEMS + ' items');
                listView.itemDataSource = createTestDataSource(DEF_TOTAL_ITEMS);
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {
                return verifyCount(listView, DEF_TOTAL_ITEMS);
            }).
            then(function () {

                // Validate the contents of one item
                var firstVisibleElement = listView.elementFromIndex(listView.indexOfFirstVisible);
                ListViewVerify.verifyItemContents(firstVisibleElement, DEF_ITEM_DATA, testRenderer);

                // Validate that there are items on the screen
                var winContainerCount = listView.element.querySelectorAll('.' + Expected.ClassName.Container).length;
                LiveUnit.Assert.areNotEqual(0, winContainerCount, 'winContainerCount: ' + winContainerCount + ' expecting: >0');
            }).
            then(function () {

                // Test 2 - Set data source to an empty one
                Helper.ListView.Utils.logTestComment("ReplaceDataSourceTest - Replacing data source with a new empty one");
                listView.itemDataSource = createTestDataSource(0);
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {
                return verifyCount(listView, 0);
            }).
            then(function () {

                // Validate no items are actually shown
                var winContainerCount = listView.element.querySelectorAll('.' + Expected.ClassName.Container).length;
                LiveUnit.Assert.areEqual(0, winContainerCount, 'winContainerCount: ' + winContainerCount + ' expecting: 0');

                Helper.ListView.Utils.logTestComment("Insert an item into empty ListView in grid layout.");
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
            }).
            then(Helper.ListView.waitForReady(listView, -1)).
            then(function () {

                // verification
                var newItem = listView.elementFromIndex(0);
                ListViewVerify.verifyItemContents(newItem, DEF_ITEM_DATA, testRenderer);
                return verifyCount(listView, 2);
            }).
            done(
            signalTestCaseCompleted,
            function (e) {
                throw Error(e);
            }
            );
    }

    function RehydrationTest(listView, signalTestCaseCompleted) {
        var expectedSelection = [0, 50, 99];
        var rehydrationFirstVisible = 20;

        listView.selection.set(expectedSelection);
        listView.indexOfFirstVisible = rehydrationFirstVisible;

        Helper.ListView.waitForReady(listView)().
            then(function () {
                LiveUnit.Assert.areEqual(listView.indexOfFirstVisible, rehydrationFirstVisible, "IndexOfFirstVisible expected " + rehydrationFirstVisible);
                listView.indexOfFirstVisible = 0;
            }).
            then(Helper.ListView.waitForReady(listView)).
            then(function () {
                return verifySelection(listView, expectedSelection);
            }).
            done(signalTestCaseCompleted, function (e) {
                throw Error(e);
            });
    }

    function simulateLiveMailSend(listView, signalTestCaseCompleted) {
        /// <summary>
        ///  Simulate at the API level of how Mail manipulates the ListView
        ///  when a user is sending an email message.
        /// </summary>

        listView.onselectionchanged = function simulateCompose() {
            listView.element.parentNode.style.visibility = "hidden";
        };

        var expectedSelection = [0];
        Helper.ListView.waitForReady(listView)().
            then(function () {
                listView.selection.set(expectedSelection); // fires simulateCompose, which hides the ListView
                var changedItem = { title: 'Read', content: 'changed item' };
                listView.itemDataSource.testDataAdapter.changeAtIndex(0, changedItem);
            }).
            then(Helper.ListView.waitForReady(listView)).
            then(function () {
                var focusPromise = new WinJS.Promise(function (c, e, p) {
                    var listViewCanvas = listView.element.querySelector(".win-surface");
                    listViewCanvas.addEventListener("focus", function () {
                        if (listView.selection.count() >= 1) {
                            var indices = listView.selection.getIndices(); // retrieving the selected index
                            var expectedCurrentItem = { index: indices[0], hasFocus: true, showFocus: true };
                            listView.currentItem = expectedCurrentItem; // setting key focus on that index
                            c(expectedCurrentItem);
                        }
                    }, true);
                });

                LiveUnit.Assert.areEqual(listView.element.parentNode.style.visibility, "hidden", "Expected ListView's parentNode to have visibility: hidden");
                listView.element.parentNode.style.visibility = "";
                listView.element.querySelector(".win-surface").focus();
                return focusPromise;
            }).
            then(Helper.ListView.waitForReady(listView)).
            then(function (expectedCurrentItem) {
                LiveUnit.Assert.areEqual(listView.currentItem.index, expectedCurrentItem.index, "expected currentItem index: " + expectedCurrentItem.index);
                LiveUnit.Assert.areEqual(listView.currentItem.hasFocus, expectedCurrentItem.hasFocus, "expected currentItem hasFocus: " + expectedCurrentItem.hasFocus);
                LiveUnit.Assert.areEqual(listView.currentItem.showFocus, expectedCurrentItem.showFocus, "expected currentItem showFocus: " + expectedCurrentItem.showFocus);
                LiveUnit.Assert.areEqual(listView.elementFromIndex(expectedCurrentItem.index).parentNode.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length, 1, "expected currentItem to have CSS: " + WinJS.UI._itemFocusOutlineClass);
                LiveUnit.Assert.areEqual(listView.element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length, 1, "expected only 1 item in ListView has CSS: " + WinJS.UI._itemFocusOutlineClass);
                return verifySelection(listView, expectedSelection);
            }).
            done(signalTestCaseCompleted, function (e) {
                throw Error(e);
            });
    }

    function verifyCount(listView, expectedCount) {
        Helper.ListView.Utils.logTestComment("Verifying ListView Count");
        return listView.itemDataSource.getCount().
            then(function (c) {
                LiveUnit.Assert.areEqual(expectedCount, c, "verifyCount - expected: " + expectedCount + " got: " + c);
            });
    }

    function verifySelection(listView, expectedSelectionArray) {
        Helper.ListView.Utils.logTestComment("verifySelection - expected: " + expectedSelectionArray.toString());

        function iterateByPage(count, index) {
            listView.indexOfFirstVisible = index;
            return Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    var firstVisible = listView.indexOfFirstVisible;
                    var lastVisible = listView.indexOfLastVisible;

                    Helper.ListView.Utils.logTestComment("verifySelection - firstVisible: " + firstVisible + " - lastVisible: " + lastVisible);
                    for (var i = firstVisible; i <= lastVisible; i++) {
                        var currentElement = listView.elementFromIndex(i).parentNode;
                        var actualClassName = currentElement.className;

                        if (expectedSelectionArray.indexOf(i) !== -1) {

                            // expect selection
                            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(currentElement, Expected.ClassName.Selected),
                                "verifySelection - parentNode className: " + actualClassName + " expected: " + Expected.ClassName.Selected);
                        } else {

                            // no selection
                            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(currentElement, Expected.ClassName.Selected),
                                "verifySelection - parentNode className: " + actualClassName + " should not contain: " + Expected.ClassName.Selected);
                        }
                    }
                    index = lastVisible + 1;

                    if (index < count) {
                        //recurse
                        return iterateByPage(count, index);
                    }
                });
        }

        return listView.itemDataSource.getCount().
            then(function (count) {
                return iterateByPage(count, 0);
            });
    }

    function createTestDataSource(size, data?) {

        // Populate a data array
        if (!data) {
            data = [];
            for (var i = 0; i < size; i++) {
                data.push(DEF_ITEM_DATA);
            }
        }

        // Create the datasource
        // Simulate the notification methods implemented in Live's data source
        var controller = {
            directivesForMethod: function (method, args) {
                var implementedNotifications = ["moveToIndex", "changeAtIndex", "insertAtIndex", "removeAtIndex"];
                if (-1 !== implementedNotifications.indexOf(method)) {
                    return {
                        callMethodSynchronously: false,
                        sendChangeNotifications: true,
                        countBeforeDelta: 0,
                        countAfterDelta: 0,
                        countBeforeOverride: -1,
                        countAfterOverride: -1,
                        delay: 0
                    };

                } else {
                    return {
                        callMethodSynchronously: false,
                        sendChangeNotifications: false,
                        countBeforeDelta: 0,
                        countAfterDelta: 0,
                        countBeforeOverride: -1,
                        countAfterOverride: -1,
                        delay: 0
                    };
                }
            }
        };

        // Data adapter abilities
        var abilities = {
            itemsFromIndex: true,
            itemsFromStart: true,
            getCount: true,
            setNotificationHandler: true
        };

        return Helper.ItemsManager.createTestDataSource(data, controller, abilities); // (objects, controller, abilities)
    }

    export class ListViewDSTestClass {


        /// -----------------------------------------------------------------------------------------------
        //  Setup and Teardown
        /// -----------------------------------------------------------------------------------------------

        // Setup function to create HTML page hosting a listview
        setUp() {
            LiveUnit.LoggingCore.logComment("Create Test Page...");
            Helper.ListView.Utils.initializeDOM();
        }

        // Teardown function
        tearDown() {
            LiveUnit.LoggingCore.logComment("Test Tear Down...");
            Helper.ListView.Utils.resetDOM();
        }
        
        /// -----------------------------------------------------------------------------------------------
        //  Test Methods
        /// -----------------------------------------------------------------------------------------------
    }


    ///
    //  testNoKeyDSAddRemoveList
    ///
    var generateNoKeyDSAddRemove = function (layout) {
        ListViewDSTestClass.prototype["testNokeyDSAddRemove" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            AddRemoveFromAdapterItemTest(listView, signalTestCaseCompleted);
        };
    };
    generateNoKeyDSAddRemove("ListLayout");

    ///
    //  testNoKeyDSSelectionList
    ///
    var generateNoKeyDSSelection = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSSelection" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(75, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            SelectionTest(listView, signalTestCaseCompleted);
        };
    };
    generateNoKeyDSSelection("ListLayout");

    ///
    //  testNoKeyDSEnsureVisibleList
    ///
    var generateNoKeyDSEnsureVisible = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSEnsureVisible" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            EnsureVisibleTest(listView, signalTestCaseCompleted);
        };
    };
    generateNoKeyDSEnsureVisible("ListLayout");

    ///
    //  testNoKeyDSReplaceAdapterObjectsList
    ///
    var generateNoKeyDSReplaceAdapterObjects = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSReplaceAdapterObjects" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            ReplaceAdapterObjectsTest(listView, signalTestCaseCompleted, false);
        };
    };
    generateNoKeyDSReplaceAdapterObjects("ListLayout");

    ///
    //  testNoKeyDSReplaceAdapterObjects2List
    ///
    var generateNoKeyDSReplaceAdapterObjects2 = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSReplaceAdapterObjects2" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            ReplaceAdapterObjectsTest(listView, signalTestCaseCompleted, true);
        };
    };
    generateNoKeyDSReplaceAdapterObjects2("ListLayout");

    ///
    //  testNoKeyDSReplaceDSList
    ///
    var generateNoKeyDSReplaceDS = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSReplaceDS" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            ReplaceDataSourceTest(listView, signalTestCaseCompleted);
        };
    };
    generateNoKeyDSReplaceDS("ListLayout");

    ///
    //  testNoKeyDSRehydration
    ///
    var generateNoKeyDSRehydration = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSRehydration" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Rehydrate the ListView synchronously upon creation
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            RehydrationTest(listView, signalTestCaseCompleted);
        };
    };
    generateNoKeyDSRehydration("ListLayout");

    ///
    //  testNoKeyDSSimulateLiveMailSend
    ///
    var generateNoKeyDSSimulateLiveMailSend = function (layout) {
        ListViewDSTestClass.prototype["testNoKeyDSSimulateLiveMailSend" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Simulate how Live Mail manipulates the ListView when composing an email
            /// </summary>

            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            Helper.ListView.Utils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            ListViewVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            simulateLiveMailSend(listView, signalTestCaseCompleted);
        };
    };
    generateNoKeyDSSimulateLiveMailSend("ListLayout");

    var generateDataSourceChangeSetFocusOnInvalidIndexAndHeightChange = function (layout) {
        ListViewDSTestClass.prototype["testDataSourceChangeSetFocusOnInvalidIndexAndHeightChange" + layout] = function (signalTestCaseCompleted) {
            var testRenderer = Helper.ListView.Utils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            var listView = Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            Helper.ListView.waitForReady(listView, -1)().then(function () {
                var newItemTitle = "New List Item 0";
                var newList = new WinJS.Binding.List([{ title: newItemTitle }]);
                listView.currentItem = { index: 1 };
                listView.element.style.width = "2000px";
                listView.element.style.height = "2000px";
                listView.itemDataSource = newList.dataSource;
                Helper.ListView.waitForReady(listView, 500)().then(function () {
                    LiveUnit.Assert.areEqual("title: " + newItemTitle, listView.elementFromIndex(0).textContent.trim());
                    LiveUnit.Assert.areEqual(0, listView.currentItem.index);
                    signalTestCaseCompleted();
                });
            });
        };
    };
    generateDataSourceChangeSetFocusOnInvalidIndexAndHeightChange("ListLayout");
    generateDataSourceChangeSetFocusOnInvalidIndexAndHeightChange("GridLayout");
    
    var disabledTestRegistry = {
        testNoKeyDSSimulateLiveMailSendListLayout: Helper.BrowserCombos.allButIE11
    };
    Helper.disableTests(ListViewDSTestClass, disabledTestRegistry);
    

}
// register the object as a test class by passing in the fully qualified name
LiveUnit.registerTestClass("WinJSTests.ListViewDSTestClass");