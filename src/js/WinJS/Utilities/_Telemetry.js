// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Base',
    ], function telemetryInit(exports, _Base) {
    "use strict";

    /// NOTE: This file should be included when NOT building
    /// Microsoft WinJS Framework Package which will be available in Windows Store.
    
    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        _Telemetry: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function _Telemetry_ctor() {
            /// <signature helpKeyword="WinJS.Utilities._Telemetry">
            /// <summary locid="WinJS.Utilities._Telemetry">
            /// Wraps calls to Microsoft.Foundation.Diagnostics WinRT.
            /// This will result in no-op when built outside of Microsoft Framework Package.
            /// </summary>
            /// </signature>
                /* empty */
            }, {
                /* empty */
            }, {
                send: function (name, params) {
                /// <signature helpKeyword="WinJS.Utilities._Telemetry.send">
                /// <summary locid="WinJS.Utilities._Telemetry.send">
                /// Formatter to upload the name/value pair to Asimov in the correct format.
                /// This will result in no-op when built outside of Microsoft Framework Package.
                /// </summary>
                /// <param name="params" type="Object" locid="WinJS.Utilities._Telemetry.send_p:params">
                /// Object of name/value pair items that need to be logged. They can be of type,
                /// bool, int32, string.  Any other type will be ignored.
                /// </param>
                /// </signature>
                    /* empty */
                }
            });
        })
    });
});
