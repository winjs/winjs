// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _Pane = require('./Pane/_Pane');

var module: typeof _Pane = null;

_Base.Namespace.define("WinJS.UI", {
    Pane: {
        get: () => {
            if (!module) {
                require(["./Pane/_Pane"], (m: typeof _Pane) => {
                    module = m;
                });
            }
            return module.Pane;
        }
    }
});