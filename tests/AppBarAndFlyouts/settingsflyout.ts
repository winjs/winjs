// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <deploy src="../TestData/" />

module CorsicaTests {

    export class SettingsFlyoutTests {
        "use strict";

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            OverlayHelpers.disposeAndRemove(document.querySelector(".win-settingsflyout"));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;

        }

        // Test settings flyout Instantiation
        testSettingsFlyoutInstantiation = function () {
            // Get the settings flyout element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the settings flyout element");
            var flyoutElement = document.createElement('div');
            document.body.appendChild(flyoutElement);
            var settingsFlyout = new WinJS.UI.SettingsFlyout(flyoutElement);
            LiveUnit.LoggingCore.logComment("settings flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(settingsFlyout, "settings flyout element should not be null when instantiated.");

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (settingsFlyout[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from settings flyout");
                }
                LiveUnit.Assert.isNotNull(settingsFlyout[functionName]);
                LiveUnit.Assert.isTrue(typeof (settingsFlyout[functionName]) === "function", functionName +
                    " exists on flyout, but it isn't a function");
            }

            function verifyProperty(propertyName) {
                LiveUnit.LoggingCore.logComment("Verifying that property " + propertyName + " exists");
                for (var name in settingsFlyout) {
                    if (name == propertyName) {
                        return;
                    }
                }
                LiveUnit.Assert.fail(propertyName + " missing from settings flyout");
            }

            verifyFunction("show");
            verifyFunction("hide");
            verifyProperty("width");
            document.body.removeChild(flyoutElement);
        }

    // Test settings flyout Instantiation with null element
    testSettingsFlyoutNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the settings flyout with null element");
            var settingsFlyout = new WinJS.UI.SettingsFlyout(null);
            LiveUnit.Assert.isNotNull(settingsFlyout, "settings flyout instantiation was null when sent a null settings flyout element.");
        }

    // Test multiple instantiation of the same settings flyout DOM element
        testSettingsFlyoutMultipleInstantiation() {
            SettingsFlyoutTests.prototype.testSettingsFlyoutMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            // Get the settings flyout element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to instantiate the settings flyout element");
            var settingsFlyoutElement = document.createElement('div');
            document.body.appendChild(settingsFlyoutElement);
            var settingsFlyout = new WinJS.UI.SettingsFlyout(settingsFlyoutElement);
            LiveUnit.LoggingCore.logComment("settings flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(settingsFlyout, "settings flyout element should not be null when instantiated.");
            new WinJS.UI.Flyout(settingsFlyoutElement);
            document.body.removeChild(settingsFlyoutElement);
        }

        testSettingsFlyoutDispose = function () {
            var sf = <WinJS.UI.PrivateSettingsFlyout>new WinJS.UI.SettingsFlyout();
            LiveUnit.Assert.isTrue(sf.dispose);
            LiveUnit.Assert.isFalse(sf._disposed);

            // Double dispose sentinel
            var sentinel:any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            sf.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            sf.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(sf._disposed);
            sf.dispose();
        }
    //testSettingsFlyoutDispose["Description"] = "Unit test for dispose requirements.";

        testDisposeRemovesAppBarClickEatingDiv = function (complete) {
            WinJS.UI._Overlay._clickEatingAppBarDiv = null;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = null;

            var flyout = new WinJS.UI.SettingsFlyout();
            document.body.appendChild(flyout.element);
            flyout.show();

            // ClickEater add/remove are high priority scheduler jobs, so we schedule an idle priority asserts
            flyout.addEventListener("aftershow", function () {
                var clickEater = <HTMLElement>document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass);
                LiveUnit.Assert.isTrue(clickEater);
                LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

                flyout.dispose();

                WinJS.Utilities.Scheduler.schedule(function () {
                    LiveUnit.Assert.areEqual("none", clickEater.style.display);
                    document.body.removeChild(flyout.element);
                    complete();
                }, WinJS.Utilities.Scheduler.Priority.idle);
            });
        };

