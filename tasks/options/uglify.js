// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function () {
    "use strict";
    var config = require("../../config.js");
    module.exports = {
        options: {
            sourceMap: true,
            banner: config.copyright
        },
        singleFile: {
            src: [config.desktopOutput + "js/WinJS.js"],
            dest: config.desktopOutput + "js/WinJS.min.js"
        }
    };
})();