// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var COUNT = 100,
        ITEMS_PER_GROUP = 10;

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;


    var testRootEl;
    var origMaxTimePerCreateContainers;
    var origChunkSize;

    function setupListview(element, layoutName, useGroups = false) {
        var charCodeA = "A".charCodeAt(0),
            myData = [];

        for (var i = 0; i < COUNT; ++i) {
            myData.push({ title: String.fromCharCode(charCodeA + Math.floor(i / ITEMS_PER_GROUP)) + " Tile" + i });
        }

        var options: any = {
            layout: new WinJS.UI[layoutName](),
            itemDataSource: Helper.ItemsManager.simpleSynchronousArrayDataSource(myData),
            itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
            selectionMode: "none"
        };

        if (useGroups) {
            options.itemDataSource = WinJS.UI.computeDataSourceGroups(options.itemDataSource,
                function (item) {
                    return item.data.title.charAt(0);
                },
                function (item) {
                    return { title: item.data.title.charAt(0) };
                }
                );
            options.groupDataSource = options.itemDataSource.groups;
            options.groupHeaderTemplate = Helper.ListView.createRenderer("smallGroupHeaderTemplate");
        }

        return new ListView(element, options);
    }

    function waitForAria(listView) {
        return new WinJS.Promise(function (c, e, p) {
            function waitForAccessibilityComplete_handler() {
                listView.removeEventListener("accessibilityannotationcomplete", waitForAccessibilityComplete_handler, false);
                c();
            }
            listView.addEventListener("accessibilityannotationcomplete", waitForAccessibilityComplete_handler, false);
        });
    }

    function getItem(listview, index) {
        return listview.elementFromIndex(index);
    }

    function getHeader(listview, groupIndex) {
        // Test to see if we are in old layouts or new layouts
        return listview._groups.group(groupIndex).elements ? listview._groups.group(groupIndex).elements.header : listview._groups.group(groupIndex).header;
    }

    function getAttribute(listview, index, attribute) {
        return listview.elementFromIndex(index).getAttribute(attribute);
    }

    function checkFlow(from, to) {
        LiveUnit.Assert.areEqual(to.id, from.getAttribute("aria-flowto"), "Incorrect id for aria-flowto attribute");
        LiveUnit.Assert.areEqual(from.id, to.getAttribute("x-ms-aria-flowfrom"), "Incorrect id for x-ms-aria-flowfrom attribute");
    }

    function checkTile(listview, index, role) {
        var tile = listview.elementFromIndex(index);
        LiveUnit.Assert.areEqual(tile.getAttribute("role"), role);
        LiveUnit.Assert.areEqual(parseInt(tile.getAttribute("aria-setsize"), 10), COUNT);
        LiveUnit.Assert.areEqual(parseInt(tile.getAttribute("aria-posinset"), 10), index + 1);
    }

    function checkGroupFlow(listView, groupIndex, groupStart, realizedGroupLast) {
        var realizedStart = listView._view.begin,
            realizedLast = listView._view.end - 1,
            firstVisibleGroupIndex = listView._groups.groupFromItem(listView.indexOfFirstVisible),
            // First realized item in the group
            realizedGroupStart = Math.max(groupStart, realizedStart),
            firstItem = getItem(listView, realizedGroupStart),
            firstVisibleItem = getItem(listView, listView.indexOfFirstVisible),
            lastVisibleItem = getItem(listView, listView.indexOfLastVisible),
            header = getHeader(listView, groupIndex),
            i;

        // Check flow for the start marker, the header, and the first item
        checkFlow(header, firstItem);
        if (groupStart <= realizedStart) {
            // This is the first realized group
            LiveUnit.Assert.areEqual(listView._ariaStartMarker.id, header.getAttribute("x-ms-aria-flowfrom"), "The group's header should flow from the start marker");
        }

        if (groupIndex === firstVisibleGroupIndex) {
            // This is the first visible group
            if (groupStart === listView.indexOfFirstVisible) {
                // Its first item is visible so flow to its header
                LiveUnit.Assert.areEqual(header.id, listView._ariaStartMarker.getAttribute("aria-flowto"), "The start marker should flow to the group's header");
            } else {
                // Its first item is not visible so flow to its first visible item
                LiveUnit.Assert.areEqual(firstVisibleItem.id, listView._ariaStartMarker.getAttribute("aria-flowto"), "The start marker should flow to the group's first item");
            }
        }

        // Check flow between the items (exclude the last item -- it'll be checked below)
        for (i = realizedGroupStart; i <= realizedGroupLast - 1; i++) {
            checkFlow(getItem(listView, i), getItem(listView, i + 1));
        }

        // Check flow for the last item and the end marker
        if (listView.indexOfLastVisible >= realizedGroupStart && listView.indexOfLastVisible <= realizedGroupLast) {
            // This group contains the last visible item
            LiveUnit.Assert.areEqual(lastVisibleItem.id, listView._ariaEndMarker.getAttribute("x-ms-aria-flowfrom"), "The end marker should flow from the last visible item");
        }

        if (realizedGroupLast < realizedLast) {
            // This isn't the last group
            checkFlow(getItem(listView, realizedGroupLast), getHeader(listView, groupIndex + 1));
        } else {
            // This is the last group
            LiveUnit.Assert.areEqual(listView._ariaEndMarker.id, getItem(listView, realizedGroupLast).getAttribute("aria-flowto"), "The last realized item should flow to the end marker");
        }
    }

    function checkListViewFlow(listView) {
        var groups = listView._groups,
            groupIndex = groups.groupFromItem(listView._view.begin),
            realizedLast = listView._view.end - 1,
            lastGroupIndex = groups.groupFromItem(realizedLast),
            realizedGroupLast;

        for (; groupIndex <= lastGroupIndex; groupIndex++) {
            if (groupIndex < lastGroupIndex) {
                realizedGroupLast = groups.group(groupIndex + 1).startIndex - 1;
            } else {
                realizedGroupLast = realizedLast;
            }
            checkGroupFlow(listView, groupIndex, groups.group(groupIndex).startIndex, realizedGroupLast);
        }
    }

    function checkAttributesNoGroups(listView, firstRealized, lastRealized, listRole, itemRole) {
        LiveUnit.Assert.areEqual(listView.element.getAttribute("role"), listRole);

        // Start marker should flow to the first visible item
        LiveUnit.Assert.areEqual(getItem(listView, 0).id, listView._ariaStartMarker.getAttribute("aria-flowto"), "The start marker should flow to the first visible item");
        // Start marker should flow from the first realized item
        LiveUnit.Assert.areEqual(listView._ariaStartMarker.id, getItem(listView, firstRealized).getAttribute("x-ms-aria-flowfrom"), "The first realized item should flow from the start marker");

        checkTile(listView, 0, itemRole);
        checkTile(listView, 1, itemRole);
        checkTile(listView, 2, itemRole);

        // Items should flow to/from adjacent items
        checkFlow(getItem(listView, 0), getItem(listView, 1));
        checkFlow(getItem(listView, 1), getItem(listView, 2));
        checkFlow(getItem(listView, 2), getItem(listView, 3));

        // Last realized item should flow to the end marker
        LiveUnit.Assert.areEqual(listView._ariaEndMarker.id, getItem(listView, lastRealized).getAttribute("aria-flowto"), "The last realized item should flow to the end marker");
        // Last visible item should flow from the end marker
        LiveUnit.Assert.areEqual(getItem(listView, listView.indexOfLastVisible).id, listView._ariaEndMarker.getAttribute("x-ms-aria-flowfrom"), "The last visible item should flow from the end marker");
    }

    export class AriaTests {

        // This is the setup function that will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            origMaxTimePerCreateContainers = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
            origChunkSize = WinJS.UI._VirtualizeContentsView._chunkSize;

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "AriaTests";
            newNode.innerHTML =
            "<div id='ariaTestList' style='width:350px; height:400px'></div>" +
            "<div id='smallAriaTestList' style='width:250px; height:100px'></div>" +
            "<div id='simpleTemplate' style='display: none; width:50px; height:50px'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='smallGroupHeaderTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = origMaxTimePerCreateContainers;
            WinJS.UI._VirtualizeContentsView._chunkSize = origChunkSize;

            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }


        // Verifies that aria-selected attribute change notifications are properly ignored
        // after the ListView has been disposed.
        // Regression test for WinBlue#395099
        testItemPropertyChangeAfterDispose = function (complete) {
            Helper.initUnhandledErrors();
            var element = document.getElementById("ariaTestList");
            var listView = setupListview(element, "ListLayout");

            Helper.ListView.waitForReady(listView)().then(function () {
                listView.selection.add(0);
                listView.dispose();
                return WinJS.Utilities.Scheduler.schedulePromiseIdle();
            }).done(function () {
                    Helper.validateUnhandledErrors();
                    complete();
                });
        };

        // Verifies that when there isn't enough time to create all of the containers synchronously,
        // the ARIA attributes still get set.
        // Regression test for WinBlue#197944
        testAriaWithAsyncContainerCreation = function (complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;
            WinJS.UI._VirtualizeContentsView._chunkSize = 1;

            var element = document.getElementById("ariaTestList");
            var listView = setupListview(element, "ListLayout");
            LiveUnit.Assert.isTrue(listView.selectionMode.toString() === "none");

            waitForAria(listView).then(function () {
                var lastRealized = listView._view.end - 1;
                checkAttributesNoGroups(listView, 0, lastRealized, "listbox", "option");
                complete();
            });
        };

        // Verifies that the ARIA worker doesn't throw an exception when the ListView is hidden.
        // Regression test for WinBlue#238241.
        testAriaWhenListViewIsHidden = function (complete) {
            var myData = [];

            for (var i = 0; i < COUNT; ++i) {
                myData.push({ title: " Tile" + i });
            }

            var cancelingLayout = {
                initialize: function () { /* Required method of ILayout2 */ },
                layout: function () {
                    // Simulates what a layout does when the ListView is hidden
                    return WinJS.Promise.cancel;
                }
            };

            var element = document.getElementById("ariaTestList");
            var listView = new ListView(element, {
                layout: cancelingLayout,
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
                selectionMode: "none"
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                // If the ARIA work completes without throwing an exception
                // then complete the test successfully.
                listView._view.deferTimeout.then(function () {
                    complete();
                });
            });
        };

        testUpdateAriaMarkersWhenRealizedRangeHasHoles = function (complete) {
            var myData = [];
            var startMarker;
            var endMarker;
            var indexOfFirstVisible;
            var indexOfLastVisible;

            function resolveToElement(indexOrElement) {
                return +indexOrElement === indexOrElement ?
                    listView.elementFromIndex(indexOrElement) :
                    indexOrElement;
            }

            function verifyMarkers(description, options) {
                var defaultOptions = {
                    indexOfFirstVisible: indexOfFirstVisible,
                    indexOfLastVisible: indexOfLastVisible,
                    nullIndices: []
                };
                options = WinJS.Utilities._merge(defaultOptions, options);
                // Required options
                var startMarkerFlowsTo = resolveToElement(options.startMarkerFlowsTo);
                var endMarkerFlowsFrom = resolveToElement(options.endMarkerFlowsFrom);
                // Optional options
                var firstVisible = options.indexOfFirstVisible;
                var lastVisible = options.indexOfLastVisible;
                var nullIndices = options.nullIndices;

                var items = listView._view.items;

                function withItemAtOverridden(callback) {
                    var origItemAt = items.itemAt;
                    items.itemAt = function (index) {
                        if (nullIndices.indexOf(index) !== -1) {
                            return null;
                        } else {
                            return origItemAt.apply(items, arguments);
                        }
                    };
                    callback();
                    items.itemAt = origItemAt;
                }

                // Reset state for this test
                startMarker.removeAttribute("aria-flowto");
                endMarker.removeAttribute("x-ms-aria-flowfrom");

                // Ask view to update state of markers
                withItemAtOverridden(function () {
                    listView._view._updateAriaMarkers(false, firstVisible, lastVisible);
                });

                // Verify flow-to/from on markers
                LiveUnit.Assert.areEqual(startMarkerFlowsTo.id, startMarker.getAttribute("aria-flowto"),
                    description + ": start marker has incorrect aria-flowto");
                LiveUnit.Assert.areEqual(endMarkerFlowsFrom.id, endMarker.getAttribute("x-ms-aria-flowfrom"),
                    description + ": end marker has incorrect x-ms-aria-flowfrom");
            }

            for (var i = 0; i < COUNT; ++i) {
                myData.push({ title: " Tile" + i });
            }

            var element = document.getElementById("ariaTestList");
            var listView = new ListView(element, {
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
                selectionMode: "none"
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                startMarker = listView._ariaStartMarker;
                endMarker = listView._ariaEndMarker;
                indexOfFirstVisible = listView.indexOfFirstVisible;
                indexOfLastVisible = listView.indexOfLastVisible;

                verifyMarkers("Verifying with no holes in realized range", {
                    startMarkerFlowsTo: indexOfFirstVisible,
                    endMarkerFlowsFrom: indexOfLastVisible
                });

                verifyMarkers("Verifying with hole at first visible index", {
                    nullIndices: [indexOfFirstVisible],
                    startMarkerFlowsTo: endMarker,
                    endMarkerFlowsFrom: startMarker
                });

                verifyMarkers("Verifying with hole at last visible index", {
                    nullIndices: [indexOfLastVisible],
                    startMarkerFlowsTo: indexOfFirstVisible,
                    endMarkerFlowsFrom: indexOfLastVisible - 1
                });

                verifyMarkers("Verifying with holes at first and last visible indices", {
                    nullIndices: [indexOfFirstVisible, indexOfLastVisible],
                    startMarkerFlowsTo: endMarker,
                    endMarkerFlowsFrom: startMarker
                });

                verifyMarkers("Verifying with holes at back of realized range", {
                    nullIndices: [indexOfLastVisible, indexOfLastVisible - 1, indexOfLastVisible - 2, indexOfLastVisible - 3],
                    startMarkerFlowsTo: indexOfFirstVisible,
                    endMarkerFlowsFrom: indexOfLastVisible - 4
                });

                verifyMarkers("Verifying with indexOfFirstVisible > indexOfLastVisible", {
                    indexOfFirstVisible: 1,
                    indexOfLastVisible: 0,
                    startMarkerFlowsTo: endMarker,
                    endMarkerFlowsFrom: startMarker
                });

                verifyMarkers("Verifying with indexOfFirstVisible = indexOfLastVisible = -1", {
                    indexOfFirstVisible: -1,
                    indexOfLastVisible: -1,
                    startMarkerFlowsTo: endMarker,
                    endMarkerFlowsFrom: startMarker
                });

                complete();
            });
        };

        testAriaRoleInInvocableGroupHeaders = function (complete) {
            var element = document.getElementById("ariaTestList");
            var listView = setupListview(element, "GridLayout", true)

        waitForAria(listView).then(function () {
                // Headers A - G should be realized
                var headers: any = listView.element.querySelectorAll(".win-groupheader");

                LiveUnit.Assert.areEqual("A", headers[0].textContent.trim());
                LiveUnit.Assert.areEqual("link", headers[0].getAttribute("role"));

                LiveUnit.Assert.areEqual("G", headers[6].textContent.trim());
                LiveUnit.Assert.areEqual("link", headers[6].getAttribute("role"));

                listView.scrollPosition = 10000;

                return waitForAria(listView);
            }).done(function () {
                    // Header J (the last header) should be realized
                    var headers: any = listView.element.querySelectorAll(".win-groupheader");

                    // Since annotationcomplete event may get fired before previous
                    // headers were unrealized, we do not know for sure which index
                    // header J is in.
                    for (var i = 0, len = headers.length; i < len; i++) {
                        if (headers[i].textContent.trim() === "J") {
                            LiveUnit.Assert.areEqual("link", headers[i].getAttribute("role"));
                            complete();
                            return;
                        }
                    }
                    LiveUnit.Assert.fail("Couldn't find J header");
                });
        };

        testAriaRoleInNonInvocableGroupHeaders = function (complete) {
            var element = document.getElementById("ariaTestList");
            var listView = setupListview(element, "GridLayout", true)
        listView.groupHeaderTapBehavior = WinJS.UI.GroupHeaderTapBehavior.none;

            waitForAria(listView).then(function () {
                // Headers A - G should be realized
                var headers: any = listView.element.querySelectorAll(".win-groupheader");

                LiveUnit.Assert.areEqual("A", headers[0].textContent.trim());
                LiveUnit.Assert.areEqual("separator", headers[0].getAttribute("role"));

                LiveUnit.Assert.areEqual("G", headers[6].textContent.trim());
                LiveUnit.Assert.areEqual("separator", headers[6].getAttribute("role"));

                listView.scrollPosition = 10000;

                return waitForAria(listView);
            }).done(function () {
                    // Header J (the last header) should be realized
                    var headers: any = listView.element.querySelectorAll(".win-groupheader");

                    // Since annotationcomplete event may get fired before previous
                    // headers were unrealized, we do not know for sure which index
                    // header J is in.
                    for (var i = 0, len = headers.length; i < len; i++) {
                        if (headers[i].textContent.trim() === "J") {
                            LiveUnit.Assert.areEqual("separator", headers[i].getAttribute("role"));
                            complete();
                            return;
                        }
                    }
                    LiveUnit.Assert.fail("Couldn't find J header");
                });
        };
    }

    function generate(testName, testFn) {
        ["GridLayout"].forEach(function (layoutName) {
            AriaTests.prototype[testName + "_" + layoutName] = function (complete) {
                testFn(complete, layoutName);
            }
        });
    }

    generate("testBrowse", function (complete, layoutName) {
        var element = document.getElementById("ariaTestList");
        var listView = setupListview(element, layoutName);
        LiveUnit.Assert.isTrue(listView.selectionMode.toString() === "none");

        waitForAria(listView).then(function () {
            var lastRealized = listView._view.end - 1;
            checkAttributesNoGroups(listView, 0, lastRealized, "listbox", "option");
            complete();
        });
    });

    function generateGroupAttributes(layoutName) {
        AriaTests.prototype["testGroupAttributes" + layoutName] = function (complete) {
            var element = document.getElementById("smallAriaTestList");
            var listView = setupListview(element, layoutName, true);

            waitForAria(listView).then(function () {
                LiveUnit.LoggingCore.logComment("Testing with first visible group's first item visible");
                LiveUnit.Assert.isTrue(listView.indexOfFirstVisible % ITEMS_PER_GROUP === 0, "The first visible group's first item should be visible");
                checkListViewFlow(listView);
                listView.indexOfFirstVisible = 53;

                return waitForAria(listView);
            }).then(function () {
                    LiveUnit.LoggingCore.logComment("Testing with first visible group's first item not visible");
                    LiveUnit.Assert.isTrue(listView.indexOfFirstVisible % ITEMS_PER_GROUP !== 0, "The first visible group's first item should not be visible");
                    checkListViewFlow(listView);
                    complete();
                });
        };
    };
    generateGroupAttributes("GridLayout");

    // Verify that in an empty ListView, the start marker flows to the end marker
    generate("testEmptyListView", function (complete, layoutName) {
        var element = document.getElementById("ariaTestList");
        var listView = new ListView(element, {
            layout: new WinJS.UI[layoutName](),
            itemDataSource: new WinJS.Binding.List([]).dataSource,
            itemTemplate: Helper.ListView.createRenderer("simpleTemplate")
        });

        waitForAria(listView).then(function () {
            var startMarker = listView._ariaStartMarker,
                endMarker = listView._ariaEndMarker;
            LiveUnit.Assert.areEqual(endMarker.id, startMarker.getAttribute("aria-flowto"), "The start marker should flowto the end marker");
            LiveUnit.Assert.areEqual(startMarker.id, endMarker.getAttribute("x-ms-aria-flowfrom"), "The end marker should flowfrom the start marker");
            complete();
        });
    });

    generate("testaccessibilityEventForEmptyList", function (complete, layoutName) {
        var element = document.getElementById("ariaTestList");
        var listView = new WinJS.UI.ListView(element, {
            itemDataSource: new WinJS.Binding.List([]).dataSource,
            itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
            layout: new WinJS.UI[layoutName]()
        });
        listView.addEventListener("accessibilityannotationcomplete", function (ev) {
            LiveUnit.Assert.areEqual(-1, ev.detail.firstIndex);
            LiveUnit.Assert.areEqual(-1, ev.detail.lastIndex);
            complete();
        });
    });

    generate("testaccessibilityEventForListWithItems", function (complete, layoutName) {
        var element = document.getElementById("ariaTestList");
        var listView = setupListview(element, layoutName);
        listView.addEventListener("accessibilityannotationcomplete", function (ev) {
            LiveUnit.Assert.areEqual(0, ev.detail.firstIndex);
            LiveUnit.Assert.areEqual(99, ev.detail.lastIndex);
            complete();
        });
    });

    function generateUIASelect(layoutName) {
        AriaTests.prototype["testUIASelect" + layoutName] = function (complete) {

            function blockSelection(eventObject) {
                eventObject.preventDefault();
            }

            function test() {
                var prevSelection;
                function verifySelection(expectedSelection) {
                    prevSelection = expectedSelection;

                    LiveUnit.Assert.areEqual(expectedSelection.length, listView.selection.count(),
                        "ListView's selection manager has the wrong number of items selected");
                    Helper.ListView.elementsEqual(expectedSelection, listView.selection.getIndices());
                    for (var i = 0; i < 2; i++) {
                        var item = listView.elementFromIndex(i);
                        var expectedSelected = (expectedSelection.indexOf(i) !== -1);
                        LiveUnit.Assert.areEqual(expectedSelected, WinJS.Utilities.hasClass(<HTMLElement>item.parentNode, WinJS.UI._selectedClass),
                            "Item " + i + ": win-item's selected class is in the wrong state");
                        LiveUnit.Assert.areEqual(expectedSelected, item.getAttribute("aria-selected") === "true",
                            "Item " + i + ": aria-selected is incorrect");
                        LiveUnit.Assert.areEqual(expectedSelected, listView.selection._isIncluded(i),
                            "Item " + i + ": ListView's selection manager is incorrect");
                    }

                }
                function verifySelectionDidntChange() {
                    verifySelection(prevSelection);
                }

                var element = document.getElementById("ariaTestList");
                var listView = setupListview(element, layoutName);
                listView.selectionMode = WinJS.UI.SelectionMode.single;

                var selectionChanges = 0;
                listView.addEventListener("selectionchanged", function (eventObject) {
                    selectionChanges++;
                }, false);

                var firstTile, secondTile;
                return Helper.ListView.waitForReady(listView)().
                    then(function () {
                        verifySelection([]);

                        firstTile = listView.elementFromIndex(0);
                        secondTile = listView.elementFromIndex(1);
                        firstTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0]);

                        firstTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([]);

                        firstTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0]);

                        secondTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([1]);

                        // Simulate UIA SelectionItem.Select
                        firstTile.setAttribute("aria-selected", "true");
                        secondTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0]);

                        // Simulate UIA SelectionItem.Select with blocked selection
                        listView.addEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "false");
                        secondTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelectionDidntChange();

                        // Simulate UIA SelectionItem.Select
                        listView.removeEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "false");
                        secondTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).

                    then(function () {
                        verifySelection([1]);

                        // Simulate UIA SelectionItem.Select with blocked selection
                        listView.addEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "true");
                        secondTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelectionDidntChange();

                        listView.removeEventListener("selectionchanging", blockSelection, false);
                        secondTile.removeAttribute("aria-selected");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([]);

                        listView.selectionMode = WinJS.UI.SelectionMode.multi;

                        firstTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0]);

                        secondTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0, 1]);

                        secondTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0]);

                        listView.addEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "false");
                        secondTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelectionDidntChange();

                        // Simulate UIA SelectionItem.Select
                        listView.removeEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "false");
                        secondTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([1]);

                        // Simulate UIA SelectionItem.Select with blocked selection
                        listView.addEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "true");
                        secondTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelectionDidntChange();

                        // Simulate UIA SelectionItem.Select
                        listView.removeEventListener("selectionchanging", blockSelection, false);
                        firstTile.setAttribute("aria-selected", "true");
                        secondTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([0]);

                        firstTile.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelection([]);
                        LiveUnit.Assert.areEqual(13, selectionChanges);

                        listView.selectionMode = WinJS.UI.SelectionMode.none;

                        firstTile.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        verifySelectionDidntChange();

                        LiveUnit.Assert.areEqual(13, selectionChanges);
                    });
            }

            test().done(complete);
        };
    };

    if (!WinJS.Utilities.isPhone) {
        generateUIASelect("GridLayout");

        // Verify that the list and item roles are updated appropriately when switching from
        // a non-static mode to a static mode and vice versa.
        generate("testChangingRoles", function (complete, layoutName) {
            function checkRoles(listRole, itemRole, context) {
                LiveUnit.Assert.areEqual(listRole, element.getAttribute("role"), "Incorrect list role " + context);
                LiveUnit.Assert.areEqual(itemRole, getAttribute(listView, 0, "role"), "Incorrect item role " + context);
                LiveUnit.Assert.areEqual(itemRole, getAttribute(listView, 1, "role"), "Incorrect item role " + context);
                LiveUnit.Assert.areEqual(itemRole, getAttribute(listView, 2, "role"), "Incorrect item role " + context);
            }

            var element = document.getElementById("ariaTestList"),
                listView = setupListview(element, layoutName);

            var tests = [
                function () {
                    setTimeout(function () {
                        // Validate the roles in the initial mode (non-static)
                        LiveUnit.Assert.areEqual("none", listView.selectionMode);
                        LiveUnit.Assert.areEqual("invokeOnly", listView.tapBehavior);
                        LiveUnit.Assert.areEqual("select", listView.swipeBehavior);
                        checkRoles("listbox", "option", "in the initial non-static mode");

                        // Switch to static mode and validate the roles
                        listView.tapBehavior = WinJS.UI.TapBehavior.none;
                        listView.swipeBehavior = WinJS.UI.SwipeBehavior.none;
                        checkRoles("list", "listitem", "after switching to static mode");

                        // Switch to a non-static mode and validate the roles
                        listView.selectionMode = WinJS.UI.SelectionMode.single;
                        checkRoles("listbox", "option", "after switching to a non-static mode");

                        complete();
                    }, 1000);
                }
            ];
            Helper.ListView.runTests(listView, tests);
        });
    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.AriaTests");
