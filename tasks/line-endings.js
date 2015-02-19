// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {

        grunt.registerMultiTask("line-endings", function () {
            function fixLineEndings(filePath) {
                if (grunt.file.exists(filePath)) {
                    var content = grunt.file.read(filePath, { encoding: "utf-8" });
                    content = content.replace(/\r\n|\n|\r/g, "\r\n");
                    grunt.file.write(filePath, content, { encoding: "utf8" });
                } else {
                    grunt.log.warn("line-endings No such file: " + filePath);
                }
            }

            this.filesSrc.forEach(fixLineEndings);
        });

    };
})();
