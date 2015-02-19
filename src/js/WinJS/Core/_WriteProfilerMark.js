// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    './_Global'
], function profilerInit(_Global) {
    "use strict";

    return _Global.msWriteProfilerMark || function () { };
});