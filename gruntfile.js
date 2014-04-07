// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

module.exports = function (grunt) {
    var config = require("./config.js");

    // Make sure that Grunt doesn't remove BOM from our utf8 files
    // on read
    grunt.file.preserveBOM = true;

    // Helper function to load the config file
    function loadConfig(path) {
      var glob = require('glob');
      var object = {};
      var key;

      glob.sync('*', {cwd: path}).forEach(function(option) {
        key = option.replace(/\.js$/,'');
        object[key] = require(path + option);
      });

      return object;
    }

    // Load task options
    var gruntConfig = loadConfig('./tasks/options/');

    // Package data
    gruntConfig.pkg = grunt.file.readJSON("package.json");

    // jshint
    gruntConfig.jshint = {
      options: {
        // set to true so we don't stop the build if jshint finds something
        force: true,
        maxerr: 10000,
        globalstrict: true,
        node: true
      },
      files: {
        src: [
          'src/**/*.js',
          'test/**/*.js'
        ]
      }
    };

    // Project config
    grunt.initConfig(gruntConfig);

    // Load all grunt-tasks in package.json
    require("load-grunt-tasks")(grunt);

    // Register external tasks
    grunt.loadTasks("tasks/");

    // Task alias's
    grunt.registerTask("default", ["clean", "jshint", "less", "concat", "copy", "replace"]);
    grunt.registerTask("css", ["less"]);
    grunt.registerTask("base", ["clean:base", "concat:baseDesktop", "concat:basePhone", "concat:baseStringsDesktop", "concat:baseStringsPhone", "replace"]);
    grunt.registerTask("ui", ["clean:ui", "concat:uiDesktop", "concat:uiPhone", "concat:uiStringsDesktop", "concat:uiStringsPhone", "replace", "less"]);
}
