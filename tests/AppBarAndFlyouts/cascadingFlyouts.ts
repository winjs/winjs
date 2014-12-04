// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="OverlayHelpers.ts" />

module CorsicaTests {
    "use strict";

    var Key = WinJS.Utilities.Key,
        Flyout = <typeof WinJS.UI.PrivateFlyout> WinJS.UI.Flyout,
        _rootAnchor: HTMLElement,
        cascadeManager = Flyout._cascadeManager,
        chainCounter;

    var DEFAULT_CHAIN_SIZE = 6;


    function showFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
        return OverlayHelpers.show(flyout).then(function verifyFlyoutContainsFocusAfterShowing() {
            LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), "Flyout should contain focus after showing");
        });
    }

    function hideFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
        // Hides the specified flyout and returns a promise that completes when
        // it and all of its subFlyouts in the cascade are hidden.

        var p: WinJS.Promise<any>;

        var index = cascadeManager.indexOf(flyout);
        if (index >= 0) {
            // Identify all the subFlyouts that should hide when the specified flyout is hidden.
            var hidingFlyouts: Array<WinJS.UI.PrivateFlyout> = cascadeManager._cascadingStack.slice(index, cascadeManager.length);

            var hidingPromises: Array<WinJS.Promise<any>> = hidingFlyouts.map((flyout): WinJS.Promise<any> => {
                return new WinJS.Promise((c, e, p) => {
                    function afterHide() {
                        flyout.removeEventListener("afterhide", afterHide, false);
                        c();
                    };

                    flyout.addEventListener("afterhide", afterHide, false);
                });
            });
            hidingFlyouts[0].hide();
            p = WinJS.Promise.join(hidingPromises);
        } else {
            p = WinJS.Promise.wrap();
        }

        return p;
    }

    function showFlyoutChain(flyoutChain: Array<WinJS.UI.PrivateFlyout>, sentinelFlyout?: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
        // Shows all flyouts in the specified flyoutChain until the sentinel flyout is shown.
        // If no sentinel is specified, the entire chain is shown.
        // Returns a promise that is completed when the last flyout is finished showing.

        var index = flyoutChain.indexOf(sentinelFlyout);
        flyoutChain = (index < 0) ? flyoutChain : flyoutChain.slice(0, index + 1);

        var p = WinJS.Promise.wrap();
        flyoutChain.forEach((flyout, index: number) => {
            p = p.then((): WinJS.Promise<any> => {
                return showFlyout(flyoutChain[index]);
            });
        });

        return p;
    }

    function generateFlyoutChain(anchor: HTMLElement, numFlyouts?: number): Array<WinJS.UI.PrivateFlyout> {
        // Creates and returns an Array of Flyouts. Each Flyout in the chain has its anchor property set to the HTMLElement of the previous flyout.
        var flyoutChain = [],
            chainClass = "chain_" + ++chainCounter,
            prevFlyout;

        // Default fallback.
        numFlyouts = numFlyouts || DEFAULT_CHAIN_SIZE;

        for (var i = 0; i < numFlyouts; i++) {
            anchor = prevFlyout ? prevFlyout.element : anchor;

            var flyout = new Flyout(null, { anchor: anchor });
            document.body.appendChild(flyout.element);
            WinJS.Utilities.addClass(flyout.element, chainClass);
            flyout.element.id = (i + 1) + "of" + numFlyouts;

            flyoutChain.push(flyout);
            prevFlyout = flyout;
        }
        return flyoutChain;
    }

    function verifyCascade(expectedCascade: Array<WinJS.UI.PrivateFlyout>): void {
        // Verifies that the Flyouts currently in the cascade and the Flyouts that are currently visible line up with the chain of flyouts we are expecting.
        var msg = "The Flyouts in the cascade should match the chain of Flyouts we were expecting.";
        LiveUnit.LoggingCore.logComment("Test: " + msg);
        LiveUnit.Assert.areEqual(expectedCascade.length, cascadeManager.length, msg);
        for (var i = 0, len = expectedCascade.length; i < len; i++) {
            LiveUnit.Assert.areEqual(expectedCascade[i], cascadeManager.getAt(i), msg);
        }

        msg = "The Flyouts that are visible should match the chain of Flyouts we were expecting.";
        LiveUnit.LoggingCore.logComment("Test: " + msg);
        var visibleFlyoutElements: Array<HTMLElement> = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement) {
            return !flyoutElement.winControl.hidden;
        });
        LiveUnit.Assert.areEqual(expectedCascade.length, visibleFlyoutElements.length, msg);
        for (var i = 0, len = expectedCascade.length; i < len; i++) {
            LiveUnit.Assert.isTrue(visibleFlyoutElements.indexOf(expectedCascade[i].element) >= 0, msg);
        }
    }

    export class CascadingFlyoutTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            chainCounter = 0;

            _rootAnchor = document.createElement('button');
            _rootAnchor.id = "rootanchor";
            _rootAnchor.textContent = "rootanchor";
            _rootAnchor.tabIndex = 1;
            document.body.appendChild(_rootAnchor);
            _rootAnchor.focus();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            chainCounter = 0;
            cascadeManager.collapseAll();

            var flyouts = document.querySelectorAll(".win-flyout");
            Array.prototype.forEach.call(flyouts, (element: HTMLElement) => {
                OverlayHelpers.disposeAndRemove(element);
                element = null;
            });

            OverlayHelpers.disposeAndRemove(_rootAnchor);
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;
        }

        testSingleFlyoutInTheCascade = function (complete) {
            // Verifies that showing and hiding a flyout will always add and remove it from the cascade.

            function checkAfterShow() {
                flyout.removeEventListener("aftershow", checkAfterShow, false);

                var msg = "Shown flyout should take focus";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), msg);

                msg = "Showing a flyout should always add it to the cascade";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                LiveUnit.Assert.isTrue(cascadeManager.indexOf(flyout) >= 0, msg);
                LiveUnit.Assert.areEqual(cascadeManager.length, 1);

                flyout.hide();
            };
            function checkAfterHide() {
                flyout.removeEventListener("afterhide", checkAfterHide, false);

                var msg = "Hiding a flyout should always remove it from the cascade";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                LiveUnit.Assert.isFalse(cascadeManager.indexOf(flyout) >= 0, msg);
                LiveUnit.Assert.areEqual(cascadeManager.length, 0)

                var msg = "Hiding all flyouts in the cascade should leave focus in the app.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(_rootAnchor.contains(<HTMLElement>document.activeElement), msg);

                complete();
            };

            var flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout = new Flyout(flyoutElement, { anchor: _rootAnchor });

            var msg = "The cascade should be empty when no flyouts are showing";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(cascadeManager.length, 0, msg);

            flyout.addEventListener("aftershow", checkAfterShow, false);
            flyout.addEventListener("afterhide", checkAfterHide, false);

            flyout.show();
        }

        testChainedFlyoutsWillAppendToTheCascadeWhenShownInOrder = function (complete) {
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in the cascade, in order.

            var flyoutChain = generateFlyoutChain(_rootAnchor);

            showFlyoutChain(flyoutChain).then(() => {
                verifyCascade(flyoutChain);
                complete();
            });
        }

        testHidingAFlyoutAlsoCollapsesItsSubFlyoutsAndRestoresFocus = function (complete) {
            // Verifies that hiding a flyout will also hide its cascading subFlyouts.
            // Verifies that each time a flyout is hidden, focus is restored to whichever element the specified flyout originally took focus from.

            // Explicitly set initial focus:
            _rootAnchor.focus();

            var requiredSize = 3,
                flyoutChain = generateFlyoutChain(_rootAnchor);
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            var index: number,
                flyout: WinJS.UI.PrivateFlyout,
                expectedFocusTarget: HTMLElement,
                expectedCascadeAfterHiding: Array<WinJS.UI.PrivateFlyout>;

            return showFlyoutChain(flyoutChain).then(() => {

                // Hide Flyout at the end of the cascade
                index = flyoutChain.length - 1;
                flyout = flyoutChain[index];
                expectedFocusTarget = flyout._previousFocus,
                expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                return hideFlyout(flyout);

            }).then(() => {
                verifyCascade(expectedCascadeAfterHiding);
                LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                // Hide Flyout in the middle of the cascade
                index = Math.floor(flyoutChain.length / 2)
                flyout = flyoutChain[index];
                expectedFocusTarget = flyout._previousFocus;
                expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                return hideFlyout(flyout);

            }).then(() => {
                verifyCascade(expectedCascadeAfterHiding);
                LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                // Hide Flyout at the beginning of the cascade
                index = 0;
                flyout = flyoutChain[index];
                expectedFocusTarget = _rootAnchor;
                expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                return hideFlyout(flyout);

            }).then(() => {
                verifyCascade(expectedCascadeAfterHiding);
                LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                complete();
            });
        }

        testShowingAFlyout_AnchoredToAFlyoutInTheMiddleOfTheCascade_HidesOtherSubFlyouts = function (complete) {
            // Verifies that, showing a flyout "A" whose anchor is an element contained within a flyout "B", while "B" is already showing in the cascade will:
            // 1) Removes all subflyouts after "B" from the cascade, making "B" the new end.
            // 2) Appends "A" to the end of the cascade after "B".

            var flyoutChain = generateFlyoutChain(_rootAnchor),
                requiredSize = 2;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            showFlyoutChain(flyoutChain).then(() => {

                // Create a single Flyout anchored to a flyout already in the cascade
                var anchor = flyoutChain[requiredSize - 2].element,
                    otherFlyout = generateFlyoutChain(anchor, 1)[0];

                showFlyout(otherFlyout).then(() => {
                    var expectedCascade = flyoutChain.slice(0, requiredSize - 1).concat(otherFlyout);
                    verifyCascade(expectedCascade);
                    complete();
                });
            });
        }

        testShowingAFlyout_NotAnchoredToAFlyoutInTheTheCascade_ReplacesTheCurrentCascadeWithItself = function (complete) {
            // Verifies that, showing a flyout (A), that is not anchored to a flyout already in the cascade should replace all subflyouts in the cascade with flyout (A).
            // Also Verifies that then hiding (A) will restore focus back to the element in the App that had focus before the any of the flyouts were opened.

            // Explicitly set initial focus:
            _rootAnchor.focus();

            // Chain of flyouts to initially show in the cascade.
            var flyoutChain = generateFlyoutChain(_rootAnchor);

            // Single flyout anchored to the <body>
            var otherFlyout = generateFlyoutChain(document.body, 1)[0];

            showFlyoutChain(flyoutChain).then(() => {
                return showFlyout(otherFlyout);
            }).then(() => {
                verifyCascade([otherFlyout]);
                return hideFlyout(otherFlyout);
            }).done(() => {
                LiveUnit.Assert.isTrue(_rootAnchor.contains(<HTMLElement>document.activeElement), "Hiding all flyouts in the cascade should return focus to the element that originally had it.");
                complete();
            });
        }

        testFlyoutAlwaysHidesSubFlyoutsWhenItReceivesFocus = function (complete) {
            // Verifies that when focus moves into a flyout from somewhere that was outside of that flyout, all of it's subflyout descendants  get removed from the cascade.

            var flyoutChain = generateFlyoutChain(_rootAnchor),
                requiredSize = 3;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            showFlyoutChain(flyoutChain).then(() => {
                var index = 1,
                    flyoutToFocus = flyoutChain[index],
                    firstSubFlyoutToHide = flyoutChain[index + 1],
                    expectedChain = flyoutChain.slice(0, index + 1);

                firstSubFlyoutToHide.addEventListener("afterhide", function afterHide() {
                    firstSubFlyoutToHide.removeEventListener, ("afterhide", afterHide, false);
                    verifyCascade(expectedChain);
                    complete();
                }, false);

                LiveUnit.Assert.isFalse(flyoutToFocus.element.contains(<HTMLElement>document.activeElement),
                    "Test Error: focus needs to be outside of the element, before we focus it.");
                flyoutToFocus.element.focus();
            });

        }

        testEntireCascadeHidesWhenAllFlyoutsLoseFocus = function (complete) {
            // Verifies that the entire cascade hides when all flyouts lose focus.

            var flyoutChain = generateFlyoutChain(_rootAnchor);
            showFlyoutChain(flyoutChain).then(() => {

                flyoutChain[0].addEventListener("afterhide", function afterHide() {
                    flyoutChain[0].removeEventListener("afterhide", afterHide, false);
                    verifyCascade([]);
                    complete();
                }, false);

                LiveUnit.Assert.isTrue(cascadeManager.indexOfElement(document.activeElement) >= 0,
                    "Test Error: focus needs to be inside of one of the flyouts in the cascade before we move focus outside of the cascade.");
                _rootAnchor.focus();
            });

        }

        testLeftArrowKeyHidesCurrentSubFlyout = function (complete) {
            // Verifies that the left arrow key will hide any flyout that is a subFlyout.
            var flyoutChain = generateFlyoutChain(_rootAnchor);
            showFlyoutChain(flyoutChain).then(() => {

                var endFlyout = flyoutChain[flyoutChain.length - 1],
                    expectedCascade = flyoutChain.slice(0, flyoutChain.length - 1);

                endFlyout.addEventListener("afterhide", function afterHide() {
                    endFlyout.removeEventListener, ("afterhide", afterHide, false);
                    verifyCascade(expectedCascade);
                    complete();
                }, false);

                Helper.keydown(endFlyout.element, Key.leftArrow);
            });
        }

        testLeftArrowKeyDoesNotHideFlyoutWhenOnlyOneFlyoutIsShowing = function (complete) {
            // Verifies that the left arrow key will not hide a Flyout, if that Flyout is not a subFlyout of another shown flyout.
            var flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout = new Flyout(flyoutElement, { anchor: _rootAnchor });
            var msg = "Left arrow key should not hide the current flyout if it is not the subFlyout of another shown flyout.";

            function beforeHide() {
                flyout.removeEventListener("beforehide", beforeHide, false);
                LiveUnit.Assert.fail(msg);
            }

            showFlyout(flyout).then(() => {

                verifyCascade([flyout]);

                LiveUnit.LoggingCore.logComment("Test: " + msg);
                flyout.addEventListener("beforehide", beforeHide, false);
                Helper.keydown(flyout.element, Key.leftArrow);

                return WinJS.Promise.timeout();
            }).then(function () {
                flyout.removeEventListener("beforehide", beforeHide, false);
                complete();
            });
        }

        testAltAndF10WillCollapseTheEntireCascade = function (complete) {
            // Verifies that both "alt" and "F10" keys when pressed inside a flyout will collapse the entire cascade.
            var flyoutChain = generateFlyoutChain(_rootAnchor);

            function verifyKeyCollapsesTheCascade(keyCode: number, keyName: string) {
                return new WinJS.Promise((completePromise) => {
                    showFlyoutChain(flyoutChain).then(() => {

                        var headFlyout = flyoutChain[0],
                            tailFlyout = flyoutChain[flyoutChain.length - 1];

                        headFlyout.addEventListener("afterhide", function afterHide() {
                            headFlyout.removeEventListener, ("afterhide", afterHide, false);
                            verifyCascade([]);
                            completePromise();
                        }, false);

                        var msg = "The entire cascade should hide whenever " + keyName + " is pressed inside a Flyout";
                        LiveUnit.LoggingCore.logComment("Test: " + msg);
                        Helper.keydown(tailFlyout.element, keyCode);
                    });
                });
            };

            verifyKeyCollapsesTheCascade(Key.alt, "alt").then(() => {
                return verifyKeyCollapsesTheCascade(Key.F10, "F10");
            }).done(complete);
        }
    }
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.CascadingFlyoutTests");