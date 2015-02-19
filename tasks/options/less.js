// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        tests: {
            files: [
                {
                    cwd: "tests/",
                    src: "**/*.less",
                    ext: ".less.css",
                    dest: config.testsOutput,
                    expand: true
                }
            ]
        }
    };
})();