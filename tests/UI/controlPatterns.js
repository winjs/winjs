// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <deploy src="../TestData/" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.controlPatterns = function () {
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
    
    function validateEmptyConstructor (ctor, appendControl) {
        // Create control with no constructor parameters (no host element, no options):
        //    a) control should create a default host element retrievable through element property
        
        var control;
        try {
            control = new ctor();
        } catch(e) {
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

    function validateHostElementProvided (ctor, appendControl) {
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
        } catch(e) {
            LiveUnit.Assert.fail("validateHostElementProvided unhandled test exception: " + e);
        } finally {
            if (appendControl) {
                document.body.removeChild(hostElement);
            }
        }
    }

    function validatePatterns (controlString) {
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

    this.testAppBar = function() {
        validatePatterns("WinJS.UI.AppBar");    
    }

    this.testDatePicker = function() {
        validatePatterns("WinJS.UI.DatePicker");
    }
    
    this.testFlyout = function() {
        validatePatterns("WinJS.UI.Flyout");    
    }
    
    this.testMenu = function() {
        validatePatterns("WinJS.UI.Menu");
    }
    
    // testing this "private" class because it could still be copied and used by 
    // users so it should be compliant with proper control patterns
    this.test_Overlay = function() {
        validatePatterns("WinJS.UI._Overlay");    
    }

    // this "userControl" is a special case as it is not a control by itself, but hosts a fragment.  
    // A fragment needs to be supplied to get the constructor.
    this.testPages = function() {
        var ctor;
        
        try {
            ctor = WinJS.UI.Pages.define("FragmentControlBasic.html");
        } catch (e) {
            LiveUnit.Assert.fail("validatePatterns unhandled test exception: " + e);
        }        
        
        runTests(ctor);
    }
    
    this.testRating = function() {
        validatePatterns("WinJS.UI.Rating");    
    }

    this.testSettingsFlyout = function() {
        validatePatterns("WinJS.UI.SettingsFlyout");    
    }

    this.testTimePicker = function() {
        validatePatterns("WinJS.UI.TimePicker");
    }
    
    this.testToggle = function() {
        validatePatterns("WinJS.UI.ToggleSwitch");    
    }

    this.testTooltip = function() {
        validatePatterns("WinJS.UI.Tooltip");    
    }
    
    this.testViewBox = function() {
        validatePatterns("WinJS.UI.ViewBox");
    }
    
    
    
    
    //////////////////////////////////////////////////////////////////
    ///////// controls not subscribing to control patterns ///////////
    //////////////////////////////////////////////////////////////////
    
    
    // testing this "private" class because it could still be copied and used by 
    // users so it should be compliant with proper control patterns
    this.xtest_AppBarCommand = function() {
        // win8:503687  _AppBarCommand winJScontrolPattern - unable to create control with empty constructor
        // 
        //  9/30/2011 1:41 PM	Resolved as Won't Fix by gdxappb (gvilla)
        // This is a private class.  Given the priorities and the real world scenario, we will not be fixing this bug.
        //
        validatePatterns("WinJS.UI._AppBarCommand");    
    }

    // testing this "private" class because it could still be copied and used by 
    // users so it should be compliant with proper control patterns
    this.xtest_MenuCommand = function() {
        // win8:503905  _MenuCommand winJScontrolPattern - unable to create control with empty constructor
        //
        // 9/30/2011 1:48 PM	Resolved as Won't Fix by gdxappb (gvilla)
        // This is a private control and given the amount of work and priorities with the real use case scenario, this is a won't fix.   
        //
        validatePatterns("WinJS.UI._MenuCommand");    
    }
    
    // testing this "private" class because it could still be copied and used by 
    // users so it should be compliant with proper control patterns
    this.xtest_Select = function() {
        // win8:503939  _Select winJScontrolPattern - empty constructor fails with TypeError: 
        //      Unable to set value of the property 'tabIndex': object is null or undefined
        //
        // 10/13/2011 1:10 PM	Resolved as Won't Fix by samsp
        // Won't fixing this as the controls can be created against an existing element
        //
        validatePatterns("WinJS.UI._Select");    
    }
    
    this.xtestFlipView = function() {
        // win8:503865  FlipView  winJScontrolPattern - new WinJS.UI.FlipView() doesn't create an default host element
        // 
        // 10/24/2011 6:06 PM	Resolved as Won't Fix by samsp
        validatePatterns("WinJS.UI.FlipView");    
    }
    
    this.xtestListView = function() {
        // win8:503875  ListView winJScontrolPattern - unable to create ListView with empty constructor
        //
        // 10/24/2011 6:06 PM	Resolved as Won't Fix by samsp        
        validatePatterns("WinJS.UI.ListView");
    }
    
    this.xtestSemanticZoom = function() {
        // win8:503988  SemanticZoom  winJScontrolPattern - empty constructor fails accessing undefinded host element
        //
        // 10/24/2011 6:07 PM	Resolved as Won't Fix by samsp
        validatePatterns("WinJS.UI.SemanticZoom");    
    }
    
    this.xtestTabContainer = function() {
        // win8:504011  TabContainer winJScontrolPattern - unable to create control using empty constructor
        //
        // 10/24/2011 6:07 PM	Resolved as Won't Fix by samsp
        validatePatterns("WinJS.UI.TabContainer");
    }
    
}

LiveUnit.registerTestClass("CorsicaTests.controlPatterns");