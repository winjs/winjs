// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../ListViewIntegration/globals.ts" />


module Helper.ListView.Utils {

    "use strict";

    var commonUtils = Helper;
    var testCount = 0;

    export function createListViewControl(placeholderId, controlType, direction, optionsVal) {
        /// <summary>
        ///     Attaches a listview control with specified options to the Listview placeholder object.  Returns a Listview Control object
        /// </summary>
        /// <param name="placeholderId" type="String">
        ///     Placeholder element Id.
        /// </param>
        /// <param name="controlType" type="String">
        ///     The string value representing the control type of the listview
        /// </param>
        /// <param name="direction" type="String">
        ///     The string value representing the direction attribute applied to the listview DIV
        /// </param>
        /// <param name="optionsVal" type="Object">
        ///     The options parameters passed to the listview constructor to initialize the listview control
        /// </param>
        /// <returns type="Object"/>

        Helper.ListView.Utils.logTestComment("Initialize Listview ...");

        // Find Div to attach to
        var listviewContainer = (placeholderId) ? document.getElementById(placeholderId) : null;

        // Set Direction of Listview
        if (direction && direction != undefined) {
            listviewContainer.style.direction = (direction === Expected.Direction.rtl) ? Expected.Direction.rtl : Expected.Direction.ltr;
        }

        // Parse the options
        var strOptions = "";
        var setOptions: any = {};

        if (optionsVal) {
            for (var param in optionsVal) {
                setOptions[param] = optionsVal[param];
                if (param != 'itemDataSource' && param != 'itemTemplate' && param != 'groupByFunction' && param != 'groupHeaderTemplate' && param !== 'layout') {
                    strOptions = strOptions + param + "=" + setOptions[param] + " ";
                }
                if (param === "itemHeight") {
                    DEF_LISTVIEW_ITEM_HEIGHT = setOptions[param];
                }
                if (param === "itemWidth") {
                    DEF_LISTVIEW_ITEM_WIDTH = setOptions[param];
                }
            }
            populateCssProperties();
            Helper.ListView.Utils.logTestComment("Direction=" + listviewContainer.style.direction + " Width=" + listviewContainer.style.width +
                " Height=" + listviewContainer.style.height + " OffsetWidth=" + listviewContainer.offsetWidth + " OffsetHeight=" + listviewContainer.offsetHeight);
            Helper.ListView.Utils.logTestComment("Listview Options: " + strOptions);
        }

        // Attach the correct control
        var listview;
        switch (controlType) {
            case Expected.Control.List:
                if (!setOptions.layout) {
                    setOptions.layout = new WinJS.UI.ListLayout();
                }
                listview = new WinJS.UI.ListView(listviewContainer, setOptions);
                break;

            case Expected.Control.Grid:
                listview = new WinJS.UI.ListView(listviewContainer, setOptions);
                break;

            default:
                LiveUnit.Assert.fail('Control Type: ' + controlType + ' is not expected.');
                break;
        }

        LiveUnit.Assert.isNotNull(listview, "Cannot attach listview to element with id = " + listviewContainer.id);
        Helper.ListView.Utils.logTestComment("Listview attached to element with id=" + listviewContainer.id);

        return listview;

        function populateCssProperties() {
            /// <summary>
            ///     Retreives properties affecting header layout which are set by CSS classes in ui-dark.css
            /// </summary>

            // get leading margin and group margin
            var testCssDiv = document.getElementById(DEF_TESTCSS_ID);
            if (direction === Expected.Direction.rtl) {
                testCssDiv.setAttribute("class", Expected.ClassName.RTL);
            }
            var temp = document.createElement("div");
            temp.setAttribute("class", Expected.ClassName.GroupHeader);
            testCssDiv.appendChild(temp.cloneNode(true));
            testCssDiv.appendChild(temp.cloneNode(true));

            var leadingMargin;
            var groupMargin;

            if (controlType === Expected.Control.Grid) {
                if (direction === Expected.Direction.rtl) {
                    leadingMargin = getComputedStyle(testCssDiv.children[0]).marginRight;
                    groupMargin = getComputedStyle(testCssDiv.children[1]).marginRight;
                }
                else {
                    leadingMargin = getComputedStyle(testCssDiv.children[0]).marginLeft;
                    groupMargin = getComputedStyle(testCssDiv.children[1]).marginLeft;
                }
            }
            else {
                leadingMargin = getComputedStyle(testCssDiv.children[0]).marginTop;
                groupMargin = getComputedStyle(testCssDiv.children[1]).marginTop;
            }

            if (leadingMargin !== "auto") {
                DEF_LISTVIEW_HEADER_LEADING_MARGIN = parseInt(leadingMargin.match(/[0-9]+/)[0]);
            }
            if (groupMargin !== "auto") {
                DEF_LISTVIEW_HEADER_GROUP_MARGIN = parseInt(groupMargin.match(/[0-9]+/)[0]);
            }
        }
    }

