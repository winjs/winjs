// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListViewHelpers.ts" />
/// <reference path="../TestLib/TestDataSource.ts"/>
/// <reference path="../TestLib/util.ts" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.PhotosAppScenarios = function () {
    "use strict";
    var that = this;

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "PhotosAppScenarios";
        newNode.innerHTML =
            "<div id='listViewSelection' style='width:500px; height:500px'></div>" +
            "<div id='SemanticZoomMapping' style='width:500px; height:500px'><div id='child1'></div><div id='child2'></div></div>" +
            "<div id='templateContentSwap' style='width:500px; height:500px'></div>" +
            "<div id='batchInsert' style='width:500px; height:500px'></div>";
        document.body.appendChild(newNode);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        var element = document.getElementById("PhotosAppScenarios");
        if (element) {
            document.body.removeChild(element);
        }
    };

    function compareArrays(expected, actual) {
        LiveUnit.Assert.areEqual(expected.length, actual.length);
        for (var i = 0; i < expected.length; i++) {
            LiveUnit.Assert.areEqual(JSON.stringify(expected[i]), JSON.stringify(actual[i]));
        }
    }

    function checkTileSelection(listView, index, selected) {
        var tile = listView.elementFromIndex(index).parentNode;
        LiveUnit.Assert.areEqual(selected, utilities.hasClass(tile, WinJS.UI._selectedClass));
    }

    function createTestDataSource(size, data) {
        // Populate a data array
        if (!data) {
            data = [];
            for (var i = 0; i < size; i++) {
                data.push({ title: "title" + i, index: i, itemWidth: "80px", itemHeight: "80px" });
            }
        }

        // Create the datasource
        var controller = {
            directivesForMethod: function (method, args) {
                var implementedNotifications = ["insertAtIndex", "changeAtIndex", "removeAtIndex"];
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
            itemsFromKey: true,
            getCount: true,
            setNotificationHandler: true
        };

        return TestComponents.createTestDataSource(data, controller, abilities);
    }

    this.generateListViewSelection = function (layoutName) {
        this["testListViewSelection" + layoutName] = function (complete) {
            var element = document.getElementById("listViewSelection"),
                dsCount = 100,
                ds = createTestDataSource(dsCount);

            // Create listView
            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: ds,
                itemTemplate: Helper.syncJSTemplate,
                selectionMode: "multi"
            });

            // Set selection without waiting for complete
            var selected = [2, 48, 99, 23, 74, 35];
            listView.selection.set(selected);

            waitForReady(listView)().
                done(function () {
                    // Check the selected items
                    var actualSelected = listView.selection.getIndices();
                    compareArrays(selected.sort(), actualSelected);

                    // Check no extra items are selected
                    for (var i = 0; i < dsCount.length; i++) {
                        if (-1 === selected.indexOf(i)) {
                            checkTileSelection(listView, data[i], false);
                        }
                        else {
                            checkTileSelection(listView, data[i], true);
                        }
                    }

                    complete();
                }, function (error) {
                    throw error;
                });
        };
    };
    this.generateListViewSelection("GridLayout");

    (function () {
        function generateTest(startIndex, layoutName) {
            return function (complete) {
                var sezoDiv = document.getElementById("SemanticZoomMapping"),
                    listDiv1 = sezoDiv.children[0],
                    listDiv2 = sezoDiv.children[1],
                    dsCount = 1000,
                    zoomItem,
                    ds = createTestDataSource(dsCount);

                var list1 = new WinJS.UI.ListView(listDiv1, {
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: Helper.syncJSTemplate,
                    itemDataSource: ds,
                });

                var list2 = new WinJS.UI.ListView(listDiv2, {
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: Helper.syncJSTemplate,
                    itemDataSource: ds,
                });

                // Intended to map a zoomed in item to a zoomed out item.
                var zoomedOutItem = function (item) {
                    item.groupKey = item.key;
                    item.groupIndexHint = item.index;
                    item.groupData = item.data;
                    return item;
                };

                // Intended to map a zoomed out item to a zoomed in item.
                var zoomedInItem = function (item) {
                    item.groupSize = 1;
                    item.firstItemKey = item.key;
                    item.firstItemIndexHint = item.index;
                    return item;
                };

                var sezo = new WinJS.UI.SemanticZoom(sezoDiv, {
                    zoomedInItem: zoomedInItem,
                    zoomedOutItem: zoomedOutItem,
                });

                function isVisible(listView, index) {
                    return (index >= listView.indexOfFirstVisible) && (index <= listView.indexOfLastVisible);
                }

                waitForReady(list1)().
                    then(function () {
                        list1.indexOfFirstVisible = startIndex;
                    }).
                    then(waitForReady(list1)).
                    then(function () {
                        // Hit test on the listView to get the item at the viewport center
                        var style = getComputedStyle(sezoDiv),
                            centerX = WinJS.Utilities.getScrollPosition(list1._viewport).scrollLeft + (parseInt(style.width, 10) / 2),
                            centerY = parseInt(style.height, 10) / 2,
                            centerItemIndex = list1.layout.hitTest(centerX, centerY);

                        centerItemIndex = +centerItemIndex.index === centerItemIndex.index ? centerItemIndex.index : centerItemIndex

                        LiveUnit.Assert.isTrue(centerItemIndex >= 0, "Hit test failed. Index of item at viewport center: " + centerItemIndex);
                        return centerItemIndex;
                    }).
                    then(function (centerItemIndex) {
                        return list1.itemDataSource.itemFromIndex(centerItemIndex);
                    }).
                    then(function (itemAtIndex) {
                        // Get item from datasource
                        zoomItem = itemAtIndex;
                    }).
                    then(function () {
                        return new WinJS.Promise(function (c, e, p) {
                            sezo.addEventListener("zoomchanged", function (ev) {
                                c();
                            });

                            // Zoom out
                            sezo.zoomedOut = true;
                        });
                    }).
                    then(waitForReady(list2)).
                    then(function () {
                        return list2.zoomableView.getCurrentItem();
                    }).
                    then(function (currentItem) {
                        // Verify currentItem of zoomed out view
                        LiveUnit.Assert.areEqual(currentItem.item.key, zoomItem.key, "Zoomed out of the wrong item");
                        LiveUnit.Assert.areEqual(JSON.stringify(currentItem.item.data), JSON.stringify(zoomItem.data),
                            "Zoomed out of the wrong item");

                        // Verify currentItem is visible
                        isVisible(list2, currentItem.item.data.index);

                        // Zoom back in
                        sezo.zoomedOut = false;
                    }).
                    then(waitForReady(list1)).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        if (WinJS.UI.SemanticZoom) {
            that["testSemanticZoomMappingStartGridLayout"] = generateTest(0, "GridLayout");
            that["testSemanticZoomMappingMiddleGridLayout"] = generateTest(500, "GridLayout");
            that["testSemanticZoomMappingEndGridLayout"] = generateTest(999, "GridLayout");
        }
    })();

    (function generateTemplateTests () {
        function foo (control) {
            return function (complete) {
                var element = document.getElementById("templateContentSwap"),
                    templateItems = {},
                    dsCount = 200,
                    ds = createTestDataSource(dsCount);

                var template = function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var templateDiv = document.createElement("div"),
                        div = document.createElement("div");

                        templateDiv.style.width = "450px";
                        templateDiv.style.height = "450px";
                        template.innerHTML = "OldTitle: " + item.data.title;
                        templateItems[item.key] = templateDiv;

                        div.appendChild(templateDiv);
                        return div;
                    });
                };

                var ctrl = new control(element, {
                    itemDataSource: ds,
                    itemTemplate: template
                });

                // Call complete after the control is ready
                if (control === WinJS.UI.ListView) {
                    // ListView
                    waitForReady(ctrl)().done(complete);
                }
                else {
                    //FlipView
                    element.addEventListener("pagecompleted", function (ev) {
                        complete();
                    });
                }

                function updateTemplate(key) {
                    var templateDiv = templateItems[key];
                    template.innerHTML = "NewTitle";
                }

                // Don't wait till control is ready to update the DOM contents
                WinJS.Utilities._setImmediate(function () {
                    var templateKeys = Object.keys(templateItems);
                    templateKeys.map(updateTemplate);
                });
            };
        }

        that["testFlipViewTemplateContentSwap"] = foo(WinJS.UI.FlipView);
        that["testListViewTemplateContentSwap"] = foo(WinJS.UI.ListView);
    }) ();

    this.testFlipViewBatchInsert = function (complete) {
        var element = document.getElementById("batchInsert"),
            dsCount = 100,
            finalCount = 200,
            flipView,
            ds = createTestDataSource(dsCount);

        var dsCountChanged = function (ev) {
            flipView.count().then(function (c) {
                LiveUnit.Assert.areEqual(c, dsCount, "FlipView count: " + c + " is not equal to the expected count: " + dsCount);
            });
        };
        element.addEventListener("datasourcecountchanged", dsCountChanged);

        flipView = new WinJS.UI.FlipView(element, {
            itemDataSource: ds,
            itemTemplate: Helper.syncJSTemplate
        });

        function addItems() {
            for (var i = 0; i < 25; i++, dsCount++) {
                ds.testDataAdapter.insertAtIndex({
                    title: "title",
                    index: dsCount,
                    itemWidth: "80px",
                    itemHeight: "80px"
                }, dsCount);
            }

            // Add items at an interval of 100 ms
            (dsCount < finalCount) ? setTimeout (addItems, 100) : complete();
        }

        // Don't wait for pageselected to add items
        WinJS.Utilities._setImmediate(addItems);
    };
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.PhotosAppScenarios");
