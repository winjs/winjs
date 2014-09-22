// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>

module CorsicaTests {

    "use strict";

    var core;
    var commandBar;
    if (WinJS.Utilities.isPhone) {
        core = Windows.UI.WebUI.Core;
        commandBar = core.WebUICommandBar.getForCurrentView();
    }
    var isPortrait = function isPortrait() {
        var portrait = "portrait-primary";
        var portraitFlipped = "portrait-secondary";
        var currentOrientation = screen.msOrientation;
        return (currentOrientation === portrait || currentOrientation === portraitFlipped);
    }
    var _element;
    var PrivateAppBar: typeof WinJS.UI.PrivateAppBar;
    var AppBarCommand = <typeof WinJS.UI.PrivateCommand>WinJS.UI.AppBarCommand;


    export class AppBarTestsPhone {
        

        setUp() {
            //  https://github.com/winjs/winjs/issues/608
            PrivateAppBar = <typeof WinJS.UI.PrivateAppBar>WinJS.UI.AppBar;
            LiveUnit.LoggingCore.logComment("In setup");
            var AppBarElement = document.createElement('div');
            AppBarElement.id = "appBarDiv1";
            document.body.appendChild(AppBarElement);
            _element = AppBarElement;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            _element.parentNode.removeChild(_element);
            _element = null;
            commandBar.visible = false;
            commandBar.isOpen = false;

            for (var i = commandBar.primaryCommands.length - 1; i >= 0; i--) {
                commandBar.primaryCommands.removeAt(i);
            }
            for (var i = commandBar.secondaryCommands.length - 1; i >= 0; i--) {
                commandBar.secondaryCommands.removeAt(i);
            }

            var elements = document.querySelectorAll(".win-appbar");
            for (var i = 0, len = elements.length; i < len; i++) {
                var element = <HTMLElement>elements[i];
                if (element) {
                    if (element.winControl) {
                        element.winControl.dispose();
                    }
                    element.parentNode.removeChild(element);
                }
            }
        }

        // Test AppBar Instantiation
        testAppBarInstantiation = function () {
            var AppBar = new PrivateAppBar(_element, { commands: { type: 'button', id: 'btn' } });
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
            var AppBar = new PrivateAppBar(null, { commands: { type: 'button', id: 'btn' } });
            LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a null AppBar element.");
        }
        //testAppBarNullInstantiation["Description"] = "Test AppBar Instantiation with null AppBar element";

        // Test AppBar Instantiation with no options
        testAppBarEmptyInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with empty constructor");
            var AppBar = new PrivateAppBar();
            LiveUnit.Assert.isNotNull(AppBar.element, "AppBar.element is null");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a Empty AppBar element.");
        }
        //testAppBarEmptyInstantiation["Description"] = "Test AppBar Instantiation with Empty AppBar element";

