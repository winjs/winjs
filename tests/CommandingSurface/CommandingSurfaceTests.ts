// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.CommandingSurface.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    var _Constants = Helper.require("WinJS/Controls/CommandingSurface/_Constants");
    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;
    var Command = <typeof WinJS.UI.PrivateCommand> WinJS.UI.AppBarCommand;
    var Util = WinJS.Utilities;

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. onbeforeopen) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(testElement, registerForEvent: (commandingSurface: WinJS.UI.PrivateCommandingSurface, eventName: string, handler: Function) => void) {
        var commandingSurface = new _CommandingSurface(testElement);
        Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

        var counter = 0;
        registerForEvent(commandingSurface, _Constants.EventNames.beforeOpen, () => {
            LiveUnit.Assert.areEqual(1, counter, _Constants.EventNames.beforeOpen + " fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(commandingSurface.opened, _Constants.EventNames.beforeOpen + ": CommandingSurface should not be in opened state");
        });
        registerForEvent(commandingSurface, _Constants.EventNames.afterOpen, () => {
            LiveUnit.Assert.areEqual(2, counter, _Constants.EventNames.afterOpen + " fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(commandingSurface.opened, _Constants.EventNames.afterOpen + ": CommandingSurface should be in opened state");
        });
        registerForEvent(commandingSurface, _Constants.EventNames.beforeClose, () => {
            LiveUnit.Assert.areEqual(4, counter, _Constants.EventNames.beforeClose + " fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(commandingSurface.opened, _Constants.EventNames.beforeClose + ": CommandingSurface should be in opened state");
        });
        registerForEvent(commandingSurface, _Constants.EventNames.afterClose, () => {
            LiveUnit.Assert.areEqual(5, counter, _Constants.EventNames.afterClose + " fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(commandingSurface.opened, _Constants.EventNames.afterClose + ": CommandingSurface should not be in opened state");
        });

        LiveUnit.Assert.areEqual(0, counter, "before open: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isFalse(commandingSurface.opened, "before open: CommandingSurface should not be in opened state");

        commandingSurface.open();
        LiveUnit.Assert.areEqual(3, counter, "after open: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isTrue(commandingSurface.opened, "after open: CommandingSurface should be in opened state");

        commandingSurface.close();
        LiveUnit.Assert.areEqual(6, counter, "after close: wrong number of events fired");
        LiveUnit.Assert.isFalse(commandingSurface.opened, "after close: CommandingSurface should not be in opened state");
    }

    function failEventHandler(eventName: string, msg?: string) {
        return function () {
            LiveUnit.Assert.fail("Failure, " + eventName + " dectected: " + msg);
        };
    }

    export class _CommandingSurfaceTests {
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
                if (this._element.winControl) {
                    this._element.winControl.dispose();
                }
                if (this._element.parentElement) {
                    this._element.parentElement.removeChild(this._element);
                }
                this._element = null;
            }
        }

        testConstruction() {
            var commandingSurface = new _CommandingSurface(this._element);
            LiveUnit.Assert.isTrue(Util.hasClass(commandingSurface.element, _Constants.ClassNames.controlCssClass), "CommandingSurface missing control css class");
            LiveUnit.Assert.isTrue(Util.hasClass(commandingSurface.element, _Constants.ClassNames.disposableCssClass), "CommandingSurface missing disposable css class");
        }

        testAppendToDomAfterConstruction(complete) {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
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
            LiveUnit.Assert.areEqual(0, commandingSurface.data.length, "Empty CommandingSurface should have length 0");

            // Add some data
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            commandingSurface.data = data;
            LiveUnit.Assert.areEqual(2, commandingSurface.data.length, "CommandingSurface data has an invalid length");
        }

        testBadData() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);

            var commandingSurface = new _CommandingSurface(this._element, { data: data });

            // set data to invalid value
            var property = "data";
            try {
                commandingSurface[property] = { invalid: 1 };
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI._CommandingSurface.BadData", e.name);

                // Ensure the value of data did not change
                LiveUnit.Assert.areEqual(2, commandingSurface.data.length, "CommandingSurface data has an invalid length");
            }
        }

        testDeclarativeData() {
            // Verify that if the CommandingSurface element contains children elements at construction, those elements are parsed as data.
            var el = document.createElement("div");
            var child = document.createElement("table");
            el.appendChild(child);
            var commandingSurface: WinJS.UI.PrivateCommandingSurface;
            try {
                new _CommandingSurface(el);
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI._CommandingSurface.MustContainCommands", e.name, "Toobar should have thrown MustContainCommands exception");
            } finally {

            }

            el = document.createElement("div");
            var commandEl: HTMLElement;
            var numberOfCommands = 5;
            for (var i = 0; i < numberOfCommands; i++) {
                commandEl = document.createElement("button");
                commandEl.setAttribute("data-win-control", "WinJS.UI.AppBarCommand");
                el.appendChild(commandEl);
            }
            commandingSurface = new _CommandingSurface(el);
            LiveUnit.Assert.areEqual(numberOfCommands, commandingSurface.data.length, "CommandingSurface declarative commands were not parsed as data.");
            LiveUnit.Assert.isFalse(Util.hasClass(commandingSurface.element, _Constants.ClassNames.emptyCommandingSurfaceCssClass), "Empty commandingSurface css class should not be present");
        }

        testDispose() {
            var commandingSurface = new _CommandingSurface(this._element);
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);
            commandingSurface.open();

            var msg = "Shouldn't have fired due to control being disposed";
            commandingSurface.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            commandingSurface.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            commandingSurface.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            commandingSurface.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            commandingSurface.dispose();
            LiveUnit.Assert.isTrue(commandingSurface._disposed, "CommandingSurface didn't mark itself as disposed");
            LiveUnit.Assert.areEqual("Disposed", commandingSurface._machine._state.name, "CommandingSurface didn't move into the disposed state");

            // Events should not fire.
            commandingSurface.close();
            commandingSurface.open();
        }

        testDoubleDispose() {
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

        //xtestAria() {
        //    var commandingSurface = new _CommandingSurface();
        //    LiveUnit.Assert.areEqual("menubar", commandingSurface.element.getAttribute("role"), "Missing default aria role");
        //    LiveUnit.Assert.areEqual("CommandingSurface", commandingSurface.element.getAttribute("aria-label"), "Missing default aria label");

        //    var el = document.createElement("div");
        //    commandingSurface = new _CommandingSurface(el);
        //    el.setAttribute("role", "list");
        //    el.setAttribute("aria-label", "myList");
        //    LiveUnit.Assert.areEqual("list", commandingSurface.element.getAttribute("role"), "CommandingSurface should have not set a default aria role");
        //    LiveUnit.Assert.areEqual("myList", commandingSurface.element.getAttribute("aria-label"), "CommandingSurface should have not set a default aria label");
        //}

        testOverflowButtonHiddenWithoutSecondaryCommands() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
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
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(1, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when there are secondary commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowButtonVisibleForOverflowingPrimaryCommand() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
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
            customEl.style.width = customContentBoxWidth + "px";
            customEl.style.height = "50px";

            this._element.style.display = "none";
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(customEl, { type: _Constants.typeContent, label: "opt 2" }),
                new Command(null, { type: _Constants.typeButton, label: "sec opt 1", section: _Constants.secondaryCommandSection })
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
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 1,
                additionalWidth: customContentTotalWidth - 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" }),
                new Command(null, { type: _Constants.typeButton, label: "sec opt 1", section: _Constants.secondaryCommandSection })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(2, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 1 command");

            // Decrease the width of our control to fit exactly 1 command + the overflow button in the actionarea.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);

            // Ensure that the resizeHandler will overflow one primary command into the overflowarea.
            WinJS.Utilities._resizeNotifier._handleResize();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "actionarea should have 1 command");
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "overflowarea should have 3 commands");
        }

        testSeparatorAddedBetweenPrimaryAndSecondary() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var overflowCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(3, overflowCommands.length, "Menu commands list has an invalid length");
            LiveUnit.Assert.areEqual("opt 1", overflowCommands[0].winControl.label);
            LiveUnit.Assert.areEqual(_Constants.typeSeparator, overflowCommands[1].winControl.type);
            LiveUnit.Assert.areEqual("opt 2", overflowCommands[2].winControl.label);
        }

        testOverflowBehaviorOfCustomContent() {
            var customEl = document.createElement("div");
            customEl.style.width = "2000px";
            customEl.style.height = "50px";

            var data = new WinJS.Binding.List([
                new Command(customEl, { type: _Constants.typeContent, label: "1", extraClass: "c1" }),
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
            LiveUnit.Assert.areEqual(_Constants.typeFlyout, menuCommand.type, "Custom content should overflow with type flyout");
            LiveUnit.Assert.areEqual(commandingSurface._contentFlyout, menuCommand.flyout, "Invalid flyout target for custom command in the overflowarea");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid label for custom command in the overflowarea");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid extraClass for custom command in the overflowarea");
        }

        testOverflowBehaviorOfButtonCommand(complete) {

            WinJS.Utilities.markSupportedForProcessing(complete);

            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "1", extraClass: "c1", disabled: true, onclick: Helper._CommandingSurface.getVisibleCommandsInElement }),
                new Command(null, { type: _Constants.typeButton, label: "2", extraClass: "c2", disabled: false, onclick: complete }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isTrue(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.getVisibleCommandsInElement, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[1]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
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
                new Command(null, { type: _Constants.typeToggle, label: "1", extraClass: "c1", selected: true, onclick: test_handleClick }),
                new Command(null, { type: _Constants.typeButton, label: "2", extraClass: "c2", disabled: true, onclick: test_handleClick }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeToggle, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");
            LiveUnit.Assert.areEqual(test_handleClick, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand.element.click();
            LiveUnit.Assert.isTrue(clickWasHandled, "menuCommand click behavior not functioning");

        }

        testOverflowBehaviorOfToggleCommandChangingValues() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeToggle, label: "1", extraClass: "c1", selected: true }),
                new Command(null, { type: _Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
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

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 2,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // Ensure that the command in the actionarea now has the toggle de-selected
            var command = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea)[0];
            LiveUnit.Assert.isFalse(command.winControl.selected, "Invalid menuCommand selected property value");
        }

        testOverflowBehaviorOfFlyoutCommand(complete) {
            var flyout = new WinJS.UI.Flyout();
            this._element.parentElement.appendChild(flyout.element);

            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeFlyout, label: "1", extraClass: "c1", flyout: flyout }),
                new Command(null, { type: _Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeFlyout, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.areEqual(flyout, menuCommand.flyout, "Invalid menuCommand flyout property value");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Invalid menuCommand disabled property value");

            menuCommand.element.click();

            flyout.addEventListener("aftershow", function afterShow() {
                flyout.removeEventListener("aftershow", afterShow, false);
                flyout.dispose()
                flyout.element.parentElement.removeChild(flyout.element);
                complete();
            }, false);
        }

        testOverflowBehaviorOfSeparatorCommand() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "2", extraClass: "c2", disabled: true }),
                new Command(null, { type: _Constants.typeSeparator }),
            ]);

            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
            var menuCommand = commandingSurface._dom.overflowArea.querySelectorAll(_Constants.commandSelector)[1]["winControl"];
            LiveUnit.Assert.areEqual(_Constants.typeSeparator, menuCommand.type, "Invalid menuCommand type");
        }

        testOverflowBehaviorDefaultPriority() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "1" }),
                new Command(null, { type: _Constants.typeSeparator, label: "2" }),
                new Command(null, { type: _Constants.typeButton, label: "3" }),
                new Command(null, { type: _Constants.typeButton, label: "4" }),
                new Command(null, { type: _Constants.typeSeparator, label: "5" }),
                new Command(null, { type: _Constants.typeButton, label: "6" }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 4,
                numSeparators: 2,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Decrease size to overflow 1 command
            args = {
                numStandardCommands: 3,
                numSeparators: 2,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
                new Command(null, { type: _Constants.typeButton, label: "1" }),
                new Command(customEl1, { type: _Constants.typeContent, label: "2" }),
                new Command(customEl2, { type: _Constants.typeContent, label: "3" }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var customContent1Width = commandingSurface._getCommandWidth(data.getAt(1));
            var customContent2Width = commandingSurface._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width + customContent2Width,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
                new Command(createCustomElement("custom 1"), { type: _Constants.typeContent, label: "1", priority: 5, section: _Constants.secondaryCommandSection }),
                new Command(createCustomElement("custom 2"), { type: _Constants.typeContent, label: "2", priority: 5, section: _Constants.secondaryCommandSection }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                opened: true,
            });

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
                new Command(null, { type: _Constants.typeButton, label: "1", priority: 1 }),
                new Command(customEl, { type: _Constants.typeContent, label: "2", priority: 5 }),
                new Command(null, { type: _Constants.typeSeparator, priority: 2 }),
                new Command(null, { type: _Constants.typeButton, label: "3", priority: 3 }),
                new Command(null, { type: _Constants.typeButton, label: "4", priority: 2 }),
                new Command(null, { type: _Constants.typeButton, label: "5", priority: 4 }),
                new Command(null, { type: _Constants.typeSeparator, priority: 5 }),
                new Command(null, { type: _Constants.typeButton, label: "6", priority: 5 }),
                new Command(null, { type: _Constants.typeButton, label: "sec 1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "sec 2", section: _Constants.secondaryCommandSection }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var customContentWidth = commandingSurface._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 5,
                numSeparators: 2,
                additionalWidth: customContentWidth,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(5, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 6 /* 2 secondary commands + 1 separator + 2 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 4 commands
            args = {
                numStandardCommands: 3,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 7 /* 2 secondary commands + 1 separator + 3 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 3 commands
            args = {
                numStandardCommands: 2,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 8 /* 2 secondary commands + 1 separator + 4 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "3", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 2 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 10 /* 2 secondary commands + 1 separator + 5 primary commands with 2 separators */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", _Constants.typeSeparator, "3", "4", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 1 commands
            args = {
                numStandardCommands: 0,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 11 /* 2 secondary commands + 1 separator + 6 primary commands with 2 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["1", "2", _Constants.typeSeparator, "3", "4", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);
        }

        testMinWidth() {
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element);
            LiveUnit.Assert.areEqual(_Constants.controlMinWidth, parseInt(getComputedStyle(this._element).width, 10), "Invalid min width of commandingSurface element");
        }

        testOverflowAreaContainerHeightWhenThereIsNoOverflow() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeContent, label: "1" }),
                new Command(null, { type: _Constants.typeContent, label: "2" }),
            ]);

            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container when there are no commands that overflow");
        }

        xtestOverflowAreaContainerSize() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "1" }),
                new Command(null, { type: _Constants.typeButton, label: "2" }),
                new Command(null, { type: _Constants.typeButton, label: "3" }),
                new Command(null, { type: _Constants.typeButton, label: "4" }),
                new Command(null, { type: _Constants.typeButton, label: "5" }),
                new Command(null, { type: _Constants.typeButton, label: "6" }),
                new Command(null, { type: _Constants.typeButton, label: "1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label this is a really long label ", section: _Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                opened: true,
            });

            // Make sure primary commands fit exactly
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 6,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "There should only be 2 commands in the overflowarea");
            LiveUnit.Assert.areEqual(2 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(parseInt(this._element.style.width), WinJS.Utilities._getPreciseTotalWidth(commandingSurface._dom.overflowArea), "Invalid width for the overflowarea container");
            LiveUnit.Assert.areEqual(commandingSurface.element, commandingSurface._dom.overflowArea.parentNode, "Invalid parent for the overflowarea container");
            LiveUnit.Assert.areEqual(commandingSurface.element, commandingSurface._dom.actionArea.parentNode, "Invalid parent for the actionarea container");
        }

        xtestOverflowMaxHeightForOnlySecondaryCommands() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "2", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "3", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "4", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "5", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "6", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "7", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "8", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "9", section: _Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "1000px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                opened: true,
            });

            LiveUnit.Assert.areEqual(4.5 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(9, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "There should be 9 commands in the overflowarea");
        }

        xtestOverflowMaxHeightForMixedCommands() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "1" }),
                new Command(null, { type: _Constants.typeButton, label: "2" }),
                new Command(null, { type: _Constants.typeButton, label: "3" }),
                new Command(null, { type: _Constants.typeButton, label: "4" }),
                new Command(null, { type: _Constants.typeButton, label: "5" }),
                new Command(null, { type: _Constants.typeButton, label: "6" }),
                new Command(null, { type: _Constants.typeButton, label: "7" }),
                new Command(null, { type: _Constants.typeButton, label: "8" }),
                new Command(null, { type: _Constants.typeButton, label: "s1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s2", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s3", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s4", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s5", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s6", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s7", section: _Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "320px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                opened: true,
            });

            LiveUnit.Assert.areEqual(4.5 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
        }

        testKeyboarding_Opened(complete) {
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: _Constants.typeButton, label: "1" }),
                new Command(null, { type: _Constants.typeButton, label: "2" }),
                new Command(null, { type: _Constants.typeButton, label: "3", hidden: true }),
                new Command(null, { type: _Constants.typeButton, label: "4" }),
                new Command(null, { type: _Constants.typeButton, label: "s1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s2", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s3", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s4", section: _Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "320px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                opened: true,
            });

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

        xtestKeyboarding_Closed(complete) { // TODO reenable when new keyboarding model is decided.
            var Key = WinJS.Utilities.Key;
            var firstEL = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstEL, { type: _Constants.typeButton, icon: "1", label: "1" }),
                new Command(null, { type: _Constants.typeButton, icon: "2", label: "2", disabled: true }),
                new Command(null, { type: _Constants.typeButton, icon: "3", label: "3" }),
                new Command(null, { type: _Constants.typeButton, icon: "4", label: "4" }),
                new Command(null, { type: _Constants.typeButton, label: "s1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s2", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s3", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s4", section: _Constants.secondaryCommandSection })
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
                new Command(firstEL, { type: _Constants.typeButton, label: "1" }),
                new Command(customEl, { type: _Constants.typeContent, label: "2", firstElementFocus: firstCheckBox, lastElementFocus: secondCheckBox }),
                new Command(lastEl, { type: _Constants.typeButton, label: "3" }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var customContentWidth = commandingSurface._getCommandWidth(data.getAt(1));
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 2,
                additionalWidth: customContentWidth,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
                new Command(firstEL, { type: _Constants.typeButton, label: "1" }),
                new Command(null, { type: _Constants.typeButton, label: "2" }),
                new Command(null, { type: _Constants.typeButton, label: "3" }),
                new Command(null, { type: _Constants.typeButton, label: "4" }),
                new Command(null, { type: _Constants.typeButton, label: "s1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s2", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s3", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s4", section: _Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

            // Delete item wth label 3
            commandingSurface.data.splice(2, 1)

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual("4", Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea)[2].textContent);

                // The actionarea should now show | 1 | 2 | 4  | ... |
                LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

                commandingSurface.data.splice(0, 0, new Command(null, { type: _Constants.typeButton, label: "new" }));

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
                new Command(firstEL, { type: _Constants.typeButton, label: "1" }),
                new Command(null, { type: _Constants.typeButton, label: "2" }),
                new Command(null, { type: _Constants.typeButton, label: "3" }),
                new Command(null, { type: _Constants.typeButton, label: "4" }),
                new Command(null, { type: _Constants.typeButton, label: "s1", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s2", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s3", section: _Constants.secondaryCommandSection }),
                new Command(null, { type: _Constants.typeButton, label: "s4", section: _Constants.secondaryCommandSection }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
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
                new Command(null, { type: _Constants.typeButton, label: "opt 1", section: 'selection' }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: 'global' }),
                new Command(null, { type: _Constants.typeButton, label: "opt 3", section: 'primary' }),
                new Command(null, { type: _Constants.typeButton, label: "opt 4", section: _Constants.secondaryCommandSection })
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
            var contentElement = document.createElement("DIV");
            contentElement.style.height = "100px";
            contentElement.style.border = "none";

            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(contentElement, { type: _Constants.typeContent, label: "content" }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" }),
            ]);
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                opened: false,
            });

            var msg = "Changing the closedDisplayMode property should not trigger this event";
            commandingSurface.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            commandingSurface.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            commandingSurface.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            commandingSurface.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            Object.keys(_CommandingSurface.ClosedDisplayMode).forEach(function (mode) {
                commandingSurface.closedDisplayMode = mode;
                LiveUnit.Assert.areEqual(mode, commandingSurface.closedDisplayMode, "closedDisplayMode property should be writeable.");
                Helper._CommandingSurface.verifyRenderedClosed(commandingSurface);
            });
        }

        testOpen() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            commandingSurface.open();
            LiveUnit.Assert.isTrue(commandingSurface.opened)
            Helper._CommandingSurface.verifyRenderedOpened(commandingSurface);
        }

        testOpenIsIdempotent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            // Initialize opened.
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: true });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            var msg = "Opening an already opened AppBar should not fire events";
            commandingSurface.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            commandingSurface.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            commandingSurface.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            commandingSurface.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            // Verify nothing changes when opening again.
            var originalOpenedRect = commandingSurface.element.getBoundingClientRect();
            commandingSurface.open();
            LiveUnit.Assert.isTrue(commandingSurface.opened)
            Helper._CommandingSurface.verifyRenderedOpened(commandingSurface);
            Helper.Assert.areBoundingClientRectsEqual(originalOpenedRect, commandingSurface.element.getBoundingClientRect(),
                "opening an opened CommandingSurface should not affect its bounding client rect", 0);
        }

        testClose() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: true });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            commandingSurface.close();
            LiveUnit.Assert.isFalse(commandingSurface.opened)
            Helper._CommandingSurface.verifyRenderedClosed(commandingSurface);
        }

        testCloseIsIdempotent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            // Initialize closed.
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            var msg = "Closing an already closed AppBar should not fire events";
            commandingSurface.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            commandingSurface.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            commandingSurface.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            commandingSurface.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            // Verify nothing changes when closing again.
            var originalClosedRect = commandingSurface.element.getBoundingClientRect();
            commandingSurface.close();
            LiveUnit.Assert.isFalse(commandingSurface.opened)
            Helper._CommandingSurface.verifyRenderedClosed(commandingSurface);
            Helper.Assert.areBoundingClientRectsEqual(originalClosedRect, commandingSurface.element.getBoundingClientRect(),
                "closing a closed CommandingSurface should not affect its bounding client rect", 0);
        }

        testOpenedPropertyConstructorOptions() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.areEqual(_Constants.defaultOpened, commandingSurface.opened, "opened property has incorrect default value");
            commandingSurface.dispose();

            [true, false].forEach(function (initiallyOpen) {
                commandingSurface = new _CommandingSurface(null, { opened: initiallyOpen });
                LiveUnit.Assert.areEqual(initiallyOpen, commandingSurface.opened, "opened property does not match the value passed to the constructor.");
                commandingSurface.dispose();
            })
        }

        testTogglingOpenedProperty() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);
            Helper._CommandingSurface.verifyRenderedClosed(commandingSurface);

            commandingSurface.opened = true;
            LiveUnit.Assert.isTrue(commandingSurface.opened, "opened property should be writeable.");
            Helper._CommandingSurface.verifyRenderedOpened(commandingSurface);

            commandingSurface.opened = false;
            LiveUnit.Assert.isFalse(commandingSurface.opened, "opened property should be writeable.");
            Helper._CommandingSurface.verifyRenderedClosed(commandingSurface);
        }

        testOverFlowButtonClick() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: true });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            commandingSurface._dom.overflowButton.click()
            LiveUnit.Assert.isFalse(commandingSurface.opened)
            Helper._CommandingSurface.verifyRenderedClosed(commandingSurface);

            commandingSurface._dom.overflowButton.click()
            LiveUnit.Assert.isTrue(commandingSurface.opened)
            Helper._CommandingSurface.verifyRenderedOpened(commandingSurface);
        }

        testDomLevel0_OpenCloseEvents() {
            testEvents(this._element, (commandingSurface: WinJS.UI.PrivateCommandingSurface, eventName: string, handler: Function) => {
                commandingSurface["on" + eventName] = handler;
            });
        }

        testDomLevel2_OpenCloseEvents() {
            testEvents(this._element, (commandingSurface: WinJS.UI.PrivateCommandingSurface, eventName: string, handler: Function) => {
                commandingSurface.addEventListener(eventName, handler);
            });
        }

        testBeforeOpenIsCancelable() {
            var commandingSurface = new _CommandingSurface(this._element, { opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            commandingSurface.onbeforeopen = function (eventObject) {
                eventObject.preventDefault();
            };
            commandingSurface.onafteropen = function (eventObject) {
                LiveUnit.Assert.fail("afteropen shouldn't have fired due to beforeopen being canceled");
            };

            commandingSurface.open();
            LiveUnit.Assert.isFalse(commandingSurface.opened, "CommandingSurface should still be closed");

            commandingSurface.opened = true;
            LiveUnit.Assert.isFalse(commandingSurface.opened, "CommandingSurface should still be closed");
        }

        testBeforeCloseIsCancelable() {
            var commandingSurface = new _CommandingSurface(this._element, { opened: true });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            commandingSurface.onbeforeclose = function (eventObject) {
                eventObject.preventDefault();
            };
            commandingSurface.onafterclose = function (eventObject) {
                LiveUnit.Assert.fail("afterclose shouldn't have fired due to beforeclose being canceled");
            };

            commandingSurface.close();
            LiveUnit.Assert.isTrue(commandingSurface.opened, "CommandingSurface should still be open");

            commandingSurface.opened = false;
            LiveUnit.Assert.isTrue(commandingSurface.opened, "CommandingSurface should still be open");
        }

        testOverflowDirectionConstructorOptions() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.areEqual(_Constants.defaultOverflowDirection, commandingSurface.overflowDirection, "overflowDirection property has incorrect default value");
            commandingSurface.dispose();

            Object.keys(_CommandingSurface.OverflowDirection).forEach(function (direction) {
                commandingSurface = new _CommandingSurface(null, { overflowDirection: direction });
                LiveUnit.Assert.areEqual(direction, commandingSurface.overflowDirection, "overflowDirection does not match the value passed to the constructor.");
                commandingSurface.dispose();
            });
        }

        testOverflowDirectionProperty() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);
            commandingSurface.element.style.top = "45%";

            Object.keys(_CommandingSurface.OverflowDirection).forEach(function (overflowDirection) {
                commandingSurface.overflowDirection = overflowDirection;
                LiveUnit.Assert.areEqual(overflowDirection, commandingSurface.overflowDirection, "overflowDirection property should be writeable.");
                commandingSurface.open();
                var actionAreaRect = commandingSurface._dom.actionArea.getBoundingClientRect();
                var overflowAreaRect = commandingSurface._dom.overflowArea.getBoundingClientRect();

                switch (overflowDirection) {
                    case _CommandingSurface.OverflowDirection.top:
                        // Bottom of the overflowArea is drawn at the top of the actionArea
                        LiveUnit.Assert.areEqual(overflowAreaRect.bottom, actionAreaRect.top);
                        break;
                    case _CommandingSurface.OverflowDirection.bottom:
                        // Top of the overflowArea is drawn at the bottom of the actionArea
                        LiveUnit.Assert.areEqual(overflowAreaRect.top, actionAreaRect.bottom);
                        break;
                    default:
                        LiveUnit.Assert.fail("TEST ERROR: Encountered unknown OverflowDirection enum value: " + overflowDirection);
                        break;
                }
                commandingSurface.close();
            });
        }

        testOverflowAreaHorizontalAlignment() {

            ["LTR", "RTL"].forEach((direction: string) => {

                var edgeOfViewport,
                    offsetCommandingSurfaceBy,
                    left,
                    right,
                    Left,
                    Right,
                    prevLang = document.documentElement.lang;

                if (direction === "LTR") {
                    document.documentElement.lang = "en-us";
                    edgeOfViewport = 0;
                    offsetCommandingSurfaceBy = 10;
                    right = "right";
                    left = "left";
                    Right = "Right";
                    Left = "Left";
                } else {
                    document.documentElement.lang = "ar-sa";
                    offsetCommandingSurfaceBy = -10;
                    edgeOfViewport = window.innerWidth;
                    right = "left";
                    left = "right";
                    Right = "Left";
                    Left = "Right";
                }

                LiveUnit.LoggingCore.logComment(
                    "When the " + direction + " CommandingSurface is opening, the overflowarea will typically align its " + right + " edge with the " + right + " edge of the CommandingSurface, " +
                    "However, if while trying to align this way, part of the overflowarea would clip through the " + left + " edge of the viewport, then the " +
                    "overflowarea should instead align its " + left + " edge to the " + left + " edge of the viewport."
                    );

                var data = new WinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, section: _Constants.secondaryCommandSection, label: "opt 1" }),
                ]);

                var initialMargin = Math.abs(offsetCommandingSurfaceBy);
                var el = document.createElement("DIV");
                el.style.width = "10px";
                el.style["margin" + Left] = initialMargin + "px";
                document.body.appendChild(el);
                var commandingSurface = new _CommandingSurface(el, {
                    data: data,
                    overflowDirection: _CommandingSurface.OverflowDirection.bottom
                });

                Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

                // Measure
                commandingSurface.open();
                var overflowArea = commandingSurface._dom.overflowArea,
                    commandingSurfaceRect = el.getBoundingClientRect(),
                    overflowAreaRect = overflowArea.getBoundingClientRect();

                LiveUnit.LoggingCore.logComment(
                    "Verify that we start from a sane place. " +
                    "Test that there is " + initialMargin + " space between the " + left + " edge of the CommandingSurface and the " + left + " edge of the view. " +
                    "Test that the overflowarea width with one command is greater than the " + left + " offset of the commandingsurface width with no commands."
                    );
                Helper.Assert.areFloatsEqual(edgeOfViewport + offsetCommandingSurfaceBy, commandingSurfaceRect[left], "TEST ERROR: " + direction + " Test expects the CommandingSurface to be " + initialMargin + " from the " + left + " edge of the view.", 1);
                LiveUnit.Assert.isTrue(commandingSurfaceRect.width + 10 < overflowAreaRect.width, "TEST ERROR: " + direction + " Test expects the overflowarea to be wider than the CommandingSurface + " + initialMargin + ".");

                LiveUnit.LoggingCore.logComment(
                    "Because there is NOT enough room to display the " + right + " aligned overflowarea without clipping through the " + left + " edge of the viewport, " +
                    "verify that overflowarea " + left + " edge is instead aligned to the " + left + " edge of the viewport."
                    );
                Helper.Assert.areFloatsEqual(edgeOfViewport, overflowAreaRect[left], "OverflowArea in " + direction + " should align its " + left + " edge with the " + left + " edge of the viewport to avoid clipping through it", 1);

                LiveUnit.LoggingCore.logComment(
                    "Move the CommandingSurface further away from the " + left + " edge."
                    );
                commandingSurface.close();
                commandingSurface.element.style["margin" + Left] = overflowAreaRect.width + "px";

                // Re Measure
                commandingSurface.open();
                commandingSurfaceRect = el.getBoundingClientRect(),
                overflowAreaRect = overflowArea.getBoundingClientRect();

                LiveUnit.LoggingCore.logComment(
                    "Because there IS now enough room to display the " + right + " aligned overflowarea without clipping through the " + left + " edge of the viewport, " +
                    "verify that overflowarea " + right + " edge is aligned to the " + right + " edge of the CommandingSurface."
                    );
                LiveUnit.Assert.areEqual(commandingSurfaceRect[right], overflowAreaRect[right], direction + " OverflowArea should be " + right + " aligned with the CommandingSurface");

                // Cleanup
                el.parentElement.removeChild(el);
                commandingSurface.dispose();
                document.documentElement.lang = prevLang;
            });
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests._CommandingSurfaceTests");
