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
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="TooltipUtils.js"/>
/// <reference path="Tooltip.css"/>

TooltipAlignmentTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function (complete) {
        tooltipUtils.setUp().then(complete);
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
                    completed = true;
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };
    
    
    
    
    

    this.testTooltip_VerifyAlignmentChangedPlacement = function (signalTestCaseCompleted) {
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
                    signalTestCaseCompleted();
                    completed = true;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };
    
    
    
    
    

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
                    tooltipUtils.displayTooltip("mouse", element);
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

    // Element in the center
    this.testTooltip_VerifyAlignmentCenterTop = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "top", "horizontal center");
    };
    
    
    
    
    

    this.testTooltip_AlignmentCenterRight = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "right", "vertical center");
    };
    
    
    
    
    

    this.testTooltip_AlignmentCenterBottom = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "bottom", "horizontal center");
    };
    
    
    
    
    

    this.testTooltip_AlignmentCenterLeft = function (signalTestCaseCompleted) {
        testTooltip_VerifyAlignment(signalTestCaseCompleted, "center", "left", "vertical center");
    };
    
    
    
    
    

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipAlignmentTests");
