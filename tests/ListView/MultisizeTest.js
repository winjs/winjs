// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <reference path="../TestLib/Itemsmanager/TestDataSource.js"/>
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.MultisizeTests = function () {
    "use strict";
    var Key = WinJS.Utilities.Key;

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function (complete) {

        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "MultisizeTests";
        newNode.innerHTML =
            "<div id='multisizeTestPlaceholder'></div>" +
            "<div id='multisizeMarginTestPlaceholder'></div>" +
            "<div id='multisizeTestTemplate' class='{{className}}' style='display: none'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='multisizeHeaderTemplate' class='multisizeHeaderTemplateClass' style='display: none'>" +
            "   <div>{{index}}</div>" +
            "</div>";


        document.body.appendChild(newNode);
        removeListviewAnimations();

        this._defaultMaxTimePerCreateContainers = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
        appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = this._defaultMaxTimePerCreateContainers;

        var element = document.getElementById("MultisizeTests");
        document.body.removeChild(element);
        restoreListviewAnimations();
        removeCSSFileFromHead("$(TESTDATA)/Listview.css");
    }

    function getDataObject(groupId, pattern, counter) {
        var object = {
            enableCellSpanning: true,
            group: groupId,
            title: "Tile" + counter
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

    function addMultisizeGroup(myData, groupId, pattern, c) {
        for (var i = 0; i < pattern.length; ++i) {
            if (pattern.charAt(i) != " ") {
                myData.push(getDataObject(groupId, pattern.charAt(i), c++));
            }
        }
        return c;
    }

    function addFixedsizeGroup(myData, groupId, c) {
        for (var i = 0; i < 5; ++i) {
            myData.push({
                enableCellSpanning: false,
                group: groupId,
                title: "Tile" + (c++)
            });
        }
        return c;
    }

    function initData(groups, pattern) {
        var myData = [],
            c = 0;

        for (var i = 0; i < groups; ++i) {
            c = addMultisizeGroup(myData, i, pattern, c);
        }

        return myData;
    }

    function createLayout(layoutName, dataSource, getGroupInfo, defaultItemSize) {
        defaultItemSize = defaultItemSize || { width: 100, height: 100 };

        var itemInfo;
        switch (layoutName) {
            case "GridLayout":
                itemInfo = null;
                break;
            case "CellSpanningLayout":
                itemInfo = function (itemIndex) {
                    var retVal = defaultItemSize;
                    if (itemIndex === +itemIndex) {
                        retVal = dataSource.itemFromIndex(itemIndex).then(function (item) {
                            switch (item.data.className) {
                                case "multisizeBigTile":
                                    return { width: 400, height: 600 };
                                    break;
                                case "multisizeMediumTile":
                                    return { width: 200, height: 200 };
                                    break;
                                case "multisizeSmallTile":
                                    return { width: 300, height: 100 };
                                    break;
                            }
                        });
                    }
                    return retVal;
                };
                break;
        }

        var layout = new WinJS.UI[layoutName]({
            groupInfo: getGroupInfo || {
                enableCellSpanning: true,
                cellWidth: 100,
                cellHeight: 100
            },
            itemInfo: itemInfo
        });
        return layout;
    }

    function wrapGetAdjacent(layout, current, key) {
        if (layout.getKeyboardNavigatedItem) {
            return layout.getKeyboardNavigatedItem(current, null, key);
        } else {
            return WinJS.Promise.wrap(layout.getAdjacent({ index: current }, key).index);
        }
    }

    function createAsyncDataSource(array) {
        var synchronousFetches = false,
            fetchDelay = 250;

        var controller = {
            directivesForMethod: function (method, args) {
                return {
                    callMethodSynchronously: synchronousFetches,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1,
                    delay: (synchronousFetches ? null : fetchDelay)
                };
            }
        };

        return TestComponents.createTestDataSource(array, controller, null);
    }

    function setupListView(element, layoutName, groups, pattern, async) {
        var items = initData(groups, pattern);
        var dataSource;
        if (async) {
            dataSource = createAsyncDataSource(items);
        } else {
            var list = new WinJS.Binding.List(items);
            dataSource = list.dataSource;
        }
        var layout = createLayout(layoutName, dataSource);
        return new WinJS.UI.ListView(element, {
            itemDataSource: dataSource,
            itemTemplate: createRenderer("multisizeTestTemplate"),
            layout: layout
        });
    }

    function checkTile(listview, index, left, top, tileType, title) {
        var tile = listview.elementFromIndex(index),
            container = containerFrom(tile);
        LiveUnit.Assert.areEqual((title ? title : "Tile" + index), tile.textContent.replace(/ /g, ''));
        LiveUnit.Assert.areEqual(left, offsetLeftFromSurface(listview, container), "Error in tile " + index);
        LiveUnit.Assert.areEqual(top, offsetTopFromSurface(listview, container), "Error in tile " + index);
        var width = container.offsetWidth,
            height = container.offsetHeight;
        switch (tileType) {
            case "b":
                LiveUnit.Assert.areEqual(400, width, "Error in tile " + index);
                LiveUnit.Assert.areEqual(600, height, "Error in tile " + index);
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

    this.generateLayout = function (layoutName, async) {
        this["testLayout" + layoutName + (async ? "Async" : "")] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "b mmm ssssss", async);

            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m");
                    checkTile(listview, 2, 400, 200, "m");
                    checkTile(listview, 3, 400, 400, "m");
                    checkTile(listview, 4, 600, 0, "s");
                    checkTile(listview, 5, 600, 100, "s");
                    checkTile(listview, 10, 900, 0, "b");

                    listview.indexOfFirstVisible = 50;
                },
                function () {
                    LiveUnit.Assert.areEqual(4500, listview.scrollPosition);

                    checkTile(listview, 50, 4500, 0, "b");
                    checkTile(listview, 51, 4900, 0, "m");
                    checkTile(listview, 52, 4900, 200, "m");
                    checkTile(listview, 53, 4900, 400, "m");
                    checkTile(listview, 54, 5100, 0, "s");

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateLayout("GridLayout");
    this.generateLayout("GridLayout", true);
    this.generateLayout("CellSpanningLayout");
    this.generateLayout("CellSpanningLayout", true);

    this.generateLayoutOccupancyMap = function (layoutName) {
        this["testLayoutOccupancyMap" + layoutName] = function (complete) {
            // Specific test for Win8 bug 820717

            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;

            var element = document.getElementById("multisizeTestPlaceholder"),
                myData = [],
                c = 0;

            c = addMultisizeGroup(myData, 0, "sm", c);
            c = addMultisizeGroup(myData, 1, "sm", c);
            c = addMultisizeGroup(myData, 2, "sm", c);

            function getGroupKey(item) {
                return item.group.toString();
            }

            function getGroupData(item) {
                return { index: item.group, enableCellSpanning: item.enableCellSpanning };
            }

            var myList = new WinJS.Binding.List(myData),
                myGroups = myList.createGrouped(getGroupKey, getGroupData);

            var listview = new WinJS.UI.ListView(element, {
                itemDataSource: myGroups.dataSource,
                groupDataSource: myGroups.groups.dataSource,
                itemTemplate: createRenderer("multisizeTestTemplate"),
                groupHeaderTemplate: createRenderer("multisizeHeaderTemplate"),
                layout: createLayout(layoutName, myList.dataSource)
            });

            var tests = [
                function () {
                    checkTile(listview, 0, 70, 70, "s");
                    checkTile(listview, 1, 70, 170, "m");
                    checkTile(listview, 2, 440, 70, "s");
                    checkTile(listview, 3, 440, 170, "m");
                    checkTile(listview, 4, 810, 70, "s");
                    checkTile(listview, 5, 810, 170, "m");

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateLayoutOccupancyMap("GridLayout");
    this.generateLayoutOccupancyMap("CellSpanningLayout");

    this.generateLayoutWithMargins = function (layoutName) {
        this["testLayoutWithMargins" + layoutName] = function (complete) {
            var items = initData(10, "b mmm ssssss");
            var list = new WinJS.Binding.List(items);

            var layout = new WinJS.UI[layoutName]({
                groupInfo: {
                    enableCellSpanning: true,
                    cellWidth: 100,
                    cellHeight: 100
                },
                itemInfo: { width: 100, height: 100 }
            });
            if (layout.initialize) {
                layout.itemInfo = function (itemIndex) {
                    var retVal = { width: 100, height: 100 };
                    if (itemIndex === +itemIndex) {
                        switch (list.getAt(itemIndex).className) {
                            case "multisizeBigTile":
                                retVal = { width: 550, height: 700 };
                                break;
                            case "multisizeMediumTile":
                                retVal = { width: 250, height: 250 };
                                break;
                            case "multisizeSmallTile":
                                retVal = { width: 400, height: 100 };
                                break;
                        }
                    }
                    return retVal;
                };
            }

            var listview = new WinJS.UI.ListView(document.getElementById("multisizeMarginTestPlaceholder"), {
                itemDataSource: list.dataSource,
                itemTemplate: createRenderer("multisizeTestTemplate"),
                layout: layout
            });

            var tests = [
                function () {
                    checkTile(listview, 0, 25, 25);
                    checkTile(listview, 1, 625, 25);
                    checkTile(listview, 2, 625, 325);
                    checkTile(listview, 3, 625, 625);
                    checkTile(listview, 4, 925, 25);
                    checkTile(listview, 5, 925, 175);
                    checkTile(listview, 10, 1375, 25);

                    listview.indexOfFirstVisible = 50;
                },
                function () {
                    LiveUnit.Assert.areEqual(50, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(6725, listview.scrollPosition);

                    checkTile(listview, 50, 6775, 25);
                    checkTile(listview, 51, 7375, 25);
                    checkTile(listview, 52, 7375, 325);
                    checkTile(listview, 53, 7375, 625);
                    checkTile(listview, 54, 7675, 25);

                    listview.scrollPosition = 680;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(1, listview.indexOfFirstVisible);

                    listview.scrollPosition = 915;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(4, listview.indexOfFirstVisible);

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateLayoutWithMargins("GridLayout");
    this.generateLayoutWithMargins("CellSpanningLayout");

    this.generateMixedLayout = function (layoutName) {
        this["testMixedLayout" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder");

            function getGroupInfo(groupItem) {
                LiveUnit.Assert.isTrue(groupItem !== null, "groupInfo received a null item");
                return {
                    enableCellSpanning: groupItem.data.enableCellSpanning,
                    cellWidth: 100,
                    cellHeight: 100
                };
            }

            var myData = [],
                c = 0;

            c = addMultisizeGroup(myData, 0, "b mmm ssssss", c);
            c = addFixedsizeGroup(myData, 1, c);
            c = addFixedsizeGroup(myData, 2, c);

            function getGroupKey(item) {
                return item.group.toString();
            }
            function getGroupData(item) {
                return { index: item.group, enableCellSpanning: item.enableCellSpanning };
            }

            var myList = new WinJS.Binding.List(myData),
                myGroups = myList.createGrouped(getGroupKey, getGroupData);

            var listview = new WinJS.UI.ListView(element, {
                itemDataSource: myGroups.dataSource,
                groupDataSource: myGroups.groups.dataSource,
                itemTemplate: createRenderer("multisizeTestTemplate"),
                groupHeaderTemplate: createRenderer("multisizeHeaderTemplate"),
                layout: createLayout(layoutName, myList.dataSource, getGroupInfo)
            });

            var tests = [
                function () {
                    checkTile(listview, 0, 70, 70, "b");
                    checkTile(listview, 1, 470, 70, "m");
                    checkTile(listview, 2, 470, 270, "m");
                    checkTile(listview, 3, 470, 470, "m");
                    checkTile(listview, 4, 670, 70, "s");
                    checkTile(listview, 5, 670, 170, "s");

                    checkTile(listview, 10, 1040, 70);
                    checkTile(listview, 11, 1040, 170);
                    checkTile(listview, 12, 1040, 270);
                    checkTile(listview, 13, 1040, 370);

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateMixedLayout("GridLayout");
    this.generateMixedLayout("CellSpanningLayout");

    // Tests fixed and variable groups, where small items in the fixed groups
    // are larger than those in the variable groups
    this.generateUnevenMixedLayout = function (layoutName) {
        this["testUnevenMixedLayout" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder");

            function getGroupInfo(groupItem) {
                LiveUnit.Assert.isTrue(groupItem !== null, "groupInfo received a null item");
                var enableCellSpanning = groupItem.data.enableCellSpanning;

                if (enableCellSpanning) {
                    return {
                        enableCellSpanning: true,
                        cellWidth: 100,
                        cellHeight: 100
                    };
                } else {
                    return {
                        enableCellSpanning: false,
                        cellWidth: 180,
                        cellHeight: 250
                    };
                }
            }

            var myData = [],
                c = 0;

            c = addMultisizeGroup(myData, 0, "b mmm ssssss", c);
            c = addFixedsizeGroup(myData, 1, c);
            c = addFixedsizeGroup(myData, 2, c);

            function getGroupKey(item) {
                return item.group.toString();
            }
            function getGroupData(item) {
                return { index: item.group, enableCellSpanning: item.enableCellSpanning };
            }

            var myList = new WinJS.Binding.List(myData),
                myGroups = myList.createGrouped(getGroupKey, getGroupData);

            var listview = new WinJS.UI.ListView(element, {
                itemDataSource: myGroups.dataSource,
                groupDataSource: myGroups.groups.dataSource,
                itemTemplate: createRenderer("multisizeTestTemplate"),
                groupHeaderTemplate: createRenderer("multisizeHeaderTemplate"),
                layout: createLayout(layoutName, myList.dataSource, getGroupInfo, { width: 180, height: 250 })
            });

            var tests = [
                function () {
                    checkTile(listview, 0, 70, 70, "b");
                    checkTile(listview, 1, 470, 70, "m");
                    checkTile(listview, 2, 470, 270, "m");
                    checkTile(listview, 3, 470, 470, "m");
                    checkTile(listview, 4, 670, 70, "s");
                    checkTile(listview, 5, 670, 170, "s");

                    checkTile(listview, 10, 1040, 70);
                    checkTile(listview, 11, 1040, 320);
                    checkTile(listview, 12, 1220, 70);
                    checkTile(listview, 13, 1220, 320);

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateUnevenMixedLayout("GridLayout");
    this.generateUnevenMixedLayout("CellSpanningLayout");

    this.generateDownUpKeys = function (layoutName) {
        this["testDownUpKeys" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "b mmm ssssss"),
                layout = listview._layout;

            // Illustration of how the items in listView are split into columns:
            // 0  1  4
            //       5
            //    2  6
            //       7
            //    3  8
            //       9

            whenLoadingComplete(listview, function () {
                var indices = [
                    [0, Key.downArrow, 0],

                    [1, Key.downArrow, 2],
                    [2, Key.downArrow, 3],
                    [3, Key.downArrow, 3],

                    [4, Key.downArrow, 5],
                    [5, Key.downArrow, 6],
                    [6, Key.downArrow, 7],
                    [7, Key.downArrow, 8],
                    [8, Key.downArrow, 9],
                    [9, Key.downArrow, 9],

                    [10, Key.downArrow, 10],

                    [11, Key.upArrow, 11],

                    [10, Key.upArrow, 10],

                    [9, Key.upArrow, 8],
                    [8, Key.upArrow, 7],
                    [7, Key.upArrow, 6],
                    [6, Key.upArrow, 5],
                    [5, Key.upArrow, 4],
                    [4, Key.upArrow, 4],

                    [3, Key.upArrow, 2],
                    [2, Key.upArrow, 1]
                ],
                    index = 0;

                function test() {
                    var entry = indices[index++];
                    wrapGetAdjacent(layout, entry[0], entry[1]).done(function (output) {
                        if (index < indices.length) {
                            LiveUnit.Assert.areEqual(entry[2], output, "Error in " + index + " step");
                            test();
                        } else {
                            complete();
                        }
                    });
                }

                test();
            });
        };
    };
    this.generateDownUpKeys("CellSpanningLayout");

    this.generateRightLeftKeys = function (layoutName) {
        this["testRightLeftKeys" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "b mmm ssssss"),
                layout = listview._layout;

            whenLoadingComplete(listview, function () {
                var indices = [
                    [0, Key.rightArrow],
                    [1, Key.rightArrow],
                    [4, Key.rightArrow],
                    [10, Key.leftArrow],
                    [4, Key.downArrow],
                    [5, Key.downArrow],
                    [6, Key.leftArrow],
                    [2, Key.downArrow],
                    [3, Key.rightArrow],
                    [8, Key.leftArrow]
                ],
                    index = 0;

                function test() {
                    var entry = indices[index++];
                    wrapGetAdjacent(layout, entry[0], entry[1]).done(function (output) {
                        if (index < indices.length) {
                            LiveUnit.Assert.areEqual(indices[index][0], output, "Error in " + index + " step");
                            test();
                        } else {
                            complete();
                        }
                    })
                }

                test();
            });
        };
    };
    this.generateRightLeftKeys("CellSpanningLayout");

    this.generatePageUpPageDownKeys = function (layoutName) {
        this["testPageUpPageDownKeys" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "b mmm ssssss"),
                layout = listview._layout,
                tests = [
                ];

            whenLoadingComplete(listview, function () {
                var indices = [
                    [0, Key.pageDown],
                    [10, Key.pageDown],
                    [20, Key.pageDown],
                    [30, Key.pageDown],
                    [40, Key.pageUp],
                    [30, Key.pageUp],
                    [20, Key.pageUp],
                    [10, Key.pageUp],
                    [0, Key.pageUp]
                ],
                    index = 0;

                function test() {
                    var entry = indices[index++];
                    wrapGetAdjacent(layout, entry[0], entry[1]).done(function (output) {
                        if (index < indices.length) {
                            LiveUnit.Assert.areEqual(indices[index][0], output, "Error in " + index + " step");

                            listview._raiseViewComplete = function () {
                                test();
                            };
                            listview.ensureVisible(output);
                        } else {
                            complete();
                        }
                    })
                }

                test();
            });
        };
    };
    this.generatePageUpPageDownKeys("CellSpanningLayout");

    this.generateCrossGroupNavigation = function (layoutName) {
        this["testCrossGroupNavigation" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder");

            function getGroupInfo(groupItem) {
                LiveUnit.Assert.isTrue(groupItem !== null, "groupInfo received a null item");
                var enableCellSpanning = groupItem.data.enableCellSpanning;

                if (enableCellSpanning) {
                    return {
                        enableCellSpanning: true,
                        cellWidth: 100,
                        cellHeight: 100
                    };
                } else {
                    return {
                        enableCellSpanning: false,
                        cellWidth: 180,
                        cellHeight: 250
                    };
                }
            }

            var myData = [],
                c = 0;

            c = addMultisizeGroup(myData, 0, "b mmm ssssss", c);
            c = addFixedsizeGroup(myData, 1, c);
            c = addFixedsizeGroup(myData, 2, c);

            function getGroupKey(item) {
                return item.group.toString();
            }
            function getGroupData(item) {
                return { index: item.group, enableCellSpanning: item.enableCellSpanning };
            }

            var myList = new WinJS.Binding.List(myData),
                myGroups = myList.createGrouped(getGroupKey, getGroupData);

            var listview = new WinJS.UI.ListView(element, {
                itemDataSource: myGroups.dataSource,
                groupDataSource: myGroups.groups.dataSource,
                itemTemplate: createRenderer("multisizeTestTemplate"),
                groupHeaderTemplate: createRenderer("multisizeHeaderTemplate"),
                layout: createLayout(layoutName, myList.dataSource, getGroupInfo, { width: 180, height: 250 })
            }),
            layout = listview._layout;

            whenLoadingComplete(listview, function () {
                var indices = [
                    [0, Key.rightArrow],
                    [1, Key.rightArrow],
                    [4, Key.downArrow],
                    [5, Key.downArrow],
                    [6, Key.rightArrow],
                    [10, Key.downArrow],
                    [11, Key.leftArrow],
                    [9, Key.leftArrow]
                ],
                    index = 0;

                function test() {
                    var entry = indices[index++];
                    wrapGetAdjacent(layout, entry[0], entry[1]).done(function (output) {
                        if (index < indices.length) {
                            LiveUnit.Assert.areEqual(indices[index][0], output, "Error in " + index + " step");
                            test();
                        } else {
                            complete();
                        }
                    })
                }

                test();
            });
        };
    };
    this.generateCrossGroupNavigation("CellSpanningLayout");

    this.generateGapHandling = function (layoutName) {
        this["testGapHandling" + layoutName] = function (complete) {
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "msm b ssssss"),
                layout = listview._layout;

            whenLoadingComplete(listview, function () {
                checkTile(listview, 0, 0, 0, "m");
                checkTile(listview, 1, 0, 200, "s");
                checkTile(listview, 2, 0, 300, "m");
                checkTile(listview, 3, 300, 0, "b");
                checkTile(listview, 4, 700, 0, "s");
                checkTile(listview, 5, 700, 100, "s");
                checkTile(listview, 6, 700, 200, "s");
                checkTile(listview, 7, 700, 300, "s");

                var indices = [
                    [0, Key.rightArrow],
                    [3, Key.rightArrow],
                    [4, Key.downArrow],
                    [5, Key.downArrow],
                    [6, Key.leftArrow],
                    [3, Key.leftArrow],
                    [1, Key.upArrow]
                ],
                    index = 0;

                function test() {
                    var entry = indices[index++];
                    wrapGetAdjacent(layout, entry[0], entry[1]).done(function (output) {
                        if (index < indices.length) {
                            LiveUnit.Assert.areEqual(indices[index][0], output, "Error in " + index + " step");
                            test();
                        } else {
                            complete();
                        }
                    })
                }

                test();
            });
        };
    };
    this.generateGapHandling("CellSpanningLayout");

    this.generateRemove = function (layoutName) {
        this["testRemove" + layoutName] = function (complete) {
            restoreListviewAnimations();
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "b mmm ssssss");

            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m");
                    checkTile(listview, 2, 400, 200, "m");
                    checkTile(listview, 3, 400, 400, "m");
                    checkTile(listview, 4, 600, 0, "s");
                    checkTile(listview, 5, 600, 100, "s");
                    checkTile(listview, 10, 900, 0, "b");

                    getDataObjects(listview.itemDataSource, [1]).then(function (dataObjects) {
                        listview.itemDataSource.remove(dataObjects[0].key);
                    });
                    return true;
                },
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m", "Tile2");
                    checkTile(listview, 2, 400, 200, "m", "Tile3");
                    checkTile(listview, 3, 400, 400, "s", "Tile4");
                    checkTile(listview, 4, 400, 500, "s", "Tile5");
                    checkTile(listview, 5, 600, 0, "s", "Tile6");

                    getDataObjects(listview.itemDataSource, [5, 6, 7, 8]).then(function (dataObjects) {
                        listview.itemDataSource.remove(dataObjects[0].key);
                        listview.itemDataSource.remove(dataObjects[1].key);
                        listview.itemDataSource.remove(dataObjects[2].key);
                        listview.itemDataSource.remove(dataObjects[3].key);
                    });
                    return true;
                },
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m", "Tile2");
                    checkTile(listview, 2, 400, 200, "m", "Tile3");
                    checkTile(listview, 3, 400, 400, "s", "Tile4");
                    checkTile(listview, 4, 400, 500, "s", "Tile5");
                    checkTile(listview, 5, 700, 0, "b", "Tile10");

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateRemove("GridLayout");
    this.generateRemove("CellSpanningLayout");

    this.generateAdd = function (layoutName) {
        this["testAdd" + layoutName] = function (complete) {
            restoreListviewAnimations();
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 10, "b mmm ssssss");

            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m");
                    checkTile(listview, 2, 400, 200, "m");
                    checkTile(listview, 3, 400, 400, "m");
                    checkTile(listview, 4, 600, 0, "s");
                    checkTile(listview, 5, 600, 100, "s");
                    checkTile(listview, 10, 900, 0, "b");

                    var newItem = getDataObject(0, "s", 999);
                    listview.itemDataSource.insertAtStart(null, newItem);
                    return true;
                },
                function () {
                    checkTile(listview, 0, 0, 0, "s", "Tile999");
                    checkTile(listview, 1, 300, 0, "b", "Tile0");
                    checkTile(listview, 2, 700, 0, "m", "Tile1");
                    checkTile(listview, 3, 700, 200, "m", "Tile2");
                    checkTile(listview, 4, 700, 400, "m", "Tile3");
                    checkTile(listview, 5, 900, 0, "s", "Tile4");
                    checkTile(listview, 6, 900, 100, "s", "Tile5");

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateAdd("GridLayout");
    this.generateAdd("CellSpanningLayout");

    this.generateChange = function (layoutName) {
        this["testChange" + layoutName] = function (complete) {
            restoreListviewAnimations();
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 1, "b m s");

            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m");
                    checkTile(listview, 2, 400, 200, "s");

                    getDataObjects(listview.itemDataSource, [1]).then(function (dataObjects) {
                        var newItem = getDataObject(0, "b", 999);
                        listview.itemDataSource.change(dataObjects[0].key, newItem);
                    });
                    return true;
                },
                function () {
                    checkTile(listview, 0, 0, 0, "b", "Tile0");
                    checkTile(listview, 1, 400, 0, "b", "Tile999");
                    checkTile(listview, 2, 800, 0, "s", "Tile2");

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateChange("CellSpanningLayout");

    this.generateReplace = function (layoutName) {
        this["testReplace" + layoutName] = function (complete) {
            restoreListviewAnimations();
            var element = document.getElementById("multisizeTestPlaceholder"),
                listview = setupListView(element, layoutName, 1, "b m s");

            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m");
                    checkTile(listview, 2, 400, 200, "s");

                    getDataObjects(listview.itemDataSource, [0, 1]).then(function (dataObjects) {
                        var newItem = getDataObject(0, "b", 999);
                        listview.itemDataSource.beginEdits();
                        listview.itemDataSource.insertAfter(null, newItem, dataObjects[0].key);
                        listview.itemDataSource.remove(dataObjects[1].key);
                        listview.itemDataSource.endEdits();
                    });
                    return true;
                },
                function () {
                    checkTile(listview, 0, 0, 0, "b", "Tile0");
                    checkTile(listview, 1, 400, 0, "b", "Tile999");
                    checkTile(listview, 2, 800, 0, "s", "Tile2");

                    complete();
                }
            ];
            runTests(listview, tests);
        };
    };
    this.generateReplace("GridLayout");
    this.generateReplace("CellSpanningLayout");

    this.generateFirstVisibleInConstructor = function (layoutName) {
        this["testFirstVisibleInConstructor" + layoutName] = function (complete) {
            restoreListviewAnimations();

            var element = document.getElementById("multisizeTestPlaceholder"),
                items = initData(10, "b mmm ssssss"),
                list = new WinJS.Binding.List(items),
                listview = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    itemTemplate: createRenderer("multisizeTestTemplate"),
                    layout: createLayout(layoutName, list.dataSource),
                    indexOfFirstVisible: 10
                });

            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(10, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(900, listview.scrollPosition);

                    checkTile(listview, 0, 0, 0, "b");
                    checkTile(listview, 1, 400, 0, "m");
                    checkTile(listview, 2, 400, 200, "m");
                    checkTile(listview, 3, 400, 400, "m");
                    checkTile(listview, 4, 600, 0, "s");
                    checkTile(listview, 5, 600, 100, "s");

                    checkTile(listview, 10, 900, 0, "b");

                    complete();
                }
            ];

            runTests(listview, tests);
        };
    };
    this.generateFirstVisibleInConstructor("CellSpanningLayout");

    this.generateBigGroup = function (layoutName) {
        var testName = "testBigGroup" + layoutName;
        this[testName] = function (complete) {
            restoreListviewAnimations();

            var last = WinJS.Utilities.isPhone ? 1999 : 3999, /* Phone has a smaller screen and slower HW */
                myData = [];
            for (var i = 0; i <= last; ++i) {
                myData.push({
                    title: "Tile" + i
                });
            }

            function getSize(index) {
                switch (index % 3) {
                    case 0:
                        return 300;
                    case 1:
                        return 200;
                    case 2:
                        return 100;
                }
            }

            var element = document.getElementById("multisizeTestPlaceholder"),
                list = new WinJS.Binding.List(myData),
                listview = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    itemTemplate: function renderer(itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = element.style.height = getSize(item.index) + "px";
                            element.style.border = "1px solid black";
                            element.textContent = item.data.title;
                            return element;
                        });
                    },
                    layout: {
                        type: WinJS.UI[layoutName],
                        groupInfo: {
                            enableCellSpanning: true,
                            cellWidth: 100,
                            cellHeight: 100
                        },
                        itemInfo: function (index) {
                            return {
                                width: getSize(index),
                                height: getSize(index)
                            };
                        }
                    }
                });

            var tests = [
                function () {
                    listview.ensureVisible(last);
                },
                function () {
                    LiveUnit.Assert.isTrue(!!listview.elementFromIndex(last));

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this[testName].timeout = 30000; //this test requires at least 7 seconds to run on a fast machine
    };
    this.generateBigGroup("CellSpanningLayout");


    this.testMeasureAfterReadySignal = function (complete) {

        function check250Tile(listView, index, left, top) {
            var tile = listView.elementFromIndex(index),
                container = containerFrom(tile);

            LiveUnit.Assert.areEqual("t" + index, tile.textContent);
            LiveUnit.Assert.areEqual(left, offsetLeftFromSurface(listView, container));
            LiveUnit.Assert.areEqual(top, offsetTopFromSurface(listView, container));
            LiveUnit.Assert.areEqual(250, tile.offsetWidth);
            LiveUnit.Assert.areEqual(250, tile.offsetHeight);
        }

        var data = [{ t: 0 }, { t: 1 }, { t: 2 }, { t: 3 }];

        function itemRenderer(itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement("div");
                element.textContent = "t" + item.data.t;
                item.ready.then(function () {
                    element.style.width = "250px";
                    element.style.height = "250px";
                });
                return element;
            });
        }

        var placeholder = document.createElement("div");
        placeholder.id = "multisizeSmallMarginTestPlaceholder";
        placeholder.style.height = "550px";
        document.body.appendChild(placeholder);

        var listView = new WinJS.UI.ListView(placeholder, {
            itemDataSource: new WinJS.Binding.List(data).dataSource,
            itemTemplate: itemRenderer,
            layout: new WinJS.UI.GridLayout({
                groupInfo: {
                    enableCellSpanning: true,
                    cellWidth: 1,
                    cellHeight: 1
                }
            })
        });


        waitForReady(listView)().then(function () {
            check250Tile(listView, 0, 10, 10);  // margins are 10 pixels
            check250Tile(listView, 1, 10, 283); // slot is 21px (1px from group info + 20px of margins). An item is 270px (250px of content + 20px of margins) so an item takes 13 slots. Because of rounding an item occupies 273px
            check250Tile(listView, 3, 283, 283);

            document.body.removeChild(placeholder);

            complete();
        });
    };
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.MultisizeTests");