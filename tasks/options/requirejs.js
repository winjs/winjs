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
        var header = "\n" +
"/*! Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information. */\n" +
"(function (globalObject) {\n" +
"\n" +
"    var globalObject = \n" +
"        typeof window !== 'undefined' ? window :\n" +
"        typeof self !== 'undefined' ? self :\n" +
"        typeof global !== 'undefined' ? global :\n" +
"        {};\n" +
"    (function (factory) {\n" +
"        if (typeof define === 'function' && define.amd) {\n" +
"            define([" + dependencies.map(JSON.stringify).join(",") + "], factory);\n" +
"        } else {\n" +
"            globalObject.msWriteProfilerMark && msWriteProfilerMark('$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) " + name + ".js,StartTM');\n" +
// globalObject.WinJS is here for the have dependencies case where they have already defined WinJS
"            factory(globalObject.WinJS);\n" +
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
"            globalObject.WinJS = _WinJS;\n" +
"        });\n" +
"        return globalObject.WinJS;\n" +
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
            options.wrap = {
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
        ui: {
            options: {
                exclude: ['./base'],
                target: 'ui'
            }
        },
        base: {
            options: {
                target: 'base'
            }
        }
    };
})();