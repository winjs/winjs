// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Various utilities used by the Toggle Control tests.
//      Based on sehume's rating control utilities.
//
//  Author: michabol
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="ToggleUtils.js"/>

function ToggleUtils() {
}
ToggleUtils.prototype = (function () {
    var commonUtils = new CommonUtils();

    // Public functions
    return {
        //-----------------------------------------------------------------------------------
        // List of exceptions the toggle control throws
        exceptions: {
            elementIsInvalid: "Invalid argument: Toggle control expects a valid DOM element as the first argument.",
            invalidConstructorCall: 'Invalid constructor call: Please use the "new" operator to create a toggle switch.'
        },

        //-----------------------------------------------------------------------------------
        // List of css parts defined for toggle control
        parts: {
            overallControl: "win-toggle",
            overallSwitch: "win-toggle-switch",
            title: "win-toggle-title",
            labelOn: "win-toggle-label-on",
            labelOff: "win-toggle-label-off",
            switchTrack: "win-toggle-track",
            switchTrackDisabled: "win-toggle-track-disabled",
            switchThumb: "win-toggle-thumb",
            switchThumbDisabled: "win-toggle-thumb-disabled",
            switchFillOn: "win-toggle-fill-on",
            switchFillOnDisabled: "win-toggle-fill-on-disabled",
            switchFillOff: "win-toggle-fill-off",
            switchFillOffDisabled: "win-toggle-fill-off-disabled"
        },

        //-----------------------------------------------------------------------------------
        // default values for toggle control parts
        defaultLabelOn: "On",
        defaultLabelOff: "Off",
        defaultTitle: "",
        defaultChecked: false,
        defaultDisabled: false,

        //-----------------------------------------------------------------------------------
        setUp: function () {
            /// <summary>
            ///  Test setup to run prior to every test case.
            /// </summary>
            LiveUnit.LoggingCore.logComment("In setup");
            commonUtils.addTag("div", "toggle");
            
            return WinJS.Promise.wrap();
        },

        //-----------------------------------------------------------------------------------
        cleanUp: function () {
            /// <summary>
            ///  Test cleanup to run prior to every test case.
            /// </summary>
            LiveUnit.LoggingCore.logComment("In cleanUp");
            commonUtils.removeElementById("toggle");
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
        removeElementById: function (tagId) {
            /// <summary>
            ///  Remove an existing tag from the DOM
            /// </summary>
            /// <param name="tagId" type="string">
            ///  String specifying the tag to remove.
            /// </param>
            var element = commonUtils.removeElementById(tagId);
            LiveUnit.Assert.isNotNull(element, "Couldn't find element " + tagId);
            return element;
        },

        //-----------------------------------------------------------------------------------
        instantiate: function (elementId, options, expectFailure) {
            /// <summary>
            ///  Instantiate a toggle control out of the element specified by elementId with given options.
            ///   and verify expected result (success when all inputs valid, exception otherwise) and that
            ///   all options set correctly in success case.
            /// </summary>
            /// <param name="elementId" type="string">
            ///  String specifying the tag to create a toggle control out of.
            /// </param>
            /// <param name="options" type="object">
            ///  JavaScript object containing a list of options to set on toggle control.
            /// </param>
            /// <param name="expectFailure" type="boolean">
            ///  Explictly declare whether this call to instantiate expected to pass or fail
            ///  Note we use "expectFailure" rather than "expectSuccess" so that the caller can leave the
            ///   parameter off in the more common "expectSuccess" case
            /// </param>
            /// <returns type="object" />
            if (typeof (expectFailure) !== "boolean") {
                expectFailure = false;
            }

            // Build a string representation of the input options for debugging purposes.
            var optString = "";
            for (var opt in options) {
                if (optString !== "") {
                    optString += ", ";
                }
                optString += opt + ": " + ((typeof (options[opt]) === "string") ? ("\"" + options[opt] + "\"") : options[opt]);
            }
            optString = "{" + optString + "}";

            LiveUnit.LoggingCore.logComment("Instantiating toggle on element '" + elementId + "' with options = \"" + optString + "\"");


            var toggleElement = document.getElementById(elementId);

            var labelOnInit = this.defaultLabelOn,
                labelOffInit = this.defaultLabelOff,
                titleInit = this.defaultTitle,
                checkedInit = this.defaultChecked,
                disabledInit = this.defaultDisabled;

            var toggle = null;

            // Check if toggle control already instantiated if so, save off initial options values so we can verify they don't update
            if (toggleElement) {
                toggle = this.getControl(toggleElement);

                if (toggle) {
                    labelOnInit = toggle.labelOn;
                    labelOffInit = toggle.labelOff;
                    titleInit = toggle.title;
                    checkedInit = toggle.checked;
                    disabledInit = toggle.disabled;
                }
            }

            // Make the call to WinJS.UI.ToggleSwitch, catching any exceptions to verify later
            var exception = null;
            try {
                toggle = new WinJS.UI.ToggleSwitch(toggleElement, options);
            } catch (e) {
                exception = e;
                LiveUnit.LoggingCore.logComment(exception.message);
            }

            // Verify WinJS.UI.ToggleSwitch did the expected thing
            if (toggle) {
                // toggle is not null, means call to WinJS.UI.ToggleSwitch succeeded
                LiveUnit.Assert.areEqual(false, expectFailure, "Toggle control instantiation succeeded, verify expectFailure=false.");

                if (!toggleElement) {
                    LiveUnit.Assert.fail("Toggle control instantiated out of an invalid element! - ElementId - " + elementId);
                } else {
                    LiveUnit.LoggingCore.logComment("Toggle has been instantiated.");

                    // Only case where toggle created out of a valid element, lets verify options handled correctly
                    if (!options || !("labelOn" in options)) {
                        LiveUnit.Assert.areEqual(labelOnInit, toggle.labelOn, "Verify initial value used for labelOn when not set via options.");
                    } else {
                        LiveUnit.Assert.areEqual(options.labelOn, toggle.labelOn, "Verify labelOn set properly on instantiation.");
                    }

                    if (!options || !("labelOff" in options)) {
                        LiveUnit.Assert.areEqual(labelOffInit, toggle.labelOff, "Verify initial value used for labelOff when not set via options.");
                    } else {
                        LiveUnit.Assert.areEqual(options.labelOff, toggle.labelOff, "Verify labelOff set properly on instantiation.");
                    }

                    if (!options || !("title" in options)) {
                        LiveUnit.Assert.areEqual(titleInit, toggle.title, "Verify initial value used for title when not set via options.");
                    } else {
                        // Can't use options.title.toString() because it could be null/undefined
                        LiveUnit.Assert.areEqual(String(options.title), toggle.title, "Verify title set properly on instantiation.");
                    }

                    if (!options || !("checked" in options)) {
                        LiveUnit.Assert.areEqual(checkedInit, toggle.checked, "Verify initial value used for checked when not set via options.");
                    } else {
                        // !! is a shortcut to make sure that the passed in argument gets converted to a boolean
                        LiveUnit.Assert.areEqual(!!options.checked, toggle.checked, "Verify checked set properly on instantiation.");
                    }

                    if (!options || !("disabled" in options)) {
                        LiveUnit.Assert.areEqual(disabledInit, toggle.disabled, "Verify initial value used for disabled when not set via options.");
                    } else {
                        LiveUnit.Assert.areEqual(!!options.disabled, toggle.disabled, "Verify disabled set properly on instantiation.");
                    }

                    this.verifyLayout(elementId);
                    this.verifyARIA(elementId);
                }
            } else {
                // Call to WinJS.UI.Controls.Toggle failed, let's diagnose whether this was expected
                LiveUnit.Assert.areEqual(true, expectFailure, "Toggle control instantiation failed with error: " + exception.message + ", verify expectFailure=true.");

                if (toggleElement) {
                    // Toggle currently does not throw validation exceptions on options; if/when it does, that logic can be checked here to figure out
                    // exactly what happened. For now, just log a failure if somehow this situation is encountered.
                    LiveUnit.Assert.fail("Toggle instantiation failed when elementId referenced a valid element. " + ((exception) ? "Exception: " + exception.message : ""));
                } else {
                    // Instantiation failed because toggleElement was NULL
                    LiveUnit.LoggingCore.logComment("Toggle instantiation failed as expected since elmentId does not reference a valid element.");
                    LiveUnit.Assert.areEqual(this.exceptions.elementIsInvalid, exception.message);
                }
            }

            if (toggle && LiveUnit.GetWrappedCallback) {
                try {
                    toggle.addEventListener("change", LiveUnit.GetWrappedCallback(this.verifyEvent), false);
                } catch (e) {
                    LiveUnit.Assert.fail("toggle.addEventListener threw exception: " + e.message);
                }
            }

            return toggle;
        },

        getControl: function (toggleElement) {
            /// <summary>
            ///  Get a handle to a previously created Toggle Control
            /// </summary>
            /// <param name="elementId" type="string">
            ///  String specifying element toggle control previously created out of.
            /// </param>
            /// <returns type="object" />
            var toggle = null;
            try {
                toggle = toggleElement.winControl;
            } catch (e) {
                LiveUnit.Assert.fail("Failed to get a handle to the toggle control with exception: " + e);
            }

            return toggle;
        },

        //-----------------------------------------------------------------------------------
        setOptionsAndVerify: function (elementId, options, expectFailure, setDirectly) {
            /// <summary>
            ///  Call WinJS.UI.setOptions(toggle, options) on a toggle control built out of elementId and verify handled
            ///  correctly by toggle control(set proper values, threw exceptions when expected, didn't alter unset values).
            /// </summary>
            /// <param name="elementId" type="string">
            ///  String specifying element toggle control previously created out of.
            /// </param>
            /// <param name="options" type="object">
            ///  JavaScript object containing a list of options to set on toggle control.
            /// </param>
            /// <param name="expectFailure" type="boolean">
            ///  Explictly declare whether this call to setOptions expected to pass or fail.
            ///  Note we use "expectFailure" rather than "expectSuccess" so that the caller can leave the
            ///   parameter off in the more common "expectSuccess" case
            /// </param>
            /// <param name="setDirectly" type="boolean">
            ///  Setting this to true bypasses the WinJS.UI.setOptions method and directly sets the options on the control.
            /// </param>
            /// <returns type="object" />
            if (typeof (expectFailure) !== "boolean") {
                expectFailure = false;
            }
            if (typeof (setDirectly) !== "boolean") {
                setDirectly = false;
            }

            // Get a handle to the (supposedly existing) toggle control.
            var toggle = this.getControl(document.getElementById(elementId));

            LiveUnit.Assert.isNotNull(toggle, "Verify element passed to setOptionsandVerify not null.");

            // Build a string representation of the input options for debugging purposes.
            var optString = "";
            for (var opt in options) {
                if (optString !== "") {
                    optString += ", ";
                }
                optString += opt + ": " + ((typeof (options[opt]) === "string") ? ("\"" + options[opt] + "\"") : options[opt]);
            }
            optString = "{" + optString + "}";

            //  Store off the initial values for each option so we can verify they got updated (or didn't) later on
            var labelOnInit = toggle.labelOn;
            labelOffInit = toggle.labelOff;
            titleInit = toggle.title;
            checkedInit = toggle.checked;
            disabledInit = toggle.disabled;

            LiveUnit.LoggingCore.logComment("Setting options to: \"" + optString + "\".");
            LiveUnit.LoggingCore.logComment("Current options: \"{labelOn: \"" + labelOnInit + "\", labelOff: \"" + labelOffInit + "\", title: \"" + titleInit + "\", checked: " + checkedInit + ", disabled: " + disabledInit + "}\".");

            // Try to call setOptions with the input options, catching any exceptions and saving them for later verification.
            var exception = null;
            try {
                if (setDirectly) {
                    LiveUnit.LoggingCore.logComment("Setting options directly on the control.");
                    for (var opt in options) {
                        toggle[opt] = options[opt];
                    }
                }
                else {
                    LiveUnit.LoggingCore.logComment("Setting options using WinJS.UI.setOptions.");
                    WinJS.UI.setOptions(toggle, options);
                }
            }
            catch (e) {
                exception = e;
                LiveUnit.LoggingCore.logComment(exception.message);
            }

            var setMethod = setDirectly ? "setting directly" : "setting with setOptions()";

            if (exception) {
                LiveUnit.Assert.areEqual(true, expectFailure, "Setting options to " + optString + " threw the following exception when " + setMethod + ": " + exception.message + ", verify expectFailure=true.");
                // If the toggle control threw exceptions when checking option changes, we could verify that they were supposed to happen here.
                // Since it currently doesn't throw any validation exceptions, simply log a failure.
                LiveUnit.Assert.fail("Exception thrown by setOptions(" + optString + "): " + exception.message);

                // Since we got an exception, all values should have been left un-updated
                LiveUnit.Assert.areEqual(labelOnInit, toggle.labelOn, "Verify labelOn not changed when exception thrown when " + setMethod + ".");
                LiveUnit.Assert.areEqual(labelOffInit, toggle.labelOff, "Verify labelOff not changed when exception thrown when " + setMethod + ".");
                LiveUnit.Assert.areEqual(titleInit, toggle.title, "Verify title not changed when exception thrown when " + setMethod + ".");
                LiveUnit.Assert.areEqual(checkedInit, toggle.checked, "Verify checked not changed when exception thrown when " + setMethod + ".");
                LiveUnit.Assert.areEqual(disabledInit, toggle.disabled, "Verify disabled not changed when exception thrown when " + setMethod + ".");

            } else {
                // No exception means function must have succeeded (as all failures should throw an exception)
                LiveUnit.Assert.areEqual(false, expectFailure, "Setting options to " + optString + " succeeded when " + setMethod + ", verify expectFailure=false.");

                if (options && "labelOn" in options) {
                    LiveUnit.Assert.areEqual(options.labelOn, toggle.labelOn, "Verify labelOn updated when " + setMethod + ", this time going from " + labelOnInit + " to " + options.labelOn + ".");
                } else {
                    LiveUnit.Assert.areEqual(labelOnInit, toggle.labelOn, "Verify labelOn not changed when no change should have occurred");
                }

                if (options && "labelOff" in options) {
                    LiveUnit.Assert.areEqual(options.labelOff, toggle.labelOff, "Verify labelOff updated when " + setMethod + ", this time going from " + labelOffInit + " to " + options.labelOff + ".");
                } else {
                    LiveUnit.Assert.areEqual(labelOffInit, toggle.labelOff, "Verify labelOff not changed when no change should have occurred");
                }

                if (options && "title" in options) {
                    // Can't use options.title.toString() because it could be null/undefined
                    LiveUnit.Assert.areEqual(String(options.title), toggle.title, "Verify title updated when " + setMethod + ", this time going from " + titleInit + " to " + options.title + ".");
                } else {
                    LiveUnit.Assert.areEqual(titleInit, toggle.title, "Verify title not changed when no change should have occurred");
                }

                if (options && "checked" in options) {
                    LiveUnit.Assert.areEqual(!!options.checked, toggle.checked, "Verify checked updated when " + setMethod + ", this time going from " + checkedInit + " to " + options.checked + ".");
                } else {
                    LiveUnit.Assert.areEqual(checkedInit, toggle.checked, "Verify checked not changed when no change should have occurred");
                }

                if (options && "disabled" in options) {
                    LiveUnit.Assert.areEqual(!!options.disabled, toggle.disabled, "Verify disabled updated when " + setMethod + ", this time going from " + disabledInit + " to " + options.disabled + ".");
                } else {
                    LiveUnit.Assert.areEqual(disabledInit, toggle.disabled, "Verify disabled not changed when no change should have occurred");
                }
            }

            if (elementId && document.getElementById(elementId)) {
                this.verifyLayout(elementId);
                this.verifyARIA(elementId);
            }
        },

        //-----------------------------------------------------------------------------------
        // Shorthand for calling setOptionsAndVerify with setDirectly turned on
        setOptionsDirectlyAndVerify: function (elementId, options, expectFailure) {
            return this.setOptionsAndVerify(elementId, options, expectFailure, true);
        },

        //-----------------------------------------------------------------------------------
        verifyLayout: function (elementId) {
            /// <summary>
            ///  Verify the layout of the toggle control by verifying the DOM contains the expected elements.
            /// </summary>
            /// <param name="elementId" type="string">
            ///  String id of the toggle control's element
            /// </param>
            //var toggleElement = commonUtils.getElementById(elementId);

            // Get a handle to the (supposedly existing) toggle control
            //var toggle = this.getControl(toggleElement);

            //TODO: Remove this comment once this function is implemented
            LiveUnit.LoggingCore.logComment("verifyLayout not yet implemented.");

            //TODO: Verify the layout of the control here
        },

        //-----------------------------------------------------------------------------------
        verifyARIA: function (element) {
            /// <summary>
            ///  Verify ARIA information for the input toggle switch control
            /// </summary>
            /// <param name="element" type="string">
            ///  String id of the toggle switch control's element, or the element itself
            /// </param>

            if (typeof (element) === "string") {
                element = commonUtils.getElementById(element);
            }

            // Get a handle to the (supposedly existing) control
            var toggle = this.getControl(element);

            // ARIA values are set on the slider of the toggle switch control, so we need to dig in and grab that
            // It should be the only input tag child of the overall element
            var sliderElement = element.getElementsByTagName("input")[0];

            // Verify ARIA info
            LiveUnit.Assert.areEqual("checkbox", sliderElement.getAttribute("role"), "Verify ARIA role set correctly.");

            LiveUnit.Assert.areEqual(toggle.checked.toString(), sliderElement.getAttribute("aria-checked"), "Verify aria-checked set correctly.");

            LiveUnit.Assert.areEqual(toggle.disabled.toString(), sliderElement.getAttribute("aria-disabled"), "Verify aria-disabled set correctly.");
        },

        //-----------------------------------------------------------------------------------
        verifyFunction: function (toggle, functionName) {
            /// <summary>
            ///  Verify given function is defined on toggle control.
            /// </summary>
            /// <param name="toggle" type="object">
            ///  Handle to actual toggle control.
            /// </param>
            /// <param name="functionName" type="string">
            ///  Name of function to verify is on control.
            /// </param>
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (toggle[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from toggle");
            }

            LiveUnit.Assert.isNotNull(toggle[functionName]);
            LiveUnit.Assert.areEqual("function", typeof (toggle[functionName]), "Verify " + functionName + " exists on toggle and is a function.");
        },

        //-----------------------------------------------------------------------------------
        // ASYNC Event Test Helper Code

        timeBetweenActions: 0,
        nextAction: null,

        //-----------------------------------------------------------------------------------
        startAsyncEventTest: function (signalTestCaseCompleted, actions) {
            /// <summary>
            ///  Start running an Event test
            /// </summary>
            /// <param name="signalTestCaseCompleted" type="function">
            ///  Callback function to call when all actions have occurred and all events verified.
            /// </param>

            if (typeof (actions) === "undefined" || typeof (actions[1]) === "undefined") {
                LiveUnit.Assert.fail("startEventTest called with no actions defined.");
            }

            window.async = {
                actions: actions,
                actionNum: 0,
                signalTestCaseCompleted: signalTestCaseCompleted,
                toggleUtils: this
            };

            window.async.toggleUtils.nextAction = setTimeout(LiveUnit.GetWrappedCallback(window.async.toggleUtils.invokeNextAction), window.async.toggleUtils.timeBetweenActions);
        },
        //-----------------------------------------------------------------------------------
        invokeNextAction: function () {
            /// <summary>
            ///  Invoke the next action in the window.async.actions array
            /// </summary>
            window.async.actionNum++;

            if (typeof (window.async.actions[window.async.actionNum]) === "undefined") {
                LiveUnit.LoggingCore.logComment("No more actions to invoke, test complete!");

                clearTimeout(window.async.toggleUtils.nextAction); // Make 100% certain we wont have any additional actions come through after the test
                window.async.signalTestCaseCompleted();

                return;
            }

            LiveUnit.LoggingCore.logComment(window.async.actionNum + ": " + window.async.actions[window.async.actionNum].action);

            window.async.actions[window.async.actionNum].action();

            // Wait between each action for events to go through.
            window.async.toggleUtils.nextAction = setTimeout(LiveUnit.GetWrappedCallback(window.async.toggleUtils.invokeNextAction), window.async.toggleUtils.timeBetweenActions);
        },

        //-----------------------------------------------------------------------------------
        verifyEvent: function (event) {
            /// <summary>
            ///  Generic event handler to register for all events
            /// </summary>
            /// <param name="event" type="object">
            ///  Event object built by toggle control
            /// </param>
            if (typeof (window.async) === "undefined" ||
                typeof (window.async.actions) === "undefined") {
                // callback in async test that isn't using infrastructure.
                return;
            }

            LiveUnit.LoggingCore.logComment("Received callback for: \"" + event.type + "\" on control with id: \"" + event.target.id + "\"");

            var action = null;

            if (typeof (window.async.actions[window.async.actionNum]) !== "undefined") {
                action = window.async.actions[window.async.actionNum];
            }

            if (!action || !action.expectedEvents) {
                LiveUnit.Assert.fail("Received unexpected event from control '" + event.target.id + "': " + event.type);
            }

            // March through all the events we expect for the current action
            for (var eventType in action.expectedEvents) {
                if (typeof (action.expectedEvents[eventType]) === "undefined") {
                    // Got an event we don't expect to receive from control
                    LiveUnit.Assert.fail("Received unexpected event from control '" + event.target.id + "': " + event.type + " after invoking: '" + action.action + "'.");
                } else if (eventType === event.type) {
                    // event is expected type, let's make sure we haven't gotten too many.
                    if (action.expectedEvents[eventType] > 0) {
                        if (typeof (action.actualEvents) === "undefined") {
                            action.actualEvents = new Array();
                        }

                        if (typeof (action.actualEvents[eventType]) === "undefined") {
                            action.actualEvents[eventType] = 1;
                        } else {
                            action.actualEvents[eventType]++;
                        }
                    } else {
                        LiveUnit.Assert.fail("Received too many events for " + event.type + " after invoking: '" + action.action + "'.");
                    }
                }
            }

            // We've verified this is a valid event, verify various attributes are what we expected

            if (typeof (action.targetExpected) === "undefined") {
                action.targetExpected = document.getElementById("target");
            }

            LiveUnit.Assert.areEqual(action.targetExpected, event.target, "Verify target set as expected after invoking " + action.action);

            if (typeof (window.async.actions[window.async.actionNum].expectChecked) !== "undefined") {
                LiveUnit.Assert.areEqual(window.async.actions[window.async.actionNum].expectChecked, window.async.toggleUtils.getControl(event.target).checked, "Verify checked set as expected after invoking " + window.async.actions[window.async.actionNum].action);
            }

            // Verify layout for the control is correct
            window.async.toggleUtils.verifyLayout(event.target.id);
            window.async.toggleUtils.verifyARIA(event.target);
        }
    };
})();