    export function createGroupingFunction() {
        /// <summary>
        ///     Creates a grouping function to vary test data.
        /// </summary>
        /// <param name="numItems" type="Integer">
        ///     Specifies the type of grouping to group data.
        /// </param>
        /// <returns type="Object"/>
        return function (item) {
            var firstLetter = item.data.content.toUpperCase().charAt(0);
            return {
                key: firstLetter,
                data: {
                    header: firstLetter
                }
            };
        };
    }

    export function createGroupKeyFunction() {
        /// <summary>
        ///     Creates a grouping function which returns the group key.
        ///     for the test data
        /// </summary>
        /// <returns type="Object"/>
        return function (item) {
            return item.content.toUpperCase().charAt(0);
        };
    }

    export function createGroupDataFunction() {
        /// <summary>
        ///     Creates a grouping function to return test group data.
        /// </summary>
        /// <returns type="Object"/>
        return function (item) {
            return {
                header: item.content.toUpperCase().charAt(0)
            };
        };
    }

    export function createTestData(testDataType, varyingFunction) {
        /// <summary>
        ///     Creates a set of dummy data for testing with optional parameters to specify the number of items, data type, variable size items function.
        /// </summary>
        /// <param name="testDataType" type="String">
        ///     OPTIONAL - Specifies the type of data to populate the listview with
        /// </param>
        /// <param name="varyingFunction" type="Function">
        ///     OPTIONAL - This parameter can be used as the varying function for data
        /// </param>
        /// <returns type="Object"/>

        // Setup Data
        var testData = [];
        for (var i = 0; i < DEF_TOTAL_ITEMS; i++) {

            // Always keep tile: "Tile" + i, its the only way to ensure we know which tile we are looking at.
            switch (testDataType) {
                case Expected.Items.GroupedContent:
                    testData.push({ title: "Tile" + i, content: varyingFunction(i, DEF_TOTAL_ITEMS) + "Content" + i, content2: varyingFunction(i, DEF_TOTAL_ITEMS) + "Content2_" + i });
                    break;
                case Expected.Items.VariableSize:
                    testData.push({ title: "Tile" + i, content: "Content" + i + "Content" + i + "Content" + i + "Content" + i, itemHeight: varyingFunction(i), itemWidth: varyingFunction(i) });
                    break;
                case Expected.Items.Default:
                default:
                    testData.push({ title: "Tile" + i, content: "Content" + i + "Content" + i + "Content" + i + "Content" + i });
                    break;
            }
        }

        return testData;
    }

