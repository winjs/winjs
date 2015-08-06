// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {
        
        // Verifies that files begin with a UTF8 BOM. Files without one will not be able to pass the
        // Windows App Certification Kit test.

        grunt.registerMultiTask("check-bom", function () {
            function checkBom(filePath) {
                if (grunt.file.exists(filePath)) {
                    var content = grunt.file.read(filePath, { encoding: null });
                    if (content.length < 3 || content[0] !== 0xef || content[1] !== 0xbb || content[2] !== 0xbf) {
                        grunt.fail.fatal("check-bom File is missing BOM: " + filePath);
                    }
                } else {
                    grunt.log.warn("check-bom No such file: " + filePath);
                }
            }

            this.filesSrc.forEach(checkBom);
        });

    };
})();
