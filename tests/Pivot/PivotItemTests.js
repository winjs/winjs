// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var WinJSTests = WinJSTests || {};

WinJSTests.PivotItemTests = function () {
    "use strict";

    this.testContentElement = function () {
        var pivotItemEl = document.createElement('div');
        pivotItemEl.innerHTML = '<div class="mike"></div>';
        var firstChild = pivotItemEl.firstChild;
        var pivotItem = new WinJS.UI.PivotItem(pivotItemEl);

        // The content inside a pivot item should be reparented inside of contentElement.
        LiveUnit.Assert.areEqual(firstChild, pivotItem.contentElement.firstChild, "First child match");
    };

    this.testHeaderChange = function (complete) {
        var pivotItem = new WinJS.UI.PivotItem(undefined, {
            header: 'foo1'
        });

        var pivot = new WinJS.UI.Pivot();

        pivot.items.push(pivotItem);
        WinJS.Promise.timeout().done(function () {
            var header = pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotHeaderSelected);
            LiveUnit.Assert.areEqual('foo1', header.textContent);

            pivotItem.header = 'foo2';
            header = pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotHeaderSelected);
            LiveUnit.Assert.areEqual('foo2', header.textContent);

            complete();
        });
    };
};

if (WinJS.UI.Pivot) {
    LiveUnit.registerTestClass("WinJSTests.PivotItemTests");
}