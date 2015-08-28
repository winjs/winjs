// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
// <reference path="../TestData/ListView.less.css" />
var VirtualizeContentsViewTestHost;
module WinJSTests {

    "use strict";

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;
    var ListLayout = <typeof WinJS.UI.PrivateListLayout> WinJS.UI.ListLayout;
    var SemanticZoom = <typeof WinJS.UI.PrivateSemanticZoom> WinJS.UI.SemanticZoom;

    var defaultDisableCustomPagesPrefetch;
    var defaultIsiOS;
    var BIG_DATASET = 15000,
        COUNT = 100,
        STRUCTURENODE_SIZE = 8;

    function initData(count?, groupSize?) {
        count = count || COUNT;
        groupSize = groupSize || 10;

        var items = [];
        for (var i = 0; i < count; ++i) {
            items[i] = {
                title: "Tile" + i,
                group: Math.floor(i / groupSize)
            };
        }
        return items;
    }

    function groupKey(data) {
        return data.group.toString();
    }

    function groupData(data) {
        return {
            title: data.group.toString()
        };
    }

    function createListViewElement(height?) {
        var element = document.createElement("div");
        element.style.width = "300px";
        element.style.height = height ? height : "300px";
        VirtualizeContentsViewTestHost.appendChild(element);
        return element;
    }

