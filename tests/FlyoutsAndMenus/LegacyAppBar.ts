// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.ToolBar.ts"/>
/// <reference path="OverlayHelpers.ts" />

module CorsicaTests {


    var PrivateLegacyAppBar = <typeof WinJS.UI.PrivateLegacyAppBar>WinJS.UI._LegacyAppBar;
    var AppBarCommand = <typeof WinJS.UI.PrivateCommand>WinJS.UI.AppBarCommand;

    var _LightDismissService = Helper.require("WinJS/_LightDismissService");
    var _Constants;
    var _ToolBarConstants;
    var _element;
    WinJS.Utilities._require(["WinJS/Controls/_LegacyAppBar/_Constants"], function (constants) {
        _Constants = constants;
    })
    WinJS.Utilities._require(["WinJS/Controls/ToolBar/_Constants"], function (constants) {
        _ToolBarConstants = constants;
    })

    "use strict";

    function asyncOpen(appbar: WinJS.UI.PrivateLegacyAppBar): WinJS.Promise<any> {
        return new WinJS.Promise(function (c, e, p): void {
            function afterShow(): void {
                appbar.removeEventListener("afteropen", afterShow, false);
                c();
            };
            appbar.addEventListener("afteropen", afterShow, false);
            appbar.open();
        });
    };

    var Key = WinJS.Utilities.Key;

