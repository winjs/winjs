// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");
    var path = require("path");

    module.exports = {
        tests: {
            files: [{
                expand: true,
                cwd: "tests/",
                src: ["**"],
                dest: config.testsOutput,
                filter: function isNotLessFile(filePath) {
                    return path.extname(filePath) !== ".less";
                }
            }]
        },

        testDeps: {
            files: [{
                src: [config.desktopOutput + "/js/base.js", config.desktopOutput + "/js/ui.js"],
                dest: config.testsOutput + "Base/source/"
            }]
        },

        fonts: {
            files: [{
                expand: true,
                cwd: "src/fonts/",
                src: ["**.ttf"],
                dest: config.desktopOutput + "fonts/"
            }]
        },

        intellisense: {
            files: [{
                expand: true,
                cwd: "src/js/",
                src: ["WinJS.intellisense*.js"],
                dest: config.desktopOutput + "js/"
            }]
        },

        srcjs: {
            files: [{
                expand: true,
                cwd: "src/js",
                src: ["**/*.js", "**/*.resjson"],
                dest: config.compiledTsOutput
            }]
        },

        modules: {
            files: [{
                expand: true,
                cwd: config.compiledTsOutput,
                src: ["**/*.js", "**/*.resjson"],
                dest: config.modulesOutput
            }, {
                expand: true,
                cwd: "src/fonts",
                src: ["**.ttf"],
                dest: config.modulesOutput + "fonts/"
            }, {
                expand: true,
                cwd: "src/less",
                src: ["**.less"],
                dest: config.modulesOutput + "less/"
            }, {
                expand: true,
                cwd: "tasks/utilities",
                src: ["require-*.js", "build-winjs.js"],
                dest: config.modulesOutput
            }]
        }
    };
})();