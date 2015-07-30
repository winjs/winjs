// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        
        // git clean -f
        // Remove files that are not tracked
        
        publishWinJsBower: {
            options: {
                cwd: config.winjsBowerRepo,
				force: true
            }
        },
        publishLocalizationBower: {
            options: {
                cwd: config.localizationBowerRepo,
                force: true
            }
        }
    };
})();