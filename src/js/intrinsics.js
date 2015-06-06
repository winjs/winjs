// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'require-style!less/styles-globalIntrinsics',
    'require-style!less/colors-globalIntrinsics'
], function () {
    "use strict";

    // Suppressing jslint error here - This is usually done by requiring _Global and accessing
    // members on 'window' off the import which would cause this file to be dependent on 'base.js'.
    /* global window */
    var WinJS = window.WinJS;

    // Shared color rule 
    WinJS.UI._Accents.createAccentRule(
        "a,\
         progress",
        [{ name: "color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Shared background-color rule
    WinJS.UI._Accents.createAccentRule(
        "button[type=submit],\
         input[type=submit],\
         option:checked,\
         select[multiple] option:checked",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Shared border-color rule
    WinJS.UI._Accents.createAccentRule(
        "input:not([type]):focus,\
         input[type='']:focus,\
         input[type=text]:focus,\
         input[type=password]:focus,\
         input[type=email]:focus,\
         input[type=number]:focus,\
         input[type=tel]:focus,\
         input[type=url]:focus,\
         input[type=search]:focus,\
         textarea:focus",
        [{ name: "border-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Edge-specific color rule
    WinJS.UI._Accents.createAccentRule(
        "input::-ms-clear:hover:not(:active),\
         input::-ms-reveal:hover:not(:active)",
        [{ name: "color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Edge-specific background-color rule
    WinJS.UI._Accents.createAccentRule(
        "input[type=checkbox]:checked::-ms-check,\
         input::-ms-clear:active,\
         input::-ms-reveal:active",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Webkit-specific background-color rule
    WinJS.UI._Accents.createAccentRule(
        "progress::-webkit-progress-value,\
         .win-ring::-webkit-progress-value",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Mozilla-specific background-color rule
    WinJS.UI._Accents.createAccentRule(
        "progress:not(:indeterminate)::-moz-progress-bar,\
         .win-ring:not(:indeterminate)::-moz-progress-bar",
        [{ name: "background-color", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Edge-specific border-color rule
    WinJS.UI._Accents.createAccentRule(
        "input[type=checkbox]:indeterminate::-ms-check,\
         input[type=checkbox]:hover:indeterminate::-ms-check,\
         input[type=radio]:checked::-ms-check",
        [{ name: "border-color", value: WinJS.UI._Accents.ColorTypes.accent }]);


    // Note the use of background instead of background-color
    // FF slider styling doesn't work with background-color
    // so using background for everything here for consistency

    // Edge-specific background rule
    WinJS.UI._Accents.createAccentRule(
        "input[type=range]::-ms-thumb,\
         input[type=range]::-ms-fill-lower", /* Fill-Lower only supported in IE */
        [{ name: "background", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Webkit-specific background rule
    WinJS.UI._Accents.createAccentRule(
        "input[type=range]::-webkit-slider-thumb",
        [{ name: "background", value: WinJS.UI._Accents.ColorTypes.accent }]);

    // Mozilla-specific background rule
    WinJS.UI._Accents.createAccentRule(
        "input[type=range]::-moz-range-thumb",
        [{ name: "background", value: WinJS.UI._Accents.ColorTypes.accent }]);
});