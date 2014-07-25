// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TARGET_DESTINATION)/js/WinJS.js" />
(function (global) {

    (function (factory) {
        if (typeof define === 'function' && define.amd) {
            define([], factory);
        } else {
            global.msWriteProfilerMark && msWriteProfilerMark("$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) base.js,StartTM");
            factory();
            global.msWriteProfilerMark && msWriteProfilerMark("$(TARGET_DESTINATION) $(build.version).$(build.branch).$(build.date) base.js,StopTM");
        }
    }(function () {

