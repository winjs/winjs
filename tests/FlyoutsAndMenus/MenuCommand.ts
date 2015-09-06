// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="OverlayHelpers.ts" />

module CorsicaTests {

    "use strict";

    var MenuCommand = <typeof WinJS.UI.PrivateMenuCommand> WinJS.UI.MenuCommand,
        Menu = <typeof WinJS.UI.PrivateMenu> WinJS.UI.Menu,
        _Constants = Helper.require("WinJS/Controls/_LegacyAppBar/_Constants");

    function verifyPropertyChangeDeactivatesFlyoutMenuCommand(property: string, value: any, msg: string) {
        return new WinJS.Promise((c) => {
            var subMenuElement = document.createElement('div');
            document.body.appendChild(subMenuElement);
            var subMenu = new Menu(subMenuElement);

            var menuCommandElement = document.createElement('button');
            document.body.appendChild(menuCommandElement);
            var menuCommand = new MenuCommand(menuCommandElement, { type: 'flyout', flyout: subMenu });

            MenuCommand._activateFlyoutCommand(menuCommand).then(() => {

                subMenu.onafterhide = () => {
                    OverlayHelpers.Assert.verifyMenuFlyoutCommandDeactivated(menuCommand, msg);

                    subMenu.onafterhide = null;
                    OverlayHelpers.disposeAndRemove(subMenuElement);
                    OverlayHelpers.disposeAndRemove(menuCommandElement);
                    c();
                }
                menuCommand[property] = value;
            });
        });
    }

    export class MenuCommandTests {

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
        }

        // Test MenuCommand Instantiation
        testMenuCommandInstantiation = function () {
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommandElement = document.createElement('hr');
            document.body.appendChild(menuCommandElement);
            var menuCommand = new MenuCommand(menuCommandElement, { type: 'separator' });
            LiveUnit.LoggingCore.logComment("MenuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "MenuCommand element should not be null when instantiated.");
            OverlayHelpers.disposeAndRemove(menuCommandElement);

            // We have no functions
        }

        // Test MenuCommand Instantiation with null element
        testMenuCommandNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand with null element");
            var menuCommand = new MenuCommand(null, { type: 'separator' });
            LiveUnit.Assert.isNotNull(menuCommand, "MenuCommand instantiation was null when sent a null MenuCommand element.");
        }

        // Test multiple instantiation of the same MenuCommand DOM element
        testMenuCommandMultipleInstantiation() {
            MenuCommandTests.prototype.testMenuCommandMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommandElement = document.createElement('hr');
            document.body.appendChild(menuCommandElement);
            var menuCommand = new MenuCommand(menuCommandElement, { type: 'separator' });
            LiveUnit.LoggingCore.logComment("MenuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "MenuCommand element should not be null when instantiated.");
            try {
                new MenuCommand(menuCommandElement, { type: 'separator' });
                LiveUnit.Assert.fail("Expected WinJS.UI.MenuCommand.DuplicateConstruction exception");
            } finally {
                OverlayHelpers.disposeAndRemove(menuCommandElement);
            }
        }

        // Test MenuCommand parameters
        testMenuCommandParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a MenuCommand using good parameter " + paramName + "=" + value);
                var options = { type: 'button', label: 'test', icon: 'test.png' };
                options[paramName] = value;
                var menuCommand = new MenuCommand(null, options);
                LiveUnit.Assert.isNotNull(menuCommand);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a MenuCommand using bad parameter " + paramName + "=" + value);
                var options = { type: 'button', label: 'test', icon: 'test.png' };
                options[paramName] = value;
                try {
                    new MenuCommand(null, options);
                    LiveUnit.Assert.fail("Expected creating MenuCommand with " + paramName + "=" + value + " to throw an exception");
                } catch (e) {
                    LiveUnit.LoggingCore.logComment(e.message);
                    LiveUnit.Assert.isTrue(e !== null);
                    LiveUnit.Assert.isTrue(e.name === expectedName);
                    LiveUnit.Assert.isTrue(e.message === expectedMessage);
                }
            }

            LiveUnit.LoggingCore.logComment("Testing id");
            testGoodInitOption("id", "ralph");
            testGoodInitOption("id", "fred");
            testGoodInitOption("id", -1);
            testGoodInitOption("id", 12);
            testGoodInitOption("id", {});

            LiveUnit.LoggingCore.logComment("Testing type");
            testGoodInitOption("type", "button");
            testGoodInitOption("type", "flyout");
            testGoodInitOption("type", "toggle");
            testGoodInitOption("type", "separator");

            LiveUnit.LoggingCore.logComment("Testing label");
            testGoodInitOption("label", "test");
            testGoodInitOption("label", "a");
            testGoodInitOption("label", -1);
            testGoodInitOption("label", 12);
            testGoodInitOption("label", {});

            LiveUnit.LoggingCore.logComment("Testing flyout");
            testGoodInitOption("flyout", "test");
            testGoodInitOption("flyout", "");
            testGoodInitOption("flyout", "&#xE106;");
            testGoodInitOption("flyout", { id: "test" });
            testGoodInitOption("flyout", { uniqueId: "test" });
            testGoodInitOption("flyout", { element: { id: "test" } });
            testGoodInitOption("flyout", { element: { uniqueId: "test" } });

