/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

(function (global) {
    global.WinJS = global.WinJS || {};
    WinJS.Utilities = WinJS.Utilities || {};
    WinJS.Utilities._writeProfilerMark = function _writeProfilerMark(text) {
        global.msWriteProfilerMark && msWriteProfilerMark(text);
    };
})(this);
