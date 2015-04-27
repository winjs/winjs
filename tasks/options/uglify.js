// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

(function () {
    "use strict";
    var config = require("../../config.js");
    module.exports = {
        options: {
            sourceMap: true,
            banner: config.copyright
        },
        singleFile: {
            src: [config.desktopOutput + "js/base.js", config.desktopOutput + "js/ui.js"],
            dest: config.desktopOutput + "js/WinJS.min.js"
        }
    };
})();