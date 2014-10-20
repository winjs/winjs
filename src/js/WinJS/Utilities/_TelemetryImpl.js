// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_WinRT'
    ], function telemetryInit(exports, _Base, _BaseUtils, _WinRT) {
    "use strict";

    /// NOTE: This file should be included ONLY when building
    /// Microsoft WinJS Framework Package which will be available in Windows Store.

    /// Make sure to use these hard-coded strings
    var MicrosoftGroup = "4f50731a-89cf-4782-b3e0-dce8c90476ba";
    var MicrosoftKeyword = "0x2000000000000";

    var WinJSProvider = "WinJS-Telemetry-Provider";
    
    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        _Telemetry: _Base.Namespace._lazy(function () {
            var Telemetry = _Base.Class.define(function _Telemetry_ctor() {
            /// <signature helpKeyword="WinJS.Utilities._Telemetry">
            /// <summary locid="WinJS.Utilities._Telemetry">
            /// Wraps calls to Microsoft.Foundation.Diagnostics WinRT.
            /// This will result in no-op when built outside of Microsoft Framework Package.
            /// </summary>
            /// </signature>
              this._diagnostics = _WinRT.Windows.Foundation.Diagnostics;
              if (this._diagnostics) {
                  this._loggingOption = new this._diagnostics.LoggingOptions(MicrosoftKeyword);
                  this._loggingLevel = this._diagnostics.LoggingLevel.information;
                  this._channel = new this._diagnostics.LoggingChannel(WinJSProvider, new this._diagnostics.LoggingChannelOptions(MicrosoftGroup));
                }
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
                      if (this._diagnostics) {
                          var fields = null;
                          if (params) {
                              fields = this._diagnostics.LoggingFields();
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

                          this._channel.logEvent(name, fields, this._loggingLevel, this._loggingOption);
                      }
                 }
            });
            
            return new Telemetry();
        })
    });
});
