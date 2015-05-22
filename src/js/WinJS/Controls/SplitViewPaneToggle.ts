// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _SplitViewPaneToggle = require('./SplitViewPaneToggle/_SplitViewPaneToggle');

var module: typeof _SplitViewPaneToggle = null;

_Base.Namespace.define("WinJS.UI", {
    SplitViewPaneToggle: {
        get: () => {
            if (!module) {
                require(["./SplitViewPaneToggle/_SplitViewPaneToggle"], (m: typeof _SplitViewPaneToggle) => {
                    module = m;
                });
            }
            return module.SplitViewPaneToggle;
        }
    }
});
