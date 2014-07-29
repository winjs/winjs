// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />


var CorsicaTests = CorsicaTests || {};

CorsicaTests.BaseUtilities = function () {
    "use strict";

    this.testGetMemberNull = function () {
        LiveUnit.Assert.areEqual(WinJS.Utilities.getMember(""), null);
    };

    this.testRequireSupportedForProcessingOnFunctionFromIFrame = function () {
        var iframe = document.createElement("iframe");
        iframe.id = "someframe";
        document.body.appendChild(iframe);
        try {
            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(iframe.contentWindow.eval);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        } finally {
            document.body.removeChild(iframe);
        }
    };

    this.testRequireSupportedForProcessingOnIFrameWindow = function () {
        var iframe = document.createElement("iframe");
        iframe.id = "someframe";
        document.body.appendChild(iframe);
        try {
            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(iframe.contentWindow);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        } finally {
            document.body.removeChild(iframe);
        }
    };

    this.testRequireSupportedForProcessingOnIFrameElement = function () {
        var iframe = document.createElement("iframe");
        iframe.id = "someframe";
        document.body.appendChild(iframe);
        try {

            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(iframe);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        } finally {
            document.body.removeChild(iframe);
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
