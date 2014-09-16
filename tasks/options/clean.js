// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        options: {
            force: true
        },
        all: [
            config.desktopOutput,
            config.phoneOutput,
            config.modulesOutput,
            config.compiledTsOutput
        ],
        base: [
            config.desktopOutput + "js/base.js",
            config.phoneOutput + "js/base.js",
        ],
        ui: [
            config.desktopOutput + "js/ui.js",
            config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js",
            config.phoneOutput + "js/ui.js",
            config.phoneOutput + "js/" + config.localeFolder + "/ui.strings.js",
        ],
        tests: [
            config.testsOutput
        ],
        qunit: [
            config.testsOutput + "TestLib/liveToQ/*.*"
        ],
        modules: [
            config.modulesOutput
        ]
    };
})();