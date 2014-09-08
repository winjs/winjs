// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Accessibility Tests for the tooltip.  Mainly check the ARIA tags.
//
//  Author: evanwi
//
//-----------------------------------------------------------------------------
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="../TestLib/util.ts" />
/// <reference path="TooltipUtils.ts"/>
// <reference path="Tooltip.css"/>


module WinJSTests {

    'use strict';

    var tooltipUtils = TooltipUtils;
    var commonUtils = CommonUtilities;

    export class TooltipAccessibilityTests {
        

        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------

        testTooltip_VerifyARIA(signalTestCaseCompleted) {
            LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

            // Set up the anchor/trigger element.
            var element = document.getElementById(tooltipUtils.defaultElementID);
            tooltipUtils.positionElement(element, "center");

            // set up the tooltip
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip", placement: "top" });

            function tooltipEventListener(event) {
                LiveUnit.Assert.isNotNull(event);
                LiveUnit.LoggingCore.logComment(event.type);
                tooltipUtils.logTooltipInformation(tooltip);

                LiveUnit.LoggingCore.logComment("element aria-describedby: " + tooltip._anchorElement.getAttribute("aria-describedby"));
                if (tooltip._domElement) {
                    LiveUnit.LoggingCore.logComment("tooltip id: " + tooltip._domElement.getAttribute("id"));
                    LiveUnit.LoggingCore.logComment("tooltip role: " + tooltip._domElement.getAttribute("role"));
                }

                switch (event.type) {
                    case "trigger":
                        tooltipUtils.displayTooltip("mouse", element, tooltip);
                        break;
                    case "beforeopen":
                        LiveUnit.Assert.isNull(tooltip._anchorElement.getAttribute("aria-describedby"));
                        break;
                    case "opened":
                        LiveUnit.Assert.areEqual(tooltip._domElement.getAttribute("role"), "tooltip");
                        LiveUnit.Assert.areEqual(tooltip._anchorElement.getAttribute("aria-describedby"),
                            tooltip._domElement.getAttribute("id"));

                        // If we have an aria-hidden attribute, make sure it says we're visible
                        var hidden = tooltip._domElement.getAttribute("aria-hidden");
                        if (hidden) {
                            LiveUnit.Assert.areEqual(hidden, "false");
                        }

                        // Make sure we can't tab to the tooltip
                        var tabindex = tooltip._domElement.getAttribute("tabindex");
                        LiveUnit.LoggingCore.logComment("tooltip tabindex: " + tabindex);
                        LiveUnit.Assert.isTrue(parseInt(tabindex) < 0);

                        // fire mouse out which should dismiss the tooltip.
                        commonUtils.mouseOverUsingMiP(element, null);
                        break;
                    case "beforeclose":
                        LiveUnit.Assert.areEqual(tooltip._domElement.getAttribute("role"), "tooltip");
                        LiveUnit.Assert.areEqual(tooltip._anchorElement.getAttribute("aria-describedby"),
                            tooltip._domElement.getAttribute("id"));

                        // If we have an aria-hidden attribute, make sure it says we're visible
                        var hidden = tooltip._domElement.getAttribute("aria-hidden");
                        if (hidden) {
                            LiveUnit.Assert.areEqual(hidden, "false");
                        }
                        break;
                    case "closed":
                        LiveUnit.Assert.isNull(tooltip._anchorElement.getAttribute("aria-describedby"));
                        signalTestCaseCompleted();
                        break;
                }
            }
            tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        }

    };


}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipAccessibilityTests");
