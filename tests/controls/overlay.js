/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

// <!-- saved from url=(0014)about:internet -->
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.OverlayTests = function () {
    "use strict";
    // Test Overlay Instantiation
    this.testOverlayInstantiation = function () {
        // Get the Overlay element from the DOM
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Overlay element");
        var overlayElement = document.createElement('div');
        document.body.appendChild(overlayElement);
        var overlay = new WinJS.UI._Overlay(overlayElement);
        LiveUnit.LoggingCore.logComment("Overlay has been instantiated.");
        LiveUnit.Assert.isNotNull(overlay, "Overlay element should not be null when instantiated.");

        function verifyFunction(functionName) {
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (overlay[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from Overlay");
            }

            LiveUnit.Assert.isNotNull(overlay[functionName]);
            LiveUnit.Assert.isTrue(typeof (overlay[functionName]) === "function", functionName + " exists on Overlay, but it isn't a function");
        }

        verifyFunction("show");
        verifyFunction("hide");
        verifyFunction("addEventListener");
        verifyFunction("removeEventListener");
    }
    this.testOverlayInstantiation["Owner"] = "shawnste";
    this.testOverlayInstantiation["Priority"] = "0";
    this.testOverlayInstantiation["Description"] = "Test Overlay instantiation + function presence";
    this.testOverlayInstantiation["Category"] = "Instantiation";

    // Test Overlay Instantiation with null element
    this.testOverlayNullInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Overlay with null element");
        var overlay = new WinJS.UI._Overlay(null);
        LiveUnit.Assert.isNotNull(overlay, "Overlay instantiation was null when sent a null Overlay element.");
    }
    this.testOverlayNullInstantiation["Owner"] = "shawnste";
    this.testOverlayNullInstantiation["Priority"] = "1";
    this.testOverlayNullInstantiation["Description"] = "Test Overlay Instantiation with null Overlay element";
    this.testOverlayNullInstantiation["Category"] = "Instantiation";

    // Test multiple instantiation of the same overlay DOM element
    this.testOverlayMultipleInstantiation = function () {
        // Get the Overlay element from the DOM
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Overlay element");
        var overlayElement = document.createElement('div');
        document.body.appendChild(overlayElement);
        var overlay = new WinJS.UI._Overlay(overlayElement);
        LiveUnit.LoggingCore.logComment("Overlay has been instantiated.");
        LiveUnit.Assert.isNotNull(overlay, "Overlay element should not be null when instantiated.");
        new WinJS.UI._Overlay(overlayElement);
    }
    this.testOverlayMultipleInstantiation["Owner"] = "shawnste";
    this.testOverlayMultipleInstantiation["Priority"] = "1";
    this.testOverlayMultipleInstantiation["Description"] = "Test Overlay Duplicate Instantiation with same DOM element";
    this.testOverlayMultipleInstantiation["Category"] = "Instantiation";
    this.testOverlayMultipleInstantiation["LiveUnit.ExpectedException"] = { message: WinJS.Resources._getWinJSString("ui/duplicateConstruction").value }; // This is the exception that is expected

    // Test overlay parameters
    this.testOverlayParams = function () {
        function testGoodInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a Overlay using good parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            var options = {};
            options[paramName] = value;
            document.body.appendChild(div);
            var overlay = new WinJS.UI._Overlay(div, options);
            LiveUnit.Assert.isNotNull(overlay);
        }

        function testBadInitOption(paramName, value, expectedMessage) {
            LiveUnit.LoggingCore.logComment("Testing creating a Overlay using bad parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            document.body.appendChild(div);
            var options = {};
            options[paramName] = value;
            var exception = null;
            try {
                new WinJS.UI._Overlay(div, options);
            } catch (e) {
                exception = e;
            }
            LiveUnit.LoggingCore.logComment(exception !== null);
            LiveUnit.LoggingCore.logComment(exception.message);
            LiveUnit.Assert.isTrue(exception !== null);
            LiveUnit.Assert.isTrue(exception.name === "Error");
            LiveUnit.Assert.isTrue(exception.message === expectedMessage);
        }

        LiveUnit.LoggingCore.logComment("Testing element");
    }
    this.testOverlayParams["Owner"] = "shawnste";
    this.testOverlayParams["Priority"] = "1";
    this.testOverlayParams["Description"] = "Test initializing a Overlay with good and bad initialization options";
    this.testOverlayParams["Category"] = "Instantiation";

    // Test defaults
    this.testDefaultOverlayParameters = function () {
        // Get the Overlay element from the DOM
        var overlayElement = document.createElement("div");
        document.body.appendChild(overlayElement);
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Overlay element");
        var overlay = new WinJS.UI._Overlay(overlayElement);
        LiveUnit.LoggingCore.logComment("Overlay has been instantiated.");
        LiveUnit.Assert.isNotNull(overlay, "Overlay element should not be null when instantiated.");

        LiveUnit.Assert.areEqual(overlay.element, overlayElement, "Verifying that element is what we set it with");
        LiveUnit.Assert.areEqual(overlay.autoHide, undefined, "Verifying that autoHide is undefined");
        LiveUnit.Assert.areEqual(overlay.lightDismiss, undefined, "Verifying that lightDismiss is undefined");
    }
    this.testDefaultOverlayParameters["Owner"] = "shawnste";
    this.testDefaultOverlayParameters["Priority"] = "1";
    this.testDefaultOverlayParameters["Description"] = "Test default overlay parameters";
    this.testDefaultOverlayParameters["Category"] = "Instantiation";

    // Simple Function Tests
    this.testSimpleOverlayFunctions = function () {
        // Get the Overlay element from the DOM
        var overlayElement = document.createElement("div");
        document.body.appendChild(overlayElement);
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Overlay element");
        var overlay = new WinJS.UI._Overlay(overlayElement);
        LiveUnit.LoggingCore.logComment("Overlay has been instantiated.");
        LiveUnit.Assert.isNotNull(overlay, "Overlay element should not be null when instantiated.");

        LiveUnit.LoggingCore.logComment("show");
        overlay.show();

        LiveUnit.LoggingCore.logComment("hide");
        overlay.hide();

        LiveUnit.LoggingCore.logComment("addEventListener");
        overlay.addEventListener();

        LiveUnit.LoggingCore.logComment("removeEventListener");
        overlay.removeEventListener();
    }
    this.testSimpleOverlayFunctions["Owner"] = "shawnste";
    this.testSimpleOverlayFunctions["Priority"] = "1";
    this.testSimpleOverlayFunctions["Description"] = "Test default overlay parameters";
    this.testSimpleOverlayFunctions["Category"] = "Instantiation";
    
    this.testOverlayDispose = function () {
        var overlay = new WinJS.UI._Overlay();
        LiveUnit.Assert.isTrue(overlay.dispose);
        LiveUnit.Assert.isFalse(overlay._disposed);

        var inheritanceDispose = false;
        overlay._dispose = function () {
            inheritanceDispose = true;
        }

        overlay.dispose();
        LiveUnit.Assert.isTrue(overlay._disposed);
        LiveUnit.Assert.isTrue(inheritanceDispose);
        overlay.dispose();
    }
    this.testOverlayDispose["Owner"] = "seanxu";
    this.testOverlayDispose["Description"] = "Unit test for dispose requirements.";
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.OverlayTests");
