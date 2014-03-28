(function () {
    'use strict';
    if (typeof (WinJS) !== "undefined") {
        WinJS.Namespace.define("PageControlsDemo", {
            Page1: WinJS.UI.Pages.define("page1.html", {
                ready: function (element, options) {
                    var buttons = WinJS.Utilities.query(".nav", element);

                    buttons.listen("click", function () {
                        WinJS.Navigation.navigate("Page2");
                    });
                }
            }),
        });
    }
})();
