// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Base',
    ], function telemetryInit(exports, _Base) {
    "use strict";

    /// NOTE: This file should be included when NOT building
    /// Microsoft WinJS Framework Package which will be available in Windows Store.
    
    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        _telemetry: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function _telemetry_ctor() {
            /// <signature helpKeyword="WinJS.Utilities._telemetry">
            /// <summary locid="WinJS.Utilities._telemetry">
            /// Wraps calls to Microsoft.Foundation.Diagnostics WinRT.
            /// This will result in no-op when built outside of Microsoft Framework Package.
            /// </summary>
            /// </signature>
                    /* empty */
              }, {
                  /* empty */
              }, {
                 send: function (name, params) {
                 /// <signature helpKeyword="WinJS.Utilities._telemetry.send">
                 /// <summary locid="WinJS.Utilities._telemetry.send">
                 /// Formatter to upload the name/value pair to Asimov in the correct format.
                 /// This will result in no-op when built outside of Microsoft Framework Package.
                 /// </summary>
                 /// <param name="params" type="Object" locid="WinJS.Utilities._telemetry.send_p:params">
                 /// Array of name/value pair items that need to be logged. They can be of type,
                 /// bool, int32, string.  Any other type will be ignored.
                 /// </param>
                 /// </signature>
                     /* empty */
                 }
            });
        })
    });
});
