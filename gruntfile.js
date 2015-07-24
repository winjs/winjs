// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {
        var config = require("./config.js");
        config.grunt = grunt;

        // Strip source files of their BOMs. BOMs will be added at the end of the build
        // by the "add-bom" task.
        grunt.file.preserveBOM = false;

        // Parse custom args
        var args = require("minimist")(process.argv);
        if (args.quiet) {
            grunt.log.write = function () {return grunt.log;};
            grunt.log.writeln = function () {return grunt.log;};
        }

        // Helper function to load the config file
        function loadConfig(path) {
            var glob = require("glob");
            var object = {};
            var key;

            glob.sync("*.js", { cwd: path }).forEach(function (option) {
                key = option.replace(/\.js$/, "");
                object[key] = require(path + option);
            });

            return object;
        }

        // Load task options
        var gruntConfig = loadConfig("./tasks/options/");

        // Package data
        gruntConfig.pkg = grunt.file.readJSON("package.json");

        // Project config
        grunt.initConfig(gruntConfig);

        // Load all grunt-tasks in package.json
        require("load-grunt-tasks")(grunt);

        // Register external tasks
        grunt.loadTasks("tasks/");

        grunt.registerTask("configureStore", function () {
            config.isStorePackage = true;
        });

        // Tasks that drop things in bin/ (should have "_postProcess" as the last task)
        grunt.registerTask("storePackage", ["configureStore", "default"]);
        grunt.registerTask("quick", ["clean", "ts:src", "less", "concat", "onefile:base", "requirejs:ui", "requirejs:intrinsics", "requirejs:tv", "copy:fonts", "_postProcess"]);
        grunt.registerTask("default", ["_preBuild", "onefile:base", "requirejs:ui", "requirejs:intrinsics", "requirejs:tv", "_copyFinal", "replace", "_postProcess"]);

        grunt.registerTask("release", ["lint", "default", "uglify", "cssmin", "_postProcess"]);
        grunt.registerTask("minify", ["uglify", "_postProcess"]);

        // Private tasks (not designed to be used from the command line)
        grunt.registerTask("_preBuild", ["clean", "check-file-names", "ts", "build-qunit", "less", "concat"]);
        grunt.registerTask("_copyFinal", ["copy:tests", "copy:testDeps", "copy:fonts", "copy:intellisense", "copy:strings"]);
        grunt.registerTask("_copyToTsBuild", ["copy:srcjs"]);
        grunt.registerTask("_postProcess", ["line-endings", "add-bom"]);

        // Other tasks
        grunt.registerTask("lint", ["jshint", "jscs"]);
        grunt.registerTask("saucelabs", ["connect:saucelabs", "saucelabs-qunit", "post-tests-results"]);
    };
})();
