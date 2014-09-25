// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//  Distance Tests for the tooltip.  When we display tooltips, they should not appear off-screen and should appear a
//  certain distance from the "anchor element" depending on whether touch, keyboard, or mouse triggered it.

//-----------------------------------------------------------------------------
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="TooltipUtils.ts"/>
// <reference path="Tooltip.css"/>

module WinJSTests {
    'use strict';

    var tooltipUtils = TooltipUtils;
    var commonUtils = Helper;

    // Since distances can be off due to rounding errors, use this tolerance for our comparisons.
    var DISTANCE_TOLERANCE = 1;

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
                            LiveUnit.Assert.fail("Unknown inputMethod " + inputMethod);
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
    }

    export class TooltipDistanceTests {


        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }


    }

    Helper.pairwise({
        elementPlacement: ['center', 'top right', 'top left', 'bottom right', 'bottom left'],
        tooltipPlacement: ['top', 'right', 'bottom', 'left'],
        inputMethod: ['mouse', 'keyboard', 'touch', 'mouseoverProgrammatic', 'keyboardProgrammatic', 'touchProgrammatic']
    }).forEach(function (testCase) {

            var testNameParts = ["testTooltip_Distance"];
            testNameParts.push(testCase.elementPlacement.replace(/ /g, '_'));
            testNameParts.push(testCase.tooltipPlacement);
            testNameParts.push(testCase.inputMethod);
            var testName = testNameParts.join('');
            TooltipDistanceTests.prototype[testName] = function (signalTestCaseCompleted) {
                testTooltip_VerifyDistance(signalTestCaseCompleted, testCase.elementPlacement, testCase.tooltipPlacement, testCase.inputMethod);
            }

    });
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipDistanceTests");
