// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.js"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

var DataSourceTests = null;

(function() {

    // Create NavigationTests object
    DataSourceTests = function() {
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
        // Test: Flipper instantiation using array data source
        //
        this.testFlipperDataSourceInstantiation = function() {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), {
                itemDataSource: commonUtils.simpleArrayDataSource(10),
                itemTemplate: commonUtils.simpleArrayRenderer
            });
            LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");
            LiveUnit.Assert.isTrue(typeof flipper.next === "function", "Doesn't appear to be a valid flipper.");

            // Test multiple flipper instantiation to same flipper element - this should work
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate another flipper on the same flipper element");
            var flipper2 = flipperUtils.instantiate(flipperUtils.basicFlipperID(), {
                itemDataSource: commonUtils.simpleArrayDataSource(10),
                itemTemplate: commonUtils.simpleArrayRenderer
            });
            LiveUnit.Assert.isNotNull(flipper2, "Flipper2 element should not be null when instantiated.");
            LiveUnit.Assert.areNotEqual(flipper, flipper2, "Multiple calls to new WinJS.UI.FlipView() on the same " +
                " element should return different flipper objects");
        }

        //
        // Test: Flip to next page using array data source
        //
        this.testFlipperFlipToNext = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), {
                itemDataSource: commonUtils.simpleArrayDataSource(10),
                itemTemplate: commonUtils.simpleArrayRenderer
            });

            var verifyFlip = LiveUnit.GetWrappedCallback(function() {
                LiveUnit.LoggingCore.logComment("Current page after flip to next: " + flipper.currentPage);
                LiveUnit.Assert.areEqual(currentPage + 1, flipper.currentPage,
                    "Page after flip should be one more than previous page..");
                signalTestCaseCompleted();
            });

            var flipToNext = LiveUnit.GetWrappedCallback(function () {
                LiveUnit.LoggingCore.logComment("Current Page Before flipToNext: " + currentPage);
                flipper.removeEventListener("pagecompleted", flipToNext);
                if (!flipperUtils.ensureNext(flipper, verifyFlip)) {
                    LiveUnit.Assert.fail("Unable to flip to next.");
                }
            });
            flipper.addEventListener("pagecompleted", flipToNext);

            var currentPage = flipper.currentPage;
            LiveUnit.Assert.isTrue(currentPage === 0, "Flipper didn't start at Index 0");
        }
    }

    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("DataSourceTests");
} ());
