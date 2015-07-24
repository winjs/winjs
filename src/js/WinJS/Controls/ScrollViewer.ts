// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _ScrollViewer = require('./ScrollViewer/_ScrollViewer');

var module: typeof _ScrollViewer = null;
function getModule() {
    if (!module) {
        require(["./ScrollViewer/_ScrollViewer"], (m: typeof _ScrollViewer) => {
            module = m;
        });
    }
    return module;
}

_Base.Namespace.define("WinJS.UI", {
    /// <summary locid="WinJS.UI.ScrollMode">  
    /// The input behavior for the ScrollViewer.  
    /// </summary>  
    ScrollMode: {
        get: () => {
            return getModule().ScrollMode;
        }
    },

    /// <signature helpKeyword="WinJS.UI.ScrollViewer">  
    /// <summary locid="WinJS.UI.ScrollViewer.constructor">  
    /// Creates a new ScrollViewer.  
    /// </summary>  
    /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.ScrollViewer.constructor_p:element">  
    /// The DOM element that hosts the ScrollViewer.  
    /// </param>  
    /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.ScrollViewer.constructor_p:options">  
    /// An object that contains one or more property/value pairs to apply to the new control.  
    /// Each property of the options object corresponds to one of the control's properties or events.  
    /// </param>  
    /// <returns type="WinJS.UI.ScrollViewer" locid="WinJS.UI.ScrollViewer.constructor_returnValue">  
    /// The new ScrollViewer.  
    /// </returns>  
    /// </signature>  
    ScrollViewer: {
        get: () => {
            return getModule().ScrollViewer;
        }
    }
});
