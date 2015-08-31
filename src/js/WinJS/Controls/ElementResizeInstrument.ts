// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _ElementResizeInstrument = require('./ElementResizeInstrument/_ElementResizeInstrument');

var module: typeof _ElementResizeInstrument = null;

function getModule() {
    if (!module) {
        require(["./ElementResizeInstrument/_ElementResizeInstrument"], (m: typeof _ElementResizeInstrument) => {
            module = m;
        });
    }
    return module._ElementResizeInstrument;
}

var publicMembers = Object.create({}, {
    _ElementResizeInstrument: {
        get: function () {
            return getModule();
        }
    }
});

export = publicMembers;
