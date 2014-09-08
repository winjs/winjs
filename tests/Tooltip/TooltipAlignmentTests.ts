// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Displaying Tests for the tooltip.  Mainly check the ARIA tags.
//
//  Author: evanwi
//
//-----------------------------------------------------------------------------
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="TooltipUtils.ts"/>
// <reference path="Tooltip.css"/>

module WinJSTests {

    'use strict';

    var tooltipUtils = TooltipUtils;
    var commonUtils = CommonUtilities;

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

        var completed = false;
        function tooltipEventListener(event) {
            if (completed) {
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
                    LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), expectedAlignment);

                    // Don't validate these, just log them since we have separate distance tests.
                    tooltipUtils.getTooltipDistanceFromElement(tooltip);
                    tooltipUtils.getTooltipDistanceFromWindow(tooltip);

                    signalTestCaseCompleted();
                    completed = true;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    }

    export class TooltipAlignmentTests {
        

        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }

        testTooltip_VerifyAlignmentChangedText(signalTestCaseCompleted) {
            LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

            // Set up the anchor/trigger element.
            var element = document.getElementById(tooltipUtils.defaultElementID);
            tooltipUtils.positionElement(element, "center");

            // set up the tooltip
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "short text" });

            var completed = false;
            function tooltipEventListener(event) {
                if (completed) {
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
                        // Verify the text is centered.
                        LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), "horizontal center");
                        tooltip.innerHTML = "longer string of text";

                        // fire mouse out which should dismiss the tooltip.
                        commonUtils.mouseOverUsingMiP(element, null);
                        break;
                    case "beforeclose":
                        // Verify the changed text is centered too (see Win8 bug: 275298)
                        LiveUnit.Assert.areEqual(tooltipUtils.getTooltipAlignmentFromElement(tooltip), "horizontal center");
                        completed = true;
                        signalTestCaseCompleted();
                        break;
                }
            }
            tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        }


        testTooltip_VerifyAlignmentChangedPlacement(signalTestCaseCompleted) {
            LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

            // Set up the anchor/trigger element.
            var element = document.getElementById(tooltipUtils.defaultElementID);
            tooltipUtils.positionElement(element, "center");

            // set up the tooltip
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

            var completed = false;
            function tooltipEventListener(event) {
                if (completed) {
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
                        signalTestCaseCompleted();
                        completed = true;
                        break;
                }
            }
            tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        }

        

        // Element in the center
        testTooltip_VerifyAlignmentCenterTop(signalTestCaseCompleted) {
            testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "top", "horizontal center");
        }

        testTooltip_AlignmentCenterRight(signalTestCaseCompleted) {
            testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "right", "vertical center");
        }

        testTooltip_AlignmentCenterBottom(signalTestCaseCompleted) {
            testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "bottom", "horizontal center");
        }

        testTooltip_AlignmentCenterLeft(signalTestCaseCompleted) {
            testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "left", "vertical center");
        }

    }
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipAlignmentTests");
