// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Various utilities used by the JavaScript Tooltip Control tests.
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

function TooltipUtils() {
}
TooltipUtils.prototype = (function () {
    var commonUtils = new CommonUtils();

    // Public functions
    return {
        // Constants just for our tests.
        defaultElementID: "elementID",
        TIMEOUT_DIDNT_RECEIVE_EVENTS: 30000,

        //-----------------------------------------------------------------------------------
        // Default/constant values for tooltip.  We could get these dynamically from the tooltip, but
        // we don't want to in case there's a bug in the tooltip (this would be rare).  The downside
        // of copying them here is in case there's a valid change in the tooltip, we'd have to change our
        // code here, but that's a decent tradeoff.
        OFFSET_KEYBOARD: 12,
        OFFSET_MOUSE: 20,
        OFFSET_TOUCH: 45,
        OFFSET_PROGRAMMATIC_TOUCH: 20,
        OFFSET_PROGRAMMATIC_NONTOUCH: 12,
        DEFAULT_PLACEMENT: "top",
        DEFAULT_INFOTIP: false,
        DELAY_INITIAL_TOUCH_SHORT: 400,
        DELAY_INITIAL_TOUCH_LONG: 1200,
        DEFAULT_MOUSE_HOVER_TIME: 400,
        DEFAULT_MESSAGE_DURATION: 5000,
        DELAY_RESHOW_NONINFOTIP_TOUCH: 0,
        DELAY_RESHOW_NONINFOTIP_NONTOUCH: 600,
        DELAY_RESHOW_INFOTIP_TOUCH: 400,
        DELAY_RESHOW_INFOTIP_NONTOUCH: 600,
        RESHOW_THRESHOLD: 200,

        //-----------------------------------------------------------------------------------
        setUp: function (id) {
            /// <summary>
            ///  Test setup to run prior to every test case.
            /// </summary>
            /// <param name="id" type="string">
            ///  String specifying id of element to create.
            /// </param>
            LiveUnit.LoggingCore.logComment("In setup");
            if (typeof (WebUnit) === 'undefined') {
                // We could use the "light style" too
                // commonUtils.addCss("ui-light.css");
                commonUtils.addCss("ui-dark.css");
                commonUtils.addCss("Tooltip.css", true);
            }
            // Create a default "anchor/trigger" element the tooltip will be attached to
            // and give it a border and default text so it's easier to see when visually
            // watching the tests.
            commonUtils.addTag("span", (id ? id : this.defaultElementID));
            var element = document.getElementById(id ? id : this.defaultElementID);
            element.style.position = "absolute";
            element.textContent = "element";
            element.style.border = "solid 1px";

            // Make it tabbable to be easier to repro keyboard bugs manually.  Add another span due to bug 518083.
            element.tabIndex = "0";
            commonUtils.addTag("span", "temp");
            var element = document.getElementById("temp");
            element.tabIndex = "1";
            },

        //-----------------------------------------------------------------------------------
        cleanUp: function (id) {
            /// <summary>
            ///  Test cleanup to run prior to every test case.
            /// </summary>
            /// <param name="id" type="string">
            ///  String specifying id of element to remove.
            /// </param>
            LiveUnit.LoggingCore.logComment("In cleanUp");

            // This timer should already be disabled, but call this just in case.
            if (window.timerForTimeout) {
                clearTimeout(window.timerForTimeout);
            }
            window.timerForTimeout = null;

            commonUtils.removeElementById(id ? id : this.defaultElementID);
            if (typeof (WebUnit) === 'undefined') {
                commonUtils.removeCss("ui-dark.css");
                commonUtils.removeCss("Tooltip.css");
            }
            // Due to bug 266432, sometimes the tooltip doesn't get removed from the screen, so get rid of any leftover tooltips
            var allTooltips = document.body.getElementsByClassName("win-tooltip");
            var numberTooltips = allTooltips.length;
            if (numberTooltips > 0) {
                LiveUnit.LoggingCore.logComment("Removing leftover tooltips " + numberTooltips);
                for (var n = 0; n < numberTooltips; n++) {
                    allTooltips[n].parentNode.removeChild(allTooltips[n]);
                }
            }
            var allPhantomTooltips = document.body.getElementsByClassName("win-tooltip-phantom");
            var numberPhantomTooltips = allPhantomTooltips.length;
            if (numberPhantomTooltips > 0) {
                LiveUnit.LoggingCore.logComment("Removing leftover phantom tooltips " + numberPhantomTooltips);
                for (var n = 0; n < numberPhantomTooltips; n++) {
                    allPhantomTooltips[n].parentNode.removeChild(allPhantomTooltips[n]);
                }
            }
        },

        //-----------------------------------------------------------------------------------
        addTag: function (tagName, tagId, attributes) {
            /// <summary>
            ///  Add a tag of type tagName to the document with id set to tagId and other HTML attributes set to attributes
            /// </summary>
            /// <param name="tagName" type="string">
            ///  String specifying type of tag to create
            /// </param>
            /// <param name="tagId" type="string">
            ///  String specifying HTML id to give to created tag
            /// </param>
            /// <param name="attributes" type="object">
            ///  JavaScript object containing list of attributes to set on HTML tag (note that tagId takes precedence for "id" attribute)
            /// </param>
            return commonUtils.addTag(tagName, tagId, attributes);
        },

        //-----------------------------------------------------------------------------------
        instantiate: function (elementId, options) {
            /// <summary>
            ///  Instantiate a tooltip control out of the element specified by elementId with given options.
            /// </summary>
            /// <param name="elementId" type="string">
            ///  String specifying the tag to attach the tooltip to.
            /// </param>
            /// <param name="options" type="object">
            ///  JavaScript object containing a list of options to set on the tooltip control.
            /// </param>
            /// <returns type="object" />

            // Build a string representation of the input options for debugging purposes.
            var optString = "";
            for (var opt in options) {
                if (optString !== "") {
                    optString += ", ";
                }
                optString += opt + ": " + ((typeof (options[opt]) === "string") ? ("\"" + options[opt] + "\"") : options[opt]);
            }
            optString = "{" + optString + "}";

            LiveUnit.LoggingCore.logComment("Instantiating tooltip on element '" + elementId + "' with options = \"" + optString + "\"");

            var tooltipElement = document.getElementById(elementId);
            var tooltip = null;

            // Make the call to Win.UI.Tooltip
            var exception = null;
            try {
                tooltip = new WinJS.UI.Tooltip(tooltipElement, options);
            } catch (e) {
                exception = e;
                LiveUnit.LoggingCore.logComment(exception.message);
            }

            LiveUnit.Assert.isNull(exception, "Verify no exception occurred");
            LiveUnit.Assert.isNotNull(tooltip, "Verify tooltip creation succeeded");

            return tooltip;
        },

        isTooltipFullyVisible: function(tooltip) {
            /// <summary>
            ///  Returns whether the tooltip is fully visible.  We need a function for this in case the dev code changes
            ///  on how the tooltip gets displayed (z-order, display property, opacity, etc.).  I tried using getElementFromPoint, but
            ///  it doesn't display enough "debug" information on why the element isn't visible, and it doesn't appear to do much
            ///  more than we're doing here.  Don't consider tooltip position since we have a separate function getTooltipDistanceFromWindow that tests that.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            /// <returns type="boolean" />

            var visible = false;

            if (!tooltip._domElement)
            {
                LiveUnit.LoggingCore.logComment("No _domElement on tooltip available");
            }
            else if ((!tooltip._domElement.id) || (!document.getElementById(tooltip._domElement.id))) {
                LiveUnit.LoggingCore.logComment("_domElement not added to the DOM");
            }
            else {
                var tooltipStyle = window.getComputedStyle(tooltip._domElement, null);
                var anchorStyle = window.getComputedStyle(tooltip._anchorElement, null);

                if (parseFloat(tooltipStyle.opacity) < 1.0 ) {
                    LiveUnit.LoggingCore.logComment("Tooltip opacity is < 1.0: " + tooltipStyle.opacity);
                }
                else if (parseInt(tooltipStyle.zIndex) < 9999) {
                    LiveUnit.LoggingCore.logComment("Tooltip z-index is lower than 9999: " + tooltipStyle.zIndex);
                    // A fix for Win8 Bug 287800 is to hardcode the zIndex to 9999.
                }
                else if (tooltipStyle.display != "block") {
                    // The tooltip only sets the display style to "block", but let's check it anyway.
                    LiveUnit.LoggingCore.logComment("Tooltip display style: " + tooltipStyle.display);
                }
                else {
                    visible = true;
                }
            }
            LiveUnit.LoggingCore.logComment("Tooltip visible: " + visible);

            return visible;
        },

        logTooltipInformation: function (tooltip) {
            /// <summary>
            ///  Helper function that logs information about the tooltip and its anchor element
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            if (!tooltip) {
                LiveUnit.LoggingCore.logComment("Tooltip not available");
            }
            else {
                if (!tooltip._domElement) {
                    LiveUnit.LoggingCore.logComment ("No Tooltip DOM element");
                }
                else {
                    LiveUnit.LoggingCore.logComment(
                        "Tooltip '" +
                        tooltip._domElement.innerHTML +
                        "' at coordinates: " +
                        tooltip._domElement.offsetLeft + "x " +
                        tooltip._domElement.offsetTop + "y " +
                        tooltip._domElement.offsetWidth + "w " +
                        tooltip._domElement.offsetHeight + "h");
                }

                if (!tooltip._anchorElement) {
                    LiveUnit.LoggingCore.logComment ("No Tooltip anchor element");
                }
                else {
                    LiveUnit.LoggingCore.logComment(
                        "Element at coordinates: " +
                        tooltip._anchorElement.offsetLeft + "x " +
                        tooltip._anchorElement.offsetTop + "y " +
                        tooltip._anchorElement.offsetWidth + "w " +
                        tooltip._anchorElement.offsetHeight + "h");
                }
            }
        },

        getTooltipPlacementFromElement: function (tooltip) {
            /// <summary>
            ///  Returns where the tooltip appeared in relation to center of the element.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            /// <returns type="string" />

            var tooltipRect = commonUtils.getClientRect(tooltip._domElement);
            var elementRect = commonUtils.getClientRect(tooltip._anchorElement);
            var elementCenter = { top: (elementRect.top + (elementRect.height / 2)), left: (elementRect.left + (elementRect.width / 2)) };
            var placement;

            if (tooltipRect.top >= elementCenter.top) {
                placement = "bottom";
            }
            else if ((tooltipRect.top + tooltipRect.height) <= elementCenter.top) {
                placement = "top";
            }
            else if (tooltipRect.left >= elementCenter.left) {
                placement = "right";
            }
            else {
                placement = "left";
            }
            LiveUnit.LoggingCore.logComment("Tooltip appeared at: " + placement);

            return placement;
        },

        getTooltipAlignmentFromElement: function (tooltip) {
            /// <summary>
            ///  Returns how the tooltip is aligned to the element (right now the only return
            ///  values are "vertical center", "horizontal center", or "none").  Win8 bug 257553.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            /// <returns type="string" />

            var tooltipRect = commonUtils.getClientRect(tooltip._domElement);
            var elementRect = commonUtils.getClientRect(tooltip._anchorElement);
            var tooltipCenter = { top: (tooltipRect.top + (tooltipRect.height / 2)), left: (tooltipRect.left + (tooltipRect.width / 2)) };
            var elementCenter = { top: (elementRect.top + (elementRect.height / 2)), left: (elementRect.left + (elementRect.width / 2)) };
            var alignment;

            // Allow a tolerance of +/- 1 pixels
            if ((tooltipCenter.left <= (elementCenter.left+1)) && (tooltipCenter.left >= (elementCenter.left-1))) {
                alignment = "horizontal center";
            }
            else if ((tooltipCenter.top <= (elementCenter.top+1)) && (tooltipCenter.top >= (elementCenter.top-1))) {
                alignment = "vertical center";
            }
            else {
                alignment = "none";
            }
            LiveUnit.LoggingCore.logComment("Tooltip alignment: " + alignment);

            return alignment;
        },

        getTooltipDistanceFromElement: function (tooltip, position) {
            /// <summary>
            ///  Returns the distance from where the tooltip appeared in relation to the edge or center of the element.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            /// <param name="position" type="string">
            ///  Whether the distance returned is from the "edge" or "center" of the anchor element.
            /// </param>
            /// <returns type="number" />

            var tooltipRect = commonUtils.getClientRect(tooltip._domElement);
            var elementRect = commonUtils.getClientRect(tooltip._anchorElement);
            var elementCenter = { top: (elementRect.top + (elementRect.height / 2)), left: (elementRect.left + (elementRect.width / 2)) };
            var distance;

            if (tooltipRect.top >= elementCenter.top) {
                // bottom
                distance = ((position == "edge") ? (tooltipRect.top - elementRect.top - elementRect.height) : (tooltipRect.top - elementCenter.top));
            }
            else if ((tooltipRect.top + tooltipRect.height) <= elementCenter.top) {
                // top
                distance = ((position == "edge") ? (elementRect.top - tooltipRect.top - tooltipRect.height) : (elementCenter.top - tooltipRect.top - tooltipRect.height));
            }
            else if (tooltipRect.left >= elementCenter.left) {
                // right
                distance = ((position == "edge") ? (tooltipRect.left - elementRect.left - elementRect.width) : (tooltipRect.left - elementCenter.left));
            }
            else {
                // left
                distance = ((position == "edge") ? (elementRect.left - tooltipRect.left - tooltipRect.width) : (elementCenter.left - tooltipRect.width - tooltipRect.left));
            }

            LiveUnit.LoggingCore.logComment("Tooltip distance from element " + position + " was: " + distance + "px");

            return distance;
        },

        getTooltipDistanceFromWindow: function (tooltip) {
            /// <summary>
            ///  Returns the distance from where the tooltip appeared in relation to the edge of the window.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            /// <returns type="number" />

            var tooltipRect = commonUtils.getClientRect(tooltip._domElement);
            var distanceFromRightEdge = (window.innerWidth - tooltipRect.left - tooltipRect.width);
            var distanceFromBottomEdge = (window.innerHeight - tooltipRect.top - tooltipRect.height);

            var smallestDistance = Math.min(tooltipRect.left, tooltipRect.top);
            smallestDistance = Math.min(smallestDistance, distanceFromRightEdge);
            smallestDistance = Math.min(smallestDistance, distanceFromBottomEdge);

            LiveUnit.LoggingCore.logComment("Tooltip distance from window edge was: " + smallestDistance + "px");
            return smallestDistance;
        },

        positionElement: function (element, screenPosition) {
            /// <summary>
            ///  Moves the element which the tooltip is attached to, to either the center or one of the edges
            ///  of the screen.
            /// </summary>
            /// <param name="element" type="">
            /// <param name="screenPosition" type="string">
            ///  "top left", "top", "top right", "right", "bottom right", "bottom", "bottom left", "left", or "center"
            /// </param>

            var elementRect = commonUtils.getClientRect(element);

            switch (screenPosition) {
                case "left":
                    element.style.left = "0px";
                    element.style.top = ((window.innerHeight - elementRect.height) / 2).toFixed(0) + "px";
                    break;
                case "top left":
                    element.style.left = "0px";
                    element.style.top = "0px";
                    break;
                case "top":
                    element.style.left = ((window.innerWidth - elementRect.width) / 2).toFixed(0) + "px";
                    element.style.top = "0px";
                    break;
                case "top right":
                    element.style.left = (window.innerWidth - elementRect.width).toFixed(0) + "px";
                    element.style.top = "0px";
                    break;
                case "right":
                    element.style.left = (window.innerWidth - elementRect.width).toFixed(0) + "px";
                    element.style.top = ((window.innerHeight - elementRect.height) / 2).toFixed(0) + "px";
                    break;
                case "bottom right":
                    element.style.left = (window.innerWidth - elementRect.width).toFixed(0) + "px";
                    element.style.top = (window.innerHeight - elementRect.height).toFixed(0) + "px";
                    break;
                case "bottom":
                    element.style.left = ((window.innerWidth - elementRect.width) / 2).toFixed(0) + "px";
                    element.style.top = (window.innerHeight - elementRect.height).toFixed(0) + "px";
                    break;
                case "bottom left":
                    element.style.left = "0px";
                    element.style.top = (window.innerHeight - elementRect.height).toFixed(0) + "px";
                    break;
                case "center":
                    element.style.left = ((window.innerWidth - elementRect.width) / 2).toFixed(0) + "px";
                    element.style.top = ((window.innerHeight - elementRect.height) / 2).toFixed(0) + "px";
                    break;
            }
            LiveUnit.LoggingCore.logComment("Element actual size: " + elementRect.width + "w " + elementRect.height + "h");
            LiveUnit.LoggingCore.logComment("Window actual size: " + window.innerWidth + "w " + window.innerHeight + "h");
            LiveUnit.LoggingCore.logComment("To position element at " + screenPosition + " styles set to:" + element.style.left + " " + element.style.top);
        },

        // Triggers the tooltip to display.
        displayTooltip: function (inputMethod, element, tooltip) {
            LiveUnit.LoggingCore.logComment("Triggering tooltip using " + inputMethod);
            switch (inputMethod) {
                case "touch":
                    commonUtils.touchOver(null, element);
                    break;
                case "touchProgrammatic":
                    tooltip.open("touch");
                    break;
                case "mouse":
                    commonUtils.mouseOverUsingMiP(null, element);
                    break;
                case "mouseoverProgrammatic":
                    tooltip.open("mouseover");
                    break;
                case "mousedownProgrammatic":
                    tooltip.open("mousedown");
                    break;
                case "defaultProgrammatic":
                    tooltip.open("default");
                    break;
                case "keyboard":
                    commonUtils.keyup(element, WinJS.Utilities.Key.tab);
                    break;
                case "keyboardProgrammatic":
                    tooltip.open("keyboard");
                    break;
                default:
                    LiveUnit.Assert.fail("Unknown inputMethod" + inputMethod);
                    break;
            }
            // Clean up after ourselves, since displaying the tooltip was probably triggered by calling
            // the setupTooltipListener function.
            window.tooltipEventListenerForDisplay = null;;
            window.timerForDisplay = null;
        },

        fireTriggerEvent: function (tooltipEventListener) {
            // Trigger the tooltip after a short delay since LiveUnit runs all the tests in the same HTML page.
            // If we don't have a delay, we trigger the "reshow time" for the tooltip,
            // which displays the tooltip quicker and with no animation, and this can cause our tests to fail.
            window.tooltipEventListenerForDisplay = LiveUnit.GetWrappedCallback(tooltipEventListener);
            window.timerForDisplay = setTimeout("window.tooltipEventListenerForDisplay({type:'trigger'});", this.RESHOW_THRESHOLD);
        },

        // Common setup most of our tests use.
        setupTooltipListener: function (tooltip, tooltipEventListener) {
            tooltip.addEventListener("beforeopen", LiveUnit.GetWrappedCallback(tooltipEventListener));
            tooltip.addEventListener("opened", LiveUnit.GetWrappedCallback(tooltipEventListener));
            tooltip.addEventListener("beforeclose", LiveUnit.GetWrappedCallback(tooltipEventListener));
            tooltip.addEventListener("closed", LiveUnit.GetWrappedCallback(tooltipEventListener));

            this.fireTriggerEvent(tooltipEventListener);
        },

        // We usually call signalTestCaseCompleted() when the tooltip closes, but if for some reason the tooltip never appears,
        // we never call signalTestCaseCompleted, the system times out and "semi-crashes" and we lose any logging events.  This seems more
        // of Web/LiveUnit's problem, but until this is fixed, lets just set up our own "timeout" timer, and fire the signalTestCompleted()
        // after a timeout period.
        addSignalTestCaseCompleted: function (tooltip, signalTestCaseCompleted, tooltipUtils, timeoutMilliseconds) {
            /// <summary>
            ///  Helper function that fires signalTestCaseCompleted when the tooltip closes, or if we simply timeout.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>
            function tooltipEventListenerForClosingOutTest(event) {
                switch (event.type) {
                    case "timeout":
                        LiveUnit.Assert.isNotNull(event);
                        LiveUnit.LoggingCore.logComment(event.type);
                        tooltipUtils.logTooltipInformation(tooltip);

                        LiveUnit.Assert.fail("Timing out.");
                        window.tooltipEventListenerForTimeout = null;
                        signalTestCaseCompleted();
                        break;
                }
            }

            if (!tooltip) {
                LiveUnit.Assert.fail("Tooltip not available");
                signalTestCaseCompleted();
            }
            else {
                // Set up the timeout timer.
                window.tooltipEventListenerForTimeout = LiveUnit.GetWrappedCallback(tooltipEventListenerForClosingOutTest);
                window.timerForTimeout = setTimeout("window.tooltipEventListenerForTimeout({type:'timeout'});",
                    ((timeoutMilliseconds === undefined) ? this.TIMEOUT_DIDNT_RECEIVE_EVENTS : timeoutMilliseconds));
            }
        },

        // Companion function to addSignalTestCaseCompleted that stops the timeout timer and fires signalTestCaseCompleted().
        fireSignalTestCaseCompleted: function (signalTestCaseCompleted) {
            /// <summary>
            ///  Helper function that fires signalTestCaseCompleted and stops the timeout timer.
            /// </summary>
            /// <param name="tooltip" type="object">
            ///  Win.UI.Tooltip object
            /// </param>

            if (window.timerForTimeout) {
                clearTimeout(window.timerForTimeout);
            }
            window.timerForTimeout = null;
            window.tooltipEventListenerForTimeout = null;

            signalTestCaseCompleted();
        },

    };
})();