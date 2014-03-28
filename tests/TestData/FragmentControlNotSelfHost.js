// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function (global) {
    "use strict";
    if (typeof (WinJS) !== "undefined") {
        WinJS.UI.Pages.define("FragmentControlNotSelfHost.html", {
            init: function () {
                this.runWithoutSelfHost = true;
            }
        });
    }
}(this));