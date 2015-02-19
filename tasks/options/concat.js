// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        uiStringsDesktop: {
            src: config.uiStringsFiles,
            dest: config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js",
            nonull: true
        }
    };
})();