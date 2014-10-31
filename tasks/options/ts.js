// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        test: {
            src: ["tests/**/*.ts"],
            outDir: config.testsOutput,
            options: {
                target: 'ES5',
                module: 'amd',
                sourceMap: false,
                declaration: false,
                removeComments: false
            }
        },
        src: {
            src: ["src/js/**/*.ts"],
            outDir: config.compiledTsOutput ,
            options: {
                target: 'ES5',
                module: 'amd',
                sourceMap: false,
                noImplicitAny: true,
                declaration: false,
                removeComments: false
            }
        },
    };
})();