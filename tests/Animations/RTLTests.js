// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-light.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js" />
/// <reference path="AnimationCollection.js" />
/// <reference path="../TestLib/animations/JSAnimationVerifier.js" />
/// <reference path="../TestLib/animations/JSAnimationUtils.js" />

PVLRTLTests = function () {
    var verifier = new AnimationVerifier();
    var util = new JSAnimationUtils();

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        util.addDom("ui-light.css", true);
    }

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tear down");
        util.removeDom("ui-light.css");
    }
	
	function verifyPerformance (duration, targetDuration) {
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
	
    //Test enterPage animaiton with input offset and rtlflip set to false
    //Expect result: won't flip.
    this.testEnterPageRTLWithInput = function (signalTestCaseCompleted) {
        var diffX = 100;
        var diffY = 0;
        var callback = function () {
            LiveUnit.LoggingCore.logComment("Verify EnterPage RTL:");
			var end = WinJS.Utilities._now();
			var duration = end - start;
			LiveUnit.LoggingCore.logComment("Verify duration:");
			LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
            LiveUnit.LoggingCore.logComment("Verify EnterPage:");
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
			signalTestCaseCompleted();
        }

        LiveUnit.LoggingCore.logComment("EnterPage animation RTL Test:");
        var div1 = document.getElementById("div1");
        var div2 = document.getElementById("div2");
        div1.style.opacity = '0';
        div2.style.opacity = '0';
        var incoming = [div1, div2];
        var targetDuration = util.getAnimationDuration("EnterPage", incoming.length);
        var start = WinJS.Utilities._now();
        WinJS.UI.Animation.enterPage(incoming, { top: '0px', left: '100px', rtlflip:false }).done(callback);
    }

    //Test enterPage animaiton with default offset, rtlflip is true if no user input for offset
    //Expect result: flip.
    this.testEnterPageRTLWithDefault = function (signalTestCaseCompleted) {
        var diffX = 100;
        var diffY = 0;
        var callback = function () {
            LiveUnit.LoggingCore.logComment("Verify EnterPage RTL:");
			var end = WinJS.Utilities._now();
			var duration = end - start;
			LiveUnit.LoggingCore.logComment("Verify duration:");
			LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
            LiveUnit.LoggingCore.logComment("Verify EnterPage:");
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
			signalTestCaseCompleted();
        }

        LiveUnit.LoggingCore.logComment("EnterPage animation RTL Test:");
        div1.style.opacity = '0';
        div2.style.opacity = '0';
        var targets = [div1, div2];
        LiveUnit.LoggingCore.logComment("length:" + targets.length);
        var targetDuration = util.getAnimationDuration("EnterPage", targets.length);

        var start = WinJS.Utilities._now();
        WinJS.UI.Animation.enterPage(targets).done(callback);
    }

    //Test enterContent animaiton with default offset, rtlflip is true if no user input for offset
    //Expect result: flip.
    this.testEnterContentRTLWithDefault = function (signalTestCaseCompleted) {
        var diffX = 40;
        var diffY = 0;
        var callback = function () {
            LiveUnit.LoggingCore.logComment("Verify EnterContent RTL:");
			var end = WinJS.Utilities._now();
			var duration = end - start;
			LiveUnit.LoggingCore.logComment("Verify duration:");
			LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
            LiveUnit.LoggingCore.logComment("Verify EnterContent:");
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
			signalTestCaseCompleted();
        }

        LiveUnit.LoggingCore.logComment("EnterContent animation RTL Test:");
        var div1 = document.getElementById("div1");
        var div2 = document.getElementById("div2");

        var incoming = [div1, div2];
        var targetDuration = util.getAnimationDuration("EnterContent", incoming.length);

        var start = WinJS.Utilities._now();
        WinJS.UI.Animation.enterContent(incoming).done(callback);
    }

    //Test enterPage animaiton with input offset and rtlflip as default: false
    //Expect result: won't flip.
    this.testEnterContentRTLWithInput1 = function (signalTestCaseCompleted) {
        var diffX = 40;
        var diffY = 0;
        var callback = function () {
            LiveUnit.LoggingCore.logComment("Verify EnterContent RTL:");
            var end = WinJS.Utilities._now();
			var duration = end - start;
			LiveUnit.LoggingCore.logComment("Verify duration:");
			LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
            LiveUnit.LoggingCore.logComment("Verify EnterContent:");
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
            signalTestCaseCompleted();
        }

        LiveUnit.LoggingCore.logComment("EnterContent animation RTL Test:");
        var div1 = document.getElementById("div1");
        var div2 = document.getElementById("div2");

        var incoming = [div1, div2];
        var targetDuration = util.getAnimationDuration("EnterContent", incoming.length);
		var start = WinJS.Utilities._now();
        WinJS.UI.Animation.enterContent(incoming, { top: '0px', left: '40px' } ).done(callback);
    }

    //Test enterPage animaiton with input offset and rtlflip set to false
    //Expect result: won't flip.
    this.testEnterContentRTLWithInput2 = function (signalTestCaseCompleted) {
        var diffX = 40;
        var diffY = 0;
        var callback = function () {
            LiveUnit.LoggingCore.logComment("Verify EnterContent RTL:");
            var end = WinJS.Utilities._now();
			var duration = end - start;
			LiveUnit.LoggingCore.logComment("Verify duration:");
			LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
            LiveUnit.LoggingCore.logComment("Verify EnterContent:");
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
            signalTestCaseCompleted();
        }

        LiveUnit.LoggingCore.logComment("EnterContent animation RTL Test:");
        var div1 = document.getElementById("div1");
        var div2 = document.getElementById("div2");

        var incoming = [div1, div2];
        var targetDuration = util.getAnimationDuration("EnterContent", incoming.length);
		var start = WinJS.Utilities._now();
        WinJS.UI.Animation.enterContent(incoming, { top: '0px', left: '40px', rtlflip:false } ).done(callback);
    }

    //Test enterPage animaiton with input offset and rtlflip set to true
    //Expect result: flip.
    this.testEnterContentRTLWithInput3 = function (signalTestCaseCompleted) {
        var diffX = 40;
        var diffY = 0;
		var callback = function () {
            LiveUnit.LoggingCore.logComment("Verify EnterContent RTL:");
            var end = WinJS.Utilities._now();
			var duration = end - start;
			LiveUnit.LoggingCore.logComment("Verify duration:");
			LiveUnit.Assert.isTrue(verifyPerformance(duration, targetDuration));
            LiveUnit.LoggingCore.logComment("Verify EnterContent:");
            LiveUnit.Assert.isTrue(verifier.VerifyOpacityTransition(div2, '1'));
            signalTestCaseCompleted();
        }

        LiveUnit.LoggingCore.logComment("EnterContent animation RTL Test:");
        var div1 = document.getElementById("div1");
        var div2 = document.getElementById("div2");

        var incoming = [div1, div2];
        var targetDuration = util.getAnimationDuration("EnterContent", incoming.length);
		var start = WinJS.Utilities._now();
        WinJS.UI.Animation.enterContent(incoming, { top: '0px', left: '40px', rtlflip:true } ).done(callback);
    }
  
}

LiveUnit.registerTestClass("PVLRTLTests");