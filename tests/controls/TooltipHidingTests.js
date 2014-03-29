// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Hide tests for the tooltip.  Make sure that the tooltip vanishes on the correct events.
//  These are primarily for edge cases (ex. MSPointerCancel, etc.).  Our main
//  scenarios are mostly covered by all our other "regular" tests (MSPointerOver->MSPointerOut, etc.)
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

TooltipHidingTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();
    var Key = WinJS.Utilities.Key;

    this.setUp = function () {
        tooltipUtils.setUp();
    };

    this.tearDown = function () {
        tooltipUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------
    // This test basically triggers the tooltip using one method, and then tries dismissing it using another
    // method.  We then verify whether is should have immediately hid or not.
    testTooltip_Hiding = function (signalTestCaseCompleted, inputMethod, hideMethod, shouldHide) {
        LiveUnit.LoggingCore.logComment("When the tooltip is triggered by:  " + inputMethod);
        LiveUnit.LoggingCore.logComment("And the following event is fired:  " + hideMethod);
        LiveUnit.LoggingCore.logComment("We expect the tooltip to hide: " + shouldHide);

        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        var TOOLTIP_SHOULD_HAVE_STARTED_CLOSING_BY_NOW_TIME = 1000;
        var openedTime;
        var beforecloseTime;
        var tooltipHidItself = true;

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip(inputMethod, element, tooltip);
                    break;
                case "opened":
                    openedTime = (new Date()).getTime();

                    // OK tooltip has opened, now immediately try dismissing it.
                    switch (hideMethod) {
                        case "blur":
                            commonUtils.blur(element);
                            break;
                        case "close":
                            tooltip.close();
                            break;
                        case "mouseDown":
                            commonUtils.mouseDownUsingMiP(element);
                            break;
                        case "mouseOut":
                            commonUtils.mouseOverUsingMiP(element, null);
                            break;
                        case "mouseUp":
                            commonUtils.mouseUpUsingMiP(element);
                            break;
                        case "shiftTab":
                            commonUtils.keydown(element, Key.shift);
                            commonUtils.keydown(element, Key.tab);
                            break;
                        case "tab":
                            commonUtils.keydown(element, Key.tab);
                            break;
                        case "touchCancel":
                            commonUtils.touchCancel(element);
                            break;
                        case "touchDown":
                            commonUtils.touchDown(element);
                            break;
                        case "touchOut":
                            commonUtils.touchOver(element, null);
                            break;
                        case "touchUp":
                            commonUtils.touchUp(element);
                            break;
                        default:
                            LiveUnit.Assert.fail("Unknown hideMethod: " + hideMethod);
                            break;
                    }
                    // Tooltips normally fade out after around 5 seconds for keyboard and mouse.
                    // Set up a timer to catch if the tooltip didn't immediately hide itself in response to our hideMethod.
                    window.tooltipEventListener = tooltipEventListener;
                    window.timerForListener = setTimeout("window.tooltipEventListener({type:'tooltipDidntHideItself'});",
                        TOOLTIP_SHOULD_HAVE_STARTED_CLOSING_BY_NOW_TIME);
                    break;
                case "tooltipDidntHideItself":
                    // Tooltip isn't closing, so force it to close.
                    // If this doesn't close it, something is extremely wrong with the tooltip.
                    tooltipHidItself = false;
                    tooltip.close();
                    break;
                case "beforeclose":
                    beforecloseTime = (new Date()).getTime();
                    clearTimeout(window.timerForListener);
                    window.timerForLisener = null;
                    break;
                case "closed":
                    // Display the times just for debugging purposes.
                    LiveUnit.LoggingCore.logComment("openedTime " + openedTime);
                    LiveUnit.LoggingCore.logComment("beforecloseTime " + beforecloseTime);
                    var startClosingTime = (beforecloseTime - openedTime);
                    LiveUnit.LoggingCore.logComment("Start Closing time: " + startClosingTime);

                    if (shouldHide) {
                        LiveUnit.Assert.isTrue(tooltipHidItself);
                    }
                    else {
                        LiveUnit.Assert.isFalse(tooltipHidItself);
                    }
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    }


    this.testTooltip_Mouse_Blur = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "blur", true);
    };
    this.testTooltip_Mouse_Blur["Owner"] = "evanwi";
    this.testTooltip_Mouse_Blur["Priority"] = "feature";
    this.testTooltip_Mouse_Blur["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_Blur["Category"] = "Automatic";
    this.testTooltip_Mouse_Blur["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_Close = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "close", true);
    };
    this.testTooltip_Mouse_Close["Owner"] = "evanwi";
    this.testTooltip_Mouse_Close["Priority"] = "feature";
    this.testTooltip_Mouse_Close["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_Close["Category"] = "Automatic";
    this.testTooltip_Mouse_Close["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_MouseDown = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "mouseDown", true);
    };
    this.testTooltip_Mouse_MouseDown["Owner"] = "evanwi";
    this.testTooltip_Mouse_MouseDown["Priority"] = "feature";
    this.testTooltip_Mouse_MouseDown["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_MouseDown["Category"] = "Automatic";
    this.testTooltip_Mouse_MouseDown["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_MouseOut = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "mouseOut", true);
    };
    this.testTooltip_Mouse_MouseOut["Owner"] = "evanwi";
    this.testTooltip_Mouse_MouseOut["Priority"] = "feature";
    this.testTooltip_Mouse_MouseOut["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_MouseOut["Category"] = "Automatic";
    this.testTooltip_Mouse_MouseOut["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_MouseUp = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "mouseUp", true);
    };
    this.testTooltip_Mouse_MouseUp["Owner"] = "evanwi";
    this.testTooltip_Mouse_MouseUp["Priority"] = "feature";
    this.testTooltip_Mouse_MouseUp["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_MouseUp["Category"] = "Automatic";
    this.testTooltip_Mouse_MouseUp["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_ShiftTab = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "shiftTab", false);
    };
    this.testTooltip_Mouse_ShiftTab["Owner"] = "evanwi";
    this.testTooltip_Mouse_ShiftTab["Priority"] = "feature";
    this.testTooltip_Mouse_ShiftTab["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_ShiftTab["Category"] = "Automatic";
    this.testTooltip_Mouse_ShiftTab["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_Tab = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "tab", false);
    };
    this.testTooltip_Mouse_Tab["Owner"] = "evanwi";
    this.testTooltip_Mouse_Tab["Priority"] = "feature";
    this.testTooltip_Mouse_Tab["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_Tab["Category"] = "Automatic";
    this.testTooltip_Mouse_Tab["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_TouchCancel = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "touchCancel", false);
    };
    this.testTooltip_Mouse_TouchCancel["Owner"] = "evanwi";
    this.testTooltip_Mouse_TouchCancel["Priority"] = "feature";
    this.testTooltip_Mouse_TouchCancel["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_TouchCancel["Category"] = "Automatic";
    this.testTooltip_Mouse_TouchCancel["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_TouchDown = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "touchDown", false);
    };
    this.testTooltip_Mouse_TouchDown["Owner"] = "evanwi";
    this.testTooltip_Mouse_TouchDown["Priority"] = "feature";
    this.testTooltip_Mouse_TouchDown["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_TouchDown["Category"] = "Automatic";
    this.testTooltip_Mouse_TouchDown["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_TouchOut = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "touchOut", false);
    };
    this.testTooltip_Mouse_TouchOut["Owner"] = "evanwi";
    this.testTooltip_Mouse_TouchOut["Priority"] = "feature";
    this.testTooltip_Mouse_TouchOut["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_TouchOut["Category"] = "Automatic";
    this.testTooltip_Mouse_TouchOut["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouse_TouchUp = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouse", "touchUp", false);
    };
    this.testTooltip_Mouse_TouchUp["Owner"] = "evanwi";
    this.testTooltip_Mouse_TouchUp["Priority"] = "feature";
    this.testTooltip_Mouse_TouchUp["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouse_TouchUp["Category"] = "Automatic";
    this.testTooltip_Mouse_TouchUp["LiveUnit.IsAsync"] = true;


    this.testTooltip_Touch_Blur = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "blur", true);
    };
    this.testTooltip_Touch_Blur["Owner"] = "evanwi";
    this.testTooltip_Touch_Blur["Priority"] = "feature";
    this.testTooltip_Touch_Blur["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_Blur["Category"] = "Automatic";
    this.testTooltip_Touch_Blur["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_Close = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "close", true);
    };
    this.testTooltip_Touch_Close["Owner"] = "evanwi";
    this.testTooltip_Touch_Close["Priority"] = "feature";
    this.testTooltip_Touch_Close["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_Close["Category"] = "Automatic";
    this.testTooltip_Touch_Close["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_MouseDown = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "mouseDown", false);
    };
    this.testTooltip_Touch_MouseDown["Owner"] = "evanwi";
    this.testTooltip_Touch_MouseDown["Priority"] = "feature";
    this.testTooltip_Touch_MouseDown["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_MouseDown["Category"] = "Automatic";
    this.testTooltip_Touch_MouseDown["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_MouseOut = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "mouseOut", false);
    };
    this.testTooltip_Touch_MouseOut["Owner"] = "evanwi";
    this.testTooltip_Touch_MouseOut["Priority"] = "feature";
    this.testTooltip_Touch_MouseOut["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_MouseOut["Category"] = "Automatic";
    this.testTooltip_Touch_MouseOut["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_MouseUp = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "mouseUp", false);
    };
    this.testTooltip_Touch_MouseUp["Owner"] = "evanwi";
    this.testTooltip_Touch_MouseUp["Priority"] = "feature";
    this.testTooltip_Touch_MouseUp["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_MouseUp["Category"] = "Automatic";
    this.testTooltip_Touch_MouseUp["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_ShiftTab = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "shiftTab", false);
    };
    this.testTooltip_Touch_ShiftTab["Owner"] = "evanwi";
    this.testTooltip_Touch_ShiftTab["Priority"] = "feature";
    this.testTooltip_Touch_ShiftTab["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_ShiftTab["Category"] = "Automatic";
    this.testTooltip_Touch_ShiftTab["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_Tab = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "tab", false);
    };
    this.testTooltip_Touch_Tab["Owner"] = "evanwi";
    this.testTooltip_Touch_Tab["Priority"] = "feature";
    this.testTooltip_Touch_Tab["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_Tab["Category"] = "Automatic";
    this.testTooltip_Touch_Tab["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchCancel = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "touchCancel", true);
    };
    this.testTooltip_Touch_TouchCancel["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchCancel["Priority"] = "feature";
    this.testTooltip_Touch_TouchCancel["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchCancel["Category"] = "Automatic";
    this.testTooltip_Touch_TouchCancel["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchDown = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "touchDown", false);
    };
    this.testTooltip_Touch_TouchDown["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchDown["Priority"] = "feature";
    this.testTooltip_Touch_TouchDown["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchDown["Category"] = "Automatic";
    this.testTooltip_Touch_TouchDown["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchOut = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "touchOut", true);
    };
    this.testTooltip_Touch_TouchOut["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchOut["Priority"] = "feature";
    this.testTooltip_Touch_TouchOut["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchOut["Category"] = "Automatic";
    this.testTooltip_Touch_TouchOut["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchUp = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touch", "touchUp", true);
    };
    this.testTooltip_Touch_TouchUp["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchUp["Priority"] = "feature";
    this.testTooltip_Touch_TouchUp["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchUp["Category"] = "Automatic";
    this.testTooltip_Touch_TouchUp["LiveUnit.IsAsync"] = true;


    this.testTooltip_Keyboard_Blur = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "blur", true);
    };
    this.testTooltip_Keyboard_Blur["Owner"] = "evanwi";
    this.testTooltip_Keyboard_Blur["Priority"] = "feature";
    this.testTooltip_Keyboard_Blur["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_Blur["Category"] = "Automatic";
    this.testTooltip_Keyboard_Blur["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_Close = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "close", true);
    };
    this.testTooltip_Keyboard_Close["Owner"] = "evanwi";
    this.testTooltip_Keyboard_Close["Priority"] = "feature";
    this.testTooltip_Keyboard_Close["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_Close["Category"] = "Automatic";
    this.testTooltip_Keyboard_Close["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_MouseDown = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "mouseDown", false);
    };
    this.testTooltip_Keyboard_MouseDown["Owner"] = "evanwi";
    this.testTooltip_Keyboard_MouseDown["Priority"] = "feature";
    this.testTooltip_Keyboard_MouseDown["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_MouseDown["Category"] = "Automatic";
    this.testTooltip_Keyboard_MouseDown["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_MouseOut = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "mouseOut", false);
    };
    this.testTooltip_Keyboard_MouseOut["Owner"] = "evanwi";
    this.testTooltip_Keyboard_MouseOut["Priority"] = "feature";
    this.testTooltip_Keyboard_MouseOut["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_MouseOut["Category"] = "Automatic";
    this.testTooltip_Keyboard_MouseOut["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_MouseUp = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "mouseUp", false);
    };
    this.testTooltip_Keyboard_MouseUp["Owner"] = "evanwi";
    this.testTooltip_Keyboard_MouseUp["Priority"] = "feature";
    this.testTooltip_Keyboard_MouseUp["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_MouseUp["Category"] = "Automatic";
    this.testTooltip_Keyboard_MouseUp["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_ShiftTab = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "shiftTab", true);
    };
    this.testTooltip_Keyboard_ShiftTab["Owner"] = "evanwi";
    this.testTooltip_Keyboard_ShiftTab["Priority"] = "feature";
    this.testTooltip_Keyboard_ShiftTab["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_ShiftTab["Category"] = "Automatic";
    this.testTooltip_Keyboard_ShiftTab["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_Tab = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "tab", true);
    };
    this.testTooltip_Keyboard_Tab["Owner"] = "evanwi";
    this.testTooltip_Keyboard_Tab["Priority"] = "feature";
    this.testTooltip_Keyboard_Tab["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_Tab["Category"] = "Automatic";
    this.testTooltip_Keyboard_Tab["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchCancel = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "touchCancel", false);
    };
    this.testTooltip_Keyboard_TouchCancel["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchCancel["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchCancel["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchCancel["Category"] = "Automatic";
    this.testTooltip_Keyboard_TouchCancel["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchDown = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "touchDown", false);
    };
    this.testTooltip_Keyboard_TouchDown["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchDown["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchDown["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchDown["Category"] = "Automatic";
    this.testTooltip_Keyboard_TouchDown["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchOut = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "touchOut", false);
    };
    this.testTooltip_Keyboard_TouchOut["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchOut["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchOut["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchOut["Category"] = "Automatic";
    this.testTooltip_Keyboard_TouchOut["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchUp = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboard", "touchUp", false);
    };
    this.testTooltip_Keyboard_TouchUp["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchUp["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchUp["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchUp["Category"] = "Automatic";
    this.testTooltip_Keyboard_TouchUp["LiveUnit.IsAsync"] = true;

    // Programmaticly opening the tooltip.

    this.testTooltip_Mouseover_Blur_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "blur", false);
    };
    this.testTooltip_Mouseover_Blur_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_Blur_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_Blur_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_Blur_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_Blur_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_Close_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "close", true);
    };
    this.testTooltip_Mouseover_Close_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_Close_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_Close_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_Close_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_Close_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_MouseDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "mouseDown", false);
    };
    this.testTooltip_Mouseover_MouseDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_MouseDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_MouseDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_MouseDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_MouseDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_MouseOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "mouseOut", false);
    };
    this.testTooltip_Mouseover_MouseOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_MouseOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_MouseOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_MouseOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_MouseOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_MouseUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "mouseUp", false);
    };
    this.testTooltip_Mouseover_MouseUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_MouseUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_MouseUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_MouseUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_MouseUp_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_ShiftTab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "shiftTab", false);
    };
    this.testTooltip_Mouseover_ShiftTab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_ShiftTab_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_ShiftTab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_ShiftTab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_ShiftTab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_Tab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "tab", false);
    };
    this.testTooltip_Mouseover_Tab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_Tab_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_Tab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_Tab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_Tab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_TouchCancel_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "touchCancel", false);
    };
    this.testTooltip_Mouseover_TouchCancel_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_TouchCancel_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_TouchCancel_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_TouchCancel_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_TouchCancel_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_TouchDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "touchDown", false);
    };
    this.testTooltip_Mouseover_TouchDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_TouchDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_TouchDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_TouchDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_TouchDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_TouchOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "touchOut", false);
    };
    this.testTooltip_Mouseover_TouchOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_TouchOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_TouchOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_TouchOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_TouchOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mouseover_TouchUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mouseoverProgrammatic", "touchUp", false);
    };
    this.testTooltip_Mouseover_TouchUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mouseover_TouchUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Mouseover_TouchUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mouseover_TouchUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mouseover_TouchUp_Programmatic["LiveUnit.IsAsync"] = true;

    // We could have a large set of cases for _Mousedown_ but it's basically the same as _Default_
    // so just cover a few cases.

    this.testTooltip_Mousedown_Close_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mousedownProgrammatic", "close", true);
    };
    this.testTooltip_Mousedown_Close_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mousedown_Close_Programmatic["Priority"] = "feature";
    this.testTooltip_Mousedown_Close_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mousedown_Close_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mousedown_Close_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Mousedown_MouseUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "mousedownProgrammatic", "mouseUp", false);
    };
    this.testTooltip_Mousedown_MouseUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Mousedown_MouseUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Mousedown_MouseUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Mousedown_MouseUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Mousedown_MouseUp_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_Blur_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "blur", false);
    };
    this.testTooltip_Default_Blur_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_Blur_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_Blur_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_Blur_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_Blur_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_Close_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "close", true);
    };
    this.testTooltip_Default_Close_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_Close_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_Close_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_Close_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_Close_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_MouseDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "mouseDown", false);
    };
    this.testTooltip_Default_MouseDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_MouseDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_MouseDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_MouseDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_MouseDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_MouseOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "mouseOut", false);
    };
    this.testTooltip_Default_MouseOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_MouseOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_MouseOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_MouseOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_MouseOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_MouseUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "mouseUp", false);
    };
    this.testTooltip_Default_MouseUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_MouseUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_MouseUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_MouseUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_MouseUp_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_ShiftTab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "shiftTab", false);
    };
    this.testTooltip_Default_ShiftTab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_ShiftTab_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_ShiftTab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_ShiftTab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_ShiftTab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_Tab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "tab", false);
    };
    this.testTooltip_Default_Tab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_Tab_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_Tab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_Tab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_Tab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_TouchCancel_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "touchCancel", false);
    };
    this.testTooltip_Default_TouchCancel_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_TouchCancel_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_TouchCancel_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_TouchCancel_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_TouchCancel_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_TouchDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "touchDown", false);
    };
    this.testTooltip_Default_TouchDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_TouchDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_TouchDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_TouchDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_TouchDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.xtestTooltip_Default_TouchOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "touchOut", false);
    };
    this.xtestTooltip_Default_TouchOut_Programmatic["Owner"] = "evanwi";
    this.xtestTooltip_Default_TouchOut_Programmatic["Priority"] = "feature";
    this.xtestTooltip_Default_TouchOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.xtestTooltip_Default_TouchOut_Programmatic["Category"] = "Programmatic";
    this.xtestTooltip_Default_TouchOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Default_TouchUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "defaultProgrammatic", "touchUp", false);
    };
    this.testTooltip_Default_TouchUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Default_TouchUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Default_TouchUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Default_TouchUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Default_TouchUp_Programmatic["LiveUnit.IsAsync"] = true;


    this.testTooltip_Touch_Blur_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "blur", false);
    };
    this.testTooltip_Touch_Blur_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_Blur_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_Blur_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_Blur_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_Blur_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_Close_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "close", true);
    };
    this.testTooltip_Touch_Close_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_Close_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_Close_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_Close_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_Close_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_MouseDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "mouseDown", false);
    };
    this.testTooltip_Touch_MouseDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_MouseDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_MouseDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_MouseDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_MouseDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_MouseOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "mouseOut", false);
    };
    this.testTooltip_Touch_MouseOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_MouseOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_MouseOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_MouseOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_MouseOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_MouseUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "mouseUp", false);
    };
    this.testTooltip_Touch_MouseUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_MouseUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_MouseUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_MouseUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_MouseUp_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_ShiftTab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "shiftTab", false);
    };
    this.testTooltip_Touch_ShiftTab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_ShiftTab_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_ShiftTab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_ShiftTab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_ShiftTab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_Tab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "tab", false);
    };
    this.testTooltip_Touch_Tab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_Tab_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_Tab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_Tab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_Tab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchCancel_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "touchCancel", false);
    };
    this.testTooltip_Touch_TouchCancel_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchCancel_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_TouchCancel_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchCancel_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_TouchCancel_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "touchDown", false);
    };
    this.testTooltip_Touch_TouchDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_TouchDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_TouchDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "touchOut", false);
    };
    this.testTooltip_Touch_TouchOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_TouchOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_TouchOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Touch_TouchUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "touchProgrammatic", "touchUp", false);
    };
    this.testTooltip_Touch_TouchUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Touch_TouchUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Touch_TouchUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Touch_TouchUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Touch_TouchUp_Programmatic["LiveUnit.IsAsync"] = true;


    this.testTooltip_Keyboard_Blur_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "blur", false);
    };
    this.testTooltip_Keyboard_Blur_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_Blur_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_Blur_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_Blur_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_Blur_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_Close_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "close", true);
    };
    this.testTooltip_Keyboard_Close_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_Close_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_Close_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_Close_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_Close_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_MouseDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "mouseDown", false);
    };
    this.testTooltip_Keyboard_MouseDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_MouseDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_MouseDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_MouseDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_MouseDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_MouseOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "mouseOut", false);
    };
    this.testTooltip_Keyboard_MouseOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_MouseOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_MouseOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_MouseOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_MouseOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_MouseUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "mouseUp", false);
    };
    this.testTooltip_Keyboard_MouseUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_MouseUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_MouseUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_MouseUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_MouseUp_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_ShiftTab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "shiftTab", false);
    };
    this.testTooltip_Keyboard_ShiftTab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_ShiftTab_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_ShiftTab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_ShiftTab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_ShiftTab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_Tab_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "tab", false);
    };
    this.testTooltip_Keyboard_Tab_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_Tab_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_Tab_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_Tab_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_Tab_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchCancel_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "touchCancel", false);
    };
    this.testTooltip_Keyboard_TouchCancel_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchCancel_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchCancel_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchCancel_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_TouchCancel_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchDown_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "touchDown", false);
    };
    this.testTooltip_Keyboard_TouchDown_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchDown_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchDown_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchDown_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_TouchDown_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchOut_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "touchOut", false);
    };
    this.testTooltip_Keyboard_TouchOut_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchOut_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchOut_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchOut_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_TouchOut_Programmatic["LiveUnit.IsAsync"] = true;

    this.testTooltip_Keyboard_TouchUp_Programmatic = function (signalTestCaseCompleted) {
        testTooltip_Hiding(signalTestCaseCompleted, "keyboardProgrammatic", "touchUp", false);
    };
    this.testTooltip_Keyboard_TouchUp_Programmatic["Owner"] = "evanwi";
    this.testTooltip_Keyboard_TouchUp_Programmatic["Priority"] = "feature";
    this.testTooltip_Keyboard_TouchUp_Programmatic["Description"] = "Test tooltip hides on the proper events";
    this.testTooltip_Keyboard_TouchUp_Programmatic["Category"] = "Programmatic";
    this.testTooltip_Keyboard_TouchUp_Programmatic["LiveUnit.IsAsync"] = true;

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipHidingTests");
