// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/* global WinJS */
define([
    'WinJS/Core',
    'WinJS/Promise',
    'WinJS/_Signal',
    'WinJS/Scheduler',
    'WinJS/Utilities',
    'WinJS/Fragments',
    'WinJS/Application',
    'WinJS/Navigation',
    'WinJS/Animations',
    'WinJS/Binding',
    'WinJS/BindingTemplate',
    'WinJS/BindingList',
    'WinJS/Res',
    'WinJS/Pages',
    'WinJS/ControlProcessor',
    'WinJS/Controls/HtmlControl'
    ], function() {
    "use strict";


    WinJS.Namespace.define("WinJS.Utilities", {
        _require: require,
        _define: define
    });

    return WinJS;
});