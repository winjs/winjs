// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

(function () {
    "use strict";

    // WinBlue: 157025 - Merge the unit tests in this file with the ones in Layout2Test.js after the rename change is checked in.
    WinJSTests.LayoutTestsExtra = function () {

        // This is the setup function that will be called at the beginning of each test function.
        this.setUp = function (complete) {

            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "LayoutTests";
            newNode.innerHTML =
                "<div id='metricsPlaceholder'></div>" +
                "<div id='changeLayout1'></div>" +
                "<div id='changeLayout2'></div>" +
                "<div id='layoutTestPlaceholder'></div>" +
                "<div id='layoutTestTemplate' class='layoutTestTile' style='display: none'>" +
                "   <div>{{title}}</div>" +
                "</div>" +
                "<div id='childTemplate' style='display: none'>" +
                "   <div class='layoutTestTile'>{{title}}</div>" +
                "</div>" +
                "<div id='asymmetricalMarginsPlaceholder' class='bigMargins' ></div>" +
                "<div id='asymmetricalMarginsTemplate' class='asymmetricalMarginsTile' style='display: none'>" +
                "   <div>{{title}}</div>" +
                "</div>" +
                "<div id='leadingMarginPlaceholder'></div>" +
                "<div id='leadingMarginTemplate' class='leadingMarginTile' style='display: none'>" +
                "   <div>{{title}}</div>" +
                "</div>";

            document.body.appendChild(newNode);
            removeListviewAnimations();
            appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
        };

        this.tearDown = function () {
            LiveUnit.LoggingCore.logComment("In tearDown");

            var element = document.getElementById("LayoutTests");
            document.body.removeChild(element);
            restoreListviewAnimations();
            removeCSSFileFromHead("$(TESTDATA)/Listview.css");
        }

        function setupListView(element, layoutName, itemTemplate) {
            var items = [];
            for (var i = 0; i < 27; ++i) {
                items[i] = { title: "Tile" + i };
            }

            var layout;
            if (layoutName === "CellSpanningLayout") {
                var groupInfo = function (index) {
                    return {
                        enableCellSpanning: true,
                        cellWidth: 100,
                        cellHeight: 100
                    };
                };
                var itemInfo = function (index) {
                    return {
                        width: 100,
                        height: 100
                    };
                };
                layout = new WinJS.UI.CellSpanningLayout({ groupInfo: groupInfo, itemInfo: itemInfo, enableCellSpanning: true });
            } else {
                layout = new WinJS.UI[layoutName]();
            }

            var list = new WinJS.Binding.List(items);
            return new WinJS.UI.ListView(element, {
                itemDataSource: list.dataSource,
                itemTemplate: createRenderer(itemTemplate || "layoutTestTemplate"),
                layout: layout
            });
        }

        function checkTileSize(listview, index, width, height) {
            var tile = listview.elementFromIndex(index),
                tileWidth = utilities.getTotalWidth(tile),
                tileHeight = utilities.getTotalHeight(tile);
            LiveUnit.Assert.areEqual(width, tileWidth);
            LiveUnit.Assert.areEqual(height, tileHeight);
        }

        this.generateHeightAutoTest = function (layoutName, expectedHeight) {
            this["testHeightAutoLayout" + layoutName] = function (complete) {
                var listView = document.createElement("div");
                listView.style.width = "384px";
                listView.style.height = "auto";
                document.body.appendChild(listView);
                var list = new WinJS.UI.ListView(listView, {
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (data) {
                            var el = document.createElement("div");
                            el.textContent = data.data.title;
                            el.style.height = "100px";
                            return el;
                        });
                    }
                });
                list.layout = new WinJS.UI[layoutName]();
                list.layout.orientation = "horizontal";

                var bl = new WinJS.Binding.List();
                for (var i = 0; i < 100; i++) {
                    bl.push({ title: "title- " + i });
                }
                list.itemDataSource = bl.dataSource;

                waitForDeferredAction(listView)().done(function () {
                    LiveUnit.Assert.areEqual(expectedHeight, window.getComputedStyle(listView).height);
                    document.body.removeChild(listView);
                    complete();
                });
            }
        }

        if (WinJS.Utilities.isPhone) {
            this.generateHeightAutoTest("ListLayout", "128px");
            this.generateHeightAutoTest("GridLayout", "122px");
        } else {
            this.generateHeightAutoTest("ListLayout", "144px");
            this.generateHeightAutoTest("GridLayout", "124px");
        }

        this.generateChangeLayout = function (fromLayoutName, toLayoutName) {
            this["testChangeLayout" + (fromLayoutName == "GridLayout" ? "" : fromLayoutName)] = function (complete) {
                LiveUnit.LoggingCore.logComment("In testChangeLayout");

                var placeholder1 = document.getElementById("changeLayout1"),
                    placeholder2 = document.getElementById("changeLayout2"),
                    listView1 = new WinJS.UI.ListView(placeholder1, { layout: { type: WinJS.UI[fromLayoutName] } }),
                    listView2 = new WinJS.UI.ListView(placeholder2, { layout: new WinJS.UI[fromLayoutName]() });

                validateListView(listView1);
                validateListView(listView2);
                LiveUnit.Assert.isTrue(listView1.layout instanceof WinJS.UI[fromLayoutName]);
                LiveUnit.Assert.isTrue(listView2.layout instanceof WinJS.UI[fromLayoutName]);

                listView2.layout = new WinJS.UI[toLayoutName]();

                LiveUnit.Assert.isTrue(listView1.layout instanceof WinJS.UI[fromLayoutName]);
                LiveUnit.Assert.isTrue(listView2.layout instanceof WinJS.UI[toLayoutName]);

                complete();
            };
        };
        this.generateChangeLayout("GridLayout", "ListLayout");

        this.generateMetrics = function (layoutName) {
            this["testMetrics" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
                LiveUnit.LoggingCore.logComment("in testMetrics");


                var withCssClass = setupListView(document.getElementById("metricsPlaceholder"), layoutName),
                    withoutCssClass = setupListView(document.getElementById("layoutTestPlaceholder"), layoutName),
                    withChild = setupListView(document.getElementById("changeLayout1"), layoutName, "childTemplate");

                var promises = [
                    waitForReady(withCssClass, -1)(),
                    waitForReady(withoutCssClass, -1)(),
                    waitForReady(withChild, -1)()
                ];

                WinJS.Promise.join(promises).then(function () {
                    checkTileSize(withCssClass, 0, 135, 135);
                    checkTileSize(withoutCssClass, 0, 100, 100);
                    checkTileSize(withChild, 0, 100, 100);

                    complete();
                });
            };
        };
        this.generateMetrics("GridLayout");

        function checkTile(listview, index, left, top) {
            var tile = listview.elementFromIndex(index),
                container = containerFrom(tile);
            LiveUnit.Assert.areEqual("Tile" + index, tile.textContent.trim());
            LiveUnit.Assert.areEqual(left, offsetLeftFromSurface(listview, container), "Error in tile " + index);
            LiveUnit.Assert.areEqual(top, offsetTopFromSurface(listview, container), "Error in tile " + index);
        }

        this.generate = function (name, layout, testFunction, itemTemplate, placeholder) {

            function generateTest(that) {
                var fullName = name + "_" + layout;
                that[fullName] = function (complete) {
                    LiveUnit.LoggingCore.logComment("in " + fullName);

                    var element = document.getElementById(placeholder ? placeholder : "layoutTestPlaceholder");
                    var listview = setupListView(element, layout, itemTemplate);

                    testFunction(element, listview, complete);
                };
            }
            generateTest(this);
        }


        var testHorizontalGrid = function (element, listview, complete) {
            var tests = [
                function () {
                    LiveUnit.LoggingCore.logComment("ltr tests");
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, 0, 100);
                    checkTile(listview, 3, 100, 0);
                    checkTile(listview, 4, 100, 100);

                    element.dir = "rtl";
                    viewport(element).scrollLeft = 0;
                    return true;
                },
                function () {
                    LiveUnit.LoggingCore.logComment("rtl tests");
                    checkTile(listview, 0, 800, 0);
                    checkTile(listview, 1, 800, 100);
                    checkTile(listview, 4, 700, 100);

                    element.dir = "";
                    element.style.width = "550px";
                    return true;
                },
                function () {
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, 0, 100);
                    checkTile(listview, 3, 100, 0);
                    checkTile(listview, 4, 100, 100);

                    /* TODO Uncomment when bug 372547 is fixed
                    
                                    element.style.height = "500px";
                                    return true;
                                },
                                function () {
                                    checkTile(listview, 1, 0, 100);
                                    checkTile(listview, 4, 0, 400);
                                    checkTile(listview, 5, 100, 0);
                    */

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testHorizontalGrid", "GridLayout", testHorizontalGrid);

        var testFirstLastDisplayedInGrid = function (element, listview, complete) {
            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(8, listview.indexOfLastVisible);

                    listview.scrollPosition = 101;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(101, viewport(element).scrollLeft);
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(14, listview.indexOfLastVisible);

                    listview.scrollPosition = 0;
                    return true;
                },
                function () {
                    element.style.height = "500px";
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(14, listview.indexOfLastVisible);

                    listview.scrollPosition = 101;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(5, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(24, listview.indexOfLastVisible);

                    utilities.addClass(element, "bigMargins");
                    listview.forceLayout();
                    return true;
                },
                function () {
                    listview.scrollPosition = 10;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(5, listview.indexOfLastVisible);

                    listview.scrollPosition = 140;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(8, listview.indexOfLastVisible);

                    listview.ensureVisible(9);
                },
                function () {
                    LiveUnit.Assert.areEqual(325, listview.scrollPosition);
                    listview.scrollPosition = 0;
                    return true;
                },
                function () {
                    element.dir = "rtl";
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(5, listview.indexOfLastVisible);

                    listview.scrollPosition = 140;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(8, listview.indexOfLastVisible);

                    listview.scrollPosition = 310;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(6, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(11, listview.indexOfLastVisible);

                    listview.indexOfFirstVisible = 3;
                },
                function () {
                    LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testFirstLastDisplayedInGridLayout", "GridLayout", testFirstLastDisplayedInGrid);

        var testFirstLastDisplayedInList = function (element, listview, complete) {
            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(2, listview.indexOfLastVisible);

                    listview.scrollPosition = 101;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(101, viewport(element).scrollTop);
                    LiveUnit.Assert.areEqual(1, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(4, listview.indexOfLastVisible);

                    utilities.addClass(element, "bigMargins");
                    listview.forceLayout();
                    return true;
                },
                function () {
                    listview.scrollPosition = 35;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(1, listview.indexOfLastVisible);

                    listview.scrollPosition = 165;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(1, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(2, listview.indexOfLastVisible);

                    listview.indexOfFirstVisible = 4;
                },
                function () {
                    LiveUnit.Assert.areEqual(4, listview.indexOfFirstVisible);

                    listview.ensureVisible(5);
                },
                function () {
                    LiveUnit.Assert.areEqual(650, listview.scrollPosition);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testFirstLastDisplayedInListLayout", "ListLayout", testFirstLastDisplayedInList);

        var generateTestIndexOfFirstVisible = function (rtl) {
            return function (element, listview, complete) {
                var tests = [
                    function () {
                        if (rtl) {
                            element.dir = "rtl";
                            return true;
                        }
                    },
                    function () {
                        listview.scrollPosition = 150;
                        return true;
                    },
                    function () {
                        LiveUnit.Assert.areEqual(150, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(150, listview.scrollPosition);

                        LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);
                        LiveUnit.Assert.areEqual(14, listview.indexOfLastVisible);

                        listview.indexOfFirstVisible = 0;
                    },
                    function () {
                        LiveUnit.Assert.areEqual(0, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);

                        listview.indexOfFirstVisible = 1;
                    },
                    function () {
                        LiveUnit.Assert.areEqual(0, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);

                        listview.indexOfFirstVisible = 3;
                    },
                    function () {
                        LiveUnit.Assert.areEqual(100, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                        viewport(element).scrollLeft = 150;
                        return true;
                    },
                    function () {
                        listview.ensureVisible(6);
                    },
                    function () {
                        LiveUnit.Assert.areEqual(150, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                        viewport(element).scrollLeft = 150;
                    },
                    function () {
                        listview.ensureVisible(3);
                    },
                    function () {
                        LiveUnit.Assert.areEqual(100, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(3, listview.indexOfFirstVisible);

                        listview.ensureVisible(0);
                    },
                    function () {
                        LiveUnit.Assert.areEqual(0, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);

                        viewport(element).scrollLeft = 150;
                        return true;
                    },
                    function () {
                        listview.ensureVisible(12);
                    },
                    function () {
                        LiveUnit.Assert.areEqual(200, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(6, listview.indexOfFirstVisible);

                        viewport(element).scrollLeft = 150;
                        return true;
                    },
                    function () {
                        listview.ensureVisible(15);
                    },
                    function () {
                        LiveUnit.Assert.areEqual(300, viewport(element).scrollLeft);
                        LiveUnit.Assert.areEqual(9, listview.indexOfFirstVisible);

                        complete();
                    }
                ];

                runTests(listview, tests);
            }
        };
        this.generate("testIndexOfFirstVisibleGridLayouT", "GridLayout", generateTestIndexOfFirstVisible(false));
        this.generate("testIndexOfFirstVisibleGridLayoutRTL", "GridLayout", generateTestIndexOfFirstVisible(true));

        var testIndexOfFirstVisibleOutOfRange = function (element, listview, complete) {

            initUnhandledErrors();

            waitForReady(listview)().
                then(function () {
                    listview.indexOfFirstVisible = 1000;
                    return WinJS.Promise.timeout();
                }).
                then(validateUnhandledErrorsOnIdle).
                done(complete);
        };

        this.generate("testIndexOfFirstVisibleOutOfRangeGridLayout", "GridLayout", testIndexOfFirstVisibleOutOfRange);

        var testEnsureVisibleOutOfRange = function (element, listview, complete) {

            initUnhandledErrors();

            waitForReady(listview)().
                then(function () {
                    listview.ensureVisible(1000);
                    return WinJS.Promise.timeout();
                }).
                then(validateUnhandledErrorsOnIdle).
                done(complete);
        };

        this.generate("testEnsureVisibleOutOfRangeGridLayout", "GridLayout", testEnsureVisibleOutOfRange);

        var testEnsureVisibleWithAsymmetricalMarginsInGrid = function (element, listview, complete) {
            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(3, listview.indexOfLastVisible);

                    listview.ensureVisible(6);
                },
                function () {
                    LiveUnit.Assert.areEqual(300, viewport(element).scrollLeft);

                    listview.ensureVisible(3);
                },
                function () {
                    LiveUnit.Assert.areEqual(100, viewport(element).scrollLeft);

                    utilities.removeClass(element, "bigMargins");
                    listview.forceLayout();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(11, listview.indexOfLastVisible);
                    listview.ensureVisible(12);
                },
                function () {
                    LiveUnit.Assert.areEqual(200, viewport(element).scrollLeft);

                    utilities.addClass(element, "bigMargins");
                    listview.forceLayout();
                    return true;
                },
                function () {
                    viewport(element).scrollLeft = 125;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(2, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(5, listview.indexOfLastVisible);

                    viewport(element).scrollLeft = 250;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(4, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(7, listview.indexOfLastVisible);

                    element.dir = "rtl";
                    return true
                },
                function () {
                    viewport(element).scrollLeft = 25;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(0, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(3, listview.indexOfLastVisible);

                    viewport(element).scrollLeft = 201;
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(2, listview.indexOfFirstVisible);
                    LiveUnit.Assert.areEqual(7, listview.indexOfLastVisible);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testEnsureVisibleWithAsymmetricalMarginsInGridLayout", "GridLayout", testEnsureVisibleWithAsymmetricalMarginsInGrid, "asymmetricalMarginsTemplate", "asymmetricalMarginsPlaceholder");

        var testEnsureVisibleWithAsymmetricalMarginsInList = function (element, listview, complete) {
            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(1, listview.indexOfLastVisible);

                    listview.ensureVisible(3);
                },
                function () {
                    LiveUnit.Assert.areEqual(300, viewport(element).scrollTop);

                    listview.ensureVisible(1);
                },
                function () {
                    LiveUnit.Assert.areEqual(100, viewport(element).scrollTop);

                    utilities.removeClass(element, "bigMargins");
                    listview.forceLayout();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(3, listview.indexOfLastVisible);
                    listview.ensureVisible(4);
                },
                function () {
                    LiveUnit.Assert.areEqual(200, viewport(element).scrollTop);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testEnsureVisibleWithAsymmetricalMarginsInListLayout", "ListLayout", testEnsureVisibleWithAsymmetricalMarginsInList, "asymmetricalMarginsTemplate", "asymmetricalMarginsPlaceholder");

        var testLeadingMargin = function (element, listview, complete) {
            var tests = [
            function () {
                checkTile(listview, 0, 0, 0);
                checkTile(listview, 1, 0, 100);
                checkTile(listview, 3, 110, 0);

                listview.ensureVisible(20);
            },
            function () {
                listview.ensureVisible(1);
            },
            function () {
                LiveUnit.Assert.areEqual(0, viewport(element).scrollLeft);

                listview.ensureVisible(20);
            },
            function () {
                listview.indexOfFirstVisible = 0;
            },
            function () {
                LiveUnit.Assert.areEqual(0, viewport(element).scrollLeft);

                complete();
            }
            ];

            runTests(listview, tests);
        };
        this.generate("testLeadingMarginGridLayout", "GridLayout", testLeadingMargin, "leadingMarginTemplate", "leadingMarginPlaceholder");

        var testMaxRows = function (element, listview, complete) {
            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, 0, 100);
                    checkTile(listview, 2, 0, 200);
                    checkTile(listview, 3, 100, 0);
                    checkTile(listview, 4, 100, 100);
                    checkTile(listview, 5, 100, 200);

                    listview.layout.maxRows = 2;
                },
                function () {
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, 0, 100);
                    checkTile(listview, 2, 100, 0);
                    checkTile(listview, 3, 100, 100);
                    checkTile(listview, 4, 200, 0);
                    checkTile(listview, 5, 200, 100);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testMaxRows", "GridLayout", testMaxRows);

        var testMaximumRowsOrColumnsHorizontal = function (element, listview, complete) {
            var tests = [
                function () {
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, 0, 100);
                    checkTile(listview, 2, 0, 200);
                    checkTile(listview, 3, 100, 0);
                    checkTile(listview, 4, 100, 100);
                    checkTile(listview, 5, 100, 200);

                    listview.layout.maximumRowsOrColumns = 2;
                },
                function () {
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, 0, 100);
                    checkTile(listview, 2, 100, 0);
                    checkTile(listview, 3, 100, 100);
                    checkTile(listview, 4, 200, 0);
                    checkTile(listview, 5, 200, 100);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testMaximumRowsOrColumnsHorizontal", "GridLayout", testMaximumRowsOrColumnsHorizontal);
        this.generate("testMaximumRowsOrColumnsHorizontal", "CellSpanningLayout", testMaximumRowsOrColumnsHorizontal);

        var testMaximumRowsOrColumnsVertical = function (element, listview, complete) {
            listview.layout.orientation = "vertical";
            var tests = [
                function () {
                    var columnSpacing = WinJS.Utilities.isPhone ? 29 : 31;
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, columnSpacing, 0);
                    checkTile(listview, 2, 2 * columnSpacing, 0);
                    checkTile(listview, 3, 3 * columnSpacing, 0);
                    checkTile(listview, 4, 4 * columnSpacing, 0);
                    checkTile(listview, 5, 5 * columnSpacing, 0);

                    listview.layout.maximumRowsOrColumns = 2;
                },
                function () {
                    var columnSpacing = WinJS.Utilities.isPhone ? 29 : 31;
                    checkTile(listview, 0, 0, 0);
                    checkTile(listview, 1, columnSpacing, 0);
                    checkTile(listview, 2, 0, 100);
                    checkTile(listview, 3, columnSpacing, 100);
                    checkTile(listview, 4, 0, 200);
                    checkTile(listview, 5, columnSpacing, 200);

                    complete();
                }
            ];

            runTests(listview, tests);
        };
        this.generate("testMaximumRowsOrColumnsVertical", "GridLayout", testMaximumRowsOrColumnsVertical);

        function createDataSource(data, requests) {
            var dataSource = {
                itemsFromIndex: function (index, countBefore, countAfter) {
                    return new WinJS.Promise(function (complete, error) {
                        if (index >= 0 && index < data.length) {
                            var startIndex = Math.max(0, index - countBefore),
                                endIndex = Math.min(index + countAfter, data.length - 1),
                                size = endIndex - startIndex + 1;

                            var items = [];
                            for (var i = startIndex; i < startIndex + size; i++) {
                                items.push({
                                    key: i.toString(),
                                    data: data[i]
                                });
                                requests.push(i);
                            }

                            var retVal = {
                                items: items,
                                offset: index - startIndex,
                                totalCount: data.length,
                                absoluteIndex: index
                            };

                            complete(retVal);
                        } else {
                            complete({});
                        }
                    });
                },

                getCount: function () {
                    return WinJS.Promise.wrap(data.length);
                }
            };

            return new WinJS.UI.ListDataSource(dataSource);
        }

        this.testFirstVisibleInConstructor = function (complete) {
            function test(layoutName) {
                var element = document.createElement("div");
                element.style.width = "200px";
                element.style.height = "200px";
                document.body.appendChild(element);

                var data = [];
                for (var i = 0; i < 100; i++) {
                    data.push({
                        label: "Item" + i
                    });
                }

                var requests = [];

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: createDataSource(data, requests),
                    layout: new WinJS.UI[layoutName](),
                    pagesToLoad: 10,
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    },
                    indexOfFirstVisible: 24
                });

                return new WinJS.Promise(function (complete) {
                    function checkAndExecute() {
                        if (listView.loadingState === "complete") {
                            if (layoutName.indexOf("GridLayout") == 0) {
                                LiveUnit.Assert.areEqual(1200, listView.scrollPosition);
                            }
                            else {
                                LiveUnit.Assert.areEqual(2400, listView.scrollPosition);
                            }
                            LiveUnit.Assert.areEqual(24, listView.indexOfFirstVisible);

                            LiveUnit.Assert.areEqual(-1, requests.indexOf(2));
                            LiveUnit.Assert.areEqual(-1, requests.indexOf(3));

                            var offsetFromSurface = listView._horizontal() ? offsetLeftFromSurface : offsetTopFromSurface;
                            LiveUnit.Assert.areEqual(listView.scrollPosition, offsetFromSurface(listView, containerFrom(listView.elementFromIndex(24))));

                            listView.removeEventListener("loadingstatechanged", checkAndExecute, false);
                            document.body.removeChild(element);
                            complete();
                        }
                    }

                    listView.addEventListener("loadingstatechanged", checkAndExecute, false);
                    checkAndExecute();
                });
            }

            WinJS.Promise.wrap().then(function () {
                LiveUnit.LoggingCore.logComment("testing with GridLayout");
                return test("GridLayout");
            }).then(function () {
                LiveUnit.LoggingCore.logComment("testing with ListLayout");
                return test("ListLayout");
            }).done(complete);
        };

        this.testSingleRealizationWithIndexOfFirstVisible = function (complete) {

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var stateChangeCounter = {
                itemsLoading: 0,
                viewPortLoaded: 0,
                itemsLoaded: 0,
                complete: 0
            };

            element.addEventListener("loadingstatechanged", function (eventObject) {
                stateChangeCounter[eventObject.target.winControl.loadingState]++;
            });


            var data = [];
            for (var i = 0; i < 15000; i++) {
                data.push({
                    label: "Item" + i
                });
            }
            var list = new WinJS.Binding.List(data);

            var listView = new WinJS.UI.ListView(element, {
                itemDataSource: list.dataSource,
                layout: new WinJS.UI.GridLayout(),
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.style.width = "100px";
                        element.style.height = "100px";
                        element.textContent = item.data.label;
                        return element;
                    });
                }
            });

            listView.indexOfFirstVisible = 7500;

            WinJS.Utilities.Scheduler.schedulePromiseIdle().then(function () {
                return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
            }).then(function () {
                return WinJS.Promise.timeout(100);
            }).then(function () {
                LiveUnit.Assert.areEqual(1, stateChangeCounter.viewPortLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.itemsLoaded);
                LiveUnit.Assert.areEqual(1, stateChangeCounter.complete);

                element.parentNode.removeChild(element);

                complete();
            });
        };

        this.testScrollingSynchronization = function (complete) {

            function createListView() {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "300px";
                document.body.appendChild(element);

                var data = [];
                for (var i = 0; i < 100; i++) {
                    data.push({
                        label: "Item" + i
                    });
                }
                var list = new WinJS.Binding.List(data);

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI.GridLayout(),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return waitForReady(listView)(listView);
            }

            createListView().then(function (listView) {

                listView.layout = new WinJS.UI.GridLayout();
                listView.indexOfFirstVisible = 30;

                return waitForReady(listView)(listView);
            }).then(function (listView) {

                LiveUnit.Assert.areEqual(30, listView.indexOfFirstVisible);

                listView.element.parentNode.removeChild(listView.element);

                return createListView();
            }).then(function (listView) {

                listView.layout = new WinJS.UI.GridLayout();
                listView.scrollPosition = 2000;

                return waitForReady(listView)(listView);
            }).then(function (listView) {

                LiveUnit.Assert.areEqual(2000, listView.scrollPosition);

                listView.element.parentNode.removeChild(listView.element);

                return createListView();
            }).then(function (listView) {

                listView.forceLayout();
                listView.scrollPosition = 2000;

                return waitForReady(listView)(listView);
            }).then(function (listView) {

                LiveUnit.Assert.areEqual(2000, listView.scrollPosition);

                listView.element.parentNode.removeChild(listView.element);

                return createListView();
            }).then(function (listView) {

                listView.forceLayout();
                listView.indexOfFirstVisible = 30;

                return waitForReady(listView)(listView);
            }).then(function (listView) {

                LiveUnit.Assert.areEqual(30, listView.indexOfFirstVisible);
                listView.element.parentNode.removeChild(listView.element);

                return createListView();
            }).then(function (listView) {

                listView.scrollPosition = 2000;
                listView.indexOfFirstVisible = 30;

                return waitForReady(listView)(listView);
            }).then(function (listView) {

                LiveUnit.Assert.areEqual(30, listView.indexOfFirstVisible);
                listView.element.parentNode.removeChild(listView.element);

                return createListView();
            }).then(function (listView) {

                listView.indexOfFirstVisible = 30;
                listView.scrollPosition = 2000;

                return waitForReady(listView)(listView);
            }).then(function (listView) {

                LiveUnit.Assert.areEqual(2000, listView.scrollPosition);
                listView.element.parentNode.removeChild(listView.element);

                complete();
            });
        };

        this.testIndexOfFirstVisible = function (complete) {

            function test(layoutName, count, firstVisible, lastVisible) {
                LiveUnit.LoggingCore.logComment("testing " + layoutName + " layout with " + count + " items");
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                document.body.appendChild(element);

                var items = [];
                for (var i = 0; i < count; i++) {
                    items.push({
                        label: "Item" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return new WinJS.Promise(function (complete) {
                    function checkAndExecute() {
                        if (listView.loadingState === "complete") {

                            LiveUnit.Assert.areEqual(firstVisible, listView.indexOfFirstVisible);
                            LiveUnit.Assert.areEqual(lastVisible, listView.indexOfLastVisible);

                            listView.removeEventListener("loadingstatechanged", checkAndExecute, false);
                            document.body.removeChild(element);
                            complete();
                        }
                    }

                    listView.addEventListener("loadingstatechanged", checkAndExecute, false);
                    checkAndExecute();
                });
            }

            var tests = [
                ["GridLayout", 0, -1, -1],
                ["GridLayout", 1, 0, 0],
                ["GridLayout", 5, 0, 4],
                ["GridLayout", 100, 0, 8],
                ["ListLayout", 0, -1, -1],
                ["ListLayout", 1, 0, 0],
                ["ListLayout", 2, 0, 1],
                ["ListLayout", 100, 0, 3],
            ];

            function runTest(i) {
                if (i < tests.length) {
                    var parameters = tests[i];
                    return test(parameters[0], parameters[1], parameters[2], parameters[3]).then(function () {
                        runTest(i + 1);
                    })
                } else {
                    return WinJS.Promise.wrap();
                }
            }

            runTest(0).then(complete);
        };

        this.testCSSChange = function (complete) {

            function test(layoutName, index, beforeLeft, beforeTop, afterLeft, afterTop) {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                document.body.appendChild(element);

                var items = [];
                for (var i = 0; i < 10; i++) {
                    items.push({
                        label: "Tile" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.className = "cssChangeItem";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return new WinJS.Promise(function (complete) {
                    runTests(listView, [
                        function () {
                            checkTile(listView, index, beforeLeft, beforeTop);
                            utilities.addClass(element, "cssChangeBigger");
                            listView.forceLayout();
                        },
                        function () {
                            checkTile(listView, index, afterLeft, afterTop);
                            document.body.removeChild(element);
                            complete();
                        }
                    ]);
                });
            }


            test("GridLayout", 1, 0, 100, 200, 0).then(function () {
                return test("ListLayout", 1, 0, 100, 0, 200);
            }).then(complete);
        };

        this.testRestoringScrollpos = function (complete) {

            function test(layoutName, functionName) {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                document.body.appendChild(element);

                var items = [];
                for (var i = 0; i < 100; i++) {
                    items.push({
                        label: "Tile" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    layout: new WinJS.UI[layoutName](),
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.style.width = "100px";
                            element.style.height = "100px";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                return new WinJS.Promise(function (complete) {
                    runTests(listView, [
                        function () {
                            listView.scrollPosition = 300;
                            return true;
                        },
                        function () {
                            var scrollProperty = listView._horizontal() ? "scrollLeft" : "scrollTop";
                            LiveUnit.Assert.areEqual(300, listView._viewport[scrollProperty]);
                            setTimeout(function () {
                                element.style.display = "none";
                                setTimeout(function () {
                                    element.style.display = "block";
                                    // Changing display property resets scrollXXX property without raising onscroll event
                                    LiveUnit.Assert.areEqual(0, listView._viewport[scrollProperty]);
                                    // forceLayout restores scrollXXX
                                    listView[functionName]();
                                    listView.addEventListener("loadingstatechanged", checkAndExecute, false);

                                    function checkAndExecute() {
                                        if (listView.loadingState === "complete") {
                                            LiveUnit.Assert.areEqual(300, listView._viewport[scrollProperty]);

                                            listView.removeEventListener("loadingstatechanged", checkAndExecute, false);
                                            document.body.removeChild(element);
                                            WinJS.UI.ListView.triggerDispose();
                                            complete();
                                        }
                                    };
                                }, 100);
                            }, 16);
                        }
                    ]);
                });
            }

            test("GridLayout", "forceLayout").then(function () {
                return test("ListLayout", "forceLayout");
            }).then(function () {
                return test("GridLayout", "recalculateItemPosition");
            }).then(function () {
                return test("ListLayout", "recalculateItemPosition");
            }).then(complete);
        };

        this.generateRecalculateItemPosition = function (layoutName) {
            this["testRecalculateItemPosition" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
                var element = document.createElement("div");
                element.style.width = "300px";
                element.style.height = "350px";
                document.body.appendChild(element);

                var items = [];
                for (var i = 0; i < 10; i++) {
                    items.push({
                        label: "Tile" + i
                    });
                }
                var list = new WinJS.Binding.List(items);

                var listView = new WinJS.UI.ListView(element, {
                    layout: new WinJS.UI[layoutName](),
                    itemDataSource: list.dataSource,
                    itemTemplate: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var element = document.createElement("div");
                            element.className = "cssChangeItem";
                            element.textContent = item.data.label;
                            return element;
                        });
                    }
                });

                runTests(listView, [
                    function () {
                        checkTile(listView, 1, 0, 100);
                        var tile = listView.elementFromIndex(1);
                        tile.style.backgroundColor = "pink";
                        utilities.addClass(element, "cssChangeBigger");
                        listView.recalculateItemPosition();
                    },
                    function () {
                        checkTile(listView, 1, 200, 0);
                        var tile = listView.elementFromIndex(1);
                        // recalculateItemPosition should not re-create elements so pink color should be still there
                        LiveUnit.Assert.areEqual("pink", tile.style.backgroundColor);
                        document.body.removeChild(element);
                        complete();
                    }
                ]);
            };
        };
        this.generateRecalculateItemPosition("GridLayout");
    };

    // register the object as a test class by passing in the name
    LiveUnit.registerTestClass("WinJSTests.LayoutTestsExtra");

})();
