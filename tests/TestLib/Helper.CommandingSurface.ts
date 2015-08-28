// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper._CommandingSurface {
    "use strict";
    var _Constants = Helper.require("WinJS/Controls/CommandingSurface/_Constants");
    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;

    export interface ISizeForCommandsArgs {
        closedDisplayMode: string;
        numStandardCommandsShownInActionArea: number;
        numSeparatorsShownInActionArea: number;
        widthOfContentCommandsShownInActionArea: number;
        isACommandVisbleInTheOverflowArea: boolean;
        /*
        * Any additonal free space that we would like available in the action area.
        */
        additionalFreeSpace: number; 
        
    };
    export function sizeForCommands(controlElement: HTMLElement, args: ISizeForCommandsArgs) {
        // Sizes the width of the control to have enough available space in the 
        // action area to be able to fit the values specified in args. 
        // Automatically detects whether or not an overflow button will be needed 
        // and adds additional space inside the controlElement to cover it.

        var closedDisplayMode = args.closedDisplayMode;
        var widthForStandardCommands = (args.numStandardCommandsShownInActionArea || 0) * _Constants.actionAreaCommandWidth;
        var widthForSeparators = (args.numSeparatorsShownInActionArea || 0) * _Constants.actionAreaSeparatorWidth;
        var widthForContentCommands = (args.widthOfContentCommandsShownInActionArea || 0);
        var additionalFreeSpace = args.additionalFreeSpace || 0;
        var isACommandVisbleInTheOverflowArea = args.isACommandVisbleInTheOverflowArea || false;

        var widthForPrimaryCommands = widthForStandardCommands + widthForSeparators + widthForContentCommands;

        // Determine if the control will want to display an overflowButton. 
        var needsOverflowButton = (isACommandVisbleInTheOverflowArea ||
            Helper._CommandingSurface.isActionAreaExpandable(closedDisplayMode) && widthForPrimaryCommands > 0);
        var widthForOverflowButton = needsOverflowButton ? _Constants.actionAreaOverflowButtonWidth : 0;

        var totalWidth = widthForPrimaryCommands + widthForOverflowButton + additionalFreeSpace;
        controlElement.style.width = totalWidth + "px";
    }

    export function isActionAreaExpandable(closedDisplayMode: string): boolean {
        var result;
        var mode = closedDisplayMode;
        switch (mode) {
            case _CommandingSurface.ClosedDisplayMode.none:
            case _CommandingSurface.ClosedDisplayMode.minimal:
            case _CommandingSurface.ClosedDisplayMode.compact:
                // These ClosedDisplayModes have an expandable actionarea when shown.
                result = true;
                break;
            case _CommandingSurface.ClosedDisplayMode.full:
                // These ClosedDisplayModes do not have an expandable actionarea when shown.
                result = false;
                break;
            default:
                LiveUnit.Assert.fail("TEST ERROR: Unknown ClosedDisplayMode enum value: " + mode);
                break;
        }
        return result;
    }

    export function useSynchronousAnimations(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        commandingSurface.createOpenAnimation = function () {
            return {
                execute(): WinJS.Promise<any> {
                    return WinJS.Promise.wrap();
                }
            };
        };
        commandingSurface.createCloseAnimation = function () {
            return {
                execute(): WinJS.Promise<any> {
                    return WinJS.Promise.wrap();
                }
            };
        };
    }

    export function useSynchronousDataRendering(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        // Remove delay for batching edits, and render changes synchronously.
        commandingSurface._batchDataUpdates = (updateFn) => {
            updateFn();
        }
    }

    export function getVisibleCommandsInElement(element: HTMLElement) {
        var result: HTMLElement[] = [];
        var commands = element.querySelectorAll(_Constants.commandSelector);
        for (var i = 0, len = commands.length; i < len; i++) {
            if (getComputedStyle(<Element>commands[i]).display !== "none") {
                result.push(<HTMLElement>commands[i]);
            }
        }
        return result;
    }

    export function getProjectedCommandFromOriginalCommand(commandingSurface, originalCommand: WinJS.UI.ICommand): WinJS.UI.PrivateMenuCommand {
        // Given an ICommand in the CommandingSurface, find and return its MenuCommand projection from the overflowarea, if such a projection exists.
        var projectedCommands = getVisibleCommandsInElement(commandingSurface._dom.overflowArea).map(function (element) {
            return element.winControl;
        });
        var matches = projectedCommands.filter(function (projection) {
            return originalCommand === projection["_originalICommand"];
        });

        if (matches.length > 1) {
            LiveUnit.Assert.fail("TEST ERROR: CommandingSurface should not project more than 1 MenuCommand into the overflowarea for each ICommand in the actionarea.");
        }
        return matches[0];
    };

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
    
    function verifyActionArea_FullyExpanded(commandingSurface: WinJS.UI.PrivateCommandingSurface){
        // We expect the action area to be fully expanded whenever the _CommandingSurface is closed with closedDisplayMode: full,
        // or whenever the _CommandingSurface is opened, regardless of closedDidsplayMode.  
        var commandElements = Helper._CommandingSurface.getVisibleCommandsInElement(commandingSurface._dom.actionArea);
        var commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface.element);
        var actionAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.actionArea);
        var actionAreaContentBoxHeight = WinJS.Utilities._getPreciseContentHeight(commandingSurface._dom.actionArea);
        var isOverflowButtonVisible = (commandingSurface._dom.overflowButton.style.display === "none") ? false : true;
        var overflowButtonTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowButton);

        var heightOfTallestChildElement: number = Array.prototype.reduce.call(commandingSurface._dom.actionArea.children, function (tallest, element) {
            return Math.max(tallest, WinJS.Utilities._getPreciseTotalHeight(element));
        }, 0);

        LiveUnit.Assert.areEqual(actionAreaTotalHeight, commandingSurfaceTotalHeight, "Height of CommandingSurface should size to its actionarea.");
        LiveUnit.Assert.areEqual(heightOfTallestChildElement, actionAreaContentBoxHeight, "Actionarea height should be fully expanded and size to the heights of its content");

        if (isOverflowButtonVisible) {
            LiveUnit.Assert.areEqual(actionAreaTotalHeight, overflowButtonTotalHeight, "overflowButton should stretch to the height of the actionarea");
        }

        // Verify commands are displayed.
        if (Array.prototype.some.call(commandElements, function (commandEl) {
            return getComputedStyle(commandEl).display === "none";
        })) {
            LiveUnit.Assert.fail("Opened actionarea should always display primary commands.");
        }

        // Verify command labels are displayed.
        if (Array.prototype.some.call(commandElements, function (commandEl) {
            var label = commandEl.querySelector(".win-label");
            return (label && getComputedStyle(label).display == "none");
        })) {
            LiveUnit.Assert.fail("Opened actionarea should display primary command labels");
        }     
    }

    export function verifyRenderedOpened(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        // Verifies actionarea and overflowarea are opened. 
        // Currently only works if there is at least one command in the actionarea and overflow area.

        verifyOpened_actionArea(commandingSurface);
        verifyOpened_overflowArea(commandingSurface);
    };

    function verifyOpened_actionArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        
        verifyActionArea_FullyExpanded(commandingSurface);
        
        // Verify overflow button aria-expanded
        var overflowButton_AriaExpanded = commandingSurface._dom.overflowButton.getAttribute("aria-expanded");
        LiveUnit.Assert.areEqual("true", overflowButton_AriaExpanded);
    };

    function verifyOpened_overflowArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        LiveUnit.Assert.areNotEqual("none", getComputedStyle(commandingSurface._dom.overflowArea).display);

        var overflowAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea);
        var overflowCommands = getVisibleCommandsInElement(commandingSurface._dom.overflowArea);

        if (overflowCommands.length) {
            LiveUnit.Assert.isTrue(0 < overflowAreaTotalHeight);
        } else {
            LiveUnit.Assert.isTrue(0 === overflowAreaTotalHeight, "Opened overflowArea should not be visible if there are no overflow commands");
        }
    };

    export function verifyRenderedClosed(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        // Verifies actionarea and overflowarea are closed.
        // Currently only works if their is at least one command in the actionarea and overflow area.

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
                // closedDisplayMode: full should render the action area fully expanded.
                verifyActionArea_FullyExpanded(commandingSurface);
                break;

            default:
                LiveUnit.Assert.fail("TEST ERROR: Encountered unknown ClosedDisplayMode enum value: " + closedDisplayMode);
                break;
        }
        
        // Verify overflow button aria-expanded
        var overflowButton_AriaExpanded = commandingSurface._dom.overflowButton.getAttribute("aria-expanded");
        LiveUnit.Assert.areEqual("false", overflowButton_AriaExpanded)
    }

    function verifyClosed_oveflowArea(commandingSurface: WinJS.UI.PrivateCommandingSurface) {
        var overflowAreaTotalHeight = WinJS.Utilities._getPreciseTotalHeight(commandingSurface._dom.overflowArea);
        LiveUnit.Assert.areEqual(0, overflowAreaTotalHeight);
    };
};