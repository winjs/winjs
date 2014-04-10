// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function() {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        desktopDark: {
            test: config.desktopOutput + "css/ui-dark.css",
            model: "model-css/ui-dark-model.css"
        }
    };
})();