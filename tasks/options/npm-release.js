// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        // Publishes npm packages
        
        publishWinJs: {
            options: {
                root: config.winjsNpmPublishRoot
            }
        },
        
        publishLocalization: {
            options: {
                root: config.localizationNpmPublishRoot
            }
        }
    };
})();