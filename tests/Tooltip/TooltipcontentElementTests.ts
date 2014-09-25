// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
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

    export class TooltipContentElementTests {


        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------

        testTooltip_contentElement(signalTestCaseCompleted) {
            LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

            // Set up the anchor/trigger element.
            var element = document.getElementById(tooltipUtils.defaultElementID);
            tooltipUtils.positionElement(element, "center");

            // set up the tooltip
            var divElement = document.createElement("div");
            divElement.innerHTML = "tooltip";
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { contentElement: divElement });

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
                        LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>tooltip</div>");

                        // mouse out of the tooltip which should dismiss it.
                        commonUtils.mouseOverUsingMiP(element, null);
                        signalTestCaseCompleted();
                        completed = true;
                        break;
                }
            }
            tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        }

    }
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipContentElementTests");
