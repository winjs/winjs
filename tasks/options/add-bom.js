// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        bin: {
            files: [
                {
                    cwd: config.outputFolder,
                    src: "**/*.+(js|css|htm|html)",
                    expand: true,
                    nocase: true
                }
            ]
        }
    };
})();