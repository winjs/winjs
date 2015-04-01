// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper.ToolBar {
    "use strict";

    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;

    export function verifyRenderedOpened(toolBar: WinJS.UI.PrivateToolBar): void {
        // Verifies that the ToolBar is rendered correctly when opened. 
        // Specifically,
        // 1) Be light dismissible, this includes a click-eating-div (CED) to cover up all other content.
        // 2) Be interact-able, this requires that the ToolBar element be rendered above the CED on the z-stack.
        // 3) Take up layout space when closed, but partially overlay when opened. This means that any 
        // additional space that the ToolBar consumes when it is opened, should not reflow app content, but 
        // overlay on top of the content that was already there.
        //
        // Because the CED needs to cover all other app content it needs to be a child of the body and have a 
        // really high z-index. 
        // Because the ToolBar needs to take up layout space when closed, it is an element that you position 
        // statically in the flow of your document. 
        // Because the ToolBar needs to be interactable when opened, it needs to be positioned non-statically 
        // in the body with an even higher z-index than the CED.
        // Because the ToolBar needs to avoid causing app content to reflow when it opens and closes, it leaves
        // a placeholder element of the same size in its place while the ToolBar is opened. The ToolBar uses
        // fixed positioning, to reposition itself over the placeholder element to create the illusion that it
        // never moved.

        var commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(toolBar._dom.commandingSurfaceEl);
        var commandingSurfaceTotalWidth = WinJS.Utilities._getPreciseTotalWidth(toolBar._dom.commandingSurfaceEl);

        var toolBarEl = toolBar.element;
        var toolBarContentHeight = WinJS.Utilities._getPreciseContentHeight(toolBarEl);
        var toolBarContentWidth = WinJS.Utilities._getPreciseContentWidth(toolBarEl);
        var toolBarTotalHeight = WinJS.Utilities._getPreciseTotalHeight(toolBarEl);
        var toolBarTotalWidth = WinJS.Utilities._getPreciseTotalWidth(toolBarEl);
        var toolBarRect = toolBarEl.getBoundingClientRect();
        var toolBarMargins = WinJS.Utilities._getPreciseMargins(toolBarEl);
        var toolBarMarginBoxLeft = toolBarRect.left - toolBarMargins.left;
        var toolBarMarginBoxTop = toolBarRect.top - toolBarMargins.top;
        var toolBarMarginBoxRight = toolBarRect.right + toolBarMargins.right;
        var toolBarMarginBoxBottom = toolBarRect.bottom + toolBarMargins.bottom;

        var placeHolder = toolBar._dom.placeHolder;
        var placeHolderTotalHeight = WinJS.Utilities._getPreciseTotalHeight(placeHolder);
        var placeHolderTotalWidth = WinJS.Utilities._getPreciseTotalWidth(placeHolder);
        var placeHolderRect = placeHolder.getBoundingClientRect();
        var placeHolderMargins = WinJS.Utilities._getPreciseMargins(placeHolder);
        var placeHolderMarginBoxLeft = placeHolderRect.left - placeHolderMargins.left;
        var placeHolderMarginBoxTop = placeHolderRect.top - placeHolderMargins.top;
        var placeHolderMarginBoxRight = placeHolderRect.right + placeHolderMargins.right;
        var placeHolderMarginBoxBottom = placeHolderRect.bottom + placeHolderMargins.bottom;

        var tolerance = 1;

        // Verify that the Opened ToolBar contentbox size matches its CommandingSurface's marginbox size.
        Helper.Assert.areFloatsEqual(toolBarContentHeight, commandingSurfaceTotalHeight,
            "Opened ToolBar contentbox height should size to content.", tolerance);
        Helper.Assert.areFloatsEqual(toolBarContentWidth, commandingSurfaceTotalWidth,
            "Opened ToolBar contentbox width should size to content.", tolerance);

        // Verify that the opened toolbar is a child of the body element with fixed position.
        LiveUnit.Assert.areEqual(toolBar.element.parentElement,document.body, "Opened ToolBar must be a child of the <body> element");
        LiveUnit.Assert.areEqual(getComputedStyle(toolBar.element).position, "fixed", "Opened ToolBar must have fixed positioning");

        // Verify that the placeholder element is a descendant of the body with static positioning.
        LiveUnit.Assert.isTrue(document.body.contains(placeHolder), "placeholder element must be a descendant of the <body> while ToolBar is opened.");
        LiveUnit.Assert.areEqual(getComputedStyle(placeHolder).position, "static", "placeholder element must have static positioning");

        // Verify that the ToolBar is correctly positioned on top of the placeholder element.
        Helper.Assert.areFloatsEqual(placeHolderMarginBoxLeft, toolBarMarginBoxLeft,
            "Left viewport offset of opened ToolBar's marginbox should match the left viewport offset of palceHolder's marginbox", tolerance);
        Helper.Assert.areFloatsEqual(placeHolderMarginBoxRight, toolBarMarginBoxRight,
            "Right viewport offset of opened ToolBar's marginbox should match the right viewport offset of palceHolder's marginbox", tolerance);
        switch (toolBar._commandingSurface.overflowDirection) {
            case _CommandingSurface.OverflowDirection.bottom:
                Helper.Assert.areFloatsEqual(placeHolderMarginBoxTop, toolBarMarginBoxTop,
                    "Top viewport offset of opened ToolBar's marginbox should match the top viewport offset of palceHolder's marginbox", tolerance);
                break;
            case _CommandingSurface.OverflowDirection.top:
                Helper.Assert.areFloatsEqual(placeHolderMarginBoxBottom, toolBarMarginBoxBottom,
                    "Bottom viewport offset of opened ToolBar's marginbox should match the Bottom viewport offset of palceHolder's marginbox",
                    tolerance);
                break;
        }

        Helper._CommandingSurface.verifyRenderedOpened(toolBar._commandingSurface);
    }

    export function verifyRenderedClosed(toolBar: WinJS.UI.PrivateToolBar): void {
        var toolBarContentHeight = WinJS.Utilities._getPreciseContentHeight(toolBar.element);
        var toolBarContentWidth = WinJS.Utilities._getPreciseContentWidth(toolBar.element);
        var commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(toolBar._dom.commandingSurfaceEl);
        var commandingSurfaceTotalWidth = WinJS.Utilities._getPreciseTotalWidth(toolBar._dom.commandingSurfaceEl);
        var placeHolder = toolBar._dom.placeHolder;
        var tolerance = 1;

        // Verify that the Closed ToolBar content size matches its CommandingSurface's total size.
        Helper.Assert.areFloatsEqual(toolBarContentHeight, commandingSurfaceTotalHeight,
            "Closed ToolBar contentbox height should size to content.", tolerance);
        Helper.Assert.areFloatsEqual(toolBarContentWidth, commandingSurfaceTotalWidth,
            "Closed ToolBar contentbox width should size to content.", tolerance);

        // Verify we have a parent element and our placeHolder element does not.
        LiveUnit.Assert.isTrue(document.body.contains(toolBar.element), "Closed ToolBar must be a descendant of the body");
        LiveUnit.Assert.isFalse(placeHolder.parentElement, "placeholder must not be in the DOM, while ToolBar is closed");

        Helper._CommandingSurface.verifyRenderedClosed(toolBar._commandingSurface);
    }

    export function useSynchronousAnimations(toolBar: WinJS.UI.PrivateToolBar) {
        Helper._CommandingSurface.useSynchronousAnimations(toolBar._commandingSurface);
    }
}