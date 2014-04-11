// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
var config = require("../../config.js");

module.exports = {
    options: {
        force: true
    },
    all: [
        config.desktopOutput,
        config.phoneOutput,
        config.tsOutput
    ],
    base: [
        config.desktopOutput + "js/base.js",
        config.desktopOutput + "js/" + config.localeFolder + "/base.strings.js",
        config.phoneOutput + "js/base.js",
        config.phoneOutput + "js/" + config.localeFolder + "/base.strings.js",
        config.tsOutput
    ],
    ui: [
        config.desktopOutput + "js/ui.js",
        config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js",
        config.phoneOutput + "js/ui.js",
        config.phoneOutput + "js/" + config.localeFolder + "/ui.strings.js",
        config.tsOutput
    ],
    qunit: [
        config.testsOutput + "TestLib/liveToQ/*.*"
    ]
}