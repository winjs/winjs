// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper.AppBar {
    "use strict";

    var _Constants = Helper.require("WinJS/Controls/AppBar/_Constants");
    var _CommandingSurfaceConstants = Helper.require("WinJS/Controls/CommandingSurface/_Constants");
    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;

    export function verifyRenderedOpened(appBar: WinJS.UI.PrivateAppBar): void {

        var commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(appBar._dom.commandingSurfaceEl);
        var commandingSurfaceTotalWidth = WinJS.Utilities._getPreciseTotalWidth(appBar._dom.commandingSurfaceEl);

        var appBarEl = appBar.element;
        var appBarContentHeight = WinJS.Utilities._getPreciseContentHeight(appBarEl);
        var appBarContentWidth = WinJS.Utilities._getPreciseContentWidth(appBarEl);

        var tolerance = 1;

        // Verify that the Opened AppBar contentbox size matches its CommandingSurface's marginbox size.
        Helper.Assert.areFloatsEqual(appBarContentHeight, commandingSurfaceTotalHeight,
            "Opened AppBar contentbox height should size to content.", tolerance);
        Helper.Assert.areFloatsEqual(appBarContentWidth, commandingSurfaceTotalWidth,
            "Opened AppBar contentbox width should size to content.", tolerance);

        Helper._CommandingSurface.verifyRenderedOpened(appBar._commandingSurface);
    }

    export function verifyRenderedClosed(appBar: WinJS.UI.PrivateAppBar): void {

        var appBarContentHeight = WinJS.Utilities._getPreciseContentHeight(appBar.element);
        var appBarContentWidth = WinJS.Utilities._getPreciseContentWidth(appBar.element);
        var commandingSurfaceTotalHeight = WinJS.Utilities._getPreciseTotalHeight(appBar._dom.commandingSurfaceEl);
        var commandingSurfaceTotalWidth = WinJS.Utilities._getPreciseTotalWidth(appBar._dom.commandingSurfaceEl);

        var tolerance = 1;

        if (appBar.closedDisplayMode === WinJS.UI.AppBar.ClosedDisplayMode.none) {
            LiveUnit.Assert.areEqual("none", getComputedStyle(appBar.element).display,
                "Closed AppBar with closedDisplayMode 'none' should not display");
        } else {
            // Verify that the Closed AppBar content size matches its CommandingSurface's total size.
            Helper.Assert.areFloatsEqual(appBarContentHeight, commandingSurfaceTotalHeight,
                "Closed AppBar contentbox height should size to content.", tolerance);
            Helper.Assert.areFloatsEqual(appBarContentWidth, commandingSurfaceTotalWidth,
                "Closed AppBar contentbox width should size to content.", tolerance);
        }
        // Verify CommandingSurface rendered closed.
        Helper._CommandingSurface.verifyRenderedClosed(appBar._commandingSurface);
    }

    export function verifyPlacementProperty(appBar: WinJS.UI.PrivateAppBar): void {

        var placement = appBar.placement;
        var topOfViewPort = 0;
        var bottomOfViewPort = window.innerHeight;
        var tolerance = 1;
        var appBarRect = appBar._dom.root.getBoundingClientRect();
        var appBarStyle = getComputedStyle(appBar.element);
        var marginBoxTop = appBarRect.top - WinJS.Utilities._convertToPrecisePixels(appBarStyle.marginTop);
        var marginBoxBottom = appBarRect.bottom + WinJS.Utilities._convertToPrecisePixels(appBarStyle.marginBottom);

        switch (placement) {
            case WinJS.UI.AppBar.Placement.top:
                Helper.Assert.areFloatsEqual(topOfViewPort, marginBoxTop,
                    "AppBar with placement 'top' should render its marginbox at the top of the viewport", tolerance);
                LiveUnit.Assert.areEqual(_CommandingSurface.OverflowDirection.bottom, appBar._commandingSurface.overflowDirection,
                    "placement 'top' AppBar's CommandingSurface should have overflowDirection 'bottom'");
                break;

            case WinJS.UI.AppBar.Placement.bottom:
                Helper.Assert.areFloatsEqual(bottomOfViewPort, marginBoxBottom,
                    "AppBar with placement 'bottom' should render its marginbox at the bottom of the viewport", tolerance);
                LiveUnit.Assert.areEqual(_CommandingSurface.OverflowDirection.top, appBar._commandingSurface.overflowDirection,
                    "placement 'bottom' AppBar's CommandingSurface should have overflowDirection 'top'");
                break;

            default:
                LiveUnit.Assert.fail("TEST ERROR: Encountered unknown Placement enum value: " + placement);
                break;
        }

    }

    export function useSynchronousAnimations(appBar: WinJS.UI.PrivateAppBar) {
        Helper._CommandingSurface.useSynchronousAnimations(appBar._commandingSurface);
    }

}