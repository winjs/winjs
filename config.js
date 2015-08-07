// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";
    
    var config = {};
    module.exports = config;
    
    var grunt = require('grunt');
    var pkg = grunt.file.readJSON("package.json");
    // package.json version contains <major>.<minor>.<patch>. We just want <major>.<minor>
    var majorMinorVersion = pkg.version.split(".").splice(0, 2).join(".");
    
    config.version = majorMinorVersion;
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
    
    config.reposRoot = 'repos/';
    config.publishRoot = 'dist/';
    config.winjsPublishRoot = config.publishRoot + 'winjs/';
    config.winjsNpmPublishRoot = config.winjsPublishRoot + 'npm/';
    config.winjsBowerRepo = config.reposRoot + 'winjs-bower/';
    config.localizationPublishRoot = config.publishRoot + 'winjs-localization/';
    config.localizationNpmPublishRoot = config.localizationPublishRoot + 'npm/';
    config.localizationBowerRepo = config.reposRoot + 'winjs-localization-bower/';
    
    config.stringsOutput = config.outputFolder + config.desktopFramework + "-strings/";

    config.uiStringsFiles = [
        "src/js/" + config.localeFolder + "/ui.prefix.js",
        "src/strings/en-us/Microsoft.WinJS.resjson",
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