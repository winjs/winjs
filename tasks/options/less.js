// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
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