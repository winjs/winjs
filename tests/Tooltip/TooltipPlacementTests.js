// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Placement Tests for the tooltip.  When we create tooltips, we can specify which side of the "anchor element"
//  the tooltip appears at.  However, if we're too close to the edge of the screen, we'll display the tooltip on
//  a secondary side.
//
//  Author: evanwi
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="TooltipUtils.js"/>
/// <reference path="Tooltip.css"/>

TooltipPlacementTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function (complete) {
        tooltipUtils.setUp(complete);
    };

    this.tearDown = function () {
        tooltipUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------
    // Verify the tooltip appears at the expected position
    function testTooltip_VerifyPlacement(signalTestCaseCompleted, elementPlacement, tooltipPlacement, expectedPlacement) {
        LiveUnit.LoggingCore.logComment("When the anchor element is placed at:  " + elementPlacement);
        LiveUnit.LoggingCore.logComment("And we request that the tooltip is displayed at:  " + tooltipPlacement);
        LiveUnit.LoggingCore.logComment("We expect the tooltip to be displayed at: " + expectedPlacement);

        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, elementPlacement);

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip", placement: tooltipPlacement });

        var testComplete = false;
        function tooltipEventListener(event) {
            if (testComplete) {
                return;
            }

            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipPlacementFromElement(tooltip), expectedPlacement);

                    // Don't validate these, just log them since we have separate distance tests.
                    tooltipUtils.getTooltipDistanceFromElement(tooltip);
                    tooltipUtils.getTooltipDistanceFromWindow(tooltip);

                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    testComplete = true;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    }

    // Element in the center
    this.testTooltip_PlacementCenterTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "top", "top");
    };
    
    
    
    this.testTooltip_PlacementCenterTop["Category"] = "Placement";
    this.testTooltip_PlacementCenterTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementCenterRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "right", "right");
    };
    
    
    
    this.testTooltip_PlacementCenterRight["Category"] = "Placement";
    this.testTooltip_PlacementCenterRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementCenterBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "bottom", "bottom");
    };
    
    
    
    this.testTooltip_PlacementCenterBottom["Category"] = "Placement";
    this.testTooltip_PlacementCenterBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementCenterLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "left", "left");
    };
    
    
    
    this.testTooltip_PlacementCenterLeft["Category"] = "Placement";
    this.testTooltip_PlacementCenterLeft["LiveUnit.IsAsync"] = true;

    // Element at the top

    this.testTooltip_PlacementTopTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "top", "bottom");
    };
    
    
    
    this.testTooltip_PlacementTopTop["Category"] = "Placement";
    this.testTooltip_PlacementTopTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "right", "right");
    };

    
    
    
    this.testTooltip_PlacementTopRight["Category"] = "Placement";
    this.testTooltip_PlacementTopRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "bottom", "bottom");
    };
    
    
    
    this.testTooltip_PlacementTopBottom["Category"] = "Placement";
    this.testTooltip_PlacementTopBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "left", "left");
    };
    
    
    
    this.testTooltip_PlacementTopLeft["Category"] = "Placement";
    this.testTooltip_PlacementTopLeft["LiveUnit.IsAsync"] = true;

    // Element at the top right

    this.testTooltip_PlacementTopRightTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "top", "bottom");
    };
    
    
    
    this.testTooltip_PlacementTopRightTop["Category"] = "Placement";
    this.testTooltip_PlacementTopRightTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopRightRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "right", "left");
    };
    
    
    
    this.testTooltip_PlacementTopRightRight["Category"] = "Placement";
    this.testTooltip_PlacementTopRightRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopRightBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "bottom", "bottom");
    };
    
    
    
    this.testTooltip_PlacementTopRightBottom["Category"] = "Placement";
    this.testTooltip_PlacementTopRightBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopRightLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "left", "left");
    };
    
    
    
    this.testTooltip_PlacementTopRightLeft["Category"] = "Placement";
    this.testTooltip_PlacementTopRightLeft["LiveUnit.IsAsync"] = true;

    // Element at the right

    this.testTooltip_PlacementRightTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "top", "top");
    };
    
    
    
    this.testTooltip_PlacementRightTop["Category"] = "Placement";
    this.testTooltip_PlacementRightTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementRightRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "right", "left");
    };
    
    
    
    this.testTooltip_PlacementRightRight["Category"] = "Placement";
    this.testTooltip_PlacementRightRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementRightBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "bottom", "bottom");
    };
    
    
    
    this.testTooltip_PlacementRightBottom["Category"] = "Placement";
    this.testTooltip_PlacementRightBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementRightLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "left", "left");
    };
    
    
    
    this.testTooltip_PlacementRightLeft["Category"] = "Placement";
    this.testTooltip_PlacementRightLeft["LiveUnit.IsAsync"] = true;

    // Element at the bottom right

    this.testTooltip_PlacementBottomRightTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "top", "top");
    };
    
    
    
    this.testTooltip_PlacementBottomRightTop["Category"] = "Placement";
    this.testTooltip_PlacementBottomRightTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomRightRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "right", "left");
    };
    
    
    
    this.testTooltip_PlacementBottomRightRight["Category"] = "Placement";
    this.testTooltip_PlacementBottomRightRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomRightBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "bottom", "top");
    };
    
    
    
    this.testTooltip_PlacementBottomRightBottom["Category"] = "Placement";
    this.testTooltip_PlacementBottomRightBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomRightLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "left", "left");
    };
    
    
    
    this.testTooltip_PlacementBottomRightLeft["Category"] = "Placement";
    this.testTooltip_PlacementBottomRightLeft["LiveUnit.IsAsync"] = true;

    // Element at the bottom

    this.testTooltip_PlacementBottomTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "top", "top");
    };
    
    
    
    this.testTooltip_PlacementBottomTop["Category"] = "Placement";
    this.testTooltip_PlacementBottomTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "right", "right");
    };
    
    
    
    this.testTooltip_PlacementBottomRight["Category"] = "Placement";
    this.testTooltip_PlacementBottomRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "bottom", "top");
    };
    
    
    
    this.testTooltip_PlacementBottomBottom["Category"] = "Placement";
    this.testTooltip_PlacementBottomBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "left", "left");
    };
    
    
    
    this.testTooltip_PlacementBottomLeft["Category"] = "Placement";
    this.testTooltip_PlacementBottomLeft["LiveUnit.IsAsync"] = true;

    // Element at the bottom left

    this.testTooltip_PlacementBottomLeftTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "top", "top");
    };
    
    
    
    this.testTooltip_PlacementBottomLeftTop["Category"] = "Placement";
    this.testTooltip_PlacementBottomLeftTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomLeftRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "right", "right");
    };
    
    
    
    this.testTooltip_PlacementBottomLeftRight["Category"] = "Placement";
    this.testTooltip_PlacementBottomLeftRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomLeftBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "bottom", "top");
    };
    
    
    
    this.testTooltip_PlacementBottomLeftBottom["Category"] = "Placement";
    this.testTooltip_PlacementBottomLeftBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementBottomLeftLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "left", "right");
    };
    
    
    
    this.testTooltip_PlacementBottomLeftLeft["Category"] = "Placement";
    this.testTooltip_PlacementBottomLeftLeft["LiveUnit.IsAsync"] = true;

    // Element at the left

    this.testTooltip_PlacementLeftTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "top", "top");
    };
    
    
    
    this.testTooltip_PlacementLeftTop["Category"] = "Placement";
    this.testTooltip_PlacementLeftTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementLeftRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "right", "right");
    };
    
    
    
    this.testTooltip_PlacementLeftRight["Category"] = "Placement";
    this.testTooltip_PlacementLeftRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementLeftBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "bottom", "bottom");
    };
    
    
    
    this.testTooltip_PlacementLeftBottom["Category"] = "Placement";
    this.testTooltip_PlacementLeftBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementLeftLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "left", "right");
    };
    
    
    
    this.testTooltip_PlacementLeftLeft["Category"] = "Placement";
    this.testTooltip_PlacementLeftLeft["LiveUnit.IsAsync"] = true;

    // Element at the top left

    this.testTooltip_PlacementTopLeftTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "top", "bottom");
    };
    
    
    
    this.testTooltip_PlacementTopLeftTop["Category"] = "Placement";
    this.testTooltip_PlacementTopLeftTop["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopLeftRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "right", "right");
    };
    
    
    
    this.testTooltip_PlacementTopLeftRight["Category"] = "Placement";
    this.testTooltip_PlacementTopLeftRight["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopLeftBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "bottom", "bottom");
    };
    
    
    
    this.testTooltip_PlacementTopLeftBottom["Category"] = "Placement";
    this.testTooltip_PlacementTopLeftBottom["LiveUnit.IsAsync"] = true;

    this.testTooltip_PlacementTopLeftLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "left", "right");
    };
    
    
    
    this.testTooltip_PlacementTopLeftLeft["Category"] = "Placement";
    this.testTooltip_PlacementTopLeftLeft["LiveUnit.IsAsync"] = true;

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipPlacementTests");
