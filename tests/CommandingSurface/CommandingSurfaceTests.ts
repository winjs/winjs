// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.CommandingSurface.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> WinJS.UI._CommandingSurface;
    var Command = <typeof WinJS.UI.PrivateCommand> WinJS.UI.AppBarCommand;
    var Util = WinJS.Utilities;
    var _Constants;

    WinJS.Utilities._require(["WinJS/Controls/CommandingSurface/_Constants"], function (constants) {
        _Constants = constants;
    })

    interface ISizeForCommandsArgs { numStandardCommands?: number; numSeparators?: number; additionalWidth?: number; visibleOverflowButton?: boolean;};

    export class _CommandingSurfaceTests {
        "use strict";

        private sizeForCommands(element: HTMLElement, args: ISizeForCommandsArgs) {
            var width =
                (args.numStandardCommands || 0) * Helper._CommandingSurface.Constants.actionAreaCommandWidth +
                (args.numSeparators || 0) * Helper._CommandingSurface.Constants.actionAreaSeparatorWidth +
                (args.additionalWidth || 0) +
                (args.visibleOverflowButton ? Helper._CommandingSurface.Constants.actionAreaOverflowButtonWidth : 0);

            element.style.width = width + "px";
        }

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
            var commandingSurface = new _CommandingSurface(this._element);
            LiveUnit.Assert.isTrue(Util.hasClass(commandingSurface.element, Helper._CommandingSurface.Constants.controlCssClass), "CommandingSurface missing control css class");
            LiveUnit.Assert.isTrue(Util.hasClass(commandingSurface.element, Helper._CommandingSurface.Constants.disposableCssClass), "CommandingSurface missing disposable css class");
        }

        testAppendToDomAfterConstruction(complete) {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2" })
            ]);
            var commandingSurface = new _CommandingSurface(null, {
                data: data
            });
            var insertedHandler = function () {
                commandingSurface.element.removeEventListener("WinJSNodeInserted", insertedHandler);
                LiveUnit.Assert.areEqual(data.length, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
                LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when the primary commands fit");
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
                complete();
            }

            commandingSurface.element.addEventListener("WinJSNodeInserted", insertedHandler);
            this._element.appendChild(commandingSurface.element);
        }

        testElementProperty() {
            var el = document.createElement("div");
            var commandingSurface = new _CommandingSurface(el);
            LiveUnit.Assert.areEqual(Util._uniqueID(el), Util._uniqueID(commandingSurface.element), "The element passed in the constructor should be the commandingSurface element");

            commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.isNotNull(commandingSurface.element, "An element should be created when one is not passed to the constructor");
        }

        testDataProperty() {
            // Verify default (empty)
            var commandingSurface = new _CommandingSurface(this._element);
            LiveUnit.Assert.areEqual(0, commandingSurface.data.length, "Empty list view should have data with length 0");
            LiveUnit.Assert.isTrue(Util.hasClass(commandingSurface.element, Helper._CommandingSurface.Constants.emptyCommandingSurfaceCssClass), "Empty commandingSurface css class that is not present");

            // Add some data
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2" })
            ]);
            commandingSurface.data = data;
            LiveUnit.Assert.areEqual(2, commandingSurface.data.length, "CommandingSurface data has an invalid length");
            LiveUnit.Assert.isFalse(Util.hasClass(commandingSurface.element, Helper._CommandingSurface.Constants.emptyCommandingSurfaceCssClass), "Empty commandingSurface css class should not be present");

            // set to invalid value
            var property = "data";
            try {

                commandingSurface[property] = { invalid: 1 };
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI._CommandingSurface.BadData", e.name);

                // Ensure the value of data did not change
                LiveUnit.Assert.areEqual(2, commandingSurface.data.length, "CommandingSurface data has an invalid length");
                LiveUnit.Assert.isFalse(Util.hasClass(commandingSurface.element, Helper._CommandingSurface.Constants.emptyCommandingSurfaceCssClass), "Empty commandingSurface css class should not be present");
            }

            // if the commandingSurface element contains children, they should be parsed as the data

            var el = document.createElement("div");
            var child = document.createElement("table");
            el.appendChild(child);
            try {
                new _CommandingSurface(el);
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI._CommandingSurface.MustContainCommands", e.name, "Toobar should have thrown MustContainCommands exception");
            }

            el = document.createElement("div");
            var commandEl: HTMLElement;
            var numberOfCommands = 5;
            for (var i = 0; i < numberOfCommands; i++) {
                commandEl = document.createElement("button");
                commandEl.setAttribute("data-win-control", Helper._CommandingSurface.Constants.commandType);
                el.appendChild(commandEl);
            }
            commandingSurface = new _CommandingSurface(el);
            LiveUnit.Assert.areEqual(numberOfCommands, commandingSurface.data.length, "CommandingSurface data has an invalid length");
            LiveUnit.Assert.isFalse(Util.hasClass(commandingSurface.element, Helper._CommandingSurface.Constants.emptyCommandingSurfaceCssClass), "Empty commandingSurface css class should not be present");
        }

        testCommandingSurfaceDispose() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.isTrue(commandingSurface.dispose);
            LiveUnit.Assert.isFalse(commandingSurface._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            commandingSurface.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            commandingSurface.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(commandingSurface._disposed);
            commandingSurface.dispose();
        }

        testVerifyDefaultTabIndex() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.areEqual("-1", commandingSurface.element.getAttribute("tabIndex"), "CommandingSurface should've assigned a default tabIndex");

            var el = document.createElement("div");
            el.setAttribute("tabIndex", "4");
            commandingSurface = new _CommandingSurface(el);
            LiveUnit.Assert.areEqual("4", commandingSurface.element.getAttribute("tabIndex"), "CommandingSurface should have not assigned a default tabIndex");
        }

        testAria() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.areEqual("menubar", commandingSurface.element.getAttribute("role"), "Missing default aria role");
            LiveUnit.Assert.areEqual("CommandingSurface", commandingSurface.element.getAttribute("aria-label"), "Missing default aria label");

            var el = document.createElement("div");
            commandingSurface = new _CommandingSurface(el);
            el.setAttribute("role", "list");
            el.setAttribute("aria-label", "myList");
            LiveUnit.Assert.areEqual("list", commandingSurface.element.getAttribute("role"), "CommandingSurface should have not set a default aria role");
            LiveUnit.Assert.areEqual("myList", commandingSurface.element.getAttribute("aria-label"), "CommandingSurface should have not set a default aria label");
        }

        testOverflowButtonHiddenWithoutSecondaryCommands() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(0, commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when the primary commands fit");
        }

        testOverflowButtonVisibleForSecondaryCommand() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2", section: Helper._CommandingSurface.Constants.secondaryCommandSection })
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(1, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when there are secondary commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowButtonVisibleForPrimaryCommand() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(0, commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when the primary commands overflow");
        }

        testForceLayout() {
            // Verify that force layout will correctly update commands layout when:
            // 1. The CommandingSurface constructor could not measure any of the commands because the CommandingSurface element was originally display "none".
            // 2. The width of the CommandingSurface itself has changed.
            // 3. The width of content commands in the CommandingSurface have changed

            var customContentBoxWidth = 100;
            var customEl = document.createElement("div");
            customEl.style.width =  customContentBoxWidth + "px";
            customEl.style.height = "50px";

            this._element.style.display = "none";
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(customEl, { type: Helper._CommandingSurface.Constants.typeContent, label: "opt 2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "sec opt 1", section: Helper._CommandingSurface.Constants.secondaryCommandSection })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            // The measurement stage of the CommandLayoutPipeline should have failed because our element was display "none". 
            // Therefore, the layout stage should not have been reached and not even secondary commands will have made it into the overflow area yet.
            // Sanity check our test expectations before we begin.
            LiveUnit.Assert.areEqual(2, commandingSurface._primaryCommands.length, "TEST ERROR: Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, commandingSurface._secondaryCommands.length, "TEST ERROR: Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "TEST ERROR: until a layout can occur, actionarea should have 3 commands");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "TEST ERROR: until a layout can occur, overflowarea should have 0 commands");

            // Restore the display, then test forceLayout
            this._element.style.display = "";
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 1 commands");

            // Decrease the width of the CommandingSurface so that it is 1px too thin to fit both primary commands, then test forceLayout.
            var customContentTotalWidth = commandingSurface._getCommandWidth(data.getAt(1));
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 1,
                additionalWidth: customContentTotalWidth - 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 1 commands");
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 3 commands");

            // Decrease width of content command by 1px so that both primary commands will fit in the action area, then test forceLayout
            customContentBoxWidth--;
            customEl.style.width = customContentBoxWidth + "px"
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 1 command");
        }

        testResizeHandler() {
            // Verify that the resize handler knows how to correctly update commands layout if the CommandingSurface width has changed.
            // Typically the resizeHandler is only called by the window resize event.

            // Make sure everything fits.
            this._element.style.width = "1000px";

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "sec opt 1", section: Helper._CommandingSurface.Constants.secondaryCommandSection })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(2, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 1 command");

            // Decrease the width of our control to fit exactly 1 command + the overflow button in the actionarea.
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);

            // Ensure that the resizeHandler will overflow one primary command into the overflowarea.
            WinJS.Utilities._resizeNotifier._handleResize();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 1 command");
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 3 commands");
        }

        testSeparatorAddedBetweenPrimaryAndSecondary() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2", section: Helper._CommandingSurface.Constants.secondaryCommandSection })
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var overflowCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(3, overflowCommands.length, "Menu commands list has an invalid length");
            LiveUnit.Assert.areEqual("opt 1", overflowCommands[0].winControl.label);
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeSeparator, overflowCommands[1].winControl.type);
            LiveUnit.Assert.areEqual("opt 2", overflowCommands[2].winControl.label);
        }

        testOverflowBehaviorOfCustomContent() {
            var customEl = document.createElement("div");
            customEl.style.width = "2000px";
            customEl.style.height = "50px";

            var data = new WinJS.Binding.List([
                new Command(customEl, { type: Helper._CommandingSurface.Constants.typeContent, label: "1", extraClass: "c1" }),
            ]);

            this._element.style.width = "200px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Custom content should overflow as a flyout menu item
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeFlyout, menuCommand.type, "Custom content should overflow with type flyout");
            LiveUnit.Assert.areEqual(commandingSurface._contentFlyout, menuCommand.flyout, "Invalid flyout target for custom command in the overflowarea");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid label for custom command in the overflowarea");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid extraClass for custom command in the overflowarea");
        }

        testOverflowBehaviorOfButtonCommand(complete) {

            WinJS.Utilities.markSupportedForProcessing(complete);

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1", extraClass: "c1", disabled: true, onclick: Helper._CommandingSurface.getVisibleCommandsInElement }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", extraClass: "c2", disabled: false, onclick: complete }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isTrue(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.getVisibleCommandsInElement, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[1]["winControl"]);
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
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
                new Command(null, { type: Helper._CommandingSurface.Constants.typeToggle, label: "1", extraClass: "c1", selected: true, onclick: test_handleClick }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", extraClass: "c2", disabled: true, onclick: test_handleClick }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeToggle, menuCommand.type, "Invalid menuCommand type");
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
                new Command(null, { type: Helper._CommandingSurface.Constants.typeToggle, label: "1", extraClass: "c1", selected: true }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");

            // Deselect the toggle button in the menu
            var menuCommandEl = (<HTMLElement> commandingSurface._dom.overflowArea.children[0]);
            menuCommandEl.click();

            var args: ISizeForCommandsArgs = {
                numStandardCommands: 2,
                visibleOverflowButton: false,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // Ensure that the command in the actionarea now has the toggle de-selected
            var command = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea)[0];
            LiveUnit.Assert.isFalse(command.winControl.selected, "Invalid menuCommand selected property value");
        }

        testOverflowBehaviorOfFlyoutCommand(complete) {
            var flyout = new WinJS.UI.Flyout();
            this._element.appendChild(flyout.element);

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeFlyout, label: "1", extraClass: "c1", flyout: flyout }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeFlyout, menuCommand.type, "Invalid menuCommand type");
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
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeSeparator }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            var menuCommand = commandingSurface._dom.overflowArea.querySelectorAll(Helper._CommandingSurface.Constants.commandSelector)[1]["winControl"];
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.typeSeparator, menuCommand.type, "Invalid menuCommand type");
        }

        testOverflowBehaviorDefaultPriority() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeSeparator, label: "2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeSeparator, label: "5" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "6" }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            // Make sure everything fits, nothing should overflow
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 4,
                numSeparators: 2,
                visibleOverflowButton: false,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Decrease size to overflow 1 command
            args = {
                numStandardCommands: 3,
                numSeparators: 2,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(5 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Increase size to put command back into the actionarea
            args = {
                numStandardCommands: 4,
                numSeparators: 2,
                visibleOverflowButton: false,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                numStandardCommands: 3,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(2 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 3 commands
            args = {
                numStandardCommands: 2,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 4 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(2 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 5 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(5 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 6 commands
            args = {
                numStandardCommands: 0,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowBehaviorDefaultPriorityWithCustomContent() {
            var customEl1 = document.createElement("div");
            customEl1.style.width = "200px";
            customEl1.style.height = "50px";

            var customEl2 = document.createElement("div");
            customEl2.style.width = "350px";
            customEl2.style.height = "50px";

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(customEl1, { type: Helper._CommandingSurface.Constants.typeContent, label: "2" }),
                new Command(customEl2, { type: Helper._CommandingSurface.Constants.typeContent, label: "3" }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var customContent1Width = commandingSurface._getCommandWidth(data.getAt(1));
            var customContent2Width = commandingSurface._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width + customContent2Width,
                visibleOverflowButton: false,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Decrease size to overflow 1 command
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width - 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
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
                new Command(createCustomElement("custom 1"), { type: Helper._CommandingSurface.Constants.typeContent, label: "1", priority: 5, section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(createCustomElement("custom 2"), { type: Helper._CommandingSurface.Constants.typeContent, label: "2", priority: 5, section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            commandingSurface._dom.overflowButton.click(); // TODO: replace with show() once API exists

            // Click on the first menu item
            var menuCommand = (<HTMLElement> commandingSurface._dom.overflowArea.children[0]);
            menuCommand.click();
            LiveUnit.Assert.areEqual("custom 1", commandingSurface._contentFlyoutInterior.textContent, "The custom content flyout has invalid content");

            var testSecondCommandClick = () => {
                commandingSurface._contentFlyout.removeEventListener("afterhide", testSecondCommandClick);

                // Click on the second menu item
                menuCommand = (<HTMLElement> commandingSurface._dom.overflowArea.children[1]);
                menuCommand.click();
                LiveUnit.Assert.areEqual("custom 2", commandingSurface._contentFlyoutInterior.textContent, "The custom content flyout has invalid content");

                complete();
            };

            commandingSurface._contentFlyout.addEventListener("afterhide", testSecondCommandClick);
            commandingSurface._contentFlyout.hide();
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
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1", priority: 1 }),
                new Command(customEl, { type: Helper._CommandingSurface.Constants.typeContent, label: "2", priority: 5 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeSeparator, priority: 2 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3", priority: 3 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4", priority: 2 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "5", priority: 4 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeSeparator, priority: 5 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "6", priority: 5 }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "sec 1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "sec 2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var customContentWidth = commandingSurface._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 5,
                numSeparators: 2,
                additionalWidth: customContentWidth,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visble because there are secondary commands");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow priority 5 commands
            args = {
                numStandardCommands: 5,
                numSeparators: 2,
                additionalWidth: customContentWidth - 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(5, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 6 /* 2 secondary commands + 1 separator + 2 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", Helper._CommandingSurface.Constants.typeSeparator, "6", Helper._CommandingSurface.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 4 commands
            args = {
                numStandardCommands: 3,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 7 /* 2 secondary commands + 1 separator + 3 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "5", Helper._CommandingSurface.Constants.typeSeparator, "6", Helper._CommandingSurface.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 3 commands
            args = {
                numStandardCommands: 2,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 8 /* 2 secondary commands + 1 separator + 4 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "3", "5", Helper._CommandingSurface.Constants.typeSeparator, "6", Helper._CommandingSurface.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 2 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 10 /* 2 secondary commands + 1 separator + 5 primary commands with 2 separators */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", Helper._CommandingSurface.Constants.typeSeparator, "3", "4", "5", Helper._CommandingSurface.Constants.typeSeparator, "6", Helper._CommandingSurface.Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 1 commands
            args = {
                numStandardCommands: 0,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 11 /* 2 secondary commands + 1 separator + 6 primary commands with 2 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["1", "2", Helper._CommandingSurface.Constants.typeSeparator, "3", "4", "5", Helper._CommandingSurface.Constants.typeSeparator, "6", Helper._CommandingSurface.Constants.typeSeparator, "sec 1", "sec 2"]);
        }

        testMinWidth() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeContent, label: "1" }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.commandingSurfaceMinWidth, parseInt(getComputedStyle(this._element).width, 10), "Invalid min width of commandingSurface element");
        }

        testOverflowAreaContainerHeightWhenThereIsNoOverflow() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeContent, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeContent, label: "2" }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, WinJS.Utilities.getTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container when there are no commands that overflow");
        }

        testOverflowAreaContainerSize() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "5" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "6" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label ", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            // Make sure primary commands fit exactly
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 6,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            //this._element.style.width = width + "px";
            commandingSurface.forceLayout();

            commandingSurface._dom.overflowButton.click(); // TODO: replace with show() once API exists

            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "There should only be 2 commands in the overflowarea");
            LiveUnit.Assert.areEqual(2 * Helper._CommandingSurface.Constants.overflowCommandHeight, WinJS.Utilities.getTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(parseInt(this._element.style.width), WinJS.Utilities.getTotalWidth(commandingSurface._dom.overflowArea), "Invalid width for the overflowarea container");
            LiveUnit.Assert.areEqual(commandingSurface.element, commandingSurface._dom.overflowArea.parentNode, "Invalid parent for the overflowarea container");
            LiveUnit.Assert.areEqual(commandingSurface.element, commandingSurface._dom.actionArea.parentNode, "Invalid parent for the actionarea container");
        }

        testOverflowMaxHeightForOnlySecondaryCommands() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "5", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "6", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "7", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "8", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "9", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "1000px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            commandingSurface._dom.overflowButton.click(); // TODO: replace with show() once API exists

            LiveUnit.Assert.areEqual(4.5 * Helper._CommandingSurface.Constants.overflowCommandHeight, WinJS.Utilities.getTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(9, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "There should be 9 commands in the overflowarea");
        }

        testOverflowMaxHeightForMixedCommands() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "5" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "6" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "7" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "8" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s3", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s4", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s5", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s6", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s7", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "320px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            commandingSurface._dom.overflowButton.click(); // TODO: replace with show() once API exists

            LiveUnit.Assert.areEqual(4.5 * Helper._CommandingSurface.Constants.overflowCommandHeight, WinJS.Utilities.getTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
        }

        testKeyboarding_Opened(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3", hidden: true }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s3", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s4", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "320px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            commandingSurface._dom.overflowButton.click(); // TODO: replace with show() once API exists

            commandingSurface.element.focus();
            setTimeout(function () {
                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.end);
                LiveUnit.Assert.areEqual("s4", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("2", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.downArrow);
                LiveUnit.Assert.areEqual("4", document.activeElement.textContent, "Down arrow should skip '3' because that command is hidden");

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("s1", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.downArrow);
                LiveUnit.Assert.areEqual("s2", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("s1", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.upArrow);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.upArrow);
                LiveUnit.Assert.areEqual("4", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.upArrow);
                LiveUnit.Assert.areEqual("2", document.activeElement.textContent, "Up arrow should skip '3' because that command is hidden");
                complete();
            });
        }

        testKeyboarding_Closed(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2", disabled: true }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s3", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s4", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var args: ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should only show | 1 | 2 (disabled) | 3  | ... |
            commandingSurface.element.focus();
            setTimeout(function () {
                Helper.keydown(commandingSurface.element, Key.downArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.end);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.textContent, "Right arrow, should skip '2' because that command is disabled");

                Helper.keydown(commandingSurface.element, Key.downArrow);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.textContent);

                Helper.keydown(commandingSurface.element, Key.upArrow);
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
                new Command(firstEL, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(customEl, { type: Helper._CommandingSurface.Constants.typeContent, label: "2", firstElementFocus: firstCheckBox, lastElementFocus: secondCheckBox }),
                new Command(lastEl, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var customContentWidth = commandingSurface._getCommandWidth(data.getAt(1));
            var args: ISizeForCommandsArgs = {
                numStandardCommands: 2,
                additionalWidth: customContentWidth,
                visibleOverflowButton: false,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should show | 1 | 2 (custom) | 3 |

            commandingSurface.element.focus();
            setTimeout(function () {
                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.end);
                LiveUnit.Assert.areEqual(lastEl, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(secondCheckBox, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstCheckBox, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.home);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                complete();
            });
        }

        testDataEdits(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s3", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s4", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var args: ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

            // Delete item wth label 3
            commandingSurface.data.splice(2, 1)

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual("4", Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea)[2].textContent);

                // The actionarea should now show | 1 | 2 | 4  | ... |
                LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

                commandingSurface.data.splice(0, 0, new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "new" }));

                WinJS.Utilities.Scheduler.schedule(() => {
                    var visibleCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea);
                    LiveUnit.Assert.areEqual("new", visibleCommands[0].textContent);
                    LiveUnit.Assert.areEqual("1", visibleCommands[1].textContent);
                    LiveUnit.Assert.areEqual("2", visibleCommands[2].textContent);

                    // The actionarea should now show | new | 1 | 2  | ... |
                    LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

                    this._element.style.width = "10px";
                    commandingSurface.forceLayout();

                    // Delete the first element
                    commandingSurface.data.splice(0, 1);

                    WinJS.Utilities.Scheduler.schedule(() => {
                        LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);
                        LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length);

                        complete();
                    });
                }, WinJS.Utilities.Scheduler.Priority.high);
            }, WinJS.Utilities.Scheduler.Priority.high);
        }

        testDataEditEmptyScenario(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: Helper._CommandingSurface.Constants.typeButton, label: "1" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "2" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "3" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "4" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s1", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s2", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s3", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "s4", section: Helper._CommandingSurface.Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
            });

            var args: ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            this.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should now show | 1 | 2 | 3 | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

            // Delete all items
            commandingSurface.data = new WinJS.Binding.List([]);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual(2, commandingSurface._dom.actionArea.children.length, "Only the overflow button and spacer elements should be children.");
                LiveUnit.Assert.areEqual(0, commandingSurface._dom.overflowArea.children.length);
                complete();
            }, WinJS.Utilities.Scheduler.Priority.high);
        }

        testSelectionAndGlobalSection() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 1", section: 'selection' }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 2", section: 'global' }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 3", section: 'primary' }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, label: "opt 4", section: Helper._CommandingSurface.Constants.secondaryCommandSection })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });
            Helper._CommandingSurface.verifyActionAreaVisibleCommandsLabels(commandingSurface, ["opt 1", "opt 2", "opt 3"]);
            Helper._CommandingSurface.verifyOverflowAreaCommandsLabels(commandingSurface, ["opt 4"]);
        }

        testClosedDisplayModeConstructorOptions() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.areEqual(_Constants.defaultClosedDisplayMode, commandingSurface.closedDisplayMode, "'closedDisplayMode' property has incorrect default value.");
            commandingSurface.dispose();

            Object.keys(_CommandingSurface.ClosedDisplayMode).forEach(function (mode) {
                commandingSurface = new _CommandingSurface(null, { closedDisplayMode: mode });
                LiveUnit.Assert.areEqual(mode, commandingSurface.closedDisplayMode, "closedDisplayMode does not match the value passed to the constructor.");
                commandingSurface.dispose();
            })
        }

        testClosedDisplayModes() {
            this._element.style.width = "1000px";
            var fullHeightOfContent = 100;
            var contentElement = document.createElement("DIV");
            contentElement.style.height = fullHeightOfContent + "px";
            contentElement.style.border = "none";

            var data = new WinJS.Binding.List([
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeSeparator }),
                new Command(contentElement, { type: Helper._CommandingSurface.Constants.typeContent, label: "content" }),
                new Command(null, { type: Helper._CommandingSurface.Constants.typeButton, section: 'secondary', label: "secondary" }),
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            Object.keys(_CommandingSurface.ClosedDisplayMode).forEach(function (mode) {
                verifyClosedDisplayMode(mode)
            });

            function verifyClosedDisplayMode(mode) {
                commandingSurface.closedDisplayMode = mode;
                LiveUnit.Assert.areEqual(mode, commandingSurface.closedDisplayMode, "closedDisplayMode property should be writeable.");

                var commands = commandingSurface._primaryCommands,
                    commandingSurfaceTotalHeight = WinJS.Utilities.getTotalHeight(commandingSurface.element),
                    actionAreaTotalHeight = WinJS.Utilities.getTotalHeight(commandingSurface._dom.actionArea),
                    actionAreaContentHeight = WinJS.Utilities.getContentHeight(commandingSurface._dom.actionArea),
                    overflowButtonTotalHeight = WinJS.Utilities.getTotalHeight(commandingSurface._dom.overflowButton),
                    overflowAreaTotalHeight = WinJS.Utilities.getTotalHeight(commandingSurface._dom.overflowArea);

                switch (mode) {
                    case 'none':
                        LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface.element).display);
                        LiveUnit.Assert.areEqual(0, actionAreaTotalHeight);
                        LiveUnit.Assert.areEqual(0, overflowButtonTotalHeight);
                        LiveUnit.Assert.areEqual(0, overflowAreaTotalHeight);
                        break;

                    case 'minimal':
                        LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
                        LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.heightOfMinimal, actionAreaContentHeight, "invalid ActionArea content height for 'minimal' closedDisplayMode");
                        LiveUnit.Assert.areEqual(actionAreaContentHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");

                        // Verify commands are not displayed.
                        if (Array.prototype.some.call(commands, function (command) {
                            return getComputedStyle(command.element).display !== "none";
                        })) {
                            LiveUnit.Assert.fail("CommandingSurface with 'minimal' closedDisplayMode should not display primary commands.");
                        }

                        LiveUnit.Assert.areEqual(0, overflowAreaTotalHeight);
                        break;

                    case 'compact':
                        LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
                        LiveUnit.Assert.areEqual(Helper._CommandingSurface.Constants.heightOfCompact, actionAreaContentHeight, "invalid ActionArea content height for 'compact' closedDisplayMode");
                        LiveUnit.Assert.areEqual(actionAreaContentHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");

                        // Verify commands are displayed.
                        if (Array.prototype.some.call(commands, function (command) {
                            return getComputedStyle(command.element).display === "none";
                        })) {
                            LiveUnit.Assert.fail("CommandingSurface with 'compact' closedDisplayMode should display primary commands.");
                        }

                        // Verify command labels are not displayed.
                        if (Array.prototype.some.call(commands, function (command) {
                            var label = command.element.querySelector(".win-label");
                            return (label && getComputedStyle(label).display !== "none");
                        })) {
                            LiveUnit.Assert.fail("CommandingSurface with 'compact' closedDisplayMode should not display primary command labels.");
                        }

                        LiveUnit.Assert.areEqual(0, overflowAreaTotalHeight);
                        break;

                    case 'full':
                        LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
                        LiveUnit.Assert.areEqual(fullHeightOfContent, actionAreaContentHeight, "Height of actionarea should size to its content when closedDisplayMode === 'full'");
                        LiveUnit.Assert.areEqual(actionAreaTotalHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");

                        // Verify commands are displayed.
                        if (Array.prototype.some.call(commands, function (command) {
                            return getComputedStyle(command.element).display === "none";
                        })) {
                            LiveUnit.Assert.fail("CommandingSurface with 'compact' closedDisplayMode should display primary commands.");
                        }

                        // Verify command labels are displayed.
                        if (Array.prototype.some.call(commands, function (command) {
                            var label = command.element.querySelector(".win-label");
                            return (label && getComputedStyle(label).display == "none");
                        })) {
                            LiveUnit.Assert.fail("CommandingSurface with 'compact' closedDisplayMode should display primary command labels.");
                        }

                        LiveUnit.Assert.areEqual(0, overflowAreaTotalHeight);
                        break;

                    default:
                        LiveUnit.Assert.fail("TEST ERROR: Encountered unknown enum value: " + mode);
                        break;
                }
            }
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests._CommandingSurfaceTests");
