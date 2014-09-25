// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//  Placement Tests for the tooltip.  When we create tooltips, we can specify which side of the "anchor element"
//  the tooltip appears at.  However, if we're too close to the edge of the screen, we'll display the tooltip on
//  a secondary side.
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
                    tooltipUtils.displayTooltip("mouse", element, tooltip);
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

    export class TooltipPlacementTests {

        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }
    }

    function flip(expected) {
        switch (expected) {
            case "top":
                return "bottom";
            case "right":
                return "left";
            case "bottom":
                return "top";
            case "left":
                return "right";
        }
    }

    ["center", "top", "top right", "right", "bottom right", "bottom", "bottom left", "left", "top left"].forEach(function (elementPlacement) {
        ["top", "right", "bottom", "left"].forEach(function (tooltipPlacement) {
            var parts = ["testTooltipPlacement", elementPlacement, tooltipPlacement];
            var testName = parts.join("");
            var expected = tooltipPlacement;
            if (elementPlacement.indexOf(tooltipPlacement) !== -1) {
                expected = flip(expected);
            }
            TooltipPlacementTests.prototype[testName] = function (complete) {
                testTooltip_VerifyPlacement(complete, elementPlacement, tooltipPlacement, expected);
            }
        });
    });
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipPlacementTests");
