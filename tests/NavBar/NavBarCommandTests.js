// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="../TestLib/util.ts" />

var WinJSTests = WinJSTests || {};

WinJSTests.NavBarCommandTests = function () {
    "use strict";

    var Key = WinJS.Utilities.Key;

    function assertHighContrastAdjust(element, expected) {
        if ("msHighContrastAdjust" in document.documentElement.style) {
            LiveUnit.Assert.areEqual(expected, element.style.msHighContrastAdjust);
        }
    }

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "host";
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

    this.testInstantiationMarkup = function (complete) {
        var host = document.getElementById("host");
        var html = "<div id='navcmd' data-win-control='WinJS.UI.NavBarCommand' " +
            "data-win-options='{ icon: WinJS.UI.AppBarIcon.add, splitButton: true }'" +
            "></div>";

        host.innerHTML = html;

        WinJS.UI.processAll().
        then(function () {
            var navcmd = document.getElementById('navcmd').winControl;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(navcmd.element, "win-navbarcommand"),
                "win-navbarcommand class not present");
            // Verify main button
            var buttonEl = navcmd.element.querySelector(".win-navbarcommand-button");
            LiveUnit.Assert.isTrue(buttonEl, "win-navbarcommand-button class not present");
            // Verify split button
            var splitButtonEl = navcmd.element.querySelector(".win-navbarcommand-splitbutton");
            LiveUnit.Assert.isTrue(splitButtonEl, "win-navbarcommand-splitbutton class not present");
            // Verify split and main button elements are not same
            LiveUnit.Assert.isFalse(splitButtonEl === buttonEl);
            // Verify icon
            var iconEl = buttonEl.querySelector(".win-navbarcommand-icon");
            LiveUnit.Assert.isTrue(iconEl, "win-navbarcommand-icon class not present");
            // Verify label
            var labelEl = buttonEl.querySelector(".win-navbarcommand-label");
            LiveUnit.Assert.isTrue(labelEl, "win-navbarcommand-label class not present");
            // Verify label and icon elements are not same
            LiveUnit.Assert.isFalse(iconEl === labelEl);
        }).
        done(complete);
    };

    this.testLabel = function () {
        var navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"));
        LiveUnit.Assert.areEqual("", navbarCommand.element.textContent.trim());

        navbarCommand.label = "abc";
        LiveUnit.Assert.areEqual("abc", navbarCommand.element.textContent.trim());

        navbarCommand.label = "";
        LiveUnit.Assert.areEqual("", navbarCommand.element.textContent.trim());
    };

    this.testTooltip = function () {
        var navbarCommand;

        navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"), { label: 'abc', tooltip: '' });
        LiveUnit.Assert.areEqual("", navbarCommand.element.title);

        var element2 = document.createElement("div");
        document.body.appendChild(element2);
        navbarCommand = new WinJS.UI.NavBarCommand(element2, { label: 'abc', tooltip: 'def' });
        LiveUnit.Assert.areEqual("def", navbarCommand.element.title);
        element2.parentNode.removeChild(element2);

        var element3 = document.createElement("div");
        document.body.appendChild(element3);
        navbarCommand = new WinJS.UI.NavBarCommand(element3, { label: 'abc' });
        LiveUnit.Assert.areEqual("", navbarCommand.element.title);
        element3.parentNode.removeChild(element3);

        var element4 = document.createElement("div");
        document.body.appendChild(element4);
        navbarCommand = new WinJS.UI.NavBarCommand(element4);
        LiveUnit.Assert.areEqual("", navbarCommand.element.title);


        // Dynamic updates:
        navbarCommand.tooltip = "abc";
        LiveUnit.Assert.areEqual("abc", navbarCommand.element.title);

        navbarCommand.tooltip = null;
        LiveUnit.Assert.areEqual("", navbarCommand.element.title);
        element4.parentNode.removeChild(element4);
    };

    this.testIcon = function () {
        var navbarCommand;
        navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"));
        LiveUnit.Assert.areEqual("", navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual(undefined, navbarCommand.icon);

        var element1 = document.createElement("div");
        document.body.appendChild(element1);
        navbarCommand = new WinJS.UI.NavBarCommand(element1, { icon: WinJS.UI.AppBarIcon.home });
        LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, navbarCommand.icon);
        element1.parentNode.removeChild(element1);

        var element2 = document.createElement("div");
        document.body.appendChild(element2);
        navbarCommand = new WinJS.UI.NavBarCommand(element2, { icon: 'home' });
        LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, navbarCommand.icon);
        element2.parentNode.removeChild(element2);

        var element3 = document.createElement("div");
        document.body.appendChild(element3);
        navbarCommand = new WinJS.UI.NavBarCommand(element3, { icon: 'a' });
        LiveUnit.Assert.areEqual('a', navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual('a', navbarCommand.icon);

        navbarCommand.icon = "a";
        LiveUnit.Assert.areEqual('a', navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual('a', navbarCommand.icon);

        navbarCommand.icon = "";
        LiveUnit.Assert.areEqual('', navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual('', navbarCommand.icon);

        navbarCommand.icon = "b";
        LiveUnit.Assert.areEqual('b', navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual('b', navbarCommand.icon);

        navbarCommand.icon = null;
        LiveUnit.Assert.areEqual('', navbarCommand._imageSpan.textContent);
        LiveUnit.Assert.areEqual(null, navbarCommand.icon);
        element3.parentNode.removeChild(element3);

        var element4 = document.createElement("div");
        document.body.appendChild(element4);
        navbarCommand = new WinJS.UI.NavBarCommand(element4);
        LiveUnit.Assert.areEqual(undefined, navbarCommand.icon);
        LiveUnit.Assert.areEqual("", navbarCommand._imageSpan.style.backgroundImage);
        assertHighContrastAdjust(navbarCommand._imageSpan, "");
        element4.parentNode.removeChild(element4);

        var element5 = document.createElement("div");
        document.body.appendChild(element5);
        navbarCommand = new WinJS.UI.NavBarCommand(element5, { icon: 'url("foo.png")' });
        LiveUnit.Assert.areEqual('url("foo.png")', navbarCommand.icon);
        Helper.Assert.areUrlsEqual('url("foo.png")', navbarCommand._imageSpan.style.backgroundImage);
        assertHighContrastAdjust(navbarCommand._imageSpan, "none");

        // BUG null leaves the background styles.
        //navbarCommand.icon = null;
        //LiveUnit.Assert.areEqual(null, navbarCommand.icon);
        //LiveUnit.Assert.areEqual("", navbarCommand._imageSpan.style.backgroundImage);
        //assertHighContrastAdjust(navbarCommand._imageSpan, "");

        navbarCommand.icon = 'url("foo.png")';
        LiveUnit.Assert.areEqual('url("foo.png")', navbarCommand.icon);
        Helper.Assert.areUrlsEqual('url("foo.png")', navbarCommand._imageSpan.style.backgroundImage);
        assertHighContrastAdjust(navbarCommand._imageSpan, "none");
        element5.parentNode.removeChild(element5);
    };

    this.testLocation = function () {
        var navbarCommand;

        navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"));
        LiveUnit.Assert.areEqual(undefined, navbarCommand.location);

        var element1 = document.createElement("div");
        document.body.appendChild(element1);
        navbarCommand = new WinJS.UI.NavBarCommand(element1, { location: 'foo.html' });
        LiveUnit.Assert.areEqual('foo.html', navbarCommand.location);

        navbarCommand.location = null;
        LiveUnit.Assert.areEqual(null, navbarCommand.location);

        navbarCommand.location = 'foo.html';
        LiveUnit.Assert.areEqual('foo.html', navbarCommand.location);
        element1.parentNode.removeChild(element1);
    };

    this.testState = function () {
        var navbarCommand;

        navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"));
        LiveUnit.Assert.areEqual(undefined, navbarCommand.state);

        var element1 = document.createElement("div");
        document.body.appendChild(element1);
        navbarCommand = new WinJS.UI.NavBarCommand(element1, { state: 'abc' });
        LiveUnit.Assert.areEqual('abc', navbarCommand.state);

        navbarCommand.state = null;
        LiveUnit.Assert.areEqual(null, navbarCommand.state);

        navbarCommand.state = 'abc';
        LiveUnit.Assert.areEqual('abc', navbarCommand.state);
        element1.parentNode.removeChild(element1);
    };

    this.testSplitButton = function () {
        var navbarCommand;

        navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"));
        LiveUnit.Assert.isFalse(navbarCommand.splitButton);

        var element1 = document.createElement("div");
        document.body.appendChild(element1);
        navbarCommand = new WinJS.UI.NavBarCommand(element1, { splitButton: true });
        LiveUnit.Assert.isTrue(navbarCommand.splitButton);

        navbarCommand.splitButton = false;
        LiveUnit.Assert.isFalse(navbarCommand.splitButton);

        navbarCommand.splitButton = true;
        LiveUnit.Assert.isTrue(navbarCommand.splitButton);
        element1.parentNode.removeChild(element1);
    }

    this.testDispose = function () {
        var navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"));
        LiveUnit.Assert.isFalse(navbarCommand._disposed);
        navbarCommand.dispose();
        LiveUnit.Assert.isTrue(navbarCommand._disposed);
        navbarCommand.dispose();
        LiveUnit.Assert.isTrue(navbarCommand._disposed);
    };

    this.testInvoke = function () {

        try {
            var navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"), { location: 'foo.html' });

            var navigateCalled = 0;

            WinJS.Utilities._require("WinJS/Navigation", function(Navigation) {
                Navigation.navigate = function (location, state) {
                    navigateCalled++;

                    LiveUnit.Assert.areEqual(navbarCommand.location, location);
                    LiveUnit.Assert.areEqual(navbarCommand.state, state);
                };
            });

            var invokeCalled = 0;
            navbarCommand.addEventListener(WinJS.UI.NavBarCommand._EventName._invoked, function (ev) {
                invokeCalled++;
            });

            LiveUnit.Assert.areEqual(0, navigateCalled);
            LiveUnit.Assert.areEqual(0, invokeCalled);

            navbarCommand._buttonEl.click();
            LiveUnit.Assert.areEqual(1, navigateCalled);
            LiveUnit.Assert.areEqual(1, invokeCalled);

            navbarCommand.location = null;
            navbarCommand._buttonEl.click();
            LiveUnit.Assert.areEqual(1, navigateCalled);
            LiveUnit.Assert.areEqual(2, invokeCalled);

            navbarCommand.location = "foo.html";
            navbarCommand.state = "abc";
            navbarCommand._buttonEl.click();
            LiveUnit.Assert.areEqual(2, navigateCalled);
            LiveUnit.Assert.areEqual(3, invokeCalled);

            CommonUtilities.keydown(navbarCommand._buttonEl, Key.enter);
            LiveUnit.Assert.areEqual(3, navigateCalled);
            LiveUnit.Assert.areEqual(4, invokeCalled);

            CommonUtilities.keydown(navbarCommand._buttonEl, Key.space);
            LiveUnit.Assert.areEqual(4, navigateCalled);
            LiveUnit.Assert.areEqual(5, invokeCalled);
        } finally {
            WinJS.Utilities._require("WinJS/Navigation", function(Navigation) {
                Navigation.navigate = WinJS.Navigation.navigate;
            });
        }

    };

    this.testSplitInvoke = function () {
        var navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"), { splitButton: true });

        var splitToggleCalled = 0;
        navbarCommand.addEventListener(WinJS.UI.NavBarCommand._EventName._splitToggle, function (ev) {
            splitToggleCalled++;
        });

        LiveUnit.Assert.areEqual(0, splitToggleCalled);
        LiveUnit.Assert.isFalse(navbarCommand.splitOpened);

        navbarCommand._splitButtonEl.click();
        LiveUnit.Assert.areEqual(1, splitToggleCalled);
        LiveUnit.Assert.isTrue(navbarCommand.splitOpened);

        CommonUtilities.keydown(navbarCommand._splitButtonEl, Key.enter);
        LiveUnit.Assert.areEqual(2, splitToggleCalled);
        LiveUnit.Assert.isFalse(navbarCommand.splitOpened);

        CommonUtilities.keydown(navbarCommand._splitButtonEl, Key.space);
        LiveUnit.Assert.areEqual(3, splitToggleCalled);
        LiveUnit.Assert.isTrue(navbarCommand.splitOpened);
    };

    this.testLeftRight = function () {
        var navbarCommand = new WinJS.UI.NavBarCommand(document.getElementById("host"), { splitButton: true });

        navbarCommand._buttonEl.focus();
        LiveUnit.Assert.areEqual(navbarCommand._buttonEl, document.activeElement);

        CommonUtilities.keydown(navbarCommand._buttonEl, Key.rightArrow);
        LiveUnit.Assert.areEqual(navbarCommand._splitButtonEl, document.activeElement);

        CommonUtilities.keydown(navbarCommand._splitButtonEl, Key.leftArrow);
        LiveUnit.Assert.areEqual(navbarCommand._buttonEl, document.activeElement);

        navbarCommand.element.style.direction = "rtl";

        CommonUtilities.keydown(navbarCommand._buttonEl, Key.leftArrow);
        LiveUnit.Assert.areEqual(navbarCommand._splitButtonEl, document.activeElement);

        CommonUtilities.keydown(navbarCommand._splitButtonEl, Key.rightArrow);
        LiveUnit.Assert.areEqual(navbarCommand._buttonEl, document.activeElement);
    };

    this.testConstructTwice = function () {
        var navbarCommandEl = document.getElementById("host");
        var navbarCommand = new WinJS.UI.NavBarCommand(navbarCommandEl);

        try {
            navbarCommand = new WinJS.UI.NavBarCommand(navbarCommandEl);
            LiveUnit.Assert.fail("Should throw");
        } catch (e) {
            LiveUnit.Assert.areEqual("Invalid argument: Controls may only be instantiated one time for each DOM element", e.message);
            LiveUnit.Assert.areEqual("WinJS.UI.NavBarCommand.DuplicateConstruction", e.name);
        }
    };
};

LiveUnit.registerTestClass("WinJSTests.NavBarCommandTests");
