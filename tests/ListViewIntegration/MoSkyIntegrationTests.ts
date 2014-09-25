// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts"/>
/// <reference path="globals.ts"/>
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.ListView.Utils.ts"/>
/// <reference path="listviewverify.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";
    var lvUtils = Helper.ListView.Utils;
    var lvVerify = ListViewVerify;

    function createCellSpanningDataSource(size, spanningPeriod, groupSize?) {

        // Populate a data array
        var data = [];
        for (var i = 0; i < size; i++) {
            data.push({
                groupIndex: (groupSize && groupSize > 0 ? Math.floor(i / groupSize) : 0),
                spanning: (i % spanningPeriod == 0 ? 2 : 1),
                title: "Title",
                content: "Content",
            });
        }


        // Create the datasource
        // Simulate the notification methods implemented in Live's data source
        var controller = {
            directivesForMethod: function (method, args) {
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
        };

        // Data adapter abilities
        var abilities = {
            itemsFromIndex: true,
            itemsFromKey: true,
            getCount: true,
            setNotificationHandler: true
        };

        return Helper.ItemsManager.createTestDataSource(data, controller, abilities); // (objects, controller, abilities)
    }

    function getGroupKeyFromItem(item) {
        return item.data.groupIndex.toString();
    }

    function getGroupDataFromItem(item) {
        return { index: item.data.groupIndex, enableCellSpanning: item.data.groupIndex == 0 };
    }

    function cellSpanningRenderer(itemPromise) {
        return itemPromise.then(function (currentItem) {
            var result = document.createElement("div");

            //use source data to decide what size to make the
            //ListView item
            if (currentItem.data.spanning == 1) {
                result.style.width = "50px";
                result.style.height = "50px";
            }
            else if (currentItem.data.spanning == 2) {
                result.style.width = "100px";
                result.style.height = "50px";
            }
            result.style.overflow = "hidden";

            var body = document.createElement("div");
            body.style.overflow = "hidden";

            // Display title
            var title = document.createElement("h4");
            title.textContent = currentItem.data.title;
            body.appendChild(title);

            // Display text
            var fulltext = document.createElement("h6");
            fulltext.textContent = currentItem.data.content;
            body.appendChild(fulltext);

            result.appendChild(body);
            return result;
        });
    }

    function groupInfo(groupItem) {
        return {
            enableCellSpanning: !groupItem || groupItem.data.enableCellSpanning,
            cellWidth: 50,
            cellHeight: 50,
        };
    }

    export class MoSkyIntegrationTests {


        /// -----------------------------------------------------------------------------------------------
        //  Setup and Teardown
        /// -----------------------------------------------------------------------------------------------

        // Setup function to create HTML page hosting a listview
        setUp() {
            LiveUnit.LoggingCore.logComment("Create Test Page...");
            lvUtils.initializeDOM();
        }

        // Teardown function
        tearDown() {
            LiveUnit.LoggingCore.logComment("Test Tear Down...");
            lvUtils.resetDOM();
        }

    }

    var generateInitializationCellSpanningEnabled = function (layoutName) {
        MoSkyIntegrationTests.prototype["testInitializationCellSpanningEnabled" + layoutName] = function (complete) {
            var options = {
                layout: { type: WinJS.UI[layoutName], groupInfo: groupInfo },
                selectionMode: Expected.SelectionMode.None,
                itemDataSource: createCellSpanningDataSource(100, 8),
                itemTemplate: cellSpanningRenderer
            };

            lvUtils.logTestStart("Test initialization of listview with variable sized & custom renderer grid layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, Expected.Direction.ltr, options);

            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, options);

            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    complete();
                },
                function (e) {
                    throw Error(e);
                });
        }
    };
    generateInitializationCellSpanningEnabled("CellSpanningLayout");

    var generateInitializationCellSpanningEnabledGroupWithCellSpanningDisabledGroup = function (layoutName) {
        MoSkyIntegrationTests.prototype["testInitializationCellSpanningEnabledGroupWithCellSpanningDisabledGroup" + layoutName] = function (complete) {

            var dataSource = WinJS.UI.computeDataSourceGroups(createCellSpanningDataSource(50, 3, 30), getGroupKeyFromItem, getGroupDataFromItem);
            var options = {
                layout: { type: WinJS.UI[layoutName], groupInfo: groupInfo, groupHeaderPosition: "top" },
                selectionMode: Expected.SelectionMode.None,
                itemDataSource: dataSource,
                groupDataSource: dataSource.groups,
                itemTemplate: cellSpanningRenderer
            };

            lvUtils.logTestStart("Test initialization of listview with variable sized & custom renderer grid layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, Expected.Direction.ltr, options);
            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, options);

            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    complete();
                }, function (e) {
                    throw Error(e);
                });
        };
    };
    generateInitializationCellSpanningEnabledGroupWithCellSpanningDisabledGroup("CellSpanningLayout");

    var generateReplaceDSCellSpanningEnabled = function (layoutName) {
        MoSkyIntegrationTests.prototype["testReplaceDSCellSpanningEnabled" + layoutName] = function (complete) {
            var options = {
                layout: { type: WinJS.UI[layoutName], groupInfo: groupInfo },
                selectionMode: Expected.SelectionMode.None,
                itemDataSource: createCellSpanningDataSource(100, 8),
                itemTemplate: cellSpanningRenderer
            };

            lvUtils.logTestStart("Test initialization of listview with variable sized & custom renderer grid layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, Expected.Direction.ltr, options);

            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, options);

            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    listView.itemDataSource = createCellSpanningDataSource(200, 9);
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    complete();
                },
                function (e) {
                    throw Error(e);
                });
        };
    };
    generateReplaceDSCellSpanningEnabled("CellSpanningLayout");

    var generateInvalidateAllCellSpanningEnabled = function (layoutName) {
        MoSkyIntegrationTests.prototype["testInvalidateAllCellSpanningEnabled" + layoutName] = function (complete) {
            var options = {
                layout: { type: WinJS.UI[layoutName], groupInfo: groupInfo },
                selectionMode: Expected.SelectionMode.None,
                itemDataSource: createCellSpanningDataSource(100, 8),
                itemTemplate: cellSpanningRenderer
            };

            lvUtils.logTestStart("Test initialization of listview with variable sized & custom renderer grid layout.");
            var listView = lvUtils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, Expected.Direction.ltr, options);

            lvVerify.verifyGetOptions(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, options);

            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    for (var i = 0; i < 100; i++) {
                        listView.itemDataSource.testDataAdapter.insertAtIndex({
                            groupIndex: 1,
                            spanning: 2,
                            title: "Title",
                            content: "Content",
                        }, 0);
                    }
                    return listView.itemDataSource.invalidateAll();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    complete();
                },
                function (e) {
                    throw Error(e);
                });
        };
    };
    generateInvalidateAllCellSpanningEnabled("CellSpanningLayout");

}

LiveUnit.registerTestClass("WinJSTests.MoSkyIntegrationTests");
