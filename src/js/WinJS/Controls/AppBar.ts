// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _AppBar = require('./AppBar/_AppBar');

var module: typeof _AppBar = null;

_Base.Namespace.define("WinJS.UI", {
    AppBar: {
        get: () => {
            if (!module) {
                require(["./AppBar/_AppBar"], (m: typeof _AppBar) => {
                    module = m;
                });
            }
            return module.AppBar;
        }
    }
});