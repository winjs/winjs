
(function (global) {
    "use strict";
    if (typeof (WinJS) !== "undefined") {
        WinJS.UI.Pages.define("$(TESTDATA)/FragmentControlNotSelfHost.html", {
            init: function () {
                this.runWithoutSelfHost = true;
            }
        });
    }
}(this));