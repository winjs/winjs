// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

//High Level
//  - Injects and maintains a dynamic stylesheet to style elements for user
//    accent colors.The RGB values of the colors are not available until run
//    time and may also change at any time during run time.
//	- Allows CSS syntax styling of elements to apply user accent colors via
//    code, e.g.:
//      Accents.createAccentRule(".myControl input", [
//          { name: "color", value: Accents.ColorTypes.accent },
//          { name: "border-color", value: Accents.ColorTypes.accent }
//      ]);
//      Note: The Accents Module is currently only available internally to
//            WinJS controls.
//	- Supports
//      - Primary Accent color
//      - Redline specific accent shades
//  - Picks the right shading depending on ui- light or ui- dark

//Theme detection
// Since accent color shades vary depending on the theme of the app
// (light vs.dark), we first need to detect which theme is currently applied.
// This detection is done once, during app launch, and the scenario where the
// theme stylesheet is swapped at runtime is not supported.
// The ui- dark stylesheet contains the following rule that ui- light does not:
//      winjs - themedetection - tag {
//          opacity: 0;
//      }
// The accent color implementation injects an element <winjs-themedetection-tag />
// into the < head > at launch and examines if the computed opacity is 0 to see if
// we are in the dark theme.This tag is removed after examination.

//Specificity Concerns
// WinJS apps headers look like this:
//  <head>
//      <link href="ui-dark.css" rel= "stylesheet" />
//      <script src="base.js"></script>
//      <script src="ui.js"></script>
//      <link href="myApp.css" rel="stylesheet" />
//      <script src="myApp.js"></script>
//  </head>

//The dynamic stylesheet is always on the bottom of the head section of the
// document, which means that it will trump WinJS and app developer styles that
// have the same specificity.This is intended as we consider accent colors as
// part of a control's feature implementation. If the app developer wants to
// forcefully overwrite the accent color of a specific element, they are expected
// to write a more specific selector.

//Availability
// Real accent colors are only available when WinRT is present.We depend on the
// _WinRT.Windows.UI.ViewManagement.UISettings.colorValuesChanged event to
// set/update the accent colors.
// When WinRT is unavailable, we use a hard- coded value as the accent color as
// a fallback.WinJS doesn’t currently support a way to change this fallback value.

//Implementation
// The Accent Color module injects a dynamic stylesheet into the head of the
// document and updates that style when new accent rules are added.It batches
// updates so that multiple, synchronous additions only trigger one stylesheet
// rewrite.The full implementation consists of many, many string concatenations
// which are much better documented in the actual source code.

import _Global = require("./Core/_Global");
import _WinRT = require("./Core/_WinRT");

import _Base = require("./Core/_Base");
import _BaseUtils = require("./Core/_BaseUtils");
import _ElementUtilities = require('./Utilities/_ElementUtilities');

var Constants = {
    accentStyleId: "WinJSAccentsStyle",
    themeDetectionTag: "winjs-themedetection-tag",

    hoverSelector: "html.win-hoverable",
    lightThemeSelector: ".win-ui-light",
    darkThemeSelector: ".win-ui-dark"
};

var CSSSelectorTokens = [".", "#", ":"];

var UISettings: _WinRT.Windows.UI.ViewManagement.UISettings = null;
var colors: string[] = [];
var isDarkTheme = false;
var rules: { selector: string; props: { name: string; value: ColorTypes; }[]; }[] = [];
var writeRulesTOHandle = -1;

// Public APIs
//

// Enum values align with the colors array indices
export enum ColorTypes {
    accent = 0,
    listSelectRest = 1,
    listSelectHover = 2,
    listSelectPress = 3,
    _listSelectRestInverse = 4,
    _listSelectHoverInverse = 5,
    _listSelectPressInverse = 6,
}

export function createAccentRule(selector: string, props: { name: string; value: ColorTypes; }[]) {
    rules.push({ selector: selector, props: props });
    scheduleWriteRules();
}

// extension GS, 2015-09-04 : individual accent color!
//
var uiUserColor: _WinRT.Windows.UI.Color;
export function setAccentColor(_r: number, _g: number, _b: number) {
    var uiColor: _WinRT.Windows.UI.Color = { r: _r, g: _g, b: _b, a: 255 };
    uiUserColor = uiColor;
    var accent = colorToString(uiUserColor, 1);
    if (colors[0] === accent) {
        return;
    }
    // Establish colors
    // The order of the colors align with the ColorTypes enum values
    colors.length = 0;
    colors.push(accent, colorToString(uiColor, (isDarkTheme ? 0.6 : 0.4)), colorToString(uiColor, (isDarkTheme ? 0.8 : 0.6)), colorToString(uiColor, (isDarkTheme ? 0.9 : 0.7)), colorToString(uiColor, (isDarkTheme ? 0.4 : 0.6)), colorToString(uiColor, (isDarkTheme ? 0.6 : 0.8)), colorToString(uiColor, (isDarkTheme ? 0.7 : 0.9)));
    scheduleWriteRules();
}

// Private helpers
//

