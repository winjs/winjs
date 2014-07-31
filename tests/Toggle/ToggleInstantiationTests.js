// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Instantiation test cases for the Toggle JavaScript control.  Note that a large
//       percent of the verifications in this file come as part of toggleUtils.instantiate
//      Based on sehume's rating control tests.
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

ToggleInstantiationTests = function () {
    var toggleUtils = new ToggleUtils();

    this.setUp = function (complete) {
        toggleUtils.setUp().then(complete);
    };

    this.tearDown = function () {
        toggleUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------

    this.testToggle_Instantiation = function () {
        var toggle = toggleUtils.instantiate("toggle");

        toggleUtils.verifyFunction(toggle, "addEventListener");
        toggleUtils.verifyFunction(toggle, "removeEventListener");
        toggleUtils.verifyFunction(toggle, "dispatchEvent");
    };

    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_Instantiation_WithOptions = function () {
        toggleUtils.instantiate("toggle", { labelOn: "Yes", labelOff: "No", title: "Do you like waffles?", checked: true, disabled: true });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_Instantiation_Multiple = function () {
        var toggle = toggleUtils.instantiate("toggle", { labelOn: "Yes", labelOff: "No", title: "Do you like waffles?", checked: true, disabled: true });

        // Test multiple toggle instantiation on same toggle element
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate toggle2 on the same toggle element");
        var toggle2 = new WinJS.UI.ToggleSwitch(document.getElementById("toggle"));

        // Verify we have exactly the same toggle control with no update to options
        LiveUnit.Assert.areEqual(toggle, toggle2, "Multiple calls to WinJS.UI.ToggleSwitch() on the same element should return the same toggle object");
        LiveUnit.Assert.areEqual("Yes", toggle2.labelOn, "Verify labelOn not updated from initial value upon second call to WinJS.UI.ToggleSwitch() on same element.");
        LiveUnit.Assert.areEqual("No", toggle2.labelOff, "Verify labelOff not updated from initial value upon second call to WinJS.UI.ToggleSwitch() on same element.");
        LiveUnit.Assert.areEqual("Do you like waffles?", toggle2.title, "Verify title not updated from initial value upon second call to WinJS.UI.ToggleSwitch() on same element.");
        LiveUnit.Assert.areEqual(true, toggle2.checked, "Verify checked not updated from initial value upon second call to WinJS.UI.ToggleSwitch() on same element.");
        LiveUnit.Assert.areEqual(true, toggle2.disabled, "Verify disabled not updated from initial value upon second call to WinJS.UI.ToggleSwitch() on same element.");
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_Instantiation_Span = function () {
        toggleUtils.addTag("span", "toggleSpan");
        var toggle = toggleUtils.instantiate("toggleSpan");
        toggleUtils.removeElementById("toggleSpan");
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_dir_LTR = function () {
        document.getElementById("toggle").setAttribute("dir", "ltr");
        var toggle = toggleUtils.instantiate("toggle");
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_dir_RTL = function () {
        document.getElementById("toggle").setAttribute("dir", "rtl");
        var toggle = toggleUtils.instantiate("toggle");
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_dir_RTL_Disabled = function () {
        document.getElementById("toggle").setAttribute("dir", "rtl");
        var toggle = toggleUtils.instantiate("toggle", { checked: false, disabled: true });

        toggleUtils.setOptionsAndVerify("toggle", { checked: true });
        toggleUtils.setOptionsAndVerify("toggle", { checked: false });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    this.testToggle_dir_Swap = function () {
        var toggleElem = document.getElementById("toggle");

        var toggle = toggleUtils.instantiate("toggle", { checked: false });
        // swap dir 10 times
        for (var i = 0; i < 10; ++i) {
            LiveUnit.LoggingCore.logComment("Swapping direction to " + ((toggleElem.dir === "rtl") ? "ltr" : "rtl") + ".");
            toggleElem.dir = (toggleElem.dir === "rtl") ? "ltr" : "rtl";
            toggleUtils.verifyLayout("toggle");

            toggleUtils.setOptionsAndVerify("toggle", { checked: true });
            toggleUtils.setOptionsAndVerify("toggle", { checked: false });
        }

    };
    
    
    
    
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("ToggleInstantiationTests");
