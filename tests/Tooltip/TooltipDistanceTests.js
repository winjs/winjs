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
/// <reference path="TooltipUtils.js"/>
/// <reference path="Tooltip.css"/>

TooltipDistanceTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    // Since distances can be off due to rounding errors, use this tolerance for our comparisons.
    var DISTANCE_TOLERANCE = 1;

    this.setUp = function (complete) {
        tooltipUtils.setUp().then(complete);
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

                    signalTestCaseCompleted();
                    testComplete = true;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };

    this.testTooltip_DistanceCenterTopMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterRightMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterBottomMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterLeftMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterTopKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterRightKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterBottomKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterLeftKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterTopTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterRightTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterBottomTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterLeftTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "touch");
    };
    
    
    
    
    

    // Element at the top right

    this.testTooltip_DistanceTopRightBottomMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightLeftMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightBottomKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightLeftKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightBottomTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightLeftTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "touch");
    };
    
    
    
    
    

    // Element at the bottom right

    this.testTooltip_DistanceBottomRightTopMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightLeftMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightTopKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightLeftKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightTopTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightLeftTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "touch");
    };
    
    
    
    
    

    // Element at the bottom left

    this.testTooltip_DistanceBottomLeftTopMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftRightMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftTopKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftRightKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftTopTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftRightTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "touch");
    };
    
    
    
    
    

    // Element at the top left

    this.testTooltip_DistanceTopLeftBottomMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftRightMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "mouse");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftBottomKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftRightKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "keyboard");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftBottomTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "touch");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftRightTouch = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "touch");
    };
    
    
    
    
    

    // Programmatically open the tooltip

    this.testTooltip_DistanceCenterTopMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterRightMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterBottomMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterLeftMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterTopKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterRightKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterBottomKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterLeftKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterTopTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "top", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterRightTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "right", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterBottomTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "bottom", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceCenterLeftTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "center", "left", "touchProgrammatic");
    };
    
    
    
    
    

    // Element at the top right

    this.testTooltip_DistanceTopRightBottomMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightLeftMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightBottomKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightLeftKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightBottomTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "bottom", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopRightLeftTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top right", "left", "touchProgrammatic");
    };
    
    
    
    
    

    // Element at the bottom right

    this.testTooltip_DistanceBottomRightTopMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightLeftMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightTopKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightLeftKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightTopTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "top", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomRightLeftTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom right", "left", "touchProgrammatic");
    };
    
    
    
    
    

    // Element at the bottom left

    this.testTooltip_DistanceBottomLeftTopMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftRightMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftTopKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftRightKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftTopTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "top", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceBottomLeftRightTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "bottom left", "right", "touchProgrammatic");
    };
    
    
    
    
    

    // Element at the top left

    this.testTooltip_DistanceTopLeftBottomMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftRightMouse_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "mouseoverProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftBottomKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftRightKeyboard_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "keyboardProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftBottomTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "bottom", "touchProgrammatic");
    };
    
    
    
    
    

    this.testTooltip_DistanceTopLeftRightTouch_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyDistance(signalTestCaseCompleted, "top left", "right", "touchProgrammatic");
    };
    
    
    
    
    

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipDistanceTests");
