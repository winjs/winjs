// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Global'
], function hoverable(exports, _Global) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    _Global.document.documentElement.classList.add("win-hoverable");
    exports.isHoverable = true;

    if (!_Global.MSPointerEvent) {
        var touchStartHandler = function () {
            _Global.document.removeEventListener("touchstart", touchStartHandler);
            // Remove win-hoverable CSS class fromstartt . <html> to avoid :hover styles in webkit when there is
            // touch support.
            _Global.document.documentElement.classList.remove("win-hoverable");
            exports.isHoverable = false;
        };

        _Global.document.addEventListener("touchstart", touchStartHandler);
    }
});
