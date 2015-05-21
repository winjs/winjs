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
var rules: { selector: string; props: { name: string; value: ColorTypes; }[]; noHoverSelector: boolean; }[] = [];
var writeRulesTOHandle = -1;

export enum ColorTypes {
    accent = 0,
    listSelectRest = 1,
    listSelectHover = 2,
    listSelectPress = 3,
    listSelectRestInverse = 4,
    listSelectHoverInverse = 5,
    listSelectPressInverse = 6,
}

export function createAccentRule(selector: string, props: { name: string; value: ColorTypes; }[], noHoverSelector = false) {
    rules.push({ selector: selector, props: props, noHoverSelector: noHoverSelector });
    scheduleWriteRules();
}

function scheduleWriteRules() {
    if (!rules.length || writeRulesTOHandle !== -1) {
        return;
    }
    writeRulesTOHandle = _Global.setTimeout(() => {
        writeRulesTOHandle = -1;
        cleanup();

        var inverseThemeSelector = isDarkTheme ? Constants.lightThemeSelector : Constants.darkThemeSelector;

        var style = _Global.document.createElement("style");
        style.id = Constants.accentStyleId;
        style.textContent = rules.map(rule => {
            // example rule: { selector: "  .foo,  .bar:hover ,  div:hover  ", props: [{ name: "color", value: 0 }, { name: "background-color", value: 1 }, noHoverSelector: false }

            var body = "  " + rule.props.map(prop => prop.name + ": " + colors[prop.value] + ";").join("\n  ");
            // body = color: *accent*; background-color: *listSelectHover*

            var selectorSplit = rule.selector.split(",").map(str => str.trim()); // [".foo", ".bar:hover", "div"]
            var selector = selectorSplit.join(",\n"); // ".foo, .bar:hover, div"

            // Hover Selectors
            if (!rule.noHoverSelector) {
                selectorSplit.forEach(sel => {
                    if (sel.indexOf(":hover") !== -1 && sel.indexOf(Constants.hoverSelector) === -1) {
                        selector += ",\n" + Constants.hoverSelector + " " + sel;
                        if (CSSSelectorTokens.indexOf(sel[0]) !== -1) {
                            selector += ",\n" + Constants.hoverSelector + sel;
                        }
                    }
                });
                // selector = .foo, .bar:hover, div:hover, html.win-hoverable .bar:hover, html.win-hoverable.bar:hover
            }
            var css = selector + " {\n" + body + "\n}";
            // css = .foo, .bar:hover, div:hover, html.win-hoverable .bar:hover, html.win-hoverable.bar:hover {body}

            // Inverse Theme Selectors
            var isThemedColor = rule.props.some(prop => prop.value !== ColorTypes.accent)
            if (isThemedColor) {
                var inverseBody = "  " + rule.props.map(prop => prop.name + ": " + colors[(prop.value ? ((prop.value + 3) % (colors.length - 1)) : prop.value)] + ";").join("\n  ");
                // inverseBody = "color: *accent*; background-color: *listSelectHoverInverse"

                selectorSplit.forEach(sel => {
                    css += "\n" + inverseThemeSelector + " " + sel;
                    if (CSSSelectorTokens.indexOf(sel[0]) !== -1) {
                        css += ",\n" + inverseThemeSelector + sel;
                    }
                    css += " {\n" + inverseBody + "\n}";
                });
                // css
                //.foo, .bar:hover, div:hover, html.win-hoverable .bar:hover, html.win-hoverable.bar:hover {body} 
                //.win-ui-light .foo {inverseBody}
                //.win-ui-light.foo {inverseBody}
                //.win-ui-light .bar:hover {inverseBody}
                //.win-ui-light.bar:hover {inverseBody}
                //.win-ui-light div:hover {inverseBody}
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
    colors = [];
    colors.push(accent);
    colors.push(
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

function cleanup() {
    var style = _Global.document.head.querySelector("#" + Constants.accentStyleId);
    style && style.parentNode.removeChild(style);
}

_BaseUtils.ready().then(() => {
    // Figure out color theme
    var tag = _Global.document.createElement("winjs");
    _Global.document.body.appendChild(tag);
    var theme = _Global.getComputedStyle(tag).opacity;
    isDarkTheme = theme === "1";
    tag.parentElement.removeChild(tag);

    if (_BaseUtils.hasWinRT) {
        UISettings = new _WinRT.Windows.UI.ViewManagement.UISettings();
        UISettings.addEventListener("colorvalueschanged", handleColorsChanged);
        handleColorsChanged();
    } else {
        // No WinRT - use hardcoded blue accent color
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
