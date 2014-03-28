// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
var config = require("../../config.js");

module.exports = {
    baseDesktop: {
        src: config.baseJSFiles,
        dest: config.desktopOutput + "js/base.js"
    },
    basePhone: {
        src: config.baseJSFilesPhone,
        dest: config.phoneOutput + "js/base.js"
    },
    baseStringsDesktop: {
        src: config.baseStringsFiles,
        dest: config.desktopOutput + "js/" + config.localeFolder + "/base.strings.js"
    },
    baseStringsPhone: {
        src: config.baseStringsFiles,
        dest: config.phoneOutput + "js/" + config.localeFolder + "/base.strings.js"
    },
    uiDesktop: {
        src: config.uiJSFiles,
        dest: config.desktopOutput + "js/ui.js"
    },
    uiPhone: {
        src: config.uiJSFilesPhone,
        dest: config.phoneOutput + "js/ui.js"
    },
    uiStringsDesktop: {
        src: config.uiStringsFiles,
        dest: config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js"
    },
    uiStringsPhone: {
        src: config.uiStringsFiles,
        dest: config.phoneOutput + "js/" + config.localeFolder + "/ui.strings.js"
    }
}