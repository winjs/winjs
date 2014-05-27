// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TARGET_DESTINATION)/js/base.js" />
/// <reference path="ms-appx://$(TARGET_DESTINATION)/js/ui.js" />
WinJS.Utilities._writeProfilerMark("$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) ui.js,StartTM");
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./base'], factory);
    } else {
        factory();
    }
}(this, function () {

    var require = WinJS.Utilities._require;
    var define = WinJS.Utilities._define;
