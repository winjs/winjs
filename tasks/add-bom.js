// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {

        grunt.registerMultiTask("add-bom", function () {
            var bom = new Buffer([0xef, 0xbb, 0xbf]);
            function addBom(filePath) {
                if (grunt.file.exists(filePath)) {
                    var content = grunt.file.read(filePath, { encoding: null });
                    if (content.length < 3 || content[0] !== 0xef || content[1] !== 0xbb || content[2] !== 0xbf) {
                        grunt.file.write(filePath, Buffer.concat([bom, content]), { encoding: "utf8" });
                    }
                } else {
                    grunt.log.warn("add-bom No such file: " + filePath);
                }
            }

            this.filesSrc.forEach(addBom);
        });
        
    };
})();
