// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
var config = require("../../config.js");

module.exports = {
    build: {
        src: ["src/ts/**/*.ts"],
        reference: "src/ts/reference.ts",
        outDir: config.tsOutput,
        options: {
            target: 'ES5',
            module: 'amd',
            sourceMap: false,
            declaration: false,
            removeComments: false
        }
    }
}