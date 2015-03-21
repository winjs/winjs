// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="OverlayHelpers.ts" />

module CorsicaTests {

    "use strict";

    var _Constants = Helper.require("WinJS/Controls/_LegacyAppBar/_Constants"),
        Key = WinJS.Utilities.Key,
        MenuCommand = <typeof WinJS.UI.PrivateMenuCommand> WinJS.UI.MenuCommand,
        Menu = <typeof WinJS.UI.PrivateMenu> WinJS.UI.Menu,
        Flyout = <typeof WinJS.UI.PrivateFlyout> WinJS.UI.Flyout;

    function verifyAllCommandsDeactivated(commands: Array<WinJS.UI.PrivateMenuCommand>, msg: string = "") {
        commands.forEach((command) => {
            OverlayHelpers.Assert.verifyMenuFlyoutCommandDeactivated(command, msg);
        });
    }

    export class MenuTests {

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;
        }

        // Test Menu Instantiation
        testMenuInstantiation = function () {
            // Get the Menu element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu element");
            var menuElement = document.createElement('div');
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("Menu has been instantiated.");
            LiveUnit.Assert.isNotNull(menu, "Menu element should not be null when instantiated.");

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (menu[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from Menu");
                }

                LiveUnit.Assert.isNotNull(menu[functionName]);
                LiveUnit.Assert.isTrue(typeof (menu[functionName]) === "function", functionName + " exists on Menu, but it isn't a function");
            }

            verifyFunction("show");
            verifyFunction("hide");
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
            OverlayHelpers.disposeAndRemove(menuElement);
        }

        // Test Menu Instantiation with null element
        testMenuNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu with null element");
            var menu = new Menu(null, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.Assert.isNotNull(menu, "Menu instantiation was null when sent a null Menu element.");
        }

