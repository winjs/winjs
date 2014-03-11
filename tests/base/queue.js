/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.Queue = function () {
    "use strict";
    this.testSimpleQueue = function (complete) {
        setImmediate(complete);
    };

    this.testQueueOrdering = function (complete) {
        var i = 0;
        setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(1, i);
        });
        setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(2, i);
        });
        setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(3, i);
        });
        setImmediate(complete);

        LiveUnit.Assert.areEqual(0, i);
    };

    this.testFrameSkipping = function (complete) {
        var i = 0;
        setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(1, i);

            // wait for 20ms, force us to miss a frame
            var start = new Date();
            while ((new Date() - start) < 20) { }
        });
        setImmediate(function () {
            i++;
            LiveUnit.Assert.areEqual(2, i);
        });
        setImmediate(complete);

        LiveUnit.Assert.areEqual(0, i);
    };
};

LiveUnit.registerTestClass("CorsicaTests.Queue");
