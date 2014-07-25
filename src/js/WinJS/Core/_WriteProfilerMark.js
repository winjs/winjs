// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    './_Global'
], function profilerInit(_Global) {
    "use strict";

    return _Global.msWriteProfilerMark || function () { };
});