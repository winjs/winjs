// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Position Tests for the "anchor" element of the tooltip (absolute, fixed, relative, relative).
//  Make sure the tooltip still appears at the correct spot when the "anchor" element is positioned
//  using this CSS property. This also tests when the html/body/parent element are scrolled.
//  To verify this, let's just measure the distance from the tooltip to the anchor.
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

TooltipPositionTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

    // Since distances can be off due to rounding errors, use this tolerance for our comparisons.
    var DISTANCE_TOLERANCE = 1;

    this.setUp = function () {
        // Add a sibling element before our element.  This helps us test static positioning.
        commonUtils.addTag("div", "siblingBeforeElement");
        var siblingBeforeElement = document.getElementById("siblingBeforeElement");
        siblingBeforeElement.innerHTML = "siblingBeforeElement";
        // Add a parent element.  This helps us with scrolling the anchor element when inside a <span>
        commonUtils.addTag("span", "parentElement");
        var parentElement = document.getElementById("parentElement");
        tooltipUtils.setUp();
        // Move the anchor element beneath a <span> so we can test scrolling the <span>
        var span1 = document.createElement("span");
        span1.innerHTML = "AAAAAAA BBBBBBB CCCCCCC DDDDDD";
        parentElement.appendChild(span1);

        var element = commonUtils.removeElementById(tooltipUtils.defaultElementID);
        parentElement.appendChild(element);

        var span2 = document.createElement("span");
        span2.innerHTML = "EEEEE FFFFFF GGGGGG HHHHHHH";
        parentElement.appendChild(span2);

        // Add a sibling element after our element.  This helps us make our <body> scrollable if needed.
        commonUtils.addTag("div", "siblingAfterElement");
        var siblingAfterElement = document.getElementById("siblingAfterElement");
        siblingAfterElement.innerHTML = "siblingAfterElement";
    };

    this.tearDown = function () {
        commonUtils.removeElementById("siblingBeforeElement");
        tooltipUtils.cleanUp();
        commonUtils.removeElementById("parentElement");
        commonUtils.removeElementById("siblingAfterElement");
    };

    //-----------------------------------------------------------------------------------

    // Verify the tooltip appears at the specified distance from the element.
    function testTooltip_VerifyPosition(signalTestCaseCompleted, elementPosition, parentPosition, scrollThe, inputMethod) {
        LiveUnit.LoggingCore.logComment("When the anchor element is positioned:  " + elementPosition);
        LiveUnit.LoggingCore.logComment("And we scroll the: " + scrollThe);
        LiveUnit.LoggingCore.logComment("And we use: " + inputMethod);
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        element.innerHTML = "e";

        // Colorize some of the elements so they're easier to see.
        var siblingElement = commonUtils.getElementById("siblingAfterElement");
        var parentElement = document.getElementById("parentElement");
        parentElement.style.backgroundColor = "Blue";
        siblingElement.style.backgroundColor = "Gray";

        // Make each child element progressively larger, to ensure they can scroll.
        document.documentElement.style.overflow = "scroll";
        document.documentElement.style.width = (window.innerWidth + 200) + "px";
        document.documentElement.style.height = (window.innerHeight + 200) + "px";
        document.body.style.overflow = "scroll";
        document.body.style.width = (window.innerWidth + 400) + "px";
        document.body.style.height = (window.innerHeight + 400) + "px";
        siblingElement.style.width = (window.innerWidth + 600) + "px";
        siblingElement.style.height = (window.innerHeight + 600) + "px";

        if (scrollThe.indexOf("html") != -1) {
            window.scrollTo(25, 25);
        }
        else {
            window.scrollTo(0, 0);
        }

        if (scrollThe.indexOf("body") != -1) {
            document.body.scrollTop = 25;
            document.body.scrollLeft = 25;
        }
        else {
            document.body.scrollTop = 0;
            document.body.scrollLeft = 0;
        }

        if (scrollThe.indexOf("parent") != -1) {
            parentElement.style.width = "100px";
            parentElement.style.height = "100px";
            parentElement.style.top = "100px";
            parentElement.style.left = "100px";
            parentElement.style.overflow = "scroll";
            parentElement.scrollTop = 25;
            parentElement.scrollLeft = 25;
        }
        else {
            parentElement.style.width = "";
            parentElement.style.height = "";
            parentElement.style.top = "";
            parentElement.style.left = "";
            parentElement.style.overflow = "auto";
            parentElement.scrollTop = 0;
            parentElement.scrollLeft = 0;
        }

        // Position the element
        parentElement.style.position = parentPosition;
        element.style.position = elementPosition;
        element.style.left = "100px";
        element.style.top = "100px";

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "t" });

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
                    // Let's just use these inputMethods (and not touch, keyboardProgrammatic, etc.)
                    // They should cover all the main scenarios for positioning:  basically the tooltip
                    // is either positioned based on the touch/mouse point, or based on the element position.
                    switch (inputMethod) {
                        case "keyboard":
                            distance = tooltipUtils.OFFSET_KEYBOARD;
                            break;
                        case "mouse":
                            distance = tooltipUtils.OFFSET_MOUSE;
                            break;
                        case "mouseoverProgrammatic":
                            distance = tooltipUtils.OFFSET_PROGRAMMATIC_NONTOUCH;
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

    // Absolute Positioning

    this.testTooltip_PositionAbsoluteStaticMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "none", "mouse");
    };
    this.testTooltip_PositionAbsoluteStaticMouse["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticMouse["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticMouse["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "body", "mouse");
    };
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "html", "mouse");
    };
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "absolute", "parent", "mouse");
    };
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "none", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionAbsoluteStaticMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "body", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "html", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "absolute", "parent", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "none", "keyboard");
    };
    this.testTooltip_PositionAbsoluteStaticKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticKeyboard["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticKeyboard["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticBodyScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "body", "keyboard");
    };
    this.testTooltip_PositionAbsoluteStaticBodyScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticBodyScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteStaticHtmlScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "static", "body", "keyboard");
    };
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionAbsoluteStaticHtmlScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "absolute", "absolute", "parent", "keyboard");
    };
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionAbsoluteAbsoluteParentScrolledKeyboard["LiveUnit.IsAsync"] = true;

    // Fixed Positioning

    this.testTooltip_PositionFixedStaticMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "none", "mouse");
    };
    this.testTooltip_PositionFixedStaticMouse["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticMouse["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticMouse["Category"] = "Position";
    this.testTooltip_PositionFixedStaticMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticBodyScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "body", "mouse");
    };
    this.testTooltip_PositionFixedStaticBodyScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticBodyScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticBodyScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticBodyScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionFixedStaticBodyScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticHtmlScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "html", "mouse");
    };
    this.testTooltip_PositionFixedStaticHtmlScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedAbsoluteParentScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "absolute", "parent", "mouse");
    };
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "none", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionFixedStaticMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionFixedStaticMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticBodyScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "body", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionFixedStaticBodyScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticBodyScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticBodyScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticBodyScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionFixedStaticBodyScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticHtmlScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "html", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionFixedStaticHtmlScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionFixedStaticHtmlScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedAbsoluteParentScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "absolute", "parent", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionFixedAbsoluteParentScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "none", "keyboard");
    };
    this.testTooltip_PositionFixedStaticKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticKeyboard["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticKeyboard["Category"] = "Position";
    this.testTooltip_PositionFixedStaticKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticBodyScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "body", "keyboard");
    };
    this.testTooltip_PositionFixedStaticBodyScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticBodyScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticBodyScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticBodyScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionFixedStaticBodyScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedStaticHtmlScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "static", "html", "keyboard");
    };
    this.testTooltip_PositionFixedStaticHtmlScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionFixedStaticHtmlScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionFixedStaticHtmlScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedStaticHtmlScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionFixedStaticHtmlScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionFixedAbsoluteParentScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "fixed", "absolute", "parent", "keyboard");
    };
    this.testTooltip_PositionFixedAbsoluteParentScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionFixedAbsoluteParentScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionFixedAbsoluteParentScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionFixedAbsoluteParentScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionFixedAbsoluteParentScrolledKeyboard["LiveUnit.IsAsync"] = true;

    // Relative Positioning

    this.testTooltip_PositionRelativeStaticMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "none", "mouse");
    };
    this.testTooltip_PositionRelativeStaticMouse["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticMouse["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticMouse["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticBodyScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "body", "mouse");
    };
    this.testTooltip_PositionRelativeStaticBodyScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticHtmlScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "html", "mouse");
    };
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "absolute", "parent", "mouse");
    };
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "none", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionRelativeStaticMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticBodyScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "body", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionRelativeStaticBodyScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticBodyScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticHtmlScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "html", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticHtmlScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "absolute", "parent", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "none", "keyboard");
    };
    this.testTooltip_PositionRelativeStaticKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticKeyboard["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticKeyboard["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticBodyScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "body", "keyboard");
    };
    this.testTooltip_PositionRelativeStaticBodyScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticBodyScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticBodyScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticBodyScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticBodyScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeStaticHtmlScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "static", "html", "keyboard");
    };
    this.testTooltip_PositionRelativeStaticHtmlScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeStaticHtmlScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionRelativeStaticHtmlScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeStaticHtmlScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionRelativeStaticHtmlScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionRelativeAbsoluteParentScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "relative", "absolute", "parent", "keyboard");
    };
    this.testTooltip_PositionRelativeAbsoluteParentScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionRelativeAbsoluteParentScrolledKeyboard["LiveUnit.IsAsync"] = true;

    // Static Positioning

    this.testTooltip_PositionStaticStaticMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "none", "mouse");
    };
    this.testTooltip_PositionStaticStaticMouse["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticMouse["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticMouse["Category"] = "Position";
    this.testTooltip_PositionStaticStaticMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticBodyScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "body", "mouse");
    };
    this.testTooltip_PositionStaticStaticBodyScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticBodyScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticBodyScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticBodyScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionStaticStaticBodyScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticHtmlScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "html", "mouse");
    };
    this.testTooltip_PositionStaticStaticHtmlScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticAbsoluteParentScrolledMouse = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "absolute", "parent", "mouse");
    };
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouse["Owner"] = "evanwi";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouse["Priority"] = "feature";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouse["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouse["Category"] = "Position";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouse["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "none", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionStaticStaticMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionStaticStaticMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticBodyScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "body", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionStaticStaticBodyScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticBodyScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticBodyScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticBodyScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionStaticStaticBodyScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticHtmlScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "html", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionStaticStaticHtmlScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionStaticStaticHtmlScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticAbsoluteParentScrolledMouseProgrammatic = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "absolute", "parent", "mouseoverProgrammatic");
    };
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouseProgrammatic["Owner"] = "evanwi";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouseProgrammatic["Priority"] = "feature";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouseProgrammatic["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouseProgrammatic["Category"] = "Position";
    this.testTooltip_PositionStaticAbsoluteParentScrolledMouseProgrammatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "none", "keyboard");
    };
    this.testTooltip_PositionStaticStaticKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticKeyboard["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticKeyboard["Category"] = "Position";
    this.testTooltip_PositionStaticStaticKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticBodyScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "body", "keyboard");
    };
    this.testTooltip_PositionStaticStaticBodyScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticBodyScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticBodyScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticBodyScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionStaticStaticBodyScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticStaticHtmlScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "static", "html", "keyboard");
    };
    this.testTooltip_PositionStaticStaticHtmlScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionStaticStaticHtmlScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionStaticStaticHtmlScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticStaticHtmlScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionStaticStaticHtmlScrolledKeyboard["LiveUnit.IsAsync"] = true;

    this.testTooltip_PositionStaticAbsoluteParentScrolledKeyboard = function (signalTestCaseCompleted) {
        testTooltip_VerifyPosition(signalTestCaseCompleted, "static", "absolute", "parent", "keyboard");
    };
    this.testTooltip_PositionStaticAbsoluteParentScrolledKeyboard["Owner"] = "evanwi";
    this.testTooltip_PositionStaticAbsoluteParentScrolledKeyboard["Priority"] = "feature";
    this.testTooltip_PositionStaticAbsoluteParentScrolledKeyboard["Description"] = "Test tooltip when the element is positioned through CSS";
    this.testTooltip_PositionStaticAbsoluteParentScrolledKeyboard["Category"] = "Position";
    this.testTooltip_PositionStaticAbsoluteParentScrolledKeyboard["LiveUnit.IsAsync"] = true;
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipPositionTests");
