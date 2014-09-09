// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListViewHelpers.ts" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.NonDragAndSelectTests = function () {
    "use strict";

    var ITEMS_COUNT = 5;
    var Key = WinJS.Utilities.Key;

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "NonDragAndSelectTests";
        newNode.style.width = "500px";
        newNode.style.height = "500px";
        document.body.appendChild(newNode);
        removeListviewAnimations();
    };
    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        var element = document.getElementById("NonDragAndSelectTests");
        document.body.removeChild(element);
        restoreListviewAnimations();
    }

    function getDataSource(count) {
        var rawData = [];
        for (var i = 0; i < (count ? count : ITEMS_COUNT) ; i++) {
            rawData.push({ itemInfo: "Tile" + i });
        }

        return new WinJS.Binding.List(rawData).dataSource;
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
                    element.className += " " + WinJS.UI._nonDraggableClass;
                }
                if (item.data.markUnselectable) {
                    element.className += " " + WinJS.UI._nonSelectableClass;
                }
            })
        };
    }
    function eventOnElement(element, useShift) {
        var rect = element.getBoundingClientRect();
        return {
            target: element,
            clientX: (rect.left + rect.right) / 2,
            clientY: (rect.top + rect.bottom) / 2,
            preventDefault: function () { },
            shiftKey: !!useShift
        };
    }
    function click(listView, index, useRight, useShift) {
        var mode = listView._currentMode();
        var item = listView.elementFromIndex(index);
        item.scrollIntoView(true);

        var eventObject = eventOnElement(item, useShift);
        eventObject.button = (useRight ? WinJS.UI._RIGHT_MSPOINTER_BUTTON : WinJS.UI._LEFT_MSPOINTER_BUTTON);
        mode.onPointerDown(eventObject);
        mode.onPointerUp(eventObject);
        mode.onclick();
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
    this.generate = function (name, undraggableIndices, unselectableIndicies, testFunction) {
        this[name] = function (complete) {
            LiveUnit.LoggingCore.logComment("in " + name);
            var element = document.getElementById("NonDragAndSelectTests");
            var data = getDataSource();
            var list = data._list;
            for (var i in undraggableIndices) {
                list.getItem(undraggableIndices[i]).data.markUndraggable = true;
            }
            for (var i in unselectableIndicies) {
                list.getItem(unselectableIndicies[i]).data.markUnselectable = true;
            }
            var listView = new WinJS.UI.ListView(element, {
                itemTemplate: basicRenderer,
                itemDataSource: data
            });
            waitForAllContainers(listView).done(function () {
                listView._currentMode()._itemEventsHandler._getCurrentPoint = function (eventObject) {
                    return {
                        properties: {
                            isRightButtonPressed: eventObject.button === WinJS.UI._RIGHT_MSPOINTER_BUTTON,
                            isLeftButtonPressed: eventObject.button === WinJS.UI._LEFT_MSPOINTER_BUTTON
                        }
                    };
                };
                testFunction(listView, complete);
            });
        };
    }

    if (!utilities.isPhone) {
        this.generate("testNonSwipeableClass", [0, 2], [1, 2], function (listView, complete) {
            listView.selectionMode = WinJS.UI.SelectionMode.none;
            listView.itemsDraggable = false;
            listView.itemsReorderable = false;
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.itemsDraggable = true;
            LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.itemsDraggable = false;
            listView.itemsReorderable = true;
            LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.itemsDraggable = false;
            listView.itemsReorderable = false;
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.selectionMode = WinJS.UI.SelectionMode.multi;
            listView.swipeBehavior = WinJS.UI.SwipeBehavior.select;
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.swipeBehavior = WinJS.UI.SwipeBehavior.none;
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.swipeBehavior = WinJS.UI.SwipeBehavior.select;
            listView.itemsDraggable = true;
            LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(1, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);

            listView.swipeBehavior = WinJS.UI.SwipeBehavior.select;
            listView.itemsDraggable = false;
            listView.itemsReorderable = true;
            LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, listView.element.querySelectorAll("[draggable=true]").length);
            LiveUnit.Assert.areEqual(1, listView.element.querySelectorAll("." + WinJS.UI._nonSwipeableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonDraggableClass).length);
            LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll("." + WinJS.UI._nonSelectableClass).length);
            complete();
        });
    }

    this.generate("testSelectAllWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        listView.selectionMode = WinJS.UI.SelectionMode.multi;
        generateKeyEventInListView(listView, Key.a, true, false, false);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(2));
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(3));
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(4));
        complete();
    });

    this.generate("testRangeSelectionViaKeyboardWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        listView.selectionMode = WinJS.UI.SelectionMode.multi;
        changeListViewFocus(listView, 0);
        generateKeyEventInListView(listView, Key.pageDown, false, false, true);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(2));
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(3));
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(4));
        complete();
    });

    this.generate("testRangeSelectionViaMouseWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        listView.selectionMode = WinJS.UI.SelectionMode.multi;
        listView.tapBehavior = WinJS.UI.TapBehavior.toggleSelect;
        click(listView, 0, false, false);
        click(listView, 4, false, true);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(2));
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(3));
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(4));

        listView.selection.clear();
        click(listView, 0, false, false);
        click(listView, 2, false, true);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(2));
        complete();
    });

    this.generate("testSelectionViaKeyboardWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        listView.selectionMode = WinJS.UI.SelectionMode.multi;
        changeListViewFocus(listView, 0);
        generateKeyEventInListView(listView, Key.space, false, false, false);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));

        listView.selection.clear();
        changeListViewFocus(listView, 1);
        generateKeyEventInListView(listView, Key.space, false, false, false);
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));

        listView.selection.clear();
        changeListViewFocus(listView, 2);
        generateKeyEventInListView(listView, Key.space, false, false, false);
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(2));

        listView.selection.clear();
        changeListViewFocus(listView, 3);
        generateKeyEventInListView(listView, Key.space, false, false, false);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(3));

        complete();
    });

    this.generate("testSelectionViaMouseWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        listView.selectionMode = WinJS.UI.SelectionMode.multi;
        click(listView, 0, true);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));

        listView.selection.clear();
        click(listView, 1, true);
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));

        listView.selection.clear();
        click(listView, 2, true);
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(2));

        listView.selection.clear();
        click(listView, 3, true);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(3));

        complete();
    });

    this.generate("testSelectionViaAriaWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        function setAriaSelected(index, selected) {
            listView.elementFromIndex(index).setAttribute("aria-selected", selected);
        }

        function verifySelection(expectedSelection) {
            var verifiedSelectedCount = 0;

            for (var i = 0; i < 5; i++) {
                var selected = (expectedSelection.indexOf(i) !== -1);
                var item = listView.elementFromIndex(i);

                LiveUnit.Assert.areEqual(selected, utilities.hasClass(item.parentNode, WinJS.UI._selectedClass),
                    "Item " + i + ": win-itembox's selected class is in the wrong state");
                LiveUnit.Assert.areEqual(selected, item.getAttribute("aria-selected") === "true",
                    "Item " + i + ": aria-selected is incorrect");
                LiveUnit.Assert.areEqual(selected, listView.selection._isIncluded(i),
                    "Item " + i + ": ListView's selection manager is incorrect");

                if (selected) verifiedSelectedCount++;
            }

            LiveUnit.Assert.areEqual(expectedSelection.length, verifiedSelectedCount,
                "Didn't verify the selection state for all items");
        }

        listView.selectionMode = WinJS.UI.SelectionMode.multi;

        WinJS.Promise.wrap().then(function () {
            setAriaSelected(0, true);
            return WinJS.Promise.timeout();
        }).then(function () {
            verifySelection([0]);

            setAriaSelected(1, true);
            return WinJS.Promise.timeout();
        }).then(function () {
            verifySelection([0]);

            setAriaSelected(2, true);
            return WinJS.Promise.timeout();
        }).then(function () {
            verifySelection([0]);

            setAriaSelected(3, true);
            return WinJS.Promise.timeout();
        }).then(function () {
            verifySelection([0, 3]);

            // Simulate UIA SelectionItem.Select on item 4
            setAriaSelected(0, false);
            setAriaSelected(3, false);
            setAriaSelected(4, true);
            return WinJS.Promise.timeout();
        }).then(function () {
            verifySelection([4]);

            // Verify that for a bulk selection change, selectable items get updated
            // while unselectable items are reverted back to their old aria-selected values
            setAriaSelected(0, true);
            setAriaSelected(1, true);
            setAriaSelected(2, true);
            setAriaSelected(3, true);
            setAriaSelected(4, false);
            return WinJS.Promise.timeout();
        }).then(function () {
            verifySelection([0, 3]);
            complete();
        });
    });

    this.generate("testSingleSelectionModeWithNonSelectableItems", [], [1, 2], function (listView, complete) {
        listView.selectionMode = WinJS.UI.SelectionMode.single;
        changeListViewFocus(listView, 0);
        generateKeyEventInListView(listView, Key.space, false, false, false);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));

        changeListViewFocus(listView, 1);
        generateKeyEventInListView(listView, Key.space, false, false, false);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));
        click(listView, 1, true);
        LiveUnit.Assert.isTrue(listView.selection._isIncluded(0));
        LiveUnit.Assert.isFalse(listView.selection._isIncluded(1));

        complete();
    });
};
LiveUnit.registerTestClass("WinJSTests.NonDragAndSelectTests");