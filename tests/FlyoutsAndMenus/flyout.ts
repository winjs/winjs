// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="OverlayHelpers.ts" />

module CorsicaTests {
    "use strict";

    var Key = WinJS.Utilities.Key,
        _LightDismissService = Helper.require("WinJS/_LightDismissService"),
        _element;

    var expectedDistanceFromAnchor = 4,
        anchorStyling = "position:absolute; top:50%; left:50%; height:10px; width:10px; background-color: red;"

    var Flyout = <typeof WinJS.UI.PrivateFlyout> WinJS.UI.Flyout;

    interface IMarginBox { top: number; bottom: number; left: number; right: number; };

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
        }

        // Test flyout Instantiation
        testFlyoutInstantiation() {
            var flyout = new Flyout(_element);
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
        testFlyoutNullInstantiation() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flyout with null element");
            var flyout = new Flyout(null);
            LiveUnit.Assert.isNotNull(flyout, "flyout instantiation was null when sent a null flyout element.");
        }

    // Test multiple instantiation of the same flyout DOM element
        testFlyoutMultipleInstantiation() {
            FlyoutTests.prototype.testFlyoutMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            var flyout = new Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");
            new Flyout(_element);
        }


        // Test flyout parameters
        testFlyoutParams() {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a flyout using good parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                document.body.appendChild(div);
                var options = {};
                options[paramName] = value;
                var flyout = new Flyout(div, options);
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
                    new Flyout(div, options);
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
        testDefaultflyoutParameters() {
            var flyout = new Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(flyout.element, _element, "Verifying that element is what we set it with");
            LiveUnit.Assert.areEqual(flyout['autoHide'], undefined, "Verifying that autoHide is undefined");
            LiveUnit.Assert.areEqual(flyout['lightDismiss'], undefined, "Verifying that lightDismiss is undefined");
        }

        // Simple Function Tests
        testSimpleflyoutFunctions() {
            var flyout = new Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("show");
            flyout.show(document.body, "top");

            LiveUnit.LoggingCore.logComment("hide");
            flyout.hide();
        }


        testHiddenProperty(complete) {
            var flyout = new WinJS.UI.Flyout(_element);
            flyout.anchor = document.body;

            flyout.addEventListener("aftershow", function () {
                LiveUnit.Assert.isFalse(flyout.hidden);
                flyout.hidden = true;
                LiveUnit.Assert.isTrue(flyout.hidden);
                flyout.addEventListener("afterhide", function () {
                    LiveUnit.Assert.isTrue(flyout.hidden);
                    complete();
                });
            });
            LiveUnit.Assert.isTrue(flyout.hidden);
            flyout.hidden = false;
            LiveUnit.Assert.isFalse(flyout.hidden);
        }


        testFlyoutDispose() {
            var flyout = new Flyout();
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



        testFlyoutShowThrows(complete) {
            var flyout: any = new Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("Calling show() with no parameters should throw");
            try {
                flyout.show();
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Flyout anchor element not found in DOM.", e.message);
            }

            LiveUnit.LoggingCore.logComment("Calling show() with null should throw");
            try {
                flyout.show(null);
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Flyout anchor element not found in DOM.", e.message);
            }

            complete();
        }

        testFlyoutInnerHTMLChangeDuringShowAnimation(complete) {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flyout element");
            var flyout = new Flyout(_element);
            LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
            LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("Remove HTML Elements from Flyout innerHTML before Flyout show animation completes.");
            flyout.show(document.body);
            flyout.element.innerHTML = "Not an HTML Element"; // A text Node !== an HTML Element

            Helper.waitForEvent(_element, "aftershow").done(complete);
        }

        testDisposeRemovesFlyoutClickEatingDiv(complete) {
            var flyout = new Flyout();
            document.body.appendChild(flyout.element);
            flyout.show(document.body);

            flyout.addEventListener("aftershow", function () {
                var clickEater = <HTMLElement>document.querySelector("." + _LightDismissService._ClassNames._clickEater);
                LiveUnit.Assert.isTrue(clickEater);
                LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

                flyout.dispose();

                LiveUnit.Assert.isNull(document.querySelector("." + _LightDismissService._ClassNames._clickEater));
                complete();
            });
        }

        testTopPlacement(complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new Flyout(_element);
            flyout.show(anchor, "top");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.top - flyoutRect.bottom;

                LiveUnit.LoggingCore.logComment("Flyout should be on top of the anchor");
                LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        }

        testBottomPlacement(complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new Flyout(_element);
            flyout.show(anchor, "bottom");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = flyoutRect.top - anchorRect.bottom;

                LiveUnit.LoggingCore.logComment("Flyout should be underneath the anchor");
                LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        }

        testLeftPlacement(complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new Flyout(_element);
            flyout.show(anchor, "left");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.left - flyoutRect.right;

                LiveUnit.LoggingCore.logComment("Flyout should be to the left of the anchor");
                LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        }

        testRightPlacement(complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new Flyout(_element);
            flyout.show(anchor, "right");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = flyoutRect.left - anchorRect.right;

                LiveUnit.LoggingCore.logComment("Flyout should be to the right of the anchor");
                LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        }

        testAutoHorizontalPlacement(complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);

            var flyout = new Flyout(_element);

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
        }

        testAutoVerticalPlacement(complete) {
            var anchor = document.createElement("DIV");
            anchor.style.cssText = anchorStyling;
            document.body.appendChild(anchor);
            _element.style.height = "90%";
            _element.style.width = "100px";
            _element.style.backgroundColor = "red";

            var flyout = new Flyout(_element);

            // By default, based on the configuration, this tall flyout would be shown to the left side of the anchor,
            // but we are going to restrict it to only vertical positions, so it will be shown at the top.
            flyout.show(anchor, "autovertical");

            flyout.addEventListener('aftershow', function () {
                var anchorRect = anchor.getBoundingClientRect();
                var flyoutRect = flyout.element.getBoundingClientRect();

                // In High DPI scenarios the actual distance may be within 1px of the expected distance.
                var actualDistance = anchorRect.top - flyoutRect.bottom;

                LiveUnit.LoggingCore.logComment("Flyout should be on the top of the anchor");
                LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
                LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

                LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
                document.body.removeChild(anchor);
                complete();
            }, false);
        }

        testDismissesWhenLosingFocus(complete) {
            var root = _element;
            root.innerHTML =
            "<button id='outsideFlyout'>outsideFlyout</button>" +
            "<div id='anchor'></div>" +
            "<div id='flyout'>" +
            "<button id='button0'>Button0</button>" +
            "<button id='button1'>Button1</button>" +
            "</div>";
            var outsideFlyout = root.querySelector("#outsideFlyout");
            var flyout = new Flyout(root.querySelector("#flyout"), {
                anchor: root.querySelector("#anchor")
            });

            OverlayHelpers.Assert.dismissesWhenLosingFocus({
                overlay: flyout,
                focusTo: outsideFlyout
            }).then(complete);
        }

        testRemainsVisibleWhenMovingFocusInternally(complete) {
            var root = _element;
            root.innerHTML =
            "<div id='anchor'></div>" +
            "<div id='flyout'>" +
            "<button id='button0'>Button0</button>" +
            "<button id='button1'>Button1</button>" +
            "</div>";
            var flyout = new Flyout(root.querySelector("#flyout"), {
                anchor: root.querySelector("#anchor")
            });
            OverlayHelpers.Assert.remainsVisibleWhenMovingFocusInternally({
                overlay: flyout,
                focusFrom: flyout.element.querySelector("#button0"),
                focusTo: flyout.element.querySelector("#button1")
            }).then(complete);
        }

        testBackClickEventTriggersLightDismiss(complete) {
            // Verifies that a shown Flyout will  light dismiss due to backclick.

            // Simulate
            function simulateBackClick() {
                var handled = _LightDismissService._onBackClick();
                LiveUnit.Assert.isTrue(handled, "Flyout should have handled the 'backclick' event");
                LiveUnit.Assert.isTrue(flyout.hidden, "Flyout should be hidden after light dismiss");
                cleanup();
            };

            // Cleanup
            function cleanup() {
                flyout.dispose();
                complete();
            }

            // Setup
            var flyout = new Flyout(_element);
            flyout.addEventListener("aftershow", simulateBackClick, false);
            flyout.show(document.body);
        }

        testEscapeKeyClosesFlyout(complete) {
            // Verifies that ESC key hides a Flyout

            function afterHide() {
                flyout.removeEventListener, ("afterhide", afterHide, false);
                complete();
            }

            var flyout = new Flyout(_element, { anchor: document.body });
            flyout.addEventListener("afterhide", afterHide, false);

            OverlayHelpers.show(flyout).then(() => {
                var msg = "ESC key should hide the flyout.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                Helper.keydown(flyout.element, Key.escape);
            });
        }

        testShowMovesFocusSyncAndHideMovesFocusAsync(complete) {
            // Verifies Flyout.show moves focus at the beginning of the animation
            // and Flyout.hide moves focus at the end of the animation.
            var button = document.createElement("button");
            document.body.appendChild(button);

            var flyout = new Flyout(_element, { anchor: document.body });

            var msg = "",
                test1Ran = false;

            button.focus();
            LiveUnit.Assert.areEqual(document.activeElement, button, "TEST ERROR: button should have focus");

            function beforeShow() {
                flyout.removeEventListener("beforeshow", beforeShow, false);
                WinJS.Promise.timeout(0).then(() => {
                    LiveUnit.Assert.areEqual(document.activeElement, _element, msg);
                    test1Ran = true;
                });
            };
            flyout.addEventListener("beforeshow", beforeShow, false);

            function afterHide() {
                flyout.removeEventListener("afterhide", afterHide, false);
                LiveUnit.Assert.areEqual(document.activeElement, button, msg);
                complete();
            }
            flyout.addEventListener("afterhide", afterHide, false);

            msg = "Flyout.show should take focus synchronously after the 'beforeshow' event";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            OverlayHelpers.show(flyout).then(() => {
                LiveUnit.Assert.isTrue(test1Ran, "TEST ERROR: Test 1 did not run.");

                msg = "Flyout.hide should move focus before the 'afterhide' event";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                return OverlayHelpers.hide(flyout);
            });
        }

        testShowAt(complete) {
            // Verifies that calling Flyout.showAt(point) with an "in bounds point" will align the flyout borderbox with the point specified.
            // An "in bounds point" is defined as a point where the borderbox of the flyout can be positioned such that no edge of the flyout's 
            // marginbox overruns any edge of the visual viewport. 

            var flyout = new Flyout(_element, { anchor: document.body });

            var requiredWindowDimension = 100;
            // For this test to be valid, the Flyout's MarginBox must fit within the confines of the visual.
            // viewport after we've aligned the top / left of the Flyout's borderbox to the specified point.
            // Otherwise its considered an out of bounds point and is handled in a later test case.
            LiveUnit.Assert.isTrue(window.innerWidth >= requiredWindowDimension, "TEST ERROR: test expects visual viewport width >= " + requiredWindowDimension + "px");
            LiveUnit.Assert.isTrue(window.innerHeight >= requiredWindowDimension, "TEST ERROR: test expects visual viewport height >= " + requiredWindowDimension + "px");

            // Find a valid "in bounds point" within the window to pass to Flyout.showAt()
            var style = flyout.element.style;
            var contentSize = 50;
            var margins = WinJS.Utilities._getPreciseMargins(flyout.element);

            style.width = contentSize + "px";
            style.minWidth = contentSize + "px";
            style.maxWidth = contentSize + "px";
            style.height = contentSize + "px";
            style.maxHeight = contentSize + "px";
            style.minHeight = contentSize + "px";

            // Make sure the point we choose for the top/left of the borderbox also leaves the marginbox clear of the viewport top/left edge.
            var testX = 2 + margins.left;
            var testY = 2 + margins.top;

            function testShowAt_WithCoordinates(): WinJS.Promise<any> {
                var coordinates = { x: testX, y: testY };
                return verifyPositionOnScreen(coordinates, "Coordinates");
            }

            function testShowAt_WithMouseEvent(): WinJS.Promise<any> {
                // API requires clientX and clientY properties. 
                var mouseEventObjectShim = { clientX: testX, clientY: testY };
                return verifyPositionOnScreen(mouseEventObjectShim, "MouseEventObj");
            }

            function verifyPositionOnScreen(testParameter, testParameterType): WinJS.Promise<any> {
                // Verify that the flyout is positioned with the top left corner of its border box located at
                // the location specified by the testParameter.
                return new WinJS.Promise(function (completePromise) {
                    flyout.onaftershow = () => {
                        flyout.onaftershow = null;
                        var flyoutRect = flyout.element.getBoundingClientRect();

                        LiveUnit.Assert.areEqual(testY, flyoutRect.top,
                            testParameterType + ": Flyout borderbox should be top aligned with the y coordinate");
                        LiveUnit.Assert.areEqual(testX, flyoutRect.left,
                            testParameterType + ": Flyout borderbox should be left aligned with the x coordinate");

                        flyout.onafterhide = function () {
                            flyout.onafterhide = null;
                            completePromise();
                        }
                        flyout.hide();
                    };

                    flyout.showAt(testParameter);
                });
            }

            testShowAt_WithCoordinates()
                .then(testShowAt_WithMouseEvent)
                .then(complete);
        }

        testShowAt_Boundaries(complete) {
            // Verify that when showAt is called:
            // if any edge of the flyout's marginbox would clip through the corresponding edge of the visual viewport, 
            // then: the flyout's margin box is repositioned such that the clipping edge is instead pinned to the 
            // corresponding viewport edge.

            function getLocation(flyout: WinJS.UI.PrivateFlyout): IMarginBox {
                // Returns locaton of the Flyout's margin box.
                var margins = WinJS.Utilities._getPreciseMargins(flyout.element);
                var borderBox = flyout.element.getBoundingClientRect();
                return {
                    top: borderBox.top - margins.top,
                    right: borderBox.right + margins.right,
                    bottom: borderBox.bottom + margins.bottom,
                    left: borderBox.left - margins.left,
                }
            }

            function asyncShowAt(flyout: WinJS.UI.PrivateFlyout, options: { x: number; y: number; }) {
                return new WinJS.Promise((completePromise) => {

                    flyout.addEventListener("aftershow", function afterShow() {
                        flyout.removeEventListener("aftershow", afterShow, false);
                        completePromise();
                    }, false);

                    if (flyout.hidden) {
                        flyout.showAt(options);
                    } else {
                        flyout.addEventListener("afterhide", function afterHide() {
                            flyout.removeEventListener("afterhide", afterHide, false);
                            flyout.showAt(options);
                        }, false);

                        flyout.hide();
                    }
                });
            }

            var flyout = new Flyout(_element, { anchor: document.body });
            var marginBox: IMarginBox;

            // Test Cases: 
            var overrunTopLeft = { x: -2, y: -2 };
            var overrunTopRight = { x: window.innerWidth, y: -2 };
            var overrunBottomLeft = { x: -2, y: window.innerHeight };
            var overrunBottomRight = { x: window.innerWidth, y: window.innerHeight };

            var msg = "Top left boundary: ";
            asyncShowAt(flyout, overrunTopLeft)
                .then(() => {
                    marginBox = getLocation(flyout);
                    Helper.Assert.areFloatsEqual(0, marginBox.left, msg + "flyout should not overrun left edge", 1);
                    Helper.Assert.areFloatsEqual(0, marginBox.top, msg + "flyout should not overrun top edge", 1);

                    msg = "Top right boundary: ";
                    return asyncShowAt(flyout, overrunTopRight);
                })
                .then(() => {
                    marginBox = getLocation(flyout);
                    Helper.Assert.areFloatsEqual(window.innerWidth, marginBox.right, msg + "flyout should not overrun right edge", 1);
                    Helper.Assert.areFloatsEqual(0, marginBox.top, msg + "flyout should not overrun top edge", 1);

                    msg = "Bottom left boundary: ";
                    return asyncShowAt(flyout, overrunBottomLeft)
                })
                .then(() => {
                    marginBox = getLocation(flyout);
                    Helper.Assert.areFloatsEqual(0, marginBox.left, msg + "flyout should not overrun left edge", 1);
                    Helper.Assert.areFloatsEqual(window.innerHeight, marginBox.bottom, msg + "flyout should not overrun bottom edge", 1);

                    msg = "Bottom right boundary: ";
                    return asyncShowAt(flyout, overrunBottomRight)
                })
                .done(() => {
                    marginBox = getLocation(flyout);
                    Helper.Assert.areFloatsEqual(window.innerWidth, marginBox.right, msg + "flyout should not overrun right edge", 1);
                    Helper.Assert.areFloatsEqual(window.innerHeight, marginBox.bottom, msg + "flyout should not overrun bottom edge", 1);

                    complete();
                });
        }
    }
    
    var disabledTestRegistry = {
        testDismissesWhenLosingFocus:[
            Helper.Browsers.ie11,
            Helper.Browsers.chrome,
            Helper.Browsers.firefox
        ],
        testRemainsVisibleWhenMovingFocusInternally:[
            Helper.Browsers.chrome,
            Helper.Browsers.firefox
        ],
        testShowMovesFocusSyncAndHideMovesFocusAsync: Helper.Browsers.firefox
    };
    Helper.disableTests(FlyoutTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.FlyoutTests");
