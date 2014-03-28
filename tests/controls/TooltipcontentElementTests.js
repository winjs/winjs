// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Testing the contentElement parameter of the tooltip.
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

TooltipContentElementTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function () {
        tooltipUtils.setUp();
    };

    this.tearDown = function () {
        tooltipUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------

    this.testTooltip_contentElement = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var divElement = document.createElement("div");
        divElement.innerHTML = "tooltip";
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { contentElement: divElement });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>tooltip</div>");

                    // mouse out of the tooltip which should dismiss it.
                    commonUtils.mouseOverUsingMiP(element, null);
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_contentElement["Owner"] = "evanwi";
    this.testTooltip_contentElement["Priority"] = "feature";
    this.testTooltip_contentElement["Description"] = "Test contentElement Property of the tooltip";
    this.testTooltip_contentElement["Category"] = "ContentElement";
    this.testTooltip_contentElement["LiveUnit.IsAsync"] = true;

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipContentElementTests");
