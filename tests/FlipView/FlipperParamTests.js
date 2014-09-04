// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.js"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

var ParamTests = null;

(function() {

    // Create ParamTests object
    ParamTests = function() {
        var flipperUtils = new FlipperUtils();
        var commonUtils = CommonUtilities;

        //
        // Function: SetUp
        // This is the setup function that will be called at the beginning of each test function.
        //
        this.setUp = function() {
            LiveUnit.LoggingCore.logComment("In setup");
            commonUtils.getIEInfo();
            flipperUtils.addFlipperDom();
        }

        //
        // Function: tearDown
        //
        this.tearDown = function() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            flipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperValidCurrentPageParam
        //
        this.testFlipperValidCurrentPageParam = function() {
            flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: 5 });
        }

        //
        // Test: testFlipperNullCurrentPageParam
        //
        this.testFlipperNullCurrentPageParam = function() {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: null });
            LiveUnit.Assert.isTrue(flipper.currentPage === 0, "Flipper didn't default to 0 for currentPage " +
                " when instatiated with null value.");
        }

        //
        // Test: testFlipperOutOfBoundsCurrentPageParam
        //
        this.testFlipperOutOfBoundsCurrentPageParam = function() {
            flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: 100 });
        }

        //
        // Test: testFlipperVerticalAxisParam
        //
        this.testFlipperVerticalAxisParam = function() {
            flipperUtils.instantiate(flipperUtils.basicFlipperID(), { orientation: "vertical" });
        }

        //
        // Test: testFlipperHorizontalAxisParam
        //
        this.testFlipperHorizontalAxisParam = function() {
            flipperUtils.instantiate(flipperUtils.basicFlipperID(), { orientation: "horizontal" });
        }

        //
        // Test: testParentHorizontalChildHorizontal
        //
        this.testParentHorizontalChildHorizontal = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Horizontal Flipper + Child Horizontal Flipper.");
            var childPageInsert = 0;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = flipperUtils.create2DFlipper(childPageInsert, { orientation: "horizontal" },
                { orientation: "horizontal" });
        }

        //
        // Test: testParentVerticalChildHorizontal
        //
        this.testParentVerticalChildHorizontal = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Vertical Flipper + Child Horizontal Flipper.");
            var childPageInsert = 1;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = flipperUtils.create2DFlipper(childPageInsert, { orientation: "vertical" },
                { orientation: "horizontal" });
        }

        //
        // Test: testParentHorizontalChildVertical
        //
        this.testParentHorizontalChildVertical = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Horizontal Flipper + Child Vertical Flipper.");
            var childPageInsert = 2;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = flipperUtils.create2DFlipper(childPageInsert, { orientation: "horizontal" },
                { orientation: "vertical" });
        }

        //
        // Test: testParentVerticalChildVertical
        //
        this.testParentVerticalChildVertical = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate Parent Vertical Flipper + Child Vertical Flipper.");
            var childPageInsert = 3;
            LiveUnit.LoggingCore.logComment("Child Flipper at page: " + childPageInsert);
            var parentFlipper = flipperUtils.create2DFlipper(childPageInsert, { orientation: "vertical" },
                { orientation: "vertical" });
        }

        //
        // Test: testFlipperCurrentPageParam
        //
        this.testFlipperCurrentPageParam = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element with valid currentPage parameter.");
            var startPage = 4;
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: startPage });
            LiveUnit.LoggingCore.logComment("startPage = " + startPage);
            LiveUnit.LoggingCore.logComment("flipper.currentPage = " + flipper.currentPage);
            LiveUnit.Assert.areEqual(startPage, flipper.currentPage, "flipper.currentPage = " + flipper.currentPage);
        }

        //
        // Test: testFlipperItemSpacingParam
        //
        this.testFlipperItemSpacingParam = function() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element with valid itemSpacing parameter.");
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { itemSpacing: 5 });
            LiveUnit.Assert.isNotNull(flipper, "Flipper should not have been instantiated.");
        }

        //---------------------------------------------------------------------
        // Test Helper Functions and Globals
        //---------------------------------------------------------------------

        // Create and return asynchronous datasource with specified data.
        this.simpleAsynchronousDataSource = function (data) {
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
        };
    }

    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("ParamTests");
} ());
