// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <deploy src="../TestData/" />

module CorsicaTests {

    "use strict";

    //
    // Validate WinJS controls subscribe to WinJS control patterns.
    // 
    // The same set of tests is run against each control.  Tests include scenarios where the host element 
    // is appended to document body and not.
    // 
    // Test covers controls from controls.js, uicollections.js (searching for "element,.*options").
    // 
    // 1. validateEmptyConstructor - expecting default host element to be created
    // 2. validateHostElementProvided - create control with predefined host element, validate element and winControl properties    
    //


    // additional test ideas:
    //    with WinJS.validation, 
    //    strict?

    function validateEmptyConstructor(ctor, appendControl) {
        // Create control with no constructor parameters (no host element, no options):
        //    a) control should create a default host element retrievable through element property

        var control;
        try {
            control = new ctor();
        } catch (e) {
            LiveUnit.Assert.fail("validateEmptyConstructor unhandled test exception: " + e);
        }

        LiveUnit.Assert.isTrue(control.element !== undefined, "validateEmptyConstructor: constructor with no parameters returned undefined element");
        LiveUnit.Assert.isNotNull(control.element, "validateEmptyConstructor: constructor with no parameters returned null element");

        if (appendControl) {
            document.body.appendChild(control.element);
        }

        try {
            var controlElement = control.element;
            LiveUnit.Assert.isTrue(controlElement === control.element, "validateEmptyConstructor: control.element === controlElement");
            LiveUnit.Assert.isTrue(controlElement.winControl === control, "validateEmptyConstructor: expected hostElement.winControl === control");
            LiveUnit.Assert.isTrue(control.element.winControl === control, "validateEmptyConstructor: expected control.element.winControl === control");
            LiveUnit.Assert.isTrue(control.addEventListener != null, "validateEmptyConstructor: expected control.addEventListener != null (use WinJS.Class.mix(Control, WinJS.UI.DOMEventMixin);?");
        } finally {
            if (appendControl) {
                document.body.removeChild(control.element);
            }
        }
    }

    function validateHostElementProvided(ctor, appendControl) {
        // Create control with predefined host element, validate element and winControl properties:
        //    a) element property === host element  
        //    b) host element .winControl retrieves the control

        var hostElement = document.createElement("div");
        if (appendControl) {
            document.body.appendChild(hostElement);
        }

        try {
            var control = new ctor(hostElement);
            LiveUnit.Assert.isTrue(control.element === hostElement, "validateHostElementProvided: expected control.element === hostElement");
            LiveUnit.Assert.isTrue(hostElement.winControl === control, "validateHostElementProvided: expected hostElement.winControl === control");
            LiveUnit.Assert.isTrue(control.element.winControl === control, "validateHostElementProvided: expected control.element.winControl === control");
        } catch (e) {
            LiveUnit.Assert.fail("validateHostElementProvided unhandled test exception: " + e);
        } finally {
            if (appendControl) {
                document.body.removeChild(hostElement);
            }
        }
    }

    function validatePatterns(controlString) {
        var ctor;

        try {
            ctor = WinJS.Utilities.getMember(controlString);
        } catch (e) {
            LiveUnit.Assert.fail("validatePatterns unhandled test exception: " + e);
        }

        runTests(ctor);
    }

    function runTests(ctor) {
        validateEmptyConstructor(ctor, true);           // host element appended to document body
        validateEmptyConstructor(ctor, false);          // host element not appended to document body

        validateHostElementProvided(ctor, true);        // host element appended to document body
        validateHostElementProvided(ctor, false);       // host element not appended to document body
    }

    export class controlPatterns {

        testAppBar() {
            validatePatterns("WinJS.UI.AppBar");
        }

        testDatePicker() {
            validatePatterns("WinJS.UI.DatePicker");
        }

        testFlyout() {
            validatePatterns("WinJS.UI.Flyout");
        }

        testMenu() {
            validatePatterns("WinJS.UI.Menu");
        }

        // testing this "private" class because it could still be copied and used by 
        // users so it should be compliant with proper control patterns
        test_Overlay() {
            validatePatterns("WinJS.UI._Overlay");
        }

        // this "userControl" is a special case as it is not a control by itself, but hosts a fragment.  
        // A fragment needs to be supplied to get the constructor.
        testPages() {
            var ctor;

            try {
                ctor = WinJS.UI.Pages.define("FragmentControlBasic.html", {});
            } catch (e) {
                LiveUnit.Assert.fail("validatePatterns unhandled test exception: " + e);
            }

            runTests(ctor);
        }

        testRating() {
            validatePatterns("WinJS.UI.Rating");
        }

        testSettingsFlyout() {
            validatePatterns("WinJS.UI.SettingsFlyout");
        }

        testTimePicker() {
            validatePatterns("WinJS.UI.TimePicker");
        }

        testToggle() {
            validatePatterns("WinJS.UI.ToggleSwitch");
        }

        testTooltip() {
            validatePatterns("WinJS.UI.Tooltip");
        }

        testViewBox() {
            validatePatterns("WinJS.UI.ViewBox");
        }

    }

}
LiveUnit.registerTestClass("CorsicaTests.controlPatterns");