// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

module WinJSTests {

    "use strict";

    // Create ParamTests object
    export class ParamTests {
        

        //
        // Function: SetUp
        // This is the setup function that will be called at the beginning of each test function.
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
        // Test: testFlipperValidCurrentPageParam
        //
        testFlipperValidCurrentPageParam = function() {
            FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { currentPage: 5 });
        }

        //
        // Test: testFlipperNullCurrentPageParam
        //
        testFlipperNullCurrentPageParam = function() {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { currentPage: null });
            LiveUnit.Assert.isTrue(flipper.currentPage === 0, "Flipper didn't default to 0 for currentPage " +
                " when instatiated with null value.");
        }

        //
        // Test: testFlipperOutOfBoundsCurrentPageParam
        //
        testFlipperOutOfBoundsCurrentPageParam = function() {
            FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { currentPage: 100 });
        }

        //
        // Test: testFlipperVerticalAxisParam
        //
        testFlipperVerticalAxisParam = function() {
            FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { orientation: "vertical" });
        }

        //
        // Test: testFlipperHorizontalAxisParam
        //
        testFlipperHorizontalAxisParam = function() {
            FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { orientation: "horizontal" });
        }

        //
        // Test: testParentHorizontalChildHorizontal
        //
        testParentHorizontalChildHorizontal = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Horizontal Flipper + Child Horizontal Flipper.");
            var childPageInsert = 0;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = FlipperUtils.create2DFlipper(childPageInsert, { orientation: "horizontal" },
                { orientation: "horizontal" });
        }

        //
        // Test: testParentVerticalChildHorizontal
        //
        testParentVerticalChildHorizontal = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Vertical Flipper + Child Horizontal Flipper.");
            var childPageInsert = 1;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = FlipperUtils.create2DFlipper(childPageInsert, { orientation: "vertical" },
                { orientation: "horizontal" });
        }

        //
        // Test: testParentHorizontalChildVertical
        //
        testParentHorizontalChildVertical = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Horizontal Flipper + Child Vertical Flipper.");
            var childPageInsert = 2;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = FlipperUtils.create2DFlipper(childPageInsert, { orientation: "horizontal" },
                { orientation: "vertical" });
        }

        //
        // Test: testParentVerticalChildVertical
        //
        testParentVerticalChildVertical = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Vertical Flipper + Child Vertical Flipper.");
            var childPageInsert = 3;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = FlipperUtils.create2DFlipper(childPageInsert, { orientation: "vertical" },
                { orientation: "vertical" });
        }

        //
        // Test: testFlipperCurrentPageParam
        //
        testFlipperCurrentPageParam = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element with valid currentPage parameter.");
            var startPage = 4;
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { currentPage: startPage });
            LiveUnit.LoggingCore.logComment("startPage = " + startPage);
            LiveUnit.LoggingCore.logComment("flipper.currentPage = " + flipper.currentPage);
            LiveUnit.Assert.areEqual(startPage, flipper.currentPage, "flipper.currentPage = " + flipper.currentPage);
        }

        //
        // Test: testFlipperItemSpacingParam
        //
        testFlipperItemSpacingParam = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element with valid itemSpacing parameter.");
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { itemSpacing: 5 });
            LiveUnit.Assert.isNotNull(flipper, "Flipper should not have been instantiated.");
        }

        //---------------------------------------------------------------------
        // Test Helper Functions and Globals
        //---------------------------------------------------------------------

        // Create and return asynchronous datasource with specified data.
        simpleAsynchronousDataSource(data) {
            var directives = {
                callMethodsSynchronously: false,
                sendChangeNotifications: true,
                countBeforeDelta: 0,
                countAfterDelta: 0
            };
            var controller = {
                directivesForMethod: function (method, args) {
                    return {
                        // Copy the current directives
                        callMethodSynchronously: directives.callMethodsSynchronously,
                        sendChangeNotifications: directives.sendChangeNotifications,
                        countBeforeDelta: directives.countBeforeDelta,
                        countAfterDelta: directives.countAfterDelta
                    };
                }
            };
            // All abilities are enabled
            var itemDataSource = TestComponents.createTestDataSource(data, controller, null);
            itemDataSource.testDataAdapter.directives = directives;
            return itemDataSource;
        }
    }

    
}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ParamTests");