    export function createGroupHeaderRenderer(rendererType?) {
        /// <summary>
        ///     Returns an Item Manager compatible group header renderer object for use with the IM.
        /// </summary>
        /// <returns type="Object"/>
        var placeholder = document.getElementById(DEF_LISTVIEWCONTAINER_ID);
        var direction = document.getElementById(DEF_LISTVIEWCONTAINER_ID).style.direction;
        var itemTemplate = null;
        switch (rendererType) {
            case Expected.GroupHeader.GroupByAlphabetContent:
                itemTemplate = function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var result = document.createElement("div");
                        result.id = "header_" + (item.data.header.charCodeAt(0) - 65);
                        result.style.display = "block";
                        result.style.width = DEF_LISTVIEW_HEADER_WIDTH + "px";
                        result.style.height = DEF_LISTVIEW_HEADER_HEIGHT + "px";
                        result.style.fontSize = DEF_LISTVIEW_HEADER_FONT_SIZE + "px";
                        var child = document.createElement("div");
                        child.innerHTML = item.data.header;
                        result.appendChild(child);

                        return result;
                    });
                };
                break;
            case Expected.GroupHeader.GroupByAlphabetContent2:
                itemTemplate = function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var result = document.createElement("div");
                        result.id = "header_" + (item.data.header.charCodeAt(0) - 65);
                        result.style.display = "block";
                        result.style.width = DEF_LISTVIEW_HEADER_WIDTH + "px";
                        result.style.height = DEF_LISTVIEW_HEADER_HEIGHT + "px";
                        result.style.fontSize = DEF_LISTVIEW_HEADER_FONT_SIZE + "px";
                        result.style.backgroundColor = "red";
                        var child = document.createElement("div");
                        child.innerHTML = item.data.header;
                        result.appendChild(child);

                        return result;
                    });
                };
                break;
            default:
                itemTemplate = function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("button");
                        element.id = item.data.title;
                        WinJS.Utilities.addClass(element, ".win-interactive");
                        element.style.width = item.data.itemWidth;
                        element.style.height = item.data.itemHeight;
                        element.style.backgroundColor = "red";
                        element.innerHTML = "<div>" + item.data.title + "</div>";
                        return element;
                    });
                };
                //LiveUnit.Assert.fail("Group Header Renderer must be specified.");
                break;
        }

        return itemTemplate;
    }

    export function createItemRenderer(rendererType?) {
        /// <summary>
        ///     Returns an Item Manager compatible item renderer object for use with the IM.
        /// </summary>
        /// <returns type="Object"/>
        var itemTemplate = null;
        switch (rendererType) {
            case Expected.Items.VariableSize:
                itemTemplate = function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var result = document.createElement("div");
                        result.setAttribute("class", "someClass");
                        result.setAttribute("id", item.data.title);
                        result.style.overflow = "hidden";
                        result.style.width = item.data.itemWidth + "px";
                        result.style.height = item.data.itemHeight + "px";
                        result.innerHTML = "";
                        for (var param in item.data) {
                            if (param !== item.data.itemWidth && param != item.data.itemHeight) {
                                result.innerHTML += "<div>" + item.data[param] + "</div>";
                            }
                        }
                        return result;

                    });
                };
                break;
            default:
                itemTemplate = function (itemPromise) {  //item  //itemPromise
                    return itemPromise.then(function (item) {
                        var result = document.createElement("div");
                        result.setAttribute("class", "someClass");
                        result.setAttribute("id", item.data.title);
                        result.style.overflow = "hidden";
                        result.style.height = DEF_LISTVIEW_ITEM_HEIGHT + "px";
                        result.style.width = DEF_LISTVIEW_ITEM_WIDTH + "px";
                        result.innerHTML = "";
                        for (var param in item.data) {
                            result.innerHTML += "<div>" + param.toString() + ": " + item.data[param] + "</div>";
                        }
                        return result;
                    });
                };
                break;
        }

        return itemTemplate;
    }

    export function initializeDOM() {
        /// <summary>
        ///     Resets the DOM body to initial test state which will be used in the setup of each test.
        /// </summary>
        /// <returns type="Void"/>

        LiveUnit.LoggingCore.logComment("Initialize the DOM to original state");
        SetDefaults();

        testCount = 0;

        // Create outertestdiv
        var outerTestDiv = document.createElement('div');
        outerTestDiv.setAttribute('id', DEF_OUTERTESTDIV_ID);

        var temp = document.createElement('div');
        temp.setAttribute("id", DEF_ITEMRENDERERCONTAINER_ID);
        temp.setAttribute("style", "display:none");
        outerTestDiv.appendChild(temp);

        temp = document.createElement('div');
        temp.setAttribute("id", DEF_LISTVIEWCONTAINER_ID);
        temp.setAttribute("style", "width:" + DEF_LISTVIEW_WIDTH + "px; height:" + DEF_LISTVIEW_HEIGHT + "px");
        outerTestDiv.appendChild(temp);

        temp = document.createElement('div');
        temp.setAttribute("id", DEF_TESTCSS_ID);
        outerTestDiv.appendChild(temp);

        document.body.appendChild(outerTestDiv);
    }

    export function resetDOM() {
        var outerTestDiv = document.getElementById(DEF_OUTERTESTDIV_ID);
        if (outerTestDiv) {
            WinJS.Utilities.disposeSubTree(outerTestDiv);
            document.body.removeChild(outerTestDiv);
        }

        testCount = 0;
        SetDefaults();
    }

    export function runTests(listview, tests) {
        /// <summary>
        ///     Runs tests asynchronously to wait for listview viewState.
        /// </summary>
        /// <param name="listview" type="Object">
        ///     Listview Control in which tests will run against.
        /// </param>
        /// <param name="tests" type="Object">
        ///     Array of tests in which to run in-order, asynchronously.
        /// </param>

        var current = 0;

        Helper.ListView.Utils.logTestComment("Running asynchronous tests");

        function ExecuteWhenLoadingComplete(listview, func) {
            function CheckAndExecute() {
                if (listview.loadingState === "complete") {
                    func();
                }
            }

            listview.addEventListener("loadingstatechanged", LiveUnit.GetWrappedCallback(CheckAndExecute), false);
            CheckAndExecute();
        }

        function ListViewStateChanged() {
            LiveUnit.LoggingCore.logComment("ListView State Changed loadingState=" + listview.loadingState);
            // Iterate through the tests - last test should call signalTestCaseCompleted().
            do {
                if (current < tests.length) {
                    if (listview.loadingState === "complete") {
                        LiveUnit.LoggingCore.logComment("Executing test " + current);
                        // If a test returns true, it updated the listview so this will ensure it waits for the next ready state.
                        if (tests[current++]()) {
                            break;
                        }
                    }
                    // Break out of loop if there are no more tests to complete.  That means the test didn't call signalTestCompleted() and this must be done by other means or the test will timeout.
                } else {
                    break;
                }
            }
            while (listview.loadingState === "complete");
        }

        ExecuteWhenLoadingComplete(listview, ListViewStateChanged);
    }

    export function getSizeOfFirstItem(placeholderId) {
        /// <summary>
        ///     Returns the size dimensions of the first item in the listview.
        /// </summary>

        Helper.ListView.Utils.logTestComment("Get Size Dimensions of first item.");
        var dimensions: any = {};
        var lvItems = document.getElementById(placeholderId).querySelectorAll("div." + Expected.ClassName.Container);
        var lvfirstChild = <HTMLElement>lvItems[0];
        var padding = getTilePadding(Expected.ClassName.Item);

        dimensions.Width = lvfirstChild.offsetWidth - padding.left - padding.right;
        dimensions.Height = lvfirstChild.offsetHeight - padding.top - padding.bottom;

        Helper.ListView.Utils.logTestComment("Dimensions of the first item are: Height=" + dimensions.Height + ", Width = " + dimensions.Width);
        return dimensions;
    }

    export function getIndexOfHeader(listviewHeader): number {
        /// <summary>
        ///     Returns the index of a Tile by searching for the innerHTML string of the first child of the header and converting the character to charCode offset from "A"
        /// </summary>
        /// <returns type="Integer"/>

        return listviewHeader.firstChild.innerHTML.charCodeAt(0) - "A".charCodeAt(0);
    }

    export function getIndexOfTile(listviewItem) {
        /// <summary>
        ///     Returns the index of a Tile by searching for the Tile{{index}} string.
        /// </summary>
        /// <returns type="Integer"/>

        return parseInt(listviewItem.querySelector(".someClass").id.match(/[0-9]+/)[0], 10);
    }

    export function getVisibleElements(listview, fullyVisible?) {
        /// <summary>
        ///   For a given listview, find all elements in the visible range by walking the DOM
        ///   Sorted in language order
        /// </summary>

        //accept both listview element and wincontrol:
        listview = listview.winControl || listview;
        var listviewEl = listview.element;
        var computedListviewStyles = getComputedStyle(listviewEl);
        var isRtl = (computedListviewStyles.direction === "rtl");
        var listviewRect = listviewEl.getBoundingClientRect();

        // get all items in the DOM - can't rely on order
        var items = listviewEl.querySelectorAll(".win-container");
        var visibleElementList = [];
        var visibleTest = fullyVisible ? function fullyVisibleTest(elementRect) {
            return (elementRect.left >= listviewRect.left && elementRect.right <= listviewRect.right && elementRect.top >= listviewRect.top && elementRect.bottom <= listviewRect.bottom);
        } : function partiallyVisibleTest(elementRect) {
                return (elementRect.right > listviewRect.left && elementRect.left < listviewRect.right && elementRect.bottom > listviewRect.top && elementRect.top < listviewRect.bottom);
            };
        for (var i = 0; i < items.length; i++) {
            var element = items[i];
            element.rect = element.getBoundingClientRect();

            //get only the items in view
            if (visibleTest(element.rect)) {
                visibleElementList.push(element);
            }
        }

        if (!isRtl) {
            // default (LTR) case
            //search for top-left most item with right > listview left and bottom > listview top

            //sorting by left and top - this works for both grid and list
            visibleElementList.sort(function (a, b) {
                if (a.rect.left < b.rect.left) {
                    return -1;
                } else if (b.rect.left === a.rect.left) {
                    if (a.rect.top < b.rect.top) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else {
                    return 1;
                }
            });

            //visibleElementList.forEach(function (item) {
            //    console.log("r: " + item.rect.right + " b: " + item.rect.bottom);
            //});

        } else {
            // RTL case
            //sorting by right and top - this works for both grid and list
            visibleElementList.sort(function (a, b) {
                if (a.rect.right < b.rect.right) {
                    return -1;
                } else if (b.rect.right === a.rect.right) {
                    if (a.rect.top < b.rect.top) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else {
                    return 1;
                }
            });
        }

        return visibleElementList;
    }

    export function getFirstVisibleElement(listview, fullyVisible?) {
        /// <summary>
        ///   For a given listview, find the first visible element by walking the DOM
        /// </summary>

        var listviewEl = listview.element || listview;
        var visibleElementList = Helper.ListView.Utils.getVisibleElements(listview, fullyVisible);

        //the first item is the first visible
        return visibleElementList[0];
    }

    export function getLastVisibleElement(listview, fullyVisible?) {
        /// <summary>
        ///   For a given listview, find the first visible element by walking the DOM
        /// </summary>

        var listviewEl = listview.element || listview;
        var visibleElementList = Helper.ListView.Utils.getVisibleElements(listview, fullyVisible);

        //the last item is last visible
        return visibleElementList[visibleElementList.length - 1];
    }

    function getTilePadding(className) {
        /// <summary>
        ///     Verifies the contents of a listview item by comparing against a listview item created with the original data and the item template.
        /// </summary>
        var padding = { bottom: 0, left: 0, top: 0, right: 0 };

        switch (className) {
            case Expected.ClassName.Item:
                padding.bottom = 0;
                padding.left = 0;
                padding.top = 0;
                padding.right = 0;
                break;
            case Expected.ClassName.GroupHeader:
                padding.bottom = 10;
                padding.left = 10;
                padding.top = 10;
                padding.right = 10;
                break;
            default:
                LiveUnit.Assert.fail("Failed in ListviewUtils.getTilePadding(). Verify that " + className + " is handled.");
                break;
        }


        return padding;
    }

    export function logTestStart(message) {
        LiveUnit.LoggingCore.logComment("Test " + testCount + ": " + message);
        testCount++;
    }

    export function logTestComment(message) {
        LiveUnit.LoggingCore.logComment("... " + message);
    }

    export function logExceptionComment(message) {
        LiveUnit.LoggingCore.logComment("... Exception: " + message);
    }

    export function waitForReady(listView, delay?) {
        return function (x?) {
            return new WinJS.Promise(function (c, e, p) {
                function waitForReady_handler() {
                    LiveUnit.LoggingCore.logComment("waitForReady_handler, listView.loadingState:" + listView.loadingState);
                    if (listView.loadingState === "complete") {
                        listView.removeEventListener("loadingstatechanged", waitForReady_handler, false);
                        waitForReady_work();
                    }
                }

                function waitForReady_work() {
                    if (listView._versionManager.locked) {
                        listView._versionManager.unlocked.then(waitForReady_work);
                    } else if (listView.loadingState !== "complete") {
                        listView.addEventListener("loadingstatechanged", waitForReady_handler, false);
                    } else {
                        WinJS.Utilities.Scheduler.schedulePromiseIdle(null, "ListViewWaitForReadyComplete").then(function () {
                            c(x);
                        });
                    }
                }

                function waitForReady_start() {
                    WinJS.Utilities.Scheduler.schedulePromiseIdle(null, "ListViewWaitForReady").then(waitForReady_work);
                }

                LiveUnit.LoggingCore.logComment("listView.loadingState: " + listView.loadingState);
                if (delay) {
                    if (delay < 0) {
                        WinJS.Utilities._setImmediate(waitForReady_start);
                    } else {
                        setTimeout(waitForReady_start, delay);
                    }
                } else {
                    waitForReady_work();
                }
            });
        };
    }

    //helper function to validate focusedItem with expectedItem
    export function validateCurrentItemFocus(listView, expectedFocusItemIndex, type) {
        type && LiveUnit.Assert.areEqual(type, listView.currentItem.type, "Wrong item type has focus");
        LiveUnit.Assert.areEqual(expectedFocusItemIndex, listView.currentItem.index, "Wrong index has focus");
        LiveUnit.Assert.areEqual(listView.elementFromIndex(expectedFocusItemIndex), listView.elementFromIndex(listView.currentItem.index), "Focused item does not match expected focus");
    }

    export function getGroupListViewForLayout(layout, direction) {
        /// <signature>
        /// <summary>
        /// Get listview of 100 items with 20 groups for your layout
        /// </summary>
        /// </signature>
        var testItemRenderer = Helper.ListView.Utils.createItemRenderer();
        var testHeaderRenderer = Helper.ListView.Utils.createGroupHeaderRenderer();

        function groupKey(item) {
            return item.groupKey;
        }

        function groupData(item) {
            return { key: groupKey(item), title: groupKey(item) };
        }

        var a = "A".charCodeAt(0),
            items = [];

        for (var i = 0; i < 100; ++i) {
            items[i] = {
                title: "Item " + i,
                groupKey: String.fromCharCode(a + Math.floor(i / 5))
            };
        }
        var data = new WinJS.Binding.List(items).createGrouped(groupKey, groupData);
        var options = {
            itemHeight: Expected.Height.Medium,
            itemWidth: Expected.Width.Medium,
            layout: new WinJS.UI[layout],
            itemDataSource: data.dataSource,
            itemTemplate: testItemRenderer,
            groupDataSource: data.groups.dataSource,
            groupHeaderTemplate: testHeaderRenderer
        };
        if (direction != Expected.Direction.ltr && direction != Expected.Direction.rtl) {
            direction = Expected.Direction.ltr
            }
        return Helper.ListView.Utils.createListViewControl(DEF_LISTVIEWCONTAINER_ID, Expected.Control.Grid, direction, options);
    }

}
