// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <!-- saved from url=(0014)about:internet -->
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
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

    // Test Overlay Instantiation with null element
    this.testOverlayNullInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Overlay with null element");
        var overlay = new WinJS.UI._Overlay(null);
        LiveUnit.Assert.isNotNull(overlay, "Overlay instantiation was null when sent a null Overlay element.");
    }

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

    this.testOverlayMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" }; // This is the exception that is expected

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

    this.testHiddenOverlayWillNotHandleBackClickEvent = function (complete) {
        // Verifies that a hidden _Overlay should never handle the WinJS.Application.backclick event.

        // Simulate
        function simulateBackClick() {
            backClickEvent = OverlayHelpers.createBackClickEvent();
            LiveUnit.Assert.isFalse(backClickEvent._winRTBackPressedEvent.handled);
            WinJS.Application.queueEvent(backClickEvent); // Fire the "backclick" event from WinJS.Application 

            WinJS.Application.addEventListener("verification", verify, true);
            WinJS.Application.queueEvent({ type: 'verification' });
        };

        // Verify 
        function verify() {
            LiveUnit.Assert.isFalse(backClickEvent._winRTBackPressedEvent.handled, "A hidden _Overlay should never handle the 'backclick' event");
            cleanup();
        };

        // Cleanup
        function cleanup() {
            WinJS.Application.removeEventListener("verification", verify, true);
            WinJS.Application.stop();
            // Application.stop() kills all listeners on the Application object. 
            // Reset all global _Overlay eventhandlers to reattach our listener to the Application "backclick" event.
            WinJS.UI._Overlay._globalEventListeners.reset(); 
            complete();
        }

        // Setup
        WinJS.Application.start();
        var backClickEvent;

        var overlayElement = document.createElement("div");
        document.body.appendChild(overlayElement);
        var overlay = new WinJS.UI._Overlay(overlayElement);

        LiveUnit.Assert.isTrue(overlay.hidden, "Test expects that _Overlays are hidden by default");
        simulateBackClick();

    };
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.OverlayTests");
