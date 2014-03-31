// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
﻿(function () {
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
