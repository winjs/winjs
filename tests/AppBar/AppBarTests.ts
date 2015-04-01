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
    var Util = WinJS.Utilities;
    var _Constants;

    WinJS.Utilities._require(["WinJS/Controls/AppBar/_Constants"], function (constants) {
        _Constants = constants;
    })

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. onbeforeopen) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(testElement, registerForEvent: (appBar: WinJS.UI.PrivateAppBar, eventName: string, handler: Function) => void) {
        var appBar = new AppBar(testElement);
        Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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
                LiveUnit.Assert.areEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when the primary commands fit");
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

            var appBar = new AppBar(this._element, {data: data});

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
            var appBar = new AppBar(this._element);
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);
            appBar.open();

            var msg = "Shouldn't have fired due to control being disposed";
            appBar.onbeforeopen = failEventHandler(_Constants.EventNames.beforeOpen, msg);
            appBar.onbeforeclose = failEventHandler(_Constants.EventNames.beforeClose, msg);
            appBar.onafteropen = failEventHandler(_Constants.EventNames.afterOpen, msg);
            appBar.onafterclose = failEventHandler(_Constants.EventNames.afterClose, msg);

            appBar.dispose();
            LiveUnit.Assert.isTrue(appBar._disposed, "AppBar didn't mark itself as disposed");
            LiveUnit.Assert.isTrue(appBar._commandingSurface._disposed, "AppBar's commandingSurface was not disposed");

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
            LiveUnit.Assert.areEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when the primary commands fit");
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when there are secondary commands");
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when the primary commands overflow");
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
                data: data
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
                numStandardCommands: 1,
                additionalWidth: customContentTotalWidth - 1,
                visibleOverflowButton: true,
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
            // Verify that the resize handler knows how to correctly update commands layout if the AppBar width has changed.
            // Typically the resizeHandler is only called by the window resize event.

            // Make sure everything fits.
            this._element.style.width = "1000px";

            var data = new WinJS.Binding.List([
                new Command(null, { type: _Constants.typeButton, label: "opt 1" }),
                new Command(null, { type: _Constants.typeButton, label: "opt 2" }),
                new Command(null, { type: _Constants.typeButton, label: "sec opt 1", section: _Constants.secondaryCommandSection })
            ]);
            var appBar = new AppBar(this._element, {
                data: data
            });

            LiveUnit.Assert.areEqual(2, appBar._commandingSurface._primaryCommands.length, "Primary commands array has an invalid length");
            LiveUnit.Assert.areEqual(1, appBar._commandingSurface._secondaryCommands.length, "Secondary commands array has an invalid length");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "actionarea should have 2 commands");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 1 command");

            // Decrease the width of our control to fit exactly 1 command + the overflow button in the actionarea.
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);

            // Ensure that the resizeHandler will overflow one primary command into the overflowarea.
            WinJS.Utilities._resizeNotifier._handleResize();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "actionarea should have 1 command");
            LiveUnit.Assert.areEqual(3 /* 1 primary command + 1 separator + 1 secondary command */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "overflowarea should have 3 commands");
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
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
                data: data
            });
            var menuCommand = <WinJS.UI.MenuCommand>(Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea)[0]["winControl"]);
            LiveUnit.Assert.isTrue(menuCommand.selected, "Invalid menuCommand selected property value");

            // Deselect the toggle button in the menu
            var menuCommandEl = (<HTMLElement> appBar._commandingSurface._dom.overflowArea.children[0]);
            menuCommandEl.click();

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 2,
                visibleOverflowButton: false,
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
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
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visible when a command overflow");
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
                data: data
            });

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 4,
                numSeparators: 2,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Decrease size to overflow 1 command
            args = {
                numStandardCommands: 3,
                numSeparators: 2,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(5 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Increase size to put command back into the actionarea
            args = {
                numStandardCommands: 4,
                numSeparators: 2,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(6, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                numStandardCommands: 3,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(2 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 3 commands
            args = {
                numStandardCommands: 2,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 4 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(2 - 1 /* trailing separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(4, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 5 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(5 - 1 /* leading separator is hidden */, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 6 commands
            args = {
                numStandardCommands: 0,
                numSeparators: 0,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
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
                data: data
            });

            var customContent1Width = appBar._commandingSurface._getCommandWidth(data.getAt(1));
            var customContent2Width = appBar._commandingSurface._getCommandWidth(data.getAt(2));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width + customContent2Width,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be hidden when there is no overflow");

            // Decrease size to overflow 1 command
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow 2 commands
            args = {
                numStandardCommands: 1,
                numSeparators: 0,
                additionalWidth: customContent1Width - 1,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(1, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should not be hidden when there is overflow");
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
                data: data
            });

            var customContentWidth = appBar._commandingSurface._getCommandWidth(data.getAt(1));

            // Make sure everything fits, nothing should overflow
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 5,
                numSeparators: 2,
                additionalWidth: customContentWidth,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();
            LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length, "Invalid number of commands in the actionarea");
            LiveUnit.Assert.areNotEqual("none", getComputedStyle(appBar._commandingSurface._dom.overflowButton).display, "Overflow button should be visble because there are secondary commands");
            LiveUnit.Assert.areEqual(2, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length, "Menu commands list has an invalid length");

            // Decrease size to overflow priority 5 commands
            args = {
                numStandardCommands: 5,
                numSeparators: 2,
                additionalWidth: customContentWidth - 1,
                visibleOverflowButton: true,
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
                numStandardCommands: 3,
                numSeparators: 1,
                visibleOverflowButton: true,
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
                numStandardCommands: 2,
                numSeparators: 1,
                visibleOverflowButton: true,
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
                numStandardCommands: 1,
                numSeparators: 0,
                visibleOverflowButton: true,
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
                numStandardCommands: 0,
                numSeparators: 0,
                visibleOverflowButton: true,
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
                opened: true
            });

            // Make sure primary commands fit exactly
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 6,
                visibleOverflowButton: true,
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

        xtestKeyboarding_Opened(complete) { // TODO reimplement when new keyboarding model is decided
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
            var appBar = new AppBar(this._element, {
                data: data,
                opened: true
            })

            appBar.element.focus();
            setTimeout(function () {
                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.end);
                LiveUnit.Assert.areEqual("s4", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("2", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.downArrow);
                LiveUnit.Assert.areEqual("4", document.activeElement.textContent, "Down arrow should skip '3' because that command is hidden");

                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(appBar._commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("s1", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.downArrow);
                LiveUnit.Assert.areEqual("s2", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("s1", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.upArrow);
                LiveUnit.Assert.areEqual(appBar._commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(appBar.element, Key.upArrow);
                LiveUnit.Assert.areEqual("4", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.upArrow);
                LiveUnit.Assert.areEqual("2", document.activeElement.textContent, "Up arrow should skip '3' because that command is hidden");
                complete();
            });
        }

        xtestKeyboarding_Closed(complete) { // TODO reimplement when new keyboarding model is decided
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // The actionarea should only show | 1 | 2 (disabled) | 3  | ... |
            appBar.element.focus();
            setTimeout(function () {
                Helper.keydown(appBar.element, Key.downArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.end);
                LiveUnit.Assert.areEqual(appBar._commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(appBar.element, Key.home);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.textContent, "Right arrow, should skip '2' because that command is disabled");

                Helper.keydown(appBar.element, Key.downArrow);
                LiveUnit.Assert.areEqual(appBar._commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(appBar._commandingSurface._dom.overflowButton, document.activeElement);

                Helper.keydown(appBar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual("3", document.activeElement.textContent);

                Helper.keydown(appBar.element, Key.upArrow);
                LiveUnit.Assert.areEqual("1", document.activeElement.textContent, "Up arrow, should skip '2' because that command is disabled");
                complete();
            });
        }

        xtestKeyboardingWithCustomContent(complete) { // TODO reimplement when new keyboarding model is decided
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            var customContentWidth = appBar._commandingSurface._getCommandWidth(data.getAt(1));
            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 2,
                additionalWidth: customContentWidth,
                visibleOverflowButton: false,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // The actionarea should show | 1 | 2 (custom) | 3 |

            appBar.element.focus();
            setTimeout(function () {
                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);

                Helper.keydown(appBar.element, Key.end);
                LiveUnit.Assert.areEqual(lastEl, document.activeElement);

                Helper.keydown(appBar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(secondCheckBox, document.activeElement);

                Helper.keydown(appBar.element, Key.leftArrow);
                LiveUnit.Assert.areEqual(firstEL, document.activeElement);

                Helper.keydown(appBar.element, Key.rightArrow);
                LiveUnit.Assert.areEqual(firstCheckBox, document.activeElement);

                Helper.keydown(appBar.element, Key.home);
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
            var appBar = new AppBar(this._element, {
                data: data
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // The actionarea should now show | 1 | 2 | 3  | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);

            // Delete item wth label 3
            appBar.data.splice(2, 1)

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

                    this._element.style.width = "10px";
                    appBar.forceLayout();

                    // Delete the first element
                    appBar.data.splice(0, 1);

                    WinJS.Utilities.Scheduler.schedule(() => {
                        LiveUnit.Assert.areEqual(0, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);
                        LiveUnit.Assert.areEqual(8, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.overflowArea).length);

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
            });

            var args: Helper._CommandingSurface.ISizeForCommandsArgs = {
                numStandardCommands: 3,
                visibleOverflowButton: true,
            };
            Helper._CommandingSurface.sizeForCommands(this._element, args);
            appBar.forceLayout();

            // The actionarea should now show | 1 | 2 | 3 | ... |
            LiveUnit.Assert.areEqual(3, Helper._CommandingSurface.getVisibleCommandsInElement(appBar._commandingSurface._dom.actionArea).length);

            // Delete all items
            appBar.data = new WinJS.Binding.List([]);

            WinJS.Utilities.Scheduler.schedule(() => {
                LiveUnit.Assert.areEqual(2, appBar._commandingSurface._dom.actionArea.children.length, "Only the overflow button and spacer elements should be children.");
                LiveUnit.Assert.areEqual(0, appBar._commandingSurface._dom.overflowArea.children.length);
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
                appBar = new AppBar(null, { placement: placement});
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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);
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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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
            Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);

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

        testBackgroundColorPercolatesToCommandingSurface() {
            // Verifies that background color changes to the AppBar are not impeded by the CommandingSurface element.
            var appBar = new AppBar(this._element, { opened: true });
            var commandingSurface = appBar._commandingSurface;

            appBar.element.style.backgroundColor = "rgb(255, 100, 05)";
            var appBarStyle = getComputedStyle(appBar.element),
                commandingSurfaceStyle = getComputedStyle(commandingSurface.element);

            var msg = "AppBar's commandingSurface element should match the background color of the AppBar element";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(appBarStyle.backgroundColor, commandingSurfaceStyle.backgroundColor, msg);
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests.AppBarTests");
