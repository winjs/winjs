// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var util = require('util');


    module.exports = function (errorsCollection) {
        errorsCollection.forEach(function (errors) {
            if (!errors.isEmpty()) {
                var filename = errors.getFilename();
                var output = errors.getErrorList().map(function (error) {
                    return util.format('%s: line %d, col %d, %s', filename, error.line, error.column + 1, error.message);
                });
                console.log(output.join('\n'));
            }
        });
    };
})();