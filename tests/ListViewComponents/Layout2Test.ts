// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/Helper.ts" />
// <reference path="../TestData/ListView.less.css" />



module WinJSTests {
    "use strict";

    var Key = WinJS.Utilities.Key;
    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;
    var ListLayout = <typeof WinJS.UI.PrivateListLayout> WinJS.UI.ListLayout;
    var GridLayout = <typeof WinJS.UI.PrivateGridLayout> WinJS.UI.GridLayout;
    var CellSpanningLayout = <typeof WinJS.UI.PrivateCellSpanningLayout> WinJS.UI.CellSpanningLayout;

    // Like element.querySelectorAll but returns an array
    function query(selector, element) {
        element = element || document;
        return Array.prototype.slice.call(element.querySelectorAll(selector));
    }

    // Clamps x to the range first <= x <= last
    function clampToRange(first, last, x) {
        return Math.max(first, Math.min(last, x));
    }

    // Returns string s repeated n times
    function strRepeat(s, n) {
        return new Array(n + 1).join(s);
    }

    function objectsAreEqual(a, b, message) {
        if (typeof a === "object" && typeof b === "object") {
            var keys = Object.keys(a).concat(Object.keys(b));

            keys.forEach(function (key) {
                objectsAreEqual(a[key], b[key], message);
            });
        } else {
            LiveUnit.Assert.areEqual(a, b, message);
        }
    }

    function attachGenericSizesToLayout(layout, sizes) {
        var horizontal = (layout.orientation === "horizontal");
        Object.defineProperties(sizes, {
            surfaceOuterCrossSize: {
                get: function () {
                    return (horizontal ? sizes.surfaceOuterHeight : sizes.surfaceOuterWidth);
                },
                enumerable: true
            },
            layoutOrigin: {
                get: function () {
                    return (horizontal ? sizes.layoutOriginX : sizes.layoutOriginY);
                },
                enumerable: true
            },
            itemsContainerOuterSize: {
                get: function () {
                    return (horizontal ? sizes.itemsContainerOuterWidth : sizes.itemsContainerOuterHeight);
                },
                enumerable: true
            },
            itemsContainerOuterCrossSize: {
                get: function () {
                    return (horizontal ? sizes.itemsContainerOuterHeight : sizes.itemsContainerOuterWidth);
                },
                enumerable: true
            },
            itemsContainerOuterStart: {
                get: function () {
                    return (horizontal ? sizes.itemsContainerOuterX : sizes.itemsContainerOuterY);
                },
                enumerable: true
            },
            itemsContainerOuterCrossStart: {
                get: function () {
                    return (horizontal ? sizes.itemsContainerOuterY : sizes.itemsContainerOuterX);
                },
                enumerable: true
            },
            containerCrossSize: {
                get: function () {
                    return (horizontal ? sizes.containerHeight : sizes.containerWidth);
                },
                enumerable: true
            },
            containerSize: {
                get: function () {
                    return (horizontal ? sizes.containerWidth : sizes.containerHeight);
                },
                enumerable: true
            },
        });

        function getHeaderSizeAdjustment() {
            if (layout._groupsEnabled) {
                if (layout._horizontal && layout._groupHeaderPosition === WinJS.UI.HeaderPosition.top) {
                    return sizes.headerContainerHeight;
                } else if (!layout._horizontal && layout._groupHeaderPosition === WinJS.UI.HeaderPosition.left) {
                    return sizes.headerContainerWidth;
                }
            }

            return 0;
        }
        sizes.maxItemsContainerContentSize = sizes.surfaceContentSize - sizes.itemsContainerOuterCrossSize - getHeaderSizeAdjustment();
        layout._sizes = sizes;
    }

    // This is a simplified version of the ListView which has 2 important pieces
    // of functionality:
    // - it can generate an object which supports the site interface which can
    //   be passed to a layout
    // - it provides the SimpleListView object itself which can be manipulated
    //   by the test to effect the state of the site interface
    var SimpleListView = WinJS.Class.define(function SimpleListView_ctor(element, options) {
        var tree = '',
            container = '<div class="' + WinJS.UI._containerClass + '"></div>',
            orientationClass = WinJS.UI[options.layout.orientation === "horizontal" ? "_horizontalClass" : "_verticalClass"];

        options = options || {};
        this._viewportSize = options.viewportSize;
        this._rtl = options.rtl || false;
        this._realizedRange = options.realizedRange || { firstPixel: 0, lastPixel: 1000000 };
        this._itemsCount = options.itemsCount;
        if (this._rtl) {
            element.setAttribute("dir", "rtl");
        }
        if (options.groupsEnabled) {
            var counts = options.itemsCount || [6, 4],
                i;
            for (i = 0; i < counts.length; i++) {
                tree +=
                '<div class="' + WinJS.UI._headerContainerClass + '"></div>' +
                '<div class="' + WinJS.UI._itemsContainerClass + '">' +
                strRepeat(container, counts[i]) +
                '</div>';
            }
        } else {
            var count = options.itemsCount || 10;
            tree =
            '<div class="' + WinJS.UI._itemsContainerClass + '">' +
            strRepeat(container, count) +
            '</div>';
        }

        WinJS.Utilities.addClass(element, WinJS.UI._listViewClass);
        element.innerHTML =
        '<div class="' + WinJS.UI._viewportClass + ' ' + orientationClass + '">' +
        '<div class="' + WinJS.UI._scrollableClass + '">' +
        tree +
        '</div>' +
        '</div>';
        this.element = element;
        this.scrollPosition = 0;
        this._viewport = element.querySelector("." + WinJS.UI._viewportClass);
        this._surface = element.querySelector("." + WinJS.UI._scrollableClass);
        this._groupsEnabled = options.groupsEnabled;
    }, {
            _tree: {
                get: function () {
                    var headers = query("." + WinJS.UI._headerContainerClass, this.element),
                        itemsContainers = query("." + WinJS.UI._itemsContainerClass, this.element),
                        tree = [],
                        i;
                    for (i = 0; i < itemsContainers.length; i++) {
                        tree.push({
                            header: headers[i],
                            itemsContainer: {
                                element: itemsContainers[i],
                                items: query("." + WinJS.UI._containerClass, itemsContainers[i])
                            }
                        });
                    }
                    return tree;
                }
            },

            _getLayoutSite: function SimpleListView_getLayoutSite() {
                var that = this;
                return Object.create({
                    surface: this._surface,
                    viewport: this._viewport,
                    viewportSize: this._viewportSize,
                    rtl: this._rtl,
                    tree: this._tree,
                    itemFromIndex: function (index) {
                        return WinJS.Promise.wrap({ data: { title: "Item " + index } });
                    },
                    groupFromIndex: function (index) {
                        return { index: index };
                    },
                    groupIndexFromItemIndex: function (itemIndex) {
                        if (Array.isArray(that._itemsCount)) {
                            var counter = 0,
                                groupIndex;
                            for (groupIndex = 0; groupIndex < that._itemsCount.length; groupIndex++) {
                                counter += that._itemsCount[groupIndex];
                                if (itemIndex < counter) {
                                    break;
                                }
                            }
                            return Math.min(that._itemsCount.length, groupIndex);
                        } else {
                            return 0;
                        }
                    },
                    renderItem: function (itemPromise) {
                        return itemPromise.then(function (item) {
                            var container = document.createElement("div");
                            container.className = WinJS.UI._containerClass;
                            container.innerHTML =
                            '<div class="' + WinJS.UI._itemBoxClass + '">' +
                            '<div class="template ' + WinJS.UI._itemClass + '"></div>' +
                            '</div>';
                            return container;
                        });
                    },
                    renderHeader: function (group) {
                        return WinJS.Promise.wrap().then(function () {
                            var container = document.createElement("div");
                            container.className = WinJS.UI._headerContainerClass;
                            container.innerHTML = '<div class="headerTemplate ' + WinJS.UI._headerClass + '"></div>';
                            return container;
                        });
                    },
                    readyToMeasure: function () {
                    },
                    _writeProfilerMark: function () {
                    }
                }, {
                        scrollbarPos: {
                            get: function () {
                                return that.scrollPosition;
                            }
                        },
                        realizedRange: {
                            get: function () {
                                return that._realizedRange;
                            }
                        },
                        itemCount: {
                            get: function () {
                                return WinJS.Promise.wrap(1);
                            }
                        },
                        groupCount: {
                            get: function () {
                                return that._tree.length;
                            }
                        }
                    });
            },

            _containerAtIndex: function SimpleListView_containerAtIndex(index) {
                return this._surface.querySelectorAll("." + WinJS.UI._containerClass)[index];
            },

            _cleanUp: function SimpleListView_cleanUp() {
                this.element.innerHTML = "";
            }
        });

    function checkTile(listView, itemSizes, index, left, top, tileType) {
        var container = listView instanceof SimpleListView ?
            listView._containerAtIndex(index) :
            Helper.ListView.containerFrom(listView.elementFromIndex(index));

        LiveUnit.Assert.isTrue(tileType === "u" || WinJS.Utilities.hasClass(container, WinJS.UI._laidOutClass),
            "Item should have been laid out");

        // Verify position
        LiveUnit.Assert.areEqual(left, container.offsetLeft, "Tile " + index + " has incorrect offsetLeft");
        LiveUnit.Assert.areEqual(top, container.offsetTop, "Tile " + index + " has incorrect offsetTop");

        // Verify size (width, height)

        var expectedWidth = itemSizes[tileType].width,
            expectedHeight = itemSizes[tileType].height,
            width = container.offsetWidth,
            height = container.offsetHeight;

        LiveUnit.Assert.areEqual(expectedWidth, width, "Error in tile " + index);
        LiveUnit.Assert.areEqual(expectedHeight, height, "Error in tile " + index);
    }

    var testRootEl;

    export class ListLayoutTests {


        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "ListLayoutListView";
            newNode.style.width = "100px";
            newNode.style.height = "37px";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }

