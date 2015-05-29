// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'require-style!less/styles-globalIntrinsics',
    'require-style!less/colors-globalIntrinsics'
], function () {
    "use strict";

    WinJS.UI._Accents.createAccentRule(
        "a,\
         progress",
        [{ name: "color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "button[type=submit],\
         input[type=submit],\
         select option:checked",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input:focus,\
         textarea:focus,\
         input:focus:hover,\
         textarea:focus:hover",
        [{ name: "border-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input::-ms-clear:hover:not(:active),\
         input::-ms-reveal:hover:not(:active)",
        [{ name: "color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input[type=checkbox]:checked::-ms-check,\
         input::-ms-clear:active,\
         input::-ms-reveal:active",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "progress::-webkit-progress-value,\
         progress::-webkit-progress-value,\
         .win-ring::-webkit-progress-value",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "progress:not(:indeterminate)::-moz-progress-bar,\
         progress:not(:indeterminate)::-moz-progress-bar,\
         .win-ring:not(:indeterminate)::-moz-progress-bar",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input[type=checkbox]:indeterminate::-ms-check,\
         input[type=checkbox]:hover:indeterminate::-ms-check,\
         input[type=radio]:checked::-ms-check",
        [{ name: "border-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input[type=range]::-ms-thumb,\
         input[type=range]::-ms-fill-lower", /* Fill-Lower only supported in IE */
        [{ name: "background", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input[type=range]::-webkit-slider-thumb",
        [{ name: "background", value: WinJS.UI._Accents.ColorTypes.accent }]);

    WinJS.UI._Accents.createAccentRule(
        "input[type=range]::-moz-range-thumb",
        [{ name: "background", value: WinJS.UI._Accents.ColorTypes.accent }]);
});