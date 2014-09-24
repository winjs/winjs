// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function () {
    "use strict";
    var config = require("../../config.js");
    module.exports = {
        options: {
            sourceMap: true,
            banner: config.copyright
        },
        baseDesktop: {
            src: [config.desktopOutput + "js/base.js"],
            dest: config.desktopOutput + "js/base.min.js"
        },
        uiDesktop: {
            src: [config.desktopOutput + "js/ui.js"],
            dest: config.desktopOutput + "js/ui.min.js"
        },
        singleFile: {
            src: [config.desktopOutput + "js/WinJS.js"],
            dest: config.desktopOutput + "js/WinJS.min.js"
        }
    };
})();