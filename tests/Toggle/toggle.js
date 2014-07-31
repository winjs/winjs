// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.ToggleSwitchTests = function () {
    "use strict";
    // Initial setup for each test to create the anchor element
    function setup() {
        LiveUnit.LoggingCore.logComment("Create Toggle Element");

        var newNode = document.createElement("div");
        newNode.id = "toggleTestDiv";
        newNode.innerHTML =
                "This is a test for toggle <span id=\"toggleElement\">";
        document.body.appendChild(newNode);
    }

    function tearDown() {
        var toggleElement = document.getElementById("toggleTestDiv");
        if (toggleElement) {
            WinJS.Utilities.disposeSubTree(toggleElement);
            document.body.removeChild(toggleElement);
        }
    }

    // Test Toggle Instantiation
    this.testToggleInstantiation = function () {
        try {
            setup();

            // Get the anchor element from the DOM
            LiveUnit.LoggingCore.logComment("Getting the toggle element by id");
            var toggleElement = document.getElementById("toggleElement");

            // Test toggle insantiation
            LiveUnit.LoggingCore.logComment("Attempt to Insantiate the toggle element");
            var toggle = new WinJS.UI.ToggleSwitch(toggleElement);
            LiveUnit.LoggingCore.logComment("toggle has been insantiated.");
            LiveUnit.Assert.isNotNull(toggle, "Toggle element should not be null when insantiated.");

            // Test multiple toggle insantiation to same toggle element
            LiveUnit.LoggingCore.logComment("Attempt to Insantiate toggle2 on the same toggle element");
            var toggle2 = new WinJS.UI.ToggleSwitch(toggleElement);
            LiveUnit.LoggingCore.logComment("Toggle2 has been instantiated.");
            LiveUnit.Assert.isNotNull(toggle2, "Toggle2 element should not be null when instantiated.");
            LiveUnit.Assert.areEqual(toggle, toggle2, "Multiple calls to new WinJS.UI.ToggleSwitch() on the same element should return the same toggle object");

            verifyFunction("addEventListener");
        } finally {
            tearDown();
        }

        function verifyFunction (functionName) {
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (toggle[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from toggle");
            }

            LiveUnit.Assert.isNotNull(toggle[functionName]);
            LiveUnit.Assert.isTrue(typeof (toggle[functionName]) === "function", functionName + " exists on toggle, but it isn't a function");
        }
    }

    
    
    
    

    // Test Toggle Instatiation with null anchor element
    this.testToggleNullInstatiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the toggle with null element");
        var toggle = null;

        try {
            toggle = "attempting";
            toggle = new WinJS.UI.ToggleSwitch(null);
        }
        catch (e) {
            toggle = null;
        }
        LiveUnit.Assert.isNotNull(toggle, "Allowing instantiating a toggle switch with null element.");
        LiveUnit.Assert.isNotNull(toggle.element, "When instantitating a toggle switch with null element, we generate an element for toggle.");
    }
    
    
    
    

    // Test toggle parameters
    this.testToggleParams = function () {
        function testGoodInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a toggle using good parameter " + paramName + "=" + value);
            try {
                setup();
                var options = {};
                options[paramName] = value;
                var toggle = new WinJS.UI.ToggleSwitch(document.getElementById("toggleTestDiv"), options);
                LiveUnit.Assert.isNotNull(toggle);
            } finally {
                tearDown();
            }
        }

        function testBadInitOption(paramName, value, expectedValue) {
            LiveUnit.LoggingCore.logComment("Testing creating a toggle using bad parameter " + paramName + "=" + value);
            try {
                setup();
                var options = {};
                options[paramName] = value;
                var toggle = new WinJS.UI.ToggleSwitch(document.getElementById("toggleTestDiv"), options);
                LiveUnit.Assert.isTrue(toggle[paramName] === expectedValue, paramName + " should be set to " + expectedValue);
            } finally {
                tearDown();
            }
        }

        testGoodInitOption("checked", 0);
        testGoodInitOption("checked", 1);
        testGoodInitOption("disabled", true);
        testGoodInitOption("disabled", false);
        testGoodInitOption("labelOn", "ON~");
        testGoodInitOption("labelOn", "<B>ON</B>");
        testGoodInitOption("labelOff", "OFF~");
        testGoodInitOption("labelOff", "<B>OFF</B>");
        testGoodInitOption("title", "Wifi");
        testGoodInitOption("title", "<B>Wifi</B>");

        testBadInitOption("checked", "1", true);
        testBadInitOption("disabled", "TRUE", true);
    }

    
    
    
    

    // Test that programmatic changes to the ToggleSwitch _checked property do not fire change events
    this.testToggleChangeToCheckedProperty = function () {
        LiveUnit.LoggingCore.logComment("Attempting programmatic change to ToggleSwitch _checked property");
        try {
            setup();
            var changed = 0;
            var toggle = new WinJS.UI.ToggleSwitch(document.getElementById("toggleTestDiv"));
            toggle.onchange = function () { changed++; }
            toggle.checked = false;
            toggle.checked = true;
            LiveUnit.Assert.areEqual(0, changed, "No events should be fired");
        } finally {
            tearDown();
        }
    }

    
    
    
    
    
    // Tests for dispose members and requirements
    this.testToggleSwitchDispose = function () {
        var ts = new WinJS.UI.ToggleSwitch();
        LiveUnit.Assert.isTrue(ts.dispose);
        LiveUnit.Assert.isTrue(ts.element.classList.contains("win-disposable"));
        LiveUnit.Assert.isFalse(ts._disposed);
        
        // Double dispose sentinel
        var sentinel = document.createElement("div");
        sentinel.disposed = false;
        WinJS.Utilities.addClass(sentinel, "win-disposable");
        ts.element.appendChild(sentinel);

        ts.dispose();
        LiveUnit.Assert.isTrue(ts._disposed);
        LiveUnit.Assert.isFalse(ts._gesture);
        ts.dispose();
    }
    
    
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.ToggleSwitchTests");
