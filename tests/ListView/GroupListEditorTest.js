// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <reference path="../TestLib/Itemsmanager/TestDataSource.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.GroupListEditorTest = function () {
    "use strict";

    var ITEMS_COUNT = 10;

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function (complete) {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "groupListEditorTest";
        newNode.style.height = "200px";
        newNode.style.width = "1024px";
        newNode.innerHTML =
            "<div id='listEditorTest'></div>" +
            "<div id='simpleHeaderTemplate' class='listEditorTestClass' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='simpleTemplate' class='{{className}}' style='display: none;'>" +
            "   <div>{{title}}</div>" +
            "</div>";
        document.body.appendChild(newNode);

        //WinBlue: 298587
        this._oldMaxTimePerCreateContainers = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;
        appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = this._oldMaxTimePerCreateContainers;

        var element = document.getElementById("groupListEditorTest");
        if (element) {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        }
        removeCSSFileFromHead("$(TESTDATA)/Listview.css");
    }

    function getDataObject(pattern, counter, title) {
        var object = {
            enableCellSpanning: true,
            group: counter % 5,
            title: (title ? title : "Tile" + counter),
        };
        switch (pattern.charAt(0)) {
            case 'b':
                object.className = "multisizeBigTile";
                break;
            case 'm':
                object.className = "multisizeMediumTile";
                break;
            default:
                object.className = "multisizeSmallTile";
                break;
        }
        return object;
    }

    function createDataSource(items) {
        // Create the datasource
        var controller = {
            directivesForMethod: function (method, args) {
                return {
                    callMethodSynchronously: true,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1
                };
            }
        },
            // Data adapter abilities
        abilities = null;

        return TestComponents.createTestDataSource(items, controller, abilities);
    }

    function setupListView(element, layout, multisizeMode, items, bindingList) {
        function groupKey(item) {
            return (item.data ? item.data.group.toString() : item.group.toString());
        }
        function groupData(item) {
            return {
                title: (item.data ? item.data.group.toString() : item.group.toString())
            };
        }

        if (!items) {
            var patternOptions = ['m', 's', 'b'];
            items = [];
            for (var i = 0; i < ITEMS_COUNT; ++i) {
                var pattern = (multisizeMode ? patternOptions[i % 3] : patternOptions[0]);
                items[i] = getDataObject(pattern, i);
            }
            items.sort(function (a, b) { return a.group - b.group; });
        }

        var testDataSrc,
            testDataSrcGroups;

        if (bindingList) {
            var testDataList = (new WinJS.Binding.List(items.slice(0))).createGrouped(groupKey, groupData);
            testDataSrc = testDataList.dataSource;
            testDataSrcGroups = testDataList.groups.dataSource;
        } else {
            testDataSrc = WinJS.UI.computeDataSourceGroups(createDataSource(items.slice(0)), groupKey, groupData);
            testDataSrcGroups = testDataSrc.groups;
        }

        var layoutOptions = {};

        if (multisizeMode) {
            layoutOptions.groupInfo = {
                enableCellSpanning: true,
                cellWidth: 100,
                cellHeight: 100
            };
            layoutOptions.itemInfo = function (itemIndex) {
                return testDataSrc.itemFromIndex(itemIndex).then(function (item) {
                    switch (item.data.className) {
                        case "multisizeBigTile":
                            return { width: 400, height: 200 };
                            break;
                        case "multisizeMediumTile":
                            return { width: 200, height: 200 };
                            break;
                        case "multisizeSmallTile":
                            return { width: 300, height: 100 };
                            break;
                    }
                });
            };
        }

        return new WinJS.UI.ListView(element, {
            itemDataSource: testDataSrc,
            groupDataSource: testDataSrcGroups,
            selectionMode: "multi",
            itemTemplate: createRenderer("simpleTemplate"),
            groupHeaderTemplate: createRenderer("simpleHeaderTemplate", "groupListEditorTest_groupheader_"),
            layout: new WinJS.UI[layout](layoutOptions)
        });
    }

    this.generate = function (name, testFunction, items) {
        function generateTest(that, layout, multisize, bindingList, newLayout) {
            var fullName = name + "_" + (multisize ? "multisize_grouped_grid" : "normal_grouped_grid")
                    + (bindingList ? "_BindingList" : "_TestDataSource") + (layout == "GridLayout" ? "" : "_" + layout);

            that[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);

                var element = document.getElementById("listEditorTest");
                var listview = setupListView(element, layout, multisize, items, bindingList, newLayout);

                testFunction(listview, complete);
            };
        }

        //normal grouped with test data source
        generateTest(this, "GridLayout", false, false);

        //normal grouped with Binding.List
        generateTest(this, "GridLayout", false, true);

        //grouped multisize with test data source
        generateTest(this, "GridLayout", true, false);

        //grouped multisize with Binding.List
        generateTest(this, "GridLayout", true, true);
    }

    function checkTile(listview, index, left, top, tileType, title) {
        var tile = listview.elementFromIndex(index),
            container = containerFrom(tile),
            viewBoundsOffset = parseInt(listview._viewport.style["msScrollLimitXMin"]) || 0;
        LiveUnit.Assert.areEqual((title ? title : "Tile" + index), tile.textContent.trim());
        LiveUnit.Assert.areEqual(left, offsetLeftFromSurface(listview, container) - viewBoundsOffset, "Error in tile " + index);
        LiveUnit.Assert.areEqual(top, offsetTopFromSurface(listview, container), "Error in tile " + index);

        if (listview.layout.groupInfo) {
            var width = container.offsetWidth,
                height = container.offsetHeight;
            switch (tileType) {
                case "b":
                    LiveUnit.Assert.areEqual(400, width, "Error in tile " + index);
                    LiveUnit.Assert.areEqual(200, height, "Error in tile " + index);
                    break;
                case "m":
                    LiveUnit.Assert.areEqual(200, width, "Error in tile " + index);
                    LiveUnit.Assert.areEqual(200, height, "Error in tile " + index);
                    break;
                case "s":
                    LiveUnit.Assert.areEqual(300, width, "Error in tile " + index);
                    LiveUnit.Assert.areEqual(100, height, "Error in tile " + index);
                    break;
            }
        }
    }

    function checkHeader(listView, groupIndex, left, top, id, caption) {
        var tile = document.getElementById(id + groupIndex),
            container = headerContainerFrom(listView, tile),
            viewBoundsOffset = parseInt(listView._viewport.style["msScrollLimitXMin"]) || 0;
        LiveUnit.Assert.areEqual(caption ? caption : String.fromCharCode("A".charCodeAt(0) + groupIndex), tile.textContent.trim());
        LiveUnit.Assert.areEqual(left, offsetLeftFromSurface(listView, container) - viewBoundsOffset);
        LiveUnit.Assert.areEqual(top, offsetTopFromSurface(listView, container));
    }

    this.generate("testInsertBefore", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testInsertBefore");

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.insertBefore(null, getDataObject('m', 0, "NewTile"), dataObjects[0].key).then(function () {
                    return listView.itemDataSource.insertBefore(null, getDataObject('s', 0, "NewTile"), dataObjects[0].key);
                });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([2], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                checkTile(listView, 0, 70, 120, 'm', "NewTile");
                checkTile(listView, 1, 270, 120, 's', "NewTile");
            }).
            then(complete);
    });

    this.generate("testInsertAtStart", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testInsertAtStart");

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.insertAtStart(null, getDataObject('s', 0, "NewTile")).
                    then(function () {
                        return listView.itemDataSource.insertAtStart(null, getDataObject('m', 0, "NewTile"));
                    });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([2], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                checkTile(listView, 0, 70, 120, 'm', "NewTile");
                checkTile(listView, 1, 270, 120, 's', "NewTile");
            }).
            then(complete);
    });

    this.generate("testInsertAfter", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testInsertAfter");

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return getDataObjects(listView.itemDataSource, [0]);
            }).
            then(function (dataObjects) {
                // throws an exception: Line: 6924 in ui.js
                //      Error: Unable to get value of the property 'count': object is null or undefined
                return listView.itemDataSource.insertAfter(null, getDataObject('s', 0, "NewTile"), dataObjects[0].key).
                    then(function () {
                        return listView.itemDataSource.insertAfter(null, getDataObject('m', 0, "NewTile"), dataObjects[0].key);
                    });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                checkTile(listView, 1, 270, 120, 'm', "NewTile");
                checkTile(listView, 2, 470, 120, 's', "NewTile");
            }).
            then(complete);
    });

    this.generate("testInsertAtEnd", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testInsertAtEnd");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.insertAtEnd(null, getDataObject('m', ITEMS_COUNT - 1, "NewTile")).
                    then(function () {
                        return listView.itemDataSource.insertAtEnd(null, getDataObject('s', ITEMS_COUNT - 1, "NewTile"));
                    });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT + 2, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
            }).
            then(function () {
                listView.ensureVisible(ITEMS_COUNT + 1);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                if (isMultisizeTest) {
                    checkTile(listView, (ITEMS_COUNT + 2) - 2, 3250, 120, 'm', "NewTile");
                    checkTile(listView, (ITEMS_COUNT + 2) - 1, 3450, 120, 's', "NewTile");
                } else {
                    checkTile(listView, (ITEMS_COUNT + 2) - 2, 2350, 120, 'm', "NewTile");
                    checkTile(listView, (ITEMS_COUNT + 2) - 1, 2550, 120, 's', "NewTile");
                }
            }).
            then(complete);
    });

    var bigDataSet = [];
    for (var i = 0; i < 100; ++i) {

        bigDataSet.push(getDataObject('m', i));
    }
    bigDataSet.sort(function (a, b) { return a.group - b.group; });

    this.generate("testInsertOutsideOfRealizedRange", function (listView, complete) {
        waitForReady(listView, -1)().then(function () {
            listView.itemDataSource.insertAtEnd(null, getDataObject('m', 4, "NewTile"))
            return waitForReady(listView, -1)();
        }).then(function () {
            return listView.itemDataSource.getCount();
        }).then(function (count) {
            LiveUnit.Assert.areEqual(101, count);
            LiveUnit.Assert.areEqual(101, listView._view.containers.length);
            complete();
        });
    }, bigDataSet);

    this.generate("testInsertToEmpty", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testInsertToEmpty");

        waitForReady(listView, -1)().
            then(function () {
                return listView.itemDataSource.insertAtStart(null, getDataObject('s', 0, "NewTile"));
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(1, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                LiveUnit.Assert.areEqual(1, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                checkTile(listView, 0, 70, 120, '2', "NewTile");
            }).
            then(complete);
    }, []);

    /// removes first two items which eliminates group 0
    this.generate("testRemoveFirstItem", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testRemoveFirstItem");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0, 1]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.remove(dataObjects[0].key).
                    then(function () {
                        return listView.itemDataSource.remove(dataObjects[1].key);
                    });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                LiveUnit.Assert.areEqual(0, listView.scrollPosition);
                elementsEqual([], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 0, 70, 120, 's', "Tile1");
                    checkTile(listView, 1, 370, 120, 'm', "Tile6");

                    checkHeader(listView, 1, 640, 0, "groupListEditorTest_groupheader_", "2");
                    checkTile(listView, 2, 640, 120, 'b', "Tile2");
                } else {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 0, 70, 120, 'm', "Tile1");
                    checkTile(listView, 1, 270, 120, 'm', "Tile6");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "2");
                    checkTile(listView, 2, 540, 120, 'm', "Tile2");
                }
            }).
            then(complete);
    });

    /// Removes from end of group 0 and start of group 1
    this.generate("testRemoveAtGroupBoundary", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testRemoveAtGroupBoundary");

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [1, 2]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.remove(dataObjects[0].key).then(function () {
                    return listView.itemDataSource.remove(dataObjects[1].key);
                });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                checkTile(listView, 0, 70, 120, 'm', "Tile0");

                checkHeader(listView, 1, 340, 0, "groupListEditorTest_groupheader_", "1");
                checkTile(listView, 1, 340, 120, 'm', "Tile6");
            }).
            then(complete);
    });

    /// Removes last two items in group 4, which eliminates it
    this.generate("testRemoveLastItem", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testRemoveLastItem");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [8, 9]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.remove(dataObjects[0].key).then(function () {
                    return listView.itemDataSource.remove(dataObjects[1].key);
                });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, count);
            }).
            then(function () {
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                listView.ensureVisible((ITEMS_COUNT - 1) - 2);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 3, 2080, 0, "groupListEditorTest_groupheader_", "3");
                    checkTile(listView, 6, 2080, 120, 'm', "Tile3");
                    checkTile(listView, 7, 2280, 120, 'b', "Tile8");
                } else {
                    checkHeader(listView, 3, 1480, 0, "groupListEditorTest_groupheader_", "3");
                    checkTile(listView, 6, 1480, 120, 'm', "Tile3");
                    checkTile(listView, 7, 1680, 120, 'm', "Tile8");
                }
            }).
            then(complete);
    });

    /// Moves from end of group 0 to start
    this.generate("testMoveToStart", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testMoveToStart");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [1]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.moveToStart(dataObjects[0].key);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([1], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'b', "Tile5");
                    checkTile(listView, 1, 470, 120, 'm', "Tile0");

                    checkHeader(listView, 1, 740, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 740, 120, 's', "Tile1");
                } else {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "Tile5");
                    checkTile(listView, 1, 270, 120, 'm', "Tile0");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 540, 120, 'm', "Tile1");
                }
            }).
            then(complete);
    });

    /// Moves from end of group 0 to before item 0
    this.generate("testMoveBefore", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testMoveBefore");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0, 1]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.moveBefore(dataObjects[1].key, dataObjects[0].key);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([1], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'b', "Tile5");
                    checkTile(listView, 1, 470, 120, 'm', "Tile0");

                    checkHeader(listView, 1, 740, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 740, 120, 's', "Tile1");
                } else {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "Tile5");
                    checkTile(listView, 1, 270, 120, 'm', "Tile0");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 540, 120, 'm', "Tile1");
                }
            }).
            then(complete);
    });

    /// Moves from start of group 0 to after item 1
    this.generate("testMoveAfter", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testMoveAfter");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0, 1]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.moveAfter(dataObjects[0].key, dataObjects[1].key);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([1], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'b', "Tile5");
                    checkTile(listView, 1, 470, 120, 'm', "Tile0");

                    checkHeader(listView, 1, 740, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 740, 120, 's', "Tile1");
                } else {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "Tile5");
                    checkTile(listView, 1, 270, 120, 'm', "Tile0");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 540, 120, 'm', "Tile1");
                }
            }).
            then(complete);
    });

    /// Moves from start of group 4 to after item 9
    this.generate("testMoveToEnd", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testMoveToEnd");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [8]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.moveToEnd(dataObjects[0].key);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
            }).
            then(function () {
                listView.ensureVisible(ITEMS_COUNT - 1);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                if (isMultisizeTest) {
                    checkHeader(listView, 4, 2750, 0, "groupListEditorTest_groupheader_", "4");
                    checkTile(listView, ITEMS_COUNT - 2, 2750, 120, 'm', "Tile9");
                    checkTile(listView, ITEMS_COUNT - 1, 2950, 120, 's', "Tile4");
                } else {
                    checkHeader(listView, 4, 1950, 0, "groupListEditorTest_groupheader_", "4");
                    checkTile(listView, ITEMS_COUNT - 2, 1950, 120, 'm', "Tile9");
                    checkTile(listView, ITEMS_COUNT - 1, 2150, 120, 'm', "Tile4");
                }
            }).
            then(complete);
    });

    /// Changes first item in group 0
    this.generate("testChangeFirstItem", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testChangeFirstItem");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [0]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.change(dataObjects[0].key, getDataObject('m', 0, "NewTile"));
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "NewTile");
                    checkTile(listView, 1, 270, 120, 'b', "Tile5");

                    checkHeader(listView, 1, 740, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 740, 120, 's', "Tile1");
                } else {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "NewTile");
                    checkTile(listView, 1, 270, 120, 'm', "Tile5");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 540, 120, 'm', "Tile1");
                }
            }).
            then(complete);
    });

    /// Changes items at boundary
    this.generate("testChangeAtGroupBoundary", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testChangeAtGroupBoundary");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [1, 2]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.change(dataObjects[0].key, getDataObject('m', 0, "NewTile")).
                    then(function () {
                        return listView.itemDataSource.change(dataObjects[1].key, getDataObject('m', 1, "NewTile"));
                    });
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                if (isMultisizeTest) {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "Tile0");
                    checkTile(listView, 1, 270, 120, 'm', "NewTile");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 540, 120, 'm', "NewTile");
                } else {
                    checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                    checkTile(listView, 0, 70, 120, 'm', "Tile0");
                    checkTile(listView, 1, 270, 120, 'm', "NewTile");

                    checkHeader(listView, 1, 540, 0, "groupListEditorTest_groupheader_", "1");
                    checkTile(listView, 2, 540, 120, 'm', "NewTile");
                }
            }).
            then(complete);
    });

    /// Changes the last item in group 4
    this.generate("testChangeLastItem", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testChangeLastItem");
        var isMultisizeTest = !!listView.layout.groupInfo;

        waitForReady(listView, -1)().
            then(function () {
                listView.selection.set(0);
                return getDataObjects(listView.itemDataSource, [9]);
            }).
            then(function (dataObjects) {
                return listView.itemDataSource.change(dataObjects[0].key, getDataObject('m', 4, "NewTile"));
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                return listView.itemDataSource.getCount();
            }).
            then(function (count) {
                LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                elementsEqual([0], listView.selection.getIndices());
                LiveUnit.Assert.areEqual(ITEMS_COUNT, document.querySelectorAll(".win-container").length);
                checkHeader(listView, 0, 70, 0, "groupListEditorTest_groupheader_", "0");
                listView.ensureVisible(ITEMS_COUNT - 1);
            }).
            then(waitForReady(listView, -1)).
            then(function () {
                if (isMultisizeTest) {
                    checkHeader(listView, 4, 2750, 0, "groupListEditorTest_groupheader_", "4");
                    checkTile(listView, 8, 2750, 120, 's', "Tile4");
                    checkTile(listView, 9, 3050, 120, 'm', "NewTile");
                } else {
                    checkHeader(listView, 4, 1950, 0, "groupListEditorTest_groupheader_", "4");
                    checkTile(listView, 8, 1950, 120, 'm', "Tile4");
                    checkTile(listView, 9, 2150, 120, 'm', "NewTile");
                }
            }).
            then(complete);
    });
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.GroupListEditorTest");
