// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="Helper.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module Helper.AppBar {
    "use strict";

    var _Constants = Helper.require("WinJS/Controls/AppBar/_Constants");
    var _CommandingSurfaceConstants = Helper.require("WinJS/Controls/CommandingSurface/_Constants");
    var _CommandingSurface = <typeof WinJS.UI.PrivateCommandingSurface> Helper.require("WinJS/Controls/CommandingSurface/_CommandingSurface")._CommandingSurface;

    export function verifyRenderedOpened(appBar: WinJS.UI.PrivateAppBar): void {

        //TODO Verify correct commandingsurface overflowdirection based on AppBar placement?

        // TODO verify that the AppBar element has the same bounding rect as the the Commanding surface element.

        Helper._CommandingSurface.verifyRenderedOpened(appBar._commandingSurface);
    }

    export function verifyRenderedClosed(appBar: WinJS.UI.PrivateAppBar): void {

        // TODO verify that the AppBar element has the same bounding rect as the the Commanding surface element.
        Helper._CommandingSurface.verifyRenderedClosed(appBar._commandingSurface);
    }

    export function verifyPlacement(appBar: WinJS.UI.PrivateAppBar): void {

        var placement = appBar.placement,
            topOfViewPort = 0,
            bottomOfViewPort = window.innerHeight,
            tolerance = 1,
            appBarRect = appBar._dom.root.getBoundingClientRect();

        switch (placement) {
            case WinJS.UI.AppBar.Placement.top:
                LiveUnit.Assert.isTrue(Math.abs(appBarRect.top - topOfViewPort) < tolerance);
                LiveUnit.Assert.areEqual(appBar._commandingSurface.overflowDirection, _CommandingSurface.OverflowDirection.bottom, "Top AppBar should overflow towards the bottom");
                break;

            case WinJS.UI.AppBar.Placement.bottom:
                LiveUnit.Assert.isTrue(Math.abs(appBarRect.bottom - bottomOfViewPort) < tolerance);
                LiveUnit.Assert.areEqual(appBar._commandingSurface.overflowDirection, _CommandingSurface.OverflowDirection.top, "Bottom AppBar should overflow towards the top");
                break;

            default:
                LiveUnit.Assert.fail("TEST ERROR: Encountered unknown Placement enum value: " + placement);
                break;
        }

    }

}