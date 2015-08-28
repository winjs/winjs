// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.Utils.ts" />

module WinJSTests {

    "use strict";

    var testHost;
    var lv;

    var checkFirstLastVisible = function checkFirstLastVisible(lv) {
        LiveUnit.Assert.areEqual(Helper.ListView.Utils.getFirstVisibleElement(lv).querySelector(".win-item").innerHTML, lv.elementFromIndex(lv.indexOfFirstVisible).innerHTML);
        LiveUnit.Assert.areEqual(Helper.ListView.Utils.getLastVisibleElement(lv).querySelector(".win-item").innerHTML, lv.elementFromIndex(lv.indexOfLastVisible).innerHTML);
    };

    function generateListView(host, rowsPerPage, columnsPerPage, pages, options?) {
        rowsPerPage = Math.max(rowsPerPage | 0, 1);
        columnsPerPage = Math.max(columnsPerPage | 0, 1);
        pages = Math.max(pages | 0, 1);
        options = options || {};

        var controlHeight = 600;
        var controlWidth = 600;

        var itemHeight = controlHeight / rowsPerPage - 10;
        var itemWidth = (controlWidth - 70) / columnsPerPage - 10 /*10 is the margin in vertical grid for win-container*/;
        function template(itemPromise) {
            var el = document.createElement("div");
            el.style.height = itemHeight + "px";
            el.style.width = itemWidth + "px";

            itemPromise.then(function (item) {
                el.textContent = item.index;
            });
            return el;
        }
        options.itemTemplate = template;

        var itemCount = rowsPerPage * columnsPerPage * pages;
        var myList: any = [];
        for (var i = 0; i < itemCount; i++) {
            myList.push({ index: i });
        }
        myList = new WinJS.Binding.List(myList);
        options.itemDataSource = myList.dataSource;

        options.layout = new WinJS.UI.GridLayout({ orientation: 'vertical' });

        var lv = new WinJS.UI.ListView(null, options);
        lv.element.style.height = controlHeight + "px";
        lv.element.style.width = controlWidth + "px";

        host.appendChild(lv.element);

        lv['testOptions'] = {
            rowsPerPage: rowsPerPage,
            columnsPerPage: columnsPerPage,
            pages: pages
        };
        return lv;
    }

