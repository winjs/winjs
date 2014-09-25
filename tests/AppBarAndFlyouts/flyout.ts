// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="OverlayHelpers.ts" />

module CorsicaTests {
    "use strict";

    var _element;

    var expectedDistanceFromAnchor = 5;
    var anchorStyling = "position:absolute; top:50%; left:50%; height:10px; width:10px; background-color: red;"

    export class FlyoutTests {


        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var flyoutElement = document.createElement('div');
            document.body.appendChild(flyoutElement);
            _element = flyoutElement;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var flyouts = document.querySelectorAll(".win-flyout");
            Array.prototype.forEach.call(flyouts, function (element) {
                OverlayHelpers.disposeAndRemove(element);
                element = null;
            });
            OverlayHelpers.disposeAndRemove(_element);
            _element = null;

            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;
        }

        // Test flyout Instantiation
        testFlyoutInstantiation = function () {
            var flyout = new WinJS.UI.Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (flyout[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from flyout");
                }

                LiveUnit.Assert.isNotNull(flyout[functionName]);
                LiveUnit.Assert.isTrue(typeof (flyout[functionName]) === "function", functionName + " exists on flyout, but it isn't a function");
            }

            verifyFunction("show");
            verifyFunction("hide");
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
        }





    // Test flyout Instantiation with null element
    testFlyoutNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flyout with null element");
            var flyout = new WinJS.UI.Flyout(null);
            LiveUnit.Assert.isNotNull(flyout, "flyout instantiation was null when sent a null flyout element.");
        }





    // Test multiple instantiation of the same flyout DOM element
        testFlyoutMultipleInstantiation() {
            FlyoutTests.prototype.testFlyoutMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            var flyout = new WinJS.UI.Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");
            new WinJS.UI.Flyout(_element);
        }


        // Test flyout parameters
        testFlyoutParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a flyout using good parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                document.body.appendChild(div);
                var options = {};
                options[paramName] = value;
                var flyout = new WinJS.UI.Flyout(div, options);
                LiveUnit.Assert.isNotNull(flyout);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a flyout using bad parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                document.body.appendChild(div);
                var options = {};
                options[paramName] = value;
                var exception = null;
                try {
                    new WinJS.UI.Flyout(div, options);
                    LiveUnit.Assert.fail("Expected creating Flyout with " + paramName + "=" + value + " to throw an exception");
                } catch (e) {
                    exception = e;
                    LiveUnit.LoggingCore.logComment(exception.message);
                    LiveUnit.Assert.isTrue(exception !== null);
                    LiveUnit.Assert.isTrue(exception.name === expectedName);
                    LiveUnit.Assert.isTrue(exception.message === expectedMessage);
                }
            }

            LiveUnit.LoggingCore.logComment("Testing anchor");
            testGoodInitOption("anchor", "ralph");
            testGoodInitOption("anchor", "fred");
            testGoodInitOption("anchor", -1);
            testGoodInitOption("anchor", 12);
            testGoodInitOption("anchor", {});
            LiveUnit.LoggingCore.logComment("Testing alignment");
            testGoodInitOption("alignment", "left");
            testGoodInitOption("alignment", "right");
            testGoodInitOption("alignment", "center");
            var badAlignment = "Invalid argument: Flyout alignment should be 'center' (default), 'left', or 'right'.";
            testBadInitOption("alignment", "fred", "WinJS.UI.Flyout.BadAlignment", badAlignment);
            testBadInitOption("alignment", -1, "WinJS.UI.Flyout.BadAlignment", badAlignment);
            testBadInitOption("alignment", 12, "WinJS.UI.Flyout.BadAlignment", badAlignment);
            testBadInitOption("alignment", {}, "WinJS.UI.Flyout.BadAlignment", badAlignment);
            LiveUnit.LoggingCore.logComment("Testing placement");
            testGoodInitOption("placement", "top");
            testGoodInitOption("placement", "bottom");
            testGoodInitOption("placement", "left");
            testGoodInitOption("placement", "right");
            testGoodInitOption("placement", "auto");
            testGoodInitOption("placement", "autohorizontal");
            testGoodInitOption("placement", "autovertical");
            var badPlacement = "Invalid argument: Flyout placement should be 'top' (default), 'bottom', 'left', 'right', 'auto', 'autohorizontal', or 'autovertical'.";
            testBadInitOption("placement", "fred", "WinJS.UI.Flyout.BadPlacement", badPlacement);
            testBadInitOption("placement", -1, "WinJS.UI.Flyout.BadPlacement", badPlacement);
            testBadInitOption("placement", 12, "WinJS.UI.Flyout.BadPlacement", badPlacement);
            testBadInitOption("placement", {}, "WinJS.UI.Flyout.BadPlacement", badPlacement);
        }





    // Test defaults
    testDefaultflyoutParameters = function () {
            var flyout = new WinJS.UI.Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(flyout.element, _element, "Verifying that element is what we set it with");
            LiveUnit.Assert.areEqual(flyout['autoHide'], undefined, "Verifying that autoHide is undefined");
            LiveUnit.Assert.areEqual(flyout['lightDismiss'], undefined, "Verifying that lightDismiss is undefined");
        }





    // Simple Function Tests
    testSimpleflyoutFunctions = function () {
            var flyout = new WinJS.UI.Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("show");
            flyout.show(document.body, "top");

            LiveUnit.LoggingCore.logComment("hide");
            flyout.hide();
        }





    testFlyoutDispose = function () {
            var flyout = <WinJS.UI.PrivateFlyout>new WinJS.UI.Flyout();
            LiveUnit.Assert.isTrue(flyout.dispose);
            LiveUnit.Assert.isFalse(flyout._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            flyout.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            flyout.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(flyout._disposed);
            flyout.dispose();
        }



    testFlyoutShowThrows = function (complete) {
            var flyout: any = new WinJS.UI.Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("Calling show() with no parameters should throw");
            try {
                flyout.show();
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Showing flyout requires a DOM element as its parameter.", e.message);
            }

            LiveUnit.LoggingCore.logComment("Calling show() with null should throw");
            try {
                flyout.show(null);
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Showing flyout requires a DOM element as its parameter.", e.message);
            }

            complete();
        }

    testFlyoutInnerHTMLChangeDuringShowAnimation = function (complete) {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flyout element");
            var flyout = new WinJS.UI.Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("Remove HTML Elements from Flyout innerHTML before Flyout show animation completes.");
            flyout.show(document.body);
            flyout.element.innerHTML = "Not an HTML Element"; // A text Node !== an HTML Element

            Helper.waitForEvent(_element, "aftershow").done(complete);
        }

    testDisposeRemovesFlyoutClickEatingDiv = function (complete) {
            WinJS.UI._Overlay._clickEatingAppBarDiv = null;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = null;

            var flyout = new WinJS.UI.Flyout();
            document.body.appendChild(flyout.element);
            flyout.show(document.body);

            // ClickEater add/remove are high priority scheduler jobs, so we schedule an idle priority asserts
            flyout.addEventListener("aftershow", function () {
                var clickEater = <HTMLElement>document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass);
                LiveUnit.Assert.isTrue(clickEater);
                LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

                flyout.dispose();

                WinJS.Utilities.Scheduler.schedule(function () {
                    LiveUnit.Assert.areEqual("none", clickEater.style.display);
                    complete();
                }, WinJS.Utilities.Scheduler.Priority.idle);
            });
        };

        testTopPlacement = function (complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new WinJS.UI.Flyout(_element);
            flyout.show(anchor, "top");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.top - flyoutRect.bottom;

                LiveUnit.LoggingCore.logComment("Flyout should be on top of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        };

        testBottomPlacement = function (complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new WinJS.UI.Flyout(_element);
            flyout.show(anchor, "bottom");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = flyoutRect.top - anchorRect.bottom;

                LiveUnit.LoggingCore.logComment("Flyout should be underneath the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        };

        testLeftPlacement = function (complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new WinJS.UI.Flyout(_element);
            flyout.show(anchor, "left");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.left - flyoutRect.right;

                LiveUnit.LoggingCore.logComment("Flyout should be to the left of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        };

        testRightPlacement = function (complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new WinJS.UI.Flyout(_element);
            flyout.show(anchor, "right");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = flyoutRect.left - anchorRect.right;

                LiveUnit.LoggingCore.logComment("Flyout should be to the right of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        };

        testAutoHorizontalPlacement = function (complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new WinJS.UI.Flyout(_element);

            // By default, based on the configuration, this  flyout would be shown to the top of the anchor,
            // but we are going to restrict it to only horizontal positions, so it will be shown at the left.
            flyout.show(anchor, "autohorizontal");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.left - flyoutRect.right;

                LiveUnit.LoggingCore.logComment("Flyout should be on the left of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        };

        testAutoVerticalPlacement = function (complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);
            _element.style.height = "90%";
            _element.style.width = "100px";
            _element.style.backgroundColor = "red";

            var flyout = new WinJS.UI.Flyout(_element);

            // By default, based on the configuration, this tall flyout would be shown to the left side of the anchor,
            // but we are going to restrict it to only vertical positions, so it will be shown at the top.
            flyout.show(anchor, "autovertical");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.top - flyoutRect.bottom;

                LiveUnit.LoggingCore.logComment("Flyout should be on the top of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        };

        testDismissesWhenLosingFocus = function (complete) {
            var root = _element;
            root.innerHTML =
            "<button id='outsideFlyout'>outsideFlyout</button>" +
            "<div id='anchor'></div>" +
            "<div id='flyout'>" +
            "<button id='button0'>Button0</button>" +
            "<button id='button1'>Button1</button>" +
            "</div>";
            var outsideFlyout = root.querySelector("#outsideFlyout");
            var flyout = new WinJS.UI.Flyout(root.querySelector("#flyout"), {
                anchor: root.querySelector("#anchor")
            });

            OverlayHelpers.Assert.dismissesWhenLosingFocus({
                overlay: flyout,
                focusTo: outsideFlyout
            }).then(complete);
        };

        testRemainsVisibleWhenMovingFocusInternally = function (complete) {
            var root = _element;
            root.innerHTML =
            "<div id='anchor'></div>" +
            "<div id='flyout'>" +
            "<button id='button0'>Button0</button>" +
            "<button id='button1'>Button1</button>" +
            "</div>";
            var flyout = new WinJS.UI.Flyout(root.querySelector("#flyout"), {
                anchor: root.querySelector("#anchor")
            });
            OverlayHelpers.Assert.remainsVisibleWhenMovingFocusInternally({
                overlay: flyout,
                focusFrom: flyout.element.querySelector("#button0"),
                focusTo: flyout.element.querySelector("#button1")
            }).then(complete);
        };

        testBackClickEventTriggersLightDismiss = function (complete) {
            // Verifies that a shown Flyout will handle the WinJS.Application.backclick event and light dismiss itself.

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
                LiveUnit.Assert.isTrue(backClickEvent._winRTBackPressedEvent.handled, "Flyout should have handled the 'backclick' event");
                LiveUnit.Assert.isTrue(flyout.hidden, "Flyout should be hidden after light dismiss");
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

            var flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout = new WinJS.UI.Flyout(flyoutElement);
            flyout.addEventListener("aftershow", simulateBackClick, false);
            flyout.show(document.body);
        };

    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.FlyoutTests");
