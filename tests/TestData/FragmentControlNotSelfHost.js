
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