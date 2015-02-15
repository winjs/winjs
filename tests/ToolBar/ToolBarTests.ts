// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.ToolBar.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    var ToolBar = <typeof WinJS.UI.PrivateToolBar> WinJS.UI.ToolBar;
    var Command = <typeof WinJS.UI.PrivateCommand> WinJS.UI.AppBarCommand;
    var Util = WinJS.Utilities;
    var _Constants;

    WinJS.Utilities._require(["WinJS/Controls/ToolBar/_Constants"], function (constants) {
        _Constants = constants;
    })

    export class ToolBarTests {
        "use strict";

        _element: HTMLElement;

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = "host";
            document.body.appendChild(newNode);
            this._element = newNode;
        }

        tearDown() {
            if (this._element) {
                WinJS.Utilities.disposeSubTree(this._element);
                document.body.removeChild(this._element);
                this._element = null;
            }
        }

        testConstruction() {
            var toolbar = new ToolBar(this._element);
            LiveUnit.Assert.isTrue(Util.hasClass(toolbar.element, Helper.ToolBar.Constants.controlCssClass), "ToolBar missing control css class");
            LiveUnit.Assert.isTrue(Util.hasClass(toolbar.element, Helper.ToolBar.Constants.disposableCssClass), "ToolBar missing disposable css class");
        }

        testAppendToDomAfterConstruction(complete) {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2" })
            ]);
            var toolbar = new ToolBar(null, {
                data: data
            });
            var insertedHandler = function () {
                toolbar.element.removeEventListener("WinJSNodeInserted", insertedHandler);
                LiveUnit.Assert.areEqual(data.length, toolbar._primaryCommands.length, "Primary commands array has an invalid length");
                LiveUnit.Assert.areEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be hidden when the primary commands fit");
                LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");
                complete();
            }

            toolbar.element.addEventListener("WinJSNodeInserted", insertedHandler);
            this._element.appendChild(toolbar.element);
        }

        testElementProperty() {
            var el = document.createElement("div");
            var toolbar = new ToolBar(el);
            LiveUnit.Assert.areEqual(Util._uniqueID(el), Util._uniqueID(toolbar.element), "The element passed in the constructor should be used as the main toolbar element");

            toolbar = new ToolBar();
            LiveUnit.Assert.isNotNull(toolbar.element, "An element should be created when one is not passed to the constructor");
        }

        testDataProperty() {
            // Verify default (empty)
            var toolbar = new ToolBar();
            LiveUnit.Assert.areEqual(0, toolbar.data.length, "Empty list view should have data with length 0");
            LiveUnit.Assert.isTrue(Util.hasClass(toolbar.element, Helper.ToolBar.Constants.emptyToolBarCssClass), "Empty toolbar css class that is not present");

            // Add some data
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2" })
            ]);
            toolbar.data = data;
            LiveUnit.Assert.areEqual(2, toolbar.data.length, "ToolBar data has an invalid length");
            LiveUnit.Assert.isFalse(Util.hasClass(toolbar.element, Helper.ToolBar.Constants.emptyToolBarCssClass), "Empty toolbar css class should not be present");

            // set to invalid value
            var property = "data";
            try {

                toolbar[property] = { invalid: 1 };
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI.ToolBar.BadData", e.name);

                // Ensure the value of data did not change
                LiveUnit.Assert.areEqual(2, toolbar.data.length, "ToolBar data has an invalid length");
                LiveUnit.Assert.isFalse(Util.hasClass(toolbar.element, Helper.ToolBar.Constants.emptyToolBarCssClass), "Empty toolbar css class should not be present");
            }

            // if the toolbar element contains children, they should be parsed as the data

            var el = document.createElement("div");
            var child = document.createElement("table");
            el.appendChild(child);
            try {
                new ToolBar(el);
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI.ToolBar.MustContainCommands", e.name, "Toobar should have thrown MustContainCommands exception");
            }

            el = document.createElement("div");
            var commandEl: HTMLElement;
            var numberOfCommands = 5;
            for (var i = 0; i < numberOfCommands; i++) {
                commandEl = document.createElement("button");
                commandEl.setAttribute("data-win-control", Helper.ToolBar.Constants.commandType);
                el.appendChild(commandEl);
            }
            toolbar = new ToolBar(el);
            LiveUnit.Assert.areEqual(numberOfCommands, toolbar.data.length, "ToolBar data has an invalid length");
            LiveUnit.Assert.isFalse(Util.hasClass(toolbar.element, Helper.ToolBar.Constants.emptyToolBarCssClass), "Empty toolbar css class should not be present");
        }

        testToolBarDispose() {
            var toolbar = new ToolBar();
            LiveUnit.Assert.isTrue(toolbar.dispose);
            LiveUnit.Assert.isFalse(toolbar._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            toolbar.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            toolbar.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(toolbar._disposed);
            toolbar.dispose();
        }

        testVerifyDefaultTabIndex() {
            var toolbar = new ToolBar();
            LiveUnit.Assert.areEqual("-1", toolbar.element.getAttribute("tabIndex"), "ToolBar should've assigned a default tabIndex");

            var el = document.createElement("div");
            el.setAttribute("tabIndex", "4");
            toolbar = new ToolBar(el);
            LiveUnit.Assert.areEqual("4", toolbar.element.getAttribute("tabIndex"), "ToolBar should have not assigned a default tabIndex");
        }

        testAria() {
            var toolbar = new ToolBar();
            LiveUnit.Assert.areEqual("menubar", toolbar.element.getAttribute("role"), "Missing default aria role");
            LiveUnit.Assert.areEqual("ToolBar", toolbar.element.getAttribute("aria-label"), "Missing default aria label");

            var el = document.createElement("div");
            toolbar = new ToolBar(el);
            el.setAttribute("role", "list");
            el.setAttribute("aria-label", "myList");
            LiveUnit.Assert.areEqual("list", toolbar.element.getAttribute("role"), "ToolBar should have not set a default aria role");
            LiveUnit.Assert.areEqual("myList", toolbar.element.getAttribute("aria-label"), "ToolBar should have not set a default aria label");
        }

        testOverflowButtonHiddenWithoutSecondaryCommands() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2" })
            ]);
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, toolbar._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(0, toolbar._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be hidden when the primary commands fit");
        }

        testOverflowButtonVisibleForSecondaryCommand() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2", section: Helper.ToolBar.Constants.secondaryCommandSection })
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(1, toolbar._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, toolbar._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when there are secondary commands");
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowButtonVisibleForPrimaryCommand() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2" })
            ]);
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, toolbar._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(0, toolbar._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when the primary commands overflow");
        }

        testForceLayout() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2" })
            ]);
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, toolbar._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when the primary commands overflow");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            this._element.style.width = "1000px";
            toolbar.forceLayout();

            LiveUnit.Assert.areEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be hidden when the primary commands fit");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Main action area should have 2 commands");
            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");
        }

        testForceLayoutReMeasures() {
            this._element.style.display = "none";
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "sec opt 1", section: Helper.ToolBar.Constants.secondaryCommandSection })
            ]);
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(2, toolbar._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be not hidden when there are secondary commands");

            // Obtain the dimensions of 1 command + the overflow button
            this._element.style.display = "";
            toolbar.forceLayout();
            this._element.style.width = toolbar._standardCommandWidth + toolbar._overflowButtonWidth + "px";

            // Now that we have changed the parent's size to fit 1 command + the overflow button, let's ensure that one primary command goes to the overflow area
            WinJS.Utilities._resizeNotifier._handleResize();
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Main action area should have 1 command");
        }

        testSeparatorAddedBetweenPrimaryAndSecondary() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2", section: Helper.ToolBar.Constants.secondaryCommandSection })
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            var overflowCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea);
            LiveUnit.Assert.areEqual(3, overflowCommands.length, "Menu commands list has an invalid length");
            LiveUnit.Assert.areEqual("opt 1", overflowCommands[0].winControl.label);
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeSeparator, overflowCommands[1].winControl.type);
            LiveUnit.Assert.areEqual("opt 2", overflowCommands[2].winControl.label);
        }

        testOverflowBehaviorOfCustomContent() {
            var customEl = document.createElement("div");
            customEl.style.width = "2000px";
            customEl.style.height = "50px";

            var data = new WinJS.Binding.List([
                new Command(customEl, { type: Helper.ToolBar.Constants.typeContent, label: "1", extraClass: "c1" }),
            ]);

            this._element.style.width = "200px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Custom content should overflow as a flyout menu item
            var menuCommand = <WinJS.UI.MenuCommand>(Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeFlyout, menuCommand.type, "Custom content should overflow with type flyout");
            LiveUnit.Assert.areEqual(toolbar._customContentFlyout, menuCommand.flyout, "Invalid flyout target for custom command in the overflow area");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid label for custom command in the overflow area");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid extraClass for custom command in the overflow area");
        }

        testOverflowBehaviorOfButtonCommand(complete) {

            WinJS.Utilities.markSupportedForProcessing(complete);

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1", extraClass: "c1", disabled: true, onclick: Helper.ToolBar.getVisibleCommandsInElement }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", extraClass: "c2", disabled: false, onclick: complete }),
            ]);

            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isTrue(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.areEqual(Helper.ToolBar.getVisibleCommandsInElement, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand = <WinJS.UI.MenuCommand>(Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea)[1]["winControl"]);
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("2", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c2", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.areEqual(complete, menuCommand.onclick, "Invalid menuCommand onclick property value");

            // Verify onclick calls complete
            menuCommand.element.click();
        }

        testOverflowBehaviorOfToggleCommand() {

            var clickWasHandled = false;
            function test_handleClick(event) {
                clickWasHandled = true;
                LiveUnit.Assert.isFalse(event.target.winControl.selected, "Invalid menuCommand selected property value");
            }

            WinJS.Utilities.markSupportedForProcessing(test_handleClick);

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeToggle, label: "1", extraClass: "c1", selected: true, onclick: test_handleClick }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", extraClass: "c2", disabled: true, onclick: test_handleClick }),
            ]);

            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeToggle, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");
            LiveUnit.Assert.areEqual(test_handleClick, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand.element.click();
            LiveUnit.Assert.isTrue(clickWasHandled, "menuCommand click behavior not functioning");

        }

        testOverflowBehaviorOfToggleChangingValues() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeToggle, label: "1", extraClass: "c1", selected: true }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
            ]);

            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });
            var menuCommand = <WinJS.UI.MenuCommand>(Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea)[0]["winControl"]);
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");

            // Deselect the toggle button in the menu
            var menuCommandEl = (<HTMLElement> toolbar._overflowArea.children[0]);
            menuCommandEl.click();

            toolbar.element.style.width = 2 * toolbar._standardCommandWidth + "px";
            toolbar.forceLayout();

            // Ensure that the command in the main action area now has the toggle de-selected
            var command = Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea)[0];
            LiveUnit.Assert.isFalse(command.winControl.selected, "Invalid menuCommand selected property value");
        }

        testOverflowBehaviorOfFlyoutCommand(complete) {
            var flyout = new WinJS.UI.Flyout();
            this._element.appendChild(flyout.element);

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeFlyout, label: "1", extraClass: "c1", flyout: flyout }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
            ]);

            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeFlyout, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.areEqual(flyout, menuCommand.flyout, "Invalid menuCommand flyout property value");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Invalid menuCommand disabled property value");

            menuCommand.element.click();

            flyout.addEventListener("aftershow", function afterShow() {
                flyout.removeEventListener("aftershow", afterShow, false);
                complete();
            }, false);
        }

        testOverflowBehaviorOfSeparatorCommand() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
                new Command(null, { type: Helper.ToolBar.Constants.typeSeparator }),
            ]);

            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visible when a command overflow");
            var menuCommand = toolbar._overflowArea.querySelectorAll(Helper.ToolBar.Constants.commandSelector)[1]["winControl"];
            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.typeSeparator, menuCommand.type, "Invalid menuCommand type");
        }

        testOverflowBehaviorDefaultPriority() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeSeparator, label: "2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeSeparator, label: "5" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "6" }),
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            // Make sure everything fits, nothing should overflow
            this._element.style.width = (2 * toolbar._separatorWidth + 4 * toolbar._standardCommandWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Force drop 1 command
            this._element.style.width = (2 * toolbar._separatorWidth + 3 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(5 - 1 /* trailing separator is hidden */, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force command back  in the main area
            this._element.style.width = (2 * toolbar._separatorWidth + 4 * toolbar._standardCommandWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be hidden when there is no overflow");
            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop 2 commands
            this._element.style.width = (1 * toolbar._separatorWidth + 3 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(2 - 1 /* leading separator is hidden */, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop 3 commands
            this._element.style.width = (1 * toolbar._separatorWidth + 2 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop 4 commands
            this._element.style.width = (1 * toolbar._separatorWidth + 1 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(2 - 1 /* trailing separator is hidden */, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(4, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop 5 commands
            this._element.style.width = (0 * toolbar._separatorWidth + 1 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(5 - 1 /* leading separator is hidden */, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop 6 commands
            this._element.style.width = (0 * toolbar._separatorWidth + 0 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(6, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowBehaviorDefaultPriorityWithCustomContent() {
            var customEl1 = document.createElement("div");
            customEl1.style.width = "200px";
            customEl1.style.height = "50px";

            var customEl2 = document.createElement("div");
            customEl2.style.width = "350px";
            customEl2.style.height = "50px";

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(customEl1, { type: Helper.ToolBar.Constants.typeContent, label: "2" }),
                new Command(customEl2, { type: Helper.ToolBar.Constants.typeContent, label: "3" }),
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            var customContent1Width = toolbar._getCommandWidth(data.getAt(1));
            var customContent2Width = toolbar._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            this._element.style.width = (toolbar._standardCommandWidth + customContent1Width + customContent2Width) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Force drop 1 command
            this._element.style.width = (toolbar._standardCommandWidth + customContent1Width + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop 2 commands
            this._element.style.width = (toolbar._standardCommandWidth + (customContent1Width - 1) + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowBehaviorCustomPriorityContentInFlyout(complete) {
            var createCustomElement = (text: string) => {
                var customEl = document.createElement("div");
                var customContent = document.createElement("div");
                customContent.style.width = "200px";
                customContent.style.height = "50px";
                customContent.innerHTML = text;
                customContent.style.backgroundColor = "red";
                customEl.appendChild(customContent);
                return customEl;
            }

            var data = new WinJS.Binding.List([
                new Command(createCustomElement("custom 1"), { type: Helper.ToolBar.Constants.typeContent, label: "1", priority: 5, section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(createCustomElement("custom 2"), { type: Helper.ToolBar.Constants.typeContent, label: "2", priority: 5, section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            toolbar._overflowButton.click(); // TODO: replace with show() once API exists

            // Click on the first menu item
            var menuCommand = (<HTMLElement> toolbar._overflowArea.children[0]);
            menuCommand.click();
            LiveUnit.Assert.areEqual("custom 1", toolbar._customContentContainer.textContent, "The custom content flyout has invalid content");

            var testSecondCommandClick = () => {
                toolbar._customContentFlyout.removeEventListener("afterhide", testSecondCommandClick);

                // Click on the second menu item
                menuCommand = (<HTMLElement> toolbar._overflowArea.children[1]);
                menuCommand.click();
                LiveUnit.Assert.areEqual("custom 2", toolbar._customContentContainer.textContent, "The custom content flyout has invalid content");

                complete();
            };

            toolbar._customContentFlyout.addEventListener("afterhide", testSecondCommandClick);
            toolbar._customContentFlyout.hide();
        }

        testOverflowBehaviorCustomPriority() {
            var customEl = document.createElement("div");
            var customContent = document.createElement("div");
            customContent.style.width = "200px";
            customContent.style.height = "50px";
            customContent.innerHTML = "custom 2";
            customContent.style.backgroundColor = "red";
            customEl.appendChild(customContent);

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1", priority: 1 }),
                new Command(customEl, { type: Helper.ToolBar.Constants.typeContent, label: "2", priority: 5 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeSeparator, priority: 2 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3", priority: 3 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4", priority: 2 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "5", priority: 4 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeSeparator, priority: 5 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "6", priority: 5 }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "sec 1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "sec 2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            var customContentWidth = toolbar._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            this._element.style.width = (2 * toolbar._separatorWidth + 5 * toolbar._standardCommandWidth + customContentWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(8, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(toolbar._overflowButton).display, "Overflow button should be visble because there are secondary commands");
            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "Menu commands list has an invalid length");

            // Force drop priority 5 commands
            this._element.style.width = (2 * toolbar._separatorWidth + 5 * toolbar._standardCommandWidth + customContentWidth + toolbar._overflowButtonWidth - 1) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(5, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            var expectedMenuCommands = 6 /* 2 secondary commands + 1 separator + 2 primary commands with 1 separator */;
            var visibleMenuCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper.ToolBar.verifyOverflowMenuContent(visibleMenuCommands, ["2", Helper.ToolBar.Constants.typeSeparator, "6", Helper.ToolBar.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Force drop priority 4 commands
            this._element.style.width = (1 * toolbar._separatorWidth + 3 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            var expectedMenuCommands = 7 /* 2 secondary commands + 1 separator + 3 primary commands with 1 separator */;
            var visibleMenuCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper.ToolBar.verifyOverflowMenuContent(visibleMenuCommands, ["2", "5", Helper.ToolBar.Constants.typeSeparator, "6", Helper.ToolBar.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Force drop priority 3 commands
            this._element.style.width = (1 * toolbar._separatorWidth + 2 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            var expectedMenuCommands = 8 /* 2 secondary commands + 1 separator + 4 primary commands with 1 separator */;
            var visibleMenuCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper.ToolBar.verifyOverflowMenuContent(visibleMenuCommands, ["2", "3", "5", Helper.ToolBar.Constants.typeSeparator, "6", Helper.ToolBar.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Force drop priority 2 commands
            this._element.style.width = (toolbar._standardCommandWidth + toolbar._overflowButtonWidth) + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            var expectedMenuCommands = 10 /* 2 secondary commands + 1 separator + 5 primary commands with 2 separators */;
            var visibleMenuCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper.ToolBar.verifyOverflowMenuContent(visibleMenuCommands, ["2", Helper.ToolBar.Constants.typeSeparator, "3", "4", "5", Helper.ToolBar.Constants.typeSeparator, "6", Helper.ToolBar.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Force drop priority 1 commands
            this._element.style.width = toolbar._overflowButtonWidth + "px";
            toolbar.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length, "Invalid number of commands in the main action area");
            var expectedMenuCommands = 11 /* 2 secondary commands + 1 separator + 6 primary commands with 2 separator */;
            var visibleMenuCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper.ToolBar.verifyOverflowMenuContent(visibleMenuCommands, ["1", "2", Helper.ToolBar.Constants.typeSeparator, "3", "4", "5", Helper.ToolBar.Constants.typeSeparator, "6", Helper.ToolBar.Constants.typeSeparator, "sec 1", "sec 2"]);
        }

        testMinWidth() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeContent, label: "1" }),
            ]);
            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(Helper.ToolBar.Constants.toolBarMinWidth, parseInt(getComputedStyle(this._element).width, 10), "Invalid min width of toolbar element");
        }

        testOverflowAreaContainerHeightWhenThereIsNoOverflow() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeContent, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeContent, label: "2" }),
            ]);

            var toolbar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, WinJS.Utilities.getTotalHeight(toolbar._overflowArea), "Invalid height for the overflow area container when there are no commands that overflow");
        }

        testOverflowAreaContainerSize() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "5" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "6" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label ", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            // Make sure all primary commands fit
            var width = (6 * toolbar._standardCommandWidth + toolbar._overflowButtonWidth);
            this._element.style.width = width + "px";
            toolbar.forceLayout();

            toolbar._overflowButton.click(); // TODO: replace with show() once API exists

            LiveUnit.Assert.areEqual(2, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "There should only be 2 commands in the overflow area");
            LiveUnit.Assert.areEqual(2 * Helper.ToolBar.Constants.overflowCommandHeight, WinJS.Utilities.getTotalHeight(toolbar._overflowArea), "Invalid height for the overflow area container");
            LiveUnit.Assert.areEqual(width, WinJS.Utilities.getTotalWidth(toolbar._overflowArea), "Invalid width for the overflow area container");
            LiveUnit.Assert.areEqual(toolbar.element, toolbar._overflowArea.parentNode, "Invalid parent for the overflow area container");
            LiveUnit.Assert.areEqual(toolbar.element, toolbar._mainActionArea.parentNode, "Invalid parent for the main action area container");
        }

        testOverflowMaxHeightForOnlySecondaryCommands() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "5", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "6", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "7", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "8", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "9", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "1000px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            toolbar._overflowButton.click(); // TODO: replace with show() once API exists

            LiveUnit.Assert.areEqual(4.5 * Helper.ToolBar.Constants.overflowCommandHeight, WinJS.Utilities.getTotalHeight(toolbar._overflowArea), "Invalid height for the overflow area container");
            LiveUnit.Assert.areEqual(9, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length, "There should be 9 commands in the overflow area");
        }

        testOverflowMaxHeightForMixedCommands() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "5" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "6" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "7" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "8" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s3", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s4", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s5", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s6", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s7", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "320px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            toolbar._overflowButton.click(); // TODO: replace with show() once API exists

            LiveUnit.Assert.areEqual(4.5 * Helper.ToolBar.Constants.overflowCommandHeight, WinJS.Utilities.getTotalHeight(toolbar._overflowArea), "Invalid height for the overflow area container");
        }

        testKeyboarding_Opened(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3", hidden: true }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s3", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s4", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "320px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            toolbar._overflowButton.click(); // TODO: replace with show() once API exists

            toolbar.element.focus();
            setTimeout(function () {
                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.end);
                LiveUnit.Assert.areEqual("s4", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("2", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.downArrow);
                LiveUnit.Assert.areEqual("4", document.activeElement.textContent, "Down arrow should skip '3' because that command is hidden");

                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(toolbar._overflowButton, document.activeElement); 

                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("s1", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.downArrow);
                LiveUnit.Assert.areEqual("s2", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("s1", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.upArrow);
                LiveUnit.Assert.areEqual(toolbar._overflowButton, document.activeElement); 

                Helper.keydown(toolbar.element, Key.upArrow);
                LiveUnit.Assert.areEqual("4", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.upArrow);
                LiveUnit.Assert.areEqual("2", document.activeElement.textContent, "Up arrow should skip '3' because that command is hidden");
                complete();
            });
        }

        testKeyboarding_Closed(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2", disabled: true }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s3", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s4", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            this._element.style.width = (3 * toolbar._standardCommandWidth) + toolbar._overflowButtonWidth + "px";
            toolbar.forceLayout();

            // The main action area should only show | 1 | 2 (disabled) | 3  | ... |
            toolbar.element.focus();
            setTimeout(function () {
                Helper.keydown(toolbar.element, Key.downArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.end);
                LiveUnit.Assert.areEqual(toolbar._overflowButton, document.activeElement);

                Helper.keydown(toolbar.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.textContent, "Right arrow, should skip '2' because that command is disabled");

                Helper.keydown(toolbar.element, Key.downArrow);
                LiveUnit.Assert.areEqual(toolbar._overflowButton, document.activeElement);

                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(toolbar._overflowButton, document.activeElement);

                Helper.keydown(toolbar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.textContent);

                Helper.keydown(toolbar.element, Key.upArrow);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent, "Up arrow, should skip '2' because that command is disabled");
                complete();
            });
        }

        testKeyboardingWithCustomContent(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var customEl = document.createElement("div");
            var firstCheckBox = document.createElement("input");
            firstCheckBox.type = "checkbox";
            var secondCheckBox = document.createElement("input");
            secondCheckBox.type = "checkbox";
            customEl.appendChild(firstCheckBox);
            customEl.appendChild(secondCheckBox);
            var lastEl = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(customEl, { type: Helper.ToolBar.Constants.typeContent, label: "2", firstElementFocus: firstCheckBox, lastElementFocus: secondCheckBox }),
                new Command(lastEl, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
            ]);
            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            var customContentWidth = toolbar._getCommandWidth(data.getAt(1));
            this._element.style.width = (2 * toolbar._standardCommandWidth) + customContentWidth + "px";
            toolbar.forceLayout();

            // The main action area should show | 1 | 2 (custom) | 3 |

            toolbar.element.focus();
            setTimeout(function () {
                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);

                Helper.keydown(toolbar.element, Key.end);
                LiveUnit.Assert.areEqual(lastEl, document.activeElement);

                Helper.keydown(toolbar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(secondCheckBox, document.activeElement);

                Helper.keydown(toolbar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);

                Helper.keydown(toolbar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstCheckBox, document.activeElement);

                Helper.keydown(toolbar.element, Key.home);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                complete();
            });
        }

        testDataEdits(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s3", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s4", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data
            });

            this._element.style.width = (3 * toolbar._standardCommandWidth) + toolbar._overflowButtonWidth + "px";
            toolbar.forceLayout();

            // The main action area should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length);

            // Delete item wth label 3
            toolbar.data.splice(2, 1)

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual("4", Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea)[2].textContent);

                // The main action area should now show | 1 | 2 | 4  | ... |
                LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length);

                toolbar.data.splice(0, 0, new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "new" }));

                WinJS.Utilities.Scheduler.schedule(() => {
                    var visibleCommands = Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea);
                    LiveUnit.Assert.areEqual("new", visibleCommands[0].textContent);
                    LiveUnit.Assert.areEqual("1", visibleCommands[1].textContent);
                    LiveUnit.Assert.areEqual("2", visibleCommands[2].textContent);

                    // The main action area should now show | new | 1 | 2  | ... |
                    LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length);

                    this._element.style.width = "10px";
                    toolbar.forceLayout();

                    // Delete the first element
                    toolbar.data.splice(0, 1);

                    WinJS.Utilities.Scheduler.schedule(() => {
                        LiveUnit.Assert.areEqual(0, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length);
                        LiveUnit.Assert.areEqual(8, Helper.ToolBar.getVisibleCommandsInElement(toolbar._overflowArea).length);

                        complete();
                    });
                }, WinJS.Utilities.Scheduler.Priority.high);
            }, WinJS.Utilities.Scheduler.Priority.high);
        }

        testDataEditEmptyScenario(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper.ToolBar.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s1", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s2", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s3", section: Helper.ToolBar.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "s4", section: Helper.ToolBar.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var toolbar = new ToolBar(this._element, {
                data: data,
            });

            this._element.style.width = (3 * toolbar._standardCommandWidth) + toolbar._overflowButtonWidth + "px";
            toolbar.forceLayout();

            // The main action area should now show | 1 | 2 | 3 | ... |
            LiveUnit.Assert.areEqual(3, Helper.ToolBar.getVisibleCommandsInElement(toolbar._mainActionArea).length);

            // Delete all items
            toolbar.data = new WinJS.Binding.List([]);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual(2, toolbar._mainActionArea.children.length, "Only the overflow button and spacer elements should be children.");
                LiveUnit.Assert.areEqual(0, toolbar._overflowArea.children.length);
                complete();
            }, WinJS.Utilities.Scheduler.Priority.high);
        }

        testSelectionAndGlobalSection() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 1", section: 'selection' }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 2", section: 'global' }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 3", section: 'primary' }),
                new Command(null, { type: Helper.ToolBar.Constants.typeButton, label: "opt 4", section: Helper.ToolBar.Constants.secondaryCommandSection })
            ]);
            var toolbar = new ToolBar(this._element, {
                data: data
            });
            Helper.ToolBar.verifyMainActionVisibleCommandsLabels(toolbar, ["opt 1", "opt 2", "opt 3"]);
            Helper.ToolBar.verifyOverflowAreaCommandsLabels(toolbar, ["opt 4"]);
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests.ToolBarTests");
