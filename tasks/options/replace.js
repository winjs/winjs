// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        tests: {
            options: {
                patterns: [
                    {
                        match: /\$\(TargetFramework\)/g,
                        replacement: config.desktopFramework
                    }
                ],
            },
            files: [
                { expand: true, flatten: false, src: [config.testsOutput + "**/*.js"], dest: "" },
                { expand: true, flatten: false, src: [config.testsOutput + "**/*.html"], dest: "" },
            ]
        },
        base: {
            options: {
                patterns: [
                    {
                        match: /\$\(TARGET_DESTINATION\)/g,
                        replacement: config.targetName
                    },
                    {
                        match: /\$\(build.version\)/g,
                        replacement: "<%= pkg.version %>"
                    },
                    {
                        match: /\$\(build.date\)/g,
                        replacement: config.buildDateString
                    },
                    {
                        match: /\$\(build.branch\)/g,
                        replacement: "<%= pkg.name %>"
                    }
                ]
            },
            files: [
              { expand: true, flatten: true, src: [config.desktopOutput + "js/*.js"], dest: config.desktopOutput + "js/" },
              { expand: true, flatten: true, src: [config.desktopOutput + "js/" + config.localeFolder + "/*.js"], dest: config.desktopOutput + "js/" + config.localeFolder + "/" },
              { expand: true, flatten: true, src: [config.desktopOutput + "css/*.css"], dest: config.desktopOutput + "css/" },
              { expand: true, flatten: false, src: [config.modulesOutput + "**/*.js"], dest: "" },
            ]
        },
    };

    if (config.inRazzle) {
        module.exports.base.files.push({ expand: true, cwd: config.testsOutput, src: ["**/*.js"], dest: config.testsOutput });
        module.exports.tests.options.patterns.push({
            match: /\$\(TESTDATA\)\//g,
            replacement: ""
        });
    } else {
        module.exports.tests.options.patterns.push({
            match: /\$\(TESTDATA\)\//g,
            replacement: "../TestData/"
        });
    }
})();