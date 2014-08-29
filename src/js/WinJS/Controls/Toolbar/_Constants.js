// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
     'exports',
     '../../Core/_Base',
], function toolbarConstantsInit(exports, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, null, {
        // Toolbar class names.
        cssClass: "win-toolbar",

        // Toolbar overflowModes
        overflowModeAttached: "attached",
        overflowModeDetached: "detached"
    });
});