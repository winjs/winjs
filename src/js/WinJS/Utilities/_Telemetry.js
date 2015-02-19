// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'exports'
    ], function telemetryInit(exports) {
    "use strict";

    /// NOTE: This file should be included when NOT building
    /// Microsoft WinJS Framework Package which will be available in Windows Store.

    exports.send = function (name, params) {
    /// <signature helpKeyword="WinJS._Telemetry.send">
    /// <summary locid="WinJS._Telemetry.send">
    /// Formatter to upload the name/value pair to Asimov in the correct format.
    /// This will result in no-op when built outside of Microsoft Framework Package.
    /// </summary>
    /// <param name="params" type="Object" locid="WinJS._Telemetry.send_p:params">
    /// Object of name/value pair items that need to be logged. They can be of type,
    /// bool, int32, string.  Any other type will be ignored.
    /// </param>
    /// </signature>
        /* empty */
    };
});
