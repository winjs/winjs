// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var MAX_PAGE_COUNT_SEQUENCIAL = 10;
    var MAX_PAGE_COUNT_RANDOM = 100;

    WinJS.UI.Pages.define("page.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            var pageIndex = 0;
            if (options && options.pageIndex && options.pageIndex > 0) {
                pageIndex = options.pageIndex;
            }

            var pageInfo = element.querySelector("#pageIndex");
            pageInfo.textContent = pageIndex.toString();

            var nextPage = <HTMLElement>element.querySelector("#nextPage");
            if (pageIndex < MAX_PAGE_COUNT_SEQUENCIAL - 1) {
                nextPage.addEventListener("click", function () {
                    WinJS.Navigation.navigate("page.html", { pageIndex: pageIndex + 1 });
                });
            } else {
                nextPage && (nextPage.style.visibility = "hidden");
            }

            var randomPage = element.querySelector("#randomPage");
            randomPage.addEventListener("click", function () {
                WinJS.Navigation.navigate("page.html", { pageIndex: Math.floor(Math.random() * MAX_PAGE_COUNT_RANDOM) });
            });
        }
    });
})();
