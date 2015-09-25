// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

(function () {
    "use strict";
    var config = require("../../config.js");
    module.exports = {
        options: {
            sourceMap: true,
            banner: config.copyright
        },
        base: {
            src: [config.desktopOutput + "js/base.js"],
            dest: config.desktopOutput + "js/base.min.js"
        },
        ui: {
            src: [config.desktopOutput + "js/ui.js"],
            dest: config.desktopOutput + "js/ui.min.js"
        },
        intrinsics: {
            src: [config.desktopOutput + "js/intrinsics.js"],
            dest: config.desktopOutput + "js/intrinsics.min.js"
        },
        mediaplayer: {
            src: [config.desktopOutput + "js/mediaplayer.js"],
            dest: config.desktopOutput + "js/mediaplayer.min.js"
        }
    };
})();