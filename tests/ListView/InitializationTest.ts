// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/TestDataSource.ts"/>
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var testRootEl;

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    function groupKey(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        return groupIndex.toString();
    }

    function groupData(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        var groupData = {
            title: "group" + groupIndex,
            index: groupIndex,
            itemWidth: "150px",
            itemHeight: "150px"
        };
        return groupData;
    }

    function createData(size) {
        var data = [];
        for (var i = 0; i < size; i++) {
            data.push({ title: "title" + i, index: i, itemWidth: "80px", itemHeight: "80px" });
        }
        return data;
    }

    function createBindingList(size, data?) {
        return (data ? new WinJS.Binding.List(data) : new WinJS.Binding.List(createData(size)));
    }

    function createTestDataSource(size, data?) {
        // Populate a data array
        if (!data) {
            data = createData(size);
        }

        // Create the datasource
        var controller = {
            directivesForMethod: function (method, args) {
                var implementedNotifications = ["insertAtIndex", "changeAtIndex", "removeAtIndex"];
                if (-1 !== implementedNotifications.indexOf(method)) {
                    return {
                        callMethodSynchronously: true,
                        sendChangeNotifications: true,
                        countBeforeDelta: 0,
                        countAfterDelta: 0,
                        countBeforeOverride: -1,
                        countAfterOverride: -1
                    };

                } else {
                    return {
                        callMethodSynchronously: true,
                        sendChangeNotifications: false,
                        countBeforeDelta: 0,
                        countAfterDelta: 0,
                        countBeforeOverride: -1,
                        countAfterOverride: -1
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

        return Helper.ItemsManager.createTestDataSource(data, controller, abilities);
    }

    function testLayout(layoutName) {
        var placeholder1 = document.getElementById("test1"),
            placeholder2 = document.getElementById("test2"),
            expectedLayout = WinJS.UI[layoutName],
            listView1 = new ListView(placeholder1, { layout: { type: expectedLayout } }),
            listView2 = new ListView(placeholder2, { layout: new expectedLayout() });

        Helper.ListView.validateListView(listView1);
        Helper.ListView.validateListView(listView2);
        LiveUnit.Assert.isTrue(listView1.layout instanceof expectedLayout);
        LiveUnit.Assert.isTrue(listView2.layout instanceof expectedLayout);
        LiveUnit.Assert.isTrue(listView1._horizontal() === (layoutName.indexOf("GridLayout") == 0));
        LiveUnit.Assert.isTrue(listView2._horizontal() === (layoutName.indexOf("GridLayout") == 0));
    }

    export class InitializationTests {


        // This setup function will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "InitializationTests";
            newNode.innerHTML =
            "<div id='test1' style='width:600px;height:400px;'></div>" +
            "<div id='test2' style='width:600px;height:400px;'></div>";
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

        // Test listView initialization with an invalid element like H1


        // Tests listView initialization with grid layout
        testGridLayout = function (complete) {
            LiveUnit.LoggingCore.logComment("In testGridLayout");
            testLayout("GridLayout");
            complete();
        }

        // Tests listView initialization with list layout
        testListLayout = function (complete) {
            LiveUnit.LoggingCore.logComment("In testListLayout");
            testLayout("ListLayout");
            complete();
        };

        // Tests default values of listView properties after initialization
        testInitializationDefaults = function (complete) {
            LiveUnit.LoggingCore.logComment("In testInitializationDefaults");

            var testElement = document.getElementById("test1"),
                listView = new WinJS.UI.ListView(testElement),
                defaults = Helper.ListView.defaultOptions();

            LiveUnit.Assert.isTrue(listView.layout instanceof WinJS.UI.GridLayout);
            for (var param in defaults) {
                LiveUnit.Assert.isTrue(listView[param] === defaults[param]);
            }
            complete();
        };

        // Regression test for WinBlue: 104695
        //
        testPassLayoutInConstructorOptionsDifferentFromDefault = function (complete) {
            var bl = createBindingList(400),
                groupBl = bl.createGrouped(groupKey, groupData),
                updateLayoutCalledCount = 0,
                oldUpdateLayout = ListView.prototype._updateLayout;

            ListView.prototype._updateLayout = function () {
                updateLayoutCalledCount++;
                oldUpdateLayout.call(this);
            };

            var element = document.getElementById("test1"),
                listView = new WinJS.UI.ListView(element, {
                    itemDataSource: groupBl.dataSource,
                    itemTemplate: Helper.ListView.templates.syncJSTemplate,
                    groupDataSource: groupBl.groups.dataSource,
                    groupHeaderTemplate: Helper.ListView.templates.syncJSTemplate,
                    layout: new WinJS.UI.ListLayout()
                });

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    LiveUnit.Assert.areEqual(1, updateLayoutCalledCount, "ListView_updateLayout should be called only once when a layout is passed it the constructor options");
                    ListView.prototype._updateLayout = oldUpdateLayout;
                }).
                done(complete, function (er) {
                    throw er;
                });
        };
    }

    (function () {
        function generateTest(gids, gds, layout, testPrefix) {
            function generateTest1(action) {
                return function (complete) {
                    var element = document.getElementById("test1"),
                        listView = new WinJS.UI.ListView(element, {
                            itemDataSource: gids,
                            itemTemplate: Helper.ListView.templates.syncJSTemplate,
                            groupDataSource: gds,
                            groupHeaderTemplate: Helper.ListView.templates.syncJSTemplate,
                            layout: layout
                        });

                    Helper.ListView.waitForReady(listView)().
                        then(function () {
                            action();
                        }).
                        then(Helper.ListView.waitForReady(listView)).
                        done(complete, function (er) {
                            throw er;
                        });
                };
            }

            InitializationTests.prototype["test" + testPrefix + "SetItemDataSource"] = generateTest1(function () {
                var elem = document.getElementById("test1"),
                    lv = elem.winControl;

                if (lv.itemDataSource) {
                    lv.itemDataSource = lv.itemDataSource;
                } else {
                    LiveUnit.Assert.fail("ItemDataSource is not set");
                }
            });
            InitializationTests.prototype["test" + testPrefix + "SetItemTemplate"] = generateTest1(function () {
                var elem = document.getElementById("test1"),
                    lv = elem.winControl;

                if (lv.itemTemplate) {
                    lv.itemTemplate = lv.itemTemplate;
                } else {
                    LiveUnit.Assert.fail("ItemTemplate is not set");
                }
            });
            InitializationTests.prototype["test" + testPrefix + "SetGroupHeaderTemplate"] = generateTest1(function () {
                var elem = document.getElementById("test1"),
                    lv = elem.winControl;

                if (lv.groupHeaderTemplate) {
                    lv.groupHeaderTemplate = lv.groupHeaderTemplate;
                }
            });
            InitializationTests.prototype["test" + testPrefix + "SetGroupDataSource"] = generateTest1(function () {
                var elem = document.getElementById("test1"),
                    lv = elem.winControl;

                if (lv.groupDataSource) {
                    lv.groupDataSource = lv.groupDataSource;
                }
            });
            InitializationTests.prototype["test" + testPrefix + "SetLayout"] = generateTest1(function () {
                var elem = document.getElementById("test1"),
                    lv = elem.winControl;

                if (lv.layout) {
                    lv.layout = lv.layout;
                } else {
                    LiveUnit.Assert.fail("Layout is not set");
                }
            });
        }

        var bl = createBindingList(400),
            groupBl = bl.createGrouped(groupKey, groupData),
            vds = createTestDataSource(400),
            groupVds = WinJS.UI.computeDataSourceGroups(vds, groupKey, groupData);

        // Since these test reassign the control properties to the same value, there
        // are no changes to underlying. Hence we should be able to reuse the datasources
        // across tests.

        // TODO: Add tests for Multisize grid and multisize grouped grid layout

        generateTest(groupBl.dataSource, groupBl.groups.dataSource, { type: WinJS.UI.GridLayout }, "GroupedGridLayoutBindingList");
        generateTest(groupBl.dataSource, groupBl.groups.dataSource, { type: WinJS.UI.ListLayout }, "GroupedListLayoutBindingList");
        generateTest(groupBl.dataSource, null, { type: WinJS.UI.GridLayout }, "GridLayoutBindingList");
        generateTest(groupBl.dataSource, null, { type: WinJS.UI.ListLayout }, "ListLayoutBindingList");

        generateTest(groupVds, groupVds.groups, { type: WinJS.UI.GridLayout }, "GroupedGridLayoutVDS");
        generateTest(groupVds, groupVds.groups, { type: WinJS.UI.ListLayout }, "GroupedListLayoutVDS");
        generateTest(groupVds, null, { type: WinJS.UI.GridLayout }, "GridLayoutVDS");
        generateTest(groupVds, null, { type: WinJS.UI.ListLayout }, "ListLayoutVDS");
    })();


    function generateWithoutElement(layoutName) {
        InitializationTests.prototype["testWithoutElement" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            function checkTile(listview, index, left, top) {
                var tile = listview.elementFromIndex(index),
                    container = Helper.ListView.containerFrom(tile);
                LiveUnit.Assert.areEqual("Tile" + index, tile.textContent);
                LiveUnit.Assert.areEqual(left, Helper.ListView.offsetLeftFromSurface(listview, container));
                LiveUnit.Assert.areEqual(top, Helper.ListView.offsetTopFromSurface(listview, container));
            }

            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    label: "Tile" + i
                });
            }

            var list = new WinJS.Binding.List(data);
            var listView = new WinJS.UI.ListView(null, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.label;
                        element.style.width = element.style.height = "100px";
                        return element;
                    });
                }
            });

            listView.element.style.width = "300px";
            listView.element.style.height = "300px";
            testRootEl.appendChild(listView.element);

            Helper.ListView.runTests(listView, [
                function () {
                    checkTile(listView, 0, 0, 0);
                    checkTile(listView, 1, 0, 100);
                    checkTile(listView, 2, 0, 200);
                    checkTile(listView, 3, 100, 0);

                    testRootEl.removeChild(listView.element);
                    complete();
                }
            ]);
        };
    };
    generateWithoutElement("GridLayout");

    // Tests listView initialization with empty datasource
    function generateEmptyDataSource(layoutName) {
        InitializationTests.prototype["testEmptyDataSource" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            LiveUnit.LoggingCore.logComment("In testEmptyDataSource");

            var testElement = document.getElementById("test1"),
                listView = new WinJS.UI.ListView(testElement, { layout: new WinJS.UI[layoutName](), itemDataSource: new WinJS.Binding.List().dataSource });

            Helper.ListView.validateListView(listView);
            complete();
        };
    };
    generateEmptyDataSource("GridLayout");

    function generateItemsAccess(layoutName) {
        InitializationTests.prototype["testItemsAccess" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            LiveUnit.LoggingCore.logComment("In testItemsAccess");

            var element = document.getElementById("test1"),
                size = 13,
                myData = [],
                listView,
                counter;

            for (var i = 0; i < size; ++i) {
                myData.push("<div>index: " + i + "</div>");
            }

            var list = new WinJS.Binding.List(myData);
            listView = new WinJS.UI.ListView(element, { layout: new WinJS.UI[layoutName](), itemDataSource: list.dataSource });

            function bind(index) {
                return LiveUnit.GetWrappedCallback(function dataAvailable(item) {
                    LiveUnit.Assert.areEqual("<div>index: " + index + "</div>", item.data);

                    if (--counter === 0) {
                        complete();
                    }
                });
            }

            function countAvailable(count) {
                LiveUnit.Assert.areEqual(size, count);

                counter = count;
                for (var i = 0; i < count; ++i) {
                    listView.itemDataSource.itemFromIndex(i).then(bind(i));
                }
            }
            listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(countAvailable));
        };
    };
    generateItemsAccess("GridLayout");

    function generateEventHandlers(layoutName) {
        InitializationTests.prototype["testEventHandlers" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var myData = [];
            for (var i = 0; i < 10; ++i) {
                myData.push({ title: "Tile" + i });
            }
            var newNode = document.createElement("div");
            newNode.style.width = "1000px";
            newNode.style.height = "600px";
            testRootEl.appendChild(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: (new WinJS.Binding.List(myData)).dataSource
            });

            var handlerCount = 0;
            listView.addEventListener("selectionchanged", function (eventObject) {
                handlerCount++;
            });
            listView.onselectionchanged = function (eventObject) {
                handlerCount++;
            };

            Helper.ListView.runTests(listView, [
                function () {
                    listView.selection.set([0]);
                    LiveUnit.Assert.areEqual(2, handlerCount);
                    testRootEl.removeChild(newNode);
                    complete();
                }
            ]);
        };
    };
    generateEventHandlers("GridLayout");

    function generateRendererValidations(layoutName) {
        InitializationTests.prototype["testRendererValidation" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var element = document.createElement("div");
            testRootEl.appendChild(element);

            // The order of controls is invalid. Template is instantiated after ListView.
            element.innerHTML = '<div class="rendererValidationListView" data-win-control="WinJS.UI.ListView" data-win-options="{ itemTemplate: select(' + "'" + '.rendererValidationTemplate' + "'" + '), layout: {type: WinJS.UI.' + layoutName + '}}" ></div>' +
            '<div class="rendererValidationTemplate" data-win-control="WinJS.Binding.Template"><div data-win-bind="textContent: title"></div></div>';

            var originalValidation = WinJS.validation;
            WinJS.validation = true;

            function cleanup() {
                element.parentNode.removeChild(element);
                WinJS.validation = originalValidation;
            }

            WinJS.UI.processAll(element).done(
                function () {
                    LiveUnit.Assert.fail("ProcessAll shouldn't succeed");
                },
                function (error) {
                    LiveUnit.Assert.areEqual("WinJS.UI.ListView.invalidTemplate", error.name);
                    cleanup();
                    complete();
                }
                );
        };
    };
    generateRendererValidations("GridLayout");

    function generateKeysValidation(layoutName) {
        InitializationTests.prototype["testKeysValidation" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            testRootEl.appendChild(element);

            function createDataSource() {
                var count = 1000;

                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        return new WinJS.Promise(function (complete, error) {
                            if (index >= 0 && index < count) {
                                var startIndex = Math.max(0, index - countBefore),
                                    endIndex = Math.min(index + countAfter, count - 1),
                                    size = endIndex - startIndex + 1;

                                var items = [];
                                for (var i = startIndex; i < startIndex + size; i++) {
                                    items.push({
                                        key: i + 1, // this is wrong. Key needs to be a string
                                        data: {
                                            label: "Tile" + i
                                        }
                                    });
                                }

                                complete({
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: count,
                                    absoluteIndex: index
                                });
                            } else {
                                complete({});
                            }
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.wrap(count);
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var originalValidation = WinJS.validation;
            WinJS.validation = true;

            function cleanup() {
                element.parentNode.removeChild(element);
                WinJS.validation = originalValidation;
            }

            function errorHandler(error) {
                LiveUnit.Assert.areEqual("WinJS.UI.ListDataSource.KeyIsInvalid", error.detail.exception.name);

                WinJS.Promise.removeEventListener("error", errorHandler);
                cleanup();
                complete();
            };

            WinJS.Promise.addEventListener("error", errorHandler);

            var listView = new WinJS.UI.ListView(element, { layout: new WinJS.UI[layoutName](), itemDataSource: createDataSource() });
        };
    };
    generateKeysValidation("GridLayout");

    function generateSwitchingDataSourceDuringGetCount(layoutName) {
        InitializationTests.prototype["testSwitchingDataSourceDuringGetCount" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            function createDataSource() {
                var count = 1000;

                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        return new WinJS.Promise(function (complete, error) {
                            if (index >= 0 && index < count) {
                                var startIndex = Math.max(0, index - countBefore),
                                    endIndex = Math.min(index + countAfter, count - 1),
                                    size = endIndex - startIndex + 1;

                                var items = [];
                                for (var i = startIndex; i < startIndex + size; i++) {
                                    items.push({
                                        key: (i + 1).toString(),
                                        data: {
                                            label: "Tile" + i
                                        }
                                    });
                                }

                                complete({
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: count,
                                    absoluteIndex: index
                                });
                            } else {
                                complete({});
                            }
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.timeout(100).then(function () {
                            return count;
                        });
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            Helper.initUnhandledErrors();

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            testRootEl.appendChild(element);

            var listView = new WinJS.UI.ListView(element, { layout: new WinJS.UI[layoutName](), itemDataSource: createDataSource() });
            WinJS.Promise.timeout(50).
                then(function () {
                    var myData = [];
                    for (var i = 0; i < 100; ++i) {
                        myData.push({ title: "Tile" + i });
                    }
                    listView.itemDataSource = (new WinJS.Binding.List(myData)).dataSource;
                }).
                then(Helper.ListView.waitForReady(listView, 100)).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {
                    element.parentNode.removeChild(element);
                    complete();
                });
        };
    };
    generateSwitchingDataSourceDuringGetCount("GridLayout");
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.InitializationTests");
