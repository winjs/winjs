// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
///<reference path="../TestLib/listviewutils.ts" />



module ListViewVerify {
    "use strict";

    // ---------------------------------------------------------------------------------------------------------
    // Private Functions & Variables
    // ---------------------------------------------------------------------------------------------------------
    var lvUtils = ListViewUtils;
    var commonUtils = CommonUtilities;

    // ---------------------------------------------------------------------------------------------------------
    // Public Functions
    // ---------------------------------------------------------------------------------------------------------

    export function verifyGetOptions(placeholderId, controlType, expectedOptions) {
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
    }

    export function verifyItemContents(itemToCompare, itemTestData, itemRenderer) {
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
    }
}
