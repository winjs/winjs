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

    function verifyTabIndices(commandingSurface: WinJS.UI.PrivateCommandingSurface, firstTabStopIndex: number, finalTabStopIndex: number) {
        // first tab stop
        LiveUnit.Assert.areEqual(firstTabStopIndex, commandingSurface._dom.firstTabStop.tabIndex,
            "firstTabStop doesn't match expected tab index");

        // last tab stop
        LiveUnit.Assert.areEqual(finalTabStopIndex, commandingSurface._dom.finalTabStop.tabIndex,
            "finalTabStop doesn't match expected tab index");
    }

    function failEventHandler(eventName: string, msg?: string) {
        return function () {
            LiveUnit.Assert.fail("Failure, " + eventName + " dectected: " + msg);
        };
    }

    function disposeAndRemoveElement(element: HTMLElement) {
        if (element.winControl) {
            element.winControl.dispose();
        }
        WinJS.Utilities.disposeSubTree(element);
        if (element.parentElement) {
            element.parentElement.removeChild(element);
        }
    }

    interface IOverflowButtonVisibilityTestCase {
        name: string;
        commands: Array<WinJS.UI.PrivateCommand>;
        expectsOverflowCommands: boolean;
    }
    var visibleOverflowButton_Helpers = {
        verifyOverflowButton: function verifyOverflowButton(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
            // PRECONDITION: this helper expects the commandingSurface param to be using Synchronous Animations.
            
            // Inspects the _CommandingSurface DOM and verifies that the appearance of the overflow button, 
            // while the control is opened and closed, is in alignment with our expectations.
            var mode = commandingSurface.closedDisplayMode;
            var isRendered = (mode !== _CommandingSurface.ClosedDisplayMode.none);
            // Test is a Nop is the control isn't rendered.
            if (isRendered) {

                // Some closedDisplayModes can't do a full layout while closed, but still need to be able to 
                // Set visibility on the overflowButton correctly. Record the style of the button before the control
                // is ever opened since opening the control can cause another layout to run and we want to make sure
                // that the overflow button was correctly laid out and visible to a user while the control was closed.
                var hadVisibleOverflowButtonBeforeOpening = this.isOverflowButtonVisible(commandingSurface);

                // Record where the visible commands are when the control is opened.
                commandingSurface.open();
                var hasVisibleActionAreaCommands = this.areVisibleCommandsInActionArea(commandingSurface);
                var hasVisibleOverflowAreaCommands = this.areVisibleCommandsInOverflowArea(commandingSurface);
                var hadVisibleOverflowButtonAfterOpening = this.isOverflowButtonVisible(commandingSurface);
                commandingSurface.close();
                var hasVisibleCommands = (hasVisibleActionAreaCommands || hasVisibleOverflowAreaCommands);
                var hasExandableActionArea = this.isActionAreaExpandable(commandingSurface);

                LiveUnit.Assert.areEqual(hadVisibleOverflowButtonBeforeOpening, hadVisibleOverflowButtonAfterOpening, 
                    "Overflow button visibility should not change just because the control was opened or closed.")

                if (!hasVisibleCommands) {
                    LiveUnit.Assert.isFalse(hadVisibleOverflowButtonBeforeOpening, "Overflow button should always be hidden if there are no commands visible.");
                } else {
                    if (hasExandableActionArea) {
                        // Should always have an overflow button.
                        LiveUnit.Assert.isTrue(hadVisibleOverflowButtonBeforeOpening,
                            "Overflow button should be visible when there is at least one visible command and closedDisplayMode = " + mode);
                    } else {
                        // Should only have an overflow button if there are commands in the overflowarea.
                        if (hasVisibleOverflowAreaCommands) {
                            LiveUnit.Assert.isTrue(hadVisibleOverflowButtonBeforeOpening,
                                "Overflow button should be visible when closedDisplayMode = " + mode + ", and there ARE commands in the overflowArea");
                        } else {
                            LiveUnit.Assert.isFalse(hadVisibleOverflowButtonBeforeOpening,
                                "Overflow button should be hidden when closedDisplayMode = " + mode + ", and there are NO commands in the overflowArea");
                        }
                    }
                }
            }
        },
        isOverflowButtonVisible: function isOverflowButtonVisible(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
            var overflowButton = commandingSurface._dom.overflowButton;
            return overflowButton.style.display !== "none";
        },
        areVisibleCommandsInActionArea: function areCommandsVisibleInActionArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
            var actionArea = commandingSurface._dom.actionArea;
            var actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(actionArea);
            return actionAreaCommands.length > 0;
        },
        areVisibleCommandsInOverflowArea: function areVisibleCommandsInOverflowArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
            var overflowArea = commandingSurface._dom.overflowArea;
            var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(overflowArea);
            return overflowAreaCommands.length > 0;
        },
        isActionAreaExpandable: function isActionAreaExpandable(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
            return Helper._CommandingSurface.isActionAreaExpandable(commandingSurface.closedDisplayMode);
        },
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
                disposeAndRemoveElement(this._element)
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
                data: data,
            });
            var insertedHandler = function () {
                commandingSurface.element.removeEventListener("WinJSNodeInserted", insertedHandler);
                LiveUnit.Assert.areEqual(data.length, commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
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
        }

        testDispose() {

            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1", section: 'primary' }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: 'secondary' })
            ]);
            var commandingSurface = new _CommandingSurface(this._element, { data: data });

            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);
            commandingSurface.open();

            var msg = "Shouldn't have fired due to control being disposed";
            commandingSurface.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            commandingSurface.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            commandingSurface.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            commandingSurface.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            var menuCommandProjections = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).map(function (element) {
                return <WinJS.UI.PrivateMenuCommand>element.winControl;
            });

            commandingSurface.dispose();
            LiveUnit.Assert.isTrue(commandingSurface._disposed, "CommandingSurface didn't mark itself as disposed");
            LiveUnit.Assert.areEqual("Disposed", commandingSurface._machine._state.name, "CommandingSurface didn't move into the disposed state");

            LiveUnit.Assert.isTrue(menuCommandProjections.every(function (menuCommand) {
                return menuCommand._disposed;
            }), "Disposing the CommandingSurface should have disposed all the overflowarea MenuCommands.");

            LiveUnit.Assert.isTrue(commandingSurface.data.every(function (command) {
                var privateCommand = <WinJS.UI.PrivateCommand>command;
                return privateCommand._disposed;
            }), "Disposing the CommandingSurface should have disposed all of its commands.");

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

        testOverflowButtonAriaLabel() {
            var commandingSurface = new _CommandingSurface();
            LiveUnit.Assert.areEqual("View more", commandingSurface._dom.overflowButton.getAttribute("aria-label"), "Missing overflowButton aria label");            
        }

        testOverflowButtonVisibilityWhenChangingData() {
            // Verifies that for each closed display mode, changing the data in the CommandingSurface 
            // will update the visibility of the overflow button accordingly

            function verifyPreCondition(commandingSurface: WinJS.UI.PrivateCommandingSurface, testCase: IOverflowButtonVisibilityTestCase) {
                var hasOverflowAreaCommands = visibleOverflowButton_Helpers.areVisibleCommandsInOverflowArea(commandingSurface);
                var mode = commandingSurface.closedDisplayMode;

                switch (mode) {
                    case _CommandingSurface.ClosedDisplayMode.compact:
                    case _CommandingSurface.ClosedDisplayMode.full:
                        LiveUnit.Assert.isTrue(commandingSurface._canMeasure(),
                            "TEST ERROR: Closed CommandingSurface with closedDisplayMode:" + mode + " is unable to measure. Layout is blocked.");
                        LiveUnit.Assert.areEqual(testCase.expectsOverflowCommands, hasOverflowAreaCommands,
                            "TEST ERROR: Configuration for test: " + testCase.name + " with closedDisplayMode: " + mode +
                            " has incorrect presence of commands in overflowarea");
                        break;
                    case _CommandingSurface.ClosedDisplayMode.minimal:
                    case _CommandingSurface.ClosedDisplayMode.none:
                        LiveUnit.Assert.isFalse(commandingSurface._canMeasure(),
                            "TEST ERROR: Test expects that a closed CommandingSurface with closedDisplayMode: " + mode +
                            " can't measure or peform layout. Update the test to include '" + mode + "' with the closedDisplayModes" +
                            " that can be measured while closed.");
                        break;
                    default:
                        LiveUnit.Assert.fail("TEST ERROR: Unknown ClosedDisplayMode enum value: " + mode);
                        break;
                }
            }

            var commandingSurface = new _CommandingSurface(this._element, {});
            var controlWidth = 500; // More than wide enough to fit our primary command + overflow button.
            this._element.style.width = controlWidth + "px";

            var primaryCommand = new Command(null, { section: 'primary', type: 'button', label: 'primary command', icon: '1' });
            var secondaryCommand = new Command(null, { section: 'secondary', type: 'button', label: 'secondary command' });
            var overflowCommand = new Command(null, { section: 'primary', type: 'content', label: 'overflow command', });
            // Make the 'content' command wide enough to always force overflow.
            overflowCommand.element.style.width = (controlWidth + 5) + "px";

            var hiddenPrimaryCommand = new Command(null, { section: 'primary', type: 'button', label: 'hidden primary command', icon: 'H', hidden: true });
            var hiddenSecondaryCommand = new Command(null, { section: 'secondary', type: 'button', label: 'hidden secondary command', hidden: true });

            var dataTestCases: Array<IOverflowButtonVisibilityTestCase> = [
                { name: "NoCommands", commands: [], expectsOverflowCommands: false },
                { name: "PrimayCommandsOnly_NoOverflow", commands: [primaryCommand], expectsOverflowCommands: false },
                { name: "PrimaryCommandsOnly_SomeOverflow", commands: [primaryCommand, overflowCommand], expectsOverflowCommands: true },
                { name: "SecondaryCommandsOnly", commands: [secondaryCommand], expectsOverflowCommands: true },
                { name: "PrimaryAndSecondaryCommands", commands: [primaryCommand, secondaryCommand], expectsOverflowCommands: true },
                { name: "HiddenCommands", commands: [hiddenPrimaryCommand, hiddenSecondaryCommand], expectsOverflowCommands: false },
            ];

            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);
            Helper._CommandingSurface.useSynchronousDataRendering(commandingSurface);

            Object.keys(_CommandingSurface.ClosedDisplayMode).forEach((mode) => {
                commandingSurface.closedDisplayMode = mode;

                dataTestCases.forEach((testCase) => {
                    commandingSurface.data = new WinJS.Binding.List(testCase.commands);

                    // PRECONDITION: Sanity test that the testCase's expected configuration for overflow commands 
                    // has been met.
                    verifyPreCondition(commandingSurface, testCase);

                    visibleOverflowButton_Helpers.verifyOverflowButton(commandingSurface);
                });
            });
        }

        testOverflowButtonVisibilityWhenChangingClosedDisplayModes() {
            // The visibility of the overflow button can depend on the closedDisplay mode. 
            // Specifically, closedDisplayMode 'full' should not show an overflow button if there are 
            // visible commands in the action area, but no visible commands of any sort in the overflow area
            // Verify that changing the closedDisplayMode under these circumstances updates the visibility
            // of the overflow button

            var initControl = (closedDisplayMode) => {
                var controlElement = document.createElement("DIV");
                this._element.appendChild(controlElement);
                var commandingSurface = new _CommandingSurface(controlElement, { closedDisplayMode: closedDisplayMode });
                commandingSurface.data = new WinJS.Binding.List([new Command(null, { section: 'primary' })]);
                Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);
                return commandingSurface;
            }

            for (var beginningMode in _CommandingSurface.ClosedDisplayMode) {
                for (var endingMode in _CommandingSurface.ClosedDisplayMode) {
                    var commandingSurface = initControl(beginningMode);
                    visibleOverflowButton_Helpers.verifyOverflowButton(commandingSurface);

                    commandingSurface.closedDisplayMode = endingMode;
                    visibleOverflowButton_Helpers.verifyOverflowButton(commandingSurface);
                }
            }
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
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
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
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContentTotalWidth - 1,
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
            // Verify that the resize handler knows how to correctly re-layout commands if the CommandingSurface width has changed.
            // - while the control is closed.
            // - while the control is opened.
            // Typically the resizeHandler is only called by the window resize event.


            // Test all closedDisplayModes https://github.com/winjs/winjs/issues/1183
            Object.keys(_CommandingSurface.ClosedDisplayMode).forEach((mode) => {

                var prefix = "closedDisplayMode: " + mode + ", ";

                // ClosedDisplayMode: "none" can't measure or layout commands while closed because element.style.display is none.
                // ClosedDisplayMode: "minimal" can't layout commands correctly while closed because all commands are display: "none".
                var doesModeSupportVisibleCommandsWhileClosed = (mode === _CommandingSurface.ClosedDisplayMode.compact || mode === _CommandingSurface.ClosedDisplayMode.full);

                // Make sure everything will fit.
                var commandingSurfaceElement = document.createElement("DIV");
                commandingSurfaceElement.style.width = "1000px";
                this._element.appendChild(commandingSurfaceElement);

                var data = new WinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                    new Command(null, { type: _Constants.typeButton, label: "opt 2" }),
                    new Command(null, { type: _Constants.typeButton, label: "sec opt 1", section: _Constants.secondaryCommandSection })
                ]);
                var commandingSurface = new _CommandingSurface(commandingSurfaceElement, {
                    data: data,
                    opened: false,
                    closedDisplayMode: mode,
                });
                Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

                if (doesModeSupportVisibleCommandsWhileClosed) {
                    LiveUnit.Assert.areEqual(2,
                        Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length,
                        "TEST ERROR: " + prefix + "Test expects actionarea should have 2 commands at start");
                    LiveUnit.Assert.areEqual(1,
                        Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                        "TEST ERROR: " + prefix + "Test expects overflowarea should have 1 command at start");
                }

                // Decrease the width of our control to fit exactly 1 command + the overflow button in the actionarea.
                var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                    closedDisplayMode: commandingSurface.closedDisplayMode,
                    numStandardCommandsShownInActionArea: 1,
                    numSeparatorsShownInActionArea: 0,
                    widthOfContentCommandsShownInActionArea: 0,
                    isACommandVisbleInTheOverflowArea: true,
                    additionalFreeSpace: 0,
                };
                Helper._CommandingSurface.sizeForCommands(commandingSurfaceElement, args);

                // Ensure that the resizeHandler will have overflowed all but one primary command into the overflowarea
                WinJS.Utilities._resizeNotifier._handleResize();

                if (doesModeSupportVisibleCommandsWhileClosed) {
                    // Verify commands laid our correctly while closed.
                    LiveUnit.Assert.areEqual(1,
                        Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length,
                        prefix + "closed actionarea should have 1 command after width decrease");
                    LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */,
                        Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                        prefix + "closed overflowarea should have 3 commands after width decrease");
                }

                // Verify commands are laid out correctly, the first time the control is opened following a resize.
                commandingSurface.open();
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length,
                    prefix + "actionarea should have 1 command after opening");
                LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */,
                    Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                    prefix + "overflowarea should have 3 commands after opening");

                // Increase element size while opened, and verify the resizeHandler has reflowed all primary commands
                // back into the action area.
                commandingSurfaceElement.style.width = "1000px";
                WinJS.Utilities._resizeNotifier._handleResize();

                LiveUnit.Assert.areEqual(2,
                    Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length,
                    prefix + "opened actionarea should have 2 commands after width increase");
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                    prefix + "opened overflowarea should have 1 command after width increase");

                disposeAndRemoveElement(commandingSurface.element);
            });
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

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea")
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
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");

            // Deselect the toggle button in the menu
            var menuCommandEl = (<HTMLElement> commandingSurface._dom.overflowArea.children[0]);
            menuCommandEl.click();

            // Increase the size of the control to fit both commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
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
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 4,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");

            // Decrease size to overflow 1 command
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(5 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Increase size to put command back into the actionarea
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 4,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 3 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 4 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(2 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 5 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(5 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 6 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 0,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
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
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            var customContent1Width = commandingSurface._getCommandWidth(data.getAt(1));
            var customContent2Width = commandingSurface._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContent1Width + customContent2Width,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");

            // Decrease size to overflow 1 command
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContent1Width,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContent1Width - 1,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
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
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            var customContentWidth = commandingSurface._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 5,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: customContentWidth,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();
            LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow priority 5 commands
            args = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 5,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContentWidth - 1,
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
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
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
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
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
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
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
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 0,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
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
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            // Make sure primary commands fit exactly
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 6,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
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

        testKeyboarding_Closed(complete) {
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
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should only show | 1 | 2 (disabled) | 3  | ... |
            commandingSurface.element.focus();
            setTimeout(function () {
                Helper.keydown(commandingSurface.element, Key.downArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.winControl.label);

                Helper.keydown(commandingSurface.element, Key.end);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.winControl.label);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.winControl.label, "Right arrow, should skip '2' because that command is disabled");

                Helper.keydown(commandingSurface.element, Key.downArrow);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.winControl.label);

                Helper.keydown(commandingSurface.element, Key.upArrow);
                LiveUnit.Assert.areEqual("1", document.activeElement.winControl.label, "Up arrow, should skip '2' because that command is disabled");
                complete();
            });
        }

        testKeyboardingWithCustomContent(complete) {
            var Key = WinJS.Utilities.Key;
            var firstCommand = document.createElement("button");
            var customCommand = document.createElement("div");
            var firstCheckBox = document.createElement("input");
            firstCheckBox.type = "checkbox";
            var secondCheckBox = document.createElement("input");
            secondCheckBox.type = "checkbox";
            customCommand.appendChild(firstCheckBox);
            customCommand.appendChild(secondCheckBox);
            var lastCommand = document.createElement("button");
            var data = new WinJS.Binding.List([
                new Command(firstCommand, { type: _Constants.typeButton, label: "1" }),
                new Command(customCommand, { type: _Constants.typeContent, label: "2", firstElementFocus: firstCheckBox, lastElementFocus: secondCheckBox }),
                new Command(lastCommand, { type: _Constants.typeButton, label: "3" }),
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });
            var overflowButton = commandingSurface._dom.overflowButton;

            // Size the width of the control to fit all 3 commands.
            var customContentWidth = commandingSurface._getCommandWidth(data.getAt(1));
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContentWidth,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should show | 1 | 2 (custom) | 3 | ... |
            commandingSurface.element.focus();
            setTimeout(function () {
                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstCommand, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.end);
                LiveUnit.Assert.areEqual(overflowButton, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(lastCommand, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(secondCheckBox, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(firstCommand, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstCheckBox, document.activeElement);

                Helper.keydown(commandingSurface.element, Key.home);
                LiveUnit.Assert.areEqual(firstCommand, document.activeElement);
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
                new Command(null, { type: _Constants.typeContent, label: "content", section: _Constants.secondaryCommandSection }),

            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data,
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            // Limit the width of the control to fit only 3 commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

            // Delete item wth label 3
            commandingSurface.data.splice(2, 1);

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

                    // Force all commands into the overflowarea
                    this._element.style.width = "10px";
                    commandingSurface.forceLayout();

                    // Delete the the content command and verify CommandingSurface Dom updates. 
                    // Also verify that we dispose the deleted command's associated MenuCommand projection.
                    var deletedCommand = commandingSurface.data.splice(data.length - 1, 1)[0];

                    // PRECONDITION: Sanity check that the command we got back is our content command.
                    LiveUnit.Assert.areEqual(_Constants.typeContent, deletedCommand.type);

                    var deletedMenuCommand = Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(commandingSurface, deletedCommand);

                    WinJS.Utilities.Scheduler.schedule(() => {
                        LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);
                        LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length);
                        LiveUnit.Assert.isTrue(deletedMenuCommand._disposed,
                            "Removing a command from the CommandingSurface's overflowarea should dispose the associated menucommand projection");

                        LiveUnit.Assert.isFalse(commandingSurface._contentFlyout._disposed,
                            "Disposing a menucommand projection should not dispose the CommandingSurface._contentFlyout");

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
                closedDisplayMode: _CommandingSurface.ClosedDisplayMode.compact,
            });

            // Limit the width of the control to fit 3 commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: commandingSurface.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            commandingSurface.forceLayout();

            // The actionarea should now show | 1 | 2 | 3 | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length);

            var menuCommandProjections = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).map(function (element) {
                return <WinJS.UI.PrivateMenuCommand>element.winControl;
            });

            // Delete all items
            commandingSurface.data = new WinJS.Binding.List([]);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea).length, "Action area should be empty");
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length, "Overflow area should be empty");
                LiveUnit.Assert.isTrue(menuCommandProjections.every(function (menuCommand) {
                    return menuCommand._disposed;
                }), "Setting new data should have disposed all previous overflowarea MenuCommand projections.");

                complete();
            }, WinJS.Utilities.Scheduler.Priority.high);
        }

        testDataMutationsAreProjectedToOverflowCommands(complete) {
            // Verifies that mutations to an ICommand in the actionarea are reflected to that ICommand's MenuCommand projection 
            // in the overflowarea, if such a projection exists.
            //

            var buttonCmd = new Command(null, { type: _Constants.typeButton, label: "button", section: 'primary', extraClass: "myClass", });
            var toggleCmd = new Command(null, { type: _Constants.typeToggle, label: 'toggle', section: 'primary' });
            var flyoutCmd = new Command(null, { type: _Constants.typeFlyout, label: "flyout", section: 'primary' });

            var data = new WinJS.Binding.List([buttonCmd, toggleCmd, flyoutCmd]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, { data: data, opened: true });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            var startingLength = 3;

            // PRECONDITION: Test assumes there are 3 overflowing primary commands in the CommandingSurface overflowarea.
            LiveUnit.Assert.areEqual(startingLength, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                "TEST ERROR: Test expects 3 overflowing commands at the start");

            // Commands in the overflowarea are all MenuCommand projections of the original ICommands in the actionarea.
            // These projections and the rest of the overflowarea are redrawn whenever the data in the binding list changes 
            // or when certain properties of ICommands in the CommandingSurface are mutated.
            var projections = {
                get button() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(commandingSurface, buttonCmd);
                },
                get toggle() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(commandingSurface, toggleCmd);
                },
                get flyout() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(commandingSurface, flyoutCmd);
                }
            }

            var msg = " property of projected menucommand should have updated";

            buttonCmd.label = "new label";
            new WinJS.Promise((c) => {
                commandingSurface._layoutCompleteCallback = () => {
                    LiveUnit.Assert.areEqual(buttonCmd.label, projections.button.label, "label" + msg);
                    c();
                };
            }).then(
                () => {
                    buttonCmd.disabled = true;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.disabled, projections.button.disabled, "disabled" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.disabled = false;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.disabled, projections.button.disabled, "disabled" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.extraClass = "new class";
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.extraClass, projections.button.extraClass, "extraClass" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.onclick = () => { };
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.onclick, projections.button.onclick, "onclick" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.hidden = true;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.isNull(projections.button,
                                "Setting hidden = true on an overflowing ICommand should remove its menucommand projection from the overflowarea");
                            LiveUnit.Assert.areEqual(startingLength - 1, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                                "Setting hidden = true on an overflowing ICommand should remove its menucommand projection from the overflowarea");
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.hidden = false;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.isNotNull(projections.button,
                                "Setting hidden = false on an overflowing ICommand should add a menucommand projection of it to the overflowarea");
                            LiveUnit.Assert.areEqual(startingLength, Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea).length,
                                "Setting hidden = false on an overflowing ICommand should add a menucommand projection of it to the overflowarea");
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    toggleCmd.selected = true;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(toggleCmd.selected, projections.toggle.selected, "selected" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    toggleCmd.selected = false;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(toggleCmd.selected, projections.toggle.selected, "selected" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    var flyout = new WinJS.UI.Flyout();
                    flyoutCmd.flyout = flyout;
                    return new WinJS.Promise((c) => {
                        commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(flyoutCmd.flyout, projections.flyout.flyout, "flyout" + msg);
                            flyout.dispose();
                            c();
                        };
                    });
                }
                ).done(complete);
        }

        testSelectionAndGlobalSection() {
            // Values of "global" and "selection" are deprecated starting in WinJS 4.0. 
            // Makes sure they are both just parsed as "primary" commands.
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
            var commandingSurface = new _CommandingSurface(this._element, { opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            // Test empty scenario.
            commandingSurface.open();
            LiveUnit.Assert.isTrue(commandingSurface.opened);
            Helper._CommandingSurface.verifyRenderedOpened(commandingSurface);

            commandingSurface.close();
            LiveUnit.Assert.isFalse(commandingSurface.opened);

            // Test scenario with data.
            commandingSurface.data = data;
            commandingSurface.open();
            LiveUnit.Assert.isTrue(commandingSurface.opened);
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

        testTabIndicesWhileClosed() {
            // Commanding surface should not carousel tab key focus movement while closed.
            // Verify that both the elements we use to trap focus have tabIndex === -1.

            var innerHTML =
                '<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'button\', id:\'button\'}" ></button>' +
                '<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'toggle\', id:\'toggle\'}" ></button>' +
                '<hr data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'separator\', id:\'separator\'}" \>' +
                '<div id="contentCmd" data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'content\', id:\'content\'}" >' +
                    '<input type="text" />' +
                    '<input type ="range" / > ' +
                '</div>' +
                '<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: flyout, id:\'flyout\'}" ></button>';

            this._element.innerHTML = innerHTML;
            var commandingSurface = new _CommandingSurface(this._element, { opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            var firstTabStopIndex = -1;
            var finalTabStopIndex = -1;
            verifyTabIndices(commandingSurface, firstTabStopIndex, finalTabStopIndex);
        }

        testTabIndiciesWhileOpened() {
            // Commanding surface should validate first and last tab stops while opened.
            // This is what allows tab key focus movement to carousel instead of leaving the control.

            var innerHTML =
                '<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'button\', id:\'button\'}" ></button>' +
                '<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'toggle\', id:\'toggle\'}" ></button>' +
                '<hr data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'separator\', id:\'separator\'}" \>' +
                '<div id="contentCmd" data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: \'content\', id:\'content\'}" >' +
                    '<input type="text" />' +
                    '<input type ="range" / > ' +
                '</div>' +
                '<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type: flyout, id:\'flyout\'}" ></button>';

            this._element.innerHTML = innerHTML;
            var commandingSurface = new _CommandingSurface(this._element, { opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            commandingSurface.open();

            LiveUnit.LoggingCore.logComment("Verify that first and last tabStop have tabIndex === 0, " +
                "when the control is opened");
            var firstTabStopIndex = 0;
            var finalTabStopIndex = 0;
            verifyTabIndices(commandingSurface, firstTabStopIndex, finalTabStopIndex);
        }

        testAriaFlowAttributes() {
            var commandingSurface = new _CommandingSurface(this._element, { opened: false });
            Helper._CommandingSurface.useSynchronousAnimations(commandingSurface);

            LiveUnit.Assert.isFalse(commandingSurface._dom.firstTabStop.hasAttribute("x-ms-aria-flowfrom"),
                "aria-flowfrom should not be set, while closed");
            LiveUnit.Assert.isFalse(commandingSurface._dom.finalTabStop.hasAttribute("aria-flowto"),
                "aria-flowto should not be set, while closed");

            commandingSurface.opened = true;

            LiveUnit.Assert.areEqual(commandingSurface._dom.finalTabStop.id,
                commandingSurface._dom.firstTabStop.getAttribute("x-ms-aria-flowfrom"),
                "first tab stop should flow from final tab stop, while opened");
            LiveUnit.Assert.areEqual(commandingSurface._dom.firstTabStop.id,
                commandingSurface._dom.finalTabStop.getAttribute("aria-flowto"),
                "final tab stop should flow to first tab stop, while opened");
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

        testGetCommandById() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "A", id: "extraneous" })
            ]);
            this._element.style.width = "10px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });
            LiveUnit.Assert.isNull(commandingSurface.getCommandById("someID"));

            var firstAddedCommand = new Command(null, { type: _Constants.typeButton, label: "B", id: "someID" });
            data.push(firstAddedCommand);
            LiveUnit.Assert.areEqual(firstAddedCommand, commandingSurface.getCommandById("someID"));

            var secondAddedCommand = new Command(null, { type: _Constants.typeButton, label: "C", id: "someID" });
            data.push(secondAddedCommand);

            LiveUnit.Assert.areEqual(firstAddedCommand, commandingSurface.getCommandById("someID"));
        }

        testShowOnlyCommands(complete) {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "A", id: "A" }),
                new Command(null, { type: _Constants.typeButton, label: "B", id: "B" }),
                new Command(null, { type: _Constants.typeButton, label: "C", id: "C", section: "secondary" }),
                new Command(null, { type: _Constants.typeButton, label: "D", id: "D" }),
                new Command(null, { type: _Constants.typeButton, label: "E", id: "E" })
            ]);

            this._element.style.width = "1000px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: data
            });

            function checkCommandVisibility(expectedShown, expectedHidden) {
                return new WinJS.Promise(c => {
                    commandingSurface._layoutCompleteCallback = function () {
                        for (var i = 0, len = expectedShown.length; i < len; i++) {
                            var shownCommand = commandingSurface.getCommandById(expectedShown[i]);
                            LiveUnit.Assert.isFalse(shownCommand.hidden);
                            if (shownCommand.section === "secondary") {
                                LiveUnit.Assert.areEqual("none", getComputedStyle(shownCommand.element).display);
                                var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);
                                LiveUnit.Assert.areEqual(shownCommand.label, overflowAreaCommands[0].winControl.label);
                            } else {
                                LiveUnit.Assert.areEqual("inline-block", getComputedStyle(shownCommand.element).display);
                            }
                        }
                        for (var i = 0, len = expectedHidden.length; i < len; i++) {
                            var hiddenCommand = commandingSurface.getCommandById(expectedHidden[i]);
                            LiveUnit.Assert.isTrue(hiddenCommand.hidden);
                            LiveUnit.Assert.areEqual("none", getComputedStyle(hiddenCommand.element).display);
                        }
                        c();
                    };
                });
            }

            commandingSurface.showOnlyCommands([]);
            checkCommandVisibility([], ["A", "B", "C", "D", "E"]).then(
                () => {
                    commandingSurface.showOnlyCommands(["A", "B", "C", "D", "E"]);
                    return checkCommandVisibility(["A", "B", "C", "D", "E"], []);
                }).then(() => {
                    commandingSurface.showOnlyCommands(["A"]);
                    return checkCommandVisibility(["A"], ["B", "C", "D", "E"]);
                }).then(() => {
                    commandingSurface.showOnlyCommands([data.getAt(1)]);
                    return checkCommandVisibility(["B"], ["A", "C", "D", "E"]);
                }).then(() => {
                    commandingSurface.showOnlyCommands(["C", data.getAt(4)]);
                    checkCommandVisibility(["C", "E"], ["A", "B", "D"]);
                }).done(complete);
        }

        testThatHiddenCommandsDoNotAppearVisible(complete) {
            // Regression test for https://github.com/winjs/winjs/issues/915
            var p0 = new Command(null, { id: "p0", label: "p0", type: _Constants.typeButton, section: "primary", hidden: false });
            var p1 = new Command(null, { id: "p1", label: "p1", type: _Constants.typeButton, section: "primary", hidden: false });
            var p2 = new Command(null, { id: "p2", label: "p2", type: _Constants.typeButton, section: "primary", hidden: true });
            var s0 = new Command(null, { id: "s0", label: "s0", type: _Constants.typeButton, section: "secondary", hidden: false });
            var s1 = new Command(null, { id: "s1", label: "s1", type: _Constants.typeButton, section: "secondary", hidden: true });

            this._element.style.width = "1000px";
            var commandingSurface = new _CommandingSurface(this._element, {
                data: new WinJS.Binding.List([p0, p1, p2, s0, s1])
            });

            var actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea);
            var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);

            // The actionarea should only show | p0 | p1 | ... |
            LiveUnit.Assert.areEqual(2, actionAreaCommands.length, "actionarea should display 2 command");
            LiveUnit.Assert.areEqual(p0.label, actionAreaCommands[0].winControl.label);
            LiveUnit.Assert.areEqual(p1.label, actionAreaCommands[1].winControl.label);

            // The overflowarea should only show | s0 |
            LiveUnit.Assert.areEqual(1, overflowAreaCommands.length, "overflowarea should display 1 command");
            LiveUnit.Assert.areEqual(s0.label, overflowAreaCommands[0].winControl.label);

            new WinJS.Promise((c) => {
                commandingSurface._layoutCompleteCallback = () => {

                    actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea);
                    overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.overflowArea);

                    // The actionarea should not show any commands
                    LiveUnit.Assert.areEqual(0, actionAreaCommands.length, "actionarea should display 0 command");

                    // The overflowarea should show | p0 | p1 | separator | s0 |
                    LiveUnit.Assert.areEqual(4, overflowAreaCommands.length, "overflowarea should display 4 command");
                    LiveUnit.Assert.areEqual(p0.label, overflowAreaCommands[0].winControl.label);
                    LiveUnit.Assert.areEqual(p1.label, overflowAreaCommands[1].winControl.label);
                    LiveUnit.Assert.areEqual(_Constants.typeSeparator, overflowAreaCommands[2].winControl.type);
                    LiveUnit.Assert.areEqual(s0.label, overflowAreaCommands[3].winControl.label);

                    c();
                };

                // Overflow everything
                this._element.style.width = "10px";
                commandingSurface.forceLayout();

            }).done(complete);
        }
    }
    var disabledTestRegistry = {
        testShowOnlyCommands:[
            Helper.Browsers.chrome,
            Helper.Browsers.safari,
            Helper.Browsers.firefox,
            Helper.Browsers.android
        ],
        testOverflowDirectionProperty:[Helper.Browsers.firefox],
        testKeyboardingWithCustomContent:[Helper.Browsers.firefox]
    };
    Helper.disableTests(_CommandingSurfaceTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("CorsicaTests._CommandingSurfaceTests");
