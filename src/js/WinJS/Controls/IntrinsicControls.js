// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    '../Utilities/_Hoverable',
    '../_Accents',
    'require-style!less/styles-intrinsic',
    'require-style!less/colors-intrinsic'
], function (_Hoverable, _Accents) {
    "use strict";

    // Shared color rule 
    _Accents.createAccentRule(
        ".win-link,\
         .win-progress-bar,\
         .win-progress-ring,\
         .win-ring",
        [{ name: "color", value: _Accents.ColorTypes.accent }]);

    // Shared background-color rule
    _Accents.createAccentRule(
        "::selection,\
         .win-button.win-button-primary,\
         .win-dropdown option:checked,\
         select[multiple].win-dropdown option:checked",
        [{ name: "background-color", value: _Accents.ColorTypes.accent }]);

    // Shared border-color rule
    _Accents.createAccentRule(
        ".win-textbox:focus,\
         .win-textarea:focus,\
         .win-textbox:focus:hover,\
         .win-textarea:focus:hover",
        [{ name: "border-color", value: _Accents.ColorTypes.accent }]);

    // Edge-specific color rule
    _Accents.createAccentRule(
        ".win-textbox::-ms-clear:hover:not(:active),\
         .win-textbox::-ms-reveal:hover:not(:active)",
        [{ name: "color", value: _Accents.ColorTypes.accent }]);

    // Edge-specific background-color rule
    _Accents.createAccentRule(
        ".win-checkbox:checked::-ms-check,\
         .win-textbox::-ms-clear:active,\
         .win-textbox::-ms-reveal:active",
        [{ name: "background-color", value: _Accents.ColorTypes.accent }]);

    // Webkit-specific background-color rule
    _Accents.createAccentRule(
        ".win-progress-bar::-webkit-progress-value,\
         .win-progress-ring::-webkit-progress-value,\
         .win-ring::-webkit-progress-value",
        [{ name: "background-color", value: _Accents.ColorTypes.accent }]);

    // Mozilla-specific background-color rule
    _Accents.createAccentRule(
        ".win-progress-bar:not(:indeterminate)::-moz-progress-bar,\
         .win-progress-ring:not(:indeterminate)::-moz-progress-bar,\
         .win-ring:not(:indeterminate)::-moz-progress-bar",
        [{ name: "background-color", value: _Accents.ColorTypes.accent }]);

    // Edge-specific border-color rule
    _Accents.createAccentRule(
        ".win-checkbox:indeterminate::-ms-check,\
         .win-checkbox:hover:indeterminate::-ms-check,\
         .win-radio:checked::-ms-check",
        [{ name: "border-color", value: _Accents.ColorTypes.accent }]);


    // Note the use of background instead of background-color
    // FF slider styling doesn't work with background-color
    // so using background for everything here for consistency

    // Edge-specific background rule
    _Accents.createAccentRule(
        ".win-slider::-ms-thumb,\
         .win-slider::-ms-fill-lower", /* Fill-Lower only supported in IE */
        [{ name: "background", value: _Accents.ColorTypes.accent }]);

    // Webkit-specific background rule
    _Accents.createAccentRule(
        ".win-slider::-webkit-slider-thumb",
        [{ name: "background", value: _Accents.ColorTypes.accent }]);

    // Mozilla-specific background rule
    _Accents.createAccentRule(
        ".win-slider::-moz-range-thumb",
        [{ name: "background", value: _Accents.ColorTypes.accent }]);
});