// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>


module WinJSTests {

    "use strict";

    // Create InstantiationTests object
    export class InstantiationTests {


        //
        // Function: SetUp
        //
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            CommonUtilities.getIEInfo();
            FlipperUtils.addFlipperDom();
        }

        //
        // Function: tearDown
        //
        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            FlipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperInstantiation
        //  Validate that you can instantiate a flipper with data.
        //  Validate that you can reference that flipper with another object referencing that flipper.
        //  Validate that the flipper is a valid flipper with appropriate functions.
        //
        testFlipperInstantiation = function () {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");
            LiveUnit.Assert.isTrue(typeof flipper.next === "function", "Doesn't appear to be a valid flipper.");

            // Test multiple flipper instantiation to same flipper element
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Flipper2 on the same flipper element");
            var flipper2 = document.getElementById(FlipperUtils.basicFlipperID()).winControl;
            LiveUnit.LoggingCore.logComment("Flipper2 has been instantiated.");
            LiveUnit.Assert.isNotNull(flipper2, "Flipper2 element should not be null when instantiated.");
            LiveUnit.Assert.areEqual(flipper, flipper2, "Multiple calls to WinJS.UI.FlipView() on the same " +
                " element should return the same flipper object");

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (flipper[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from flipper");
                }

                LiveUnit.Assert.isNotNull(flipper[functionName]);
                LiveUnit.Assert.isTrue(typeof (flipper[functionName]) === "function", functionName +
                    " exists on flipper, but it isn't a function");
            }

            verifyFunction("next");
            verifyFunction("previous");
            verifyFunction("count");
            verifyFunction("itemTemplate");
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
        }

        //
        // Test: testFlipperNullInstantiation
        //
        testFlipperNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper with null element");
            var flipper = new WinJS.UI.FlipView(null);
            LiveUnit.Assert.isNotNull(flipper, "Flipper instantiation was not null when sent a null flipper element.");
        }

        //
        // Test: testFlipperUndefinedInstantiation
        //
        testFlipperUndefinedInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper with undefined element");
            var flipper = new WinJS.UI.FlipView(undefined);
            LiveUnit.Assert.isNotNull(flipper, "Flipper insantiation was not undefined when sent an undefined flipper element.");
        }

        //
        // Test: testFlipperAriaLabel
        //
        testFlipperAriaLabel = function () {
            LiveUnit.LoggingCore.logComment("Attempt to instantiate the flipper with a aria-label attribute set on the div");
            var flipperElement = document.getElementById(FlipperUtils.basicFlipperID());
            var ariaLabel = "testAriaLabel";
            flipperElement.setAttribute("aria-label", ariaLabel);

            LiveUnit.LoggingCore.logComment("Instantiate the flipper.");
            var flipper = new WinJS.UI.FlipView(flipperElement);

            if (flipper) {
                LiveUnit.LoggingCore.logComment("Flipper has been instantiated.");
                LiveUnit.LoggingCore.logComment("Flipper orientation is: " + flipper.orientation);
                LiveUnit.LoggingCore.logComment("Flipper itemSpacing is: " + flipper.itemSpacing);
                LiveUnit.LoggingCore.logComment("Flipper currentPage is: " + flipper.currentPage);
                LiveUnit.Assert.isTrue(flipper.currentPage === 0, "Flipper currentPage is not 0");

                var flipperAriaLabel = flipperElement.getAttribute("aria-label");
                LiveUnit.LoggingCore.logComment("Flipper aria-label is: " + flipperAriaLabel);
                LiveUnit.Assert.isTrue(flipperAriaLabel === ariaLabel, "Flipper aria-label is not " + ariaLabel);
            }
            else {
                LiveUnit.LoggingCore.logComment("Unable to instantiate Flipper.");
            }
        }

        //
        // Test: testFlipperChildInstantiation
        //
        testFlipperChildInstantiation = function () {
            var parentFlipper = FlipperUtils.create2DFlipper(0);
        }
    }

}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.InstantiationTests");