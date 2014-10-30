// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _Toolbar = require('./Toolbar/_Toolbar');

var module: typeof _Toolbar = null;

_Base.Namespace.define("WinJS.UI", {
    Toolbar: {
        get: () => {
            if (!module) {
                require(["./Toolbar/_Toolbar"], (m: typeof _Toolbar) => {
                    module = m;
                });
            }
            return module.Toolbar;
        }
    }
});
