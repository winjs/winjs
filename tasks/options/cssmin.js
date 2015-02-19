// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

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
        }
    };
})();