        // Verify that the layout cancels its layout promise when layout is called
        // while the ListView is invisible.
        testLayoutWhileInvisible = function (complete) {
            function test(groupsEnabled) {
                var layout = new ListLayout(),
                    count = 10,
                    listView = new SimpleListView(document.getElementById("ListLayoutListView"), {
                        layout: layout,
                        groupsEnabled: groupsEnabled
                    });

                listView.element.style.display = "none";
                layout._itemsPerBar = 1;
                layout.initialize(listView._getLayoutSite(), groupsEnabled);
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    LiveUnit.Assert.fail("Layout promise should not complete successfully");
                }, function (error) {
                        LiveUnit.Assert.areEqual("Canceled", error.name, "Layout should have canceled its layout promise");
                    });
            }

            test(false).then(function () {
                return test(true);
            }).then(complete);
        };

        // Verify that itemsFromRange properly maps pixel ranges to item ranges
        testItemsFromRange = function (complete) {
            function test(groupsEnabled) {
                // Given pixelRange (inclusive), verify that itemsFromRange
                // returns expectedItemRange (inclusive)
                var offsetFromHeaders = 0;
                function verifyRange(pixelRange, expectedItemRange) {
                    var itemRange = layout.itemsFromRange(pixelRange.firstPixel + offsetFromHeaders, pixelRange.lastPixel + offsetFromHeaders);
                    LiveUnit.Assert.areEqual(expectedItemRange.firstIndex, itemRange.firstIndex, "itemsFromRange returned wrong firstIndex");
                    LiveUnit.Assert.areEqual(expectedItemRange.lastIndex, itemRange.lastIndex, "itemsFromRange returned wrong lastIndex");
                }

                var layout = new ListLayout(),
                    count = 10,
                    listView = new SimpleListView(document.getElementById("ListLayoutListView"), {
                        layout: layout,
                        groupsEnabled: groupsEnabled,
                        viewportSize: { width: 100, height: 37 }
                    });

                layout.initialize(listView._getLayoutSite(), groupsEnabled);
                layout._measuringPromise = WinJS.Promise.wrap();
                layout._envInfo = {};
                var sizes = {
                    viewportContentSize: 100,
                    containerWidth: 90,
                    containerHeight: 15,
                    containerSizeLoaded: true,
                    containerMargins: {
                        left: 5,
                        top: 5,
                        right: 5,
                        bottom: 0
                    },
                    layoutOriginY: 20,
                    layoutOriginX: 0,
                    layoutOrigin: 20,
                    itemsContainerOuterX: 0,
                    itemsContainerOuterY: 0,
                    headerContainerWidth: 10,
                    headerContainerHeight: 10,
                    itemsContainerOuterHeight: 0,
                    itemsContainerOuterWidth: 0,
                };
                layout._itemsPerBar = 1;
                attachGenericSizesToLayout(layout, sizes);
                offsetFromHeaders = groupsEnabled ? sizes.headerContainerHeight : 0;
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    // _sizes says that each item's content has a height of 10px, each
                    // pair of items has a 5px margin between them, and there are 20px of
                    // space before the first item.
                    //
                    // When calculating the first item in a range, the margin is treated as
                    // belonging to the item above it. Consequently, when mapping firstPixel
                    // to firstIndex, item x occupies the space
                    // from (15 + 15x) to (15 + 15x + 14) inclusive.
                    //
                    // When calculating the last item in a range, the margin is treated as
                    // belonging to the item below it. Consequently, when mapping lastPixel
                    // to lastIndex, item x occupies the space
                    // from (20 + 15x) to (20 + 15x + 14) inclusive.

                    // Verify item 0's boundary
                    verifyRange({ firstPixel: 14, lastPixel: 19 }, { firstIndex: 0, lastIndex: 0 });
                    verifyRange({ firstPixel: 14, lastPixel: 20 }, { firstIndex: 0, lastIndex: 0 });
                    verifyRange({ firstPixel: 14, lastPixel: 64 }, { firstIndex: 0, lastIndex: 2 });
                    verifyRange({ firstPixel: 15, lastPixel: 64 }, { firstIndex: 0, lastIndex: 2 });

                    // Verify some item boundaries that are not at an edge of the list
                    verifyRange({ firstPixel: 29, lastPixel: 64 }, { firstIndex: 0, lastIndex: 2 });
                    verifyRange({ firstPixel: 34, lastPixel: 64 }, { firstIndex: 0, lastIndex: 2 });
                    verifyRange({ firstPixel: 35, lastPixel: 70 }, { firstIndex: 1, lastIndex: 3 });

                    // Verify the last item's boundary (index = 9)
                    verifyRange({ firstPixel: 35, lastPixel: 169 + offsetFromHeaders }, { firstIndex: 1, lastIndex: 9 });
                    verifyRange({ firstPixel: 35, lastPixel: 170 + offsetFromHeaders }, { firstIndex: 1, lastIndex: 9 });
                    verifyRange({ firstPixel: 164 + offsetFromHeaders, lastPixel: 170 + offsetFromHeaders }, { firstIndex: 9, lastIndex: 9 });

                    // Verify empty range is returned when pixel range contains no items
                    verifyRange({ firstPixel: 10000, lastPixel: 10100 }, { firstIndex: 0, lastIndex: -1 });

                    layout.uninitialize();
                    listView._cleanUp();
                });
            }

            test(false).then(function () {
                return test(true);
            }).then(complete);
        };

        // Verify that, given a key press, getAdjacent correctly calculates the
        // location that focus should move to.
        testGetAdjacent = function (complete) {
            function test(groupsEnabled) {
                function verifyGetAdjacent(currentIndex, pressedKey, expectedIndex) {
                    var newItem = layout.getAdjacent({ type: "item", index: currentIndex }, pressedKey);
                    LiveUnit.Assert.areEqual("item", newItem.type, "getAdjacent's returned type should be item");
                    LiveUnit.Assert.areEqual(expectedIndex, newItem.index, "getAdjacent's returned index should be " + expectedIndex);
                }

                var layout = new ListLayout({ orientation: "vertical" }),
                    count = 10,
                    listView = new SimpleListView(document.getElementById("ListLayoutListView"), {
                        layout: layout,
                        groupsEnabled: groupsEnabled,
                        viewportSize: { width: 100, height: 37 }
                    });

                layout.initialize(listView._getLayoutSite(), groupsEnabled);
                layout._measuringPromise = WinJS.Promise.wrap();
                layout._envInfo = {};
                var sizes = {
                    viewportContentSize: 100,
                    containerWidth: 90,
                    containerHeight: 15,
                    containerSizeLoaded: true,
                    containerMargins: {
                        left: 5,
                        top: 5,
                        right: 5,
                        bottom: 0
                    },
                    layoutOriginY: 20,
                    layoutOriginX: 0,
                    layoutOrigin: 20,
                    itemsContainerOuterX: 10,
                    itemsContainerOuterY: 10,
                    itemsContainerOuterHeight: 0,
                    itemsContainerOuterWidth: 0,
                    headerContainerWidth: 10,
                    headerContainerHeight: 10,
                };
                layout._itemsPerBar = 1;
                attachGenericSizesToLayout(layout, sizes);
                var offsetFromHeaders = groupsEnabled ? sizes.headerContainerHeight : 0;
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    // Arrow key tests

                    // Beginning of list (currentIndex = 0)
                    verifyGetAdjacent(0, Key.upArrow, -1);
                    verifyGetAdjacent(0, Key.leftArrow, -1);
                    verifyGetAdjacent(0, Key.downArrow, 1);
                    verifyGetAdjacent(0, Key.rightArrow, 1);

                    // Middle of list (currentIndex = 3)
                    verifyGetAdjacent(3, Key.upArrow, 2);
                    verifyGetAdjacent(3, Key.leftArrow, 2);
                    verifyGetAdjacent(3, Key.downArrow, 4);
                    verifyGetAdjacent(3, Key.rightArrow, 4);

                    // End of list (currentIndex = count - 1)
                    verifyGetAdjacent(count - 1, Key.upArrow, count - 2);
                    verifyGetAdjacent(count - 1, Key.leftArrow, count - 2);
                    verifyGetAdjacent(count - 1, Key.downArrow, count - 1);
                    verifyGetAdjacent(count - 1, Key.rightArrow, count - 1);

                    // pageUp tests

                    // Verify over scrolling during page up
                    listView.scrollPosition = 40;
                    verifyGetAdjacent(3, Key.pageUp, 2); // first fully visible index on current page is 2
                    verifyGetAdjacent(1, Key.pageUp, 0); // no items on prev page

                    // Verify boundary on current page
                    listView.scrollPosition = 90;
                    verifyGetAdjacent(6, Key.pageUp, 4); // first fully visible index on current page is 4
                    listView.scrollPosition = 91;
                    verifyGetAdjacent(6, Key.pageUp, 5); // first fully visible index on current page is 5

                    // Verify boundary on previous page
                    listView.scrollPosition = 96;
                    verifyGetAdjacent(5, Key.pageUp, 4); // first visible index on prev page that preserves full visibility of 5 is 4

                    // pageDown tests

                    // Verify minimum scroll position
                    listView.scrollPosition = 0;
                    verifyGetAdjacent(0, Key.pageDown, 1);

                    layout.uninitialize();
                    listView._cleanUp();
                });
            }

            test(false).then(complete);
        };
        
        testLayoutCleansUpNoCssGridClass(complete) {
            if (Helper.Browser.supportsCSSGrid) {
                complete();
                return;
            }
            
            var makeAndTestSimpleListView = (layout, count) => {
                var lv = new SimpleListView(document.getElementById("ListLayoutListView"), {
                    layout: layout,
                    viewportSize: { width: 100, height: 37 }
                });
                layout.initialize(lv._getLayoutSite(), false);
                return layout.layout(lv._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(lv._surface, "win-nocssgrid"),
                        "SimpleListView should have had class win-nocssgrid");
                    layout.uninitialize();
                    LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(lv._surface, "win-nocssgrid"),
                        "win-nocssgrid class should have been removed from SimpleListView");
                });
            }
            
            var layout = new ListLayout({ orientation: "vertical" }),
                count = 10;
            
            makeAndTestSimpleListView(layout, count).then(function () {
                return makeAndTestSimpleListView(layout, count);
            }).then(function () {
                complete();
            });
                
        }
    }
    // Verify that ListLayout's initialize function:
    // - Returns "vertical" for its scroll direction by default
    // - Adds the listlayout CSS class to the surface
    [null, WinJS.UI.Orientation.horizontal, WinJS.UI.Orientation.vertical].forEach(function (orientation) {
        ListLayoutTests.prototype["testInitialize_" + orientation] = function () {
            [true, false].forEach(function (groupsEnabled) {
                var layout = new ListLayout({ orientation: orientation }),
                    viewport = document.createElement("div"),
                    surface = document.createElement("div");

                layout.initialize({
                    viewport: viewport,
                    surface: surface,
                    _writeProfilerMark: function () { }
                }, groupsEnabled);
                LiveUnit.Assert.areEqual(orientation || WinJS.UI.Orientation.vertical, layout.orientation,
                    "ListLayout's orientation should match the option passed in the constructor or default to horizontal");
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(surface, WinJS.UI._listLayoutClass),
                    "surface should have listlayout CSS class");
            });
        };
    });

    // Verify that after the layout function:
    // - Containers are visible
    // - Headers are hidden
    // - Rendered items have been properly measured
    // - Containers have their sizes properly set (via a dynamically generated CSS rule)
    // - After clean up, containers have their sizes cleared (i.e. height=0)
    [null, WinJS.UI.Orientation.horizontal, WinJS.UI.Orientation.vertical].forEach(function (orientation) {
        ListLayoutTests.prototype["testLayout_" + orientation] = function (complete) {
            function test(groupsEnabled) {
                function countHidden(selector) {
                    return query(selector, listView.element).filter(function (elt) {
                        return getComputedStyle(elt).display === "none";
                    }).length;
                }

                function countVisible(selector) {
                    return query(selector, listView.element).filter(function (elt) {
                        return getComputedStyle(elt).display === "block";
                    }).length;
                }

                var layout = new ListLayout({ orientation: orientation }),
                    count = 10,
                    listView = new SimpleListView(document.getElementById("ListLayoutListView"), {
                        layout: layout,
                        groupsEnabled: groupsEnabled,
                        viewportSize: { width: 100, height: 37 }
                    });
                layout._itemsPerBar = 1;
                layout.initialize(listView._getLayoutSite(), groupsEnabled);
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    var container = listView._containerAtIndex(0);

                    // Containers should be visible
                    LiveUnit.Assert.areEqual(count, countVisible("." + WinJS.UI._containerClass), "All containers should be visible after layout");
                    LiveUnit.Assert.areEqual(0, countHidden("." + WinJS.UI._containerClass), "All containers should be visible after layout");

                    if (groupsEnabled) {
                        LiveUnit.Assert.areEqual(2, countVisible("." + WinJS.UI._headerContainerClass), "All group headers should be visible after layout");
                        LiveUnit.Assert.areEqual(0, countHidden("." + WinJS.UI._headerContainerClass), "All group headers should be visible after layout");
                    }

                    // Verify measurements
                    if (!orientation || orientation === WinJS.UI.Orientation.vertical) {
                        // in vertical
                        LiveUnit.Assert.areEqual(20, layout._sizes.containerHeight, "Rendered item height was measured incorrectly");
                        LiveUnit.Assert.areEqual(20, layout._sizes.layoutOriginY, "Space above first item was measured incorrectly");
                        LiveUnit.Assert.areEqual(0, layout._sizes.layoutOriginX, "Space to the left of the first item was measured incorrectly");
                        LiveUnit.Assert.areEqual(100, layout._sizes.viewportContentSize, "Viewport's content width was measured incorrectly");

                        // Verify that containers have their sizes set
                        LiveUnit.Assert.areEqual(10, container.offsetHeight, "Layout set container height incorrectly");
                    } else {
                        // in horizontal
                        LiveUnit.Assert.areEqual(110, layout._sizes.containerWidth, "Rendered item width was measured incorrectly");
                        LiveUnit.Assert.areEqual(20, layout._sizes.layoutOriginY, "Space above first item was measured incorrectly");
                        LiveUnit.Assert.areEqual(WinJS.Utilities.isPhone ? 0 : 70, layout._sizes.layoutOriginX, "Space to the left of the first item was measured incorrectly");
                        LiveUnit.Assert.areEqual(37, layout._sizes.viewportContentSize, "Viewport's content height was measured incorrectly");

                        // Verify that containers have their sizes set
                        LiveUnit.Assert.areEqual(100, container.offsetWidth, "Layout set container width incorrectly");
                    }

                    // Verify that containers have their sizes cleared
                    layout.uninitialize();
                    LiveUnit.Assert.areEqual(0, container.offsetHeight, "During clean up, layout cleared container height incorrectly");

                    listView._cleanUp();
                });
            }

            test(false).then(function () {
                return test(true);
            }).then(complete);
        };
    });

    export class UniformGridLayoutTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "UniformGridLayoutListView";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }

        // Verify that the layout cancels its layout promise when layout is called
        // while the ListView is invisible.
        testLayoutWhileInvisible = function (complete) {
            function test(groupsEnabled) {
                var layout = new GridLayout();
                var count = 10;
                var itemsCount;
                if (groupsEnabled) {
                    itemsCount = [6, 4];
                } else {
                    itemsCount = count;
                }
                var listView = new SimpleListView(document.getElementById("UniformGridLayoutListView"), {
                    layout: layout,
                    groupsEnabled: groupsEnabled,
                    itemsCount: itemsCount
                });

                listView.element.style.display = "none";
                layout.initialize(listView._getLayoutSite(), groupsEnabled);
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    LiveUnit.Assert.fail("Layout promise should not complete successfully");
                }, function (error) {
                        LiveUnit.Assert.areEqual("Canceled", error.name, "Layout should have canceled its layout promise");
                    });
            }

            test(false).then(function () {
                return test(true);
            }).then(complete);
        };

        // Verify that first/LastItemFromRange properly map pixel ranges to item ranges
        testItemFromRange = function (complete) {
            // For the following two functions, input should be an object which
            // contains the parameters to first/_lastItemFromRange:
            // - first/lastPixel
            // - wholeItem
            // expectedOutput.index should be the index that first/_lastItemFromRange is expected to return
            function verifyFirstItemFromRange(input, expectedOutput) {
                var index = layout._firstItemFromRange(input.firstPixel, { wholeItem: input.wholeItem });
                LiveUnit.Assert.areEqual(expectedOutput.index, index,
                    "_firstItemFromRange's returned index should be " + expectedOutput.index);
            }
            function verifyLastItemFromRange(input, expectedOutput) {
                var index = layout._lastItemFromRange(input.lastPixel, { wholeItem: input.wholeItem });
                LiveUnit.Assert.areEqual(expectedOutput.index, index,
                    "_lastItemFromRange's returned index should be " + expectedOutput.index);
            }

            var layout = new GridLayout(),
                count = 15,
                viewportSize = { width: 300, height: 350 },
                sizes = {
                    viewportContentSize: viewportSize.height,
                    surfaceContentSize: viewportSize.height,
                    layoutOriginX: 0,
                    layoutOriginY: 0,

                    itemsContainerOuterX: 0,
                    itemsContainerOuterY: 0,
                    maxItemsContainerContentHeight: viewportSize.height,

                    containerWidth: 100,
                    containerHeight: 110,
                    containerSizeLoaded: true,
                    containerMargins: { left: 5, right: 15 },
                    itemsContainerOuterHeight: 0,
                    itemsContainerOuterWidth: 0,
                },
                listView = new SimpleListView(document.getElementById("UniformGridLayoutListView"), {
                    layout: layout,
                    itemsCount: count,
                    viewportSize: viewportSize,
                });

            layout.initialize(listView._getLayoutSite(), false);
            layout._measuringPromise = WinJS.Promise.wrap();
            layout._envInfo = {};
            attachGenericSizesToLayout(layout, sizes);
            layout._itemsPerBar = Math.floor(viewportSize.height / 110);
            layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {

                // Verify _firstItemFromRange for partial items
                verifyFirstItemFromRange({ firstPixel: 0, wholeItem: false }, { index: 0 });
                verifyFirstItemFromRange({ firstPixel: 1, wholeItem: false }, { index: 0 });
                verifyFirstItemFromRange({ firstPixel: 84, wholeItem: false }, { index: 0 });
                verifyFirstItemFromRange({ firstPixel: 85, wholeItem: false }, { index: 3 });
                verifyFirstItemFromRange({ firstPixel: 184, wholeItem: false }, { index: 3 });
                verifyFirstItemFromRange({ firstPixel: 185, wholeItem: false }, { index: 6 });

                // _firstItemFromRange, whole items
                verifyFirstItemFromRange({ firstPixel: 0, wholeItem: true }, { index: 0 });
                verifyFirstItemFromRange({ firstPixel: 1, wholeItem: true }, { index: 3 });
                verifyFirstItemFromRange({ firstPixel: 99, wholeItem: true }, { index: 3 });
                verifyFirstItemFromRange({ firstPixel: 100, wholeItem: true }, { index: 3 });
                verifyFirstItemFromRange({ firstPixel: 101, wholeItem: true }, { index: 6 });

                // _lastItemFromRange, partial items
                var last = viewportSize.width - 1; // last pixel on page 1
                verifyLastItemFromRange({ lastPixel: last, wholeItem: false }, { index: 8 });
                verifyLastItemFromRange({ lastPixel: last + 5, wholeItem: false }, { index: 8 });
                verifyLastItemFromRange({ lastPixel: last + 6, wholeItem: false }, { index: 11 });
                verifyLastItemFromRange({ lastPixel: last + 105, wholeItem: false }, { index: 11 });
                verifyLastItemFromRange({ lastPixel: last + 106, wholeItem: false }, { index: 14 });

                // _lastItemFromRange, whole items
                verifyLastItemFromRange({ lastPixel: last, wholeItem: true }, { index: 8 });
                verifyLastItemFromRange({ lastPixel: last + 99, wholeItem: true }, { index: 8 });
                verifyLastItemFromRange({ lastPixel: last + 100, wholeItem: true }, { index: 11 });

                // Verify empty range is returned when pixel range contains no items
                var itemRange = layout.itemsFromRange(10000, 10100);
                LiveUnit.Assert.areEqual(0, itemRange.firstIndex, "itemsFromRange returned wrong firstIndex");
                LiveUnit.Assert.areEqual(-1, itemRange.lastIndex, "itemsFromRange returned wrong lastIndex");

                complete();
            });
        };

        // Verify that, given a key press, getAdjacent correctly calculates the
        // location that focus should move to for both LTR and RTL.
        testGetAdjacent = function (complete) {
            function test(rtl) {
                function verifyGetAdjacent(currentIndex, pressedKey, expectedIndex) {
                    var newItem = layout.getAdjacent({ type: "item", index: currentIndex }, pressedKey);
                    LiveUnit.Assert.areEqual("item", newItem.type, "getAdjacent's returned type should be item");
                    LiveUnit.Assert.areEqual(expectedIndex, clampToRange(0, count - 1, newItem.index),
                        "getAdjacent's returned index should be " + expectedIndex);
                }

                var layout = new GridLayout(),
                    count = 30,
                    viewportSize = { width: 60, height: 30 },
                    sizes = {
                        viewportContentSize: viewportSize.height,
                        surfaceContentSize: viewportSize.height,

                        layoutOriginX: 0,
                        layoutOriginY: 0,

                        itemsContainerOuterX: 0,
                        itemsContainerOuterY: 0,
                        maxItemsContainerContentHeight: viewportSize.height,

                        containerWidth: 20,
                        containerHeight: 10,
                        containerSizeLoaded: true,
                        containerMargins: { left: 4, right: 8 },
                        itemsContainerOuterHeight: 0,
                        itemsContainerOuterWidth: 0,

                    },
                    listView = new SimpleListView(document.getElementById("UniformGridLayoutListView"), {
                        layout: layout,
                        itemsCount: count,
                        viewportSize: viewportSize,
                        rtl: rtl
                    });

                layout.initialize(listView._getLayoutSite(), false);
                layout._measuringPromise = WinJS.Promise.wrap();
                layout._envInfo = {};
                attachGenericSizesToLayout(layout, sizes);
                layout._itemsPerBar = Math.floor(viewportSize.height / 10);
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    var prevColumn = rtl ? Key.rightArrow : Key.leftArrow,
                        nextColumn = rtl ? Key.leftArrow : Key.rightArrow;

                    // Arrow keys

                    verifyGetAdjacent(0, Key.upArrow, 0);
                    verifyGetAdjacent(0, Key.downArrow, 1);
                    verifyGetAdjacent(0, prevColumn, 0);
                    verifyGetAdjacent(0, nextColumn, 3);

                    verifyGetAdjacent(1, Key.upArrow, 0);
                    verifyGetAdjacent(1, Key.downArrow, 2);
                    verifyGetAdjacent(1, prevColumn, 1);
                    verifyGetAdjacent(1, nextColumn, 4);

                    verifyGetAdjacent(2, Key.upArrow, 1);
                    verifyGetAdjacent(2, Key.downArrow, 2);
                    verifyGetAdjacent(2, prevColumn, 2);
                    verifyGetAdjacent(2, nextColumn, 5);

                    verifyGetAdjacent(3, Key.upArrow, 3);
                    verifyGetAdjacent(3, Key.downArrow, 4);
                    verifyGetAdjacent(3, prevColumn, 0);
                    verifyGetAdjacent(3, nextColumn, 6);

                    // pageDown

                    verifyGetAdjacent(1, Key.pageDown, 8);
                    verifyGetAdjacent(8, Key.pageDown, 11);

                    // Verify boundary at end of list (last index in list is 29)
                    listView.scrollPosition = 180;
                    verifyGetAdjacent(28, Key.pageDown, 29);

                    // pageUp

                    listView.scrollPosition = 0;
                    verifyGetAdjacent(7, Key.pageUp, 0);
                    verifyGetAdjacent(0, Key.pageUp, 0);

                    listView.scrollPosition = 60;
                    verifyGetAdjacent(14, Key.pageUp, 9);
                    verifyGetAdjacent(9, Key.pageUp, 6);
                });
            }
            test(false).then(function () {
                return test(true);
            }).then(complete);
        };
    };

    // Verify that uniform GridLayout's initialize function:
    // - Returns "horizontal" for its scroll direction
    // - Adds the gridlayout CSS class to the surface
    [null, WinJS.UI.Orientation.horizontal, WinJS.UI.Orientation.vertical].forEach(function (orientation) {
        UniformGridLayoutTests.prototype["testInitialize_" + orientation] = function () {
            [true, false].forEach(function (groupsEnabled) {
                var layoutOptions = orientation ? { orientation: orientation } : {},
                    layout = new GridLayout(layoutOptions),
                    viewport = document.createElement("div"),
                    surface = document.createElement("div");

                layout.initialize({
                    viewport: viewport,
                    surface: surface,
                    _writeProfilerMark: function () { }
                }, groupsEnabled);
                LiveUnit.Assert.areEqual(orientation || "horizontal", layout.orientation,
                    "Uniform GridLayout's initialize should return 'horizontal");
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(surface, WinJS.UI._gridLayoutClass),
                    "surface should have gridlayout CSS class");
            });
        };
    });

    // Verify that after the layout function:
    // - The items container has the uniformgridlayout CSS class
    // - Rendered items have been properly measured
    // - Containers have their sizes properly set (via a dynamically generated CSS rule)
    // - After clean up, containers have their sizes cleared (i.e. height=0)
    [null, WinJS.UI.Orientation.horizontal, WinJS.UI.Orientation.vertical].forEach(function (orientation) {
        UniformGridLayoutTests.prototype["testLayout_" + orientation] = function (complete) {
            function test(groupsEnabled) {
                var layoutOptions = orientation ? { orientation: orientation } : {},
                    layout = new GridLayout(layoutOptions),
                    count = 10,
                    itemsCount = (groupsEnabled ? [6, 4] : <any>count),
                    listView = new SimpleListView(document.getElementById("UniformGridLayoutListView"), {
                        layout: layout,
                        groupsEnabled: groupsEnabled,
                        itemsCount: itemsCount,
                        viewportSize: { width: 300, height: 350 },
                    });

                layout.initialize(listView._getLayoutSite(), groupsEnabled);
                return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                    var surface = listView._surface,
                        itemsContainer = listView._tree[0].itemsContainer.element,
                        container = listView._containerAtIndex(0),
                        sizes = layout._sizes;

                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemsContainer, WinJS.UI._uniformGridLayoutClass),
                        "items container should have uniformgridlayout CSS class");

                    // Verify measurements
                    if (!orientation || orientation === WinJS.UI.Orientation.horizontal) {
                        LiveUnit.Assert.areEqual(320, sizes.surfaceContentSize, "Surface's height was measured incorrectly");
                        LiveUnit.Assert.areEqual(sizes.surfaceContentSize, surface.offsetHeight, "Surface's height was set incorrectly");
                    } else {
                        LiveUnit.Assert.areEqual(260, sizes.surfaceContentSize, "Surface's width was measured incorrectly");
                        LiveUnit.Assert.areEqual(sizes.surfaceContentSize, surface.offsetWidth, "Surface's width was set incorrectly");
                    }

                    if (groupsEnabled) {
                        var headerContainer = listView._tree[0].header;
                        LiveUnit.Assert.areEqual(42, sizes.headerContainerHeight, "Header container's height was measured incorrectly");
                        LiveUnit.Assert.areEqual(38, sizes.headerContainerWidth, "Header container's width was measured incorrectly");

                        if (!orientation || orientation === WinJS.UI.Orientation.horizontal) {
                            LiveUnit.Assert.areEqual(2 * WinJS.Utilities.getTotalWidth(itemsContainer),
                                WinJS.Utilities.getContentWidth(surface), "Surface's width should be sized to content");

                            LiveUnit.Assert.areEqual(278, sizes.maxItemsContainerContentSize, "Items container's height was measured incorrectly");

                            LiveUnit.Assert.areEqual(240, itemsContainer.offsetHeight, "Items container's height was set incorrectly");
                            LiveUnit.Assert.areEqual(6, layout._itemsPerBar, "Incorrect items per column");
                        } else {
                            LiveUnit.Assert.areEqual(2 * (WinJS.Utilities.getTotalHeight(itemsContainer) + sizes.headerContainerHeight),
                                WinJS.Utilities.getContentHeight(surface), "Surface's height should be sized to content, including group headers");

                            LiveUnit.Assert.areEqual(260, sizes.maxItemsContainerContentSize, "Items container's width was measured incorrectly");

                            LiveUnit.Assert.areEqual(198, itemsContainer.offsetWidth, "Items container's width was set incorrectly");
                            LiveUnit.Assert.areEqual(3, layout._itemsPerBar, "Incorrect items per column");
                        }
                    } else {
                        if (!orientation || orientation === WinJS.UI.Orientation.horizontal) {
                            LiveUnit.Assert.areEqual(WinJS.Utilities.getTotalWidth(itemsContainer),
                                WinJS.Utilities.getContentWidth(surface), "Surface's width should be sized to content");

                            LiveUnit.Assert.areEqual(320, sizes.maxItemsContainerContentSize, "Items container's height was measured incorrectly");

                            LiveUnit.Assert.areEqual(320, itemsContainer.offsetHeight, "Items container's height was set incorrectly");
                            LiveUnit.Assert.areEqual(8, layout._itemsPerBar, "Incorrect items per column");
                        } else {
                            LiveUnit.Assert.areEqual(WinJS.Utilities.getTotalHeight(itemsContainer),
                                WinJS.Utilities.getContentHeight(surface), "Surface's height should be sized to content");

                            LiveUnit.Assert.areEqual(260, sizes.maxItemsContainerContentSize, "Items container's height was measured incorrectly");

                            LiveUnit.Assert.areEqual(198, itemsContainer.offsetWidth, "Items container's width was set incorrectly");
                            LiveUnit.Assert.areEqual(3, layout._itemsPerBar, "Incorrect items per row");
                        }
                    }

                    LiveUnit.Assert.areEqual(15, sizes.layoutOriginX, "Layout's origin x was measured incorrectly");
                    LiveUnit.Assert.areEqual(20, sizes.layoutOriginY, "Layout's origin y was measured incorrectly");

                    LiveUnit.Assert.areEqual(66, sizes.containerWidth, "Rendered item height was measured incorrectly");
                    LiveUnit.Assert.areEqual(40, sizes.containerHeight, "Rendered item width was measured incorrectly");
                    objectsAreEqual({
                        top: 10,
                        right: 3,
                        bottom: 7,
                        left: 8
                    }, sizes.containerMargins, "Rendered item margins were measured incorrectly");

                    LiveUnit.Assert.areEqual(6, sizes.itemsContainerOuterStart, "itemsContainerOuterStart was measured incorrectly");
                    LiveUnit.Assert.areEqual(0, sizes.itemsContainerOuterCrossStart, "itemsContainerOuterCrossStart was measured incorrectly");

                    // Verify that containers have their sizes set
                    LiveUnit.Assert.areEqual(55, container.offsetWidth, "Layout set container width incorrectly");
                    LiveUnit.Assert.areEqual(23, container.offsetHeight, "Layout set container height incorrectly");

                    // Verify that containers have their sizes cleared
                    layout.uninitialize();
                    LiveUnit.Assert.areEqual(0, container.offsetHeight, "During clean up, layout cleared container height incorrectly");

                    listView._cleanUp();
                });
            }

            test(false).then(function () {
                return test(true);
            }).then(complete);
        };
    });


    export module CellSpanning {
        var itemSizesSimple = {
            b: { width: 400, height: 600 },
            m: { width: 200, height: 200 },
            s: { width: 300, height: 100 }
        };
        var itemSizesWithMargins = {
            b: { width: 550, height: 700 },
            m: { width: 250, height: 250 },
            s: { width: 400, height: 100 }
        };

        function groupInfo(index) {
            LiveUnit.Assert.isTrue(index !== null, "groupInfo received a null item");
            return {
                enableCellSpanning: true,
                cellWidth: 100,
                cellHeight: 100
            };
        }

        function itemInfoForPattern(pattern, sizes) {
            pattern = pattern.replace(/ /g, "");

            function itemInfo(index) {
                if (+index === index) {
                    return sizes[pattern[index]];
                } else {
                    return { width: 100, height: 100 };
                }
            }

            return itemInfo;
        }

        // Check that the tile at the given index isn't laid out
        function checkCleanTile(listView, index) {
            var container = listView._containerAtIndex(index);

            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(container, WinJS.UI._laidOutClass),
                "Item should not be laid out");

            LiveUnit.Assert.areEqual("", container.style.cssText, "Item should not be laid out");

            LiveUnit.Assert.areEqual("none", getComputedStyle(container).display, "Item should not be visible");
        }

        // Verify that after the layout function:
        // - The items container has the cellspanninggridlayout CSS class
        // - After clean up, containers have their CSS classes and inline CSS styles cleared
        function testLayout(options, callback1, callback2?) {
            // Options
            var pattern = options.pattern,
                itemSizes = options.itemSizes,
                count = options.count,
                // The following are optional,
                viewportSize = options.viewportSize,
                realizedRange = options.realizedRange,
                rtl = options.rtl,
                listViewClass = options.listViewClass,
                itemInfo = options.itemInfo || itemInfoForPattern(pattern, itemSizes);

            var layoutCallback = (callback2 ? callback2 : callback1),   // Always the last argument
                realizedCallback = (callback2 ? callback1 : function () { }),
                layoutResult,
                layout = new WinJS.UI.CellSpanningLayout({
                    groupInfo: groupInfo,
                    itemInfo: itemInfo
                }),
                listView = new SimpleListView(document.getElementById("CellSpanningGridLayoutListView"), {
                    layout: layout,
                    itemsCount: count,
                    viewportSize: viewportSize,
                    realizedRange: realizedRange,
                    rtl: rtl
                });

            if (listViewClass) {
                WinJS.Utilities.addClass(listView.element, listViewClass);
            }

            layout.initialize(listView._getLayoutSite(), false);
            layoutResult = layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []);
            layoutResult.realizedRangeComplete.then(function () {
                realizedCallback(listView, layout);
            });
            return layoutResult.layoutComplete.then(function () {
                layoutCallback(listView, layout);

                var itemsContainer = listView._tree[0].itemsContainer.element,
                    index,
                    container;

                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemsContainer, WinJS.UI._cellSpanningGridLayoutClass),
                    "items container should have cellspanninggridlayout CSS class");

                layout.uninitialize();
                listView._cleanUp();
            });
        }

        function isInvalidItemInfoError(error) {
            if (Array.isArray(error)) {
                error.forEach(function (e) {
                    e && isInvalidItemInfoError(e);
                });
            } else {
                LiveUnit.Assert.areEqual("WinJS.UI.GridLayout.ItemInfoIsInvalid", error.name,
                    "Exception should have been thrown due to invalid itemInfo function");
            }
        }


        export class CellSpanningGridLayoutTests {

            setUp() {
                LiveUnit.LoggingCore.logComment("In setup");

                testRootEl = document.createElement("div");
                testRootEl.className = "file-listview-css";

                var newNode = document.createElement("div");
                newNode.id = "CellSpanningGridLayoutListView";
                testRootEl.appendChild(newNode);
                document.body.appendChild(testRootEl);
            }

            tearDown() {
                LiveUnit.LoggingCore.logComment("In tearDown");
                WinJS.Utilities.disposeSubTree(testRootEl);
                document.body.removeChild(testRootEl);
            }

            // Verify that uniform GridLayout's initialize function:
            // - Returns "horizontal" for its scroll direction
            // - Adds the gridlayout CSS class to the surface
            testInitialize = function () {
                [true, false].forEach(function (groupsEnabled) {
                    var viewport = document.createElement("div"),
                        surface = document.createElement("div"),
                        itemSizes = itemSizesSimple,
                        layout = new CellSpanningLayout({
                            groupInfo: groupInfo,
                            itemInfo: itemInfoForPattern("b mmm ssssss", itemSizes)
                        });

                    layout.initialize({
                        viewport: viewport,
                        surface: surface,
                        _writeProfilerMark: function () { }
                    }, groupsEnabled);
                    LiveUnit.Assert.areEqual("horizontal", layout.orientation,
                        "Uniform GridLayout's initialize should return 'horizontal");
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(surface, WinJS.UI._gridLayoutClass),
                        "surface should have gridlayout CSS class");
                });
            };

            testAdjustedKeyForOrientationAndBarsWithCellspanningGridLayout = function (complete) {
                var itemSizes = itemSizesSimple,
                    layout = new WinJS.UI.GridLayout({
                        groupInfo: groupInfo,
                        itemInfo: itemInfoForPattern("b mmm ssssss", itemSizes),
                        maxRows: 2
                    });

                var data = [];
                for (var i = 0; i < 5; i++) {
                    data.push({ data: i + "" });
                }
                var list = new WinJS.Binding.List(data);

                var lv = new WinJS.UI.ListView();
                lv.layout = layout;
                lv.itemDataSource = list.dataSource;
                testRootEl.appendChild(lv.element);

                Helper.ListView.waitForReady(lv, -1)().done(function () {
                    var entity = lv.layout.getAdjacent({ type: WinJS.UI.ObjectType.item, index: 0 }, Key.downArrow);
                    LiveUnit.Assert.areEqual(0, entity.index);
                    testRootEl.removeChild(lv.element);
                    complete();
                });
            };

            // Verify that after the layout function:
            // - Containers appear in the correct locations
            // - Containers are the appropriate size
            testLayoutTest = function (complete) {
                var opts = {
                    pattern: "b mmm ssssss",
                    itemSizes: itemSizesSimple,
                    count: 10,
                    viewportSize: { height: 680, width: 1000 }
                };

                testLayout(opts, function (listView, layout) {
                    checkTile(listView, opts.itemSizes, 0, 0, 0, "b");
                    checkTile(listView, opts.itemSizes, 1, 400, 0, "m");
                    checkTile(listView, opts.itemSizes, 2, 400, 200, "m");
                    checkTile(listView, opts.itemSizes, 3, 400, 400, "m");
                    checkTile(listView, opts.itemSizes, 4, 600, 0, "s");
                    checkTile(listView, opts.itemSizes, 5, 600, 100, "s");
                }).then(complete);
            };

            // Same test as testLayout except the containers now have margins
            testLayoutWithMargins = function (complete) {
                var opts = {
                    listViewClass: "cellSpanningMargins",
                    pattern: "b mmm ssssss",
                    itemSizes: itemSizesWithMargins,
                    count: 10,
                    viewportSize: { height: 1000, width: 1000 }
                };

                testLayout(opts, function (listView, layout) {
                    checkTile(listView, opts.itemSizes, 0, 40, 5, "b");
                    checkTile(listView, opts.itemSizes, 1, 640, 5, "m");
                    checkTile(listView, opts.itemSizes, 2, 640, 305, "m");
                    checkTile(listView, opts.itemSizes, 3, 640, 605, "m");
                    checkTile(listView, opts.itemSizes, 4, 940, 5, "s");
                    checkTile(listView, opts.itemSizes, 5, 940, 155, "s");
                }).then(complete);
            };

            // Verify that after realizedRangeComplete, only the realized range is laid out.
            // Verify that after layoutComplete, all items are laid out.
            testLayoutParts = function (complete) {
                function verifyRealizedRange(listView) {
                    checkTile(listView, opts.itemSizes, realizedItems.first, 900, 0, "b");
                    checkTile(listView, opts.itemSizes, 11, 1300, 0, "m");
                    checkTile(listView, opts.itemSizes, 12, 1300, 200, "m");
                    checkTile(listView, opts.itemSizes, 13, 1300, 400, "m");
                    checkTile(listView, opts.itemSizes, 14, 1500, 0, "s");
                    checkTile(listView, opts.itemSizes, 19, 1500, 500, "s");
                    checkTile(listView, opts.itemSizes, 20, 1800, 0, "b");
                    checkTile(listView, opts.itemSizes, realizedItems.last, 2200, 400, "m");
                }

                var opts = {
                    pattern: strRepeat("b mmm ssssss", 50),
                    itemSizes: itemSizesSimple,
                    count: 50,
                    viewportSize: { height: 680, width: 1000 },
                    realizedRange: { firstPixel: 1000, lastPixel: 2300 }
                };
                var realizedItems = { first: 10, last: 23 };

                testLayout(opts, function (listView, layout) {
                    // realizedRangeComplete: Verify that just the realized range is laid out
                    var i;

                    // Before realized range
                    for (i = 0; i < realizedItems.first; i++) {
                        checkCleanTile(listView, i);
                    }

                    // Realized items
                    verifyRealizedRange(listView);

                    // After realized range
                    for (i = realizedItems.last + 1; i < opts.count; i++) {
                        checkCleanTile(listView, i);
                    }
                }, function (listView, layout) {
                        // layoutComplete: Verify that all items are laid out

                        // Before realized range
                        checkTile(listView, opts.itemSizes, 0, 0, 0, "b");
                        checkTile(listView, opts.itemSizes, 1, 400, 0, "m");
                        checkTile(listView, opts.itemSizes, 2, 400, 200, "m");
                        checkTile(listView, opts.itemSizes, 3, 400, 400, "m");
                        checkTile(listView, opts.itemSizes, 4, 600, 0, "s");
                        checkTile(listView, opts.itemSizes, 5, 600, 100, "s");

                        // Realized items
                        verifyRealizedRange(listView);

                        // After realized range
                        checkTile(listView, opts.itemSizes, 24, 2400, 0, "s");
                        checkTile(listView, opts.itemSizes, 29, 2400, 500, "s");
                        checkTile(listView, opts.itemSizes, 30, 2700, 0, "b");
                        checkTile(listView, opts.itemSizes, 31, 3100, 0, "m");
                        checkTile(listView, opts.itemSizes, 32, 3100, 200, "m");
                        checkTile(listView, opts.itemSizes, 33, 3100, 400, "m");
                    }).then(complete);
            };

            // Verify that the layout cancels its layout promise when layout is called
            // while the ListView is invisible.
            testLayoutWhileInvisible = function (complete) {
                function test(groupsEnabled) {
                    var count = 10,
                        itemsCount = (groupsEnabled ? [6, 4] : <any>count),
                        layout = new CellSpanningLayout({
                            groupInfo: groupInfo,
                            itemInfo: itemInfoForPattern("b mmm ssssss", itemSizesSimple)
                        }),
                        listView = new SimpleListView(document.getElementById("CellSpanningGridLayoutListView"), {
                            layout: layout,
                            groupsEnabled: groupsEnabled,
                            itemsCount: itemsCount
                        });

                    listView.element.style.display = "none";
                    layout.initialize(listView._getLayoutSite(), groupsEnabled);
                    return layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []).layoutComplete.then(function () {
                        LiveUnit.Assert.fail("Layout promise should not complete successfully");
                    }, function (error) {
                            LiveUnit.Assert.areEqual("Canceled", error.name, "Layout should have canceled its layout promise");
                        });
                }

                test(false).then(function () {
                    return test(true);
                }).then(complete);
            };

            // Verify that, given a key press, getAdjacent correctly calculates the
            // location that focus should move to for both LTR and RTL.
            testGetAdjacent = function (complete) {
                function test(rtl) {
                    var opts = {
                        pattern: strRepeat("b mmm ssssss", 5),
                        itemSizes: itemSizesSimple,
                        rtl: rtl,
                        count: 50,
                        viewportSize: { height: 680, width: 1000 }
                    };

                    return testLayout(opts, function (listView, layout) {
                        function verifyGetAdjacent(currentIndex, pressedKey, expectedIndex) {
                            var newItem = layout.getAdjacent({ type: "item", index: currentIndex }, pressedKey);
                            LiveUnit.Assert.areEqual("item", newItem.type, "getAdjacent's returned type should be item");
                            LiveUnit.Assert.areEqual(expectedIndex, clampToRange(0, opts.count - 1, newItem.index),
                                "getAdjacent's returned index should be " + expectedIndex);
                        }

                        // Illustration of how the items in listView are split into columns:
                        // 0  1  4
                        //       5
                        //    2  6
                        //       7
                        //    3  8
                        //       9

                        var prevColumn = rtl ? Key.rightArrow : Key.leftArrow,
                            nextColumn = rtl ? Key.leftArrow : Key.rightArrow;

                        // First column, down arrow
                        verifyGetAdjacent(0, Key.downArrow, 0);

                        // Second column, down arrow
                        verifyGetAdjacent(1, Key.downArrow, 2);
                        verifyGetAdjacent(2, Key.downArrow, 3);
                        verifyGetAdjacent(3, Key.downArrow, 3);

                        // Third column, down arrow
                        verifyGetAdjacent(4, Key.downArrow, 5);
                        verifyGetAdjacent(5, Key.downArrow, 6);
                        verifyGetAdjacent(6, Key.downArrow, 7);
                        verifyGetAdjacent(7, Key.downArrow, 8);
                        verifyGetAdjacent(8, Key.downArrow, 9);
                        verifyGetAdjacent(9, Key.downArrow, 9);

                        // First column, up arrow
                        verifyGetAdjacent(0, Key.upArrow, 0);

                        // Second column, up arrow
                        verifyGetAdjacent(3, Key.upArrow, 2);
                        verifyGetAdjacent(2, Key.upArrow, 1);
                        verifyGetAdjacent(1, Key.upArrow, 1);

                        // Third column, up arrow
                        verifyGetAdjacent(9, Key.upArrow, 8);
                        verifyGetAdjacent(8, Key.upArrow, 7);
                        verifyGetAdjacent(7, Key.upArrow, 6);
                        verifyGetAdjacent(6, Key.upArrow, 5);
                        verifyGetAdjacent(5, Key.upArrow, 4);
                        verifyGetAdjacent(4, Key.upArrow, 4);

                        // Sequence of left and right arrowing
                        verifyGetAdjacent(0, nextColumn, 1);
                        verifyGetAdjacent(1, nextColumn, 4);
                        verifyGetAdjacent(4, nextColumn, 10);
                        verifyGetAdjacent(10, prevColumn, 4);
                        verifyGetAdjacent(4, Key.downArrow, 5);
                        verifyGetAdjacent(5, Key.downArrow, 6);
                        verifyGetAdjacent(6, prevColumn, 2);
                        verifyGetAdjacent(2, Key.downArrow, 3);
                        verifyGetAdjacent(3, nextColumn, 8);
                        verifyGetAdjacent(8, prevColumn, 3);

                        // pageDown

                        verifyGetAdjacent(0, Key.pageDown, 10);
                        verifyGetAdjacent(10, Key.pageDown, 20);

                        listView.scrollPosition = 800;
                        verifyGetAdjacent(11, Key.pageDown, 19);
                        verifyGetAdjacent(19, Key.pageDown, 29);

                        // pageUp

                        listView.scrollPosition = 0;
                        verifyGetAdjacent(5, Key.pageUp, 0);
                        verifyGetAdjacent(0, Key.pageUp, 0);

                        listView.scrollPosition = 1500;
                        verifyGetAdjacent(22, Key.pageUp, 14);
                        verifyGetAdjacent(14, Key.pageUp, 4);
                    });
                }

                test(false).then(function () {
                    return test(true);
                }).then(complete);
            };

            // Verify that layout and arrowing work correctly when there are gaps in the
            // grid (some cells are empty).
            testGapHandling = function (complete) {
                var opts = {
                    pattern: "msm b ssssss",
                    itemSizes: itemSizesSimple,
                    count: 10,
                    viewportSize: { height: 680, width: 1000 }
                };

                return testLayout(opts, function (listView, layout) {
                    function verifyGetAdjacent(currentIndex, pressedKey, expectedIndex) {
                        var newItem = layout.getAdjacent({ type: "item", index: currentIndex }, pressedKey);
                        LiveUnit.Assert.areEqual("item", newItem.type, "getAdjacent's returned type should be item");
                        LiveUnit.Assert.areEqual(expectedIndex, clampToRange(0, opts.count - 1, newItem.index),
                            "getAdjacent's returned index should be " + expectedIndex);
                    }

                    checkTile(listView, opts.itemSizes, 0, 0, 0, "m");
                    checkTile(listView, opts.itemSizes, 1, 0, 200, "s");
                    checkTile(listView, opts.itemSizes, 2, 0, 300, "m");
                    checkTile(listView, opts.itemSizes, 3, 300, 0, "b");
                    checkTile(listView, opts.itemSizes, 4, 700, 0, "s");
                    checkTile(listView, opts.itemSizes, 5, 700, 100, "s");
                    checkTile(listView, opts.itemSizes, 6, 700, 200, "s");
                    checkTile(listView, opts.itemSizes, 7, 700, 300, "s");

                    verifyGetAdjacent(0, Key.rightArrow, 3);
                    verifyGetAdjacent(3, Key.rightArrow, 4);
                    verifyGetAdjacent(4, Key.downArrow, 5);
                    verifyGetAdjacent(5, Key.downArrow, 6);
                    verifyGetAdjacent(6, Key.leftArrow, 3);
                    verifyGetAdjacent(3, Key.leftArrow, 1);
                }).then(complete);
            };

            testHitTest = function (complete) {
                var opts = {
                    listViewClass: "cellSpanningMargins",
                    pattern: "b mmm ssssss",
                    itemSizes: itemSizesWithMargins,
                    count: 10,
                    viewportSize: { height: 1000, width: 1000 }
                };

                testLayout(opts, function (listView, layout) {
                    // Given coords, verify that hitTest returns expectedIndex
                    function verifyHitTest(coords, expectedIndex) {
                        var result = layout.hitTest(coords.x, coords.y);
                        LiveUnit.Assert.areEqual("item", result.type, "hitTest should have returned type 'item'");
                        LiveUnit.Assert.areEqual(expectedIndex, result.index, "hitTest returned wrong index");
                    }

                    // Out of range (too small)
                    verifyHitTest({ x: 0, y: -10 }, 0);
                    verifyHitTest({ x: -10, y: 0 }, 0);
                    verifyHitTest({ x: -10, y: -10 }, 0);

                    // Item 0 boundaries
                    verifyHitTest({ x: 0, y: 0 }, 0);
                    verifyHitTest({ x: 599, y: 1000000 }, 0); // y is out of range
                    verifyHitTest({ x: 599, y: 749 }, 0);

                    // Item 3 boundaries
                    verifyHitTest({ x: 600, y: 749 }, 3);
                    verifyHitTest({ x: 600, y: 599 }, 2);
                    verifyHitTest({ x: 600, y: 600 }, 3);
                    verifyHitTest({ x: 600, y: 1000000 }, 3); // y is out of range
                    verifyHitTest({ x: 899, y: 600 }, 3);
                    verifyHitTest({ x: 900, y: 600 }, 8);
                    verifyHitTest({ x: 899, y: 750 }, 3);
                    verifyHitTest({ x: 900, y: 750 }, 9);

                    verifyHitTest({ x: 900, y: 299 }, 5);
                    verifyHitTest({ x: 900, y: 300 }, 6);
                    verifyHitTest({ x: 900, y: 449 }, 6);
                    verifyHitTest({ x: 900, y: 450 }, 7);

                    // Out of range (too large)
                    verifyHitTest({ x: 900, y: 1000000 }, 9);
                    verifyHitTest({ x: 1000000, y: 500 }, 9);
                    verifyHitTest({ x: 1000000, y: 1000000 }, 9);
                }).then(complete);
            };

            testRemoveLastGroup = function (complete) {
                var data = [];
                for (var i = 0; i < 20; i++) {
                    data.push({ index: i, title: "Item " + i });
                }
                var list = new WinJS.Binding.List(data).createGrouped(groupKey, groupData);
                var itemDataSource = list.dataSource;
                var groupDataSource = list.groups.dataSource;

                function groupKey(item) {
                    var a = "A".charCodeAt(0);
                    return String.fromCharCode(a + item.index / 10);
                }

                function groupData(item) {
                    return { key: groupKey(item) };
                }

                function itemInfo(index) {
                    if (+index === index) {
                        return {
                            width: 50,
                            height: 50
                        };
                    } else {
                        return {
                            width: 100,
                            height: 100
                        };
                    }
                }

                var failed = false;
                function groupInfo(group) {
                    if (!group) {
                        LiveUnit.Assert.fail("groupInfo called with null parameter");
                        failed = true;
                    }
                    if (group.index % 2 === 1) {
                        return {
                            enableCellSpanning: true,
                            cellWidth: 50,
                            cellHeight: 50
                        };
                    } else {
                        return {
                            enableCellSpanning: false
                        };
                    }
                }

                var listView = new WinJS.UI.ListView(undefined, {
                    groupDataSource: groupDataSource,
                    itemDataSource: itemDataSource,
                    layout: {
                        type: WinJS.UI.CellSpanningLayout,
                        groupInfo: groupInfo,
                        itemInfo: itemInfo
                    }
                });
                document.querySelector("#CellSpanningGridLayoutListView").appendChild(listView.element);
                Helper.ListView.waitForReady(listView)().
                    then(function () {
                        while (list.length > 10) {
                            list.pop();
                        }
                        return Helper.ListView.waitForReady(listView, 10)();
                    }).
                    then(function () {
                        if (failed) {
                            LiveUnit.Assert.fail("test failed: groupInfo was null");
                        }
                    }).
                    done(complete);
            };

            // Verifies that a friendly exception is thrown when the groupInfo function returns
            // an object with enableCellSpanning === true but without cellWidth and cellHeight properties.
            //
            // In the ILayout layouts, cellWidth and cellHeight were optional so this
            // exception should be helpful to developers who are transitioning to the ILayout layouts.
            testInvalidGroupInfoResult = function (complete) {
                var count = 10,
                    layoutResult,
                    layout = new WinJS.UI.CellSpanningLayout({
                        groupInfo: function (groupIndex) {
                            return { enableCellSpanning: true };
                        },
                        itemInfo: itemInfoForPattern("b mmm ssssss", itemSizesSimple)
                    }),
                    listView = new SimpleListView(document.getElementById("CellSpanningGridLayoutListView"), {
                        layout: layout,
                        itemsCount: count,
                        viewportSize: { height: 680, width: 1000 }
                    });

                layout.initialize(listView._getLayoutSite(), false);
                layoutResult = layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []);
                layoutResult.realizedRangeComplete.then(function () {
                    LiveUnit.Assert.fail("Lay out of realized range should not complete successfully due to invalid groupInfo function");
                }, function (error) {
                        LiveUnit.Assert.areEqual("WinJS.UI.GridLayout.GroupInfoResultIsInvalid", error.name,
                            "Exception should have been thrown due to invalid groupInfo function");

                        layout.uninitialize();
                        listView._cleanUp();
                        complete();
                    });
            };

            // Verifies that a friendly exception is thrown when itemInfo is not a function
            // which returns an object with numeric width and height properties.
            //
            // In the ILayout layouts, itemInfo was optional. If provided, it could have been an object
            // with width and height properties or a function which sometimes returned nothing. These
            // forms of itemInfo are no longer valid in the ILayout layouts so this exception should be
            // helpful to developers who are transitioning to the ILayout layouts.
            testInvalidItemInfo = function (complete) {
                function test(itemInfo) {
                    function groupInfo(group) {
                        return {
                            enableCellSpanning: true,
                            cellWidth: 100,
                            cellHeight: 100
                        };
                    }

                    var count = 10,
                        layoutResult,
                        layout = new WinJS.UI.CellSpanningLayout({
                            groupInfo: groupInfo,
                            itemInfo: itemInfo
                        }),
                        listView = new SimpleListView(document.getElementById("CellSpanningGridLayoutListView"), {
                            layout: layout,
                            itemsCount: count,
                            viewportSize: { height: 680, width: 1000 }
                        });

                    layout.initialize(listView._getLayoutSite(), false);
                    layoutResult = layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []);
                    return layoutResult.realizedRangeComplete.then(function () {
                        LiveUnit.Assert.fail("Lay out of realized range should not complete successfully due to invalid itemInfo function");
                    }, function (error) {
                            isInvalidItemInfoError(error);

                            layout.uninitialize();
                            listView._cleanUp();
                        });
                }

                // itemInfo should always return an object with numeric width and height
                // properties. This one is invalid because it sometimes returns nothing.
                function itemInfoFunction1(index) {
                    if (index < 2) {
                        return {
                            width: 100,
                            height: 100
                        };
                    }
                }

                // This one returns an object but it's invalid because it's missing
                // the required width and height properties.
                function itemInfoFunction2(index) {
                    return {};
                }

                var invalidItemInfos = [
                    undefined,
                    { width: 100, height: 100 },
                    itemInfoFunction1,
                    itemInfoFunction2
                ];

                var promise = WinJS.Promise.wrap();
                invalidItemInfos.forEach(function (itemInfo) {
                    promise = promise.then(function () {
                        return test(itemInfo);
                    });
                });
                promise.then(complete, complete);
            };

            testAsyncItemInfo = function (complete) {
                var pattern = "b mmm ssssss",
                    itemInfo = itemInfoForPattern(pattern, itemSizesSimple);
                var opts = {
                    pattern: pattern,
                    itemSizes: itemSizesSimple,
                    count: 10,
                    viewportSize: { height: 680, width: 1000 },
                    itemInfo: function (itemIndex) {
                        return WinJS.Promise.timeout().then(function () {
                            return itemInfo(itemIndex);
                        });
                    }
                };

                testLayout(opts, function (listView, layout) {
                    checkTile(listView, opts.itemSizes, 0, 0, 0, "b");
                    checkTile(listView, opts.itemSizes, 1, 400, 0, "m");
                    checkTile(listView, opts.itemSizes, 2, 400, 200, "m");
                    checkTile(listView, opts.itemSizes, 3, 400, 400, "m");
                    checkTile(listView, opts.itemSizes, 4, 600, 0, "s");
                    checkTile(listView, opts.itemSizes, 5, 600, 100, "s");
                }).then(complete);
            };
        };
    }

    export module GroupedGrid {
        var itemSizesSimple = {
            b: { width: 400, height: 600 },
            m: { width: 200, height: 200 },
            s: { width: 300, height: 100 },
            u: { width: 200, height: 100 },
            cellSize: { width: 100, height: 100 }
        };
        var itemSizesWithMargins = {
            b: { width: 550, height: 700 },
            c: { width: 550, height: 100 },
            m: { width: 250, height: 250 },
            s: { width: 400, height: 100 },
            u: { width: 100, height: 110 },
            cellSize: { width: 100, height: 100 }
        };

        function groupInfoForGroups(groups, sizes) {
            var cellSize = sizes.cellSize;

            function groupInfo(group) {
                LiveUnit.Assert.isTrue(group !== null, "groupInfo received a null item");
                var countOrPattern = groups[group.index];
                if (+countOrPattern === countOrPattern) {
                    return { enableCellSpanning: false };
                } else {
                    return {
                        enableCellSpanning: true,
                        cellWidth: cellSize.width,
                        cellHeight: cellSize.height
                    };
                }
            }

            return groupInfo;
        }

        function itemInfoForGroups(groups, sizes) {
            var pattern = "";

            groups.forEach(function (group) {
                if (+group === group) {
                    // group represents the number of items in a uniform group
                    pattern += strRepeat("u", group);
                } else {
                    // group represents the item pattern in a cell spanning group
                    pattern += group.replace(/ /g, "");;
                }
            });

            function itemInfo(index) {
                if (+index === index) {
                    LiveUnit.Assert.areNotEqual("u", pattern[index], "itemInfo should not be called on items in uniform groups");
                    return sizes[pattern[index]];
                } else {
                    return sizes["u"];
                }
            }

            return itemInfo;
        }

        function setUpLayout(options, callback1, callback2?) {
            // Options
            var groups = options.groups,
                itemSizes = options.itemSizes,
                // The following are optional,
                viewportSize = options.viewportSize,
                realizedRange = options.realizedRange,
                groupHeaderPosition = options.groupHeaderPosition,
                rtl = options.rtl,
                listViewClass = options.listViewClass,
                itemInfo = options.itemInfo || itemInfoForGroups(groups, itemSizes);

            var layoutCallback = (callback2 ? callback2 : callback1),   // Always the last argument
                realizedCallback = (callback2 ? callback1 : function () { }),
                layoutResult,
                // An array where each cell contains the number of items in the group
                itemsCount = groups.map(function (group) {
                    return (+group === group) ?
                        group :
                        group.replace(/ /g, "").length;
                }),
                // Number of items in the data source
                count = itemsCount.reduce(function (x, y) {
                    return x + y;
                }),
                layout = new WinJS.UI.CellSpanningLayout({
                    groupInfo: groupInfoForGroups(groups, itemSizes),
                    itemInfo: itemInfo,
                    groupHeaderPosition: groupHeaderPosition
                }),
                listView = new SimpleListView(document.getElementById("GroupedGridLayoutListView"), {
                    layout: layout,
                    groupsEnabled: true,
                    itemsCount: itemsCount,
                    viewportSize: viewportSize,
                    realizedRange: realizedRange,
                    rtl: rtl
                });

            if (listViewClass) {
                WinJS.Utilities.addClass(listView.element, listViewClass);
            }

            layout.initialize(listView._getLayoutSite(), true);
            layoutResult = layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []);
            layoutResult.realizedRangeComplete.then(function () {
                realizedCallback(listView, layout);
            });
            return layoutResult.layoutComplete.then(function () {
                layoutCallback(listView, layout);
                layout.uninitialize();
                listView._cleanUp();
            });
        }

        export class GroupedGridLayoutTests {

            setUp() {
                LiveUnit.LoggingCore.logComment("In setup");

                testRootEl = document.createElement("div");
                testRootEl.className = "file-listview-css";

                var newNode = document.createElement("div");
                newNode.id = "GroupedGridLayoutListView";
                testRootEl.appendChild(newNode);
                document.body.appendChild(testRootEl);
            }

            tearDown() {
                LiveUnit.LoggingCore.logComment("In tearDown");
                WinJS.Utilities.disposeSubTree(testRootEl);
                document.body.removeChild(testRootEl);
            }



            // layout while invisible and measuring tests are taken care of in
            // UniformGridLayoutTests and CellSpanningGridLayoutTests

            // Verifies that the container width and height are properly measured for the uniform groups
            testUniformContainerSize = function (complete) {
                var count = 20;
                var opts = {
                    listViewClass: "cellSpanningMargins",
                    groups: [
                        "b mmm ssssss",
                        10
                    ],
                    itemSizes: itemSizesWithMargins,
                    viewportSize: { height: 1000, width: 1000 }
                };

                setUpLayout(opts, function (listView, layout) {
                    LiveUnit.Assert.areEqual(160, layout._sizes.containerHeight,
                        "Incorrectly measured the container height for uniform groups");
                    LiveUnit.Assert.areEqual(150, layout._sizes.containerWidth,
                        "Incorrectly measured the container width for uniform groups");
                }).then(complete);
            };

            // Verifies that an exception is thrown when an itemInfo function is supplied
            // which returns an invalid value when no index is passed to it. This code path
            // is hit when there's at least 1 uniform group and the first group is cell spanning.
            testInvalidUniformItemInfo = function (complete) {
                // Returns a valid object when an index is provided (cell spanning),
                // but returns nothing when the index is omitted (uniform).
                function cellSpanningItemInfo(index) {
                    if (+index === index) {
                        return {
                            width: 100,
                            height: 100
                        };
                    }
                }

                function isInvalidItemInfoError(error) {
                    if (Array.isArray(error)) {
                        error.forEach(function (e) {
                            e && isInvalidItemInfoError(e);
                        });
                    } else {
                        LiveUnit.Assert.areEqual("WinJS.UI.GridLayout.ItemInfoIsInvalid", error.name,
                            "Exception should have been thrown due to invalid itemInfo function");
                    }
                }

                var count = 20,
                    itemsCount = [10, 10],
                    groups = [
                        "b mmm ssssss",
                        10
                    ],
                    layoutResult,
                    viewportSize = { height: 680, width: 1000 },
                    layout = new WinJS.UI.CellSpanningLayout({
                        groupInfo: groupInfoForGroups(groups, itemSizesSimple),
                        itemInfo: cellSpanningItemInfo
                    }),
                    listView = new SimpleListView(document.getElementById("GroupedGridLayoutListView"), {
                        layout: layout,
                        groupsEnabled: true,
                        itemsCount: itemsCount,
                        viewportSize: viewportSize
                    });

                layout.initialize(listView._getLayoutSite(), true);
                layoutResult = layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []);
                layoutResult.realizedRangeComplete.then(function () {
                    LiveUnit.Assert.fail("Lay out of realized range should not complete successfully due to invalid itemInfo function");
                }, function (error) {
                        isInvalidItemInfoError(error);

                        layout.uninitialize();
                        listView._cleanUp();
                    }).then(complete, complete);
            };

            // Verifies that the items container and the headers container have the
            // appropriate CSS classes after being laid out and after being cleaned up.
            testLayoutClasses = function (complete) {
                function verifyClasses(listView) {
                    var i,
                        expectedClasses = [
                            WinJS.UI._cellSpanningGridLayoutClass,
                            WinJS.UI._uniformGridLayoutClass,
                            WinJS.UI._cellSpanningGridLayoutClass,
                            WinJS.UI._uniformGridLayoutClass
                        ];
                    for (i = 0; i < opts.groups.length; i++) {
                        var headerContainer = listView._tree[i].header,
                            itemsContainer = listView._tree[i].itemsContainer.element;

                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(headerContainer, WinJS.UI._laidOutClass),
                            "header container should have laid out CSS class");
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemsContainer, WinJS.UI._laidOutClass),
                            "items container should have laid out CSS class");
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(itemsContainer, expectedClasses[i]),
                            "items container is missing a CSS class");
                    }
                }

                var count = 40;
                var opts = {
                    groups: [
                        "b mmm ssssss",
                        10,
                        "b mmm ssssss",
                        10
                    ],
                    itemSizes: itemSizesSimple,
                    viewportSize: { height: 680, width: 1000 }
                };

                setUpLayout(opts, function (listView, layout) {
                    verifyClasses(listView);
                }, function (listView, layout) {
                        verifyClasses(listView);
                        layout.uninitialize();
                    }).then(complete);
            };

            // Verifies that the background layout work lays out all of the items in the
            // unrealized range. Also verifies that the background layout work gets canceled when the
            // layout is canceled.
            // Assumes that background layout work is done at normal priority.
            testBackgroundLayout = function (complete) {
                function test(cancelLayout) {
                    return new WinJS.Promise(function (subtestComplete) {
                        function verifyRangeIsLaidOut(first, last) {
                            for (var i = first; i <= last; i++) {
                                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(listView._containerAtIndex(i), WinJS.UI._laidOutClass));
                            }
                        }
                        function verifyRangeIsNotLaidOut(first, last) {
                            for (var i = first; i <= last; i++) {
                                LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(listView._containerAtIndex(i), WinJS.UI._laidOutClass));
                            }
                        }
                        function verifyOnlyRealizedRangeLaidOut() {
                            verifyRangeIsNotLaidOut(0, realizedItems.first - 1);
                            verifyRangeIsLaidOut(realizedItems.first, realizedItems.last);
                            verifyRangeIsNotLaidOut(realizedItems.last + 1, count - 1);
                        }
                        function schedule(work) {
                            WinJS.Utilities.Scheduler.schedule(work, WinJS.Utilities.Scheduler.Priority.normal);
                        }

                        var count = 80,
                            layoutResult,
                            itemsCount = [30, 10, 30, 10],
                            groups = [
                                strRepeat("b mmm ssssss", 3),
                                "b mmm ssssss",
                                strRepeat("b mmm ssssss", 3),
                                "b mmm ssssss"
                            ],
                            viewportSize = { height: 680, width: 1000 },
                            realizedRange = { firstPixel: 1000, lastPixel: 2300 },
                            realizedItems = { first: 10, last: 23 },
                            layout = new WinJS.UI.CellSpanningLayout({
                                groupInfo: groupInfoForGroups(groups, itemSizesSimple),
                                itemInfo: itemInfoForGroups(groups, itemSizesSimple)
                            }),
                            listView = new SimpleListView(document.getElementById("GroupedGridLayoutListView"), {
                                layout: layout,
                                groupsEnabled: true,
                                itemsCount: itemsCount,
                                viewportSize: viewportSize,
                                realizedRange: realizedRange
                            }),
                            layoutCompleted = false;

                        layout.initialize(listView._getLayoutSite(), true);

                        if (cancelLayout) {
                            // This job should run before the layout's scheduled work and it
                            // should cancel the layout.
                            schedule(function () {
                                layoutResult.layoutComplete.cancel();
                            });
                        }

                        layoutResult = layout.layout(listView._tree, { firstIndex: 0, lastIndex: count - 1 }, [], []);
                        layoutResult.realizedRangeComplete.done(function () {
                            verifyOnlyRealizedRangeLaidOut();
                        });
                        layoutResult.layoutComplete.done(function () {
                            layoutCompleted = true;
                        });

                        // If the layout's scheduled work isn't canceled, this job
                        // should run after it.
                        schedule(function () {
                            if (cancelLayout) {
                                // Verify that the layout's scheduled work didn't run
                                LiveUnit.Assert.isFalse(layoutCompleted);
                                verifyOnlyRealizedRangeLaidOut();
                            } else {
                                // Verify that the layout's scheduled work completed
                                LiveUnit.Assert.isTrue(layoutCompleted);
                                verifyRangeIsLaidOut(0, count - 1);
                            }
                            subtestComplete();
                        });
                    });
                }

                test(false).then(function () {
                    return test(true);
                }).then(complete);
            };

            // Verifies that getAdjacent performs properly when moving between groups
            testGetAdjacentBetweenGroups = function (complete) {
                function test(rtl) {
                    // Illustration of how the items in groups 1 and 4 are split into columns:
                    // 0  3  4
                    //       5
                    // 1     6
                    //       7
                    // 2     8
                    //       9
                    // Group 0 has the 1st and 2nd columns swapped

                    var prevColumn = rtl ? Key.rightArrow : Key.leftArrow,
                        nextColumn = rtl ? Key.leftArrow : Key.rightArrow;

                    var count = 76;
                    var opts = {
                        groups: [
                            "b mmm ssssss", // first index: 0
                            "mmm b ssssss", // first index: 10
                            10,             // first index: 20
                            10,             // first index: 30
                            "mmm b ssssss", // first index: 40
                            12,             // first index: 50
                            4,              // first index: 62
                            10              // first index: 66
                        ],
                        itemSizes: itemSizesSimple,
                        viewportSize: { height: 680, width: 1000 },
                        rtl: rtl
                    };

                    return setUpLayout(opts, function (listView, layout) {
                        function verifyGetAdjacent(currentIndex, pressedKey, expectedIndex) {
                            var newItem = layout.getAdjacent({ type: "item", index: currentIndex }, pressedKey);
                            LiveUnit.Assert.areEqual("item", newItem.type, "getAdjacent's returned type should be item");
                            LiveUnit.Assert.areEqual(expectedIndex, clampToRange(0, count - 1, newItem.index),
                                "getAdjacent's returned index should be " + expectedIndex);
                        }

                        var i;

                        // Cell spanning -> cell spanning
                        // Move to the first index of the next group
                        for (i = 4; i <= 9; i++) {
                            verifyGetAdjacent(i, nextColumn, 10);
                        }

                        // Cell spanning <- cell spanning
                        // Move to the last index of the previous group
                        verifyGetAdjacent(10, prevColumn, 9);
                        verifyGetAdjacent(11, prevColumn, 9);
                        verifyGetAdjacent(12, prevColumn, 9);

                        // Cell spanning -> uniform
                        // Move to the first index of the next group
                        for (i = 14; i <= 19; i++) {
                            verifyGetAdjacent(i, nextColumn, 20);
                        }

                        // Cell spanning <- uniform
                        // Move to the last index of the previous group
                        for (i = 20; i <= 25; i++) {
                            verifyGetAdjacent(i, prevColumn, 19);
                        }

                        // Uniform -> uniform
                        // Maintain the row while changing groups
                        for (i = 0; i < 4; i++) {
                            verifyGetAdjacent(26 + i, nextColumn, 30 + i);
                        }
                        for (i = 0; i < 4; i++) {
                            verifyGetAdjacent(56 + i, nextColumn, 62 + i);
                        }
                        // Not enough rows in the next group so move to its last item
                        verifyGetAdjacent(60, nextColumn, 65);
                        verifyGetAdjacent(61, nextColumn, 65);

                        // Uniform <- uniform
                        // Maintain the row while changing groups
                        for (i = 0; i < 4; i++) {
                            verifyGetAdjacent(30 + i, prevColumn, 26 + i);
                        }
                        // Not enough rows in the previous group so move to its last item
                        verifyGetAdjacent(34, prevColumn, 29);
                        verifyGetAdjacent(35, prevColumn, 29);
                        // Test page up when the first group on screen has no fully visible items. Page up
                        // should go to the first item of the last column of that group.
                        var firstItemOfLastColumnOfGroup = 26;
                        var container = listView._containerAtIndex(firstItemOfLastColumnOfGroup);
                        // Scroll such that group 2 is the first visible group and it has no fully visible items.
                        listView.scrollPosition = (rtl ? Helper.getOffsetRight(container) : container.offsetLeft) + 10;
                        verifyGetAdjacent(31, Key.pageUp, firstItemOfLastColumnOfGroup);
                        listView.scrollPosition = 0;

                        // Uniform -> cell spanning
                        // Move to the first index of the next group
                        for (i = 36; i <= 39; i++) {
                            verifyGetAdjacent(i, nextColumn, 40);
                        }

                        // Uniform <- cell spanning
                        // Move to the last index of the previous group
                        verifyGetAdjacent(40, prevColumn, 39);
                        verifyGetAdjacent(41, prevColumn, 39);
                        verifyGetAdjacent(42, prevColumn, 39);
                    });
                }

                test(false).then(function () {
                    return test(true);
                }).then(complete);
            };

            // Verify that first/LastItemFromRange properly map pixel ranges to item ranges
            testItemFromRange = function (complete) {
                function test(groupHeaderPosition) {
                    var count = 35;
                    var opts = {
                        listViewClass: "containerMargins",
                        groups: [
                            "b mmm ssssss", // items container content width: 450px
                            15,             // first index: 10
                            10
                        ],
                        itemSizes: {
                            b: { width: 180, height: 330 },
                            m: { width: 80, height: 110 },
                            s: { width: 130, height: 55 },
                            u: { width: 80, height: 110 },
                            cellSize: { width: 30, height: 55 }
                        },
                        viewportSize: { height: 350, width: 300 },
                        groupHeaderPosition: groupHeaderPosition
                    };

                    return setUpLayout(opts, function (listView, layout) {
                        // For the following two functions, input should be an object which
                        // contains the parameters to first/_lastItemFromRange:
                        // - first/lastPixel
                        // - wholeItem
                        // expectedOutput.index should be the index that first/_lastItemFromRange is expected to return
                        function verifyFirstItemFromRange(input, expectedOutput) {
                            var index = layout._firstItemFromRange(input.firstPixel, { wholeItem: input.wholeItem });
                            LiveUnit.Assert.areEqual(expectedOutput.index, index,
                                "_firstItemFromRange's returned index should be " + expectedOutput.index);
                        }
                        function verifyLastItemFromRange(input, expectedOutput) {
                            var index = layout._lastItemFromRange(input.lastPixel, { wholeItem: input.wholeItem });
                            LiveUnit.Assert.areEqual(expectedOutput.index, index,
                                "_lastItemFromRange's returned index should be " + expectedOutput.index);
                        }

                        // Verifies first/_lastItemFromRange for a uniform group.
                        // firstPixel is the first pixel of the items container's content box.
                        // firstIndex is the first index of the group.
                        function verifyGroup(firstPixel, firstIndex) {
                            // Verify _firstItemFromRange for partial items
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 0, wholeItem: false }, { index: firstIndex + 0 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 1, wholeItem: false }, { index: firstIndex + 0 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 84, wholeItem: false }, { index: firstIndex + 0 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 85, wholeItem: false }, { index: firstIndex + 3 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 184, wholeItem: false }, { index: firstIndex + 3 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 185, wholeItem: false }, { index: firstIndex + 6 });

                            // _firstItemFromRange, whole items
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 0, wholeItem: true }, { index: firstIndex + 0 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 1, wholeItem: true }, { index: firstIndex + 3 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 99, wholeItem: true }, { index: firstIndex + 3 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 100, wholeItem: true }, { index: firstIndex + 3 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel + 101, wholeItem: true }, { index: firstIndex + 6 });

                            // _lastItemFromRange, partial items
                            var last = firstPixel + opts.viewportSize.width - 1;
                            verifyLastItemFromRange({ lastPixel: last, wholeItem: false }, { index: firstIndex + 8 });
                            verifyLastItemFromRange({ lastPixel: last + 5, wholeItem: false }, { index: firstIndex + 8 });
                            verifyLastItemFromRange({ lastPixel: last + 6, wholeItem: false }, { index: firstIndex + 11 });
                            verifyLastItemFromRange({ lastPixel: last + 105, wholeItem: false }, { index: firstIndex + 11 });
                            verifyLastItemFromRange({ lastPixel: last + 106, wholeItem: false }, { index: firstIndex + 14 });

                            // _lastItemFromRange, whole items
                            verifyLastItemFromRange({ lastPixel: last, wholeItem: true }, { index: firstIndex + 8 });
                            verifyLastItemFromRange({ lastPixel: last + 99, wholeItem: true }, { index: firstIndex + 8 });
                            verifyLastItemFromRange({ lastPixel: last + 100, wholeItem: true }, { index: firstIndex + 11 });
                        }

                        // Verify boundaries of header/items container
                        // firstPixel is the first pixel of the header/items container's margin box
                        // When using firstItemFromRange, all win-container margins, win-groupleader margins, and
                        //  headers are considered to be part of the group/item that comes after it.
                        // When using lastItemFromRange, all win-container margins, win-groupleader margins, and
                        //  headers are considered to be part of the group/item that comes before it.
                        function verifyFirstAtGroupBoundary(firstPixel) {
                            // _firstItemFromRange
                            // @TODO: Uncomment when blue#50294 is fixed.
                            //verifyFirstItemFromRange({ firstPixel: 459, wholeItem: false }, { index: 4 });
                            verifyFirstItemFromRange({ firstPixel: firstPixel, wholeItem: false }, { index: 10 });
                        }
                        function verifyLastAtGroupBoundary(firstPixel) {
                            // _lastItemFromRange
                            verifyLastItemFromRange({ lastPixel: firstPixel - 1, wholeItem: false }, { index: 9 });
                            verifyLastItemFromRange({ lastPixel: firstPixel, wholeItem: false }, { index: 12 });
                        }

                        if (groupHeaderPosition === WinJS.UI.HeaderPosition.top) {
                            // items container 0 margin: 10
                            // items container 0 content width: 450
                            // items container 1 margin: 10

                            // win-container margin-right: 15
                            verifyFirstAtGroupBoundary(445);

                            // win-container margin-left: 5
                            verifyLastAtGroupBoundary(475);

                            verifyGroup(470, 10);
                        } else {
                            LiveUnit.Assert.areEqual(WinJS.UI.HeaderPosition.left, groupHeaderPosition,
                                "groupHeaderPosition should be left");
                            // header container 0 width: 100
                            // items container 0 margin: 10
                            // items container 0 content width: 450
                            // header container 1 width: 100
                            // items container 1 margin: 10

                            // win-container margin-right: 15
                            verifyFirstAtGroupBoundary(545);

                            // win-container margin-left: 5
                            verifyLastAtGroupBoundary(675);

                            verifyGroup(670, 10);
                        }

                        // Verify empty range is returned when pixel range contains no items
                        var itemRange = layout.itemsFromRange(10000, 10100);
                        LiveUnit.Assert.areEqual(0, itemRange.firstIndex, "itemsFromRange returned wrong firstIndex");
                        LiveUnit.Assert.areEqual(-1, itemRange.lastIndex, "itemsFromRange returned wrong lastIndex");
                    });
                }

                test(WinJS.UI.HeaderPosition.top).then(function () {
                    return test(WinJS.UI.HeaderPosition.left);
                }).then(complete);
            };

            testHitTest = function (complete) {
                function test(groupHeaderPosition) {
                    var count = 30;
                    var opts = {
                        listViewClass: "cellSpanningMargins",
                        groups: [
                            10,                 // items container content width: 200px
                            "bc mmm ssssss",    // first index: 10
                            "b mmm sssss"
                        ],
                        itemSizes: itemSizesWithMargins,
                        viewportSize: { height: 1000, width: 1000 },
                        groupHeaderPosition: groupHeaderPosition
                    };

                    return setUpLayout(opts, function (listView, layout) {
                        // Given coords, verify that hitTest returns expectedIndex
                        function verifyHitTest(coords, expectedIndex) {
                            var result = layout.hitTest(coords.x, coords.y);
                            LiveUnit.Assert.areEqual("item", result.type, "hitTest should have returned type 'item'");
                            LiveUnit.Assert.areEqual(expectedIndex, result.index, "hitTest returned wrong index");
                        }

                        // Verifies hitTest for a cell spanning group.
                        // (originX, originY) is the top-left pixel within the items container's
                        // content box.
                        // firstIndex is the first index of the group.
                        function verifyGroup(originX, originY, firstIndex) {
                            // Out of range (too small)
                            verifyHitTest({ x: originX, y: originY - 1000 }, firstIndex + 0);
                            //verifyHitTest({ x: -10, y: 0 }, 0);
                            //verifyHitTest({ x: -10, y: -10 }, 0);

                            // Item 0 boundaries
                            verifyHitTest({ x: originX, y: originY }, firstIndex + 0);
                            verifyHitTest({ x: originX + 599, y: originY + 1000000 }, firstIndex + 1); // y is out of range
                            verifyHitTest({ x: originX + 599, y: originY + 750 }, firstIndex + 1);
                            verifyHitTest({ x: originX + 599, y: originY + 749 }, firstIndex + 0);

                            // Item 4 boundaries
                            verifyHitTest({ x: originX + 600, y: originY + 749 }, firstIndex + 4);
                            verifyHitTest({ x: originX + 600, y: originY + 599 }, firstIndex + 3);
                            verifyHitTest({ x: originX + 600, y: originY + 600 }, firstIndex + 4);
                            verifyHitTest({ x: originX + 600, y: originY + 1000000 }, firstIndex + 4); // y is out of range
                            verifyHitTest({ x: originX + 899, y: originY + 600 }, firstIndex + 4);
                            verifyHitTest({ x: originX + 900, y: originY + 600 }, firstIndex + 9);
                            verifyHitTest({ x: originX + 899, y: originY + 750 }, firstIndex + 4);
                            verifyHitTest({ x: originX + 900, y: originY + 750 }, firstIndex + 10);
                            verifyHitTest({ x: originX + 900, y: originY + 299 }, firstIndex + 6);
                            verifyHitTest({ x: originX + 900, y: originY + 300 }, firstIndex + 7);
                            verifyHitTest({ x: originX + 900, y: originY + 449 }, firstIndex + 7);
                            verifyHitTest({ x: originX + 900, y: originY + 450 }, firstIndex + 8);

                            // Out of range (too large)
                            verifyHitTest({ x: originX + 900, y: originY + 1000000 }, firstIndex + 10);
                        }

                        function verifyFirstColumn(x, originY, firstIndex) {
                            verifyHitTest({ x: x, y: originY - 1000000 }, firstIndex + 0);
                            verifyHitTest({ x: x, y: originY }, firstIndex + 0);
                            verifyHitTest({ x: x, y: originY + 749 }, firstIndex + 0);
                            verifyHitTest({ x: x, y: originY + 750 }, firstIndex + 1);
                            verifyHitTest({ x: x, y: originY + 1000000 }, firstIndex + 1);
                        }

                        var headerContainerWidth = 100,
                            itemsContainerMarginLeft = 10,
                            itemsContainerContentWidth = 300;

                        if (groupHeaderPosition === WinJS.UI.HeaderPosition.top) {
                            var originX =
                                itemsContainerMarginLeft +      // items container 0
                                itemsContainerContentWidth +
                                itemsContainerMarginLeft,       // items container 1
                                originY = 20, // header height
                                firstIndex = 10;

                            // Hit testing the header
                            verifyHitTest({ x: originX - 10, y: originY - 20 }, firstIndex + 0);
                            verifyHitTest({ x: originX + 599, y: originY - 20 }, firstIndex + 0);
                            verifyHitTest({ x: originX + 600, y: originY - 20 }, firstIndex + 2);
                            // Hit testing in the items container margin
                            verifyFirstColumn(originX - 10, originY, firstIndex);

                            verifyGroup(originX, originY, firstIndex);
                        } else {
                            var originX =
                                headerContainerWidth +          // header container 0
                                itemsContainerMarginLeft +      // items container 0
                                itemsContainerContentWidth +
                                headerContainerWidth +          // header container 1
                                itemsContainerMarginLeft,       // items container 1
                                originY = 0, // no header above the items container
                                firstIndex = 10;

                            LiveUnit.Assert.areEqual(WinJS.UI.HeaderPosition.left, groupHeaderPosition,
                                "groupHeaderPosition should be left");

                            // Hit testing in the items container margin
                            verifyFirstColumn(originX - 10, originY, firstIndex);
                            // Hit testing in the header
                            verifyFirstColumn(originX - 110, originY, firstIndex);

                            verifyGroup(originX, originY, firstIndex);
                        }

                        // Out of range (too large)
                        verifyHitTest({ x: originX + 1000000, y: originY + 1000000 }, 29);
                    });
                }

                test(WinJS.UI.HeaderPosition.top).then(function () {
                    return test(WinJS.UI.HeaderPosition.left);
                }).then(complete);
            };

            testAsyncItemInfo = function (complete) {
                var count = 20,
                    groups = [
                        "b mmm ssssss",
                        10
                    ],
                    itemInfo = itemInfoForGroups(groups, itemSizesSimple);

                var opts = {
                    groups: groups,
                    itemSizes: itemSizesSimple,
                    viewportSize: { height: 680, width: 1000 },
                    itemInfo: function (itemIndex) {
                        return WinJS.Promise.timeout().then(function () {
                            return itemInfo(itemIndex);
                        });
                    }
                };

                setUpLayout(opts, function (listView, layout) {
                    checkTile(listView, opts.itemSizes, 0, 10, 0, "b");
                    checkTile(listView, opts.itemSizes, 1, 410, 0, "m");
                    checkTile(listView, opts.itemSizes, 2, 410, 200, "m");
                    checkTile(listView, opts.itemSizes, 3, 410, 400, "m");
                    checkTile(listView, opts.itemSizes, 4, 610, 0, "s");
                    checkTile(listView, opts.itemSizes, 5, 610, 100, "s");

                    checkTile(listView, opts.itemSizes, 10, 920, 0, "u");
                    checkTile(listView, opts.itemSizes, 11, 920, 100, "u");
                }).then(complete);
            };
        }
    }

    // Returns an array of itemCount items. itemsPerGroup is optional.
    function initData(itemCount, itemsPerGroup?) {
        var a = "A".charCodeAt(0),
            items = [];

        for (var i = 0; i < itemCount; ++i) {
            items[i] = {
                title: "Item " + i,
                groupKey: (itemsPerGroup ? String.fromCharCode(a + Math.floor(i / itemsPerGroup)) : null)
            };
        }
        return items;
    }

    // Returns a renderer which renders elements of the given height and width
    function generateRenderer(height, width) {
        return function renderer(itemPromise) {
            return itemPromise.then(function (item) {
                var div = document.createElement("div");
                div.textContent = item.data.title;
                div.style.height = height + "px";
                div.style.width = width + "px";
                return div;
            });
        };
    }

    function verifyMargins(element, expectedMargins, message) {
        objectsAreEqual(WinJS.UI._getMargins(element), expectedMargins, message);
    }

    export class LVLayoutTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "LayoutTest";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }
        
        testAssureMarginRuleSpecificityDoesNotTrumpWin8(complete) {
            // Test can't run with ListView.less.css in effect otherwise one of the rules will
            // overrule what we are trying to verify in this test.
            WinJS.Utilities.removeClass(testRootEl, "file-listview-css");

            var data = [];
            for (var i = 0; i < 20; i++) {
                data.push({ index: i, title: "Item " + i });
            }
            var list = new WinJS.Binding.List(data);

            var lv = new WinJS.UI.ListView();
            lv.itemDataSource = list.dataSource;

            var style = document.createElement("style");
            WinJS.Utilities.setInnerHTMLUnsafe(style, ".win-listview > .win-horizontal .win-container { margin: 15px }");

            testRootEl.appendChild(style);
            testRootEl.appendChild(lv.element);

            Helper.ListView.waitForReady(lv, -1)().then(function () {
                var cs = getComputedStyle(lv.element.querySelector(".win-container"));
                LiveUnit.Assert.areEqual("15px", cs.marginLeft);
                LiveUnit.Assert.areEqual("15px", cs.marginRight);
                LiveUnit.Assert.areEqual("15px", cs.marginTop);
                LiveUnit.Assert.areEqual("15px", cs.marginBottom);
                testRootEl.removeChild(style);
                testRootEl.removeChild(lv.element);
                lv.dispose();
                complete();
            });
        }

        // Verifies that the layout measures and sets the margins correctly on the items
        // container and the header container. Does this for both grouped and non-grouped grid layouts.
        testDefaultItemsContainerMargins(complete) {
            function test(rtl, useGroups, headerPosition?) {
                function groupKey(item) {
                    return item.groupKey;
                }

                function groupData(item) {
                    return { key: groupKey(item), title: groupKey(item) };
                }

                var element = document.createElement("div");
                element.style.width = "1000px";
                element.style.height = "680px";
                if (rtl) {
                    element.setAttribute("dir", "rtl");
                }
                document.getElementById("LayoutTest").appendChild(element);

                var list = new WinJS.Binding.List(initData(100, 10)).createGrouped(groupKey, groupData),
                    options: any = {
                        itemDataSource: list.dataSource,
                        itemTemplate: generateRenderer(100, 100)
                    };

                if (useGroups) {
                    options.groupDataSource = list.groups.dataSource,
                    options.groupHeaderTemplate = generateRenderer(50, 50),
                    options.layout = {
                        type: WinJS.UI.GridLayout,
                        groupHeaderPosition: headerPosition
                    };
                }

                var listView = new WinJS.UI.ListView(element, options);

                return Helper.ListView.waitForReady(listView)().then(function () {
                    var itemsContainer = listView.element.querySelector("." + WinJS.UI._itemsContainerClass),
                        itemsContainerMargins = {
                            top: 0,
                            bottom: 0,
                            left: (useGroups && headerPosition === WinJS.UI.HeaderPosition.top && !rtl ? 70 : 0),
                            right: (useGroups && headerPosition === WinJS.UI.HeaderPosition.top && rtl ? 70 : 0)
                        },
                        sizes = listView.layout['_sizes'];

                    verifyMargins(itemsContainer, itemsContainerMargins,
                        "Items container margins were set incorrectly");
                    LiveUnit.Assert.areEqual(itemsContainerMargins[rtl ? "right" : "left"],
                        sizes.itemsContainerOuterX, "Measured itemsContainerOuterX incorrectly");
                    LiveUnit.Assert.areEqual(itemsContainerMargins.left + itemsContainerMargins.right,
                        sizes.itemsContainerOuterWidth, "Measured itemsContainerOuterWidth incorrectly");

                    if (useGroups) {
                        var headerContainer = listView.element.querySelector("." + WinJS.UI._headerContainerClass),
                            headerContainerMargins = {
                                top: 0,
                                bottom: 0,
                                left: (!rtl ? 70 : 0),
                                right: (rtl ? 70 : 0)
                            };

                        verifyMargins(headerContainer, headerContainerMargins,
                            "Header container margins were set incorrectly");
                    }
                    element.parentNode.removeChild(element);
                });
            }

            var promise: any = WinJS.Promise.wrap();

            // Enumerate rtl, grouped/non-grouped data, and header position
            [true, false].forEach(function (rtl) {
                promise = promise.then(function () {
                    return test(rtl, false);
                });
                [WinJS.UI.HeaderPosition.top, WinJS.UI.HeaderPosition.left].forEach(function (headerPosition) {
                    promise = promise.then(function () {
                        return test(rtl, true, headerPosition);
                    });
                });
            });

            promise.then(function () {
                complete()
            });
        }

        // Verifies that the surface length (width in horizontal layouts and height in vertical layouts)
        // is the appropriate length to fit all of the ListView's items.
        testSurfaceLength(complete) {
            function test(layout, expectedSurfaceLength) {
                var list = new WinJS.Binding.List(initData(itemCount)),
                    listView = new ListView(document.getElementById("LayoutTest"), {
                        layout: layout,
                        itemDataSource: list.dataSource,
                        itemTemplate: generateRenderer(containerHeight, containerWidth)
                    });

                return Helper.ListView.waitForReady(listView)().then(function () {
                    var getContentLength = WinJS.Utilities[layout.orientation === "horizontal" ? "getContentWidth" : "getContentHeight"];
                    LiveUnit.Assert.areEqual(expectedSurfaceLength, getContentLength(listView._canvas));
                });
            }

            var containerHeight = 100,
                containerWidth = 100,
                listViewHeight = 500,
                itemCount = 100;

            test(new WinJS.UI.ListLayout(), containerHeight * itemCount).then(function () {
                var itemsPerColumn = Math.floor(listViewHeight / containerHeight),
                    columnCount = Math.ceil(itemCount / itemsPerColumn);
                return test(new WinJS.UI.GridLayout(), containerWidth * columnCount);
            }).done(complete);
        }

        // Verifies that when a renderer returns an element with no size for stage 1,
        // the layout measures the stage 2 item instead. This is a feature which makes
        // us backwards compatible with Win8.
        testMeasuringContainerWithZeroSizedPlaceholder(complete) {
            function renderer(itemPromise) {
                var element = document.createElement("div");
                return {
                    element: element,
                    renderComplete: itemPromise.then(function (item) {
                        element.textContent = item.data.title;
                        element.style.height = element.style.width = "100px";
                    })
                };
            }

            var itemCount = 100,
                itemDataSource = Helper.createTestDataSource(null, initData(itemCount), false),
                listView = new WinJS.UI.ListView(document.getElementById("LayoutTest"), {
                    itemDataSource: itemDataSource,
                    itemTemplate: renderer
                });

            Helper.ListView.waitForReady(listView)().done(function () {
                var container = <HTMLElement>listView.element.querySelector(".win-container");
                LiveUnit.Assert.areNotEqual(null, container, "No win-containers were rendered");
                LiveUnit.Assert.areEqual(100, container.offsetHeight, "win-container has incorrect offsetHeight");
                LiveUnit.Assert.areEqual(100, container.offsetWidth, "win-container has incorrect offsetWidth");
                complete();
            });
        }

        // Verifies that GridLayout's layout can be canceled while the default item info function
        // is in the middle of measuring.
        // Regression test for WinBlue#281129.
        testCancelationWithDefaultItemInfo(complete) {
            if (!Helper.Browser.supportsCSSGrid) {
                LiveUnit.LoggingCore.logComment("Cellspanning not supported on this platform.");
                complete();
                return;
            }

            Helper.initUnhandledErrors();

            var pattern = "bmmmssssss",
                itemSizesSimple = {
                    b: { width: 400, height: 600 },
                    m: { width: 200, height: 200 },
                    s: { width: 300, height: 100 }
                },
                element = document.getElementById("LayoutTest");
            element.style.width = "1000px";
            element.style.height = "680px";

            function groupInfo(group) {
                return { enableCellSpanning: true, cellWidth: 100, cellHeight: 100 };
            }

            function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div"),
                        size = itemSizesSimple[pattern[item.index % pattern.length]];
                    element.textContent = item.data.title;
                    element.style.height = size.height + "px";
                    element.style.width = size.width + "px";

                    return element;
                });
            }

            var itemCount = 100,
                list = new WinJS.Binding.List(initData(itemCount)),
                layout = new GridLayout({ groupInfo: groupInfo }),
                measureElements = layout._measureElements;
            layout._measureElements = function () {
                // Schedule a job to interrupt the measuring done by the default item info function.
                // The measuring is scheduled by _measureElements so our job should run first.
                WinJS.Utilities.Scheduler.schedule(function () {
                    list.dataSource.beginEdits();
                    list.dataSource.insertAtEnd(null, { title: "New Item" });
                    list.dataSource.endEdits();
                }, WinJS.Utilities.Scheduler.Priority.max);

                layout._measureElements = measureElements;
                return layout._measureElements();
            };
            var listView = new WinJS.UI.ListView(element, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: layout
            });

            Helper.ListView.waitForReady(listView)().
                then(function () {
                    checkTile(listView, itemSizesSimple, 0, 0, 0, "b");
                    checkTile(listView, itemSizesSimple, 1, 400, 0, "m");
                    checkTile(listView, itemSizesSimple, 2, 400, 200, "m");
                    checkTile(listView, itemSizesSimple, 3, 400, 400, "m");
                    checkTile(listView, itemSizesSimple, 4, 600, 0, "s");
                    checkTile(listView, itemSizesSimple, 5, 600, 100, "s");
                    return Helper.validateUnhandledErrorsOnIdle();
                }).
                done(complete);
        }



    };
    
    var disabledTestRegistry = {
        testDefaultItemsContainerMargins: Helper.BrowserCombos.allButIE11
    };
    Helper.disableTests(LVLayoutTests, disabledTestRegistry);

}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ListLayoutTests");
LiveUnit.registerTestClass("WinJSTests.UniformGridLayoutTests");
LiveUnit.registerTestClass("WinJSTests.LVLayoutTests");

if (Helper.Browser.supportsCSSGrid) {
    LiveUnit.registerTestClass("WinJSTests.GroupedGrid.GroupedGridLayoutTests");
    LiveUnit.registerTestClass("WinJSTests.CellSpanning.CellSpanningGridLayoutTests");
}