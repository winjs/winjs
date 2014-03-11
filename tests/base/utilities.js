/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <deploy src="../TestData/" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.BaseUtilities = function () {
    "use strict";

    this.testGetMemberNull = function () {
        LiveUnit.Assert.areEqual(WinJS.Utilities.getMember(""), null);
    };

    this.testRequireSupportedForProcessingOnFunctionFromIFrame = function () {
        var i = document.createElement("iframe");
        i.id = "someframe";
        document.body.appendChild(i);
        try {
            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(someframe.eval);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        } finally {
            document.body.removeChild(i);
        }
    };

    this.testRequireSupportedForProcessingOnIFrameWindow = function () {
        var i = document.createElement("iframe");
        i.id = "someframe";
        document.body.appendChild(i);
        try {
            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(someframe);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        } finally {
            document.body.removeChild(i);
        }
    };

    this.testRequireSupportedForProcessingOnIFrameElement = function () {
        var i = document.createElement("iframe");
        i.id = "someframe";
        document.body.appendChild(i);
        try {
            LiveUnit.Assert.areNotEqual(someframe, document.querySelector("#someframe"), "For some (probably historical) reason frame id's show up bound to their window instances instead of their elements");

            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(document.querySelector("#someframe"));
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        } finally {
            document.body.removeChild(i);
        }
    };

    this.testRequireSupportedForProcessingOnWindowLocation = function () {
        var thrown = false;
        try {
            WinJS.Utilities.requireSupportedForProcessing(window.location);
        } catch (e) {
            thrown = true;
        }
        LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
    };

    this.testRequireSupportedForProcessingOnDocumentLocation = function () {
        var thrown = false;
        try {
            WinJS.Utilities.requireSupportedForProcessing(document.location);
        } catch (e) {
            thrown = true;
        }
        LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
    };

}

LiveUnit.registerTestClass("CorsicaTests.BaseUtilities");
