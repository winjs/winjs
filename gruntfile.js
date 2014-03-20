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

        "src/js/uicollections/references.js",
        "src/js/build/startUI.js",
    var gruntConfig = {};

    // Package data
    gruntConfig.pkg = grunt.file.readJSON("package.json");

    // Load task options
    grunt.util._.extend(gruntConfig, loadConfig('./tasks/options/'));
              { expand: true, flatten: true, src: [desktopOutput + "css/*.css"], dest: desktopOutput + "css/" },
              { expand: true, flatten: true, src: [phoneOutput + "css/*.css"], dest: phoneOutput + "css/" },

    // Project config
    grunt.initConfig(gruntConfig);

    // Load all grunt-tasks in package.json
    require("load-grunt-tasks")(grunt);

    // Register external tasks
    grunt.loadTasks("tasks/");

    // Task alias's
    grunt.registerTask("default", ["clean", "less", "concat", "copy", "replace"]);
    grunt.registerTask("css", ["less"]);
    grunt.registerTask("base", ["clean:base", "concat:baseDesktop", "concat:basePhone", "concat:baseStringsDesktop", "concat:baseStringsPhone", "replace"]);
    grunt.registerTask("ui", ["clean:ui", "concat:uiDesktop", "concat:uiPhone", "concat:uiStringsDesktop", "concat:uiStringsPhone", "replace", "less"]);
}