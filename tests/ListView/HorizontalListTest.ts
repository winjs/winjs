// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.ts" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts" />
/// <reference path="../TestLib/listviewutils.ts" />

module WinJSTests {

    "use strict";

    var testHost;
    var lv;

    function generateListView(host, rowsPerPage, columnsPerPage, pages, options?) {
        rowsPerPage = Math.max(rowsPerPage | 0, 1);
        columnsPerPage = Math.max(columnsPerPage | 0, 1);
        pages = Math.max(pages | 0, 1);
        options = options || {};

        var controlHeight = 600;
        var controlWidth = 600;

        //This calculation is accurate for the first page. Starting margins
        // can cause more columns per page on page 2+
        var itemHeight = controlHeight / rowsPerPage - 10; //10px total margin per item
        var itemWidth = (controlWidth - 70) / columnsPerPage; //70px starting margin
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

        options.layout = new WinJS.UI.ListLayout({ orientation: 'horizontal' });

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

    function checkFirstLastVisible(lv) {
        LiveUnit.Assert.areEqual(ListViewUtils.getFirstVisibleElement(lv).querySelector(".win-item").innerHTML, lv.elementFromIndex(lv.indexOfFirstVisible).innerHTML);
        LiveUnit.Assert.areEqual(ListViewUtils.getLastVisibleElement(lv).querySelector(".win-item").innerHTML, lv.elementFromIndex(lv.indexOfLastVisible).innerHTML);
    }

    function setScrollAndWait(scrollLeft) {
        var viewport = lv._viewport;
        return new WinJS.Promise(function (c) {
            viewport.addEventListener("scroll", function handleScroll() {
                viewport.removeEventListener("scroll", handleScroll);
                lv.addEventListener("loadingstatechanged", function handleLoadingState() {
                    if (lv.loadingState === "viewPortLoaded") {
                        lv.removeEventListener("loadingstatechanged", handleLoadingState);
                        c();
                    }
                });
            });
            WinJS.Utilities.setScrollPosition(viewport, { scrollLeft: scrollLeft, scrollTop: 0 });
        });
    }

    export class HorizontalListTest {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "HorizontalListTest";
            newNode.style.width = "600px";
            newNode.style.height = "600px";
            document.body.appendChild(newNode);
            testHost = newNode;
            lv = null;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("HorizontalListTest");
            if (element && document.body.contains(element)) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
            lv = null;
        }
    }

    // Test generator
    function generateTest(name, testFunction) {
        var configurations = [
            {
                rowsPerPage: 1,
                columnsPerPage: 1,
                pages: 5
            },
            {
                rowsPerPage: 1,
                columnsPerPage: 2,
                pages: 3
            },
            {
                rowsPerPage: 1,
                columnsPerPage: 3,
                pages: 5
            },
            {
                rowsPerPage: 1,
                columnsPerPage: 5,
                pages: 3
            },
            {
                rowsPerPage: 1,
                columnsPerPage: 1,
                pages: 5
            }
        ];

        configurations.forEach(function (options) {
            var testName = name + "_HList_" + options.rowsPerPage + 'X' + options.columnsPerPage + 'X' + options.pages;
            HorizontalListTest.prototype[testName] = function (complete) {
                lv = generateListView(testHost, options.rowsPerPage, options.columnsPerPage, options.pages);
                testFunction.call(null, complete);
            };
        });
    };

