// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var WinJSTests = WinJSTests || {};

WinJSTests.PivotItemTests = function () {
    "use strict";

    var pivotWrapperEl;
    this.setUp = function () {
        pivotWrapperEl = document.createElement('div');
        pivotWrapperEl.style.cssText = "width: 320px; height: 480px; background-color: #777;"
        document.body.appendChild(pivotWrapperEl);
    };

    this.tearDown = function () {
        WinJS.Utilities.disposeSubTree(pivotWrapperEl);
        document.body.removeChild(pivotWrapperEl);
    };

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
        pivotWrapperEl.appendChild(pivot.element);

        pivot.items.push(pivotItem);
        pivot.addEventListener("itemanimationend", function () {
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