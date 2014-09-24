// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="repeaterUtils.ts"/>


module WinJSTests {

    "use strict";

    var utils = repeaterUtils,
        loadedEvent = utils.events.loadedEvent,
        simpleRenderer = utils.simpleRenderer,
        repeaterClass = "win-repeater",
        repeaterChildClass = "repeater-child";

    function verifyDOM(elem, data, childrenClassQuery) {
        LiveUnit.LoggingCore.logComment("Verifying the DOM");

        var domChildren = elem.querySelectorAll(childrenClassQuery),
            numberOfDomChildren = domChildren.length;

        // Verify the number of children elements
        LiveUnit.Assert.areEqual(data.length, numberOfDomChildren,
            "The DOM size is not equal to the number of data items");

        // Verify that repeater owns the its innerHTML and that no other html elements have been injected into it..
        LiveUnit.Assert.areEqual(numberOfDomChildren, elem.childNodes.length,
            "After initialization, Repeater's innerHTML should only contain the elements its template generated from the data set.");

        // Verify the DOM order
        data.forEach(function (item, index) {
            // Verify the content of the element
            var child = domChildren[index];
            LiveUnit.Assert.areEqual(item, child.textContent, "The data and the DOM element don't match");
        });

        // Verify the css class
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(elem, repeaterClass),
            "The repeater container element doesn't have the expected CSS class");
    }

    export class RepeaterInitTests {


        // This is the setup function that will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "RepeaterTests";
            document.body.appendChild(newNode);
            window['RepeaterInitTests'] = {};
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("RepeaterTests");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
            delete window['RepeaterInitTests'];
        }



        testReloadWithExternalTemplate = function () {
            var templateDiv = document.createElement("div");
            templateDiv.innerHTML = "<div data-win-bind:'innerHTML: value'></div>";

            var template = new WinJS.Binding.Template(templateDiv);
            var list = new WinJS.Binding.List([{ value: "value" }]);

            var repeater = new WinJS.UI.Repeater(<HTMLElement>document.querySelector("#RepeaterTests"));
            repeater.template = template;
            repeater.data = list;

            document.body.appendChild(repeater.element);

            // Next line should not cause a crash
            repeater.template = template;
        };

        testInitJSCtorRendererFunction = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            elem.addEventListener(loadedEvent, itemsLoadedHandler);
            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                template: simpleRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            verifyDOM(elem, data, "." + repeaterChildClass);

            // Verify the itemsloaded fired only once
            LiveUnit.Assert.areEqual(1, loadedEventFired, "itemsloaded event fired unexpected number of times");

            // Done
            complete();
        };

        testInitJSCtorInlineTemplate = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            var str = "<div class='" + repeaterChildClass + "' data-win-bind='textContent: this'></div>";
            elem.innerHTML = str;

            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                onitemsloaded: itemsLoadedHandler
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            verifyDOM(elem, data, "." + repeaterChildClass);

            // Verify the itemsloaded fired only once
            LiveUnit.Assert.areEqual(1, loadedEventFired,
                "itemsloaded event fired unexpected number of times");

            // Done
            complete();
        };

        testInitJSCtorBindingTemplate = function (complete) {
            var data = utils.createWeekdaysList(),
                root = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            var templateStr = "<div id='template' data-win-control='WinJS.Binding.Template' style='display: none;'>" +
                "<div class='" + repeaterChildClass + "' data-win-bind='textContent: this'></div>" +
                "</div>";
            root.innerHTML = templateStr;
            var elem = document.createElement("div");
            root.appendChild(elem);

            elem.addEventListener(loadedEvent, itemsLoadedHandler);
            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }

            WinJS.UI.processAll().
                then(function () {
                    LiveUnit.LoggingCore.logComment("Creating a repeater control");
                    var repeater = new WinJS.UI.Repeater(elem, {
                        data: data,
                        template: document.getElementById("template")
                    });
                    LiveUnit.LoggingCore.logComment("Repeater control created");

                    verifyDOM(elem, data, "." + repeaterChildClass);

                    // Verify the itemsloaded fired only once
                    LiveUnit.Assert.areEqual(1, loadedEventFired,
                        "itemsloaded event fired unexpected number of times");
                }).
                done(complete);
        };

        testInitJSCtorBindingTemplateWinControl = function (complete) {
            var data = utils.createWeekdaysList(),
                root = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            var templateStr = "<div id='template' data-win-control='WinJS.Binding.Template' style='display: none;'>" +
                "<div class='" + repeaterChildClass + "' data-win-bind='textContent: this'></div>" +
                "</div>";
            root.innerHTML = templateStr;
            var elem = document.createElement("div");
            root.appendChild(elem);

            elem.addEventListener(loadedEvent, itemsLoadedHandler);
            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }

            WinJS.UI.processAll().
                then(function () {
                    LiveUnit.LoggingCore.logComment("Creating a repeater control");
                    var repeater = new WinJS.UI.Repeater(elem, {
                        data: data,
                        template: document.getElementById("template").winControl,
                    });
                    LiveUnit.LoggingCore.logComment("Repeater control created");

                    verifyDOM(elem, data, "." + repeaterChildClass);

                    // Verify the itemsloaded fired only once
                    LiveUnit.Assert.areEqual(1, loadedEventFired,
                        "itemsloaded event fired unexpected number of times");
                }).
                done(complete);
        };

        testInitMarkupRendererFunction = function (complete) {
            var data = utils.createWeekdaysList(),
                root = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }
            WinJS.Utilities.markSupportedForProcessing(itemsLoadedHandler);

            window['RepeaterInitTests'].data = data;
            window['RepeaterInitTests'].simpleRenderer = simpleRenderer;
            window['RepeaterInitTests'].itemsLoadedHandler = itemsLoadedHandler;

            var str = "<div id='myRepeater' data-win-control='WinJS.UI.Repeater' " +
                "data-win-options='{data: RepeaterInitTests.data, template: RepeaterInitTests.simpleRenderer, onitemsloaded: RepeaterInitTests.itemsLoadedHandler}'></div>";
            root.innerHTML = str;

            WinJS.UI.processAll().
                then(function () {
                    var elem = document.getElementById("myRepeater");
                    verifyDOM(elem, data, "." + repeaterChildClass);

                    // Verify the itemsloaded fired only once
                    LiveUnit.Assert.areEqual(1, loadedEventFired,
                        "itemsloaded event fired unexpected number of times");
                }).
                done(complete);
        };

        testInitMarkupInlineTemplate = function (complete) {
            var data = utils.createWeekdaysList(),
                root = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }

            WinJS.Utilities.markSupportedForProcessing(itemsLoadedHandler);
            window['RepeaterInitTests'].data = data;
            window['RepeaterInitTests'].itemsLoadedHandler = itemsLoadedHandler;

            var str = "<div id='myRepeater' data-win-control='WinJS.UI.Repeater' " +
                "data-win-options='{ data: RepeaterInitTests.data, onitemsloaded: RepeaterInitTests.itemsLoadedHandler }'>" +
                "<div class='" + repeaterChildClass + "' data-win-bind='textContent: this'></div>" +
                "</div>";
            root.innerHTML = str;

            WinJS.UI.processAll().
                then(function () {
                    var elem = document.getElementById("myRepeater");
                    verifyDOM(elem, data, "." + repeaterChildClass);

                    // Verify the itemsloaded fired only once
                    LiveUnit.Assert.areEqual(1, loadedEventFired,
                        "itemsloaded event fired unexpected number of times");
                }).
                done(complete);
        };

        testInitMarkupBindingTemplate = function (complete) {
            var data = utils.createWeekdaysList(),
                root = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }
            WinJS.Utilities.markSupportedForProcessing(itemsLoadedHandler);
            window['RepeaterInitTests'].data = data;
            window['RepeaterInitTests'].itemsLoadedHandler = itemsLoadedHandler;

            var str = "<div id='template' data-win-control='WinJS.Binding.Template' style='display: none;'>" +
                "<div class='" + repeaterChildClass + "' data-win-bind='textContent: this'></div>" +
                "</div>";

            str += "<div id='myRepeater' data-win-control='WinJS.UI.Repeater' " +
            "data-win-options='{ data: RepeaterInitTests.data, template: template, " +
            "onitemsloaded: RepeaterInitTests.itemsLoadedHandler }'></div>";
            root.innerHTML = str;

            WinJS.UI.processAll().
                then(function () {
                    var elem = document.getElementById("myRepeater");
                    verifyDOM(elem, data, "." + repeaterChildClass);

                    // Verify the itemsloaded fired only once
                    LiveUnit.Assert.areEqual(1, loadedEventFired,
                        "itemsloaded event fired unexpected number of times");
                }).
                done(complete);
        };

        testAriaAttributes = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests"),
                ariaLabel = "myAwesomeRepeater";

            LiveUnit.LoggingCore.logComment("Setting aria attributes on the element");
            elem.setAttribute("aria-label", ariaLabel);

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, {
                data: data,
                template: simpleRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");
            LiveUnit.LoggingCore.logComment("Verifying aria attributes");

            function checkAttribute(element, attribute, expectedValue) {
                var values = element.getAttribute(attribute).match(expectedValue),
                    value = values ? values[0] : null;

                LiveUnit.Assert.areEqual(value, expectedValue, "Expected " + attribute + ": " + expectedValue +
                    " Actual: " + value);
            }

            checkAttribute(elem, "aria-label", ariaLabel);

            // Done
            complete();
        };

        testEmptyCtor = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests"),
                loadedEventFired = 0;

            elem.addEventListener(loadedEvent, itemsLoadedHandler);
            function itemsLoadedHandler(ev) {
                LiveUnit.LoggingCore.logComment("Inside the itemsLoaded event handler");
                loadedEventFired++;
            }

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater();
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify a div is created for the repeater control, and control is well formed and empty
            LiveUnit.Assert.isTrue(repeater.element);
            LiveUnit.Assert.isTrue(repeater.data);
            LiveUnit.Assert.isTrue(repeater.template);
            LiveUnit.Assert.isTrue(repeater.elementFromIndex);
            LiveUnit.Assert.areEqual(0, repeater.element.childElementCount, "Repeater should be empty with no children");

            // Add an event handler
            repeater.addEventListener(loadedEvent, itemsLoadedHandler, false);

            // Attach data, template and verify that itemsLoaded fires twice.
            repeater.data = data;
            repeater.template = <any>simpleRenderer;

            verifyDOM(repeater.element, data, "." + repeaterChildClass);

            // Verify itemsLoaded was fired twice
            LiveUnit.Assert.areEqual(2, loadedEventFired,
                "itemsloaded event didn't fire expected number of times");

            // Done
            complete();
        };

        testNoTemplate = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, { data: data });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // When a template is not provided, repeater is populated with JSON text from the item
            // wrapped in divs. 
            // Verify the number of children div elements and complete
            LiveUnit.Assert.areEqual(data.length, elem.childElementCount,
                "The DOM size is not equal to the number of data items");
            complete();
        };



        // WinBlue: 66929 
        testNestedRepeaterInlineTemplate = function (complete) {
            var outerList = createNestedData(),
                str = "",
                root = document.getElementById("RepeaterTests");

            function createNestedData() {
                var outerList = new WinJS.Binding.List(),
                    days = repeaterUtils.createWeekdaysList();

                days.forEach(function (day) {
                    outerList.push({ title: day, moments: repeaterUtils.getListOfMoments(3) });
                });
                return outerList;
            }

            window['RepeaterInitTests'].data = outerList;

            str += "<ul id='outerRepeater' data-win-control='WinJS.UI.Repeater' data-win-options='{ data: RepeaterInitTests.data }'>" +
            "<li class='repeater-1-child'>" +
            "<span data-win-bind='textContent: title'></span>" +
            "<ul class='innerRepeater' data-win-control='WinJS.UI.Repeater' data-win-bind='winControl.data: moments'>" +
            "<li class='repeater-2-child' data-win-bind='textContent: month'>" +
            "</li>" +
            "</ul>" +
            "</li>" +
            "</ul>";
            root.innerHTML = str;

            WinJS.UI.processAll().
                then(function () {
                    LiveUnit.LoggingCore.logComment("Nested repeaters created");
                    var outerRepeater = document.getElementById("outerRepeater").winControl;

                    function verifyChildrenCount(element, childrenClassQuery, length) {
                        var domChildren = element.querySelectorAll(childrenClassQuery),
                            numberOfDomChildren = domChildren.length;

                        // Verify the number of children elements
                        LiveUnit.Assert.areEqual(length, numberOfDomChildren,
                            "The DOM size is not equal to the number of data items");
                    }

                    // Verify the number of elements in outer repeater
                    LiveUnit.LoggingCore.logComment("Verifying item count of outer repeater");
                    verifyChildrenCount(outerRepeater.element, ".repeater-1-child", outerList.length);

                    outerList.forEach(function (item:any, index) {
                        // Get repeater at given index
                        var innerRepeater = outerRepeater.elementFromIndex(index).querySelector(".innerRepeater").winControl;

                        // Verify the number of elements in inner repeater
                        LiveUnit.LoggingCore.logComment("Verifying item count of inner repeater");
                        verifyChildrenCount(innerRepeater.element, ".repeater-2-child", item.moments.length);
                    });
                }).
                done(complete);
        };


        testRepeaterDoubleDispose = function (complete) {
            var elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater:any = new WinJS.UI.Repeater(elem);
            LiveUnit.LoggingCore.logComment("Repeater control created");

            LiveUnit.Assert.isFalse(repeater._disposed);
            repeater.dispose();
            LiveUnit.Assert.isTrue(repeater._disposed);
            repeater.dispose();

            // Done
            complete();
        };

        testDuplicateConstructionException = function (complete) {
            var elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem);
            LiveUnit.LoggingCore.logComment("Repeater control created");

            LiveUnit.LoggingCore.logComment("Creating another repeater on the same element");
            try {
                repeater = new WinJS.UI.Repeater(elem);
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Controls may only be instantiated one time for each DOM element", e.message);
            }

            complete();
        };

        testAsyncTemplateException = function (complete) {
            var data = utils.createWeekdaysList(),
                elem = document.getElementById("RepeaterTests");

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(elem, { data: data });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Template returns null
            try {
                repeater.template = <any>function (item) { return null; };
            } catch (e) {
                LiveUnit.Assert.areEqual("Top level items must render synchronously", e.message);
            }

            // Template returns promise
            try {
                repeater.template = <any>function (item) { return WinJS.Promise.wrap(document.createElement("div")); };
            } catch (e) {
                // TODO: What the repeater check for HTMLelement instead of a null check?
                //LiveUnit.Assert.areEqual("Top level items must render synchronously", e.message);
            }

            complete();
        };

        // Regression test for Windows Blue Bug # 424560
        testDeclarativeControlContainerWithItemContainerInlineTemplate = function (complete) {

            var data = new WinJS.Binding.List([{}]); // Create list of a singular empty object.
            var itemsLoadedHandler = function () {
                var repeaterElement = document.getElementById("myRepeater");
                LiveUnit.Assert.isTrue(repeaterElement.querySelectorAll(".win-itembox").length === 1, "There should only be 1 itembox generated for a singular ItemContainer.")
        };
            WinJS.Utilities.markSupportedForProcessing(itemsLoadedHandler);

            var str = "<div id='myRepeater' data-win-control='WinJS.UI.Repeater'>" +
                "<div data-win-control=\"WinJS.UI.ItemContainer\">Hello</div>" +
                "</div>";
            var root = document.getElementById("RepeaterTests");
            root.innerHTML = str;

            WinJS.UI.processAll(root).
                then(function () {
                    var repeater = document.getElementById("myRepeater").winControl;
                    repeater.onitemsloaded = itemsLoadedHandler;
                    repeater.data = data;
                }).
                done(complete);
        }
};

    (function () {
        function generateTest(control) {
            return function (complete) {
                var ds = createDS(),
                    elem = document.getElementById("RepeaterTests");

                function createDS() {
                    var list = new WinJS.Binding.List(),
                        days = repeaterUtils.createWeekdaysList();

                    days.forEach(function (day) {
                        list.push({ title: day, moments: repeaterUtils.getListOfMoments(4) });
                    });
                    return list.dataSource;
                }

                elem.style.width = "500px";
                elem.style.height = "500px";

                var renderer = function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var root = document.createElement("div"),
                            rep = document.createElement("div");

                        function repeaterRenderer(itemMoment) {
                            var e = document.createElement("div");
                            e.textContent = itemMoment.seconds + " " + itemMoment.minutes + " " + itemMoment.hour;
                            return e;
                        }

                        var repeater = new WinJS.UI.Repeater(rep, { data: item.data.moments, template: repeaterRenderer });
                        root.appendChild(rep);
                        return root;
                    });
                };

                LiveUnit.LoggingCore.logComment("Creating the control");
                var ctrl = new control(elem, { itemDataSource: ds, itemTemplate: renderer });

                // Wait till the control is ready and call complete                
                if (control === WinJS.UI.ListView) {
                    // ListView
                    repeaterUtils.waitForReady(ctrl)()
                        .done(function () {
                            LiveUnit.LoggingCore.logComment("ListView with repeater in the template created. Finished");
                            complete();
                        });
                }
                else {
                    //FlipView
                    elem.addEventListener("pagecompleted", function (ev) {
                        LiveUnit.LoggingCore.logComment("FlipView with repeater in the template created. Finished");
                        complete();
                    });
                }
            };
        }

        RepeaterInitTests.prototype['testRepeaterInListViewTemplate'] = generateTest(WinJS.UI.ListView);
        RepeaterInitTests.prototype['testRepeaterInFlipViewTemplate'] = generateTest(WinJS.UI.FlipView);
    } ());

    (function () {
        function generateTest(renderer) {
            return function (complete) {
                var data = utils.createWeekdaysList(),
                    elem = document.getElementById("RepeaterTests"),
                    loadedEventFired = 0;

                elem.addEventListener(loadedEvent, itemsLoadedHandler);
                function itemsLoadedHandler(ev) {
                    LiveUnit.LoggingCore.logComment("Inside the itemsloaded event handler");
                    loadedEventFired++;
                }

                LiveUnit.LoggingCore.logComment("Creating a repeater control");
                var repeater = new WinJS.UI.Repeater(elem, { data: data, template: renderer });
                LiveUnit.LoggingCore.logComment("Repeater control created");

                // Verify the number of children div elements
                LiveUnit.Assert.areEqual(data.length, elem.childElementCount,
                    "The DOM size is not equal to the number of data items");

                // Repeater should not clear innerHTML when disposed
                var beforeDisposeCount = elem.childElementCount;
                repeater.dispose();
                LiveUnit.Assert.areEqual(beforeDisposeCount, elem.childElementCount,
                    "Repeater should not lose innerHTML after dispose");

                // Verify itemsloaded wasn't fired during/after dispose.
                LiveUnit.Assert.areEqual(1, loadedEventFired,
                    "itemsloaded event didn't fire expected number of times");

                // Done
                complete();
            };
        }

        RepeaterInitTests.prototype['testRepeaterDisposeSimpleRenderer'] = generateTest(simpleRenderer);
        RepeaterInitTests.prototype['testRepeaterDisposeWinJSRenderer'] = generateTest(utils.winJSCtrlRenderer);
        RepeaterInitTests.prototype['testRepeaterDisposeDisposableRenderer'] = generateTest(utils.disposableRenderer);
    })();
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RepeaterInitTests");
