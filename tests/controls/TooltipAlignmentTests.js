/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

//-----------------------------------------------------------------------------
//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//
//  Abstract:
//
//  Displaying Tests for the tooltip.  Mainly check the ARIA tags.
//
//  Author: evanwi
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="..\TestLib\LegacyLiveUnit\commonutils.js"/>
/// <reference path="tooltiputils.js"/>
/// <reference path="tooltip.css"/>

TooltipAlignmentTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function () {
        tooltipUtils.setUp();
    };

    this.tearDown = function () {
        tooltipUtils.cleanUp();
    };

    this.testTooltip_VerifyAlignmentChangedText = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "short text" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    // Verify the text is centered.
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), "horizontal center");
                    tooltip.innerHTML = "longer string of text";

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    // Verify the changed text is centered too (see Win8 bug: 275298)
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), "horizontal center");
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyAlignmentChangedText["Owner"] = "evanwi";
    this.testTooltip_VerifyAlignmentChangedText["Priority"] = "feature";
    this.testTooltip_VerifyAlignmentChangedText["Description"] = "Test if tooltip realigns/recenters itself if text changes while the tooltip is visible";
    this.testTooltip_VerifyAlignmentChangedText["Category"] = "Alignment";
    this.testTooltip_VerifyAlignmentChangedText["LiveUnit.IsAsync"] = true;

    this.testTooltip_VerifyAlignmentChangedPlacement = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    // Verify the text is centered.
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), "horizontal center");

                    // Now change the placement.
                    tooltip.placement = "right";

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    // Verify the changed placement is centered too (see Win8 bug: 292981)
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), "vertical center");
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyAlignmentChangedPlacement["Owner"] = "evanwi";
    this.testTooltip_VerifyAlignmentChangedPlacement["Priority"] = "feature";
    this.testTooltip_VerifyAlignmentChangedPlacement["Description"] = "Test if tooltip realigns/recenters itself if placement changes while the tooltip is visible";
    this.testTooltip_VerifyAlignmentChangedPlacement["Category"] = "Alignment";
    this.testTooltip_VerifyAlignmentChangedPlacement["LiveUnit.IsAsync"] = true;

    //-----------------------------------------------------------------------------------
    // Verify the tooltip appears aligned correctly
    function testTooltip_VerifyAlignment(signalTestCaseCompleted, elementPlacement, tooltipPlacement, expectedAlignment) {
        LiveUnit.LoggingCore.logComment("When the anchor element is placed at:  " + elementPlacement);
        LiveUnit.LoggingCore.logComment("And we request that the tooltip is displayed at:  " + tooltipPlacement);
        LiveUnit.LoggingCore.logComment("We expect the tooltip alignment to be: " + expectedAlignment);

        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, elementPlacement);

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip", placement: tooltipPlacement });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), expectedAlignment);

                    // Don't validate these, just log them since we have separate distance tests.
                    tooltipUtils.getTooltipDistanceFromElement(tooltip);
                    tooltipUtils.getTooltipDistanceFromWindow(tooltip);

                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    }

    // Element in the center
    this.testTooltip_VerifyAlignmentCenterTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "top", "horizontal center");
    };
    this.testTooltip_VerifyAlignmentCenterTop["Owner"] = "evanwi";
    this.testTooltip_VerifyAlignmentCenterTop["Priority"] = "feature";
    this.testTooltip_VerifyAlignmentCenterTop["Description"] = "Test Alignment of the tooltip";
    this.testTooltip_VerifyAlignmentCenterTop["Category"] = "Alignment";
    this.testTooltip_VerifyAlignmentCenterTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_AlignmentCenterRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "right", "vertical center");
    };
    this.testTooltip_AlignmentCenterRight["Owner"] = "evanwi";
    this.testTooltip_AlignmentCenterRight["Priority"] = "feature";
    this.testTooltip_AlignmentCenterRight["Description"] = "Test Alignment of the tooltip";
    this.testTooltip_AlignmentCenterRight["Category"] = "Alignment";
    this.testTooltip_AlignmentCenterRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_AlignmentCenterBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "bottom", "horizontal center");
    };
    this.testTooltip_AlignmentCenterBottom["Owner"] = "evanwi";
    this.testTooltip_AlignmentCenterBottom["Priority"] = "feature";
    this.testTooltip_AlignmentCenterBottom["Description"] = "Test Alignment of the tooltip";
    this.testTooltip_AlignmentCenterBottom["Category"] = "Alignment";
    this.testTooltip_AlignmentCenterBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_AlignmentCenterLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "left", "vertical center");
    };
    this.testTooltip_AlignmentCenterLeft["Owner"] = "evanwi";
    this.testTooltip_AlignmentCenterLeft["Priority"] = "feature";
    this.testTooltip_AlignmentCenterLeft["Description"] = "Test Alignment of the tooltip";
    this.testTooltip_AlignmentCenterLeft["Category"] = "Alignment";
    this.testTooltip_AlignmentCenterLeft["LiveUnit.IsAsync"] = true;

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipAlignmentTests");
