// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _Pivot = require('./Pivot/_Pivot');

var module: typeof _Pivot = null;

_Base.Namespace.define("WinJS.UI", {
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
