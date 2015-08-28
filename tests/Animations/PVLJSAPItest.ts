// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="AnimationCollection.ts" />
/// <reference path="JSAnimationVerifier.ts" />
/// <reference path="JSAnimationUtils.ts" />

module WinJSTests {

    var verifier = AnimationVerifier;
    var util = JSAnimationUtils;
    var result;
    var animationsEnabledAtSetUp = true;

    //This will be called if the function call complete correctly.
    var onComplete = function () {
        LiveUnit.LoggingCore.logComment("Complete");
        result = true;
    }

    //This will be called if something wrong during the animation.
    var onError = function (e) {
        LiveUnit.LoggingCore.logComment("ERROR: " + e.description);
        result = false;
    }

	function verifyPerformance(duration, targetDuration) {
        var deviation = Math.abs(duration - targetDuration);
        var errorTolerance = 500;

        if (deviation > errorTolerance) {
            LiveUnit.LoggingCore.logComment("ERROR: target: "
                + targetDuration + ", actual: " + duration + ", acceptable deviation: "
                + errorTolerance + ", actual deviation: " + deviation);
            return false;
        } else {
            LiveUnit.LoggingCore.logComment("Completed; target: "
                + targetDuration + ", actual: " + duration
                + ", deviation: " + deviation);
            return true;
        }
    }

