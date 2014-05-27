// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        baseStringsDesktop: {
            src: config.baseStringsFiles,
            dest: config.desktopOutput + "js/" + config.localeFolder + "/base.strings.js",
            nonull: true
        },
        baseStringsPhone: {
            src: config.baseStringsFiles,
            dest: config.phoneOutput + "js/" + config.localeFolder + "/base.strings.js",
            nonull: true
        },
        uiStringsDesktop: {
            src: config.uiStringsFiles,
            dest: config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js",
            nonull: true
        },
        uiStringsPhone: {
            src: config.uiStringsFiles,
            dest: config.phoneOutput + "js/" + config.localeFolder + "/ui.strings.js",
            nonull: true
        }
    };
})();