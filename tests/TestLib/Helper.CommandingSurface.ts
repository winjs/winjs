// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper._CommandingSurface {
    "use strict";
    var _Constants = Helper.require("WinJS/Controls/CommandingSurface/_Constants");
    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;

    export interface ISizeForCommandsArgs { numStandardCommands?: number; numSeparators?: number; additionalWidth?: number; visibleOverflowButton?: boolean; };
    export function sizeForCommands(element: HTMLElement, args: ISizeForCommandsArgs) {
        var width =
            (args.numStandardCommands || 0) * _Constants.actionAreaCommandWidth +
            (args.numSeparators || 0) * _Constants.actionAreaSeparatorWidth +
            (args.additionalWidth || 0) +
            (args.visibleOverflowButton ? _Constants.actionAreaOverflowButtonWidth : 0);

        element.style.width = width + "px";
    }

    export function useSynchronousAnimations(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        commandingSurface._playShowAnimation = function () {
            return WinJS.Promise.wrap();
        };
        commandingSurface._playHideAnimation = function () {
            return WinJS.Promise.wrap();
        };
    }

    export function getVisibleCommandsInElement(element: HTMLElement) {
        var result = [];
        var commands = element.querySelectorAll(_Constants.commandSelector);
        for (var i = 0, len = commands.length; i < len; i++) {
            if (getComputedStyle(<Element>commands[i]).display !== "none") {
                result.push(commands[i]);
            }
        }
        return result;
    }

    export function verifyOverflowMenuContent(visibleElements: HTMLElement[], expectedLabels: string[]): void {
        var labelIndex = 0;
        for (var i = 0, len = visibleElements.length; i < len; i++) {
            if (visibleElements[i]["winControl"].type === _Constants.typeSeparator) {
                LiveUnit.Assert.areEqual(expectedLabels[labelIndex], _Constants.typeSeparator);
            } else {
                LiveUnit.Assert.areEqual(expectedLabels[labelIndex], visibleElements[i]["winControl"].label);
            }
            labelIndex++;
        }
    }

    export function verifyActionAreaVisibleCommandsLabels(commandingSurface: WinJS.UI.PrivateCommandingSurface, labels: string[]) {
        var commands = getVisibleCommandsInElement((<WinJS.UI.PrivateCommandingSurface>commandingSurface.element.winControl)._dom.actionArea);
        LiveUnit.Assert.areEqual(labels.length, commands.length);
        labels.forEach((label, index) => {
            LiveUnit.Assert.areEqual(label, commands[index].winControl.label);
        });
    }

    export function verifyOverflowAreaCommandsLabels(commandingSurface: WinJS.UI.PrivateCommandingSurface, labels: string[]) {
        var control = <WinJS.UI.PrivateCommandingSurface>commandingSurface.element.winControl;
        var commands = getVisibleCommandsInElement(control._dom.overflowArea);
        LiveUnit.Assert.areEqual(labels.length, commands.length);
        labels.forEach((label, index) => {
            LiveUnit.Assert.areEqual(label, commands[index].winControl.label);
        });
    }


    //
    // Verify correct rendered states for opened and closed _CommandingSurface
    //

    export function verifyRenderedOpened(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        // Verifies actionarea and overflowarea are opened. 
        // Currently only works if there is at least one command in the actionarea and overflow area.
        // TODO: Make this work even if actionarea and overflowarea don't have commands.

        verifyOpened_actionArea(commandingSurface);
        verifyOpened_overflowArea(commandingSurface);
    };

    function verifyOpened_actionArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {

        var commandElements = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea),
            commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface.element),
            actionAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.actionArea),
            actionAreaContentBoxHeight = WinJS.Utilities._getPreciseContentHeight(commandingSurface._dom.actionArea),
            overflowButtonTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowButton);

        var heightOfTallestChildElement: number = Array.prototype.reduce.call(commandingSurface._dom.actionArea.children, function (tallest, element) {
            return Math.max(tallest, WinJS.Utilities._getPreciseTotalHeight(element));
        }, 0);

        LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
        LiveUnit.Assert.areEqual(heightOfTallestChildElement, actionAreaContentBoxHeight, "Actionarea height should be fully expanded and size to the heights of its content");
        LiveUnit.Assert.areEqual(actionAreaTotalHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");

        // Verify commands are displayed.
        if (Array.prototype.some.call(commandElements, function (commandEl) {
            return getComputedStyle(commandEl).display === "none";
        })) {
            LiveUnit.Assert.fail("Fully expanded actionarea should display primary commands.");
        }

        // Verify command labels are displayed.
        if (Array.prototype.some.call(commandElements, function (commandEl) {
            var label = commandEl.querySelector(".win-label");
            return (label && getComputedStyle(label).display == "none");
        })) {
            LiveUnit.Assert.fail("Fully expanded actionarea should display primary command labels");
        }
    };

    function verifyOpened_overflowArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowArea).display);

        var overflowAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea);
        LiveUnit.Assert.isTrue(0 < overflowAreaTotalHeight);
    };

    export function verifyRenderedClosed(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        // Verifies actionarea and overflowarea are closed.
        // Currently only works if their is at least one command in the actionarea and overflow area.
        // TODO: Make this work even if actionarea and overflowarea don't have commands.

        verifyClosed_actionArea(commandingSurface);
        verifyClosed_oveflowArea(commandingSurface);
    };

    function verifyClosed_actionArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        var closedDisplayMode = commandingSurface.closedDisplayMode;

        var commandElements = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea),
            commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface.element),
            actionAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.actionArea),
            actionAreaContentBoxHeight = WinJS.Utilities._getPreciseContentHeight(commandingSurface._dom.actionArea),
            overflowButtonTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowButton);

        switch (closedDisplayMode) {
            case _CommandingSurface.ClosedDisplayMode.none:
                LiveUnit.Assert.areEqual("none", getComputedStyle(commandingSurface.element).display);
                LiveUnit.Assert.areEqual(0, actionAreaTotalHeight);
                LiveUnit.Assert.areEqual(0, overflowButtonTotalHeight);
                break;

            case _CommandingSurface.ClosedDisplayMode.minimal:
                LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
                LiveUnit.Assert.areEqual(_Constants.heightOfMinimal, actionAreaContentBoxHeight, "invalid ActionArea content height for 'minimal' closedDisplayMode");
                LiveUnit.Assert.areEqual(actionAreaContentBoxHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");

                // Verify commands are not displayed.
                if (Array.prototype.some.call(commandElements, function (commandEl) {
                    return getComputedStyle(commandEl).display !== "none";
                })) {
                    LiveUnit.Assert.fail("CommandingSurface with 'minimal' closedDisplayMode should not display primary commands.");
                }
                break;

            case _CommandingSurface.ClosedDisplayMode.compact:
                LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
                LiveUnit.Assert.areEqual(_Constants.heightOfCompact, actionAreaContentBoxHeight, "invalid ActionArea content height for 'compact' closedDisplayMode");
                LiveUnit.Assert.areEqual(actionAreaContentBoxHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");

                // Verify commands are displayed.
                if (Array.prototype.some.call(commandElements, function (commandEl) {
                    return getComputedStyle(commandEl).display === "none";
                })) {
                    LiveUnit.Assert.fail("CommandingSurface with 'compact' closedDisplayMode should display primary commands.");
                }

                // Verify command labels are not displayed.
                if (Array.prototype.some.call(commandElements, function (commandEl) {
                    var label = commandEl.querySelector(".win-label");
                    return (label && getComputedStyle(label).display !== "none");
                })) {
                    LiveUnit.Assert.fail("CommandingSurface with 'compact' closedDisplayMode should not display primary command labels.");
                }
                break;

            case _CommandingSurface.ClosedDisplayMode.full:
                // closedDisplayMode "full" actionarea, and opened actionarea, render exactly the same.
                verifyOpened_actionArea(commandingSurface);
                break;

            default:
                LiveUnit.Assert.fail("TEST ERROR: Encountered unknown ClosedDisplayMode enum value: " + closedDisplayMode);
                break;
        }
    }

    function verifyClosed_oveflowArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        var overflowAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea);
        LiveUnit.Assert.areEqual(0, overflowAreaTotalHeight);
    };
};