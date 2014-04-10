// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module.exports = function(grunt, options) {
    "use strict";

    var csstest = require("./utilities/css-compare.js");
    var chalk = require("chalk");
    var fs = require("fs");

    grunt.registerMultiTask("css-compare", "Compare CSS files", function () {
        if (!this.data.model)
            throw new Error("model file must be specified");
        if (!this.data.test)
            throw new Error("test file must be specified");

        var cssA = fs.readFileSync(this.data.model, {encoding: "utf-8"});
        var cssB = fs.readFileSync(this.data.test, {encoding: "utf-8"});

        var diff = csstest(cssA, cssB);

        var errorCount = 0;
        for (var i in diff)
        {
            if (diff[i].substr)
            {
                grunt.log.error(chalk.green(i) + ": " + diff[i]);
                ++errorCount;
                continue;
            }

            for (var j in diff[i])
            {
                grunt.log.error(chalk.green(i) + ": " + chalk.cyan(j) + ": " + diff[i][j]);
                ++errorCount;
            }
        }

        if (errorCount > 0)
            grunt.warn(errorCount + " diffs found between styles.");
    });
};