// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/*
    For more explanation of the lint errors JSHint can throw at you please visit http://www.jslinterrors.com.
*/
(function () {
    "use strict";
    var config = require("../../config.js");
    var fs = require("fs");

    var jshintrc = fs.readFileSync(".jshintrc", "utf-8");
    var options = (new Function("return (" + jshintrc + ")"))(); //jshint ignore:line

    /*
     Options specific to configuration of Grunt JSHint plugin.
     https://www.npmjs.org/package/grunt-contrib-jshint
    */
    options.reporter = "tasks/utilities/jshintreporter.js"; // Path to the custom reporter we use, default is the built-in Grunt reporter.

    module.exports = {
        options: options,
        buildFiles: {
            src: config.lint.buildFiles,
            options: {
                node: true
            },
        },
        srcFiles: {
            src: config.lint.srcFiles,
            options: {
            },
        },
    };
})();


