// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.Toolbar.ts"/>
/// <reference path="OverlayHelpers.ts" />

module CorsicaTests {


    var PrivateAppBar = <typeof WinJS.UI.PrivateAppBar>WinJS.UI.AppBar;
    var AppBarCommand = <typeof WinJS.UI.PrivateCommand>WinJS.UI.AppBarCommand;

    var _Constants;
    var _element;
    WinJS.Utilities._require(["WinJS/Controls/AppBar/_Constants"], function (constants) {
        _Constants = constants;
    })

    "use strict";

    var Key = WinJS.Utilities.Key;

    // Creates a Menu within an AppBar, opens them both, and then gives focus to the Menu.
    // Returns a promise which completes when the AppBar and Menu controls are in this state.
    function createMenuInAppBar() {
        return new WinJS.Promise(function (complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<button id='outsideAppBar'>outsideAppBar</button>" +
            "<div id='appBar' data-win-control='WinJS.UI.AppBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"MenuButton\",label:\"More\",type:\"flyout\",flyout:\"myMenu\"}'></button>" +
            "</div>" +
            "<div id='myMenu' tabindex='-1' data-win-control='WinJS.UI.Menu' " +
            "data-win-options='{commands:[" +
            "{id:\"MenuA\",label:\"Three\"}," +
            "{id:\"MenuB\",label:\"Four\",type:\"toggle\"}" +
            "]}'" +
            "</div>";

            WinJS.UI.processAll(root).then(function () {
                var appBar = root.querySelector("#appBar").winControl;
                var button0 = appBar.getCommandById("Button0").element;
                var button1 = appBar.getCommandById("Button1").element;
                var menuButton = appBar.getCommandById("MenuButton").element;
                var menu = root.querySelector("#myMenu").winControl;
                var menuItemB = menu.element.querySelector("#MenuB");

                OverlayHelpers.show(appBar).then(function () {
                    LiveUnit.Assert.isTrue(appBar.element.contains(document.activeElement), "Focus should initially be within the AppBar");
                    LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should initially be visible");

                    return Helper.waitForFocus(menu.element, function () { menuButton.click() })
                }).then(function () {
                        LiveUnit.Assert.isTrue(menu.element.contains(document.activeElement), "After opening the menu, focus should be within it");
                        LiveUnit.Assert.isFalse(menu.hidden, "Menu should be visible");
                        LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should have remained visible when opening a menu within it");

                        return Helper.focus(menuItemB);
                    }).then(function () {
                        LiveUnit.Assert.areEqual(menuItemB, document.activeElement, "MenuB should have focus");
                        LiveUnit.Assert.isFalse(menu.hidden, "Menu should have remained visible");
                        LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should have remained visible when moving focus within the menu");

                        complete();
                    });
            });
        });
    }

    var displayModeVisiblePositions = {
        disabled: "hidden",
        none: "hidden",
        hidden: "hidden",
        minimal: "minimal",
        shown: "shown",
    }

    function waitForPositionChange(appBar, changePosition) {
        return new WinJS.Promise(function (complete) {
            appBar._afterPositionChangeCallBack = complete;
            changePosition();
        });
    }


    function hideAllAppBars() {
        var AppBars = document.querySelectorAll(".win-appbar");
        AppBars = Array.prototype.map.call(AppBars, function (AppBar) { return AppBar.winControl; });
        return WinJS.UI._Overlay._hideAppBars(AppBars);
    };

    function showAllAppBars() {
        var AppBars = document.querySelectorAll(".win-appbar");
        AppBars = Array.prototype.map.call(AppBars, function (AppBar) { return AppBar.winControl; });
        return WinJS.UI._Overlay._showAppBars(AppBars);
    }

    export class AppBarTests {


        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var AppBarElement = document.createElement('div');
            AppBarElement.id = "appBarDiv";
            document.body.appendChild(AppBarElement);
            _element = AppBarElement;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            OverlayHelpers.disposeAndRemove(document.getElementById("appBarDiv"));
            _element = null;

            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false
    }

        // Test AppBar Instantiation
        testAppBarInstantiation = function () {
            var AppBar = new WinJS.UI.AppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (AppBar[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from AppBar");
                }

                LiveUnit.Assert.isNotNull(AppBar[functionName]);
                LiveUnit.Assert.isTrue(typeof (AppBar[functionName]) === "function", functionName + " exists on AppBar, but it isn't a function");
            }

            verifyFunction("show");
            verifyFunction("hide");
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
        }
    //testAppBarInstantiation["Description"] = "Test AppBar instantiation + function presence";

        // Test AppBar Instantiation with null element
        testAppBarNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with null element");
            var AppBar = new WinJS.UI.AppBar(null, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a null AppBar element.");
        }
    //testAppBarNullInstantiation["Description"] = "Test AppBar Instantiation with null AppBar element";

