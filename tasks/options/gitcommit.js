// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        publishWinJsBower: {
            options: {
                cwd: config.winjsBowerRepo,
                message: "Update for WinJS <%= pkg.version %>"
            }
        },
        publishLocalizationBower: {
            options: {
                cwd: config.localizationBowerRepo,
                message: "Update for WinJS <%= pkg.version %>"
            }
        }
    };
})();