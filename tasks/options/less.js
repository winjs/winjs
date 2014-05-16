// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        desktopDark: {
            src: ["src/less/desktop-dark.less"],
            dest: config.desktopOutput + "css/ui-dark.css"
        },
        desktopLight: {
            src: ["src/less/desktop-light.less"],
            dest: config.desktopOutput + "css/ui-light.css"
        },
        phoneDark: {
            src: ["src/less/phone-dark.less"],
            dest: config.phoneOutput + "css/ui-dark.css"
        },
        phoneLight: {
            src: ["src/less/phone-light.less"],
            dest: config.phoneOutput + "css/ui-light.css"
        },
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