        // Test AppBar Instantiation with no options
        testAppBarEmptyInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with empty constructor");
            var AppBar = new WinJS.UI.AppBar();
            LiveUnit.Assert.isNotNull(AppBar.element, "AppBar.element is null");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a Empty AppBar element.");
        }
    //testAppBarEmptyInstantiation["Description"] = "Test AppBar Instantiation with Empty AppBar element";

        // Test multiple instantiation of the same AppBar DOM element
        testAppBarMultipleInstantiation() {
            AppBarTests.prototype.testAppBarMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            var AppBar = new WinJS.UI.AppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            var error;
            try {
                new WinJS.UI.AppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            } catch (e) {
                error = e;
            } finally {
                throw error;
            }
        }
        //testAppBarMultipleInstantiation["Description"] = "Test AppBar Duplicate Instantiation with same DOM element";


        // Test AppBar parameters
        testAppBarParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBar using good parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                var options = { commands: { type: 'separator', id: 'sep' } };
                options[paramName] = value;
                document.body.appendChild(div);
                var AppBar = new WinJS.UI.AppBar(div, options);
                LiveUnit.Assert.isNotNull(AppBar);
                document.body.removeChild(div);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBar using bad parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                document.body.appendChild(div);
                var options = { commands: { type: 'separator', id: 'sep' } };
                options[paramName] = value;
                try {
                    new WinJS.UI.AppBar(div, options);
                    LiveUnit.Assert.fail("Expected creating AppBar with " + paramName + "=" + value + " to throw an exception");
                } catch (e) {
                    var exception = e;
                    LiveUnit.LoggingCore.logComment(exception.message);
                    LiveUnit.Assert.isTrue(exception !== null);
                    LiveUnit.Assert.isTrue(exception.name === expectedName);
                    LiveUnit.Assert.isTrue(exception.message === expectedMessage);
                } finally {
                    document.body.removeChild(div);
                }
            }


            LiveUnit.LoggingCore.logComment("Testing placement");
            testGoodInitOption("placement", "top");
            testGoodInitOption("placement", "bottom");
            testGoodInitOption("placement", "fixed");
            testGoodInitOption("placement", "");
            testGoodInitOption("placement", -1);
            testGoodInitOption("placement", 12);
            testGoodInitOption("placement", {});
            testGoodInitOption("placement", true);
            testGoodInitOption("placement", false);
            testGoodInitOption("placement", undefined);
            testGoodInitOption("placement", null);

            testGoodInitOption("closedDisplayMode", "none");
            testGoodInitOption("closedDisplayMode", "minimal");
            testGoodInitOption("closedDisplayMode", "compact");
            testGoodInitOption("closedDisplayMode", "");
            testGoodInitOption("closedDisplayMode", -1);
            testGoodInitOption("closedDisplayMode", 12);
            testGoodInitOption("closedDisplayMode", {});
            testGoodInitOption("closedDisplayMode", true);
            testGoodInitOption("closedDisplayMode", false);
            testGoodInitOption("closedDisplayMode", null);
            testGoodInitOption("closedDisplayMode", undefined);

            LiveUnit.LoggingCore.logComment("Testing layout");
            testGoodInitOption("layout", "menu");
            testGoodInitOption("layout", "custom");
            testGoodInitOption("layout", "commands");
            var badLayout = "Invalid argument: The layout property must be 'custom', 'menu' or 'commands'";
            testBadInitOption("layout", "fixed", "WinJS.UI.AppBar.BadLayout", badLayout);
            testBadInitOption("layout", -1, "WinJS.UI.AppBar.BadLayout", badLayout);
            testBadInitOption("layout", 12, "WinJS.UI.AppBar.BadLayout", badLayout);
            testBadInitOption("layout", {}, "WinJS.UI.AppBar.BadLayout", badLayout);

            LiveUnit.LoggingCore.logComment("Testing sticky");
            testGoodInitOption("sticky", true);
            testGoodInitOption("sticky", false);
            testGoodInitOption("sticky", -1);
            testGoodInitOption("sticky", "what");
            testGoodInitOption("sticky", {});

            LiveUnit.LoggingCore.logComment("Testing disabled");
            testGoodInitOption("disabled", true);
            testGoodInitOption("disabled", false);
            testGoodInitOption("disabled", -1);
            testGoodInitOption("disabled", "what");
            testGoodInitOption("disabled", {});

            LiveUnit.LoggingCore.logComment("Testing element");
            //testBadInitOption("element", {}, WinJS.UI.AppBar.badElement);
        }
    //testAppBarParams["Description"] = "Test initializing a AppBar with good and bad initialization options";

        testDefaultAppBarParameters = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var AppBar = new WinJS.UI.AppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(_element, AppBar.element, "Verifying that element is what we set it with");
            LiveUnit.Assert.areEqual("bottom", AppBar.placement, "Verifying that position is 'bottom'");
            LiveUnit.Assert.areEqual("commands", AppBar.layout, "Verifying that layout is 'commands'");
            LiveUnit.Assert.isFalse(AppBar.sticky, "Verifying that sticky is false");
            LiveUnit.Assert.isFalse(AppBar.disabled, "Verifying that disabled is false");
            LiveUnit.Assert.isTrue(AppBar.hidden, "Verifying that hidden is true");
            LiveUnit.Assert.areEqual(AppBar.closedDisplayMode, 'minimal', "Verifying closedDisplayMode is minimal");
        }
    //testDefaultAppBarParameters["Description"] = "Test default AppBar parameters";

        // Simple Function Tests
        testSimpleAppBarTestsFunctions = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var AppBar = new PrivateAppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("hide");
            AppBar.hide();

            LiveUnit.LoggingCore.logComment("set commands");
            AppBar.commands = [{ id: 'cmdA', label: 'One', icon: 'back', section: 'primary', tooltip: 'Test glyph by name' },
                { id: 'cmdB', label: 'Two', icon: '&#xE106;', type: 'toggle', section: 'secondary', tooltip: 'Test Glyph by codepoint' },
                { id: 'cmdB', label: '?????', icon: '&#xE107;', type: 'toggle', section: 'secondary', tooltip: '?????? ????? ?????? ????? ??????' },
                { type: 'separator', id: 'sep' },
                { id: 'cmdC', label: 'More', icon: 'url(images/accept_sprite_40.png)', type: 'flyout', flyout: 'myMenu' }];

            LiveUnit.LoggingCore.logComment("getCommandById");
            AppBar.getCommandById("cmdA");

            LiveUnit.LoggingCore.logComment("hideCommands");
            AppBar.hideCommands("cmdA");

            LiveUnit.LoggingCore.logComment("showOnlyCommands");
            AppBar.showOnlyCommands("cmdB");

            LiveUnit.LoggingCore.logComment("showCommands");
            AppBar.showCommands("cmdC");

            LiveUnit.LoggingCore.logComment("show");
            AppBar.show();
            AppBar.hide();
        }
    //testSimpleAppBarTestsFunctions["Description"] = "Test default overlay parameters";

        testAppBarDispose = function () {
            var abc1 = new AppBarCommand(document.createElement("button"), { label: "abc1" });
            var abc2 = new AppBarCommand(document.createElement("button"), { label: "abc2" });

            var ab = new PrivateAppBar(null, { commands: [abc1, abc2] });
            ab._updateFirstAndFinalDiv();
            LiveUnit.Assert.isTrue(ab.dispose);
            LiveUnit.Assert.isFalse(ab._disposed);
            LiveUnit.Assert.isFalse(ab._layout._disposed);

            ab.dispose();
            LiveUnit.Assert.isTrue(ab._disposed);
            LiveUnit.Assert.isTrue(abc1._disposed);
            LiveUnit.Assert.isTrue(abc2._disposed);
            LiveUnit.Assert.isTrue(ab._layout._disposed);
            ab.dispose();
        }
    //testAppBarDispose["Description"] = "Unit test for dispose requirements.";

        testAppBarThrowsWhenPlacementIsSetAndAppBarVisible() {
            AppBarTests.prototype.testAppBarThrowsWhenPlacementIsSetAndAppBarVisible["LiveUnit.ExpectedException"] = {
                message: "Invalid argument: The placement property cannot be set when the AppBar is visible, call hide() first"
            }
            var AppBar = new WinJS.UI.AppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.show();
            AppBar.placement = "true";
        }

        testSynchronousShowHide = function (complete) {
            var htmlString =
                "<div data-win-control='WinJS.UI.AppBar'>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
                "</div>";

            _element.innerHTML = htmlString;
            WinJS.UI.processAll().
                then(function () {
                    var appbar = document.querySelector(".win-appbar").winControl;
                    appbar.show();
                    appbar.hide();
                    appbar.show();

                    return Helper.waitForEvent(appbar, "aftershow");
                }).
                done(complete);
        };

        testKeyboarding = function (complete) {
            var htmlString = "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button2\", label:\"Button 2\", type:\"button\", section:\"secondary\"}'></button>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button3\", label:\"Button 3\", type:\"button\", section:\"primary\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", section:\"primary\"}' />" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", section:\"secondary\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button4\", label:\"Button 4\", type:\"button\", section:\"secondary\"}'></button>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button5\", label:\"Button 5\", type:\"button\", section:\"primary\", hidden: true}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />";
            _element.innerHTML = htmlString;
            /* Tabstops in visual order (separators and hidden buttons are not tabstops)
                Selection:
                    0) Button 2
                    1) Button 4
                Global:
                    2) Button 0
                    3) Button 1
                    4) Button 3
            */
            var AppBar = new WinJS.UI.AppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.show();
            _element.addEventListener('aftershow', function () {

                var commandsInVisualOrder = [];
                commandsInVisualOrder.push(AppBar.getCommandById("Button2").element);
                commandsInVisualOrder.push(AppBar.getCommandById("Button4").element);
                commandsInVisualOrder.push(AppBar.getCommandById("Button0").element); // Button 0 is the first command element in DOM order.
                commandsInVisualOrder.push(AppBar.getCommandById("Button1").element);
                commandsInVisualOrder.push(AppBar.getCommandById("Button3").element);

                // Verify initial focus is first element in Visual order.
                var expectedIndex = 0;
                LiveUnit.LoggingCore.logComment("Verify that after showing an appbar, the first command in VISUAL order has focus");
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement, "The focused element should be the first AppBarCommand in VISUAL order");

                // Verify 'End' & Left arrow keys
                LiveUnit.LoggingCore.logComment("Verify that 'End' key moves focus to last visible command");
                Helper.keydown(commandsInVisualOrder[expectedIndex], Key.end);
                expectedIndex = commandsInVisualOrder.length - 1;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);
                do {
                    Helper.keydown(commandsInVisualOrder[expectedIndex], Key.leftArrow);
                    expectedIndex--;
                    LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);
                } while (expectedIndex > 0);

                LiveUnit.LoggingCore.logComment("Verify that pressing Left arrow key on first visible command wraps focus back to the last visible command.");
                Helper.keydown(commandsInVisualOrder[expectedIndex], Key.leftArrow);
                expectedIndex = commandsInVisualOrder.length - 1;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);

                // Verify 'Home' & Right arrow keys
                LiveUnit.LoggingCore.logComment("Verify that 'Home' key moves focus to first visible command");
                Helper.keydown(commandsInVisualOrder[expectedIndex], Key.home);
                expectedIndex = 0;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);

                do {
                    Helper.keydown(commandsInVisualOrder[expectedIndex], Key.rightArrow);
                    expectedIndex++;
                    LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);
                } while (expectedIndex < commandsInVisualOrder.length - 1);

                LiveUnit.LoggingCore.logComment("Verify that pressing Right arrow key on last visible command, wraps focus back to first visible command.");
                Helper.keydown(commandsInVisualOrder[expectedIndex], Key.rightArrow);
                expectedIndex = 0;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);

                complete();
            });
        };

        testFocusMovesBeforeAnimationEnds = function (complete) {
            var htmlString = "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>";

            _element.innerHTML = htmlString;
            var AppBar = new WinJS.UI.AppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.show();

            var cmds = _element.querySelectorAll(".win-command");
            var firstCmd = cmds[0],
                secondCmd = cmds[1];

            LiveUnit.Assert.areEqual(firstCmd, document.activeElement, "The focus should be on the first AppBarCommand");
            // Don't wait for the aftershow event to fire to perform the action
            Helper.keydown(_element, Key.rightArrow);
            LiveUnit.Assert.areEqual(secondCmd, document.activeElement, "The focus should be on the Second AppBarCommand");
            complete();
        };

        testKeyboardingInEmptyAppBar = function (complete) {
            var AppBar = new WinJS.UI.AppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.show();

            _element.addEventListener('aftershow', function () {

                var commandsInVisualOrder = [];

                // Verify initial focus
                var activeElement = document.activeElement;
                LiveUnit.LoggingCore.logComment("Verify that empty appbar contains focus after it opens.");
                LiveUnit.Assert.isTrue(_element.contains(activeElement), "The focused element should be in the AppBar HTML");

                LiveUnit.LoggingCore.logComment("Verify that 'End', 'Right', 'Left', & 'Home' keys do not crash when the AppBar is empty.");
                Helper.keydown(_element, Key.end);
                Helper.keydown(_element, Key.home);
                Helper.keydown(_element, Key.leftArrow);
                Helper.keydown(_element, Key.rightArrow);

                LiveUnit.LoggingCore.logComment("Verify focus is still on the AppBarElement.");
                LiveUnit.Assert.isTrue(_element.contains(activeElement), "The focused element should still be in the AppBar HTML.");
                complete();
            });
        };

        testKeyboardingWithContentCommands = function (complete) {
            /*
            Tests:
            win-interactive: left/right/home/end are ignored when focus is on an element with the win-interactive class.
            tabindex of -1 on container and default values for command.firstElementFocus & command.LastElementFocus causes the content command to be skipped by arrows and home/end keys.
            tabindex of -1 on a container but setting the first/last ElementFocus properties allow you to navigate to them instead of the container them.
            Whenever firstElementFocus or lastElementFocus is set the container element automatically gets its tabindex set to -1
            When one focus property on a content command is set, but the other is not set, they both return the value of the one that was set.
            Home key to content command places you on firstElementFocus.
            End key to content command places you on lastElementFocus.
            */
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var htmlString = "" +

                "<div style=\"font-size: 14px;\" data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'progress', section:'primary',type:'content'}\">Download progress...<progress></progress></div>" +

            // firstElementFocus is set to #orange and lastElementFocus is set to #yellow
                "<div id='buttons' data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'buttons', section:'secondary', type:'content', firstElementFocus:select('#orange'), lastElementFocus:select('#yellow')}\">" +
                "<div><button id='orange' style='color: orange;'>Orange</button><button id='blue' style='color: blue;'>Blue</button><button id='green' style='color: green;'>Green</button><button id='yellow' style='color: yellow;'>Yellow</button></div></div>" +

            // This has tabindex -1, and both firstElementFocus and lastElementFocus are left to be default so arrow navigation will skip over it.)
                "<div id='textBox' tabindex=\"-1\" data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'textBox', section:'secondary',type:'content'}\">" +
                "<input class=\"win-interactive\" placeholder=\"Commands and textboxes co-exist!\" type=\"text\"/></div>" +

            // Include this command to verify that it is skipped by keyboard navigation since its hidden property is set to true.
                "<div id='ratingContainer' data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'ratingContainer', hidden: true, section:'secondary',type:'content', firstElementFocus:select('#topBar #ratingControl')}\">" +
                "<div id=\"ratingControl\" data-win-control=\"WinJS.UI.Rating\" data-win-options=\"{maxRating:10, averageRating:7.6}\"></div></div>" +

            // The range input element has the win-interactive class, so we expect that home/end/left/right will be ignored by AppBar focus manager.
                "<div id='rangeContainer' tabindex='-1' data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'rangeContainer', section:'primary',type:'content', firstElementFocus:select('input[type=range]'), lastElementFocus:select('input[type=range]')}\">" +
                "<span>Your dog's age in human years:</span><br /><input id='range' class='win-interactive' type='range' min='0' max='10'/></div>" +

            // firstElementFocus is default and lastElementFocus is set to #adele.
                "<div data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'x8', section:'primary',type:'content', lastElementFocus:select('#adele')}\"><img id='adele' tabindex='0' src='images/adele.png' />" +
                "<div> <span id=\"nowplaying\">Now Playing</span><span id=\"songtitle\">Rumour Has It</span><span id=\"albumtitle\">21 (Deluxe Edition) By Adele</span></div></div>";

            _element.innerHTML = htmlString;
            /* Left/Right/Home/End key reachable commands in visual order.
                Selection:
                    0) "buttons" Content Command: "orange"<->"yellow" (firstElementFocus is set to #orange and lastElementFocus is set to #yellow)

                Global:
                    1) "progress" Content Command: "progress"
                    2) "rangeContainer" Content Command: "rangeContainer" (firstElementFocus and lastElementFocus are set to the <input type="range"/> element.
                    3) "x8" Content Command: "adele" (firstElementFocus is default and lastElementFocus is set to #adele.)
            */
            var AppBar = new WinJS.UI.AppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.show();
            _element.addEventListener('aftershow', function () {
                var reachableCommandsInVisualOrder = [];
                reachableCommandsInVisualOrder.push(AppBar.getCommandById("buttons"));
                reachableCommandsInVisualOrder.push(AppBar.getCommandById("progress")); // progress is the first command element in DOM order.
                reachableCommandsInVisualOrder.push(AppBar.getCommandById("rangeContainer")); // Contains #range element which has the .win-interactive class.
                reachableCommandsInVisualOrder.push(AppBar.getCommandById("x8"));

                // Verify initial focus is first element in VISUAL order
                var expectedIndex = 0;
                LiveUnit.LoggingCore.logComment("Verify that after showing an appbar, the first command in VISUAL order has focus");
                LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus.id, (<HTMLElement>document.activeElement).id, "The focused element should be the first AppBarCommand in VISUAL order");

                // Verify 'End' & Left arrow keys
                LiveUnit.LoggingCore.logComment("Verify that 'End' key moves focus to last visible command");
                Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus, Key.end);
                expectedIndex = reachableCommandsInVisualOrder.length - 1;
                LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus.id, (<HTMLElement>document.activeElement).id);
                LiveUnit.LoggingCore.logComment("Verify that 'Left' arrow key moves focus to correct command");
                do {
                    if (WinJS.Utilities.hasClass(<HTMLElement>document.activeElement, "win-interactive")) {
                        LiveUnit.LoggingCore.logComment("Verify that 'Left' arrow key doesn't move focus to the previous element when the active element has the win-interactive class");
                        Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus, Key.leftArrow);
                        LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus.id, (<HTMLElement>document.activeElement).id);
                        // Manually move focus to continue the loop.
                        expectedIndex--;
                        reachableCommandsInVisualOrder[expectedIndex].lastElementFocus.focus();
                    } else {
                        Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus, Key.leftArrow);
                        expectedIndex--;
                        LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus.id, (<HTMLElement>document.activeElement).id);
                    }
                } while (expectedIndex > 0);

                LiveUnit.LoggingCore.logComment("Verify that pressing Left arrow key on first visible command wraps focus back to the last visible command.");
                Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus, Key.leftArrow);
                expectedIndex = reachableCommandsInVisualOrder.length - 1;
                LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus.id, (<HTMLElement>document.activeElement).id);

                // Verify 'Home' & Right arrow keys
                LiveUnit.LoggingCore.logComment("Verify that 'Home' key moves focus to first visible command");
                Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].lastElementFocus, Key.home);
                expectedIndex = 0;
                LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus.id, (<HTMLElement>document.activeElement).id);
                LiveUnit.LoggingCore.logComment("Verify that 'Right' arrow key moves focus to correct command");
                do {
                    if (WinJS.Utilities.hasClass(<HTMLElement>document.activeElement, "win-interactive")) {
                        LiveUnit.LoggingCore.logComment("Verify that 'Right' arrow key doesn't move focus to the next element when the active element has the win-interactive class");
                        Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus, Key.rightArrow);
                        LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus.id, (<HTMLElement>document.activeElement).id);
                        // Manually move focus to continue the loop.
                        expectedIndex++;
                        reachableCommandsInVisualOrder[expectedIndex].firstElementFocus.focus();
                    } else {
                        Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus, Key.rightArrow);
                        expectedIndex++;
                        LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus.id, (<HTMLElement>document.activeElement).id);
                    }
                } while (expectedIndex < reachableCommandsInVisualOrder.length - 1);

                LiveUnit.LoggingCore.logComment("Verify that pressing Right arrow key on last visible command, wraps focus back to first visible command.");
                Helper.keydown(reachableCommandsInVisualOrder[expectedIndex].element, Key.rightArrow);
                expectedIndex = 0;
                LiveUnit.Assert.areEqual(reachableCommandsInVisualOrder[expectedIndex].firstElementFocus.id, (<HTMLElement>document.activeElement).id);

                complete();
            });
        };

        testMultiplePressesOFHomeAndEndKeys = function (complete) {
            /*
            Regression Test for WinBlue 238117: Pressing "home" or "end" key twice shouldn't move the focus to a different element
            */
            var htmlString = "" +

                "<div style=\"font-size: 14px;\" data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'progressCmd', section:'primary',type:'content', firstElementFocus:select('#progress')}\">Download progress...<progress id=\"progress\" tabindex=\"0\"></progress></div>" +

                "<div data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'x8', section:'primary',type:'content', lastElementFocus:select('#adele')}\"><img id='adele' tabindex='0' src='images/adele.png' />" +
                "<div> <span id=\"nowplaying\">Now Playing</span><span id=\"songtitle\">Rumour Has It</span><span id=\"albumtitle\">21 (Deluxe Edition) By Adele</span></div></div>";

            _element.innerHTML = htmlString;
            /* Left Right Home End key focusable commands in visual order
                Selection:
                    N/A

                Global:
                    1) "progressCmd" Content Command: "progress" (firstElementFocus is set to "#progress" and lastElementFocus is default)
                    2) "x8" Content Command: "adele" (firstElementFocus is default and lastElementFocus is set to #adele)
            */
            var AppBar = new WinJS.UI.AppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.show();
            _element.addEventListener('aftershow', function () {
                var commandsInVisualOrder = [];
                commandsInVisualOrder.push(AppBar.getCommandById("progressCmd"));
                commandsInVisualOrder.push(AppBar.getCommandById("x8"));

                // Verify initial focus is first element in DOM order
                var activeElement = <HTMLElement>document.activeElement;
                var expectedIndex = 0;
                LiveUnit.LoggingCore.logComment("Verify that after showing an appbar, the first command in DOM order has focus");
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, activeElement.id, "The focused element should be the first AppBarCommand in DOM order");

                // Verify multiple 'End' key downs
                LiveUnit.LoggingCore.logComment("Verify that 'End' key moves focus to last visible command");
                Helper.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.end);
                expectedIndex = commandsInVisualOrder.length - 1;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, (<HTMLElement>document.activeElement).id);

                LiveUnit.LoggingCore.logComment("Verify that pressing 'End' key again doesn't moves focus");
                activeElement = <HTMLElement>document.activeElement;
                Helper.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.end);
                LiveUnit.Assert.areEqual(activeElement.id, (<HTMLElement>document.activeElement).id);

                // Verify multiple 'Home' key downs
                LiveUnit.LoggingCore.logComment("Verify that 'Home' key moves focus to first visible command");
                Helper.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.home);
                expectedIndex = 0;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, (<HTMLElement>document.activeElement).id);

                LiveUnit.LoggingCore.logComment("Verify that pressing 'Home' key again doesn't moves focus");
                activeElement = <HTMLElement>document.activeElement;
                Helper.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.home);
                LiveUnit.Assert.areEqual(activeElement.id, (<HTMLElement>document.activeElement).id);

                complete();
            });
        };

        testDisposeRemovesAppBarClickEatingDiv = function (complete) {
            WinJS.UI._Overlay._clickEatingAppBarDiv = null;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = null;

            var appBar = new WinJS.UI.AppBar(document.getElementById("appBarDiv"));
            document.body.appendChild(appBar.element);
            appBar.show();

            // ClickEater add/remove are high priority scheduler jobs, so we schedule an idle priority asserts
            appBar.addEventListener("aftershow", function () {
                var clickEater = <HTMLElement>document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass);
                LiveUnit.Assert.isTrue(clickEater);
                LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

                appBar.dispose();

                WinJS.Utilities.Scheduler.schedule(function () {
                    LiveUnit.Assert.areEqual("none", clickEater.style.display);
                    complete();
                }, WinJS.Utilities.Scheduler.Priority.idle);
            });
        };

        testDismissesWhenLosingFocus = function (complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<button id='outsideAppBar'>outsideAppBar</button>" +
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
            "</div>";
            var outsideAppBar = root.querySelector("#outsideAppBar");
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"));

            OverlayHelpers.Assert.dismissesWhenLosingFocus({
                overlay: appBar,
                focusTo: outsideAppBar
            }).then(complete);
        };

        testRemainsVisibleWhenMovingFocusInternally = function (complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
            "</div>";
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"));
            OverlayHelpers.Assert.remainsVisibleWhenMovingFocusInternally({
                overlay: appBar,
                focusFrom: appBar.getCommandById("Button0").element,
                focusTo: appBar.getCommandById("Button1").element
            }).then(complete);
        };



        testMoveFocusFromMenuToAppBar = function (complete) {
            createMenuInAppBar().then(function () {
                var root = document.querySelector("#appBarDiv");
                var appBar = root.querySelector("#appBar").winControl;
                var menu = root.querySelector("#myMenu").winControl;
                var button1 = appBar.getCommandById("Button1").element;

                Helper.focus(button1).then(function () {
                    LiveUnit.Assert.areEqual(button1, document.activeElement, "button1 should have focus");
                    LiveUnit.Assert.isTrue(menu.hidden, "Menu should have dismissed when losing focus");
                    LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should have remained visible when moving focus from the menu to the AppBar");

                    complete();
                });
            });
        };

        testFocusLeavesMenuAndAppBar = function (complete) {
            createMenuInAppBar().then(function () {
                var root = document.querySelector("#appBarDiv");
                var outsideAppBar = root.querySelector("#outsideAppBar");
                var appBar = root.querySelector("#appBar").winControl;
                var menu = root.querySelector("#myMenu").winControl;

                Helper.focus(outsideAppBar).then(function () {
                    LiveUnit.Assert.areEqual(outsideAppBar, document.activeElement, "Focus should have moved outside of the AppBar");
                    LiveUnit.Assert.isTrue(menu.hidden, "Menu should have dismissed when losing focus");
                    LiveUnit.Assert.isTrue(appBar.hidden, "AppBar should have dismissed when losing focus");

                    complete();
                });
            });
        };

        testChangingLayoutsPreservesAppBarCommands = function (complete) {
            // Verify that:
            // A) Switching from custom layout, to commands layout, and back to custom again, restores the AppBarCommands
            //  that were in the AppBar, back to the AppBar DOM in the same order that the custom layout AppBar DOM had
            //  them in originally.
            // B) Changing layouts does not dispose the commands

            var root = document.getElementById("appBarDiv");
            var appBarElement = document.createElement("DIV");

            function verifyCommandsOrderInDOM(appBarEl) {
                var commands = appBarEl.querySelectorAll(".win-command");
                LiveUnit.Assert.areEqual("Button0", commands[0].id);
                LiveUnit.Assert.areEqual("Button1", commands[1].id);
                LiveUnit.Assert.areEqual("Hr0", commands[2].id);
            }
            function verifyCommandsNotDisposed(appBarEl) {
                var commands = appBarEl.querySelectorAll(".win-command");
                for (var i = 0, len = commands.length; i < len; i++) {
                    LiveUnit.Assert.isFalse(commands[i].winControl._disposed);
                }
            }

            // Custom layout AppBar won't process commands automatically during construction
            // Create and process AppBar child elements now.
            appBarElement.appendChild(new WinJS.UI.AppBarCommand(null, { id: 'Button0', label: 'Button 0', section: 'primary' }).element);
            appBarElement.appendChild(document.createElement("INPUT")); // Not an AppBarCommand, so not expected to get restored.
            appBarElement.appendChild(new WinJS.UI.AppBarCommand(null, { id: 'Button1', label: 'Button 1', section: 'secondary' }).element);
            appBarElement.appendChild(new WinJS.UI.AppBarCommand(null, { id: 'Hr0', type: 'separator', hidden: true, section: 'primary' }).element);

            var appBar = new WinJS.UI.AppBar(appBarElement, { layout: "custom" });
            root.appendChild(appBar.element);

            // Make sure we are starting from a sane place.
            verifyCommandsOrderInDOM(appBar.element);
            verifyCommandsNotDisposed(appBar.element);
            LiveUnit.Assert.areEqual(appBar.layout, "custom", "AppBar should be using custom layout");

            appBar.layout = 'commands';
            appBar.layout = 'custom';
            verifyCommandsOrderInDOM(appBar.element);
            verifyCommandsNotDisposed(appBar.element);
            complete();
        };

        testNewCommandsSetOrderPeserveredAfterSwitchingLayouts = function (complete) {
            // Verify setting new commands while in commands layout, and then switching back to custom layout will leave the
            // new commands in the custom layout AppBar DOM in the same order they were initially passed to the commands
            // setter.
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Hr0\", type:\"separator\", hidden: true, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
            "</div>";
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"));

            var newCommands: any = [
                { id: 'Button2', label: 'Button 2', section: 'primary' },
                { id: 'HR1', type: 'separator', section: 'primary' },
                { id: 'Button3', label: 'Button 3', section: 'secondary' },
            ];

            appBar.commands = newCommands;

            // Switch to custom layout and verify commands were placed into the AppBar DOM
            // in the same order the setter received them in.
            appBar.layout = "custom";
            var commands:any = appBar.element.querySelectorAll(".win-command");
            LiveUnit.Assert.areEqual(newCommands[0].id, commands[0].id);
            LiveUnit.Assert.areEqual(newCommands[1].id, commands[1].id);
            LiveUnit.Assert.areEqual(newCommands[2].id, commands[2].id);

            complete();
        };

        testCommandsLayoutCleansUpAfterItself = function (complete) {
            // Verify that switching away from commands layout will remove the commandlayout class,
            // and any commands layout specific HTML from the AppBar element.
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"secondary\"}'></button>" +
            "</div>";
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"), { layout: 'commands' });

            // Make sure we start from a sane place and verify initial commands layout HTML.
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.commandLayoutClass), "Commands Layout AppBar should have the win-commandlayout CSS class");
            var layoutHTML = appBar.element.querySelectorAll(".win-primarygroup, .win-secondarygroup");
            LiveUnit.Assert.isTrue(layoutHTML.length === 2, "commands layout appbar should have its own HTML inside of the AppBar element.");

            appBar.layout = "custom";
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(appBar.element, _Constants.commandLayoutClass), "Custom Layout AppBar should not have the commands layout CSS class");
            layoutHTML = appBar.element.querySelectorAll(".win-primarygroup, .win-secondarygroup");
            LiveUnit.Assert.isTrue(layoutHTML.length === 0, "custom layout appbar should not have commands layout HTML inside of the AppBar element.");

            complete();
        };



        testShowAndHide_Indicators_DisplayModes_And_VisiblePositions = function (complete) {

            var topInitialCDM = 'none';
            var bottomInitialCDM = 'minimal';
            var topInitialPosition = displayModeVisiblePositions[topInitialCDM];
            var bottomInitialPosition = displayModeVisiblePositions[bottomInitialCDM];

            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='topBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Hr0\", type:\"separator\", hidden: true, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"secondary\"}'></button>" +
            "</div>" +
            "<div id='bottomBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button2\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button3\", label:\"Button 1\", type:\"button\", section:\"secondary\"}'></button>" +
            "<input type=\"range\" />" +
            "</div>";
            var topBar = new PrivateAppBar(<HTMLElement>root.querySelector("#topBar"), { placement: 'top', layout: 'commands', closedDisplayMode: topInitialCDM, sticky: true });
            var bottomBar = new PrivateAppBar(<HTMLElement>root.querySelector("#bottomBar"), { placement: 'bottom', layout: 'custom', closedDisplayMode: bottomInitialCDM, sticky: false });

            var verifyHiddenIndicators = function (expected, appBar, msg) {
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(expected, appBar.hidden, msg);
                LiveUnit.Assert.areEqual(expected, appBar._visiblePosition !== displayModeVisiblePositions.shown, msg);
            }

        var topBarShownAndHidden;
            var topBarShownAndHiddenPromise = new WinJS.Promise(function (c) {
                topBarShownAndHidden = c;
            });
            var bottomBarShownAndHidden;
            var bottomBarShownAndHiddenPromise = new WinJS.Promise(function (c) {
                bottomBarShownAndHidden = c;
            });

            var verifyShowing = function (evt) {
                var appBar = evt.target.winControl;
                appBar.removeEventListener("beforeshow", verifyShowing, false);

                msg = "AppBars that are showing should not show indications of being hidden."
            verifyHiddenIndicators(false, appBar, msg);

                msg = "AppBars that are showing should have the showing class"
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, "win-appbar-showing"), msg);

                msg = "AppBars that are showing should indicate their visible position is 'shown'";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual("shown", appBar._visiblePosition, msg);
            }

        var verifyShown = function (evt) {
                var appBar = evt.target.winControl;
                appBar.removeEventListener("aftershow", verifyShown, false);

                msg = "AppBars that are shown should not show indications of being hidden."
            verifyHiddenIndicators(false, appBar, msg);

                msg = "AppBars that are shown should have the shown class"
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, "win-appbar-shown"), msg);

                msg = "AppBars that are shown should indicate their visible position is 'shown'";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual("shown", appBar._visiblePosition, msg);

                appBar.hide();

            }

        var verifyHiding = function (evt) {
                var appBar = evt.target.winControl;
                appBar.removeEventListener("beforehide", verifyHiding, false);

                msg = "AppBars that are hiding should show indications of hiding."
            verifyHiddenIndicators(true, appBar, msg);

                msg = "AppBars that are hiding should have the hiding class"
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, "win-appbar-hiding"), msg);

                msg = "AppBars that are hiding via hide should indicate their visible position is their closedDisplayMode";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(displayModeVisiblePositions[appBar.closedDisplayMode], appBar._visiblePosition, msg);
            }

        var verifyHidden = function (evt) {
                var appBar = evt.target.winControl;
                appBar.removeEventListener("afterhide", verifyHidden, false);

                msg = "AppBars that are hidden should show indications of being hidden."
            LiveUnit.LoggingCore.logComment("Test: " + msg);
                verifyHiddenIndicators(true, appBar, msg);

                msg = "AppBars that are hidden should have the hidden class"
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, "win-appbar-hidden"), msg);

                msg = "AppBars that are hidden via hide should indicate their visible position is their closedDisplayMode";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(displayModeVisiblePositions[appBar.closedDisplayMode], appBar._visiblePosition, msg);

                // Signal ShownAndHidden promise completion.
                if (appBar.placement === 'top') {
                    topBarShownAndHidden();
                } else {
                    bottomBarShownAndHidden();
                }
            }

        var msg = "new AppBars should start out hidden"
        verifyHiddenIndicators(true, topBar, msg);
            verifyHiddenIndicators(true, bottomBar, msg);
            msg = "AppBars that are hidden should have the hidden class"
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(topBar.element, "win-appbar-hidden"), msg);
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(bottomBar.element, "win-appbar-hidden"), msg);

            msg = "new AppBars should have initial closedDisplayMode aHiddennd correct corresponding visible position";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(topInitialCDM, topBar.closedDisplayMode, msg);
            LiveUnit.Assert.areEqual(topInitialPosition, topBar._visiblePosition, msg);
            LiveUnit.Assert.areEqual(bottomInitialCDM, bottomBar.closedDisplayMode, msg);
            LiveUnit.Assert.areEqual(bottomInitialPosition, bottomBar._visiblePosition, msg);

            topBar.addEventListener("beforeshow", verifyShowing, false);
            topBar.addEventListener("aftershow", verifyShown, false);
            topBar.addEventListener("beforehide", verifyHiding, false);
            topBar.addEventListener("afterhide", verifyHidden, false);
            bottomBar.addEventListener("beforeshow", verifyShowing, false);
            bottomBar.addEventListener("aftershow", verifyShown, false);
            bottomBar.addEventListener("beforehide", verifyHiding, false);
            bottomBar.addEventListener("afterhide", verifyHidden, false);
            topBar.show();
            bottomBar.show();

            WinJS.Promise.join([topBarShownAndHiddenPromise, bottomBarShownAndHiddenPromise]).then(function () {
                // Both appbars after "afterhide".

                msg = "AppBar original closedDisplayModes and visible positions should not have changed after showing and hiding.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(topInitialCDM, topBar.closedDisplayMode, msg);
                LiveUnit.Assert.areEqual(bottomInitialCDM, bottomBar.closedDisplayMode, msg);
                LiveUnit.Assert.areEqual(topInitialPosition, topBar._visiblePosition, msg);
                LiveUnit.Assert.areEqual(bottomInitialPosition, bottomBar._visiblePosition, msg);

                complete();
            });

        };



        testPositionChangeScenarios = function (complete) {

            var verifyAppBarOpenAndLightDismiss = function (appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                verifyIsOpen(appBar);
                verifyLightDismissible(appBar);

                var shouldHaveInvokeButton = appBar.winControl.closedDisplayMode !== "none";
                if (shouldHaveInvokeButton) {
                    verifyHasInvokeButton(appBar);
                } else {
                    verifyNoInvokeButton(appBar);
                }

            }

        var verifyAppBarOpenAndSticky = function (appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                verifyIsOpen(appBar);
                verifyIsSticky(appBar);

                var shouldHaveInvokeButton = appBar.winControl.closedDisplayMode !== "none";
                if (shouldHaveInvokeButton) {
                    verifyHasInvokeButton(appBar);
                } else {
                    verifyNoInvokeButton(appBar);
                }

            }

        var verifyAppBarClosedMinimal = function (appBar) {
                appBar = appBar.element || appBar;
                LiveUnit.Assert.isNotNull(appBar.id, "Test Bug!! This test requires the AppBar element have an id.");

                var msg,
                    failures;

                // verify is closed
                msg = "Closed Minimal AppBar should be closed";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(appBar.winControl.hidden, msg);

                msg = "Closed Minimal AppBar should not be a tab stop";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeTabStop(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "Closed Minimal AppBar should be visible and take up space some space.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                // Closed Minimal AppBar should have InvokeButton.
                verifyHasInvokeButton(appBar);

                // Every all immediate children of the AppBar other than the invokeButton should not be displayed or be tabbable.
                var childrenMinusInvokeButton = document.body.querySelectorAll("#" + appBar.id + " > :not(.win-appbar-invokebutton)");
                msg = "Except for InvokeButton, children of Closed Minimal AppBar should not be visible or have dimensions.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(childrenMinusInvokeButton, true);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "Except for InvokeButton, children of Closed Minimal AppBar should not be tab stops";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeTabStop(childrenMinusInvokeButton, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                verifyHidden(appBar);
            }

        var verifyAppBarCompletelyHidden = function (appBar) {
                appBar = appBar.element || appBar;
                LiveUnit.Assert.isNotNull(appBar.id, "Test Bug!! This test requires the AppBar have a unique id.");

                // verify is closed
                msg = "Completely Hidden AppBar should be closed";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(appBar.winControl.hidden, msg);

                var msg = "Completely Hidden AppBar should not be visible or take up space";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                var failures = checkShouldBeDisplayNone(appBar, true);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "Completely Hidden AppBar should not be a tab stop"
            LiveUnit.LoggingCore.logComment("Test: " + msg);
                var failures = checkShouldBeTabStop(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "Subtree of Completely Hidden AppBar should not be tab stops"
            LiveUnit.LoggingCore.logComment("Test: " + msg);
                var subTree = appBar.querySelectorAll("*");
                var failures = checkShouldBeTabStop(subTree, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                verifyHidden(appBar);
            }

        var checkShouldBeDisplayNone = function (elements, shouldBeDisplayNone) {
                LiveUnit.Assert.areEqual(!!shouldBeDisplayNone, shouldBeDisplayNone, "Test Bug!! An explicit value boolean must be passed.");

                var filterFunction = function (element) {
                    var isDisplayNone = (getComputedStyle(element).display === "none");
                    return (shouldBeDisplayNone !== isDisplayNone);
                };
                return filterForFailures(elements, filterFunction);
            }

        var checkShouldBeTabStop = function (elements, shouldBeTabStop) {
                LiveUnit.Assert.areEqual(!!shouldBeTabStop, shouldBeTabStop, "Test Bug!! An explicit value boolean must be passed.");

                var filterFunction = function (element) {
                    var isFocusable = function (element) {
                        // First make sure it isn't already the active element.
                        // Firefox for example, doesn't clear focus when an element's display is set to "none".
                        element.blur();
                        element.focus();
                        return document.activeElement === element;
                    }
                var isTabStop = (element.tabIndex >= 0 && isFocusable(element));
                    return (shouldBeTabStop !== isTabStop);
                }
            return filterForFailures(elements, filterFunction);
            }

        var filterForFailures = function (elements, filterFunction) {

                if (!elements.length) {
                    elements = [elements];
                }

                // Assume elements is a node list generated from a querySelector, not a real Array.
                // Use the Array prototype to filter elements.
                var failures = Array.prototype.filter.call(elements, filterFunction);
                return failures;
            }

        function verifyIsOpen(appBar) {
                appBar = appBar.element || appBar

            var msg,
                    failures;

                msg = "Open AppBar should not be hidden";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isFalse(appBar.winControl.hidden, msg);

                msg = "Open AppBar should have dimensions";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "Content hosted by Open AppBar should have dimensions";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                var contents = appBar.querySelectorAll("*:not(.win-appbar-invokebutton):not(.win-finaldiv):not(.win-firstdiv)");
                failures = checkShouldBeDisplayNone(contents, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                // Verify appBar sub components are in proper DOM order.
                var firstDiv = appBar.querySelector(".win-firstdiv");
                var finalDiv = appBar.querySelector(".win-finaldiv");
                var invokeButton = appBar.querySelector(".win-appbar-invokebutton");
                var children = appBar.children;

                msg = "firstDiv should be first element in open AppBar";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(children[0].className, firstDiv.className, msg);

                msg = "finalDiv should be last element in open AppBar";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(children[children.length - 1].className, finalDiv.className, msg);

                msg = "invokeButton should be 2nd to last element in open AppBar";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(children[children.length - 2].className, invokeButton.className, msg);
            }

            var invokeButtonWidth = _Constants.appBarInvokeButtonWidth;
            function verifyHasInvokeButton(appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                var invokeButton = appBar.querySelector(".win-appbar-invokebutton");
                var invokeButtonSubTree = appBar.querySelectorAll(".win-appbar-invokebutton *");

                msg = "AppBar with 'minimal' closedDisplayMode should have InvokeButton TabStop.";
                failures = checkShouldBeTabStop(invokeButton, true);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "AppBar with 'minimal' closedDisplayMode should have visible InvokeButton with dimensions.";
                failures = checkShouldBeDisplayNone(invokeButton, false);
                LiveUnit.Assert.isFalse(failures.length, msg);
                failures = checkShouldBeDisplayNone(invokeButtonSubTree, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                if (appBar.winControl.layout === _Constants.appBarLayoutCommands) {
                    msg = "AppBar with commands layout & 'minimal' closedDisplayMode should reserve right padding that matches the width of the invokeButton";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areEqual(invokeButtonWidth, parseInt(getComputedStyle(appBar).paddingRight), msg);
                } else if (appBar.winControl.layout === _Constants.appBarLayoutCustom) {
                    msg = "AppBar with custom layout & 'minimal' closedDisplayMode should NOT reserve right padding for the invokeButton";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areNotEqual(invokeButtonWidth, parseInt(getComputedStyle(appBar).paddingRight), msg);
                } else {
                    LiveUnit.Assert.fail("Test expects 'custom' or 'commands' layout AppBar");
                }
            }

            function verifyNoInvokeButton(appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                var invokeButton = appBar.querySelector(".win-appbar-invokebutton");
                var invokeButtonSubTree = appBar.querySelectorAll(".win-appbar-invokebutton *");

                msg = "AppBar with 'none' closedDisplayMode should not have InvokeButton tab stop.";
                failures = checkShouldBeTabStop(invokeButton, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "AppBar with 'none' closedDisplayMode should not have visible InvokeButton with dimensions.";
                failures = checkShouldBeDisplayNone(invokeButton, true);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "AppBar with 'none' closedDisplayMode should not reserve right padding for invokeButton width";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areNotEqual(invokeButtonWidth, parseInt(getComputedStyle(appBar).paddingRight), msg);
            }

            function verifyIsSticky(appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                var firstDiv = appBar.querySelector(".win-firstdiv");
                var finalDiv = appBar.querySelector(".win-finaldiv");
                var clickEater = document.querySelector(".win-appbarclickeater");

                // Verify sticky properties.
                msg = "Sticky AppBar should be sticky";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(appBar.winControl.sticky, msg);

                if (firstDiv) {
                    // verify its not reachable by tabbing. No use trying to focus it as part of the test since it has a focusin handler that moves focus away.
                    msg = "firstDiv should not be reachable by tabbing";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.isTrue(firstDiv.tabIndex < 0, msg);
                }
                if (finalDiv) {
                    // verify its not reachable by tabbing. No use trying to focus it as part of the test since it has a focusin handler that moves focus away.
                    msg = "finalDiv should not be reachable by tabbing";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.isTrue(finalDiv.tabIndex < 0, msg);
                }
                if (clickEater) {
                    msg = "AppBar Clickeater should not have dimensions when AppBar is sticky";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    failures = checkShouldBeDisplayNone(clickEater, true);
                    LiveUnit.Assert.isFalse(failures.length, msg);
                }
            }

            function verifyLightDismissible(appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                var firstDiv = appBar.querySelector(".win-firstdiv");
                var finalDiv = appBar.querySelector(".win-finaldiv");
                var clickEater = document.querySelector(".win-appbarclickeater");

                // Verify light dismiss properties.
                msg = "Light dismiss AppBar should not be sticky";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isFalse(appBar.winControl.sticky, msg);

                msg = "Light dismiss html components should all be in the document.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isNotNull(firstDiv, msg);
                LiveUnit.Assert.isNotNull(finalDiv, msg);
                LiveUnit.Assert.isNotNull(clickEater, msg);

                var subTree = appBar.querySelector("*");
                var highestTabIndex = WinJS.Utilities._getHighestTabIndexInList(subTree);
                var lowestTabIndex = WinJS.Utilities._getLowestTabIndexInList(subTree);
                msg = "firstDiv in Light Dismiss AppBar should have the lowest tabIndex in the AppBar.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(lowestTabIndex, firstDiv.tabIndex, msg);
                msg = msg = "finalDiv in Light Dismiss AppBar should have the highest tabIndex in the AppBar.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(highestTabIndex, finalDiv.tabIndex, msg);

                msg = "AppBar clickeater should have dimensions when AppBar is light dismissible";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(clickEater, false);
                LiveUnit.Assert.isFalse(failures.length, msg);
            };

            function verifyHidden(appBar) {
                var msg = "Hidden AppBar should have cleaned up transforms applied by the hiding animation.";
                var NameOfTransformProperty = WinJS.Utilities._browserStyleEquivalents["transform"].scriptName;
                LiveUnit.Assert.isFalse(appBar.style[NameOfTransformProperty], msg);
            };

            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Hr0\", type:\"separator\", hidden: false, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"secondary\"}'></button>" +
            "</div>";
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"), { sticky: false });

            var msg = "Default AppBar should begin minimal.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            verifyAppBarClosedMinimal(appBar);

            msg = "Changing closedDisplayMode to 'none' while AppBar is closed should hide the AppBar completely.";
            waitForPositionChange(appBar, function () { appBar.closedDisplayMode = "none" }).then(function () {
                verifyAppBarCompletelyHidden(appBar);

                msg = "Disabling the AppBar should hide it completely.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                return waitForPositionChange(appBar, function () { appBar.disabled = true; });
            }).then(function () {
                    verifyAppBarCompletelyHidden(appBar);

                    msg = "Changing closedDisplayMode should not change the AppBar's visible position if the AppBar is disabled.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    return waitForPositionChange(appBar, function () { appBar.closedDisplayMode = "minimal"; });
                }).then(function () {
                    verifyAppBarCompletelyHidden(appBar);

                    msg = "Disabled AppBar should not open.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    return waitForPositionChange(appBar, function () { appBar.show(); });
                }).then(function () {
                    verifyAppBarCompletelyHidden(appBar);

                    msg = "When AppBar is re-enabled, it should remain closed and assume the visible position of its closedDisplayMode.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    return waitForPositionChange(appBar, function () { appBar.disabled = false; });
                }).then(function () {
                    verifyAppBarClosedMinimal(appBar);

                    msg = "Calling AppBar.show() on non sticky AppBar should open the AppBar and make it light dismissible.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    return waitForPositionChange(appBar, function () { appBar.show(); });
                }).then(function () {
                    verifyAppBarOpenAndLightDismiss(appBar);

                    msg = "Changing AppBar.sticky to true, on Open Light Dismissible AppBar, should change it to an Open sticky AppBar. ";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    appBar.sticky = true;

                    // We need to wait for the clickEatingDiv to hide, which is scheduled as a high priority job.
                    return new WinJS.Promise(function (signalComplete) {
                        WinJS.Utilities.Scheduler.schedule(function () {
                            verifyAppBarOpenAndSticky(appBar);
                            signalComplete();
                        }, WinJS.Utilities.Scheduler.Priority.idle);
                    });
                }).then(function () {

                    msg = "Changing closedDisplayMode on Open Sticky AppBar should not change its visible position.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    appBar.closedDisplayMode = "none";

                    // Nothing should have changed. Schedule a job on Idle and verify.
                    return new WinJS.Promise(function (signalComplete) {
                        WinJS.Utilities.Scheduler.schedule(function () {
                            verifyAppBarOpenAndSticky(appBar);
                            signalComplete();
                        }, WinJS.Utilities.Scheduler.Priority.idle);
                    });

                }).then(function () {

                    msg = "Changing AppBar.sticky to false, on Open sticky AppBar, should change it to an Open Light Dismissible AppBar. ";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    appBar.sticky = false;

                    // We need to wait for the clickEatingDiv to show, which is scheduled as a high priority job.
                    return new WinJS.Promise(function (signalComplete) {
                        WinJS.Utilities.Scheduler.schedule(function () {
                            verifyAppBarOpenAndLightDismiss(appBar);
                            signalComplete();
                        }, WinJS.Utilities.Scheduler.Priority.idle);
                    });

                }).then(function () {

                    msg = "Closing an AppBar whose closedDisplayMode is equal to 'none', should hide the AppBar completely";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    return waitForPositionChange(appBar, function () { appBar.hide(); });
                }).then(function () {
                    verifyAppBarCompletelyHidden(appBar);
                    complete();
                });
        };

        testInvokeButtonBehavior = function (complete) {
            // Verifies that triggering the invokeButton on any hidden AppBar will show All AppBars.
            // Verifies that triggering the invokeButton on any shown AppBar will hide all AppBars.

            var root = document.getElementById("appBarDiv");
            var topBar = new WinJS.UI.AppBar(null, { placement: 'top', commands: [{ label: 'top cmd', icon: 'add' }], closedDisplayMode: 'minimal' });
            var bottomBar = new WinJS.UI.AppBar(null, { placement: 'bottom', commands: [{ label: 'bottom cmd', icon: 'edit' }], closedDisplayMode: 'minimal', layout: 'custom' })
        root.appendChild(topBar.element);
            root.appendChild(bottomBar.element);

            function verifyShown(msg?) {
                var appBars = root.querySelector(".win-appbar");
                Array.prototype.map.call(appBars, function (appBar) {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar, _Constants.shownClass), msg);
                });
            }

            function verifyHidden(msg?) {
                var appBars = root.querySelector(".win-appbar");
                Array.prototype.map.call(appBars, function (appBar) {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar, _Constants.hiddenClass), msg);
                });
            }

            function testInvokeBehavior(trigger) {

                var triggerTestPromise = new WinJS.Promise(function (triggerTestComplete) {

                    // Sanity check that when we begin, all AppBars are hidden
                    verifyHidden();

                    trigger();
                    PrivateAppBar._appBarsSynchronizationPromise.then(function () {
                        verifyShown()

                    trigger();
                        return PrivateAppBar._appBarsSynchronizationPromise;
                    }).then(function () {
                            verifyHidden();

                    // Set up next scenario so that one bar is shown and one is hidden. trigger invoke on the shown bar to
                    // verify that both bars are hidden afterwards, ensuring that the invoke button behavior really is
                    // different than the Edgy event handler.
                    return waitForPositionChange(trigger.sourceAppBar, function () { trigger.sourceAppBar.show(); }).then(function () {
                                trigger();
                                return PrivateAppBar._appBarsSynchronizationPromise;
                            })
                }).then(function () {
                            verifyHidden();
                            triggerTestComplete();
                        });

                });

                return triggerTestPromise;
            }

            // Simulate click on invoke button.
            var click = function (appBar) {
                var trigger:any = function () {
                    Helper.click(appBar._invokeButton);
                };
                trigger.sourceAppBar = appBar;
                return trigger;
            }

        testInvokeBehavior(click(bottomBar)).
                then(function () { return testInvokeBehavior(click(topBar)); }).
                done(function () { complete(); });
        };

        testSingleAppBarLightDismissFocusWrapping = function (complete) {
            var root = document.getElementById("appBarDiv");
            var topBar = new WinJS.UI.AppBar(null, { placement: 'top', commands: [{ id: 'top1', icon: 'add' }, { id: 'top2', icon: 'edit' }, { id: 'top3', icon: 'camera' }], closedDisplayMode: 'none' });
            var bottomBar = new WinJS.UI.AppBar(null, { placement: 'bottom', commands: [{ id: 'bot1', icon: 'add' }, { id: 'bot2', icon: 'edit' }, { id: 'bot3', icon: 'camera' }], closedDisplayMode: 'none', layout: 'custom' });
            root.appendChild(topBar.element);
            root.appendChild(bottomBar.element);

            function performTest(appBar) {
                return new WinJS.Promise(function (promiseComplete) {

                    var children = appBar.element.children,
                        commands = appBar.element.querySelectorAll(".win-command"),
                        firstDiv,
                        finalDiv;

                    // Start out sane, hide all AppBars.
                    hideAllAppBars().then(function () {
                        return waitForPositionChange(appBar, function () { appBar.show(); });
                    }).then(function () {

                            firstDiv = children[0],
                            finalDiv = children[children.length - 1];

                            // Verify they are both reachable by tab key.
                            LiveUnit.Assert.isTrue(firstDiv.tabIndex >= 0);
                            LiveUnit.Assert.isTrue(finalDiv.tabIndex >= 0);

                            // Verify that focusing the firstDiv wraps focus around to the last AppBarCommand in the AppBar.
                            firstDiv.focus();
                            return WinJS.Promise.timeout(0);
                        }).then(function () {
                            LiveUnit.Assert.areEqual((<HTMLElement>document.activeElement).id, commands[commands.length - 1].id);

                            // Verify that focusing the firstDiv wraps focus around to the last AppBarCommand in the AppBar.
                            finalDiv.focus();
                            return WinJS.Promise.timeout(0);
                        }).then(function () {
                            LiveUnit.Assert.areEqual((<HTMLElement>document.activeElement).id, commands[0].id);
                            promiseComplete();
                        });
                });
            };

            performTest(topBar).then(function () {
                return performTest(bottomBar);
            }).then(complete);
        };

        testLightDismissFocusWrappingBetweenAppBars = function (complete) {

            // Test that focus wraps from one bar to the next, whenever more than one appbar is open and at least one of them is non sticky.

            var root = document.getElementById("appBarDiv");
            var topBar = new WinJS.UI.AppBar(null, { placement: 'top', commands: [{ id: 'top1', icon: 'add' }, { id: 'top2', icon: 'edit' }, { id: 'top3', icon: 'camera' }], closedDisplayMode: 'none', sticky: false });
            var bottomBar = new WinJS.UI.AppBar(null, { placement: 'bottom', commands: [{ id: 'bot1', icon: 'add' }, { id: 'bot2', icon: 'edit' }, { id: 'bot3', icon: 'camera' }], sticky: false, closedDisplayMode: 'none', layout: 'custom' });
            root.appendChild(topBar.element);
            root.appendChild(bottomBar.element);

            function runTest(bar1, bar2) {
                return new WinJS.Promise(function (promiseComplete) {

                    var bar1Children = bar1.element.children,
                        bar1Commands = bar1.element.querySelectorAll('.win-command'),
                        bar1FirstDiv,
                        bar1FinalDiv;

                    var bar2Children = bar2.element.children,
                        bar2Commands = bar2.element.querySelectorAll('.win-command'),
                        bar2FirstDiv,
                        bar2FinalDiv;

                    // Start out sane, show all appbars.
                    showAllAppBars().then(function () {

                        bar1FirstDiv = bar1Children[0];
                        bar1FinalDiv = bar1Children[bar1Children.length - 1];
                        bar2FirstDiv = bar2Children[0],
                        bar2FinalDiv = bar2Children[bar2Children.length - 1],

                        // Verify they are all reachable by tab key.
                        LiveUnit.Assert.isTrue(bar1FirstDiv.tabIndex >= 0);
                        LiveUnit.Assert.isTrue(bar1FinalDiv.tabIndex >= 0);
                        LiveUnit.Assert.isTrue(bar2FirstDiv.tabIndex >= 0);
                        LiveUnit.Assert.isTrue(bar2FinalDiv.tabIndex >= 0);

                        // Verify that focusing finalDiv in bar1 moves focus to the first command in bar2
                        bar1FinalDiv.focus();
                        return WinJS.Promise.timeout(0);
                    }).then(function () {
                            LiveUnit.Assert.areEqual((<HTMLElement>document.activeElement).id, bar2Commands[0].id);

                            // Verify that focusing firstDiv in bar2 moves focus to the last command in bar1
                            bar2FirstDiv.focus();
                            return WinJS.Promise.timeout(0);
                        }).then(function () {
                            LiveUnit.Assert.areEqual((<HTMLElement>document.activeElement).id, bar1Commands[bar1Commands.length - 1].id);

                            // Verify that focusing finalDiv in bar2 moves focus to the first command in bar1
                            bar2FinalDiv.focus();
                            return WinJS.Promise.timeout(0);
                        }).then(function () {
                            LiveUnit.Assert.areEqual((<HTMLElement>document.activeElement).id, bar1Commands[0].id);

                            // Verify that focusing firstDiv in bar1 moves focus to the last command in bar2
                            bar1FirstDiv.focus();
                            return WinJS.Promise.timeout(0);
                        }).then(function () {
                            LiveUnit.Assert.areEqual((<HTMLElement>document.activeElement).id, bar2Commands[bar2Commands.length - 1].id);
                            promiseComplete();
                        });
                });
            };

            runTest(topBar, bottomBar).then(function () {
                topBar.sticky = true;
                return runTest(topBar, bottomBar);
            }).then(function () {
                    topBar.sticky = false;
                    bottomBar.sticky = true;
                    return runTest(topBar, bottomBar);
                }).then(complete);
        };


        testAppBarDirection = function (complete) {

            // Verify element positions in LTR and RTL for commands layout and custom layout AppBars.

            var commandElements,
                commandsArgs = [
                    { type: 'button', section: 'secondary', label: 's1' },
                    { type: 'button', section: 'secondary', label: 's2' },
                    { type: 'button', section: 'primary', label: 'g1' },
                    { type: 'button', section: 'primary', label: 'g2' },
                ];

            var root = document.getElementById("appBarDiv");
            var topBar = new WinJS.UI.AppBar(null, { placement: 'top', commands: commandsArgs, closedDisplayMode: 'minimal', layout: 'commands' });
            var bottomBar = new WinJS.UI.AppBar(null, { placement: 'bottom', commands: commandsArgs, closedDisplayMode: 'minimal', layout: 'custom' });
            root.appendChild(topBar.element);
            root.appendChild(bottomBar.element);

            showAllAppBars().then(function () {

                var html = document.documentElement,
                    originalDir = html.dir,
                    RTL = "rtl",
                    LTR = "ltr";

                function runTest(appbar, direction) {
                    html.dir = direction;
                    commandElements = topBar.element.querySelectorAll(".win-command");

                    var currentElement = commandElements[0],
                        nextIndex = 1,
                        nextElement = commandElements[nextIndex];

                    // Verify AppBarCommands positioning
                    while (nextElement) {
                        var currentBoundingRect = currentElement.getBoundingClientRect(),
                            nextBoundingRect = nextElement.getBoundingClientRect();

                        if (direction === LTR) {
                            LiveUnit.Assert.isTrue(currentBoundingRect.left <= nextBoundingRect.left);
                            LiveUnit.Assert.isTrue(currentBoundingRect.right <= nextBoundingRect.right);
                        } else {
                            LiveUnit.Assert.isTrue(currentBoundingRect.left >= nextBoundingRect.left);
                            LiveUnit.Assert.isTrue(currentBoundingRect.right >= nextBoundingRect.right);
                        }

                        nextIndex++;
                        currentElement = nextElement;
                        nextElement = commandElements[nextIndex];
                    }
                }

                runTest(topBar, LTR);
                runTest(topBar, RTL);
                runTest(bottomBar, LTR);
                runTest(bottomBar, RTL);

                // Cleanup lang attribute
                html.dir = originalDir;
                complete();
            });
        };

        testBackClickEventTriggersLightDismiss = function (complete) {
            // Verifies that a shown, non sticky AppBar containing focus, will handle the WinJS.Application.backclick event and light dismiss itself.

            // Simulate
            function simulateBackClick() {
                backClickEvent = OverlayHelpers.createBackClickEvent();
                LiveUnit.Assert.isFalse(backClickEvent._winRTBackPressedEvent.handled);
                WinJS.Application.queueEvent(backClickEvent); // Fire the "backclick" event from WinJS.Application

                WinJS.Application.addEventListener("verification", verify, true);
                WinJS.Application.queueEvent({ type: 'verification' });
            };

            // Verify
            function verify() {
                LiveUnit.Assert.isTrue(backClickEvent._winRTBackPressedEvent.handled, "AppBar should have handled the 'backclick' event");
                LiveUnit.Assert.isTrue(appbar.hidden, "AppBar should be hidden by light dismiss");
                cleanup();
            };

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                // Application.stop() kills all listeners on the Application object.
                // Reset all global _Overlay eventhandlers to reattach our listener to the Application "backclick" event.
                WinJS.UI._Overlay._globalEventListeners.reset();
                complete();
            }

            // Setup
            WinJS.Application.start();
            var backClickEvent;

            var root = document.getElementById("appBarDiv");
            var appbar = new WinJS.UI.AppBar();
            root.appendChild(appbar.element);
            appbar.addEventListener("aftershow", simulateBackClick, false);
            appbar.show();
        };

        testLoneStickyAppBarDoesNotHandleBackClickEvent = function (complete) {
            // Verifies that a shown, sticky AppBar containing focus, WILL NOT handle the WinJS.Application 'backclick' event. nor will it light dismiss any AppBars,
            // if there are no light dismissible AppBars shown.

            // Simulate
            function simulateBackClick() {
                backClickEvent = OverlayHelpers.createBackClickEvent();
                LiveUnit.Assert.isFalse(backClickEvent._winRTBackPressedEvent.handled);
                WinJS.Application.queueEvent(backClickEvent); // Fire the "backclick" event from WinJS.Application

                WinJS.Application.addEventListener("verification", verify, true);
                WinJS.Application.queueEvent({ type: 'verification' });
            };

            // Verify
            function verify() {
                LiveUnit.Assert.isFalse(backClickEvent._winRTBackPressedEvent.handled, "A sticky AppBar by itself, should not handle the 'backclick' event.");
                LiveUnit.Assert.isFalse(stickyBar.hidden, "Sticky AppBar should not light dismiss");
                cleanup();
            };

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                // Application.stop() kills all listeners on the Application object.
                // Reset all global _Overlay eventhandlers to reattach our listener to the Application "backclick" event.
                WinJS.UI._Overlay._globalEventListeners.reset();
                complete();
            }

            // Setup
            WinJS.Application.start();
            var backClickEvent;

            var root = document.getElementById("appBarDiv");
            var stickyBar = new WinJS.UI.AppBar(null, { sticky: true });
            root.appendChild(stickyBar.element);

            stickyBar.addEventListener("aftershow", simulateBackClick, false);
            stickyBar.show();
        };

        testStickyAppBarDoesLightDismissOtherAppBarsWhenBackClickHappens = function (complete) {
            // Verifies that a shown, sticky AppBar containing focus, WILL handle the WinJS.Application 'backclick' event and light dismiss AppBars,
            // if there is at least one non-sticky AppBar shown.

            // Simulate
            function simulateBackClick() {
                backClickEvent = OverlayHelpers.createBackClickEvent();
                LiveUnit.Assert.isFalse(backClickEvent._winRTBackPressedEvent.handled);
                WinJS.Application.queueEvent(backClickEvent); // Fire the "backclick" event from WinJS.Application

                WinJS.Application.addEventListener("verification", verify, true);
                WinJS.Application.queueEvent({ type: 'verification' });
            };

            // Verify
            function verify() {

                LiveUnit.Assert.isTrue(backClickEvent._winRTBackPressedEvent.handled, "A shown, sticky AppBar contaning focus, should handle the 'backclick' event, if at least one non sticky AppBar was also shown.");
                LiveUnit.Assert.isFalse(stickyBar.hidden, "Sticky AppBar should not light dismiss");
                LiveUnit.Assert.isTrue(lightDismissibleBar.hidden, "non sticky AppBars should be hidden by light dismissal");
                cleanup();
            };

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                // Application.stop() kills all listeners on the Application object.
                // Reset all global _Overlay eventhandlers to reattach our listener to the Application "backclick" event.
                WinJS.UI._Overlay._globalEventListeners.reset();
                complete();
            }

            // Setup
            WinJS.Application.start();
            var backClickEvent;

            var root = document.getElementById("appBarDiv");
            var stickyBar = new WinJS.UI.AppBar(null, { sticky: true });
            var lightDismissibleBar = new WinJS.UI.AppBar(null);
            root.appendChild(stickyBar.element);
            root.appendChild(lightDismissibleBar.element);

            showAllAppBars().then(function () {
                stickyBar.element.focus();
                simulateBackClick();
            });

        };

        testMenuLayoutConstruction = function (complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", label:\"Separator\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button2\", label:\"Button 2\", type:\"button\", section:\"secondary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button3\", label:\"Button 3\", type:\"button\", section:\"secondary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button4\", label:\"Button 4\", type:\"toggle\", section:\"secondary\"}'></button>" +
            "</div>";
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"), {
                layout: "menu",
                placement: "top",
            });

            Helper.waitForEvent(appBar, "aftershow").then(function () {
                var toolbarEl = appBar.element.querySelector("." + Helper.Toolbar.Constants.controlCssClass);
                var toolbar = toolbarEl.winControl;

                LiveUnit.Assert.isNotNull(toolbarEl, "Toolbar element not found");
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass((<HTMLElement>toolbarEl).parentElement, "win-appbar-toolbarcontainer"));
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass((<HTMLElement>toolbarEl).parentElement.parentElement, "win-appbar-menu"));
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass((<HTMLElement>toolbarEl).parentElement.parentElement.parentElement, "win-appbar"));
                LiveUnit.Assert.areEqual(true, toolbar.inlineMenu, "Invalid inlineMenu toolbar configuration in the appbar");

                Helper.Toolbar.verifyMainActionVisibleCommandsLabels(toolbar, ["Button 0", "Separator", "Button 1"]);
                Helper.Toolbar.verifyOverflowAreaCommandsLabels(toolbar, ["Button 2", "Button 3", "Button 4"]);

                complete();
            });
            appBar.show();
        }

        testCommandsLayoutUsingDeprecatedSectionsInCommandsLayout = function () {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 2\", type:\"button\", section:\"secondary\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 3\", type:\"button\", section:\"selection\"}'></button>" +
            "</div>";
            var appBar = new WinJS.UI.AppBar(<HTMLElement>root.querySelector("#appBar"), { layout: 'commands' });

            var primaryCommands = appBar.element.querySelectorAll(".win-primarygroup .win-command");
            var secondaryCommands = appBar.element.querySelectorAll(".win-secondarygroup .win-command");


            LiveUnit.Assert.areEqual(2, primaryCommands.length);
            LiveUnit.Assert.areEqual("Button 0", primaryCommands[0]["winControl"].label);
            LiveUnit.Assert.areEqual("Button 1", primaryCommands[1]["winControl"].label);

            LiveUnit.Assert.areEqual(2, secondaryCommands.length);
            LiveUnit.Assert.areEqual("Button 2", secondaryCommands[0]["winControl"].label);
            LiveUnit.Assert.areEqual("Button 3", secondaryCommands[1]["winControl"].label);
        }
    };
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.AppBarTests");
