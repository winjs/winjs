// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;
    var testRootEl;

    function checkTile(listview, index, left, top, caption) {
        var tile = listview.elementFromIndex(index),
            container = Helper.ListView.containerFrom(tile);
        LiveUnit.Assert.areEqual(caption + index, tile.textContent.replace(/ /g, ''));
        LiveUnit.Assert.areEqual(left, Helper.ListView.offsetLeftFromSurface(listview, container), "Error in tile " + index);
        LiveUnit.Assert.areEqual(top, Helper.ListView.offsetTopFromSurface(listview, container), "Error in tile " + index);
    }

    function setupListview(element, layout) {
        var myData = [];
        for (var i = 0; i < 100; ++i) {
            myData.push({ title: "Tile" + i });
        }
        var list = new WinJS.Binding.List(myData);
        return new WinJS.UI.ListView(element, {
            itemDataSource: list.dataSource,
            itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
            layout: new WinJS.UI[layout](),
        });
    }

    function checkTileSelection(listview, index, selected) {
        var tile = listview.elementFromIndex(index).parentNode;
        LiveUnit.Assert.areEqual(selected, WinJS.Utilities.hasClass(tile, WinJS.UI._selectedClass));
    }

    export class ConfigurationTests {


        // This is the setup function that will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "ConfigurationTests";
            newNode.innerHTML =
            "<div id='itemSizeChange' style='width:350px; height:350px'></div>" +
            "<div id='dataSourceChange' style='width:350px; height:400px'></div>" +
            "<div id='templateChange' style='width:350px; height:400px'></div>" +
            "<div id='layoutChange' style='width:350px; height:300px'></div>" +
            "<div id='modeChange' style='width:350px; height:300px'></div>" +
            "<div id='selectionChange' style='width:350px; height:300px'></div>" +
            "<div id='scrollToPriority' style='width:350px; height:300px'></div>" +
            "<div id='simpleTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='smallTemplate' style='display: none; width:50px; height:50px'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='bigTemplate' style='display: none; width:200px; height:200px'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='newTemplate' style='display: none; width:50px; height:50px'>" +
            "   <div>New{{title}}</div>" +
            "</div>";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
            Helper.ListView.removeListviewAnimations();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
            Helper.ListView.restoreListviewAnimations();
        }

        testScrollToItemValidation = function (complete) {

            function test(modification) {
                var placeholder = document.createElement("div");
                testRootEl.appendChild(placeholder);

                var listView = new WinJS.UI.ListView(placeholder, {
                    itemTemplate: function (itemPromise) {
                        var elem = document.createElement("div");
                        elem.style.width = elem.style.height = "100px";
                        itemPromise.then(function (item) {
                            elem.textContent = item.data.title;
                        });
                        return elem;
                    },
                    layout: new WinJS.UI.GridLayout()
                });

                return Helper.ListView.waitForReady(listView, -1)().then(function () {

                    modification(listView, 10);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {

                        var list = new WinJS.Binding.List([{ title: "Tile" }]);
                        listView.itemDataSource = list.dataSource;
                        modification(listView, 10);

                        return Helper.ListView.waitForReady(listView, -1)();
                    }).then(function () {
                        LiveUnit.Assert.isTrue(!!listView.elementFromIndex(0));

                        var myData = [];
                        for (var i = 0; i < 100; ++i) {
                            myData.push({ title: "Tile" + i });
                        }
                        var list = new WinJS.Binding.List(myData);
                        listView.itemDataSource = list.dataSource;
                        modification(listView, 10000);

                        return Helper.ListView.waitForReady(listView, -1)();
                    }).then(function () {
                        LiveUnit.Assert.isTrue(!!listView.elementFromIndex(99));
                        LiveUnit.Assert.areEqual(99, listView.indexOfLastVisible);

                        placeholder.parentNode.removeChild(placeholder);
                    });
            }

            test(function (listView, index) {
                listView.indexOfFirstVisible = index;
            }).then(function () {
                    return test(function (listView, index) {
                        listView.ensureVisible(index);
                    });
                }).done(complete);
        };

        testScrollToHeaderValidation = function (complete) {

            var placeholder = document.createElement("div");
            placeholder.style.width = "320px";
            testRootEl.appendChild(placeholder);

            function renderer(itemPromise) {
                var elem = document.createElement("div");
                elem.style.width = elem.style.height = "100px";
                itemPromise.then(function (item) {
                    elem.textContent = item.data.title;
                });
                return elem;
            }

            function groupKey(data) {
                return data.group.toString();
            }

            function groupData(data) {
                return {
                    title: data.group.toString()
                };
            }

            function setupDataSources(listView, data) {
                var list = new WinJS.Binding.List(data);
                var myGroupedList = list.createGrouped(groupKey, groupData);

                listView.itemDataSource = myGroupedList.dataSource;
                listView.groupDataSource = myGroupedList.groups.dataSource;
            }

            var listView = new ListView(placeholder, {
                itemTemplate: renderer,
                groupHeaderTemplate: renderer,
                layout: new WinJS.UI.GridLayout()
            });
            setupDataSources(listView, []);

            return Helper.ListView.waitForReady(listView, -1)().
                then(function () {

                    listView.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 10 });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {

                    setupDataSources(listView, [{ title: "Tile", group: 0 }]);
                    listView.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 10 });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    LiveUnit.Assert.isTrue(!!listView.elementFromIndex(0));

                    var myData = [];
                    for (var i = 0; i < 100; ++i) {
                        myData.push({
                            title: "Tile" + i,
                            group: Math.floor(i / 10)
                        });
                    }
                    setupDataSources(listView, myData);
                    listView.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 10000 });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                done(function () {
                    LiveUnit.Assert.isTrue(!!listView.elementFromIndex(99));
                    LiveUnit.Assert.areEqual(90, listView.indexOfFirstVisible);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        };


        testForceLayoutAndDataSourceChangePriorities = function (complete) {
            var placeholder = document.getElementById("itemSizeChange");

            var myData = [];
            for (var i = 0; i < 100; ++i) {
                myData.push({ title: "Tile" + i });
            }

            var listView = new ListView(placeholder, {
                itemDataSource: (new WinJS.Binding.List(myData)).dataSource,
                itemTemplate: function (itemPromise) {
                    var elem = document.createElement("div");
                    elem.style.width = elem.style.height = "100px";
                    itemPromise.then(function (item) {
                        elem.textContent = item.data.title;
                    });
                    return elem;
                },
                indexOfFirstVisible: 60
            });

            Helper.ListView.waitForReady(listView, -1)().then(function () {
                LiveUnit.Assert.areEqual(2000, listView.scrollPosition);
                LiveUnit.Assert.areEqual(WinJS.Utilities.getScrollPosition(listView._viewport).scrollLeft, listView.scrollPosition);
                LiveUnit.Assert.areEqual(60, listView.indexOfFirstVisible);

                placeholder.style.display = "none";

                return WinJS.Promise.timeout(1000);
            }).then(function () {

                    var newList = new WinJS.Binding.List([]);
                    listView.itemDataSource = newList.dataSource;
                    for (var i = 0; i < 100; ++i) {
                        newList.push({ title: "NewTile" + i });
                    }

                    placeholder.style.display = "block";
                    listView.forceLayout();

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(0, listView.scrollPosition);
                    LiveUnit.Assert.areEqual(WinJS.Utilities.getScrollPosition(listView._viewport).scrollLeft, listView.scrollPosition);
                    LiveUnit.Assert.areEqual(0, listView.indexOfFirstVisible);
                    LiveUnit.Assert.isTrue(!!listView.elementFromIndex(0));

                    complete();
                });
        };
    }

    function generateItemSizeChange(layout) {
        ConfigurationTests.prototype["testItemSizeChange" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            LiveUnit.LoggingCore.logComment("In testItemSizeChange");

            var element = document.getElementById("itemSizeChange");
            var myData = [];
            for (var i = 0; i < 100; ++i) {
                myData.push({ title: "Tile" + i });
            }
            var list = new WinJS.Binding.List(myData);
            var listView = new WinJS.UI.ListView(element, {
                itemDataSource: list.dataSource,
                itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
                layout: new WinJS.UI[layout](),
            });
            var tests = [
                function () {
                    WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 100, scrollTop: 0 });
                    return true;
                },
                function () {
                    checkTile(listView, 0, 0, 0, "Tile");
                    checkTile(listView, 1, 0, 100, "Tile");
                    checkTile(listView, 2, 0, 200, "Tile");
                    checkTile(listView, 3, 100, 0, "Tile");

                    listView.itemTemplate = Helper.ListView.createRenderer("smallTemplate");
                },
                function () {
                    checkTile(listView, 0, 0, 0, "Tile");
                    checkTile(listView, 1, 0, 50, "Tile");
                    checkTile(listView, 2, 0, 100, "Tile");
                    checkTile(listView, 7, 50, 0, "Tile");

                    listView.itemTemplate = Helper.ListView.createRenderer("bigTemplate");
                },
                function () {
                    checkTile(listView, 0, 0, 0, "Tile");
                    checkTile(listView, 1, 200, 0, "Tile");

                    complete();
                }
            ];
            Helper.ListView.runTests(listView, tests);
        };
    };
    generateItemSizeChange("GridLayout");

    function generate(name, selector, testFunction) {
        function generateTest(layout) {
            var fullName = name + (layout == "GridLayout" ? "" : layout);
            ConfigurationTests.prototype[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);

                var element = document.getElementById(selector);
                var listview = setupListview(element, layout);

                testFunction(element, listview, complete);
            };
        }
        generateTest("GridLayout");
    }

    generate("testDatasourceChange", "dataSourceChange", function (element, listView, complete) {
        var tests = [
            function () {
                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 100, scrollTop: 0 });
                return true;
            },
            function () {
                listView.currentItem = { index: 4 };
                LiveUnit.Assert.areEqual(4, listView.currentItem.index, "ListView's currentItem wasn't set properly");
                listView.selection._pivot = 1;
                checkTile(listView, 0, 0, 0, "Tile");

                var newData = [];
                for (var i = 0; i < 100; ++i) {
                    newData.push({ title: "Newtile" + i });
                }
                var newBindingList = new WinJS.Binding.List(newData);
                listView.itemDataSource = newBindingList.dataSource;
            },
            function () {
                Helper.ListView.validateResetFocusState(listView, "after changing the itemDataSource");
                LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, listView.selection._pivot, "Selection pivot wasn't reset during data source change");
                checkTile(listView, 0, 0, 0, "Newtile");

                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });

    generate("testChangeToNullDataSource", "dataSourceChange", function (element, listView, complete) {
        var tests = [
            function () {
                listView.currentItem = { index: 4 };
                LiveUnit.Assert.areEqual(4, listView.currentItem.index, "ListView's currentItem wasn't set properly");
                listView.itemDataSource = null;
                return true;
            },
            function () {
                Helper.ListView.validateResetFocusState(listView, "after changing the itemDataSource", true);
                Helper.ListView.validateListView(listView);
                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });

    generate("testTemplateChange", "templateChange", function (element, listView, complete) {
        var tests = [
            function () {
                WinJS.Utilities.setScrollPosition(Helper.ListView.viewport(element), { scrollLeft: 100, scrollTop: 0 });
                return true;
            },
            function () {
                checkTile(listView, 0, 0, 0, "Tile");
                checkTile(listView, 1, 0, 100, "Tile");

                listView.itemTemplate = Helper.ListView.createRenderer("newTemplate");
            },
            function () {
                checkTile(listView, 0, 0, 0, "NewTile");
                checkTile(listView, 1, 0, 50, "NewTile");

                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });

    generate("testLayoutChange", "layoutChange", function (element, listView, complete) {
        var tests = [
            function () {
                checkTile(listView, 1, 0, 100, "Tile");
                checkTile(listView, 3, 100, 0, "Tile");

                LiveUnit.Assert.areEqual("auto", window.getComputedStyle(Helper.ListView.viewport(element), null).overflowX);
                LiveUnit.Assert.areEqual("hidden", window.getComputedStyle(Helper.ListView.viewport(element), null).overflowY);

                listView.layout = new WinJS.UI.ListLayout();
            },
            function () {
                checkTile(listView, 1, 0, 100, "Tile");
                checkTile(listView, 3, 0, 300, "Tile");

                LiveUnit.Assert.areEqual("hidden", window.getComputedStyle(Helper.ListView.viewport(element), null).overflowX);
                LiveUnit.Assert.areEqual("auto", window.getComputedStyle(Helper.ListView.viewport(element), null).overflowY);

                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });

    // When multiple ListView properties are set during a single event loop, ensure that the
    // highest priority scroll request is honored. There are three classes of scroll requests:
    //   1. Scroll to a specific location (high priority)
    //   2. Reset the scroll position to 0 (medium priority)
    //   3. Maintain the current scroll position (low priority)
    generate("testScrollToPriority", "scrollToPriority", function (element, listView, complete) {
        var tests = [
            function () {
                listView.scrollPosition = 500;
                return true;
            },
            function () {
                // Verify that the scroll position has been initialized so we can begin the test
                LiveUnit.Assert.areEqual(500, listView.scrollPosition, "Scroll position should have been set to 500");

                // Test high priority scroll request
                listView.layout.maxRows = 1;                            // Low priority
                listView.itemDataSource = listView.itemDataSource;      // Med priority
                listView.indexOfFirstVisible = 9;                      // High priority
                listView.itemTemplate = listView.itemTemplate;          // Med priority

                return true;
            },
            function () {
                // Verify that indexOfFirstVisible's scroll request won. The scroll
                // position should have changed and it shouldn't have been reset to 0.
                LiveUnit.Assert.areNotEqual(0, listView.scrollPosition, "Scroll position shouldn't have been reset to 0");
                LiveUnit.Assert.areNotEqual(500, listView.scrollPosition, "Scroll position shouldn't have been maintained");
                LiveUnit.Assert.areEqual(9, listView.indexOfFirstVisible, "Item 10 should have been the first visible item");

                // Test medium priority scroll request
                listView.layout.maxRows = 2;                            // Low priority
                listView.itemDataSource = listView.itemDataSource;      // Med priority
                listView.layout.itemInfo = listView.layout.itemInfo;    // Low priority

                return true;
            },
            function () {
                // Verify that itemDataSource's scroll request won. The scroll position
                // should have been reset to 0.
                LiveUnit.Assert.areEqual(0, listView.scrollPosition, "Scroll position should have been reset to 0");

                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    });


    function generateModeChange(layout) {
        ConfigurationTests.prototype["testModeChange" + (layout == "GridLayout" ? "" : layout)] = function () {
            LiveUnit.LoggingCore.logComment("In testModeChange");

            var element = document.getElementById("modeChange");
            var listView = setupListview(element, layout);

            LiveUnit.Assert.isTrue(listView.selectionMode === WinJS.UI.SelectionMode.multi);

            listView.selectionMode = WinJS.UI.SelectionMode.none;
            LiveUnit.Assert.isTrue(listView.selectionMode === WinJS.UI.SelectionMode.none);

            listView.selectionMode = WinJS.UI.SelectionMode.multi;
            LiveUnit.Assert.isTrue(listView.selectionMode === WinJS.UI.SelectionMode.multi);

            listView.selectionMode = WinJS.UI.SelectionMode.none;
            LiveUnit.Assert.isTrue(listView.selectionMode === WinJS.UI.SelectionMode.none);
        };
    };
    generateModeChange("GridLayout");



    function generateCurrentItem(layout) {
        ConfigurationTests.prototype["testCurrentItem" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var listView = setupListview(document.getElementById("selectionChange"), layout);
            Helper.ListView.whenLoadingComplete(listView, function () {
                var currentItem = listView.currentItem;
                LiveUnit.Assert.areEqual(currentItem.index, 0);
                LiveUnit.Assert.areEqual(currentItem.key, "0");

                listView.currentItem = {
                    index: 1
                };

                currentItem = listView.currentItem;
                LiveUnit.Assert.areEqual(currentItem.index, 1);
                LiveUnit.Assert.areEqual(currentItem.key, "1");

                listView.currentItem = {
                    key: "2"
                };

                currentItem = listView.currentItem;
                LiveUnit.Assert.areEqual(currentItem.index, 2);
                LiveUnit.Assert.areEqual(currentItem.key, "2");

                // this should do nothing because itemFromKey function is missing.
                listView.itemDataSource.itemFromKey = undefined;
                listView.currentItem = {
                    key: "3"
                };

                currentItem = listView.currentItem;
                LiveUnit.Assert.areEqual(currentItem.index, 2);
                LiveUnit.Assert.areEqual(currentItem.key, "2");
                complete();
            });
        };
    };
    generateCurrentItem("GridLayout");

    function generateCurrentItemInConstructor(layout) {
        ConfigurationTests.prototype["testCurrentItemInConstructor" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var myData = [];
            for (var i = 0; i < 100; ++i) {
                myData.push({ title: "Tile" + i });
            }
            var newNode = document.createElement("div");
            newNode.style.width = "1000px";
            newNode.style.height = "600px";
            testRootEl.appendChild(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                itemDataSource: (new WinJS.Binding.List(myData)).dataSource,
                layout: new WinJS.UI[layout](),
                currentItem: {
                    index: 5
                }
            });
            listView.selection.set([1, 3]);

            Helper.ListView.whenLoadingComplete(listView, function () {
                var currentItem = listView.currentItem;
                LiveUnit.Assert.areEqual(currentItem.index, 5);
                LiveUnit.Assert.areEqual(currentItem.key, "5");

                Helper.ListView.elementsEqual(listView.selection.getIndices(), [1, 3]);
                checkTileSelection(listView, 0, false);
                checkTileSelection(listView, 1, true);
                checkTileSelection(listView, 0, false);
                checkTileSelection(listView, 3, true);

                WinJS.Utilities.disposeSubTree(newNode);
                testRootEl.removeChild(newNode);
                complete();
            });
        };
    };
    generateCurrentItemInConstructor("GridLayout");

}
LiveUnit.registerTestClass("WinJSTests.ConfigurationTests");
