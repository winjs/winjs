// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");
    
    function searchDirectory(directoryPath) {
        return {
            cwd: directoryPath,
            src: "**/*.+(js|css|htm|html)",
            expand: true,
            nocase: true
        };
    }

    module.exports = {
        publishWinJs: {
            files: [
                searchDirectory(config.winjsPublishRoot),
                searchDirectory(config.winjsBowerRepo)
            ]
        },
        publishLocalization: {
            files: [
                searchDirectory(config.localizationPublishRoot),
                searchDirectory(config.localizationBowerRepo)
            ]
        }
    };
})();