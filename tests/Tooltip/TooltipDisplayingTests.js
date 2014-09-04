// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//  Miscellaneous Displaying Tests for the tooltip.
//
//  Author: evanwi
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="../TestLib/util.ts" />
/// <reference path="TooltipUtils.js"/>
/// <reference path="Tooltip.css"/>

TooltipDisplayingTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = CommonUtilities;

    this.setUp = function () {
        tooltipUtils.setUp();
    };

    this.tearDown = function () {
        tooltipUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------

    this.testTooltip_VerifyTitleAttribute = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        element.title = "title";
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID);

        // Verify the title attribute got removed during the tooltip creation, and is being used as our tooltip contents
        LiveUnit.Assert.areEqual(element.title, "");
        LiveUnit.Assert.areEqual(tooltip.innerHTML, "title");

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            LiveUnit.LoggingCore.logComment("tooltip text: " + tooltip.innerHTML);
            LiveUnit.LoggingCore.logComment("element title: " + element.getAttribute("title"));

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "title");

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyTitleAttributeAfter = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        // Set the title AFTER the tooltip is created.
        element.title = "title";

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment("event: " + event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            LiveUnit.LoggingCore.logComment("tooltip text: " + tooltip.innerHTML);
            LiveUnit.LoggingCore.logComment("element title: " + element.title);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    // Verify the title attribute got removed.
                    // Win8 bug 269361: "title" attribute is only checked during tooltip creation, but could be checked before the tooltip is actually displayed
                    LiveUnit.Assert.areEqual(element.title, "title");
                    LiveUnit.Assert.areEqual(tooltip.innerHTML, "tooltip");

                    // Try setting the title again.
                    element.title = "titlebeforeopen";
                    break;
                case "opened":
                    // Win8 bug 269361: "title" attribute is only checked during tooltip creation, but could be checked before the tooltip is actually displayed
                    LiveUnit.Assert.areEqual(element.title, "titlebeforeopen");
                    LiveUnit.Assert.areEqual(tooltip.innerHTML, "tooltip");

                    // Try setting the title again.
                    element.title = "titleOpened";

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    // Win8 bug 269361: "title" attribute is only checked during tooltip creation, but could be checked before the tooltip is actually displayed
                    LiveUnit.Assert.areEqual(element.title, "titleOpened");
                    LiveUnit.Assert.areEqual(tooltip.innerHTML, "tooltip");

                    // Try setting the title again.  Even though we're getting ready to close, it's interesting to see if we can change the title attribute.
                    element.title = "titlebeforeclose";
                    break;
                case "closed":
                    // Win8 bug 269361: "title" attribute is only checked during tooltip creation, but could be checked before the tooltip is actually displayed
                    LiveUnit.Assert.areEqual(element.title, "titlebeforeclose");
                    LiveUnit.Assert.areEqual(tooltip.innerHTML, "tooltip");

                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyCustomizationInnerHTML = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "<div>opened</div>" });
        LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);
            LiveUnit.LoggingCore.logComment("tooltip property text: " + tooltip.innerHTML);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));
                    break;
                case "opened":
                    // Verify the tooltip text has changed.
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>opened</div>");
                    tooltip.innerHTML = "<div>beforeclose</div>";
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>beforeclose</div>");
                    LiveUnit.Assert.isTrue(tooltipUtils.isTooltipFullyVisible(tooltip));

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    // Verify the tooltip text has changed.
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>beforeclose</div>");
                    tooltip.innerHTML = "<div>closed</div>";
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>closed</div>");
                    LiveUnit.Assert.isTrue(tooltipUtils.isTooltipFullyVisible(tooltip));
                    break;
                case "closed":
                    LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyDefaultStyles = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "<div>innerHTML</div>" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    break;
                case "opened":
                    // Verify the tooltip's styles.  Since this is just a DOM element, just check a few of
                    // them to verify the styles in .win-tooltip class are getting through.
                    // Try to pick a few that don't change frequently, so it won't keep breaking our tests.
                    LiveUnit.LoggingCore.logComment(tooltip._domElement.getAttribute("class"));
                    LiveUnit.Assert.areNotEqual(tooltip._domElement.getAttribute("class").indexOf("win-tooltip"), -1);

                    // From controls.css:
                    //.win-tooltip {
                    //    display: block;
                    //    position: fixed;
                    //    top: 30px;
                    //    left: 30px;
                    //    max-width: 30em;
                    //    margin: 0;
                    //    padding: 7px 12px 8px 12px;
                    //    border-style: solid;
                    //    border-width: 2px;
                    //    z-index: 9999;
                    //    word-wrap: break-word;
                    //    -ms-animation-fill-mode: both;
                    //    WIN_TYPE_XX_SMALL
                    //}
                    var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);
                    LiveUnit.LoggingCore.logComment(tooltipStyle.zIndex);
                    LiveUnit.Assert.areEqual(+tooltipStyle.zIndex, 9999);
                    LiveUnit.LoggingCore.logComment(tooltipStyle.position);
                    LiveUnit.Assert.areEqual(tooltipStyle.position, "fixed");

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    LiveUnit.LoggingCore.logComment(tooltip._domElement.getAttribute("class"));
                    LiveUnit.Assert.areNotEqual(tooltip._domElement.getAttribute("class").indexOf("win-tooltip"), -1);
                    break;
                case "closed":
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyPhantomDiv = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "<div>innerHTML</div>" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    LiveUnit.Assert.isNull(tooltip._phantomDiv);
                    break;
                case "opened":
                    LiveUnit.Assert.isNotNull(tooltip._phantomDiv);
                    // Verify the tooltip's styles.  Since this is just a DOM element, just check a few of
                    // them to verify the styles in .win-tooltip-phantom class are getting through.
                    LiveUnit.LoggingCore.logComment(tooltip._phantomDiv.getAttribute("class"));
                    LiveUnit.Assert.areNotEqual(tooltip._phantomDiv.getAttribute("class").indexOf("win-tooltip-phantom"), -1);

                    // From controls.css:
                    //    position:absolute;
                    //    background-color:transparent
                    //    top:30px;
                    //    left:30px;
                    //    border-width:0px;
                    //    padding:0px 0px 0px 0px;
                    //    display:block;
                    //    margin:0px 0px 0px 0px;

                    var tooltipStyle = window.getComputedStyle(tooltip._phantomDiv, null);
                    LiveUnit.LoggingCore.logComment(tooltipStyle.backgroundColor);
                    Helper.Assert.areColorsEqual(tooltipStyle.backgroundColor, "transparent");

                    // Make sure we can't tab to the phantom tooltip div
                    var tabindex = tooltip._phantomDiv.getAttribute("tabindex");
                    LiveUnit.LoggingCore.logComment("phantom tabindex: " + tabindex);
                    LiveUnit.Assert.isTrue(parseInt(tabindex) < 0);

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    LiveUnit.LoggingCore.logComment(tooltip._phantomDiv.getAttribute("class"));
                    LiveUnit.Assert.areNotEqual(tooltip._phantomDiv.getAttribute("class").indexOf("win-tooltip-phantom"), -1);
                    break;
                case "closed":
                    LiveUnit.Assert.isNull(tooltip._phantomDiv);
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyCustomizationStyles = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "<div>innerHTML</div>" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            if (tooltip._domElement) {
                var tooltipClass = tooltip._domElement.className;
                LiveUnit.LoggingCore.logComment(tooltipClass);
                LiveUnit.Assert.areNotEqual(tooltipClass.indexOf("win-tooltip"), -1);
            }

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    // Verify the tooltip's styles.  Since this is just a DOM element, just check a few of
                    // them to verify the styles in .win-tooltip class are getting through.
                    tooltip._domElement.setAttribute("class", tooltipClass + " tooltip-test-css");
                    WinJS.Utilities._setImmediate(function() {
                        // See Tooltip.css for the values
                        var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);

                        // fontFamily is in the default stylesheet, but not specifically the tooltip section.
                        // Make sure we can override it.
                        LiveUnit.LoggingCore.logComment(tooltipStyle.fontFamily);
                        Helper.Assert.areFontFamiliesEqual(tooltipStyle.fontFamily, "Courier New");

                        // zIndex is specifically in .win-tooltip.  Make sure we can override it.
                        LiveUnit.LoggingCore.logComment(tooltipStyle.zIndex);
                        LiveUnit.Assert.areEqual(+tooltipStyle.zIndex, 9998);

                        // fire mouse out which should dismiss the tooltip.
                        commonUtils.mouseOverUsingMiP(element, null);
                    });
                    break;
                case "beforeclose":
                    LiveUnit.Assert.areNotEqual(tooltipClass.indexOf("tooltip-test-css"), -1);
                    break;
                case "closed":
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyExtraClass = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip, use a custom extraClass
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { extraClass: "tooltip-test-css", innerHTML: "<div>innerHTML</div>" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    LiveUnit.Assert.areNotEqual(tooltip._domElement.className.indexOf("tooltip-test-css"), -1);

                    // Now remove the class and verify it does NOT get removed.  This is by design.
                    tooltip.extraClass = "";

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    // Verify the extraClass is still affecting us now.
                    LiveUnit.Assert.areNotEqual(tooltip._domElement.className.indexOf("tooltip-test-css"), -1);
                    break;
                case "closed":
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyExtraClassRemoved = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip, use a custom extraClass
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { extraClass: "tooltip-test-css", innerHTML: "<div>innerHTML</div>" });
        var timesTooltipOpened = 0;

        // This should open up the tooltip twice.
        // The first time it should have the extraClass, the second the extraClass should be removed.
        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "opened":
                    timesTooltipOpened++;

                    if (timesTooltipOpened == 1) {
                        LiveUnit.Assert.areNotEqual(tooltip._domElement.className.indexOf("tooltip-test-css"), -1);
                    }
                    else {
                        LiveUnit.Assert.areEqual(tooltip._domElement.className.indexOf("tooltip-test-css"), -1);
                    }

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "closed":
                    if (timesTooltipOpened == 1) {
                        tooltip.extraClass = "";
                        tooltipUtils.fireTriggerEvent(tooltipEventListener);
                    }
                    else {
                        signalTestCaseCompleted();
                    }
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    function testTooltip_VerifyEvents(signalTestCaseCompleted, howAddEventListeners) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        var triggerTime;
        var beforeopenTime;
        var openedTime;
        var beforecloseTime;
        var closedTime;

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            // We don't want to make these perf tests, since there's other delay times due to logging, etc.,
            // so just use "sanity" checks to make sure the events fired after each other within 10 seconds.
            switch (event.type) {
                case "trigger":
                    // Display the tooltip
                    triggerTime = (new Date()).getTime();
                    LiveUnit.LoggingCore.logComment(triggerTime);
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    beforeopenTime = (new Date()).getTime();
                    LiveUnit.LoggingCore.logComment(beforeopenTime);
                    LiveUnit.Assert.isTrue(beforeopenTime >= triggerTime);
                    LiveUnit.Assert.isTrue(beforeopenTime < (triggerTime + 10000));
                    break;
                case "opened":
                    openedTime = (new Date()).getTime();
                    LiveUnit.LoggingCore.logComment(openedTime);
                    LiveUnit.Assert.isTrue(openedTime >= beforeopenTime);
                    LiveUnit.Assert.isTrue(openedTime < (beforeopenTime + 10000));

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    beforecloseTime = (new Date()).getTime();
                    LiveUnit.LoggingCore.logComment(beforecloseTime);
                    LiveUnit.Assert.isTrue(beforecloseTime >= openedTime);
                    LiveUnit.Assert.isTrue(beforecloseTime < (openedTime + 10000));
                    break;
                case "closed":
                    closedTime = (new Date()).getTime();
                    LiveUnit.LoggingCore.logComment(closedTime);
                    LiveUnit.Assert.isTrue(closedTime >= beforecloseTime);
                    LiveUnit.Assert.isTrue(closedTime < (beforecloseTime + 10000));

                    // Verify we actually got all the events.
                    LiveUnit.Assert.areNotEqual(typeof (triggerTime), 'undefined');
                    LiveUnit.Assert.areNotEqual(typeof (beforeopenTime), 'undefined');
                    LiveUnit.Assert.areNotEqual(typeof (openedTime), 'undefined');
                    LiveUnit.Assert.areNotEqual(typeof (beforecloseTime), 'undefined');

                    signalTestCaseCompleted();
                    break;
                default:
                    LiveUnit.Assert.fail("Unkown event received");
                    break;
            }
        }
        switch (howAddEventListeners) {
            case "normal":
                tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
                break;
            case "on":
                // Test that developers can register events by calling "tooltip.onXXX" in addition to
                // calling tooltip.addEventListener("XXX") (see win8 bug 869083).
                tooltip.onbeforeopen = LiveUnit.GetWrappedCallback(tooltipEventListener);
                tooltip.onopened = LiveUnit.GetWrappedCallback(tooltipEventListener);
                tooltip.onbeforeclose = LiveUnit.GetWrappedCallback(tooltipEventListener);
                tooltip.onclosed = LiveUnit.GetWrappedCallback(tooltipEventListener);

                tooltipUtils.fireTriggerEvent(tooltipEventListener);
                break;
            default:
                LiveUnit.Assert.fail("Unkown parameter " + howAddEventListeners);
                break;
        }
    };

    this.testTooltip_VerifyEvents = function (signalTestCaseCompleted) {
        testTooltip_VerifyEvents(signalTestCaseCompleted, "normal");
    };






    this.testTooltip_VerifyOnEvents = function (signalTestCaseCompleted) {
        testTooltip_VerifyEvents(signalTestCaseCompleted, "on");
    };






    this.testTooltip_VerifyAnchorContainingChild = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        element.innerHTML = "Anchor Element <div id='childID'>Child of anchor element</div>";
        var childElement = document.getElementById("childID");

        // set up the tooltip on the element but not the child.
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });
        var testFinished = false;
        var callCount = 0;
        tooltip._setTimeout = function(callback, delay) {

            // after "opened" fires, the default "hide" timeout will get called,
            // which we can ignore.
            if(testFinished) {
                return;
            }

            callCount++;
            if(callCount > 1) {
                LiveUnit.Assert.fail("Tooltip shouldn't close.");
            } else {
                callback();
            }
        }

        var beforeopen = 0;

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    // Display the tooltip by hovering over the element (but it shouldn't display)
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    beforeopen++;
                    break;
                case "opened":
                    LiveUnit.Assert.areEqual(beforeopen, 1);
                    // Mouse over the child element which should NOT cause the tooltip to close and open again.
                    // This is primarily a test for Win8 bug 287368.
                    commonUtils.mouseOverUsingMiP(null, childElement);
                    testFinished = true;
                    signalTestCaseCompleted();
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };






    this.testTooltip_VerifyNullInnerHTML = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip on the element.
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: null });

        var callCount = 0;
        tooltip._setTimeout = function(callback, delay) {

            callCount++;

            LiveUnit.Assert.areEqual(1, callCount, "Tooltip should be cancelled.");

            // let beforeopen fire
            callback();
            LiveUnit.Assert.areEqual(tooltipUtils.isTooltipFullyVisible(tooltip), false);
            LiveUnit.Assert.areEqual(beforeopen, 1);
            LiveUnit.Assert.areEqual(opened, 0);
            LiveUnit.Assert.areEqual(beforeclose, 0);
            LiveUnit.Assert.areEqual(closed, 0);
            signalTestCaseCompleted();
        }

        var beforeopen = 0;
        var opened = 0;
        var beforeclose = 0;
        var closed = 0;

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    // Display the tooltip by hovering over the element (but it shouldn't display)
                    tooltipUtils.displayTooltip("mouse", element);
                    break;
                case "beforeopen":
                    beforeopen++;
                    break;
                case "opened":
                    opened++;
                    break;
                case "beforeclose":
                    beforeclose++;
                    break;
                case "closed":
                    closed++;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };


    this.testTooltip_VerifyFocusDoesntDisplayTooltip = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip on the element.
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: null });

        tooltip._setTimeout = function(callback, delay) {
            LiveUnit.Assert.fail("Tooltip should never display on focus");
        }

        var beforeopen = 0;
        var opened = 0;
        var beforeclose = 0;
        var closed = 0;

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    // Display the tooltip by calling focus on the element (but it shouldn't display)
                    element.focus();
                    break;
                case "beforeopen":
                    beforeopen++;
                    break;
                case "opened":
                    opened++;
                    break;
                case "beforeclose":
                    beforeclose++;
                    break;
                case "closed":
                    closed++;
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        LiveUnit.Assert.areEqual(tooltipUtils.isTooltipFullyVisible(tooltip), false);
        LiveUnit.Assert.areEqual(beforeopen, 0);
        LiveUnit.Assert.areEqual(opened, 0);
        LiveUnit.Assert.areEqual(beforeclose, 0);
        LiveUnit.Assert.areEqual(closed, 0);
        signalTestCaseCompleted();
    };






    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        var callCount = 0;
        tooltip._setTimeout = function(callback, delay) {

            callCount++;
            LiveUnit.Assert.areEqual(1, callCount, "before close/close should not fire");

            // let open fire
            callback();
            LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));


        }

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    // Display the tooltip.  Use touch since that makes the tooltip stay up forever.
                    tooltipUtils.displayTooltip("touch", element);
                    break;
                case "opened":
                    LiveUnit.Assert.isTrue(tooltipUtils.isTooltipFullyVisible(tooltip));
                    // remove the anchor from the DOM.  This should not trigger beforeclose and closed to fire.
                    // Win8 Bug 275290: If you remove the "anchor element" the tooltip is attached to from the DOM,
                    // you don't receive beforeclose and closed events
                    commonUtils.removeElementById(tooltipUtils.defaultElementID);
                    signalTestCaseCompleted();
                    break;
                case "beforeclose":
                    LiveUnit.Assert.fail("This should fail if win8 bug 275290 is fixed");
                    break;
                case "closed":
                    LiveUnit.Assert.fail("This should fail if win8 bug 275290 is fixed");
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
    };
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipDisplayingTests");
