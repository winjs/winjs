// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Distance Tests for the tooltip.  When we display tooltips, they should not appear off-screen and should appear a
//  certain distance from the "anchor element" depending on whether touch, keyboard, or mouse triggered it.
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
/// <reference path="tooltiputils.js"/>
/// <reference path="tooltip.css"/>

TooltipDistanceTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    // Since distances can be off due to rounding errors, use this tolerance for our comparisons.
    var DISTANCE_TOLERANCE = 1;

    this.setUp = function () {
        tooltipUtils.setUp();
    };

    this.tearDown = function () {
        tooltipUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------

    // Verify the tooltip appears at the specified distance from the element and not off-screen.
    function testTooltip_VerifyDistance(signalTestCaseCompleted, elementPlacement, tooltipPlacement, inputMethod) {
        LiveUnit.LoggingCore.logComment("When the anchor element is placed at:  " + elementPlacement);
        LiveUnit.LoggingCore.logComment("And we request that the tooltip is displayed at:  " + tooltipPlacement);
        LiveUnit.LoggingCore.logComment("And we use: " + inputMethod);

        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.  The tooltip should be larger than the element, so we can verify
        // the tooltip can hit the edge of the window.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        element.innerHTML = "e";
        tooltipUtils.positionElement(element, elementPlacement);

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "t", placement: tooltipPlacement });

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
                    tooltipUtils.displayTooltip(inputMethod, element, tooltip);
                    break;
                case "opened":
                    LiveUnit.Assert.isTrue(tooltipUtils.getTooltipDistanceFromWindow(tooltip) >= 0);
                    var distance;
                    switch (inputMethod) {
                        case "keyboard":
                            distance = tooltipUtils.OFFSET_KEYBOARD;
                            break;
                        case "mouse":
                            distance = tooltipUtils.OFFSET_MOUSE;
                            break;
                        case "touch":
                            distance = tooltipUtils.OFFSET_TOUCH;
                            break;
                        case "keyboardProgrammatic":
                            distance = tooltipUtils.OFFSET_PROGRAMMATIC_NONTOUCH;
                            break;
                        case "mouseoverProgrammatic":
                            // We could have mousedownProgrammatic and defaultProgrammatic too,
                            // but they all use the "nontouch" distance, so just do mouseoverProgrammatic for now.
                            distance = tooltipUtils.OFFSET_PROGRAMMATIC_NONTOUCH;
                            break;
                        case "touchProgrammatic":
                            distance = tooltipUtils.OFFSET_PROGRAMMATIC_TOUCH;
                            break;
                        default:
                            LiveUnit.Assert.Fail("Unknown inputMethod " + inputMethod);
                            break;
                    }
                    var actualDistance = tooltipUtils.getTooltipDistanceFromElement(tooltip,
                        (((inputMethod == "touch") || (inputMethod == "mouse")) ? "center" : "edge"));

                    // On some browsers, the actual distance will be reported as 21.00000123 which will fail asserts which don't really matter
                    actualDistance = Math.round(actualDistance);

                    LiveUnit.Assert.isTrue((actualDistance <= (distance + DISTANCE_TOLERANCE)), "Expected distance: " + distance);
                    LiveUnit.Assert.isTrue((actualDistance >= (distance - DISTANCE_TOLERANCE)), "Expected distance: " + distance);

                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    testComplete = true;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };

    this.testTooltip_DistanceCenterTopMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "mouse");
    };
    this.testTooltip_DistanceCenterTopMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterTopMouse["Priority"] = "feature";
    this.testTooltip_DistanceCenterTopMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterTopMouse["Category"] = "Automatic";
    this.testTooltip_DistanceCenterTopMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterRightMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "mouse");
    };
    this.testTooltip_DistanceCenterRightMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterRightMouse["Priority"] = "feature";
    this.testTooltip_DistanceCenterRightMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterRightMouse["Category"] = "Automatic";
    this.testTooltip_DistanceCenterRightMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterBottomMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "mouse");
    };
    this.testTooltip_DistanceCenterBottomMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterBottomMouse["Priority"] = "feature";
    this.testTooltip_DistanceCenterBottomMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterBottomMouse["Category"] = "Automatic";
    this.testTooltip_DistanceCenterBottomMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterLeftMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "mouse");
    };
    this.testTooltip_DistanceCenterLeftMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterLeftMouse["Priority"] = "feature";
    this.testTooltip_DistanceCenterLeftMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterLeftMouse["Category"] = "Automatic";
    this.testTooltip_DistanceCenterLeftMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterTopKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "keyboard");
    };
    this.testTooltip_DistanceCenterTopKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterTopKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceCenterTopKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterTopKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceCenterTopKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterRightKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "keyboard");
    };
    this.testTooltip_DistanceCenterRightKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterRightKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceCenterRightKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterRightKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceCenterRightKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterBottomKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "keyboard");
    };
    this.testTooltip_DistanceCenterBottomKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterBottomKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceCenterBottomKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterBottomKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceCenterBottomKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterLeftKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "keyboard");
    };
    this.testTooltip_DistanceCenterLeftKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterLeftKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceCenterLeftKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterLeftKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceCenterLeftKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterTopTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "touch");
    };
    this.testTooltip_DistanceCenterTopTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterTopTouch["Priority"] = "feature";
    this.testTooltip_DistanceCenterTopTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterTopTouch["Category"] = "Automatic";
    this.testTooltip_DistanceCenterTopTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterRightTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "touch");
    };
    this.testTooltip_DistanceCenterRightTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterRightTouch["Priority"] = "feature";
    this.testTooltip_DistanceCenterRightTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterRightTouch["Category"] = "Automatic";
    this.testTooltip_DistanceCenterRightTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterBottomTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "touch");
    };
    this.testTooltip_DistanceCenterBottomTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterBottomTouch["Priority"] = "feature";
    this.testTooltip_DistanceCenterBottomTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterBottomTouch["Category"] = "Automatic";
    this.testTooltip_DistanceCenterBottomTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterLeftTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "touch");
    };
    this.testTooltip_DistanceCenterLeftTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterLeftTouch["Priority"] = "feature";
    this.testTooltip_DistanceCenterLeftTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterLeftTouch["Category"] = "Automatic";
    this.testTooltip_DistanceCenterLeftTouch["LiveUnit.IsAsync"] = true;

    // Element at the top right

    this.testTooltip_DistanceTopRightBottomMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "mouse");
    };
    this.testTooltip_DistanceTopRightBottomMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightBottomMouse["Priority"] = "feature";
    this.testTooltip_DistanceTopRightBottomMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightBottomMouse["Category"] = "Automatic";
    this.testTooltip_DistanceTopRightBottomMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightLeftMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "mouse");
    };
    this.testTooltip_DistanceTopRightLeftMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightLeftMouse["Priority"] = "feature";
    this.testTooltip_DistanceTopRightLeftMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightLeftMouse["Category"] = "Automatic";
    this.testTooltip_DistanceTopRightLeftMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightBottomKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "keyboard");
    };
    this.testTooltip_DistanceTopRightBottomKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightBottomKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceTopRightBottomKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightBottomKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceTopRightBottomKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightLeftKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "keyboard");
    };
    this.testTooltip_DistanceTopRightLeftKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightLeftKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceTopRightLeftKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightLeftKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceTopRightLeftKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightBottomTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "touch");
    };
    this.testTooltip_DistanceTopRightBottomTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightBottomTouch["Priority"] = "feature";
    this.testTooltip_DistanceTopRightBottomTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightBottomTouch["Category"] = "Automatic";
    this.testTooltip_DistanceTopRightBottomTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightLeftTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "touch");
    };
    this.testTooltip_DistanceTopRightLeftTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightLeftTouch["Priority"] = "feature";
    this.testTooltip_DistanceTopRightLeftTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightLeftTouch["Category"] = "Automatic";
    this.testTooltip_DistanceTopRightLeftTouch["LiveUnit.IsAsync"] = true;

    // Element at the bottom right

    this.testTooltip_DistanceBottomRightTopMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "mouse");
    };
    this.testTooltip_DistanceBottomRightTopMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightTopMouse["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightTopMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightTopMouse["Category"] = "Automatic";
    this.testTooltip_DistanceBottomRightTopMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightLeftMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "mouse");
    };
    this.testTooltip_DistanceBottomRightLeftMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightLeftMouse["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightLeftMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightLeftMouse["Category"] = "Automatic";
    this.testTooltip_DistanceBottomRightLeftMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightTopKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "keyboard");
    };
    this.testTooltip_DistanceBottomRightTopKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightTopKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightTopKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightTopKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceBottomRightTopKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightLeftKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "keyboard");
    };
    this.testTooltip_DistanceBottomRightLeftKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightLeftKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightLeftKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightLeftKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceBottomRightLeftKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightTopTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "touch");
    };
    this.testTooltip_DistanceBottomRightTopTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightTopTouch["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightTopTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightTopTouch["Category"] = "Automatic";
    this.testTooltip_DistanceBottomRightTopTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightLeftTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "touch");
    };
    this.testTooltip_DistanceBottomRightLeftTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightLeftTouch["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightLeftTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightLeftTouch["Category"] = "Automatic";
    this.testTooltip_DistanceBottomRightLeftTouch["LiveUnit.IsAsync"] = true;

    // Element at the bottom left

    this.testTooltip_DistanceBottomLeftTopMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "mouse");
    };
    this.testTooltip_DistanceBottomLeftTopMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftTopMouse["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftTopMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftTopMouse["Category"] = "Automatic";
    this.testTooltip_DistanceBottomLeftTopMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftRightMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "mouse");
    };
    this.testTooltip_DistanceBottomLeftRightMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftRightMouse["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftRightMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftRightMouse["Category"] = "Automatic";
    this.testTooltip_DistanceBottomLeftRightMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftTopKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "keyboard");
    };
    this.testTooltip_DistanceBottomLeftTopKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftTopKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftTopKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftTopKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceBottomLeftTopKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftRightKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "keyboard");
    };
    this.testTooltip_DistanceBottomLeftRightKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftRightKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftRightKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftRightKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceBottomLeftRightKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftTopTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "touch");
    };
    this.testTooltip_DistanceBottomLeftTopTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftTopTouch["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftTopTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftTopTouch["Category"] = "Automatic";
    this.testTooltip_DistanceBottomLeftTopTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftRightTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "touch");
    };
    this.testTooltip_DistanceBottomLeftRightTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftRightTouch["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftRightTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftRightTouch["Category"] = "Automatic";
    this.testTooltip_DistanceBottomLeftRightTouch["LiveUnit.IsAsync"] = true;

    // Element at the top left

    this.testTooltip_DistanceTopLeftBottomMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "mouse");
    };
    this.testTooltip_DistanceTopLeftBottomMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftBottomMouse["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftBottomMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftBottomMouse["Category"] = "Automatic";
    this.testTooltip_DistanceTopLeftBottomMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftRightMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "mouse");
    };
    this.testTooltip_DistanceTopLeftRightMouse["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftRightMouse["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftRightMouse["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftRightMouse["Category"] = "Automatic";
    this.testTooltip_DistanceTopLeftRightMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftBottomKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "keyboard");
    };
    this.testTooltip_DistanceTopLeftBottomKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftBottomKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftBottomKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftBottomKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceTopLeftBottomKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftRightKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "keyboard");
    };
    this.testTooltip_DistanceTopLeftRightKeyboard["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftRightKeyboard["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftRightKeyboard["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftRightKeyboard["Category"] = "Automatic";
    this.testTooltip_DistanceTopLeftRightKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftBottomTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "touch");
    };
    this.testTooltip_DistanceTopLeftBottomTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftBottomTouch["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftBottomTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftBottomTouch["Category"] = "Automatic";
    this.testTooltip_DistanceTopLeftBottomTouch["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftRightTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "touch");
    };
    this.testTooltip_DistanceTopLeftRightTouch["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftRightTouch["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftRightTouch["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftRightTouch["Category"] = "Automatic";
    this.testTooltip_DistanceTopLeftRightTouch["LiveUnit.IsAsync"] = true;

    // Programmatically open the tooltip

    this.testTooltip_DistanceCenterTopMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceCenterTopMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterTopMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterTopMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterTopMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterTopMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterRightMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceCenterRightMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterRightMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterRightMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterRightMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterRightMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterBottomMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceCenterBottomMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterBottomMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterBottomMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterBottomMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterBottomMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterLeftMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceCenterLeftMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterLeftMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterLeftMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterLeftMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterLeftMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterTopKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceCenterTopKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterTopKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterTopKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterTopKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterTopKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterRightKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceCenterRightKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterRightKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterRightKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterRightKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterRightKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterTopTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "touchProgrammatic");
    };
    this.testTooltip_DistanceCenterTopTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterTopTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterTopTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterTopTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterTopTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterRightTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "touchProgrammatic");
    };
    this.testTooltip_DistanceCenterRightTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterRightTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterRightTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterRightTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterRightTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterBottomTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "touchProgrammatic");
    };
    this.testTooltip_DistanceCenterBottomTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterBottomTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterBottomTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterBottomTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterBottomTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceCenterLeftTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "touchProgrammatic");
    };
    this.testTooltip_DistanceCenterLeftTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceCenterLeftTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceCenterLeftTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceCenterLeftTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceCenterLeftTouch_Programmatic["LiveUnit.IsAsync"] = true;

    // Element at the top right

    this.testTooltip_DistanceTopRightBottomMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceTopRightBottomMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightBottomMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopRightBottomMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightBottomMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopRightBottomMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightLeftMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceTopRightLeftMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightLeftMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopRightLeftMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightLeftMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopRightLeftMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightBottomTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "touchProgrammatic");
    };
    this.testTooltip_DistanceTopRightBottomTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightBottomTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopRightBottomTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightBottomTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopRightBottomTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopRightLeftTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "touchProgrammatic");
    };
    this.testTooltip_DistanceTopRightLeftTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopRightLeftTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopRightLeftTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopRightLeftTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopRightLeftTouch_Programmatic["LiveUnit.IsAsync"] = true;

    // Element at the bottom right

    this.testTooltip_DistanceBottomRightTopMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceBottomRightTopMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightTopMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightTopMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightTopMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomRightTopMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightTopTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "touchProgrammatic");
    };
    this.testTooltip_DistanceBottomRightTopTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightTopTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightTopTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightTopTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomRightTopTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "touchProgrammatic");
    };
    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic["LiveUnit.IsAsync"] = true;

    // Element at the bottom left

    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "touchProgrammatic");
    };
    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "touchProgrammatic");
    };
    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic["LiveUnit.IsAsync"] = true;

    // Element at the top left

    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftRightMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "mouseoverProgrammatic");
    };
    this.testTooltip_DistanceTopLeftRightMouse_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftRightMouse_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftRightMouse_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftRightMouse_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopLeftRightMouse_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "keyboardProgrammatic");
    };
    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "touchProgrammatic");
    };
    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_DistanceTopLeftRightTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "touchProgrammatic");
    };
    this.testTooltip_DistanceTopLeftRightTouch_Programmatic["Owner"] = "evanwi";
    this.testTooltip_DistanceTopLeftRightTouch_Programmatic["Priority"] = "feature";
    this.testTooltip_DistanceTopLeftRightTouch_Programmatic["Description"] = "Test Distance of the tooltip from the element";
    this.testTooltip_DistanceTopLeftRightTouch_Programmatic["Category"] = "Programmatic";
    this.testTooltip_DistanceTopLeftRightTouch_Programmatic["LiveUnit.IsAsync"] = true;

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipDistanceTests");
