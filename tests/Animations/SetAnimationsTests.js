// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-light.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js" />
/// <reference path="AnimationCollection.js" />
/// <reference path="JSAnimationVerifier.js" />
/// <reference path="JSAnimationUtils.js" />

SetAnimationsTests = function () {
    var verifier = new AnimationVerifier();
    var util = new JSAnimationUtils();

    var animationsEnabledAtSetUp = true;
    this.setUp = function () {
        util.addDom("ui-light.css", false);
        result = null;
        animationsEnabledAtSetUp = WinJS.UI.isAnimationEnabled();
    }

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tear down");
        util.removeDom("ui-light.css");

        if (animationsEnabledAtSetUp && !WinJS.UI.isAnimationEnabled()) {
            WinJS.UI.enableAnimations();
        }
    }

    function outputOpacity(elem) {
        var opacity = window.getComputedStyle(elem).opacity;
        LiveUnit.LoggingCore.logComment("opacity:" + opacity);
        return opacity;
    }

    //test to ensure animations do not execute, as expected, when .disableAnimations() is called.
    this.testTurnOffAnimation = function() {
        var elem = document.getElementById("div1");
        WinJS.UI.disableAnimations();
		LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + WinJS.UI.isAnimationEnabled());
	    WinJS.UI.Animation.fadeOut(elem); //Waiting for animation end callback doesnt make much sense as animations are disabled. Ensure opacity is === '0'
		var result = (outputOpacity(elem) === "0");
		LiveUnit.Assert.isTrue(result);
    }

	//test to make sure .disableAnimations() works and updates the WinJS.UI.isAnimationsEnabled boolean
	this.testDisableAnimation = function () {
        var elem = document.getElementById("div1");
        WinJS.UI.disableAnimations();
        result = WinJS.UI.isAnimationEnabled();
		LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + result);
        LiveUnit.Assert.isTrue(!result);
    }

    //test to ensure animations execute as expected when .enableAnimations() is called.
    this.testTurnOnAnimation = function(complete) {
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
    this.testEnableAnimation = function () {
        var elem = document.getElementById("div1");
        WinJS.UI.enableAnimations();
        var result = WinJS.UI.isAnimationEnabled();
		LiveUnit.LoggingCore.logComment("isAnimationEnabled: " + result);
        LiveUnit.Assert.isTrue(result);
    }

}

LiveUnit.registerTestClass("SetAnimationsTests");