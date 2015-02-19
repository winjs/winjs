// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var assert = require("assert");

    function rule() {}

    var pointerEvents = [
        'pointerdown',
        'pointerup',
        'pointermove',
        'pointercancel',
        'pointerover',
        'pointerout',
        'pointerenter',
        'pointerleave',
        'MSPointerDown',
        'MSPointerUp',
        'MSPointerMove',
        'MSPointerCancel',
        'MSPointerOver',
        'MSPointerOut',
        'MSPointerEnter',
        'MSPointerLeave'
    ];

    rule.prototype.configure = function (disallowDirectPointerEvents) {
        assert(typeof (disallowDirectPointerEvents) === 'boolean',
            'disallowDirectPointerEvents should be a boolean'
        );

        assert(disallowDirectPointerEvents === true,
            'Unnecessary value of disallowDirectPointerEvents'
        );
    };

    rule.prototype.getOptionName = function () {
        return 'disallowDirectPointerEvents';
    };

    rule.prototype.check = function (file, errors) {
        file.iterateNodesByType(['CallExpression'], function (node) {
            if (node.callee.type === "MemberExpression" && (node.callee.property.name === "addEventListener" || node.callee.property.name === "removeEventListener")) {
                if (node.arguments.length > 0) {
                    var arg = node.arguments[0];
                    if (arg.type === "Literal" && pointerEvents.indexOf(arg.value) !== -1) {
                        errors.add('Direct use of event listener with pointer events', node.loc.start);
                    }
                }
            }

        });
    };

    module.exports = rule;

})();