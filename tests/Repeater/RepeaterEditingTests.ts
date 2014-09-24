// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="repeaterUtils.ts"/>

module WinJSTests {

    "use strict";

    var utils = repeaterUtils,
        loadedEvent = utils.events.loadedEvent,
        insertingEvent = utils.events.insertingEvent,
        insertedEvent = utils.events.insertedEvent,
        removingEvent = utils.events.removingEvent,
        removedEvent = utils.events.removedEvent,
        movingEvent = utils.events.movingEvent,
        movedEvent = utils.events.movedEvent,
        changingEvent = utils.events.changingEvent,
        changedEvent = utils.events.changedEvent,
        reloadingEvent = utils.events.reloadingEvent,
        reloadedEvent = utils.events.reloadedEvent,
        disposableRenderer = utils.disposableRenderer;

    function verifyDOM(elem, data, childrenClassQuery) {
        LiveUnit.LoggingCore.logComment("Verifying the DOM");

        var domChildren = elem.querySelectorAll(childrenClassQuery),
            numberOfDomChildren = domChildren.length;

        // Verify the number of children elements
        LiveUnit.Assert.areEqual(data.length, numberOfDomChildren,
            "The DOM size is not equal to the number of data items");

        // Verify that repeater owns the its innerHTML and that no other html elements have been injected into it..
        LiveUnit.Assert.areEqual(numberOfDomChildren, elem.childNodes.length,
            "After initialization, Repeater's innerHTML should only contain the elements its template generated from the data set.");

        // Verify the DOM order
        data.forEach(function (item, index) {
            // Verify the content of the element
            var child = domChildren[index];
            LiveUnit.Assert.areEqual(item, child.textContent,
                "The data and the DOM element don't match");
        });
    }

    export class RepeaterEditingTests {


        // This is the setup function that will be called at the beginning of 
        // each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "RepeaterTests";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("RepeaterTests");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }





        testRandomDataEdits = function (complete) {
            var data = utils.createMonthsList(),
                newData = utils.createWeekdaysList(),
                srcIndex = 0,
                destIndex = 0,
                editsCount = 500,
                editType,
                elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                template: disposableRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            function getRandomNumberUpto(num) {
                return Math.floor(Math.random() * num);
            }

            function getRandomItem(array) {
                var randomIndex = getRandomNumberUpto(array.length);
                if (array instanceof Array) {
                    return array[randomIndex];
                } else {
                    return array.getAt(randomIndex);
                }
            }

            var ops = ["push", "unshift", "pop", "shift", "setAt", "move", "reverse", "sort", "length", "splice"];
            while (editsCount--) {
                srcIndex = getRandomNumberUpto(data.length);
                destIndex = getRandomNumberUpto(data.length);
                editType = data.length === 0 ? "push" : getRandomItem(ops);

                // Perform data edits
                switch (editType) {
                    case "push":
                        LiveUnit.LoggingCore.logComment("Performing push operation");
                        data.push(getRandomItem(newData));
                        break;

                    case "unshift":
                        LiveUnit.LoggingCore.logComment("Performing unshift operation");
                        data.unshift(getRandomItem(newData));
                        break;

                    case "pop":
                        LiveUnit.LoggingCore.logComment("Performing pop operations");
                        data.pop();
                        break;

                    case "shift":
                        LiveUnit.LoggingCore.logComment("Performing shift operations");
                        data.shift();
                        break;

                    case "setAt":
                        LiveUnit.LoggingCore.logComment("Performing setAt operations");
                        data.setAt(srcIndex, getRandomItem(newData));
                        break;

                    case "move":
                        LiveUnit.LoggingCore.logComment("Performing move operation");
                        data.move(srcIndex, destIndex);
                        break;

                    case "reverse":
                        LiveUnit.LoggingCore.logComment("Performing reverse operation");
                        data.reverse();
                        break;

                    case "sort":
                        LiveUnit.LoggingCore.logComment("Performing sort operation");
                        data.sort();
                        break;

                    case "length":
                        LiveUnit.LoggingCore.logComment("Setting the length of the list to less than actual member");
                        data.length = getRandomNumberUpto(data.length);
                        break;

                    case "splice":
                        LiveUnit.LoggingCore.logComment("Performing splice operation");
                        data.splice(srcIndex, destIndex, getRandomItem(newData));
                        break;

                    default:
                        LiveUnit.Assert.fail("Unrecognized edit type");
                }

                // Verify DOM and events
                verifyDOM(elem, data, ".repeater-child");
            }

            // Done
            complete();
        };

        testAddToListUsingSetAt = function (complete) {
            var data = utils.createMonthsList(),
                elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                template: disposableRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Binding List allows setAt() to append to the list when setting the item at (list.length) index
            // Add an item to the end of the list by using setAt
            data.setAt(data.length, data.getAt(0));

            verifyDOM(elem, data, ".repeater-child");
            complete();
        };
    }

