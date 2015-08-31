// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _ElementResizeInstrument = require('./_ElementResizeInstrument');

var module: typeof _ElementResizeInstrument = null;

_Base.Namespace.define("WinJS.UI", {
    _ElementResizeInstrument: {
        get: () => {
            if (!module) {
                require(["./_ElementResizeInstrument"], (m: typeof _ElementResizeInstrument) => {
                    module = m;
                });
            }
            return module._ElementResizeInstrument;
        }
    }
});