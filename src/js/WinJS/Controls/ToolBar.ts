// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _ToolBar = require('./ToolBar/_ToolBar');

var module: typeof _ToolBar = null;

_Base.Namespace.define("WinJS.UI", {
    ToolBar: {
        get: () => {
            if (!module) {
                require(["./ToolBar/_ToolBar"], (m: typeof _ToolBar) => {
                    module = m;
                });
            }
            return module.ToolBar;
        }
    }
});
