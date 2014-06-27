// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TARGET_DESTINATION)/js/WinJS.js" />
(function (global) {
    global.WinJS = global.WinJS || {};
    WinJS.Utilities = WinJS.Utilities || {};
    WinJS.Utilities._writeProfilerMark = function _writeProfilerMark(text) {
        global.msWriteProfilerMark && msWriteProfilerMark(text);
    };
})(this);
WinJS.Utilities._writeProfilerMark("$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) WinJS.js,StartTM");
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        factory();
    }
}(this, function () {