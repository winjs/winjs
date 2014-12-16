// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var path = require('path');
    var fs = require("fs-extra");
    var config = require("../config.js");

    module.exports = function (grunt) {

        grunt.registerTask("build-modules", ["ts:src", "_copyToTsBuild", "copy:modules", "_setupModules"]);
        grunt.registerTask("_setupModules", "Set up the modules package", function () {

            // rename the main file
            fs.renameSync(path.join(config.modulesOutput, "WinJS.js"), path.join(config.modulesOutput, "WinJS-custom.js"));

            // require.js copies some undesirable source files over
            var toRemove = [
                "_build.js",
                "WinJS/Utilities/_TelemetryImpl.js"
            ];
            toRemove.forEach(function (item) {
                fs.removeSync(path.join(config.modulesOutput, item));
            });

            var requirejs = grunt.config.get("requirejs");

            var pkgRoot = "node_modules/winjs-modules/";
            var requireConfig = {
                baseUrl: ".",
                name: "WinJS-custom",
                deps: ["amd"],
                optimize: "none",
                useStrict: true,
                out: "bin/js/WinJS.js",
                wrap: {
                    start: requirejs.header("WinJS-custom", []),
                    end: requirejs.footer("WinJS-custom"),
                },
                paths: {
                    "amd": pkgRoot + "amd",
                    "require-style": pkgRoot + "require-style",
                    "require-json": pkgRoot + "require-json",
                    "WinJS": pkgRoot + "WinJS"
                },
                findNestedDependencies: true
            };
            var output = JSON.stringify(requireConfig, null, 4);
            fs.writeFileSync(path.join(config.modulesOutput, "example.config.js"), output);
        });

    };
})();
