// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper.ToolBar {
    "use strict";

    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;

    export function verifyRenderedOpened(toolBar: WinJS.UI.PrivateToolBar): void {

        // TODO Verify Auto overflowdirection?


        var toolBarRect = toolBar.element.getBoundingClientRect();
        var commandingSurfaceRect = toolBar._dom.commandingSurfaceEl.getBoundingClientRect();
        var placeHolder = toolBar._dom.placeHolder;
        var placeHolderRect = placeHolder.getBoundingClientRect();

        // Verify that the ToolBar element has the same ClientRect as its CommandingSurface's element.
        LiveUnit.Assert.areEqual(toolBarRect.height, commandingSurfaceRect.height, "Opened ToolBar and CommandingSurface must have the same height.");
        LiveUnit.Assert.areEqual(toolBarRect.width, commandingSurfaceRect.width, "Opened ToolBar and CommandingSurface must have the same width.");
        LiveUnit.Assert.areEqual(toolBarRect.top, commandingSurfaceRect.top, "Opened ToolBar and CommandingSurface must have the same top offset.");
        LiveUnit.Assert.areEqual(toolBarRect.left, commandingSurfaceRect.left, "Opened ToolBar and CommandingSurface must have the same left offet.");

        // Verify that the opened toolbar is a child of the body element with fixed position.
        LiveUnit.Assert.isTrue(toolBar.element.parentElement === document.body, "Opened ToolBar must be a child of the <body> element");
        LiveUnit.Assert.isTrue(getComputedStyle(toolBar.element).position === "fixed", "Opened ToolBar must have fixed positioning");
        LiveUnit.Assert.isTrue(document.body.contains(placeHolder), "placeholder element must be a descendant of the <body> while ToolBar is opened.");

        // Verify that based on our overflowdirection, we are correctly positioned on top of the placeholder element.
        LiveUnit.Assert.areEqual(toolBarRect.width, placeHolderRect.width, "Opened ToolBar must have same width as its placeholder element");
        LiveUnit.Assert.areEqual(toolBarRect.left, placeHolderRect.left, "Opened ToolBar must have same left offset as its placeholder element");

        switch (toolBar._commandingSurface.overflowDirection) {
            case _CommandingSurface.OverflowDirection.bottom: 

                LiveUnit.Assert.areEqual(toolBarRect.top, placeHolderRect.top, "")

                break;
            case _CommandingSurface.OverflowDirection.top:

                LiveUnit.Assert.areEqual(toolBarRect.bottom, placeHolderRect.bottom, "")

                break;
        }

        Helper._CommandingSurface.verifyRenderedOpened(toolBar._commandingSurface);
    }

    export function verifyRenderedClosed(toolBar: WinJS.UI.PrivateToolBar): void {
        var toolBarRect = toolBar.element.getBoundingClientRect();
        var commandingSurfaceRect = toolBar._dom.commandingSurfaceEl.getBoundingClientRect();
        var placeHolder = toolBar._dom.placeHolder;

        // Verify that the Closed ToolBar element has the same ClientRect as its CommandingSurface's element.
        LiveUnit.Assert.areEqual(toolBarRect.height, commandingSurfaceRect.height, "Closed ToolBar and CommandingSurface must have the same height.");
        LiveUnit.Assert.areEqual(toolBarRect.width, commandingSurfaceRect.width, "Closed ToolBar and CommandingSurface must have the same width.");
        LiveUnit.Assert.areEqual(toolBarRect.top, commandingSurfaceRect.top, "Closed ToolBar and CommandingSurface must have the same top offset.");
        LiveUnit.Assert.areEqual(toolBarRect.left, commandingSurfaceRect.left, "Closed ToolBar and CommandingSurface must have the same left offet.");

        // Verify we have a parent element and our placeHolder element does not.
        LiveUnit.Assert.isTrue(document.body.contains(toolBar.element), "Closed ToolBar must be a descendant of the body");
        LiveUnit.Assert.isFalse(placeHolder.parentElement, "placeholder must not be in the DOM, while ToolBar is closed");

        Helper._CommandingSurface.verifyRenderedClosed(toolBar._commandingSurface);
    }

    export function useSynchronousAnimations(appBar: WinJS.UI.PrivateToolBar) {
        Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);
    }
}