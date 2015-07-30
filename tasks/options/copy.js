// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");
    var path = require("path");
    
    function genPublishWinJs(args) {
        // required
        var dest = args.dest;
        // optional
        var additionalFiles = args.additionalFiles || [];
        
        return [{
            // root
            expand: true,
            src: [
                "README.md",
                "License.txt",
            ].concat(additionalFiles),
            dest: dest
        }, {
            // css
            expand: true,
            cwd: config.desktopOutput + "css",
            src: [
                "ui-dark.css",
                "ui-dark.min.css",
                "ui-light.css",
                "ui-light.min.css"
            ],
            dest: path.join(dest, "css")
        }, {
            // fonts
            expand: true,
            cwd: config.desktopOutput + "fonts",
            src: ["Symbols.ttf"],
            dest: path.join(dest, "fonts")
        }, {
            // js
            expand: true,
            cwd: config.desktopOutput + "js",
            src: [
                "base.js",
                "base.min.js",
                "base.min.js.map",
                "ui.js",
                "ui.min.js",
                "ui.min.js.map",
                "WinJS.intellisense-setup.js",
                "WinJS.intellisense.js",
                "en-US/ui.strings.js"
            ],
            dest: path.join(dest, "js")
        }];
    }
    
    function genPublishLocalization(args) {
        // required
        var dest = args.dest;
        // optional
        var additionalFiles = args.additionalFiles || [];
        
        return [{
            // WinJS src root
            expand: true,
            src: ["License.txt"],
            dest: dest
        }, {
            // Localization src root
            expand: true,
            cwd: "src/strings/",
            src: ["README.md"].concat(additionalFiles),
            dest: dest
        }, {
            // Localization bin root
            expand: true,
            cwd: config.stringsOutput,
            src: ["**"],
            dest: dest
        }];
    }

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
        
        strings: {
            files: [{
                expand: true,
                cwd: "src/strings/",
                src: ["**/*.resjson"],
                dest: config.stringsOutput
            }]
        },
        
        publishWinJs: {
            files: []
                .concat(genPublishWinJs({
                    additionalFiles: ["package.json"],
                    dest: config.winjsNpmPublishRoot
                }))
                .concat(genPublishWinJs({
                    additionalFiles: ["bower.json"],
                    dest: config.winjsBowerRepo
                }))
        },
        publishLocalization: {
            files: []
                .concat(genPublishLocalization({
                    additionalFiles: ["package.json"],
                    dest: config.localizationNpmPublishRoot
                }))
                .concat(genPublishLocalization({
                    additionalFiles: ["bower.json"],
                    dest: config.localizationBowerRepo
                }))
        }
    };
})();