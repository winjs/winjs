// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="NavBarUtils.ts"/>

module WinJSTests {

    "use strict";

    var Key = WinJS.Utilities.Key;
    var canElementResize = null;
    var _elementWrapper;
    var _element;
    var navUtils = NavBarUtils;
    var NavBarContainer = <typeof WinJS.UI.PrivateNavBarContainer> WinJS.UI.NavBarContainer;

    export class NavBarLayoutTests {


        setUp = function (complete) {
            LiveUnit.LoggingCore.logComment("In setup");
            _elementWrapper = document.createElement("div");
            var newNode = document.createElement("div");
            newNode.id = "container";
            newNode.style.width = "500px";
            newNode.style.backgroundColor = "darkgreen";
            _elementWrapper.appendChild(newNode);
            document.body.appendChild(_elementWrapper);
            _element = newNode;
            Helper.detectMsElementResize(function (canResize) {
                canElementResize = canResize;
                complete();
            });
        };

        tearDown = function () {
            LiveUnit.LoggingCore.logComment("In tearDown");
            if (_elementWrapper) {
                WinJS.Utilities.disposeSubTree(_elementWrapper);
                document.body.removeChild(_elementWrapper);
                _elementWrapper = null;
                _element = null;
            }
        };



        // Verifies that the NavBar focus state is reset when the NavBar is hidden and then shown.
        testNavBarFocusOnHideAndShow = function (complete) {
            var navbarEl = document.createElement("div"),
                navbarContainerEl = document.createElement("div");

            _element.appendChild(navbarEl);
            navbarEl.appendChild(navbarContainerEl);
            navbarContainerEl.style.backgroundColor = "brown";

            var navbar = new WinJS.UI.NavBar(navbarEl);
            var navbarContainer = new NavBarContainer(navbarContainerEl, {
                data: navUtils.getNavBarCommandsData(20, true, false, false, false, false, true)
            });

            navbar.show();

            function waitForScrollComplete(viewportEl) {
                return new WinJS.Promise(function (c, e, p) {
                    // Wait time needs to be more than time required to perform UI action
                    var waitTime = 300;
                    function completeForReal() {
                        viewportEl.removeEventListener("scroll", handler);
                        c();
                    }
                    var timeout = setTimeout(completeForReal, waitTime);

                    function handler(e) {
                        clearTimeout(timeout);
                        timeout = setTimeout(completeForReal, waitTime);
                    };
                    viewportEl.addEventListener("scroll", handler);
                });
            }

            Helper.waitForEvent(navbar, "aftershow").
                then(function () {
                    // Move focus to the last command
                    var firstNavItem = navbarContainer._surfaceEl.children[0].winControl;
                    var lastNavItem = navbarContainer._surfaceEl.children[19].winControl;

                    Helper.keydown(firstNavItem._buttonEl, Key.end);
                    LiveUnit.Assert.areEqual(lastNavItem._buttonEl, document.activeElement);
                    LiveUnit.Assert.areEqual(19, navbarContainer.currentIndex);

                    return waitForScrollComplete(navbarContainerEl.querySelector(".win-navbarcontainer-viewport"));
                }).
                then(function () {
                    var lastNavItem = navbarContainer._surfaceEl.children[19].winControl;

                    // Open the split button
                    lastNavItem._splitButtonEl.click();
                    LiveUnit.Assert.isTrue(lastNavItem.splitOpened);

                    // Hide the navbar
                    navbar.hide();
                    return Helper.waitForEvent(navbar, "afterhide");
                }).
                then(function () {
                    // Show the navbar
                    navbar.show();
                    return Helper.waitForEvent(navbar, "aftershow");
                }).
                then(function () {
                    // Verify the focus state was reset
                    var firstNavItem = navbarContainer._surfaceEl.children[0].winControl;
                    var lastNavItem = navbarContainer._surfaceEl.children[19].winControl;
                    LiveUnit.Assert.areEqual(firstNavItem._buttonEl, document.activeElement);
                    LiveUnit.Assert.areEqual(0, navbarContainer.currentIndex);
                    LiveUnit.Assert.isFalse(lastNavItem.splitOpened);

                    complete();
                });
        };

        testNavBarAriaProperties = function (complete) {
            var navbarEl = document.createElement("div"),
                navbarContainerEl = document.createElement("div");

            _element.appendChild(navbarEl);
            navbarEl.appendChild(navbarContainerEl);
            navbarContainerEl.style.backgroundColor = "brown";

            var navbar = new WinJS.UI.NavBar(navbarEl);
            var navbarContainer = new WinJS.UI.NavBarContainer(navbarContainerEl, {
                data: navUtils.getNavBarCommandsData(20, true, false, false, false, false, true)
            });

            function checkAttribute(element, attribute, expectedValue) {
                var values = element.getAttribute(attribute).match(expectedValue),
                    value = values ? values[0] : null;

                LiveUnit.Assert.areEqual(value, expectedValue, "Expected " + attribute + ": " + expectedValue +
                    " Actual: " + value);
            }

            // Verify the NavBarContainer aria properties
            var viewportEl = navbarContainerEl.querySelector(".win-navbarcontainer-viewport");
            checkAttribute(viewportEl, "role", "group");
            checkAttribute(viewportEl, "aria-label", WinJS.Resources._getWinJSString("ui/navBarContainerViewportAriaLabel").value);

            // Verify the NavBarCommand aria properties
            var navbarCmds: any = navbarContainerEl.querySelectorAll(".win-navbarcommand");
            for (var i = 0; i < navbarCmds.length; i++) {
                var cmd = navbarCmds[i].winControl;
                checkAttribute(cmd._buttonEl, "role", "button");
                checkAttribute(cmd._splitButtonEl, "aria-expanded", "false");
            }

            navbar.show();

            Helper.waitForEvent(navbar, "aftershow").
                then(function () {
                    // Click on split button and verify aria-expanded
                    var splitEl = navbarCmds[0].winControl._splitButtonEl;
                    splitEl.click();
                    checkAttribute(splitEl, "aria-expanded", "true");
                    splitEl.click();
                    checkAttribute(splitEl, "aria-expanded", "false");
                    complete();
                });
        };
    };
}
LiveUnit.registerTestClass("WinJSTests.NavBarLayoutTests");