    // Creates a WinJS Menu within an AppBar, opens them both, and then gives focus to the Menu.
    // Returns a promise which completes when the AppBar and Menu controls are in this state.
    function createMenuInAppBar() {
        return new WinJS.Promise(function (complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<button id='outsideAppBar'>outsideAppBar</button>" +
            "<div id='appBar' data-win-control='WinJS.UI._LegacyAppBar'>" +
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

                asyncOpen(appBar).then(function () {
                    LiveUnit.Assert.isTrue(appBar.element.contains(document.activeElement), "Focus should initially be within the AppBar");
                    LiveUnit.Assert.isTrue(appBar.opened, "AppBar should initially be visible");

                    return Helper.waitForFocus(menu.element, function () { menuButton.click() })
                }).then(function () {
                        LiveUnit.Assert.isTrue(menu.element.contains(document.activeElement), "After opening the menu, focus should be within it");
                        LiveUnit.Assert.isFalse(menu.hidden, "Menu should be visible");
                        LiveUnit.Assert.isTrue(appBar.opened, "AppBar should have remained visible when opening a menu within it");

                        return Helper.focus(menuItemB);
                    }).then(function () {
                        LiveUnit.Assert.areEqual(menuItemB, document.activeElement, "MenuB should have focus");
                        LiveUnit.Assert.isFalse(menu.hidden, "Menu should have remained visible");
                        LiveUnit.Assert.isTrue(appBar.opened, "AppBar should have remained visible when moving focus within the menu");

                        complete();
                    });
            });
        });
    }

    var displayModeVisiblePositions = {
        none: "hidden",
        hidden: "hidden",
        minimal: "minimal",
        compact: "compact",
        shown: "shown",
    }

    function waitForPositionChange(appBar, changePosition) {
        return new WinJS.Promise(function (complete) {
            appBar._afterPositionChangeCallBack = complete;
            changePosition();
        });
    }


    function hideAllAppBars() {
        var AppBars = document.querySelectorAll(".win-navbar");
        AppBars = Array.prototype.map.call(AppBars, function (AppBar) { return AppBar.winControl; });
        return WinJS.UI._Overlay._hideAppBars(AppBars);
    };

    function showAllAppBars() {
        var AppBars = document.querySelectorAll(".win-navbar");
        AppBars = Array.prototype.map.call(AppBars, function (AppBar) { return AppBar.winControl; });
        return WinJS.UI._Overlay._showAppBars(AppBars);
    }

    export class LegacyAppBarTests {


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
        }

        // Test AppBar Instantiation
        testAppBarInstantiation() {
            var AppBar = new PrivateLegacyAppBar(_element, { commands: { type: 'separator', id: 'sep' } });
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

            verifyFunction("open");
            verifyFunction("close");
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
        }
    //testAppBarInstantiation["Description"] = "Test AppBar instantiation + function presence";

        // Test AppBar Instantiation with null element
        testAppBarNullInstantiation() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with null element");
            var AppBar = new PrivateLegacyAppBar(null, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a null AppBar element.");
        }
    //testAppBarNullInstantiation["Description"] = "Test AppBar Instantiation with null AppBar element";

        // Test AppBar Instantiation with no options
        testAppBarEmptyInstantiation () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with empty constructor");
            var AppBar = new PrivateLegacyAppBar();
            LiveUnit.Assert.isNotNull(AppBar.element, "AppBar.element is null");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a Empty AppBar element.");
        }
    //testAppBarEmptyInstantiation["Description"] = "Test AppBar Instantiation with Empty AppBar element";

        // Test multiple instantiation of the same AppBar DOM element
        testAppBarMultipleInstantiation() {
            LegacyAppBarTests.prototype.testAppBarMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            var AppBar = new PrivateLegacyAppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            var error;
            try {
                new PrivateLegacyAppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            } catch (e) {
                error = e;
            } finally {
                throw error;
            }
        }
        //testAppBarMultipleInstantiation["Description"] = "Test AppBar Duplicate Instantiation with same DOM element";


        // Test AppBar parameters
        testAppBarParams() {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBar using good parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                var options = { commands: { type: 'separator', id: 'sep' } };
                options[paramName] = value;
                document.body.appendChild(div);
                var AppBar = new PrivateLegacyAppBar(div, options);
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
                    new PrivateLegacyAppBar(div, options);
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

            LiveUnit.LoggingCore.logComment("Testing element");
        }
    //testAppBarParams["Description"] = "Test initializing a AppBar with good and bad initialization options";

        testDefaultAppBarParameters() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var AppBar = new PrivateLegacyAppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(_element, AppBar.element, "Verifying that element is what we set it with");
            LiveUnit.Assert.areEqual("bottom", AppBar.placement, "Verifying that position is 'bottom'");
            LiveUnit.Assert.areEqual("custom", AppBar._layout, "Verifying that _layout is 'custom'");
            LiveUnit.Assert.isFalse(AppBar.opened, "Verifying that opened is false");
            LiveUnit.Assert.areEqual(AppBar.closedDisplayMode, displayModeVisiblePositions.compact, "Verifying closedDisplayMode is compact");
        }
    //testDefaultAppBarParameters["Description"] = "Test default AppBar parameters";

        // Simple Function Tests
        testSimpleAppBarTestsFunctions() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var AppBar = new PrivateLegacyAppBar(_element, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("hide");
            AppBar.close();

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
            AppBar.open();
            AppBar.close();
        }
    //testSimpleAppBarTestsFunctions["Description"] = "Test default overlay parameters";

        testAppBarDispose() {
            var abc1 = new AppBarCommand(document.createElement("button"), { label: "abc1" });
            var abc2 = new AppBarCommand(document.createElement("button"), { label: "abc2" });

            var ab = new PrivateLegacyAppBar(null, { commands: [abc1, abc2] });
            ab._updateFirstAndFinalDiv();
            LiveUnit.Assert.isTrue(ab.dispose);
            LiveUnit.Assert.isFalse(ab._disposed);
            LiveUnit.Assert.isFalse(ab._layoutImpl._disposed);

            ab.dispose();
            LiveUnit.Assert.isTrue(ab._disposed);
            LiveUnit.Assert.isTrue(abc1._disposed);
            LiveUnit.Assert.isTrue(abc2._disposed);
            LiveUnit.Assert.isTrue(ab._layoutImpl._disposed);
            ab.dispose();
        }
    //testAppBarDispose["Description"] = "Unit test for dispose requirements.";

        testAppBarThrowsWhenPlacementIsSetAndAppBarVisible() {
            LegacyAppBarTests.prototype.testAppBarThrowsWhenPlacementIsSetAndAppBarVisible["LiveUnit.ExpectedException"] = {
                message: "Invalid argument: The placement property cannot be set when the AppBar is visible, call hide() first"
            }
            var AppBar = new PrivateLegacyAppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.open();
            AppBar.placement = "true";
        }

        testSynchronousShowHide(complete) {
            var htmlString =
                "<div data-win-control='WinJS.UI._LegacyAppBar'>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
                "</div>";

            _element.innerHTML = htmlString;
            WinJS.UI.processAll().
                then(function () {
                    var appbar = document.querySelector(".win-navbar").winControl;
                    appbar.open();
                    appbar.close();
                    appbar.open();

                    return Helper.waitForEvent(appbar, "afteropen");
                }).
                done(complete);
        }

        xtestCommandsLayoutKeyboarding(complete) { // TODO delete entirely or migrate into commanding surface tests. 
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

            // Using commands _layout, since this keyboarding logic is validated in the menu _layout on ToolBar unit tests.
            var AppBar = new PrivateLegacyAppBar(_element, { _layout: "commands" });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.open();
            _element.addEventListener('afteropen', function () {

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
        }

        testFocusMovesBeforeAnimationEnds(complete) {
            var htmlString = "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>";

            _element.innerHTML = htmlString;
            var AppBar = new PrivateLegacyAppBar(_element, { _layout: 'custom' });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.open();

            var buttons = _element.querySelectorAll("button");
            var firstCmd = buttons[0],
                secondCmd = buttons[1];

            LiveUnit.Assert.areEqual(firstCmd, document.activeElement, "The focus should be on the first AppBarCommand");
            complete();
        }

        xtestKeyboardingInEmptyAppBar(complete) { // TODO delete entirely or migrate into commanding surface tests. 
            var AppBar = new PrivateLegacyAppBar(_element);
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.open();

            _element.addEventListener('afteropen', function () {

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
        }

        xtestCommandsLayoutKeyboardingWithContentCommands(complete) { // TODO delete entirely or migrate into commanding surface tests. 
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
            var AppBar = new PrivateLegacyAppBar(_element, { _layout: 'commands' });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.open();
            _element.addEventListener('afteropen', function () {
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
        }

        xtestCommandsLayoutMultiplePressesOFHomeAndEndKeys(complete) { // TODO delete entirely or migrate into commanding surface tests. 
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
            var AppBar = new PrivateLegacyAppBar(_element, { _layout: 'commands' });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
            AppBar.open();
            _element.addEventListener('afteropen', function () {
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
        }

        testDisposeRemovesAppBarClickEatingDiv(complete) {
            var appBar = new PrivateLegacyAppBar(document.getElementById("appBarDiv"));
            document.body.appendChild(appBar.element);
            appBar.open();
            
            appBar.addEventListener("afteropen", function () {
                var clickEater = <HTMLElement>document.querySelector("." + _LightDismissService._ClassNames._clickEater);
                LiveUnit.Assert.isTrue(clickEater);
                LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

                appBar.dispose();

                LiveUnit.Assert.isNull(document.querySelector("." + _LightDismissService._ClassNames._clickEater));
                complete();
            });
        }

        testDismissesWhenLosingFocus(complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<button id='outsideAppBar'>outsideAppBar</button>" +
            "<div id='appBar'>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"primary\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"primary\"}'></button>" +
            "</div>";
            var outsideAppBar = root.querySelector("#outsideAppBar");
            var appBar = new PrivateLegacyAppBar(<HTMLElement>root.querySelector("#appBar"));

            new WinJS.Promise(function (c) {
                asyncOpen(appBar).then(function () {
                    LiveUnit.Assert.isTrue(appBar.element.contains(<HTMLDivElement>document.activeElement), "Focus should initially be within the Overlay");
                    LiveUnit.Assert.isTrue(appBar.opened, "Overlay should initially be visible");

                    return Helper.focus(outsideAppBar);
                }).then(function () {
                        LiveUnit.Assert.areEqual(outsideAppBar, document.activeElement, "Focus should have moved outside of the Overlay");
                        LiveUnit.Assert.isTrue(!appBar.opened, "Overlay should have hid because it lost focus");
                        c();
                    });
            }).then(complete);
        }

        testRemainsVisibleWhenMovingFocusInternally(complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
            "<div id='appBar'>"
            "</div>";

            var commands = [
                new AppBarCommand(null, { id: "Button0", label: "Button 0", type: "button", section: "primary" }),
                new AppBarCommand(null, { type: "separator", section: "primary" }),
                new AppBarCommand(null, { id: "Button1", label: "Button 1", type: "button", section: "primary" }),
            ]

            var appBarEl = root.querySelector("#appBar");
            commands.forEach(function (cmd) {
                appBarEl.appendChild(cmd.element);
            })

            var appBar = new PrivateLegacyAppBar(<HTMLElement>appBarEl);
            return new WinJS.Promise(function (c) {
                var focusFrom = appBar.getCommandById("Button0").element;
                var focusTo = appBar.getCommandById("Button1").element;

                asyncOpen(appBar).then(function () {
                    LiveUnit.Assert.areEqual(focusFrom, document.activeElement, "Unexpected element initially has focus");
                    LiveUnit.Assert.isFalse(!appBar.opened, "Overlay should initially be visible");

                    return Helper.focus(focusTo);
                }).then(function () {
                        LiveUnit.Assert.areEqual(focusTo, document.activeElement, "Expected element didn't receive focus");
                        LiveUnit.Assert.isFalse(!appBar.opened, "Overlay should have remained visible when moving focus within it");

                        c();
                    });
            }).then(complete);
        }

        testMoveFocusFromMenuToAppBar(complete) {
            createMenuInAppBar().then(function () {
                var root = document.querySelector("#appBarDiv");
                var appBar: WinJS.UI.PrivateLegacyAppBar = root.querySelector("#appBar").winControl;
                var menu = root.querySelector("#myMenu").winControl;
                var button1 = appBar.getCommandById("Button1").element;

                Helper.focus(button1).then(function () {
                    LiveUnit.Assert.areEqual(button1, document.activeElement, "button1 should have focus");
                    LiveUnit.Assert.isTrue(menu.hidden, "Menu should have dismissed when losing focus");
                    LiveUnit.Assert.isTrue(appBar.opened, "AppBar should have remained open when moving focus from the menu to the AppBar");

                    complete();
                });
            });
        }

        testFocusLeavesMenuAndAppBar(complete) {
            createMenuInAppBar().then(function () {
                var root = document.querySelector("#appBarDiv");
                var outsideAppBar = root.querySelector("#outsideAppBar");
                var appBar: WinJS.UI.PrivateLegacyAppBar = root.querySelector("#appBar").winControl;
                var menu = root.querySelector("#myMenu").winControl;

                Helper.focus(outsideAppBar).then(function () {
                    LiveUnit.Assert.areEqual(outsideAppBar, document.activeElement, "Focus should have moved outside of the AppBar");
                    LiveUnit.Assert.isTrue(menu.hidden, "Menu should have dismissed when losing focus");
                    LiveUnit.Assert.isFalse(appBar.opened, "AppBar should have closed when losing focus");

                    complete();
                });
            });
        }

        testShowAndHide_Indicators_DisplayModes_And_VisiblePositions(complete) {

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
            var topBar = new PrivateLegacyAppBar(<HTMLElement>root.querySelector("#topBar"), { placement: 'top', _layout: 'commands', closedDisplayMode: topInitialCDM });
            var bottomBar = new PrivateLegacyAppBar(<HTMLElement>root.querySelector("#bottomBar"), { placement: 'bottom', _layout: 'custom', closedDisplayMode: bottomInitialCDM });

            var verifyHiddenIndicators = function (expected, appBar: WinJS.UI.PrivateLegacyAppBar, msg) {
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(expected, !appBar.opened, msg);
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
                appBar.removeEventListener("beforeopen", verifyShowing, false);

                msg = "AppBars that are showing should not show indications of being hidden."
            	verifyHiddenIndicators(false, appBar, msg);

                msg = "AppBars that are showing should have the showing class"
            	LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.showingClass), msg);

                msg = "AppBars that are showing should indicate their visible position is 'shown'";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual("shown", appBar._visiblePosition, msg);
            }

            var verifyShown = function (evt) {
				var appBar = evt.target.winControl;
				appBar.removeEventListener("afteropen", verifyShown, false);

				msg = "AppBars that are shown should not show indications of being hidden."
				verifyHiddenIndicators(false, appBar, msg);

				msg = "AppBars that are shown should have the shown class"
				LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.shownClass), msg);

				msg = "AppBars that are shown should indicate their visible position is 'shown'";
				LiveUnit.LoggingCore.logComment("Test: " + msg);
				LiveUnit.Assert.areEqual("shown", appBar._visiblePosition, msg);

				appBar.close();

			}

            var verifyHiding = function (evt) {
				var appBar = evt.target.winControl;
				appBar.removeEventListener("beforeclose", verifyHiding, false);

				msg = "AppBars that are hiding should show indications of hiding."
				verifyHiddenIndicators(true, appBar, msg);

				msg = "AppBars that are hiding should have the hiding class"
				LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.hidingClass), msg);

				msg = "AppBars that are hiding via hide should indicate their visible position is their closedDisplayMode";
				LiveUnit.LoggingCore.logComment("Test: " + msg);
				LiveUnit.Assert.areEqual(displayModeVisiblePositions[appBar.closedDisplayMode], appBar._visiblePosition, msg);
			}

            var verifyHidden = function (evt) {
				var appBar = evt.target.winControl;
				appBar.removeEventListener("afterclose", verifyHidden, false);

				msg = "AppBars that are hidden should show indications of being hidden."
				LiveUnit.LoggingCore.logComment("Test: " + msg);
				verifyHiddenIndicators(true, appBar, msg);

				msg = "AppBars that are hidden should have the hidden class"
				LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.hiddenClass), msg);

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

            var msg = "new AppBars should start out hidden";
            verifyHiddenIndicators(true, topBar, msg);
            verifyHiddenIndicators(true, bottomBar, msg);
            msg = "AppBars that are hidden should have the hidden class"
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(topBar.element, _Constants.hiddenClass), msg);
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(bottomBar.element, _Constants.hiddenClass), msg);

            msg = "new AppBars should have initial closedDisplayMode aHiddennd correct corresponding visible position";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(topInitialCDM, topBar.closedDisplayMode, msg);
            LiveUnit.Assert.areEqual(topInitialPosition, topBar._visiblePosition, msg);
            LiveUnit.Assert.areEqual(bottomInitialCDM, bottomBar.closedDisplayMode, msg);
            LiveUnit.Assert.areEqual(bottomInitialPosition, bottomBar._visiblePosition, msg);

            topBar.addEventListener("beforeopen", verifyShowing, false);
            topBar.addEventListener("afteropen", verifyShown, false);
            topBar.addEventListener("beforeclose", verifyHiding, false);
            topBar.addEventListener("afterclose", verifyHidden, false);
            bottomBar.addEventListener("beforeopen", verifyShowing, false);
            bottomBar.addEventListener("afteropen", verifyShown, false);
            bottomBar.addEventListener("beforeclose", verifyHiding, false);
            bottomBar.addEventListener("afterclose", verifyHidden, false);
            topBar.open();
            bottomBar.open();

            WinJS.Promise.join([topBarShownAndHiddenPromise, bottomBarShownAndHiddenPromise]).then(function () {
                // Both appbars after "afterclose".

                msg = "AppBar original closedDisplayModes and visible positions should not have changed after showing and hiding.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(topInitialCDM, topBar.closedDisplayMode, msg);
                LiveUnit.Assert.areEqual(bottomInitialCDM, bottomBar.closedDisplayMode, msg);
                LiveUnit.Assert.areEqual(topInitialPosition, topBar._visiblePosition, msg);
                LiveUnit.Assert.areEqual(bottomInitialPosition, bottomBar._visiblePosition, msg);

                complete();
            });

        }
        
        testPositionChangeScenarios(complete) {

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

            var verifyAppBarClosedMinimal = function (appBar) {
                appBar = appBar.element || appBar;
                LiveUnit.Assert.isNotNull(appBar.id, "Test Bug!! This test requires the AppBar element have an id.");

                var msg,
                    failures;

                // verify is closed
                msg = "Closed Minimal AppBar should be closed";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isFalse(appBar.winControl.opened, msg);

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

                // Now that we have verified the invoke button, ensure that all other immediate children are not displayed or tabbable.
                var childrenMinusInvokeButton = document.body.querySelectorAll("#" + appBar.id + " > :not(.win-navbar-invokebutton)");
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

        var verifyAppBarClosedCompact = function (appBar) {
                appBar = appBar.element || appBar;
                LiveUnit.Assert.isNotNull(appBar.id, "Test Bug!! This test requires the AppBar element have an id.");

                var msg,
                    failures;

                // verify is closed
                msg = "Closed Compact AppBar should be closed";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isFalse(appBar.winControl.opened, msg);

                msg = "Closed Compact AppBar should not be a tab stop";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeTabStop(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "Closed Compact AppBar should be visible and take up space some space.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                // Closed Compact AppBar should have InvokeButton.
                verifyHasInvokeButton(appBar);

                // Now that we have verified the invoke button, ensure that all other immediate children are not displayed or tabbable.
                var childrenMinusInvokeButton = document.body.querySelectorAll("#" + appBar.id + " > :not(.win-navbar-invokebutton)");
                msg = "Children of Closed Compact AppBar should be visible or have dimensions.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(childrenMinusInvokeButton, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                verifyHidden(appBar);

                var commands: any = appBar.querySelectorAll(".win-command");
                for (var i = 0, len = commands.length; i < len; i++) {
                    var labelEl = commands[i].querySelector(".win-label");
                    if (labelEl) {
                        LiveUnit.Assert.areEqual("none", getComputedStyle(labelEl).display, "Label should not be visible in closed compact mode");
                    }
                }
            };

            var verifyAppBarCompletelyHidden = function (appBar) {
                appBar = appBar.element || appBar;
                LiveUnit.Assert.isNotNull(appBar.id, "Test Bug!! This test requires the AppBar have a unique id.");

                // verify is closed
                msg = "Completely Hidden AppBar should be closed";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isFalse(appBar.winControl.opened, msg);

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

        var isWithinDisplayNone = function (element) {
            while (element && element !== document.body) {
                if (getComputedStyle(element).display === "none") {
                    return true;
                }
                element = element.parentNode;
            }
        };

        var checkShouldBeTabStop = function (elements, shouldBeTabStop) {
                LiveUnit.Assert.areEqual(!!shouldBeTabStop, shouldBeTabStop, "Test Bug!! An explicit value boolean must be passed.");

                var filterFunction = function (element) {
                var isTabStop = (!isWithinDisplayNone(element) && WinJS.Utilities.getTabIndex(element) >= 0);
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
                LiveUnit.Assert.isTrue(appBar.winControl.opened, msg);

                msg = "Open AppBar should have dimensions";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                failures = checkShouldBeDisplayNone(appBar, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                if (appBar.winControl._layoutImpl !== _Constants.appBarLayoutMenu) {
                    msg = "Content hosted by Open AppBar should have dimensions. Menu _layout can have hidden elements (e.g. leading/trailing separators)";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    var contents = appBar.querySelectorAll("*:not(.win-navbar-invokebutton):not(.win-finaldiv):not(.win-firstdiv)");
                    failures = checkShouldBeDisplayNone(contents, false);
                    LiveUnit.Assert.isFalse(failures.length, msg);
                }

                // Verify appBar sub components are in proper DOM order.
                var firstDiv = appBar.querySelector(".win-firstdiv");
                var finalDiv = appBar.querySelector(".win-finaldiv");
                var invokeButton = appBar.querySelector(".win-navbar-invokebutton");
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

                var invokeButton = appBar.querySelector(".win-navbar-invokebutton");
                if (appBar.winControl._layoutImpl === _Constants.appBarLayoutMenu &&
                    getComputedStyle(invokeButton).visibility === "hidden") {
                    invokeButton = appBar.querySelector("." + _ToolBarConstants.overflowButtonCssClass);
                }
                var invokeButtonSubTree = appBar.querySelectorAll(".win-navbar-invokebutton *");

                msg = "AppBar with closedDisplayMode !== 'none' should have InvokeButton TabStop.";
                failures = checkShouldBeTabStop(invokeButton, true);
                LiveUnit.Assert.isFalse(failures.length, msg);

                msg = "AppBar with closedDisplayMode !== 'none' should have visible InvokeButton with dimensions.";
                failures = checkShouldBeDisplayNone(invokeButton, false);
                LiveUnit.Assert.isFalse(failures.length, msg);
                failures = checkShouldBeDisplayNone(invokeButtonSubTree, false);
                LiveUnit.Assert.isFalse(failures.length, msg);

                if (appBar.winControl._layout === _Constants.appBarLayoutCommands) {
                    msg = "AppBar with commands _layout & closedDisplayMode !== 'none' should reserve right padding that matches the width of the invokeButton";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areEqual(invokeButtonWidth, parseInt(getComputedStyle(appBar).paddingRight), msg);
                } else if (appBar.winControl._layout === _Constants.appBarLayoutCustom || appBar.winControl._layout === _Constants.appBarLayoutMenu) {
                    msg = "AppBar with " + appBar.winControl._layoutImpl + " _layout & closedDisplayMode !== 'none' should NOT reserve right padding for the invokeButton";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areNotEqual(invokeButtonWidth, parseInt(getComputedStyle(appBar).paddingRight), msg);
                } else {
                    LiveUnit.Assert.fail("Test expects 'custom', 'menu' or 'commands' _layout AppBar");
                }
            }

            function verifyNoInvokeButton(appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                var invokeButton = appBar.querySelector(".win-navbar-invokebutton");
                var invokeButtonSubTree = appBar.querySelectorAll(".win-navbar-invokebutton *");

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

            function verifyLightDismissible(appBar) {
                appBar = appBar.element || appBar;

                var msg,
                    failures;

                var firstDiv = appBar.querySelector(".win-firstdiv");
                var finalDiv = appBar.querySelector(".win-finaldiv");
                var clickEater = document.querySelector("." + _LightDismissService._ClassNames._clickEater);

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

            var verifyPositionChangeScenarios = function (_layout) {
                var root = document.getElementById("appBarDiv");
                root.innerHTML =
                "<div id='appBar'>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"primary\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Hr0\", type:\"separator\", hidden: false, section:\"primary\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"secondary\"}'></button>" +
                "</div>";
                var appBar = new PrivateLegacyAppBar(<HTMLElement>root.querySelector("#appBar"), {
                    sticky: false,
                    _layout: _layout
                });

                var msg = "Default AppBar should begin compact.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                verifyAppBarClosedCompact(appBar);

                msg = "Changing closedDisplayMode to 'minimal' while AppBar is compact.";
                return waitForPositionChange(appBar, function () { appBar.closedDisplayMode = "minimal" }).then(function () {
                    verifyAppBarClosedMinimal(appBar);

                    msg = "Changing closedDisplayMode to 'none' while AppBar is closed should hide the AppBar completely.";
                    return waitForPositionChange(appBar, function () { appBar.closedDisplayMode = "none" });
                }).then(function () {

                        verifyAppBarCompletelyHidden(appBar);

                        msg = "Changing closedDisplayMode on closed AppBar should change the AppBar's visible position.";
                        LiveUnit.LoggingCore.logComment("Test: " + msg);
                        return waitForPositionChange(appBar, function () { appBar.closedDisplayMode = "minimal"; });
                    }).then(function () {
                        verifyAppBarClosedMinimal(appBar);

                        msg = "Calling AppBar.open() on non sticky AppBar should open the AppBar and make it light dismissible.";
                        LiveUnit.LoggingCore.logComment("Test: " + msg);
                        return waitForPositionChange(appBar, function () { appBar.open(); });
                    }).then(function () {
                        verifyAppBarOpenAndLightDismiss(appBar);

                        appBar.closedDisplayMode = "none";
                        msg = "Closing an AppBar whose closedDisplayMode is equal to 'none', should hide the AppBar completely";
                        LiveUnit.LoggingCore.logComment("Test: " + msg);
                        return waitForPositionChange(appBar, function () { appBar.close(); });
                    }).then(function () {
                        verifyAppBarCompletelyHidden(appBar);
                    });
            };
            verifyPositionChangeScenarios("custom").then(complete);
        }

        testInvokeButtonBehavior(complete) {
            // Verifies that triggering the invokeButton on a closed AppBar will open that AppBar.
            // Verifies that triggering the invokeButton on a opened AppBar will close that AppBar.

            var root = document.getElementById("appBarDiv");
            var appBar = new PrivateLegacyAppBar(null, { placement: 'bottom', commands: [{ label: 'bottom cmd', icon: 'edit' }], closedDisplayMode: 'minimal' })
            root.appendChild(appBar.element);

            var afterOpened = false;

            function verifyOpened(msg?) {
                afterOpened = true;
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.shownClass), msg);
            }

            function verifyClosed(msg?) {
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(appBar.element, _Constants.hiddenClass), msg);
            }

            appBar.onafteropen = function () {
                verifyOpened();
                Helper.click(appBar._invokeButton);
            }

            appBar.onafterclose = function () {
                LiveUnit.Assert.isTrue(afterOpened, "'afteropen' handler should have been called before 'afterclosed' handler")
                verifyClosed();
                complete();
            }

            // Sanity check that when we begin, all AppBars are hidden
            verifyClosed();
            Helper.click(appBar._invokeButton);
        }

        testSingleAppBarLightDismissFocusWrapping(complete) {
            var root = document.getElementById("appBarDiv");
            var topBar = new PrivateLegacyAppBar(null, { placement: 'top', commands: [{ id: 'top1', icon: 'add' }, { id: 'top2', icon: 'edit' }, { id: 'top3', icon: 'camera' }], closedDisplayMode: 'none' });
            var bottomBar = new PrivateLegacyAppBar(null, { placement: 'bottom', commands: [{ id: 'bot1', icon: 'add' }, { id: 'bot2', icon: 'edit' }, { id: 'bot3', icon: 'camera' }], closedDisplayMode: 'none' });
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
                        return waitForPositionChange(appBar, function () { appBar.open(); });
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
        }

        testAppBarDirection(complete) {

            // Verify element positions in LTR and RTL for commands _layout and custom _layout AppBars.

            var commandElements,
                commandsArgs = [
                    { type: 'button', section: 'secondary', label: 's1' },
                    { type: 'button', section: 'secondary', label: 's2' },
                    { type: 'button', section: 'primary', label: 'g1' },
                    { type: 'button', section: 'primary', label: 'g2' },
                ];

            var root = document.getElementById("appBarDiv");
            var topBar = new PrivateLegacyAppBar(null, { placement: 'top', commands: commandsArgs, closedDisplayMode: 'minimal' });
            root.appendChild(topBar.element);

            asyncOpen(topBar).then(function () {

                var html = document.documentElement,
                    RTL = "rtl",
                    LTR = "ltr";

                function runTest(appbar, direction) {
                    if (direction === LTR) {
                        document.documentElement.removeAttribute("lang");
                    } else {
                        document.documentElement.setAttribute("lang", "ar");
                    }
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

                // Cleanup lang attribute
                document.documentElement.removeAttribute("lang");
                complete();
            });
        }

        testBackClickEventTriggersLightDismiss(complete) {
            // Verifies that a shown, non sticky AppBar containing focus, will light dismiss due to backclick.

            // Simulate
            function simulateBackClick() {
                var handled = _LightDismissService._onBackClick();
                LiveUnit.Assert.isTrue(handled, "AppBar should have handled the 'backclick' event");
                LiveUnit.Assert.isFalse(appbar.opened, "AppBar should be closed by light dismiss");
                cleanup();
            };

            // Cleanup
            function cleanup() {
                appbar.dispose();
                complete();
            }

            // Setup
            var root = document.getElementById("appBarDiv");
            var appbar = new PrivateLegacyAppBar();
            root.appendChild(appbar.element);
            appbar.addEventListener("afteropen", simulateBackClick, false);
            appbar.open();
        }

        testChangingAppBarPlacementUpdatesElementPositionImmediately() {

            var root = document.getElementById("appBarDiv");
            var appBar = new PrivateLegacyAppBar(null, { placement: 'top' });
            root.appendChild(appBar.element);

            var oldRect: ClientRect,
                newRect: ClientRect,
                msg: string = "AppBar element should update position immediately after the AppBar placement property is changed.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            function verifyPositionChanged(oldRect: ClientRect, newRect: ClientRect) {
                LiveUnit.Assert.areNotEqual(oldRect.top, newRect.top, msg);
                LiveUnit.Assert.areNotEqual(oldRect.bottom, newRect.bottom, msg);
            }

            oldRect = appBar.element.getBoundingClientRect();
            appBar.placement = "bottom";
            newRect = appBar.element.getBoundingClientRect();
            verifyPositionChanged(oldRect, newRect);

            oldRect = newRect;
            appBar.placement = "top";
            newRect = appBar.element.getBoundingClientRect();
            verifyPositionChanged(oldRect, newRect);
        }

        xtestGetCommandById() { // TODO delete entirely or migrate into commanding surface tests. 
            var pairWiseOptions = {
                type: ['button', 'separator', 'toggle', 'flyout', 'content'],
                hidden: [true, false],
                section: ['primary', 'secondary', 'global', 'selection'],
            },
                commands = Helper.pairwise(pairWiseOptions).map(function (option, index) {
                    return new AppBarCommand(null, { id: "cmd" + index, type: option.type, hidden: option.hidden, section: option.section });
                }),
                root = document.getElementById("appBarDiv");

            ["custom", "commands", "menu"].forEach(function (_layout) {
                var appBar = new PrivateLegacyAppBar(null, { _layout: _layout, commands: commands });
                root.appendChild(appBar.element);

                commands.forEach(function (command, index) {
                    var retrievedCommand = appBar.getCommandById(command.id);
                    LiveUnit.Assert.isTrue(command === retrievedCommand, "AppBar with '" + _layout + "' _layout using 'getCommandById' failed to retrieve " +
                        "AppBarCommmand: { id: " + command.id + ", type: " + command.type + ", hidden: " + command.hidden + ", section: " + command.section + "}");
                });

            });
        }

        xtestAppBarMenuDoesNotResizeWhenCommandsAreFocused(complete) { // TODO delete entirely or migrate into commanding surface tests. 
            // Regression test: https://github.com/winjs/winjs/issues/859
            // Verifies that focusing a command in the AppBar overflow menu will not cause the overflow menu to change width.
            var name = "pCmd1",
                commands = [
                    new AppBarCommand(null, { id: name, label: name, section: "primary" })
                ];

            for (var i = 0; i < 10; - i++) { // Create enough secondary commands to force a scroll bar in the AppBar's overflow menu
                name = "sCmd" + i;
                commands.push(new AppBarCommand(null, { id: name, label: name, section: "secondary" }));
            }

            var root = document.getElementById("appBarDiv"),
                appBarEl = document.createElement("DIV");
            root.appendChild(appBarEl);

            var appBar = new PrivateLegacyAppBar(appBarEl, { _layout: 'menu', commands: commands }),
                appBarMenuElement = appBar.element.querySelector(".win-navbar-menu"),
                toolBarElement = appBarMenuElement.querySelector(".win-toolbar"),
                overFlowElement = toolBarElement.querySelector(".win-toolbar-overflowarea");

            LiveUnit.Assert.isNotNull(appBarMenuElement, "TEST ERROR: Test requires appBarMenuElement");
            LiveUnit.Assert.isNotNull(toolBarElement, "TEST ERROR: Test requires toolBarElement");
            LiveUnit.Assert.isNotNull(overFlowElement, "TEST ERROR: Test requires overFlowElement");

            asyncOpen(appBar).then(() => {

                var beforeFocus = {
                    menuWidth: getComputedStyle(appBarMenuElement).width,
                    toolBarWidth: getComputedStyle(toolBarElement).width,
                    overFlowWidth: getComputedStyle(overFlowElement).width
                };

                var secondaryElement = <HTMLElement>overFlowElement.querySelector("button.win-command");
                secondaryElement.focus();

                var afterFocus = {
                    menuWidth: getComputedStyle(appBarMenuElement).width,
                    toolBarWidth: getComputedStyle(toolBarElement).width,
                    overFlowWidth: getComputedStyle(overFlowElement).width
                };

                LiveUnit.Assert.areEqual(beforeFocus.menuWidth, afterFocus.menuWidth, "Focusing a secondary command element should not resize the AppBarMenu.");
                LiveUnit.Assert.areEqual(beforeFocus.toolBarWidth, afterFocus.toolBarWidth, "Focusing a secondary command element should not resize the ToolBar.");
                LiveUnit.Assert.areEqual(beforeFocus.overFlowWidth, afterFocus.overFlowWidth, "Focusing a secondary command element should not resize the OverFlowArea.");
                complete();
            });
        }      
    };
    
     var disabledTestRegistry = {
         testDismissesWhenLosingFocus: [Helper.Browsers.ie11, Helper.Browsers.chrome, Helper.Browsers.firefox],
         testMoveFocusFromMenuToAppBar: [Helper.Browsers.ie11, Helper.Browsers.chrome, Helper.Browsers.firefox],
         testRemainsVisibleWhenMovingFocusInternally: [Helper.Browsers.chrome, Helper.Browsers.firefox],
         testFocusLeavesMenuAndAppBar: [Helper.Browsers.ie11, Helper.Browsers.chrome, Helper.Browsers.firefox],
         testSingleAppBarLightDismissFocusWrapping: [Helper.Browsers.chrome, Helper.Browsers.firefox]
    };
    Helper.disableTests(LegacyAppBarTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.LegacyAppBarTests");
