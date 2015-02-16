// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper._CommandingSurface {
    "use strict";

    export var Constants = {
        typeSeparator: "separator",
        typeContent: "content",
        typeButton: "button",
        typeToggle: "toggle",
        typeFlyout: "flyout",
        controlCssClass: "win-commandingSurface",
        disposableCssClass: "win-disposable",
        overflowAreaCssClass: "win-commandingSurface-overflowarea",
        emptyCommandingSurfaceCssClass: "win-commandingSurface-empty",
        commandType: "WinJS.UI.AppBarCommand",
        secondaryCommandSection: "secondary",
        commandSelector: ".win-command",
        overflowCommandHeight: 44,
        overflowSeparatorHeight: 12,
        commandingSurfaceMinWidth: 68,
    }

    export function getVisibleCommandsInElement(element: HTMLElement) {
        var result = [];
        var commands = element.querySelectorAll(Constants.commandSelector);
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
            if (visibleElements[i]["winControl"].type === Constants.typeSeparator) {
                LiveUnit.Assert.areEqual(expectedLabels[labelIndex], Constants.typeSeparator);
            } else {
                LiveUnit.Assert.areEqual(expectedLabels[labelIndex], visibleElements[i]["winControl"].label);
            }
            labelIndex++;
        }
    }

    export function verifyMainActionVisibleCommandsLabels(commandingSurface: WinJS.UI._CommandingSurface, labels: string[]) {
        var commands = getVisibleCommandsInElement((<WinJS.UI.PrivateCommandingSurface>commandingSurface.element.winControl)._mainActionArea);
        LiveUnit.Assert.areEqual(labels.length, commands.length);
        labels.forEach((label, index) => {
            LiveUnit.Assert.areEqual(label, commands[index].winControl.label);
        });
    }

    export function verifyOverflowAreaCommandsLabels(commandingSurface: WinJS.UI._CommandingSurface, labels: string[]) {
        var control = <WinJS.UI.PrivateCommandingSurface>commandingSurface.element.winControl;
        var commands = getVisibleCommandsInElement(control._overflowArea);
        LiveUnit.Assert.areEqual(labels.length, commands.length);
        labels.forEach((label, index) => {
            LiveUnit.Assert.areEqual(label, commands[index].winControl.label);
        });
    }
}