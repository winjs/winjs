// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/TestDataSource.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;
    var Key = WinJS.Utilities.Key;
    var testRootEl;
    var ITEMS_COUNT = 10;
    var ddEventsList = ["itemdragstart",
        "itemdragenter",
        "itemdragend",
        "itemdragbetween",
        "itemdragleave",
        "itemdragchanged",
        "itemdragdrop"];

    function getRawData(count?) {
        var rawData = [];
        for (var i = 0; i < (count ? count : ITEMS_COUNT); i++) {
            rawData.push({ itemInfo: "Tile" + i });
        }
        return rawData;
    }

    function getDataSource(count?) {
        var rawData = getRawData(count);
        return new WinJS.Binding.List(rawData).dataSource;
    }

    function getAdjustedKeys(rtl) {
        return {
            left: rtl ? WinJS.Utilities.Key.rightArrow : WinJS.Utilities.Key.leftArrow,
            up: WinJS.Utilities.Key.upArrow,
            right: rtl ? WinJS.Utilities.Key.leftArrow : WinJS.Utilities.Key.rightArrow,
            down: WinJS.Utilities.Key.downArrow
        };
    }
    function basicRenderer(itemPromise) {
        var element = document.createElement("div");
        element.style.width = "50px";
        element.style.height = "50px";
        return {
            element: element,
            renderComplete: itemPromise.then(function (item) {
                element.textContent = item.data.itemInfo;
                if (item.data.markUndraggable) {
                    element.className += " win-nondraggable";
                }
            })
        };
    }

    function generateEventInElement(listView, name, element, rtl, offset?) {
        var elementRect = element.getBoundingClientRect();
        if (!offset) {
            offset = {
                x: element.offsetWidth / 2,
                y: element.offsetHeight / 2,
            };
        }
        var fakeEventObject = {
            clientX: elementRect[rtl ? "right" : "left"] + (rtl ? -offset.x : offset.x),
            clientY: elementRect.top + offset.y,
            preventDefault: function () { },
            dataTransfer: { setData: function () { } },
            target: element
        };

        listView._currentMode()[name](fakeEventObject);
    }

    function generateKeyEventInListView(listView, keyPressed, ctrlDown, altDown, shiftDown) {
        var fakeEventObject = {
            ctrlKey: !!ctrlDown,
            altKey: !!altDown,
            shiftKey: !!shiftDown,
            keyCode: keyPressed,
            preventDefault: function () { },
            stopPropagation: function () { },
            target: listView.element
        };

        listView._currentMode()["onKeyDown"](fakeEventObject);
    }

    function changeListViewFocus(listView, focusedIndex) {
        listView._selection._setFocused({ type: "item", index: focusedIndex }, false);
    }


    // Creates a VDS out of the provided array (data) or
    // creates a new data array of specified size
    function createDragDropVDSDataSource(size?, data?, isSynchronous?) {
        // Populate a data array
        if (!data) {
            data = getRawData(size);
        }
        // isSynchronous defaults to true
        if (isSynchronous === undefined) {
            isSynchronous = true;
        }

        // Create the datasource
        var controller = {
            directivesForMethod: function (method) {
                return {
                    callMethodSynchronously: isSynchronous,
                    delay: isSynchronous ? undefined : 0,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1
                };
            }
        };

        // Data adapter abilities - requirements for ListView Reordering.
        var abilities = {
            itemsFromIndex: true, // If these change, update the public docs!!
            itemsFromKey: true,
            remove: true,
            getCount: true,
            setNotificationHandler: true,
            moveBefore: true,
            moveAfter: true,
            moveToStart: true,
        };

        return Helper.ItemsManager.createTestDataSource(data, controller, abilities);
    };

    function nabItem(listView, index) {
        if (listView.itemDataSource._list) {
            return listView.itemDataSource._list.getItem(index);
        } else {
            return listView.itemDataSource.testDataAdapter.getItems()[index];
        }
    }

    function getEventHandlerCallbacks(listview) {
        var eventHandler = {};
        for (var i = 0; i < ddEventsList.length; i++) {
            (function () {
                var eventName = ddEventsList[i];
                listview.addEventListener(eventName, function (e) {
                    if (eventHandler[eventName]) {
                        eventHandler[eventName](e, eventName);
                    }
                });
            })();
        }

        return eventHandler;
    }

    function failTestIfCalled(e, eventName) {
        LiveUnit.Assert.fail(eventName + " was called unexpectedly");
    }

    function collectItemData(listView) {
        var data = [],
            list = listView.itemDataSource._list || listView.itemDataSource.testDataAdapter.getItems();
        for (var i = 0; i < list.length; i++) {
            data.push(nabItem(listView, i).data.itemInfo);
        }

        return data;
    }

    function compareData(originalData, actual, expectedSwaps) {
        LiveUnit.Assert.areEqual(originalData.length, actual.length);
        for (var i = 0; i < originalData.length; i++) {
            var swapAtIndex = null;
            for (var j = 0; j < expectedSwaps.length; j++) {
                if (expectedSwaps[j].start === i) {
                    swapAtIndex = expectedSwaps[j];
                    break;
                }
            }
            if (swapAtIndex) {
                LiveUnit.Assert.areEqual(originalData[i], actual[swapAtIndex.end]);
            } else {
                LiveUnit.Assert.areEqual(originalData[i], actual[i]);
            }

        }
    }
    function compareSelection(listView, expected) {
        var indicesSelected = listView.selection.getIndices();
        LiveUnit.Assert.areEqual(expected.length, indicesSelected.length, "Wrong number of items selected");
        for (var i = 0; i < expected.length; i++) {
            var foundExpected = false;
            for (var j = 0; j < indicesSelected.length; j++) {
                if (indicesSelected[j] === expected[i]) {
                    ;
                    foundExpected = true;
                    break;
                }
            }
            LiveUnit.Assert.isTrue(foundExpected, "An item wasn't selected when we expected it to be");
        }
    }
    function ensureSelectionContiguous(listView) {
        var indicesSelected = listView.selection.getIndices();
        for (var i = 0; i < indicesSelected.length - 1; i++) {
            LiveUnit.Assert.isTrue((indicesSelected[i] === (indicesSelected[i + 1] - 1)));
        }
    }

    export class ListViewDragDropTest {


        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "DragDropTest";
            newNode.style.width = "200px";
            newNode.style.height = "300px";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }
             
        testGridLayoutHitTest(complete) {
            var largeListView = document.createElement("div");
            largeListView.id = "GridLayoutHitTest";
            testRootEl.appendChild(largeListView);
            var listView = new WinJS.UI.ListView(largeListView, { itemDataSource: getDataSource(10), itemTemplate: basicRenderer, layout: new WinJS.UI.GridLayout() });
            listView.addEventListener("loadingstatechanged", function onloadingstatechanged(e) {
                // This grid uses 50px X 50px items, with large (400px) margins to the left, top, and bottom of the surface.
                // The grid should be laid out as such:
                // Column 0: Contains items 0 - 3, starting at 400, 400 and ending at 400, 600
                // Column 1: Contains items 4 - 7, starting at 450, 400 and ending at 450, 600
                // Column 2: Contains items 8 and 9, starting at 500, 400 and ending at 500, 500
                if (listView.loadingState === "complete") {
                    var layout = listView.layout;
                    // Test everything to the left of column 0
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(0, 0).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(100, 100).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(200, 200).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(300, 300).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(300, 800).insertAfterIndex);

                    // Test above column 0
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(425, 0).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(425, 100).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(425, 200).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(425, 300).insertAfterIndex);
                    LiveUnit.Assert.areEqual(-1, layout.hitTest(425, 400).insertAfterIndex);

                    // Test below column 0
                    LiveUnit.Assert.areEqual(3, layout.hitTest(425, 600).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(425, 700).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(425, 800).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(425, 900).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(425, 1000).insertAfterIndex);

                    // Test above column 1
                    LiveUnit.Assert.areEqual(3, layout.hitTest(475, 0).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(475, 100).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(475, 200).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(475, 300).insertAfterIndex);
                    LiveUnit.Assert.areEqual(3, layout.hitTest(475, 400).insertAfterIndex);

                    // Test below column 1
                    LiveUnit.Assert.areEqual(7, layout.hitTest(475, 600).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(475, 700).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(475, 800).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(475, 900).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(475, 1000).insertAfterIndex);

                    // Test above column 2
                    LiveUnit.Assert.areEqual(7, layout.hitTest(525, 0).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(525, 100).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(525, 200).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(525, 300).insertAfterIndex);
                    LiveUnit.Assert.areEqual(7, layout.hitTest(525, 400).insertAfterIndex);

                    // Test below column 2
                    LiveUnit.Assert.isTrue(layout.hitTest(525, 500).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(525, 700).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(525, 800).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(525, 900).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(525, 1000).insertAfterIndex >= 9);

                    // Test right of column 2
                    LiveUnit.Assert.isTrue(layout.hitTest(575, 500).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(675, 700).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(775, 800).insertAfterIndex >= 9);
                    LiveUnit.Assert.isTrue(layout.hitTest(550, 900).insertAfterIndex >= 9);

                    listView.removeEventListener("loadingstatechanged", onloadingstatechanged);
                    WinJS.Utilities.disposeSubTree(largeListView);
                    testRootEl.removeChild(largeListView);
                    complete();
                }
            });
        }
    }
    function generate(name, testFunction, itemsCount?, layoutIndependent?) {
        function generateTest(layout, dataSource, rtl?) {
            var fullName = name + layout + dataSource + (rtl ? "_rtl" : "_ltr");

            ListViewDragDropTest.prototype[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);

                if (dataSource === "VDS") {
                    dataSource = createDragDropVDSDataSource(itemsCount, getRawData(itemsCount), true/*sync*/)
                } else if (dataSource === "BindingList") {
                    dataSource = getDataSource(itemsCount)
                }
                var element = document.getElementById("DragDropTest");
                element.style.direction = rtl ? "rtl" : "ltr";
                var listView = new ListView(element, { itemDataSource: dataSource, itemTemplate: basicRenderer, layout: new WinJS.UI[layout]() });
                var ready = false;
                listView._animationsDisabled = function () {
                    return true;
                };
                // Autoscroll stops dragBetween events from triggering. None of these tests need autoscroll, so we'll disable it here so it doesn't start during a test
                listView._currentMode()._checkAutoScroll = function () {
                    return;
                };
                listView.addEventListener("loadingstatechanged", function (e) {
                    if (listView.loadingState === "complete" && !ready) {
                        ready = true;
                        testFunction(listView, rtl, complete);
                    }
                });
            };
        }

        generateTest("ListLayout", "BindingList");
        if (!layoutIndependent) {
            generateTest("GridLayout", "BindingList");
            generateTest("ListLayout", "VDS", true);
            generateTest("GridLayout", "VDS", true);
        }
    }



    generate("testDraggableAttribute", function (listView, rtl, complete) {
        listView.itemsDraggable = false;
        listView.itemsReorderable = false;
        LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);

        listView.itemsDraggable = true;
        LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);

        listView.itemsDraggable = false;
        LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);

        listView.itemsReorderable = true;
        LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);

        listView.itemsReorderable = false;
        LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);

        listView.itemsDraggable = true;
        listView.itemsReorderable = true;
        LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);
        listView.itemsReorderable = false;
        LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);
        listView.itemsDraggable = false;
        listView.itemsReorderable = true;
        LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);
        listView.itemsDraggable = true;

        var tests = [
            function () {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);
                listView.itemDataSource._list.push({ itemInfo: "UndraggableItem", markUndraggable: true });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, listView.element.querySelectorAll("[draggable=true]").length);
                listView.itemDataSource._list.push({ itemInfo: "DraggableItem", markUndraggable: false });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 1, listView.element.querySelectorAll("[draggable=true]").length);
                listView.itemsDraggable = false;
                listView.itemsReorderable = false;
                LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);
                listView.itemsDraggable = true;
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 1, listView.element.querySelectorAll("[draggable=true]").length);
                complete();
            }
        ];
        listView.itemDataSource = getDataSource(ITEMS_COUNT);
        Helper.ListView.runTests(listView, tests);
    }, null, true);



    generate("testDragEnterUnpreventedNotReorderable", function (listView, rtl, complete) {
        // When a ListView's items are reorderable and draggable, dragEnter/leave should be fired, but with dragEnter not handled,
        // nothing else should be fired.
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = false;

        handlers["itemdragend"] = failTestIfCalled;
        handlers["itemdragbetween"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;

        var startEventsReceived = 0,
            enterEventsReceived = 0;
        handlers["itemdragstart"] = function (e) {
            startEventsReceived++;
            LiveUnit.Assert.areEqual(1, startEventsReceived);
        };
        handlers["itemdragenter"] = function (e) {
            enterEventsReceived++;
            LiveUnit.Assert.areEqual(1, enterEventsReceived);
        };

        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(0), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragOver", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(2), rtl);
        complete();
    }, null, true);

    generate("testDragEnterInReorderableSource", function (listView, rtl, complete) {
        // When a ListView's items are reorderable and draggable, dragEnter/leave/between should be fired even if we don't handle itemDragEnter
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragend"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;

        var startEventsReceived = 0;
        handlers["itemdragstart"] = function (e) {
            startEventsReceived++;
            LiveUnit.Assert.areEqual(1, startEventsReceived);
            LiveUnit.Assert.areEqual(1, e.detail.dragInfo.getIndices().length);
        };

        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(0), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(2), rtl);

        handlers["itemdragleave"] = function (e) {
            handlers["itemdragenter"] = function (e) {
                handlers["itemdragbetween"] = function (e) {
                    handlers["itemdragleave"] = function (e) {
                        complete();
                    };
                    WinJS.Utilities._setImmediate(function () {
                        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(1), rtl);
                    });
                };
                WinJS.Utilities._setImmediate(function () {
                    generateEventInElement(listView, "onDragOver", listView.elementFromIndex(1), rtl);
                });
            };
            WinJS.Utilities._setImmediate(function () {
                generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(1), rtl);
            });
        };
    }, null, true);

    generate("testDragEnterFromExternalSource", function (listView, rtl, complete) {
        // Drag from an external source that isn't handled shouldn't raise anything other than enter/leave events
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragend"] = failTestIfCalled;
        handlers["itemdragbetween"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragstart"] = failTestIfCalled;

        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragOver", listView.elementFromIndex(1), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(2), rtl);

        handlers["itemdragleave"] = function (e) {
            handlers["itemdragenter"] = function (e) {
                complete();
            };
            WinJS.Utilities._setImmediate(function () {
                generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(1), rtl);
            });
        };
    }, null, true);

    generate("testDragLeave", function (listView, rtl, complete) {
        // Drag from an external source that isn't handled shouldn't raise anything other than enter/leave events
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragend"] = failTestIfCalled;
        handlers["itemdragbetween"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;

        // HTML5's DnD events are noisy, and kind of weird. When the user drags over a listview item, the listview's going to be spammed with
        // dragEnter/Leave events for the cursor moving inside of each of the item's child regions. The ListView should only fire one itemdragenter
        // event per unique drag-into-listview-region operation instead of spamming itemdragenter with HTML5's enter events.
        // Enter/Leave are weird because they fire in an unexpected order: Enter is fired before leave, so in theory a control
        // could make the mistake of thinking two items are being dragged over at once, or make the mistake of assuming events go in a
        // leave-then-enter fashion, and clear out a global drag over flag when leave is received. We'll test to make sure the ListView
        // doesn't fire multiple dragEnter events, and handles dragEnter/leave in any order.
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        handlers["itemdragenter"] = failTestIfCalled;
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(3), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(4), rtl);
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(3), rtl);

        handlers["itemdragleave"] = function (e) {
            handlers["itemdragenter"] = function (e) {
                handlers["itemdragenter"] = failTestIfCalled;
                handlers["itemdragleave"] = function (e) {
                    complete();
                };
                WinJS.Utilities._setImmediate(function () {
                    generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(4), rtl);
                    generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(5), rtl);
                    generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(5), rtl);
                });
            };
            WinJS.Utilities._setImmediate(function () {
                generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(4), rtl);
            });
        };
        generateEventInElement(listView, "onDragLeave", listView.elementFromIndex(4), rtl);
    }, null, true);

    generate("testDragUnselected", function (listView, rtl, complete) {
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragbetween"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        var dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(2, indicesSelected[0]);
        };

        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnd", listView.elementFromIndex(2), rtl);

        LiveUnit.Assert.isTrue(dragStartCalled);
        listView.selection.set([0, 1, 2]);
        dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(3, indicesSelected[0]);
            complete();
        };
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(3), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(3), rtl);
        generateEventInElement(listView, "onDragEnd", listView.elementFromIndex(3), rtl);
    }, null, true);

    generate("testDragSelected", function (listView, rtl, complete) {
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragbetween"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        var dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(2, indicesSelected[0]);
        };

        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnd", listView.elementFromIndex(2), rtl);

        LiveUnit.Assert.isTrue(dragStartCalled);
        listView.selection.set([0, 1, 2]);
        dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(3, indicesSelected[0]);
            complete();
        };
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(3), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(3), rtl);
        generateEventInElement(listView, "onDragEnd", listView.elementFromIndex(3), rtl);
    }, null, true);

    generate("testDragEnd", function (listView, rtl, complete) {
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragbetween"] = failTestIfCalled;
        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        var dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(2, indicesSelected[0]);
        };
        handlers["itemdragend"] = function (e) {
            complete();
        };
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        WinJS.Utilities._setImmediate(function () {
            generateEventInElement(listView, "onDragEnd", listView.elementFromIndex(2), rtl);
        });
    }, null, true);

    generate("testDragBetween", function (listView, rtl, complete) {
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        var dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(3, indicesSelected.length);
            LiveUnit.Assert.areEqual(2, indicesSelected[0]);
            LiveUnit.Assert.areEqual(3, indicesSelected[1]);
            LiveUnit.Assert.areEqual(4, indicesSelected[2]);
        };
        listView.selection.set([2, 3, 4]);
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(2), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(2), rtl);
        var indicesToTest = [
            {
                index: 0,
                topHalf: {
                    expectedInsertAfter: -1,
                    expectedShiftUp: null,
                    expectedShiftDown: listView.elementFromIndex(0)
                },
                bottomHalf: {
                    expectedInsertAfter: 0,
                    expectedShiftUp: listView.elementFromIndex(0),
                    expectedShiftDown: listView.elementFromIndex(1)
                }
            },
            {
                index: 1,
                topHalf: {
                    expectedInsertAfter: 0,
                    expectedShiftUp: listView.elementFromIndex(0),
                    expectedShiftDown: listView.elementFromIndex(1)
                },
                bottomHalf: {
                    expectedInsertAfter: 1,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                }
            },
            {
                index: 2,
                topHalf: {
                    expectedInsertAfter: 1,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                },
                bottomHalf: {
                    expectedInsertAfter: 2,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                }
            },
            {
                index: 3,
                topHalf: {
                    expectedInsertAfter: 2,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                },
                bottomHalf: {
                    expectedInsertAfter: 3,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                }
            },
            {
                index: 4,
                topHalf: {
                    expectedInsertAfter: 3,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                },
                bottomHalf: {
                    expectedInsertAfter: 4,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                }
            },
            {
                index: 5,
                topHalf: {
                    expectedInsertAfter: 4,
                    expectedShiftUp: listView.elementFromIndex(1),
                    expectedShiftDown: listView.elementFromIndex(5)
                },
                bottomHalf: {
                    expectedInsertAfter: 5,
                    expectedShiftUp: listView.elementFromIndex(5),
                    expectedShiftDown: listView.elementFromIndex(6)
                }
            },
            {
                index: ITEMS_COUNT - 1,
                topHalf: {
                    expectedInsertAfter: ITEMS_COUNT - 2,
                    expectedShiftUp: listView.elementFromIndex(ITEMS_COUNT - 2),
                    expectedShiftDown: listView.elementFromIndex(ITEMS_COUNT - 1)
                },
                bottomHalf: {
                    expectedInsertAfter: ITEMS_COUNT - 1,
                    expectedShiftUp: listView.elementFromIndex(ITEMS_COUNT - 1),
                    expectedShiftDown: null
                }
            },
        ];
        function getCursorOffsetInTopHalfOfItem(element) {
            return {
                x: element.offsetWidth / 2,
                y: element.offsetHeight / 4
            };
        }
        function getCursorOffsetInBottomHalfOfItem(element) {
            return {
                x: element.offsetWidth / 2,
                y: element.offsetHeight / 4 * 3
            };
        }
        function unsetTransforms(testSet) {
            if (testSet.topHalf.expectedShiftUp) {
                testSet.topHalf.expectedShiftUp.parentNode.parentNode.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName] = "";
            }
            if (testSet.topHalf.expectedShiftDown) {
                testSet.topHalf.expectedShiftDown.parentNode.parentNode.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName] = "";
            }
            if (testSet.bottomHalf.expectedShiftUp) {
                testSet.bottomHalf.expectedShiftUp.parentNode.parentNode.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName] = "";
            }
            if (testSet.bottomHalf.expectedShiftDown) {
                testSet.bottomHalf.expectedShiftDown.parentNode.parentNode.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName] = "";
            }
        }
        function getTransformInfo(element) {
            var badTransformPoint = {
                x: 0,
                y: 0
            };
            var transform = element.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName];
            if (!transform || transform === "" || transform.indexOf("translate") === -1) {
                return badTransformPoint;
            }

            var searchString = "translate(";
            var si = transform.indexOf(searchString) + searchString.length;
            var ei = transform.indexOf(")", si);
            var translations = transform.substring(si, ei).split(",");
            if (translations.length !== 2) {
                return badTransformPoint;
            }

            return {
                x: parseInt(translations[0], 10),
                y: parseInt(translations[1], 10)
            };
        }
        function verifyShiftsAreCorrect(testSetHalf) {
            if (testSetHalf.expectedShiftUp) {
                var translation = getTransformInfo(testSetHalf.expectedShiftUp.parentNode.parentNode);
                LiveUnit.Assert.isTrue(translation.y < 0)
            }
            if (testSetHalf.expectedShiftDown) {
                var translation = getTransformInfo(testSetHalf.expectedShiftDown.parentNode.parentNode);
                LiveUnit.Assert.isTrue(translation.y > 0)
            }
        }
        var testedBefore = false,
            testedAfter = false,
            lastOverElement = listView.elementFromIndex(2),
            currentTest = 0;
        function testNextSet() {
            if (currentTest === indicesToTest.length) {
                complete();
            } else {
                WinJS.Utilities._setImmediate(function () {
                    generateEventInElement(listView, "onDragLeave", lastOverElement, rtl);
                    (function () {
                        var currentSet = indicesToTest[currentTest++];
                        lastOverElement = listView.elementFromIndex(currentSet.index);
                        unsetTransforms(currentSet);
                        generateEventInElement(listView, "onDragEnter", lastOverElement, rtl);
                        handlers["itemdragbetween"] = function (e) {
                            LiveUnit.Assert.areEqual(currentSet.topHalf.expectedInsertAfter, e.detail.insertAfterIndex);
                            WinJS.Utilities._setImmediate(function () {
                                verifyShiftsAreCorrect(currentSet.topHalf);
                                unsetTransforms(currentSet);
                                handlers["itemdragbetween"] = function (e) {
                                    LiveUnit.Assert.areEqual(currentSet.bottomHalf.expectedInsertAfter, e.detail.insertAfterIndex);
                                    WinJS.Utilities._setImmediate(function () {
                                        verifyShiftsAreCorrect(currentSet.bottomHalf);
                                        unsetTransforms(currentSet);
                                        // We need to reset after each test by moving to 0, 0, since items that share drop targets (eg, between the bottom half of 0
                                        // and the top half of 1) won't fire duplicate dragBetween events. Calling this top half 0 at the end of each set makes sure
                                        // the next set can run properly.
                                        handlers["itemdragbetween"] = function (e) {
                                            WinJS.Utilities._setImmediate(function () {
                                                testNextSet();
                                            });
                                        };
                                        generateEventInElement(listView, "onDragLeave", lastOverElement, rtl);
                                        lastOverElement = listView.elementFromIndex(0);
                                        generateEventInElement(listView, "onDragEnter", lastOverElement, rtl, getCursorOffsetInTopHalfOfItem(lastOverElement));
                                        WinJS.Utilities._setImmediate(function () {
                                            generateEventInElement(listView, "onDragOver", lastOverElement, rtl, getCursorOffsetInTopHalfOfItem(lastOverElement));
                                        });
                                    });
                                };
                                generateEventInElement(listView, "onDragOver", lastOverElement, rtl, getCursorOffsetInBottomHalfOfItem(lastOverElement));
                            });
                        };
                        WinJS.Utilities._setImmediate(function () {
                            generateEventInElement(listView, "onDragOver", lastOverElement, rtl, getCursorOffsetInTopHalfOfItem(lastOverElement));
                        });
                    })();
                });
            }
        }
        testNextSet();
    });

    generate("testDisabledDragBetween", function (listView, rtl, complete) {
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        var dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(0, indicesSelected[0]);
        };
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(0), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(0), rtl);
        var element2 = listView.elementFromIndex(2);
        var cursorOffset = {
            x: element2.offsetWidth / 2,
            y: element2.offsetHeight / 4
        };

        handlers["itemdragbetween"] = function (e) {
            LiveUnit.Assert.areEqual(1, e.detail.insertAfterIndex);
            listView._layout.dragOver = function () {
                LiveUnit.Assert.fail("Drag over shouldn't have been called");
            };
            var dragLeaveCalled = false;
            listView._layout.dragLeave = function () {
                dragLeaveCalled = true;
            };
            e.preventDefault();
            handlers["itemdragend"] = function (e) {
                complete();
            };
            WinJS.Utilities._setImmediate(function () {
                LiveUnit.Assert.isTrue(dragLeaveCalled);
                generateEventInElement(listView, "onDrop", element2, rtl);
                WinJS.Utilities._setImmediate(function () {
                    generateEventInElement(listView, "onDragEnd", element2, rtl);
                });
            });
        };
        generateEventInElement(listView, "onDragOver", element2, rtl, cursorOffset);
    }, null, true);

    generate("testReorderOutOfBounds", function (listView, rtl, complete) {
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        // TODO: Uncomment this line when WinBlue 99641 is fixed
        //handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        var dragStartCallCount = 0,
            dragDropCallCount = 0;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCallCount++;
            LiveUnit.Assert.areEqual(1, indicesSelected.length);
            LiveUnit.Assert.areEqual(0, indicesSelected[0]);
        };
        handlers["itemdragdrop"] = function (e) {
            dragDropCallCount++;
        };
        var item0 = listView.elementFromIndex(0);
        var dataAt0 = nabItem(listView, 0);
        var dataAt1 = nabItem(listView, 1);
        var dataAt2 = nabItem(listView, 2);
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(0), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(0), rtl);
        var cursorOffset = {
            x: item0.offsetWidth / 2,
            y: listView._viewport.offsetHeight - 1
        };
        handlers["itemdragbetween"] = function (e) {
            LiveUnit.Assert.areEqual(2, e.detail.insertAfterIndex);
            WinJS.Utilities._setImmediate(function () {
                function onLoadingStateChanged() {
                    if (listView.loadingState === "complete") {
                        LiveUnit.Assert.areEqual(dragDropCallCount, 1);
                        LiveUnit.Assert.areEqual(dragStartCallCount, 1);
                        listView.removeEventListener("loadingstatechanged", onLoadingStateChanged);
                        LiveUnit.Assert.areEqual(dataAt1, nabItem(listView, 0));
                        LiveUnit.Assert.areEqual(dataAt2, nabItem(listView, 1));
                        LiveUnit.Assert.areEqual(dataAt0, nabItem(listView, 2));
                        complete();
                    }
                }
                listView.addEventListener("loadingstatechanged", onLoadingStateChanged);
                generateEventInElement(listView, "onDrop", listView._viewport, rtl, cursorOffset);
                WinJS.Utilities._setImmediate(function () {
                    generateEventInElement(listView, "onDragEnd", listView._viewport, rtl, cursorOffset);
                });
            });
        };
        generateEventInElement(listView, "onDragOver", listView._viewport, rtl, cursorOffset);
    }, 3);

    generate("testSelectionAfterReorder", function (listView, rtl, complete) {
        // This test verifies that selection via a range isn't lost after a reorder.

        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = true;
        listView.itemsReorderable = true;

        // Set selection
        listView.selection.set({ firstIndex: 3, lastIndex: 5 });

        var dragStartCalled = false;
        handlers["itemdragstart"] = function (e) {
            var indicesSelected = e.detail.dragInfo.getIndices();
            dragStartCalled = true;
            LiveUnit.Assert.areEqual(3, indicesSelected.length);
            LiveUnit.Assert.areEqual(3, indicesSelected[0]);
            LiveUnit.Assert.areEqual(4, indicesSelected[1]);
            LiveUnit.Assert.areEqual(5, indicesSelected[2]);
        };
        var dataAt3 = nabItem(listView, 3);
        var dataAt4 = nabItem(listView, 4);
        var dataAt5 = nabItem(listView, 5);
        generateEventInElement(listView, "onDragStart", listView.elementFromIndex(3), rtl);
        generateEventInElement(listView, "onDragEnter", listView.elementFromIndex(3), rtl);
        var targetElement = listView.elementFromIndex(6);

        // Drop the items below target element.
        var cursorOffset = {
            x: targetElement.offsetWidth / 2,
            y: 3 * targetElement.offsetHeight / 4
        };
        handlers["itemdragbetween"] = function (e) {
            LiveUnit.Assert.areEqual(6, e.detail.insertAfterIndex);
            WinJS.Utilities._setImmediate(function () {
                function onLoadingStateChanged() {
                    if (listView.loadingState === "complete") {
                        listView.removeEventListener("loadingstatechanged", onLoadingStateChanged);
                        LiveUnit.Assert.areEqual(dataAt3, nabItem(listView, 4));
                        LiveUnit.Assert.areEqual(dataAt4, nabItem(listView, 5));
                        LiveUnit.Assert.areEqual(dataAt5, nabItem(listView, 6));

                        // Test selection after reorder
                        var selection = listView.selection;
                        LiveUnit.Assert.isTrue(selection.getIndices().length === 3, "Selection should contain these 3 items");
                        LiveUnit.Assert.isTrue(selection._isIncluded(4));
                        LiveUnit.Assert.isTrue(selection._isIncluded(5));
                        LiveUnit.Assert.isTrue(selection._isIncluded(6));
                        complete();
                    }
                }
                listView.addEventListener("loadingstatechanged", onLoadingStateChanged);
                generateEventInElement(listView, "onDrop", targetElement, rtl, cursorOffset);
                WinJS.Utilities._setImmediate(function () {
                    generateEventInElement(listView, "onDragEnd", targetElement, rtl, cursorOffset);
                });
            });
        };
        generateEventInElement(listView, "onDragOver", targetElement, rtl, cursorOffset);
    });





    generate("testUnselectedKeyboardReorder", function (listView, rtl, complete) {
        var adjustedKeys = getAdjustedKeys(rtl);
        listView.itemsReorderable = true;
        var originalListData = collectItemData(listView);
        listView.selection.set([0, 2]);
        changeListViewFocus(listView, 1);
        var endIndex = originalListData.length - 1;
        var tests = [
            function () {
                compareSelection(listView, [0, 2]);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: 0, end: 1 }, { start: 1, end: 0 }]);
                compareSelection(listView, [1, 2]);
                LiveUnit.Assert.areEqual(0, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: 0, end: 1 }, { start: 1, end: 0 }]);
                compareSelection(listView, [1, 2]);
                LiveUnit.Assert.areEqual(0, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, []);
                compareSelection(listView, [0, 2]);
                LiveUnit.Assert.areEqual(1, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: 2, end: 1 }, { start: 1, end: 2 }]);
                compareSelection(listView, [0, 1]);
                LiveUnit.Assert.areEqual(2, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, []);
                compareSelection(listView, [0, 2]);
                LiveUnit.Assert.areEqual(1, listView._selection._getFocused().index);
                changeListViewFocus(listView, endIndex);
                generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
            },
            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, []);
                compareSelection(listView, [0, 2]);
                LiveUnit.Assert.areEqual(endIndex, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                return true;
            },
            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: endIndex, end: endIndex - 1 }, { start: endIndex - 1, end: endIndex }]);
                compareSelection(listView, [0, 2]);
                LiveUnit.Assert.areEqual(endIndex - 1, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                return true;
            },
            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: endIndex, end: endIndex - 2 }, { start: endIndex - 1, end: endIndex }, { start: endIndex - 2, end: endIndex - 1 }]);
                compareSelection(listView, [0, 2]);
                LiveUnit.Assert.areEqual(endIndex - 2, listView._selection._getFocused().index);
                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });

    generate("testUnselectedKeyboardReorderNonDraggable", function (listView, rtl, complete) {
        var adjustedKeys = getAdjustedKeys(rtl);
        listView.itemsReorderable = true;
        var originalListData = collectItemData(listView);
        changeListViewFocus(listView, 1);
        var tests = [
            function () {
                WinJS.Utilities.addClass(listView.elementFromIndex(1), WinJS.UI._nonDraggableClass);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
            },

            function () {
                setTimeout(function () {
                    var currentListData = collectItemData(listView);
                    compareData(originalListData, currentListData, []);
                    complete();
                }, 50)
            }
        ];
        Helper.ListView.runTests(listView, tests);
    });

    generate("testSingleSelectionKeyboardReorder", function (listView, rtl, complete) {
        var adjustedKeys = getAdjustedKeys(rtl);
        listView.itemsReorderable = true;
        var originalListData = collectItemData(listView);
        listView.selection.set([1]);
        changeListViewFocus(listView, 1);
        var endIndex = originalListData.length - 1;
        var tests = [
            function () {
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: 0, end: 1 }, { start: 1, end: 0 }]);
                compareSelection(listView, [0]);
                LiveUnit.Assert.areEqual(0, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: 0, end: 1 }, { start: 1, end: 0 }]);
                compareSelection(listView, [0]);
                LiveUnit.Assert.areEqual(0, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, []);
                compareSelection(listView, [1]);
                LiveUnit.Assert.areEqual(1, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: 2, end: 1 }, { start: 1, end: 2 }]);
                compareSelection(listView, [2]);
                LiveUnit.Assert.areEqual(2, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                return true;
            },

            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, []);
                compareSelection(listView, [1]);
                LiveUnit.Assert.areEqual(1, listView._selection._getFocused().index);
                changeListViewFocus(listView, endIndex);
                listView.selection.set([endIndex]);
                generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
            },
            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, []);
                compareSelection(listView, [endIndex]);
                LiveUnit.Assert.areEqual(endIndex, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                return true;
            },
            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: endIndex, end: endIndex - 1 }, { start: endIndex - 1, end: endIndex }]);
                compareSelection(listView, [endIndex - 1]);
                LiveUnit.Assert.areEqual(endIndex - 1, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                return true;
            },
            function () {
                var currentListData = collectItemData(listView);
                compareData(originalListData, currentListData, [{ start: endIndex, end: endIndex - 2 }, { start: endIndex - 1, end: endIndex }, { start: endIndex - 2, end: endIndex - 1 }]);
                compareSelection(listView, [endIndex - 2]);
                LiveUnit.Assert.areEqual(endIndex - 2, listView._selection._getFocused().index);
                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });

    generate("testContiguousSelectionReorder", function (listView, rtl, complete) {
        var adjustedKeys = getAdjustedKeys(rtl);
        listView.itemsReorderable = true;
        var originalListData = collectItemData(listView);
        var endIndex = originalListData.length - 1;
        var firstSelectionBlock = [1, 2, 3];
        var lastSelectionBlock = [endIndex - 1, endIndex - 2, endIndex - 3];
        function offsetSelectionBlock(originalBlock, offset) {
            var offsetBlock = [];
            for (var i = 0; i < originalBlock.length; i++) {
                offsetBlock.push(originalBlock[i] + offset);
            }
            return offsetBlock;
        }
        function offsetDataBlock(originalDataLocations, offset, extraData) {
            var offsetBlock = [];
            for (var i = 0; i < originalDataLocations.length; i++) {
                offsetBlock.push({
                    start: originalDataLocations[i],
                    end: originalDataLocations[i] + offset
                });
            }
            for (var i = 0; i < extraData.length; i++) {
                offsetBlock.push({
                    start: extraData[i].start,
                    end: extraData[i].end
                });
            }
            return offsetBlock;
        }
        var tests = [];

        for (var i = 0; i < firstSelectionBlock.length; i++) {
            (function () {
                var focusedIndex = firstSelectionBlock[i];
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, firstSelectionBlock);
                    changeListViewFocus(listView, focusedIndex);
                    compareData(originalListData, currentListData, []);
                    generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, offsetSelectionBlock(firstSelectionBlock, -1));
                    compareData(originalListData, currentListData, offsetDataBlock(firstSelectionBlock, -1, [{ start: 0, end: 3 }]));
                    LiveUnit.Assert.areEqual(focusedIndex - 1, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                    generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, offsetSelectionBlock(firstSelectionBlock, -1));
                    compareData(originalListData, currentListData, offsetDataBlock(firstSelectionBlock, -1, [{ start: 0, end: 3 }]));
                    LiveUnit.Assert.areEqual(focusedIndex - 1, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, firstSelectionBlock);
                    compareData(originalListData, currentListData, []);
                    LiveUnit.Assert.areEqual(focusedIndex, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, offsetSelectionBlock(firstSelectionBlock, 1));
                    compareData(originalListData, currentListData, offsetDataBlock(firstSelectionBlock, 1, [{ start: 4, end: 1 }]));
                    LiveUnit.Assert.areEqual(focusedIndex + 1, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, firstSelectionBlock);
                    compareData(originalListData, currentListData, []);
                    LiveUnit.Assert.areEqual(focusedIndex, listView._selection._getFocused().index);
                });
            })();
        }
        tests.push(function () {
            listView.selection.set(lastSelectionBlock);
        });
        for (var i = 0; i < lastSelectionBlock.length; i++) {
            (function () {
                var focusedIndex = lastSelectionBlock[i];
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, lastSelectionBlock);
                    changeListViewFocus(listView, focusedIndex);
                    compareData(originalListData, currentListData, []);
                    generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, offsetSelectionBlock(lastSelectionBlock, 1));
                    compareData(originalListData, currentListData, offsetDataBlock(lastSelectionBlock, 1, [{ start: endIndex, end: endIndex - 3 }]));
                    LiveUnit.Assert.areEqual(focusedIndex + 1, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
                    generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, offsetSelectionBlock(lastSelectionBlock, 1));
                    compareData(originalListData, currentListData, offsetDataBlock(lastSelectionBlock, 1, [{ start: endIndex, end: endIndex - 3 }]));
                    LiveUnit.Assert.areEqual(focusedIndex + 1, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, lastSelectionBlock);
                    compareData(originalListData, currentListData, []);
                    LiveUnit.Assert.areEqual(focusedIndex, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, offsetSelectionBlock(lastSelectionBlock, -1));
                    compareData(originalListData, currentListData, offsetDataBlock(lastSelectionBlock, -1, [{ start: endIndex - 4, end: endIndex - 1 }]));
                    LiveUnit.Assert.areEqual(focusedIndex - 1, listView._selection._getFocused().index);
                    generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
                    return true;
                });
                tests.push(function () {
                    var currentListData = collectItemData(listView);
                    compareSelection(listView, lastSelectionBlock);
                    compareData(originalListData, currentListData, []);
                    LiveUnit.Assert.areEqual(focusedIndex, listView._selection._getFocused().index);
                });
            })();
        }
        listView.selection.set(firstSelectionBlock);
        tests.push(function () {
            complete();
        });
        Helper.ListView.runTests(listView, tests);
    });

    generate("testUncontiguousSelectionReorder", function (listView, rtl, complete) {
        listView.itemsReorderable = true;
        var adjustedKeys = getAdjustedKeys(rtl);
        var originalListData;
        var listSize = ITEMS_COUNT;
        var selectionOffsetsToTest = [
            [0, 2, 3, 5],
            [0, 1, 3, 5, 6]
        ];
        var tests = [];
        function resetListView(selection) {
            listView.itemDataSource = getDataSource(listSize);
            listView.selection.set(selection);
            originalListData = collectItemData(listView);
        }

        function inSelection(selection, index) {
            for (var l = 0; l < selection.length; l++) {
                if (selection[l] === index) {
                    return true;
                }
            }
            return false;
        }
        function calcExpectedListState(key, originalSelection, focusedIndex, unselectedItemData, contiguousSelectedData) {
            var insertMethod = "atStart",
                insertIndex = focusedIndex;
            if (key === adjustedKeys.up || key === adjustedKeys.left) {
                do {
                    insertIndex--;
                } while (insertIndex >= 0 && inSelection(originalSelection, insertIndex));
                if (insertIndex >= 0) {
                    insertMethod = "beforeIndex";
                }
            } else {
                insertMethod = "afterIndex";
                do {
                    insertIndex++;
                } while (insertIndex < originalListData.length && inSelection(originalSelection, insertIndex));
                if (insertIndex >= originalListData.length) {
                    insertMethod = "atEnd";
                }
            }
            var insertIndexInUnselectedArray = -1;
            if (insertIndex > -1 && insertIndex < originalListData.length) {
                for (var k = 0; k < unselectedItemData.length; k++) {
                    if (unselectedItemData[k] === originalListData[insertIndex]) {
                        insertIndexInUnselectedArray = k;
                        break;
                    }
                }

                LiveUnit.Assert.isTrue(insertIndexInUnselectedArray !== -1);
            }

            var expectedFinalList = [];
            var expectedFinalSelection = [];

            function addSelectedData() {
                for (var k = 0; k < contiguousSelectedData.length; k++) {
                    expectedFinalSelection.push(expectedFinalList.length);
                    expectedFinalList.push(contiguousSelectedData[k]);
                }
            }

            function addUnselectedData(startIndex, count) {
                for (var k = 0; k < count; k++) {
                    expectedFinalList.push(unselectedItemData[startIndex + k]);
                }
            }

            if (insertMethod === "atStart") {
                addSelectedData();
                addUnselectedData(0, unselectedItemData.length);
            } else if (insertMethod === "atEnd") {
                addUnselectedData(0, unselectedItemData.length);
                addSelectedData();
            } else if (insertMethod === "beforeIndex") {
                addUnselectedData(0, insertIndexInUnselectedArray);
                addSelectedData();
                addUnselectedData(insertIndexInUnselectedArray, unselectedItemData.length - insertIndexInUnselectedArray);
            } else {
                addUnselectedData(0, insertIndexInUnselectedArray + 1);
                addSelectedData();
                addUnselectedData(insertIndexInUnselectedArray + 1, unselectedItemData.length - insertIndexInUnselectedArray - 1);
            }
            LiveUnit.Assert.areEqual(originalListData.length, expectedFinalList.length);
            var mappedMoves = [],
                newFocusedIndex = -1;
            for (var k = 0; k < originalListData.length; k++) {
                for (var l = 0; l < expectedFinalList.length; l++) {
                    if (originalListData[k] === expectedFinalList[l]) {
                        if (k !== l) {
                            mappedMoves.push({ start: k, end: l });
                        }
                        if (focusedIndex === k) {
                            newFocusedIndex = l;
                        }
                        break;
                    }
                }
            }

            return {
                selection: expectedFinalSelection,
                moves: mappedMoves,
                focus: newFocusedIndex
            };
        }
        function createSingleKeyTest(key, originalSelection, focusedIndex) {
            tests.push(function () {
                resetListView(originalSelection);
                return true;
            });
            tests.push(function () {
                var currentListData = collectItemData(listView);
                compareSelection(listView, originalSelection);
                compareData(originalListData, currentListData, []);
                changeListViewFocus(listView, focusedIndex);
                generateKeyEventInListView(listView, key, false, true, true);
                return true;
            });
            tests.push(function () {
                var currentListData = collectItemData(listView);
                ensureSelectionContiguous(listView);
                var contiguousSelectedData = [],
                    unselectedItemData = [];
                for (var k = 0; k < originalListData.length; k++) {
                    if (inSelection(originalSelection, k)) {
                        contiguousSelectedData.push(originalListData[k]);
                    } else {
                        unselectedItemData.push(originalListData[k]);
                    }
                }
                var expectedState = calcExpectedListState(key, originalSelection, focusedIndex, unselectedItemData, contiguousSelectedData);
                compareSelection(listView, expectedState.selection);
                compareData(originalListData, currentListData, expectedState.moves);
                LiveUnit.Assert.areEqual(expectedState.focus, listView._selection._getFocused().index);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
            });
        }
        function createTestsForOffsetsFromIndex(index, offsets) {
            var originalSelection = [];
            for (var j = 0; j < offsets.length; j++) {
                originalSelection.push(index + offsets[j]);
            }
            for (var j = 0; j < offsets.length; j++) {
                createSingleKeyTest(adjustedKeys.up, originalSelection, originalSelection[j]);
                createSingleKeyTest(adjustedKeys.left, originalSelection, originalSelection[j]);
                createSingleKeyTest(adjustedKeys.down, originalSelection, originalSelection[j]);
                createSingleKeyTest(adjustedKeys.right, originalSelection, originalSelection[j]);
            }
        }
        function createTestsForOffsets(offsets) {
            // Test that everything works as expected when one item in the selection is at the beginning,
            // when the selection has neither an item at the beginning nor end,
            // and when the selection has an item at the end. Every index will have every arrow key tested against it.
            createTestsForOffsetsFromIndex(0, offsets);
            createTestsForOffsetsFromIndex(1, offsets);
            var offsetsRange = offsets[offsets.length - 1] - offsets[0];
            createTestsForOffsetsFromIndex(listSize - offsetsRange - 1, offsets);
        }
        for (var i = 0; i < selectionOffsetsToTest.length; i++) {
            createTestsForOffsets(selectionOffsetsToTest[i]);
        }
        tests.push(function () {
            complete();
        });

        Helper.ListView.runTests(listView, tests);
    });

    generate("testKeyboardWhenNotReorderable", function (listView, rtl, complete) {
        var adjustedKeys = getAdjustedKeys(rtl);
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsDraggable = false;
        listView.itemsReorderable = false;

        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        handlers["itemdragstart"] = failTestIfCalled;
        handlers["itemdragbetween"] = failTestIfCalled;

        listView.selection.set([1]);
        changeListViewFocus(listView, 1);
        var tests = [
            function () {
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
            },

            function () {
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
            },

            function () {
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
            },

            function () {
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
            },

            function () {
                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    }, null, true);
    generate("testCanceledKeyboardReorder", function (listView, rtl, complete) {
        var adjustedKeys = getAdjustedKeys(rtl);
        var handlers = getEventHandlerCallbacks(listView);
        listView.itemsReorderable = true;

        handlers["itemdragchanged"] = failTestIfCalled;
        handlers["itemdragdrop"] = failTestIfCalled;
        handlers["itemdragleave"] = failTestIfCalled;
        handlers["itemdragstart"] = failTestIfCalled;
        var dragBetweensFired = 0;
        handlers["itemdragbetween"] = function (eventObject) {
            dragBetweensFired++;
            eventObject.preventDefault();
        };
        listView._currentMode()._reorderItems = function (dropIndex, reorderedItems, reorderingUnselectedItem, useMoveBefore) {
            LiveUnit.Assert.fail("ListView attempted to reorder items when the reorder was canceled");
        }
        listView.selection.set([1]);
        changeListViewFocus(listView, 1);
        var tests = [
            function () {
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.up, false, true, true);
            },

            function () {
                LiveUnit.Assert.areEqual(dragBetweensFired, 1);
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.down, false, true, true);
            },

            function () {
                LiveUnit.Assert.areEqual(dragBetweensFired, 2);
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.left, false, true, true);
            },

            function () {
                LiveUnit.Assert.areEqual(dragBetweensFired, 3);
                compareSelection(listView, [1]);
                generateKeyEventInListView(listView, adjustedKeys.right, false, true, true);
            },

            function () {
                LiveUnit.Assert.areEqual(dragBetweensFired, 4);
                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    }, null, true);
    
    var disabledTestRegistry = {
        testUncontiguousSelectionReorderGridLayoutVDS_rtl: Helper.BrowserCombos.all,
        testUncontiguousSelectionReorderListLayoutVDS_rtl: Helper.BrowserCombos.all,
        testUncontiguousSelectionReorderListLayoutBindingList_ltr: Helper.BrowserCombos.all,
        testUncontiguousSelectionReorderGridLayoutBindingList_ltr: Helper.BrowserCombos.all,
		testDragEnterInReorderableSourceListLayoutBindingList_ltr: Helper.Browsers.android
    };
    Helper.disableTests(ListViewDragDropTest, disabledTestRegistry);

}
if (!WinJS.Utilities.isPhone) {
    LiveUnit.registerTestClass("WinJSTests.ListViewDragDropTest");
}