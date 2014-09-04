// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
// Abstract:
//
//   API test cases for List View with various data source changes.
//
// Filename: apitest.datasources.js
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.ts" />
/// <reference path="../TestLib/ListViewHelpers.js"/>
/// <reference path="globals.js"/>
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="../TestLib/listviewutils.js"/>
/// <reference path="listviewverify.js"/>
/// <reference path="../TestLib/TestDataSource.ts"/>
/// <deploy src="../TestData/" />

// Tests for ListView Api
var ListViewDSTestClass = function () {
    "use strict";
    var lvUtils = new ListViewUtils();
    var lvVerify = new ListViewVerify();

    /// -----------------------------------------------------------------------------------------------
    //  Setup and Teardown
    /// -----------------------------------------------------------------------------------------------

    // Setup function to create HTML page hosting a listview
    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("Create Test Page...");
        lvUtils.initializeDOM();
    };

    // Teardown function
    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("Test Tear Down...");
        lvUtils.resetDOM();
    };

    /// -----------------------------------------------------------------------------------------------
    //  Test Methods
    /// -----------------------------------------------------------------------------------------------

    function AddRemoveFromAdapterItemTest(listView, signalTestCaseCompleted, grouped) {
        ///
        // This test inserts 1 item, validates the insertion, then removes
        // the item and validates the final count
        ///
        var testRenderer = listView.itemTemplate,
            count,
            tests;

        waitForReady(listView, -1)().
            then(function () {

                // Test 1 - Insertion
                return listView.itemDataSource.getCount();
            }).
            then(function (c) {
                count = c;
                lvUtils.logTestComment("Initial count: " + count);

                lvUtils.logTestComment("Insert an item into empty ListView in grid layout.");
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                count++;
                count++;
            }).
            then(waitForReady(listView, -1)).
            then(function () {

                // verification
                var newItem = listView.elementFromIndex(0);
                lvVerify.verifyItemContents(newItem, DEF_ITEM_DATA, testRenderer);
                return verifyCount(listView, count);
            }).
            then(function () {
                lvUtils.logTestComment("Delete an item from ListView, leaving in empty state.");
                lvUtils.logTestComment("Removing item at index: 0");
                listView.itemDataSource.testDataAdapter.removeAtIndex(0);
                listView.itemDataSource.testDataAdapter.removeAtIndex(0);
                count--;
                count--;
            }).
            then(waitForReady(listView, -1)).
            then(function () {

                //verification
                return verifyCount(listView, count);
            }).
            done(signalTestCaseCompleted, function (e) {
                throw Error(e);
            });
    }

    function SelectionTest(listView, signalTestCaseCompleted, grouped) {
        ///
        // This test inserts 1 item, validates the insertion, then removes
        // the item and validates the final count
        ///

        waitForReady(listView, -1)().
            then(listView.itemDataSource.getCount).
            then(function (count) {

                // Check test precondition - Initial count > 0
                lvUtils.logTestComment("Initial count: " + count);
                LiveUnit.Assert.isTrue(count > 0, "Cannot run selection test with an empty dataSource");
                return count;
            }).
            then(function (count) {

                // Test 1 - API Selection
                lvUtils.logTestComment("Selection test");

                // Build array of indices for selection test
                var selectionTestIndices = [0, Math.floor(count / 2), count - 1];

                // Build a cumulative test for all indices
                var selectionPromise = WinJS.Promise.wrap();
                var currentSelection = listView.selection.getIndices();
                selectionTestIndices.forEach(function (i) {
                    selectionPromise = selectionPromise.then(function () {

                        // make selection
                        lvUtils.logTestComment("Selection test - Next index: " + i);
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
                lvUtils.logTestComment("Deselection test");
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

    function EnsureVisibleTest(listView, signalTestCaseCompleted, grouped) {
        ///
        // This test inserts 1 item, validates the insertion, then removes
        // the item and validates the final count
        ///
        var count;

        function validateEnsureVisible(listView, previousState) {

            // Validation
            lvUtils.logTestComment('validateEnsureVisible');
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

        var testPromise = waitForReady(listView, -1)().
            then(listView.itemDataSource.getCount).
            then(function (c) {
                count = c;
                LiveUnit.Assert.isTrue(count > 0, 'Count must be nonzero: ' + count);
            }).
            then(function () {

                // Test 1 - EnsureVisible on an item off screen
                lvUtils.logTestComment('EnsureVisibleTest');

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
                lvUtils.logTestComment("EnsureVisibleTest - Initial First: " + initialFirstVisible
                    + " Initial Last: " + initialLastVisible
                    + " Initial Scroll: " + scrollPos);
                lvUtils.logTestComment('EnsureVisibleTest - ensureVisible(' + desiredIndex + ')');

                // call ensure visible
                listView.ensureVisible(desiredIndex);

                // pass on the state that we care about
                return { desiredIndex: desiredIndex, scrollPos: scrollPos };
            }).
            then(waitForReady(listView, -1)).
            then(function (previousState) {
                validateEnsureVisible(listView, previousState);
            }).
            then(function () {

                // Test 3 - EnsureVisible first item in ListView
                var desiredIndex = 0;
                var scrollPos = listView.scrollPosition;

                lvUtils.logTestComment('EnsureVisibleTest - ensureVisible(' + desiredIndex + ')');
                listView.ensureVisible(desiredIndex);

                return { desiredIndex: desiredIndex, scrollPos: scrollPos };
            }).
            then(waitForReady(listView, -1)).
            then(function (previousState) {
                validateEnsureVisible(listView, previousState);
            });

        testPromise = testPromise.then(function () {

            // Test 5 - EnsureVisible last item in ListView
            var desiredIndex = count - 1;
            var scrollPos = listView.scrollPosition;

            lvUtils.logTestComment('EnsureVisibleTest - ensureVisible(' + desiredIndex + ')');
            listView.ensureVisible(desiredIndex);

            return { desiredIndex: desiredIndex, scrollPos: scrollPos };
        }).
        then(waitForReady(listView, -1)).
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

        waitForReady(listView, -1)().
            then(function () {

                // Test 0 - Set data adapter to one with items
                lvUtils.logTestComment("ReplaceAdapterObjectsTest - Replacing data adapter objects with new objects");
                listView.itemDataSource.testDataAdapter.replaceItems(getNewObjects(DEF_TOTAL_ITEMS));

                if (!useReload) {
                    lvUtils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.invalidateAll()");
                    listView.itemDataSource.testDataAdapter.invalidateAll();
                } else {
                    lvUtils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.reload()");
                    listView.itemDataSource.testDataAdapter.reload();
                }
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return verifyCount(listView, DEF_TOTAL_ITEMS);
            }).
            then(function () {

                // Validate the contents of one item
                var firstVisibleElement = listView.elementFromIndex(listView.indexOfFirstVisible);
                lvVerify.verifyItemContents(firstVisibleElement, DEF_ITEM_DATA, testRenderer);
            }).
            then(function () {

                // Test 1 - Set data adapter to an empty one
                lvUtils.logTestComment("ReplaceAdapterObjectsTest - Replacing data adapter objects with empty array and calling invalidateAll()");
                listView.itemDataSource.testDataAdapter.replaceItems([]);

                if (!useReload) {
                    lvUtils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.invalidateAll()");
                    listView.itemDataSource.testDataAdapter.invalidateAll();
                } else {
                    lvUtils.logTestComment("ReplaceAdapterObjectsTest - Calling testDataAdapter.reload()");
                    listView.itemDataSource.testDataAdapter.reload();
                }
            }).
            then(waitForReady(listView, 500)).
            then(function () {
                return verifyCount(listView, 0);
            }).
            then(function () {

                // Validate no items are actually shown
                var winContainerCount = listView.element.querySelectorAll('.' + Expected.ClassName.Container).length;
                LiveUnit.Assert.isTrue(winContainerCount === 0, 'winContainerCount: ' + winContainerCount + ' expecting: 0');

                lvUtils.logTestComment("Insert an item into empty ListView in grid layout.");
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
            }).
            then(waitForReady(listView, -1)).
            then(function () {

                // verification
                var newItem = listView.elementFromIndex(0);
                lvVerify.verifyItemContents(newItem, DEF_ITEM_DATA, testRenderer);
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
        waitForReady(listView, -1)().
            then(function () {
                // Test 1 - Set data source to a new one
                lvUtils.logTestComment('ReplaceDataSourceTest - Replacing data source with a new one with ' + DEF_TOTAL_ITEMS + ' items');
                listView.itemDataSource = createTestDataSource(DEF_TOTAL_ITEMS);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return verifyCount(listView, DEF_TOTAL_ITEMS);
            }).
            then(function () {

                // Validate the contents of one item
                var firstVisibleElement = listView.elementFromIndex(listView.indexOfFirstVisible);
                lvVerify.verifyItemContents(firstVisibleElement, DEF_ITEM_DATA, testRenderer);

                // Validate that there are items on the screen
                var winContainerCount = listView.element.querySelectorAll('.' + Expected.ClassName.Container).length;
                LiveUnit.Assert.areNotEqual(0, winContainerCount, 'winContainerCount: ' + winContainerCount + ' expecting: >0');
            }).
            then(function () {

                // Test 2 - Set data source to an empty one
                lvUtils.logTestComment("ReplaceDataSourceTest - Replacing data source with a new empty one");
                listView.itemDataSource = createTestDataSource(0);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return verifyCount(listView, 0);
            }).
            then(function () {

                // Validate no items are actually shown
                var winContainerCount = listView.element.querySelectorAll('.' + Expected.ClassName.Container).length;
                LiveUnit.Assert.areEqual(0, winContainerCount, 'winContainerCount: ' + winContainerCount + ' expecting: 0');

                lvUtils.logTestComment("Insert an item into empty ListView in grid layout.");
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
                listView.itemDataSource.testDataAdapter.insertAtIndex(DEF_ITEM_DATA, 0);
            }).
            then(waitForReady(listView, -1)).
            then(function () {

                // verification
                var newItem = listView.elementFromIndex(0);
                lvVerify.verifyItemContents(newItem, DEF_ITEM_DATA, testRenderer);
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

        waitForReady(listView)().
            then(function () {
                LiveUnit.Assert.areEqual(listView.indexOfFirstVisible, rehydrationFirstVisible, "IndexOfFirstVisible expected " + rehydrationFirstVisible);
                listView.indexOfFirstVisible = 0;
            }).
            then(waitForReady(listView)).
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
        waitForReady(listView)().
            then(function () {
                listView.selection.set(expectedSelection); // fires simulateCompose, which hides the ListView
                var changedItem = { title: 'Read', content: 'changed item' };
                listView.itemDataSource.testDataAdapter.changeAtIndex(0, changedItem);
            }).
            then(waitForReady(listView)).
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
            then(waitForReady(listView)).
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
        lvUtils.logTestComment("Verifying ListView Count");
        return listView.itemDataSource.getCount().
            then(function (c) {
                LiveUnit.Assert.areEqual(expectedCount, c, "verifyCount - expected: " + expectedCount + " got: " + c);
            });
    }

    function verifySelection(listView, expectedSelectionArray) {
        lvUtils.logTestComment("verifySelection - expected: " + expectedSelectionArray.toString());

        function iterateByPage(count, index) {
            listView.indexOfFirstVisible = index;
            return waitForReady(listView, -1)().
                then(function () {
                    var firstVisible = listView.indexOfFirstVisible;
                    var lastVisible = listView.indexOfLastVisible;

                    lvUtils.logTestComment("verifySelection - firstVisible: " + firstVisible + " - lastVisible: " + lastVisible);
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

    function createTestDataSource(size, data) {

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

        return TestComponents.createTestDataSource(data, controller, abilities); // (objects, controller, abilities)
    }

    ///
    //  testNoKeyDSAddRemoveList
    ///
    this.generateNoKeyDSAddRemove = function (layout) {
        this["testNokeyDSAddRemove" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            AddRemoveFromAdapterItemTest(listView, signalTestCaseCompleted);
        };
    };
    this.generateNoKeyDSAddRemove("ListLayout");

    ///
    //  testNoKeyDSSelectionList
    ///
    this.generateNoKeyDSSelection = function (layout) {
        this["testNoKeyDSSelection" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(75, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            SelectionTest(listView, signalTestCaseCompleted);
        };
    };
    this.generateNoKeyDSSelection("ListLayout");

    ///
    //  testNoKeyDSEnsureVisibleList
    ///
    this.generateNoKeyDSEnsureVisible = function (layout) {
        this["testNoKeyDSEnsureVisible" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            EnsureVisibleTest(listView, signalTestCaseCompleted);
        };
    };
    this.generateNoKeyDSEnsureVisible("ListLayout");

    ///
    //  testNoKeyDSReplaceAdapterObjectsList
    ///
    this.generateNoKeyDSReplaceAdapterObjects = function (layout) {
        this["testNoKeyDSReplaceAdapterObjects" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            ReplaceAdapterObjectsTest(listView, signalTestCaseCompleted, false);
        };
    };
    this.generateNoKeyDSReplaceAdapterObjects("ListLayout");

    ///
    //  testNoKeyDSReplaceAdapterObjects2List
    ///
    this.generateNoKeyDSReplaceAdapterObjects2 = function (layout) {
        this["testNoKeyDSReplaceAdapterObjects2" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            ReplaceAdapterObjectsTest(listView, signalTestCaseCompleted, true);
        };
    };
    this.generateNoKeyDSReplaceAdapterObjects2("ListLayout");

    ///
    //  testNoKeyDSReplaceDSList
    ///
    this.generateNoKeyDSReplaceDS = function (layout) {
        this["testNoKeyDSReplaceDS" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Test empty list layout
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(0, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            ReplaceDataSourceTest(listView, signalTestCaseCompleted);
        };
    };
    this.generateNoKeyDSReplaceDS("ListLayout");

    ///
    //  testNoKeyDSRehydration
    ///
    this.generateNoKeyDSRehydration = function (layout) {
        this["testNoKeyDSRehydration" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Rehydrate the ListView synchronously upon creation
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            RehydrationTest(listView, signalTestCaseCompleted);
        };
    };
    this.generateNoKeyDSRehydration("ListLayout");

    ///
    //  testNoKeyDSSimulateLiveMailSend
    ///
    this.generateNoKeyDSSimulateLiveMailSend = function (layout) {
        this["testNoKeyDSSimulateLiveMailSend" + layout] = function (signalTestCaseCompleted) {
            /// <summary>
            ///     Simulate how Live Mail manipulates the ListView when composing an email
            /// </summary>

            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            lvUtils.logTestStart("Test initialization of empty ListView in list layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            // Initial verification
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, options);

            simulateLiveMailSend(listView, signalTestCaseCompleted);
        };
    };
    this.generateNoKeyDSSimulateLiveMailSend("ListLayout");

    this.generateDataSourceChangeSetFocusOnInvalidIndexAndHeightChange = function (layout) {
        this["testDataSourceChangeSetFocusOnInvalidIndexAndHeightChange" + layout] = function (signalTestCaseCompleted) {
            var testRenderer = lvUtils.createItemRenderer();

            var myList = null;
            var options = {
                itemHeight: Expected.Height.Medium,
                itemWidth: Expected.Width.Medium,
                layout: new WinJS.UI[layout](),
                selectionMode: Expected.SelectionMode.Single,
                itemDataSource: createTestDataSource(100, myList),
                itemTemplate: testRenderer
            };

            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.List, Expected.Direction.ltr, options);

            waitForReady(listView, -1)().then(function () {
                var newItemTitle = "New List Item 0";
                var newList = new WinJS.Binding.List([{ title: newItemTitle }]);
                listView.currentItem = { index: 1 };
                listView.element.style.width = "2000px";
                listView.element.style.height = "2000px";
                listView.itemDataSource = newList.dataSource;
                waitForReady(listView, 500)().then(function () {
                    LiveUnit.Assert.areEqual("title: " + newItemTitle, listView.elementFromIndex(0).textContent.trim());
                    LiveUnit.Assert.areEqual(0, listView.currentItem.index);
                    signalTestCaseCompleted();
                });
            });
        };
    };
    this.generateDataSourceChangeSetFocusOnInvalidIndexAndHeightChange("ListLayout");
    this.generateDataSourceChangeSetFocusOnInvalidIndexAndHeightChange("GridLayout");

    if (!Helper.Browser.isIE11) {
        Helper.disableTest(this, "testNoKeyDSSimulateLiveMailSendListLayout");
    }
};

// register the object as a test class by passing in the fully qualified name
LiveUnit.registerTestClass("ListViewDSTestClass");