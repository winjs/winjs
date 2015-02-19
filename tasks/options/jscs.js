// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        options: {
            config: ".jscsrc",
            reporter: "tasks/utilities/jscsreporter.js"
        },
        buildFiles: {
            src: config.lint.buildFiles,
            options: {
            },
        },
        srcFiles: {
            src: config.lint.srcFiles,
            options: {
                excludeFiles: ["src/js/en-US/ui.prefix.js", "src/js/en-US/ui.suffix.js"]
            },
        },
    };
})();