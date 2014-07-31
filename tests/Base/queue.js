// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.Queue = function () {
    "use strict";
    this.testSimpleQueue = function (complete) {
        WinJS.Utilities._setImmediate(complete);
    };

    this.testQueueOrdering = function (complete) {
        var i = 0;
        WinJS.Utilities._setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(1, i);
        });
        WinJS.Utilities._setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(2, i);
        });
        WinJS.Utilities._setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(3, i);
        });
        WinJS.Utilities._setImmediate(complete);

        LiveUnit.Assert.areEqual(0, i);
    };

    this.testFrameSkipping = function (complete) {
        var i = 0;
        WinJS.Utilities._setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(1, i);

            // wait for 20ms, force us to miss a frame
            var start = new Date();
            while ((new Date() - start) < 20) { }
        });
        WinJS.Utilities._setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(2, i);
        });
        WinJS.Utilities._setImmediate(complete);

        LiveUnit.Assert.areEqual(0, i);
    };
};

LiveUnit.registerTestClass("CorsicaTests.Queue");
