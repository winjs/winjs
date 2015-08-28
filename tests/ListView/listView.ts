// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var defaultDisableCustomPagesPrefetch;
    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    function parent(element) {
        document.body.appendChild(element);
        return function () {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        };
    }

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    function getRandomColor() {
        return "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
    }

    // A renderer which checks that, upon receiving focus, the item's ARIA attributes
    // are up-to-date for a Narrator announcement. The only attributes that are needed
    // for a Narrator announcement are:
    // - role
    // - aria-posinset
    // - aria-setsize
    function createFocusCheckingRenderer(listViewElement) {
        function onFocusForItem(eventObject) {
            var item = eventObject.target,
                lv = listViewElement.winControl,
                index = lv._view.items.index(item);
            LiveUnit.Assert.areEqual(lv._itemRole, item.getAttribute("role"), "Item should have an up-to-date role before receiving focus");
            LiveUnit.Assert.areEqual((index + 1).toString(), item.getAttribute("aria-posinset"), "Item should have an up-to-date aria-posinset before receiving focus");
            LiveUnit.Assert.areEqual("100", item.getAttribute("aria-setsize"), "Item should have an up-to-date aria-setsize before receiving focus");
        }

        function focusCheckingRenderer(itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement("div");
                element.id = item.data.title;
                element.style.width = item.data.itemWidth;
                element.style.height = item.data.itemHeight;
                element.innerHTML = item.data.title;
                element.addEventListener("focus", onFocusForItem, false);
                return element;
            });
        }

        return focusCheckingRenderer;
    }

    function testFailingDataAdptor(validator, layoutName, failWhen, errorName, failingItem, async?, groups?, suffix?) {

        function createDataSource(failWhen, error, failingItem, async) {
            function asyncPromise() {
                return async ? WinJS.Promise.timeout() : WinJS.Promise.wrap();
            }

            var itemsCount = 100,
                previousError,
                listDataAdaptor = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        var startIndex = Math.max(0, index - countBefore),
                            size = Math.max(countBefore + 1, 3);

                        var items = [];
                        for (var i = startIndex; i < startIndex + size; i++) {
                            items.push({
                                key: i.toString(),
                                data: {
                                    title: "Tile" + i,
                                    group: Math.floor(i / 7)
                                }
                            });
                        }

                        return asyncPromise().then(function () {
                            if (previousError === "noResponse" || (failWhen === "itemsFromIndex" && startIndex <= failingItem && failingItem <= (startIndex + size - 1))) {
                                previousError = error;
                                return WinJS.Promise.wrapError(new WinJS.ErrorFromName(error));
                            } else {
                                return WinJS.Promise.wrap({
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: previousError ? failingItem : itemsCount,
                                    absoluteIndex: index
                                });
                            }
                        });
                    },

                    getCount: function () {
                        return asyncPromise().then(function () {
                            if (failWhen === "getCount" || previousError === "noResponse") {
                                return WinJS.Promise.wrapError(new WinJS.ErrorFromName(error));
                            } else {
                                return WinJS.Promise.wrap(previousError ? failingItem : itemsCount);
                            }
                        });
                    }
                };

            return new WinJS.UI.ListDataSource(listDataAdaptor);
        }


        ListViewTests.prototype["test" + upFirstChar(failWhen) + failingItem.toString() + "FailsWith" + upFirstChar(errorName) + "In" + suffix + (groups ? "WithGroups" : "") + (async ? "Async" : "")] = function (complete) {

            Helper.initUnhandledErrors();

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var dataSource = createDataSource(failWhen, errorName, failingItem, async);

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = "100px";
                    element.style.height = "100px";
                    return element;
                });
            }

            var listView;
            if (groups) {
                var groupedDataSource = createGroupedVDS(dataSource);

                listView = new WinJS.UI.ListView(element, {
                    layout: new WinJS.UI[layoutName](),
                    itemDataSource: groupedDataSource,
                    groupDataSource: groupedDataSource.groups,
                    groupHeaderTemplate: renderer,
                    itemTemplate: renderer
                });

            } else {
                listView = new WinJS.UI.ListView(element, {
                    layout: new WinJS.UI[layoutName](),
                    itemDataSource: dataSource,
                    itemTemplate: renderer
                });
            }


            validator(listView).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {
                    element.winControl.dispose();
                    document.body.removeChild(element);
                    complete();
                });
        };
    }

    function upFirstChar(str) {
        return str.charAt(0).toUpperCase() + str.substr(1);
    }

    function createGroupedVDS(vds) {
        return WinJS.UI.computeDataSourceGroups(vds,
            function (item) {
                return item.data.group.toString();
            }, function (item) {
                return {
                    title: item.data.group.toString()
                };
            }
            );
    }

    function defaultGetGroupInfo() {
        return {
            enableCellSpanning: true,
            cellWidth: 100,
            cellHeight: 100
        };
    }

    function completeValidator(listView) {
        return Helper.ListView.waitForReady(listView)().then(function () {
            LiveUnit.Assert.areEqual(0, document.querySelectorAll(".win-progress").length, "Progress indicator visible");
        });
    }

    function scrollAndCompleteValidator(scrollTo) {
        return function (listView) {
            return Helper.ListView.waitForReady(listView)().then(function () {
                return listView.ensureVisible(scrollTo);
            }).then(function () {
                    LiveUnit.Assert.areEqual(0, document.querySelectorAll(".win-progress").length, "Progress indicator visible");
                });
        }
    }

    export class ListViewTests {


        setUp() {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 5;
            defaultDisableCustomPagesPrefetch = WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = defaultDisableCustomPagesPrefetch;
        }

        testForceLayoutSavesContainers = function (complete) {
            var listViewEl = document.createElement("DIV");
            document.body.appendChild(listViewEl);
            listViewEl.style.cssText = "height: 100px; width: 100px;";

            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    id: i,
                    title: "Item" + i
                });
            }
            var bindingList = new WinJS.Binding.List(data);
            var groupedList = bindingList.createGrouped(function (item) {
                return "" + Math.floor(item.id / 10);
            }, function (item) {
                    var groupId = Math.floor(item.id / 10);
                    return {
                        id: groupId,
                        title: "Group" + groupId
                    };
                })

        var listView = new WinJS.UI.ListView(listViewEl, {
                itemDataSource: groupedList.dataSource,
                groupDataSource: groupedList.groups.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("DIV");
                        element.style.cssText = "width: 75px; height: 75px";
                        element.textContent = item.data.title;
                        element.style.backgroundColor = getRandomColor();
                        return element;
                    });
                },
                groupHeaderTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("DIV");
                        element.style.cssText = "width: 75px; height: 75px";
                        element.textContent = item.data.title;
                        element.style.backgroundColor = getRandomColor();
                        return element;
                    });
                }
            });

            var tests = [
                function () {
                    listViewEl.querySelector('.win-container')['expando'] = "woot1";
                    listViewEl.querySelector('.win-groupheadercontainer')['expando'] = "woot2";
                    listView.forceLayout();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual("woot1", listViewEl.querySelector('.win-container')['expando'], "Same item container");
                    LiveUnit.Assert.areEqual("woot2", listViewEl.querySelector('.win-groupheadercontainer')['expando'], "Same group header container");
                    complete();
                }
            ];

            Helper.ListView.runTests(listView, tests);
        };


        testCurrentItemChangesPivot = function (complete) {
            var listViewEl = document.createElement("DIV");
            document.body.appendChild(listViewEl);
            listViewEl.style.cssText = "height: 100px; width: 100px;";
            var listView = new ListView(listViewEl, {
                itemDataSource: new WinJS.Binding.List([
                    { title: 'a' },
                    { title: 'b' },
                    { title: 'c' },
                    { title: 'd' },
                    { title: 'e' },
                    { title: 'f' },
                    { title: 'g' },
                    { title: 'h' }
                ]).dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("DIV");
                        element.style.cssText = "width: 75px; height: 75px";
                        element.textContent = item.data.title;
                        return element;
                    });
                }
            });

            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(-1, listView.selection._pivot, "Pivot started off at -1");
                    listView.currentItem = { index: 1 };
                    LiveUnit.Assert.areEqual(1, listView.selection._pivot, "Pivot moved to 1");
                    listView.itemDataSource._list.unshift({ title: "i" });
                    LiveUnit.Assert.areEqual(1, listView.selection._pivot, "Pivot still stayed");
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(2, listView.selection._pivot, "Pivot moved after unshift");
                    listView.itemDataSource._list.unshift({ title: "j" });
                    LiveUnit.Assert.areEqual(2, listView.selection._pivot, "Pivot still stayed again");
                    listView.currentItem = { index: 1 };
                    LiveUnit.Assert.areEqual(1, listView.selection._pivot, "Pivot moved to 1 again");
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(1, listView.selection._pivot, "Pivot didn't move after unshift :-)");
                    complete();
                }
            ];

            Helper.ListView.runTests(listView, tests);
        };

        testListViewDispose = function (complete) {
            var dispose = function () {
                if (this.disposed) {
                    LiveUnit.Assert.fail("Disposed was called again.");
                }
                this.disposed = true;
                itemsAlive--;
            };

            var data = [1, 2, 3, 4, 5, 6, 7];
            var list = new WinJS.Binding.List(data);
            var itemsAlive = 0;

            var lv = new WinJS.UI.ListView();
            lv.element.id = "lv";
            document.body.appendChild(lv.element);
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data;
                    WinJS.Utilities.addClass(div, "win-disposable");
                    div.dispose = dispose.bind(div);
                    itemsAlive++;
                    return div;
                });
            };
            lv.addEventListener("loadingstatechanged", function () {
                LiveUnit.Assert.isTrue(itemsAlive > 1);
                var element = lv.element;
                lv.dispose();
                LiveUnit.Assert.areEqual(itemsAlive, 0, "At least one element wasn't cleaned up.");
                document.body.removeChild(element);
                complete();
            });

            lv.itemDataSource = list.dataSource;
        };

        testEnsureVisibleWithVeryLargeItems = function (complete) {
            var data = [];
            for (var i = 0; i < 20; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);

            var lv = new ListView();
            lv.itemDataSource = list.dataSource;
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.height = "50px";
                    div.style.width = "5000px";
                    return div;
                });
            };
            document.body.appendChild(lv.element);
            lv.ensureVisible({ type: WinJS.UI.ObjectType.item, index: 0 });
            var scrollPosition;
            Helper.ListView.waitForReady(lv)().then(function () {
                scrollPosition = lv.scrollPosition;
                lv.ensureVisible({ type: WinJS.UI.ObjectType.item, index: 0 });
                return Helper.ListView.waitForReady(lv, -1)();
            }).done(function () {
                    LiveUnit.Assert.areEqual(scrollPosition, lv.scrollPosition);
                    complete();
                });
        };

        testDisposeDuringReloadRaceCondition = function (complete) {
            var data = [];
            for (var i = 0; i < 20; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var filtered = list.createFiltered(function (item) {
                return true;
            });

            var lv = new WinJS.UI.ListView();
            lv.itemDataSource = filtered.dataSource;
            document.body.appendChild(lv.element);

            Helper.ListView.waitForReady(lv)().done(function () {
                filtered.dispose();
                document.body.removeChild(lv.element);
                lv.dispose();
                WinJS.Utilities._setImmediate(complete);
            });
        };

        testFocusDuringGroupDataSourceChanging = function (complete) {
            Helper.initUnhandledErrors();

            var data = [];
            for (var i = 0; i < 20; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 10) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 10) + "" };
                });

            var lv = new WinJS.UI.ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            document.body.appendChild(lv.element);

            Helper.ListView.waitForReady(lv)().
                then(function () {
                    lv.groupDataSource = glist.groups.dataSource;
                    lv.element.focus();

                    return Helper.ListView.waitForReady(lv, -1)();
                }).
                then(function () {
                    document.body.removeChild(lv.element);
                    lv.dispose();
                    return Helper.validateUnhandledErrorsOnIdle();
                }).
                done(complete);
        };

        testCorrectRangeInFirstColumnForHeaders = function (complete) {
            var data = [];
            for (var i = 0; i < 200; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 10) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 10) + "" };
                });

            var lv = new ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.innerHTML = item.data.data;
                    div.style.width = "200px";
                    div.style.height = "200px";
                    return div;
                });
            };
            document.body.appendChild(lv.element);
            Helper.ListView.waitForReady(lv, -1)().then(function () {
                (<HTMLElement>lv.element.querySelector(".win-surface")).style.margin = "20px";
                lv.scrollPosition = 400;
                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    lv.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 0 });
                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.areEqual(0, lv.scrollPosition);
                    complete();
                });
        };

        testEnsureVisibleHeaderPartiallyOffscreen = function (complete) {
            var data = [];
            for (var i = 0; i < 20; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return item.data + "";
            }, function (item) {
                    return { data: item.data + "" };
                });

            var lv = new ListView();
            lv.element.style.width = "250px";
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;

            document.body.appendChild(lv.element);
            var groupWidth;
            var scrollPosition;
            Helper.ListView.waitForReady(lv, -1)().then(function () {
                // Add 70px because groupleaders have 70px margins
                groupWidth = (<HTMLElement>document.body.querySelector(".win-groupheadercontainer")).offsetWidth + 70;
                lv.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 10 });
                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    lv.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 2 });
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    // The 3rd header should be left aligned and the 4th header should be partially visible
                    scrollPosition = lv.scrollPosition;
                    lv.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 3 });
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(groupWidth >= Math.abs(lv.scrollPosition - scrollPosition), "View should not have scrolled more than the width of an entire group");
                    scrollPosition = lv.scrollPosition;
                    lv.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 4 });
                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(groupWidth >= Math.abs(lv.scrollPosition - scrollPosition), "View should not have scrolled more than the width of an entire group");
                    complete();
                });
        };

        testEnsureVisibleHeaderFullyVisibleGroupPartiallyOffscreen = function (complete) {
            var data = [];
            for (var i = 0; i < 30; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 3) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 3) + "" };
                });

            var lv = new ListView();
            lv.element.id = "EnsureVisibleHeaderTest";
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;

            document.body.appendChild(lv.element);
            Helper.ListView.waitForReady(lv, -1)().then(function () {
                lv.ensureVisible({ type: WinJS.UI.ObjectType.groupHeader, index: 1 });
                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    LiveUnit.Assert.areEqual(0, lv.scrollPosition, "GroupHeader 1 is fully visible and no scrolling should have occured.");
                    complete();
                });
        };


        // Verifies that when the data source is synchronous, the item promises that are passed to the
        // item renderer are complete at the time that the renderer is called.
        // Regression test for WinBlue#225665.
        testCollapsingOfStages0And1 = function (complete) {
            var rendererRan = false;

            function basicRenderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.style.width = item.data.itemWidth;
                    element.style.height = item.data.itemHeight;
                    element.innerHTML = item.data.title;
                    return element;
                });
            }

            function verifyingRenderer(itemPromise) {
                var sync = false;
                itemPromise.then(function () {
                    sync = true;
                });
                LiveUnit.Assert.isTrue(sync, "itemPromise should have completed synchronously");
                rendererRan = true;

                return basicRenderer(itemPromise);
            }

            var div = document.createElement("DIV"),
                cleanup = parent(div),
                myData = [],
                lv;

            div.style.width = "500px";
            div.style.height = "100px";

            for (var i = 0; i < 100; ++i) {
                myData.push({
                    title: "Tile" + i,
                    itemWidth: "100px",
                    itemHeight: "75px"
                });
            }

            lv = new WinJS.UI.ListView(div, {
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: verifyingRenderer
            });

            Helper.ListView.waitForReady(lv)().then(function () {
                LiveUnit.Assert.isTrue(rendererRan, "Item renderer should have ran");

                cleanup();
                complete();
            });
        };

        // Verifies that the app will not crash when the image loader is used, the image
        // load fails, and the app handles the error thru the loadImage promise.
        // Regression test for WinBlue#138768.
        testLoadImageError = function (complete) {
            Helper.initUnhandledErrors();

            function imageLoadingRenderer(itemPromise) {
                var el = document.createElement("div");
                var imgEl = document.createElement("img");
                el.appendChild(imgEl);
                el.style.width = "100px";
                el.style.height = "75px";
                el.style.backgroundColor = 'steelblue';
                return {
                    element: el,
                    renderComplete: itemPromise.then(function (item) {
                        return item.loadImage("foo", imgEl).then(function () {    // use image loader with a bad uri
                            LiveUnit.Assert.fail("Image should not have loaded successfully");
                        }, function () {
                                pendingImageCount--;
                            });
                    })
                };
            }

            var div = document.createElement("DIV"),
                cleanup = parent(div),
                pendingImageCount = 3,
                lv;

            div.style.width = "500px";
            div.style.height = "100px";

            lv = new WinJS.UI.ListView(div, {
                itemDataSource: new WinJS.Binding.List(['', '', '']).dataSource,
                itemTemplate: imageLoadingRenderer
            });

            Helper.ListView.waitForReady(lv, -1)().
                then(function () {
                    LiveUnit.Assert.areEqual(0, pendingImageCount, "All of the images should have errored");
                    lv.itemDataSource.change("0", '');
                    return Helper.ListView.waitForReady(lv, -1)();
                }).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {
                    cleanup();
                    complete();
                });
        };

        // Verifies that LayoutCommon's measuring code properly handles a synchronous resize. In other
        // words, when reading from the DOM in the middle of the measuring function, user code may run
        // (resize handlers) which invalidates the state of ListView's layout. The measuring code should
        // handle this.
        // Regression test for WinBlue#390892
        testResizeDuringMeasuring = function (complete) {
            Helper.initUnhandledErrors();

            function onResize() {
                lv.layout = makeLayout();
            }

            function makeLayout() {
                return new WinJS.UI.GridLayout();
            }

            function cleanUp() {
                lv._elementResizeInstrument.removeEventListener("resize", onResize);
                unparent();
            }

            var div = document.createElement("DIV"),
                unparent = parent(div),
                myData = [],
                lv: WinJS.UI.PrivateListView<any>;

            div.style.width = "500px";
            div.style.height = "100px";

            for (var i = 0; i < 100; ++i) {
                myData.push({
                    title: "Tile" + i,
                    itemWidth: "100px",
                    itemHeight: "75px"
                });
            }

            lv = <WinJS.UI.PrivateListView<any>> new WinJS.UI.ListView(div, {
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: Helper.ListView.templates.syncJSTemplate,
                layout: makeLayout()
            });

            Helper.ListView.waitForReady(lv)().then(function () {
                var layout = <WinJS.UI.PrivateListLayout>lv.layout,
                    origMeasureItem = layout._measureItem;

                lv._elementResizeInstrument.addEventListener("resize", onResize);
                // Hook the measuring function so that we can cause resize handlers to run in the middle of it.
                layout._measureItem = function () {
                    layout._measureItem = origMeasureItem;
                    lv.element.style.width = "510px";
                    return layout._measureItem.apply(this, arguments);
                }
            // Trigger a layout & measuring pass. During measuring, we will trigger resize handlers to run.
            lv.itemDataSource = lv.itemDataSource;
                lv.recalculateItemPosition();

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    return Helper.validateUnhandledErrorsOnIdle();
                }).then(null, function () {
                }).then(function () {
                    cleanUp();
                    complete();
                });
        };

        // Verifies that the cell spanning measuring code in GridLayout properly handles a
        // synchronous resize. In other words, when reading from the DOM in the middle of the
        // measuring function, user code may run (resize handlers) which invalidates the state
        // of ListView's layout. The measuring code should handle this. This affects WinJS.UI.GridLayouts
        // with cell spanning groups which use the default itemInfo function.
        // Regression test for WinBlue#384025.
        testResizeDuringCellSpanningMeasuring = function (complete) {
            if (!Helper.Browser.supportsCSSGrid) {
                LiveUnit.LoggingCore.logComment("Cellspanning layout not supported on this platform.");
                complete();
                return;
            }

            Helper.initUnhandledErrors();

            function onResize() {
                lv.layout = makeLayout();
            }

            function groupInfo() {
                return {
                    enableCellSpanning: true,
                    cellWidth: 100,
                    cellHeight: 75
                };
            }

            function makeLayout() {
                return new WinJS.UI.GridLayout({
                    groupInfo: groupInfo
                });
            }

            function verifyContainer(data) {
                var container = lv._view.containers[data.index];
                LiveUnit.Assert.areEqual(data.textContent, container.textContent.trim(),
                    "win-container " + data.index + " has incorrect textContent");
                LiveUnit.Assert.areEqual(data.offsetLeft, container.offsetLeft,
                    "win-container " + data.index + " has incorrect offsetLeft");
                LiveUnit.Assert.areEqual(data.offsetTop, container.offsetTop,
                    "win-container " + data.index + " has incorrect offsetTop");
            }

            function cleanUp() {
                lv._elementResizeInstrument.removeEventListener("resize", onResize);
                unparent();
            }

            var div = document.createElement("DIV"),
                unparent = parent(div),
                myData = [],
                lv: WinJS.UI.PrivateListView<any>;

            div.style.width = "500px";
            div.style.height = "100px";

            for (var i = 0; i < 100; ++i) {
                myData.push({
                    title: "Tile" + i,
                    itemWidth: "100px",
                    itemHeight: "75px"
                });
            }

            lv = <WinJS.UI.PrivateListView<any>> new WinJS.UI.ListView(div, {
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: Helper.ListView.templates.syncJSTemplate,
                layout: makeLayout()
            });

            Helper.ListView.waitForReady(lv)().then(function () {
                var layout = <WinJS.UI.PrivateListLayout>lv.layout,
                    origMeasureElements = layout._measureElements;

                lv._elementResizeInstrument.addEventListener("resize", onResize);
                // Hook the measuring function so that we can cause resize handlers to run in the middle of it.
                layout._measureElements = function () {
                    layout._measureElements = origMeasureElements;
                    // Schedule a job to do a resize immediately before the measuring job runs
                    // (_measureElements schedules its measuring in a job at high).
                    WinJS.Utilities.Scheduler.schedulePromiseHigh().then(function () {
                        lv.element.style.width = "510px";
                    });
                    return layout._measureElements.apply(this, arguments);
                }
            // Trigger a layout & measuring pass. During measuring, we will trigger resize handlers to run.
            lv.itemDataSource.list.unshift({
                    title: "NewTile0",
                    itemWidth: "100px",
                    itemHeight: "75px"
                });

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    return Helper.validateUnhandledErrorsOnIdle();
                }).then(function () {
                    verifyContainer({
                        index: 0,
                        textContent: "NewTile0",
                        offsetLeft: 5,
                        offsetTop: 5
                    });
                    verifyContainer({
                        index: 1,
                        textContent: "Tile0",
                        offsetLeft: 115,
                        offsetTop: 5
                    });
                }).done(function () {
                    cleanUp();
                    complete();
                });
        };

        testDeleteBeforeListViewLoadingStateComplete = function (complete) {
            Helper.initUnhandledErrors();

            function render(item) {
                var div = document.createElement("div");
                div.textContent = item.data.title;
                div.style.width = div.style.height = "300px";
                return div;
            };

            var data = [1, 2, 3];
            var list = new WinJS.Binding.List(data);

            var lv = new ListView();
            lv.itemDataSource = list.dataSource;
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item): any {
                    if (item.index <= 1) {
                        return render(item);
                    } else {
                        return new WinJS.Promise(function (c) {
                            setTimeout(function () {
                                c(render(item));
                            }, 1500);
                        });
                    }
                });
            };
            document.body.appendChild(lv.element);

            setTimeout(function () {
                lv.currentItem = { type: WinJS.UI.ObjectType.item, index: 0, hasFocus: true, showFocus: true };
                lv.itemDataSource.list.shift();
                Helper.ListView.waitForReady(lv, -1)().
                    then(Helper.validateUnhandledErrorsOnIdle).
                    done(complete);
            }, 1000);
        };

        //WinBlue: 297330
        xtestMirageHandling = function (complete) {
            Helper.initUnhandledErrors();

            var dataSourceImpl = {
                itemsFromIndex: function (index, countBefore, countAfter) {
                    var startIndex = Math.max(0, index - countBefore),
                        endIndex = Math.min(index + countAfter, 999);

                    var items = [];
                    for (var i = startIndex; i < 10 && i <= endIndex; i++) {
                        items.push({
                            key: i.toString(),
                            data: {
                                title: "Tile" + i
                            }
                        });
                    }

                    return WinJS.Promise.timeout().then(function () {
                        return {
                            items: items,
                            offset: index - startIndex,
                            totalCount: endIndex >= 10 ? 10 : 1000,
                            absoluteIndex: index
                        };
                    });
                },

                getCount: function () {
                    return WinJS.Promise.wrap(1000);
                }
            };

            var element = document.createElement("DIV");
            element.style.width = element.style.height = "500px";
            document.body.appendChild(element);

            var listView = new WinJS.UI.ListView(element, {
                itemDataSource: new WinJS.UI.ListDataSource(dataSourceImpl),
                itemTemplate: function (itemPromise) {
                    var e = document.createElement("div");
                    itemPromise.then(function (item) {
                        e.textContent = item.data.title;
                    });
                    return e;
                }
            });

            Helper.ListView.waitForReady(listView)().
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {
                    element.winControl.dispose();
                    document.body.removeChild(element);
                    complete();
                });
        };

        testFocusHeaderBeforeAnyAreRendered = function () {
            var data = [];
            for (var i = 0; i < 30; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 3) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 3) + "" };
                });

            var lv = new ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            document.body.appendChild(lv.element);

            // To make listView delegate focus to a header, we want to shift-tab
            // into the listView, the detail field in the eventArgs on tabEntered
            // specifies the tab direction, 0 is shift-tab, 1 is tab.
            lv._mode.onTabEntered({ detail: 0, srcElement: lv._canvas, preventDefault: function () { } });

            document.body.removeChild(lv.element);
            lv.dispose();
        };



        testUpdaterDoesNotIncorrectlyChangesFocusIndex = function (complete) {
            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return "1";
            }, function (item) {
                    return { data: "1" };
                });

            var lv = new ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            document.body.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                lv._mode.onTabEntered({ detail: 0, preventDefault: function () { } });

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    glist.dataSource.insertAtStart(null, { data: "new" });

                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    lv._mode.onTabEntered({ detail: 1, srcElement: lv._canvas, preventDefault: function () { } });

                    document.body.removeChild(lv.element);
                    lv.dispose();

                    complete();
                });
        };

        testTabbingAfterDeletingAllGroupsDoesNotCrash = function (complete) {
            var data = [];
            for (var i = 0; i < 1; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return "0";
            }, function (item) {
                    return { data: "0" };
                });

            var lv = new ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            document.body.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                lv._mode.onTabEntered({ detail: 0, preventDefault: function () { } });

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    glist.dataSource.remove("0");

                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    lv._mode.onTabEntered({ detail: 1, srcElement: lv._canvas, preventDefault: function () { } });

                    document.body.removeChild(lv.element);
                    lv.dispose();

                    complete();
                });
        };

        testSetScrollPositionToHighValidValueBeforeAllContainersAreCreated = function (complete) {
            var data = [];
            for (var i = 0; i < 1000; i++) {
                data.push({
                    title: i
                });
            }
            var element = document.createElement("div");
            element.style.width = "600px";
            element.style.height = "600px";
            document.body.appendChild(element);

            var listView = new ListView(element, {
                itemDataSource: new WinJS.Binding.List(data).dataSource,
                itemTemplate: function (itemPromise) {
                    var div = document.createElement("div");
                    div.style.width = "100px";
                    div.style.height = "100px";
                    return {
                        element: div,
                        renderComplete: itemPromise.then(function (item) {
                            div.textContent = item.data.title;
                        })
                    };
                }
            });

            // In this test even on a fast machine we want to ensure that we create containers in multiple stages
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = -1;

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);

                // pause the tree creation
                jobNode.pause();
                return jobNode;
            };

            Helper.ListView.waitForReady(listView, -1)().done(function () {
                // calculate a scroll position beyond the current valid scroll position
                var scrollValue = listView._viewport.scrollWidth + 1000;

                // resumes tree creation
                jobNode.resume();

                listView.scrollPosition = scrollValue;
                Helper.ListView.waitForReady(listView, -1)().done(function () {
                    LiveUnit.Assert.areEqual(scrollValue, listView.scrollPosition, "The scroll position is invalid");
                    complete();
                });
            });
        };

        testDataSourceCancelGetCountPromises = function (complete) {
            Helper.initUnhandledErrors();

            var placeholder = document.createElement("div");
            placeholder.style.width = placeholder.style.height = "300px";
            document.body.appendChild(placeholder);

            var signal = new WinJS._Signal();

            function createDataSource() {
                var COUNT = 4;

                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        return new WinJS.Promise(function (complete) {
                            if (index >= 0 && index < COUNT) {
                                var startIndex = Math.max(0, index - countBefore),
                                    endIndex = Math.min(index + Math.max(20, countAfter), COUNT - 1),
                                    size = endIndex - startIndex + 1;

                                var items = [];
                                for (var i = startIndex; i < startIndex + size; i++) {
                                    items.push({
                                        key: i.toString(),
                                        data: {
                                            title: i
                                        }
                                    });
                                }

                                complete({
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: COUNT,
                                    absoluteIndex: index
                                });
                            } else {
                                complete({});
                            }
                        });
                    },

                    getCount: function () {
                        return signal.promise.then(function () {
                            return COUNT;
                        });
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var list,
                listView = new WinJS.UI.ListView(placeholder, {
                    itemDataSource: createDataSource(),
                    itemTemplate: function render(itemPromise) {
                        var elem = document.createElement("div");
                        elem.style.backgroundColor = "blue";
                        elem.style.width = elem.style.height = "90px";
                        itemPromise.then(function (item) {
                            elem.textContent = item.data.title;
                        });
                        return elem;
                    }
                });

            WinJS.Promise.timeout(100).then(function () {
                var data = [];
                for (var i = 0; i < 15; i++) {
                    data.push({
                        title: i
                    });
                }
                list = new WinJS.Binding.List(data);
                listView.itemDataSource = list.dataSource;
                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                    LiveUnit.Assert.areEqual(15, placeholder.querySelectorAll('.win-container').length);

                    signal.complete();

                    list.shift();
                    list.push({
                        title: "NewItem"
                    });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(Helper.validateUnhandledErrorsOnIdle).done(function () {
                    document.body.removeChild(placeholder);
                    complete();
                });
        };



    }

    function generateBug17087(layoutName) {
        ListViewTests.prototype["testBug17087" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var listViewEl = document.createElement("DIV");
            document.body.appendChild(listViewEl);
            listViewEl.style.cssText = "height: 100px; width: 100px;";
            var listView = new WinJS.UI.ListView(listViewEl, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: new WinJS.Binding.List([
                    { title: 'a' },
                    { title: 'b' },
                    { title: 'c' },
                    { title: 'd' },
                    { title: 'e' },
                    { title: 'f' },
                    { title: 'g' },
                    { title: 'h' }
                ]).dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("DIV");
                        element.style.cssText = "width: 75px; height: 75px";
                        element.textContent = item.data.title;
                        return element;
                    });
                }
            });

            // This causes us to get an error in the scrollToPromise.
            // We should probably retry the scrollToPromise to get to 3 once
            // we are able to get a height/width. However currently we just
            // claim this is not supported and the app should recall indexOfFirstVisible
            // themselves.
            listViewEl.style.display = "none";
            listView.indexOfFirstVisible = 3;

            listViewEl.addEventListener('loadingstatechanged', function (ev) {
                if (listView.loadingState === "complete") {
                    if (listView.indexOfFirstVisible === -1) {
                        listViewEl.style.display = "block";
                        // With bug 17087 we would not actually do another realize pass
                        // because we had a bad scrollToPromise.
                        listView.forceLayout();
                    } else {
                        WinJS.Utilities.disposeSubTree(listViewEl);
                        document.body.removeChild(listViewEl);
                        complete();
                    }
                }
            });
        };
    };
    generateBug17087("GridLayout");

    function generateListViewInstantiation(layoutName) {
        ListViewTests.prototype["testListViewInstantiation" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var div = document.createElement("DIV");
            var cleanup = parent(div);

            WinJS.Promise.wrap().then(function () {
                var lv = new WinJS.UI.ListView(div, {
                    layout: new WinJS.UI[layoutName]()
                });
            }).
                then(null, errorHandler).
                then(cleanup).
                then(complete);
        };
    };
    generateListViewInstantiation("GridLayout");


    // When the viewport has focus and the focused item becomes unrealized, ensure
    // that the viewport maintains focus (rather than moving focus to the
    // keyboardEventsHelper).
    // This is important when scrolling with Narrator Touch. During scrolling,
    // Narrator Touch moves focus to the viewport and we want to leave focus
    // on the viewport for a seamless scrolling experience.
    // Also ensure that when the focused item is re-realized, its ARIA attributes are
    // updated and then it receives focus.
    function generateViewportFocus(layoutName) {
        ListViewTests.prototype["testViewportFocus" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var div = document.createElement("DIV"),
                cleanup = parent(div),
                myData = [],
                lv;

            div.style.width = "500px";
            div.style.height = "100px";

            for (var i = 0; i < 100; ++i) {
                myData.push({
                    title: "Tile" + i,
                    itemWidth: "100px",
                    itemHeight: "75px"
                });
            }

            lv = new WinJS.UI.ListView(div, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: createFocusCheckingRenderer(div)
            });
            // Give focus to ListView so that item 0 will receive focus
            div.focus();

            Helper.ListView.waitForDeferredAction(lv)().then(function () {
                LiveUnit.Assert.isTrue(!!lv.elementFromIndex(0), "Item 0 is not in the DOM");
                LiveUnit.Assert.areEqual(lv.elementFromIndex(0), document.activeElement, "Item 0 doesn't have focus");
                // Give the viewport focus to simulate the scrolling scenario in Narrator Touch
                lv._viewport.focus();
                // Scroll 10 pages so that the focused item becomes unrealized and ListView must
                // decide where to put the focus.
                lv.scrollPosition = 5000;

                return Helper.ListView.waitForDeferredAction(lv)();
            }).then(function () {
                    LiveUnit.Assert.isFalse(!!lv.elementFromIndex(0), "Item 0 is in the DOM");
                    LiveUnit.Assert.areEqual(lv._viewport, document.activeElement, "Viewport doesn't have focus");

                    // Scroll back to the beginning so that the focused item will become realized and receive focus
                    lv.scrollPosition = 0;

                    return Helper.ListView.waitForDeferredAction(lv)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(lv.elementFromIndex(0), document.activeElement, "Item 0 doesn't have focus after scrolling to the beginning");
                    cleanup();
                    complete();
                });
        };
    };
    generateViewportFocus("GridLayout");

    function generateInsertAtEndOnHiddenListView(layoutName) {
        ListViewTests.prototype["testInsertAtEndOnHiddenListView" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            Helper.initUnhandledErrors();

            function generateRenderer(size) {
                return function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.title;
                        element.style.width = element.style.height = size;
                        return element;
                    });
                }
            }

            function groupKey(data) {
                return data.group.toString();
            }

            function groupData(data) {
                return {
                    title: data.group.toString()
                };
            }

            var list = new WinJS.Binding.List([{ title: "Tile0", group: "0" }]);
            var myGroupedList = list.createGrouped(groupKey, groupData);
            var placeholder = document.createElement("DIV");
            document.body.appendChild(placeholder);

            var listView = new WinJS.UI.ListView(placeholder, {
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: new WinJS.UI[layoutName](),
            });

            var completed = 0;
            listView.addEventListener('loadingstatechanged', function (ev) {
                if (listView.loadingState === 'complete') {
                    completed++;
                    listView.element.style.display = "none";
                    if (completed === 1) {
                        listView.itemDataSource.insertAtEnd(null, { group: "0", title: "Tile 1" });
                        WinJS.Utilities._setImmediate(function () {
                            Helper.validateUnhandledErrorsOnIdle().
                                done(function () {
                                    WinJS.Utilities.disposeSubTree(placeholder);
                                    document.body.removeChild(placeholder);
                                    complete();
                                });
                        });
                    }
                }
            });
        };
    };
    generateInsertAtEndOnHiddenListView("GridLayout");

    // Ensure that if the focused item is changed one or more times in a
    // notification cycle, then it retains focus.
    function generateChangeFocusedItem(layoutName) {
        ListViewTests.prototype["testChangeFocusedItem" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var newTileCounter = 0;
            function currentTitle() {
                return "NewTile" + newTileCounter;
            }
            function newItem() {
                newTileCounter++;
                return {
                    title: currentTitle(),
                    itemWidth: "100px",
                    itemHeight: "75px"
                };
            }

            var div = document.createElement("DIV"),
                cleanup = parent(div),
                myData = [],
                lv;

            div.style.width = "500px";
            div.style.height = "100px";

            for (var i = 0; i < 100; ++i) {
                myData.push({
                    title: "Tile" + i,
                    itemWidth: "100px",
                    itemHeight: "75px"
                });
            }

            lv = new WinJS.UI.ListView(div, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: new WinJS.Binding.List(myData).dataSource,
                itemTemplate: createFocusCheckingRenderer(div)
            });

            var tests = [
                function () {
                    // Give focus to item 1
                    lv.currentItem = { index: 1, hasFocus: true };
                    LiveUnit.Assert.areEqual(lv.elementFromIndex(1), document.activeElement, "Item 1 doesn't have focus");

                    // Ensure focused item retains focus after being changed
                    lv.itemDataSource.change("1", newItem());
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(currentTitle(), lv.elementFromIndex(1).innerHTML, "Item 1 doesn't have correct title after change");
                    LiveUnit.Assert.areEqual(lv.elementFromIndex(1), document.activeElement, "Item 1 doesn't have focus after change");

                    // Ensure focused item retains focus after being changed multiple items in a notification cycle
                    lv.itemDataSource.beginEdits();
                    lv.itemDataSource.change("1", newItem());
                    lv.itemDataSource.change("1", newItem());
                    lv.itemDataSource.endEdits();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(currentTitle(), lv.elementFromIndex(1).innerHTML, "Item 1 doesn't have correct title after 2 changes");
                    LiveUnit.Assert.areEqual(lv.elementFromIndex(1), document.activeElement, "Item 1 doesn't have focus after 2 changes");
                    cleanup();
                    complete();
                }
            ];

            Helper.ListView.runTests(lv, tests);
        };
    };
    generateChangeFocusedItem("GridLayout");

    function generateListViewDisposeTest(layoutName) {
        ListViewTests.prototype["testListViewDispose" + layoutName] = function (complete) {
            var dispose = function () {
                if (this.disposed) {
                    LiveUnit.Assert.fail("Disposed was called again.");
                }
                this.disposed = true;
                itemsAlive--;
            };

            var data = [1, 2, 3, 4, 5, 6, 7];
            var list = new WinJS.Binding.List(data);
            var itemsAlive = 0;

            var lv = new WinJS.UI.ListView();
            WinJS.Application.start();
            lv.element.id = "lv";
            document.body.appendChild(lv.element);
            lv.layout = new WinJS.UI[layoutName]();
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data;
                    WinJS.Utilities.addClass(div, "win-disposable");
                    div.dispose = dispose.bind(div);
                    itemsAlive++;
                    return div;
                });
            };
            lv.addEventListener("loadingstatechanged", function () {
                LiveUnit.Assert.isTrue(itemsAlive > 1);
                var element = lv.element;
                lv.dispose();
                LiveUnit.Assert.areEqual(itemsAlive, 0, "At least one element wasn't cleaned up.");
                document.body.removeChild(element);
                WinJS.Utilities.Scheduler.requestDrain(WinJS.Utilities.Scheduler.Priority.idle).done(function () {
                    WinJS.Application.stop();
                    complete();
                });
            });

            lv.itemDataSource = list.dataSource;
        }
    };
    generateListViewDisposeTest("GridLayout");

    function generateListViewDisposeDuringVirtualizationTest(layoutName) {
        WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
        ListViewTests.prototype["testListViewDisposeDuringVirtualization" + layoutName] = function (complete) {
            var disposing = false;
            var dispose = function () {
                if (this.disposed && !disposing) {
                    LiveUnit.Assert.fail("Disposed was called again.");
                }
                this.disposed = true;
                itemsAlive--;

                var data = parseInt(this.textContent);
                if (!disposing && data > 4) {
                    LiveUnit.Assert.fail("Only items 0-4 should get disposed as we are scrolling to item 7, meaning items 5-9 should be alive");
                }
            };

            var data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
            var list = new WinJS.Binding.List(data);
            var itemsAlive = 0;

            var lv = new WinJS.UI.ListView();
            lv.element.id = "lv";
            document.body.appendChild(lv.element);
            var cs = window.getComputedStyle(lv.element);
            var height = cs.height;
            var width = cs.width;
            lv.layout = new WinJS.UI[layoutName]();
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data;
                    div.style.height = height;
                    div.style.width = width;
                    WinJS.Utilities.addClass(div, "win-disposable");
                    div.dispose = dispose.bind(div);
                    itemsAlive++;
                    return div;
                });
            };
            lv.itemDataSource = list.dataSource;

            Helper.ListView.waitForReady(lv)().then(function () {
                // Initialized, since each item should take up roughly the entire viewport, we should have 1 + 2xPagesToLoad pages alive.
                LiveUnit.Assert.areEqual(1 + 1 * WinJS.UI._VirtualizeContentsView._defaultPagesToPrefetch, itemsAlive);
                lv.ensureVisible(7);

                return Helper.ListView.waitForDeferredAction(lv)();
            }).then(function () {
                    // This is called after scrolling is done and items have been disposed, the current number of live items should be 1 + 2xPagesToLoad again.
                    LiveUnit.Assert.areEqual(1 + 2 * WinJS.UI._VirtualizeContentsView._defaultPagesToPrefetch, itemsAlive);
                    var element = lv.element;

                    disposing = true;
                    lv.dispose();
                    document.body.removeChild(element);
                    complete();
                });
        };
    };
    generateListViewDisposeDuringVirtualizationTest("GridLayout");

    function testFailingEdits(name, layoutName, error, action, async, groups, suffix) {

        function createDataSource() {
            function asyncPromise() {
                return async ? WinJS.Promise.timeout(10) : WinJS.Promise.wrap();
            }

            var itemsCount = 100,
                listDataAdaptor = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        var startIndex = Math.max(0, index - countBefore),
                            size = Math.max(countBefore + 1, 3);

                        var items = [];
                        for (var i = startIndex; i < startIndex + size; i++) {
                            items.push({
                                key: i.toString(),
                                data: {
                                    title: "Tile" + i,
                                    group: Math.floor(i / 7)
                                }
                            });
                        }

                        return asyncPromise().then(function () {
                            return {
                                items: items,
                                offset: index - startIndex,
                                totalCount: itemsCount,
                                absoluteIndex: index
                            };
                        });
                    },

                    getCount: function () {
                        return asyncPromise().then(function () {
                            return itemsCount;
                        });
                    },

                    insertBefore: function (key, data, nextKey) {
                        return asyncPromise().then(function () {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(error));
                        });
                    },

                    remove: function (key) {
                        return asyncPromise().then(function () {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(error));
                        });
                    },

                    change: function (key, newData) {
                        return asyncPromise().then(function () {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(error));
                        });
                    },

                    moveBefore: function (key, nextKey) {
                        return asyncPromise().then(function () {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(error));
                        });
                    },
                };

            return new WinJS.UI.ListDataSource(listDataAdaptor);
        }

        function checkTile(listview, index, text) {
            var tile = listview.elementFromIndex(index);
            LiveUnit.Assert.areEqual(text, tile.textContent);
        }

        ListViewTests.prototype["testFailDuring" + upFirstChar(name) + "With" + upFirstChar(error) + "In" + suffix + (groups ? "WithGroups" : "") + (async ? "Async" : "")] = function (complete) {

            Helper.initUnhandledErrors();

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var dataSource = createDataSource();

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = "100px";
                    element.style.height = "100px";
                    return element;
                });
            }

            var listView;
            if (groups) {
                var groupedDataSource = createGroupedVDS(dataSource);

                listView = new WinJS.UI.ListView(element, {
                    layout: new WinJS.UI[layoutName](),
                    itemDataSource: groupedDataSource,
                    groupDataSource: groupedDataSource.groups,
                    groupHeaderTemplate: renderer,
                    itemTemplate: renderer
                });

            } else {
                listView = new WinJS.UI.ListView(element, {
                    layout: new WinJS.UI[layoutName](),
                    itemDataSource: dataSource,
                    itemTemplate: renderer
                });
            }


            Helper.ListView.waitForReady(listView)().
                then(function () {
                    checkTile(listView, 0, "Tile0");
                    checkTile(listView, 1, "Tile1");
                    checkTile(listView, 2, "Tile2");

                    return action(listView.itemDataSource);
                }).
                then(function () {
                    return WinJS.Promise.timeout();
                }).
                then(function () {
                    return listView.itemDataSource.getCount();
                }).
                then(function (count) {
                    if (count) {
                        checkTile(listView, 0, "Tile0");
                        checkTile(listView, 1, "Tile1");
                        checkTile(listView, 2, "Tile2");
                    }
                    return Helper.validateUnhandledErrorsOnIdle();
                }).
                done(function () {
                    element.winControl.dispose();
                    document.body.removeChild(element);
                    complete();
                });
        };
    }

    function generateTest(validator, failWhen, error, failingItem) {
        testFailingDataAdptor(validator, "GridLayout", failWhen, error, failingItem, false, false, "UniformGrid");
        testFailingDataAdptor(validator, "GridLayout", failWhen, error, failingItem, true, false, "UniformGrid");
        if (Helper.Browser.supportsCSSGrid) {
            testFailingDataAdptor(validator, "GridLayout", failWhen, error, failingItem, false, false, "Multisize");
        }

        testFailingDataAdptor(validator, "GridLayout", failWhen, error, failingItem, false, true, "UniformGrid");
        testFailingDataAdptor(validator, "GridLayout", failWhen, error, failingItem, false, false, "UniformGrid");
        testFailingDataAdptor(validator, "GridLayout", failWhen, error, failingItem, true, false, "UniformGrid");
    }

    generateTest(completeValidator, "getCount", "noResponse", 0);
    ["noResponse", "doesNotExist"].forEach(function (error) {
        generateTest(completeValidator, "itemsFromIndex", error, 0);
        generateTest(completeValidator, "itemsFromIndex", error, 5);
        generateTest(scrollAndCompleteValidator(50), "itemsFromIndex", error, 50);
    });

    function generateEditTest(name, action) {
        ["noResponse", "notPermitted", "noLongerMeaningful"].forEach(function (error) {
            testFailingEdits(name, "GridLayout", error, action, false, false, "UniformGrid");
            testFailingEdits(name, "GridLayout", error, action, false, true, "UniformGrid");
            if (Helper.Browser.supportsCSSGrid) {
                testFailingEdits(name, "GridLayout", error, action, false, false, "Multisize");
            }
        })
    }

    generateEditTest("insert", function (dataSource) {
        return Helper.ListView.getDataObjects(dataSource, [1]).then(function (dataObjects) {
            return dataSource.insertBefore(null, { title: "NewTile" }, dataObjects[0].key);
        }).then(null, function () {
                // handle error
            });
    });

    generateEditTest("remove", function (dataSource) {
        return Helper.ListView.getDataObjects(dataSource, [1]).then(function (dataObjects) {
            return dataSource.remove(dataObjects[0].key);
        }).then(null, function () {
                // handle error
            });
    });

    generateEditTest("change", function (dataSource) {
        return Helper.ListView.getDataObjects(dataSource, [1]).then(function (dataObjects) {
            return dataSource.change(dataObjects[0].key, { title: "UpdatedTile" });
        }).then(null, function () {
                // handle error
            });
    });

    generateEditTest("move", function (dataSource) {
        return Helper.ListView.getDataObjects(dataSource, [0, 2]).then(function (dataObjects) {
            return dataSource.moveBefore(dataObjects[0].key, dataObjects[1].key);
        }).then(null, function () {
                // handle error
            });
    });

    function generateSetCurrentItemBeforeReady(type, index) {
        ListViewTests.prototype["testSetCurrentItemBeforeReady" + type + index] = function () {
            var data = [];
            for (var i = 0; i < 30; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 3) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 3) + "" };
                });

            var lv = new WinJS.UI.ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            document.body.appendChild(lv.element);

            lv.currentItem = { type: type, index: index };

            document.body.removeChild(lv.element);
            lv.dispose();
        };
    };
    generateSetCurrentItemBeforeReady(WinJS.UI.ObjectType.item, 0);
    generateSetCurrentItemBeforeReady(WinJS.UI.ObjectType.item, 2);
    generateSetCurrentItemBeforeReady(WinJS.UI.ObjectType.groupHeader, 0);
    generateSetCurrentItemBeforeReady(WinJS.UI.ObjectType.groupHeader, 2);

    (function cssTransformTests() {
        function push(obj, key, value) {
            if (obj[key] === undefined) {
                obj[key] = value;
            } else if (!(obj[key] instanceof Array)) {
                obj[key] = [obj[key], value];
            } else {
                obj[key].push(value);
            }
        }

        function parseCssTransform(transform) {
            var element = document.createElement("div");
            element.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName] = transform;
            transform = element.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName];
            var i = 0;

            function skipWhiteSpace() {
                while (i < transform.length && transform[i] === " ") {
                    i++;
                }
            }

            // In "scale(1.5) matrix3d(...)" returns "scale" and updates *i* to point to the
            // opening paren.
            function nextTransformName() {
                var start = i;
                if (i < transform.length) {
                    var end = transform.indexOf("(", i);
                    if (end >= 0 && end <= transform.length) {
                        i = end;
                        return transform.substring(start, end);
                    }
                }
                return null;
            }

            // In "(1.5) matrix3d(...)" returns "1.5" and updates *i* to point to
            // the characetr following the closing paren.
            function nextTransformValue() {
                var start = i + 1;
                if (transform[i] === "(" && start < transform.length) {
                    var end = transform.indexOf(")", start);
                    if (end >= 0 && end <= transform.length) {
                        i = end + 1;
                        return transform.substring(start, end);
                    }
                }
                return null;
            }

            var result: any = {};
            while (i < transform.length) {
                skipWhiteSpace();
                var name = nextTransformName();
                var value = nextTransformValue();
                if (typeof name === "string" && typeof value === "string") {
                    push(result, name, value);
                } else {
                    return null;
                }
            }
            return result;
        }
    })();
    
    var disabledTestRegistry = {
        testViewportFocus: Helper.Browsers.firefox
    };
    Helper.disableTests(ListViewTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("WinJSTests.ListViewTests");
