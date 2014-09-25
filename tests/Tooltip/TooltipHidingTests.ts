// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//  Hide tests for the tooltip.  Make sure that the tooltip vanishes on the correct events.
//  These are primarily for edge cases (ex. MSPointerCancel, etc.).  Our main
//  scenarios are mostly covered by all our other "regular" tests (MSPointerOver->MSPointerOut, etc.)
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
    var Key = WinJS.Utilities.Key;

    var hideMap = {
        "mouse": {
            "close": true,
            "blur": true,
            "mouseDown": true,
            "mouseOut": true,
            "mouseUp": true,
            "shiftTab": false,
            "tab": false,
            "touchCancel": false,
            "touchDown": false,
            "touchOut": false,
            "touchUp": false
        },
        "touch": {
            "close": true,
            "blur": true,
            "mouseDown": false,
            "mouseOut": false,
            "mouseUp": false,
            "shiftTab": false,
            "tab": false,
            "touchCancel": true,
            "touchDown": false,
            "touchOut": true,
            "touchUp": true
        },
        "keyboard": {
            "close": true,
            "blur": true,
            "mouseDown": false,
            "mouseOut": false,
            "mouseUp": false,
            "shiftTab": true,
            "tab": true,
            "touchCancel": false,
            "touchDown": false,
            "touchOut": false,
            "touchUp": false
        },
        // all methods of programmatic opening have the same hide behavior
        // (some display on a delay and some don't autohide, but all respond to events in the same way)
        "defaultProgrammatic": {
            "close": true,
            "blur": false,
            "mouseDown": false,
            "mouseOut": false,
            "mouseUp": false,
            "shiftTab": false,
            "tab": false,
            "touchCancel": false,
            "touchDown": false,
            "touchOut": false,
            "touchUp": false
        }

    }

    //-----------------------------------------------------------------------------------
    // This test basically triggers the tooltip using one method, and then tries dismissing it using another
    // method.  We then verify whether is should have immediately hid or not.
    function testTooltip_Hiding(signalTestCaseCompleted, inputMethod, hideMethod) {
        if (hideMethod === "touchOut" && !tooltipUtils.pointerOutSupported) {
            signalTestCaseCompleted();
            return;
        }

        var shouldHide = hideMap[inputMethod][hideMethod];

        LiveUnit.LoggingCore.logComment("When the tooltip is triggered by:  " + inputMethod);
        LiveUnit.LoggingCore.logComment("And the following event is fired:  " + hideMethod);
        LiveUnit.LoggingCore.logComment("We expect the tooltip to hide: " + shouldHide);

        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        tooltip._setTimeout = function (callback, delay) {
            callback();
        }



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
                    if (tooltip._isShown) {
                        tooltipHidItself = false;
                        tooltip.close();
                    }
                    break;
                case "beforeclose":
                    beforecloseTime = (new Date()).getTime();
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
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    }

    export class TooltipHidingTests {


        setUp() {
            tooltipUtils.setUp();
        }

        tearDown() {
            tooltipUtils.cleanUp();
        }

    }

    Helper.pairwise({
        inputMethod: ["mouse", "touch", "keyboard", "defaultProgrammatic"],
        hideMethod: ["close", "blur", "mouseDown", "mouseOut", "mouseUp", "shiftTab", "tab", "touchCancel", "touchDown", "touchOut", "touchUp"]
    }).forEach(function (testCase) {
            var parts = ["testTooltip", testCase.inputMethod, testCase.hideMethod];
            var testName = parts.join("_");
            TooltipHidingTests.prototype[testName] = function (signalTestCaseCompleted) {
                testTooltip_Hiding(signalTestCaseCompleted, testCase.inputMethod, testCase.hideMethod);
            };
        });
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.TooltipHidingTests");
