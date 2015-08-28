// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var testRootEl;
    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    function parent(element) {
        testRootEl.appendChild(element);
        return function () { testRootEl.removeChild(element); };
    }

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    export class ListViewRegression {


        setUp() {
            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }

        testWin8_342083(complete) {
            var div = document.createElement("DIV");
            var cleanup = parent(div);
            WinJS.Promise.as().then(function () {
                var lv = new WinJS.UI.ListView(div);
            }).
                then(null, errorHandler).
                then(cleanup).
                then(complete);

        }

        testWin8_312074(complete) {

            function createDataSource(steps) {
                var count = 100,
                    step = 0;

                var dataSource = {
                    itemsFromKey: function (key, countBefore, countAfter) {
                        return this.itemsFromIndex(parseInt(key, 10), countBefore, countAfter);
                    },

                    itemsFromIndex: function (index, countBefore, countAfter) {

                        var requestedCount = countBefore + countAfter + 1;
                        return WinJS.Promise.timeout(100).then(function () {

                            return new WinJS.Promise(function (complete, error) {
                                if (step < steps.length) {
                                    count = steps[step];
                                    step++;
                                }

                                if (index >= 0 && index < count) {
                                    var startIndex = Math.max(0, index - countBefore),
                                        endIndex = Math.min(index + Math.max(20, countAfter), count - 1),
                                        size = endIndex - startIndex + 1;

                                    var items = [];
                                    for (var i = startIndex; i < startIndex + size; i++) {
                                        var groupid = Math.floor(i / 8);
                                        items.push({
                                            key: i.toString(),
                                            data: {
                                                group: groupid,
                                                title: groupid + " Lorem Ispum Dolor " + i
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
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.timeout(100).then(function () {
                            return WinJS.Promise.wrap(count);
                        });
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var tests = [{
                steps: [26]
            }, {
                    steps: [75, 26]
                }
                // TODO: Uncomment when 363030 is fixed
                //            , {
                //                steps: [13]
                //            }
            ];

            function runTest(t) {
                if (t < tests.length) {
                    var test = tests[t];

                    var newNode = document.createElement("div");
                    newNode.style.width = "1000px";
                    newNode.style.height = "600px";
                    var cleanup = parent(newNode);
                    var listView = new WinJS.UI.ListView(newNode, {
                        layout: new WinJS.UI.GridLayout(),
                        itemDataSource: createDataSource(test.steps),
                        itemTemplate: function (itemPromise) {
                            function worker(item) {
                                if (item) {
                                    var element = document.createElement("div");
                                    element.textContent = item.data.title;
                                    element.style.width = element.style.height = "100px";
                                    return element;
                                } else {
                                    return null;
                                }
                            }
                            return WinJS.Promise.as(itemPromise).then(worker);
                        }
                    });

                    var whenComplete = function whenComplete() {
                        if (listView.loadingState === "complete") {
                            listView.removeEventListener("loadingstatechanged", whenComplete, false);
                            cleanup();
                            runTest(t + 1);
                        }
                    };

                    listView.addEventListener("loadingstatechanged", whenComplete, false);
                } else {
                    complete();
                }
            }

            runTest(0);
        }

        testWin8_370759(complete) {

            function createDataSource() {
                var count = 500,
                    returned = -1;

                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        return WinJS.Promise.timeout(100).then(function () {
                            return new WinJS.Promise(function (complete, error) {
                                var startIndex = Math.max(0, index - countBefore),
                                    endIndex = Math.min(index + 20, count - 1),
                                    size = endIndex - startIndex + 1;

                                var items = [];
                                for (var i = startIndex; i < startIndex + size; i++) {
                                    var groupid = Math.floor(i / 8),
                                        text = groupid + " Lorem Ispum Dolor " + i;

                                    if (i <= returned) {
                                        text = "Changed";
                                    }

                                    items.push({
                                        key: i.toString(),
                                        data: {
                                            group: groupid,
                                            title: text
                                        }
                                    });
                                }

                                returned = endIndex;

                                complete({
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: count,
                                    absoluteIndex: index
                                });
                            });
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.timeout(100).then(function () {
                            return WinJS.Promise.wrap(count);
                        });
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var newNode = document.createElement("div");
            newNode.style.width = "1000px";
            newNode.style.height = "600px";
            var cleanup = parent(newNode);
            var listView = new ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: createDataSource(),
                itemTemplate: function (itemPromise) {
                    function worker(item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.title;
                        element.style.width = element.style.height = "100px";
                        return element;
                    }
                    return itemPromise.then(worker);
                }
            });

            var counter = 0,
                range;

            function readyStateHandler(eventObject) {
                if (listView.loadingState === "complete") {
                    var sl = listView.scrollPosition;
                    if (!range) {
                        range = listView._canvas[listView._scrollLength];
                    }
                    if ((sl + 1000 < range) && (++counter < 10)) {
                        listView.scrollPosition = sl + 1000;
                    } else {
                        listView.removeEventListener("loadingstatechanged", readyStateHandler, false);
                        cleanup();
                        complete();
                    }
                }
            }

            listView.addEventListener("loadingstatechanged", readyStateHandler, false);
        }

        testWin8_595149(complete) {
            var items = [];
            for (var i = 0; i < 100; i++) {
                items.push({ title: "Tile" + i });
            }
            var list = new WinJS.Binding.List(items);

            var elements = [];

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element;
                    if (elements[item.index]) {
                        element = elements[item.index];
                    } else {
                        element = document.createElement("div");
                        elements[item.index] = element;
                    }
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "600px";
            newNode.style.height = "600px";
            var cleanup = parent(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: renderer
            });

            function checkTile(listview, index, text) {
                var tile = listview.elementFromIndex(index);
                LiveUnit.Assert.areEqual(text, tile.textContent);
            }

            var tests = [
                function () {
                    checkTile(listView, 0, "Tile0");
                    checkTile(listView, 1, "Tile1");
                    list.setAt(0, { title: "Changed" });
                    return true;
                },
                function () {
                    checkTile(listView, 0, "Changed");
                    checkTile(listView, 1, "Tile1");
                    cleanup();
                    complete();
                },
            ];
            Helper.ListView.runTests(listView, tests);
        }

        testWin8_725480(complete) {
            var items = [{
                group: "A",
                title: "Tile" + 0
            }];

            var list = new WinJS.Binding.List(items);

            function groupKey(data) {
                return data.group;
            }

            function groupData(data) {
                return {
                    title: data.group
                };
            }

            var myGroupedList = list.createGrouped(groupKey, groupData);

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "700px";
            newNode.style.height = "700px";
            var cleanup = parent(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: renderer,
                groupHeaderTemplate: renderer
            });

            function checkTile(listview, index, text) {
                var tile = listview.elementFromIndex(index);
                LiveUnit.Assert.areEqual(text, tile.textContent);
            }

            function addTile(label) {
                var dataSource = listView.itemDataSource;
                dataSource.beginEdits();
                list.push({
                    group: "A",
                    title: label
                });
                dataSource.endEdits();
            }

            Helper.ListView.waitForReady(listView)().then(function () {
                checkTile(listView, 0, "Tile0");

                addTile("Tile1");
                listView.forceLayout();
                addTile("Tile2");
                addTile("Tile3");
                listView.forceLayout();

                return WinJS.Promise.timeout();
            }).then(function () {

                    addTile("Tile4");
                    listView.forceLayout();
                    addTile("Tile5");
                    addTile("Tile6");
                    listView.forceLayout();

                    return WinJS.Promise.timeout(50);
                }).then(function () {

                    checkTile(listView, 0, "Tile0");
                    checkTile(listView, 6, "Tile6");
                    cleanup();
                    complete();
                });
        }


        testWin8_769820(complete) {

            var items = [],
                tiles = [];
            for (var i = 0; i < 100; i++) {
                items.push({ title: "Item" + i });
                tiles.push({ title: "Tile" + i });
            }

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "600px";
            newNode.style.height = "600px";
            var cleanup = parent(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: (new WinJS.Binding.List(items)).dataSource,
                itemTemplate: renderer
            });

            function checkTile(listview, index, text) {
                var tile = listview.elementFromIndex(index);
                LiveUnit.Assert.areEqual(text, tile.textContent);
            }

            function whenComplete() {
                if (listView.loadingState === "complete") {
                    listView.removeEventListener("loadingstatechanged", whenComplete, false);

                    checkTile(listView, 0, "Item0");

                    listView.itemDataSource = (new WinJS.Binding.List(tiles)).dataSource;
                    WinJS.Utilities._setImmediate(function () {
                        // template is changed while fadeOut animation is in progress
                        listView.itemTemplate = renderer;
                        listView.forceLayout();
                        Helper.ListView.whenLoadingComplete(listView, function () {
                            checkTile(listView, 0, "Tile0");
                            cleanup();
                            complete();
                        });
                    });
                }
            }

            listView.addEventListener("loadingstatechanged", whenComplete, false);
        }

        testWin8_930766(complete) {
            var count = 500;

            var rendererCalled = [],
                rendererSignals = [];

            for (var i = 0; i < count; i++) {
                var signal = new WinJS._Signal();
                rendererSignals.push(signal);
                rendererCalled.push(signal.promise);
            }

            function createDataSource() {
                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        var startIndex = index,
                            size = 2;

                        var items = [];
                        for (var i = startIndex; (i < startIndex + size) && (i < count); i++) {
                            rendererSignals[i].complete();
                            items.push({
                                key: i.toString(),
                                data: {
                                    title: "Item" + i
                                }
                            });
                        }

                        return WinJS.Promise.timeout(100).then(function () {
                            return new WinJS.Promise(function (complete, error) {
                                complete({
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: count,
                                    absoluteIndex: index
                                });
                            });
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.wrap(count);
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }


            function renderer(itemPromise, recycledElement) {
                var element = recycledElement;

                if (!element) {
                    element = document.createElement("div");
                    element.appendChild(document.createElement("div"));
                    element.style.width = element.style.height = "100px";
                }

                LiveUnit.Assert.isTrue(element.hasChildNodes(), "Renderer has received a corrupted recycledElement");

                return itemPromise.then(function (item) {
                    element.children[0].textContent = item.data.title;
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "300px";
            newNode.style.height = "301px";
            var cleanup = parent(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: createDataSource(),
                itemTemplate: renderer
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                // this causes items from 45-53 to be rendered and releases items 0-5. Since there is more items to render than released items, items 51-53 will be rendered without recycling
                listView.scrollPosition = 850;
                return WinJS.Promise.join(rendererCalled.slice(45, 54));
            }).then(function () {
                    // items 51-53 aren't yet rendered. ListView is waiting for data. Forcing scrolling at this point.
                    // This cancel the previous realizePass which is waiting for data for items 51-53 and starts a new realizePass.
                    // In middle of this new realize pass data for items 51-53 is delivered and items pool reuses wrappers corrupting items in in the pool
                    LiveUnit.Assert.areEqual("itemsLoading", listView.loadingState);
                    listView.scrollPosition = 4500;
                }).then(Helper.ListView.waitForReady(listView)).then(function () {
                    cleanup();
                    complete();
                });
        }


        testWinBlue_148641(complete) {
            var items = [],
                tiles = [];
            for (var i = 0; i < 100; i++) {
                items.push({ title: "Item" + i });
                tiles.push({ title: "Tile" + i });
            }

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "600px";
            newNode.style.height = "600px";
            var cleanup = parent(newNode);
            var listView = new ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: (new WinJS.Binding.List(items)).dataSource,
                itemTemplate: renderer
            });
            var newTabIndex = 999,
                completed = false;
            function whenComplete() {
                if (listView.loadingState === "complete") {
                    listView.removeEventListener("loadingstatechanged", whenComplete, false);
                    var realOnPropertyChangeHandler = listView._onPropertyChange.bind(listView);
                    listView._onPropertyChange = function (list) {
                        realOnPropertyChangeHandler(list);
                        list.forEach(function (record) {
                            if (!completed && record.attributeName === "tabIndex") {
                                LiveUnit.Assert.areEqual(listView.element.tabIndex, -1);
                                LiveUnit.Assert.areEqual(listView.elementFromIndex(0).tabIndex, newTabIndex);
                                completed = true;
                                complete();
                            }
                        });
                    };
                    listView.element.tabIndex = newTabIndex;
                }
            }

            listView.addEventListener("loadingstatechanged", whenComplete, false);
        }

        testWinBlue_256523(complete) {
            var items = [];
            for (var i = 0; i < 100; i++) {
                items.push({
                    title: "Item" + i,
                    group: Math.floor(i / 10).toString(),
                });
            }
            var list = new WinJS.Binding.List(items);

            function groupKey(data) {
                return data.group;
            }

            function groupData(data) {
                return {
                    title: data.group
                };
            }

            var myGroupedList = list.createGrouped(groupKey, groupData);

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "600px";
            newNode.style.height = "600px";

            var cleanup = parent(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: renderer,
                groupHeaderTemplate: renderer
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                listView.ensureVisible(99);
                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                    listView.itemDataSource = null;
                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    listView.scrollPosition = 100;
                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    cleanup();
                    complete();
                });
        }

        testWinBlue_389800_EnsureVisibleOnHiddenListViewRTL(complete) {
            Helper.initUnhandledErrors();

            var lv = document.createElement("div");
            lv.setAttribute("dir", "rtl")
        testRootEl.appendChild(lv);

            function renderer(itemPromise) {
                var e = document.createElement("div");
                e.style.width = e.style.height = "100px";
                itemPromise.then(function (item) {
                    e.style.backgroundColor = "";
                    e.textContent = item.data.title;
                });
                return e;
            }

            var items = [];
            for (var i = 0; i < 3000; i++) {
                items.push({
                    title: "Tile" + i
                });
            }
            var list = new WinJS.Binding.List(items);

            var listView = new WinJS.UI.ListView(lv, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: new WinJS.UI.GridLayout()
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                lv.style.display = "none";
                listView.ensureVisible(100);

                Helper.ListView.waitForDeferredAction(listView)().then(function () {
                    Helper.validateUnhandledErrors();
                    testRootEl.removeChild(lv);
                    complete();
                });
            });
        }


    }
    
    var disabledTestRegistry = {
        testWin8_725480: Helper.BrowserCombos.all,
        testWinBlue_148641: Helper.BrowserCombos.allButIE11
    };
    Helper.disableTests(ListViewRegression, disabledTestRegistry);
}

LiveUnit.registerTestClass("WinJSTests.ListViewRegression");