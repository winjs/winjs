// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
// Abstract:
//
//   Verify functions for testing the List View
//
// Filename: listviewverify.js
//-----------------------------------------------------------------------------
"use strict";

function ListViewVerify() {
}

ListViewVerify.prototype = (function () {
    // ---------------------------------------------------------------------------------------------------------
    // Private Functions & Variables
    // ---------------------------------------------------------------------------------------------------------
    var lvUtils = new ListViewUtils();
    var commonUtils = new CommonUtils();

    // ---------------------------------------------------------------------------------------------------------
    // Public Functions
    // ---------------------------------------------------------------------------------------------------------
    return {
        verifyGetOptions: function ListViewVerify_verifyGetOptions(placeholderId, controlType, expectedOptions, variableSize) {
            /// <summary>
            ///     Verifies the options() function retreives the expected option properties. All parameters are required
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="expectedOptions" type="Object">
            ///     The expected options to verify against.
            /// </param>
            /// <returns type="Void"/>

            lvUtils.logTestComment("Verify Get Options");
            lvUtils.logTestComment("Control Type: " + controlType);

            var defaultOptions,
                strOptions = "";

            switch (controlType) {
                case Expected.Control.List:
                    defaultOptions = new ListDefaults();
                    break;
                case Expected.Control.Grid:
                    defaultOptions = new GridDefaults();
                    break;
            }
            LiveUnit.Assert.isNotNull(defaultOptions, "Unknown controlType: " + controlType);

            var noLoggingParams = [
                'itemDataSource',
                'itemTemplate',
                'groupDataSource',
                'groupHeaderTemplate',
                'layout'
            ];

            var ignoredParams = [
                //reorder is disabled for beta, remove this from array when made public again
                'reorderable',
                'itemHeight',
                'itemWidth',
                'layout',
                'itemDataSource'
            ];

            // Get default parameter for values not specified in expectedOptions
            for (var param in defaultOptions) {
                // Only inspect the parameters not specified in ignore
                if (ignoredParams.indexOf(param) === -1) {
                    // If the default parameter is not present in the expected options, add it
                    if (expectedOptions[param] === undefined) {
                        expectedOptions[param] = defaultOptions[param];
                    }

                    // If the param is not in noLoggingParams, add it to the log
                    if (noLoggingParams.indexOf(param) === -1) {
                        strOptions += param + " = " + expectedOptions[param] + " ";
                    }
                }
            }

            lvUtils.logTestComment("Expected options: " + strOptions);

            var listview = document.getElementById(placeholderId).winControl,
                strOptions = "";

            // Loop through expectedOptions and validate against listview[param]
            for (var param in expectedOptions) {
                if (ignoredParams.indexOf(param) === -1) {
                    var verifyParam;
                    if (param === "horizontal") {
                        verifyParam = (listview.layout.orientation === "horizontal");
                    } else {
                        verifyParam = (param === "groupHeaderPosition") ? listview.layout[param] : listview[param];
                    }
                    if (!utilities.isPhone || (param !== "selectionMode" && expectedOptions[param] !== "single")) {
                        LiveUnit.Assert.areEqual(expectedOptions[param], verifyParam, "Expected parameter of " + param + ": " + expectedOptions[param] + " Actual: " + verifyParam);
                    }
                    if (noLoggingParams.indexOf(param) === -1) {
                        strOptions += param + " = " + expectedOptions[param] + " ";
                    }
                }
            }
            lvUtils.logTestComment("Actual - Options: " + strOptions);
        },

        verifySetOptions: function ListViewVerify_verifySetOptions(placeholderId, controlType, setOptions) {
            /// <summary>
            ///     Verifies the options() function sets the option properties passed within the parameters. All parameters are optional.
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="controlType" type="String">
            ///     The string value representing the listview control type
            /// </param>
            /// <param name="setOptions" type="Object">
            ///     The object containing the listview options
            /// </param>
            /// <returns type="Void"/>

            lvUtils.logTestComment("Verify Set Options");

            var listview = document.getElementById(placeholderId).winControl;

            var expectedOptions = {}; // oldOptions;

            // Populate expected options from set options
            for (var param in setOptions) {
                expectedOptions[param] = setOptions[param];
            }

            var strOptions = "";
            for (var param in expectedOptions) {
                if (param != 'dataSource' && param != 'itemRenderer' && param != 'groupByFunction' && param != 'groupRenderer' && param != 'layout') {
                    strOptions += param + "=" + expectedOptions[param] + " ";
                }
            }

            lvUtils.logTestComment("Expect - Options: " + strOptions);

            // Set options
            for (var param in setOptions) {
                listview[param] = setOptions[param];
            }


            // Verify the options
            var listviewVerify = document.getElementById(placeholderId).winControl;

            for (var param in expectedOptions) {
                if (param != 'dataSource' && param != 'layout') {
                    LiveUnit.Assert.areEqual(expectedOptions[param], listviewVerify[param], "Value retrieved from listview." + param + " is not as expected.");
                }
            }

            // reset
            expectedOptions = {};

            //this.verifyGetOptions(placeholderId, controlType, expectedOptions);
        },

        verifyLayout: function ListViewVerify_verifyLayout(placeholderId, controlType, options, varyingFunction) {
            /// <summary>
            ///     Verifies the layout of items given the set of options parameters.  All parameters are required.
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="controlType" type="String">
            ///     The string value representing the control type of the listview
            /// </param>
            /// <param name="options" type="Object">
            ///     The object containing the listview options
            /// </param>
            /// <returns type="Void"/>

            lvUtils.logTestComment("Verify Item Layout");

            var listviewContainer = document.getElementById(placeholderId);
            var direction = (listviewContainer.style.direction.length === 0) ? Expected.Direction.ltr : listviewContainer.style.direction;
            var listviewChildren = listviewContainer.querySelectorAll("div." + Expected.ClassName.Container);
            var win8uiCssEnabled = commonUtils.isCssLoaded(WIN8UICSS);

            // TODO: Need to know the virtualization algorithm... For now.. something is wrong if childNodes is 0
            if (listviewChildren.length === 0) {
                LiveUnit.Assert.fail("There should be items in the listview.");
            }

            for (var i = 0, count = listviewChildren.length; i < count; i++) {
                //find Item's "index"
                var itemIndex = lvUtils.getIndexOfTile(listviewChildren[i]);
                var tileLocation = lvUtils.getExpectedTileLocation(placeholderId, controlType, itemIndex, options, direction, win8uiCssEnabled, varyingFunction);

                //                if (direction === 'ltr') {
                //                    tileLocation.left = tileLocation.left + 4;
                //                }
                //                else if (direction === 'rtl') {
                //                    tileLocation.left = tileLocation.left - 4;
                //                }
                //
                // verify against DOM values
                var itemUnderTest = listviewChildren[i];


                var message = "";

                if (controlType !== Expected.Control.List) {
                    LiveUnit.Assert.areEqual(tileLocation.left + "px", itemUnderTest.style.left, 'listview-item ' + itemIndex + ' style.left is not correct.');
                    LiveUnit.Assert.areEqual(tileLocation.top + "px", itemUnderTest.style.top, 'listview-item ' + itemIndex + ' style.top is not correct.');


                    message = itemIndex + " Left=" + itemUnderTest.style.left + " Top=" + itemUnderTest.style.top + " ";
                }

                LiveUnit.Assert.areEqual(tileLocation.offsetHeight, itemUnderTest.offsetHeight, 'listview-item ' + itemIndex + ' offsetHeight is not correct.');
                LiveUnit.Assert.areEqual(tileLocation.offsetWidth, itemUnderTest.offsetWidth, 'listview-item ' + itemIndex + ' offsetWidth is not correct.');

                message += "offsetHeight=" + itemUnderTest.offsetHeight + " offsetWidth=" + itemUnderTest.offsetWidth;

                lvUtils.logTestComment("listview-item:" + message);
            }

            if (controlType === Expected.Control.VirtualizedGrid && options.groupByFunction) {
                var listviewHeaders = listviewContainer.querySelectorAll("div." + Expected.ClassName.GroupHeader);

                for (var i = 0, count = listviewHeaders.length; i < count; i++) {
                    var headerIndex = lvUtils.getIndexOfHeader(listviewHeaders[i]);
                    var headerLocation = lvUtils.getExpectedHeaderLocation(placeholderId, headerIndex, options, direction, win8uiCssEnabled, controlType);

                    var headerUnderTest = listviewHeaders[i];
                    var message = "";

                    LiveUnit.Assert.areEqual(headerLocation.left + "px", headerUnderTest.offsetLeft + "px", 'listview-groupHeader ' + headerIndex + ' style.left is not correct.');
                    LiveUnit.Assert.areEqual(headerLocation.top + "px", headerUnderTest.offsetTop + "px", 'listview-groupHeader ' + headerIndex + ' style.top is not correct.');
                    LiveUnit.Assert.areEqual(headerLocation.offsetHeight, headerUnderTest.offsetHeight, 'listview-groupHeader ' + headerIndex + ' offsetHeight is not correct.');
                    LiveUnit.Assert.areEqual(headerLocation.offsetWidth, headerUnderTest.offsetWidth, 'listview-groupHeader ' + headerIndex + ' offsetWidth is not correct.');

                    message = headerIndex + " Left=" + headerUnderTest.style.left + " Top=" + headerUnderTest.style.top + " offsetHeight=" + headerUnderTest.offsetHeight + " offsetWidth=" + headerUnderTest.offsetWidth;

                    lvUtils.logTestComment("listview-groupHeader:" + message);
                }
            }
        },

        verifyItemContents: function ListViewVerify_verifyItemContents(itemToCompare, itemTestData, itemRenderer) {
            /// <summary>
            ///     Verifies the contents of a listview item by comparing against a listview item created with the original data and the item template.
            /// </summary>
            /// <param name="itemToCompare" type="Object">
            ///     The DOM element representing the listview item.
            /// </param>
            /// <param name="itemTestData" type="Object">
            ///     The raw data of the item passed to the dataSource options parameter.
            /// </param>
            /// <param name="itemRenderer" type="String">
            ///     The string value representing the ID attribute of a DOM element containing the item template.
            /// </param>
            /// <returns type="Void"/>

            lvUtils.logTestComment("Verify the Contents of listview-item.");

            var itemInnerHTML = "";

            // find the innerHTML of the items
            //  itemInnerHTML = itemRenderer({ data: itemTestData }).innerHTML.replace(/[\n\r\t]/g, "");
            itemRenderer(WinJS.Promise.wrap({ data: itemTestData })).then(function (domElement) {
                itemInnerHTML = domElement.innerHTML.replace(/[\n\r\t]/g, "");
            });

            itemToCompare = itemToCompare.innerHTML.replace(/[\n\r\t]/g, "");
            itemToCompare = itemToCompare.replace(/ tabIndex="[-]*[a-z]*[0-9]*"/g, "");
            itemToCompare = itemToCompare.replace(/ preservedTabIndex="[-]*[a-z]*[0-9]*"/g, "");

            // compare
            LiveUnit.Assert.areEqual(itemInnerHTML, itemToCompare, "The contents of this item are not equal to the node generated from provided test data and item renderer.");

            var message = "Raw Data: ";
            for (var param in itemTestData) {
                message += param + " = " + itemTestData[param] + " ";
            }

            lvUtils.logTestComment(message);
            lvUtils.logTestComment("innerHTML: " + itemToCompare);
        },

        verifyFirstVisible: function ListViewVerify_verifyFirstVisible(placeholderId, controlType, scrollLocation, testIndex, options, win8uiCssEnabled) {
            /// <summary>
            ///     Verifies the first visible item of a listview by comparing against a listview item created with the original data and the item template.
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="scrollLocation" type="Integer">
            ///     The integer value of the scroll location of the scrollable region of the listview
            /// </param>
            /// <param name="testIndex" type="Integer">
            ///     The index of the item to check as first visible.
            /// </param>
            /// <param name="options" type="Object">
            ///     The options object returned by a listview control.
            /// </param>
            /// <param name="win8uiCssEnabled" type="Boolean">
            ///     The boolean value determining the use of win8ui.css styles
            /// </param>
            /// <returns type="Void"/>

            var firstVisibleIndex = lvUtils.getFirstVisibleIndex(placeholderId, controlType, scrollLocation, options, win8uiCssEnabled);

            // TODO: Update the expected location
            LiveUnit.Assert.areEqual(firstVisibleIndex, testIndex, "First visible item is not as expected.");
            lvUtils.logTestComment("First Visible Item: " + testIndex);
        },

        verifyLastVisible: function ListViewVerify_verifyLastVisible(placeholderId, controlType, scrollLocation, testIndex, options, win8uiCssEnabled) {
            /// <summary>
            ///     Verifies the last visible item of a listview by comparing against a listview item created with the original data and the item template.
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="scrollLocation" type="Integer">
            ///     The integer value of the scroll location of the scrollable region of the listview
            /// </param>
            /// <param name="testIndex" type="Integer">
            ///     The index of the item to check as first visible.
            /// </param>
            /// <param name="options" type="Object">
            ///     The options object returned by a listview control.
            /// </param>
            /// <param name="win8uiCssEnabled" type="Boolean">
            ///     The boolean value determining the use of win8ui.css styles
            /// </param>
            /// <returns type="Void"/>

            var lastVisibleIndex = lvUtils.getLastVisibleIndex(placeholderId, controlType, scrollLocation, options, win8uiCssEnabled);

            // TODO: Update the expected location
            LiveUnit.Assert.areEqual(lastVisibleIndex, testIndex, "Last visible item is not as expected.");
            lvUtils.logTestComment("Last Visible Item: " + testIndex);
        },

        verifyScrollLocation: function ListViewVerify_verifyScrollLocation(placeholderId, controlType, index, options, variableSize) {
            /// <summary>
            ///     Verifies the scroll location of the listview when item at the given index is scrolled to.
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="index" type="Integer">
            ///     The index of the item to check as scrolled to.
            /// </param>
            /// <param name="options" type="Object">
            ///     The options object returned by a listview control.
            /// </param>
            /// <returns type="Void"/>

            // given size of each tile, calculate tile location
            ;

            var listviewContainer = document.getElementById(placeholderId);
            var direction = (listviewContainer.style.direction.length === 0) ? Expected.Direction.ltr : listviewContainer.style.direction;
            var win8uiCssEnabled = commonUtils.isCssLoaded(WIN8UICSS);
            var tileLocation = lvUtils.getExpectedTileLocation(placeholderId, controlType, index, options, direction, win8uiCssEnabled, variableSize);
            var scrollDimension;
            var scrollLocation;
            var axisLength;

            switch (controlType) {
                case Expected.Control.List:
                    scrollDimension = 'scrollTop';
                    scrollLocation = listviewContainer.firstChild.nextSibling.scrollTop;
                    axisLength = listviewContainer.firstChild.nextSibling.firstChild.offsetHeight;

                    // compare the scroll location with the tileLocation
                    if (tileLocation.top > axisLength) {
                        LiveUnit.Assert.fail('DOM structure is not as expected. Tile Top attribute is greater than the offsetHeight of the scroll region.');
                    }
                    else if (tileLocation.top > (axisLength - listviewContainer.offsetHeight)) {
                        LiveUnit.Assert.areEqual(axisLength - listviewContainer.offsetHeight, scrollLocation, 'Tile that is in the very last visible viewport page of the listview has a scroll location equal to the value of Tile.Top on the top row of the last page.');
                    }
                    else {
                        LiveUnit.Assert.areEqual(tileLocation.top, scrollLocation, 'Tile Location should be equal to the Tile.style.top property.');
                    }
                    break;
                case Expected.Control.Grid:

                    lvUtils.logTestComment("tileLocation(l,r,t,b):" + tileLocation.left + " ," + tileLocation.right + " ," + tileLocation.top + " ," + tileLocation.bottom);
                    scrollDimension = 'scrollLeft';
                    scrollLocation = WinJS.Utilities.getScrollPosition(listviewContainer.firstChild.nextSibling).scrollLeft;
                    axisLength = listviewContainer.firstChild.nextSibling.firstChild.offsetWidth;

                    lvUtils.logTestComment("scrollLocation:" + scrollLocation);
                    lvUtils.logTestComment("Axis Length:" + axisLength);
                    lvUtils.logTestComment("offsetwidth:" + listviewContainer.firstChild.nextSibling.offsetWidth);
                    // compare the scroll location with the tileLocation
                    if (tileLocation.left > axisLength) {
                        LiveUnit.Assert.fail('DOM structure is not as expected. Tile Top attribute is greater than the offsetHeight of the scroll region.');
                    }
                    else if (tileLocation.left > (axisLength - listviewContainer.firstChild.nextSibling.offsetWidth)) {
                        LiveUnit.Assert.areEqual(axisLength - listviewContainer.firstChild.nextSibling.offsetWidth, scrollLocation, 'Tile that is in the very last visible viewport page of the listview has a scroll location equal to the value of Tile.Left on the top row of the last page.');
                    }
                    else {
                        LiveUnit.Assert.areEqual(tileLocation.left, scrollLocation, 'Tile Location should be equal to the Tile.style.left property.');
                    }
                    break;
                default:
                    LiveUnit.Assert.fail('Layout has not been implemented.');
                    break;
            }

            lvUtils.logTestComment('Checking ScrollTo: \'' + index + '\'. ' + scrollDimension + ': ' + scrollLocation);
        },

        verifySelection: function ListViewVerify_verifySelection(placeholderId, controlType, expectedSelectedArray, options) {
            /// <summary>
            ///     Verifies the selected items programmatically by calling selection() and in DOM by verifying items with classname set to 'win-listview-item-selected'
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="expectedSelectedArray" type="Array">
            ///     Expected array of integers representing the indexes of selected items in the current DOM.  To check for no selected items pass null.
            /// </param>
            /// <param name="options" type="Object">
            ///     The options object returned by a listview control.
            /// </param>
            /// <returns type="Void"/>


            if (expectedSelectedArray === null) {
                // checking for no selection
                expectedSelectedArray = [];
            }
            else if (!commonUtils.isArray(expectedSelectedArray)) {
                // checking for single integer selection
                expectedSelectedArray = [expectedSelectedArray];
            }

            // Selected indexes from selection() API
            var listview = document.getElementById(placeholderId).winControl;
            var selectedIndexes = listview.selection.getIndices();

            // Find indexes of all selected tiles in DOM
            // Selected children have 'win-selected' class set to it
            var placeholder = document.getElementById(placeholderId);


            var selectedChildren = placeholder.querySelectorAll("div." + Expected.ClassName.Selected);
            LiveUnit.LoggingCore.logComment("no of selected items=" + selectedChildren.length);
            var actualSelectedArray = [];
            for (var i = 0; i < selectedChildren.length; i++) {
                var index = parseInt(selectedChildren[i].firstChild.nextSibling.innerHTML.match(/[0-9]+/)[0]);
                LiveUnit.LoggingCore.logComment(index);

                if (index >= 0) {
                    actualSelectedArray[actualSelectedArray.length] = index;
                }
                else {
                    LiveUnit.Assert.fail("Cannot verify selection of negative indexes.");
                }
            }
            options.selectionMode = listview.selectionMode;
            switch (options.selectionMode) {
                case Expected.SelectionMode.None:
                    // no selection
                    LiveUnit.Assert.areEqual(0, selectedChildren.length, "Number of selected items in DOM should be 0 in " + options.selectionMode + " mode.");
                    LiveUnit.Assert.areEqual(0, selectedIndexes.length, "selection() API should return 0 selected indexes in " + options.selectionMode + " mode.");
                    lvUtils.logTestComment("Verified no tiles are selected in " + options.selectionMode + " mode.");

                    break;
                case Expected.SelectionMode.Multi:
                    // 0 to n selection
                    LiveUnit.Assert.areEqual(expectedSelectedArray.length, actualSelectedArray.length, "The number of selected tiles in DOM should be " + expectedSelectedArray.length + " in multiselection mode.");
                    LiveUnit.Assert.areEqual(expectedSelectedArray.length, selectedIndexes.length, "selection() API should return " + expectedSelectedArray.length + " selected indexes in multiselection mode.");
                    lvUtils.logTestComment("Verified " + actualSelectedArray.length + " tiles are selected in multiselection mode.");

                    expectedSelectedArray = expectedSelectedArray.sort(function (a, b) { return a - b });
                    actualSelectedArray = actualSelectedArray.sort(function (a, b) { return a - b });
                    for (var i = 0; i < expectedSelectedArray.length; i++) {
                        LiveUnit.Assert.areEqual(expectedSelectedArray[i], actualSelectedArray[i], "The expected selected Tile does not match the actual set of selected Tiles.");
                        lvUtils.logTestComment("Verified Tile " + actualSelectedArray[i] + " is selected.");
                    }

                    break;
                case Expected.SelectionMode.Single:
                    // 0 to 1 selection
                    LiveUnit.Assert.isTrue(expectedSelectedArray.length <= 1, "Listview in singleselection mode should have only at most one item selected. Expected Array shoul have 0 or 1 selected items.");
                    LiveUnit.Assert.isTrue(actualSelectedArray.length <= 1, "Listview in singleselection mode should have only at most one item selected. Found " + actualSelectedArray.length + " selected items.");
                    LiveUnit.Assert.areEqual(expectedSelectedArray.length, actualSelectedArray.length, "The number of selected tiles in DOM should be " + expectedSelectedArray.length + " in singleselection mode.");
                    LiveUnit.Assert.areEqual(expectedSelectedArray.length, selectedIndexes.length, "selection() API should return " + expectedSelectedArray.length + " selected indexes in singleselection mode.");
                    lvUtils.logTestComment("Verified " + actualSelectedArray.length + " Tiles are selected in singleselection mode.");

                    if (actualSelectedArray.length === 1 && expectedSelectedArray.length === 1) {
                        LiveUnit.Assert.areEqual(expectedSelectedArray[0], actualSelectedArray[0], "The expected selected Tile does not match the actual selected Tile.");
                        lvUtils.logTestComment("Verified Tile " + actualSelectedArray[0] + " is selected.");
                    }

                    break;
                default:
                    LiveUnit.Assert.fail(mode + " is not a supported mode.");
                    break;
            }
        },

        verifyEnsureVisible: function ListViewVerify_verifyEnsureVisible(placeholderId, controlType, testIndex, prevScrollLocation, prevFirstIndex, prevLastIndex, options, win8uiCssEnabled, variableSize) {
            /// <summary>
            ///     Verifies the ensureVisible function is correct by utilizing previous scroll location and index to ensure visible
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="testIndex" type="Integer">
            ///     Expected index to ensure visible
            /// </param>
            /// <param name="prevScrollLocation" type="Integer">
            ///     Previous scroll location, prior to ensure visible call
            /// </param>
            /// <param name="options" type="Object">
            ///     The options object returned by a listview control.
            /// </param>
            /// <param name="win8uiCssEnabled" type="Boolean">
            ///     Boolean value determining if win8ui.css is loaded (affects layout)
            /// </param>
            /// <returns type="Void"/>


            var listviewContainer = document.getElementById(placeholderId);
            var direction = listviewContainer.style.direction;
            var actualScrollLocation = (controlType === Expected.Control.Grid) ? WinJS.Utilities.getScrollPosition(listviewContainer.firstChild.nextSibling).scrollLeft : listviewContainer.firstChild.nextSibling.scrollTop;
            var currFirstIndex = lvUtils.getFirstVisibleIndex(placeholderId, controlType, actualScrollLocation, options, win8uiCssEnabled);
            var currLastIndex = lvUtils.getLastVisibleIndex(placeholderId, controlType, actualScrollLocation, options, win8uiCssEnabled);

            lvUtils.logTestComment("Scroll Location: " + actualScrollLocation);
            lvUtils.logTestComment("Previous Visible Index Range: " + prevFirstIndex + "-" + prevLastIndex);
            lvUtils.logTestComment("Current Visible Index Range: " + currFirstIndex + "-" + currLastIndex);

            var expectedScrollLocation = -1;
            var message = "";

            var testTileLocation = lvUtils.getExpectedTileLocation(placeholderId, controlType, testIndex, options, direction, win8uiCssEnabled, variableSize);

            if (controlType === Expected.Control.Grid) {
                if (testIndex < prevFirstIndex) {
                    expectedScrollLocation = (direction === Expected.Direction.ltr) ? testTileLocation.left : testTileLocation.left - listviewContainer.offsetWidth + testTileLocation.offsetWidth;
                    message = "Tile " + testIndex + " is above the previous viewport. Scroll location: " + expectedScrollLocation;
                }
                else if (testIndex > prevLastIndex) {
                    expectedScrollLocation = (direction === Expected.Direction.ltr) ? testTileLocation.left - listviewContainer.offsetWidth + testTileLocation.offsetWidth : testTileLocation.left;
                    message = "Tile " + testIndex + " is below the previous viewport. Scroll location: " + expectedScrollLocation;
                }
                else {
                    // index is within previous viewport
                    expectedScrollLocation = prevScrollLocation;
                    message = "Tile " + testIndex + " is already in view.  Therefore viewport scroll location should not change. Scroll location: " + expectedScrollLocation;
                }
            }
            else {
                // verticalgrid and list
                if (testIndex < prevFirstIndex) {
                    // index is above previous viewport
                    expectedScrollLocation = testTileLocation.top;
                    message = "Tile " + testIndex + " is above the previous viewport. Scroll location: " + expectedScrollLocation;
                }
                else if (testIndex > prevLastIndex) {
                    // index is below previous viewport
                    expectedScrollLocation = testTileLocation.top + testTileLocation.offsetHeight - listviewContainer.offsetHeight;
                    message = "Tile " + testIndex + " is below the previous viewport. Scroll location: " + expectedScrollLocation;
                }
                else {
                    // index is within previous viewport
                    expectedScrollLocation = prevScrollLocation;
                    message = "Tile " + testIndex + " is already in view.  Therefore viewport scroll location should not change. Scroll location: " + expectedScrollLocation;
                }
            }

            // TODO: Need to be returning the correct TileLocation
            LiveUnit.Assert.areEqual(expectedScrollLocation, actualScrollLocation, message);
            lvUtils.logTestComment(message);
        },

        verifyInteractionClassName: function ListViewVerify_verifyInteractionClassName(placeholderId, interactionMode) {
            /// <summary>
            ///     Verifies the ensureVisible function is correct by utilizing previous scroll location and index to ensure visible
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="interactionMode" type="String">
            ///     Interaction mode of the listview
            /// </param>

            // TODO: class names have changed. Need to update to the latest modes
            return;

            var interactionClassName = "";
            switch (interactionMode) {
                case Expected.SelectionMode.None:
                    interactionClassName = Expected.ClassName.Browse;
                    break;
                case Expected.SelectionMode.Multi:
                    interactionClassName = Expected.ClassName.MultiSelection;
                    break;
                case Expected.SelectionMode.Single:
                    interactionClassName = Expected.ClassName.SingleSelection;
                    break;
                default:
                    LiveUnit.Assert.fail("Layout mode: " + layoutVal + " is not supported.");
                    break;
            }

            var placeholder = document.getElementById(placeholderId);
            var classNames = placeholder.className.split(" ");
            for (var i = 0; i < classNames.length; i++) {
                if (classNames[i] === interactionClassName) {
                    lvUtils.logTestComment("CSS class " + interactionClassName + " is applied to listview at element " + placeholderId);
                    return;
                }
            }

            lvUtils.logTestComment("Applied CSS classes: " + classNames.toString());
            LiveUnit.Assert.fail("Unable to find the correct CSS class for listview at element " + placeholderId);
        },

        verifyGroup: function ListViewVerify_verifyGroup(placeholderId, controlType, groupHeader, group, options, direction) {
            /// <summary>
            ///     Verifies the group function is correct by comparing DOM Element locations and text with given values
            /// </summary>
            /// <param name="placeholderId" type="String">
            ///     Placeholder element Id.
            /// </param>
            /// <param name="groupHeader" type="Object">
            ///     DOM element with classname = win-listview-groupHeader
            /// </param>
            /// <param name="group" type="Object">
            ///     returned object from calling listview.group()
            /// </param>
            /// <param name="options" type="Object">
            ///     The options object returned by a listview control.
            /// </param>
            /// <param name="direction" type="String">
            ///     The direction of the place holder object
            /// </param>

            var expectedOffset = -1;
            var expectedStartIndex;
            var expectedText = groupHeader.firstChild.innerHTML;
            var expectedGroupIndex = expectedText.charCodeAt(0) - "A".charCodeAt(0);
            var placeholder = document.getElementById(placeholderId);
            var win8uiCssEnabled = commonUtils.isCssLoaded(WIN8UICSS);

            // get expected location of startIndex Item
            var expectedStartIndexElement = document.getElementById('Tile' + group.startIndex.toString());
            LiveUnit.Assert.isNotNull(expectedStartIndexElement, "Unable to find first tile in group looking for Element ID='Tile" + group.startIndex.toString() + "'");

            var startTileLocation = {};

            // get expected offset and start tile location
            switch (controlType) {
                case Expected.Control.Grid:
                    expectedOffset = parseInt(groupHeader.style.left.match(/^[0-9]*/)[0]);
                    startTileLocation.top = (options.layout.groupHeaderPosition === 'top') ? groupHeader.offsetHeight : 0;
                    startTileLocation.left = expectedOffset + ((group.startIndex === 0) ? DEF_LISTVIEW_HEADER_LEADING_MARGIN : DEF_LISTVIEW_HEADER_GROUP_MARGIN);

                    if (direction === Expected.Direction.ltr) {
                        if (options.layout.groupHeaderPosition === 'left') {
                            startTileLocation.left += groupHeader.offsetWidth;
                        }
                    }
                    else {
                        if (options.layout.groupHeaderPosition === 'left') {
                            startTileLocation.left += groupHeader.offsetWidth - options.itemWidth;
                        }
                        else {
                            statTileLocation.left -= options.itemWidth;
                        }
                    }
                    break;
                default:
                    LiveUnit.Assert.fail(controlType + " layout is not supported for Groups.");
                    break;
            }

            LiveUnit.Assert.areEqual(groupHeader, group.element, "Group.element is not as expected.");
            LiveUnit.Assert.areEqual(expectedText, group.userData.data.header, "Group.userData.data.header: '" + group.userData.data.header + "' is not as expected.");
            LiveUnit.Assert.areEqual(expectedOffset, group.offset, "Group.offset: '" + group.offset + "' is not as expected.");
            LiveUnit.Assert.areEqual(startTileLocation.left + "px", expectedStartIndexElement.style.left, "startIndex Item.style.left is not as expected.");
            LiveUnit.Assert.areEqual(startTileLocation.top + "px", expectedStartIndexElement.style.top, "startIndex Item.style.top is not as expected.");

            lvUtils.logTestComment("Verified group object. " + "userData.header=" + expectedText + " offset=" + group.offset + " startIndex=" + group.startIndex);
        }
    };
})();
