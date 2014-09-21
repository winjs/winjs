// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>


module WinJSTests {

    "use strict";

    // Events
    var pageVisibilityEvent = "pagevisibilitychanged";
    var datasourceChangedEvent = "datasourcecountchanged";
    var pageSelectedEvent = "pagecompleted";

    // Create ManipulationTests object
    export class ManipulationTests {


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
        // Test: testFlipperInsertAtStart using array data source
        //
        testFlipperInsertAtStart = function (signalTestCaseCompleted) {
            FlipperUtils.insertItem("InsertAtStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperInsertAtEnd using array data source
        //
        testFlipperInsertAtEnd = function (signalTestCaseCompleted) {
            FlipperUtils.insertItem("InsertAtEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperInsertBefore using array data source
        //
        testFlipperInsertBefore = function (signalTestCaseCompleted) {
            FlipperUtils.insertItem("InsertBefore", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperInsertAfter using array data source
        //
        testFlipperInsertAfter = function (signalTestCaseCompleted) {
            FlipperUtils.insertItem("InsertAfter", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveToStart using array data source
        //
        testFlipperMoveToStart = function (signalTestCaseCompleted) {
            FlipperUtils.moveItem("MoveToStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveToEnd using array data source
        //
        testFlipperMoveToEnd = function (signalTestCaseCompleted) {
            FlipperUtils.moveItem("MoveToEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveBefore using array data source
        //
        testFlipperMoveBefore = function (signalTestCaseCompleted) {
            FlipperUtils.moveItem("MoveBefore", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperMoveAfter using array data source
        //
        testFlipperMoveAfter = function (signalTestCaseCompleted) {
            FlipperUtils.moveItem("MoveAfter", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperRemoveFromStart using array data source
        //
        testFlipperRemoveFromStart = function (signalTestCaseCompleted) {
            FlipperUtils.removeItem("RemoveFromStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperRemoveFromEnd using array data source
        //
        testFlipperRemoveFromEnd = function (signalTestCaseCompleted) {
            FlipperUtils.removeItem("RemoveFromEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperRemoveFromMiddle using array data source
        //
        testFlipperRemoveFromMiddle = function (signalTestCaseCompleted) {
            FlipperUtils.removeItem("RemoveFromMiddle", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeAtStart using array data source
        //
        testFlipperChangeAtStart = function (signalTestCaseCompleted) {
            FlipperUtils.changeItem("ChangeAtStart", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeAtEnd using array data source
        //
        testFlipperChangeAtEnd = function (signalTestCaseCompleted) {
            FlipperUtils.changeItem("ChangeAtEnd", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeAtMiddle using array data source
        //
        testFlipperChangeAtMiddle = function (signalTestCaseCompleted) {
            FlipperUtils.changeItem("ChangeAtMiddle", signalTestCaseCompleted,
                LiveUnit.GetWrappedCallback(function (error) { LiveUnit.Assert.fail(error) }));
        }

        //
        // Test: testFlipperChangeInvalid using array data source
        //
        testFlipperChangeInvalid = function (signalTestCaseCompleted) {
            var onUnexpectedSuccess = LiveUnit.GetWrappedCallback(function () {
                LiveUnit.Assert.fail("Change appears to succeed when it should have failed.");
            });
            var onExpectedError = LiveUnit.GetWrappedCallback(function (error) {
                LiveUnit.LoggingCore.logComment("Change failed as expected.");
                LiveUnit.LoggingCore.logComment(error);
                signalTestCaseCompleted();
            });

            FlipperUtils.changeItem("ChangeInvalid", onUnexpectedSuccess, onExpectedError);
        }
    }
}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ManipulationTests");