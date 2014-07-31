// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>

var WinJSTests = WinJSTests || {};

WinJSTests.NavBarTests = function () {
    "use strict";

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "navbarDiv";
        newNode.style.height = "200px";
        document.body.appendChild(newNode);
        this._element = newNode;
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        if (this._element) {
            WinJS.Utilities.disposeSubTree(this._element);
            document.body.removeChild(this._element);
            this._element = null;
        }
    };

    var utils = CommonUtilities;

    this.testNavBarInstantiationJS = function (complete) {
        var element = document.getElementById("navbarDiv"),
            navBar = new WinJS.UI.NavBar(element),
            className = "win-navbar";

        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(element, className), "CSS class not applied");
        LiveUnit.Assert.areEqual(element, navBar.element);
        LiveUnit.Assert.areEqual(element.winControl, navBar);
        element.addEventListener("childrenprocessed", function () {
            complete();
        });
    };

    this.testNavBarInstantiationMarkUp = function (complete) {
        var eventFired = false;
        var handler = function (e) {
            eventFired = true;
        };
        handler.supportedForProcessing = true;
        window.handler = handler;

        var htmlStr =
            "<div id='bar' style='background-color:grey;' data-win-control='WinJS.UI.NavBar' data-win-options='{ onchildrenprocessed: window.handler }'>" +
            "</div>",
            parent = document.getElementById("navbarDiv");

        parent.innerHTML = htmlStr;
        WinJS.UI.processAll().
        then(function () {
            var element = document.getElementById("bar"),
                navbar = document.querySelector(".win-navbar").winControl;

            LiveUnit.Assert.areEqual(navbar.element, element, "Unexpected winControl");
            return utils.waitForEvent(navbar, "aftershow", navbar.show.bind(navbar));
        }).
        then(function () {
            LiveUnit.Assert.isTrue(eventFired);
            window.handler = null;
            complete();
        });
    };

    this.testNavBarLayoutProperty = function () {
        var navBar;

        navBar = new WinJS.UI.NavBar();
        LiveUnit.Assert.areEqual("custom", navBar.layout);

        navBar = new WinJS.UI.NavBar(null, { layout: "commands" });
        LiveUnit.Assert.areEqual("custom", navBar.layout);

        navBar = new WinJS.UI.NavBar();

        // The layout setter of the NavBar is a no-op.
        navBar.layout = "commands";
        LiveUnit.Assert.areEqual("custom", navBar.layout);
    };

    this.testNavBarPlacementProperty = function () {
        var navBar;

        navBar = new WinJS.UI.NavBar();
        LiveUnit.Assert.areEqual("top", navBar.placement);

        navBar = new WinJS.UI.NavBar(null, { placement: "bottom" });
        LiveUnit.Assert.areEqual("bottom", navBar.placement);

        navBar = new WinJS.UI.NavBar();
        navBar.placement = "bottom";
        LiveUnit.Assert.areEqual("bottom", navBar.placement);
    };

    this.testNavBarDispose = function (complete) {
        var element = document.getElementById("navbarDiv"),
            navBar = new WinJS.UI.NavBar(element);

        utils.waitForEvent(navBar, "aftershow", navBar.show.bind(navBar)).
        then(function () {
            LiveUnit.Assert.isFalse(navBar._disposed);
            navBar.dispose();
            LiveUnit.Assert.isTrue(navBar._disposed);
            navBar.dispose();
            LiveUnit.Assert.isTrue(navBar._disposed);
        }).
        done(complete);
    };
};

LiveUnit.registerTestClass("WinJSTests.NavBarTests");