        // Test AppBar parameters
        testAppBarParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBar using good parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                var options = { commands: { type: 'button', id: 'btn' } };
                options[paramName] = value;
                document.body.appendChild(div);
                var AppBar = new PrivateAppBar(div, options);
                LiveUnit.Assert.isNotNull(AppBar);
                document.body.removeChild(div);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a AppBar using bad parameter " + paramName + "=" + value);
                var div = document.createElement("div");
                document.body.appendChild(div);
                var options = { commands: { type: 'button', id: 'btn' } };
                options[paramName] = value;
                try {
                    new PrivateAppBar(div, options);
                    LiveUnit.Assert.fail("Expected creating AppBar with " + paramName + "=" + value + " to throw an exception");
                } catch (e) {
                    var exception = e;
                    LiveUnit.LoggingCore.logComment(exception.message);
                    LiveUnit.Assert.isTrue(exception !== null);
                    LiveUnit.Assert.isTrue(exception.name === expectedName);
                    LiveUnit.Assert.isTrue(exception.message === expectedMessage);
                } finally {
                    if (div.winControl) {
                        div.winControl.dispose();
                    }
                    document.body.removeChild(div);
                }
            }

            LiveUnit.LoggingCore.logComment("Testing placement");
            testGoodInitOption("placement", "top");
            testGoodInitOption("placement", "bottom");
            testGoodInitOption("placement", "fixed");
            testGoodInitOption("placement", -1);
            testGoodInitOption("placement", 12);
            testGoodInitOption("placement", {});
            testGoodInitOption("placement", true);
            testGoodInitOption("placement", false);

            LiveUnit.LoggingCore.logComment("Testing layout");
            testGoodInitOption("layout", "custom");
            testGoodInitOption("layout", "commands");
            var badLayout = "Invalid argument: The layout property must be 'custom' or 'commands'";
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

            testGoodInitOption("closedDisplayMode", "minimal");
            testGoodInitOption("closedDisplayMode", "compact");

        }
        //testAppBarParams["Description"] = "Test initializing a AppBar with good and bad initialization options";

        testDefaultAppBarParameters = function () {
            LiveUnit.LoggingCore.logComment("Instantiate the AppBar ");
            var AppBar = new PrivateAppBar(_element, { commands: [{ type: 'button', id: 'btn1', label: 'btn1' }, { type: 'button', id: 'btn2', label: 'btn2', section: 'selection' }] });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(_element, AppBar.element, "Verifying that element is what we set it with");
            LiveUnit.Assert.areEqual("bottom", AppBar.placement, "Verifying that position is 'bottom'");
            LiveUnit.Assert.isFalse(AppBar.sticky, "Verifying that phone appbar default sticky is false");
            LiveUnit.Assert.areEqual("commands", AppBar.layout, "Verifying that layout is 'commands'");
            LiveUnit.Assert.areEqual("compact", AppBar.closedDisplayMode, "Verifying that closedDisplayMode is 'compact'");
            LiveUnit.Assert.areEqual(commandBar.closedDisplayMode, core.WebUICommandBarClosedDisplayMode.compact, "Verifying that closedDisplayMode projects to commandBar.closedDisplayMode");
            LiveUnit.Assert.isFalse(AppBar.disabled, "Verifying that disabled is false");
            LiveUnit.Assert.isTrue(commandBar.visible, "Verifying disabled syncs with Visible");
            LiveUnit.Assert.isTrue(AppBar.hidden, "Verifying that hidden is true");
            LiveUnit.Assert.isFalse(commandBar.isOpen, "Verifying that hidden syncs with isOpen");
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, AppBar.getCommandById('btn1')._commandBarIconButton.label, "Verifying global commands sync with primaryCommands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, AppBar.getCommandById('btn2')._commandBarIconButton.label, "Verifying selection commands sync with secondaryCommands");
        }
        //testDefaultAppBarParameters["Description"] = "Test default AppBar parameters";

        testAppBarCommandsProperty = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var btn = new AppBarCommand(null, { type: 'button', id: 'btn', label: 'btn' });
            var AppBar = new PrivateAppBar(_element, { commands: btn });
            LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

            LiveUnit.Assert.areEqual(AppBar.element, AppBar.getCommandById("btn").element.parentNode, "AppBarCommand should be a child of the AppBar element");

            LiveUnit.LoggingCore.logComment("set commands");
            AppBar.commands = [{ id: 'cmdA', label: 'One', icon: 'back', section: 'global' },
                                { id: 'cmdB', label: 'Two', icon: '&#xE106;', type: 'toggle', section: 'selection' },
                                { id: 'cmdC', label: '?????', icon: '&#xE107;', type: 'toggle', section: 'selection' },
                                { type: 'button', id: 'cmdE' },
                                { id: 'cmdD', label: 'More', type: 'unsupported type' }];

            LiveUnit.Assert.areEqual(AppBar.getCommandById("btn"), null, "Setting AppBar.commands should clear previous AppBar commands");
            LiveUnit.Assert.areEqual(AppBar.element.children.length, 5, "AppBar should only have 5 commands");
            LiveUnit.Assert.isFalse(AppBar.element.querySelector("#btn"), "btn should no longer be in the AppBar");
        }
        //testAppBarCommandsProperty["Description"] = "Test commands property.";

        testAppBarDispose = function () {
            var abc1 = new AppBarCommand(document.createElement("button"), { label: "abc1" });
            var abc2 = new AppBarCommand(document.createElement("button"), { label: "abc2" });

            var ab = new PrivateAppBar(null, { commands: [abc1, abc2] });
            LiveUnit.Assert.isTrue(ab.dispose);
            LiveUnit.Assert.isFalse(ab._disposed);

            ab.dispose();
            LiveUnit.Assert.isTrue(ab._disposed);
            LiveUnit.Assert.isTrue(abc1._disposed);
            LiveUnit.Assert.isTrue(abc2._disposed);
            LiveUnit.Assert.isFalse(commandBar.visible);
            LiveUnit.Assert.isFalse(commandBar.primaryCommands.length);
            LiveUnit.Assert.isFalse(commandBar.secondaryCommands.length);
            ab.dispose(); // We shouldn't crash.
        };
        //testAppBarDispose["Description"] = "Unit test for dispose requirements.";

        // Regression test for Windows Phone Blue Bug #281368
        testDisposedAppBarOnlyRemovesOwnCommands = function (complete) {
            // Verify that when an AppBar is disposed, it only removes its own commands from the CommandBar.
            //
            var AppBar = new PrivateAppBar(_element, {
                commands: [{ type: 'button', id: 'btn1', label: 'btn1', section: 'global' }, { type: 'button', id: 'btn2', label: 'btn2', section: 'selection' }],
            });
            LiveUnit.Assert.isFalse(AppBar.disabled);

            var msg = "Disposing an AppBar should only remove that AppBar's commands from the CommandBar";

            LiveUnit.LoggingCore.logComment("Test: " + msg);

            // Push two extra WinRT comandBarButtons into the commandBar primary and secondary commands.
            var extraButton1 = new core.WebUICommandBarIconButton();
            var extraButton2 = new core.WebUICommandBarIconButton();
            commandBar.primaryCommands.push(extraButton1);
            commandBar.secondaryCommands.push(extraButton2);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 2);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 2);

            // AppBar doesn't know about the extra buttons.
            // Make sure disposing the AppBar doesn't remove the extra buttons from the CommandBar.
            AppBar.dispose();

            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 1, "extraButton1 should be the only primaryCommand in the commandBar");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 1, "extraButton12 should be the only secondaryCommand in the commandBar");
            LiveUnit.Assert.isTrue(commandBar.primaryCommands.indexOf(extraButton1).returnValue, "extraButton1 should be the only primaryCommand in the commandBar");
            LiveUnit.Assert.isTrue(commandBar.secondaryCommands.indexOf(extraButton2).returnValue, "extraButton2 should be the only  secondaryCommand in the commandBar");

            complete();
        };

        // Regression test for Windows Phone Blue Bug #294519
        testDisposingDisabledAppBar = function (complete) {
            // Verify that when a disabled AppBar is disposed, it doesn't try to hide the CommandBar.
            //
            var ab = new PrivateAppBar();

            var msg = "Disposing an AppBar should only remove that AppBar's commands from the CommandBar";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            ab.disabled = true;
            commandBar.visible = true;
            ab.dispose();
            LiveUnit.Assert.isTrue(commandBar.visible, msg);

            complete();
        }

        testShow = function (complete) {
            // Verify that calling AppBar.show() triggers the 'beforeshow' and 'aftershow' events to fire.
            var appbar;
            var beforeShowReached = false;
            var afterShowReached = false;

            var beforeShow = function () {
                LiveUnit.LoggingCore.logComment("'beforeshow' event handler called");
                appbar.removeEventListener('beforeshow', beforeShow, false);
                beforeShowReached = true;
                LiveUnit.Assert.isFalse(afterShowReached, "'aftershow' event should not fire before the 'beforeshow' event");
            }

            var afterShow = function () {
                LiveUnit.LoggingCore.logComment("'aftershow' event handler called");
                appbar.removeEventListener('aftershow', afterShow, false);
                afterShowReached = true;
                LiveUnit.Assert.isTrue(beforeShowReached, "'beforeshow' event should fire before the 'aftershow' event");
                LiveUnit.Assert.isFalse(appbar.hidden, "AppBar should not be hidden after showing the AppBar");
                LiveUnit.Assert.isTrue(commandBar.isOpen, "showing the AppBar should open the commandBar");
                complete();
            }

            var htmlString =
                "<div data-win-control='WinJS.UI.AppBar'>" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", icon:\"preview\", section:\"global\"}'></button>" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", icon:\"scan\", section:\"selection\"}'></button>" +
                "</div>";

            _element.innerHTML = htmlString;
            WinJS.UI.processAll().then(function () {
                return WinJS.Promise.timeout(500); // Bug # 222085
            }).then(function () {
                appbar = document.querySelector(".win-appbar").winControl;
                appbar.addEventListener('beforeshow', beforeShow, false);
                appbar.addEventListener('aftershow', afterShow, false);
                appbar.show();
            })
        };

        testHide = function (complete) {
            // Verify that calling AppBar.hide() triggers the 'beforehide' and 'afterhide' events to fire.
            var appbar;
            var beforeHideReached = false;
            var afterHideReached = false;

            var beforeHide = function () {
                LiveUnit.LoggingCore.logComment("'beforehide' event handler called");
                appbar.removeEventListener('beforehide', beforeHide, false);
                beforeHideReached = true;
                LiveUnit.Assert.isFalse(afterHideReached, "'afterhide' event should not fire before the 'beforehide' event");
            }

            var afterHide = function () {
                LiveUnit.LoggingCore.logComment("'afterhide' event handler called");
                appbar.removeEventListener('afterhide', afterHide, false);
                afterHideReached = true;
                LiveUnit.Assert.isTrue(beforeHideReached, "'beforehide' event should fire before the 'afterhide' event");
                LiveUnit.Assert.isTrue(appbar.hidden, "AppBar should be hidden after hiding the AppBar");
                LiveUnit.Assert.isFalse(commandBar.isOpen, "hiding the AppBar should close the commandBar");
                complete();
            }

            var htmlString =
                "<div data-win-control='WinJS.UI.AppBar'>" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", icon:\"preview\", section:\"global\"}'></button>" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", icon:\"scan\", section:\"selection\"}'></button>" +
                "</div>";

            _element.innerHTML = htmlString;
            WinJS.UI.processAll().then(function () {
                return WinJS.Promise.timeout(500); // Bug # 222085
            }).then(function () {
                commandBar.isOpen = true;
                appbar = document.querySelector(".win-appbar").winControl;
                appbar.addEventListener('beforehide', beforeHide, false);
                appbar.addEventListener('afterhide', afterHide, false);
                appbar.hide();
            })
        };

        testCorrectCommandBarUI_WhenUsingMultipleAppBars = function (complete) {
            // Whenever an AppBar is enabled or re-enabled: that AppBar then becomes the "current AppBar" and
            // take over both the presentation and control of the commandBar. The new current AppBar should replace all
            // contents in the WinRT WebUICommandBar with its own commands, and also update the commandBar's closedDisplayMode.
            //
            function verifyCommandsInAppBar(commands, AppBarCommands, varName) {
                LiveUnit.Assert.areEqual(commands.length, AppBarCommands.length, varName + " should still have the same commands it started with.");
                for (var i = 0, len = commands.length; i < len; i++) {
                    LiveUnit.Assert.areEqual(commands[i].id, AppBarCommands[i].id, varName + " should still have the same commands it started with.");
                }
            }

            function verifyCommandsInCommandBar(appbar, cmd1Name, cmd2Name) {
                LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 1, "There should only be 1 secondary command in the commandbar");
                LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 1, "There should only be 1 primary command in the commandbar");
                LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, appbar.getCommandById(cmd2Name).label, cmd2Name + " should be the secondary command in the commandbar");
                LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, appbar.getCommandById(cmd1Name).label, cmd1Name + "should be the primary command in the commandbar");
            }

            // Create two AppBars synchronously. Verify 2nd AppBar has its content drawn into the CommandBar.
            var commands1 = [{ id: 'g1', label: "g1" }, { id: 's1', label: "s1", section: "selection" }];
            var commands2 = [{ id: 'g2', label: "g2" }, { id: 's2', label: "s2", section: "selection" }];

            LiveUnit.LoggingCore.logComment("Create first AppBar");
            var bar1 = new PrivateAppBar(_element, { commands: commands1 });
            LiveUnit.LoggingCore.logComment("Verify commands in CommandBar");
            verifyCommandsInCommandBar(bar1, commands1[0].id, commands1[1].id);

            LiveUnit.LoggingCore.logComment("Create 2nd AppBar");
            bar1.disabled = true;
            var bar2 = new PrivateAppBar(null, { commands: commands2 });
            document.body.appendChild(bar2.element);

            LiveUnit.LoggingCore.logComment("Verify Last AppBar created takes over CommandBar");
            verifyCommandsInCommandBar(bar2, commands2[0].id, commands2[1].id);

            LiveUnit.LoggingCore.logComment("Verify bar1 still knows about its own internal commands, regardless of commandBar state");
            verifyCommandsInAppBar(commands1, bar1._getCommands(), "bar1");

            LiveUnit.LoggingCore.logComment("Verify bar1 can reclaim the commandBar by setting the AppBar.disabled property to false");
            bar1.disabled = false;
            verifyCommandsInCommandBar(bar1, commands1[0].id, commands1[1].id);

            // Verify that disabling an AppBar, that was not in, does not hide the commandBar.
            LiveUnit.LoggingCore.logComment("Verify that disabling bar2 after bar1 has become the current AppBar does not hide the commandBar");
            LiveUnit.Assert.isTrue(commandBar.visible, "precondition: commandBar is expected to be visible.")
            bar2.disabled = true;
            LiveUnit.Assert.isTrue(commandBar.visible, "Disabling an AppBar, that was not in control of the commandBar, should not hide the commandBar")

            LiveUnit.LoggingCore.logComment("Verify bar2 still knows about its own internal commands, regardless of losing control of the commandBar to bar1");
            verifyCommandsInAppBar(commands2, bar2._getCommands(), "bar2");

            complete();
        }

        testCurrentAppBarId = function (complete) {
            // Tests important scenarios regarding AppBar's ability to track which AppBar instance is currently in control of the commandBar.
            // SCN 1 Verifies that AppBars which are ENABLED during construction, become registered as the current AppBar.
            // SCN 2 Verifies that AppBars which are DISABLED during construction, DO NOT become registered as the current AppBar.
            // SCN 3 Verifies that every AppBar gets a uniqueID.
            // SCN 4 Verifies that setting AppBar.disabled = "false" should register that AppBar as the current AppBar.
            // SCN 5 Verifies that disabling an AppBar that was not the current AppBar, has no impact on the currentAppBarId
            // SCN 6 Verifies that disabling the current AppBar unregisters it from being 'current'.
            // SCN 7 Verifies that unregistering the current AppBar resulted in no AppBars registered as 'current'.

            var commands1 = [{ id: 'g1', label: "g1" }, { id: 's1', label: "s1", section: "selection" }];
            var commands2 = [{ id: 'g2', label: "g2" }, { id: 's2', label: "s2", section: "selection" }];
            var commands3 = [{ id: 'g3', label: "g3" }, { id: 's3', label: "s3", section: "selection" }];

            // 1. Verify that AppBars which are ENABLED during construction, become registered as the current AppBar.
            var msg = "Appbars which are ENABLED during construction, SHOULD become registered as the current AppBar."
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            LiveUnit.LoggingCore.logComment("Create 1st AppBar");
            var bar1 = new PrivateAppBar(_element, { commands: commands1 });
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar1._uniqueId, "AppBar1 should be registered as 'current appbar'.");

            LiveUnit.LoggingCore.logComment("Create 2nd AppBar");
            var bar2 = new PrivateAppBar(null, { commands: commands2 });
            document.body.appendChild(bar2.element);
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar2._uniqueId, "AppBar2 should be registered as 'current appbar'.");

            // 2. Verify that AppBars which are DISABLED during construction, DO NOT become registered as the current AppBar.
            msg = "AppBars which are DISABLED during construction, SHOULD NOT become registered as the current AppBar."
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.LoggingCore.logComment("Create disabled AppBar");
            var bar3 = new PrivateAppBar(null, { commands: commands3, disabled: true });
            document.body.appendChild(bar3.element);
            LiveUnit.Assert.areNotEqual(PrivateAppBar._currentAppBarId, bar3._uniqueId, msg);
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar2._uniqueId, "AppBar2 should STILL be registered as 'current appbar'.");

            // 3. Verify that every AppBar gets a uniqueID.
            msg = "Every AppBar should have a unique ID.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areNotEqual(bar1._uniqueId, bar2._uniqueId, msg);
            LiveUnit.Assert.areNotEqual(bar3._uniqueId, bar2._uniqueId, msg);
            LiveUnit.Assert.areNotEqual(bar1._uniqueId, bar3._uniqueId, msg);

            // 4. Verify that setting AppBar.disabled = "false" should register that AppBar as the current AppBar.
            msg = "Setting AppBar.disabled = 'false' should register that AppBar as the current AppBar";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            //  i. Enable an AppBar that was already enabled and already registered as current AppBar.
            bar2.disabled = false;
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar2._uniqueId, "AppBar2 should STILL be registered as 'current appbar'.");

            //  ii. Enable an AppBar that was disabled.
            bar3.disabled = false;
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar3._uniqueId, "AppBar3 should now be registered as 'current appbar'.");

            //  iii. Enable an AppBar that was already enabled, but was not the current AppBar.
            bar1.disabled = false;
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar1._uniqueId, "AppBar1 should now be registered as 'current appbar'.");

            // 5. Verify that disabling an AppBar that was not the current AppBar, has no impact on the currentAppBarId
            msg = "Disabling an AppBar that was not the current AppBar, Should not affect the currentAppBarId.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            var currentAppBarId = PrivateAppBar._currentAppBarId;
            bar3.disabled = true;
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, currentAppBarId, msg);

            // 6. Verify that disabling the current AppBar unregisters it from being 'current'.
            msg = "Disabling the current AppBar should unregister  it from being 'current'."
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(PrivateAppBar._currentAppBarId, bar1._uniqueId, "precondition: AppBar1 should be registered the 'current appbar'.");

            bar1.disabled = true;
            LiveUnit.Assert.areNotEqual(PrivateAppBar._currentAppBarId, bar1._uniqueId, "Disabling the current AppBar should unregister it from being 'current'");
            LiveUnit.Assert.isFalse(commandBar.visible, "Disabling the current AppBar should hide the commandBar");

            // 7. Verify that unregistering the current AppBar resulted in no AppBars registered as 'current'.
            msg = "Unregistering the current AppBar should have resulted in no AppBar registered as 'current'."
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.isNull(PrivateAppBar._currentAppBarId, msg);

            complete();

        }

        testDefaultColors = function (complete) {
            LiveUnit.LoggingCore.logComment("Verify AppBar with default colors is not 'transparent'");
            var AppBar = new PrivateAppBar(_element, { commands: { id: 'cmd', label: 'cmd' } });
            WinJS.Promise.timeout(0).then(function () {
                // HTML elements have 'transparent' colors by default, make sure our default CSS styles are working.
                LiveUnit.Assert.areNotEqual(getComputedStyle(AppBar.element).backgroundColor, 'transparent', 'Default AppBar should not be transparent');
                LiveUnit.Assert.areNotEqual(getComputedStyle(AppBar.getCommandById('cmd').element).color, 'transparent', 'Default AppBarCommand color should not be transparent');

                complete();
            });
        }

        testCustomColors = function (complete) {
            // CSS rules will be added to this style element before an AppBar is instantiated.
            var commandBarStyleElem = document.createElement("style");
            document.head.appendChild(commandBarStyleElem);

            function insertRules(backgroundSelector, foregroundSelector, backgroundValue, foregroundValue) {
                var backgroundRuleBody = "background-color:" + backgroundValue + ";";
                var foregroundRuleBody = "color:" + foregroundValue + ";";

                var backgroundRule = backgroundSelector + " { " + backgroundRuleBody + " } ";
                (<CSSStyleSheet>commandBarStyleElem.sheet).insertRule(backgroundRule, 0);

                var foregroundRule = foregroundSelector + " { " + foregroundRuleBody + " } ";
                (<CSSStyleSheet>commandBarStyleElem.sheet).insertRule(foregroundRule, 0);
            }

            function clearRules() {
                document.head.removeChild(commandBarStyleElem);
                commandBarStyleElem = null;
            }
            var opacityDelta;
            var tolerance = .05;

            LiveUnit.LoggingCore.logComment("Test 'rgba(2, 200, 100, 0.7)' background with 'rgb(100, 50, 175)' foreground");
            var bgColor1 = { r: 2, g: 200, b: 100, a: 0.7 };
            var bgColorValue1 = "rgba(" + bgColor1.r + "," + bgColor1.g + "," + bgColor1.b + " ," + bgColor1.a + ")";
            var fgColor1 = { r: 100, g: 50, b: 175 };
            var fgColorValue1 = "rgb(" + fgColor1.r + "," + fgColor1.g + "," + fgColor1.b + ")";

            insertRules("#appBarDiv1", "#appBarDiv1 .win-command", bgColorValue1, fgColorValue1);

            var bar1 = new PrivateAppBar(_element, { commands: { id: 'add', label: 'add', icon: 'add' } });
            var bar2Element;
            WinJS.Promise.timeout(50).then(function () {
                try {
                    opacityDelta = Math.abs(bgColor1.a - commandBar.opacity);
                    LiveUnit.Assert.isTrue(opacityDelta < tolerance, "opacity values don't match");
                    LiveUnit.Assert.areEqual(bgColor1.r, commandBar.backgroundColor.r, "Background r values don't match");
                    LiveUnit.Assert.areEqual(bgColor1.g, commandBar.backgroundColor.g, "Background g values don't match");
                    LiveUnit.Assert.areEqual(bgColor1.b, commandBar.backgroundColor.b, "Background b values don't match");
                    LiveUnit.Assert.areEqual(fgColor1.r, commandBar.foregroundColor.r, "foreground r values don't match");
                    LiveUnit.Assert.areEqual(fgColor1.g, commandBar.foregroundColor.g, "foreground g values don't match");
                    LiveUnit.Assert.areEqual(fgColor1.b, commandBar.foregroundColor.b, "foreground b values don't match");
                } catch (e) {
                    clearRules();
                    throw (e);
                }
            }).then(function () {

                LiveUnit.LoggingCore.logComment("Test 'transparent' background with 'deeppink' foreground");

                var bgColorValue2 = "transparent";
                var fgColor2 = { r: 255, g: 20, b: 147 }; //Deep pink is rgb(255, 20, 147)"
                var fgColorValue2 = "deeppink";

                insertRules("#appBarDiv2", "#appBarDiv2 .win-label", bgColorValue2, fgColorValue2);

                bar2Element = document.createElement("DIV");
                bar2Element.id = "appBarDiv2";
                document.body.appendChild(bar2Element);

                // Create a new AppBar to take control of the commandBar and trigger a color update.
                var bar2 = new PrivateAppBar(bar2Element, { commands: { id: 'home', label: 'home', icon: 'home' } });
                return WinJS.Promise.timeout(50).then(function () {
                    try {
                        LiveUnit.Assert.areEqual(0, commandBar.opacity, "'transparent' background color should give commandBar an opacity of 0");
                        LiveUnit.Assert.areEqual(fgColor2.r, commandBar.foregroundColor.r, "foreground r values don't match");
                        LiveUnit.Assert.areEqual(fgColor2.g, commandBar.foregroundColor.g, "foreground g values don't match");
                        LiveUnit.Assert.areEqual(fgColor2.b, commandBar.foregroundColor.b, "foreground b values don't match");
                    } catch (e) {
                        clearRules();
                        throw (e);
                    }
                });

            }).done(function () {
                clearRules();
                document.body.removeChild(bar2Element);
                complete();
            });
        }


        // Regression test for Windows Phone Blue bug # 239916
        testAppBarOutSideOfDOMDoesntSetCommandBarOpacity = function (complete) {

            var defaultOpacity = commandBar.opacity;

            LiveUnit.LoggingCore.logComment("Test: An AppBar whose element is never attached to the DOM should not set the opacity of the CommandBar");
            var appbar = new PrivateAppBar(null, {});
            // AppBar asynchornously schedules setting the commandBar colors at high priority if the AppBar element isn't in the DOM yet during construction time.
            // Make sure we don't try to make it transparent when the element isn't in the DOM.
            WinJS.Utilities.Scheduler.schedule(function () {
                LiveUnit.Assert.areEqual(defaultOpacity, commandBar.opacity, "WinJS AppBar should not set the CommandBar opacity if the AppBar element isn't in the DOM" + defaultOpacity + " " + commandBar.opacity);
                complete();
            }, WinJS.Utilities.Scheduler.Priority.min);
        }

        testDynamicColorChange = function (complete) {
            // Setting these properties or invoking these methods should trigger a recompute of the CommandBar background and foreground colors.
            // Seting the AppBar.commands property.
            // AppBar.hideCommands()
            // AppBar.showCommands()
            // AppBar.showOnlyCommands()
            // AppBarCommand.hidden <--- only if the AppBarCommand is in the AppBar at the time the hidden property was set.
            // AppBar.disabled <--- only when setting disabled=false, and the AppBar had been currently disabled.

            function setElementColors(colorString) {
                appbar.element.style.backgroundColor = colorString;
                var firstCommand = appbar.element.querySelector("button.win-command");
                if (firstCommand) {
                    (<HTMLElement>firstCommand.querySelector(".win-label")).style.color = colorString;
                }
            }

            function verifyColorChange(color, errorMsg) {
                return WinJS.Promise.timeout(50).then(function () {
                    LiveUnit.Assert.areEqual(color.a, commandBar.opacity, "opacity values don't match");
                    LiveUnit.Assert.areEqual(color.r, commandBar.backgroundColor.r, "Background r values don't match. " + errorMsg);
                    LiveUnit.Assert.areEqual(color.g, commandBar.backgroundColor.g, "Background g values don't match. " + errorMsg);
                    LiveUnit.Assert.areEqual(color.b, commandBar.backgroundColor.b, "Background b values don't match. " + errorMsg);
                    LiveUnit.Assert.areEqual(color.r, commandBar.foregroundColor.r, "foreground r values don't match. " + errorMsg);
                    LiveUnit.Assert.areEqual(color.g, commandBar.foregroundColor.g, "foreground g values don't match. " + errorMsg);
                    LiveUnit.Assert.areEqual(color.b, commandBar.foregroundColor.b, "foreground b values don't match. " + errorMsg);
                });
            }

            var appbar = new PrivateAppBar(_element, {});
            var cmd1 = new AppBarCommand();
            var cmd2 = new AppBarCommand();

            var msg = "Setting the AppBar.commands property should recompute CommandBar colors"
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            var newColor = { r: 1, g: 2, b: 3, a: 1 };
            var newColorString = "rgb(" + newColor.r + "," + newColor.g + "," + newColor.b + ")";
            setElementColors(newColorString);
            cmd1.element.style.color = newColorString;
            appbar.commands = [cmd1, cmd2];

            verifyColorChange(newColor, msg).then(function () {
                msg = "AppBar.hideCommands() should recompute CommandBar colors"
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                newColor = { r: 10, g: 10, b: 10, a: .5 };
                newColorString = "rgba(" + newColor.r + "," + newColor.g + "," + newColor.b + "," + newColor.a + ")";
                setElementColors(newColorString);
                appbar.hideCommands([cmd1]);
                return verifyColorChange(newColor, msg);
            }).then(function () {
                msg = "AppBar.showCommands() should recompute CommandBar colors"
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                newColor = { r: 255, g: 255, b: 255, a: 1 };
                newColorString = "rgb(" + newColor.r + "," + newColor.g + "," + newColor.b + ")";
                setElementColors(newColorString);
                appbar.showCommands([cmd1]);
                return verifyColorChange(newColor, msg);
            }).then(function () {
                msg = "AppBar.showOnlyCommands() should recompute CommandBar colors"
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                newColor = { r: 0, g: 0, b: 0, a: 0 };
                newColorString = "rgba(" + newColor.r + "," + newColor.g + "," + newColor.b + "," + newColor.a + ")"
                setElementColors(newColorString);
                appbar.showOnlyCommands([cmd1]);
                return verifyColorChange(newColor, msg);
            }).then(function () {
                msg = "Setting 'AppBarCommand.hidden = true' on AppBarCommand inside of an AppBar should recompute CommandBar colors"
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                newColor = { r: 11, g: 42, b: 254, a: 1 };
                newColorString = "rgba(" + newColor.r + "," + newColor.g + "," + newColor.b + "," + newColor.a + ")"
                setElementColors(newColorString);
                cmd1.hidden = true;
                return verifyColorChange(newColor, msg);
            }).then(function () {
                msg = "Setting 'AppBarCommand.hidden = false' on AppBarCommand inside of an AppBar should recompute CommandBar colors"
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                newColor = { r: 254, g: 100, b: 101, a: 1 };
                newColorString = "rgba(" + newColor.r + "," + newColor.g + "," + newColor.b + "," + newColor.a + ")"
                setElementColors(newColorString);
                cmd1.hidden = false;
                return verifyColorChange(newColor, msg);
            }).then(function () {
                msg = "Setting 'AppBar.disabled = false' on AppBar that was previously disabled should recompute CommandBar colors"
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                newColor = { r: 80, g: 160, b: 240, a: 1 };
                newColorString = "rgb(" + newColor.r + "," + newColor.g + "," + newColor.b + ")"
                setElementColors(newColorString);
                appbar.disabled = true;
                appbar.disabled = false;
                return verifyColorChange(newColor, msg);
            }).done(complete);
        }

        testShowingHidingCommands = function (complete) {

            var msg = "Setting AppBar.commands should not project any hidden commands into the CommandBar";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            var p1, p2, p3, p4, p5, s1, s2, s3, s4, s5;

            var commands = [ // commands p2 and s1 will start hidden. They should not project into the command bar.
                p1 = new AppBarCommand(null, { id: "p1", label: "p1", section: "global" }),
                p2 = new AppBarCommand(null, { id: "p2", label: "p2", section: "global", hidden: true }),
                p3 = new AppBarCommand(null, { id: "p3", label: "p3", section: "global" }),
                p4 = new AppBarCommand(null, { id: "p4", label: "p4", section: "global" }),
                p5 = new AppBarCommand(null, { id: "p5", label: "p5", section: "global" }),
                s1 = new AppBarCommand(null, { id: "s1", label: "s1", section: "selection", hidden: true }),
                s2 = new AppBarCommand(null, { id: "s2", label: "s2", section: "selection" }),
                s3 = new AppBarCommand(null, { id: "s3", label: "s3", section: "selection" }),
                s4 = new AppBarCommand(null, { id: "s4", label: "s4", section: "selection" }),
                s5 = new AppBarCommand(null, { id: "s5", label: "s5", section: "selection" }),
            ];
            var appbar = new PrivateAppBar(_element, { commands: commands });

            // Validate that there are only 4 primary commands and 4 secondary commands in the command bar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 4, "There are only 4 visible global commands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 4, "There are only 4 visible selection commands");
            // Validate that the visible commands appear in the CommandBar in the same order as their cooresponding commands in the AppBar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, p1.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[1].label, p3.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[2].label, p4.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[3].label, p5.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, s2.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[1].label, s3.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[2].label, s4.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[3].label, s5.label);

            var msg = "Showing commands via AppBar.show() should project hidden commands into the CommandBar, and maintain the sorted by DOM order enviornment.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            appbar.showCommands([p2, s1]);
            // Validate that all 10 primary commands and secondary commands are now inthe in the command bar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 5, "There are visible global commands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 5, "There are visible selection commands");
            // Validate that the visible commands appear in the CommandBar in the same order as their cooresponding commands in the AppBar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, p1.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[1].label, p2.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[2].label, p3.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[3].label, p4.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[4].label, p5.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, s1.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[1].label, s2.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[2].label, s3.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[3].label, s4.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[4].label, s5.label);

            var msg = "Hiding commands via AppBar.show() should remove the corresponding CommandBarIconButtons projected into the CommandBar.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            appbar.hideCommands([p3, s2, p5, s4]);
            // Validate that there are only 3 primary commands and 3 secondary commands in the command bar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 3, "There are only 3 visible global commands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 3, "There are only 3 visible selection commands");
            // Validate that the visible commands appear in the CommandBar in the same order as their cooresponding commands in the AppBar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, p1.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[1].label, p2.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[2].label, p4.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, s1.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[1].label, s3.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[2].label, s5.label);

            var msg = "AppBar.showOnlyCommands(cmdsArray) should remove all CommandBarIconButtons from the CommandBar whose corresponding AppBarCommands were not specified cmdsArray.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            appbar.showOnlyCommands([p5, s3, s2, p1]);
            // Validate that there are only 2 primary commands and 2 secondary commands in the command bar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 2, "There are only 2 visible global commands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 2, "There are only 2 visible selection commands");
            // Validate that the visible commands appear in the CommandBar in the same order as their cooresponding commands in the AppBar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, p1.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[1].label, p5.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, s2.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[1].label, s3.label);

            var msg = "Setting an AppBarCommand's hidden property from false to true should remove that command from the CommandBar. ";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            p1.hidden = true;
            // Validate that there is only 1 primary commands and 2 secondary commands in the command bar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 1, "There is only 1 visible global commands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 2, "There are only 2 visible selection commands");
            // Validate that the visible commands appear in the CommandBar in the same order as their cooresponding commands in the AppBar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, p5.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, s2.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[1].label, s3.label);

            var msg = "Setting an AppBarCommand's hidden property from true to false should add that command into the CommandBar at the correctly sorted index. ";
            LiveUnit.LoggingCore.logComment("Test: " + msg);

            p2.hidden = false;
            p1.hidden = false;
            s1.hidden = false;
            // Validate that there is only 3 primary commands and 3 secondary commands in the command bar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 3, "There is only 3 visible global commands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 3, "There are only 3 visible selection commands");
            // Validate that the visible commands appear in the CommandBar in the same order as their cooresponding commands in the AppBar.
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[0].label, p1.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[1].label, p2.label);
            LiveUnit.Assert.areEqual(commandBar.primaryCommands[2].label, p5.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[0].label, s1.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[1].label, s2.label);
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands[2].label, s3.label);

            complete();
        }

        testDisabled = function (complete) {

            LiveUnit.LoggingCore.logComment("Instantiate a disabled AppBar ");
            var AppBar = new PrivateAppBar(_element, {
                disabled: true,
                commands: [{ type: 'button', id: 'btn1', label: 'btn1', section: 'global' }, { type: 'button', id: 'btn2', label: 'btn2', section: 'selection' }],
                closedDisplayMode: 'minimal',
            });

            LiveUnit.Assert.isTrue(AppBar.disabled, "AppBar should be disabled ");
            LiveUnit.Assert.isFalse(parseFloat(AppBar.element.style.height), "AppBar.element.style.height should not have been set in disabled AppBar constructor.");
            LiveUnit.Assert.isFalse(commandBar.visible, "Instantiating a disabled AppBar shouild not cause the commandBar to be visible");

            LiveUnit.LoggingCore.logComment("Verify that a disabled AppBar doesn't project its state into the CommandBar during or after instantiation.");

            commandBar.visible = true;
            LiveUnit.Assert.areEqual(commandBar.visible, AppBar.disabled, "Making CommandBar visible, should not change the value of AppBar.disabled");

            // Verify that AppBar properties set during instantiation, didn't sync to CommandBar since AppBar was disabled.
            LiveUnit.Assert.areEqual(commandBar.closedDisplayMode, core.WebUICommandBarClosedDisplayMode.compact, "commandBar.closedDisplayMode should be 'compact'");
            LiveUnit.Assert.areEqual("minimal", AppBar.closedDisplayMode, "closedDisplayMode shouldn't project to commandBar.closedDisplayMode when AppBar is disabled.");

            LiveUnit.Assert.isTrue(AppBar._getCommands().length === 2, "AppBar should internally know about the two commands it has");
            LiveUnit.Assert.isFalse(commandBar.primaryCommands.length, "Disabled AppBar should not have projected primaryCommands into CommandBar");
            LiveUnit.Assert.isFalse(commandBar.secondaryCommands.length, "Disabled AppBar should not have projected secondaryCommands into CommandBar");

            var msg;
            function eventFired(ev) {
                LiveUnit.Assert.fail(msg + " AppBar should not fire events while disabled");
            }

            AppBar.addEventListener('beforeshow', eventFired, false);
            AppBar.addEventListener('aftershow', eventFired, false);
            AppBar.addEventListener('beforehide', eventFired, false);
            AppBar.addEventListener('afterhide', eventFired, false);

            msg = "AppBar.show().";
            AppBar.show();
            LiveUnit.Assert.isTrue(AppBar.hidden, "verify disabled AppBar won't show");

            msg = "commandBar.isOpen = true.";
            commandBar.isOpen = true;
            LiveUnit.Assert.isTrue(AppBar.hidden, "verify disabled AppBar doesn't know commandBar's state");

            msg = "AppBar.hide().";
            AppBar.hide();
            LiveUnit.Assert.isTrue(commandBar.isOpen, "verify disabled AppBar.hide() can't close commandBar");

            msg = "commandBar.isOpen = false.";
            commandBar.isOpen = false;

            LiveUnit.Assert.isFalse(parseFloat(AppBar.element.style.height), "AppBar.element.style.height should never have been set on our disabled AppBar.");

            LiveUnit.LoggingCore.logComment("Verify re-enabling the AppBar projects its state into the CommandBar.");
            AppBar.removeEventListener('beforeshow', eventFired, false);
            AppBar.removeEventListener('aftershow', eventFired, false);
            AppBar.removeEventListener('beforehide', eventFired, false);
            AppBar.removeEventListener('afterhide', eventFired, false);

            AppBar.disabled = false;
            LiveUnit.Assert.isFalse(AppBar.disabled, "AppBar should be enabled");
            LiveUnit.Assert.isTrue(commandBar.visible, "enabling the AppBar should force commandBar to be Visible");

            LiveUnit.Assert.areEqual(commandBar.closedDisplayMode, core.WebUICommandBarClosedDisplayMode.minimal, "re-enabling the AppBar should have projected its closedDisplayMode");

            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 1, "Verifying global command syncs with primaryCommands");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 1, "Verifying selection command syncs with secondaryCommands");

            LiveUnit.LoggingCore.logComment("Verify re-disabling the AppBar sets its inline element height to 0.");
            AppBar.disabled = true;
            LiveUnit.Assert.isFalse(parseFloat(AppBar.element.style.height), "AppBar element inline height(" + AppBar.element.style.height + ") should be set to 0px, when that AppBar is disabled ");

            LiveUnit.LoggingCore.logComment("Verify that setting commands on a disabled AppBar, does not update commands in commandBar.");
            AppBar.commands = [];
            LiveUnit.Assert.areEqual(AppBar._getCommands().length, 0, "AppBar should know internally that is has 0 commands.");
            LiveUnit.Assert.areEqual(commandBar.primaryCommands.length, 1, "Verifying commandBar primaryCommands were not affected by disabled AppBar commands change");
            LiveUnit.Assert.areEqual(commandBar.secondaryCommands.length, 1, "Verifying commandBar secondaryCommands were not affected by disabled AppBar commands change");

            complete();
        }

        // Regression test for Windows Phone Blue bug # 239916
        testEnablingEnabledAppBar = function (complete) {
            // Verify that an AppBar that is currently enabled, will not reload commands if re-enabled
            //
            var AppBar = new PrivateAppBar(_element, {
                commands: [{ type: 'button', id: 'btn1', label: 'btn1', section: 'global' }, { type: 'button', id: 'btn2', label: 'btn2', section: 'selection' }],
            });
            LiveUnit.Assert.isFalse(AppBar.disabled);

            var msg = "Enabling an already enabled AppBar should not reload commands";

            LiveUnit.LoggingCore.logComment("Test: " + msg);

            // Push an extra WinRT commandBarButton into the commandBar.
            var extraButton = new core.WebUICommandBarIconButton();
            LiveUnit.Assert.isFalse(commandBar.primaryCommands.indexOf(extraButton).returnValue)
            commandBar.primaryCommands.push(extraButton);
            LiveUnit.Assert.isTrue(commandBar.primaryCommands.indexOf(extraButton).returnValue, "extraButton should be among the primaryCommands in the commandBar");

            // AppBar doesn't know about extraButton.
            // If AppBar commands get reloaded, extraButton will be absent from the commandBar.
            AppBar.disabled = false;
            LiveUnit.Assert.isTrue(commandBar.primaryCommands.indexOf(extraButton).returnValue, msg)
            complete();
        }

        testClosedDisplayMode = function (complete) {
            var appbar = new PrivateAppBar(_element, { closedDisplayMode: 'minimal' });

            LiveUnit.Assert.areEqual("minimal", appbar.closedDisplayMode, "closedDisplayMode should be 'minimal'");
            LiveUnit.Assert.areEqual(commandBar.closedDisplayMode, core.WebUICommandBarClosedDisplayMode.minimal, "closedDisplayMode should project to commandBar.closedDisplayMode");

            appbar.closedDisplayMode = "compact";

            LiveUnit.Assert.areEqual("compact", appbar.closedDisplayMode, "closedDisplayMode should be 'compact'");
            LiveUnit.Assert.areEqual(commandBar.closedDisplayMode, core.WebUICommandBarClosedDisplayMode.compact, "closedDisplayMode should project to commandBar.closedDisplayMode");

            complete();
        }
    }
    
}

if (WinJS.Utilities.isPhone) {
    LiveUnit.registerTestClass("CorsicaTests.AppBarTestsPhone");
}