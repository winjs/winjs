// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/*
    Plugin Information: https://www.npmjs.org/package/grunt-contrib-jshint
    JSHint Options Information: http://www.jshint.com/docs/options/
    For more explanation of the lint errors JSHint can throw at you please visit http://www.jslinterrors.com.
*/
(function () {
    "use strict";
    var config = require("../../config.js");

    var cloneOptions = function (opt) {
        var temp = {};
        for (var key in opt) {
            temp[key] = opt[key];
        }
        return temp;
    }

    // Options:
    var sharedOptions = {
        force: true, // Report JSHint errors but not fail the task. This enabled temporarily until we can decide on a final configuration and fix remaining errors.
        reporter: "tasks/utilities/jshintreporter.js",
        asi: true, // Suppress warnings about missing semicolons.        
        sub: true, // Suppress warnings about using [] notation when it can be expressed in dot notation.
        expr: true, // Suppress warnings about the use of expressions where expected to see assignments or function calls.
        maxerr: 10000,
        strict: true,
    }

    var buildOptions = cloneOptions(sharedOptions);
    buildOptions.node = true; // Defines globals exposed inside of Node runtime enviornment.    

    var sourceOptions = cloneOptions(sharedOptions);
    sourceOptions.browser = true; // Defines globals exposed by modern browsers, with the exclusion of developer globals like alert and console.        

    module.exports = {
        buildFiles: {
            src: config.lint.buildFiles,
            options: buildOptions,
        },
        srcFiles: {
            src: config.lint.srcFiles,
            options: sourceOptions,
        },
    };
})();


