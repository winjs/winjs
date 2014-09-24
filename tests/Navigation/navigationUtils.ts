// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module NavigationUtils {
    "use strict";

    var pageUrl = "page.html";
    var nav = WinJS.Navigation;

    export function createPageControl(parent) {
        var pageControlElement = document.createElement("div");
        parent.appendChild(pageControlElement);
        var pageControl = new Application.PageControlNavigator(pageControlElement, { home: pageUrl });
        return nav.navigate(pageUrl).then(function () {
            LiveUnit.Assert.isNotNull(pageControl._element);
            return pageControl;
        });
    }

    export function createBackButtonWithHTML(parent, id?) {
        var backButtonElement = document.createElement("button");
        backButtonElement.id = id || "BackButtonInHTML";
        backButtonElement.setAttribute("data-win-control", "WinJS.UI.BackButton");
        parent.appendChild(backButtonElement);
        return WinJS.UI.processAll().then(function () {
            return backButtonElement.winControl;
        });
    }

    export function createBackButtonWithJS(parent, id?) {
        var backButtonElement = document.createElement("button");
        backButtonElement.id = id || "BackButtonInJS";
        var backButton = new WinJS.UI.BackButton(backButtonElement);
        parent.appendChild(backButtonElement);
        return WinJS.Promise.wrap(backButtonElement.winControl);
    }

}