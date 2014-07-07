// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {
        var config = require("./config.js");
        config.grunt = grunt;

        // Make sure that Grunt doesn't remove BOM from our utf8 files
        // on read
        grunt.file.preserveBOM = true;

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

        // Task aliases
        grunt.registerTask("default", ["clean", "check-file-names", "build-qunit", "less", "concat", "build", "copy", "replace"]);
        grunt.registerTask("release", ["jshint", "default", "uglify"]);
        grunt.registerTask("css", ["less"]);
        grunt.registerTask("base", ["clean:base", "concat:baseDesktop", "concat:basePhone", "concat:baseStringsDesktop", "concat:baseStringsPhone", "replace"]);
        grunt.registerTask("ui", ["clean:ui", "concat:uiDesktop", "concat:uiPhone", "concat:uiStringsDesktop", "concat:uiStringsPhone", "replace", "less"]);
        grunt.registerTask("lint", ["jshint"]);
        grunt.registerTask("minify", ["uglify"]);
        grunt.registerTask("build", ["requirejs:base", "requirejs:basePhone", "requirejs:ui", "requirejs:uiPhone", "requirejs:singleFile"]);
        grunt.registerTask("modules", ["clean:modules", "requirejs:publicModules", "replace:base"]);
        grunt.registerTask("saucelabs", ["connect:saucelabs", "saucelabs-qunit", "post-tests-results"]);
    };
})();
