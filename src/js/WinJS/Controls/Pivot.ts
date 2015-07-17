// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _Pivot = require('./Pivot/_Pivot');
import _Item = require('./Pivot/_Item');

// We need PivotItem to be added to the public WinJS.UI namespace immediately.
// Force load the PivotItem module by accessing an undefined property on it.
// We do this to prevent:
//   1) the TypeScript compiler from optimizing it away since we don't use it 
//      anywhere else in this file. 
//   2) triggering a premature unwrap of the lazily loaded PivotItem module
//      which would happen if we accessed the _Item.PivotItem getter now.
_Item["touch"];

var module: typeof _Pivot = null;

_Base.Namespace.define("WinJS.UI", {
    /// <field>
    /// <summary locid="WinJS.UI.Pivot">
    /// Tab control which displays a item of content.
    /// </summary>
    /// </field>
    /// <icon src="ui_winjs.ui.pivot.12x12.png" width="12" height="12" />
    /// <icon src="ui_winjs.ui.pivot.16x16.png" width="16" height="16" />
    /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Pivot">
    /// <div data-win-control="WinJS.UI.PivotItem" data-win-options="{header: 'PivotItem Header'}">PivotItem Content</div>
    /// </div>]]></htmlSnippet>
    /// <event name="selectionchanged" bubbles="true" locid="WinJS.UI.Pivot_e:selectionchanged">Raised when the item on screen has changed.</event>
    /// <event name="itemanimationstart" bubbles="true" locid="WinJS.UI.Pivot_e:itemloaded">Raised when the item's animation starts.</event>
    /// <event name="itemanimationend" bubbles="true" locid="WinJS.UI.Pivot_e:itemanimationend">Raised when the item's animation ends.</event>
    /// <part name="pivot" class="win-pivot" locid="WinJS.UI.Pivot_part:pivot">The entire Pivot control.</part>
    /// <part name="title" class="win-pivot-title" locid="WinJS.UI.Pivot_part:title">The title for the Pivot control.</part>
    /// <part name="header" class="win-pivot-header" locid="WinJS.UI.Pivot_part:header">A header of a Pivot Item.</part>
    /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
    /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
    Pivot: {
        get: () => {
            if (!module) {
                require(["./Pivot/_Pivot"], (m: typeof _Pivot) => {
                    module = m;
                });
            }
            return module.Pivot;
        }
    }
});
