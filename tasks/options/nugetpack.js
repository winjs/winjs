// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        publishWinJs: {
            src: 'WinJS.nuspec',
            dest: config.winjsPublishRoot,
            options: {
                version: '<%= pkg.version %>'
            }
        },
        publishLocalization: {
            src: 'src/strings/WinJS-Localization.nuspec',
            dest: config.localizationPublishRoot,
            options: {
                version: '<%= pkg.version %>'
            }
        }
    };
})();