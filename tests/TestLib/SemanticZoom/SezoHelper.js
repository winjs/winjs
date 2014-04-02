// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
"use strict";

var SezoHelper = SezoHelper || {};

SezoHelper.waitForZoomChanged = function waitForZoomChanged(sezo, isZoomedOut) {
    return new WinJS.Promise(function (c, e, p) {
        sezo.addEventListener("zoomchanged", handler);

        function handler(ev) {
            sezo.removeEventListener("zoomchanged", handler);

            if (typeof isZoomedOut !== "undefined") {
                LiveUnit.Assert.isFalse(sezo.zoomedOut ^ isZoomedOut);
            }
            // Yield so that child control can finish the pending work
            WinJS.Utilities._setImmediate(c);
        }
    });
};

