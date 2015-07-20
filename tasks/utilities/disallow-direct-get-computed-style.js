// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";
    
    // Firefox's implementation of getComputedStyle returns null when called within
    // an iframe that is display:none. This is a bug which violates the getComputedStyle
    // contract: https://bugzilla.mozilla.org/show_bug.cgi?id=548397
    // _ElementUtilities._getComputedStyle is a helper which is guaranteed to return an
    // object whose keys map to strings.
    //
    // Consequently, we should favor calling _ElementUtilities._getComputedStyle over
    // calling getComputedStyle directly.

    var assert = require("assert");

    function rule() {}

    rule.prototype.configure = function (disallowDirectGetComputedStyle) {
        assert(typeof (disallowDirectGetComputedStyle) === 'boolean',
            'disallowDirectGetComputedStyle should be a boolean'
        );

        assert(disallowDirectGetComputedStyle === true,
            'Unnecessary value of disallowDirectGetComputedStyle'
        );
    };

    rule.prototype.getOptionName = function () {
        return 'disallowDirectGetComputedStyle';
    };

    rule.prototype.check = function (file, errors) {
        file.iterateNodesByType(['CallExpression'], function (node) {
            if (node.callee.type === "MemberExpression" && node.callee.property.name === "getComputedStyle") {
                errors.add('Direct use of getComputedStyle is not allowed. Instead use _ElementUtilities._getComputedStyle.', node.loc.start);
            }

        });
    };

    module.exports = rule;

})();