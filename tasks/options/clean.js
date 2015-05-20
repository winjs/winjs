// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        options: {
            force: true
        },
        all: [
            config.desktopOutput,
            config.compiledTsOutput
        ],
        tests: [
            config.testsOutput
        ],
        qunit: [
            config.testsOutput + "TestLib/liveToQ/*.*"
        ],
        strings: [
            config.stringsOutput
        ]
    };
})();