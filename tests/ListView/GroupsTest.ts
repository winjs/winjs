// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    var _oldMaxTimePerCreateContainers;

    var testRootEl,
        smallGroups = [],
        bigGroups = [],
        LAST_LETTER = 26,
        SMALL_GROUPS_COUNT = LAST_LETTER * 5,
        BIG_GROUPS_COUNT = LAST_LETTER * 15;

    function firstLetter(index, count) {
        var pom = index * LAST_LETTER / count,
            letterIndex = Math.floor(pom);
        return String.fromCharCode("A".charCodeAt(0) + letterIndex);
    }

    function createDataSource(array, async = false) {
        var dataSource = {
            itemsFromIndex: function (index, countBefore, countAfter) {

                return new WinJS.Promise(function (complete, error) {
                    if (index >= 0 && index < array.length) {
                        var startIndex = Math.max(0, index - countBefore),
                            endIndex = Math.min(index + countAfter, array.length - 1),
                            size = endIndex - startIndex + 1;

                        var items = [];
                        for (var i = startIndex; i < startIndex + size; i++) {
                            items.push({
                                key: i.toString(),
                                data: array[i]
                            });
                        }

                        var retVal = {
                            items: items,
                            offset: index - startIndex,
                            totalCount: array.length,
                            absoluteIndex: index
                        };

                        if (async) {
                            WinJS.Promise.timeout(50).then(function () {
                                complete(retVal);
                            });
                        } else {
                            complete(retVal);
                        }
                    } else {
                        complete({});
                    }
                });
            },

            getCount: function () {
                return new WinJS.Promise(function (complete) {
                    if (async) {
                        WinJS.Promise.timeout(50).then(function () {
                            complete(array.length);
                        });
                    } else {
                        complete(array.length);
                    }
                });
            }
        };

        return new WinJS.UI.ListDataSource(dataSource);
    }

    function checkTile(listView, groupIndex, index, left, top, caption?) {
        var tile = listView.elementFromIndex(index),
            container = Helper.ListView.containerFrom(tile),
            offsetXFromSurface = listView._rtl() ? Helper.ListView.offsetRightFromSurface : Helper.ListView.offsetLeftFromSurface;

        LiveUnit.Assert.areEqual(caption ? caption : (String.fromCharCode("A".charCodeAt(0) + groupIndex) + " tile " + index), tile.textContent.trim());
        LiveUnit.Assert.areEqual(left, offsetXFromSurface(listView, container));
        LiveUnit.Assert.areEqual(top, Helper.ListView.offsetTopFromSurface(listView, container));
    }

    function checkHeader(listView, groupIndex, left, top, id, caption?) {
        var tile = document.getElementById(id + groupIndex),
            container = Helper.ListView.headerContainerFrom(listView, tile),
            offsetXFromSurface = listView._rtl() ? Helper.ListView.offsetRightFromSurface : Helper.ListView.offsetLeftFromSurface;

        LiveUnit.Assert.areEqual(caption ? caption : String.fromCharCode("A".charCodeAt(0) + groupIndex), tile.textContent.trim());
        LiveUnit.Assert.areEqual(left, offsetXFromSurface(listView, container));
        LiveUnit.Assert.areEqual(top, Helper.ListView.offsetTopFromSurface(listView, container));
        return container;
    }

    function createListView(dataSource, options, id?, elementId?) {
        function firstLetter(item) {
            return item.data.text.toUpperCase().charAt(0);
        }

        function groupKey(item) {
            return firstLetter(item);
        }

        function groupData(item) {
            return {
                title: firstLetter(item)
            };
        }

        var element = document.getElementById(elementId ? elementId : "groupTestList"),
            itemDataSource = WinJS.UI.computeDataSourceGroups(dataSource, groupKey, groupData),
            listView = new ListView(element,
                Helper.ListView.extend(options, {
                    layout: Helper.ListView.extend(options.layout, { groupHeaderPosition: WinJS.UI.HeaderPosition.left }),
                    itemDataSource: itemDataSource,
                    itemTemplate: Helper.ListView.createRenderer("groupTestTemplate"),
                    groupDataSource: itemDataSource.groups,
                    groupHeaderTemplate: Helper.ListView.createRenderer("groupHeaderTemplate", id)
                }));
        return listView;
    }

    function trackState(element) {

        var listViewComplete,
            listViewCompletePromise = new WinJS.Promise(function (complete) {
                listViewComplete = complete;
            });

        var listViewLoaded,
            listViewLoadedPromise = new WinJS.Promise(function (complete) {
                listViewLoaded = complete;
            });


        var state: any = {
            states: []
        };

        function loadingStateChanged(eventObject) {
            var control = eventObject.target.winControl;
            state.states.push(control.loadingState);

            if (control.loadingState === "itemsLoaded") {
                listViewLoaded();
            } else if (control.loadingState === "complete") {
                listViewComplete();
            }
        }

        element.addEventListener("loadingstatechanged", loadingStateChanged, false);

        state.loadedPromise = listViewLoadedPromise;
        state.completePromise = WinJS.Promise.join([WinJS.Promise.timeout(500), listViewCompletePromise]).then(function () {
            element.removeEventListener("loadingstatechanged", loadingStateChanged, false);
            return state.states;
        });

        return state;
    }

    export class GroupsTests {


        // This is the setup function that will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            smallGroups = [];
            bigGroups = [];

            for (var i = 0; i < SMALL_GROUPS_COUNT; ++i) {
                smallGroups.push({
                    text: firstLetter(i, SMALL_GROUPS_COUNT) + " tile " + i
                });
            }
            for (i = 0; i < BIG_GROUPS_COUNT; ++i) {
                bigGroups.push({
                    text: firstLetter(i, BIG_GROUPS_COUNT) + " tile " + i
                });
            }

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "GroupsTests";
            newNode.innerHTML =
            "<div id='groupTestList' style='width:1000px; height:400px'></div>" +
            "<div id='groupRtlTestList' dir='rtl' style='width:1000px; height:400px'></div>" +
            "<div id='groupTestTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{text}}</div>" +
            "</div>" +
            "<div id='groupHeaderTemplate' style='display: none; width:200px; height:200px'>" +
            "   <div>{{title}}</div>" +
            "</div>" +
            "<div id='smallGroupHeaderTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
            _oldMaxTimePerCreateContainers = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = _oldMaxTimePerCreateContainers;
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
            WinJS.Utilities.stopLog();
            Helper.cleanupUnhandledErrors();

        }


        
        
        
        // Verifies that when you read indexOfFirstVisible after setting it, it returns the
        // value that you set it to. It verifies this under the following conditions:
        //  - win-groupleader has no margins
        //  - win-container has margins
        // This permits the first group on screen to not have any of its items' contents on
        // screen which is what triggered WinBlue#246863.
        testIndexOfFirstVisibleWithoutGroupMargins = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(bigGroups);
            var listView = createListView(dataSource, {
                layout: { type: WinJS.UI.GridLayout, groupHeaderPosition: WinJS.UI.HeaderPosition.top },
                groupHeaderTemplate: Helper.ListView.createRenderer("smallGroupHeaderTemplate", "groupScrollTo")
            });
            WinJS.Utilities.addClass(listView.element, "noGroupMargins");

            var itemsPerGroup = 15,
                firstIndexOfGroup10 = itemsPerGroup * 10;

            Helper.ListView.runTests(listView, [
                function () {
                    // Verify the conditions required for triggering the bug.
                    var groupHeaderContainer = listView.element.querySelector(".win-groupheadercontainer");
                    var itemsContainer = listView.element.querySelector(".win-itemscontainer");
                    var container = listView.element.querySelector(".win-container");
                    LiveUnit.Assert.areEqual("0px", getComputedStyle(groupHeaderContainer).marginLeft, "win-groupleader should have margin-left set to 0");
                    LiveUnit.Assert.areEqual("0px", getComputedStyle(itemsContainer).marginLeft, "win-groupleader should have margin-left set to 0");
                    LiveUnit.Assert.areEqual("5px", getComputedStyle(container).marginRight, "win-container should have a margin right of 5px");

                    listView.indexOfFirstVisible = firstIndexOfGroup10;
                },
                function () {
                    LiveUnit.Assert.areEqual(firstIndexOfGroup10, listView.indexOfFirstVisible,
                        "indexOfFirstVisible returned a value different from the one it was set to");
                    complete();
                }
            ]);
        };

        // Verifies that indexOfLastVisible returns the correct value when the ListView
        // is scrolled such that the last visible thing is the last column of a partially
        // filled group.
        // Regression test for WinBlue#259740.
        testIndexOfLastVisibleInLastColumnOfAGroup = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(bigGroups);
            var listView = createListView(dataSource, {
                layout: { type: WinJS.UI.GridLayout, groupHeaderPosition: WinJS.UI.HeaderPosition.top },
                groupHeaderTemplate: Helper.ListView.createRenderer("groupHeaderTemplate", "groupScrollTo")
            });

            var itemsPerGroup = 15,
                lastIndexOfGroup9 = itemsPerGroup * 10 - 1;

            Helper.ListView.runTests(listView, [
                function () {
                    // Verify the conditions required for triggering the bug.
                    LiveUnit.Assert.isTrue(itemsPerGroup % listView.layout['_itemsPerBar'] > 0, "The last column should have some empty rows");

                    // Ensure lastIndexOfGroup9 is visible so that we can inspect its offsetLeft and offsetWidth
                    listView.ensureVisible(lastIndexOfGroup9);
                },
                function () {
                    // Scroll the ListView so that the last thing visible is the last column of group 9.
                    var container = Helper.ListView.containerFrom(listView.elementFromIndex(lastIndexOfGroup9));
                    listView.scrollPosition = container.offsetLeft + container.offsetWidth - listView._getViewportLength();
                },
                function () {
                    LiveUnit.Assert.areEqual(lastIndexOfGroup9, listView.indexOfLastVisible, "indexOfLastVisible is incorrect");
                    complete();
                }
            ]);
        };



        // Regression test for WinBlue:212689
        testSwitchingFromNoStructureNodesToStructureNodesWithGroups = function (complete) {
            var list = new WinJS.Binding.List<{ startDate: Date; text: string; }>();
            var element = document.getElementById("groupTestList");
            element.style.width = "700px"
        var listView = new WinJS.UI.ListView(element);
            listView.itemTemplate = function (itemPromise) {
                return itemPromise.then(function (data) {
                    var item = document.createElement("div");
                    item.textContent = data.data.text;
                    item.style.height = "400px";
                    item.style.width = "100px";
                    return item;
                });
            };
            var groupTimelineList = list.createGrouped(
                function (event) {
                    var startDate = event.startDate;
                    var year = startDate.getFullYear();
                    var month = startDate.getMonth();
                    var day = startDate.getDate();
                    return "" + year + (month < 10 ? "0" + month : month.toString()) + (day < 10 ? "0" + day : day.toString());
                },
                function (event) {
                    return event.startDate;
                },
                function (leftKey, rightKey) {
                    return leftKey.localeCompare(rightKey);
                });
            listView.itemDataSource = groupTimelineList.dataSource;
            listView.groupDataSource = groupTimelineList.groups.dataSource;
            Helper.ListView.waitForDeferredAction(listView)().then(function () {
                WinJS.Utilities._setImmediate(function () {
                    list.splice(0, 1, { startDate: new Date(2013, 4, 12, 5), text: "Fri 5am" }),
                    list.splice(1, 1, { startDate: new Date(2013, 4, 12, 6), text: "Fri 6am" }),
                    list.splice(2, 1, { startDate: new Date(2013, 4, 12, 10), text: "Fri 10am" }),
                    list.splice(3, 1, { startDate: new Date(2013, 4, 12, 12), text: "Fri 12am" }),
                    list.splice(4, 1, { startDate: new Date(2013, 4, 13, 8), text: "Sat 8am" }),
                    list.splice(5, 1, { startDate: new Date(2013, 4, 13, 10), text: "Sat 10am" }),
                    list.splice(6, 1, { startDate: new Date(2013, 4, 13, 16), text: "Sat 4pm" }),
                    list.splice(7, 1, { startDate: new Date(2013, 4, 13, 17), text: "Sat 5pm" })
                list.splice(8, 1, { startDate: new Date(2013, 4, 14, 15), text: "Sat 3pm" })
                list.splice(9, 1, { startDate: new Date(2013, 4, 14, 14), text: "Sat 2pm" })
                list.splice(10, 1, { startDate: new Date(2013, 4, 14, 13), text: "Sat 1pm" })
                list.splice(11, 1, { startDate: new Date(2013, 4, 15, 14), text: "Sat 2pm" })
                list.splice(12, 1, { startDate: new Date(2013, 4, 16, 15), text: "Sat 3pm" })
                list.splice(13, 1, { startDate: new Date(2013, 4, 17, 16), text: "Sat 4pm" })
                list.splice(14, 1, { startDate: new Date(2013, 4, 18, 17), text: "Sat 5pm" })
                list.splice(15, 1, { startDate: new Date(2013, 4, 19, 18), text: "Sat 6pm" })
                list.splice(16, 1, { startDate: new Date(2013, 4, 20, 19), text: "Sat 7pm" })
                list.splice(17, 1, { startDate: new Date(2013, 4, 21, 20), text: "Sat 8pm" })
                list.splice(18, 1, { startDate: new Date(2013, 4, 22, 21), text: "Sat 9pm" })
            });

                Helper.ListView.waitForDeferredAction(listView)().then(function () {
                    list.splice(5, 1);
                    Helper.ListView.waitForDeferredAction(listView)(400).then(function () {
                        list.splice(2, 0, { startDate: new Date(2013, 4, 12, 11), text: "Fri 11am" })
                    Helper.ListView.waitForDeferredAction(listView)(400).then(complete);
                    });
                });
            });
        };

        testCustomGroupDataSource = function (complete) {

            var flavors = [
                { text: "Banana Blast", kind: "IC" },
                { text: "Lavish Lemon Ice", kind: "ST" },
                { text: "Marvelous Mint", kind: "IC" },
                { text: "Creamy Orange", kind: "IC" },
                { text: "Succulent Strawberry", kind: "ST" },
                { text: "Very Vanilla", kind: "IC" },
                { text: "Banana Blast", kind: "FY" },
                { text: "Lavish Lemon Ice", kind: "ST" },
                { text: "Marvelous Mint", kind: "GO" },
                { text: "Creamy Orange", kind: "ST" },
                { text: "Succulent Strawberry", kind: "IC" },
            ];

            var desertTypes: any = [
                { key: "IC", title: "Ice Cream" },
                { key: "FY", title: "Low-fat frozen yogurt" },
                { key: "ST", title: "Sorbet" },
                { key: "GO", title: "Gelato" }
            ];


            //
            // Flavors Data Adapter
            //
            // Data adapter for items. Follows the same pattern as the Bing Search adapter. The main concerns when
            // creating a data adapter for grouping are:
            // *  Listview works on an item-first mechanism, so the items need to be sorted and already arranged by group.
            // *  Supply the key for the group using the groupKey property for each item
            //
            var flavorsDataAdapter = WinJS.Class.define(
                function (data) {
                    // Constructor
                    this._itemData = data;
                },

                // Data Adapter interface methods
                // These define the contract between the virtualized datasource and the data adapter.
                // These methods will be called by virtualized datasource to fetch items, count etc.
                {
                    // This example only implements the itemsFromIndex and count methods

                    // Called to get a count of the items, result should be a promise for the items
                    getCount: function () {
                        var that = this;
                        return WinJS.Promise.wrap(that._itemData.length);
                    },

                    // Called by the virtualized datasource to fetch items
                    // It will request a specific item index and hints for a number of items either side of it
                    // The implementation should return the specific item, and can choose how many either side.
                    // to also send back. It can be more or less than those requested.
                    //
                    // Must return back an object containing fields:
                    //   items: The array of items of the form:
                    //      [{ key: key1, groupKey: group1, data : { field1: value, field2: value, ... }}, { key: key2, groupKey: group1, data : {...}}, ...]
                    //   offset: The offset into the array for the requested item
                    //   totalCount: (optional) Update the count for the collection
                    itemsFromIndex: function (requestIndex, countBefore, countAfter) {
                        var that = this;

                        if (requestIndex >= that._itemData.length) {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist.toString()));
                        }

                        var lastFetchIndex = Math.min(requestIndex + countAfter, that._itemData.length - 1);
                        var fetchIndex = Math.max(requestIndex - countBefore, 0);
                        var results = [];

                        // iterate and form the collection of items
                        for (var i = fetchIndex; i <= lastFetchIndex; i++) {
                            var item = that._itemData[i];
                            results.push({
                                key: i.toString(), // the key for the item itself
                                groupKey: item.kind, // the key for the group for the item
                                data: item // the data fields for the item
                            });
                        }

                        // return a promise for the results
                        return WinJS.Promise.wrap({
                            items: results, // The array of items
                            offset: requestIndex - fetchIndex, // The offset into the array for the requested item
                            totalCount: that._itemData.length // the total count
                        });
                    }
                });

            // Create a DataSource by deriving and wrapping the data adapter with a VirtualizedDataSource
            var flavorsDataSource = WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (data) {
                this._baseDataSourceConstructor(new flavorsDataAdapter(data));
            });


            //
            // Groups Data Adapter
            //
            // Data adapter for the groups. Follows the same pattern as the items data adapter, but each item is a group.
            // The main concerns when creating a data adapter for groups are:
            // *  Groups can be enumerated by key or index, so the adapter needs to implement both itemsFromKey and itemsFromIndex
            // *  Each group should supply a firstItemIndexHint which is the index of the first item in the group. This enables listview
            //    to figure out the position of an item in the group so it can get the columns correct.
            //
            var desertsDataAdapter = WinJS.Class.define(
                function (groupData) {
                    // Constructor
                    this._groupData = groupData;
                },

                // Data Adapter interface methods
                // These define the contract between the virtualized datasource and the data adapter.
                // These methods will be called by virtualized datasource to fetch items, count etc.
                {
                    // This example only implements the itemsFromIndex, itemsFromKey and count methods

                    // Called to get a count of the items, this can be async so return a promise for the count
                    getCount: function () {
                        var that = this;
                        return WinJS.Promise.wrap(that._groupData.length);
                    },

                    // Called by the virtualized datasource to fetch a list of the groups based on group index
                    // It will request a specific group and hints for a number of groups either side of it
                    // The implementation should return the specific group, and can choose how many either side
                    // to also send back. It can be more or less than those requested.
                    //
                    // Must return back an object containing fields:
                    //   items: The array of groups of the form:
                    //      [{ key: groupkey1, firstItemIndexHint: 0, data : { field1: value, field2: value, ... }}, { key: groupkey2, firstItemIndexHint: 27, data : {...}}, ...
                    //   offset: The offset into the array for the requested group
                    //   totalCount: (optional) an update of the count of items
                    itemsFromIndex: function (requestIndex, countBefore, countAfter) {
                        var that = this;

                        if (requestIndex >= that._groupData.length) {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist.toString()));
                        }

                        var lastFetchIndex = Math.min(requestIndex + countAfter, that._groupData.length - 1);
                        var fetchIndex = Math.max(requestIndex - countBefore, 0);
                        var results = [];

                        // form the array of groups
                        for (var i = fetchIndex; i <= lastFetchIndex; i++) {
                            var group = that._groupData[i];
                            results.push({
                                key: group.key,
                                firstItemIndexHint: group.firstItemIndex,
                                data: group
                            });
                        }
                        return WinJS.Promise.wrap({
                            items: results, // The array of items
                            offset: requestIndex - fetchIndex, // The offset into the array for the requested item
                            totalCount: that._groupData.length // The total count
                        });
                    },

                    // Called by the virtualized datasource to fetch groups based on the group's key
                    // It will request a specific group and hints for a number of groups either side of it
                    // The implementation should return the specific group, and can choose how many either side
                    // to also send back. It can be more or less than those requested.
                    //
                    // Must return back an object containing fields:
                    //   [{ key: groupkey1, firstItemIndexHint: 0, data : { field1: value, field2: value, ... }}, { key: groupkey2, firstItemIndexHint: 27, data : {...}}, ...
                    //   offset: The offset into the array for the requested group
                    //   absoluteIndex: the index into the list of groups of the requested group
                    //   totalCount: (optional) an update of the count of items
                    itemsFromKey: function (requestKey, countBefore, countAfter) {
                        var that = this;
                        var requestIndex = null;

                        // Find the group in the collection
                        for (var i = 0, len = that._groupData.length; i < len; i++) {
                            if (that._groupData[i].key === requestKey) {
                                requestIndex = i;
                                break;
                            }
                        }
                        if (requestIndex === null) {
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist.toString()));
                        }

                        var lastFetchIndex = Math.min(requestIndex + countAfter, that._groupData.length - 1);
                        var fetchIndex = Math.max(requestIndex - countBefore, 0);
                        var results = [];

                        //iterate and form the collection of the results
                        for (var j = fetchIndex; j <= lastFetchIndex; j++) {
                            var group = that._groupData[j];
                            results.push({
                                key: group.key, // The key for the group
                                firstItemIndexHint: group.firstItemIndex, // The index into the items for the first item in the group
                                data: group // The data for the specific group
                            });
                        }

                        // Results can be async so the result is supplied as a promise
                        return WinJS.Promise.wrap({
                            items: results, // The array of items
                            offset: requestIndex - fetchIndex, // The offset into the array for the requested item
                            absoluteIndex: requestIndex, // The index into the collection of the item referenced by key
                            totalCount: that._groupData.length // The total length of the collection
                        });
                    },

                });

            // Create a DataSource by deriving and wrapping the data adapter with a VirtualizedDataSource
            var desertsDataSource = WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (data) {
                this._baseDataSourceConstructor(new desertsDataAdapter(data));
            });

            // form an array of the keys to help with the sort
            var groupKeys = [];
            for (var i = 0; i < desertTypes.length; i++) {
                groupKeys[i] = desertTypes[i].key;
            }

            var itemData = flavors;
            itemData.sort(function CompareForSort(item1, item2) {
                var first = groupKeys.indexOf(item1.kind), second = groupKeys.indexOf(item2.kind);
                if (first === second) { return item1.text.localeCompare(item2.text); }
                else if (first < second) { return -1; }
                else { return 1; }
            });

            // Calculate the indexes of the first item for each group, ideally this should also be done at the source of the data
            var itemIndex = 0;
            for (var j = 0, len = desertTypes.length; j < len; j++) {
                desertTypes[j].firstItemIndex = itemIndex;
                var key = desertTypes[j].key;
                for (var k = itemIndex, len2 = itemData.length; k < len2; k++) {
                    if (itemData[k].kind !== key) {
                        itemIndex = k;
                        break;
                    }
                }
            }

            // Create the datasources that will then be set on the datasource
            var itemDataSource = new flavorsDataSource(itemData);
            var groupDataSource = new desertsDataSource(desertTypes);

            var listView = new WinJS.UI.ListView(document.getElementById("groupTestList"), {
                itemDataSource: itemDataSource,
                groupDataSource: groupDataSource,
                itemTemplate: Helper.ListView.createRenderer("groupTestTemplate"),
                groupHeaderTemplate: Helper.ListView.createRenderer("groupHeaderTemplate")
            });

            return Helper.ListView.waitForReady(listView, -1)().then(function () {

                checkTile(listView, 0, 0, 50, 200, "Banana Blast");

                complete();
            });
        };

        testRequestGroupBeforeListViewReady = function (complete) {
            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({ data: i + "" });
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
            testRootEl.appendChild(lv.element);
            lv._groups.requestHeader(0).then(function () {
                testRootEl.removeChild(lv.element);
                complete();
            });
        };
    };

    function generateSimpleLayout(layout) {
        GroupsTests.prototype["testSimpleLayout" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var listView = createListView(createDataSource(smallGroups), { layout: { type: WinJS.UI[layout] } }, "groupSimpleLayout");
            Helper.ListView.whenLoadingComplete(listView, function () {
                // first group
                checkHeader(listView, 0, 50, 0, "groupSimpleLayout");
                checkTile(listView, 0, 0, 250, 0);
                checkTile(listView, 0, 1, 250, 100);
                checkTile(listView, 0, 4, 350, 0);

                // second group
                checkHeader(listView, 1, 500, 0, "groupSimpleLayout");
                checkTile(listView, 1, 5, 700, 0);
                checkTile(listView, 1, 6, 700, 100);
                checkTile(listView, 1, 9, 800, 0);

                complete();
            });
        };
    };
    generateSimpleLayout("GridLayout");

    function generateSimpleLayoutAsyncDataSource(layout) {
        GroupsTests.prototype["testSimpleLayoutAsyncDataSource" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var listView = createListView(createDataSource(smallGroups, true), { layout: { type: WinJS.UI[layout] } }, "groupSimpleLayoutAsyncDataSource");
            Helper.ListView.whenLoadingComplete(listView, function () {
                // first group
                checkHeader(listView, 0, 50, 0, "groupSimpleLayoutAsyncDataSource");
                checkTile(listView, 0, 0, 250, 0);
                checkTile(listView, 0, 1, 250, 100);
                checkTile(listView, 0, 4, 350, 0);

                // second group
                checkHeader(listView, 1, 500, 0, "groupSimpleLayoutAsyncDataSource");
                checkTile(listView, 1, 5, 700, 0);
                checkTile(listView, 1, 6, 700, 100);
                checkTile(listView, 1, 9, 800, 0);

                complete();
            });
        };
    };
    generateSimpleLayoutAsyncDataSource("GridLayout");

    function generateSimpleLayoutAsyncRenderer(layout) {
        GroupsTests.prototype["testSimpleLayoutAsyncRenderer" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var listView = createListView(createDataSource(smallGroups, true), {
                layout: { type: WinJS.UI[layout] },
                itemTemplate: Helper.ListView.createAsyncRenderer("groupTestTemplate", 100, 100),
                groupHeaderTemplate: Helper.ListView.createAsyncRenderer("groupHeaderTemplate", 200, 200, "groupSimpleLayoutAsyncRenderer")
            });

            Helper.ListView.whenLoadingComplete(listView, function () {
                // first group
                checkHeader(listView, 0, 50, 0, "groupSimpleLayoutAsyncRenderer");
                checkTile(listView, 0, 0, 250, 0);
                checkTile(listView, 0, 1, 250, 100);
                checkTile(listView, 0, 4, 350, 0);

                // second group
                checkHeader(listView, 1, 500, 0, "groupSimpleLayoutAsyncRenderer");
                checkTile(listView, 1, 5, 700, 0);
                checkTile(listView, 1, 6, 700, 100);
                checkTile(listView, 1, 9, 800, 0);

                complete();
            });
        };
    };
    generateSimpleLayoutAsyncRenderer("GridLayout");

    function generateHeaderAbove(layout) {
        GroupsTests.prototype["testHeaderAbove" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var myData = [],
                c = 0;

            function addGroup(letter, count) {
                for (var i = 0; i < count; ++i) {
                    myData.push({
                        text: letter + " tile " + c
                    });
                    c++;
                }
            }

            addGroup("A", 5);
            addGroup("B", 5);
            addGroup("C", 1);
            addGroup("D", 4);
            addGroup("E", 10);

            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(myData);
            var listView = createListView(dataSource, { layout: { type: WinJS.UI[layout], groupHeaderPosition: WinJS.UI.HeaderPosition.top } }, "groupHeaderAbove");
            Helper.ListView.whenLoadingComplete(listView, function () {
                // first group
                var header = checkHeader(listView, 0, 50, 0, "groupHeaderAbove");
                LiveUnit.Assert.areEqual(300, header.offsetWidth);
                checkTile(listView, 0, 0, 50, 200);
                checkTile(listView, 0, 1, 50, 300);
                checkTile(listView, 0, 4, 250, 200);

                // second group
                checkHeader(listView, 1, 400, 0, "groupHeaderAbove");
                checkTile(listView, 1, 5, 400, 200);
                checkTile(listView, 1, 6, 400, 300);
                checkTile(listView, 1, 9, 600, 200);

                header = checkHeader(listView, 2, 750, 0, "groupHeaderAbove");
                LiveUnit.Assert.areEqual(100, header.offsetWidth);

                header = checkHeader(listView, 3, 900, 0, "groupHeaderAbove");
                LiveUnit.Assert.areEqual(200, header.offsetWidth);

                complete();
            });
        };
    };
    generateHeaderAbove("GridLayout");

    function generateRtl(layout) {
        GroupsTests.prototype["testRtl" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(smallGroups);
            var listView = createListView(dataSource, { layout: { type: WinJS.UI[layout] } }, "groupRtlTestList", "groupRtlTestList");
            Helper.ListView.whenLoadingComplete(listView, function () {
                // first group
                checkHeader(listView, 0, 50, 0, "groupRtlTestList");
                checkTile(listView, 0, 0, 250, 0);
                checkTile(listView, 0, 1, 250, 100);
                checkTile(listView, 0, 4, 350, 0);

                // second group
                checkHeader(listView, 1, 500, 0, "groupRtlTestList");
                checkTile(listView, 1, 5, 700, 0);
                checkTile(listView, 1, 6, 700, 100);
                checkTile(listView, 1, 9, 800, 0);

                complete();
            });
        };
    };
    generateRtl("GridLayout");

    function generateScrollTo(layout) {
        GroupsTests.prototype["testScrollTo" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(bigGroups);
            var listView = createListView(dataSource, {
                layout: { type: WinJS.UI[layout] },
                groupHeaderTemplate: Helper.ListView.createRenderer("smallGroupHeaderTemplate", "groupScrollTo")
            });

            Helper.ListView.runTests(listView, [
                function () {
                    checkHeader(listView, 0, 50, 0, "groupScrollTo");
                    checkTile(listView, 0, 0, 150, 0);

                    listView.indexOfFirstVisible = 106;
                },
                function () {
                    var element = document.getElementById("groupTestList"),
                        viewportElement = Helper.ListView.viewport(element),
                        scrollOffset = WinJS.Utilities.getScrollPosition(viewportElement).scrollLeft;

                    checkHeader(listView, 7, scrollOffset - 50, 0, "groupScrollTo");
                    checkTile(listView, 7, 105, scrollOffset + 50, 0);
                    checkTile(listView, 7, 106, scrollOffset + 50, 100);
                    checkTile(listView, 7, 109, scrollOffset + 150, 0);

                    complete();
                }
            ]);
        };
    };
    generateScrollTo("GridLayout");

    function generateScrollLeft(layout) {
        GroupsTests.prototype["testScrollLeft" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(bigGroups);
            var listView = createListView(dataSource, {
                layout: { type: WinJS.UI[layout] },
                groupHeaderTemplate: Helper.ListView.createRenderer("smallGroupHeaderTemplate", "groupScrollLeft")
            }),
                element = document.getElementById("groupTestList"),
                viewportElement = Helper.ListView.viewport(element);

            Helper.ListView.runTests(listView, [
                function () {
                    checkHeader(listView, 0, 50, 0, "groupScrollLeft");
                    checkTile(listView, 0, 0, 150, 0);

                    listView.indexOfFirstVisible = 340;
                    return true;
                },
                function () {
                    var position = WinJS.Utilities.getScrollPosition(viewportElement);
                    position.scrollLeft = position.scrollLeft - viewportElement.offsetWidth;
                    LiveUnit.Assert.areEqual(338, listView.indexOfFirstVisible);

                    // Verify that we have realized content for the item
                    checkTile(listView, 22, 338, 12450, 0);
                    LiveUnit.LoggingCore.logComment("scrolling from " + WinJS.Utilities.getScrollPosition(viewportElement).scrollLeft + " to " + position.scrollLeft);
                    WinJS.Utilities.setScrollPosition(viewportElement, position);
                    return true;
                },
                function () {
                    //LiveUnit.Assert.areEqual(337, listView.lastVisible());
                    LiveUnit.LoggingCore.logComment("scrollPos=" + WinJS.Utilities.getScrollPosition(viewportElement).scrollLeft + " lastVisible=" + listView.indexOfLastVisible);

                    complete();
                }
            ]);
        };
    };
    generateScrollLeft("GridLayout");

    function generateAdd(layout) {
        GroupsTests.prototype["testAdd" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(smallGroups);
            var listView = createListView(dataSource, { layout: { type: WinJS.UI[layout] } }, "groupAdd");
            Helper.ListView.runTests(listView, [
                function () {
                    // first group
                    checkHeader(listView, 0, 50, 0, "groupAdd");
                    checkTile(listView, 0, 0, 250, 0);
                    checkTile(listView, 0, 1, 250, 100);
                    checkTile(listView, 0, 4, 350, 0);

                    // second group
                    checkHeader(listView, 1, 500, 0, "groupAdd");
                    checkTile(listView, 1, 5, 700, 0);
                    checkTile(listView, 1, 6, 700, 100);
                    checkTile(listView, 1, 9, 800, 0);

                    Helper.ListView.getDataObjects(listView.itemDataSource, [5]).done(function (dataObjects) {
                        listView.itemDataSource.beginEdits();
                        listView.itemDataSource.insertBefore(null, { text: "A NewTile" }, dataObjects[0].key);
                        listView.itemDataSource.insertBefore(null, { text: "A NewTile" }, dataObjects[0].key);
                        listView.itemDataSource.insertBefore(null, { text: "A NewTile" }, dataObjects[0].key);
                        listView.itemDataSource.insertBefore(null, { text: "A NewTile" }, dataObjects[0].key);
                        listView.itemDataSource.endEdits();
                    });
                    return true;
                },
                function () {
                    checkHeader(listView, 0, 50, 0, "groupAdd");
                    checkTile(listView, 0, 0, 250, 0);
                    checkTile(listView, 0, 1, 250, 100);
                    checkTile(listView, 0, 4, 350, 0);
                    checkTile(listView, 0, 5, 350, 100, "A NewTile");
                    checkTile(listView, 0, 6, 350, 200, "A NewTile");
                    checkTile(listView, 0, 7, 350, 300, "A NewTile");
                    checkTile(listView, 0, 8, 450, 0, "A NewTile");

                    // second group
                    checkHeader(listView, 1, 600, 0, "groupAdd");
                    checkTile(listView, 1, 9, 800, 0, "B tile 5");
                    checkTile(listView, 1, 10, 800, 100, "B tile 6");

                    complete();
                }
            ]);
        };
    };
    generateAdd("GridLayout");

    function generateAddGroup(layout) {
        GroupsTests.prototype["testAddGroup" + (layout == "GridLayout" ? "" : layout)] = function (complete) {

            function test(itemDataSource, groupDataSource, edit) {
                return new WinJS.Promise(function (testComplete) {
                    var listView = new WinJS.UI.ListView(document.getElementById("groupTestList"), {
                        layout: { type: WinJS.UI[layout] },
                        itemDataSource: itemDataSource,
                        itemTemplate: Helper.ListView.createRenderer("groupTestTemplate"),
                        groupDataSource: groupDataSource,
                        groupHeaderTemplate: Helper.ListView.createRenderer("smallGroupHeaderTemplate", "groupAddGroup")
                    });

                    Helper.ListView.runTests(listView, [
                        function () {
                            // first group
                            checkHeader(listView, 0, 50, 0, "groupAddGroup");
                            checkTile(listView, 0, 0, 50, 100);
                            checkTile(listView, 0, 1, 50, 200);
                            checkTile(listView, 0, 2, 50, 300);
                            checkTile(listView, 0, 3, 150, 100);
                            checkTile(listView, 0, 4, 150, 200);

                            // second group
                            checkHeader(listView, 1, 300, 0, "groupAddGroup", "C");
                            checkTile(listView, 1, 5, 300, 100, "C tile 5");

                            edit();
                            return true;
                        },
                        function () {
                            // first group
                            checkHeader(listView, 0, 50, 0, "groupAddGroup");
                            checkTile(listView, 0, 0, 50, 100);
                            checkTile(listView, 0, 1, 50, 200);
                            checkTile(listView, 0, 2, 50, 300);
                            checkTile(listView, 0, 3, 150, 100);
                            checkTile(listView, 0, 4, 150, 200);

                            // new group
                            checkHeader(listView, 1, 300, 0, "groupAddGroup", "B");
                            checkTile(listView, 1, 5, 300, 100, "B New tile");

                            // third group
                            checkHeader(listView, 2, 450, 0, "groupAddGroup", "C");
                            checkTile(listView, 2, 6, 450, 100, "C tile 5");

                            listView.forceLayout();
                            return true;
                        },
                        function () {
                            // first group
                            checkHeader(listView, 0, 50, 0, "groupAddGroup");
                            checkTile(listView, 0, 0, 50, 100);

                            // new group
                            checkHeader(listView, 1, 300, 0, "groupAddGroup", "B");
                            checkTile(listView, 1, 5, 300, 100, "B New tile");

                            testComplete();
                        }
                    ]);
                });
            }

            function getData() {
                var myData = [],
                    c = 0;

                function addGroup(letter, count) {
                    for (var i = 0; i < count; ++i) {
                        myData.push({
                            text: letter + " tile " + c
                        });
                        c++;
                    }
                }

                addGroup("A", 5);
                addGroup("C", 5);
                addGroup("D", 5);

                return myData;
            }

            var list = (new WinJS.Binding.List(getData())).createGrouped(function (item) {
                return item.text.charAt(0);
            }, function (item) {
                    return { title: item.text.charAt(0) };
                });
            var dataSource = WinJS.UI.computeDataSourceGroups(Helper.ItemsManager.simpleSynchronousArrayDataSource(getData()), function (item) {
                return item.data.text.charAt(0);
            }, function (item) {
                    return { title: item.data.text.charAt(0) };
                });

            function editList() {
                list.splice(5, 0, { text: "B New tile" });
            }

            function editDataSource() {
                Helper.ListView.getDataObjects(dataSource, [5]).then(function (dataObjects) {
                    dataSource.insertBefore(null, { text: "B New tile" }, dataObjects[0].key);
                });
            }

            test(list.dataSource, list.groups.dataSource, editList).then(function () {
                return test(dataSource, dataSource.groups, editDataSource);
            }).then(function () {
                    complete();
                });
        };
    };
    generateAddGroup("GridLayout");

    function generateDelete(layout) {
        GroupsTests.prototype["testDelete" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(smallGroups);
            var i, listView = createListView(dataSource, { layout: { type: WinJS.UI[layout] } }, "groupDelete");

            Helper.ListView.waitForReady(listView, -1)().then(function () {
                // first group
                checkHeader(listView, 0, 50, 0, "groupDelete");
                checkTile(listView, 0, 0, 250, 0);
                checkTile(listView, 0, 1, 250, 100);
                checkTile(listView, 0, 4, 350, 0);

                // second group
                checkHeader(listView, 1, 500, 0, "groupDelete");
                checkTile(listView, 1, 5, 700, 0);
                checkTile(listView, 1, 6, 700, 100);
                checkTile(listView, 1, 9, 800, 0);

                Helper.ListView.getDataObjects(listView.itemDataSource, [1, 2, 3, 4]).then(function (dataObjects) {
                    listView.itemDataSource.beginEdits();
                    for (i = 0; i < dataObjects.length; ++i) {
                        listView.itemDataSource.remove(dataObjects[i].key);
                    }
                    listView.itemDataSource.endEdits();
                });

                return Helper.ListView.waitForState(listView, "viewPortLoaded", -1)()
            }).then(function () {
                    var headerContainer = <any>listView.element.querySelector(".win-groupheadercontainer");
                    LiveUnit.Assert.areEqual(1, headerContainer.children.length);

                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    // first group
                    checkHeader(listView, 0, 50, 0, "groupDelete");
                    checkTile(listView, 0, 0, 250, 0);

                    // second group
                    checkHeader(listView, 1, 400, 0, "groupDelete");
                    checkTile(listView, null, 1, 600, 0, "B tile 5");
                    checkTile(listView, null, 2, 600, 100, "B tile 6");
                    checkTile(listView, null, 5, 700, 0, "B tile 9");

                    Helper.ListView.getDataObjects(listView.itemDataSource, [0]).then(function (dataObjects) {
                        listView.itemDataSource.remove(dataObjects[0].key);
                    });

                    listView._raiseViewLoading();
                    return Helper.ListView.waitForReady(listView, -1)();
                }).then(function () {
                    checkHeader(listView, 0, 50, 0, "groupDelete", "B");
                    checkTile(listView, null, 0, 250, 0, "B tile 5");
                    checkTile(listView, null, 1, 250, 100, "B tile 6");
                    checkTile(listView, null, 4, 350, 0, "B tile 9");

                    complete();
                });
        };
    };
    generateDelete("GridLayout");

    function generateDeleteAll(layout) {
        GroupsTests.prototype["testDeleteAll" + (layout == "GridLayout" ? "" : layout)] = function (complete) {

            function test(itemDataSource, groupDataSource) {
                return new WinJS.Promise(function (testComplete) {
                    var listView = new WinJS.UI.ListView(document.getElementById("groupTestList"), {
                        layout: { type: WinJS.UI[layout], groupHeaderPosition: WinJS.UI.HeaderPosition.left },
                        itemDataSource: itemDataSource,
                        itemTemplate: Helper.ListView.createRenderer("groupTestTemplate"),
                        groupDataSource: groupDataSource,
                        groupHeaderTemplate: Helper.ListView.createRenderer("groupHeaderTemplate", "groupDeleteAll")
                    });


                    Helper.ListView.runTests(listView, [
                        function () {
                            // first group
                            checkHeader(listView, 0, 50, 0, "groupDeleteAll");
                            checkTile(listView, 0, 0, 250, 0);
                            checkTile(listView, 0, 1, 250, 100);

                            // second group
                            checkHeader(listView, 1, 400, 0, "groupDeleteAll");
                            checkTile(listView, 1, 2, 600, 0);

                            Helper.ListView.getDataObjects(listView.itemDataSource, [0, 1, 2]).then(function (dataObjects) {
                                listView.itemDataSource.beginEdits();
                                for (var i = 0; i < dataObjects.length; ++i) {
                                    listView.itemDataSource.remove(dataObjects[i].key);
                                }
                                listView.itemDataSource.endEdits();
                            });
                            return true;
                        },
                        function () {
                            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll(".win-container").length);
                            LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll(".win-groupheader").length);

                            testComplete();
                        }
                    ]);
                });
            }

            function getData() {
                return [
                    { text: "A tile 0" },
                    { text: "A tile 1" },
                    { text: "B tile 2" }
                ];
            }

            var list = (new WinJS.Binding.List(getData())).createGrouped(function (item) {
                return item.text.charAt(0);
            }, function (item) {
                    return { title: item.text.charAt(0) };
                });
            test(list.dataSource, list.groups.dataSource).then(function () {

                var dataSource = WinJS.UI.computeDataSourceGroups(Helper.ItemsManager.simpleSynchronousArrayDataSource(getData()), function (item) {
                    return item.data.text.charAt(0);
                }, function (item) {
                        return { title: item.data.text.charAt(0) };
                    });
                return test(dataSource, dataSource.groups);
            }).then(function () {
                    complete();
                });

        };
    };
    generateDeleteAll("GridLayout");

    function generateReload(layout) {
        GroupsTests.prototype["testReload" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            function checkTileLabel(listView, index, caption) {
                var tile = listView.elementFromIndex(index);
                LiveUnit.Assert.areEqual(caption, tile.textContent.trim());
            }
            function checkHeaderLabel(listView, id, groupIndex, caption) {
                var tile = document.getElementById(id + groupIndex);
                LiveUnit.Assert.areEqual(caption, tile.textContent.trim());
            }

            var myData = [],
                c = 0;

            function addGroup(letter, count) {
                for (var i = 0; i < count; ++i) {
                    myData.push({
                        text: letter + " tile " + c
                    });
                    c++;
                }
            }

            addGroup("A", 3);
            addGroup("B", 3);

            var dataSource = Helper.ItemsManager.simpleSynchronousArrayDataSource(myData);
            var listView = createListView(dataSource, { layout: { type: WinJS.UI[layout] } }, "groupReload");

            var tests = [
                function () {
                    listView.currentItem = { index: 4 };
                    LiveUnit.Assert.areEqual(4, listView.currentItem.index, "ListView's currentItem wasn't set properly");
                    checkTileLabel(listView, 0, "A tile 0");
                    checkTileLabel(listView, 3, "B tile 3");
                    checkHeaderLabel(listView, "groupReload", 0, "A");
                    checkHeaderLabel(listView, "groupReload", 1, "B");

                    myData = [];
                    c = 0;

                    addGroup("C", 2);
                    addGroup("D", 2);

                    var items = [];
                    for (var i = 0; i < myData.length; i++) {
                        items.push({
                            key: i.toString(),
                            data: myData[i]
                        });
                    }

                    listView.itemDataSource['testDataAdapter'].replaceItems(items);
                    listView.itemDataSource['testDataAdapter'].reload();
                },
                function () {
                    Helper.ListView.validateResetFocusState(listView, "after calling reload");
                    checkTileLabel(listView, 0, "C tile 0");
                    checkTileLabel(listView, 2, "D tile 2");
                    checkHeaderLabel(listView, "groupReload", 0, "C");
                    checkHeaderLabel(listView, "groupReload", 1, "D");

                    complete();
                }
            ];
            Helper.ListView.runTests(listView, tests);
        };
    };
    generateReload("GridLayout");


    var correctStates = ["itemsLoading", "viewPortLoaded", "itemsLoaded", "complete"];

    function generateLoadingStateEmpty(layout) {
        GroupsTests.prototype["testLoadingStateEmpty" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var element = document.getElementById("groupTestList");
            var state = trackState(element);
            var list = new WinJS.Binding.List([]);
            var listView = new WinJS.UI.ListView(element, {
                layout: { type: WinJS.UI[layout] },
                itemDataSource: list.dataSource,
                itemTemplate: Helper.ListView.createRenderer("groupTestTemplate")
            });

            state.completePromise.then(function (states) {
                Helper.ListView.elementsEqual(correctStates, states);

                complete();
            });
        };
    };
    generateLoadingStateEmpty("GridLayout");

    function generateLoadingStateSync(layout) {
        GroupsTests.prototype["testLoadingStateSync" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            WinJS.Utilities.startLog({
                action: function (message, tag, type) {
                    LiveUnit.LoggingCore.logComment(type + ": " + message + " (" + tag + ")");
                }
            });
            var element = document.getElementById("groupTestList");
            var state = trackState(element);
            var listView = new ListView(element, {
                layout: { type: WinJS.UI[layout] },
                itemDataSource: createDataSource(smallGroups),
                itemTemplate: Helper.ListView.createRenderer("groupTestTemplate")
            });

            state.completePromise.then(function (states) {
                Helper.ListView.elementsEqual(correctStates, states);

                var state = trackState(listView._element);
                listView.indexOfFirstVisible = 70;
                return state.completePromise;
            }).then(function (states) {
                Helper.ListView.elementsEqual(correctStates, states);

                    var state = trackState(listView._element);
                    listView.scrollPosition = listView.scrollPosition + 5;
                    return state.completePromise;
                }).then(function (states) {
                    Helper.ListView.elementsEqual(correctStates, states);
                    WinJS.Utilities.stopLog();
                }).then(null, function () { WinJS.Utilities.stopLog(); }).
                done(complete);
        };
    };
    generateLoadingStateSync("GridLayout");

    function generateLoadingStateAsync(layout) {
        GroupsTests.prototype["testLoadingStateAsync" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            WinJS.Utilities.startLog({
                action: function (message, tag, type) {
                    LiveUnit.LoggingCore.logComment(type + ": " + message + " (" + tag + ")");
                }
            });
            var element = document.getElementById("groupTestList");
            var state = trackState(element);
            var listView = new WinJS.UI.ListView(element, {
                layout: { type: WinJS.UI[layout] },
                itemDataSource: createDataSource(smallGroups, true),
                itemTemplate: Helper.ListView.createAsyncRenderer("groupTestTemplate", 100, 100, "", 500)
            });

            state.loadedPromise.then(function (states) {
                //checkTile(listView, 0, 1, 0, 100, "Loading");

                return state.completePromise;
            }).then(function (states) {
                Helper.ListView.elementsEqual(correctStates, states);
                    checkTile(listView, 0, 1, 0, 100);
                    WinJS.Utilities.stopLog();
                }).
                then(null, function () { WinJS.Utilities.stopLog(); }).
                done(complete);
        };
    };
    generateLoadingStateAsync("GridLayout");

    function generateGroupFocusAfterDataSourceMutation(layout) {
        GroupsTests.prototype["testGroupFocusAfterDataSourceMutation" + (layout == "GridLayout" ? "" : layout)] = function (complete) {
            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({ data: i + "" });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 10) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 10) + "" };
                });

            var element = document.getElementById("groupTestList");
            var listView = new WinJS.UI.ListView(element, {
                layout: { type: WinJS.UI[layout] },
                itemDataSource: glist.dataSource,
                groupDataSource: glist.groups.dataSource
            });

            var header = null;
            Helper.ListView.waitForReady(listView)().
                then(function () {
                    listView.currentItem = { type: WinJS.UI.ObjectType.groupHeader, index: 0, hasFocus: true };
                    header = listView.element.querySelector(".win-groupheader");
                    LiveUnit.Assert.areEqual(header, document.activeElement);
                    listView.itemDataSource.remove("8");
                    return Helper.ListView.waitForReady(listView, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(document.activeElement && document.activeElement !== header && document.activeElement === listView.element.querySelector(".win-groupheader"));
                    complete();
                });
        };
    };
    generateGroupFocusAfterDataSourceMutation("GridLayout");

    function generateRealizeRenderDuringScrolling(layout) {
        var testName = "testRealizeRenderAndResetDuringScrolling" + (layout == "GridLayout" ? "" : layout);
        GroupsTests.prototype[testName] = function (complete) {
            Helper.initUnhandledErrors();
            var refItems = {};
            var stopScrolling = false;
            var failures = 0;
            var scrollPosition = 0;

            WinJS.Utilities.startLog({
                action: function (message, tag, type) {
                    LiveUnit.LoggingCore.logComment(type + ": " + message + " (" + tag + ")");
                }
            });

            function getItemTemplate() {
                var realRenderer = Helper.ListView.createAsyncRenderer("groupTestTemplate", 200, 200, "", 1000);

                return function (itemPromise) {
                    itemPromise.then(function (item) {
                        if (item.key) {
                            if (refItems[item.key]) {
                                failures++;
                            } else {
                                refItems[item.key] = item;
                            }
                        }
                    });
                    return realRenderer(itemPromise);
                };
            }

            var element = document.getElementById("groupTestList");
            var state = trackState(element);
            var listView = new ListView(element, {
                layout: new WinJS.UI[layout](),
                itemDataSource: createDataSource(bigGroups, true),
                itemTemplate: getItemTemplate()
            });

            function scrollListView() {
                if (!stopScrolling && document.body.contains(listView.element)) {
                    var scrollProperty = listView.layout.orientation === WinJS.UI.Orientation.horizontal ? "scrollLeft" : "scrollTop";
                    scrollPosition += 10;
                    var newPos: any = {};
                    newPos[scrollProperty] = scrollPosition;
                    WinJS.Utilities.setScrollPosition(listView._viewport, newPos);
                    setTimeout(scrollListView, 16);
                }
            }
            scrollListView();

            state.loadedPromise.
                then(function (states) {
                    return state.completePromise;
                }).
                then(function () {
                    return WinJS.Promise.timeout(16).then(function () {
                        scrollPosition = listView.scrollPosition = 4000;
                    });
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(0, failures);
                }).
                then(function () {
                    return WinJS.Promise.timeout(16).then(function () {
                        scrollPosition = listView.scrollPosition = 14100;
                    });
                }).
                then(function () {
                    return WinJS.Promise.timeout(16).then(function () {
                        scrollPosition = listView.scrollPosition = 14400;
                    });
                }).
                then(function () {
                    return WinJS.Promise.timeout(16).then(function () {
                        scrollPosition = listView.scrollPosition = 14150;
                        stopScrolling = true;
                    });
                }).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {
                    WinJS.Utilities.stopLog();
                    complete();
                });
        };
        GroupsTests.prototype[testName].timeout = 60000;
    };
    generateRealizeRenderDuringScrolling("GridLayout");

    function generateLoadingStateScrolling(layout) {
        var testName = "testLoadingStateScrolling" + (layout == "GridLayout" ? "" : layout);
        GroupsTests.prototype[testName] = function (complete) {
            WinJS.Utilities.startLog({
                action: function (message, tag, type) {
                    LiveUnit.LoggingCore.logComment(type + ": " + message + " (" + tag + ")");
                }
            });

            var element = document.getElementById("groupTestList");
            var state = trackState(element);
            var listView = new ListView(element, {
                layout: { type: WinJS.UI[layout] },
                itemDataSource: createDataSource(smallGroups, true),
                itemTemplate: Helper.ListView.createRenderer("groupTestTemplate")
            });

            var stopScrolling = false;
            var failedEvents = 0;
            var scrollPosition = 0;
            function scrollListView() {
                if (!stopScrolling && document.body.contains(listView.element)) {
                    var scrollProperty = listView.layout.orientation === WinJS.UI.Orientation.horizontal ? "scrollLeft" : "scrollTop";
                    scrollPosition += 5;
                    var newPos: any = {};
                    newPos[scrollProperty] = scrollPosition;
                    WinJS.Utilities.setScrollPosition(listView._viewport, newPos);
                    setTimeout(scrollListView, 16);
                }
            }
            scrollListView();

            listView.addEventListener("loadingstatechanged", function () {
                if (!stopScrolling) {
                    if (listView.loadingState !== 'itemsLoading') {
                        var indexOfFirstVisible = listView.indexOfFirstVisible;
                        var indexOfLastVisible = listView.indexOfLastVisible;
                        var firstElement = listView.elementFromIndex(indexOfFirstVisible);
                        var lastElement = listView.elementFromIndex(indexOfLastVisible);
                        if (!firstElement || !lastElement) {
                            failedEvents++;
                        }
                    }
                }
            });

            state.loadedPromise.
                then(function (states) {
                    stopScrolling = true;
                    return state.completePromise;
                }).
                then(function (states) {
                    LiveUnit.Assert.areEqual(0, failedEvents);
                }).
                then(Helper.validateUnhandledErrorsOnIdle)
                .done(function () {
                    WinJS.Utilities.stopLog();
                    complete();
                });
        };
        GroupsTests.prototype[testName].timeout = 60000;
    };
    generateLoadingStateScrolling("GridLayout");
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.GroupsTests");