        testBackClickEventTriggersSettingsLightDismiss = function (complete) {
            // Verifies that a shown SettingsFlyout will handle the WinJS.Application.backclick event and light dismiss itself.

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
                LiveUnit.Assert.isTrue(backClickEvent._winRTBackPressedEvent.handled, "SettingsFlyout should have handled the 'backclick' event");
                LiveUnit.Assert.isTrue(settingsFlyout.hidden, "SettingsFlyout should be hidden after light dismiss");
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

            var settingsElement = document.createElement("div");
            document.body.appendChild(settingsElement);
            var settingsFlyout = new WinJS.UI.SettingsFlyout(settingsElement);
            settingsFlyout.addEventListener("aftershow", simulateBackClick, false);
            settingsFlyout.show();
        };
    }

    if (WinJS.Utilities.hasWinRT) {
        // Test settings flyout loading from fragment
        SettingsFlyoutTests.prototype['testSettingsFlyoutWithFragment'] = function (complete) {
            // Get the settings flyout element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to to load the settings flyout fragment");
            WinJS.UI.SettingsFlyout.showSettings("CustomSettings", "SettingsFlyoutFragment.html");

            // Yield so the flyout can be shown
            WinJS.Promise.timeout().
                then(function () {
                    var settingsFlyoutElement = document.getElementById("CustomSettings");
                    LiveUnit.Assert.isNotNull(settingsFlyoutElement, "loaded settings flyout element from fragment should not be null.");
                    var settingsControl = settingsFlyoutElement.winControl;
                    LiveUnit.Assert.isNotNull(settingsControl, "settings flyout control is invalid.");

                    // Verify the type of the flyout. Wide flyout width = 645px
                    var expectedFlyoutWidth = 645;
                    LiveUnit.Assert.areEqual(expectedFlyoutWidth, settingsFlyoutElement.clientWidth, "Not a wide flyout");

                    // unload the fragment and destruct the control
                    settingsControl._dismiss();

                    // Yield so the flyout can be dismissed
                    return WinJS.Promise.timeout(2000);
                }).
                then(function () {
                    var element = document.getElementById("CustomSettings");
                    LiveUnit.Assert.isNull(element, "failed to unload the settings flyout fragment");
                }).
                done(complete);
        }

        SettingsFlyoutTests.prototype['testSettingswithCommandProperty'] = function (complete) {
            // Get the settings flyout element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to to load the settings flyout fragment");
            WinJS.UI.SettingsFlyout.showSettings("CommandA", "SettingsFlyoutFragment.html");

            // Yield so the flyout can be shown
            WinJS.Promise.timeout().
                then(function () {
                    var settingsFlyoutElement = document.querySelector(".win-settingsflyout");
                    LiveUnit.Assert.isNotNull(settingsFlyoutElement, "loaded settings flyout element from fragment should not be null.");
                    var settingsControl = settingsFlyoutElement.winControl;
                    LiveUnit.Assert.isNotNull(settingsControl, "settings flyout control is invalid.");

                    LiveUnit.Assert.isTrue(settingsControl.settingsCommandId === "CommandA", "Expected right value in settingsCommandId");

                    // Verify the type of the flyout. Wide flyout width = 345px
                    var expectedFlyoutWidth = 345;
                    LiveUnit.Assert.areEqual(expectedFlyoutWidth, settingsFlyoutElement.clientWidth, "Not a narrow flyout");

                    // unload the fragment and destruct the control
                    settingsControl._dismiss();

                    // Yield so the flyout can dismissed
                    return WinJS.Promise.timeout(2000);
                }).
                then(function () {
                    var settingsFlyoutElement = document.getElementById("CommandA");
                    LiveUnit.Assert.isTrue(!settingsFlyoutElement, "failed to unload the settings flyout fragment");
                }).
                done(complete);
        }
    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.SettingsFlyoutTests");

