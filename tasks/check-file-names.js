// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {

        grunt.registerMultiTask("check-file-names", function () {

            var options = this.options({root: 'src'});

            var realFileNames = [];

            grunt.file.recurse(options.root, function (abspath) {
                realFileNames.push(abspath);
            });

            function validateFile(file) {
                if (realFileNames.indexOf(file) === -1) {
                    grunt.fail.warn("Source file in build is not in filesystem:" + file + ". Check casing of filename.");
                }
            }

            this.filesSrc.forEach(validateFile);
        });

    };
})();