        // Test Menu Instantiation with no options
        testMenuEmptyInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu with empty constructor");
            var menu = new Menu();
            LiveUnit.Assert.isNotNull(menu, "Menu instantiation was null when sent a Empty Menu element.");
        }

        // Test multiple instantiation of the same Menu DOM element
        testMenuMultipleInstantiation() {
            MenuTests.prototype.testMenuMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            // Get the Menu element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu element");
            var menuElement = document.createElement('div');
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("Menu has been instantiated.");
            LiveUnit.Assert.isNotNull(menu, "Menu element should not be null when instantiated.");
            try {
                new Menu(menuElement, { commands: { type: 'separator', id: 'sep' } });
                LiveUnit.Assert.fail("Expected WinJS.UI.Menu.DuplicateConstruction exception");
            }
            finally {
                OverlayHelpers.disposeAndRemove(menuElement);
            }
        }

        // Test Menu parameters
        testMenuParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a Menu using good parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                var options = { commands: { type: 'separator', id: 'sep' } };
                options[paramName] = value;
                document.body.appendChild(div);
                var menu = new Menu(div, options);
                LiveUnit.Assert.isNotNull(menu);
                OverlayHelpers.disposeAndRemove(div);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a Menu using bad parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                document.body.appendChild(div);
                var options = { commands: { type: 'separator', id: 'sep' } };
                options[paramName] = value;
                try {
                    new Menu(div, options);
                    LiveUnit.Assert.fail("Expected creating Menu with " + paramName + "=" + value + " to throw an exception");
                } catch (e) {
                    var exception = e;
                    LiveUnit.LoggingCore.logComment(exception.message);
                    LiveUnit.Assert.isTrue(exception !== null);
                    LiveUnit.Assert.isTrue(exception.name === expectedName);
                    LiveUnit.Assert.isTrue(exception.message === expectedMessage);
                }
                OverlayHelpers.disposeAndRemove(div);
            }

            LiveUnit.LoggingCore.logComment("Testing anchor");
            testGoodInitOption("anchor", "ralph");
            testGoodInitOption("anchor", "fred");
            testGoodInitOption("anchor", -1);
            testGoodInitOption("anchor", 12);
            testGoodInitOption("anchor", {});
            LiveUnit.LoggingCore.logComment("Testing alignment");
            testGoodInitOption("alignment", "left");
            testGoodInitOption("alignment", "right");
            testGoodInitOption("alignment", "center");
            var badAlignment = "Invalid argument: Flyout alignment should be 'center' (default), 'left', or 'right'.";
            testBadInitOption("alignment", "fred", "WinJS.UI.Flyout.BadAlignment", badAlignment);
            testBadInitOption("alignment", -1, "WinJS.UI.Flyout.BadAlignment", badAlignment);
            testBadInitOption("alignment", 12, "WinJS.UI.Flyout.BadAlignment", badAlignment);
            testBadInitOption("alignment", {}, "WinJS.UI.Flyout.BadAlignment", badAlignment);
            LiveUnit.LoggingCore.logComment("Testing placement");
            testGoodInitOption("placement", "top");
            testGoodInitOption("placement", "bottom");
            testGoodInitOption("placement", "left");
            testGoodInitOption("placement", "right");
            testGoodInitOption("placement", "auto");
            testGoodInitOption("placement", "autohorizontal");
            testGoodInitOption("placement", "autovertical");
            var badPlacement = "Invalid argument: Flyout placement should be 'top' (default), 'bottom', 'left', 'right', 'auto', 'autohorizontal', or 'autovertical'.";
            testBadInitOption("placement", "fred", "WinJS.UI.Flyout.BadPlacement", badPlacement);
            testBadInitOption("placement", -1, "WinJS.UI.Flyout.BadPlacement", badPlacement);
            testBadInitOption("placement", 12, "WinJS.UI.Flyout.BadPlacement", badPlacement);
            testBadInitOption("placement", {}, "WinJS.UI.Flyout.BadPlacement", badPlacement);
        }

        testDefaultMenuParameters = function () {
            // Get the Menu element from the DOM
            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu element");
            var menu = new Menu(menuElement, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("Menu has been instantiated.");
            LiveUnit.Assert.isNotNull(menu, "Menu element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(menuElement, menu.element, "Verifying that element is what we set it with");
            LiveUnit.Assert.isTrue(menu.hidden, "Verifying that hidden is true");
            OverlayHelpers.disposeAndRemove(menuElement);
        }

        // Simple Function Tests
        testSimpleMenuTestsFunctions = function () {
            // Get the MenuTests element from the DOM
            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu element");
            var menu = new Menu(menuElement, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("Menu has been instantiated.");
            LiveUnit.Assert.isNotNull(menu, "Menu element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("show");
            menu.show(menuElement);

            LiveUnit.LoggingCore.logComment("hide");
            menu.hide();

            OverlayHelpers.disposeAndRemove(menuElement);
        }

        testMenuDispose = function () {
            var mc1 = new MenuCommand(document.createElement("button"), { label: "mc1" });
            var mc2 = new MenuCommand(document.createElement("button"), { label: "mc2" });

            var menu = new Menu(null, { commands: [mc1, mc2] });
            LiveUnit.Assert.isTrue(menu.dispose);
            LiveUnit.Assert.isFalse(menu._disposed);

            menu.dispose();
            LiveUnit.Assert.isTrue(menu._disposed);
            LiveUnit.Assert.isTrue(mc1._disposed);
            LiveUnit.Assert.isTrue(mc2._disposed);
            menu.dispose();
        }

        testMenuShowThrows = function (complete) {
            // Get the menu element from the DOM
            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the menu element");
            var menu: any = new Menu(menuElement);
            LiveUnit.LoggingCore.logComment("menu has been instantiated.");
            LiveUnit.Assert.isNotNull(menu, "menu element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("Calling show() with no parameters should throw");
            try {
                menu.show();
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Flyout anchor element not found in DOM.", e.message);
            }

            LiveUnit.LoggingCore.logComment("Calling show() with null should throw");
            try {
                menu.show(null);
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Flyout anchor element not found in DOM.", e.message);
            }
            OverlayHelpers.disposeAndRemove(menuElement);
            complete();
        }

        testBackClickEventTriggersLightDismiss = function (complete) {
            // Verifies that a shown Menu will handle the WinJS.Application.backclick event and light dismiss itself.

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
                LiveUnit.Assert.isTrue(backClickEvent._winRTBackPressedEvent.handled, "Menu should have handled the 'backclick' event");
                LiveUnit.Assert.isTrue(menu.hidden, "Menu should be hidden after light dismiss");
                cleanup();
            };

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                // Application.stop() kills all listeners on the Application object.
                // Reset all global _Overlay eventhandlers to reattach our listener to the Application "backclick" event.
                WinJS.UI._Overlay._globalEventListeners.reset();

                OverlayHelpers.disposeAndRemove(menuElement);
                complete();
            }

            // Setup
            WinJS.Application.start();
            var backClickEvent;

            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement);
            menu.addEventListener("aftershow", simulateBackClick, false);
            menu.show(document.body);
        };

        testEscapeKeyClosesMenu = function (complete) {
            // Verifies that ESC key hides a Menu

            function afterHide() {
                menu.removeEventListener, ("afterhide", afterHide, false);
                OverlayHelpers.disposeAndRemove(menuElement);
                complete();
            }

            // Get the menu element from the DOM
            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement, { anchor: document.body });

            menu.addEventListener("afterhide", afterHide, false);

            OverlayHelpers.show(menu).then(() => {
                var msg = "ESC key should hide the menu.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                Helper.keydown(menu.element, Key.escape);
            });
        };

        testShowAndHideMovesFocusWithoutWaitingForAnimationToComplete = function (complete) {
            // Verifies Menu.show and Menu.hide moves focus synchronously after beginning the animation.
            var button = document.createElement("button");
            document.body.appendChild(button);

            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement, { anchor: document.body });

            var msg = "",
                test1Ran = false,
                test2Ran = false;


            button.focus();
            LiveUnit.Assert.areEqual(document.activeElement, button, "TEST ERROR: button should have focus");

            function beforeShow() {
                menu.removeEventListener("beforeshow", beforeShow, false);
                WinJS.Promise.timeout(0).then(() => {
                    LiveUnit.Assert.areEqual(document.activeElement, menuElement, msg);
                    test1Ran = true;
                });
            };
            menu.addEventListener("beforeshow", beforeShow, false);

            function beforeHide() {
                menu.removeEventListener("beforehide", beforeHide, false);
                WinJS.Promise.timeout(0).then(() => {
                    LiveUnit.Assert.areEqual(document.activeElement, button, msg);
                    test2Ran = true;
                });
            }
            menu.addEventListener("beforehide", beforeHide, false);

            msg = "Menu.show should take focus synchronously after the 'beforeshow' event";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            OverlayHelpers.show(menu).then(() => {
                LiveUnit.Assert.isTrue(test1Ran, "TEST ERROR: Test 1 did not run.");

                msg = "Menu.show should take focus synchronously after the 'beforeshow' event";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                return OverlayHelpers.hide(menu);
            }).then(() => {
                    LiveUnit.Assert.isTrue(test2Ran, "TEST ERROR: Test 2 did not run.");

                    OverlayHelpers.disposeAndRemove(menuElement);
                    complete();
                });
        }

        testMenuLaysOutCommandsCorrectly = function (complete) {
            // Verifies that layout is adjusted for all visible commands in a menu depending on what other types of commands are also visible in the menu.
            // Command layouts should be updated during the following function calls:
            //  menu.show()
            //  menu.showCommands()
            //  menu.hideCommands()
            //  menu.showOnlyCommands()

            function verifyCommandLayouts() {
                // Helper function verifies that the visible commands found in the Menu DOM have the proper layouts
                var hasToggleCommand = false,
                    hasFlyoutCommand = false;

                var commandsInMenu = Array.prototype.map.call(menu.element.querySelectorAll(".win-command"), function getCommands(element) {
                    var command = element.winControl;
                    if (!command.hidden) {
                        if (command.type === _Constants.typeToggle) {
                            hasToggleCommand = true;
                        } else if (command.type === _Constants.typeFlyout) {
                            hasFlyoutCommand = true;
                        }
                    }
                    return command;
                });

                commandsInMenu.forEach(function verifyLayouts(menuCommand) {
                    if (menuCommand.type !== _Constants.typeSeparator) {
                        var toggleSpanStyle = getComputedStyle(menuCommand._toggleSpan);
                        var flyoutSpanStyle = getComputedStyle(menuCommand._flyoutSpan);

                        if (hasToggleCommand) {
                            LiveUnit.Assert.areNotEqual(toggleSpanStyle.display, "none",
                                "When a menu contains a visible toggle command, EVERY command should reserve extra width for the toggle span");
                            if (menuCommand.type === _Constants.typeToggle && menuCommand.selected) {
                                LiveUnit.Assert.areEqual(toggleSpanStyle.visibility, "visible");
                            } else {
                                LiveUnit.Assert.areEqual(toggleSpanStyle.visibility, "hidden");
                            }
                        } else {
                            LiveUnit.Assert.isTrue(toggleSpanStyle.display === "none",
                                "When a menu does not contain visible toggle commands, NO command should reserve space for the toggle span");
                        }

                        if (hasFlyoutCommand) {
                            LiveUnit.Assert.areNotEqual(flyoutSpanStyle.display, "none",
                                "When a menu contains a visible flyout command, EVERY command should reserve extra width for the flyout span");
                            if (menuCommand.type === _Constants.typeFlyout) {
                                LiveUnit.Assert.areEqual(flyoutSpanStyle.visibility, "visible");
                            } else {
                                LiveUnit.Assert.areEqual(flyoutSpanStyle.visibility, "hidden");
                            }
                        } else {
                            LiveUnit.Assert.isTrue(flyoutSpanStyle.display === "none",
                                "When a menu does not contain visible flyout commands, NO command should reserve space for the flyout span");
                        }
                    }
                });
            }

            function testCommandUpdates(commands: Array<WinJS.UI.PrivateMenuCommand>) {
                menu.showOnlyCommands(commands, false);
                verifyCommandLayouts();

                menu.hideCommands(commands);
                verifyCommandLayouts();

                menu.showCommands(commands);
                verifyCommandLayouts();
            };

            // commands
            var b1 = new MenuCommand(null, { type: 'button' }),
                t1 = new MenuCommand(null, { type: 'toggle', selected: true }),
                t2 = new MenuCommand(null, { type: 'toggle', selected: false }),
                f1 = new MenuCommand(null, { type: 'flyout' }),
                s1 = new MenuCommand(null, { type: 'separator' }),
                commands = [b1, t1, t2, f1, s1];

            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement, { commands: commands });

            function menu_onaftershow() {
                menu.removeEventListener("aftershow", menu_onaftershow, false);
                verifyCommandLayouts(); // MenuCommands should have correct layout when the Menu is shown.

                testCommandUpdates([]);
                testCommandUpdates([b1, t1, t2, f1, s1]);
                testCommandUpdates([b1, s1]);
                testCommandUpdates([b1, t1]);
                testCommandUpdates([t2, f1]);
                testCommandUpdates([b1, t2, f1, s1]);
                testCommandUpdates([b1, f1]);
                testCommandUpdates([t1, f1]);

                OverlayHelpers.disposeAndRemove(menuElement);
                complete();
            }

            menu.addEventListener("aftershow", menu_onaftershow, false);
            menu.show(menu.element);
        };

        testMenuHidesOnActionCommitted = function (complete) {
            // Whenever any 'button' or 'toggle' typed MenuCommand is invoked,
            // an action is considered to have been committed and the containing Menu should hide.

            var commandTypes = {
                button: "button",
                toggle: "toggle",
                separator: "separator",
                flyout: "flyout"
            };

            var asyncTest = (type: string) => {
                return new WinJS.Promise((c) => {

                    var menuElement = document.createElement('div');
                    document.body.appendChild(menuElement);
                    var menu = new Menu(menuElement, { anchor: document.body });
                    var command = new MenuCommand(null, { type: type });
                    menu.commands = [command];

                    function cleanUp() {
                        menu.onbeforehide = () => { };
                        OverlayHelpers.disposeAndRemove(menuElement);
                        c();
                    }

                    OverlayHelpers.show(menu).then(() => {
                        switch (command.type) {
                            case commandTypes.button:
                            case commandTypes.toggle:
                                menu.onbeforehide = () => {
                                    cleanUp();
                                }
                                    command._invoke();
                                break;

                            case commandTypes.separator:
                            case commandTypes.flyout:
                                menu.onbeforehide = () => {
                                    LiveUnit.Assert.fail("Menu should not hide when command of type '" + command.type + "' is invoked");
                                }
                                    command._invoke();
                                WinJS.Promise.timeout(0).then(cleanUp);
                                break;
                        }
                    });
                });
            };

            // Run a test for each commandType.
            Helper.Promise.forEach(Object.keys(commandTypes), asyncTest).done(complete);
        };

        testFocusChangeBetweenCommandDeactivatesFlyoutCommands = function (complete) {
            // Moving focus between commands in a Menu will deactivate any Flyout typed commands in the menu each time.
            // Menus will apply focus to MenuCommands on "mouseover" so this should verify the scenario where an
            // activated flyout command will deactivate when mousing over other commands in the Menu.

            var msg = "";

            var menuElement = document.createElement('div');
            menuElement.id = "menu";
            document.body.appendChild(menuElement);
            var menu = new Menu(menuElement, { anchor: document.body });

            var subMenuElement = document.createElement('div');
            subMenuElement.id = "subMenuElement";
            document.body.appendChild(subMenuElement);
            var subMenu = new Menu(subMenuElement);

            var subFlyoutElement = document.createElement('div');
            subFlyoutElement.id = "subFlyoutElement";
            document.body.appendChild(subFlyoutElement);
            var subFlyout = new Flyout(subFlyoutElement);

            var b1 = new MenuCommand(null, { id: 'buttonCmd', type: 'button' }),
                f1 = new MenuCommand(null, { id: 'subMenuCmd', type: 'flyout', flyout: subMenu }),
                f2 = new MenuCommand(null, { id: 'subFlyoutCmd', type: 'flyout', flyout: subFlyout });
            var commands = [b1, f1, f2];
            menu.commands = commands;

            OverlayHelpers.show(menu).then(() => {
                msg = "All commands should start out deactivated";
                LiveUnit.LoggingCore.logComment("Sanity Check: " + msg);
                verifyAllCommandsDeactivated(commands, msg);

                return MenuCommand._activateFlyoutCommand(f1);
            }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(f1, "TEST ERROR: command needs to be activated before continuing");

                    msg = "Focusing an activated 'flyout' typed command in a menu should leave it activated";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    f1.element.focus();
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(f1, msg);

                    msg = "Changing focus from an activated 'flyout' typed command in a Menu, to any other command in that Menu, should deactivate all commands.";
                    LiveUnit.LoggingCore.logComment("Test : " + msg);
                    f2.element.focus();
                    verifyAllCommandsDeactivated(commands, msg);

                    return MenuCommand._activateFlyoutCommand(f2);
                }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(f2, "TEST ERROR: command needs to be activated before continuing");

                    msg = "Changing focus from an activated 'flyout' typed command in a Menu, to any other command in that Menu, should deactivate all commands.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    b1.element.focus();
                    verifyAllCommandsDeactivated(commands, msg);

                    OverlayHelpers.disposeAndRemove(menuElement);
                    OverlayHelpers.disposeAndRemove(subMenuElement);
                    OverlayHelpers.disposeAndRemove(subFlyoutElement);
                    complete();
                });
        };

        testCommandsDeactivateWhenContainingMenuHides = function (complete) {
            // Verifies that hiding a Menu will deactivate any 'flyout' typed commands that it contains.
            var msg = "";

            var menu1Element = document.createElement('div');
            menu1Element.id = "menu1";
            document.body.appendChild(menu1Element);
            var menu1 = new Menu(menu1Element, { anchor: document.body });

            var menu2Element = document.createElement('div');
            menu2Element.id = "menu2";
            document.body.appendChild(menu2Element);
            var menu2 = new Menu(menu2Element);

            var menu3Element = document.createElement('div');
            menu3Element.id = "menu3";
            document.body.appendChild(menu3Element);
            var menu3 = new Menu(menu3Element);

            var c1 = new MenuCommand(null, { id: 'menu1Cmd', type: 'flyout', flyout: menu2 }),
                c2 = new MenuCommand(null, { id: 'menu2Cmd', type: 'flyout', flyout: menu3 }),
                c3 = new MenuCommand(null, { id: 'menu3Cmd', type: 'button' });

            menu1.commands = [c1];
            menu2.commands = [c2];
            menu3.commands = [c3];

            OverlayHelpers.show(menu1).then(() => {
                return MenuCommand._activateFlyoutCommand(c1);
            }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(c1, "TEST ERROR: command needs to be activated before continuing");
                    return MenuCommand._activateFlyoutCommand(c2);
                }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(c2, "TEST ERROR: command needs to be activated before continuing");

                    msg = "When a Menu is hidden, all of its 'flyout' typed MenuCommands should be deactivated";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                return OverlayHelpers.hide(menu2)
            }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandDeactivated(c2);

                    OverlayHelpers.disposeAndRemove(menu1Element);
                    OverlayHelpers.disposeAndRemove(menu2Element);
                    OverlayHelpers.disposeAndRemove(menu3Element);
                    complete();
                });
        };

        testParentMenuMovesFocusToSubMenuWhenActivatedMenuCommandIsFocused = function (complete) {
            // Verifies that when a Menu contains a 'flyout' typed MenuCommand that is already activated, and that MenuCommand recieves focus,
            // then the Menu should move focus onto the element of the MenuCommand's subMenu and all of the subMenu's 'flyout' typed commands
            // should be deactivated.
            // A real world scenario is a user mousing back into a parent or grandparent Menu across the activated MenuCommand in that Menu.
            // Mouseover on MenuCommands in a Menu, focuses that command, but when the MenuCommand is already activated we want to put focus
            // into that command's subMenu and let the cascade Manager close the subSubMenu + descendants.

            var msg = "";

            var parentMenuElement = document.createElement('div');
            parentMenuElement.id = "parentMenu";
            document.body.appendChild(parentMenuElement);
            var parentMenu = new Menu(parentMenuElement, { anchor: document.body });

            var subMenuElement = document.createElement('div');
            subMenuElement.id = "subMenu";
            document.body.appendChild(subMenuElement);
            var subMenu = new Menu(subMenuElement);

            var subSubMenuElement = document.createElement('div');
            subSubMenuElement.id = "subSubMenu";
            document.body.appendChild(subSubMenuElement);
            var subSubMenu = new Menu(subSubMenuElement);

            function afterSubSubMenuHide() {
                subSubMenu.removeEventListener("afterhide", afterSubSubMenuHide, false);

                OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(c1)
                OverlayHelpers.Assert.verifyMenuFlyoutCommandDeactivated(c2);
                LiveUnit.Assert.areEqual(document.activeElement, subMenu.element);

                OverlayHelpers.disposeAndRemove(parentMenuElement);
                OverlayHelpers.disposeAndRemove(subMenuElement);
                OverlayHelpers.disposeAndRemove(subSubMenuElement);
                complete();
            }
            subSubMenu.addEventListener("afterhide", afterSubSubMenuHide, false);

            var c1 = new MenuCommand(null, { id: 'c1', type: 'flyout', flyout: subMenu }),
                c2 = new MenuCommand(null, { id: 'c2', type: 'flyout', flyout: subSubMenu }),
                c3 = new MenuCommand(null, { id: 'c3', type: 'button' });

            parentMenu.commands = [c1];
            subMenu.commands = [c2];
            subSubMenu.commands = [c3];

            OverlayHelpers.show(parentMenu).then(() => {
                return MenuCommand._activateFlyoutCommand(c1);
            }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(c1, "TEST ERROR: command needs to be activated before continuing");
                    return MenuCommand._activateFlyoutCommand(c2);
                }).then(() => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(c2, "TEST ERROR: command needs to be activated before continuing");

                    msg = "Focusing an activated command in the Parent Menu should move focus to that commands subMenu and deactivate all 'flyout' commands in the subMenu";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    c1.element.focus();
                });
        };
    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.MenuTests");
