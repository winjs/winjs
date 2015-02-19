// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

(function (global) {
    "use strict";
    if (typeof (WinJS) !== "undefined") {
        WinJS.UI.Pages.define("FragmentControlSelfHost.html", {
            init: function () {
                window.parent.postMessage("FragmentControlSelfHost_ready:" + this.selfhost, "*");
            }
        });
    }
}(this));