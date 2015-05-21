// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
import _Global = require("./Core/_Global");
import _WinRT = require("./Core/_WinRT")

import _Base = require("./Core/_Base");
import _BaseUtils = require("./Core/_BaseUtils");

var Constants = {
    accentStyleId: "WinJSAccentsStyle",
    themeDetectionTag: "winjs",

    hoverSelector: "html.win-hoverable",
};

var CSSSelectorTokens = [".", "#", ":"];

var UISettings = new _WinRT.Windows.UI.ViewManagement.UISettings();

var colors: string[] = [];
var isDarkTheme = false;
var rules: { selector: string; props: { name: string; value: ColorTypes; }[] }[] = [];
var writeRulesTOHandle = -1;

export enum ColorTypes {
    accent = 0,
    listSelectRest = 1,
    listSelectHover = 2,
    listSelectPress = 3
}

export function createAccentRule(selector: string, props: { name: string; value: ColorTypes; }[]) {
    rules.push({ selector: selector, props: props });
    scheduleWriteRules();
}

function scheduleWriteRules() {
    if (!rules.length || writeRulesTOHandle !== -1) {
        return;
    }
    writeRulesTOHandle = _Global.setTimeout(() => {
        writeRulesTOHandle = -1;
        cleanup();

        var inverseThemeSelector = ".win-ui-" + (isDarkTheme ? "light" : "dark");

        var style = _Global.document.createElement("style");
        style.id = Constants.accentStyleId;
        style.textContent = rules.map(rule => {
            var body = "  " + rule.props.map(prop => prop.name + ": " + colors[prop.value] + ";").join("\n  ");

            var selector = rule.selector;
            var selectorSplit = selector.split(",").map(str => str.trim());

            // Hover Selectors
            var isHoverSelector = rule.selector.indexOf(":hover") !== -1
            if (isHoverSelector) {
                selector += ",\n" + Constants.hoverSelector + " " + selectorSplit.join(",\n" + Constants.hoverSelector + " ");
                if (CSSSelectorTokens.indexOf(rule.selector[0]) !== -1) {
                    selector + ",\n" + Constants.hoverSelector + selectorSplit.join(",\n" + Constants.hoverSelector);
                }
            }
            var css = selector + " {\n" + body + "\n}";

            // Inverse Theme Selectors
            var isThemedColor = rule.props.some(prop => prop.value !== ColorTypes.accent)
            if (isThemedColor) {
                var inverseBody = "  " + rule.props.map(prop => prop.name + ": " + colors[(prop.value ? ((prop.value + 3) % colors.length) : prop.value)] + ";").join("\n  ");
                css += "\n" + inverseThemeSelector + " " + selectorSplit.join(",\n" + inverseThemeSelector + " ") + " {\n" + inverseBody + "\n}";

                if (CSSSelectorTokens.indexOf(rule.selector[0]) !== -1) {
                    css += ",\n" + inverseThemeSelector + selectorSplit.join(",\n" + inverseThemeSelector)  + " {\n" + inverseBody + "\n}";
                }
            }

            return css;
        }).join("\n");
        _Global.document.head.insertBefore(style, _Global.document.head.firstChild);
    });
}

function handleColorsChanged() {
    // TODO: oncolorvalueschanged fires randomly?
    var UIColorType = _WinRT.Windows.UI.ViewManagement.UIColorType;
    var accent = colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 1);
    if (colors[0] === accent) {
        return;
    }
    colors = [];
    colors.push(accent);

    // Figure out color theme
    var tag = _Global.document.createElement("winjs");
    _Global.document.body.appendChild(tag);
    var theme = _Global.getComputedStyle(tag).opacity;
    isDarkTheme = theme === "1";
    tag.parentElement.removeChild(tag);

    // Establish colors
    if (isDarkTheme) {
        colors.push(colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 0.6));
        colors.push(colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 0.8));
        colors.push(colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 0.9));
    } else {
        colors.push(colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 0.4));
        colors.push(colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 0.6));
        colors.push(colorToString(UISettings.getColorValue(_WinRT.Windows.UI.ViewManagement.UIColorType.accent), 0.7));
    }

    scheduleWriteRules();
}

function colorToString(color: _WinRT.Windows.UI.Color, alpha: number) {
    return "rgba(" + color.r + "," + color.g + "," + color.b + "," + alpha + ")";
}

function cleanup() {
    var style = _Global.document.head.querySelector("#" + Constants.accentStyleId);
    style && style.parentNode.removeChild(style);
}

UISettings.addEventListener("colorvalueschanged", handleColorsChanged);
_BaseUtils.ready().then(handleColorsChanged);