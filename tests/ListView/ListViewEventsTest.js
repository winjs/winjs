// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.ListViewEventsTest = function () {
    "use strict";

    var list;

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function () {

        LiveUnit.LoggingCore.logComment("In setup");

        var newNode = document.createElement("div");
        newNode.id = "ListViewEventsTest";
        newNode.innerHTML =
            "<div id='list' style='width:350px; height:400px'></div>";
        document.body.appendChild(newNode);

        list = document.getElementById("list");

        list.setPointerCapture = function () { };
        list.releasePointerCapture = function () { };

        this.oldHasWinRT = WinJS.Utilities.hasWinRT;
        WinJS.Utilities._setHasWinRT(false);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        WinJS.Utilities._setHasWinRT(this.oldHasWinRT);

        var element = document.getElementById("ListViewEventsTest");
        if (element) {
            document.body.removeChild(element);
        }
    };

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

    var that = this;
    this.generate = function (eventName, layoutName, testFunction, options) {
        options = options || {};
        function generateTest(eventType) {
            var testName = 'testEvent_' + eventName + '_' + eventType + (layoutName == "GridLayout" ? "" : "_" + layoutName);
            that[testName] = function (complete) {
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
                    eventName.fired = true;
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
                    if (!eventName.fired) {
                        throw Error(eventType + ' event: ' + eventName + ' did not fire in ' + timeoutmsec + ' ms!');
                    }
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
    this.generate('loadingstatechanged', "GridLayout", loadingstatechanged);

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

        runTests(listView, tests);
    };
    this.generate('iteminvoked', "GridLayout", iteminvoked, { size: "50px" });

    var selectionchanging = function (listView) {
        var tests = [function () {
            var elements = list.querySelectorAll('.win-container');
            LiveUnit.Assert.isTrue(elements.length !== 0);

            // Set selection using API
            listView.selection.set([0]);
        }];

        runTests(listView, tests);
    };
    this.generate('selectionchanging', "GridLayout", selectionchanging);


    var selectionchanged = function (listView) {
        var tests = [function () {
            var elements = list.querySelectorAll('.win-container');
            LiveUnit.Assert.isTrue(elements.length !== 0);

            // Set selection using API
            listView.selection.set([0]);
        }];

        runTests(listView, tests);
    };
    this.generate('selectionchanged', "GridLayout", selectionchanged);

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

        runTests(listView, tests);
    };
    this.generate('keyboardnavigating', "GridLayout", keyboardnavigating);

    var loadingstatechanged_NumItemsLoadedEventProperty = function (listView, complete) {
        listView.addEventListener("loadingstatechanged", function (e) {
            var isComplete = listView.loadingState === "complete";
            if (isComplete) {
                complete();
            }
        });
    };

    this.generate('loadingstatechanged_NumItemsLoadedEventProperty', "GridLayout", loadingstatechanged_NumItemsLoadedEventProperty, { skipInitEvents: true });
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ListViewEventsTest");
