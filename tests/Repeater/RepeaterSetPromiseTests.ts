// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="repeaterUtils.ts"/>

module WinJSTests {

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
        affectedWinControl,
        controlTemplate = (function () {
            var root = document.createElement("div");
            root.innerHTML = '<div class="product"><div data-win-control="MyCustomControlForRepeater"></div></div></div>';
            return new WinJS.Binding.Template(root);
        } ());

    export class RepeaterSetPromiseTests {
        "use strict";

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

    }

    (function () {
        function generateTest(editType, editBeforeEvent, editAfterEvent, deferElementDisposal) {
            return function (complete) {
                var data = utils.createMonthsList(),
                    newData = utils.createWeekdaysList(),
                    repeaterElem = document.getElementById("RepeaterTests"),
                    editAfterEventFired = 0,
                    editBeforeEventFired = 0;

                LiveUnit.LoggingCore.logComment("Creating a repeater control");
                var repeater = new WinJS.UI.Repeater(repeaterElem, {
                    data: data,
                    template: controlTemplate
                });
                LiveUnit.LoggingCore.logComment("Repeater control created");

                repeater.addEventListener(editAfterEvent, editAfterEventHandler);
                function editAfterEventHandler(ev) {
                    // verify the item is still removed from the DOM, but still not disposed.
                    LiveUnit.LoggingCore.logComment(editAfterEvent + " event fired: " + editAfterEventFired);
                    var isElementInDOM = document.body.contains(affectedWinControl._element);
                    LiveUnit.Assert.areEqual(false, isElementInDOM,
                        "Repeater child element should be removed from the DOM by now.");
                    var isControlDisposed = affectedWinControl._disposed;
                    LiveUnit.Assert.areEqual(false, isControlDisposed,
                        "Repeater child element is removed from the DOM but should not be disposed yet.");

                }

                repeater.addEventListener(editBeforeEvent, editBeforeEventHandler);
                function editBeforeEventHandler(ev) {
                    // Verify element to be modified has not been disposed yet.

                    if (deferElementDisposal) {
                        ev.setPromise(WinJS.Promise.timeout(0));
                    }
                    var isControlDisposed;
                    switch (editType) {
                        case "pop":
                            affectedWinControl = ev.affectedElement.firstElementChild.winControl;
                            isControlDisposed = affectedWinControl._disposed;
                            LiveUnit.LoggingCore.logComment("Remove event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(false, isControlDisposed,
                                "Repeater's child element that is about to be removed should not be disposed yet.");
                            break;

                        case "setAt":
                            affectedWinControl = ev.oldElement.firstElementChild.winControl;
                            isControlDisposed = affectedWinControl._disposed;
                            LiveUnit.LoggingCore.logComment("Change event fired:" + editBeforeEventFired);
                            LiveUnit.Assert.areEqual(false, isControlDisposed,
                                "Repeater's child element that is about to be changed should not be disposed yet.");
                            break;

                        case "reverse":
                            affectedWinControl = ev.affectedElements[0].firstElementChild.winControl;
                            isControlDisposed = affectedWinControl._disposed;
                            LiveUnit.Assert.areEqual(false, isControlDisposed,
                                "Repeater's child element that is about to be reloaded should not be disposed yet.");
                            break;

                        default:
                            LiveUnit.Assert.fail("Unrecognized edit type");
                    }
                }

                // Perform data edits
                switch (editType) {
                    case "pop":
                        LiveUnit.LoggingCore.logComment("Performing pop operation");
                        data.pop();
                        break;

                    case "setAt":
                        LiveUnit.LoggingCore.logComment("Performing setAt operation");
                        var item = newData.getAt(0);
                        data.setAt(0, item);
                        break;

                    case "reverse":
                        LiveUnit.LoggingCore.logComment("Performing reverse operation");
                        data.reverse();
                        break;

                    default:
                        LiveUnit.Assert.fail("Unrecognized insert operation");
                }

                var isControlDisposed = affectedWinControl._disposed;
                if (deferElementDisposal) {
                    LiveUnit.Assert.areEqual(false, isControlDisposed,
                        "Repeater's child element should not be disposed until the setPromise timeout promise is complete.");

                    WinJS.Utilities._setImmediate(function () {
                        isControlDisposed = affectedWinControl._disposed;
                        LiveUnit.Assert.areEqual(true, isControlDisposed,
                            "Repeater's child element should be disposed now that the setPromise timeout promise is complete.");
                        complete(); // Done
                    });
                } else {
                    // verify it was already disposed
                    LiveUnit.Assert.areEqual(true, isControlDisposed,
                        "Repeater's child element should be disposed synchronously when setPromise is not used.");
                    complete(); // Done
                }
            };
        }

        // Verify disposal of elements is not deferred for itemremoving,itemchanging and itemsreloading events
        var deferElementDisposal = false;
        RepeaterSetPromiseTests.prototype["testElementDisposeAfterListPop"] = generateTest("pop", removingEvent, removedEvent, deferElementDisposal);
        RepeaterSetPromiseTests.prototype["testElementDisposeAfterListSetAt"] = generateTest("setAt", changingEvent, changedEvent, deferElementDisposal);
        RepeaterSetPromiseTests.prototype["testElementDisposeAfterListReverse"] = generateTest("reverse", reloadingEvent, reloadedEvent, deferElementDisposal);

        // Verify disposal of elements is deferred for itemremoving,itemchanging and itemsreloading events
        deferElementDisposal = true;
        RepeaterSetPromiseTests.prototype["testSetPromiseAfterListPop"] = generateTest("pop", removingEvent, removedEvent, deferElementDisposal);
        RepeaterSetPromiseTests.prototype["testSetPromiseAfterListSetAt"] = generateTest("setAt", changingEvent, changedEvent, deferElementDisposal);
        RepeaterSetPromiseTests.prototype["testSetPromiseAfterListReverse"] = generateTest("reverse", reloadingEvent, reloadedEvent, deferElementDisposal);


    })();
    
    var disabledTestRegistry = {
        testSetPromiseAfterListReverse: Helper.Browsers.android
    };
    Helper.disableTests(RepeaterSetPromiseTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RepeaterSetPromiseTests");
