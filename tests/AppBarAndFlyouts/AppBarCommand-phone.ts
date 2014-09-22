// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <deploy src="../TestData/microsoft-sdk.png" />


module CorsicaTests {

    "use strict";

    export class AppBarCommandTestsPhone {

        // Test AppBarCommand Instantiation
        testAppBarCommandInstantiation = function () {
            // Get the AppBarCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
            var AppBarCommandElement = document.createElement('button');
            document.body.appendChild(AppBarCommandElement);
            var AppBarCommand = new WinJS.UI.AppBarCommand(AppBarCommandElement, { type: 'toggle' });
            LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand element should not be null when instantiated.");

            // We have no functions

            document.body.removeChild(AppBarCommandElement);
        }




        // Test AppBarCommand Instantiation with null element
        testAppBarCommandNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand with null element");
            var AppBarCommand = new WinJS.UI.AppBarCommand(null, { type: 'button' });
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand instantiation was null when sent a null AppBarCommand element.");
        }




        // Test AppBarCommand Instantiation with no options
        testAppBarCommandEmptyInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand with empty constructor");
            var AppBarCommand = new WinJS.UI.AppBarCommand();
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand instantiation was null when sent a Empty AppBarCommand element.");
        }




        // Test multiple instantiation of the same AppBarCommand DOM element
        testAppBarCommandMultipleInstantiation = function () {
            // Get the AppBarCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
            var AppBarCommandElement = document.createElement('button');
            document.body.appendChild(AppBarCommandElement);
            var AppBarCommand = new WinJS.UI.AppBarCommand(AppBarCommandElement, { type: 'button' });
            LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand element should not be null when instantiated.");
            var error;
            try {
                new WinJS.UI.AppBarCommand(AppBarCommandElement, { type: 'button' });
            } catch (e) {
                // we throw custom exception
                error = true;
            } finally {
                LiveUnit.Assert.isTrue(error, "If the DOM element already has a WinControl, AppBarCommand should throw an exception.")
                document.body.removeChild(AppBarCommandElement);
            }
        }

        // Test AppBarCommand parameters
        testAppBarCommandParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBarCommand using good parameter " + paramName + "=" + value);
                var options = { type: 'button', label: 'test', icon: 'test.png' };
                options[paramName] = value;
                var AppBarCommand = new WinJS.UI.AppBarCommand(null, options);
                LiveUnit.Assert.isNotNull(AppBarCommand);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBarCommand using bad parameter " + paramName + "=" + value);
                var options = { type: 'button', label: 'test', icon: 'test.png' };
                options[paramName] = value;
                try {
                    new WinJS.UI.AppBarCommand(null, options);
                    LiveUnit.Assert.fail("Expected creating AppBarCommand with " + paramName + "=" + value + " to throw an exception");
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
            testGoodInitOption("type", "toggle");

            LiveUnit.LoggingCore.logComment("Testing label");
            testGoodInitOption("label", "test");
            testGoodInitOption("label", "a");
            testGoodInitOption("label", -1);
            testGoodInitOption("label", 12);
            testGoodInitOption("label", {});

            LiveUnit.LoggingCore.logComment("Testing icon");
            testGoodInitOption("icon", "test");
            testGoodInitOption("icon", "b");
            testGoodInitOption("icon", "&#xE106;");
            testGoodInitOption("icon", -1);
            testGoodInitOption("icon", 12);
            testGoodInitOption("icon", {});

            LiveUnit.LoggingCore.logComment("Testing section");
            testGoodInitOption("section", "global");
            testGoodInitOption("section", "selection");
            testGoodInitOption("section", -1);
            testGoodInitOption("section", 12);
            testGoodInitOption("section", {});

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

            LiveUnit.LoggingCore.logComment("Testing element");
        }




        // Disabled for Windows Phone blue bug # 216095
        testDefaultAppBarCommandParameters = function () {
            // Test Default Button 
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Button AppBarCommand element");
            var abc1 = <WinJS.UI.PrivateCommand>new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png' });
            LiveUnit.LoggingCore.logComment("abc1 has been instantiated.");
            LiveUnit.Assert.isNotNull(abc1, "abc1 element should not be null when instantiated.");

            var commandBarButton1 = abc1._commandBarIconButton;

            LiveUnit.Assert.isNotNull(abc1.element, "Verifying that element is not null");
            LiveUnit.Assert.areEqual("global", abc1.section, "Verifying that section is 'global'");
            LiveUnit.Assert.areEqual("", abc1.id, "Verifying that id is empty string");
            LiveUnit.Assert.areEqual("button", abc1.type, "Verifying that type is 'button'");
            LiveUnit.Assert.isFalse(commandBarButton1.isToggleButton, "ApBarCommand.type should sync with CommandBarIconButton.isToggle");
            LiveUnit.Assert.areEqual(abc1.selected, commandBarButton1.isChecked, "selected and isChecked properties should be in sync")
            LiveUnit.Assert.areEqual("test", abc1.label, "Verifying that label is 'test'");
            LiveUnit.Assert.areEqual(commandBarButton1.label, abc1.label, "Verifying that labels are in sync");
            LiveUnit.Assert.areEqual("test.png", abc1.icon, "Verifying that icon is 'test.png'");
            LiveUnit.Assert.isFalse(abc1.disabled, "Verifying that disabled is false");
            LiveUnit.Assert.isTrue(commandBarButton1.enabled, "Verifying that disabled is false");
            LiveUnit.Assert.isFalse(abc1.hidden, "Verifying that hidden is false");


            // Test Default Toggle Button
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Toggle Button AppBarCommand element");
            var abc2 = <WinJS.UI.PrivateCommand>new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png', type: 'toggle' });
            LiveUnit.LoggingCore.logComment("abc2 has been instantiated.");
            LiveUnit.Assert.isNotNull(abc1, "abc2 element should not be null when instantiated.");

            var commandBarButton2 = abc2._commandBarIconButton;


            LiveUnit.Assert.isNotNull(abc2.element, "Verifying that element is not null");
            LiveUnit.Assert.areEqual("global", abc2.section, "Verifying that section is 'global'");
            LiveUnit.Assert.areEqual("", abc2.id, "Verifying that id is empty string");
            LiveUnit.Assert.areEqual("toggle", abc2.type, "Verifying that type is 'button'");
            LiveUnit.Assert.isTrue(commandBarButton2.isToggleButton, "ApBarCommand.type should sync with CommandBarIconButton.isToggle");
            LiveUnit.Assert.areEqual(abc2.selected, commandBarButton2.isChecked, "selected and isChecked properties should be in sync")
            LiveUnit.Assert.areEqual("test", abc2.label, "Verifying that label is 'test'");
            LiveUnit.Assert.areEqual(commandBarButton2.label, abc2.label, "Verifying that labels are in sync");
            LiveUnit.Assert.areEqual("test.png", abc2.icon, "Verifying that icon is 'test.png'");
            LiveUnit.Assert.isFalse(abc2.disabled, "Verifying that disabled is false");
            LiveUnit.Assert.isTrue(commandBarButton2.enabled, "Verifying that disabled is false");
            LiveUnit.Assert.isFalse(abc2.hidden, "Verifying that hidden is false");
            LiveUnit.Assert.isFalse(abc2.selected, "Verifying that selected is false");
        }

        // Simple Property tests
        testSimpleAppBarCommandProperties = function () {
            // Get the AppBarCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
            var appBarCommand = new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png', type: 'toggle', extraClass: 'extra' });
            LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(appBarCommand, "AppBarCommand element should not be null when instantiated.");

            // Cycle selected
            LiveUnit.Assert.areEqual(false, appBarCommand.selected, "Verifying that selected is false");
            appBarCommand.selected = true;
            LiveUnit.Assert.areEqual(true, appBarCommand.selected, "Verifying that selected is true");
            appBarCommand.selected = false;
            LiveUnit.Assert.areEqual(false, appBarCommand.selected, "Verifying that selected goes back to false");

            // Cycle extra class
            LiveUnit.Assert.areEqual("extra", appBarCommand.extraClass, "Verifying that extraClass is 'extra'");
            LiveUnit.Assert.isTrue(appBarCommand.element.classList.contains("extra"), "Verifying that extraClass is 'extra'");
            appBarCommand.extraClass = "somethingElse";
            LiveUnit.Assert.areEqual("somethingElse", appBarCommand.extraClass, "Verifying that extraClass is 'somethingElse");
            LiveUnit.Assert.isTrue(appBarCommand.element.classList.contains("somethingElse"), "Verifying that className is 'somethingElse");
            appBarCommand.extraClass = "another";
            LiveUnit.Assert.areEqual("another", appBarCommand.extraClass, "Verifying that extraClass is 'another'");
            LiveUnit.Assert.isTrue(appBarCommand.element.classList.contains("another"), "Verifying that className is 'another'");
        }





        // Hidden Property tests
        testHiddenProperty = function () {
            LiveUnit.LoggingCore.logComment("Attempt to test hidden property on appbarcommand");
            var AppBarElement = document.createElement("div");
            document.body.appendChild(AppBarElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var AppBar = <WinJS.UI.PrivateAppBar>new WinJS.UI.AppBar(AppBarElement, { commands: { type: 'toggle', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("set commands");
            AppBar.commands = [{ id: 'cmdA', label: 'One', icon: 'back', section: 'global' }];
            AppBar.hide();
            var cmd = AppBar.getCommandById("cmdA");
            cmd.hidden = true;
            LiveUnit.Assert.areEqual(true, cmd.hidden, "verify the command is now hidden");
            AppBar.show();
            var result = false;
            try {
                cmd.hidden = false;
            } catch (err) {
                // we throw custom exception
                result = true;
            } finally {
                LiveUnit.Assert.areEqual(true, result, "verify the hidden property throw the exception");
                AppBar.hide();
                document.body.removeChild(AppBarElement);
            }
        }





        // Test symbol and image icons
        testIconProperty = function (complete) {

            LiveUnit.LoggingCore.logComment("Test Symbol Icons");
            var abc1 = <WinJS.UI.PrivateCommand>new WinJS.UI.AppBarCommand(null, { icon: '\uE182' });
            var abc2 = <WinJS.UI.PrivateCommand>new WinJS.UI.AppBarCommand(null, { icon: 'priority' });

            // Verify that the same character icon was generated by both commands.
            LiveUnit.Assert.areEqual(abc1.icon, abc2.icon)
            LiveUnit.Assert.areEqual(abc1.icon, abc1._commandBarIconButton.icon.symbol, "characters should project into icon.symbol");
            LiveUnit.Assert.areEqual(abc2.icon, abc2._commandBarIconButton.icon.symbol, "characters should project into icon.symbol");

            LiveUnit.LoggingCore.logComment("Test Symbol Bitmap Icons");
            var pathName = "/microsoft-sdk.png";
            // AppBarCommand icon images must be inthe form of "url(<pathname>)".
            abc1.icon = "url(" + pathName + ")";
            abc2.icon = "url(\"" + pathName + "\")";

            LiveUnit.Assert.areEqual(pathName, abc1._commandBarIconButton.icon.uri.path, "images should project into the icon.uri property");
            LiveUnit.Assert.areEqual(pathName, abc2._commandBarIconButton.icon.uri.path, "images should project into the icon.uri property");
            complete();
        };

        // Tests for dispose members and requirements
        testAppBarCommandDispose = function () {
            var button = document.createElement("button");
            var abc = <WinJS.UI.PrivateCommand>new WinJS.UI.AppBarCommand(button);
            LiveUnit.Assert.isTrue(abc.dispose);
            LiveUnit.Assert.isTrue(abc.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(abc._disposed);

            abc.dispose();
            LiveUnit.Assert.isTrue(abc._disposed);
            abc.dispose();
        };
        //testAppBarCommandDispose["Description"] = "AppBarCommand dispose test";

        /// Tests that previous innerHTML is cleared when we instantiate a new button.
        testAppBarCommandButtonsRemoveOldInnerHTML = function () {
            var button = document.createElement("button");
            button.innerHTML = "<div id='testAppBarCommandButtonsRemoveOldInnerHTML'>";
            LiveUnit.Assert.isTrue(button.querySelector("#testAppBarCommandButtonsRemoveOldInnerHTML"));
            var ac = new WinJS.UI.AppBarCommand(button);
            LiveUnit.Assert.isFalse(button.querySelector("#testAppBarCommandButtonsRemoveOldInnerHTML"), "AppBarCommand buttons should lose previous innerHTML on control Instantiation");

        }


    }

}

if (WinJS.Utilities.isPhone) {
    // register the object as a test class by passing in the name
    LiveUnit.registerTestClass("CorsicaTests.AppBarCommandTestsPhone");
}