// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.ListViewAnimation2Test = function () {
    "use strict";
    var listViewEl;
    var itemId;
    var transitionEnd;

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

    this.setUp = function (complete) {
        LiveUnit.LoggingCore.logComment("In setUp");
        itemId = 0;
        transitionEnd = [];

        WinJS.UI.executeTransition = executeTransition;

        WinJS.UI.enableAnimations();

        listViewEl = document.createElement('div');
        listViewEl.id = "Animations2TestListView";
        listViewEl.style.width = "500px";
        listViewEl.style.height = "500px";
        listViewEl.style.backgroundColor = "#777";
        document.body.appendChild(listViewEl);

        listViewEl.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], onTransitionEnd, true);
        appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
    };

    this.tearDown = function () {
        WinJS.UI.executeTransition = _WinJSUIexecuteTransition;

        LiveUnit.LoggingCore.logComment("In tearDown");
        WinJS.UI.disableAnimations();
        listViewEl.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], onTransitionEnd, true);
        WinJS.Utilities.disposeSubTree(listViewEl);
        document.body.removeChild(listViewEl);
        removeCSSFileFromHead("$(TESTDATA)/Listview.css");
    };

    function onTransitionEnd(ev) {
        //transitionEnd.push(ev.target); //WinBlue: 68076
    }

    function getRandomColor() {
        return "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
    }

    function getItem(index) {
        index = index || 0;
        return {
            title: "Tile" + itemId++,
            color: getRandomColor(),
            group: "" + Math.floor(index / 10)
        };
    }

    function getBindingList(count) {
        var rawData = [];
        for (var i = 0; i < (count ? count : ITEMS_COUNT) ; i++) {
            rawData.push(getItem(i));
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

    this.testInsertAtEndAnimations = function (complete) {
        var bindingList = getBindingList(1);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.ListLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        waitForReady(listView)().
            then(function () {
                if (!WinJS.Utilities.isPhone) {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "List Animations: Before edits: Correct number of transitions");
                    transitionEnd = [];
                }
                bindingList.splice(1, 0, getItem());
                return waitForReady(listView, -1)();
            }).
            then(function () {
                // Before: 0
                // After: 0,1
                // Item 1 faded in.
                LiveUnit.Assert.areEqual(1, transitionEnd.length, "List Animations: After Insert: Correct number of transitions");
            }).
            done(complete);
    };

    this.testListAnimations = function (complete) {
        var bindingList = getBindingList(100);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.ListLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        waitForReady(listView)().
            then(function () {
                if (!WinJS.Utilities.isPhone) {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "List Animations: Before edits: Correct number of transitions");
                    transitionEnd = [];
                }
                bindingList.splice(1, 0, getItem());
                return waitForReady(listView, -1)();
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
                return waitForReady(listView, -1)();
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
                return waitForReady(listView, -1)();
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
    };

    this.testInsertThenResize = function (complete) {
        var bindingList = getBindingList(100);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.ListLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        waitForReady(listView)().
            then(function () {
                // Insert an item:
                bindingList.splice(1, 0, getItem());
                return waitForReady(listView, -1)();
            }).
            then(function () {
                // Resize:
                listViewEl.style.height = "600px";
                listView._onMSElementResize();

                return waitForReady(listView, -1)();
            }).
            done(function () {
                LiveUnit.Assert.areEqual("1", getComputedStyle(listView.elementFromIndex(1).parentNode.parentNode).opacity, "Should not be opacity 0");

                complete();
            });
    };

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
                WinJS.UI.executeTransition = customExecuteTransition;
            });
        }
    }

    this.testExpandItemsContainerForReflowNeeded = function (complete) {
        var bindingList = getBindingList(100);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.GridLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        var itemsContainer;
        listView.ensureVisible(90);
        waitForReady(listView)().
            then(function () {
                bindingList.splice(80, 10);
                return waitForDirectMovePhase(12)();
            }).
            then(function () {
                itemsContainer = listView.element.querySelector(".win-itemscontainer");
                LiveUnit.Assert.areEqual("200px", itemsContainer.style.paddingRight);
                LiveUnit.Assert.areEqual("-200px", itemsContainer.style.marginRight);
                return waitForReady(listView)();
            }).
            done(function () {
                LiveUnit.Assert.areEqual("", itemsContainer.style.paddingRight);
                LiveUnit.Assert.areEqual("", itemsContainer.style.marginRight);
                complete();
            });
    };

    this.testExpandItemsContainerForReflowNotNeeded = function (complete) {
        var bindingList = getBindingList(100);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.GridLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        var itemsContainer;
        waitForReady(listView)().
            then(function () {
                bindingList.splice(0, 1);
                return waitForDirectMovePhase(7)();
            }).
            then(function () {
                itemsContainer = listView.element.querySelector(".win-itemscontainer");
                LiveUnit.Assert.areEqual("", itemsContainer.style.paddingRight);
                LiveUnit.Assert.areEqual("", itemsContainer.style.marginRight);
                return waitForReady(listView)();
            }).
            done(function () {
                LiveUnit.Assert.areEqual("", itemsContainer.style.paddingRight);
                LiveUnit.Assert.areEqual("", itemsContainer.style.marginRight);
                complete();
            });
    };

    this.testGridAnimations = function (complete) {
        var bindingList = getBindingList(100);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.GridLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        waitForReady(listView)().
            then(function () {
                if (!WinJS.Utilities.isPhone) {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "Grid Animations: Before edits: Correct number of transitions");
                    transitionEnd = [];
                }
                bindingList.splice(6, 0, getItem());
                return waitForReady(listView, -1)();
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
                return waitForReady(listView, -1)();
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
                return waitForReady(listView, -1)();
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
    };

    this.testGridMultiSizeAnimations = function (complete) {
        var bindingList = getBindingList(100);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.CellSpanningLayout();
        listView.layout.groupInfo = function () {
            return {
                enableCellSpanning: true,
                cellWidth: 100,
                cellHeight: 100
            };
        };
        listView.layout.itemInfo = function () {
            return {
                width: 100,
                height: 100
            };
        };
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        waitForReady(listView)().
            then(function () {
                if (!WinJS.Utilities.isPhone) {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "Grid Animations: Before edits: Correct number of transitions");
                    transitionEnd = [];
                }
                bindingList.splice(6, 0, getItem());
                return waitForReady(listView, -1)();
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
                return waitForReady(listView, -1)();
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
                return waitForReady(listView, -1)();
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
    };

    //WPBlue: 317490 - This test is not stable on the phone due to dropped animations, so limiting to desktop.
    if (!WinJS.Utilities.isPhone) {
        this.testGridGroupAnimations = function (complete) {
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

            waitForReady(listView)().
                then(function () {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "Grid Grouped Animations: Before edits: Correct number of transitions");
                    transitionEnd = [];
                    bindingList.splice(6, 0, getItem());
                    return waitForReady(listView, -1)();
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
                    return waitForReady(listView, -1)();
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
                    return waitForReady(listView, -1)();
                }).
                then(function () {
                    // Added a group at the beginning
                    // Item came - 1 transition
                    // Header came in - 1 transitions
                    // Group 0 moved over - 2 transitions
                    LiveUnit.Assert.areEqual(4, transitionEnd.length, "Grid Grouped Animations: After new Group");
                    transitionEnd = [];

                    bindingList.splice(0, 1);
                    return waitForReady(listView, -1)();
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
                    return waitForReady(listView, -1)();
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
                    return waitForReady(listView, -1)();
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
                    return waitForReady(listView, -1)();
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
        };
    }

    this.testOverlappingInsertsAnimations = function (complete) {
        var bindingList = getBindingList(3);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.ListLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        var timeout;
        waitForReady(listView)().
            then(function () {
                if (!WinJS.Utilities.isPhone) {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "List Overlapping edits:");
                    transitionEnd = [];
                }
                bindingList.splice(0, 0, getItem());
                timeout = setTimeout(function () {
                    bindingList.splice(0, 0, getItem());
                    timeout = setTimeout(function () {
                        bindingList.splice(0, 0, getItem());
                    }, 40);
                }, 40);

                return waitForReady(listView, -1)();
            }).
            done(function () {
                // First 0-2 items move and 3 item fades in. (4 transitions)
                // Then 3,0-2 items move and 4,5 items fade in. (6 transitions)
                LiveUnit.Assert.areEqual(10, transitionEnd.length, "List Overlapping aftermath");
                clearTimeout(timeout);
                complete();
            });
    };

    this.testOverlappingRemovalsAnimations = function (complete) {
        var bindingList = getBindingList(6);
        var listView = new WinJS.UI.ListView(listViewEl);
        listView.layout = new WinJS.UI.ListLayout();
        listView.itemTemplate = itemTemplate;
        listView.itemDataSource = bindingList.dataSource;

        var timeout;
        waitForReady(listView)().
            then(function () {
                if (!WinJS.Utilities.isPhone) {
                    // 2 is for entrance animation.
                    LiveUnit.Assert.areEqual(2, transitionEnd.length, "List Overlapping edits:");
                    transitionEnd = [];
                }
                bindingList.splice(0, 1);
                timeout = setTimeout(function () {
                    bindingList.splice(0, 1);
                    timeout = setTimeout(function () {
                        bindingList.splice(0, 1);
                    }, 40);
                }, 40);

                return waitForReady(listView, -1)();
            }).
            done(function () {
                // First 1-5 move and 0 fades out (6 transitions)
                // Then 1 and 2 fade out when 3-5 move.(5 transitions)
                LiveUnit.Assert.areEqual(11, transitionEnd.length, "List Overlapping aftermath");
                clearTimeout(timeout);
                complete();
            });
    };

    // Verifies that the delete animation starts by setting the deleted item's
    // size and location correctly.
    function verifyDeleteAnimation(listView, bindingList, index) {
        var rectBeforeDelete;
        var itemboxToDelete;
        var didVerification = false;

        return new WinJS.Promise(function (complete, error) {
            function finishVerification() {
                LiveUnit.Assert.isTrue(didVerification);
                complete();
            }

            waitForReady(listView)().
                then(function () {
                    listView.ensureVisible(index);
                    return waitForReady(listView)();
                }).
                done(function () {
                    itemboxToDelete = ancestorWithClass(listView.elementFromIndex(index), WinJS.UI._itemBoxClass);
                    rectBeforeDelete = containerFrom(itemboxToDelete).getBoundingClientRect();

                    var realExecuteAnimations = listView.layout.executeAnimations;
                    listView.layout.executeAnimations = function () {
                        try {
                            listView.layout.executeAnimations = realExecuteAnimations;
                            // getComputedStyle needs to be called to ensure that the item is laid out before we try measuring it.
                            getComputedStyle(containerFrom(itemboxToDelete));
                            var rectDuringDelete = containerFrom(itemboxToDelete).getBoundingClientRect();
                            assertRectsAreEqual(rectBeforeDelete, rectDuringDelete,
                                "Animation improperly set initial size/location of deleted item");
                            didVerification = true;
                        } finally {
                            waitForReady(listView)().done(finishVerification);
                            return realExecuteAnimations.apply(this, arguments);
                        }
                    };

                    bindingList.splice(index, 1);
                });
        });
    }

    // Verifies that the delete animation positions and sizes the deleted element correctly. Does this in a ListView
    // which has a variety of margins on a few different types of elements (win-container, win-surface, etc.).
    this.generateTestPositioningOfDeletedItem = function (rtl, indicesToDelete, useGroups, layoutName, layout) {
        var testName = "testPositioningOfDeletedItem" + (rtl ? "_RTL" : "_LTR") + "_" + layoutName;

        this[testName] = function (complete) {
            function groupKey(itemData) {
                return itemData.group;
            }
            function groupData(itemData) {
                return {
                    title: "Group " + itemData.group
                };
            };

            if (rtl) {
                listViewEl.dir = "rtl";
            }
            WinJS.Utilities.addClass(listViewEl, "margins");
            var listView = new WinJS.UI.ListView(listViewEl);
            var bindingList = getBindingList(100);

            if (useGroups) {
                bindingList = bindingList.createGrouped(groupKey, groupData);
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
            promise = promise.done(complete);
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
                this.generateTestPositioningOfDeletedItem(rtl, [12], false, "ListLayout" + "_" + orientation + "_", new WinJS.UI.ListLayout({ orientation: orientation }));
                this.generateTestPositioningOfDeletedItem(rtl, [12], false, "GridLayout" + "_" + orientation + "_", new WinJS.UI.GridLayout({ orientation: orientation }));
                this.generateTestPositioningOfDeletedItem(rtl, [12, 25], true, "GridLayout_HeaderPositionTop" + "_" + orientation + "_", new WinJS.UI.GridLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.top
                }));
                this.generateTestPositioningOfDeletedItem(rtl, [12, 25], true, "GridLayout_HeaderPositionLeft" + "_" + orientation + "_", new WinJS.UI.GridLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.left
                }));
                this.generateTestPositioningOfDeletedItem(rtl, [12, 25], true, "GroupedListLayout_HeaderPositionTop" + "_" + orientation + "_", new WinJS.UI.ListLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.top
                }));
                this.generateTestPositioningOfDeletedItem(rtl, [12, 25], true, "GroupedListLayout_HeaderPositionLeft" + "_" + orientation + "_", new WinJS.UI.ListLayout({
                    orientation: orientation,
                    groupHeaderPosition: WinJS.UI.HeaderPosition.left
                }));
            }.bind(this));
            this.generateTestPositioningOfDeletedItem(rtl, [12, 25], true, "CellSpanningLayout_HeaderPositionLeft", new WinJS.UI.CellSpanningLayout({
                groupInfo: groupInfo,
                itemInfo: itemInfo,
                groupHeaderPosition: WinJS.UI.HeaderPosition.top
            }));
            this.generateTestPositioningOfDeletedItem(rtl, [12, 25], true, "CellSpanningLayout_HeaderPositionLeft", new WinJS.UI.CellSpanningLayout({
                groupInfo: groupInfo,
                itemInfo: itemInfo,
                groupHeaderPosition: WinJS.UI.HeaderPosition.left
            }));
        }.bind(this));
    }.bind(this))();

    // Verifies that after ListLayout's width changes, the animations of deleted items
    // start at the correct size and in the correct location.
    this.testPositioningOfDeletedItemAfterResize = function (complete) {
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

        waitForReady(listView)().
            then(function () {
                listViewEl.style.width = "600px";
                return waitForReady(listView, 100)();
            }).
            then(function () {
                return verifyDeleteAnimation(listView, bindingList, 2);
            }).
            done(complete);
    };

    this.testDeleteBeforeFullRealize = function (complete) {

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
        for (var i = 0; i < 36 ; i++) {
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
        document.body.appendChild(element);

        var listView = new WinJS.UI.ListView(element, {
            itemDataSource: myGroupedList.dataSource,
            groupDataSource: myGroupedList.groups.dataSource,
            itemTemplate: renderer,
            groupHeaderTemplate: renderer
        });

        waitForReady(listView)().
            done(function () {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
                complete();
            });
    };
};

LiveUnit.registerTestClass("WinJSTests.ListViewAnimation2Test");
