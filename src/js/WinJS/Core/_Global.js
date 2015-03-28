// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([], function () {
    "use strict";
    
    // Appease jshint
    /* global window, self, global */
    
    var globalObject =
        typeof window !== 'undefined' ? window :
        typeof self !== 'undefined' ? self :
        typeof global !== 'undefined' ? global :
        {};
    return globalObject;
});
