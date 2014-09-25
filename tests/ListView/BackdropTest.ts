// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
// <reference path="../TestData/ListView.less.css" />



module WinJSTests {
    "use strict";

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;
    var ListLayout = <typeof WinJS.UI.PrivateListLayout> WinJS.UI.ListLayout;

    var testRootEl;
    var defaultNumberOfItemsPerItemsBlock;
    var defaultDisableCustomPagesPrefetch;

    function setupListView(element, layout) {
        var items = [];
        for (var i = 0; i < 100; ++i) {
            items[i] = { title: "Tile" + i };
        }
        var list = new WinJS.Binding.List<{ title: string }>(items);

        function itemTemplate(itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement('div');
                element.style.width = "100px";
                element.style.height = "100px";
                element.textContent = item.data.title;
                return element;
            });
        }

        return new ListView(element, {
            itemDataSource: list.dataSource,
            itemTemplate: itemTemplate,
            layout: layout
        });
    }

    export class BackdropTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "BackdropTests";
            newNode.style.width = "250px";
            newNode.style.height = "250px";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
            defaultNumberOfItemsPerItemsBlock = ListLayout._numberOfItemsPerItemsBlock;
            defaultDisableCustomPagesPrefetch = WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
            ListLayout._numberOfItemsPerItemsBlock = defaultNumberOfItemsPerItemsBlock;
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = defaultDisableCustomPagesPrefetch;
        }



        testDisableBackdrop = function (complete) {
            var element = document.getElementById("BackdropTests");

            // We should not crash if this property is set on a layout that is not associated with a listView yet.
            var lonelyLayout = new WinJS.UI.GridLayout();
            lonelyLayout.disableBackdrop = true;

            var listview = setupListView(element, new WinJS.UI.ListLayout());
            Helper.ListView.waitForReady(listview)().then(function () {
                var disableBackDropClassPrefix = "_win-dynamic-disablebackdrop-";
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(disableBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgba(155, 155, 155, 0.23)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);
                listview.layout['disableBackdrop'] = true;
                LiveUnit.Assert.areNotEqual(-1, listview._canvas.className.indexOf(disableBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgba(0, 0, 0, 0)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);

                //Changing layouts should remove the disableBackDropClass
                listview.layout = new WinJS.UI.GridLayout();
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(disableBackDropClassPrefix));

                complete(true);
            });
        };

        testBackdropColor = function (complete) {
            var element = document.getElementById("BackdropTests");

            // We should not crash if this property is set on a layout that is not associated with a listView yet.
            var lonelyLayout = new WinJS.UI.GridLayout();
            lonelyLayout.backdropColor = "green";

            var listview = setupListView(element, new WinJS.UI.ListLayout());
            Helper.ListView.waitForReady(listview)().then(function () {
                var customBackDropClassPrefix = "_win-dynamic-backdropcolor-";
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(customBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgba(155, 155, 155, 0.23)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);
                listview.layout['backdropColor'] = "red";
                LiveUnit.Assert.areNotEqual(-1, listview._canvas.className.indexOf(customBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgb(255, 0, 0)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);

                //Changing layouts should remove the customBackDropClass
                listview.layout = new WinJS.UI.GridLayout();
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(customBackDropClassPrefix));

                complete(true);
            });
        };

        // Regression test for WinBlue:100462
        //
        testBackDropAfterDeleteInListLayout = function (complete) {
            ListLayout._numberOfItemsPerItemsBlock = 0;
            WinJS.UI._VirtualizeContentsView._disableCustomPagesPrefetch = true;
            var element = document.getElementById("BackdropTests");
            var listview = setupListView(element, new WinJS.UI.ListLayout());
            Helper.ListView.waitForReady(listview)().then(function () {
                LiveUnit.Assert.areEqual(92, element.querySelectorAll(".win-container.win-backdrop").length);
                listview.itemDataSource['list'].splice(2, 1);
                Helper.ListView.waitForReady(listview, 100)().then(function () {
                    LiveUnit.Assert.areEqual(92, element.querySelectorAll(".win-container.win-backdrop").length);
                    complete();
                });
            });
        };
    };

}

LiveUnit.registerTestClass("WinJSTests.BackdropTests");
