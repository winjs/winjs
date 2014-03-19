
(function (global) {
    "use strict";
    if (typeof (WinJS) !== "undefined") {
        WinJS.UI.Pages.define("../TestData/FragmentControlNotSelfHost.html", {
            init: function () {
                this.runWithoutSelfHost = true;
            }
        });
    }
}(this));