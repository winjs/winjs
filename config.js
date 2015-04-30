// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = {};
    module.exports = config;

    config.version = "4.0";
    config.buildDate = new Date();
    config.month = config.buildDate.getMonth() + 1;
    config.buildDateString = config.buildDate.getFullYear() + "." + config.month + "." + config.buildDate.getDate();
    config.localeFolder = "en-US";
    config.outputFolder = "bin/";
    config.copyright = '/*! Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information. */';

    config.testsOutput = config.outputFolder + "tests/";
    config.targetName = "WinJS." + config.version;
    config.desktopFramework = "Microsoft." + config.targetName;
    config.desktopOutput = config.outputFolder + config.desktopFramework + "/";
    config.compiledTsOutput = config.outputFolder + "tsbuild/";

    config.uiStringsFiles = [
        "src/js/" + config.localeFolder + "/ui.prefix.js",
        "src/js/" + config.localeFolder + "/ui.resjson",
        "src/js/" + config.localeFolder + "/ui.suffix.js"
    ];

    config.lint = {
        srcFiles: ["src/**/*.js"],
        buildFiles: ["gruntfile.js", "config.js", "tasks/**/*.js"]
    };

    // Object that aggregates the saucelabs test results that we report through our automation
    config.tests_results = {
        "date": new Date(),
        "environment": [],
        "results":  []
    };


})();