function scheduleWriteRules() {
    if (rules.length === 0 || writeRulesTOHandle !== -1) {
        return;
    }
    writeRulesTOHandle = _BaseUtils._setImmediate(() => {
        writeRulesTOHandle = -1;
        cleanup();

        var inverseThemeSelector = isDarkTheme ? Constants.lightThemeSelector : Constants.darkThemeSelector;
        var inverseThemeHoverSelector = Constants.hoverSelector + " " + inverseThemeSelector;

        var style = _Global.document.createElement("style");
        style.id = Constants.accentStyleId;
        style.textContent = rules.map(rule => {
            // example rule: { selector: "  .foo,   html.win-hoverable   .bar:hover ,  div:hover  ", props: [{ name: "color", value: 0 }, { name: "background-color", value: 1 } }

            var body = "  " + rule.props.map(prop => prop.name + ": " + colors[prop.value] + ";").join("\n  ");
            // body = color: *accent*; background-color: *listSelectHover*

            var selectorSplit = rule.selector.split(",").map(str => sanitizeSpaces(str)); // [".foo", ".bar:hover", "div"]
            var selector = selectorSplit.join(",\n"); // ".foo, html.win-hoverable .bar:hover, div:hover"
            var css = selector + " {\n" + body + "\n}";
            // css = .foo, html.win-hoverable .bar:hover, div:hover { *body* }

            // Inverse Theme Selectors
            var isThemedColor = rule.props.some(prop => prop.value !== ColorTypes.accent)
            if (isThemedColor) {
                var inverseBody = "  " + rule.props.map(prop => prop.name + ": " + colors[(prop.value ? (prop.value + 3) : prop.value)] + ";").join("\n  ");
                // inverseBody = "color: *accent*; background-color: *listSelectHoverInverse"

                var themedSelectors: string[] = [];
                selectorSplit.forEach(sel => {
                    if (sel.indexOf(Constants.hoverSelector) !== -1 && sel.indexOf(inverseThemeHoverSelector) === -1) {
                        themedSelectors.push(sel.replace(Constants.hoverSelector, inverseThemeHoverSelector));
                        var selWithoutHover = sel.replace(Constants.hoverSelector, "").trim();
                        if (CSSSelectorTokens.indexOf(selWithoutHover[0]) !== -1) {
                            themedSelectors.push(sel.replace(Constants.hoverSelector + " ", inverseThemeHoverSelector));
                        }
                    } else {
                        themedSelectors.push(inverseThemeSelector + " " + sel);
                        if (CSSSelectorTokens.indexOf(sel[0]) !== -1) {
                            themedSelectors.push(inverseThemeSelector + sel);
                        }
                    }
                    css += "\n" + themedSelectors.join(",\n") + " {\n" + inverseBody + "\n}";
                });
                // css
                //.foo, html.win-hoverable .bar:hover, div:hover, { *body* } 
                //.win-ui-light .foo,
                //.win-ui-light.foo,
                //html.win-hoverable .win-ui-light .bar:hover,
                //html.win-hoverable .win-ui-light.bar:hover,
                //.win-ui-light div:hover { *inverseBody* }
            }
            return css;
        }).join("\n");
        _Global.document.head.appendChild(style);
    });
}

function handleColorsChanged() {
    var uiColor;
    if (typeof uiUserColor !== "undefined") {
        uiColor = uiUserColor;
    } else {
        var uiColorType = _WinRT.Windows.UI.ViewManagement.UIColorType;
        uiColor = UISettings.getColorValue(uiColorType.accent);
    }
    var accent = colorToString(uiColor, 1);
    if (colors[0] === accent) {
        return;
    }

    // Establish colors
    // The order of the colors align with the ColorTypes enum values
    colors.length = 0;
    colors.push(
        accent,
        colorToString(uiColor, (isDarkTheme ? 0.6 : 0.4)),
        colorToString(uiColor, (isDarkTheme ? 0.8 : 0.6)),
        colorToString(uiColor, (isDarkTheme ? 0.9 : 0.7)),
        colorToString(uiColor, (isDarkTheme ? 0.4 : 0.6)),
        colorToString(uiColor, (isDarkTheme ? 0.6 : 0.8)),
        colorToString(uiColor, (isDarkTheme ? 0.7 : 0.9)));

    scheduleWriteRules();
}

function colorToString(color: _WinRT.Windows.UI.Color, alpha: number) {
    return "rgba(" + color.r + "," + color.g + "," + color.b + "," + alpha + ")";
}

function sanitizeSpaces(str: string) {
    return str.replace(/  /g, " ").replace(/  /g, " ").trim();
}

function cleanup() {
    var style = _Global.document.head.querySelector("#" + Constants.accentStyleId);
    style && style.parentNode.removeChild(style);
}

function _reset() {
    rules.length = 0;
    cleanup();
}

// Module initialization
//
    
// Figure out color theme
var tag = _Global.document.createElement(Constants.themeDetectionTag);
_Global.document.head.appendChild(tag);
var cs = _ElementUtilities._getComputedStyle(tag);
isDarkTheme = cs.opacity === "0";
tag.parentElement.removeChild(tag);

try {
    UISettings = new _WinRT.Windows.UI.ViewManagement.UISettings();
    UISettings.addEventListener("colorvalueschanged", handleColorsChanged);
    handleColorsChanged();
} catch (e) {
    // No WinRT - use hardcoded blue accent color
    // The order of the colors align with the ColorTypes enum values
    colors.push(
        "rgb(0, 120, 215)",
        "rgba(0, 120, 215, " + (isDarkTheme ? "0.6" : "0.4") + ")",
        "rgba(0, 120, 215, " + (isDarkTheme ? "0.8" : "0.6") + ")",
        "rgba(0, 120, 215, " + (isDarkTheme ? "0.9" : "0.7") + ")",
        "rgba(0, 120, 215, " + (isDarkTheme ? "0.4" : "0.6") + ")",
        "rgba(0, 120, 215, " + (isDarkTheme ? "0.6" : "0.8") + ")",
        "rgba(0, 120, 215, " + (isDarkTheme ? "0.7" : "0.9") + ")");
}

// Publish to WinJS namespace
var toPublish = {
    ColorTypes: ColorTypes,
    createAccentRule: createAccentRule,
    setAccentColor: setAccentColor,
    
    // Exposed for tests    
    _colors: colors,
    _reset: _reset,
    _isDarkTheme: isDarkTheme
};
_Base.Namespace.define("WinJS.UI._Accents", toPublish);