    (function () {
        function generateTest(editType, editBeforeEvent, editAfterEvent) {
            return function (complete) {
                var data = utils.createMonthsList(),
                    newData = utils.createWeekdaysList(),
                    elem = document.getElementById("RepeaterTests"),
                    editAfterEventFired = 0,
                    editBeforeEventFired = 0;

                LiveUnit.LoggingCore.logComment("Creating a repeater control");
                var repeater = new WinJS.UI.Repeater(elem, {
                    data: data,
                    template: disposableRenderer
                });
                LiveUnit.LoggingCore.logComment("Repeater control created");

                repeater.addEventListener(editAfterEvent, editAfterEventHandler);
                function editAfterEventHandler(ev) {
                    LiveUnit.LoggingCore.logComment(editAfterEvent + " event fired: " + editAfterEventFired);
                    editAfterEventFired++;
                }

                repeater.addEventListener(editBeforeEvent, editBeforeEventHandler);
                function editBeforeEventHandler(ev) {
                    if (ev.type === insertingEvent) {
                        LiveUnit.Assert.areEqual(repeater.length, repeater.data.length - 1);
                    }

                    if (ev.type === removingEvent) {
                        LiveUnit.Assert.areEqual(repeater.length, repeater.data.length + 1);
                    }

                    editBeforeEventFired++;
                    // Verify the index at which edit has happened
                    // This handler will run after the edit has already been committed to the binding list

                    switch (editType) {
                        case "push":
                            LiveUnit.LoggingCore.logComment("Insert event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual((data.length - 1), ev.detail.index,
                                "Item was not inserted at expected index");
                            break;

                        case "unshift":
                            LiveUnit.LoggingCore.logComment("Insert event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(0, ev.detail.index, "Item was not inserted at expected index");
                            break;

                        case "pop":
                            LiveUnit.LoggingCore.logComment("Remove event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(data.length, ev.detail.index,
                                "Item was not removed from expected index");
                            break;

                        case "shift":
                            LiveUnit.LoggingCore.logComment("Remove event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(0, ev.detail.index, "Item was not removed from expected index");
                            break;

                        case "setAt":
                            LiveUnit.LoggingCore.logComment("Change event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(data.getAt(ev.detail.index), newData.getAt(ev.detail.index), "Item in data was changed to item at same index in newData");
                            break;

                        case "move":
                            LiveUnit.LoggingCore.logComment("Move event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(data.getAt(ev.detail.newIndex), ev.detail.affectedElement.textContent, "DOM element should be moved into the same index as the item in data.");
                            LiveUnit.Assert.areEqual(data.getAt(ev.detail.newIndex), repeater.elementFromIndex(ev.detail.oldIndex).textContent, "Element should not yet be moved in the DOM when the Repeater fires the itemmove event.");
                            break;

                        case "reverse":
                        case "sort":
                            LiveUnit.LoggingCore.logComment("reload event fired:" + editBeforeEventFired);
                            break;

                        case "length":
                            LiveUnit.LoggingCore.logComment("Remove event fired:" + editBeforeEventFired);
                            break;

                        default:
                            LiveUnit.Assert.fail("Unrecognized edit type");
                    }
                }

                // Perform data edits
                switch (editType) {
                    case "push":
                        LiveUnit.LoggingCore.logComment("Performing push operations");
                        newData.forEach(function (item) {
                            data.push(item);
                        });
                        break;

                    case "unshift":
                        LiveUnit.LoggingCore.logComment("Performing unshift operations");
                        newData.forEach(function (item) {
                            data.unshift(item);
                        });
                        break;

                    case "pop":
                        LiveUnit.LoggingCore.logComment("Performing pop operations");
                        while (data.length > 0) {
                            data.pop();
                        };
                        break;

                    case "shift":
                        LiveUnit.LoggingCore.logComment("Performing shift operations");
                        while (data.length > 0) {
                            data.shift();
                        };
                        break;

                    case "setAt":
                        LiveUnit.LoggingCore.logComment("Performing setAt operations");
                        for (var i = 0, len = (data.length < newData.length) ? data.length : newData.length; i < len; i++) {
                            var item = newData.getAt(i);
                            data.setAt(i, item);
                        }
                        break;

                    case "move":
                        LiveUnit.LoggingCore.logComment("Performing move operation");
                        data.move(0, data.length - 1);
                        break;

                    case "reverse":
                        LiveUnit.LoggingCore.logComment("Performing reverse operation");
                        data.reverse();
                        break;

                    case "sort":
                        LiveUnit.LoggingCore.logComment("Performing sort operation");
                        data.sort();
                        break;

                    case "length":
                        LiveUnit.LoggingCore.logComment("Setting the length of the list to less than actual member");
                        // Length of data is 12. Setting length to 2 is equivalent to removing 10 elements from the list
                        data.length = 2;
                        break;

                    default:
                        LiveUnit.Assert.fail("Unrecognized edit type");
                }

                // Verify DOM and events
                verifyDOM(elem, data, ".repeater-child");

                switch (editType) {
                    case "push":
                    case "unshift":
                        LiveUnit.Assert.areEqual(editAfterEventFired, editBeforeEventFired,
                            "Inserting and Inserting events should be fired equal to number of inserts");
                        break;

                    case "pop":
                    case "shift":
                    case "length":
                        LiveUnit.Assert.areEqual(editAfterEventFired, editBeforeEventFired,
                            "Removing and Removed events should be fired equal to number of deletes");
                        break;

                    case "setAt":
                        LiveUnit.Assert.areEqual(editAfterEventFired, editBeforeEventFired,
                            "Changing and Changed events should be fired equal to number of setAts");
                        break;

                    case "move":
                        LiveUnit.Assert.areEqual(editAfterEventFired, editBeforeEventFired,
                            "Moving and Moved events should be fired equal to number of moves");
                        break;

                    case "reverse":
                    case "sort":
                        LiveUnit.Assert.areEqual(1, editBeforeEventFired,
                            "Reloading event should be fired once");
                        LiveUnit.Assert.areEqual(1, editBeforeEventFired,
                            "Reloading and Reloaded events should be fired equal to the number of reloads");
                        break;

                    default:
                        LiveUnit.Assert.fail("Unrecognized edit type");
                }

                // Done
                complete();
            };
        }

        RepeaterEditingTests.prototype["testListPush"] = generateTest("push", insertingEvent, insertedEvent);
        RepeaterEditingTests.prototype["testListUnshift"] = generateTest("unshift", insertingEvent, insertedEvent);
        RepeaterEditingTests.prototype["testListPop"] = generateTest("pop", removingEvent, removedEvent);
        RepeaterEditingTests.prototype["testListShift"] = generateTest("shift", removingEvent, removedEvent);
        RepeaterEditingTests.prototype["testListSetAt"] = generateTest("setAt", changingEvent, changedEvent);
        RepeaterEditingTests.prototype["testListMove"] = generateTest("move", movingEvent, movedEvent);
        RepeaterEditingTests.prototype["testListReverse"] = generateTest("reverse", reloadingEvent, reloadedEvent);
        RepeaterEditingTests.prototype["testListSort"] = generateTest("sort", reloadingEvent, reloadedEvent);
        RepeaterEditingTests.prototype["testSetListLength"] = generateTest("length", removingEvent, removedEvent);
    })();

    (function () {
        function generateTest(startIndex, howMany, items?) {
            return function (complete) {
                var data = utils.createMonthsList(),
                    elem = document.getElementById("RepeaterTests"),
                    removingEventFired = 0,
                    removedEventFired = 0,
                    insertingEventFired = 0,
                    insertedEventFired = 0;

                // Trimming the length to limit the number of tests
                data.length = 6;

                LiveUnit.LoggingCore.logComment("Creating a repeater control");
                var repeater = new WinJS.UI.Repeater(elem, {
                    data: data,
                    template: disposableRenderer
                });
                LiveUnit.LoggingCore.logComment("Repeater control created");

                function attachHandler(event, eventFiredCount) {
                    repeater.addEventListener(event, eventHandler);
                    function eventHandler(ev) {
                        LiveUnit.LoggingCore.logComment(event + " event fired: " + eventFiredCount);
                        eventFiredCount++;
                    }
                }

                attachHandler(removingEvent, removedEventFired);
                attachHandler(removedEvent, removedEventFired);
                attachHandler(insertingEvent, insertedEventFired);
                attachHandler(insertedEvent, insertedEventFired);

                // Perform splice operation
                if (items) {
                    data.splice(startIndex, howMany, items);
                } else {
                    data.splice(startIndex, howMany);
                }

                // Verify
                verifyDOM(elem, data, ".repeater-child");

                LiveUnit.Assert.areEqual(removedEventFired, removingEventFired,
                    "Item removing and removed events didn't fire equal number of times");
                LiveUnit.Assert.areEqual(insertedEventFired, insertingEventFired,
                    "Item removing and removed events didn't fire equal number of times");

                complete();
            };
        }

        // The test binding list contains 6 items, while the new list contains 7 items
        var newData = utils.createWeekdaysList(),
            oldDataLength = 6;

        // Separate tests for each splice as we want to verify the DOM after every operation

        // Tests for removes and inserts using splice
        for (var start = 0; start < oldDataLength; start++) {
            for (var count = 0; count <= oldDataLength; count++) {
                newData.forEach(function (item) {
                    RepeaterEditingTests.prototype["testSpliceStartAt" + start + "Count" + count + "NewItem" + item] = generateTest(start, count, item);
                });
            }
        }

        // Tests for only removes 
        for (var start = 0; start < oldDataLength; start++) {
            for (var count = 0; count <= oldDataLength; count++) {
                RepeaterEditingTests.prototype["testSpliceRemovesStartAt" + start + "Count" + count] = generateTest(start, count);
            }
        }

        // Tests for only inserts
        for (var start = 0; start < oldDataLength; start++) {
            newData.forEach(function (item) {
                RepeaterEditingTests.prototype["testSpliceInsertsStartAt" + start + "NewItem" + item] = generateTest(start, 0, item);
            });
        }
    })();
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RepeaterEditingTests");