    function verifyMidState(elem, coordinatesTest, opacityTest) {
        if (coordinatesTest) {
            var currX = elem.getBoundingClientRect().left;
            var currY = elem.getBoundingClientRect().top;
            LiveUnit.LoggingCore.logComment("Coordinates Test: startX: " + coordinatesTest.startX +
                ", startY: " + coordinatesTest.startY + ", destX: " + coordinatesTest.destX +
                ", destY: " + coordinatesTest.destY + ", currX: " + currX + ", currY: " + currY);
            LiveUnit.Assert.isTrue(verifier.VerifyCoordinateTransitionInProgress(
                coordinatesTest.startX, coordinatesTest.startY,
                coordinatesTest.destX, coordinatesTest.destY, currX, currY));
        }
        if (opacityTest) {
            LiveUnit.LoggingCore.logComment("Opacity Test: current opacity=" +
                window.getComputedStyle(elem, null).getPropertyValue('opacity'));
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransitionInProgress(elem));
        }
    }

    export class PVLJSFunctionTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            util.addDom(false);
            result = null;
            animationsEnabledAtSetUp = WinJS.UI.isAnimationEnabled();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tear down");
            util.removeDom();

            if (animationsEnabledAtSetUp && !WinJS.UI.isAnimationEnabled()) {
                WinJS.UI.enableAnimations();
            }
        }



        //This test is to test the slideUp function by passing one element.
        testSlideUp(signalTestCaseCompleted) {
            var diffX = 0;
            var diffY = 200;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify slideUp duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify slideUp opacity:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                destY = startY;
                destX = startX;
                LiveUnit.LoggingCore.logComment("Verify slideUp destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            };
            var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionSTART: 'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("SlideUp", null);
            var startX = elem.getBoundingClientRect().left;
            var startY = elem.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.slideUp(elem).done(verifyAnimation);
        }

        //This test is to test the slideDown function by passing one element.
        testSlideDown(signalTestCaseCompleted) {
            var diffX = 0;
            var diffY = 200;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify slideDown duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SlideDown:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                LiveUnit.LoggingCore.logComment("Verify SlideDown destination:");
                destY = startY;
                destX = startX;
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            };
            var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionSTART: 'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("SlideDown", null);
            LiveUnit.LoggingCore.logComment("Testing SlideDown:");
            var startX = elem.getBoundingClientRect().left;
            var startY = elem.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.slideDown(elem).done(verifyAnimation);
        }

        //This test is to test the slideLeftOut function by passing four elements.
        testSlideLeftIn(signalTestCaseCompleted) {
            var diffX = window.innerWidth;
            var diffY = 0;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem1.getBoundingClientRect().left;
                var actualY = elem1.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify SlideLeftIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SlideLeftIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem1, '1'));
                LiveUnit.LoggingCore.logComment("Verify SlideLeftIn destination:");
                destY = startY;
                destX = startX;
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionSTART: 'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var elem3 = document.getElementById("div3");
            var elem4 = document.getElementById("div4");
            var targetDuration = util.getAnimationDuration("SlideLeftIn", null);
            LiveUnit.LoggingCore.logComment("Testing SlideLeftIn:");
            var startX = elem1.getBoundingClientRect().left;
            var startY = elem1.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.slideLeftIn(elem1, elem2, elem3, elem4).done(verifyAnimation);
        }

        //This test is to test the slideRightOut function by passing four elements.
        testSlideLeftOut(signalTestCaseCompleted) {
            var diffX = -window.innerWidth;
            var diffY = 0;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem1.getBoundingClientRect().left;
                var actualY = elem1.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify SlideLeftOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SlideLeftOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem1, '0'));
                LiveUnit.LoggingCore.logComment("Verify SlideLeftOut destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionSTART: 'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var elem3 = document.getElementById("div3");
            var elem4 = document.getElementById("div4");
            var targetDuration = util.getAnimationDuration("SlideLeftOut", null);
            LiveUnit.LoggingCore.logComment("Testing SlideLeftOut:");
            var startX = elem1.getBoundingClientRect().left;
            var startY = elem1.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.slideLeftOut(elem1, elem2, elem3, elem4).done(verifyAnimation);
        }

        //This test is to test the slideRightIn function by passing four elements.
        testSlideRightIn(signalTestCaseCompleted) {
            var diffX = -window.innerWidth;
            var diffY = 0;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem1.getBoundingClientRect().left;
                var actualY = elem1.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify SlideRightIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SlideRightIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem1, '1'));
                LiveUnit.LoggingCore.logComment("Verify SlideRightIn destination:");
                destX = startX;
                destY = startY;
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionSTART: 'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var elem3 = document.getElementById("div3");
            var elem4 = document.getElementById("div4");
            var targetDuration = util.getAnimationDuration("SlideRightIn", null);
            LiveUnit.LoggingCore.logComment("Testing SlideRightIn:");
            var startX = elem1.getBoundingClientRect().left;
            var startY = elem1.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.slideRightIn(elem1, elem2, elem3, elem4).done(verifyAnimation);
        }

        testSlideRightOut(signalTestCaseCompleted) {
            var diffX = window.innerWidth;
            var diffY = 0;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem1.getBoundingClientRect().left;
                var actualY = elem1.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify SlideRightOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SlideRightOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem1, '0'));
                LiveUnit.LoggingCore.logComment("Verify SlideRightOut destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem1.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem1, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var elem3 = document.getElementById("div3");
            var elem4 = document.getElementById("div4");
            var targetDuration = util.getAnimationDuration("SlideRightOut", null);
            LiveUnit.LoggingCore.logComment("Testing SlideRightOut:");
            var startX = elem1.getBoundingClientRect().left;
            var startY = elem1.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem1.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.slideRightOut(elem1, elem2, elem3, elem4).done(verifyAnimation);
        }

        testTurnstileForwardIn(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify TurnstileForwardIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify TurnstileForwardIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                LiveUnit.LoggingCore.logComment("Verify TurnstileForwardIn destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("TurnstileForwardIn", null);
            LiveUnit.LoggingCore.logComment("Testing TurnstileForwardIn:");
            var destX = elem.getBoundingClientRect().left;
            var destY = elem.getBoundingClientRect().top;
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.turnstileForwardIn(elem).done(verifyAnimation);
        }

        testTurnstileForwardOut(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify TurnstileForwardOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify TurnstileForwardOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                LiveUnit.LoggingCore.logComment("Verify TurnstileForwardOut destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("TurnstileForwardOut", null);
            LiveUnit.LoggingCore.logComment("Testing TurnstileForwardOut:");
            var destX = elem.getBoundingClientRect().left;
            var destY = elem.getBoundingClientRect().top;
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.turnstileForwardOut(elem).done(verifyAnimation);
        }

        testTurnstileBackwardIn(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify TurnstileBackwardIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify TurnstileBackwardIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                LiveUnit.LoggingCore.logComment("Verify TurnstileBackwardIn destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("TurnstileBackwardIn", null);
            LiveUnit.LoggingCore.logComment("Testing TurnstileBackwardIn:");
            var destX = elem.getBoundingClientRect().left;
            var destY = elem.getBoundingClientRect().top;
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.turnstileBackwardIn(elem).done(verifyAnimation);
        }

        testTurnstileBackwardOut(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify TurnstileBackwardOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify TurnstileBackwardOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                LiveUnit.LoggingCore.logComment("Verify TurnstileBackwardOut destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("TurnstileBackwardOut", null);
            LiveUnit.LoggingCore.logComment("Testing TurnstileBackwardOut:");
            var destX = elem.getBoundingClientRect().left;
            var destY = elem.getBoundingClientRect().top;
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.turnstileBackwardOut(elem).done(verifyAnimation);
        }

        testContinuumForwardIn(signalTestCaseCompleted) {
            var diffX = 0;
            var diffY = 225;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify ContinuumForwardIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify ContinuumForwardIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem2, '1'));
                var actualX = elem2.getBoundingClientRect().left;
                var actualY = elem2.getBoundingClientRect().top;
                LiveUnit.LoggingCore.logComment("Verify ContinuumForwardIn destination:");
                destX = startX;
                destY = startY;
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem2, coordinatesTest, opacityTest);
                elem2.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem2.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem2, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var elem3 = document.getElementById("div3");
            var targetDuration = util.getAnimationDuration("ContinuumForwardIn", null);
            LiveUnit.LoggingCore.logComment("Testing ContinuumForwardIn:");
            var startX = elem2.getBoundingClientRect().left;
            var startY = elem2.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem2.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem2.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.continuumForwardIn(elem1, elem2, elem3).done(verifyAnimation);
        }

        testContinuumForwardOut(signalTestCaseCompleted) {
            var diffX = 0;
            var diffY = 200;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify ContinuumForwardOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify ContinuumForwardOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem2, '1'));
                var actualX = elem2.getBoundingClientRect().left;
                var actualY = elem2.getBoundingClientRect().top;
                LiveUnit.LoggingCore.logComment("Verify ContinuumForwardOut destination:");
                destX = startX;
                destY = startY;
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem2, coordinatesTest, opacityTest);
                elem2.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem2.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem2, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var targetDuration = util.getAnimationDuration("ContinuumForwardOut", null);
            LiveUnit.LoggingCore.logComment("Testing ContinuumForwardOut:");
            var startX = elem2.getBoundingClientRect().left;
            var startY = elem2.getBoundingClientRect().top;
            var startYPositionOffset = startY - (.05) * elem2.getBoundingClientRect().height; //This is to emcompass the fact that the element expands as it
            //moves towards  its destination. Without this,
            //the midstate tests sometimes fail as the element is not between
            //the 'start' and 'destination' Y coordinates.
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startYPositionOffset,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem2.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem2.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.continuumForwardOut(elem1, elem2).done(verifyAnimation);
        }

        testContinuumBackwardIn(signalTestCaseCompleted) {
            var diffX = 0;
            var diffY = 165;
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify ContinuumBackwardIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify ContinuumBackwardIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem2, '1'));
                var actualX = elem2.getBoundingClientRect().left;
                var actualY = elem2.getBoundingClientRect().top;
                LiveUnit.LoggingCore.logComment("Verify ContinuumBackwardIn destination:");
                destX = startX;
                destY = startY;
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem2, coordinatesTest, opacityTest);
                elem2.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem2.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem2, coordinatesTest, opacityTest);
            };
            var elem1 = document.getElementById("div1");
            var elem2 = document.getElementById("div2");
            var targetDuration = util.getAnimationDuration("ContinuumBackwardIn", null);
            LiveUnit.LoggingCore.logComment("Testing ContinuumBackwardIn:");
            var startX = elem2.getBoundingClientRect().left;
            var startY = elem2.getBoundingClientRect().top;
            var destX = startX + diffX;
            var destY = startY + diffY;
            var coordinatesTest = {
                startX: startX,
                startY: startY,
                destX: destX,
                destY: destY
            }
		var opacityTest = true;
            elem2.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem2.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.continuumBackwardIn(elem1, elem2).done(verifyAnimation);
        }

        testContinuumBackwardOut(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify ContinuumBackwardOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify ContinuumBackwardOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '0'));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("ContinuumBackwardOut", null);
            LiveUnit.LoggingCore.logComment("Testing ContinuumBackwardOut:");
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.continuumBackwardOut(elem).done(verifyAnimation);
        }

        //This test is to test the fadeOut function by passing one element.
        testFadeOut(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify FadeOut duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify FadeOut:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '0'));
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                LiveUnit.LoggingCore.logComment("Verify FadeOut destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("FadeOut", null);
            LiveUnit.LoggingCore.logComment("Testing FadeOut:");
            var destX = elem.getBoundingClientRect().left;
            var destY = elem.getBoundingClientRect().top;
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.fadeOut(elem).done(verifyAnimation);
        }

        //This test is to test fadeIn test, it runs fadeOut first then fadeIn.
        testFadeIn(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify FadeIn duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify FadeIn:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(elem, '1'));
                var actualX = elem.getBoundingClientRect().left;
                var actualY = elem.getBoundingClientRect().top;
                LiveUnit.LoggingCore.logComment("Verify FadeIn destination:");
                LiveUnit.LoggingCore.logComment("Destination Coordinates Test: destX: " + destX + ", destY: " + destY +
                    ", currX: " + actualX + ", currY: " + actualY);
                LiveUnit.Assert.isTrue(verifier.VerifyDestinationCoordinates(destX, destY, actualX, actualY));
                signalTestCaseCompleted();
            }
		var transitionStartTestHandler = function () {
                LiveUnit.LoggingCore.logComment("'transitionstart' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            };
            var transitionEndTestHandler = function () {
                LiveUnit.LoggingCore.logComment("TransitionEND: 'transitionend' Handler triggered; Performing mid-state verifications:");
                verifyMidState(elem, coordinatesTest, opacityTest);
                elem.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            };
            var elem = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("FadeIn", null);
            LiveUnit.LoggingCore.logComment("Testing FadeIn:");
            var destX = elem.getBoundingClientRect().left;
            var destY = elem.getBoundingClientRect().top;
            var coordinatesTest = false;
            var opacityTest = true;
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionStart"], transitionStartTestHandler, false);
            elem.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], transitionEndTestHandler, false);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.fadeIn(elem).done(verifyAnimation);
        }

        //This test is to test the fadeOut function by passing querySelectorAll().
        testFadeOutQuerySelectorAll(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify fade out opacity change:");
                var arr = util.getRestOfList(list, null);
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(arr, '0'));
                signalTestCaseCompleted();
            }
        var list = document.querySelectorAll(".bar");
            var targetDuration = util.getAnimationDuration("FadeOut", list.length);
            LiveUnit.LoggingCore.logComment("Testing FadeOut:");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.fadeOut(list).done(verifyAnimation);
        }

        //This test is to test the fadeOut function by passing an array.
        testFadeOutArray(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify fade out opacity change:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(array, '0'));
                signalTestCaseCompleted();
            }
        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var array = [div1, div2];
            var targetDuration = util.getAnimationDuration("FadeOut", array.length);
            LiveUnit.LoggingCore.logComment("Testing FadeOut:");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.fadeOut(array).done(verifyAnimation);
        }

        //This test is to test function by passing null element.
        testFadeOutNullElement(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                LiveUnit.LoggingCore.logComment("result:" + true);
                signalTestCaseCompleted();
            }
        var targetDuration = util.getAnimationDuration("FadeOut");
            LiveUnit.LoggingCore.logComment("Testing fadeOut:");
            WinJS.UI.Animation.fadeOut(null).done(verifyAnimation, onError);
        }

        //This is to test pinterDown function
        testPointerDown(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify testPointerDown :");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '1'));
                signalTestCaseCompleted();
            }
		var target = document.getElementById("div1");
            LiveUnit.LoggingCore.logComment("testPointerDown tests:");
            var targetDuration = util.getAnimationDuration("PointerDown");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.pointerDown(target).done(verifyAnimation);
        }

        //This is to test pointerUp function by passing one element, it runs poinerDown first, then pointerUp
        testPointerUp(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify testPointerUp:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '1'));
                signalTestCaseCompleted();
            }
		    var target = document.getElementById("div1");
            LiveUnit.LoggingCore.logComment("testPointerUp tests:");
            var start;
            var targetDuration = util.getAnimationDuration("PointerUp");

            WinJS.UI.Animation.pointerDown(target).then
                (function () {
                    start = WinJS.Utilities._now();
                    WinJS.UI.Animation.pointerUp(target);
                }).done
                (verifyAnimation);
        }

        //This is to test showPanel funciton by passing one element
        testShowPanel(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify showPanel:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '1'));
                signalTestCaseCompleted();
            }
		var target = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("ShowPanel");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.showPanel(target).done(verifyAnimation);
        }

        //this is to test hidePanel function
        testHidePanel(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify hidePanel:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '1'));
                signalTestCaseCompleted();
            }
		var target = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("HidePanel");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.hidePanel(target).done(verifyAnimation);
        }
        //this is to test after animation finishes, the elements state is set back to original
        testHidePanelComplete(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify hidePanel:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '1'));
                signalTestCaseCompleted();
            }
		var target = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("HidePanel");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.hidePanel(target).done(verifyAnimation);
        }

        //this is to test showEdgeUI function
        testShowEdgeUI(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify showEdgeUI:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(list[0], '1'));
                signalTestCaseCompleted();
            }
        var list = document.querySelectorAll(".bar");
            var targetDuration = util.getAnimationDuration("ShowEdgeUI");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.showEdgeUI(list).done(verifyAnimation);
        }

        //this is to test hideEdgeUI function
        testHideEdgeUI(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify hideEdgeUI:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(list[0], '1'));
                signalTestCaseCompleted();
            }
        var list = document.querySelectorAll(".bar");
            var targetDuration = util.getAnimationDuration("HideEdgeUI");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.hideEdgeUI(list, { top: '0px', left: '300px' }).done(verifyAnimation);
        }

        //this is to test showPopup function
        testShowPopup(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify showPopup:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(arr, '1'));
                signalTestCaseCompleted();
            }

        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var arr = [div1, div2];
            var targetDuration = util.getAnimationDuration("ShowPopup");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.showPopup(arr).done(verifyAnimation);
        }

        testHidePopup(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify hidePopup:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(arr, '1'));
                signalTestCaseCompleted();
            }
       var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var arr = [div1, div2];
            var targetDuration = util.getAnimationDuration("HidePopup");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.hidePopup(arr).done(verifyAnimation);
        }

        //this is to test dragBetweenEnter function
        testDragBetweenEnter(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify DragBetweenEnter:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                signalTestCaseCompleted();
            }
        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var affected = [div1, div2];
            var targetDuration = util.getAnimationDuration("DragBetweenEnter", affected.length);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.dragBetweenEnter(affected).done(verifyAnimation);
        }

        //this is to test dragBetweenLeave function, it runs dragBetweenEnter first and then runs dragBetweenLeave
        testDragBetweenLeave(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify dragBetweenLeave:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                signalTestCaseCompleted();
            }
        LiveUnit.LoggingCore.logComment("DragBetweenLeave animation Test:");
            var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var affected = [div1, div2];
            var targetDuration = util.getAnimationDuration("DragBetweenLeave", affected.length);
            var rectStartList = util.getBoundingRectArray(affected);
            var start;
            WinJS.UI.Animation.dragBetweenEnter(affected).then
                (function () {
                    start = WinJS.Utilities._now();
                    WinJS.UI.Animation.dragBetweenLeave(affected);
                }).done
                (verifyAnimation);
        }

        testDragSourceStart(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify DragSourceStart affected + target:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '0.65'));
                signalTestCaseCompleted();
            }
        var list = document.querySelectorAll(".bar");
            var target = document.getElementById("div1");
            var affected = util.getRestOfList(list, target);
            var targetDuration = util.getAnimationDuration("DragSourceStart", affected.length);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.dragSourceStart(target, affected).done(verifyAnimation);
        }

        testDragSourceEnd(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify DragSourceEnd affected + target:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '1'));
                signalTestCaseCompleted();
            }
        LiveUnit.LoggingCore.logComment("DragSoureceEnd animation Test:");
            var list = document.querySelectorAll(".bar");
            LiveUnit.LoggingCore.logComment(list.length.toString());
            var target = document.getElementById("div1");
            var affected = util.getRestOfList(list, target);

            var targetDuration = util.getAnimationDuration("DragSourceEnd");
            var start;
            WinJS.UI.Animation.dragSourceStart(target, affected).then
                (function () {
                    start = WinJS.Utilities._now();
                    WinJS.UI.Animation.dragSourceEnd(target, { top: '0', left: '11' }, affected).done
                        (verifyAnimation);
                });
        }

        //this is to test collapse function
        testCollapse(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify Collapse affected + target:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
                signalTestCaseCompleted();
            }
        var div2 = document.getElementById("div2");
            var list = document.querySelectorAll(".bar");
            var affected = util.getRestOfList(list, div2);
            var targetDuration = util.getAnimationDuration("Collapse");
            var collapse = WinJS.UI.Animation.createCollapseAnimation(div2, affected);
            div2.style.position = "absolute";
            var start = WinJS.Utilities._now();
            collapse.execute().done(verifyAnimation);
        }

        //this is to test Expand animation, collapse aniamtion runs first, then runs expand animation
        testExpand(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify Expand affected + target: ");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(target, '0'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                signalTestCaseCompleted();
            }

        var list = document.querySelectorAll(".bar");
            var target = document.getElementById("div2");
            var div3 = document.getElementById("div3");
            var div4 = document.getElementById("div4");
            var affected = [div3, div4];
            var start;

            function expand() {
                var expand = WinJS.UI.Animation.createExpandAnimation(target, affected);
                target.style.position = "";
                start = WinJS.Utilities._now();
                return expand.execute();
            }

            function collapse() {
                var collapse = WinJS.UI.Animation.createCollapseAnimation(target, affected);
                target.style.position = "absolute";
                target.style.opacity = '0';
                return collapse.execute();
            }
            var targetDuration = util.getAnimationDuration("Expand");
            collapse().then(expand).done(verifyAnimation);
        }

        //this is to test reposition function
        testReposition(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify Reposition: ");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(targets, '1'));
                signalTestCaseCompleted();
            }

        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var div3 = document.getElementById("div3");
            var targets = [div2, div3];
            var targetDuration = util.getAnimationDuration("Reposition", targets.length);
            var reposition = WinJS.UI.Animation.createRepositionAnimation(targets);
            div1.style.width = "10px";
            var start = WinJS.Utilities._now();
            reposition.execute().done(verifyAnimation);
        }

        testEnterContent(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify EnterContent: ");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(incoming, '1'));
                signalTestCaseCompleted();
            }

        LiveUnit.LoggingCore.logComment("EnterContent animation Test:");
            var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            div1.style.opacity = '0';
            div2.style.opacity = '0';
            var incoming = [div1, div2];

            var targetDuration = util.getAnimationDuration("EnterContent", incoming.length);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.enterContent(incoming).done(verifyAnimation);
        }

        testExitContent(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify ExitContent:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(outgoing, '0'));
                signalTestCaseCompleted();
            }

        LiveUnit.LoggingCore.logComment("ExitContent animation Test:");
            var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            div1.style.opacity = '1';
            div2.style.opacity = '1';
            var outgoing = [div1, div2];

            var targetDuration = util.getAnimationDuration("ExitContent", outgoing.length);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.exitContent(outgoing).done(verifyAnimation);
        }


        //this is to test transitionPage function.
        testEnterPage(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify EnterPage:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
                signalTestCaseCompleted();
            }

        LiveUnit.LoggingCore.logComment("EngerPage animation Test:");
            var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            div1.style.opacity = '0';
            div2.style.opacity = '0';
            var incoming = [div1, div2];
            div1.style.animationDelay = "5ms";
            div2.style.animationDuration = "10ms";
            var targetDuration = util.getAnimationDuration("EnterPage");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.enterPage(incoming).done(verifyAnimation);
        }

        //this is to test crossFade function.
        testCrossFade(signalTestCaseCompleted) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify CrossFade incoming + outgoing:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(incoming, '1'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(outgoing, '0'));
                signalTestCaseCompleted();
            }

        var div1 = document.getElementById("div1");
            div1.style.opacity = "0";
            var div2 = document.getElementById("div2");
            div2.style.opacity = "0";
            var incoming = [div1, div2];
            div1.style.animationDuration = "10ms";
            var div3 = document.getElementById("div3");
            var div4 = document.getElementById("div4");
            var outgoing = [div3, div4];
            var targetDuration = util.getAnimationDuration("CrossFade", 0);
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.crossFade(incoming, outgoing).done(verifyAnimation);
        }

        //this is to test swipeSelect function. Before calling the function, the select target is translated down and selection target's opacity is set to 0.
        //Verification will check if select moves back to original position and if selection's opacity back to 1.
        testSwipeSelect(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify swipeSelect function:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(selection, '0'));
                signalTestCaseComplete();
            }
        var select = document.getElementById("div1");
            var selection = document.getElementById("div2");
            select.style.msTransform = "translate(0px, -10px)";
            selection.style.opacity = '0';
            var targetDuration = util.getAnimationDuration("SwipeSelect");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.swipeSelect(select, selection).done(verifyAnimation);
        }

        //Before the test, Before calling the function, the select target is translated down and selection target's opacity is set to 0.
        //Verification will check if select moves back to original position and if selection's opacity is set to 0.
        testSwipeDeselect(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SwipeDeselect function:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(selection, '1'));
                signalTestCaseComplete();
            }
        var select = document.getElementById("div1");
            var selection = document.getElementById("div2");
            select.style.msTransform = "translate(0px, -10px)";
            selection.style.opacity = '1';
            var targetDuration = util.getAnimationDuration("SwipeDeselect");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.swipeDeselect(select, selection).done(verifyAnimation);
        }

        testDeleteFromList(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify DeleteFromList affected + target:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
                signalTestCaseComplete();
            }

            var div2 = document.getElementById("div2");
            var affected = util.getRestOfList(document.querySelectorAll(".bar"), div2);
            var deleteFromList = WinJS.UI.Animation.createDeleteFromListAnimation(div2, affected);
            var targetDuration = util.getAnimationDuration("DeleteFromList");
            div2.style.position = "absolute";
            var start = WinJS.Utilities._now();
            deleteFromList.execute().done(verifyAnimation);
        }

        testAddToList(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify AddToList affected + target:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(affected, '1'));
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(added, '1'));
                signalTestCaseComplete();
            }
            var list = document.getElementById("divs");
            var affected = util.getRestOfList(document.querySelectorAll(".bar"), null);
            var added = document.createElement("added");
            added.className = "bar";
            added.style.width = '150px';
            added.style.height = '150px';
            added.style.marginLeft = '10px';
            added.style.marginTop = '10px';
            added.style.cssFloat = 'left';
            list.appendChild(added);
            var targetDuration = util.getAnimationDuration("AddToList");
            var addToList = WinJS.UI.Animation.createAddToListAnimation(added, affected);
            list.insertBefore(added, list.firstChild);
            var start = WinJS.Utilities._now();
            addToList.execute().done(verifyAnimation);
        }

        testPeek(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify Peek:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
                signalTestCaseComplete()
            }
            var div2 = document.getElementById("div2");
            var targetDuration = util.getAnimationDuration("Peek");
            var peek = WinJS.UI.Animation.createPeekAnimation(div2);
            div2.style.position = "relative";
            div2.style.top = "-120px";
            var start = WinJS.Utilities._now();
            peek.execute().then(verifyAnimation);
        }

        testUpdateBadge(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify UpdateBadge:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div1, '1'));
                signalTestCaseComplete()
        }
        var div1 = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("UpdateBadge");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.updateBadge(div1).done(verifyAnimation);
        }

        testSwipeReveal(signalTestCaseComplete) {
            var verifyAnimation = function () {
                var end = WinJS.Utilities._now();
                var duration = end - start;
                LiveUnit.LoggingCore.logComment("Verify duration:");
                LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
                LiveUnit.LoggingCore.logComment("Verify SwipeReveal:");
                LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div1, '1'));
                signalTestCaseComplete()
        }
        var div1 = document.getElementById("div1");
            var targetDuration = util.getAnimationDuration("SwipeReveal");
            var start = WinJS.Utilities._now();
            WinJS.UI.Animation.swipeReveal(div1).done(verifyAnimation);
        }

        //This test is to test when animation is enabled, promise should fire asynchronously
        testAsyncPromiseEnableAnimation = function () {
            var number = 0;
            WinJS.UI.Animation.fadeOut(null).then(function () { number = 2; });
            LiveUnit.Assert.areEqual(number, 0);
        }

    //This test is to test when animation is disabled, promise should fire asynchronously
    testAsyncPromiseDisableAnimation = function () {
            var number = 0;
            WinJS.UI.disableAnimations();
            WinJS.UI.Animation.fadeOut(null).then(function () { number = 2; });
            LiveUnit.Assert.areEqual(number, 0);
        }

    //This test is to test canceling animation by calling Promise.cancel().
    //The animation should jump to the end immedietly and fire onComplete promise.
    testCancelAnimation(signalTestCaseComplete) {
            var verifyAnimation = function () {
                promise.cancel();
                LiveUnit.Assert.isTrue(result);
                verifier.rectAfter = util.getBoundingRectArray([div1, div2]);
                LiveUnit.Assert.isTrue(verifier.VerifyTranslate2DTransition(0, 0)); //Verify that after calling promise.cancel(), elements jump to end state.
                signalTestCaseComplete();
            }
        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            verifier.rectBefore = util.getBoundingRectArray([div1, div2]);
            var promise = WinJS.UI.Animation.enterPage([div1, div2]).then(onComplete, onError);
            window.setTimeout(verifyAnimation, WinJS.UI._animationTimeAdjustment(100));
        }

        testCancelTransition(signalTestCaseComplete) {
            var callback = function () {
                promise.cancel();
                LiveUnit.Assert.isTrue(result);
                verifier.rectAfter = target.getBoundingClientRect();
                LiveUnit.Assert.isTrue(verifier.VerifyTranslate2DTransition(500, 0)); //Verify that after calling promise.cancel(), elements jump to end state.
                signalTestCaseComplete();
            }
            var target = document.getElementById("div1");
            verifier.rectBefore = target.getBoundingClientRect();
            var reposition = WinJS.UI.Animation.createRepositionAnimation(target);
            target.style.position = "absolute";
            target.style.left = (target.style.left === "500px") ? "" : "500px";
            var promise = reposition.execute().then(onComplete, onError);
            var wrappedCallback = LiveUnit.GetWrappedCallback(callback);
            window.setTimeout(wrappedCallback, WinJS.UI._animationTimeAdjustment(100));
        }

        //This is to test canceling animation before it starts.
        //onComplete should be fired.
        testCancelAnimationBeforeStart = function () {
            var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var promise = WinJS.UI.Animation.enterPage([div1, div2]).then(onComplete, onError);
            LiveUnit.Assert.isTrue(result === null); //Verifty onComplete is not fired yet.
            promise.cancel();
            LiveUnit.Assert.isTrue(result); //Verify onComplete is fired by setting result = true;
        }

    //This is to test canceling an empty animation in setImmediate function
    //onComplete should be fired.
    testCancelEmptyAnimation = function (complete) {
            var promise = WinJS.UI.Animation.enterPage(null).then(onComplete, onError);
            LiveUnit.Assert.isTrue(result === null); //Verifty onComplete is not fired yet.

            WinJS.Utilities._setImmediate(function () {
                promise.cancel();
                LiveUnit.Assert.isTrue(result);
                complete();
            });
        }

    //This is to test canceling an empty animation.
    //onComplete should be fired.
    testCancelEmptyAnimation2 = function () {
            var promise = WinJS.UI.Animation.enterPage(null).then(onComplete, onError);
            LiveUnit.Assert.isTrue(result === null); //Verifty onComplete is not fired yet.
            promise.cancel();
            LiveUnit.Assert.isTrue(result); //Verify onComplete is fired by setting result = true;
        }

    //This is to test canceling while animation finishing.
    //Cancel should be ignored and onComplete should be fired only once.
    testCancelAnimationWhileFinishing(signalTestCaseComplete) {
            var callback = function () {
                LiveUnit.Assert.isTrue(result); //Verify onComplete is fired by setting result = true;
                signalTestCaseComplete();
            }
        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var num = 0;
            var promise = WinJS.UI.Animation.enterPage([div1, div2]).then(onComplete, onError);
            promise.then(function () {
                num++;
                LiveUnit.Assert.areEqual(1, num); //Verify promise is fired only once.
                promise.cancel();
                window.setTimeout(callback, 0);
            });
        }
        //This is to test canceling animation after animation finishes.
        //Cancel should be ignored and the conComplete promise should be fired only once.

        testCancelAnimationAfterFinishing(signalTestCaseComplete) {
            var callback = function () {
                promise.cancel();
                LiveUnit.Assert.isTrue(result); //Verify onComplete is fired by setting result = true;
                signalTestCaseComplete();
            }
        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var num = 0;
            var promise = WinJS.UI.Animation.enterPage([div1, div2]).then(onComplete, onError);
            promise.then(function () {
                num++;
                LiveUnit.Assert.areEqual(1, num); //Verify promise is fired only once.
                window.setTimeout(callback, 5);
            });
        }

        //This is to test canceling part of the animations. When canceling the first animaiton, the second animation should continue.
        //When the second animation finishes, combinePromise should complete with success.
        testCancelPartOfAnimation(signalTestCaseComplete) {
            var callback = function () {
                LiveUnit.Assert.areEqual(2, num);
                verifier.rectAfter = div3.getBoundingClientRect();
                LiveUnit.LoggingCore.logComment("div3after " + div3.getBoundingClientRect().top);
                LiveUnit.LoggingCore.logComment("div3after " + div3.getBoundingClientRect().left);
                LiveUnit.Assert.isTrue(verifier.VerifyScale2DTransition(0.975, 0.975)); //Verify that after promise2 completes, div3 is scaled to 0.97
                signalTestCaseComplete()
        }
        var div1 = document.getElementById("div1");
            var div2 = document.getElementById("div2");
            var div3 = document.getElementById("div3");
            var num = 0;
            verifier.rectBefore = div3.getBoundingClientRect();
            var promise1 = WinJS.UI.Animation.enterPage([div1, div2]).then(function () { num++; }, onError);
            var promise2 = WinJS.UI.Animation.pointerDown(div3);
            var combinePromise = WinJS.Promise.join([promise1, promise2]).then(function () { num++; }, onError);
            promise1.cancel();
            LiveUnit.Assert.areEqual(1, num); //Verify that when canceling promise1, onComplete gets fired for the animation.
            promise2.then(function () {
                window.setTimeout(callback, 0);
            });
        }
    }
    
    var disabledTestRegistry = {
        testSlideLeftOut: Helper.Browsers.ie10,
		testSlideDown: Helper.Browsers.ie10
    };
    Helper.disableTests(PVLJSFunctionTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("WinJSTests.PVLJSFunctionTests");

