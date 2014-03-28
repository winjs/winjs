(function () {
    "use strict";

    var pageUrl = "page.html";
    var nav = WinJS.Navigation;

    WinJS.Namespace.define("WinJS.Navigation.Tests", {
        Utilities: WinJS.Class.define(null, null, {
            createPageControl: function Utilites_createPageControl(parent) {
                var pageControlElement = document.createElement("div");
                parent.appendChild(pageControlElement);
                var pageControl = new Application.PageControlNavigator(pageControlElement, { home: pageUrl });
                return nav.navigate(pageUrl).then(function () {
                    LiveUnit.Assert.isNotNull(pageControl._element);
                    return pageControl;
                });
            },

            createBackButtonWithHTML: function Utilities_createBackButtonWithHTML(parent, id) {
                var backButtonElement = document.createElement("button");
                backButtonElement.id = id || "BackButtonInHTML";
                backButtonElement.setAttribute("data-win-control", "WinJS.UI.BackButton");
                parent.appendChild(backButtonElement);
                return WinJS.UI.processAll().then(function () {
                    return backButtonElement.winControl;
                });
            },

            createBackButtonWithJS: function Utilities_createBackButtonWithJS(parent, id) {
                var backButtonElement = document.createElement("button");
                backButtonElement.id = id || "BackButtonInJS";
                var backButton = new WinJS.UI.BackButton(backButtonElement);
                parent.appendChild(backButtonElement);
                return WinJS.Promise.wrap(backButtonElement.winControl);
            },
        }),
    });
})();