// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function() {
    "use strict";
    var config = require("../../config.js");
    module.exports = {
        baseDesktop: {
            src: [config.desktopOutput + "js/base.js"],
            dest: config.desktopOutput + "js/base.js"
        },
        basePhone: {
            src: [config.phoneOutput + "js/base.js"],
            dest: config.phoneOutput + "js/base.min.js"
        },
        uiDesktop: {
            src: [config.desktopOutput + "js/ui.js"],
            dest: config.desktopOutput + "js/ui.js"
        },
        uiPhone: {
            src: [config.phoneOutput + "js/ui.js"],
            dest: config.phoneOutput + "js/ui.min.js"
        }
    };
})();