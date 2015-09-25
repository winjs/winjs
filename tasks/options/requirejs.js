// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var path = require('path');
    var config = require("../../config.js");
    var grunt = config.grunt;

    var rootPath = path.resolve();
    var realFileNames = [];

    function ensureRealNames() {
        if (realFileNames.length === 0) {
            grunt.file.recurse(config.compiledTsOutput, function (abspath) {
                realFileNames.push(path.join(rootPath, abspath));
            });

            grunt.file.recurse('tasks/utilities', function (abspath) {
                realFileNames.push(path.join(rootPath, abspath));
            });

            grunt.file.recurse('src/less', function (abspath) {
                realFileNames.push(path.join(rootPath, abspath));
            });
        }
    }

    // ensure that the files discovered by requireJS have appropriate
    // casing so that non-Windows builds will work.
    function done(done, output) {

        var lines = output.split('\n');
        lines.splice(0, 3);
        lines.pop();

        // Remove empty: pattern resources added by Less build.
        lines = lines.filter(function (line) {
            return line.indexOf("empty:") === -1;
        });

        lines = lines.filter(function (line) {
            return line.indexOf("require-json!") === -1;
        });

        lines = lines.map(function (line) {
            return path.normalize(line.replace("require-style!", ""));
        });

        ensureRealNames();
        lines.forEach(function (line) {
            if (realFileNames.indexOf(line) === -1) {
                grunt.fail.warn("Source file in build is not in filesystem:" + line + ". Check casing of filename.");
            }
        });

        done();
    }

    function header(name, dependencies) {
        var amdDependencies = dependencies.map(JSON.stringify).join(",");
        var commonJsDependencies = dependencies.map(function (dep) {
            return "require(" + JSON.stringify(dep) + ")";
        }).join(",");
        var header = "\n" +
"/*! Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information. */\n" +
"(function () {\n" +
"\n" +
"    var globalObject = \n" +
"        typeof window !== 'undefined' ? window :\n" +
"        typeof self !== 'undefined' ? self :\n" +
"        typeof global !== 'undefined' ? global :\n" +
"        {};\n" +
"    (function (factory) {\n" +
"        if (typeof define === 'function' && define.amd) {\n" +
"            // amd\n" +
"            define([" + amdDependencies + "], factory);\n" +
"        } else {\n" +
"            globalObject.msWriteProfilerMark && msWriteProfilerMark('$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) " + name + ".js,StartTM');\n" +
"            if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {\n" +
"                // CommonJS\n" +
"                factory(" + commonJsDependencies + ");\n" +
"            } else {\n" +
// globalObject.WinJS is here for the have dependencies case where they have already defined WinJS
"                // No module system\n" +
"                factory(globalObject.WinJS);\n" +
"            }\n" +
"            globalObject.msWriteProfilerMark && msWriteProfilerMark('$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) " + name + ".js,StopTM');\n" +
"        }\n" +
"    }(function (WinJS) {\n" +
"\n";
        // If this has dependencies it should assume they define WinJS.Utilities._require
        if (dependencies.length) {
            header += "\n" +
"var require = WinJS.Utilities._require;\n" +
"var define = WinJS.Utilities._define;\n" +
"\n";
        }

        return header;
    }

    function footer(name) {
        return "\n" +
"        require(['WinJS/Core/_WinJS', '" + name + "'], function (_WinJS) {\n" +
"            // WinJS always publishes itself to global\n" +
"            globalObject.WinJS = _WinJS;\n" +
"            if (typeof module !== 'undefined') {\n" +
"                // This is a CommonJS context so publish to exports\n" +
"                module.exports = _WinJS;\n" +
"            }\n" +
"        });\n" +
"        return globalObject.WinJS;\n" +
"    }));\n" +
"}());\n" +
"\n";
    }

    function footerWithoutExport(name) {
        return "\n" +
"        require(['" + name + "'], function () {\n" +
"        });\n" +
"    }));\n" +
"}());\n" +
"\n";
    }

    function defaults(key, buildConfig) {
        buildConfig = buildConfig || {};
        var options = buildConfig.options = buildConfig.options || {};

        options.baseUrl = config.compiledTsOutput;
        options.useStrict = true;
        options.optimize = "none"; // uglify2 is run seperately
        options.stubModules = ["require-style", "require-json"];
        options.done = options.done || done;
        options.findNestedDependencies = true;

        // If it doesn't have an exclude then we include the default AMD implementations
        var primary = !options.exclude;
        if (primary) {
            options.deps = ["amd"];
        }

        var outputBase = config.desktopOutput + "js/";
        options.paths = {
            "less": "../../src/less",
            "strings": "../../src/strings",
            "require-json": "../../tasks/utilities/require-json",
            "require-style": "../../tasks/utilities/require-style",
        };

        // this is to reconfigure onefile dependencies
        if (config.isStorePackage) {
            options.paths["WinJS/Utilities/_Telemetry"] = "./WinJS/Utilities/_TelemetryImpl";
        }

        // The modules build generates a require configuration with this
        if (!options.dir) {
            options.name = options.name || key;
            var target = options.target || options.name;
            var name = options.name;
            options.out = outputBase + target + ".js";
            options.wrap = options.wrap || {
                start: header(target, options.exclude || []),
                end: footer(name),
            };
        }
        return buildConfig;
    }

    module.exports = {
        defaults: defaults,
        header: header,
        footer: footer,
        ui: defaults('ui', {
            options: {
                exclude: ['./base']
            }
        }),
        intrinsics: defaults('intrinsics', {
            options: {
                cssOutputSuffix: "-intrinsics",
                wrap: {
                    start: header("intrinsics", []),
                    end: footerWithoutExport("intrinsics")
                }
            }
        }),
        tv: defaults('tv', {
            options: {
                cssOutputSuffix: "-tv",
                exclude: ['./base', './ui'],
                wrap: {
                    start: header("tv", ['./base', './ui']),
                    end: footerWithoutExport("tv")
                }
            }
        }),
        
        // MediaPlayer
        //   The reason MediaPlayer is split into 2 modules, one for JS and one for CSS,
        //   is to avoid including redundant CSS in the MediaPlayer's CSS files. If we
        //   were to include them in a single module, the MediaPlayer's CSS files would
        //   include all of the CSS for all of the JS files the MediaPlayer included
        //   (e.g. ToolBar's CSS). By splitting them into 2 modules, the MediaPlayer's
        //   CSS files only include CSS for the MediaPlayer and all of the LESS files it
        //   @imports.
        //
        
        // MediaPlayer CSS
        mediaplayerCss: defaults('mediaplayerCss', {
            options: {
                target: "mediaplayer",
                cssOutputSuffix: "-mediaplayer",
                exclude: ['./base', './ui'],
                wrap: {
                    start: header("mediaplayerCss", ['./base', './ui']),
                    end: footerWithoutExport("mediaplayerCss")
                }
            }
        }),
        // MediaPlayer JavaScript
        mediaplayerJs: defaults('mediaplayerJs', {
            options: {
                target: "mediaplayer",
                cssOutputSuffix: "-mediaplayer",
                exclude: ['./base', './ui'],
                wrap: {
                    start: header("mediaplayerJs", ['./base', './ui']),
                    end: footerWithoutExport("mediaplayerJs")
                }
            }
        })
    };

})();