// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-light.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts" />
/// <reference path="AnimationCollection.ts" />
/// <reference path="JSAnimationVerifier.ts" />
/// <reference path="JSAnimationUtils.ts" />

module WinJSTests {
    "use strict";

    var verifier = AnimationVerifier;
    var util = JSAnimationUtils;

    var animationsEnabledAtSetUp = true;

    function outputOpacity(elem) {
        var opacity = window.getComputedStyle(elem).opacity;
        LiveUnit.LoggingCore.logComment("opacity:" + opacity);
        return opacity;
    }

    export class SetAnimationsTests {

        setUp() {
            util.addDom(false);
            animationsEnabledAtSetUp = WinJS.UI.isAnimationEnabled();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tear down");
            util.removeDom();

            if (animationsEnabledAtSetUp && !WinJS.UI.isAnimationEnabled()) {
                WinJS.UI.enableAnimations();
            }
        }



        //test to ensure animations do not execute, as expected, when .disableAnimations() is called.
        testTurnOffAnimation() {
            var elem = document.getElementById("div1");
            WinJS.UI.disableAnimations();
            LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + WinJS.UI.isAnimationEnabled());
            WinJS.UI.Animation.fadeOut(elem); //Waiting for animation end callback doesnt make much sense as animations are disabled. Ensure opacity is === '0'
            var result = (outputOpacity(elem) === "0");
            LiveUnit.Assert.isTrue(result);
        }

        //test to make sure .disableAnimations() works and updates the WinJS.UI.isAnimationsEnabled boolean
        testDisableAnimation() {
            var elem = document.getElementById("div1");
            WinJS.UI.disableAnimations();
            var result = WinJS.UI.isAnimationEnabled();
            LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + result);
            LiveUnit.Assert.isTrue(!result);
        }

        //test to ensure animations execute as expected when .enableAnimations() is called.
        testTurnOnAnimation(complete) {
            var callback = function () {
                var result = (outputOpacity(elem) !== "0");
                LiveUnit.Assert.isTrue(result);
                complete();
            }
        var elem = document.getElementById("div1");
            WinJS.UI.enableAnimations();
            LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + WinJS.UI.isAnimationEnabled());
            WinJS.UI.Animation.fadeIn(elem).done(callback);
        }

        //test to make sure .enableAnimations() works and updates the WinJS.UI.isAnimationsEnabled boolean
        testEnableAnimation() {
            var elem = document.getElementById("div1");
            WinJS.UI.enableAnimations();
            var result = WinJS.UI.isAnimationEnabled();
            LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + result);
            LiveUnit.Assert.isTrue(result);
        }

    }
}
LiveUnit.registerTestClass("WinJSTests.SetAnimationsTests");