// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
// <reference path="../TestData/ListView.less.css" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module WinJSTests {

    "use strict";

    var testRootEl;
    var listViewEl;
    var itemId;
    var transitionEnd;

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    var _WinJSUIexecuteTransition = WinJS.UI.executeTransition;

    function makeArray(elements) {
        if (elements instanceof Array || elements instanceof NodeList || elements instanceof HTMLCollection) {
            return elements;
        } else if (elements) {
            return [elements];
        } else {
            return [];
        }
    }

    function executeTransition(element, transition) {
        var elements = makeArray(element);
        var transitions = makeArray(transition);
        for (var j = 0; j < elements.length; j++) {
            for (var i = 0; i < transitions.length; i++) {
                transitionEnd.push(elements[j]);
            }
        }

        var executeTransitionPromise = _WinJSUIexecuteTransition(element, transition);

        return executeTransitionPromise;
    }

    function ancestorWithClass(element, className) {
        while (element && !WinJS.Utilities.hasClass(element, className)) {
            element = element.parentNode;
        }
        return element;
    }

    // Compares return values of getBoundingClientRect
    function assertRectsAreEqual(expectedRect, actualRect, message) {
        var keys = ["bottom", "height", "left", "right", "top", "width"];
        keys.forEach(function (k) {
            LiveUnit.Assert.areEqual(expectedRect[k], actualRect[k], message);
        });
    }

    function getRandomColor() {
        return "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
    }

    function getItem(index = 0, itemsPerGroup = 10) {

        return {
            title: "Tile" + itemId++,
            color: getRandomColor(),
            group: "" + Math.floor(index / itemsPerGroup)
        };
    }

    function getBindingList(count, itemsPerGroup = 10) {
        var rawData = [];
        for (var i = 0; i < count; i++) {
            rawData.push(getItem(i, itemsPerGroup));
        }

        return new WinJS.Binding.List(rawData);
    }

    function itemTemplate(itemPromise) {
        return itemPromise.then(function (item) {
            var element = document.createElement("div");
            element.style.width = "100px";
            element.style.height = "100px";
            element.style.backgroundColor = item.data.color;
            element.textContent = item.data.title;
            return element;
        });
    }

    function groupHeaderTemplate(itemPromise) {
        return itemPromise.then(function (item) {
            var element = document.createElement("div");
            element.style.width = "100px";
            element.style.height = "100px";
            element.textContent = item.data.title;
            return element;
        });
    }

    function waitForDirectMovePhase(transitionCalls) {
        var totalCalls = 0;
        return function () {
            return new WinJS.Promise(function (complete) {
                var customExecuteTransition = function (element, transition) {
                    totalCalls++;
                    var executeTransitionPromise = _WinJSUIexecuteTransition(element, transition);
                    if (totalCalls === transitionCalls) {
                        complete();
                    }
                    return executeTransitionPromise;
                };
                WinJS.Utilities._require('WinJS/Animations/_TransitionAnimation', function (_TransitionAnimation) {
                    _TransitionAnimation.executeTransition = customExecuteTransition;
                });
            });
        }
    }


    // Verifies that the delete animation starts by setting the deleted item's
    // size and location correctly.
    function verifyDeleteAnimation(listView, bindingList, index) {
        var rectsBeforeDelete = [];
        var itemBoxes = [];
        var didVerification = false;

        return new WinJS.Promise(function (complete, error) {
            function finishVerification() {
                LiveUnit.Assert.isTrue(didVerification);
                complete();
            }

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    // Get items on the screen which are both above and below the deleted item.
                    listView.indexOfFirstVisible = index - 2;

                    return Helper.ListView.waitForReady(listView)();
                }).
                done(function () {
                    var first = listView.indexOfFirstVisible;
                    var last = listView.indexOfLastVisible;
                    LiveUnit.Assert.isTrue(index >= first && index <= last,
                        "Test set up failed: index should be between indexOfFirstVisible and indexOfLastVisible");
                    for (var i = first; i <= last; i++) {
                        var itemBox = ancestorWithClass(listView.elementFromIndex(i), WinJS.UI._itemBoxClass);
                        itemBoxes[i] = itemBox;
                        rectsBeforeDelete[i] = Helper.ListView.containerFrom(itemBox).getBoundingClientRect();
                    }

                    var realExecuteAnimations = listView.layout.executeAnimations;
                    listView.layout.executeAnimations = function () {
                        try {
                            listView.layout.executeAnimations = realExecuteAnimations;
                            Object.keys(itemBoxes).forEach(function (i) {
                                // getComputedStyle needs to be called to ensure that the item is laid out before we try measuring it.
                                getComputedStyle(Helper.ListView.containerFrom(itemBoxes[i]));
                                var rectDuringDelete = Helper.ListView.containerFrom(itemBoxes[i]).getBoundingClientRect();
                                assertRectsAreEqual(rectsBeforeDelete[i], rectDuringDelete,
                                    "Animation improperly set initial size/location of item at index " + i);
                            });
                            didVerification = true;
                        } finally {
                            Helper.ListView.waitForReady(listView)().done(finishVerification);
                            return realExecuteAnimations.apply(this, arguments);
                        }
                    };

                    bindingList.splice(index, 1);
                });
        });
    }


    export class ListViewAnimation2Test {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setUp");
            itemId = 0;
            transitionEnd = [];

            WinJS.Utilities._require('WinJS/Animations/_TransitionAnimation', function (_TransitionAnimation) {
                _TransitionAnimation.executeTransition = executeTransition;
            });

            WinJS.UI.enableAnimations();

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            listViewEl = document.createElement('div');
            listViewEl.id = "Animations2TestListView";
            listViewEl.style.width = "500px";
            listViewEl.style.height = "500px";
            listViewEl.style.backgroundColor = "#777";
            testRootEl.appendChild(listViewEl);
            document.body.appendChild(testRootEl);
        }

        tearDown() {

            WinJS.Utilities._require('WinJS/Animations/_TransitionAnimation', function (_TransitionAnimation) {
                _TransitionAnimation.executeTransition = _WinJSUIexecuteTransition;
            });

            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.UI.disableAnimations();
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }

        testInsertAtEndAnimations(complete) {
            var bindingList = getBindingList(1);
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.layout = new WinJS.UI.ListLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    if (!WinJS.Utilities.isPhone) {
                        LiveUnit.Assert.areEqual(1, transitionEnd.length, "List Animations: Before edits: Correct number of transitions");
                        transitionEnd = [];
                    }
                    bindingList.splice(1, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0
                    // After: 0,1
                    // Item 1 faded in.
                    LiveUnit.Assert.areEqual(1, transitionEnd.length, "List Animations: After Insert: Correct number of transitions");
                }).
                done(complete);
        }

        testListAnimations(complete) {
            var bindingList = getBindingList(100);
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.layout = new WinJS.UI.ListLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    if (!WinJS.Utilities.isPhone) {
                        LiveUnit.Assert.areEqual(1, transitionEnd.length, "List Animations: Before edits: Correct number of transitions");
                        transitionEnd = [];
                    }
                    bindingList.splice(1, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0,1,2,3,4
                    // After: 0,100,1,2,3
                    // Items 1,2,3,4 had to move
                    // Item 100 faded in.
                    // Item 0 doesn't move.
                    LiveUnit.Assert.areEqual(5, transitionEnd.length, "List Animations: After Insert: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(1, 1);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0,100,1,2,3
                    // After: 0,1,2,3,4
                    // Items 1,2,3,4 had to move
                    // Item 100 faded out.
                    // Item 0 doesn't move.
                    LiveUnit.Assert.areEqual(5, transitionEnd.length, "List Animations: After Removal: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(1, 1, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0,1,2,3,4
                    // After: 0,101,2,3,4
                    // No items had to move.
                    // Item 1 faded out.
                    // Item 101 faded in.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "List Animations: After Insert/Removal: Correct number of transitions");
                }).
                done(complete);
        }

        testInsertThenResize(complete) {
            var bindingList = getBindingList(100);
            var listView = new ListView(listViewEl);
            listView.layout = new WinJS.UI.ListLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    // Insert an item:
                    bindingList.splice(1, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Resize:
                    listViewEl.style.height = "600px";
                    listView._onElementResize();

                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                done(function () {
                    LiveUnit.Assert.areEqual("1", getComputedStyle(<HTMLElement>listView.elementFromIndex(1).parentNode.parentNode).opacity, "Should not be opacity 0");

                    complete();
                });
        }

        testExpandItemsContainerForReflowNeeded(complete) {
            var bindingList = getBindingList(100);
            var listView = new WinJS.UI.ListView(listViewEl);

            listView.layout = new WinJS.UI.GridLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            var itemsContainer;
            listView.ensureVisible(90);
            Helper.ListView.waitForReady(listView)().
                then(function () {
                    bindingList.splice(80, 10);
                    return waitForDirectMovePhase(12)();
                }).
                then(function () {
                    itemsContainer = listView.element.querySelector(".win-itemscontainer");
                    LiveUnit.Assert.areEqual("200px", itemsContainer.style.paddingRight);
                    LiveUnit.Assert.areEqual("-200px", itemsContainer.style.marginRight);
                    return Helper.ListView.waitForReady(listView)();
                }).
                done(function () {
                    LiveUnit.Assert.areEqual("", itemsContainer.style.paddingRight);
                    LiveUnit.Assert.areEqual("", itemsContainer.style.marginRight);
                    complete();
                });
        }

        testExpandItemsContainerForReflowNotNeeded(complete) {
            var bindingList = getBindingList(100);
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.layout = new WinJS.UI.GridLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            var itemsContainer;
            Helper.ListView.waitForReady(listView)().
                then(function () {
                    bindingList.splice(0, 1);
                    return waitForDirectMovePhase(7)();
                }).
                then(function () {
                    itemsContainer = listView.element.querySelector(".win-itemscontainer");
                    LiveUnit.Assert.areEqual("", itemsContainer.style.paddingRight);
                    LiveUnit.Assert.areEqual("", itemsContainer.style.marginRight);
                    return Helper.ListView.waitForReady(listView)();
                }).
                done(function () {
                    LiveUnit.Assert.areEqual("", itemsContainer.style.paddingRight);
                    LiveUnit.Assert.areEqual("", itemsContainer.style.marginRight);
                    complete();
                });
        }

        testGridAnimations(complete) {
            var bindingList = getBindingList(100);
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.layout = new WinJS.UI.GridLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    if (!WinJS.Utilities.isPhone) {
                        LiveUnit.Assert.areEqual(1, transitionEnd.length, "Grid Animations: Before edits: Correct number of transitions");
                        transitionEnd = [];
                    }
                    bindingList.splice(6, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0->24
                    // After: 0->5,100,6->23
                    // Items 6->24 had to move
                    // 4 items had reflow.
                    // Item 100 faded in.
                    // Item 0 doesn't move.
                    LiveUnit.Assert.areEqual(24, transitionEnd.length, "Grid Animations: After Insert: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 1);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0-5,100,6-> 23
                    // After: 0->24
                    // Items 6->24 had to move
                    // 4 items had reflow.
                    // Item 100 faded out.
                    // Item 0 doesn't move.
                    LiveUnit.Assert.areEqual(24, transitionEnd.length, "Grid Animations: After Removal: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 1, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0->24
                    // After: 0->5,101,7->24
                    // No items had to move.
                    // Item 6 faded out.
                    // Item 101 faded in.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "Grid Animations: After Insert/Removal: Correct number of transitions");
                    transitionEnd = [];

                }).
                done(complete);
        }

        testGridMultiSizeAnimations(complete) {
            if (!Helper.Browser.supportsCSSGrid) {
                LiveUnit.LoggingCore.logComment("Cellspanning layout not supported on this platform.");
                complete();
                return;
            }

            var bindingList = getBindingList(100);
            var listView = new WinJS.UI.ListView(listViewEl);
            var layout = new WinJS.UI.CellSpanningLayout();
            listView.layout = layout;
            layout.groupInfo = function () {
                return {
                    enableCellSpanning: true,
                    cellWidth: 100,
                    cellHeight: 100
                };
            };
            layout.itemInfo = function () {
                return {
                    width: 100,
                    height: 100
                };
            };
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    if (!WinJS.Utilities.isPhone) {
                        LiveUnit.Assert.areEqual(1, transitionEnd.length, "Grid Animations: Before edits: Correct number of transitions");
                        transitionEnd = [];
                    }
                    bindingList.splice(6, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0->24
                    // After: 0->5,100,6->23
                    // Items 6->24 had to move (fade out, fade in)
                    // Item 100 faded in.
                    // Item 0 doesn't move.
                    LiveUnit.Assert.areEqual(39, transitionEnd.length, "Grid Animations: After Insert: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 1);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0-5,100,6-> 23
                    // After: 0->24
                    // Items 6->24 had to move (fade out, fade in)
                    // Item 100 faded out.
                    // Item 0 doesn't move.
                    LiveUnit.Assert.areEqual(39, transitionEnd.length, "Grid Animations: After Removal: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 1, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: 0->24
                    // After: 0->5,101,7->24
                    // No items had to move.
                    // Item 6 faded out.
                    // Item 101 faded in.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "Grid Animations: After Insert/Removal: Correct number of transitions");
                    transitionEnd = [];

                }).
                done(complete);
        }

        testGridGroupAnimations(complete) {
            //WPBlue: 317490 - This test is not stable on the phone due to dropped animations, so limiting to desktop.
            if (WinJS.Utilities.isPhone) {
                return complete();
            }
            var bindingList = getBindingList(100);
            var groupProjection = bindingList.createGrouped(groupKey, groupData);
            function groupKey(itemData) {
                return itemData.group;
            }
            function groupData(itemData) {
                return {
                    title: "Group " + itemData.group
                };
            };
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = groupProjection.dataSource;
            listView.groupHeaderTemplate = groupHeaderTemplate;
            listView.groupDataSource = groupProjection.groups.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    LiveUnit.Assert.areEqual(1, transitionEnd.length, "Grid Grouped Animations: Before edits: Correct number of transitions");
                    transitionEnd = [];
                    bindingList.splice(6, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: Group 0 (0-9), Group 1(10-12)
                    // After: Group 0 (0-5,101,6-9), Group 1(10-12)
                    // Items 6-9 had to move (4 transitions)
                    // Item 8 had to reflow (1 transition)
                    // Item 100 faded in. (1 transitions)
                    // Items 0-5 don't move.
                    LiveUnit.Assert.areEqual(6, transitionEnd.length, "Grid Grouped Animations: After Insert: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 0, getItem());
                    bindingList.splice(6, 0, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: Group 0 (0-5,100,6-9), Group 1(10-12)
                    // After: Group 0 (0-5,100-102,6-9), Group 1(10-12)
                    // Items 100,6-9 had to move (5 transitions)
                    // Group 1 had to move (2 transitions)
                    // Items 6, 7, and 9 had to reflow (3 transitions)
                    // Items 101,102 faded in. (2 transitions)
                    // Items 0-5 don't move.
                    LiveUnit.Assert.areEqual(12, transitionEnd.length, "Grid Grouped Animations: After Insert: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(0, 0, getItem(-1));
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Added a group at the beginning
                    // Item came - 1 transition
                    // Header came in - 1 transitions
                    // Group 0 moved over - 2 transitions
                    LiveUnit.Assert.areEqual(4, transitionEnd.length, "Grid Grouped Animations: After new Group");
                    transitionEnd = [];

                    bindingList.splice(0, 1);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Removed a group at the beginning
                    // Item exited - 1 transitions
                    // Header exited - 1 transitions
                    // Group 0 moved over - 2 transitions
                    LiveUnit.Assert.areEqual(4, transitionEnd.length, "Grid Grouped Animations: After new Group");
                    transitionEnd = [];

                    bindingList.splice(6, 1);
                    bindingList.splice(6, 1);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: Group 0 (0-5,100-102,6-9), Group 1(10-12)
                    // After: Group 0 (0-5,100,6-9), Group 1(10-12)
                    // Items 100,6-9 had to move
                    // Group 1 had to move (2 transitions)
                    // Items 6,7, and 9 had to reflow
                    // Items 101,102 faded out.
                    // Items 0-5 don't move.
                    LiveUnit.Assert.areEqual(12, transitionEnd.length, "Grid Grouped Animations: After Removal: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 1);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    // Before: Group 0 (0-5,100,6-9), Group 1(10-12)
                    // After: Group 0 (0-9), Group 1(10-12)
                    // Items 6-9 had to move
                    // Item 8 had to reflow
                    // Item 100 faded out.
                    // Items 0-5 don't move.
                    LiveUnit.Assert.areEqual(6, transitionEnd.length, "Grid Grouped Animations: After Removal: Correct number of transitions");
                    transitionEnd = [];

                    bindingList.splice(6, 1, getItem());
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                done(function () {
                    // Before: Group 0 (0-9), Group 1(10-12)
                    // After: Group 0 (0-5,103,7-9), Group 1(10-12)
                    // No items had to move.
                    // Item 6 faded out.
                    // Item 103 faded in.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "Grid Grouped Animations: After Insert/Removal: Correct number of transitions");
                    transitionEnd = [];
                    complete();
                });
        }


        testOverlappingInsertsAnimations(complete) {
            var bindingList = getBindingList(3);
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.layout = new WinJS.UI.ListLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            var timeout;
            Helper.ListView.waitForReady(listView)().
                then(function () {
                    if (!WinJS.Utilities.isPhone) {
                        LiveUnit.Assert.areEqual(1, transitionEnd.length, "List Overlapping edits:");
                        transitionEnd = [];
                    }
                    bindingList.splice(0, 0, getItem());
                    timeout = setTimeout(function () {
                        bindingList.splice(0, 0, getItem());
                        timeout = setTimeout(function () {
                            bindingList.splice(0, 0, getItem());
                        }, WinJS.UI._animationTimeAdjustment(40));
                    }, WinJS.UI._animationTimeAdjustment(40));

                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                done(function () {
                    // First 0-2 items move and 3 item fades in. (4 transitions)
                    // Then 3,0-2 items move and 4,5 items fade in. (6 transitions)
                    LiveUnit.Assert.areEqual(10, transitionEnd.length, "List Overlapping aftermath");
                    clearTimeout(timeout);
                    complete();
                });
        }

        testOverlappingRemovalsAnimations(complete) {
            var bindingList = getBindingList(6);
            var listView = new WinJS.UI.ListView(listViewEl);
            listView.layout = new WinJS.UI.ListLayout();
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            var timeout;
            Helper.ListView.waitForReady(listView)().
                then(function () {
                    if (!WinJS.Utilities.isPhone) {
                        LiveUnit.Assert.areEqual(1, transitionEnd.length, "List Overlapping edits:");
                        transitionEnd = [];
                    }
                    bindingList.splice(0, 1);
                    timeout = setTimeout(function () {
                        bindingList.splice(0, 1);
                        timeout = setTimeout(function () {
                            bindingList.splice(0, 1);
                        }, WinJS.UI._animationTimeAdjustment(40));
                    }, WinJS.UI._animationTimeAdjustment(40));

                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                done(function () {
                    // First 1-5 move and 0 fades out (6 transitions)
                    // Then 1 and 2 fade out when 3-5 move.(5 transitions)
                    LiveUnit.Assert.areEqual(11, transitionEnd.length, "List Overlapping aftermath");
                    clearTimeout(timeout);
                    complete();
                });
        }


        // Verifies that after ListLayout's width changes, the animations of deleted items
        // start at the correct size and in the correct location.
        testPositioningOfDeletedItemAfterResize(complete) {
            function itemRenderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.style.height = "100px";
                    element.style.backgroundColor = item.data.color;
                    element.textContent = item.data.title;
                    return element;
                });
            }

            WinJS.Utilities.addClass(listViewEl, "margins");
            var listView = new WinJS.UI.ListView(listViewEl);
            var bindingList = getBindingList(100);

            listView.layout = new WinJS.UI.ListLayout();
            listView.itemTemplate = itemRenderer;
            listView.itemDataSource = bindingList.dataSource;

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    listViewEl.style.width = "600px";
                    return Helper.ListView.waitForReady(listView, 100)();
                }).
                then(function () {
                    return verifyDeleteAnimation(listView, bindingList, 2);
                }).
                done(complete);
        }

        testDeleteBeforeFullRealize(complete) {

            function groupKey(itemData) {
                return itemData.group;
            }

            function groupData(itemData) {
                return {
                    title: "Group " + itemData.group
                };
            }

            var counter = 0;
            function renderer(itemPromise) {
                if (++counter === 3) {
                    list.dataSource.beginEdits();
                    list.splice(0, 1);
                    list.dataSource.endEdits();
                }

                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.style.height = element.style.width = "100px";
                    element.style.backgroundColor = "blue";
                    element.textContent = item.data.title;
                    return element;
                });
            }

            var data = [];
            for (var i = 0; i < 36; i++) {
                data.push({
                    title: "Tile" + i,
                    group: "" + Math.floor(i / 7)
                });
            }
            var list = new WinJS.Binding.List(data);
            var myGroupedList = list.createGrouped(groupKey, groupData);

            var element = document.createElement("div");
            element.style.height = "400px";
            element.style.width = "400px";
            testRootEl.appendChild(element);

            var listView = new WinJS.UI.ListView(element, {
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: renderer,
                groupHeaderTemplate: renderer
            });

            Helper.ListView.waitForReady(listView)().
                done(function () {
                    WinJS.Utilities.disposeSubTree(element);
                    testRootEl.removeChild(element);
                    complete();
                });
        } 
    }


    // Verifies that the delete animation positions and sizes the deleted element correctly. Does this in a ListView
    // which has a variety of margins on a few different types of elements (win-container, win-surface, etc.).
    function generateTestPositioningOfDeletedItem(rtl, indicesToDelete, useGroups, layoutName, layout) {
        var testName = "testPositioningOfDeletedItem" + (rtl ? "_RTL" : "_LTR") + "_" + layoutName;
        ListViewAnimation2Test.prototype[testName] = function (complete) {
            function groupKey(itemData) {
                return itemData.group;
            }
            function groupData(itemData) {
                return {
                    title: "Group " + itemData.group
                };
            }
            function groupSorter(a, b) {
                return parseInt(a, 10) - parseInt(b, 10);
            }

            if (rtl) {
                listViewEl.dir = "rtl";
            }
            WinJS.Utilities.addClass(listViewEl, "margins");
            listViewEl.style.height = "1000px";
            listViewEl.style.width = "1000px";
            var listView = new WinJS.UI.ListView(listViewEl);
            var bindingList: any = getBindingList(100, 4);

            if (useGroups) {
                bindingList = bindingList.createGrouped(groupKey, groupData, groupSorter);
                listView.groupHeaderTemplate = groupHeaderTemplate;
                listView.groupDataSource = bindingList.groups.dataSource;
            }

            listView.layout = layout;
            listView.itemTemplate = itemTemplate;
            listView.itemDataSource = bindingList.dataSource;

            var promise = WinJS.Promise.wrap();
            indicesToDelete.forEach(function (index) {
                promise = promise.then(function () {
                    return verifyDeleteAnimation(listView, bindingList, index);
                });
            });
            promise.done(complete);
        };
    };

    // Call generateTestPositioningOfDeletedItem in LTR and RTL for a number of different layouts
    (function () {
        function groupInfo(group) {
            if (group.index % 2 === 0) {
                return { enableCellSpanning: false };
            } else {
                return {
                    enableCellSpanning: true,
                    cellWidth: 100,
                    cellHeight: 100
                };
            }
        }

        function itemInfo() {
            return {
                width: 100,
                height: 100
            };
        }

        [false, true].forEach(function (rtl) {
            ["horizontal", "vertical"].forEach(function (orientation) {
                generateTestPositioningOfDeletedItem(rtl, [6], false, "ListLayout" + "_" + orientation + "_", new WinJS.UI.ListLayout({ orientation: orientation }));
                generateTestPositioningOfDeletedItem(rtl, [6], false, "GridLayout" + "_" + orientation + "_", new WinJS.UI.GridLayout({ orientation: orientation }));
                generateTestPositioningOfDeletedItem(rtl, [6, 10], true, "GridLayout_HeaderPositionTop" + "_" + orientation + "_", new WinJS.UI.GridLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.top
                }));
                generateTestPositioningOfDeletedItem(rtl, [6, 10], true, "GridLayout_HeaderPositionLeft" + "_" + orientation + "_", new WinJS.UI.GridLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.left
                }));
                generateTestPositioningOfDeletedItem(rtl, [6, 10], true, "GroupedListLayout_HeaderPositionTop" + "_" + orientation + "_", new WinJS.UI.ListLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.top
                }));
                generateTestPositioningOfDeletedItem(rtl, [6, 10], true, "GroupedListLayout_HeaderPositionLeft" + "_" + orientation + "_", new WinJS.UI.ListLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.left
                }));
            });

            if (Helper.Browser.supportsCSSGrid) {
                generateTestPositioningOfDeletedItem(rtl, [6, 10], true, "CellSpanningLayout_HeaderPositionLeft", new WinJS.UI.CellSpanningLayout({
                    groupInfo: groupInfo,
                    itemInfo: itemInfo,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.top
                }));
                generateTestPositioningOfDeletedItem(rtl, [6, 10], true, "CellSpanningLayout_HeaderPositionLeft", new WinJS.UI.CellSpanningLayout({
                    groupInfo: groupInfo,
                    itemInfo: itemInfo,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.left
                }));
            } else {
                LiveUnit.LoggingCore.logComment("Cellspanning layout not supported on this platform.");
            }
        });
    })();
    
    var disabledTestRegistry = {
        testPositioningOfDeletedItem_LTR_GroupedListLayout_HeaderPositionLeft_horizontal_: [
            Helper.Browsers.ie11,
            Helper.Browsers.firefox
        ],
        testPositioningOfDeletedItem_RTL_GroupedListLayout_HeaderPositionTop_vertical_: [
            Helper.Browsers.ie11,
            Helper.Browsers.safari
        ],
        testOverlappingRemovalsAnimations: [
            Helper.Browsers.firefox,
            Helper.Browsers.safari,
            Helper.Browsers.android,
            Helper.Browsers.ie11,
			Helper.Browsers.ie10
        ],
        testOverlappingInsertsAnimations: [
			Helper.Browsers.firefox,
			Helper.Browsers.ie10,
		],
        testPositioningOfDeletedItem_LTR_GroupedListLayout_HeaderPositionTop_vertical_: [
            Helper.Browsers.safari,
            Helper.Browsers.ie11
        ],
        testPositioningOfDeletedItem_RTL_GroupedListLayout_HeaderPositionLeft_vertical_:[
           Helper.Browsers.safari,
           Helper.Browsers.ie11
        ],
        testPositioningOfDeletedItem_RTL_GroupedListLayout_HeaderPositionTop_horizontal_: Helper.Browsers.ie11,
        testPositioningOfDeletedItem_RTL_GroupedListLayout_HeaderPositionLeft_horizontal_: Helper.Browsers.ie11,
        testPositioningOfDeletedItem_LTR_GroupedListLayout_HeaderPositionTop_horizontal_: Helper.Browsers.ie11,
        testPositioningOfDeletedItem_LTR_GroupedListLayout_HeaderPositionLeft_vertical_: Helper.Browsers.ie11 
    };
    Helper.disableTests(ListViewAnimation2Test, disabledTestRegistry);
}
LiveUnit.registerTestClass("WinJSTests.ListViewAnimation2Test");