    // Test cases
    generateTest("testGetScrollPosition", function (complete) {
        var viewport = lv.element.querySelector(".win-viewport");

        var scrollPositions;
        var scrollIndex;
        ListViewUtils.waitForReady(lv)().done(function () {
            asyncWhile(function () {
                if (!scrollPositions) {
                    var scrollMax = viewport.scrollWidth - viewport.clientWidth;
                    scrollPositions = [50, Math.floor(scrollMax / 2), scrollMax];
                    scrollIndex = 0;
                } else {
                    scrollIndex++;
                }
                return WinJS.Promise.wrap(scrollIndex < scrollPositions.length);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var targetScrollPosition = scrollPositions[scrollIndex];

                        setScrollAndWait(targetScrollPosition).done(function () {
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
        ListViewUtils.waitForReady(lv)().done(function () {
            asyncWhile(function () {
                scrollMax = viewport.scrollWidth - viewport.clientWidth;
                return WinJS.Promise.wrap(WinJS.Utilities.getScrollPosition(viewport).scrollLeft < scrollMax);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var targetScrollPosition = Math.min(WinJS.Utilities.getScrollPosition(viewport).scrollLeft + increment, scrollMax);
                        lv.scrollPosition = targetScrollPosition;

                        ListViewUtils.waitForReady(lv)().done(function () {
                            LiveUnit.Assert.areEqual(targetScrollPosition, WinJS.Utilities.getScrollPosition(viewport).scrollLeft);
                            c();
                        });
                    });
                }).done(complete);
        });
    });

    generateTest("testGetIndexOfFirstLastVisible", function (complete) {
        var viewport = lv.element.querySelector(".win-viewport");

        var scrollPositions;
        var scrollIndex;
        ListViewUtils.waitForReady(lv)().done(function () {
            asyncWhile(function () {
                if (!scrollPositions) {
                    var scrollMax = viewport.scrollWidth - viewport.clientWidth;
                    scrollPositions = [50, Math.floor(scrollMax / 2), scrollMax];
                    scrollIndex = 0;
                } else {
                    scrollIndex++;
                }
                return WinJS.Promise.wrap(scrollIndex < scrollPositions.length);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var targetScrollPosition = scrollPositions[scrollIndex];

                        setScrollAndWait(targetScrollPosition).done(function () {
                            checkFirstLastVisible(lv);
                            c();
                        });
                    });
                }).done(complete);
        });
    });

    generateTest("testSetIndexOfFirstVisible", function (complete) {
        var columnsPerPage = lv.testOptions.columnsPerPage;
        var rowsPerPage = lv.testOptions.rowsPerPage;
        var pages = lv.testOptions.pages;
        var itemCount = columnsPerPage * rowsPerPage * pages;
        var maxFirstVisibleIndex = itemCount - ((1 + columnsPerPage) * rowsPerPage); // Skip the last page and 1 column
        ListViewUtils.waitForReady(lv)().done(function () {
            asyncWhile(function () {
                return WinJS.Promise.wrap(lv.indexOfFirstVisible < maxFirstVisibleIndex);
            }, function () {
                    return new WinJS.Promise(function (c) {
                        var expectedIndexOfFirstVisible = Math.min(maxFirstVisibleIndex, Math.max(0, lv.indexOfFirstVisible) + rowsPerPage);
                        lv.indexOfFirstVisible = expectedIndexOfFirstVisible;

                        ListViewUtils.waitForReady(lv)().done(function () {
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
        var itemCount = columnsPerPage * rowsPerPage * pages;
        var ensureVisibleTargets = [
            0,                           // start
            ((itemCount / 2) | 0) - 1,   // middle
            itemCount - 1                // end
        ];
        asyncWhile(function () {
            return WinJS.Promise.wrap(ensureVisibleTargets.length > 0);
        }, function () {
                return new WinJS.Promise(function (c) {
                    var ensureVisibleIndex = ensureVisibleTargets.pop();
                    lv.ensureVisible(ensureVisibleIndex);

                    ListViewUtils.waitForReady(lv)().done(function () {
                        LiveUnit.Assert.isTrue(ensureVisibleIndex >= lv.indexOfFirstVisible, "Index of first visible should be less than or eq to ensured visible item index");
                        LiveUnit.Assert.isTrue(ensureVisibleIndex <= lv.indexOfLastVisible, "Index of first visible should be greater than or eq to ensured visible item index");
                        c();
                    });
                });
            }).done(complete);
    });

}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.HorizontalListTest");
