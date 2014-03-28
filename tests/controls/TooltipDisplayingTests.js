// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//
//  Abstract:
//
//  Miscellaneous Displaying Tests for the tooltip.
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

TooltipDisplayingTests = function () {
    var tooltipUtils = new TooltipUtils();
    var commonUtils = new CommonUtils();

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
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyTitleAttribute["Owner"] = "evanwi";
    this.testTooltip_VerifyTitleAttribute["Priority"] = "feature";
    this.testTooltip_VerifyTitleAttribute["Description"] = "Test Title Attribute Removed";
    this.testTooltip_VerifyTitleAttribute["Category"] = "Displaying";
    this.testTooltip_VerifyTitleAttribute["LiveUnit.IsAsync"] = true;

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

                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyTitleAttributeAfter["Owner"] = "evanwi";
    this.testTooltip_VerifyTitleAttributeAfter["Priority"] = "IDX";
    this.testTooltip_VerifyTitleAttributeAfter["Description"] = "Test Title Attribute Removed After Tooltip already created";
    this.testTooltip_VerifyTitleAttributeAfter["Category"] = "Displaying";
    this.testTooltip_VerifyTitleAttributeAfter["LiveUnit.IsAsync"] = true;

    this.testTooltip_VerifyCustomizationInnerHTML = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "<div>beforeopen</div>" });
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
                    // The tooltip DOM isn't created until after "beforeopen" returns so
                    // lets immediately fire another event and check the tooltip's DOM
                    // then.  We have to add the tooltipEventListener as a property
                    // of a global object (let's try window), otherwise it's not available to setTimeout().
                    LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));
                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'beforeopen+1'});");
                    break;
                case "beforeopen+1":
                    // Verify the tooltip text has changed.
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>beforeopen</div>");
                    tooltip.innerHTML = "<div>opened</div>";
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>opened</div>");

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
                    tooltip.innerHTML = "<div>beforeclose+1</div>";
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>beforeclose+1</div>");
                    LiveUnit.Assert.isTrue(tooltipUtils.isTooltipFullyVisible(tooltip));

                    // The tooltip DOM is gone in the "closed" event, so just test it right after beforeclose.
                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'beforeclose+1'});");
                    break;
                case "beforeclose+1":
                    // Verify the tooltip text has changed.
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>beforeclose+1</div>");
                    tooltip.innerHTML = "<div>closed</div>";
                    LiveUnit.Assert.areEqual(tooltip._domElement.innerHTML, "<div>closed</div>");
                    break;
                case "closed":
                    LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));
                    window.tooltipEventListener = null;
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyCustomizationInnerHTML["Owner"] = "evanwi";
    this.testTooltip_VerifyCustomizationInnerHTML["Priority"] = "feature";
    this.testTooltip_VerifyCustomizationInnerHTML["Description"] = "Test content can be customized/updated dynamically";
    this.testTooltip_VerifyCustomizationInnerHTML["Category"] = "Displaying";
    this.testTooltip_VerifyCustomizationInnerHTML["LiveUnit.IsAsync"] = true;

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
                    LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9999);
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
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyDefaultStyles["Owner"] = "evanwi";
    this.testTooltip_VerifyDefaultStyles["Priority"] = "feature";
    this.testTooltip_VerifyDefaultStyles["Description"] = "Test default styles cascade through to the tooltip";
    this.testTooltip_VerifyDefaultStyles["Category"] = "Displaying";
    this.testTooltip_VerifyDefaultStyles["LiveUnit.IsAsync"] = true;

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
                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'beforeopen+1'});");
                    break;
                case "beforeopen+1":
                    LiveUnit.Assert.isNotNull(tooltip._phantomDiv);
                    break;
                case "opened":
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
                    LiveUnit.Assert.areEqual(tooltipStyle.backgroundColor, "transparent");

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

                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'beforeclose+1'});");
                    break;
                case "beforeclose+1":
                    // Make sure Phantom div still exists.
                    LiveUnit.Assert.isNotNull(tooltip._phantomDiv);
                    break;
                case "closed":
                    LiveUnit.Assert.isNull(tooltip._phantomDiv);
                    window.tooltipEventListener = null;
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyPhantomDiv["Owner"] = "evanwi";
    this.testTooltip_VerifyPhantomDiv["Priority"] = "IDX";
    this.testTooltip_VerifyPhantomDiv["Description"] = "Test phantom div which helps block user input on the tooltip";
    this.testTooltip_VerifyPhantomDiv["Category"] = "Displaying";
    this.testTooltip_VerifyPhantomDiv["LiveUnit.IsAsync"] = true;

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
                case "beforeopen":
                    // The tooltip DOM isn't created yet, so fire another event.
                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'beforeopen+1'});");
                    break;
                case "beforeopen+1":
                    // We can't easily change the style of the tooltip's <div> _domElement (see Win8 Bug 271461), so just
                    // manually add the css to the tooltip's DOM element.
                    tooltip._domElement.setAttribute("class", tooltipClass + " tooltip-test-css");
                    window.tooltipEventListener = null;
                    break;
                case "opened":
                    // Verify the tooltip's styles.  Since this is just a DOM element, just check a few of
                    // them to verify the styles in .win-tooltip class are getting through.
                    LiveUnit.Assert.areNotEqual(tooltipClass.indexOf("tooltip-test-css"), -1);

                    // See tooltip.css for the values
                    var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);

                    // fontFamily is in the default stylesheet, but not specifically the tooltip section.
                    // Make sure we can override it.
                    LiveUnit.LoggingCore.logComment(tooltipStyle.fontFamily);
                    LiveUnit.Assert.areEqual(tooltipStyle.fontFamily, "Courier New");

                    // zIndex is specifically in .win-tooltip.  Make sure we can override it.
                    LiveUnit.LoggingCore.logComment(tooltipStyle.zIndex);
                    LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9998);

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    LiveUnit.Assert.areNotEqual(tooltipClass.indexOf("tooltip-test-css"), -1);
                    break;
                case "closed":
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyCustomizationStyles["Owner"] = "evanwi";
    this.testTooltip_VerifyCustomizationStyles["Priority"] = "feature";
    this.testTooltip_VerifyCustomizationStyles["Description"] = "Test content can be customized with different styles";
    this.testTooltip_VerifyCustomizationStyles["Category"] = "Displaying";
    this.testTooltip_VerifyCustomizationStyles["LiveUnit.IsAsync"] = true;

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
                case "beforeopen":
                    // The tooltip DOM isn't created yet, so fire another event.
                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'beforeopen+1'});");
                    break;
                case "beforeopen+1":
                    // zIndex is specifically in .win-tooltip.  Make sure we can override it using our extraClass.
                    var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);
                    LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9998);
                    window.tooltipEventListener = null;
                    break;
                case "opened":
                    var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);

                    // fontFamily is in the default stylesheet, but not specifically the tooltip section.
                    // Make sure we can override it using our extraClass.
                    LiveUnit.Assert.areEqual(tooltipStyle.fontFamily, "Courier New");

                    // zIndex is specifically in .win-tooltip.  Make sure we can override it using extraClass.
                    LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9998);

                    // Now remove the class and verify it does NOT get removed.  This is by design.
                    tooltip.extraClass = "";

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "beforeclose":
                    // Verify the extraClass is still affecting us now.
                    var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);
                    LiveUnit.Assert.areEqual(tooltipStyle.fontFamily, "Courier New");
                    LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9998);
                    break;
                case "closed":
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyExtraClass["Owner"] = "evanwi";
    this.testTooltip_VerifyExtraClass["Priority"] = "feature";
    this.testTooltip_VerifyExtraClass["Description"] = "Test content can be customized using the extraClass property";
    this.testTooltip_VerifyExtraClass["Category"] = "Displaying";
    this.testTooltip_VerifyExtraClass["LiveUnit.IsAsync"] = true;

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
                    var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);

                    // fontFamily is in the default stylesheet, but not specifically the tooltip section.
                    // Make sure it's not being affected.
                    // zIndex is specifically in the win-tooltip section.
                    if (timesTooltipOpened == 1) {
                        LiveUnit.Assert.areEqual(tooltipStyle.fontFamily, "Courier New");
                        LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9998);
                    }
                    else {
                        LiveUnit.Assert.areNotEqual(tooltipStyle.fontFamily, "Courier New");
                        LiveUnit.Assert.areEqual(tooltipStyle.zIndex, 9999);
                    }

                    // fire mouse out which should dismiss the tooltip.
                    commonUtils.mouseOverUsingMiP(element, null);
                    break;
                case "closed":
                    if (timesTooltipOpened == 1) {
                        tooltipUtils.fireTriggerEvent(tooltipEventListener);
                        tooltip.extraClass = "";
                    }
                    else {
                        tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    }
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyExtraClassRemoved["Owner"] = "evanwi";
    this.testTooltip_VerifyExtraClassRemoved["Priority"] = "feature";
    this.testTooltip_VerifyExtraClassRemoved["Description"] = "Test extraClass property can be removed when the tooltip isn't visible";
    this.testTooltip_VerifyExtraClassRemoved["Category"] = "Displaying";
    this.testTooltip_VerifyExtraClassRemoved["LiveUnit.IsAsync"] = true;

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

                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
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
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };

    this.testTooltip_VerifyEvents = function (signalTestCaseCompleted) {
        testTooltip_VerifyEvents(signalTestCaseCompleted, "normal");
    };
    this.testTooltip_VerifyEvents["Owner"] = "evanwi";
    this.testTooltip_VerifyEvents["Priority"] = "feature";
    this.testTooltip_VerifyEvents["Description"] = "Test events are all thrown and in the right order";
    this.testTooltip_VerifyEvents["Category"] = "Displaying";
    this.testTooltip_VerifyEvents["LiveUnit.IsAsync"] = true;

    this.testTooltip_VerifyOnEvents = function (signalTestCaseCompleted) {
        testTooltip_VerifyEvents(signalTestCaseCompleted, "on");
    };
    this.testTooltip_VerifyOnEvents["Owner"] = "evanwi";
    this.testTooltip_VerifyOnEvents["Priority"] = "feature";
    this.testTooltip_VerifyOnEvents["Description"] = "Test events are all thrown and in the right order";
    this.testTooltip_VerifyOnEvents["Category"] = "Displaying";
    this.testTooltip_VerifyOnEvents["LiveUnit.IsAsync"] = true;
    
    this.testTooltip_VerifyAnchorContainingChild = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        element.innerHTML = "Anchor Element <div id='childID'>Child of anchor element</div>";
        var childElement = document.getElementById("childID");

        // set up the tooltip on the element but not the child.
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

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
                    // Mouse over the child element which should NOT cause the tooltip to close and open again.
                    // This is primarily a test for Win8 bug 287368.
                    commonUtils.mouseOverUsingMiP(null, childElement);
                    break;
                case "beforeclose":
                    beforeclose++;
                    break;
                case "closed":
                    closed++;
                    break;
                case "5 seconds later":
                    LiveUnit.Assert.areEqual(beforeopen, 1);
                    LiveUnit.Assert.areEqual(opened, 1);
                    LiveUnit.Assert.areEqual(beforeclose, 0);
                    LiveUnit.Assert.areEqual(closed, 0);
                    window.tooltipEventListener = null;
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);

        window.tooltipEventListener = LiveUnit.GetWrappedCallback(tooltipEventListener);
        setTimeout("window.tooltipEventListener({type:'5 seconds later'});", 5000);
    };
    this.testTooltip_VerifyAnchorContainingChild["Owner"] = "evanwi";
    this.testTooltip_VerifyAnchorContainingChild["Priority"] = "feature";
    this.testTooltip_VerifyAnchorContainingChild["Description"] = "Test hovering over an anchor element's child element doesn't cause tooltip to flicker";
    this.testTooltip_VerifyAnchorContainingChild["Category"] = "Displaying";
    this.testTooltip_VerifyAnchorContainingChild["LiveUnit.IsAsync"] = true;

    this.testTooltip_VerifyNullInnerHTML = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip on the element.
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: null });

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
                case "5 seconds later":
                    LiveUnit.Assert.areEqual(tooltipUtils.isTooltipFullyVisible(tooltip), false);
                    LiveUnit.Assert.areEqual(beforeopen, 1);
                    LiveUnit.Assert.areEqual(opened, 0);
                    LiveUnit.Assert.areEqual(beforeclose, 0);
                    LiveUnit.Assert.areEqual(closed, 0);
                    window.tooltipEventListener = null;
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);

        window.tooltipEventListener = LiveUnit.GetWrappedCallback(tooltipEventListener);
        setTimeout("window.tooltipEventListener({type:'5 seconds later'});", 5000);
    };
    this.testTooltip_VerifyNullInnerHTML["Owner"] = "evanwi";
    this.testTooltip_VerifyNullInnerHTML["Priority"] = "feature";
    this.testTooltip_VerifyNullInnerHTML["Description"] = "Test a null innerHTML causes the tooltip to NOT display";
    this.testTooltip_VerifyNullInnerHTML["Category"] = "Displaying";
    this.testTooltip_VerifyNullInnerHTML["LiveUnit.IsAsync"] = true;

    this.testTooltip_VerifyFocusDoesntDisplayTooltip = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip on the element.
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: null });

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
                case "5 seconds later":
                    LiveUnit.Assert.areEqual(tooltipUtils.isTooltipFullyVisible(tooltip), false);
                    LiveUnit.Assert.areEqual(beforeopen, 0);
                    LiveUnit.Assert.areEqual(opened, 0);
                    LiveUnit.Assert.areEqual(beforeclose, 0);
                    LiveUnit.Assert.areEqual(closed, 0);
                    window.tooltipEventListener = null;
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);

        window.tooltipEventListener = LiveUnit.GetWrappedCallback(tooltipEventListener);
        setTimeout("window.tooltipEventListener({type:'5 seconds later'});", 5000);
    };
    this.testTooltip_VerifyFocusDoesntDisplayTooltip["Owner"] = "evanwi";
    this.testTooltip_VerifyFocusDoesntDisplayTooltip["Priority"] = "feature";
    this.testTooltip_VerifyFocusDoesntDisplayTooltip["Description"] = "Test tooltip doesn't display when calling focus on the element";
    this.testTooltip_VerifyFocusDoesntDisplayTooltip["Category"] = "Displaying";
    this.testTooltip_VerifyFocusDoesntDisplayTooltip["LiveUnit.IsAsync"] = true;

    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Window size: " + window.innerWidth + " " + window.innerHeight);

        // Set up the anchor/trigger element.
        var element = document.getElementById(tooltipUtils.defaultElementID);
        tooltipUtils.positionElement(element, "center");

        // set up the tooltip
        var tooltip = tooltipUtils.instantiate(tooltipUtils.defaultElementID, { innerHTML: "tooltip" });

        function tooltipEventListener(event) {
            LiveUnit.Assert.isNotNull(event);
            LiveUnit.LoggingCore.logComment(event.type);
            tooltipUtils.logTooltipInformation(tooltip);

            switch (event.type) {
                case "trigger":
                    // Display the tooltip.  Use touch since that makes the tooltip stay up forever.
                    tooltipUtils.displayTooltip("touch", element);
                    break;
                case "beforeopen":
                    break;
                case "opened":
                    LiveUnit.Assert.isTrue(tooltipUtils.isTooltipFullyVisible(tooltip));
                    // remove the anchor from the DOM.  This should not trigger beforeclose and closed to fire.
                    // Win8 Bug 275290: If you remove the "anchor element" the tooltip is attached to from the DOM,
                    // you don't receive beforeclose and closed events
                    commonUtils.removeElementById(tooltipUtils.defaultElementID);
                    window.tooltipEventListener = tooltipEventListener;
                    setTimeout("window.tooltipEventListener({type:'several seconds later'});", (tooltipUtils.DEFAULT_MESSAGE_DURATION + 1000));
                    break;
                case "beforeclose":
                    LiveUnit.Assert.fail("This should fail if win8 bug 275290 is fixed");
                    break;
                case "closed":
                    LiveUnit.Assert.fail("This should fail if win8 bug 275290 is fixed");
                    break;
                case "several seconds later":
                    LiveUnit.Assert.isFalse(tooltipUtils.isTooltipFullyVisible(tooltip));
                    window.tooltipEventListener = null;
                    tooltipUtils.fireSignalTestCaseCompleted(signalTestCaseCompleted);
                    break;
            }
        }
        tooltipUtils.setupTooltipListener(tooltip, tooltipEventListener);
        tooltipUtils.addSignalTestCaseCompleted(tooltip, signalTestCaseCompleted, tooltipUtils);
    };
    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved["Owner"] = "evanwi";
    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved["Priority"] = "feature";
    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved["Description"] = "Test tooltip disappears when the anchor is removed";
    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved["Category"] = "Displaying";
    this.testTooltip_VerifyTooltipDisappearsWhenAnchorRemoved["LiveUnit.IsAsync"] = true;

};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("TooltipDisplayingTests");
