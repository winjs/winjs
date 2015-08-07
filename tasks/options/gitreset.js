// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        
        // git reset --hard
        // Remove all staged and unstaged changes to tracked files
        
        publishWinJsBower: {
            options: {
                cwd: config.winjsBowerRepo,
				mode: 'hard'
            }
        },
        
        publishLocalizationBower: {
            options: {
                cwd: config.localizationBowerRepo,
                mode: 'hard'
            }
        }
    };
})();