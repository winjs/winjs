// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function () {
    "use strict";
    var config = require("../../config.js");
    module.exports = {
        options: {
            banner: config.copyright
        },
        desktop: {
            expand: true,
            cwd: config.desktopOutput + "css/",
            src: ["*.css", "!*.min.css"],
            dest: config.desktopOutput + "css/",
            ext: ".min.css"
        },
        phone: {
            expand: true,
            cwd: config.phoneOutput + "css/",
            src: ["*.css", "!*.min.css"],
            dest: config.phoneOutput + "css/",
            ext: ".min.css"
        }
    };
})();