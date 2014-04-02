// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
var config = require("../../config.js");

module.exports = {
    addBomDesktop: {
        src: config.desktopOutput + "**/*.*",
        options: {
            add: true
        }
    },
    addBomPhone: {
        src: config.phoneOutput + "**/*.*",
        options: {
            add: true
        }
    },
    addBomTests: {
        src: config.testsOutput + "**/*.*",
        options: {
            add: true
        }
    }
}