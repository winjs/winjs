// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _SplitView = require('./SplitView/_SplitView');

var module: typeof _SplitView = null;

_Base.Namespace.define("WinJS.UI", {
    SplitView: {
        get: () => {
            if (!module) {
                require(["./SplitView/_SplitView"], (m: typeof _SplitView) => {
                    module = m;
                });
            }
            return module.SplitView;
        }
    }
});
