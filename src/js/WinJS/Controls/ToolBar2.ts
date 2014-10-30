// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _ToolBar2 = require('./ToolBar2/_ToolBar2');

var module: typeof _ToolBar2 = null;

_Base.Namespace.define("WinJS.UI", {
    ToolBar2: {
        get: () => {
            if (!module) {
                require(["./ToolBar2/_ToolBar2"], (m: typeof _ToolBar2) => {
                    module = m;
                });
            }
            return module.ToolBar2;
        }
    }
});
