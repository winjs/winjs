// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _ToolBarNew = require('./ToolBarNew/_ToolBarNew');

var module: typeof _ToolBarNew = null;

_Base.Namespace.define("WinJS.UI", {
    ToolBarNew: {
        get: () => {
            if (!module) {
                require(["./ToolBarNew/_ToolBarNew"], (m: typeof _ToolBarNew) => {
                    module = m;
                });
            }
            return module.ToolBarNew;
        }
    }
});
