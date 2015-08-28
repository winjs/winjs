// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../TestLib/Helper.CommandingSurface.ts"/>
/// <reference path="../TestLib/Helper.AppBar.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />
// <reference path="../TestData/AppBar.less.css" />

module CorsicaTests {
    var AppBar = <typeof WinJS.UI.PrivateAppBar> WinJS.UI.AppBar;
    var Command = <typeof WinJS.UI.PrivateCommand> WinJS.UI.AppBarCommand;
    var _LightDismissService = <typeof WinJS.UI._LightDismissService>Helper.require("WinJS/_LightDismissService");
    var Util = WinJS.Utilities;
    var _Constants = Helper.require("WinJS/Controls/AppBar/_Constants");

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. onbeforeopen) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(testElement, registerForEvent: (appBar: WinJS.UI.PrivateAppBar, eventName: string, handler: Function) => void) {
        var appBar = new AppBar(testElement);
        Helper.AppBar.useSynchronousAnimations(appBar);

        var counter = 0;
        registerForEvent(appBar, _Constants.EventNames.beforeOpen, () => {
            LiveUnit.Assert.areEqual(1, counter, _Constants.EventNames.beforeOpen + " fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(appBar.opened, _Constants.EventNames.beforeOpen + ": AppBar should not be in opened state");
        });
        registerForEvent(appBar, _Constants.EventNames.afterOpen, () => {
            LiveUnit.Assert.areEqual(2, counter, _Constants.EventNames.afterOpen + " fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(appBar.opened, _Constants.EventNames.afterOpen + ": AppBar should be in opened state");
        });
        registerForEvent(appBar, _Constants.EventNames.beforeClose, () => {
            LiveUnit.Assert.areEqual(4, counter, _Constants.EventNames.beforeClose + " fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(appBar.opened, _Constants.EventNames.beforeClose + ": AppBar should be in opened state");
        });
        registerForEvent(appBar, _Constants.EventNames.afterClose, () => {
            LiveUnit.Assert.areEqual(5, counter, _Constants.EventNames.afterClose + " fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(appBar.opened, _Constants.EventNames.afterClose + ": AppBar should not be in opened state");
        });

        LiveUnit.Assert.areEqual(0, counter, "before open: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isFalse(appBar.opened, "before open: AppBar should not be in opened state");

        appBar.open();
        LiveUnit.Assert.areEqual(3, counter, "after open: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isTrue(appBar.opened, "after open: AppBar should be in opened state");

        appBar.close();
        LiveUnit.Assert.areEqual(6, counter, "after close: wrong number of events fired");
        LiveUnit.Assert.isFalse(appBar.opened, "after close: AppBar should not be in opened state");
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

    export class AppBarTests {
        "use strict";

        _element: HTMLElement;

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = "host";
            document.body.appendChild(newNode);
            this._element = newNode;
            WinJS.Utilities.addClass(this._element, "file-appbar-css");
        }

        tearDown() {
            if (this._element) {
                disposeAndRemoveElement(this._element)
                this._element = null;
            }
        }

        testConstruction() {
            var appBar = new AppBar(this._element);
            LiveUnit.Assert.isTrue(Util.hasClass(appBar.element, _Constants.ClassNames.controlCssClass), "AppBar missing control css class");
            LiveUnit.Assert.isTrue(Util.hasClass(appBar.element, _Constants.ClassNames.disposableCssClass), "AppBar missing disposable css class");
        }

        testAppendToDomAfterConstruction(complete) {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            var appBar = new AppBar(null, {
                data: data
            });
            var insertedHandler = function () {
                appBar.element.removeEventListener("WinJSNodeInserted", insertedHandler);
                LiveUnit.Assert.areEqual(data.length, appBar._commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
                complete();
            }

            appBar.element.addEventListener("WinJSNodeInserted", insertedHandler);
            this._element.appendChild(appBar.element);
        }

        testElementProperty() {
            var el = document.createElement("div");
            var appBar = new AppBar(el);
            LiveUnit.Assert.areEqual(Util._uniqueID(el), Util._uniqueID(appBar.element), "The element passed in the constructor should be the appBar element");

            appBar = new AppBar();
            LiveUnit.Assert.isNotNull(appBar.element, "An element should be created when one is not passed to the constructor");
        }

        testDataProperty() {
            // Verify default (empty)
            var appBar = new AppBar(this._element);
            LiveUnit.Assert.areEqual(0, appBar.data.length, "Empty AppBar should have length 0");

            // Add some data
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            appBar.data = data;
            LiveUnit.Assert.areEqual(2, appBar.data.length, "AppBar data has an invalid length");
        }

        xtestBadData() { // TODO: Paramaterize CommandingSurface so that the control name in the exception is "AppBar", currently reads "_CommandingSurface"
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);

            var appBar = new AppBar(this._element, { data: data });

            // set data to invalid value
            var property = "data";
            try {
                appBar[property] = { invalid: 1 };
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI.AppBar.BadData", e.name);

                // Ensure the value of data did not change
                LiveUnit.Assert.areEqual(2, appBar.data.length, "AppBar data has an invalid length");
            }
        }

        testDeclarativeData() {
            // Verify that if the AppBar element contains children elements at construction, those elements are parsed as data.
            var el = document.createElement("div");
            var child = document.createElement("table");
            el.appendChild(child);
            var appBar: WinJS.UI.PrivateAppBar;
            try {
                new AppBar(el);
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.UI._CommandingSurface.MustContainCommands", e.name, "AppBar should have thrown MustContainCommands exception");
            }

            el = document.createElement("div");
            var commandEl: HTMLElement;
            var numberOfCommands = 5;
            for (var i = 0; i < numberOfCommands; i++) {
                commandEl = document.createElement("button");
                commandEl.setAttribute("data-win-control", "WinJS.UI.AppBarCommand");
                el.appendChild(commandEl);
            }
            appBar = new AppBar(el);
            LiveUnit.Assert.areEqual(numberOfCommands, appBar.data.length, "AppBar declarative commands were not parsed as data.");
        }

        testDispose() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1", section: 'primary' }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: 'secondary' })
            ]);
            var appBar = new AppBar(this._element, { data: data });
            Helper.AppBar.useSynchronousAnimations(appBar);
            appBar.open();

            var msg = "Shouldn't have fired due to control being disposed";
            appBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            appBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            appBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            appBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            var menuCommandProjections = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).map(function (element) {
                return <WinJS.UI.PrivateMenuCommand>element.winControl;
            });

            appBar.dispose();
            LiveUnit.Assert.isTrue(appBar._disposed, "AppBar didn't mark itself as disposed");
            LiveUnit.Assert.isTrue(appBar._commandingSurface._disposed, "AppBar's commandingSurface was not disposed");

            LiveUnit.Assert.isTrue(menuCommandProjections.every(function (menuCommand) {
                return menuCommand._disposed;
            }), "Disposing the AppBar should have disposed all the overflowarea MenuCommands.");

            LiveUnit.Assert.isTrue(appBar.data.every(function (command) {
                var privateCommand = <WinJS.UI.PrivateCommand>command;
                return privateCommand._disposed;
            }), "Disposing the AppBar should have disposed all of its commands.");

            // Events should not fire
            appBar.close();
            appBar.open();
        }

        testDoubleDispose() {
            var appBar = new AppBar();
            LiveUnit.Assert.isTrue(appBar.dispose);
            LiveUnit.Assert.isFalse(appBar._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            appBar.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            appBar.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(appBar._disposed);
            appBar.dispose();
        }

        testVerifyDefaultTabIndex() {
            var appBar = new AppBar();
            LiveUnit.Assert.areEqual("-1", appBar.element.getAttribute("tabIndex"), "AppBar should've assigned a default tabIndex");

            var el = document.createElement("div");
            el.setAttribute("tabIndex", "4");
            appBar = new AppBar(el);
            LiveUnit.Assert.areEqual("4", appBar.element.getAttribute("tabIndex"), "AppBar should have not assigned a default tabIndex");
        }

        testAria() {
            var appBar = new AppBar();
            LiveUnit.Assert.areEqual("menubar", appBar.element.getAttribute("role"), "Missing default aria role");
            LiveUnit.Assert.areEqual("App Bar", appBar.element.getAttribute("aria-label"), "Missing default aria label");

            var el = document.createElement("div");
            appBar = new AppBar(el);
            el.setAttribute("role", "list");
            el.setAttribute("aria-label", "myList");
            LiveUnit.Assert.areEqual("list", appBar.element.getAttribute("role"), "AppBar should have not set a default aria role");
            LiveUnit.Assert.areEqual("myList", appBar.element.getAttribute("aria-label"), "AppBar should have not set a default aria label");
        }

        testOverflowButtonHiddenWithoutSecondaryCommands() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, appBar._commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(0, appBar._commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
        }

        testOverflowButtonVisibleForSecondaryCommand() {
            this._element.style.width = "1000px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);

            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(1, appBar._commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, appBar._commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
        }

        testOverflowButtonVisibleForOverflowingPrimaryCommand() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" })
            ]);
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(data.length, appBar._commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(0, appBar._commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
        }

        testForceLayout() {
            // Verify that force layout will correctly update commands layout when:
            // 1. The AppBar constructor could not measure any of the commands because the AppBar element was originally display "none".
            // 2. The width of the AppBar itself has changed.
            // 3. The width of content commands in the AppBar have changed

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
            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            // The measurement stage of the CommandLayoutPipeline should have failed because our element was display "none". 
            // Therefore, the layout stage should not have been reached and not even secondary commands will have made it into the overflow area yet.
            // Sanity check our test expectations before we begin.
            LiveUnit.Assert.areEqual(2, appBar._commandingSurface._primaryCommands.length, "TEST ERROR: Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, appBar._commandingSurface._secondaryCommands.length, "TEST ERROR: Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "TEST ERROR: until a layout can occur, actionarea should have 3 commands");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "TEST ERROR: until a layout can occur, overflowarea should have 0 commands");

            // Restore the display, then test forceLayout
            this._element.style.display = "";
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 1 commands");

            // Decrease the width of the AppBar so that it is 1px too thin to fit both primary commands, then test forceLayout.
            var customContentTotalWidth = appBar._commandingSurface._getCommandWidth(data.getAt(1));
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContentTotalWidth - 1, 
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "actionarea should have 1 commands");
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 3 commands");

            // Decrease width of content command by 1px so that both primary commands will fit in the action area, then test forceLayout
            customContentBoxWidth--;
            customEl.style.width = customContentBoxWidth + "px"
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 1 command");
        }

        testResizeHandler() {
            // Verify that the resize handler knows how to correctly re-layout commands if the CommandingSurface width has changed.
            // - while the control is closed.
            // - while the control is opened.
            // Typically the resizeHandler is only called by the window resize event.

            // Test all closedDisplayModes https://github.com/winjs/winjs/issues/1183
            Object.keys(AppBar.ClosedDisplayMode).forEach((mode) => {

                var prefix = "closedDisplayMode: " + mode + ", ";

                // ClosedDisplayMode: "none" can't measure or layout commands while closed because element.style.display is none.
                // ClosedDisplayMode: "minimal" can't layout commands correctly while closed because all commands are display: "none".
                var doesModeSupportVisibleCommandsWhileClosed = (mode === AppBar.ClosedDisplayMode.compact || mode === AppBar.ClosedDisplayMode.full);

                // Make sure everything will fit.
                var appBarElement = document.createElement("DIV");
                appBarElement.style.width = "1000px";
                this._element.appendChild(appBarElement);

                var data = new WinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                    new Command(null, { type: _Constants.typeButton, label: "opt 2" }),
                    new Command(null, { type: _Constants.typeButton, label: "sec opt 1", section: _Constants.secondaryCommandSection })
                ]);
                var appBar = new AppBar(appBarElement, {
                    data: data,
                    opened: false,
                    closedDisplayMode: mode,
                });
                Helper.AppBar.useSynchronousAnimations(appBar);

                if (doesModeSupportVisibleCommandsWhileClosed) {
                    LiveUnit.Assert.areEqual(2,
                        Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length,
                        "TEST ERROR: " + prefix + "Test expects actionarea should have 2 commands at start");
                    LiveUnit.Assert.areEqual(1,
                        Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                        "TEST ERROR: " + prefix + "Test expects overflowarea should have 1 command at start");
                }

                // Decrease the width of our control to fit exactly 1 command + the overflow button in the actionarea.
                var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                    closedDisplayMode: appBar.closedDisplayMode,
                    numStandardCommandsShownInActionArea: 1,
                    numSeparatorsShownInActionArea: 0,
                    widthOfContentCommandsShownInActionArea: 0,
                    isACommandVisbleInTheOverflowArea: true,
                    additionalFreeSpace: 0, 
                };
                Helper._CommandingSurface.sizeForCommands(appBar.element, args);

                // Ensure that the resizeHandler will have overflowed all but one primary command into the overflowarea
                WinJS.Utilities._resizeNotifier._handleResize();

                if (doesModeSupportVisibleCommandsWhileClosed) {
                    // Verify commands laid our correctly while closed.
                    LiveUnit.Assert.areEqual(1,
                        Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length,
                        prefix + "closed actionarea should have 1 command after width decrease");
                    LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */,
                        Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                        prefix + "closed overflowarea should have 3 commands after width decrease");
                }

                // Verify commands are laid out correctly, the first time the control is opened following a resize.
                appBar.open();
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length,
                    prefix + "actionarea should have 1 command after opening");
                LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */,
                    Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                    prefix + "overflowarea should have 3 commands after opening");

                // Increase element size while opened, and verify the resizeHandler has reflowed all primary commands
                // back into the action area.
                appBarElement.style.width = "1000px";
                WinJS.Utilities._resizeNotifier._handleResize();

                LiveUnit.Assert.areEqual(2,
                    Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length,
                    prefix + "opened actionarea should have 2 commands after width increase");
                LiveUnit.Assert.areEqual(1,
                    Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                    prefix + "opened overflowarea should have 1 command after width increase");

                disposeAndRemoveElement(appBar.element);
            });
        }

        testSeparatorAddedBetweenPrimaryAndSecondary() {
            this._element.style.width = "10px";
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2", section: _Constants.secondaryCommandSection })
            ]);

            var appBar = new AppBar(this._element, {
                data: data
            });

            var overflowCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Custom content should overflow as a flyout menu item
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeFlyout, menuCommand.type, "Custom content should overflow with type flyout");
            LiveUnit.Assert.areEqual(appBar._commandingSurface._contentFlyout, menuCommand.flyout, "Invalid flyout target for custom command in the overflowarea");
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.areEqual(_Constants.typeButton, menuCommand.type, "Invalid menuCommand type");
            LiveUnit.Assert.isNull(menuCommand.flyout, "Flyout target for button should be null");
            LiveUnit.Assert.areEqual("1", menuCommand.label, "Invalid menuCommand label");
            LiveUnit.Assert.areEqual("c1", menuCommand.extraClass, "Invalid menuCommand extraClass");
            LiveUnit.Assert.isTrue(menuCommand.disabled, "Invalid menuCommand disabled property value");
            LiveUnit.Assert.areEqual(Helper._CommandingSurface.getVisibleCommandsInElement, menuCommand.onclick, "Invalid menuCommand onclick property value");

            menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[1]["winControl"]);
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
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
            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");

            // Deselect the toggle button in the menu
            var menuCommandEl = (<HTMLElement> appBar._commandingSurface._dom.overflowArea.children[0]);
            menuCommandEl.click();

            // Increase the size of the control to fit both commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0, 
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // Ensure that the command in the actionarea now has the toggle de-selected
            var command = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea)[0];
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var menuCommand = appBar._commandingSurface._dom.overflowArea.querySelectorAll(_Constants.commandSelector)[1]["winControl"];
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

            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 4,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");

            // Decrease size to overflow 1 command
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(5 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Increase size to put command back into the actionarea
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 4,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 3 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 4 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(2 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 5 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(5 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 6 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 0,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: false,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
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

            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            var customContent1Width = appBar._commandingSurface._getCommandWidth(data.getAt(1));
            var customContent2Width = appBar._commandingSurface._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContent1Width + customContent2Width,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");

            // Decrease size to overflow 1 command
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: customContent1Width,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContent1Width - 1,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");
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

            var appBar = new AppBar(this._element, {
                data: data,
                opened: true
            });

            // Click on the first menu item
            var menuCommand = (<HTMLElement> appBar._commandingSurface._dom.overflowArea.children[0]);
            menuCommand.click();
            LiveUnit.Assert.areEqual("custom 1", appBar._commandingSurface._contentFlyoutInterior.textContent, "The custom content flyout has invalid content");

            var testSecondCommandClick = () => {
                appBar._commandingSurface._contentFlyout.removeEventListener("afterhide", testSecondCommandClick);

                // Click on the second menu item
                menuCommand = (<HTMLElement> appBar._commandingSurface._dom.overflowArea.children[1]);
                menuCommand.click();
                LiveUnit.Assert.areEqual("custom 2", appBar._commandingSurface._contentFlyoutInterior.textContent, "The custom content flyout has invalid content");

                complete();
            };

            appBar._commandingSurface._contentFlyout.addEventListener("afterhide", testSecondCommandClick);
            appBar._commandingSurface._contentFlyout.hide();
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

            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            var customContentWidth = appBar._commandingSurface._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 5,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: customContentWidth,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow priority 5 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 5,
                numSeparatorsShownInActionArea: 2,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: customContentWidth - 1,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(5, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 6 /* 2 secondary commands + 1 separator + 2 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 4 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 7 /* 2 secondary commands + 1 separator + 3 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 3 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 2,
                numSeparatorsShownInActionArea: 1,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 8 /* 2 secondary commands + 1 separator + 4 primary commands with 1 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", "3", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 2 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 1,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 10 /* 2 secondary commands + 1 separator + 5 primary commands with 2 separators */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["2", _Constants.typeSeparator, "3", "4", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);

            // Decrease size to overflow priority 1 commands
            args = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 0,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            var expectedMenuCommands = 11 /* 2 secondary commands + 1 separator + 6 primary commands with 2 separator */;
            var visibleMenuCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
            LiveUnit.Assert.areEqual(expectedMenuCommands, visibleMenuCommands.length, "Menu commands list has an invalid length");
            Helper._CommandingSurface.verifyOverflowMenuContent(visibleMenuCommands, ["1", "2", _Constants.typeSeparator, "3", "4", "5", _Constants.typeSeparator, "6", _Constants.typeSeparator, "sec 1", "sec 2"]);
        }

        testMinWidth() {
            this._element.style.width = "10px";
            var appBar = new AppBar(this._element);

            LiveUnit.Assert.areEqual(_Constants.controlMinWidth, parseInt(getComputedStyle(this._element).width, 10), "Invalid min width of appBar element");
        }

        testOverflowAreaContainerHeightWhenThereIsNoOverflow() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeContent, label: "1" }),
                new Command(null, { type: _Constants.typeContent, label: "2" }),
            ]);

            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(0, WinJS.Utilities._getPreciseTotalHeight(appBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container when there are no commands that overflow");
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
            var appBar = new AppBar(this._element, {
                data: data,
                opened: true,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            // Make sure primary commands fit exactly
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 6,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "There should only be 2 commands in the overflowarea");
            LiveUnit.Assert.areEqual(2 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(appBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(parseInt(this._element.style.width), WinJS.Utilities._getPreciseTotalWidth(appBar._commandingSurface._dom.overflowArea), "Invalid width for the overflowarea container");
            LiveUnit.Assert.areEqual(appBar.element, appBar._commandingSurface._dom.overflowArea.parentNode, "Invalid parent for the overflowarea container");
            LiveUnit.Assert.areEqual(appBar.element, appBar._commandingSurface._dom.actionArea.parentNode, "Invalid parent for the actionarea container");
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
            var appBar = new AppBar(this._element, {
                data: data,
                opened: true
            });

            LiveUnit.Assert.areEqual(4.5 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(appBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
            LiveUnit.Assert.areEqual(9, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "There should be 9 commands in the overflowarea");
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
            var appBar = new AppBar(this._element, {
                data: data,
                opened: true
            });

            LiveUnit.Assert.areEqual(4.5 * _Constants.overflowCommandHeight, WinJS.Utilities._getPreciseTotalHeight(appBar._commandingSurface._dom.overflowArea), "Invalid height for the overflowarea container");
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
            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            // Limit the width of the control to fit only 3 commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // The actionarea should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);

            // Delete item wth label 3
            appBar.data.splice(2, 1);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual("4", Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea)[2].textContent);

                // The actionarea should now show | 1 | 2 | 4  | ... |
                LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);

                appBar.data.splice(0, 0, new Command(null, { type: _Constants.typeButton, label: "new" }));

                WinJS.Utilities.Scheduler.schedule(() => {
                    var visibleCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea);
                    LiveUnit.Assert.areEqual("new", visibleCommands[0].textContent);
                    LiveUnit.Assert.areEqual("1", visibleCommands[1].textContent);
                    LiveUnit.Assert.areEqual("2", visibleCommands[2].textContent);

                    // The actionarea should now show | new | 1 | 2  | ... |
                    LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);

                    // Force all commands into the overflowarea
                    this._element.style.width = "10px";
                    appBar.forceLayout();

                    // Delete the first command and verify AppBar Dom updates. 
                    // Also verify that we dispose the deleted command's associated MenuCommand projection.
                    var deletedCommand = appBar.data.splice(data.length - 1, 1)[0];

                    // PRECONDITION: Sanity check that the command we got back is our content command.
                    LiveUnit.Assert.areEqual(_Constants.typeContent, deletedCommand.type);

                    var deletedMenuCommand = Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(appBar._commandingSurface, deletedCommand);
                    WinJS.Utilities.Scheduler.schedule(() => {
                        LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);
                        LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length);
                        LiveUnit.Assert.isTrue(deletedMenuCommand._disposed,
                            "Removing a command from the CommandingSurface's overflowarea should dispose the associated menucommand projection");

                        LiveUnit.Assert.isFalse(appBar._commandingSurface._contentFlyout._disposed,
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
            var appBar = new AppBar(this._element, {
                data: data,
                closedDisplayMode: AppBar.ClosedDisplayMode.compact,
            });

            // Limit the width of the control to fit 3 commands.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                closedDisplayMode: appBar.closedDisplayMode,
                numStandardCommandsShownInActionArea: 3,
                numSeparatorsShownInActionArea: 0,
                widthOfContentCommandsShownInActionArea: 0,
                isACommandVisbleInTheOverflowArea: true,
                additionalFreeSpace: 0,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // The actionarea should now show | 1 | 2 | 3 | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);

            var menuCommandProjections = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).map(function (element) {
                return <WinJS.UI.PrivateMenuCommand>element.winControl;
            });

            // Delete all items
            appBar.data = new WinJS.Binding.List([]);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Action area should be empty");
                LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Overflow area should be empty");
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
            var appBar = new AppBar(this._element, { data: data, opened: true });
            Helper.AppBar.useSynchronousAnimations(appBar);

            var startingLength = 3;

            // PRECONDITION: Test assumes there are 3 overflowing primary commands in the overflowarea.
            LiveUnit.Assert.areEqual(startingLength, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                "TEST ERROR: Test expects 3 overflowing commands at the start");

            // Commands in the overflowarea are all MenuCommand projections of the original ICommands in the actionarea.
            // These projections and the rest of the overflowarea are redrawn whenever the data in the binding list changes 
            // or when certain properties of ICommands in the CommandingSurface are mutated.
            var projections = {
                get button() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(appBar._commandingSurface, buttonCmd);
                },
                get toggle() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(appBar._commandingSurface, toggleCmd);
                },
                get flyout() {
                    return Helper._CommandingSurface.getProjectedCommandFromOriginalCommand(appBar._commandingSurface, flyoutCmd);
                }
            }

            var msg = " property of projected menucommand should have updated";

            buttonCmd.label = "new label";
            new WinJS.Promise((c) => {
                appBar._commandingSurface._layoutCompleteCallback = () => {
                    LiveUnit.Assert.areEqual(buttonCmd.label, projections.button.label, "label" + msg);
                    c();
                };
            }).then(
                () => {
                    buttonCmd.disabled = true;
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.disabled, projections.button.disabled, "disabled" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.disabled = false;
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.disabled, projections.button.disabled, "disabled" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.extraClass = "new class";
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.extraClass, projections.button.extraClass, "extraClass" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.onclick = () => { };
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(buttonCmd.onclick, projections.button.onclick, "onclick" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.hidden = true;
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.isNull(projections.button,
                                "Setting hidden = true on an overflowing ICommand should remove its menucommand projection from the overflowarea");
                            LiveUnit.Assert.areEqual(startingLength - 1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                                "Setting hidden = true on an overflowing ICommand should remove its menucommand projection from the overflowarea");
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    buttonCmd.hidden = false;
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.isNotNull(projections.button,
                                "Setting hidden = false on an overflowing ICommand should add a menucommand projection of it to the overflowarea");
                            LiveUnit.Assert.areEqual(startingLength, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length,
                                "Setting hidden = false on an overflowing ICommand should add a menucommand projection of it to the overflowarea");
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    toggleCmd.selected = true;
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
                            LiveUnit.Assert.areEqual(toggleCmd.selected, projections.toggle.selected, "selected" + msg);
                            c();
                        };
                    });
                }
                ).then(
                () => {
                    toggleCmd.selected = false;
                    return new WinJS.Promise((c) => {
                        appBar._commandingSurface._layoutCompleteCallback = () => {
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
                        appBar._commandingSurface._layoutCompleteCallback = () => {
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
            var appBar = new AppBar(this._element, {
                data: data
            });
            Helper._CommandingSurface.verifyActionAreaVisibleCommandsLabels(appBar._commandingSurface, ["opt 1", "opt 2", "opt 3"]);
            Helper._CommandingSurface.verifyOverflowAreaCommandsLabels(appBar._commandingSurface, ["opt 4"]);
        }

        testClosedDisplayModeConstructorOptions() {
            var appBar = new AppBar();
            LiveUnit.Assert.areEqual(_Constants.defaultClosedDisplayMode, appBar.closedDisplayMode, "'closedDisplayMode' property has incorrect default value.");
            appBar.dispose();

            Object.keys(AppBar.ClosedDisplayMode).forEach(function (mode) {
                appBar = new AppBar(null, { closedDisplayMode: mode });
                LiveUnit.Assert.areEqual(mode, appBar.closedDisplayMode, "closedDisplayMode does not match the value passed to the constructor.");
                appBar.dispose();
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
            var appBar = new AppBar(this._element, {
                data: data,
                opened: false,
            });

            var msg = "Changing the closedDisplayMode property should not trigger this event";
            appBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            appBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            appBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            appBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            Object.keys(AppBar.ClosedDisplayMode).forEach(function (mode) {
                appBar.closedDisplayMode = mode;
                LiveUnit.Assert.areEqual(mode, appBar.closedDisplayMode, "closedDisplayMode property should be writeable.");
                Helper.AppBar.verifyRenderedClosed(appBar);
            });
        }

        testPlacementConstructorOptions() {
            var appBar = new AppBar();
            LiveUnit.Assert.areEqual(_Constants.defaultPlacement, appBar.placement, "'placement' property has incorrect default value.");
            appBar.dispose();

            Object.keys(AppBar.Placement).forEach(function (placement) {
                appBar = new AppBar(null, { placement: placement });
                LiveUnit.Assert.areEqual(placement, appBar.placement, "placement does not match the value passed to the constructor.");
                appBar.dispose();
            })
        }

        testPlacementProperty() {
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
            var appBar = new AppBar(this._element, {
                data: data,
                opened: false,
            });

            Object.keys(AppBar.Placement).forEach(function (placement) {
                appBar.placement = placement;
                LiveUnit.Assert.areEqual(placement, appBar.placement, "placement property should be writeable.");
                Helper.AppBar.verifyPlacementProperty(appBar);
            });
        }

        testOpen() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var appBar = new AppBar(this._element, { data: data, opened: false });
            Helper.AppBar.useSynchronousAnimations(appBar);

            appBar.open();
            LiveUnit.Assert.isTrue(appBar.opened)
            Helper.AppBar.verifyRenderedOpened(appBar);
        }

        testOpenIsIdempotent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            // Initialize opened.
            var appBar = new AppBar(this._element, { data: data, opened: true });
            Helper.AppBar.useSynchronousAnimations(appBar);

            var msg = "Opening an already opened AppBar should not fire events";
            appBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            appBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            appBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            appBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            // Verify nothing changes when opening again.
            var originalOpenedRect = appBar.element.getBoundingClientRect();
            appBar.open();
            LiveUnit.Assert.isTrue(appBar.opened)
            Helper.AppBar.verifyRenderedOpened(appBar);
            Helper.Assert.areBoundingClientRectsEqual(originalOpenedRect, appBar.element.getBoundingClientRect(),
                "opening an opened AppBar should not affect its bounding client rect", 0);
        }

        testClose() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var appBar = new AppBar(this._element, { data: data, opened: true });
            Helper.AppBar.useSynchronousAnimations(appBar);

            appBar.close();
            LiveUnit.Assert.isFalse(appBar.opened)
            Helper.AppBar.verifyRenderedClosed(appBar);
        }

        testCloseIsIdempotent() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);

            // Initialize closed.
            var appBar = new AppBar(this._element, { data: data, opened: false });
            Helper.AppBar.useSynchronousAnimations(appBar);

            var msg = "Closing an already closed AppBar should not fire events";
            appBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            appBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            appBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            appBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            // Verify nothing changes when closing again.
            var originalClosedRect = appBar.element.getBoundingClientRect();
            appBar.close();
            LiveUnit.Assert.isFalse(appBar.opened)
            Helper.AppBar.verifyRenderedClosed(appBar);
            Helper.Assert.areBoundingClientRectsEqual(originalClosedRect, appBar.element.getBoundingClientRect(),
                "closing a closed AppBar should not affect its bounding client rect", 0);
        }

        testOpenedPropertyConstructorOptions() {
            var appBar = new AppBar();
            LiveUnit.Assert.areEqual(_Constants.defaultOpened, appBar.opened, "opened property has incorrect default value");
            appBar.dispose();

            [true, false].forEach(function (initiallyOpen) {
                appBar = new AppBar(null, { opened: initiallyOpen });
                LiveUnit.Assert.areEqual(initiallyOpen, appBar.opened, "opened property does not match the value passed to the constructor.");
                appBar.dispose();
            })
        }

        testTogglingOpenedProperty() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var appBar = new AppBar(this._element, { data: data, opened: false });
            Helper.AppBar.useSynchronousAnimations(appBar);
            Helper.AppBar.verifyRenderedClosed(appBar);

            appBar.opened = true;
            LiveUnit.Assert.isTrue(appBar.opened, "opened property should be writeable.");
            Helper.AppBar.verifyRenderedOpened(appBar);

            appBar.opened = false;
            LiveUnit.Assert.isFalse(appBar.opened, "opened property should be writeable.");
            Helper.AppBar.verifyRenderedClosed(appBar);
        }

        testOverFlowButtonClick() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, icon: 'add', label: "button" }),
                new Command(null, { type: _Constants.typeSeparator }),
                new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
            ]);
            var appBar = new AppBar(this._element, { data: data, opened: true });
            Helper.AppBar.useSynchronousAnimations(appBar);

            appBar._commandingSurface._dom.overflowButton.click()
            LiveUnit.Assert.isFalse(appBar.opened)
            Helper.AppBar.verifyRenderedClosed(appBar);

            appBar._commandingSurface._dom.overflowButton.click()
            LiveUnit.Assert.isTrue(appBar.opened)
            Helper.AppBar.verifyRenderedOpened(appBar);
        }

        testDomLevel0_OpenCloseEvents() {
            testEvents(this._element, (appBar: WinJS.UI.PrivateAppBar, eventName: string, handler: Function) => {
                appBar["on" + eventName] = handler;
            });
        }

        testDomLevel2_OpenCloseEvents() {
            testEvents(this._element, (appBar: WinJS.UI.PrivateAppBar, eventName: string, handler: Function) => {
                appBar.addEventListener(eventName, handler);
            });
        }

        testBeforeOpenIsCancelable() {
            var appBar = new AppBar(this._element, { opened: false });
            Helper.AppBar.useSynchronousAnimations(appBar);

            appBar.onbeforeopen = function (eventObject) {
                eventObject.preventDefault();
            };
            appBar.onafteropen = function (eventObject) {
                LiveUnit.Assert.fail("afteropen shouldn't have fired due to beforeopen being canceled");
            };

            appBar.open();
            LiveUnit.Assert.isFalse(appBar.opened, "AppBar should still be closed");

            appBar.opened = true;
            LiveUnit.Assert.isFalse(appBar.opened, "AppBar should still be closed");
        }

        testBeforeCloseIsCancelable() {
            var appBar = new AppBar(this._element, { opened: true });
            Helper.AppBar.useSynchronousAnimations(appBar);

            appBar.onbeforeclose = function (eventObject) {
                eventObject.preventDefault();
            };
            appBar.onafterclose = function (eventObject) {
                LiveUnit.Assert.fail("afterclose shouldn't have fired due to beforeclose being canceled");
            };

            appBar.close();
            LiveUnit.Assert.isTrue(appBar.opened, "AppBar should still be open");

            appBar.opened = false;
            LiveUnit.Assert.isTrue(appBar.opened, "AppBar should still be open");
        }

        testAppBarAddsClassNamesToCommandingSurface() {
            // Make sure the appropriate AppBar CSS classes are on _CommandingSurface subcomponents to allow for proper developer styling story.

            var appBar = new AppBar(this._element, { opened: true });
            var actionArea = appBar._commandingSurface._dom.actionArea;
            var overflowArea = appBar._commandingSurface._dom.overflowArea;
            var overflowButton = appBar._commandingSurface._dom.overflowButton;
            var overflowButtonEllipsis = <HTMLElement>overflowButton.querySelector(".win-commandingsurface-ellipsis");

            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(actionArea, _Constants.ClassNames.actionAreaCssClass), "AppBar missing actionarea class");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(overflowArea, _Constants.ClassNames.overflowAreaCssClass), "AppBar missing overflowarea class");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(overflowButton, _Constants.ClassNames.overflowButtonCssClass), "AppBar missing overflowbutton class");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(overflowButtonEllipsis, _Constants.ClassNames.ellipsisCssClass), "AppBar missing ellipsis class");
        }

        testPositionOffsetsAreCalculateAtConstructionTime() {

            var badOffset = "-1px";

            // Verify that the AppBar sets its element's inline style offsets during construction. This is to support scenarios where an AppBar
            // is constructed while the IHM is already showing.
            this._element.style.top = badOffset;
            this._element.style.bottom = badOffset;
            var appBar = new AppBar(this._element);
            LiveUnit.Assert.areNotEqual(badOffset, this._element.style.top, "AppBar style.top should be set during construction.");
            LiveUnit.Assert.areNotEqual(badOffset, this._element.style.bottom, "AppBar style.bottom should be set during construction.");
        }

        testPositionOffsetsAreUpdatedCorrectly(complete) {
            // AppBar needs to be aware of the IHM when positioning itself to the top or bottom of the visible document.
            // Verify scenarios that should update the AppBar element offsets.
            var badOffset = "-1px";
            var appBar = new AppBar(this._element, { placement: AppBar.Placement.bottom });

            function resetOffsets() {
                appBar.element.style.top = badOffset;
                appBar.element.style.bottom = badOffset;
                appBar._updateDomImpl_renderedState.adjustedOffsets = { top: badOffset, bottom: badOffset };
            }

            // Verify that updating AppBar's placement property will update the inline style offsets. Particularly important in scenarios
            // Where placement is set while the IHM is already shown. AppBar's changing to top will have to clear IHM offsets and AppBars 
            // changing to bottom will have to add them.
            resetOffsets();
            appBar.placement = AppBar.Placement.top;
            LiveUnit.Assert.areNotEqual(badOffset, this._element.style.top, "Setting placement property should update AppBar style.top");
            LiveUnit.Assert.areNotEqual(badOffset, this._element.style.bottom, "Setting placement property should update AppBar style.bottom");
            resetOffsets();
            appBar.placement = AppBar.Placement.bottom;
            LiveUnit.Assert.areNotEqual(badOffset, this._element.style.top, "Setting placement should update AppBar style.top");
            LiveUnit.Assert.areNotEqual(badOffset, this._element.style.bottom, "Setting placement should update AppBar style.bottom");

            // Call the AppBar's IHM "showing" event handler to verify that AppBar offsets are updated in response to the IHM showing.
            LiveUnit.Assert.areEqual(AppBar.Placement.bottom, appBar.placement, "TEST ERROR: scenario requires AppBar with placement 'bottom'");
            var origFunc = AppBar.prototype._shouldAdjustForShowingKeyboard;
            AppBar.prototype._shouldAdjustForShowingKeyboard = () => { return true; };
            resetOffsets();
            appBar._handleShowingKeyboard().then(() => {
                LiveUnit.Assert.areNotEqual(badOffset, this._element.style.top, "AppBar should update style.top after IHM has finished showing");
                LiveUnit.Assert.areNotEqual(badOffset, this._element.style.bottom, "AppBar should update style.bottom after IHM has finished showing");
                AppBar.prototype._shouldAdjustForShowingKeyboard = origFunc;

                // Call the AppBar's IHM "hiding" event handler to verify that the bottom AppBar offsets are updated in response to the IHM hiding.
                LiveUnit.Assert.areEqual(AppBar.Placement.bottom, appBar.placement, "TEST ERROR: scenario requires AppBar with placement 'bottom'");
                resetOffsets();
                appBar._handleHidingKeyboard();
                LiveUnit.Assert.areNotEqual(badOffset, this._element.style.top, "AppBar should update style.top when the IHM starts to hide");
                LiveUnit.Assert.areNotEqual(badOffset, this._element.style.bottom, "AppBar should update style.bottom when the IHM starts to hide");

                complete();
            });
        }

        testGetCommandById() {
            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "A", id: "extraneous" })
            ]);

            this._element.style.width = "10px";
            var appBar = new AppBar(this._element, {
                data: data
            });
            LiveUnit.Assert.isNull(appBar.getCommandById("someID"));

            var firstAddedCommand = new Command(null, { type: _Constants.typeButton, label: "B", id: "someID" });
            data.push(firstAddedCommand);
            LiveUnit.Assert.areEqual(firstAddedCommand, appBar.getCommandById("someID"));

            var secondAddedCommand = new Command(null, { type: _Constants.typeButton, label: "C", id: "someID" });
            data.push(secondAddedCommand);

            LiveUnit.Assert.areEqual(firstAddedCommand, appBar.getCommandById("someID"));
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            function checkCommandVisibility(expectedShown, expectedHidden) {
                return new WinJS.Promise(c => {
                    appBar._commandingSurface._layoutCompleteCallback = function () {
                        for (var i = 0, len = expectedShown.length; i < len; i++) {
                            var shownCommand = appBar.getCommandById(expectedShown[i]);
                            LiveUnit.Assert.isFalse(shownCommand.hidden);
                            if (shownCommand.section === "secondary") {
                                LiveUnit.Assert.areEqual("none", getComputedStyle(shownCommand.element).display);
                                var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);
                                LiveUnit.Assert.areEqual(shownCommand.label, overflowAreaCommands[0].winControl.label);
                            } else {
                                LiveUnit.Assert.areEqual("inline-block", getComputedStyle(shownCommand.element).display);
                            }
                        }
                        for (var i = 0, len = expectedHidden.length; i < len; i++) {
                            var hiddenCommand = appBar.getCommandById(expectedHidden[i]);
                            LiveUnit.Assert.isTrue(hiddenCommand.hidden);
                            LiveUnit.Assert.areEqual("none", getComputedStyle(hiddenCommand.element).display);
                        }
                        c();
                    };
                });
            }

            appBar.showOnlyCommands([]);
            checkCommandVisibility([], ["A", "B", "C", "D", "E"]).then(
                () => {
                    appBar.showOnlyCommands(["A", "B", "C", "D", "E"]);
                    return checkCommandVisibility(["A", "B", "C", "D", "E"], []);
                }).then(() => {
                    appBar.showOnlyCommands(["A"]);
                    return checkCommandVisibility(["A"], ["B", "C", "D", "E"]);
                }).then(() => {
                    appBar.showOnlyCommands([data.getAt(1)]);
                    return checkCommandVisibility(["B"], ["A", "C", "D", "E"]);
                }).then(() => {
                    appBar.showOnlyCommands(["C", data.getAt(4)]);
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
            var appBar = new AppBar(this._element, {
                data: new WinJS.Binding.List([p0, p1, p2, s0, s1])
            });

            var actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea);
            var overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);

            // The actionarea should only show | p0 | p1 | ... |
            LiveUnit.Assert.areEqual(2, actionAreaCommands.length, "actionarea should display 2 command");
            LiveUnit.Assert.areEqual(p0.label, actionAreaCommands[0].winControl.label);
            LiveUnit.Assert.areEqual(p1.label, actionAreaCommands[1].winControl.label);

            // The overflowarea should only show | s0 |
            LiveUnit.Assert.areEqual(1, overflowAreaCommands.length, "overflowarea should display 1 command");
            LiveUnit.Assert.areEqual(s0.label, overflowAreaCommands[0].winControl.label);

            new WinJS.Promise((c) => {
                appBar._commandingSurface._layoutCompleteCallback = () => {

                    actionAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea);
                    overflowAreaCommands = Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea);

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
                appBar.forceLayout();

            }).done(complete);
        }

        private _testLightDismissWithTrigger(dismissAppBar) {
            var button = document.createElement("button");
            button.textContent = "Initially Focused";
            var element = document.createElement("div");

            this._element.appendChild(button);
            this._element.appendChild(element);

            var appBar = new AppBar(element, {
                data: new WinJS.Binding.List([
                    new Command(null, { type: _Constants.typeButton, icon: 'add', label: "add" }),
                    new Command(null, { type: _Constants.typeButton, icon: 'remove', label: "remove" }),
                    new Command(null, { type: _Constants.typeButton, icon: 'accept', label: "accept" }),
                    new Command(null, { type: _Constants.typeSeparator }),
                    new Command(null, { type: _Constants.typeButton, section: 'secondary', label: "secondary" })
                ])
            });
            Helper.AppBar.useSynchronousAnimations(appBar);

            return Helper.focus(button).then(() => {
                LiveUnit.Assert.areEqual(button, document.activeElement, "Button should have focus initially");

                return Helper.waitForFocusWithin(appBar.element, () => { appBar.open(); });
            }).then(() => {
                    LiveUnit.Assert.areEqual(appBar.data.getAt(0).element, document.activeElement,
                        "AppBar's leftmost primary command should have focus after opening");
                    LiveUnit.Assert.isTrue(_LightDismissService.isTopmost(appBar._dismissable),
                        "AppBar should be the topmost light dismissable");

                    return Helper.waitForFocus(button, () => { dismissAppBar(appBar); });
                }).then(() => {
                    LiveUnit.Assert.areEqual(button, document.activeElement,
                        "Focus should have been restored to the button");
                    LiveUnit.Assert.isFalse(_LightDismissService.isShown(appBar._dismissable),
                        "AppBar should not be in the light dismissable stack");
                });
        }

        testLightDismissWithClose(complete) {
            this._testLightDismissWithTrigger((appBar) => { appBar.close(); }).then(complete);
        }
        testLightDismissWithDispose(complete) {
            this._testLightDismissWithTrigger((appBar) => { appBar.dispose(); }).then(complete);
        }
        testLightDismissWithTap(complete) {
            this._testLightDismissWithTrigger((appBar) => { _LightDismissService._clickEaterTapped(); }).then(complete);
        }
    }
    
     var disabledTestRegistry = {
        testLightDismissWithClose:[
			Helper.Browsers.ie11,
            Helper.Browsers.firefox
        ],
        testShowOnlyCommands:[
            Helper.Browsers.chrome,
            Helper.Browsers.safari,
            Helper.Browsers.firefox,
            Helper.Browsers.android
        ],
        testLightDismissWithDispose:[
            Helper.Browsers.ie11,
            Helper.Browsers.firefox
        ],
        testLightDismissWithTap:[
            Helper.Browsers.ie11,
            Helper.Browsers.firefox
        ]
    };
    Helper.disableTests(AppBarTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("CorsicaTests.AppBarTests");
