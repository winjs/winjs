// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_WinRT'
    ], function telemetryInit(exports, _WinRT) {
    "use strict";

    /// NOTE: This file should be included ONLY when building
    /// Microsoft WinJS Framework Package which will be available in Windows Store.

    /// Make sure to use these hard-coded strings
    var MicrosoftGroup = "4f50731a-89cf-4782-b3e0-dce8c90476ba";
    var MicrosoftKeyword = "0x2000000000000";

    var WinJSProvider = "WinJS-Telemetry-Provider";

    var diagnostics = _WinRT.Windows.Foundation.Diagnostics;
    if (diagnostics) {
      var loggingOption = new diagnostics.LoggingOptions(MicrosoftKeyword);
      var loggingLevel = diagnostics.LoggingLevel.information;
      var channel = new diagnostics.LoggingChannel(WinJSProvider, new diagnostics.LoggingChannelOptions(MicrosoftGroup));
    }

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
        if (diagnostics) {
            var fields = null;
            if (params) {
                fields = diagnostics.LoggingFields();
                Object.keys(params).forEach(function (key) {
                    var value = params[key];
                    switch (typeof value) {
                        case "number":
                            fields.addInt32(key, value);
                            break;
                        case "string":
                            fields.addString(key, value);
                            break;
                        case "boolean":
                            fields.addBoolean(key, value);
                            break;
                        default:
                            // no-op
                            break;
                    }
                });
            }

            channel.logEvent(name, fields, loggingLevel, loggingOption);
        }
    };
});
