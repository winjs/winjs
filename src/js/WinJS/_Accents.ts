// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
import _Global = require("./Core/_Global");
import _WinRT = require("./Core/_WinRT")

import _Base = require("./Core/_Base");
import _BaseUtils = require("./Core/_BaseUtils");

var Constants = {
    accentStyleId: "WinJSAccentsStyle",
    themeDetectionTag: "winjs",

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

                selectorSplit.forEach(sel => {
                    sel = sanitizeSpaces(sel);

                    if (sel.indexOf(Constants.hoverSelector) !== -1 && sel.indexOf(inverseThemeHoverSelector) === -1) {
                        css += ",\n" + sel.replace(Constants.hoverSelector, inverseThemeHoverSelector);
                        var selWithoutHover = sel.replace(Constants.hoverSelector, "").trim();
                        if (CSSSelectorTokens.indexOf(selWithoutHover[0]) !== -1) {
                            css += ",\n" + sel.replace(Constants.hoverSelector + " ", inverseThemeHoverSelector);
                        }
                    } else {
                        css += "\n" + inverseThemeSelector + " " + sel;
                        if (CSSSelectorTokens.indexOf(sel[0]) !== -1) {
                            css += ",\n" + inverseThemeSelector + sel;
                        }
                    }
                    css += " {\n" + inverseBody + "\n}";
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
        _Global.document.head.insertBefore(style, _Global.document.head.firstChild);
    });
}

function handleColorsChanged() {
    var UIColorType = _WinRT.Windows.UI.ViewManagement.UIColorType;
    var accent = colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 1);
    if (colors[0] === accent) {
        return;
    }

    // Establish colors
    // The order of the colors align with the ColorTypes enum values
    colors.length = 0;
    colors.push(
        accent,
        colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), (isDarkTheme ? 0.6 : 0.4)),
        colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), (isDarkTheme ? 0.8 : 0.6)),
        colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), (isDarkTheme ? 0.9 : 0.7)),
        colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), (isDarkTheme ? 0.4 : 0.6)),
        colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), (isDarkTheme ? 0.6 : 0.8)),
        colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), (isDarkTheme ? 0.7 : 0.9)));

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

_BaseUtils.ready().then(() => {
    // Figure out color theme
    var tag = _Global.document.createElement(Constants.themeDetectionTag);
    _Global.document.body.appendChild(tag);
    var theme = _Global.getComputedStyle(tag).opacity;
    isDarkTheme = theme === "0";
    tag.parentElement.removeChild(tag);

    if (_WinRT.Windows.UI.ViewManagement.UISettings) {
        UISettings = new _WinRT.Windows.UI.ViewManagement.UISettings();
        UISettings.addEventListener("colorvalueschanged", handleColorsChanged);
        handleColorsChanged();
    } else {
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
});

// Publish to WinJS namespace
var toPublish = {
    ColorTypes: ColorTypes,
    createAccentRule: createAccentRule,

    _colors: colors,
    _reset: _reset
};
_Base.Namespace.define("WinJS.UI._Accents", toPublish);