    export class VerticalGridTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "VerticalGridTests";
            newNode.style.width = "600px";
            newNode.style.height = "600px";
            document.body.appendChild(newNode);
            testHost = newNode;
            lv = null;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("VerticalGridTests");
            if (element && document.body.contains(element)) {
                document.body.removeChild(element);
            }
            lv = null;
        }
    }
    // Test generator
    var generateTest = function (name, testFunction) {
        var configurations = [
            {
                rowsPerPage: 4,
                columnsPerPage: 1,
                pages: 5
            },
            {
                rowsPerPage: 4,
                columnsPerPage: 2,
                pages: 5
            },
            {
                rowsPerPage: 4,
                columnsPerPage: 5,
                pages: 5
            },
            {
                rowsPerPage: 1,
                columnsPerPage: 1,
                pages: 5
            },
            {
                rowsPerPage: 4,
                columnsPerPage: 3,
                pages: 5
            }
        ];

        configurations.forEach(function (options) {
            var testName = name + "_VGrid_" + options.rowsPerPage + 'X' + options.columnsPerPage + 'X' + options.pages;
            VerticalGridTests.prototype[testName] = function (complete) {
                lv = generateListView(testHost, options.rowsPerPage, options.columnsPerPage, options.pages);
                testFunction.call(null, complete);
            };
        });
    };

    // Test cases
    generateTest("testGetScrollPosition", function (complete) {

        var viewport = lv.element.querySelector(".win-viewport");

        var scrollMax = 0;
        var increment = 50;
        Helper.ListView.Utils.waitForReady(lv)().done(function () {
            Helper.asyncWhile(function () {
                scrollMax = viewport.scrollHeight - viewport.clientHeight;
                return WinJS.Promise.wrap(viewport.scrollTop < scrollMax);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var targetScrollPosition = Math.min(viewport.scrollTop + increment, scrollMax);
                        viewport.scrollTop = targetScrollPosition;

                        //use requestAnimationFrame to match ListView's timing
                        requestAnimationFrame(function () {
                            LiveUnit.Assert.areEqual(targetScrollPosition, lv.scrollPosition);
                            c();
                        });
                    });
                }).done(complete);
        });
    });

    generateTest("testSetScrollPosition", function (complete) {

        var viewport = lv.element.querySelector(".win-viewport");

        var scrollMax = 0;
        var increment = 50;

        Helper.ListView.Utils.waitForReady(lv)().done(function () {
            Helper.asyncWhile(function () {
                scrollMax = viewport.scrollHeight - viewport.clientHeight;
                return WinJS.Promise.wrap(viewport.scrollTop < scrollMax);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var targetScrollPosition = Math.min(viewport.scrollTop + increment, scrollMax);
                        lv.scrollPosition = targetScrollPosition;

                        Helper.ListView.Utils.waitForReady(lv)().done(function () {
                            LiveUnit.Assert.areEqual(targetScrollPosition, viewport.scrollTop);
                            c();
                        });
                    });
                }).done(complete);
        });
    });

    generateTest("testGetIndexOfFirstLastVisible", function (complete) {

        var viewport = lv.element.querySelector(".win-viewport");

        var increment = 50;

        Helper.asyncWhile(function () {
            var scrollMax = viewport.scrollHeight - viewport.clientHeight;
            return WinJS.Promise.wrap(viewport.scrollTop < scrollMax);
        }, function () {
                return new WinJS.Promise(function (c) {
                    viewport.scrollTop += increment;

                    Helper.ListView.Utils.waitForReady(lv)().done(function () {
                        checkFirstLastVisible(lv);
                        c();
                    });
                });
            }).done(complete);
    });

    generateTest("testGetIndexOfFirstLastVisibleWithGroups", function (complete) {

        var groupedDS = lv.itemDataSource._list.createGrouped(function groupKey(item) {
            return (item.index / 10) | 0;
        }, function groupData(group) {
            return {
                    title: (group.index / 10) | 0
                }
        });

        lv.itemDataSource = groupedDS.dataSource;
        lv.groupDataSource = groupedDS.groups.dataSource;

        var viewport = lv.element.querySelector(".win-viewport");

        var increment = 50;

        Helper.asyncWhile(function () {
            var scrollMax = viewport.scrollHeight - viewport.clientHeight;
            return WinJS.Promise.wrap(viewport.scrollTop < scrollMax);
        }, function () {
                return new WinJS.Promise(function (c) {
                    viewport.scrollTop += increment;

                    Helper.ListView.Utils.waitForReady(lv)().done(function () {
                        checkFirstLastVisible(lv);
                        c();
                    });
                });
            }).done(complete);
    });

    generateTest("testSetIndexOfFirstVisible", function (complete) {

        var columnsPerPage = lv.testOptions.columnsPerPage;
        var rowsPerPage = lv.testOptions.rowsPerPage;
        var pages = lv.testOptions.pages;
        var itemCount = columnsPerPage * rowsPerPage * pages;
        var maxFirstVisibleIndex = itemCount - (columnsPerPage * (rowsPerPage + 1)); //Skip the last page and 1 row
        Helper.ListView.Utils.waitForReady(lv)().done(function () {
            Helper.asyncWhile(function () {
                return WinJS.Promise.wrap(lv.indexOfFirstVisible < maxFirstVisibleIndex);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var expectedIndexOfFirstVisible = Math.min(maxFirstVisibleIndex, Math.max(0, lv.indexOfFirstVisible) + columnsPerPage);
                        lv.indexOfFirstVisible = expectedIndexOfFirstVisible;

                        Helper.ListView.Utils.waitForReady(lv)().done(function () {
                            LiveUnit.Assert.areEqual(expectedIndexOfFirstVisible, lv.indexOfFirstVisible, "Read value is different after setting");
                            checkFirstLastVisible(lv);
                            c();
                        });
                    });
                }).done(complete);
        });
    });

    generateTest("testEnsureVisible", function (complete) {

        var columnsPerPage = lv.testOptions.columnsPerPage;
        var rowsPerPage = lv.testOptions.rowsPerPage;
        var pages = lv.testOptions.pages;
        var itemCount = columnsPerPage * rowsPerPage * pages - 1;
        var ensureVisibleTargets = [
            0,                   // start
            ((itemCount / 2) | 0) - 1,   // middle
            itemCount - 1        // end
        ];
        Helper.asyncWhile(function () {
            return WinJS.Promise.wrap(ensureVisibleTargets.length > 0);
        }, function () {
                return new WinJS.Promise(function (c) {
                    var ensureVisibleIndex = ensureVisibleTargets.pop();
                    lv.ensureVisible(ensureVisibleIndex);

                    Helper.ListView.Utils.waitForReady(lv)().then(function () {
                        LiveUnit.Assert.isTrue(ensureVisibleIndex >= lv.indexOfFirstVisible, "Index of first visible should be less than or eq to ensured visible item index");
                        LiveUnit.Assert.isTrue(ensureVisibleIndex <= lv.indexOfLastVisible, "Index of first visible should be greater than or eq to ensured visible item index");
                        c();
                    });
                });
            }).done(complete);
    });
	
	var disabledTestRegistry = {
		testSetScrollPosition_VGrid_4X3X5: Helper.Browsers.safari,
		testSetIndexOfFirstVisible_VGrid_4X1X5: Helper.Browsers.safari,
		testSetScrollPosition_VGrid_4X5X5: Helper.Browsers.safari,
		testSetScrollPosition_VGrid_1X1X5: Helper.Browsers.safari,
		testSetIndexOfFirstVisible_VGrid_4X2X5: Helper.Browsers.safari
	};
	Helper.disableTests(VerticalGridTests, disabledTestRegistry);

}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.VerticalGridTests");