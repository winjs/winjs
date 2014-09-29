// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper.Toolbar {
    "use strict";
    
    export var Constants = {
        overflowModeAttached: "attached",
        overflowModeDetached: "detached",
        typeSeparator: "separator",
        typeContent: "content",
        typeButton: "button",
        typeToggle: "toggle",
        typeFlyout: "flyout",
        controlCssClass: "win-toolbar",
        disposableCssClass: "win-disposable",
        overflowAreaCssClass: "win-toolbar-overflowarea",
        attachedModeCssClass: "win-toolbar-attached",
        detachedModeCssClass: "win-toolbar-detached",
        emptyToolbarCssClass: "win-toolbar-empty",
        commandType: "WinJS.UI.AppBarCommand",
        secondaryCommandSection: "selection",
        commandSelector: ".win-command",
        overflowAttachedCommandHeight: 44,
        overflowAttachedSeparatorHeight: 12,
        detachedModeMinWidth: 100
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

    export function verifyMainActionVisibleCommandsLabels(toolbar: WinJS.UI.Toolbar, labels: string[]) {
        var commands = getVisibleCommandsInElement((<WinJS.UI.PrivateToolbar>toolbar.element.winControl)._mainActionArea);
        labels.forEach((label, index) => {
            LiveUnit.Assert.areEqual(label, commands[index].winControl.label);
        });
    }

    export function verifyOverflowAreaCommandsLabels(toolbar: WinJS.UI.Toolbar, labels: string[]) {
        var commands = getVisibleCommandsInElement((<WinJS.UI.PrivateToolbar>toolbar.element.winControl)._attachedOverflowArea);
        labels.forEach((label, index) => {
            LiveUnit.Assert.areEqual(label, commands[index].winControl.label);
        });
    }
}