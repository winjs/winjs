// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    'use strict';
    if (typeof (WinJS) !== "undefined") {
        var q = WinJS.Utilities.query;

        WinJS.Namespace.define('PageControlsDemo', {
            Page2: WinJS.UI.Pages.define("page2.html", {
                ready: function (element, options) {
                    q(".nav", element).listen("click", function () {
                        WinJS.Navigation.navigate("Page1");
                    });
                }
            })
        });
    }
})();
