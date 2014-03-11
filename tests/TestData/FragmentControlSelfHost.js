
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