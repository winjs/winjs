// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.js"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

var ManipulationTests = null;

(function() {

    // Create ManipulationTests object
    ManipulationTests = function() {
        var flipperUtils = new FlipperUtils();
        var commonUtils = CommonUtilities;

        // Events
        var pageVisibilityEvent = "pagevisibilitychanged";
        var datasourceChangedEvent = "datasourcecountchanged";
        var pageSelectedEvent = "pagecompleted";

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
        // Test: testFlipperInsertAtStart using array data source
        //
        this.testFlipperInsertAtStart = function(signalTestCaseCompleted) {
            flipperUtils.insertItem("InsertAtStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperInsertAtEnd using array data source
        //
        this.testFlipperInsertAtEnd = function(signalTestCaseCompleted) {
            flipperUtils.insertItem("InsertAtEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperInsertBefore using array data source
        //
        this.testFlipperInsertBefore = function(signalTestCaseCompleted) {
            flipperUtils.insertItem("InsertBefore", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperInsertAfter using array data source
        //
        this.testFlipperInsertAfter = function(signalTestCaseCompleted) {
            flipperUtils.insertItem("InsertAfter", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveToStart using array data source
        //
        this.testFlipperMoveToStart = function(signalTestCaseCompleted) {
            flipperUtils.moveItem("MoveToStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveToEnd using array data source
        //
        this.testFlipperMoveToEnd = function(signalTestCaseCompleted) {
            flipperUtils.moveItem("MoveToEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveBefore using array data source
        //
        this.testFlipperMoveBefore = function(signalTestCaseCompleted) {
            flipperUtils.moveItem("MoveBefore", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveAfter using array data source
        //
        this.testFlipperMoveAfter = function(signalTestCaseCompleted) {
            flipperUtils.moveItem("MoveAfter", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperRemoveFromStart using array data source
        //
        this.testFlipperRemoveFromStart = function(signalTestCaseCompleted) {
            flipperUtils.removeItem("RemoveFromStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperRemoveFromEnd using array data source
        //
        this.testFlipperRemoveFromEnd = function(signalTestCaseCompleted) {
            flipperUtils.removeItem("RemoveFromEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperRemoveFromMiddle using array data source
        //
        this.testFlipperRemoveFromMiddle = function(signalTestCaseCompleted) {
            flipperUtils.removeItem("RemoveFromMiddle", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeAtStart using array data source
        //
        this.testFlipperChangeAtStart = function(signalTestCaseCompleted) {
            flipperUtils.changeItem("ChangeAtStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeAtEnd using array data source
        //
        this.testFlipperChangeAtEnd = function(signalTestCaseCompleted) {
            flipperUtils.changeItem("ChangeAtEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeAtMiddle using array data source
        //
        this.testFlipperChangeAtMiddle = function(signalTestCaseCompleted) {
            flipperUtils.changeItem("ChangeAtMiddle", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function(error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeInvalid using array data source
        //
        this.testFlipperChangeInvalid = function(signalTestCaseCompleted) {
            var onUnexpectedSuccess = LiveUnit.GetWrappedCallback(function() {
                LiveUnit.Assert.fail("Change appears to succeed when it should have failed.");
            });
            var onExpectedError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Change failed as expected.");
                LiveUnit.LoggingCore.logComment(error);
                signalTestCaseCompleted();
            });

            flipperUtils.changeItem("ChangeInvalid", onUnexpectedSuccess, onExpectedError);
        }
    }

    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("ManipulationTests");
} ());
