// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.js" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

(function () {

    WinJSTests.BackdropTests = function () {
        "use strict";

        // This is the setup function that will be called at the beginning of each test function.
        var defaultNumberOfItemsPerItemsBlock;
        this.setUp = function (complete) {

            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "BackdropTests";
            newNode.style.width = "250px";
            newNode.style.height = "250px";
            document.body.appendChild(newNode);
            defaultNumberOfItemsPerItemsBlock = WinJS.UI.ListLayout._numberOfItemsPerItemsBlock;
            appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
        };

        this.tearDown = function () {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("BackdropTests");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
            removeCSSFileFromHead("$(TESTDATA)/Listview.css");
            WinJS.UI.ListLayout._numberOfItemsPerItemsBlock = defaultNumberOfItemsPerItemsBlock;
        };

        function setupListView(element, layout) {
            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }
            var list = new WinJS.Binding.List(items);

            function itemTemplate(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement('div');
                    element.style.width = "100px";
                    element.style.height = "100px";
                    element.textContent = item.data.title;
                    return element;
                });
            }

            return new WinJS.UI.ListView(element, {
                itemDataSource: list.dataSource,
                itemTemplate: itemTemplate,
                layout: layout
            });
        }

        this.testDisableBackdrop = function (complete) {
            var element = document.getElementById("BackdropTests");

            // We should not crash if this property is set on a layout that is not associated with a listView yet.
            var lonelyLayout = new WinJS.UI.GridLayout();
            lonelyLayout.disableBackdrop = true;

            var listview = setupListView(element, new WinJS.UI.ListLayout());
            waitForReady(listview)().then(function () {
                var disableBackDropClassPrefix = "_win-dynamic-disablebackdrop-";
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(disableBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgba(155, 155, 155, 0.23)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);
                listview.layout.disableBackdrop = true;
                LiveUnit.Assert.areNotEqual(-1, listview._canvas.className.indexOf(disableBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgba(0, 0, 0, 0)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);

                //Changing layouts should remove the disableBackDropClass
                listview.layout = new WinJS.UI.GridLayout();
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(disableBackDropClassPrefix));

                complete(true);
            });
        };

        this.testBackdropColor = function (complete) {
            var element = document.getElementById("BackdropTests");

            // We should not crash if this property is set on a layout that is not associated with a listView yet.
            var lonelyLayout = new WinJS.UI.GridLayout();
            lonelyLayout.backdropColor = "green";

            var listview = setupListView(element, new WinJS.UI.ListLayout());
            waitForReady(listview)().then(function () {
                var customBackDropClassPrefix = "_win-dynamic-backdropcolor-";
                LiveUnit.Assert.areEqual(-1, listview._canvas.className.indexOf(customBackDropClassPrefix));
                Helper.Assert.areColorsEqual("rgba(155, 155, 155, 0.23)", getComputedStyle(element.querySelector(".win-listview .win-container.win-backdrop")).backgroundColor);
                listview.layout.backdropColor = "red";
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
        this.testBackDropAfterDeleteInListLayout = function (complete) {
            WinJS.UI.ListLayout._numberOfItemsPerItemsBlock = 0;

            var element = document.getElementById("BackdropTests");
            var listview = setupListView(element, new WinJS.UI.ListLayout());
            waitForReady(listview)().then(function () {
                LiveUnit.Assert.areEqual(92, element.querySelectorAll(".win-container.win-backdrop").length);
                listview.itemDataSource.list.splice(2, 1);
                waitForReady(listview, 100)().then(function () {
                    LiveUnit.Assert.areEqual(92, element.querySelectorAll(".win-container.win-backdrop").length);
                    complete();
                });
            });
        };
    };

    // register the object as a test class by passing in the name
    LiveUnit.registerTestClass("WinJSTests.BackdropTests");

})();
