// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    // do this to avoid spidering the source tree six times.
    var filesToCheck = [];
    filesToCheck = filesToCheck.concat(config.uiStringsFiles);

    module.exports = {
        options: {
            root: 'src'
        },
        source: {
            src: filesToCheck
        }
    };
})();