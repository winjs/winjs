// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var assert = require("assert");
    var trailingRE = /\S\s+$/;

    function rule() {};

    rule.prototype.configure = function (disallowTrailingWhitespace) {
        assert(typeof (disallowTrailingWhitespace) === 'boolean',
            'disallowTrailingWhitespace should be a boolean'
        );

        assert(disallowTrailingWhitespace === true,
            'Unnecessary value of disallowTrailingWhitespace'
        );
    };

    rule.prototype.getOptionName = function () {
        return 'disallowTrailingWhitespaceAllowEmptyLines';
    };

    rule.prototype.check = function (file, errors) {
        file.getLines().forEach(function (line, index) {
            if (trailingRE.test(line)) {
                errors.add('Illegal trailing whitespace', index + 1, line.length);
            }
        });
    };

    module.exports = rule;

})();