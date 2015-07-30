// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        publishWinJs: {
            options: {
                archive: config.winjsPublishRoot + 'winjs.zip'
            },
            files: [{
                expand: true,
                cwd: config.winjsNpmPublishRoot,
                src: ["**"]
            }]
        },
        publishLocalization: {
            options: {
                archive: config.localizationPublishRoot + 'winjs-localization.zip'
            },
            files: [{
                expand: true,
                cwd: config.localizationNpmPublishRoot,
                src: ["**"]
            }]
        }
    };
})();