// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


module NavBarUtils {

    export function getNavBarCommandsData(count, withLabels?, withTooltips?, withIcons?, withLocation?, withState?, withSplitButton?) {
        var dataArr = [];
        for (var i = 0; i < count; i++) {
            dataArr.push(this.getNavBarCommandData(i, withLabels, withTooltips, withIcons, withLocation, withState, withSplitButton));
        }
        return new WinJS.Binding.List(dataArr);
    };

    export function getNavBarCommandData(index, withLabels?, withTooltips?, withIcons?, withLocation?, withState?, withSplitButton?) {
        var data:any = {};
        if (withLabels) {
            data.label = "Label: " + index;
        }
        if (withTooltips) {
            data.tooltip = "Tooltip: " + index;
        }
        if (withIcons) {
            data.icon = WinJS.UI.AppBarIcon.add;
        }
        if (withLocation) {
            data.location = "location: " + index;
        }
        if (withState) {
            data.state = "state: " + index;
        }
        if (withSplitButton) {
            data.splitButton = true;
        }
        return data;
    };

    export function getNavBarCommandsMarkup(count, withLabels?, withTooltips?, withIcons?, withLocation?, withState?, withSplitButton?) {
        var markup = '';
        for (var i = 0; i < count; i++) {
            var data = this.getNavBarCommandData(i, withLabels, withTooltips, withIcons, withLocation, withState, withSplitButton);
            markup += this.getNavBarCommandMarkup(data);
        }
        return markup;
    };

    export function getNavBarCommandMarkup(data) {
        var markup =
            '<div data-win-control="WinJS.UI.NavBarCommand" data-win-options="' +
            JSON.stringify(data).replace(/"/g, "'") +
            '"></div>';
        return markup;
    };
}