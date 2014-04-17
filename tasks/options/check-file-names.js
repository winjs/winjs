// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    // do this to avoid spidering the source tree six times.
    var filesToCheck = [];
    filesToCheck = filesToCheck.concat(config.baseJSFiles);
    filesToCheck = filesToCheck.concat(config.baseJSFilesPhone);
    filesToCheck = filesToCheck.concat(config.baseStringsFiles);
    filesToCheck = filesToCheck.concat(config.uiJSFiles);
    filesToCheck = filesToCheck.concat(config.uiJSFilesPhone);
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