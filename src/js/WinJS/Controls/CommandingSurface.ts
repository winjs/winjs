// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _CommandingSurface = require('./CommandingSurface/_CommandingSurface');

var module: typeof _CommandingSurface = null;

function getModule() {
    if (!module) {
        require(["./CommandingSurface/_CommandingSurface"], (m: typeof _CommandingSurface) => {
            module = m;
        });
    }
    return module._CommandingSurface;
}

_Base.Namespace.define("WinJS.UI", {
    ToolBar: {
        get: getModule
    }
});

var publicMembers = Object.create({}, {
    ToolBar: {
        get: function () {
            return getModule();
        }
    }
});

export = publicMembers;
