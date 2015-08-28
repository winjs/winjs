// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";

    var list;
    var oldHasWinRT;

    // As a side effect, this will scroll the browser to make the element visible
    function createPointerUpEvent(element) {
        element.scrollIntoView(false);
        var rect = element.getBoundingClientRect();
        // Simulate clicking the middle of the element
        return {
            target: element,
            clientX: (rect.left + rect.right) / 2,
            clientY: (rect.top + rect.bottom) / 2
        };
    }

    export class ListViewEventsTest {


        // This is the setup function that will be called at the beginning of each test function.
        setUp() {

            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = "ListViewEventsTest";
            newNode.innerHTML =
            "<div id='list' style='width:350px; height:400px'></div>";
            document.body.appendChild(newNode);

            list = document.getElementById("list");

            list.setPointerCapture = function () { };
            list.releasePointerCapture = function () { };

            oldHasWinRT = WinJS.Utilities.hasWinRT;
            WinJS.Utilities._setHasWinRT(false);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.Utilities._setHasWinRT(oldHasWinRT);

            var element = document.getElementById("ListViewEventsTest");
            if (element) {
                document.body.removeChild(element);
            }
        }
    }

    function generate(eventName, layoutName, testFunction, options?) {
        options = options || {};
        function generateTest(eventType) {
            var testName = 'testEvent_' + eventName + '_' + eventType + (layoutName == "GridLayout" ? "" : "_" + layoutName);
            ListViewEventsTest.prototype[testName] = function (complete) {
                var data = [];
                for (var i = 0; i < 400; i++) {
                    data.push(i);
                }
                var bindingList1 = new WinJS.Binding.List(data);

                var listView = new WinJS.UI.ListView(list, {
                    layout: new WinJS.UI[layoutName](),
                    itemDataSource: bindingList1.dataSource,
                    itemTemplate: function (itemPromise) {
                        var element = document.createElement("div");
                        element.style.width = options.size || "100px";
                        element.style.height = options.size || "100px";
                        element.style.backgroundColor = "#777";
                        return {
                            element: element,
                            renderComplete: itemPromise.then(function (item) {
                                element.textContent = '' + item.data;
                            })
                        };
                    }
                });

                if (!options.skipInitEvents) {
                    initEventListener(listView, eventName, eventType, complete);
                }

                testFunction(listView, complete);
            }
        }

        function initEventListener(listView, eventName, eventType, complete) {
            var loadingStatesFired = [];
            var loadingStatesExpected = ['itemsLoading', 'viewPortLoaded', 'itemsLoaded', 'complete'];
            function handler() {
                function finishEventTest() {
                    if (eventType === 'Level0') {
                        listView[eventName] = null;
                    } else {
                        listView.removeEventListener(eventName, handler);
                    }
                    clearTimeout(testTimeout);
                    complete();
                }
                if (eventName === 'loadingstatechanged') {
                    var currentLoadingState = listView.loadingState;

                    if (currentLoadingState !== 'complete') {
                        if (loadingStatesFired.indexOf(currentLoadingState) !== -1) {
                            loadingStatesFired.push(currentLoadingState);
                            throw Error('Duplicate loadingStates fired: ' + loadingStatesFired.toString());
                        } else {
                            loadingStatesFired.push(currentLoadingState);
                        }
                    } else {
                        finishEventTest();
                    }
                } else {
                    finishEventTest();
                }
            }

            var timeoutmsec = 2000,
                testTimeout = setTimeout(function () {
                    throw Error(eventType + ' event: ' + eventName + ' did not fire in ' + timeoutmsec + ' ms!');
                }, timeoutmsec);

            if (eventType === 'Level0') {
                listView['on' + eventName] = handler;
            } else {
                listView.addEventListener(eventName, handler);
            }
        }

        generateTest('Level0');
        generateTest('Level2');
    };

    // Test methods
    var loadingstatechanged = function (listView) { };
    generate('loadingstatechanged', "GridLayout", loadingstatechanged);

    var iteminvoked = function (listView) {
        var tests = [function () {

            // work around exception issue
            listView._canvas.setPointerCapture = function () { };

            var elements = list.querySelectorAll('.win-container');
            LiveUnit.Assert.isTrue(elements.length !== 0);

            // Simulate a click on the 4th item
            listView._currentMode().onPointerDown({ target: elements[0], button: WinJS.UI._LEFT_MSPOINTER_BUTTON, preventDefault: function () { } });
            listView._currentMode().onPointerUp(createPointerUpEvent(elements[0]));
            listView._currentMode().onclick();
        }];

        Helper.ListView.runTests(listView, tests);
    };
    generate('iteminvoked', "GridLayout", iteminvoked, { size: "50px" });

    var selectionchanging = function (listView) {
        var tests = [function () {
            var elements = list.querySelectorAll('.win-container');
            LiveUnit.Assert.isTrue(elements.length !== 0);

            // Set selection using API
            listView.selection.set([0]);
        }];

        Helper.ListView.runTests(listView, tests);
    };
    generate('selectionchanging', "GridLayout", selectionchanging);


    var selectionchanged = function (listView) {
        var tests = [function () {
            var elements = list.querySelectorAll('.win-container');
            LiveUnit.Assert.isTrue(elements.length !== 0);

            // Set selection using API
            listView.selection.set([0]);
        }];

        Helper.ListView.runTests(listView, tests);
    };
    generate('selectionchanged', "GridLayout", selectionchanged);

    var keyboardnavigating = function (listView) {
        function createKeyEvent(key, target) {
            return {
                keyCode: key,
                target: target,
                stopPropagation: function () { },
                preventDefault: function () { }
            };
        }

        var tests = [function () {
            var elements = list.querySelectorAll('.win-container');
            LiveUnit.Assert.isTrue(elements.length !== 0);

            // Simulate keyboard event
            listView._currentMode().onKeyDown(createKeyEvent(WinJS.Utilities.Key.downArrow, elements[0]));
        }];

        Helper.ListView.runTests(listView, tests);
    };
    generate('keyboardnavigating', "GridLayout", keyboardnavigating);

    var loadingstatechanged_NumItemsLoadedEventProperty = function (listView, complete) {
        listView.addEventListener("loadingstatechanged", function (e) {
            var isComplete = listView.loadingState === "complete";
            if (isComplete) {
                complete();
            }
        });
    };
    generate('loadingstatechanged_NumItemsLoadedEventProperty', "GridLayout", loadingstatechanged_NumItemsLoadedEventProperty, { skipInitEvents: true });


    var headerfooterevents = function (listView, complete) {
        var lastHeaderEvent = null,
            lastFooterEvent = null;
        listView.addEventListener("headervisibilitychanged", function (e) {
            lastHeaderEvent = e;
        });
        listView.addEventListener("footervisibilitychanged", function (e) {
            lastFooterEvent = e;
        });

        function createSimpleElement() {
            var element = document.createElement("div");
            element.style.width = "100px";
            element.style.height = "100px";
            return element;
        }

        var header = createSimpleElement(),
            footer = createSimpleElement();

        var tests = [
            function () {
                listView.header = header;
                listView.footer = footer;
                return true;
            },
            function () {
                LiveUnit.Assert.isTrue(!!lastHeaderEvent);
                LiveUnit.Assert.isTrue(lastHeaderEvent.detail.visible);
                LiveUnit.Assert.isTrue(!lastFooterEvent);

                listView.scrollPosition = footer[(listView._horizontal() ? "offsetLeft" : "offsetTop")] + 100;
                return true;
            },

            function () {
                LiveUnit.Assert.isFalse(lastHeaderEvent.detail.visible);
                LiveUnit.Assert.isTrue(!!lastFooterEvent);
                LiveUnit.Assert.isTrue(lastFooterEvent.detail.visible);

                listView.scrollPosition = 0;
                return true;
            },

            function () {
                LiveUnit.Assert.isTrue(lastHeaderEvent.detail.visible);
                LiveUnit.Assert.isFalse(lastFooterEvent.detail.visible);
                complete();
            }
        ];

        Helper.ListView.runTests(listView, tests);
    };
    generate('headerfooterevents', "GridLayout", headerfooterevents, { skipInitEvents: true });
    
    var disabledTestRegistry = {
        testEvent_headerfooterevents_Level2: Helper.BrowserCombos.all,
        testEvent_headerfooterevents_Level0: Helper.BrowserCombos.all
    };
    Helper.disableTests(ListViewEventsTest, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ListViewEventsTest");