            LiveUnit.LoggingCore.logComment("Testing disabled");
            testGoodInitOption("disabled", true);
            testGoodInitOption("disabled", false);
            testGoodInitOption("disabled", -1);
            testGoodInitOption("disabled", "what");
            testGoodInitOption("disabled", {});

            LiveUnit.LoggingCore.logComment("Testing selected");
            testGoodInitOption("selected", true);
            testGoodInitOption("selected", false);
            testGoodInitOption("selected", -1);
            testGoodInitOption("selected", "what");
            testGoodInitOption("selected", {});

            // TODO: Still need to test click

            LiveUnit.LoggingCore.logComment("Testing element");
            //testBadInitOption("element", {}, WinJS.UI.MenuCommand.badElement);
        }

        testDefaultMenuCommandParameters = function () {
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommand = new MenuCommand(null, { label: 'test', icon: 'test.png' });
            LiveUnit.LoggingCore.logComment("menuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "menuCommand element should not be null when instantiated.");

            LiveUnit.Assert.isNotNull(menuCommand.element, "Verifying that element is not null");
            LiveUnit.Assert.areEqual("", menuCommand.id, "Verifying that id is empty string");
            LiveUnit.Assert.areEqual("button", menuCommand.type, "Verifying that type is 'button'");
            LiveUnit.Assert.areEqual("test", menuCommand.label, "Verifying that label is 'test'");
            //thisWinUI.menuCommand.badClick = "Invalid argument: The onclick property for an menuCommand must be a Function";
            //thisWinUI.menuCommand.badFlyout = "Invalid argument: The flyout property for an menuCommand must be a Flyout or String id of a Flyout";
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Verifying that disabled is false");
            LiveUnit.Assert.isFalse(menuCommand.hidden, "Verifying that hidden is false");
            LiveUnit.Assert.isFalse(menuCommand.selected, "Verifying that selected is false");
        }

        // Simple Property tests
        testSimpleMenuCommandProperties = function () {
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommand = new MenuCommand(null, { label: 'test', icon: 'test.png', type: 'toggle', extraClass: 'extra' });
            LiveUnit.LoggingCore.logComment("menuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "menuCommand element should not be null when instantiated.");
            // Verify initial state of toggle command.
            LiveUnit.Assert.areEqual("checkbox", menuCommand.element.getAttribute("role"),
                "Narrator requires 'checkbox' role in order to announce updates to the toggled state");
            LiveUnit.Assert.areEqual(false, menuCommand.selected, "Verifying that selected is false");
            LiveUnit.Assert.areEqual(menuCommand.selected.toString(), menuCommand.element.getAttribute("aria-checked"),
                "aria-checked should map to 'selected' state");

            // Cycle selected
            menuCommand.selected = true;
            LiveUnit.Assert.areEqual(true, menuCommand.selected, "Verifying that selected is true");
            LiveUnit.Assert.areEqual(menuCommand.selected.toString(), menuCommand.element.getAttribute("aria-checked"),
                "aria-checked should map to 'selected' state");
            menuCommand.selected = false;
            LiveUnit.Assert.areEqual(false, menuCommand.selected, "Verifying that selected goes back to false");
            LiveUnit.Assert.areEqual(menuCommand.selected.toString(), menuCommand.element.getAttribute("aria-checked"),
                "aria-checked should map to 'selected' state");

            // Cycle extra class
            LiveUnit.Assert.areEqual("extra", menuCommand.extraClass, "Verifying that extraClass is 'extra'");
            LiveUnit.Assert.isTrue(menuCommand.element.classList.contains("extra"), "Verifying that className is 'extra'");
            menuCommand.extraClass = "somethingElse";
            LiveUnit.Assert.areEqual("somethingElse", menuCommand.extraClass, "Verifying that extraClass is 'somethingElse");
            LiveUnit.Assert.isTrue(menuCommand.element.classList.contains("somethingElse"), "Verifying that className is 'somethingElse");
            menuCommand.extraClass = "another";
            LiveUnit.Assert.areEqual("another", menuCommand.extraClass, "Verifying that extraClass is 'another'");
            LiveUnit.Assert.isTrue(menuCommand.element.classList.contains("another"), "Verifying that className is 'another'");

            // Check flyout with empty id
            var fakeDomObject: any = { uniqueID: 'unique' };
            menuCommand.flyout = fakeDomObject;
            LiveUnit.Assert.areEqual("unique", fakeDomObject.id, "Verifying that id is set to 'unique' from uniqueID");
            LiveUnit.Assert.areEqual("unique", menuCommand.element.getAttribute("aria-owns"), "Verifying that aria-owns is set by flyout setter");
        }

        // Hidden Property tests
        testHiddenProperty = function () {
            LiveUnit.LoggingCore.logComment("Attempt to test hidden property on menucommand");
            // Get the Menu element from the DOM
            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu element");
            var menu = new Menu(menuElement, { commands: { id: 'cmdA' } });
            menu.hide();
            var cmd = menu.getCommandById("cmdA");
            cmd.hidden = true;
            LiveUnit.Assert.areEqual(true, cmd.hidden, "verify the command is now hidden");
            menu.show(menuElement);
            var result = false;
            try {
                cmd.hidden = false;
            } catch (err) {
                // we throw
                result = true;
            }
            OverlayHelpers.disposeAndRemove(menuElement);
            LiveUnit.Assert.areEqual(true, result, "verify the hidden property throw the exception");
        }

        // Tests for dispose members and requirements
        testMenuCommandDispose = function () {

            var menu = new Menu();
            LiveUnit.Assert.isFalse(menu._disposed);

            var button = document.createElement("button");
            var mc = <WinJS.UI.PrivateMenuCommand>new MenuCommand(button, { type: 'flyout', flyout: menu });
            LiveUnit.Assert.isTrue(mc.dispose);
            LiveUnit.Assert.isTrue(mc.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(mc._disposed);

            mc.dispose();
            LiveUnit.Assert.isTrue(mc._disposed);
            LiveUnit.Assert.isFalse(menu._disposed,
                "MenuCommands do not instantiate the flyout and are not responsible for disposing it.");
            mc.dispose();
        }

        // Tests that previous innerHTML is cleared when we instantiate a new button.
        testMenuCommandRemovesOldInnerHTML = function () {
            var button = document.createElement("button");
            button.innerHTML = "<div id='testMenuCommandRemovesOldInnerHTML'>";
            LiveUnit.Assert.isTrue(button.querySelector("#testMenuCommandRemovesOldInnerHTML"));
            var mc = new MenuCommand(button);
            LiveUnit.Assert.isFalse(button.querySelector("#testMenuCommandRemovesOldInnerHTML"), "MenuCommand buttons should lose previous innerHTML on control Instantiation");

        }

        // Tests that a Flyout MenuCommand activates and shows its associated flyout when invoked, and deactivates again when the associated flyout is hidden.
        testFlyoutCommandInvokeBehavior = function (complete) {
            var subMenuElement = document.createElement('div');
            document.body.appendChild(subMenuElement);
            var subMenu = new Menu(subMenuElement);

            var menuCommandElement = document.createElement('button');
            document.body.appendChild(menuCommandElement);
            var menuCommand = new MenuCommand(menuCommandElement, { type: 'flyout', flyout: subMenu });

            var msg = "Flyout MenuCommand should not appear activated by default";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(menuCommandElement, _Constants.menuCommandFlyoutActivatedClass), msg);

            msg = "subMenu should not have 'aria-expanded' attribute while closed";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.isFalse(subMenu.element.hasAttribute("aria-expanded"), msg);

            function afterSubMenuShow() {
                subMenu.removeEventListener("aftershow", afterSubMenuShow, false);
                OverlayHelpers.Assert.verifyMenuFlyoutCommandActivated(menuCommand, msg);

                msg = "subMenu should have 'aria-expanded' attribute with value === 'true' when opened by a menuCommand";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual("true", subMenu.element.getAttribute("aria-expanded"), msg);

                var msg = "Hiding a Flyout MenuCommand's associated flyout, by any means, should deactivate the MenuCommand."
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                subMenu.hide();
            };

            function afterSubMenuHide() {
                subMenu.removeEventListener("afterhide", afterSubMenuHide, false);
                OverlayHelpers.Assert.verifyMenuFlyoutCommandDeactivated(menuCommand, msg);

                msg = "subMenu should not have 'aria-expanded' attribute while closed";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isFalse(subMenu.element.hasAttribute("aria-expanded"), msg);

                OverlayHelpers.disposeAndRemove(subMenuElement);
                OverlayHelpers.disposeAndRemove(menuCommandElement);
                complete();
            };

            subMenu.addEventListener("aftershow", afterSubMenuShow, false);
            subMenu.addEventListener("afterhide", afterSubMenuHide, false);

            var msg = "Invoking a Flyout MenuCommand, by any means, should activate it and show its associated Flyout."
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            menuCommand._invoke();
        }


        // Tests that setting the hidden property, of an activated flyout MenuCommand to true, will deactivate it.
        testHiddenPropertyDeactivatesFlyoutCommands = function (complete) {
            var msg = "Setting the hidden property, of an activated flyout MenuCommand to true, should deactivate it.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            verifyPropertyChangeDeactivatesFlyoutMenuCommand("hidden", true, msg).then(complete);
        }

        // Tests that disabling an activated flyout MenuCommand will deactivate it.
        testDisabledPropertyDeactivatesFlyoutCommands = function (complete) {
            var msg = "Disabling an activated flyout MenuCommand should deactivate it.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            verifyPropertyChangeDeactivatesFlyoutMenuCommand("disabled", true, msg).then(complete);
        }

        // Tests that setting the flyout property of an activated flyout MenuCommand will deactivate it.
        testFlyoutPropertyDeactivatesFlyoutCommands = function (complete) {
            var msg = "Setting the flyout property of an activated flyout MenuCommand should deactivate it.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            verifyPropertyChangeDeactivatesFlyoutMenuCommand("flyout", null, msg).then(complete);
        }

    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.MenuCommandTests");
