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
        tooltipUtils.setUp().then(complete);
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

                    signalTestCaseCompleted();
                    testComplete = true;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    }

    // Element in the center
    this.testTooltip_PlacementCenterTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "top", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementCenterRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "right", "right");
    };
    
    
    
    
    

    this.testTooltip_PlacementCenterBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "bottom", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementCenterLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "center", "left", "left");
    };
    
    
    
    
    

    // Element at the top

    this.testTooltip_PlacementTopTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "top", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "right", "right");
    };

    
    
    
    
    

    this.testTooltip_PlacementTopBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "bottom", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top", "left", "left");
    };
    
    
    
    
    

    // Element at the top right

    this.testTooltip_PlacementTopRightTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "top", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopRightRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "right", "left");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopRightBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "bottom", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopRightLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top right", "left", "left");
    };
    
    
    
    
    

    // Element at the right

    this.testTooltip_PlacementRightTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "top", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementRightRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "right", "left");
    };
    
    
    
    
    

    this.testTooltip_PlacementRightBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "bottom", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementRightLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "right", "left", "left");
    };
    
    
    
    
    

    // Element at the bottom right

    this.testTooltip_PlacementBottomRightTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "top", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomRightRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "right", "left");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomRightBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "bottom", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomRightLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom right", "left", "left");
    };
    
    
    
    
    

    // Element at the bottom

    this.testTooltip_PlacementBottomTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "top", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "right", "right");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "bottom", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom", "left", "left");
    };
    
    
    
    
    

    // Element at the bottom left

    this.testTooltip_PlacementBottomLeftTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "top", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomLeftRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "right", "right");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomLeftBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "bottom", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementBottomLeftLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "bottom left", "left", "right");
    };
    
    
    
    
    

    // Element at the left

    this.testTooltip_PlacementLeftTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "top", "top");
    };
    
    
    
    
    

    this.testTooltip_PlacementLeftRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "right", "right");
    };
    
    
    
    
    

    this.testTooltip_PlacementLeftBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "bottom", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementLeftLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "left", "left", "right");
    };
    
    
    
    
    

    // Element at the top left

    this.testTooltip_PlacementTopLeftTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "top", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopLeftRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "right", "right");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopLeftBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "bottom", "bottom");
    };
    
    
    
    
    

    this.testTooltip_PlacementTopLeftLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyPlacement(signalTestCaseCompleted, "top left", "left", "right");
    };
    
    
    
    
    

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipPlacementTests");
