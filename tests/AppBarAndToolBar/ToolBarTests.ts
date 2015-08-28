// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.CommandingSurface.ts"/>
/// <reference path="../TestLib/Helper.ToolBar.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />
// <reference path="../TestData/ToolBar.less.css" />
/// <deploy src="../TestData/" />

module CorsicaTests {
    var ToolBar = <typeof WinJS.UI.PrivateToolBar> WinJS.UI.ToolBar;
    var Command = <typeof WinJS.UI.PrivateCommand> WinJS.UI.AppBarCommand;
    var _LightDismissService = <typeof WinJS.UI._LightDismissService>Helper.require("WinJS/_LightDismissService");
    var Util = WinJS.Utilities;
    var _Constants;

    WinJS.Utilities._require(["WinJS/Controls/ToolBar/_Constants"], function (constants) {
        _Constants = constants;
    })

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. onbeforeopen) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(testElement, registerForEvent: (toolBar: WinJS.UI.PrivateToolBar, eventName: string, handler: Function) => void) {
        var toolBar = new ToolBar(testElement);
        Helper.ToolBar.useSynchronousAnimations(toolBar);

        var counter = 0;
        registerForEvent(toolBar, _Constants.EventNames.beforeOpen, () => {
            LiveUnit.Assert.areEqual(1, counter, _Constants.EventNames.beforeOpen + " fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(toolBar.opened, _Constants.EventNames.beforeOpen + ": ToolBar should not be in opened state");
        });
        registerForEvent(toolBar, _Constants.EventNames.afterOpen, () => {
            LiveUnit.Assert.areEqual(2, counter, _Constants.EventNames.afterOpen + " fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(toolBar.opened, _Constants.EventNames.afterOpen + ": ToolBar should be in opened state");
        });
        registerForEvent(toolBar, _Constants.EventNames.beforeClose, () => {
            LiveUnit.Assert.areEqual(4, counter, _Constants.EventNames.beforeClose + " fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(toolBar.opened, _Constants.EventNames.beforeClose + ": ToolBar should be in opened state");
        });
        registerForEvent(toolBar, _Constants.EventNames.afterClose, () => {
            LiveUnit.Assert.areEqual(5, counter, _Constants.EventNames.afterClose + " fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(toolBar.opened, _Constants.EventNames.afterClose + ": ToolBar should not be in opened state");
        });

        LiveUnit.Assert.areEqual(0, counter, "before open: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isFalse(toolBar.opened, "before open: ToolBar should not be in opened state");

        toolBar.open();
        LiveUnit.Assert.areEqual(3, counter, "after open: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isTrue(toolBar.opened, "after open: ToolBar should be in opened state");

        toolBar.close();
        LiveUnit.Assert.areEqual(6, counter, "after close: wrong number of events fired");
        LiveUnit.Assert.isFalse(toolBar.opened, "after close: ToolBar should not be in opened state");
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

    export class ToolBarTests {
        "use strict";

        _element: HTMLElement;

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = "host";
            document.body.appendChild(newNode);
            this._element = newNode;
            WinJS.Utilities.addClass(this._element, "file-toolbar-css");
        }

        tearDown() {
            if (this._element) {
                disposeAndRemoveElement(this._element)
                this._element = null;
            }
        }

        testConstruction() {
            var toolBar = new ToolBar(this._element);
            LiveUnit.Assert.isTrue(Util.hasClass(toolBar.element, _Constants.ClassNames.controlCssClass), "ToolBar missing control css class");
            LiveUnit.Assert.isTrue(Util.hasClass(toolBar.element, _Constants.ClassNames.disposableCssClass), "ToolBar missing disposable css class");
        }

        testAppendToDomAfterConstruction(complete) {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            var toolBar = new ToolBar(null, {
                data: data
            });
            var insertedHandler = function () {
                toolBar.element.removeEventListener("WinJSNodeInserted", insertedHandler);
                LiveUnit.Assert.areEqual(data.length, toolBar._commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
                complete();
            }

            toolBar.element.addEventListener("WinJSNodeInserted", insertedHandler);
            this._element.appendChild(toolBar.element);
        }

        testElementProperty() {
            var el = document.createElement("div");
            var toolBar = new ToolBar(el);
            LiveUnit.Assert.areEqual(Util._uniqueID(el), Util._uniqueID(toolBar.element), "The element passed in the constructor should be the toolBar element");

            toolBar = new ToolBar();
            LiveUnit.Assert.isNotNull(toolBar.element, "An element should be created when one is not passed to the constructor");
        }

        testDataProperty() {
            // Verify default (empty)
            var toolBar = new ToolBar(this._element);
            LiveUnit.Assert.areEqual(0, toolBar.data.length, "Empty ToolBar should have length 0");

            // Add some data
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            toolBar.data = data;
            LiveUnit.Assert.areEqual(2, toolBar.data.length, "ToolBar data has an invalid length");
        }

        xtestBadData() { // TODO: Paramaterize CommandingSurface so that the control name in the exception is "ToolBar", currently reads "_CommandingSurface"
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);

            var toolBar = new ToolBar(this._element, { data: data });

            // set data to invalid value
            var property = "data";
            try {
                toolBar[property] = { invalid: 1 };
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI.ToolBar.BadData", e.name);

                // Ensure the value of data did not change
                LiveUnit.Assert.areEqual(2, toolBar.data.length, "ToolBar data has an invalid length");
            }
        }

        testDeclarativeData() {
            // Verify that if the ToolBar element contains children elements at construction, those elements are parsed as data.
            var el = document.createElement("div");
            var child = document.createElement("table");
            el.appendChild(child);
            var toolBar: WinJS.UI.PrivateToolBar;
            try {
                new ToolBar(el);
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI._CommandingSurface.MustContainCommands", e.name, "Toolbar should have thrown MustContainCommands exception");
            }

            el = document.createElement("div");
            var commandEl: HTMLElement;
            var numberOfCommands = 5;
            for (var i = 0; i < numberOfCommands; i++) {
                commandEl = document.createElement("button");
                commandEl.setAttribute("data-win-control", "WinJS.UI.AppBarCommand");
                el.appendChild(commandEl);
            }
            toolBar = new ToolBar(el);
            LiveUnit.Assert.areEqual(numberOfCommands, toolBar.data.length, "ToolBar declarative commands were not parsed as data.");
        }

        testDispose() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1", section: 'primary' }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: 'secondary' })
            ]);
            var toolBar = new ToolBar(this._element, { data: data });
            Helper.ToolBar.useSynchronousAnimations(toolBar);
            toolBar.open();

            var msg = "Shouldn't have fired due to control being disposed";
            toolBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            toolBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            toolBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            toolBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            var menuCommandProjections = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).map(function (element) {
                return <WinJS.UI.PrivateMenuCommand>element.winControl;
            });

            toolBar.dispose();
            LiveUnit.Assert.isTrue(toolBar._disposed, "ToolBar didn't mark itself as disposed");
            LiveUnit.Assert.isTrue(toolBar._commandingSurface._disposed, "ToolBar's commandingSurface was not disposed");

            LiveUnit.Assert.isTrue(menuCommandProjections.every(function (menuCommand) {
                return menuCommand._disposed;
            }), "Disposing the ToolBar should have disposed all the overflowarea MenuCommands.");

            LiveUnit.Assert.isTrue(toolBar.data.every(function (command) {
                var privateCommand = <WinJS.UI.PrivateCommand>command;
                return privateCommand._disposed;
            }), "Disposing the ToolBar should have disposed all of its commands.");

            // Events should not fire
            toolBar.close();
            toolBar.open();
        }

        testDoubleDispose() {
            var toolBar = new ToolBar();
            LiveUnit.Assert.isTrue(toolBar.dispose);
            LiveUnit.Assert.isFalse(toolBar._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            toolBar.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            toolBar.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(toolBar._disposed);
            toolBar.dispose();
        }

        testPlaceHolderDisposesOpenedToolBar() {
            // The ToolBar moves itself to the Body when opened and leaves a placeholder element in its place.
            // Verify that calling disposeSubTree on the placeholder element will trigger the ToolBar to dispose.

            var toolBarEl = document.createElement("DIV");
            this._element.appendChild(toolBarEl);

            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);
            var toolBar = new ToolBar(toolBarEl, { opened: true, data: data });

            WinJS.Utilities.disposeSubTree(this._element);
            LiveUnit.Assert.isTrue(toolBar._disposed, "Disposing the ToolBar's placeholder should dispose the ToolBar");
        }

        testDisposeClosesToolBar() {
            // When a ToolBar is opened, it reparents itself to the body. When it closes it moves back to its
            // location in the DOM tree. Disposing an opened ToolBar closes it.
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);
            var toolBar = new ToolBar(this._element, { opened: true, data: data });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            toolBar.dispose();
            Helper.ToolBar.verifyRenderedClosed(toolBar);

            // Events should not fire
            toolBar.close();
            toolBar.open();
        }

        testVerifyDefaultTabIndex() {
            var toolBar = new ToolBar();
            LiveUnit.Assert.areEqual("-1", toolBar.element.getAttribute("tabIndex"), "ToolBar should've assigned a default tabIndex");

            var el = document.createElement("div");
            el.setAttribute("tabIndex", "4");
            toolBar = new ToolBar(el);
            LiveUnit.Assert.areEqual("4", toolBar.element.getAttribute("tabIndex"), "ToolBar should have not assigned a default tabIndex");
        }

        testAria() {
            var toolBar = new ToolBar();
            LiveUnit.Assert.areEqual("menubar", toolBar.element.getAttribute("role"), "Missing default aria role");
            LiveUnit.Assert.areEqual("ToolBar", toolBar.element.getAttribute("aria-label"), "Missing default aria label");

            var el = document.createElement("div");
            toolBar = new ToolBar(el);
            el.setAttribute("role", "list");
            el.setAttribute("aria-label", "myList");
            LiveUnit.Assert.areEqual("list", toolBar.element.getAttribute("role"), "ToolBar should have not set a default aria role");
            LiveUnit.Assert.areEqual("myList", toolBar.element.getAttribute("aria-label"), "ToolBar should have not set a default aria label");
        }

        testForceLayout() {
            // Verify that force layout will correctly update commands layout when:
            // 1. The ToolBar constructor could not measure any of the commands because the ToolBar element was originally display "none".
            // 2. The width of the ToolBar itself has changed.
            // 3. The width of content commands in the ToolBar have changed

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
            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            // The measurement stage of the CommandLayoutPipeline should have failed because our element was display "none". 
            // Therefore, the layout stage should not have been reached and not even secondary commands will have made it into the overflow area yet.
            // Sanity check our test expectations before we begin.
            LiveUnit.Assert.areEqual(2, toolBar._commandingSurface._primaryCommands.length, "TEST ERROR: Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, toolBar._commandingSurface._secondaryCommands.length, "TEST ERROR: Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "TEST ERROR: until a layout can occur, actionarea should have 3 commands");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "TEST ERROR: until a layout can occur, overflowarea should have 0 commands");

            // Restore the display, then test forceLayout
            this._element.style.display = "";
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 1 commands");

            // Decrease the width of the ToolBar so that it is 1px too thin to fit both primary commands, then test forceLayout.
            var customContentTotalWidth = toolBar._commandingSurface._getCommandWidth(data.getAt(1));
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContentTotalWidth - 1, 
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "actionarea should have 1 commands");
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 3 commands");

            // Decrease width of content command by 1px so that both primary commands will fit in the action area, then test forceLayout
            customContentBoxWidth--;
            customEl.style.width = customContentBoxWidth + "px"
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 1 command");
        }

        testResizeHandler() {
            // Verify that the resize handler knows how to correctly re-layout commands if the CommandingSurface width has changed.
            // - while the control is closed.
            // - while the control is opened.
            // Typically the resizeHandler is only called by the window resize event.

            // Test all closedDisplayModes https://github.com/winjs/winjs/issues/1183
            Object.keys(ToolBar.ClosedDisplayMode).forEach((mode) => {

                var prefix = "closedDisplayMode: " + mode + ", ";

                // Make sure everything will fit.
                var toolBarElement = document.createElement("DIV");
                toolBarElement.style.width = "1000px";
                this._element.appendChild(toolBarElement);

                var data = new WinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                    new Command(null, { type: _Constants.typeButton, label: "opt 2" }),
                    new Command(null, { type: _Constants.typeButton, label: "sec opt 1", section: _Constants.secondaryCommandSection })
                ]);
                var toolBar = new ToolBar(toolBarElement, {
                    data: data,
                    opened: false,
                    closedDisplayMode: mode,
                });
                Helper.ToolBar.useSynchronousAnimations(toolBar);

                LiveUnit.Assert.areEqual(2,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length,
                    "TEST ERROR: " + prefix + "Test expects actionarea should have 2 commands at start");
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                    "TEST ERROR: " + prefix + "Test expects overflowarea should have 1 command at start");

                // Decrease the width of our control to fit exactly 1 command + the overflow button in the actionarea.
                var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                    closedDisplayMode: toolBar.closedDisplayMode,
                    numStandardCommandsShownInActionArea: 1,
                    numSeparatorsShownInActionArea: 0,
                    widthOfContentCommandsShownInActionArea: 0,
                    isACommandVisbleInTheOverflowArea: true,
                    additionalFreeSpace: 0, 
                };
                Helper._CommandingSurface.sizeForCommands(toolBar.element, args);

                // Ensure that the resizeHandler will have overflowed all but one primary command into the overflowarea
                WinJS.Utilities._resizeNotifier._handleResize();

                // Verify commands laid our correctly while closed.
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length,
                    prefix + "closed actionarea should have 1 command after width decrease");
                LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                    prefix + "closed overflowarea should have 3 commands after width decrease");

                // Verify commands are laid out correctly, the first time the control is opened following a resize.
                toolBar.open();
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length,
                    prefix + "actionarea should have 1 command after opening");
                LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                    prefix + "overflowarea should have 3 commands after opening");

                // Increase element size while opened, and verify the resizeHandler has reflowed all primary commands
                // back into the action area.
                toolBarElement.style.width = "1000px";
                WinJS.Utilities._resizeNotifier._handleResize();

                LiveUnit.Assert.areEqual(2,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length,
                    prefix + "opened actionarea should have 2 commands after width increase");
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                    prefix + "opened overflowarea should have 1 command after width increase");

                disposeAndRemoveElement(toolBar.element);
            });
        }

        testSeparatorAddedBetweenPrimaryAndSecondary() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);

            var toolBar = new ToolBar(this._element, {
                data: data
            });

            var overflowCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Custom content should overflow as a flyout menu item
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeFlyout, menuCommand.type, "Custom content should overflow with type flyout");
            LiveUnit.Assert.areEqual(toolBar._commandingSurface._contentFlyout, menuCommand.flyout, "Invalid flyout target for custom command in the overflowarea");
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isTrue(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.getVisibleCommandsInElement, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea)[1]["winControl"]);
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");

            // Deselect the toggle button in the menu
            var menuCommandEl = (<HTMLElement> toolBar._commandingSurface._dom.overflowArea.children[0]);
            menuCommandEl.click();

            // Increase the size of the control to fit both commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();

            // Ensure that the command in the actionarea now has the toggle de-selected
            var command = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea)[0];
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var menuCommand = toolBar._commandingSurface._dom.overflowArea.querySelectorAll(_Constants.commandSelector)[1]["winControl"];
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

            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 4,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0, 
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");

            // Decrease size to overflow 1 command
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(5 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Increase size to put command back into the actionarea
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 4,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 3 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 4 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(2 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 5 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(5 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 6 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 0,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
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

            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            var customContent1Width = toolBar._commandingSurface._getCommandWidth(data.getAt(1));
            var customContent2Width = toolBar._commandingSurface._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContent1Width + customContent2Width,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");

            // Decrease size to overflow 1 command
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContent1Width,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContent1Width - 1,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
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

            var toolBar = new ToolBar(this._element, {
                data: data,
                opened: true
            });

            // Click on the first menu item
            var menuCommand = (<HTMLElement> toolBar._commandingSurface._dom.overflowArea.children[0]);
            menuCommand.click();
            LiveUnit.Assert.areEqual("custom 1", toolBar._commandingSurface._contentFlyoutInterior.textContent, "The custom content flyout has invalid content");

            var testSecondCommandClick = () => {
                toolBar._commandingSurface._contentFlyout.removeEventListener("afterhide", testSecondCommandClick);

                // Click on the second menu item
                menuCommand = (<HTMLElement> toolBar._commandingSurface._dom.overflowArea.children[1]);
                menuCommand.click();
                LiveUnit.Assert.areEqual("custom 2", toolBar._commandingSurface._contentFlyoutInterior.textContent, "The custom content flyout has invalid content");

                complete();
            };

            toolBar._commandingSurface._contentFlyout.addEventListener("afterhide", testSecondCommandClick);
            toolBar._commandingSurface._contentFlyout.hide();
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

            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            var customContentWidth = toolBar._commandingSurface._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 5,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: customContentWidth,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow priority 5 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 5,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContentWidth - 1,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(5, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 6 /* 2 secondary commands + 1 separator + 2 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 4 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 7 /* 2 secondary commands + 1 separator + 3 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 3 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 8 /* 2 secondary commands + 1 separator + 4 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "3", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 2 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 10 /* 2 secondary commands + 1 separator + 5 primary commands with 2 separators */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", _Constants.typeSeparator, "3", "4", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 1 commands
            args = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 0,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 11 /* 2 secondary commands + 1 separator + 6 primary commands with 2 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["1", "2", _Constants.typeSeparator, "3", "4", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);
        }

        testMinWidth() {
            this._element.style.width = "10px";
            var toolBar = new ToolBar(this._element);

            LiveUnit.Assert.areEqual(_Constants.controlMinWidth, parseInt(getComputedStyle(this._element).width, 10), "Invalid min width of toolBar element");
        }

        testOverflowAreaContainerHeightWhenThereIsNoOverflow() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeContent, label: "1" }),
                new Command(null, { type: _Constants.typeContent, label: "2" }),
            ]);

            var toolBar = new ToolBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, WinJS.Utilities._getPreciseTotalHeight(toolBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container when there are no commands that overflow");
        }

        xtestOverflowAreaContainerSize() { // TODO Finish redline changes and then reimplement
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                opened: true,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            // Make sure primary commands fit exactly
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 6,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();

            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "There should only be 2 commands in the overflowarea");
            LiveUnit.Assert.areEqual(2 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(toolBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(parseInt(this._element.style.width), WinJS.Utilities._getPreciseTotalWidth(toolBar._commandingSurface._dom.overflowArea), "Invalid width for the overflowarea container");
            LiveUnit.Assert.areEqual(toolBar.element, toolBar._commandingSurface._dom.overflowArea.parentNode, "Invalid parent for the overflowarea container");
            LiveUnit.Assert.areEqual(toolBar.element, toolBar._commandingSurface._dom.actionArea.parentNode, "Invalid parent for the actionarea container");
        }

        xtestOverflowMaxHeightForOnlySecondaryCommands() { // TODO Finish redline changes and then reimplement
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                opened: true
            });

            LiveUnit.Assert.areEqual(4.5 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(toolBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(9, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "There should be 9 commands in the overflowarea");
        }

        xtestOverflowMaxHeightForMixedCommands() { // TODO Finish redline changes and then reimplement
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                opened: true
            });

            LiveUnit.Assert.areEqual(4.5 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(toolBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            // Limit the width of the control to fit only 3 commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();

            // The actionarea should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length);

            // Delete item wth label 3
            toolBar.data.splice(2, 1);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual("4", Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea)[2].textContent);

                // The actionarea should now show | 1 | 2 | 4  | ... |
                LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length);

                toolBar.data.splice(0, 0, new Command(null, { type: _Constants.typeButton, label: "new" }));

                WinJS.Utilities.Scheduler.schedule(() => {
                    var visibleCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea);
                    LiveUnit.Assert.areEqual("new", visibleCommands[0].textContent);
                    LiveUnit.Assert.areEqual("1", visibleCommands[1].textContent);
                    LiveUnit.Assert.areEqual("2", visibleCommands[2].textContent);

                    // The actionarea should now show | new | 1 | 2  | ... |
                    LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length);

                    // Force all commands into the overflowarea
                    this._element.style.width = "10px";
                    toolBar.forceLayout();

                    // Delete the first command and verify CommandingSurface Dom updates. 
                    // Also verify that we dispose the deleted command's associated MenuCommand projection.
                    var deletedCommand = toolBar.data.splice(data.length - 1, 1)[0];

                    // PRECONDITION: Sanity check that the command we got back is our content command.
                    LiveUnit.Assert.areEqual(_Constants.typeContent, deletedCommand.type);

                    var deletedMenuCommand = Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(toolBar._commandingSurface, deletedCommand);
                    WinJS.Utilities.Scheduler.schedule(() => {
                        LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length);
                        LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length);
                        LiveUnit.Assert.isTrue(deletedMenuCommand._disposed,
                            "Removing a command from the CommandingSurface's overflowarea should dispose the associated menucommand projection");

                        LiveUnit.Assert.isFalse(toolBar._commandingSurface._contentFlyout._disposed,
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                closedDisplayMode: ToolBar.ClosedDisplayMode.compact,
            });

            // Limit the width of the control to fit 3 commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: toolBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            toolBar.forceLayout();

            // The actionarea should now show | 1 | 2 | 3 | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length);

            var menuCommandProjections = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).map(function (element) {
                return <WinJS.UI.PrivateMenuCommand>element.winControl;
            });

            // Delete all items
            toolBar.data = new WinJS.Binding.List([]);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea).length, "Action area should be empty");
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length, "Overflow area should be empty");
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
            var toolBar = new ToolBar(this._element, { data: data, opened: true });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            var startingLength = 3;

            // PRECONDITION: Test assumes there are 3 overflowing primary commands in the overflowarea.
            LiveUnit.Assert.areEqual(startingLength, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                "TEST ERROR: Test expects 3 overflowing commands at the start");

            // Commands in the overflowarea are all MenuCommand projections of the original ICommands in the actionarea.
            // These projections and the rest of the overflowarea are redrawn whenever the data in the binding list changes 
            // or when certain properties of ICommands in the CommandingSurface are mutated.
            var projections = {
                get button() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(toolBar._commandingSurface, buttonCmd);
                },
                get toggle() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(toolBar._commandingSurface, toggleCmd);
                },
                get flyout() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(toolBar._commandingSurface, flyoutCmd);
                }
            }

            var msg = " property of projected menucommand should have updated";

            buttonCmd.label = "new label";
            new WinJS.Promise((c) => {
                toolBar._commandingSurface._layoutCompleteCallback = () => {
                    LiveUnit.Assert.areEqual(buttonCmd.label, projections.button.label, "label" + msg);
                    c();
                };
            }).then(
                () => {
                    buttonCmd.disabled = true;
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.disabled, projections.button.disabled, "disabled" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.disabled = false;
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.disabled, projections.button.disabled, "disabled" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.extraClass = "new class";
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.extraClass, projections.button.extraClass, "extraClass" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.onclick = () => { };
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.onclick, projections.button.onclick, "onclick" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.hidden = true;
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.isNull(projections.button,
                                "Setting hidden = true on an overflowing ICommand should remove its menucommand projection from the overflowarea");
                            LiveUnit.Assert.areEqual(startingLength - 1, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                                "Setting hidden = true on an overflowing ICommand should remove its menucommand projection from the overflowarea");
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.hidden = false;
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.isNotNull(projections.button,
                                "Setting hidden = false on an overflowing ICommand should add a menucommand projection of it to the overflowarea");
                            LiveUnit.Assert.areEqual(startingLength, Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea).length,
                                "Setting hidden = false on an overflowing ICommand should add a menucommand projection of it to the overflowarea");
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    toggleCmd.selected = true;
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(toggleCmd.selected, projections.toggle.selected, "selected" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    toggleCmd.selected = false;
                    return new WinJS.Promise((c) => {
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
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
                        toolBar._commandingSurface._layoutCompleteCallback = () => {
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });
            Helper._CommandingSurface.verifyActionAreaVisibleCommandsLabels(toolBar._commandingSurface, ["opt 1", "opt 2", "opt 3"]);
            Helper._CommandingSurface.verifyOverflowAreaCommandsLabels(toolBar._commandingSurface, ["opt 4"]);
        }

        testClosedDisplayModeConstructorOptions() {
            var toolBar = new ToolBar();
            LiveUnit.Assert.areEqual(_Constants.defaultClosedDisplayMode, toolBar.closedDisplayMode, "'closedDisplayMode' property has incorrect default value.");
            toolBar.dispose();

            Object.keys(ToolBar.ClosedDisplayMode).forEach(function (mode) {
                toolBar = new ToolBar(null, { closedDisplayMode: mode });
                LiveUnit.Assert.areEqual(mode, toolBar.closedDisplayMode, "closedDisplayMode does not match the value passed to the constructor.");
                toolBar.dispose();
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
            var toolBar = new ToolBar(this._element, {
                data: data,
                opened: false,
            });

            var msg = "Changing the closedDisplayMode property should not trigger this event";
            toolBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            toolBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            toolBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            toolBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            Object.keys(ToolBar.ClosedDisplayMode).forEach(function (mode) {
                toolBar.closedDisplayMode = mode;
                LiveUnit.Assert.areEqual(mode, toolBar.closedDisplayMode, "closedDisplayMode property should be writeable.");
                Helper.ToolBar.verifyRenderedClosed(toolBar);
            });
        }

        testOpen() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var toolBar = new ToolBar(this._element, { data: data, opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            toolBar.open();

            LiveUnit.Assert.isTrue(toolBar.opened)
            Helper.ToolBar.verifyRenderedOpened(toolBar);
        }

        testOpenIsIdempotent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            // Initialize opened.
            var toolBar = new ToolBar(this._element, { data: data, opened: true });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            var msg = "Opening an already opened ToolBar should not fire events";
            toolBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            toolBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            toolBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            toolBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            // Verify nothing changes when opening again.
            var originalOpenedRect = toolBar.element.getBoundingClientRect();
            toolBar.open();
            LiveUnit.Assert.isTrue(toolBar.opened, "opened ToolBar should still be opened");
            Helper.ToolBar.verifyRenderedOpened(toolBar);
            Helper.Assert.areBoundingClientRectsEqual(originalOpenedRect, toolBar.element.getBoundingClientRect(),
                "opening an opened ToolBar should not affect its bounding client rect", 0);
        }

        testClose() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var toolBar = new ToolBar(this._element, { data: data, opened: true });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            toolBar.close();
            LiveUnit.Assert.isFalse(toolBar.opened)
            Helper.ToolBar.verifyRenderedClosed(toolBar);
        }

        testCloseIsIdempotent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            // Initialize closed.
            var toolBar = new ToolBar(this._element, { data: data, opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            var msg = "Closing an already closed ToolBar should not fire events";
            toolBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            toolBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            toolBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            toolBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            // Verify nothing changes when closing again.
            var originalClosedRect = toolBar.element.getBoundingClientRect();
            toolBar.close();
            LiveUnit.Assert.isFalse(toolBar.opened)
            Helper.ToolBar.verifyRenderedClosed(toolBar);
            Helper.Assert.areBoundingClientRectsEqual(originalClosedRect, toolBar.element.getBoundingClientRect(),
                "closing a closed ToolBar should not change affect bounding client rect", 0);
        }

        testToolBarElementReturnsToOriginalParentElement_AfterClosing() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            var toolBarEl = document.createElement("DIV"),
                prevSibling = document.createElement("DIV"),
                nextSibling = document.createElement("DIV");

            this._element.appendChild(prevSibling);
            this._element.appendChild(toolBarEl);
            this._element.appendChild(nextSibling);

            var toolBar = new ToolBar(toolBarEl, { data: data, opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            // Opening the ToolBar will move it to the body. 
            // Verify that closing the ToolBar moves it back into the correct DOM location of its parent element.
            toolBar.open();
            toolBar.close();

            LiveUnit.Assert.isTrue(this._element.children[0] === prevSibling, "prevSibling should remain at index 0");
            LiveUnit.Assert.isTrue(this._element.children[1] === toolBar.element, "toolBar should remain at index 1");
            LiveUnit.Assert.isTrue(this._element.children[2] === nextSibling, "nextSibling should remain at index 2");
        }

        testOpeningOrClosingToolBar_DoesNotReflowDOMContent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            var toolBarEl = document.createElement("DIV"),
                prevSibling = document.createElement("DIV"),
                nextSibling = document.createElement("DIV");

            this._element.appendChild(prevSibling);
            this._element.appendChild(toolBarEl);
            this._element.appendChild(nextSibling);

            var toolBar = new ToolBar(toolBarEl, { data: data, opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            // Ensure elements have dimensions
            this._element.style.height = "auto";
            this._element.style.width = "50px";
            prevSibling.style.height = "10px";
            prevSibling.style.width = "10px";
            nextSibling.style.height = "10px";
            nextSibling.style.width = "10px";

            // When the ToolBar is opened it will move itself to the body and leave a placeholder element 
            // of the same size in its place. When the ToolBar is closed, it returns to its original parent 
            // element. Verify that opening and closing the ToolBar does not reflow the content around it.
            var parentRect = this._element.getBoundingClientRect();
            var prevSiblingRect = prevSibling.getBoundingClientRect();
            var nextSiblingRect = nextSibling.getBoundingClientRect();

            toolBar.open();
            Helper.Assert.areBoundingClientRectsEqual(parentRect, this._element.getBoundingClientRect(),
                "Opening the ToolBar should not cause its parent element to reflow.", 1);
            Helper.Assert.areBoundingClientRectsEqual(prevSiblingRect, prevSibling.getBoundingClientRect(),
                "Opening the ToolBar should not cause its previous sibling element to reflow.", 1);
            Helper.Assert.areBoundingClientRectsEqual(nextSiblingRect, nextSibling.getBoundingClientRect(),
                "Opening the ToolBar should not cause its next sibling element to reflow.", 1);

            toolBar.close();
            Helper.Assert.areBoundingClientRectsEqual(parentRect, this._element.getBoundingClientRect(),
                "Closing the ToolBar should not cause its parent element to reflow.", 1);
            Helper.Assert.areBoundingClientRectsEqual(prevSiblingRect, prevSibling.getBoundingClientRect(),
                "Closing the ToolBar should not cause its previous sibling element to reflow.", 1);
            Helper.Assert.areBoundingClientRectsEqual(nextSiblingRect, nextSibling.getBoundingClientRect(),
                "Closing the ToolBar should not cause its next sibling element to reflow.", 1);
        }

        testAutoOverFlowDirection() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "primary1" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary1" }),
                new Command(null, { type: _Constants.typeButton, icon: 'delete', label: "primary2" }),
                new Command(null, { type: _Constants.typeSeparator, section: 'secondary' }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary2" })
            ]);

            // Put ToolBar inside of a fixed position element. We can easily move it around the viewport.
            var toolBarEl = document.createElement("DIV");
            var container = document.createElement("DIV");
            this._element.appendChild(container);
            container.appendChild(toolBarEl);
            container.style.position = "fixed";
            container.style.width = "100px";
            container.style.height = "auto";
            container.style.padding = "0";
            container.style.border = "none";
            container.style.margin = "0";

            var toolBar = new ToolBar(toolBarEl, { data: data });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            // Start from a sane place and verify that the ToolBar's parent element is sized to content.
            LiveUnit.Assert.areEqual(WinJS.Utilities._getPreciseTotalHeight(toolBarEl),
                WinJS.Utilities._getPreciseContentHeight(container),
                "TEST ERROR: ToolBar's container element must size to content.");

            // Vertically center the closed ToolBar's content box.
            var topOfViewport = 0;
            var bottomOfViewport = window.innerHeight;
            var middleOfViewport = window.innerHeight / 2;
            var closedStyle = getComputedStyle(toolBar._dom.root);
            var paddingTop = WinJS.Utilities._convertToPrecisePixels(closedStyle.paddingTop);
            var borderTop = WinJS.Utilities._convertToPrecisePixels(closedStyle.borderTopWidth);
            var marginTop = WinJS.Utilities._convertToPrecisePixels(closedStyle.marginTop);
            var contentHeight = WinJS.Utilities._getPreciseContentHeight(toolBarEl);
            var nextContainerTop = middleOfViewport - (contentHeight / 2) - paddingTop - borderTop - marginTop;

            container.style.top = nextContainerTop + "px";

            // Sanity check our enviornment and verify that the ToolBar element's content box height is centered
            // around the mid point of the viewport.

            var toolBarRect = toolBarEl.getBoundingClientRect();
            var contentRectTop = toolBarRect.top + borderTop + paddingTop;
            var middleOfContentBox = contentRectTop + (contentHeight / 2);
            Helper.Assert.areFloatsEqual(middleOfViewport, middleOfContentBox,
                "TEST ERROR, Test failed to correctly set enviornment. The content box should be centered " +
                "around the middpoint of the viewport height", 1);

            // Verify that an opened ToolBar will automatically overflow in the direction (top/bottom) that has
            // the most available space between the viewport and content box.

            // Pull the center of the content box up one pixel from the middle of the viewport. 
            nextContainerTop -= 1;
            container.style.top = nextContainerTop + "px";

            // Now that we are above center, verify that ToolBar opens downwards.
            toolBar.open();
            LiveUnit.Assert.areEqual(_Constants.OverflowDirection.bottom,
                toolBar._commandingSurface.overflowDirection,
                "ToolBar should overflow bottom when there is more space below the content box than above it.");
            toolBar.close();

            // Move the center of the content box down to just 1 pixel below the middle of the viewport
            nextContainerTop += 2;
            container.style.top = nextContainerTop + "px";

            // Now that we are below center, verify that ToolBar opens upwards.
            toolBar.open();
            LiveUnit.Assert.areEqual(_Constants.OverflowDirection.top,
                toolBar._commandingSurface.overflowDirection,
                "ToolBar should overflow top when there is more space aboce the content box than below it.");
        }

        testToolBarRetainsViewPortCoordinatesWhenOpenedAndClosed() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            var toolBar = new ToolBar(this._element, { data: data, opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);
            var closedRect = toolBar.element.getBoundingClientRect();

            toolBar.open();
            var openedRect = toolBar.element.getBoundingClientRect();
            // We expect the coordinates of either the top or bottom edge of the opened ToolBar will change
            // based on the overflowDirection chosen for the commanding surface. Verify that the other
            // edges have not changed coordinates.
            Helper.Assert.areFloatsEqual(closedRect.left, openedRect.left,
                "Opening a ToolBar should not affect its left edge viewport coordinate", 1);
            Helper.Assert.areFloatsEqual(closedRect.right, openedRect.right,
                "Opening a ToolBar should not affect its right edge viewport coordinate", 1);

            switch (toolBar._commandingSurface.overflowDirection) {
                case _Constants.OverflowDirection.top:
                    Helper.Assert.areFloatsEqual(closedRect.bottom, openedRect.bottom,
                        "Opening a ToolBar should not affect its bottom edge viewport coordinate", 1);
                    break;
                case _Constants.OverflowDirection.bottom:
                    Helper.Assert.areFloatsEqual(closedRect.top, openedRect.top,
                        "Opening a ToolBar should not affect its top edge viewport coordinate", 1);
                    break;
                default:
                    LiveUnit.Assert.fail("Unexpexted OverflowDirection enum value");
            }

            toolBar.close();
            Helper.Assert.areBoundingClientRectsEqual(closedRect, toolBar.element.getBoundingClientRect(),
                "Closing a ToolBar should not affect its viewport coordinates", 0)
        }

        testOpenedPropertyConstructorOptions() {
            var toolBar = new ToolBar();
            LiveUnit.Assert.areEqual(_Constants.defaultOpened, toolBar.opened, "opened property has incorrect default value");
            toolBar.dispose();

            [true, false].forEach(function (initiallyOpen) {
                toolBar = new ToolBar(null, { opened: initiallyOpen });
                LiveUnit.Assert.areEqual(initiallyOpen, toolBar.opened, "opened property does not match the value passed to the constructor.");
                toolBar.dispose();
            });
        }

        testTogglingOpenedProperty() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var toolBar = new ToolBar(this._element, { data: data, opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);
            Helper.ToolBar.verifyRenderedClosed(toolBar);

            toolBar.opened = true;
            LiveUnit.Assert.isTrue(toolBar.opened, "opened property should be writeable.");
            Helper.ToolBar.verifyRenderedOpened(toolBar);

            toolBar.opened = false;
            LiveUnit.Assert.isFalse(toolBar.opened, "opened property should be writeable.");
            Helper.ToolBar.verifyRenderedClosed(toolBar);
        }

        testOverFlowButtonClick() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var toolBar = new ToolBar(this._element, { data: data, opened: true });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            toolBar._commandingSurface._dom.overflowButton.click()
            LiveUnit.Assert.isFalse(toolBar.opened)
            Helper.ToolBar.verifyRenderedClosed(toolBar);

            toolBar._commandingSurface._dom.overflowButton.click()
            LiveUnit.Assert.isTrue(toolBar.opened)
            Helper.ToolBar.verifyRenderedOpened(toolBar);
        }

        testDomLevel0_OpenCloseEvents() {
            testEvents(this._element, (toolBar: WinJS.UI.PrivateToolBar, eventName: string, handler: Function) => {
                toolBar["on" + eventName] = handler;
            });
        }

        testDomLevel2_OpenCloseEvents() {
            testEvents(this._element, (toolBar: WinJS.UI.PrivateToolBar, eventName: string, handler: Function) => {
                toolBar.addEventListener(eventName, handler);
            });
        }

        testBeforeOpenIsCancelable() {
            var toolBar = new ToolBar(this._element, { opened: false });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            toolBar.onbeforeopen = function (eventObject) {
                eventObject.preventDefault();
            };
            toolBar.onafteropen = function (eventObject) {
                LiveUnit.Assert.fail("afteropen shouldn't have fired due to beforeopen being canceled");
            };

            toolBar.open();
            LiveUnit.Assert.isFalse(toolBar.opened, "ToolBar should still be closed");

            toolBar.opened = true;
            LiveUnit.Assert.isFalse(toolBar.opened, "ToolBar should still be closed");
        }

        testBeforeCloseIsCancelable() {
            var toolBar = new ToolBar(this._element, { opened: true });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            toolBar.onbeforeclose = function (eventObject) {
                eventObject.preventDefault();
            };
            toolBar.onafterclose = function (eventObject) {
                LiveUnit.Assert.fail("afterclose shouldn't have fired due to beforeclose being canceled");
            };

            toolBar.close();
            LiveUnit.Assert.isTrue(toolBar.opened, "ToolBar should still be open");

            toolBar.opened = false;
            LiveUnit.Assert.isTrue(toolBar.opened, "ToolBar should still be open");
        }

        testToolBarAddsClassNamesToCommandingSurface() {
            // Make sure the appropriate ToolBar CSS classes are on _CommandingSurface subcomponents to allow for proper developer styling story.

            var toolBar = new ToolBar(this._element, { opened: true });
            var actionArea = toolBar._commandingSurface._dom.actionArea;
            var overflowArea = toolBar._commandingSurface._dom.overflowArea;
            var overflowButton = toolBar._commandingSurface._dom.overflowButton;
            var overflowButtonEllipsis = <HTMLElement>overflowButton.querySelector(".win-commandingsurface-ellipsis");

            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(actionArea, _Constants.ClassNames.actionAreaCssClass), "ToolBar missing actionarea class");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(overflowArea, _Constants.ClassNames.overflowAreaCssClass), "ToolBar missing overflowarea class");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(overflowButton, _Constants.ClassNames.overflowButtonCssClass), "ToolBar missing overflowbutton class");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(overflowButtonEllipsis, _Constants.ClassNames.ellipsisCssClass), "ToolBar missing ellipsis class");
        }

        testShowingIHMClosesToolBar() {
            var toolBar = new ToolBar(this._element, { opened: true });

            toolBar._handleShowingKeyboard();

            LiveUnit.Assert.isFalse(toolBar.opened);

        }

        testGetCommandById() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "A", id: "extraneous" })
            ]);

            this._element.style.width = "10px";
            var toolBar = new ToolBar(this._element, {
                data: data
            });
            LiveUnit.Assert.isNull(toolBar.getCommandById("someID"));

            var firstAddedCommand = new Command(null, { type: _Constants.typeButton, label: "B", id: "someID" });
            data.push(firstAddedCommand);
            LiveUnit.Assert.areEqual(firstAddedCommand, toolBar.getCommandById("someID"));

            var secondAddedCommand = new Command(null, { type: _Constants.typeButton, label: "C", id: "someID" });
            data.push(secondAddedCommand);

            LiveUnit.Assert.areEqual(firstAddedCommand, toolBar.getCommandById("someID"));
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
            var toolBar = new ToolBar(this._element, {
                data: data
            });

            function checkCommandVisibility(expectedShown, expectedHidden) {
                return new WinJS.Promise(c => {
                    toolBar._commandingSurface._layoutCompleteCallback = function () {
                        for (var i = 0, len = expectedShown.length; i < len; i++) {
                            var shownCommand = toolBar.getCommandById(expectedShown[i]);
                            LiveUnit.Assert.isFalse(shownCommand.hidden);
                            if (shownCommand.section === "secondary") {
                                LiveUnit.Assert.areEqual("none", getComputedStyle(shownCommand.element).display);
                                var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);
                                LiveUnit.Assert.areEqual(shownCommand.label, overflowAreaCommands[0].winControl.label);
                            } else {
                                LiveUnit.Assert.areEqual("inline-block", getComputedStyle(shownCommand.element).display);
                            }
                        }
                        for (var i = 0, len = expectedHidden.length; i < len; i++) {
                            var hiddenCommand = toolBar.getCommandById(expectedHidden[i]);
                            LiveUnit.Assert.isTrue(hiddenCommand.hidden);
                            LiveUnit.Assert.areEqual("none", getComputedStyle(hiddenCommand.element).display);
                        }
                        c();
                    };
                });
            }

            toolBar.showOnlyCommands([]);
            checkCommandVisibility([], ["A", "B", "C", "D", "E"]).then(
                () => {
                    toolBar.showOnlyCommands(["A", "B", "C", "D", "E"]);
                    return checkCommandVisibility(["A", "B", "C", "D", "E"], []);
                }).then(() => {
                    toolBar.showOnlyCommands(["A"]);
                    return checkCommandVisibility(["A"], ["B", "C", "D", "E"]);
                }).then(() => {
                    toolBar.showOnlyCommands([data.getAt(1)]);
                    return checkCommandVisibility(["B"], ["A", "C", "D", "E"]);
                }).then(() => {
                    toolBar.showOnlyCommands(["C", data.getAt(4)]);
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
            var toolBar = new ToolBar(this._element, {
                data: new WinJS.Binding.List([p0, p1, p2, s0, s1])
            });

            var actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea);
            var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);

            // The actionarea should only show | p0 | p1 | ... |
            LiveUnit.Assert.areEqual(2, actionAreaCommands.length, "actionarea should display 2 command");
            LiveUnit.Assert.areEqual(p0.label, actionAreaCommands[0].winControl.label);
            LiveUnit.Assert.areEqual(p1.label, actionAreaCommands[1].winControl.label);

            // The overflowarea should only show | s0 |
            LiveUnit.Assert.areEqual(1, overflowAreaCommands.length, "overflowarea should display 1 command");
            LiveUnit.Assert.areEqual(s0.label, overflowAreaCommands[0].winControl.label);

            new WinJS.Promise((c) => {
                toolBar._commandingSurface._layoutCompleteCallback = () => {

                    actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.actionArea);
                    overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(toolBar._commandingSurface._dom.overflowArea);

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
                toolBar.forceLayout();

            }).done(complete);
        }

        private _testLightDismissWithTrigger(dismissToolBar) {
            var button = document.createElement("button");
            button.textContent = "Initially Focused";
            var element = document.createElement("div");

            this._element.appendChild(button);
            this._element.appendChild(element);

            var toolBar = new ToolBar(element, {
                data: new WinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, icon: 'add', label: "add" }),
                    new Command(null, { type: _Constants.typeButton, icon: 'remove', label: "remove" }),
                    new Command(null, { type: _Constants.typeButton, icon: 'accept', label: "accept" }),
                    new Command(null, { type: _Constants.typeSeparator }),
                    new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
                ])
            });
            Helper.ToolBar.useSynchronousAnimations(toolBar);

            return Helper.focus(button).then(() => {
                LiveUnit.Assert.areEqual(button, document.activeElement, "Button should have focus initially");

                return Helper.waitForFocusWithin(toolBar.element, () => { toolBar.open(); });
            }).then(() => {
                    LiveUnit.Assert.areEqual(toolBar.data.getAt(0).element, document.activeElement,
                        "ToolBar's leftmost primary command should have focus after opening");
                    LiveUnit.Assert.isTrue(_LightDismissService.isTopmost(toolBar._dismissable),
                        "ToolBar should be the topmost light dismissable");

                    return Helper.waitForFocus(button, () => { dismissToolBar(toolBar); });
                }).then(() => {
                    LiveUnit.Assert.areEqual(button, document.activeElement,
                        "Focus should have been restored to the button");
                    LiveUnit.Assert.isFalse(_LightDismissService.isShown(toolBar._dismissable),
                        "ToolBar should not be in the light dismissable stack");
                });
        }

        testLightDismissWithClose(complete) {
            this._testLightDismissWithTrigger((toolBar) => { toolBar.close(); }).then(complete);
        }
        testLightDismissWithDispose(complete) {
            this._testLightDismissWithTrigger((toolBar) => { toolBar.dispose(); }).then(complete);
        }
        testLightDismissWithTap(complete) {
            this._testLightDismissWithTrigger((toolBar) => { _LightDismissService._clickEaterTapped(); }).then(complete);
        }

        testToolBarDoesntScrollPage = function (complete) {
            // https://github.com/winjs/winjs/issues/1174
            // When the ToolBar is opened or closed, it reparents itself to or from the <body>. If the ToolBar had focus before reparenting,
            // it will lose focus in most browsers, to combat this the ToolBar will refocus itself after re-parenting. Verify that the operation 
            // for opening and closing, the ToolBar will not cause the body to scroll.

            var iframe = document.createElement("iframe");
            iframe.src = "$(TESTDATA)/WinJSSandbox.html";
            iframe.onload = function () {

                // Be safe, and only use the WinJS loaded inside of the Iframe.
                var iframeWinJS = <typeof WinJS>iframe.contentWindow["WinJS"];
                var ToolBar = <typeof WinJS.UI.PrivateToolBar> iframeWinJS.UI.ToolBar;
                var AppBarCommand = <typeof WinJS.UI.PrivateCommand> iframeWinJS.UI.AppBarCommand;

                var iframeWindow = iframe.contentWindow;
                var iframeDocument = iframeWindow.document;
                iframeDocument.documentElement.style.overflowY = "auto";

                var data = new iframeWinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                    new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
                ]);

                var element = iframeDocument.createElement("DIV");
                iframeDocument.body.appendChild(element);
                var toolBar = new ToolBar(element, { data: data, opened: false });
                Helper.ToolBar.useSynchronousAnimations(toolBar);

                var spacer = iframeDocument.createElement("DIV");
                spacer.style.height = "100%";
                iframeDocument.body.appendChild(spacer);

                // PRECONDITION: Sanity check that our confiiguration gave us a scroll bar.
                LiveUnit.Assert.isTrue(iframeDocument.documentElement.scrollHeight > iframeDocument.documentElement.clientHeight + 1,
                    "Test Error: Test requires a vertical scroll bar.")

                // PRECONDITION: Sanity check that the we give toolBar focus before we start. This ensures that ToolBar's call to 
                // _ElementUtilities.maintainFocus() will cache the ToolBar as the activeElement when we open/close the ToolBar. 
                toolBar.element.focus();
                LiveUnit.Assert.areEqual(toolBar.element, iframeDocument.activeElement,
                    "Test Error: Test Requires that the ToolBar recieve focus at the beginning")

                // PRECONDITION: Sanity check that we are at the top of the page.
                var scrollTop = 0;
                LiveUnit.Assert.areEqual(scrollTop, iframeWindow.pageYOffset,
                    "Test Error: Test should begin with <body> scrolled all the way to the top.");

                toolBar.open();
                LiveUnit.Assert.areEqual(scrollTop, iframeWindow.pageYOffset,
                    "Opening the ToolBar should not cause ancestors to scroll.");

                toolBar.close();
                LiveUnit.Assert.areEqual(scrollTop, iframeWindow.pageYOffset,
                    "Closing the ToolBar should not cause ancestors to scroll.");

                complete();
            };
            this._element.appendChild(iframe);
        }
    }
    
    var disabledTestRegistry = {
        testLightDismissWithClose:[Helper.Browsers.ie11, Helper.Browsers.firefox],
        testLightDismissWithDispose:[Helper.Browsers.ie11, Helper.Browsers.firefox],
        testLightDismissWithTap:[Helper.Browsers.ie11, Helper.Browsers.firefox],
        testShowOnlyCommands:[
            Helper.Browsers.chrome,
            Helper.Browsers.safari,
            Helper.Browsers.firefox,
            Helper.Browsers.android
        ]
    };
    Helper.disableTests(ToolBarTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("CorsicaTests.ToolBarTests");