    function generateRenderer(size, prefix?) {
        return function (itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement("div");
                element.className = "myVVTestClass";
                element.textContent = prefix ? prefix + item.data.title : item.data.title;
                element.style.width = element.style.height = size;
                element.style.backgroundColor = "blue";
                return element;
            });
        }
    }

    function createPointerEvent(element) {
        var rect = element.getBoundingClientRect();
        return {
            target: element,
            button: WinJS.UI._LEFT_MSPOINTER_BUTTON,
            clientX: (rect.left + rect.right) / 2,
            clientY: (rect.top + rect.bottom) / 2,
            preventDefault: function () { }
        };
    }

    var testRootEl;
    var defaultChunkSize, defaultMaxTime, defaultPagesToPrefetch;

    function validateFlatTree(listView, expectedItemsPerBlock?) {
        expectedItemsPerBlock = expectedItemsPerBlock || STRUCTURENODE_SIZE;

        var containers;

        LiveUnit.Assert.areEqual(1, listView.element.querySelectorAll(".win-itemscontainer").length);
        LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll(".win-groupheadercontainer").length);

        if (!listView._view.tree[0].itemsContainer.itemsBlocks) {
            containers = listView.element.querySelectorAll(".win-container");

            LiveUnit.Assert.areEqual(listView.itemDataSource.list.length, containers.length);
            for (var i = 0, len = containers.length; i < len; i++) {
                var container = containers[i],
                    itemBox = container.firstElementChild;

                LiveUnit.Assert.areEqual(container, listView._view.containers[i]);

                if (itemBox) {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemBox, "win-itembox"));
                    LiveUnit.Assert.areEqual(listView.selection._isIncluded(i), WinJS.Utilities.hasClass(container, "win-selected"));
                    LiveUnit.Assert.areEqual(listView.selection._isIncluded(i), WinJS.Utilities.hasClass(itemBox, "win-selected"));
                } else {
                    LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(container, "win-selected"));
                }

                LiveUnit.Assert.areEqual(container, listView._view.tree[0].itemsContainer.items[i]);
            }

            LiveUnit.Assert.areEqual(containers.length - 1, listView._view.lastItemIndex());
        } else {
            var blocks = listView._view.tree[0].itemsContainer.itemsBlocks;
            for (var i = 0, itemIndex = 0, len = blocks.length; i < len; i++) {
                var block = blocks[i];

                LiveUnit.Assert.isTrue(i + 1 >= len || block.element.children.length === expectedItemsPerBlock);

                for (var n = 0; n < block.items.length; n++) {
                    LiveUnit.Assert.areEqual(listView._view.containers[itemIndex++], block.items[n]);
                }
            }
            verifyContainerStripesByIndex(listView);
        }
    }

    function verifyTreeUpdate(layout, validate, complete) {
        WinJS.UI._VirtualizeContentsView._chunkSize = 15;
        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;

        var placeholder = createListViewElement();

        var list = new WinJS.Binding.List(initData()),
            listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("50px"),
                layout: layout
            });

        listView.selection.set([0, 5, 10]);

        return Helper.ListView.waitForReady(listView)().then(function () {

            validate(listView);

            list.splice(9, 1);
            list.shift();
            list.shift();
            list.shift();
            list.unshift({
                title: "NewItem0",
                group: 0
            });

            return Helper.ListView.waitForReady(listView, -1)();
        }).then(function () {

                validate(listView);

                for (var i = 0; i < 10; i++) {
                    list.unshift({
                        title: "NI" + i,
                        group: 0
                    });
                }

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                validate(listView);

                while (list.length) {
                    list.pop();
                }

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                validate(listView);

                list.unshift({
                    title: "SNI",
                    group: 0
                });

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                validate(listView);

                placeholder.parentNode.removeChild(placeholder);

                complete();
            });
    }

    function validateGroupedTree(listView, expectedItemsPerBlock?) {
        expectedItemsPerBlock = expectedItemsPerBlock || STRUCTURENODE_SIZE;

        var containers,
            itemsContainers = listView.element.querySelectorAll(".win-itemscontainer"),
            headers = listView.element.querySelectorAll(".win-groupheadercontainer");

        LiveUnit.Assert.areEqual(listView.groupDataSource.list.length, itemsContainers.length);
        LiveUnit.Assert.areEqual(listView.groupDataSource.list.length, headers.length);

        if (!listView._view.tree[0].itemsContainer.itemsBlocks) {
            containers = listView.element.querySelectorAll(".win-container");

            LiveUnit.Assert.areEqual(listView.itemDataSource.list.length, containers.length);
            for (var i = 0, len = containers.length; i < len; i++) {
                var container = containers[i],
                    itemBox = container.firstElementChild;

                LiveUnit.Assert.areEqual(container, listView._view.containers[i]);

                if (itemBox) {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemBox, "win-itembox"));
                    LiveUnit.Assert.areEqual(listView.selection._isIncluded(i), WinJS.Utilities.hasClass(container, "win-selected"));
                    LiveUnit.Assert.areEqual(listView.selection._isIncluded(i), WinJS.Utilities.hasClass(itemBox, "win-selected"));
                } else {
                    LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(container, "win-selected"));
                }
            }


            LiveUnit.Assert.areEqual(containers.length - 1, listView._view.lastItemIndex());
        } else {
            verifyContainerStripesByIndex(listView);
        }

        var prevElement = listView.element.querySelector("._win-proxy");
        for (var i = 0, itemIndex = 0, blockIndex = 0, len = listView._view.tree.length; i < len; i++) {
            var group = listView._view.tree[i];

            LiveUnit.Assert.areEqual(headers[i], group.header);
            LiveUnit.Assert.areEqual(itemsContainers[i], group.itemsContainer.element);

            LiveUnit.Assert.areEqual(prevElement.nextElementSibling, group.header);
            LiveUnit.Assert.areEqual(group.header.nextElementSibling, group.itemsContainer.element);

            if (group.itemsContainer.itemsBlocks) {
                var blocks = group.itemsContainer.itemsBlocks;
                for (var j = 0; j < blocks.length; j++) {
                    var block = blocks[j];

                    LiveUnit.Assert.isTrue(j + 1 >= blocks.length || block.element.children.length === expectedItemsPerBlock);

                    for (var n = 0; n < block.items.length; n++) {
                        LiveUnit.Assert.areEqual(listView._view.containers[itemIndex++], block.items[n]);
                    }
                }
            } else {
                for (var n = 0; n < group.itemsContainer.items.length; n++) {
                    LiveUnit.Assert.areEqual(containers[itemIndex++], group.itemsContainer.items[n]);
                }
            }

            prevElement = group.itemsContainer.element;
        }
    }

    function verifyGroupedTreeUpdate(layout, validate, complete) {
        WinJS.UI._VirtualizeContentsView._chunkSize = 15;
        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;

        var placeholder = createListViewElement();

        var list = new WinJS.Binding.List(initData()),
            groupedList = list.createGrouped(groupKey, groupData),
            listView = new ListView(placeholder, {
                itemDataSource: groupedList.dataSource,
                groupDataSource: groupedList.groups.dataSource,
                itemTemplate: generateRenderer("50px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: layout
            });

        listView.selection.set([0, 10, 20]);

        return Helper.ListView.waitForReady(listView)().then(function () {

            validate(listView);

            list.splice(25, 1);
            list.splice(10, 10);
            list.unshift({
                title: "N1",
                group: 0
            });
            list.unshift({
                title: "N0",
                group: 0
            });

            return Helper.ListView.waitForReady(listView, -1)();
        }).then(function () {

                validate(listView);

                for (var i = 0; i < 5; i++) {
                    list.splice(12, 0, {
                        title: "A" + i,
                        group: 1
                    });
                }

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                validate(listView);

                for (var i = 0; i < 5; i++) {
                    list.unshift({
                        title: "B" + i,
                        group: -1
                    });
                }

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                listView.ensureVisible(list.length - 1);

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                validate(listView);

                for (var i = 0; i < 5; i++) {
                    list.push({
                        title: "C" + i,
                        group: 999
                    });
                }

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                validate(listView);

                placeholder.parentNode.removeChild(placeholder);

                complete();
            });
    }

    function validatePagesToPrefetch(listView, expectedLeadingPages, expectedTrailingPages, viewPortHeight) {
        var elementsPerPage, expectedRealizedCount;

        // Verify property getters return the correct value.
        LiveUnit.Assert.areEqual(expectedLeadingPages, listView.maxLeadingPages);
        LiveUnit.Assert.areEqual(expectedTrailingPages, listView.maxTrailingPages);

        return Helper.ListView.waitForReady(listView, -1)().then(function () {
            elementsPerPage = (listView.indexOfLastVisible - listView.indexOfFirstVisible) + 1

            // When we are at the top of the list (scroll:0), we should have the current viewport full of items + expectedLeadingPages pages ahead
            expectedRealizedCount = elementsPerPage + (expectedLeadingPages * elementsPerPage);
            LiveUnit.Assert.areEqual(expectedRealizedCount, listView.element.querySelectorAll(".win-container:not(.win-backdrop)").length);

            // Scroll to the bottom of the current viewport
            listView.scrollPosition = viewPortHeight;

            return Helper.ListView.waitForDeferredAction(listView)();
        }).then(function () {

            // When our scroll position = viewPortHeight, we should have the current viewport full of items + up to 1 page behind + expectedLeadingPages pages ahead
            expectedRealizedCount = (expectedTrailingPages > 0 ? elementsPerPage : 0)  /* up to 1 page behind*/  + elementsPerPage  /* viewport*/  + (expectedLeadingPages * elementsPerPage);
            LiveUnit.Assert.areEqual(expectedRealizedCount, listView.element.querySelectorAll(".win-container:not(.win-backdrop)").length);

            // Scroll down expectedLeadingPages viewports
            listView.scrollPosition = expectedLeadingPages * viewPortHeight;

            return Helper.ListView.waitForDeferredAction(listView)();
        }).then(function () {
            LiveUnit.Assert.areEqual(listView.indexOfFirstVisible, expectedLeadingPages * elementsPerPage);

            // Since we are scrolling downward, we optimize the front buffer, so we should have expectedTrailingPages pages behind + current viewport + expectedLeadingPages ahead
            expectedRealizedCount = (expectedTrailingPages * elementsPerPage) /* behind*/  + elementsPerPage  /* viewport*/  + (expectedLeadingPages * elementsPerPage);
            LiveUnit.Assert.areEqual(expectedRealizedCount, listView.element.querySelectorAll(".win-container:not(.win-backdrop)").length);
        });
    }

    function testLazyGroupedTreeCreation(data, complete) {
        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;

        var placeholder = createListViewElement();

        var list = new WinJS.Binding.List(data),
            groupedList = list.createGrouped(groupKey, groupData);

        var listView = new ListView(placeholder, {
            itemDataSource: groupedList.dataSource,
            groupDataSource: groupedList.groups.dataSource,
            itemTemplate: generateRenderer("100px"),
            groupHeaderTemplate: generateRenderer("50px"),
            layout: new WinJS.UI.ListLayout()
        });

        return Helper.ListView.waitForReady(listView)().then(function () {
            return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
        }).then(function () {
                validateGroupedTree(listView, ListLayout._numberOfItemsPerItemsBlock);

                placeholder.parentNode.removeChild(placeholder);
                complete();
            });
    }

    function waitForItemsLoaded(listView) {
        return new WinJS.Promise(function (complete) {
            function handler() {
                if (listView.loadingState === "itemsLoaded") {
                    listView.removeEventListener("loadingstatechanged", handler, false);
                    complete();
                }
            }

            listView.addEventListener("loadingstatechanged", handler, false);
        });
    }

    function generateAnimationInViewportPendingFlagTest(complete, firstIndexToInsert, expectedValue) {
        WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
        var element = document.createElement("div");
        element.style.width = "300px";
        element.style.height = "300px";
        VirtualizeContentsViewTestHost.appendChild(element);

        var list = createBindingList(100);
        var listView = new ListView(element, {
            layout: new WinJS.UI.ListLayout(),
            itemDataSource: list.dataSource,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (item) {
                    var el = document.createElement("div");
                    el.textContent = item.data.title;
                    el.style.height = "20px";
                    el.style.width = "417px";
                    el.className = item.data.className ? item.data.className : ""
                    return el;
                });
            }
        });
        Helper.ListView.waitForReady(listView)().then(function () {
            LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());

            var oldStartAnimations = listView._view._startAnimations;
            listView._view._startAnimations = function () {
                LiveUnit.Assert.areEqual(expectedValue, listView._view._hasAnimationInViewportPending);
                var promise = oldStartAnimations.call(listView._view);
                LiveUnit.Assert.isFalse(listView._view._hasAnimationInViewportPending);
                return promise;
            };
            for (var i = 0; i < 30; i++) {
                list.splice(firstIndexToInsert + i, 0, { title: "title New " + i, className: "new" });
            }

            Helper.ListView.waitForDeferredAction(listView)().then(function () {
                LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());
                VirtualizeContentsViewTestHost.removeChild(element);
                complete();
            });
        });
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

    function getNumberOfItemsRealized() {
        return document.querySelectorAll(".win-listview .win-itemscontainer .win-item").length;
    }

    function fixedSizeTemplate(itemPromise) {
        var el = document.createElement("div");
        el.style.height = "20px";
        el.style.width = "417px";
        itemPromise.then(function (item) {
            el.textContent = JSON.stringify(item.data);
        });
        return el;
    }

    function setupMailStyleListView() {
        var element = document.getElementById("testListView");
        var items = [];
        for (var i = 0; i < 1000; ++i) {
            items[i] = { title: "Tile" + i };
        }

        var dataSource;
        var controller = {
            directivesForMethod: function (method, args) {
                return {
                    callMethodSynchronously: false,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1,
                    delay: 10
                };
            }
        };
        dataSource = Helper.ItemsManager.createTestDataSource(items.slice(0), controller, null);

        return new ListView(element, {
            itemDataSource: dataSource,
            selectionMode: "multi",
            itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
            layout: new WinJS.UI.ListLayout()
        });
    }

    var numberOfItemsPerItemsBlock = 10,
        itemHeight = 50;



    function verifyBlockInDom(listView, blocksExpectedInTree) {
        LiveUnit.Assert.areEqual(blocksExpectedInTree.length, listView.element.querySelectorAll(".win-itemsblock").length);

        var blockIndex = 0,
            offset = 0;

        var tree = listView._view.tree;
        for (var g = 0; g < tree.length; g++) {
            var groupBundle = tree[g],
                itemsContainer = groupBundle.itemsContainer;

            var padder = itemsContainer.element.firstElementChild;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(padder, "win-itemscontainer-padder"));

            var children = [padder];

            for (var b = 0; b < itemsContainer.itemsBlocks.length; b++) {
                var block = itemsContainer.itemsBlocks[b];
                if (blocksExpectedInTree.indexOf(blockIndex) != -1) {
                    LiveUnit.Assert.isTrue(block.element.parentNode === itemsContainer.element);
                    LiveUnit.Assert.isTrue(block.element.children.length < numberOfItemsPerItemsBlock || (itemHeight * numberOfItemsPerItemsBlock) === block.element.offsetHeight);
                    LiveUnit.Assert.areEqual(offset, Helper.ListView.offsetTopFromSurface(listView, block.element));

                    children.push(block.element);
                    offset += block.element.offsetHeight;
                } else {
                    LiveUnit.Assert.isFalse(block.element.parentNode === itemsContainer.element);
                    offset += itemHeight * block.items.length;
                }

                blockIndex++;
            }

            for (var i = 0; i < children.length; i++) {
                LiveUnit.Assert.areEqual(children[i], itemsContainer.element.children[i]);
            }
        }
    }

    function initGroups(groups) {
        var items = [],
            itemIndex = 0;
        for (var g = 0; g < groups.length; g++) {
            for (var i = 0; i < groups[g]; ++i) {
                items.push({
                    title: "Tile" + itemIndex++,
                    group: g
                });
            }
        }
        return items;
    }

    function verifyContainerStripesByIndex(listView) {

        // Check correctness in each group
        var groups = [].slice.call(listView.element.querySelectorAll(".win-itemscontainer"));
        groups.forEach(function (group) {
            var containers = [].slice.call(group.querySelectorAll(".win-container"));

            // Verify containers have the right class
            containers.forEach(function (container, index) {
                if (index % 2 === 0) {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(container, "win-container-even"), "Container with index: " + index + " doesn't have even class!!")
                } else {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(container, "win-container-odd"), "Container with index: " + index + " doesn't have odd class!!")
                }
            });
        });
    };

    function getPairWiseConfigurationsForSmallDataStripeTests() {

        var FlowLayout = WinJS.Class.define(function FlowLayout_ctor(blockSize) {
            this.initialize = function () { },
            this.numberOfItemsPerItemsBlock = blockSize;
        });

        // Couple the itemDataSource and groupDataSource together to avoid scenarios that might pair smallDataSource together with bigGroupedDataSource
        function generateSmallDataSources() {
            var smallList = new WinJS.Binding.List(initData());
            return { itemDataSource: smallList.dataSource, groupDataSource: null }
        }
        function generateSmallGroupedDataSources() {
            var smallGroupedList = new WinJS.Binding.List(initData()).createGrouped(groupKey, groupData);
            return { itemDataSource: smallGroupedList.dataSource, groupDataSource: smallGroupedList.groups.dataSource };
        }

        // Describe all relevant test inputs to pass to the ListView constructor
        var relevantConfigurations = {
            layoutConfiguration: [
                // Each test will need its own Layout Object, so expose them through getters.
                { descriptor: "ListLayout", getter: function () { return new WinJS.UI.ListLayout() } },
                { descriptor: "GridLayout", getter: function () { return new WinJS.UI.GridLayout() } },
                { descriptor: "FlowLayout9", getter: function () { return new FlowLayout(9) } }, // 9 items per block to test FlowLayout with odd block size
                { descriptor: "FlowLayout10", getter: function () { return new FlowLayout(10) } } // 10 items per block to test FlowLayout with even block size
            ],

            dataConfiguration: [
                // Each test needs its own set of data to modify, so expose them through getters
                { descriptor: "NonGroupedSmallDataSet", getter: function () { return generateSmallDataSources(); } },
                { descriptor: "GroupedSmallDataSet", getter: function () { return generateSmallGroupedDataSources(); } },
            ],
        };

        // Use the pairwise helper to assemble all our configurations for testing container stripes
        var pairWiseConfigurations = Helper.pairwise(relevantConfigurations);
        return pairWiseConfigurations;
    }

    function getPairWiseConfigurationsForBigDataStripeTests() {

        // We use this instead of the larger BIG_DATASET constant, otherwise FireFox takes too long and the test times out.
        var bigDataSize = 3000;

        // Couple the itemDataSource and groupDataSource together to avoid scenarios that might pair smallDataSource together with bigGroupedDataSource
        function generateBigDataSources() {
            var bigList = new WinJS.Binding.List(initData(bigDataSize));
            return { itemDataSource: bigList.dataSource, groupDataSource: null }
        }
        function generateBigGroupedDataSources() {
            var bigGroupedList = new WinJS.Binding.List(initData(bigDataSize)).createGrouped(groupKey, groupData);
            return { itemDataSource: bigGroupedList.dataSource, groupDataSource: bigGroupedList.groups.dataSource };
        }

        // Describe all relevant test inputs to pass to the ListView constructor
        var relevantConfigurations = {
            layoutConfiguration: [
                // Each test will need its own Layout Object, so expose them through getters.
                { descriptor: "ListLayout", getter: function () { return new WinJS.UI.ListLayout() } },
                { descriptor: "GridLayout", getter: function () { return new WinJS.UI.GridLayout() } },
            ],

            dataConfiguration: [
                // Each test needs its own set of data to modify, so expose them through getters
                { descriptor: "NonGroupedBigDataSet", getter: function () { return generateBigDataSources(); } },
                { descriptor: "GroupedBigDataSet", getter: function () { return generateBigGroupedDataSources(); } },
            ],
        };

        // Use the pairwise helper to assemble all our configurations for testing container stripes
        var pairWiseConfigurations = Helper.pairwise(relevantConfigurations);
        return pairWiseConfigurations;
    }

    export class VirtualizedViewTests {

        setUp(completed) {

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var testHost = document.createElement("div");
            testHost.id = "VirtualizeContentsViewTestHost";
            VirtualizeContentsViewTestHost = testHost;
            testRootEl.appendChild(testHost);
            document.body.appendChild(testRootEl);
            defaultChunkSize = WinJS.UI._VirtualizeContentsView._chunkSize;
            defaultMaxTime = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
            defaultPagesToPrefetch = WinJS.UI._VirtualizeContentsView._defaultPagesToPrefetch;
            //WinBlue: 298587
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;
            defaultDisableCustomPagesPrefetch = WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch;
            defaultIsiOS = WinJS.Utilities._isiOS;

            completed();
        }

        tearDown() {
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
            WinJS.UI._VirtualizeContentsView._chunkSize = defaultChunkSize;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = defaultMaxTime;
            WinJS.UI._VirtualizeContentsView._defaultPagesToPrefetch = defaultPagesToPrefetch;
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = defaultDisableCustomPagesPrefetch;
            WinJS.Utilities._setIsiOS(defaultIsiOS);
        }
        
        testInitalization(complete) {
            function createListView(orientation) {

                var placeholder = createListViewElement();

                var list = new WinJS.Binding.List(initData());

                var refCount = 0;

                var newLayout = {
                    initialize: function (site, groups) {
                        refCount++;

                        LiveUnit.Assert.isTrue(site.viewport === Helper.ListView.viewport(placeholder));
                        LiveUnit.Assert.isTrue(site.surface === Helper.ListView.canvas(placeholder));

                        LiveUnit.Assert.isFalse(groups);
                    },

                    orientation: orientation,

                    uninitialize: function () {
                        LiveUnit.Assert.isTrue(refCount > 0);
                        refCount--;
                    },

                    layout: function (tree) {
                        LiveUnit.Assert.areEqual(COUNT, tree[0].itemsContainer.items.length);

                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(tree[0].itemsContainer.element, "win-itemscontainer"));

                        for (var i = 0, len = tree[0].itemsContainer.items.length; i < len; i++) {
                            var container = tree[0].itemsContainer.items[i];
                            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(container, "win-container"));
                        }

                        return WinJS.Promise.wrap();
                    },

                    itemsFromRange: function (left, right) {
                        return {
                            firstIndex: 0,
                            lastIndex: 9
                        };
                    }
                };

                var listView = new ListView(placeholder, {
                    itemDataSource: list.dataSource,
                    itemTemplate: generateRenderer("100px"),
                    layout: newLayout
                });

                return Helper.ListView.waitForReady(listView)().then(function () {
                    LiveUnit.Assert.areEqual(10, placeholder.querySelectorAll(".win-item").length);

                    var containers = placeholder.querySelectorAll(".win-container");
                    LiveUnit.Assert.areEqual(COUNT, containers.length);

                    for (var i = 0; i < containers.length; i++) {
                        var container = <HTMLElement>containers[i];
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(container, "win-container"));
                        if (i < 10) {
                            LiveUnit.Assert.areEqual(1, container.childElementCount);
                            LiveUnit.Assert.areEqual(("Tile" + i), container.textContent);
                        } else {
                            LiveUnit.Assert.areEqual(0, container.childElementCount);
                        }
                    }
                    return {
                        listView: listView,
                        verifyRefCount: function () {
                            LiveUnit.Assert.areEqual(0, refCount);
                        }
                    };
                });
            }

            createListView("vertical").then(function (result) {
                var element = result.listView.element,
                    vp = Helper.ListView.viewport(element);

                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(vp, "win-vertical"));
                LiveUnit.Assert.isTrue("hidden", window.getComputedStyle(vp, null).overflowX);
                LiveUnit.Assert.isTrue("scroll", window.getComputedStyle(vp, null).overflowY);

                element.parentNode.removeChild(element);
                return createListView("horizontal");
            }).then(function (result) {
                    var element = result.listView.element,
                        vp = Helper.ListView.viewport(element);

                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(vp, "win-horizontal"));
                    LiveUnit.Assert.isTrue("scroll", window.getComputedStyle(vp, null).overflowX);
                    LiveUnit.Assert.isTrue("hidden", window.getComputedStyle(vp, null).overflowY);

                    element.parentNode.removeChild(element);
                    result.listView._dispose();

                    result.verifyRefCount();

                    complete();
                });
        }


        testGroupedInitialization(complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;

            var placeholder = createListViewElement();

            var list = new WinJS.Binding.List(initData());
            var myGroupedList = list.createGrouped(groupKey, groupData);

            var newLayout = {
                initialize: function (site, groups) {
                    LiveUnit.Assert.isTrue(groups);
                    return "vertical";
                },

                layout: function (tree) {
                    LiveUnit.Assert.isTrue(Array.isArray(tree));
                    LiveUnit.Assert.areEqual(10, tree.length);

                    for (var g = 0; g < tree.length; g++) {
                        var group = tree[g];
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(group.header, "win-groupheadercontainer"));

                        var itemsContainer = group.itemsContainer;
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemsContainer.element, "win-itemscontainer"));
                        LiveUnit.Assert.areEqual(10, itemsContainer.items.length);
                        for (var i = 0; i < itemsContainer.items.length; i++) {
                            var container = itemsContainer.items[i];
                            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(container, "win-container"));
                        }
                    }

                    return WinJS.Promise.wrap();
                }
            };

            var listView = new ListView(placeholder, {
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: newLayout
            });

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(COUNT / 10, placeholder.querySelectorAll(".win-groupheader").length);
                LiveUnit.Assert.areEqual(COUNT / 10, placeholder.querySelectorAll(".win-groupheadercontainer").length);

                LiveUnit.Assert.areEqual(COUNT, placeholder.querySelectorAll(".win-item").length);

                var containers = placeholder.querySelectorAll(".win-container");
                LiveUnit.Assert.areEqual(COUNT, containers.length);

                for (var i = 0; i < containers.length; i++) {
                    var container = <HTMLElement>containers[i];
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(container, "win-container"));
                    LiveUnit.Assert.areEqual(("Tile" + i), container.textContent);
                }
                placeholder.parentNode.removeChild(placeholder);

                complete();
            });
        }

        testLayoutWrapper(complete) {
            var placeholder = createListViewElement();

            var newLayout = {
                initialize: function (site, groups) {
                    return "vertical";
                }
            };

            var listView = new ListView(placeholder, {
                itemDataSource: (new WinJS.Binding.List(initData())).dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: newLayout
            });

            return Helper.ListView.waitForReady(listView)().then(function () {

                LiveUnit.Assert.areEqual(COUNT, placeholder.querySelectorAll(".win-item").length);
                LiveUnit.Assert.areEqual(COUNT, placeholder.querySelectorAll(".win-container").length);

                var layout = listView._layout;

                LiveUnit.Assert.isTrue(typeof layout.uninitialize === "function");
                LiveUnit.Assert.isTrue(typeof layout.layout === "function");
                LiveUnit.Assert.isTrue(typeof layout.itemsFromRange === "function");
                LiveUnit.Assert.isTrue(typeof layout.dragOver === "function");
                LiveUnit.Assert.isTrue(typeof layout.dragLeave === "function");
                LiveUnit.Assert.isTrue(typeof layout.setupAnimations === "function");
                LiveUnit.Assert.isTrue(typeof layout.executeAnimations === "function");

                function moveFocus(current, key) {
                    return layout.getAdjacent({ type: "item", index: current }, key).index;
                }

                var key = WinJS.Utilities.Key;
                LiveUnit.Assert.areEqual(0, moveFocus(1, key.leftArrow));
                LiveUnit.Assert.areEqual(0, moveFocus(1, key.upArrow));
                LiveUnit.Assert.areEqual(0, moveFocus(1, key.pageUp));
                LiveUnit.Assert.areEqual(1, moveFocus(0, key.rightArrow));
                LiveUnit.Assert.areEqual(1, moveFocus(0, key.downArrow));
                LiveUnit.Assert.areEqual(1, moveFocus(0, key.pageDown));

                placeholder.parentNode.removeChild(placeholder);

                complete();
            });
        }

        testUninitialize(complete) {

            function createListView(oldPlaceholder?) {
                if (oldPlaceholder) {
                    oldPlaceholder.parentNode.removeChild(oldPlaceholder);
                }

                var placeholder = createListViewElement();

                var state = {
                    refCount: 0,
                    canceled: false,
                    layout: false
                };

                var newLayout = {
                    initialize: function (site, groups) {
                        state.refCount++;
                        return "vertical";
                    },
                    uninitialize: function () {
                        LiveUnit.Assert.isTrue(state.refCount > 0 || state.canceled);
                        state.refCount--;
                    },
                    layout: function (tree, groups) {
                        state.layout = true;
                        return WinJS.Promise.timeout(10000).then(null, function (error) {
                            if (error.name === "Canceled") {
                                LiveUnit.Assert.isTrue(state.refCount > 0);
                                state.canceled = true;
                            }
                        });
                    }
                };

                var listView = new ListView(placeholder, {
                    itemDataSource: (new WinJS.Binding.List(initData())).dataSource,
                    itemTemplate: generateRenderer("100px"),
                    layout: newLayout
                });

                return new WinJS.Promise(function (c, e, p) {
                    WinJS.Utilities.Scheduler.schedule(c, WinJS.Utilities.Scheduler.Priority.high);
                }).then(function () {
                        LiveUnit.Assert.isTrue(state.layout);
                        return {
                            listView: listView,
                            state: state
                        };
                    });
            }

            createListView().then(function (result) {
                var element = result.listView.element;

                element.parentNode.removeChild(element);
                result.listView._dispose();

                LiveUnit.Assert.areEqual(0, result.state.refCount);
                LiveUnit.Assert.isTrue(result.state.canceled);

                return createListView();
            }).then(function (result) {

                    result.listView.itemDataSource = (new WinJS.Binding.List(initData())).dataSource;

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    result.listView.itemTemplate = generateRenderer("50px");

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    result.listView.layout = <any>{
                        initialize: function (site, groups) {
                            return "horizontal";
                        }
                    };

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    result.listView.forceLayout();

                    return WinJS.Promise.timeout().then(function () {
                        return result;
                    });
                }).then(function (result) {

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    result.listView.recalculateItemPosition();

                    return WinJS.Promise.timeout().then(function () {
                        return result;
                    });
                }).then(function (result) {
                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    var list = result.listView.itemDataSource.list;
                    list.shift();

                    return WinJS.Promise.timeout().then(function () {
                        return result;
                    });
                }).then(function (result) {

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    result.listView.element.parentNode.removeChild(result.listView.element);

                    complete();
                });
        }

        testGetItemPosition(complete) {
            var placeholder = createListViewElement();

            var listView = new ListView(placeholder, {
                itemDataSource: (new WinJS.Binding.List(initData())).dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    }
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {

                listView.ensureVisible(50);

                return Helper.ListView.waitForReady(listView)();

            }).then(function () {

                    LiveUnit.Assert.areEqual(4800, Helper.ListView.viewport(placeholder).scrollTop);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testClickOnContainer(complete) {
            var placeholder = createListViewElement();

            var listView = new ListView(placeholder, {
                itemDataSource: (new WinJS.Binding.List(initData())).dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    itemsFromRange: function () {
                        return {
                            firstIndex: 0,
                            lastIndex: 0
                        };
                    }
                }
            });

            var invokedItem = -1;

            listView.addEventListener("iteminvoked", function (eventObject) {
                invokedItem = eventObject.detail.itemIndex;
            });

            return Helper.ListView.waitForReady(listView)().then(function () {

                LiveUnit.Assert.areEqual(-1, invokedItem);

                var realizedItems = placeholder.querySelectorAll(".win-item");
                LiveUnit.Assert.areEqual(1, realizedItems.length);
                LiveUnit.Assert.areEqual(realizedItems[0], listView.elementFromIndex(0));
                var realizedItem = <HTMLElement>realizedItems[0];

                listView._currentMode()._itemEventsHandler._getCurrentPoint = function (eventObject) {
                    return {
                        properties: {
                            isRightButtonPressed: eventObject.button === WinJS.UI._RIGHT_MSPOINTER_BUTTON,
                            isLeftButtonPressed: eventObject.button === WinJS.UI._LEFT_MSPOINTER_BUTTON
                        }
                    };
                };

                realizedItem.scrollIntoView(false);
                listView._currentMode().onPointerDown(createPointerEvent(realizedItem));
                listView._currentMode().onPointerUp(createPointerEvent(realizedItem));

                LiveUnit.Assert.areEqual(0, invokedItem);
                invokedItem = -1;

                LiveUnit.Assert.areEqual(null, listView.elementFromIndex(1));
                var container = placeholder.querySelectorAll(".win-container")[1];
                listView._currentMode().onPointerDown(createPointerEvent(container));
                listView._currentMode().onPointerUp(createPointerEvent(container));

                LiveUnit.Assert.areEqual(-1, invokedItem);

                placeholder.parentNode.removeChild(placeholder);

                complete();
            }).done();
        }


        testLayoutSite(complete) {
            var placeholder = createListViewElement();

            var layoutSite;

            function testSite(tree) {
                LiveUnit.Assert.areEqual(Helper.ListView.canvas(placeholder), layoutSite.surface);
                LiveUnit.Assert.areEqual(Helper.ListView.viewport(placeholder), layoutSite.viewport);
                LiveUnit.Assert.areEqual(0, layoutSite.scrollbarPos);
                LiveUnit.Assert.areEqual(300, layoutSite.viewportSize.width);
                LiveUnit.Assert.areEqual(300, layoutSite.viewportSize.height);
                LiveUnit.Assert.isFalse(false, layoutSite.viewportSize.rtl);
                LiveUnit.Assert.areEqual("randomAccess", layoutSite.loadingBehavior);
                LiveUnit.Assert.areEqual(tree, layoutSite.tree);

                var itemPromise = layoutSite.itemFromIndex(11);
                return itemPromise.then(function (item) {
                    LiveUnit.Assert.areEqual("Tile11", item.data.title);
                    LiveUnit.Assert.areEqual(11, item.index);
                    LiveUnit.Assert.areEqual("1", item.groupKey);

                    return layoutSite.renderItem(itemPromise);
                }).then(function (element) {
                        LiveUnit.Assert.isTrue(element instanceof HTMLElement);
                        LiveUnit.Assert.areEqual("Tile11", element.textContent);
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(element, "win-container"));
                        LiveUnit.Assert.areEqual(1, element.childElementCount);
                        var itemBox = element.firstElementChild;
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemBox, "win-itembox"));
                        LiveUnit.Assert.areEqual(1, itemBox.childElementCount);
                        var itemNode = itemBox.firstElementChild;
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemNode, "win-item"));
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemNode, "myVVTestClass"));

                        var groupIndex = layoutSite.groupIndexFromItemIndex(11);
                        LiveUnit.Assert.areEqual(1, groupIndex);
                        var group = layoutSite.groupFromIndex(groupIndex);
                        LiveUnit.Assert.areEqual("1", group.data.title);
                        LiveUnit.Assert.areEqual("1", group.key);
                        LiveUnit.Assert.areEqual(10, group.firstItemIndexHint);

                        return layoutSite.renderHeader(group);
                    }).then(function (header) {

                        LiveUnit.Assert.isTrue(header instanceof HTMLElement);
                        LiveUnit.Assert.areEqual("Header1", header.textContent);
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(header, "win-groupheadercontainer"));
                        LiveUnit.Assert.areEqual(1, header.childElementCount);
                        var itemNode = header.firstElementChild;
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemNode, "win-groupheader"));
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemNode, "myVVTestClass"));
                    });
            };

            var list = new WinJS.Binding.List(initData());
            var myGroupedList = list.createGrouped(groupKey, groupData);

            var listView = new ListView(placeholder, {
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px", "Header"),
                layout: {
                    initialize: function (site, groups) {
                        layoutSite = site;
                        return "vertical";
                    },
                    layout: function (tree) {
                        return testSite(tree);
                    }
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {

                placeholder.parentNode.removeChild(placeholder);

                complete();
            });
        }



        testTreeUpdate(complete) {
            var layout = {
                initialize: function (site, groups) {
                    return "vertical";
                }
            };
            verifyTreeUpdate(layout, validateFlatTree, complete);
        }

        testTreeUpdateWithStructureNodes(complete) {
            var layout = {
                initialize: function (site, groups) {
                    return "vertical";
                },
                numberOfItemsPerItemsBlock: STRUCTURENODE_SIZE
            };

            verifyTreeUpdate(layout, function (listView) {
                validateFlatTree(listView);
            }, complete);
        }



        testGroupedTreeUpdate(complete) {
            var layout = {
                initialize: function (site, groups) {
                    return "vertical";
                }
            };
            verifyGroupedTreeUpdate(layout, validateGroupedTree, complete);
        }

        testGroupedTreeUpdateWithStructureNodes(complete) {
            var layout = {
                initialize: function (site, groups) {
                    return "vertical";
                },
                numberOfItemsPerItemsBlock: STRUCTURENODE_SIZE
            };

            verifyGroupedTreeUpdate(layout, function (listView) {
                validateGroupedTree(listView);
            }, complete);
        }

        testNoReparentingDuringEdits(complete) {

            var placeholder;

            function setupListView(realizedRangeStart, groups?) {
                if (placeholder) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                placeholder = createListViewElement();

                placeholder.addEventListener("contentanimating", function (eventObject) {
                    eventObject.preventDefault();
                });

                var layout = {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    itemsFromRange: function (start, end) {
                        return {
                            firstIndex: realizedRangeStart,
                            lastIndex: realizedRangeStart + 10
                        };
                    },
                };

                var list = new WinJS.Binding.List(initData()),
                    listView: WinJS.UI.PrivateListView<{}>;

                if (groups) {
                    var groupedList = list.createGrouped(groupKey, groupData),
                        listView = new ListView(placeholder, {
                            itemDataSource: groupedList.dataSource,
                            groupDataSource: groupedList.groups.dataSource,
                            itemTemplate: generateRenderer("50px"),
                            groupHeaderTemplate: generateRenderer("50px"),
                            layout: layout
                        });
                } else {
                    listView = new ListView(placeholder, {
                        itemDataSource: list.dataSource,
                        itemTemplate: generateRenderer("50px"),
                        layout: layout
                    });
                }

                return Helper.ListView.waitForReady(listView)().then(function () {
                    var containers = placeholder.querySelectorAll(".win-container");
                    for (var i = 0, len = containers.length; i < len; i++) {
                        var container = containers[i];
                        container.winTestSign = i;
                    }
                    return listView;
                });
            }

            function verifyContainers(startFrom, exepected) {
                var containers = placeholder.querySelectorAll(".win-container"),
                    current = [];
                for (var i = 0, len = containers.length; i < len; i++) {
                    var id = containers[i].winTestSign;
                    current.push(id === +id ? "" + id : "New");
                }

                for (i = 0, len = exepected.length; i < len; i++) {
                    LiveUnit.Assert.areEqual(exepected[i], current[startFrom + i]);
                }
            }

            setupListView(0).then(function (listView) {

                LiveUnit.LoggingCore.logComment("single removal at the begining");
                listView.itemDataSource.list.shift();

                return Helper.ListView.waitForReady(listView, -1)(listView);
            }).then(function (listView) {

                    verifyContainers(0, ["1", "2", "3", "4"]);

                    return setupListView(0);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("single removal at the end");
                    listView.itemDataSource.list.pop();

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(0, ["0", "1", "2", "3"]);

                    return setupListView(0);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("multiple removals in the middle");
                    listView.itemDataSource.list.splice(2, 1);
                    listView.itemDataSource.list.splice(0, 1);
                    listView.itemDataSource.list.splice(4, 1);

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(0, ["1", "3", "4", "5", "7"]);

                    return setupListView(10);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("removal before the realized range");
                    listView.itemDataSource.list.shift();

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(10, ["11", "12", "13", "14"]);

                    return setupListView(15, true);
                }).then(function (listView) {
                    LiveUnit.LoggingCore.logComment("group shift + removal before the realized range + removal in the realized range");

                    listView.itemDataSource.list.splice(0, 1);
                    listView.itemDataSource.list.splice(10, 1);
                    listView.itemDataSource.list.splice(15, 1);
                    listView.itemDataSource.list.splice(17, 1);

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(15, ["18", "19", "21", "22"]);

                    return setupListView(0);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("single insert");
                    listView.itemDataSource.list.splice(2, 0, {
                        title: "New"
                    });

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(0, ["0", "1", "New", "2", "3"]);

                    return setupListView(0, true);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("single insert at the end of group");
                    listView.itemDataSource.list.splice(10, 0, {
                        title: "New",
                        group: 0
                    });

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(0, ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "New"]);

                    return setupListView(0);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("multiple inserts");
                    listView.itemDataSource.list.splice(2, 0, {
                        title: "New"
                    });
                    listView.itemDataSource.list.splice(0, 0, {
                        title: "New"
                    });
                    listView.itemDataSource.list.splice(6, 0, {
                        title: "New"
                    });

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(0, ["New", "0", "1", "New", "2", "3", "New", "4", "5", "6"]);

                    return setupListView(0);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("mix of removals and inserts");
                    listView.itemDataSource.list.splice(2, 1, {
                        title: "New"
                    });
                    listView.itemDataSource.list.splice(0, 1);
                    listView.itemDataSource.list.splice(4, 0, {
                        title: "New"
                    });
                    listView.itemDataSource.list.splice(5, 2);

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(0, ["1", "New", "3", "4", "New", "7", "8"]);

                    return setupListView(10);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("inserts before the realzied range");
                    listView.itemDataSource.list.unshift({
                        title: "New"
                    });
                    listView.itemDataSource.list.unshift({
                        title: "New"
                    });

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(10, ["8", "9", "10", "11"]);

                    return setupListView(10);
                }).then(function (listView) {

                    LiveUnit.LoggingCore.logComment("mix of changes before the realized range and in the realized range");
                    listView.itemDataSource.list.unshift({
                        title: "New"
                    });
                    listView.itemDataSource.list.splice(12, 1);
                    listView.itemDataSource.list.splice(16, 0, {
                        title: "New"
                    });

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(10, ["9", "10", "12", "13", "14", "15", "New"]);

                    return setupListView(15, true);
                }).then(function (listView) {
                    LiveUnit.LoggingCore.logComment("group shift + insert before the realized range + insert in the realized range");

                    listView.itemDataSource.list.splice(0, 0, { title: "New", group: 0 });
                    listView.itemDataSource.list.splice(11, 0, { title: "New", group: 1 });
                    listView.itemDataSource.list.splice(18, 0, { title: "New", group: 1 });

                    return Helper.ListView.waitForReady(listView, -1)(listView);
                }).then(function (listView) {

                    verifyContainers(15, ["13", "14", "15", "New", "16"]);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testRebuildingStructureNodesAfterResize(complete) {
            WinJS.UI._VirtualizeContentsView._chunkSize = 15;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;

            var placeholder = createListViewElement("330px");
            placeholder.id = "SimpleFlexBasedLayout";

            var expectedItemsPerBlock = 6;

            var list = new WinJS.Binding.List(initData(30)),
                groupedList = list.createGrouped(groupKey, groupData),
                listView = new ListView(placeholder, {
                    itemDataSource: groupedList.dataSource,
                    groupDataSource: groupedList.groups.dataSource,
                    itemTemplate: generateRenderer("50px"),
                    groupHeaderTemplate: generateRenderer("50px"),
                    layout: Object.create({
                        initialize: function (site, groups) {
                            this.site = site;
                            WinJS.Utilities.addClass(this.site.surface, "SimpleFlexBasedLayoutSurface");
                            return "horizontal";
                        },
                        layout: function (tree) {
                            for (var g = 0; g < tree.length; g++) {
                                var group = tree[g];
                                group.header.style.display = "none";
                                WinJS.Utilities.addClass(group.itemsContainer.element, "SimpleFlexBasedLayout");
                                var blocks = group.itemsContainer.itemsBlocks;
                                for (var b = 0; b < blocks.length; b++) {
                                    var block = blocks[b];
                                    WinJS.Utilities.addClass(block.element, "SimpleFlexBasedLayout");
                                    LiveUnit.Assert.isTrue((b + 1) === blocks.length || (block.items.length === expectedItemsPerBlock));
                                }
                            }
                        }
                    }, {
                            numberOfItemsPerItemsBlock: {
                                get: function () {
                                    var retVal = Math.floor(this.site.viewportSize.height / 50);
                                    LiveUnit.Assert.areEqual(expectedItemsPerBlock, retVal);
                                    return retVal;
                                }
                            }
                        })
                });

            Helper.ListView.waitForReady(listView)().then(function () {
                validateGroupedTree(listView, expectedItemsPerBlock);

                listView._raiseViewLoading();
                // Trigger resize handler
                placeholder.style.height = "530px";
                expectedItemsPerBlock = 10;

                return Helper.ListView.waitForReady(listView, 50)();
            }).then(function () {
                    validateGroupedTree(listView, expectedItemsPerBlock);

                    listView._raiseViewLoading();
                    // Trigger resize handler
                    placeholder.style.height = "430px";
                    expectedItemsPerBlock = 8;

                    return Helper.ListView.waitForReady(listView, 50)();
                }).done(function () {
                    validateGroupedTree(listView, expectedItemsPerBlock);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testResizeDuringLazyTreeCreation(complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;
            WinJS.UI._VirtualizeContentsView._createContainersJobTimeslice = 0;

            var list = new WinJS.Binding.List(initData(100, 20));
            var myGroupedList = list.createGrouped(groupKey, groupData);

            var placeholder = createListViewElement("180px");
            placeholder.style.width = "1200px";

            var listView = new ListView(placeholder, {
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.className = "myVVTestClass";
                        element.textContent = item.data.title;
                        element.style.width = "50px";
                        element.style.height = "100px";
                        element.style.backgroundColor = "blue";
                        return element;
                    });
                },
                groupHeaderTemplate: generateRenderer("50px", "Header"),
                layout: new WinJS.UI.GridLayout()
            });

            if (!listView.layout['_usingStructuralNodes']) {
                placeholder.parentNode.removeChild(placeholder);
                complete();
                return;
            }

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {

                LiveUnit.Assert.areEqual(1, listView._view.tree.length);

                var itemsContainer = listView._view.tree[0].itemsContainer;
                LiveUnit.Assert.areEqual(5, itemsContainer.itemsBlocks.length);
                for (var i = 0; i < itemsContainer.itemsBlocks.length; i++) {
                    LiveUnit.Assert.areEqual(WinJS.UI._LayoutCommon._barsPerItemsBlock, itemsContainer.itemsBlocks[i].items.length);
                }

                // Trigger resize handler
                placeholder.style.height = "280px";
                listView._raiseViewLoading();

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {

                    LiveUnit.Assert.areEqual(1, listView._view.tree.length);

                    var itemsContainer = listView._view.tree[0].itemsContainer;
                    LiveUnit.Assert.areEqual(3, itemsContainer.itemsBlocks.length);
                    LiveUnit.Assert.areEqual(WinJS.UI._LayoutCommon._barsPerItemsBlock * 2, itemsContainer.itemsBlocks[0].items.length);
                    LiveUnit.Assert.areEqual(20 - 2 * WinJS.UI._LayoutCommon._barsPerItemsBlock * 2, itemsContainer.itemsBlocks[2].items.length);

                    jobNode.resume();

                    return Helper.ListView.waitForAllContainers(listView);
                }).done(function () {

                    validateGroupedTree(listView, WinJS.UI._LayoutCommon._barsPerItemsBlock * 2);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }


        // Verifies that structural nodes are enabled/disabled on the fly due to list edits.
        // When all of the groups are uniform, structural nodes should be enabled.
        // If any of the groups are cell spanning, structural nodes should be disabled.
        testTogglingStructuralNodesDueToEdits(complete) {
            function itemInfo(index) {
                return {
                    width: 95,
                    height: 95
                };
            }

            function groupInfo(group) {
                if (group.index <= 1) {
                    return { enableCellSpanning: false };
                } else {
                    return {
                        enableCellSpanning: true,
                        cellWidth: 95,
                        cellHeight: 95
                    };
                }
            }

            function verifyStructuralNodesDisabled() {
                validateGroupedTree(listView);
                LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll("." + WinJS.UI._itemsBlockClass).length,
                    "There shouldn't be any items blocks");
                LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(listView._canvas, WinJS.UI._structuralNodesClass),
                    "The surface should not have the structuralnodes CSS class");
            }

            var list = new WinJS.Binding.List(initData(150, 50)).createGrouped(groupKey, groupData),
                placeholder = createListViewElement(),
                extraItems,
                listView = new ListView(placeholder, {
                    itemDataSource: list.dataSource,
                    itemTemplate: generateRenderer("90px"),
                    groupDataSource: list.groups.dataSource,
                    groupHeaderTemplate: generateRenderer("10px"),
                    layout: {
                        type: WinJS.UI.CellSpanningLayout,
                        groupInfo: groupInfo,
                        itemInfo: itemInfo
                    }
                }),
                tests = [
                    function () {
                        // We should have 2 uniform groups and 1 cell spanning group so structural nodes should be disabled
                        verifyStructuralNodesDisabled();

                        extraItems = list.splice(100, 50);
                        return true;
                    },
                    function () {
                        // Now we have 2 groups (both uniform) so structural nodes should be enabled
                        validateGroupedTree(listView, 12);
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(listView._canvas, WinJS.UI._structuralNodesClass),
                            "The surface should have the structuralnodes CSS class");

                        extraItems.forEach(function (item) {
                            list.push(item);
                        });
                        return true;
                    },
                    function () {
                        // We're back to 2 uniform groups and 1 cell spanning group so structural nodes should be disabled
                        verifyStructuralNodesDisabled();

                        placeholder.parentNode.removeChild(placeholder);
                        complete();
                    }
                ];

            if (!listView.layout['_usingStructuralNodes']) {
                placeholder.parentNode.removeChild(placeholder);
                complete();
                return;
            }

            Helper.ListView.runTests(listView, tests);
        }

        // Verifies that when the ListView is resized such that the number of items per
        // column changes, columns are not split across multiple items blocks.
        testResizeWithStructuralNodes(complete) {
            function verifyTree() {
                LiveUnit.Assert.isTrue(placeholder.querySelectorAll("." + WinJS.UI._itemsBlockClass).length > 1,
                    "ListView must be using more than 1 items block in order for this test to verify that " +
                    "columns do not get split across items blocks during resize");
                validateFlatTree(listView, WinJS.UI._LayoutCommon._barsPerItemsBlock * itemsPerColumn);
            }

            var list = new WinJS.Binding.List(initData(100)),
                placeholder = createListViewElement("300px"),
                listView = new ListView(placeholder, {
                    itemDataSource: list.dataSource,
                    itemTemplate: generateRenderer("100px")
                }),
                // listView height = 300px, container height = 100px
                itemsPerColumn = 3,
                tests = [
                    function () {
                        verifyTree();

                        // Trigger resize handler
                        placeholder.style.height = "400px";
                        // listView height = 400px, container height = 100px
                        itemsPerColumn = 4;
                        return true;
                    },
                    function () {
                        verifyTree();

                        placeholder.parentNode.removeChild(placeholder);
                        complete();
                    }
                ];

            if (!listView.layout['_usingStructuralNodes']) {
                placeholder.parentNode.removeChild(placeholder);
                complete();
                return;
            }

            Helper.ListView.runTests(listView, tests);
        }

        testLazyFlatTreeCreation(complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;

            var placeholder = createListViewElement();

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            placeholder.addEventListener("loadingstatechanged", function (eventObject) {
                stateChangeCounter[eventObject.target['winControl'].loadingState]++;
            });

            var itemsCount = BIG_DATASET,
                list = new WinJS.Binding.List(initData(itemsCount));

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: new WinJS.UI.ListLayout()
            });

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);
                LiveUnit.Assert.areEqual(9, placeholder.querySelectorAll(".win-item").length);

                return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
            }).then(function () {
                    validateFlatTree(listView, ListLayout._numberOfItemsPerItemsBlock);

                    LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testLazyTreeCreationPriority(complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;

            var placeholder = createListViewElement();

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            placeholder.addEventListener("loadingstatechanged", function (eventObject) {
                stateChangeCounter[eventObject.target['winControl'].loadingState]++;
            });

            var itemsCount = BIG_DATASET,
                list = new WinJS.Binding.List(initData(itemsCount));

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: new WinJS.UI.ListLayout()
            });

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            var afterIdle;

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);
                LiveUnit.Assert.areEqual(9, placeholder.querySelectorAll(".win-item").length);
                LiveUnit.Assert.isTrue(placeholder.querySelectorAll(".win-container").length < BIG_DATASET);
                var containers = placeholder.querySelectorAll(".win-container").length;

                WinJS.Utilities.Scheduler.schedule(function () {
                    LiveUnit.Assert.areEqual(containers, placeholder.querySelectorAll(".win-container").length);
                }, WinJS.Utilities.Scheduler.Priority.idle + 1, null, "test before idle");

                WinJS.Utilities.Scheduler.schedule(function () {
                    afterIdle = true;
                }, WinJS.Utilities.Scheduler.Priority.idle - 1, null, "test after idle");

                jobNode.resume();

                return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
            }).then(function () {
                    validateFlatTree(listView, ListLayout._numberOfItemsPerItemsBlock);

                    LiveUnit.Assert.isFalse(afterIdle);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }



        testLazyGroupedTreeCreationWithSmallGroups(complete) {
            var itemsCount = BIG_DATASET,
                data = initData(itemsCount, 250);

            testLazyGroupedTreeCreation(data, complete);
        }

        testLazyGroupedTreeCreationWithBigGroups(complete) {
            var itemsCount = BIG_DATASET,
                data = initData(itemsCount, 2250);

            testLazyGroupedTreeCreation(data, complete);
        }

        testStoppingLazyTreeCreation(complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;

            function createListView(oldPlaceholder?) {
                if (oldPlaceholder) {
                    oldPlaceholder.winControl._dispose();
                    oldPlaceholder.parentNode.removeChild(oldPlaceholder);
                }

                var placeholder = createListViewElement();

                var state = {
                    canceled: false,
                };

                var listView = new ListView(placeholder, {
                    itemDataSource: (new WinJS.Binding.List(initData(BIG_DATASET))).dataSource,
                    itemTemplate: generateRenderer("100px"),
                    layout: new WinJS.UI.ListLayout()
                });

                listView._view._scheduleLazyTreeCreation = function () {
                    var jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                    jobNode.cancel = function () {
                        state.canceled = true;
                        Object.getPrototypeOf(jobNode).cancel.call(jobNode);
                    };
                    return jobNode;
                };

                return new WinJS.Promise(function (c, e, p) {
                    WinJS.Utilities.Scheduler.schedule(c, WinJS.Utilities.Scheduler.Priority.high);
                }).then(function () {
                        LiveUnit.Assert.isFalse(state.canceled);
                        return {
                            listView: listView,
                            state: state
                        };
                    });
            }

            createListView().then(function (result) {
                var element = result.listView.element;

                element.parentNode.removeChild(element);
                result.listView._dispose();

                LiveUnit.Assert.isTrue(result.state.canceled);

                return createListView();
            }).then(function (result) {

                    result.listView.itemDataSource = (new WinJS.Binding.List(initData())).dataSource;

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    result.listView.itemTemplate = generateRenderer("50px");

                    LiveUnit.Assert.isTrue(result.state.canceled);

                    return createListView(result.listView.element);
                }).then(function (result) {

                    var list = result.listView.itemDataSource.list;
                    list.shift();

                    LiveUnit.Assert.isFalse(result.state.canceled);

                    result.listView.element.style.width = "600px";

                    LiveUnit.Assert.isFalse(result.state.canceled);

                    var containerPromise = (result.listView._view._creatingContainersWork ? result.listView._view._creatingContainersWork.promise : WinJS.Promise.wrap());

                    return WinJS.Promise.join([containerPromise, Helper.ListView.waitForReady(result.listView)()]).then(function () {
                        return result;
                    });
                }).then(function (result) {

                    LiveUnit.Assert.isFalse(result.state.canceled);

                    validateFlatTree(result.listView, ListLayout._numberOfItemsPerItemsBlock);

                    result.listView.element.parentNode.removeChild(result.listView.element);
                    result.listView._dispose();

                    complete();
                });
        }

        testEditsDuringLazyCreation(complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;

            var itemsCount = BIG_DATASET,
                data = initData(itemsCount, 250);

            var placeholder = createListViewElement();

            var list = new WinJS.Binding.List(data),
                groupedList = list.createGrouped(groupKey, groupData);

            var listView = new ListView(placeholder, {
                itemDataSource: groupedList.dataSource,
                groupDataSource: groupedList.groups.dataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: new WinJS.UI.ListLayout()
            });

            listView._view._scheduleLazyTreeCreation = function () {
                WinJS.Utilities._setImmediate(function () {
                    listView.itemDataSource.beginEdits();
                    listView.itemDataSource.list.splice(10, 10);
                    listView.itemDataSource.list.shift();

                    WinJS.Promise.timeout(250).then(function () {
                        listView.itemDataSource.endEdits();
                    });
                });

                return Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
            };

            return Helper.ListView.waitForReady(listView)().then(function () {
                return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
            }).then(function () {
                    validateGroupedTree(listView, ListLayout._numberOfItemsPerItemsBlock);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        // Verifies that if the data in the ListView's Binding.List is entirely replaced while
        // containers are still being created, the ListView will create enough containers for
        // the edits to fulfill its contract with the animation system (each modified item needs
        // a container).
        // A specific pattern that some apps use which hits this is as follows:
        //   - ListView is initialized with local data and a fetch is made to get the latest data from
        //     the server.
        //   - While the ListView is lazily creating containers, the server responds. The app replaces the
        //     local data in the ListView's data source with the data from the server. Specifically, this
        //     can be done by setting the Binding.List's length to 0 and pushing on the data from the server.
        // Regression test for #146 (https://github.com/winjs/winjs/issues/146#issuecomment-41634154)
        testReplaceDataDuringLazyContainerCreation(complete) {
            Helper.initUnhandledErrors();
            WinJS.UI._VirtualizeContentsView._chunkSize = 50;

            var itemsCount = 75;
            var data = initData(itemsCount);
            var list = new WinJS.Binding.List(data);
            var replaceData = function () {
                // Simulates an app receiving a fresh copy of the data from the server
                // and swapping the local data with the server's data.
                list.length = 0;
                data.forEach(function (item) {
                    list.push(item);
                });
            };

            var placeholder = createListViewElement();

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px")
            });

            listView._view._createChunkWithBlocks = function (groups, count, blockSize, chunkSize) {
                Object.getPrototypeOf(listView._view)._createChunkWithBlocks.call(listView._view, groups, count, blockSize, chunkSize);
                if (listView._view.containers.length >= 50) {
                    return true;
                }
            };

            listView._view._createChunk = function (groups, count, chunkSize) {
                Object.getPrototypeOf(listView._view)._createChunk.call(listView._view, groups, count, chunkSize);
                if (listView._view.containers.length >= 50) {
                    return true;
                }
            };

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(50, listView._view.containers.length);

                replaceData();

                jobNode.resume();
                return Helper.ListView.waitForAllContainers(listView);
            }).then(function () {
                LiveUnit.Assert.areEqual(75, listView._view.containers.length);
                return Helper.validateUnhandledErrorsOnIdle();
            }).then(complete);
        }

        // Verifies that all items in a CellSpanningLayout get properly laid out when
        // insertions occur before all of the containers have been created.
        // Regression test for WinBlue#427057.
        testInsertionsDuringLazyContainerCreation(complete) {
            if (!Helper.Browser.supportsCSSGrid) {
                complete();
                return;
            }
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;
            Helper.initUnhandledErrors();

            function verifyTile(data) {
                var container = <HTMLElement>element.querySelectorAll(".win-container")[data.index];
                LiveUnit.Assert.areEqual(data.left, container.offsetLeft, "win-container has unexpected offsetLeft");
                LiveUnit.Assert.areEqual(data.top, container.offsetTop, "win-container has unexpected offsetTop");
                LiveUnit.Assert.areEqual(data.width, container.offsetWidth, "win-container has unexpected offsetWidth");
                LiveUnit.Assert.areEqual(data.height, container.offsetHeight, "win-container has unexpected offsetHeight");
            }

            function itemInfo() { return { width: 100, height: 100 }; }
            function groupKey(item) { return item.group; }
            function groupData(item) { return { title: groupKey(item) }; }

            var items = [];
            items[0] = { title: "Tile 0", group: "A" };
            for (var i = 1; i < 100; i++) {
                items[i] = { title: "Tile " + i, group: "B" };
            }

            var element = createListViewElement();
            var list = new WinJS.Binding.List(items).createGrouped(groupKey, groupData);
            var listView = new ListView(element, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                groupDataSource: list.groups.dataSource,
                groupHeaderTemplate: generateRenderer("50px"),
                layout: {
                    type: WinJS.UI.CellSpanningLayout,
                    groupInfo: { enableCellSpanning: true, cellWidth: 100, cellHeight: 100 },
                    itemInfo: itemInfo
                }
            });

            var origLayout = listView.layout.layout;
            listView.layout.layout = function () {
                listView.layout.layout = origLayout;
                var result = listView.layout.layout.apply(this, arguments);
                var layoutComplete = WinJS.Promise.as(result.layoutComplete ? result.layoutComplete : result);
                layoutComplete.then(function () {
                    // Insert some data after the first layout pass
                    WinJS.Utilities.Scheduler.schedule(function () {
                        listView.itemDataSource.list.push({ title: "New Tile 0", group: "B" });
                        listView.itemDataSource.list.push({ title: "New Tile 1", group: "B" });
                        listView.itemDataSource.list.push({ title: "New Tile 2", group: "B" });
                        listView.itemDataSource.list.push({ title: "New Tile 3", group: "B" });

                        Helper.ListView.waitForAllContainers(listView).then(function () {
                            var headerContainerHeight = 70;
                            var containerCount = element.querySelectorAll(".win-container").length;
                            var itemsContainer = <HTMLElement>element.querySelectorAll(".win-itemscontainer")[1];

                            // Verify lay out of first group
                            verifyTile({ index: 0, left: 0, top: headerContainerHeight, width: 100, height: 100 });
                            // Verify lay out of second group
                            for (var i = 1; i < containerCount; i++) {
                                var col = Math.floor((i - 1) / 2);
                                var row = (i - 1) % 2;
                                verifyTile({
                                    index: i,
                                    left: itemsContainer.offsetLeft + 100 * col,
                                    top: headerContainerHeight + 100 * row,
                                    width: 100,
                                    height: 100
                                });
                            }

                            element.parentNode.removeChild(element);
                            return Helper.validateUnhandledErrorsOnIdle();
                        }).done(complete);
                    });
                });
                return result;
            };
        }



        testRealizeMoreThanCreated(complete) {
            // ListView height is 300, container height is 30
            var itemsPerColumn = 10,
                numberOfItemsPerItemsBlock = itemsPerColumn * WinJS.UI._LayoutCommon._barsPerItemsBlock;
            // For the purposes of this test, _chunkSize should be a multiple of numberOfItemsPerItemsBlock
            WinJS.UI._VirtualizeContentsView._chunkSize = numberOfItemsPerItemsBlock;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;

            var itemsCount = BIG_DATASET,
                list = new WinJS.Binding.List(initData(itemsCount));

            var placeholder = createListViewElement();

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("30px"),
                layout: new WinJS.UI.GridLayout()
            });

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(0, listView.indexOfFirstVisible);
                LiveUnit.Assert.areEqual(WinJS.UI._VirtualizeContentsView._chunkSize - 1, listView.indexOfLastVisible);

                WinJS.UI._VirtualizeContentsView._chunkSize = defaultChunkSize;
                WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = defaultMaxTime;

                jobNode.resume();

                return Helper.ListView.waitForReady(listView, 100)();
            }).then(function () {
                    LiveUnit.Assert.areEqual(0, listView.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(99, listView.indexOfLastVisible);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testScrollingDuringLazyCreation(complete) {
            // ListView height is 300, container height is 100
            var itemsPerColumn = 3,
                numberOfItemsPerItemsBlock = itemsPerColumn * WinJS.UI._LayoutCommon._barsPerItemsBlock;
            // For the purposes of this test, _chunkSize should be a multiple of numberOfItemsPerItemsBlock
            WinJS.UI._VirtualizeContentsView._chunkSize = 41 * numberOfItemsPerItemsBlock;
            WinJS.UI._VirtualizeContentsView._startupChunkSize = WinJS.UI._VirtualizeContentsView._chunkSize;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;

            function checkTile(listView, index) {
                var element = listView.elementFromIndex(index);
                LiveUnit.Assert.areEqual("Tile" + index, element.textContent);
            }

            function createEvent(key, element) {
                return {
                    keyCode: key,
                    target: element,
                    stopPropagation: function () { },
                    preventDefault: function () { }
                };
            }

            var itemsCount = BIG_DATASET,
                list = new WinJS.Binding.List(initData(itemsCount));

            var placeholder = createListViewElement();

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: new WinJS.UI.GridLayout()
            });

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {

                listView.indexOfFirstVisible = 99;

                return Helper.ListView.waitForReady(listView)();
            }).then(function () {
                    LiveUnit.Assert.areEqual(99, listView.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(3300, listView.scrollPosition);

                    checkTile(listView, 99);

                    listView._currentMode().onKeyDown(createEvent(WinJS.Utilities.Key.end, listView.elementFromIndex(100)));
                    return Helper.ListView.waitForReady(listView)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI._VirtualizeContentsView._chunkSize - 1, listView.indexOfLastVisible);

                    listView.indexOfFirstVisible = 0;

                    return Helper.ListView.waitForReady(listView)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(0, listView.indexOfFirstVisible);

                    listView.indexOfFirstVisible = 10000;

                    jobNode.resume();

                    return Helper.ListView.waitForReady(listView)();
                }).then(function () {
                    return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
                }).then(function () {
                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {

                    LiveUnit.Assert.areEqual(9999, listView.indexOfFirstVisible);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }



        testAnimationsInterface(complete) {
            function initModifiedArray(count) {
                var retVal = [];
                for (var i = 0; i < count; i++) {
                    retVal.push({
                        oldIndex: i,
                        newIndex: i,
                    });
                }
                return retVal;
            }

            function spliceModifiedArray(array, index, removedCount, newItem?) {
                var i, entry;
                for (i = 0; i < removedCount; i++) {
                    array[index + i].newIndex = -1;
                }
                for (i = index + removedCount; i < array.length; i++) {
                    entry = array[i];
                    if (entry.newIndex !== -1) {
                        entry.newIndex -= removedCount;
                    }
                }
                if (newItem) {
                    array.splice(index, 0, {
                        oldIndex: -1,
                        newIndex: -1
                    });
                    for (i = index + 1; i < array.length; i++) {
                        entry = array[i];
                        if (entry.newIndex !== -1) {
                            entry.newIndex++;
                        }
                    }
                }
            }

            function updateModifiedArray(array) {
                for (var i = 0; i < array.length; i++) {
                    var entry = array[i];
                    if (entry.oldIndex === -1 && entry.newIndex === -1) {
                        entry.newIndex = i;
                    }
                }
            }

            function compareModifiedArray(left, right) {
                function compareArrays(expected, actual) {
                    LiveUnit.Assert.areEqual(expected.length, actual.length);
                    for (var i = 0; i < expected.length; i++) {
                        LiveUnit.Assert.areEqual(JSON.stringify(expected[i]), JSON.stringify(actual[i]));
                    }
                }

                function getRemoved(source) {
                    return source.filter(function (item) {
                        return item.newIndex === -1;
                    }).map(function (item) {
                            return item.oldIndex;
                        }).sort();
                }

                function getInserted(source) {
                    return source.filter(function (item) {
                        return item.oldIndex === -1;
                    }).map(function (item) {
                            return item.newIndex;
                        }).sort();
                }

                function getMoved(source) {
                    return source.filter(function (item) {
                        return item.oldIndex !== -1 && item.newIndex !== -1;
                    }).map(function (item) {
                            return {
                                oldIndex: item.oldIndex,
                                newIndex: item.newIndex
                            };
                        }).sort(function (left, right) {
                            return right.oldIndex - left.oldIndex;
                        });
                }

                compareArrays(getRemoved(left), getRemoved(right));
                compareArrays(getInserted(left), getInserted(right));
                compareArrays(getMoved(left), getMoved(right));
            }

            var placeholder = createListViewElement();

            placeholder.style.height = "900px";

            var itemsCount = 30,
                data = initData(itemsCount),
                list = new WinJS.Binding.List(data),
                groupedList = list.createGrouped(groupKey, groupData);

            var changes = false,
                modifiedElementsPattern,
                modifiedGroupsPattern,
                callCounter = 0,
                animationSignal = new WinJS._Signal();

            var listView = new ListView(placeholder, {
                itemDataSource: groupedList.dataSource,
                groupDataSource: groupedList.groups.dataSource,
                itemTemplate: generateRenderer("40px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: {
                    initialize: function (site, groups) {
                        this.site = site;
                        return "vertical";
                    },
                    setupAnimations: function () {
                        LiveUnit.Assert.areEqual(0, callCounter++);
                        LiveUnit.Assert.areEqual(itemsCount, listView.element.querySelectorAll(".win-container").length);
                    },
                    layout: function (tree, changedRange, modifiedElements, modifiedGroups) {
                        if (modifiedElements.length || modifiedGroups.length) {
                            LiveUnit.Assert.areEqual(1, callCounter++);
                            LiveUnit.Assert.areEqual(list.length, listView.element.querySelectorAll(".win-container").length);

                            compareModifiedArray(modifiedElementsPattern, modifiedElements);
                            compareModifiedArray(modifiedGroupsPattern, modifiedGroups);
                        }
                    },
                    executeAnimations: function () {
                        LiveUnit.Assert.areEqual(2, callCounter++);

                        return animationSignal.promise;
                    }
                }
            });


            return Helper.ListView.waitForReady(listView)().then(function () {
                validateGroupedTree(listView);

                callCounter = 0;

                modifiedElementsPattern = initModifiedArray(list.length);
                modifiedGroupsPattern = initModifiedArray(Math.ceil(list.length / 10));

                list.splice(25, 1);
                spliceModifiedArray(modifiedElementsPattern, 25, 1);

                list.splice(10, 10);
                spliceModifiedArray(modifiedElementsPattern, 10, 10);
                spliceModifiedArray(modifiedGroupsPattern, 1, 1);

                list.splice(8, 0, {
                    title: "N1",
                    group: 0
                });
                spliceModifiedArray(modifiedElementsPattern, 8, 0, true);

                updateModifiedArray(modifiedElementsPattern);
                updateModifiedArray(modifiedGroupsPattern);

                return waitForItemsLoaded(listView);
            }).then(function () {
                    // By this time, viewportloaded has been triggered, and these methods of the layout have already been called:
                    // 1. setupAnimations
                    // 2. layout
                    // 3. executeAnimations
                    LiveUnit.Assert.areEqual(3, callCounter);
                    animationSignal.complete();

                    return Helper.ListView.waitForReady(listView)();
                }).then(function () {
                    validateGroupedTree(listView);

                    callCounter = 0;

                    itemsCount = list.length;
                    modifiedElementsPattern = initModifiedArray(list.length);
                    modifiedGroupsPattern = initModifiedArray(Math.ceil(list.length / 10));

                    list.splice(11, 0, {
                        title: "N2",
                        group: 1
                    });
                    spliceModifiedArray(modifiedElementsPattern, 11, 0, true);
                    spliceModifiedArray(modifiedGroupsPattern, 1, 0, true);

                    updateModifiedArray(modifiedElementsPattern);
                    updateModifiedArray(modifiedGroupsPattern);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    validateGroupedTree(listView);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testSerializeAnimations(complete) {
            function verifyTile(listView, index, text) {
                var element = listView.elementFromIndex(index);
                LiveUnit.Assert.areEqual(text, element.textContent);
            }

            var placeholder = createListViewElement();

            var data = initData(COUNT),
                list = new WinJS.Binding.List(data);

            var layoutExpected = true,
                animationsStarted = 0,
                animationSignal = new WinJS._Signal();

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("40px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    setupAnimations: function () {
                    },
                    layout: function (tree, changedRange, modifiedElements, modifiedGroups) {
                        LiveUnit.Assert.isTrue(layoutExpected);
                    },
                    executeAnimations: function () {
                        animationsStarted++;

                        return animationSignal.promise;
                    },
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {
                validateFlatTree(listView);

                list.unshift({
                    title: "N0",
                    group: 0
                });

                return waitForItemsLoaded(listView);
            }).then(function () {
                    return WinJS.Promise.timeout(50);
                }).then(function () {
                    LiveUnit.Assert.areEqual(1, animationsStarted);

                    validateFlatTree(listView);
                    verifyTile(listView, 0, "N0");
                    verifyTile(listView, 1, "Tile0");

                    layoutExpected = false;
                    list.unshift({
                        title: "N1",
                        group: 0
                    });

                    return WinJS.Promise.timeout(50);
                }).then(function () {
                    LiveUnit.Assert.areEqual(1, animationsStarted);

                    layoutExpected = true;
                    animationSignal.complete();

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    validateFlatTree(listView);
                    verifyTile(listView, 0, "N1");
                    verifyTile(listView, 1, "N0");
                    verifyTile(listView, 2, "Tile0");

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testChangedRange(complete) {
            var rangeTester = {
                expectedRange: function (start, end) {
                    this.firstIndex = start;
                    this.lastIndex = end;
                },
                verify: function (range) {
                    LiveUnit.Assert.areEqual(this.firstIndex, range.firstIndex);
                    LiveUnit.Assert.areEqual(this.lastIndex, range.lastIndex);
                }
            }

        rangeTester.expectedRange(0, COUNT - 1);
            LiveUnit.LoggingCore.logComment("Initial AffectedRange is the entire list of data.");

            var placeholder = createListViewElement();

            var data = initData(COUNT),
                list = new WinJS.Binding.List(data);

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("40px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {
                        rangeTester.verify(range);
                    },
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {
                /*replace data source */

                LiveUnit.LoggingCore.logComment("Test: replacing the data source sends a changedRange of the appropriateSize");
                list.splice(list.length - 1, 1) // Remove and item from the end of the list.
            list = new WinJS.Binding.List(data);
                list.length = COUNT - 50; // shrink the size of the list.
                listView.itemDataSource = list.dataSource;

                rangeTester.expectedRange(0, list.length - 1);  // Verify the range only goes as high as the last index in the new smaller datasource.
                return Helper.ListView.waitForReady(listView, -1)();

            }).then(function () {
                    /* verify reload */

                    LiveUnit.LoggingCore.logComment("Test: reload, changedRange is the entire dataSource.");
                    list.reverse();

                    rangeTester.expectedRange(0, list.length - 1);  // Verify the range is the entire datasource.
                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        testLayoutIsCalledForChangesToRealizedAndUnRealizedItems(complete) {

            LiveUnit.Assert.isTrue(COUNT >= 100, "Test expects a data set of at least 100 items.")

        var layoutTester = {
                testLayout: function () {
                    LiveUnit.Assert.isTrue(layoutTester.layoutRan === true);
                    layoutTester.layoutRan = false;
                },
                layoutRan: false,
            }

        var placeholder = createListViewElement();

            var data = initData(COUNT),
                list = new WinJS.Binding.List(data);

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("40px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {
                        layoutTester.layoutRan = true;
                    },
                    itemsFromRange: function (left, right) {
                        return {
                            firstIndex: 0,
                            lastIndex: 9
                        };
                    }
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {

                /* move from 0 to 10 -> insert at 5 */
                LiveUnit.LoggingCore.logComment("Test: move from 0 to 10 -> insert at 5");

                // Move from Index 0 to index 10
                list.move(0, 10); // [start= 0, end = 11)
                // Insert an item at index 5
                list.splice(5, 0, {
                    title: "N0",
                    group: 0
                }); // [start = 0, end = 12)
                return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
            }).then(function () {
                    /* change at 98 -> remove from 50 */
                    LiveUnit.LoggingCore.logComment("Test: change at 98 -> remove from 50");

                    // Change Item at index 98.
                    list.setAt(98, {
                        title: "N0",
                        group: 0
                    }); // [start = 98, end = 99)

                    // Remove item at index 50
                    list.splice(50, 1); // [start = 50, end = 98)
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* insert -> move -> insert -> change -> remove -> remove -> remove -> remove -> move -> change -> insert -> insert -> insert -> insert */
                    LiveUnit.LoggingCore.logComment("Test: batch of 'insert -> move -> insert -> change -> remove -> remove -> remove -> remove -> move -> change -> insert -> insert -> insert -> insert' operations");

                    // Insert item at index 89
                    list.splice(89, 0, {
                        title: "N0",
                        group: 0
                    }); // [start = 89, end = 90)

                    // Move item from index 90 to index 20
                    list.move(90, 20); // [start = 20, end = 90)

                    // Insert item at index 10
                    list.splice(10, 0, {
                        title: "N0",
                        group: 0
                    }); // [start = 10, end = 91)

                    // Change item at index 9
                    list.setAt(9, {
                        title: "N0",
                        group: 0
                    }); // [start = 9, end = 91)

                    // Remove 2 items from index 11
                    list.splice(11, 1) // [start = 9, end = 90)
            list.splice(11, 1) // [start = 9, end = 89)

            // Remove 2 items from index 6
            list.splice(6, 2) // [start = 6, end = 87)

            // Move item at index 7 to index 87
            list.move(7, 22) // [start = 6, end = 88)

            // Change item at index 66
            list.setAt(66, {
                        title: "N0",
                        group: 0
                    }); // [start = 6, end = 88)

                    // Insert item at index 7
                    list.splice(7, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 6, end = 89)

            // Insert item at index 6
            list.splice(6, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 6, end = 90)

            // Insert item at index 5
            list.splice(5, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 5, end = 91)

            // Insert item at index 90
            list.splice(90, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 4, end = 92)
            return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* reload */
                    LiveUnit.LoggingCore.logComment("Test: reload");

                    list.reverse(); // trigger reload, make sure the range is the entire list
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* remove at index 33 */
                    LiveUnit.LoggingCore.logComment("Test: single remove at index 33");

                    list.splice(33, 1); // [firstIndex = 32, lastIndex = 33)
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* remove from the end */
                    LiveUnit.LoggingCore.logComment("Test: single remove from the end");
                    list.splice(list.length - 1, 1); // [firstIndex = list.length - 2, lastIndex = list.length - 2]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* remove at index 0 */

                    LiveUnit.LoggingCore.logComment("Test: single remove from index 0");
                    list.splice(0, 1); // [firstIndex = 0, lastIndex = 0]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* insert at 0 */

                    LiveUnit.LoggingCore.logComment("Test: single insert at index 0");
                    list.splice(0, 0, {
                        title: "N0",
                        group: 0
                    });// [firstIndex = 0, lastIndex = 1]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* insert at end */

                    LiveUnit.LoggingCore.logComment("Test: single insert at the end");
                    list.splice(list.length, 0, {
                        title: "N0",
                        group: 0
                    });// [firstIndex = list.length - 1, lastIndex = list.length]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* insert at index 44*/

                    LiveUnit.LoggingCore.logComment("Test: single insert at index 44");
                    list.splice(44, 0, {
                        title: "N0",
                        group: 0
                    });// [firstIndex = 43, lastIndex = 45]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* change at index 60 */

                    LiveUnit.LoggingCore.logComment("Test: change at index 60");
                    list.setAt(60, {
                        title: "N0",
                        group: 0
                    }); // [firstIndex = 59, lastIndex = 61]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* change at index 0 */

                    LiveUnit.LoggingCore.logComment("Test: change at index 0");
                    list.setAt(0, {
                        title: "N0",
                        group: 0
                    }); // [firstIndex = 0, lastIndex = 1]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* change last index */

                    LiveUnit.LoggingCore.logComment("Test: change at last index");
                    list.setAt(list.length - 1, {
                        title: "N0",
                        group: 0
                    }); // [firstIndex = list.length - 2, lastIndex = list.length-1]
                    return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* Move from first index to last index */

                    LiveUnit.LoggingCore.logComment("Test: move item from first index to last index");
                    list.move(0, list.length - 1)// [firstIndex = 0, lastIndex = list.length - 1]
            return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    /* Move from last index to first index */

                    LiveUnit.LoggingCore.logComment("Test: move item from last index to first index");
                    list.move(list.length - 1, 0) // [firstIndex = 0, lastIndex = list.length - 1]
            return Helper.ListView.waitForReady(listView, -1)().then(layoutTester.testLayout);
                }).then(function () {
                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        // Verifies that when the ListView creates containers asynchronously, it only
        // lays out the new containers rather than also relaying out the existing containers.
        testChangedRangeDuringAsyncContainerCreation(complete) {
            WinJS.UI._VirtualizeContentsView._chunkSize = 10;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;
            var lastLaidOutItem = 0;

            var placeholder = createListViewElement();
            var data = initData(COUNT),
                list = new WinJS.Binding.List(data);
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("40px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {
                        // Note that it's okay for previous changedRange.lastIndex === current changedRange.firstIndex so
                        // that one can use changedRange to infer the set of group indices that need to be laid out.
                        LiveUnit.Assert.isTrue(range.firstIndex >= lastLaidOutItem, "changedRange includes items that are already laid out");
                        lastLaidOutItem = range.lastIndex;
                        if (lastLaidOutItem + 1 === COUNT) {
                            placeholder.parentNode.removeChild(placeholder);
                            complete();
                        }
                    },
                }
            });
        }

        // Verifies that when the ListView has no containers, layout is called with
        // a changedRange of { firstIndex: 0, lastIndex: -1 }.
        testChangedRangeForDeleteAll(complete) {
            var placeholder = createListViewElement();
            var data = initData(COUNT),
                list = new WinJS.Binding.List(data),
                deletedAll = false,
                verifiedChangedRange = false;
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("40px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {
                        if (deletedAll) {
                            LiveUnit.Assert.areEqual(0, range.firstIndex);
                            LiveUnit.Assert.areEqual(-1, range.lastIndex);
                            verifiedChangedRange = true;
                        }
                    },
                }
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                list.splice(0, COUNT);
                deletedAll = true;
                return Helper.ListView.waitForReady(listView, -1)();
            }).done(function () {
                    LiveUnit.Assert.isTrue(verifiedChangedRange, "Layout should have been called after deleting all of the items");
                    complete();
                });
        }

        testBackdropClass(complete) {
            if (!Helper.Browser.supportsCSSGrid) {
                complete();
                return;
            }
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var placeholder = createListViewElement();

            var data = initData(COUNT),
                list = new WinJS.Binding.List(data);

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: new WinJS.UI.CellSpanningLayout({
                    groupInfo: {
                        enableCellSpanning: true,
                        cellWidth: 100,
                        cellHeight: 100
                    },
                    itemInfo: function () {
                    return {
                            width: 100,
                            height: 100
                        }
                },
                })
            });

            function verifyBackdrop(firstVisible, realized) {
                LiveUnit.Assert.areEqual(realized, placeholder.querySelectorAll(".win-item").length);
                LiveUnit.Assert.areEqual(list.length, placeholder.querySelectorAll(".win-container").length);
                LiveUnit.Assert.areEqual(list.length - realized, placeholder.querySelectorAll(".win-backdrop").length);

                var containers = placeholder.querySelectorAll("win-container");
                for (var i = 0; i < containers.length; i++) {
                    var isRealized = i >= firstVisible && i < (firstVisible + realized);
                    LiveUnit.Assert.areEqual(isRealized, !WinJS.Utilities.hasClass(<HTMLElement>containers[i], "win-backdrop"));
                }
            }

            return Helper.ListView.waitForReady(listView)().then(function () {
                verifyBackdrop(0, 9 * 3);

                listView.indexOfFirstVisible = 27;

                return Helper.ListView.waitForDeferredAction(listView)();
            }).then(function () {

                    verifyBackdrop(0, 9 * 5);

                    listView.indexOfFirstVisible = 0;

                    return Helper.ListView.waitForDeferredAction(listView)();
                }).then(function () {

                    verifyBackdrop(0, 9 * 3);

                    list.unshift({
                        title: "NewItem0",
                        group: 0
                    });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {

                    verifyBackdrop(0, 9 * 3);

                    list.shift();

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {

                    // We just deleted an item, and a new one won't be realized because of the
                    // skip realization on deletes optimization.
                    //
                    verifyBackdrop(0, (9 * 3) - 1);

                    for (var i = 0; i < 20; i++) {
                        list.push({
                            title: "NewItem0",
                            group: 0
                        });
                    }

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {

                    verifyBackdrop(0, 9 * 3);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }



        testDeferRealizationOnDelete(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var list = createBindingList(100);
            var listView = new ListView(element, { layout: new WinJS.UI.GridLayout(), itemDataSource: list.dataSource, itemTemplate: fixedSizeTemplate });
            Helper.ListView.waitForReady(listView)().done(function () {
                //Deleting one item won't cause a full realize
                LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());
                list.splice(0, 1);
                Helper.ListView.waitForReady(listView, 100)().then(function () {
                    LiveUnit.Assert.areEqual(99, list.length);
                    LiveUnit.Assert.areEqual(1, listView._view.deletesWithoutRealize);
                    LiveUnit.Assert.areEqual(44, getNumberOfItemsRealized());

                    // Deleting 12 more items still won't cause a full realize
                    list.splice(0, 12);
                    Helper.ListView.waitForReady(listView, 100)().then(function () {
                        LiveUnit.Assert.areEqual(87, list.length);
                        LiveUnit.Assert.areEqual(13, listView._view.deletesWithoutRealize);
                        LiveUnit.Assert.areEqual(32, getNumberOfItemsRealized());

                        // Deleting one more item will cause a full realize because we already lost one viewport full
                        // of data
                        list.splice(0, 1);
                        Helper.ListView.waitForReady(listView, 100)().then(function () {
                            LiveUnit.Assert.areEqual(86, list.length);
                            LiveUnit.Assert.areEqual(0, listView._view.deletesWithoutRealize);
                            LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());
                            element.parentNode.removeChild(element);
                            complete();
                        });
                    });
                });
            });
        }

        testDeferRealizationOnDeleteNotJustDeletes(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var list = createBindingList(100);
            var listView = new ListView(element, { layout: new WinJS.UI.GridLayout(), itemDataSource: list.dataSource, itemTemplate: fixedSizeTemplate });
            Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());
                //Deleting one item + inserting another one will cause a full realize
                list.splice(0, 1);
                list.splice(0, 0, { title: "title New", itemWidth: "80px", itemHeight: "80px" });
                Helper.ListView.waitForReady(listView, 100)().then(function () {
                    LiveUnit.Assert.areEqual(100, list.length);
                    LiveUnit.Assert.areEqual(0, listView._view.deletesWithoutRealize);
                    LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());
                    element.parentNode.removeChild(element);
                    complete();
                });
            });
        }

        testDeferRealizationOnDeleteWithDataModificationsDuringAnimation(complete) {
            var listViewNode = document.createElement("DIV");
            listViewNode.innerHTML = "<div style='width:600px; height:400px;'></div>";
            VirtualizeContentsViewTestHost.appendChild(listViewNode);
            var renderer = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("DIV");
                    element.textContent = item.data.title;
                    element.style.height = "40px";
                    element.style.width = "400px";
                    return element;
                });
            };
            var getDataSource = function () {
                var items = [];
                for (var i = 0; i < 100; ++i) {
                    items[i] = { title: "Tile" + i };
                }
                return new WinJS.Binding.List(items).dataSource;
            }

        var listLayout = new WinJS.UI.ListLayout();
            var listView = new ListView(<HTMLElement>listViewNode.firstElementChild, {
                itemDataSource: getDataSource(),
                itemTemplate: renderer,
                layout: listLayout
            });
            Helper.ListView.waitForReady(listView, -1)().then(function () {
                listView.itemDataSource.list.splice(0, 2);
                setTimeout(function () {
                    listView.itemDataSource.list.splice(0, 1);
                    requestAnimationFrame(function () {
                        for (var i = 0; i < 3; i++) {
                            listView.itemDataSource.insertAtStart(null, { title: "New Title: " + i });
                        }
                        Helper.ListView.waitForReady(listView, -1)().then(function () {
                            LiveUnit.Assert.areEqual("New Title: 2", listView.elementFromIndex(0).textContent);
                            LiveUnit.Assert.areEqual("New Title: 1", listView.elementFromIndex(1).textContent);
                            LiveUnit.Assert.areEqual("New Title: 0", listView.elementFromIndex(2).textContent);
                            LiveUnit.Assert.areEqual("Tile3", listView.elementFromIndex(3).textContent);
                            LiveUnit.Assert.areEqual("Tile4", listView.elementFromIndex(4).textContent);
                            VirtualizeContentsViewTestHost.removeChild(listViewNode);
                            complete();
                        });
                    });
                }, 300);
            });
        }

        // Regression test for WinBlue: 88018
        testEnsureVisibleAfterDataChange(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var newNode = document.createElement("div");
            newNode.innerHTML =
            "<div id='testListView' style='width:400px; height:300px'></div>" +
            "<div id='simpleTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
            VirtualizeContentsViewTestHost.appendChild(newNode);
            var listView = setupMailStyleListView();
            var tests = [
                function () {
                    // First, delete a single item (this will use the deferRealizationOnDelete optimization).
                    // Then, invoke ensurevisible(0), which does not cause a full relayout
                    // This should complete the animation, layout items properly and not leave any gaps
                    // in the ListView.
                    //
                    listView.itemDataSource.itemFromIndex(0).then(function (item) {
                        listView.itemDataSource.beginEdits();
                        listView.itemDataSource.remove(item.key);
                        listView.itemDataSource.endEdits();
                        listView.ensureVisible(0);
                    });
                    return true;
                },
                function () {
                    var initialContainersCount = 9;

                    // Verify that we did not do a full realize
                    //
                    LiveUnit.Assert.areEqual(initialContainersCount - 1, getNumberOfItemsRealized(), "With deferRealizationOnDelete on, the ListView should have 1 less container since the scenario should not do a full realize");

                    VirtualizeContentsViewTestHost.removeChild(newNode);
                    complete();
                }
            ];
            Helper.ListView.runTests(listView, tests);
        }

        testScrollAfterSkippedRealization(complete) {
            Helper.initUnhandledErrors();

            var newNode = document.createElement("div");
            newNode.innerHTML =
            "<div id='testListView' style='width:400px; height:300px'></div>" +
            "<div id='simpleTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
            VirtualizeContentsViewTestHost.appendChild(newNode);
            var listView = setupMailStyleListView();

            var key;
            listView.itemDataSource.itemFromIndex(0).then(function (item) {
                key = item.key;

                return Helper.ListView.waitForReady(listView)();
            }).then(function () {
                    listView.scrollPosition = 1850;
                    listView.itemDataSource.remove(key);

                    return WinJS.Promise.timeout(10);
                }).then(function () {
                    listView.scrollPosition += 10;

                    return Helper.validateUnhandledErrorsOnIdle();
                }).done(function () {
                    VirtualizeContentsViewTestHost.removeChild(newNode);
                    complete();
                });
        }

        testSingleDeleteUpdateFollowedByInserts(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var newNode = document.createElement("div");
            newNode.innerHTML =
            "<div id='testListView' style='width:400px; height:300px'></div>" +
            "<div id='simpleTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
            VirtualizeContentsViewTestHost.appendChild(newNode);
            var listView = setupMailStyleListView();
            Helper.ListView.waitForReady(listView)().then(function () {
                // Delete a single item. This will use the defer realization on delete optimization and
                // try to skip a full realization. However, another update will arrive to insert
                // two items. This should force us to do a full realization.
                //
                listView.itemDataSource.itemFromIndex(0).then(function (item) {
                    listView.itemDataSource.beginEdits();
                    listView.itemDataSource.remove(item.key);
                    listView.itemDataSource.endEdits();

                    listView.itemDataSource.beginEdits();
                    var data1 = { title: "Inserted Item 1" };
                    var data2 = { title: "Inserted Item 2" };
                    listView.itemDataSource.insertAtStart(null, data1);
                    listView.itemDataSource.insertAtStart(null, data2);
                    listView.itemDataSource.endEdits();
                });
                return Helper.ListView.waitForDeferredAction(listView)();
            }).then(function () {
                    var initialContainersCount = 9;

                    // Verify that we did a full realize
                    //
                    LiveUnit.Assert.areEqual(initialContainersCount, getNumberOfItemsRealized(), "The ListView should have all the containers it started with since the scenario should do a full realize");

                    complete();
                });
        }

        // Regression test for WinBlue: 88791
        //
        testCompleteEventOnReloadForHightZeroFollowedByResize(complete) {
            var newNode = document.createElement("div");
            newNode.innerHTML =
            "<div style='width:600px; height:0px;'></div>" +
            "<div id='simpleTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
            VirtualizeContentsViewTestHost.appendChild(newNode);
            var renderer = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("DIV");
                    element.textContent = item.data.title;
                    element.style.height = "40px";
                    element.style.width = "400px";
                    return element;
                });
            };

            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }

            var controller = {
                directivesForMethod: function (method, args) {
                    return {
                        callMethodSynchronously: false,
                        sendChangeNotifications: true,
                        countBeforeDelta: 0,
                        countAfterDelta: 0,
                        countBeforeOverride: -1,
                        countAfterOverride: -1,
                        delay: 50
                    };
                }
            };
            var dataSource = Helper.ItemsManager.createTestDataSource(items.slice(0), controller, null);

            var layout = new WinJS.UI.ListLayout();
            var listView = new ListView(<HTMLElement>newNode.firstElementChild, {
                itemDataSource: dataSource,
                selectionMode: "multi",
                itemTemplate: Helper.ListView.createRenderer("simpleTemplate"),
                layout: layout
            });
            listView.addEventListener("loadingstatechanged", loadingStateChanged);

            WinJS.Promise.timeout(10).then(function () {
                listView.itemDataSource.beginEdits();
                var data1 = { title: "Inserted Item 1" };
                listView.itemDataSource.insertAtStart(null, data1);
                listView.itemDataSource.endEdits();
                WinJS.Promise.timeout(50).then(function () {
                    listView.element.style.height = "400px";
                });
            });

            function loadingStateChanged() {
                if (listView.loadingState === "complete") {
                    listView.removeEventListener("loadingstatechanged", loadingStateChanged);
                    // Ensure that when we start with height 0 and get a resize, we realize items
                    // for the last viewport value and fire the complete event.
                    //
                    VirtualizeContentsViewTestHost.removeChild(newNode);
                    complete();
                }
            }
        }

        testReadySignalOrder(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.createElement("div");
            element.style.width = "100px";
            element.style.height = "200px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var rendering = [];

            var renderer = function (itemPromise) {
                var itemIndex;

                var element = document.createElement("DIV");
                element.style.width = element.style.height = "100px";

                return {
                    element: element,
                    renderComplete: itemPromise.then(function (item) {
                        itemIndex = item.index;
                        rendering.push(itemIndex + "e");
                        element.textContent = item.data.title;
                        return item.ready;
                    }).then(function () {
                            rendering.push(itemIndex + "r");
                        })
                };
            };

            var list = createBindingList(100);
            var listView = new ListView(element, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: renderer
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                /* during startup order is
                 - render on screen items
                 - raise ready signal for on screen items
                 - render off screen items
                 - raise ready signal for off screen items
                 The item at index 0 is handled differently since it is rendered and its ready signal is raised by layout which measures it.
                 */
                Helper.ListView.elementsEqual(["0e", "0r", "1e", "1r", "2e", "3e", "4e", "5e", "2r", "3r", "4r", "5r"], rendering);
                rendering = [];

                // scroll to right
                listView.indexOfFirstVisible = 16;
                return Helper.ListView.waitForDeferredAction(listView)();
            }).then(function () {
                    /* during scrolling order is:
                     - render on screen items
                     - render front off screen items
                     - raise ready signal for on screen items
                     - raise ready signal for front off screen items
                     - render back off screen items
                     - raise ready signal for back off screen items
                     */
                    Helper.ListView.elementsEqual(["16e", "17e", "18e", "19e", "20e", "21e", "16r", "17r", "18r", "19r", "20r", "21r", "15e", "14e", "13e", "12e", "15r", "14r", "13r", "12r"], rendering);
                    rendering = [];

                    // scroll to left
                    listView.indexOfFirstVisible = 6;
                    return Helper.ListView.waitForDeferredAction(listView)();
                }).then(function () {
                    Helper.ListView.elementsEqual(["7e", "6e", "5e", "4e", "3e", "2e", "7r", "6r", "5r", "4r", "3r", "2r", "8e", "9e", "10e", "11e", "8r", "9r", "10r", "11r"], rendering);

                    element.parentNode.removeChild(element);
                    complete();
                });

        }

        testReadySignalOrderWithSlowDataSource(complete) {

            function createDataSource() {
                var blockSize = 10,
                    dataBlocks = [],
                    check = [];
                for (var i = 0; i < 50; i++) {
                    dataBlocks.push(new WinJS._Signal());
                    check.push(false);
                }

                function unblockRange(first, last) {
                    for (var i = Math.floor(first / blockSize); i <= Math.floor(last / blockSize); i++) {
                        dataBlocks[i].complete();
                        check[i] = true;
                    }
                }

                unblockRange(0, 10);
                unblockRange(300, 499);
                unblockRange(210, 239);

                function pause() {
                    return WinJS.Promise.timeout(200);
                }

                pause().then(function () {
                    unblockRange(240, 259);
                    return pause();
                }).then(function () {
                        unblockRange(200, 209);
                        return pause();
                    }).then(function () {
                        unblockRange(280, 299);
                        return pause();
                    }).then(function () {
                        unblockRange(260, 279);
                        return pause();
                    }).then(function () {
                        unblockRange(0, 50);
                        return pause();
                    }).then(function () {
                        unblockRange(150, 199);
                        return pause();
                    }).then(function () {
                        unblockRange(50, 79);
                        return pause();
                    }).then(function () {
                        unblockRange(80, 109);
                        return pause();
                    }).then(function () {
                        unblockRange(110, 129);
                        return pause();
                    }).then(function () {
                        unblockRange(130, 149);
                        return pause();
                    });

                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        return new WinJS.Promise(function (complete, error) {
                            if (index >= 0 && index < (blockSize * dataBlocks.length)) {
                                var startIndex = Math.max(0, index - countBefore),
                                    endIndex = Math.min(index + countAfter, Math.min(startIndex + blockSize - 1, (blockSize * dataBlocks.length) - 1)),
                                    size = endIndex - startIndex + 1;

                                var startBlock = Math.floor(startIndex / blockSize),
                                    endBlock = Math.floor(endIndex / blockSize);
                                WinJS.Promise.join([dataBlocks[startBlock].promise, dataBlocks[endBlock].promise]).then(function () {


                                    var items = [];
                                    for (var i = startIndex; i < startIndex + size; i++) {
                                        items.push({
                                            key: i.toString(),
                                            data: {
                                                title: "Tile" + i
                                            }
                                        });
                                    }

                                    complete({
                                        items: items,
                                        offset: index - startIndex,
                                        totalCount: (blockSize * dataBlocks.length),
                                        absoluteIndex: index
                                    });
                                });
                            } else {
                                complete({});
                            }
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.wrap((blockSize * dataBlocks.length));
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var element = document.createElement("div");
            element.style.width = "500px";
            element.style.height = "500px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var readyIndices = [];

            var renderer = function (itemPromise) {
                var itemIndex;

                var element = document.createElement("DIV");
                element.style.width = element.style.height = "50px";

                return {
                    element: element,
                    renderComplete: itemPromise.then(function (item) {
                        itemIndex = item.index;
                        element.textContent = item.data.title;
                        return item.ready;
                    }).then(function () {
                            readyIndices.push(itemIndex);
                        })
                };
            };

            var listView = new ListView(element, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: createDataSource(),
                itemTemplate: renderer,
                indexOfFirstVisible: 200
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                var expected = [];
                for (var i = 200; i < 500; i++) {
                    expected.push(i);
                }
                for (i = 199; i >= 0; i--) {
                    expected.push(i);
                }
                Helper.ListView.elementsEqual(expected, readyIndices);

                element.parentNode.removeChild(element);
                complete();
            });
        }

        testSuppressCallbacksDuringScrolling(complete) {

            function checkTile(listView, index) {
                var element = listView.elementFromIndex(index);
                LiveUnit.Assert.areEqual("Tile" + index, element.textContent);
            }

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            element.addEventListener("loadingstatechanged", function (eventObject) {
                stateChangeCounter[eventObject.target['winControl'].loadingState]++;
            });

            var renderer = function (itemPromise) {
                var itemIndex;

                var element = document.createElement("DIV");
                element.style.width = element.style.height = "100px";

                return {
                    element: element,
                    renderComplete: itemPromise.then(function (item) {
                        itemIndex = item.index;
                        element.textContent = item.data.title;
                    })
                };
            };

            var data = initData(200),
                list = new WinJS.Binding.List(data);

            var listView = new ListView(element, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: renderer
            });

            Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoading);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                listView._onMSManipulationStateChanged({ currentState: 1 });
                WinJS.Utilities.setScrollPosition(listView._viewport, { scrollLeft: 1500, scrollTop: 0 });

                return WinJS.Promise.timeout(300);
            }).then(function () {
                    LiveUnit.Assert.areEqual(45, listView.indexOfFirstVisible);
                    checkTile(listView, 45);

                    LiveUnit.Assert.areEqual(2, stateChangeCounter.itemsLoading);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                    WinJS.Utilities.setScrollPosition(listView._viewport, { scrollLeft: 3000, scrollTop: 0 });

                    return WinJS.Promise.timeout(300);
                }).then(function () {

                    LiveUnit.Assert.areEqual(90, listView.indexOfFirstVisible);
                    checkTile(listView, 90);

                    LiveUnit.Assert.areEqual(2, stateChangeCounter.itemsLoading);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                    listView._onMSManipulationStateChanged({ currentState: 0 });

                    return WinJS.Promise.timeout(100);
                }).then(function () {

                    LiveUnit.Assert.areEqual(2, stateChangeCounter.itemsLoading);
                    LiveUnit.Assert.areEqual(2, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(2, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(2, stateChangeCounter.complete);

                    WinJS.Utilities.setScrollPosition(listView._viewport, { scrollLeft: 0, scrollTop: 0 });

                    return WinJS.Promise.timeout(50);
                }).then(function () {

                    LiveUnit.Assert.areEqual(3, stateChangeCounter.itemsLoading);
                    LiveUnit.Assert.areEqual(2, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(2, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(2, stateChangeCounter.complete);

                    return Helper.ListView.waitForReady(listView)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(3, stateChangeCounter.itemsLoading);
                    LiveUnit.Assert.areEqual(3, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(3, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(3, stateChangeCounter.complete);

                    element.parentNode.removeChild(element);
                    complete();
                });
        }

        testWaitingForItemRenderers(complete) {

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var signal = new WinJS._Signal(),
                signaled;

            var renderer = function (itemPromise) {
                var itemIndex;

                var element = document.createElement("DIV");
                element.style.width = element.style.height = "100px";

                return {
                    element: element,
                    renderComplete: itemPromise.then(function (item) {
                        itemIndex = item.index;
                        element.textContent = item.data.title;
                        return signal.promise;
                    })
                };
            };

            var data = initData(200),
                list = new WinJS.Binding.List(data);

            var listView = new ListView(element, {
                layout: new WinJS.UI.GridLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: renderer
            });

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            element.addEventListener("loadingstatechanged", function () {
                stateChangeCounter[listView.loadingState]++;

                switch (listView.loadingState) {
                    case "viewPortLoaded":
                        LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                        LiveUnit.Assert.areEqual(0, stateChangeCounter.itemsLoaded);
                        LiveUnit.Assert.areEqual(0, stateChangeCounter.complete);
                        break;
                    case "itemsLoaded":
                        LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                        LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                        LiveUnit.Assert.areEqual(0, stateChangeCounter.complete);

                        WinJS.Promise.timeout(300).then(function () {
                            LiveUnit.Assert.areEqual(0, stateChangeCounter.complete);
                            signaled = true;
                            signal.complete();
                        });

                        break;
                    case "complete":
                        LiveUnit.Assert.isTrue(signaled);
                        LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                        LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                        LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                        element.parentNode.removeChild(element);
                        complete();
                        break;
                }
            });
        }

        testAsynchronousLayoutsDoNotRunConcurrently(complete) {

            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = 0;

            var placeholder = createListViewElement();

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            placeholder.addEventListener("loadingstatechanged", function (eventObject) {
                stateChangeCounter[eventObject.target['winControl'].loadingState]++;
            });

            var data = initData(BIG_DATASET),
                list = new WinJS.Binding.List(data);

            var layouInProgress;

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {

                        LiveUnit.Assert.isFalse(layouInProgress);
                        layouInProgress = true;
                        // this is clearly broken
                        var completeLayoutPromise = new WinJS.Promise(function (c) { });
                        completeLayoutPromise.then(
                            function (c: any) {
                                WinJS.Promise.timeout(5 * 1000).then(function () {
                                    layouInProgress = false;
                                    c();
                                });
                            },
                            function (error) {
                                layouInProgress = false;
                            }
                            );

                        return {
                            realizedRangeComplete: WinJS.Promise.wrap(),
                            layoutComplete: completeLayoutPromise
                        };
                    },
                    itemsFromRange: function (left, right) {
                        return {
                            firstIndex: 0,
                            lastIndex: 3
                        };
                    }
                }
            });

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);
                LiveUnit.Assert.isTrue(placeholder.querySelectorAll(".win-container").length < BIG_DATASET);

                listView._view._state.layoutNewContainers();

                jobNode.resume();

                return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
            }).then(function () {

                    LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                    LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);
                    LiveUnit.Assert.areEqual(BIG_DATASET, placeholder.querySelectorAll(".win-container").length);

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });

        }

        testEditDuringAsyncLayout(complete) {
            var placeholder = createListViewElement();

            var data = initData(),
                list = new WinJS.Binding.List(data);

            var layouInProgress,
                layuoutCanceled;

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {

                        LiveUnit.Assert.isFalse(layouInProgress);
                        layouInProgress = true;
                        // this is clearly broken
                        var completeLayoutPromise = new WinJS.Promise(function (c) { });
                        completeLayoutPromise.then(
                            function (c: any) {
                                WinJS.Promise.timeout(10 * 1000).then(function () {
                                    layouInProgress = false;
                                    c();
                                });
                            },
                            function (error) {
                                layuoutCanceled = true;
                                layouInProgress = false;
                            }
                            );

                        return {
                            realizedRangeComplete: WinJS.Promise.wrap(),
                            layoutComplete: completeLayoutPromise
                        };
                    },
                    itemsFromRange: function (left, right) {
                        return {
                            firstIndex: 0,
                            lastIndex: 3
                        };
                    }
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.isTrue(layouInProgress);

                list.unshift({
                    title: "SNI",
                    group: 0
                });

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                    LiveUnit.Assert.isTrue(layuoutCanceled);
                    layuoutCanceled = false;

                    validateFlatTree(listView);

                    listView.dispose();

                    LiveUnit.Assert.isTrue(layuoutCanceled);
                    LiveUnit.Assert.isFalse(layouInProgress);

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        testDatasourceChangeDuringAsyncLayout(complete) {
            var placeholder = createListViewElement();

            var data1 = initData(),
                list1 = new WinJS.Binding.List(data1),
                data2 = initData(1),
                list2 = new WinJS.Binding.List(data2);

            var layouInProgress,
                layuoutCanceled;

            var listView = new ListView(placeholder, {
                itemDataSource: list1.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: {
                    initialize: function (site, groups) {
                        return "vertical";
                    },
                    layout: function (tree, range) {

                        LiveUnit.Assert.isFalse(layouInProgress);
                        layouInProgress = true;
                        // this is clearly broken
                        var completeLayoutPromise = new WinJS.Promise(function (c) { });
                        completeLayoutPromise.then(
                            function (c: any) {
                                WinJS.Promise.timeout(10 * 1000).then(function () {
                                    layouInProgress = false;
                                    c();
                                });
                            },
                            function (error) {
                                layuoutCanceled = true;
                                layouInProgress = false;
                            }
                            );

                        return {
                            realizedRangeComplete: WinJS.Promise.wrap(),
                            layoutComplete: completeLayoutPromise
                        };
                    },
                    itemsFromRange: function (left, right) {
                        return {
                            firstIndex: 0,
                            lastIndex: 3
                        };
                    }
                }
            });

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.isTrue(layouInProgress);

                listView.itemDataSource = list2.dataSource;

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                    LiveUnit.Assert.isTrue(layuoutCanceled);
                    layuoutCanceled = false;

                    validateFlatTree(listView);

                    listView.dispose();

                    LiveUnit.Assert.isTrue(layuoutCanceled);
                    LiveUnit.Assert.isFalse(layouInProgress);

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        testMaxDeferredItemCleanup(complete) {
            var MAX_DEFERRED_ITEM_CLEANUP = 10;

            var itemsCount = BIG_DATASET,
                list = new WinJS.Binding.List(initData(itemsCount));

            var placeholder = createListViewElement();

            var realizedItemsCount = 0;

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.className = "myVVTestClass win-disposable";
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    element.dispose = function () {
                        if (this.disposed) {
                            LiveUnit.Assert.fail("Disposed was called again.");
                        }
                        this.disposed = true;
                        realizedItemsCount--;
                    };
                    realizedItemsCount++;
                    return element;
                });
            }
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: new WinJS.UI.GridLayout()
            });

            LiveUnit.Assert.areEqual(Number.MAX_VALUE, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = 11;
            LiveUnit.Assert.areEqual(11, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = undefined;
            LiveUnit.Assert.areEqual(0, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = 12;
            LiveUnit.Assert.areEqual(12, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = null;
            LiveUnit.Assert.areEqual(0, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = -123;
            LiveUnit.Assert.areEqual(0, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = 0;
            LiveUnit.Assert.areEqual(0, listView.maxDeferredItemCleanup);

            listView.maxDeferredItemCleanup = MAX_DEFERRED_ITEM_CLEANUP;

            function scroll() {
                return new WinJS.Promise(function (complete) {
                    function scrollWorker() {
                        LiveUnit.Assert.isTrue(realizedItemsCount <= MAX_DEFERRED_ITEM_CLEANUP + (listView._view.end - listView._view.begin));

                        if (listView.scrollPosition < 2500) {
                            listView.scrollPosition = listView.scrollPosition + 50;
                            setTimeout(scrollWorker, 100);
                        } else {
                            complete();
                        }
                    }
                    scrollWorker();
                });
            }

            return Helper.ListView.waitForReady(listView)().then(function () {

                listView._onMSManipulationStateChanged({ currentState: 1 });

                return scroll();

            }).then(function () {

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        testInsertsAnimationStartsBeforeRealizationIsDone(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            function getNumberOfNewItemsRealized() {
                return document.querySelectorAll(".win-listview .win-item.new").length;
            }

            var list = createBindingList(100);
            var listView = new ListView(element, {
                layout: new WinJS.UI.ListLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var el = document.createElement("div");
                        el.textContent = item.data.title;
                        el.style.width = "417px";
                        el.style.height = "20px";
                        el.className = item.data.className ? item.data.className : ""
                    return el;
                    });
                }
            });
            Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());

                var oldExecuteAnimations = listView.layout.executeAnimations;
                listView.layout.executeAnimations = function () {
                    LiveUnit.Assert.isTrue(getNumberOfNewItemsRealized() < 10, "By the time the animation starts, we should have not realized all the items inserted");
                    oldExecuteAnimations.call(listView.layout);
                };
                for (var i = 0; i < 30; i++) {
                    list.splice(12 + i, 0, { title: "title New " + i, className: "new" });
                }

                Helper.ListView.waitForDeferredAction(listView)().then(function () {
                    LiveUnit.Assert.areEqual(30, getNumberOfNewItemsRealized(), "All 30 inserted items should now be realized");
                    LiveUnit.Assert.areEqual(45, getNumberOfItemsRealized());
                    VirtualizeContentsViewTestHost.removeChild(element);
                    complete();
                });
            });
        }

        testDeleteAnimationStartsBeforeUpdateTreeIsDone(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            function getNumberOfNewItemsRealized() {
                return document.querySelectorAll(".win-listview .win-itemscontainer .win-item").length;
            }

            function getInnerHTMLForContainer(index) {
                return (<HTMLElement>document.querySelectorAll(".win-listview .win-itemscontainer .win-container")[index]).innerHTML;
            }

            var list = createBindingList(100);
            var listView = new ListView(element, {
                layout: new WinJS.UI.ListLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var el = document.createElement("div");
                        el.textContent = item.data.title;
                        el.style.height = "20px";
                        el.style.width = "417px";
                        el.className = item.data.className ? item.data.className : ""
                    return el;
                    });
                }
            });

            if (!listView.layout['_usingStructuralNodes']) {
                VirtualizeContentsViewTestHost.removeChild(element);
                complete();
                return;
            }

            listView.ensureVisible(20);
            Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(51, getNumberOfItemsRealized());

                var oldExecuteAnimations = listView.layout.executeAnimations;
                listView.layout.executeAnimations = function () {
                    // Container at index 5 is above the viewport, so we did not reparent (it is deferred)
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(5).indexOf("title5") >= 0);

                    // Container at index 6 is the first item in the viewport, so we did reparent it
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(6).indexOf("title7") >= 0);

                    // Container at index 20 is the last item in the viewport, so we did reparent it
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(20).indexOf("title21") >= 0);

                    //We should have an empty container since we deferred reparenting to start the animation sooner
                    LiveUnit.Assert.areEqual("", getInnerHTMLForContainer(21));

                    // Container at index 22 is below the viewport, so we did not reparent (it is deferred)
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(22).indexOf("title22") >= 0);

                    oldExecuteAnimations.call(listView.layout);
                };

                list.splice(0, 1);

                Helper.ListView.waitForDeferredAction(listView)().then(function () {
                    // Reparenting should be all done for items before, on, after the viewport
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(5).indexOf("title6") >= 0);
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(6).indexOf("title7") >= 0);
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(20).indexOf("title21") >= 0);
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(21).indexOf("title22") >= 0);
                    LiveUnit.Assert.isTrue(getInnerHTMLForContainer(22).indexOf("title23") >= 0);
                    LiveUnit.Assert.areEqual(50, getNumberOfItemsRealized(), "Defer realize optimization did not work");
                    VirtualizeContentsViewTestHost.removeChild(element);
                    complete();
                });
            });
        }

        testInsertItemWithDeferredUnrealizedNonAnimatedItems(complete) {
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            function getNumberOfNewItemsRealized() {
                return document.querySelectorAll(".win-listview .win-itemscontainer .win-item").length;
            }

            var list = createBindingList(100);
            var listView = new ListView(element, {
                layout: new WinJS.UI.ListLayout(),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var el = document.createElement("div");
                        el.textContent = item.data.title;
                        el.style.height = "20px";
                        el.style.width = "417px";
                        el.className = item.data.className ? item.data.className : ""
                    return el;
                    });
                }
            });
            listView.ensureVisible(20);
            Helper.ListView.waitForReady(listView)().then(function () {
                // We start with 51 realized items
                LiveUnit.Assert.areEqual(51, Object.keys(listView._view.items._itemData).length);
                LiveUnit.Assert.areEqual(51, getNumberOfItemsRealized());

                var oldExecuteAnimations = listView.layout.executeAnimations;
                listView.layout.executeAnimations = function () {
                    // We used to have 51 realized items, then inserted an item, which means that we will drop
                    // one item. However, we deferred the unrealize of the 1 item that goes away. Before
                    // the animation starts we should have 52 realized items.
                    LiveUnit.Assert.areEqual(52, Object.keys(listView._view.items._itemData).length);
                    // Ensure 2 are not sharing the same parent. Note that structural nodes being disabled
                    // will cause the DOM to be slightly different. Without them we'll have 52 win-items
                    // and with them we'll have only 51.
                    LiveUnit.Assert.areEqual(0, document.querySelectorAll(".win-itembox:nth-child(2)").length);
                    oldExecuteAnimations.call(listView.layout);
                };

                // Insert one item
                listView.itemDataSource.list.splice(7, 0, { title: "new item", itemWidth: "80px", itemHeight: "80px" });

                Helper.ListView.waitForDeferredAction(listView)().then(function () {
                    // Eventually, we end up with only 51 realized items (as we started before the insert)
                    LiveUnit.Assert.areEqual(51, getNumberOfItemsRealized());
                    VirtualizeContentsViewTestHost.removeChild(element);
                    complete();
                });
            });
        }



        testAnimationInViewportPendingFlagTrue(complete) {
            generateAnimationInViewportPendingFlagTest(complete, 2, true);
        }

        testAnimationInViewportPendingFlagFalse(complete) {
            generateAnimationInViewportPendingFlagTest(complete, 20, false);
        }

        testSerializeRealizePasses(complete) {
            Helper.initUnhandledErrors();

            var placeholder = createListViewElement();

            var data = initData(),
                list = new WinJS.Binding.List(data);

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: new WinJS.UI.ListLayout()
            });

            placeholder.addEventListener("contentanimating", function (eventObject) {
                listView.ensureVisible(0);
                eventObject.preventDefault();
            });

            Helper.ListView.waitForDeferredAction(listView)().
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {
                    VirtualizeContentsViewTestHost.removeChild(placeholder);

                    complete();
                });
        }

        testScrollDonotCancelAnimations(complete) {
            Helper.initUnhandledErrors();

            var placeholder = createListViewElement();

            var data = initData(),
                list = new WinJS.Binding.List(data);

            var animationStarted,
                dispose;

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: {
                    initialize: function (site, groups) {
                    },
                    setupAnimations: function () {
                    },
                    layout: function (tree, changedRange, modifiedElements, modifiedGroups) {
                    },
                    executeAnimations: function () {
                        return new WinJS.Promise(
                            function init() {
                                animationStarted = true;
                            },
                            function error() {
                                LiveUnit.Assert.isTrue(dispose, "Animation was canceled");
                            }
                            );
                    },
                }
            });

            Helper.ListView.waitForReady(listView, -1)().then(function () {
                list.shift();

                return waitForItemsLoaded(listView);
            }).then(function () {
                    LiveUnit.Assert.isTrue(animationStarted);

                    listView.ensureVisible(10);

                    return waitForItemsLoaded(listView);
                }).then(function () {
                    list.shift();

                    return WinJS.Promise.timeout();
                }).then(function () {

                    dispose = true;
                    listView.dispose();
                    VirtualizeContentsViewTestHost.removeChild(placeholder);

                    complete();
                });
        }




        testNoProgressRingInEmptyView(complete) {
            var lv = new ListView();

            VirtualizeContentsViewTestHost.appendChild(lv.element);

            var origDelay = WinJS.UI._LISTVIEW_PROGRESS_DELAY;
            WinJS.UI._LISTVIEW_PROGRESS_DELAY = 0;

            Helper.ListView.waitForReady(lv, 1000)().done(function () {
                LiveUnit.Assert.isFalse(VirtualizeContentsViewTestHost.querySelector("." + WinJS.UI._progressClass));
                VirtualizeContentsViewTestHost.removeChild(lv.element);
                WinJS.UI._LISTVIEW_PROGRESS_DELAY = origDelay;
                lv.dispose();
                complete();
            });
        }


        testDeferContainerCreationUntilSeZoZoomCompletes(complete) {
            var wrapper = document.createElement("div");
            wrapper.innerHTML = "<div id='sezo'><div></div><div></div></div>";
            var sezoDiv = <HTMLElement>wrapper.firstElementChild;
            var data = [];
            for (var i = 0; i < 200; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return item.data + "";
            }, function (item) {
                    return { data: item.data + "" };
                });

            var zoomedIn = new ListView(<HTMLElement>sezoDiv.children[0]);
            var zoomedOut = new ListView(<HTMLElement>sezoDiv.children[1]);
            zoomedOut.itemDataSource = glist.groups.dataSource;
            zoomedIn.itemDataSource = glist.dataSource;
            zoomedIn.groupDataSource = glist.groups.dataSource;
            zoomedIn.itemTemplate = zoomedOut.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.width = div.style.height = "200px";
                    return div;
                });
            };
            var sezo = new WinJS.UI.SemanticZoom(<HTMLElement>sezoDiv);

            var containerCountAtBegin = 0;
            var oldBeginZoom = zoomedIn._beginZoom;
            zoomedIn._beginZoom = function (item, position) {
                containerCountAtBegin = zoomedIn._view.containers.length;
                return oldBeginZoom.bind(zoomedIn, item, position)();
            };

            var oldEndZoom = zoomedIn._endZoom;
            zoomedIn._endZoom = function (isCurrentView) {
                LiveUnit.Assert.areEqual(containerCountAtBegin, zoomedIn._view.containers.length, "At least one container was created during zoom.");
                oldEndZoom.bind(zoomedIn, isCurrentView)();
                WinJS.Utilities.disposeSubTree(wrapper);
                VirtualizeContentsViewTestHost.removeChild(wrapper);
                complete();
            };

            VirtualizeContentsViewTestHost.appendChild(wrapper);

            Helper.ListView.waitForReady(zoomedIn, -1)().then(function () {
                sezo.zoomedOut = true;
            });
        }


        testSlowHeaderRenderingDoesNotCrash(complete) {
            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return "header";
            }, function (item) {
                    return { data: "header" };
                });

            var lv = new ListView();
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            lv.groupHeaderTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.className = "myHeader";
                    return WinJS.Promise.timeout(1000).then(function () {
                        return div;
                    });
                });
            };

            VirtualizeContentsViewTestHost.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                LiveUnit.Assert.isTrue(VirtualizeContentsViewTestHost.querySelector(".myHeader"));
                VirtualizeContentsViewTestHost.removeChild(lv.element);
                lv.dispose();
                complete();
            });
        }

        testSlowHeaderRenderingDoesNotRenderDuplicateHeaders(complete) {
            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return item.data + "";
            }, function (item) {
                    return { data: item.data + "" };
                });
            var lv = new ListView();
            lv.element.style.width = "600px";
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            lv.groupHeaderTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.className = "myHeader" + item.data.data;
                    div.style.width = "300px";
                    div.style.height = "200px";
                    div.innerHTML = item.data.data;
                    return WinJS.Promise.timeout(1000).then(function () {
                        return div;
                    });
                });
            };

            VirtualizeContentsViewTestHost.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                lv.scrollPosition = 2000;
                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    LiveUnit.Assert.areEqual(1, VirtualizeContentsViewTestHost.querySelectorAll(".myHeader24").length);
                    VirtualizeContentsViewTestHost.removeChild(lv.element);
                    lv.dispose();
                    complete();
                });
        }

        testGetAdjacentWait(complete) {
            var itemsCount = 300,
                list = new WinJS.Binding.List(initData(itemsCount));

            var myGroupedList = list.createGrouped(groupKey, groupData);

            var placeholder = createListViewElement();

            var listView = new ListView(placeholder, {
                itemDataSource: myGroupedList.dataSource,
                groupDataSource: myGroupedList.groups.dataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: new WinJS.UI.GridLayout()
            });

            if (!listView.layout['_usingStructuralNodes']) {
                placeholder.parentNode.removeChild(placeholder);
                complete();
                return;
            }

            listView._view._createChunkWithBlocks = function (groups, count, blockSize, chunkSize) {
                Object.getPrototypeOf(listView._view)._createChunkWithBlocks.call(listView._view, groups, count, blockSize, chunkSize);
                return listView._view.containers.length >= 100;
            };

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {

                var promise = listView._view._creatingContainersWork.promise;
                jobNode.resume();

                return promise;
            }).then(function () {

                    return listView._view.getAdjacent({ type: "item", index: itemsCount - 1 }, WinJS.Utilities.Key.upArrow);

                }).done(function () {

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }

        testPanningUsingAsyncDataSourceWithMultiStageRenderers(complete) {
            function createDataSource() {
                var count = 10000;

                var dataSource = {
                    itemsFromKey: function (key, countBefore, countAfter) {
                        return this.itemsFromIndex(parseInt(key, 10), countBefore, countAfter);
                    },

                    itemsFromIndex: function (index, countBefore, countAfter) {
                        var requestedCount = countBefore + countAfter + 1;
                        return WinJS.Promise.timeout(1200).then(function () {
                            return new WinJS.Promise(function (complete, error) {
                                if (index >= 0 && index < count) {
                                    var startIndex = Math.max(0, index - countBefore),
                                        endIndex = Math.min(index + Math.max(20, countAfter), count - 1),
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
                        return WinJS.Promise.timeout(1200).then(function () {
                            return WinJS.Promise.wrap(count);
                        });
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var element = document.createElement("div");
            element.style.width = "600px";
            element.style.height = "600px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var placeholdersLoadedSignal = new WinJS._Signal();
            var listView = new ListView(element, {
                itemDataSource: createDataSource(),
                itemTemplate: function (itemPromise) {
                    if (itemPromise.handle === "290") {
                        placeholdersLoadedSignal.complete();
                    }
                    var div = document.createElement("div");
                    div.style.width = "100px";
                    div.style.height = "100px";
                    div.innerHTML = "...";
                    return {
                        element: div,
                        renderComplete: itemPromise.then(function (item) {
                            div.textContent = item.data.title;
                            return item.ready.then(function () {
                                return WinJS.Promise.timeout(1000).then(function () {
                                    div.style.backgroundColor = "red";
                                });
                            });
                        })
                    };
                }
            });


            Helper.ListView.waitForReady(listView, -1)().done(function () {
                listView.scrollPosition = 62800;
                placeholdersLoadedSignal.promise.then(function () {
                    WinJS.Promise.timeout(100).then(function () {
                        listView.scrollPosition = 62850;
                        WinJS.Promise.timeout(500).then(function () {
                            listView.scrollPosition = 62860;
                            Helper.ListView.waitForDeferredAction(listView)().then(function () {
                                var firstVisible = listView.indexOfFirstVisible;
                                var lastVisible = listView.indexOfLastVisible;

                                for (var i = firstVisible; i <= lastVisible; i++) {
                                    var item = listView.elementFromIndex(i);
                                    LiveUnit.Assert.areEqual("rgb(255, 0, 0)", getComputedStyle(item).backgroundColor);
                                }
                                VirtualizeContentsViewTestHost.removeChild(element);
                                complete();
                            });
                        });
                    });
                });
            });
        }

        testAddingItemToTheEndOfListWhileLastItemHadFocusDoesNotLoseFocus(complete) {
            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);

            var lv = new ListView();
            lv.itemDataSource = list.dataSource;
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.style.width = "200px";
                    div.style.height = "100px";
                    div.innerHTML = item.data.data;
                    return div;
                });
            };
            VirtualizeContentsViewTestHost.appendChild(lv.element);
            lv.element.focus();

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                var items = document.querySelectorAll(".win-item");
                (<HTMLElement>items[items.length - 1]).focus();

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    list.splice(list.length - 1, 0, { data: "10" });

                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(lv.element.contains(<HTMLElement>document.activeElement));

                    VirtualizeContentsViewTestHost.removeChild(lv.element);
                    lv.dispose();
                    complete();
                });
        }

        testDeleteWhileFocusIsOnLastItemDoesNotLoseFocus(complete) {
            var data = [];
            for (var i = 0; i < 390; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);

            var lv = new ListView();
            lv.itemDataSource = list.dataSource;
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.style.width = "100px";
                    div.style.height = "100px";
                    div.innerHTML = item.data.data;
                    return div;
                });
            };
            lv.element.style.height = lv.element.style.width = "600px";
            VirtualizeContentsViewTestHost.appendChild(lv.element);
            lv.element.focus();

            Helper.ListView.waitForReady(lv, 1000)().then(function () {
                var items = document.querySelectorAll(".win-item");
                lv.currentItem = { index: 389, hasFocus: true, showFocus: true };
                lv.ensureVisible(389);

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    list.dataSource.remove("0");

                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(lv.element.contains(<HTMLElement>document.activeElement));

                    complete();
                });
        }

        testAriaWorkerCancellation(complete) {
            Helper.initUnhandledErrors();

            var data = [];
            for (var i = 0; i < 5000; i++) {
                data.push({ data: "" + i });
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
                    // Making each item tiny to fit many of them in one viewport,
                    // giving aria lots of work so it cannot finish in a single
                    // timeslice.
                    var div = document.createElement("div");
                    div.style.width = "20px";
                    div.style.height = "10px";
                    div.innerHTML = item.data.data;

                    return div;
                });
            };

            lv.element.style.width = "1500px";
            lv.element.style.height = "1000px";
            VirtualizeContentsViewTestHost.appendChild(lv.element);

            var realSetupAria = lv._view._setupAria;
            lv._view._setupAria = function (timedOut) {
                lv._view._setupAria = realSetupAria;

                var cancellationPromise = realSetupAria.call(lv._view, timedOut);

                // We do 1 WinJS.Utilities._setImmediate, allowing aria to schedule its belowNormal priority
                // task, since we have 100s of items per page aria worker should need another
                // timeslice to finish its job. But before it can enter its 2nd timeslice,
                // we scroll away from the current viewport and aria worker should get
                // canceled.
                WinJS.Utilities._setImmediate(function () {
                    WinJS.Utilities.Scheduler.schedule(function () {
                        // accessibilityannotationcomplete fires when aria completes, when that happens,
                        // no errors should have been caught.
                        var scrolled = false;
                        lv.addEventListener("accessibilityannotationcomplete", function (ev) {

                            // Sometimes there can be multiple event callbacks, we want the one where aria is truly finished
                            var firstIndex = ev.detail.firstIndex;
                            var lastIndex = ev.detail.lastIndex;
                            if (firstIndex !== lastIndex) {
                                Helper.validateUnhandledErrorsOnIdle().
                                    done(function annotationcomplete() {

                                        LiveUnit.Assert.isTrue(scrolled, "Test completed before scroll");
                                        VirtualizeContentsViewTestHost.removeChild(lv.element);
                                        lv.dispose();
                                        complete();
                                    });
                            }
                        });

                        lv.scrollPosition = 20 * 1000;
                        scrolled = true;
                    }, WinJS.Utilities.Scheduler.Priority.normal);
                });

                return cancellationPromise;
            };
        }

        testDeleteDoesNotLoseFocusRectangle(complete) {
            Helper.initUnhandledErrors();

            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);

            var lv = new ListView();
            lv.itemDataSource = list.dataSource;
            lv.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.width = div.style.height = "200px";
                    div.style.margin = "5px";
                    return div;
                });
            };
            VirtualizeContentsViewTestHost.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                lv.currentItem = { index: 0, hasFocus: true, showFocus: true };
                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    LiveUnit.Assert.isTrue(document.querySelector("." + WinJS.UI._itemFocusOutlineClass),
                        "itemFocusOutline not drawn. document.hasFocus(): " + document.hasFocus() +
                        ". document requires focus to pass");
                    list.shift();
                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(document.querySelector("." + WinJS.UI._itemFocusOutlineClass),
                        "itemFocusOutline not drawn. document.hasFocus(): " + document.hasFocus() +
                        ". document requires focus to pass");
                    complete();
                });
        }

        testRealizeRetryDuringEdits(complete) {
            Helper.initUnhandledErrors();

            var list = new WinJS.Binding.List(initData());

            var placeholder = createListViewElement("400px");

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: generateRenderer("100px"),
                layout: new WinJS.UI.GridLayout()
            });

            Helper.ListView.skipFirstAnimation(listView);
            Helper.ListView.waitForReady(listView, -1)().then(function () {
                listView._versionManager.beginUpdating();
                listView.scrollPosition = 900;

                return WinJS.Promise.timeout(100);
            }).then(function () {
                    listView._versionManager.endUpdating();

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(900, listView.scrollPosition);

                    return Helper.validateUnhandledErrorsOnIdle();
                }).then(function () {

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        testUpdateContainersUpdatesToAffectedRange(complete) {

            if (!Helper.Browser.supportsCSSGrid) {
                complete();
                return;
            }

            Helper.initUnhandledErrors();

            var count = 20,
                list = new WinJS.Binding.List(initData(count));

            function itemInfo(index) {
                return {
                    width: 300,
                    height: 300
                };
            }

            function groupInfo(group) {
                return {
                    enableCellSpanning: true,
                    cellWidth: 300,
                    cellHeight: 300
                };
            }

            function getRandomColor() {
                return "rgb(" + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + "," + Math.floor(Math.random() * 256) + ")";
            }

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.className = "myVVTestClass";
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "300px";
                    element.style.backgroundColor = getRandomColor();
                    return element;
                });
            }

            var placeholder = createListViewElement("300px");

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: {
                    type: WinJS.UI.CellSpanningLayout,
                    groupInfo: groupInfo,
                    itemInfo: itemInfo
                }
            });

            Helper.ListView.skipFirstAnimation(listView);
            Helper.ListView.waitForReady(listView, -1)().then(function () {
                listView.ensureVisible(10);
                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                    list.splice(5, 5);
                    count -= 5;
                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    var containers = placeholder.querySelectorAll(".win-container");
                    LiveUnit.Assert.areEqual(count, containers.length);

                    for (var i = 0; i < count; i++) {
                        var c = <HTMLElement>containers[i];
                        LiveUnit.Assert.areEqual(i + 1, +c.style.msGridColumn);
                    }

                    return Helper.validateUnhandledErrorsOnIdle();
                }).then(function () {

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

        testDefaultPagesToPrefetch(complete) {
            // Verifies the correct default values for ListView.maxTrailingPages and ListView.maxLeadingPages are used when no values are set by the user.
            WinJS.Utilities._setIsiOS(false);

            var viewPortHeight = 300,
                count = 200,
                list = new WinJS.Binding.List(initData(count));

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var placeholder = createListViewElement(viewPortHeight + "px");
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: {
                    type: WinJS.UI.ListLayout
                },
            });

            var expectedLeadingPages = listView.maxLeadingPages,
                expectedTrailingPages = listView.maxTrailingPages;

            validatePagesToPrefetch(listView, expectedLeadingPages, expectedTrailingPages, viewPortHeight).done(complete);
        }

        testIOSDefaultPagesToPrefetch(complete) {
            // Verifies that when running in IOS the correct IOS default values for ListView.maxTrailingPages and ListView.maxLeadingPages are used.
            WinJS.Utilities._setIsiOS(true);

            var viewPortHeight = 300,
                count = 200,
                list = new WinJS.Binding.List(initData(count));

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var placeholder = createListViewElement(viewPortHeight + "px");
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: {
                    type: WinJS.UI.ListLayout
                },
            });

            var expectedLeadingPages = WinJS.UI._VirtualizeContentsView._iOSMaxLeadingPages,
                expectedTrailingPages = WinJS.UI._VirtualizeContentsView._iOSMaxTrailingPages;

            validatePagesToPrefetch(listView, expectedLeadingPages, expectedTrailingPages, viewPortHeight).done(complete);
        }

        testCustomPagesToPrefetch(complete) {
            var viewPortHeight = 300,
                count = 200,
                list = new WinJS.Binding.List(initData(count));

            var expectedLeadingPages = 0,
                expectedTrailingPages = 0;

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var placeholder = createListViewElement(viewPortHeight + "px");
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: {
                    type: WinJS.UI.ListLayout
                },
                maxLeadingPages: expectedLeadingPages,
                maxTrailingPages: expectedTrailingPages,
            });

            validatePagesToPrefetch(listView, expectedLeadingPages, expectedTrailingPages, viewPortHeight).done(complete);
        }

        testPrefetchAllPages(complete) {
            // Test that it is possible to turn off virtualization by setting ListView.maxLeadingPages and ListView.maxTrailingPages to Number.MAX_VALUE
            var viewPortHeight = 300,
                count = 200,
                list = new WinJS.Binding.List(initData(count));

            var expectedLeadingPages = Number.MAX_VALUE,
                expectedTrailingPages = Number.MAX_VALUE;

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }

            var placeholder = createListViewElement(viewPortHeight + "px");
            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: {
                    type: WinJS.UI.ListLayout
                },
                maxLeadingPages: expectedLeadingPages,
                maxTrailingPages: expectedTrailingPages,
            });

            Helper.ListView.waitForReady(listView, -1)().then(function () {
                // Verify property getters return the correct value.
                LiveUnit.Assert.areEqual(expectedLeadingPages, listView.maxLeadingPages);
                LiveUnit.Assert.areEqual(expectedTrailingPages, listView.maxTrailingPages);

                // With no virtualization we expect all items to be realized.
                var expectedRealizedCount = count;
                LiveUnit.Assert.areEqual(expectedRealizedCount, listView.element.querySelectorAll(".win-container:not(.win-backdrop)").length, "With no virtualization, we expect all items to be realized.");
            }).done(complete);
        }

        // Some browsers do not have good FlexBox behavior so we have to disable
        // structure nodes.
        testStructureNodesUsedWhenSupported(complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            VirtualizeContentsViewTestHost.appendChild(element);

            var list = createBindingList(100);
            var listView = new ListView(element, { layout: new WinJS.UI.GridLayout(), itemDataSource: list.dataSource, itemTemplate: fixedSizeTemplate });
            Helper.ListView.waitForReady(listView)().then(function () {

                var usingStructuralNodes = !!(listView._view.tree[0].itemsContainer.itemsBlocks);

                LiveUnit.Assert.areEqual(usingStructuralNodes, listView.layout['_usingStructuralNodes']);

                element.parentNode.removeChild(element);
                complete();
            });
        }

        testDeferUnrealizingUntilSeZoZoomCompletes(complete) {
            var wrapper = document.createElement("div");
            wrapper.innerHTML = "<div id='sezo'><div></div><div></div></div>";
            var sezoDiv = <HTMLElement>wrapper.firstElementChild;
            var data = [];
            for (var i = 0; i < 200; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return item.data + "";
            }, function (item) {
                    return { data: item.data + "" };
                });

            var zoomedIn = new ListView(<HTMLElement>sezoDiv.children[0]);
            var zoomedOut = new ListView(<HTMLElement>sezoDiv.children[1]);
            zoomedOut.itemDataSource = glist.groups.dataSource;
            zoomedIn.itemDataSource = glist.dataSource;
            zoomedIn.groupDataSource = glist.groups.dataSource;
            zoomedIn.itemTemplate = zoomedOut.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.width = div.style.height = "200px";
                    return div;
                });
            };
            var sezo = new WinJS.UI.SemanticZoom(sezoDiv);

            var unrealizeCount = 0;
            var oldUnrealizeItem = zoomedIn._view._unrealizeItem;
            zoomedIn._view._unrealizeItem = function (index) {
                unrealizeCount++;
                oldUnrealizeItem.bind(zoomedIn._view, index)();
            };

            var oldEndZoom = zoomedIn._endZoom;
            zoomedIn._endZoom = function (isCurrentView) {
                LiveUnit.Assert.areEqual(0, unrealizeCount, "At least one item was unrealized before zoom animation finished.");
                oldEndZoom.bind(zoomedIn, isCurrentView)();
                WinJS.Utilities.disposeSubTree(wrapper);
                VirtualizeContentsViewTestHost.removeChild(wrapper);
                complete();
            };

            VirtualizeContentsViewTestHost.appendChild(wrapper);

            Helper.ListView.waitForReady(zoomedIn, -1)().then(function () {
                zoomedIn.scrollPosition = Number.MAX_VALUE;
                sezo.zoomedOut = true;
            });
        }
        
        

    }

    var generateEditsDonotCreateAllContainersTest = function (groups, structureNodes) {

        VirtualizedViewTests.prototype["testEditsDonotCreateAllContainers" + (groups ? "WithGroups" : "") + (structureNodes ? "WithStructureNodes" : "")] = function (complete) {
            WinJS.UI._VirtualizeContentsView._chunkSize = 100;

            var itemsCount = BIG_DATASET,
                data = initData(itemsCount, 250);

            var placeholder = createListViewElement();

            var list = new WinJS.Binding.List(data),
                groupedList = list.createGrouped(groupKey, groupData);

            var cellSpanningOptions = {
                groupInfo: {
                    enableCellSpanning: true,
                    cellWidth: 100,
                    cellHeight: 100
                },
                itemInfo: function (itemIndex) {
                    return {
                        width: 100,
                        height: 100
                    };
                }
            };

            var layout;
            if (structureNodes) {
                layout = new ListLayout();
            } else {
                layout = new WinJS.UI.CellSpanningLayout(cellSpanningOptions);
            }

            var listView = new ListView(placeholder, {
                itemDataSource: groups ? groupedList.dataSource : list.dataSource,
                groupDataSource: groups ? groupedList.groups.dataSource : null,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px"),
                layout: layout
            });


            listView._view._createChunkWithBlocks = function (groups, count, blockSize, chunkSize) {
                Object.getPrototypeOf(listView._view)._createChunkWithBlocks.call(listView._view, groups, count, blockSize, chunkSize);
                if (listView._view.containers.length >= 100) {
                    return true;
                }
            };

            listView._view._createChunk = function (groups, count, chunkSize) {
                Object.getPrototypeOf(listView._view)._createChunk.call(listView._view, groups, count, chunkSize);
                if (listView._view.containers.length >= 100) {
                    return true;
                }
            };

            var jobNode;
            listView._view._scheduleLazyTreeCreation = function () {
                jobNode = Object.getPrototypeOf(listView._view)._scheduleLazyTreeCreation.call(listView._view);
                jobNode.pause();
                return jobNode;
            };

            return Helper.ListView.waitForReady(listView)().then(function () {
                LiveUnit.Assert.isTrue(structureNodes || 100 === placeholder.querySelectorAll(".win-container").length);
                LiveUnit.Assert.areEqual(100, listView._view.containers.length);

                list.splice(0, 0, {
                    title: "NewTile",
                    group: 0
                });

                return Helper.ListView.waitForReady(listView, -1)();
            }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    list.splice(0, 11);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    list.splice(10000, 0, {
                        title: "NewTile",
                        group: 40
                    });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    list.splice(10000, 200);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    itemsCount = 1000;
                    data = initData(itemsCount, 10);
                    list = new WinJS.Binding.List(data);

                    if (groups) {
                        groupedList = list.createGrouped(groupKey, groupData);
                        listView.itemDataSource = groupedList.dataSource;
                        listView.groupDataSource = groupedList.groups.dataSource;
                    } else {
                        listView.itemDataSource = list.dataSource;
                    }

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 100 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(100, listView._view.containers.length);

                    list.splice(0, 0, {
                        title: "NewTile",
                        group: 0
                    });

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    list.splice(0, 6);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    list.splice(70, 5);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(structureNodes || 101 === placeholder.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(101, listView._view.containers.length);

                    placeholder.parentNode.removeChild(placeholder);

                    complete();
                });
        }
    };

    generateEditsDonotCreateAllContainersTest(false, false);
    generateEditsDonotCreateAllContainersTest(true, false);
    generateEditsDonotCreateAllContainersTest(false, true);
    generateEditsDonotCreateAllContainersTest(true, true);

    var generateNoFocusLossAfterDeleteTest = function (layout) {
        VirtualizedViewTests.prototype["testNoFocusLossAfterDelete" + layout] = function (complete) {
            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);

            var lv = new ListView();
            lv.layout = new WinJS.UI[layout];
            lv.itemDataSource = list.dataSource;
            VirtualizeContentsViewTestHost.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, 1000)().then(function () {
                lv.currentItem = { type: WinJS.UI.ObjectType.item, index: 2, hasFocus: true };
                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    lv.itemDataSource.remove("2");
                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(document.activeElement);
                    LiveUnit.Assert.isTrue((<HTMLElement>document.activeElement).classList.contains(WinJS.UI._itemClass));
                    LiveUnit.Assert.isTrue((<HTMLElement>document.activeElement).contains(lv.elementFromIndex(2)));
                    VirtualizeContentsViewTestHost.removeChild(lv.element);
                    complete();
                });
        };
    };
    generateNoFocusLossAfterDeleteTest("GridLayout");
    generateNoFocusLossAfterDeleteTest("ListLayout");
    if (Helper.Browser.supportsCSSGrid) {
        generateNoFocusLossAfterDeleteTest("CellSpanningLayout");
    }


    var generateAnimationDuringSezoZoomingTests = function generateAnimationDuringSezoZoomingTests(operation) {
        var scrollToEnd;
        var operationArgs;
        if (operation === "remove") {
            scrollToEnd = true;
            operationArgs = ["0"];
        } else if (operation === "insert") {
            scrollToEnd = false;
            operationArgs = [null, { data: "-1" }]
            } else if (operation === "change") {
            scrollToEnd = true;
            operationArgs = ["0", { data: "99" }];
        } else {
            return;
        }

        VirtualizedViewTests.prototype["testAnimationDuringSezoZoomingAnd" + operation] = function (complete) {
            var wrapper = document.createElement("div");
            wrapper.innerHTML = "<div id='sezo'><div></div><div></div></div>";
            var sezoDiv = <HTMLElement>wrapper.firstElementChild;
            var data = [];
            for (var i = 0; i < 200; i++) {
                data.push({ data: "" + i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return item.data + "";
            }, function (item) {
                    return { data: item.data + "" };
                });

            var zoomedIn = new ListView(<HTMLElement>sezoDiv.children[0]);
            var zoomedOut = new ListView(<HTMLElement>sezoDiv.children[1]);
            zoomedOut.itemDataSource = glist.groups.dataSource;
            zoomedIn.itemDataSource = glist.dataSource;
            zoomedIn.groupDataSource = glist.groups.dataSource;
            zoomedIn.itemTemplate = zoomedOut.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.width = div.style.height = "200px";
                    return div;
                });
            };
            var sezo = new WinJS.UI.SemanticZoom(sezoDiv);
            VirtualizeContentsViewTestHost.appendChild(wrapper);

            Helper.ListView.waitForReady(zoomedIn, -1)().then(function () {
                if (scrollToEnd) {
                    zoomedIn.scrollPosition = Number.MAX_VALUE;
                }
                return Helper.ListView.waitForReady(zoomedIn, -1)();
            }).then(function () {
                    glist.dataSource[operation].apply(glist.dataSource, operationArgs);
                    sezo.zoomedOut = true;

                    return Helper.ListView.waitForReady(zoomedIn, -1)();
                }).done(function () {
                    WinJS.Utilities.disposeSubTree(wrapper);
                    VirtualizeContentsViewTestHost.removeChild(wrapper);
                    complete();
                });
        }
        };
    generateAnimationDuringSezoZoomingTests("remove");
    generateAnimationDuringSezoZoomingTests("insertAtStart");
    generateAnimationDuringSezoZoomingTests("change");

    function generateDomTrimTest(name, data, groups, scrollbarPos, viewportHeight, verify) {
        VirtualizedViewTests.prototype["testDomTrim" + name] = function (complete) {
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;
            WinJS.UI._VirtualizeContentsView._defaultPagesToPrefetch = 0;
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;

            var placeholder = createListViewElement();
            placeholder.id = "DomTrimTest";
            placeholder.style.height = viewportHeight + "px";

            placeholder.addEventListener("contentanimating", function (eventObject) {
                eventObject.preventDefault();
            });

            var layout = {
                initialize: function (site, groups) {
                    this._site = site;
                    return "vertical";
                },
                layout: function (tree) {
                    for (var i = 0; i < tree.length; i++) {
                        var itemsContainer = tree[i].itemsContainer;
                        var count = itemsContainer.itemsBlocks.reduce(function (previous, block) {
                            return previous + block.items.length;
                        }, 0);
                        itemsContainer.element.style.height = (count * itemHeight) + "px";
                    }
                },
                itemsFromRange: function (start, end) {
                    return {
                        firstIndex: Math.floor(start / itemHeight),
                        lastIndex: Math.floor(end / itemHeight)
                    };
                },
                numberOfItemsPerItemsBlock: numberOfItemsPerItemsBlock
            };

            var list = new WinJS.Binding.List(data),
                listView: WinJS.UI.PrivateListView<any>;

            if (groups) {
                var groupedList = list.createGrouped(groupKey, groupData),
                    listView = new ListView<any>(placeholder, {
                        itemDataSource: groupedList.dataSource,
                        groupDataSource: groupedList.groups.dataSource,
                        itemTemplate: generateRenderer(itemHeight + "px"),
                        groupHeaderTemplate: function () {
                            var element = document.createElement("div");
                            element.style.display = "none";
                            return element;
                        },
                        layout: layout
                    });
            } else {
                listView = new ListView(placeholder, {
                    itemDataSource: list.dataSource,
                    itemTemplate: generateRenderer(itemHeight + "px"),
                    layout: layout
                });
            }

            Helper.ListView.waitForReady(listView)().then(function () {
                listView.scrollPosition = scrollbarPos;
                return Helper.ListView.waitForDeferredAction(listView)();
            }).then(function () {
                    return verify(listView);
                }).then(function () {
                    VirtualizeContentsViewTestHost.removeChild(placeholder);
                    complete();
                });
        };
    }
    generateDomTrimTest("OneBlock", initData(), false, 0, 9 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0]);
    });
    generateDomTrimTest("SecondBlock", initData(), false, 10 * itemHeight, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [1]);
    });
    generateDomTrimTest("InMiddleOfBlock", initData(), false, 5 * itemHeight, 5 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0]);
    });
    generateDomTrimTest("InMiddleOfTwoBlocks", initData(), false, 5 * itemHeight, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(20, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0, 1]);
    });

    generateDomTrimTest("OneBlockWithGroup", initGroups([20, 20]), true, 0, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0]);
    });
    generateDomTrimTest("FirstBlockInGroup", initGroups([15, 20]), true, 0, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0]);
    });
    generateDomTrimTest("CollapseWholeGroup", initGroups([20, 20, 20]), true, 20 * itemHeight, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [2]);
    });
    generateDomTrimTest("CollapsePartOfGroup", initGroups([15, 20, 20]), true, 15 * itemHeight, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [2]);
    });
    generateDomTrimTest("BlocksAcrossGroups", initGroups([20, 20, 20]), true, 35 * itemHeight, 20 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(30, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [3, 4, 5]);
    });
    generateDomTrimTest("SimpleScroll", initData(), false, 0, 30 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(30, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0, 1, 2]);

        listView.scrollPosition = 10 * itemHeight;

        return Helper.ListView.waitForDeferredAction(listView)().then(function () {
            LiveUnit.Assert.areEqual(30, listView.element.querySelectorAll(".win-container").length);

            verifyBlockInDom(listView, [1, 2, 3]);

            listView.scrollPosition = 30 * itemHeight;
            return Helper.ListView.waitForDeferredAction(listView)();
        }).then(function () {
                LiveUnit.Assert.areEqual(30, listView.element.querySelectorAll(".win-container").length);

                verifyBlockInDom(listView, [3, 4, 5]);

                listView.scrollPosition = 20 * itemHeight;
                return Helper.ListView.waitForDeferredAction(listView)();
            }).then(function () {
                LiveUnit.Assert.areEqual(30, listView.element.querySelectorAll(".win-container").length);

                verifyBlockInDom(listView, [2, 3, 4]);
            });
    });
    generateDomTrimTest("NoGroupOverlapDuringScroll", initGroups([20, 20, 20, 20]), true, 0, 10 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0]);

        listView.scrollPosition = 40 * itemHeight;

        return Helper.ListView.waitForReady(listView, -1)().then(function () {
            LiveUnit.Assert.areEqual(10, listView.element.querySelectorAll(".win-container").length);

            verifyBlockInDom(listView, [4]);
        });
    });
    generateDomTrimTest("GroupOverlapDuringScroll", initGroups([20, 20, 20, 20, 20]), true, 0, 60 * itemHeight, function (listView) {
        LiveUnit.Assert.areEqual(60, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [0, 1, 2, 3, 4, 5]);

        listView.scrollPosition = 30 * itemHeight;

        return Helper.ListView.waitForDeferredAction(listView)().then(function () {
            LiveUnit.Assert.areEqual(60, listView.element.querySelectorAll(".win-container").length);

            verifyBlockInDom(listView, [3, 4, 5, 6, 7, 8]);

            listView.scrollPosition = 10 * itemHeight;

            return Helper.ListView.waitForDeferredAction(listView)();
        }).then(function () {
                LiveUnit.Assert.areEqual(60, listView.element.querySelectorAll(".win-container").length);

                verifyBlockInDom(listView, [1, 2, 3, 4, 5, 6]);
            });
    });
    generateDomTrimTest("ensureVisibleWithoutMove", initData(), false, 500, 1000, function (listView) {
        LiveUnit.Assert.areEqual(20, listView.element.querySelectorAll(".win-container").length);

        verifyBlockInDom(listView, [1, 2]);

        listView.ensureVisible(15);

        return Helper.ListView.waitForDeferredAction(listView)().then(function () {

            LiveUnit.Assert.areEqual(20, listView.element.querySelectorAll(".win-container").length);

            verifyBlockInDom(listView, [1, 2]);
        });
    });

    // Begin Stripe Testing
    function generateTestContainerStripesAfterConstruction(name, getLayout, getDataSources) {

        VirtualizedViewTests.prototype["testContainerStripesAfterConstruction" + name] = function (complete) {
            var layout = getLayout();
            var dataSources = getDataSources();

            var placeholder = createListViewElement();

            var listView = new WinJS.UI.ListView(placeholder, {
                layout: layout,
                itemDataSource: dataSources.itemDataSource,
                groupDataSource: dataSources.groupDataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px")
            });

            Helper.ListView.waitForAllContainers(listView).then(function () {

                verifyContainerStripesByIndex(listView);
                placeholder.parentNode.removeChild(placeholder);
                complete();
            });
        }
    }

    function generateTestContainerStripesAfterEdits(name, getLayout, getDataSources) {

        var layout = getLayout();
        if (!layout['_usingStructuralNodes']) { return; }

        VirtualizedViewTests.prototype["testContainerStripesAfterEdits" + name] = function (complete) {

            var dataSources = getDataSources();

            var placeholder = createListViewElement();

            var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

            var listView = new ListView(placeholder, {
                layout: layout,
                itemDataSource: dataSources.itemDataSource,
                groupDataSource: dataSources.groupDataSource,
                itemTemplate: generateRenderer("100px"),
                groupHeaderTemplate: generateRenderer("50px")
            });

            var list = listView.itemDataSource.list;

            LiveUnit.Assert.isTrue(list.length >= 100, "Test requires a data set of 100 or more items");

            return Helper.ListView.waitForAllContainers(listView).then(function () {

                list.move(0, 10);
                list.move(70, 9);
                list.move(4, 3);

                return Helper.ListView.waitForAllContainers(listView);
            }).then(function () {
                    verifyContainerStripesByIndex(listView);

                    list.splice(25, 1);
                    list.splice(10, 12);
                    list.shift();
                    list.pop();

                    return Helper.ListView.waitForAllContainers(listView);
                }).then(function () {
                    verifyContainerStripesByIndex(listView);

                    list.unshift({
                        title: "N1",
                        group: 0
                    });
                    list.unshift({
                        title: "N0",
                        group: 0
                    });
                    list.push({
                        title: "Z1",
                        group: 3,
                    });
                    list.splice(50, 0, {
                        title: "X1",
                        group: 2,
                    });

                    initData(25).forEach(function (datum) {
                        list.splice(33, 0, datum);
                    });

                    return Helper.ListView.waitForAllContainers(listView);
                }).then(function () {

                    verifyContainerStripesByIndex(listView);

                    placeholder.parentNode.removeChild(placeholder);
                    complete();
                });
        }

    }

    function generateStripeTests(configuration) {

        var getLayout = configuration.layoutConfiguration.getter;
        var getDataSources = configuration.dataConfiguration.getter;
        var name = "_" + configuration.layoutConfiguration.descriptor + "_" + configuration.dataConfiguration.descriptor;

        generateTestContainerStripesAfterConstruction(name, getLayout, getDataSources);
        generateTestContainerStripesAfterEdits(name, getLayout, getDataSources);
    }

    // Generate stripe tests
    getPairWiseConfigurationsForSmallDataStripeTests().forEach(generateStripeTests);
    getPairWiseConfigurationsForBigDataStripeTests().forEach(generateStripeTests);
    
    var disabledTestRegistry = {
        testDeleteDoesNotLoseFocusRectangle: [
            Helper.Browsers.ie11,
            Helper.Browsers.firefox
        ],
        testRealizeMoreThanCreated: [Helper.Browsers.ie10, Helper.Browsers.safari],
        testMaxDeferredItemCleanup: Helper.BrowserCombos.allButIE11,
        testScrollingDuringLazyCreation: [Helper.Browsers.ie10, Helper.Browsers.safari],
        testInsertsAnimationStartsBeforeRealizationIsDone: [
            Helper.Browsers.safari,
            Helper.Browsers.android,
            Helper.Browsers.chrome
        ],
        testAddingItemToTheEndOfListWhileLastItemHadFocusDoesNotLoseFocus: Helper.Browsers.firefox,
        testUninitialize: [Helper.Browsers.firefox, Helper.Browsers.safari],
		testPanningUsingAsyncDataSourceWithMultiStageRenderers: Helper.Browsers.safari,
		testAriaWorkerCancellation: Helper.Browsers.safari,
		testDeferContainerCreationUntilSeZoZoomCompletes: [
			Helper.Browsers.android,
			Helper.Browsers.ie10,
			Helper.Browsers.chrome
		]
    };
    Helper.disableTests(VirtualizedViewTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.VirtualizedViewTests");