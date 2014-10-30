// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
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
