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

    export class TooltipBasicTests {


        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------

        // Verify the default properties for a tooltip
        testTooltip_Instantiation() {
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

            LiveUnit.Assert.areEqual(tooltip.placement, tooltipUtils.DEFAULT_PLACEMENT);
            LiveUnit.Assert.areEqual(tooltip.infotip, tooltipUtils.DEFAULT_INFOTIP);
            LiveUnit.Assert.areEqual(tooltip.innerHTML, null);
            LiveUnit.Assert.areEqual(tooltip.contentElement, null);
        }

        // Verify the properties can be set during initialization.  This is just a basic check
        // and these options are tested in other functions
        testTooltip_Instantiation_options() {
            var divElement = document.createElement("div");
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID,
                {
                    placement: "bottom", infotip: (!tooltipUtils.DEFAULT_INFOTIP),
                    innerHTML: "innerHTML", contentElement: divElement,
                    extraClass: "dummyClass"
                });

            LiveUnit.Assert.areEqual(tooltip.placement, "bottom");
            LiveUnit.Assert.areEqual(tooltip.infotip, !tooltipUtils.DEFAULT_INFOTIP);
            LiveUnit.Assert.areEqual(tooltip.innerHTML, "innerHTML");
            LiveUnit.Assert.areEqual(tooltip.contentElement, divElement);
            LiveUnit.Assert.areEqual(tooltip.extraClass, "dummyClass");
        }


        // Verify tooltip either converts properties or throws an exception.
        // The only truly valid parameter to elementContent is an HTML element, but we don't throw any errors
        // during instantiation.
        testTooltip_Instantiation_elementContent() {
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

            tooltip.elementContent = false;
            LiveUnit.Assert.areEqual(tooltip.elementContent, false, "false");
            tooltip.elementContent = 0;
            LiveUnit.Assert.areEqual(tooltip.elementContent, 0, "0");
            tooltip.elementContent = 1;
            LiveUnit.Assert.areEqual(tooltip.elementContent, 1, "1");
            tooltip.elementContent = "string";
            LiveUnit.Assert.areEqual(tooltip.elementContent, "string", "string");
            tooltip.elementContent = "";
            LiveUnit.Assert.areEqual(tooltip.elementContent, "", "empty string");
            tooltip.elementContent = null;
            LiveUnit.Assert.areEqual(tooltip.elementContent, null, "null");
            tooltip.elementContent = undefined;
            LiveUnit.Assert.isTrue((typeof (tooltip.elementContent) == "undefined"), "undefined");
            tooltip.elementContent = NaN;
            LiveUnit.Assert.isTrue(isNaN(tooltip.elementContent), "NaN");
            tooltip.elementContent = "<div>string</div>";
            LiveUnit.Assert.areEqual(tooltip.elementContent, "<div>string</div>");
        }


        // Verify tooltip either converts properties or throws an exception.
        testTooltip_Instantiation_infotip() {
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

            // See Win8 bug 258757 Tooltip converts non-boolean parameters to boolean whereas Rating control doesn't
            tooltip.infotip = false;
            LiveUnit.Assert.areEqual(tooltip.infotip, false, "false");
            tooltip.infotip = true;
            LiveUnit.Assert.areEqual(tooltip.infotip, true, "true");
            tooltip.infotip = 0;
            LiveUnit.Assert.areEqual(tooltip.infotip, false, "0");
            tooltip.infotip = 1;
            LiveUnit.Assert.areEqual(tooltip.infotip, true, "1");
            tooltip.infotip = "string";
            LiveUnit.Assert.areEqual(tooltip.infotip, true, "string");
            tooltip.infotip = "";
            LiveUnit.Assert.areEqual(tooltip.infotip, false, "empty string");
            tooltip.infotip = null;
            LiveUnit.Assert.areEqual(tooltip.infotip, false, "null");
            tooltip.infotip = undefined;
            LiveUnit.Assert.areEqual(tooltip.infotip, false, "undefined");
            tooltip.infotip = NaN;
            LiveUnit.Assert.areEqual(tooltip.infotip, false, "NaN");
        }


        // Verify tooltip either converts properties or throws an exception.
        testTooltip_Instantiation_inner() {
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

            // Win8 bug 258770: Tooltip innerHTML properties can be set to non-string values and don't throw exceptions
            tooltip.innerHTML = false;
            LiveUnit.Assert.areEqual(tooltip.innerHTML, false, "false");
            tooltip.innerHTML = 0;
            LiveUnit.Assert.areEqual(tooltip.innerHTML, 0, "0");
            tooltip.innerHTML = 1;
            LiveUnit.Assert.areEqual(tooltip.innerHTML, 1, "1");
            tooltip.innerHTML = "string";
            LiveUnit.Assert.areEqual(tooltip.innerHTML, "string", "string");
            tooltip.innerHTML = "";
            LiveUnit.Assert.areEqual(tooltip.innerHTML, "", "empty string");
            tooltip.innerHTML = null;
            LiveUnit.Assert.areEqual(tooltip.innerHTML, null, "null");
            tooltip.innerHTML = undefined;
            LiveUnit.Assert.isTrue((typeof (tooltip.innerHTML) == "undefined"), "undefined");
            tooltip.innerHTML = NaN;
            LiveUnit.Assert.isTrue(isNaN(tooltip.innerHTML), "NaN");
            tooltip.innerHTML = "<div>string</div>";
            LiveUnit.Assert.areEqual(tooltip.innerHTML, "<div>string</div>");
            // Win8 Bug 269253: We're removing the textContent property, so it shouldn't be affected by innerHTML and should
            // just return undefined
            LiveUnit.Assert.isTrue((typeof (tooltip.textContent) == "undefined"), "undefined");
            // Win8 Bug 342701: We're removing the delay property, so it should just return undefined
            LiveUnit.Assert.isTrue((typeof (tooltip.delay) == "undefined"), "undefined");

        }


        // Verify tooltip either converts properties or throws an exception.
        testTooltip_Instantiation_placement() {
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

            function testBadPlacement(tooltip, placementText) {
                LiveUnit.LoggingCore.logComment("Testing placement: " + placementText);
                var exception = null;
                try {
                    tooltip.placement = placementText;
                } catch (e) {
                    exception = e;
                }
                LiveUnit.Assert.isNull(exception);
                LiveUnit.Assert.areEqual(tooltip.placement, tooltipUtils.DEFAULT_PLACEMENT);
            }

            testBadPlacement(tooltip, "Top");
            testBadPlacement(tooltip, null);
            testBadPlacement(tooltip, undefined);
            testBadPlacement(tooltip, false);
            testBadPlacement(tooltip, "0");
            testBadPlacement(tooltip, "1");
            testBadPlacement(tooltip, "");
            testBadPlacement(tooltip, NaN);
        }


        // Verify tooltip either converts properties or throws an exception.
        // The only truly valid parameter to extraClass is a string, but we don't throw any errors
        // during instantiation.
        testTooltip_Instantiation_extraClass() {
            var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

            tooltip.extraClass = false;
            LiveUnit.Assert.areEqual(tooltip.extraClass, false, "false");
            tooltip.extraClass = 0;
            LiveUnit.Assert.areEqual(tooltip.extraClass, 0, "0");
            tooltip.extraClass = 1;
            LiveUnit.Assert.areEqual(tooltip.extraClass, 1, "1");
            tooltip.extraClass = "string";
            LiveUnit.Assert.areEqual(tooltip.extraClass, "string", "string");
            tooltip.extraClass = "";
            LiveUnit.Assert.areEqual(tooltip.extraClass, "", "empty string");
            tooltip.extraClass = null;
            LiveUnit.Assert.areEqual(tooltip.extraClass, null, "null");
            tooltip.extraClass = undefined;
            LiveUnit.Assert.isTrue((typeof (tooltip.extraClass) == "undefined"), "undefined");
            tooltip.extraClass = NaN;
            LiveUnit.Assert.isTrue(isNaN(tooltip.extraClass), "NaN");
            tooltip.extraClass = "<div>string</div>";
            LiveUnit.Assert.areEqual(tooltip.extraClass, "<div>string</div>");
        }

    }
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipBasicTests");
