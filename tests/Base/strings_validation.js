// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />

var WinJSTests = WinJSTests || {};
WinJSTests.StringsValidation = function () {
    "use strict";
    this.testStrings = function () {
        Object.keys(strings).forEach(function (k) {
            // Comments are generally _foo.comment strings, validate them differently than other strings. 
            if(k.indexOf('.comment') < 0) {
                var s = WinJS.Resources.getString(k);
                LiveUnit.Assert.areEqual(s.value, strings[k], k + " is not set correctly");
            } else {
                var original = k.replace('_', "").replace(".comment", "")
                LiveUnit.Assert.isTrue(strings[original], "real string exists to match comment")
            }
        });
    };
}

LiveUnit.registerTestClass("WinJSTests.StringsValidation");