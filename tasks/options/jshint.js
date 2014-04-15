// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/*    
    For more explanation of the lint errors JSHint can throw at you please visit http://www.jslinterrors.com.
*/
(function () {
    "use strict";
    var config = require("../../config.js");

    /*
     Options specific to configuration of Grunt JSHint plugin. 
     https://www.npmjs.org/package/grunt-contrib-jshint
    */
    var options = {
        extensions: undefined, // A list of non-dot-js extensions to check.
        force: undefined, // Set force to true to report JSHint errors, but not fail the task.          
        ignores: undefined,// Array of files and dirs to ignore. This will override our .jshintignore file if set and does not merge.
        jshintrc: "tasks/utilities/.jshintrc", // Path to the JSHint remote config file we use, it determines which JSHint rules are enforced.
        reporter: "tasks/utilities/jshintreporter.js", // Path to the custom reporter we use, default is the built-in Grunt reporter. 
        reporterOutput: undefined, // If reporterOutput is specified then all output will be written to the given filepath instead of printed to stdout.        
    };

    module.exports = {
        buildFiles: {
            src: config.lint.buildFiles,
            options: options,
        },
        srcFiles: {
            src: config.lint.srcFiles,
            options: options,
        },
    };
})();


