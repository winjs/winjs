// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="repeaterUtils.ts"/>

module WinJSTests {

    "use strict";

    var utils = repeaterUtils,
        loadedEvent = utils.events.loadedEvent,
        simpleRenderer = utils.simpleRenderer;

    function verifyDOM(elem, data, childrenClassQuery) {
        LiveUnit.LoggingCore.logComment("Verifying the DOM");

        var repeatedChildren = elem.querySelectorAll(childrenClassQuery),
            numberOfDomChildren = repeatedChildren.length;

        // Verify the number of children elements
        LiveUnit.Assert.areEqual(data.length, numberOfDomChildren,
            "The DOM size is not equal to the number of data items");

        // Verify that repeater owns the its innerHTML and that no other html elements have been injected into it..
        LiveUnit.Assert.areEqual(numberOfDomChildren, elem.childNodes.length,
            "After initialization, Repeater's innerHTML should only contain the elements its template generated from the data set.");

        // Verify the DOM order
        data.forEach(function (item, index) {
            // Verify the content of the element
            var child = repeatedChildren[index];
            LiveUnit.Assert.areEqual(item, child.textContent, "The data and the DOM element don't match");
        });

        // Verify Repeater's length property
        LiveUnit.Assert.areEqual(elem.winControl.length, numberOfDomChildren,
            "The Repeater's DOM size should be equal to its length property if there haven't been any outside modifications to its HTML tree");

        // Verify that the length property is resilient to injected elements
        var injectedElement = document.createElement("DIV");
        elem.appendChild(injectedElement);
        LiveUnit.Assert.areEqual(elem.winControl.length, elem.children.length - 1,
            "Repeater's length property should ingore DOM elements injected by outside sources");
        elem.removeChild(injectedElement);
    }

    export class RepeaterPropertyTests {


        // This is the setup function that will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "RepeaterTests";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("RepeaterTests");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }

        testUpdateDataProperty = function (complete) {
            var oldData = utils.createWeekdaysList(),
                newData = utils.createMonthsList(),
                elem = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            elem.addEventListener(loadedEvent, itemsLoadedHandler);
            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsloaded event handler");
                loadedEventFired++;
            }

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: oldData,
                template: simpleRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify the DOM for old data
            verifyDOM(elem, oldData, ".repeater-child");

            // Update the data property
            repeater.data = newData;

            // Verify the DOM for new data
            verifyDOM(elem, newData, ".repeater-child");

            // Verify the itemsloaded fired twice
            LiveUnit.Assert.areEqual(2, loadedEventFired, "itemsloaded event fired unexpected number of times");

            // Done
            complete();
        };

        testUpdateTemplateProperty = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            function createRenderer(className) {
            return function (item) {
                    var root = document.createElement("div");
                    root.textContent = item;
                    root.className = className;
                    return root;
                }
        }

            elem.addEventListener(loadedEvent, itemsLoadedHandler);
            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsloaded event handler");
                loadedEventFired++;
            }

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                template: createRenderer("old-template")
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify the DOM for old data
            verifyDOM(elem, data, ".old-template");

            // Update the template property
            repeater.template = <any>createRenderer("new-template");

            // Verify the DOM for new-template generated data 
            verifyDOM(elem, data, ".new-template");

            // Verify the itemsloaded fired twice
            LiveUnit.Assert.areEqual(2, loadedEventFired, "itemsloaded event fired unexpected number of times");

            // Done
            complete();
        };

        testElementProperty = function (complete) {
            var elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {});
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify element property
            LiveUnit.Assert.areEqual(elem, repeater.element, "Element property didn't return the expected element");

            // Done
            complete();
        };

        testWinControlExpando = function (complete) {
            var elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {});
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify winControl expando property
            LiveUnit.Assert.areEqual(repeater, elem.winControl, "WinControl expando property didn't return the expected control");

            // Done
            complete();
        };

        testElementFromIndexFunction = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                template: simpleRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            var repeatedChildren = elem.querySelectorAll(".repeater-child");

            // Verify the elementFromIndex()
            data.forEach(function (item, index) {
                // Verify the content of the element
                var child = repeatedChildren[index];
                LiveUnit.Assert.areEqual(child, repeater.elementFromIndex(index),
                    "The element returned by the elementFromIndex and the DOM element don't match");
            });

            // Done
            complete();
        };
    };
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RepeaterPropertyTests");
