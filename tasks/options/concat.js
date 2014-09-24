// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
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