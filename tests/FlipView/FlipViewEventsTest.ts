// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />
/// <reference path="FlipperHelpers.ts" />
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";

    var COUNT = 6;

    function verifyDisplayedItem(flipView, rawData) {
        LiveUnit.LoggingCore.logComment("Verifying displayed page is correct");
        LiveUnit.Assert.isTrue(currentPageInView(flipView));
        flipView.itemTemplate.verifyOutput(getDisplayedElement(flipView), rawData);
    }

    function eventsTest(element, flipView, rawData, complete, useL0DomEvent, pageAlreadyCompleted: boolean) {
        var gotVisibilityChangedTrue;
        var gotVisibilityChangedFalse;
        var outgoingElement;
        var expectedIncomingElement;

        function resetResults() {
            gotVisibilityChangedTrue = false;
            gotVisibilityChangedFalse = false;
            outgoingElement = null;
            expectedIncomingElement = null;
        }

        function verifyExpectedResults(targetIndex) {
            LiveUnit.Assert.isTrue(gotVisibilityChangedTrue);
            LiveUnit.Assert.isTrue(gotVisibilityChangedFalse);
            verifyDisplayedItem(flipView, rawData[targetIndex]);
            LiveUnit.Assert.isFalse(elementInView(flipView, outgoingElement));
            resetResults();
        }

        function customAnimation(outgoing, incoming) {
            outgoing = getElementFromContainer(outgoing);
            incoming = getElementFromContainer(incoming);
            LiveUnit.LoggingCore.logComment("Navigation animation triggered");
            LiveUnit.Assert.areEqual(expectedIncomingElement, incoming);
            expectedIncomingElement = null;
            outgoingElement = outgoing;
            return WinJS.Promise.timeout(25);
        }
        flipView.setCustomAnimations({
            next: customAnimation,
            previous: customAnimation,
            jump: customAnimation
        });

        function pageVisibilityHandler(e) {
            if (e.detail.visible) {
                LiveUnit.Assert.isFalse(gotVisibilityChangedTrue);
                gotVisibilityChangedTrue = true;
                expectedIncomingElement = e.target;
            } else {
                LiveUnit.Assert.isFalse(gotVisibilityChangedFalse);
                gotVisibilityChangedFalse = true;
                LiveUnit.Assert.areEqual(outgoingElement, e.target);
            }
        }

        if (useL0DomEvent) {
            flipView.onpagevisibilitychanged = pageVisibilityHandler;
        } else {
            flipView.addEventListener("pagevisibilitychanged", pageVisibilityHandler, false);
        }

        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                resetResults();
                verifyDisplayedItem(flipView, rawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyExpectedResults(1);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(2, flipView.currentPage);
                verifyExpectedResults(2);
                flipView.currentPage = 5;
            },
            function () {
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyExpectedResults(5);
                flipView.currentPage = 6;
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[5]);
                LiveUnit.Assert.isFalse(gotVisibilityChangedTrue);
                LiveUnit.Assert.isFalse(gotVisibilityChangedFalse);
                LiveUnit.Assert.isFalse(flipView.next());
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[5]);
                LiveUnit.Assert.isFalse(gotVisibilityChangedTrue);
                LiveUnit.Assert.isFalse(gotVisibilityChangedFalse);
                flipView.currentPage = 0;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyExpectedResults(0);
                complete();
            }
        ];

        runFlipViewTests(flipView, tests, pageAlreadyCompleted);
    }


    export class FlipViewEventsTests {


        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "BasicFlipView";
            newNode.style.width = "400px";
            newNode.style.height = "400px";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("BasicFlipView");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }

    }

    function generate(name, executeTest: Function) {
        function generateTest(orientation, useL0DomEvent) {
            FlipViewEventsTests.prototype[name + "_" + orientation + (useL0DomEvent ? "_useL0DomEvent" : "")] = function (complete) {
                var element = document.getElementById("BasicFlipView");
                var testData = createArraySource(COUNT, ["400px"], ["400px"]);
                var rawData = testData.rawData;
                var options = { itemDataSource: testData.dataSource, itemTemplate: basicInstantRenderer, orientation: orientation };
                var flipView: WinJS.UI.PrivateFlipView<any>;
                // Creating a new FlipView in the DOM will result in it handling an initial async resize event.
                // Wait for this to fire before continuing the test, so we don't detect any false positives
                // caused by resize handling code running in the middle of a test.
                flipView = <WinJS.UI.PrivateFlipView<any>> new WinJS.UI.FlipView(element, options);
                var initialResizePromise = new WinJS.Promise((c) => {
                    flipView._elementResizeInstrument.addEventListener("resize", c);
                });
                var pageCompletedPromise = new WinJS.Promise((c) => {
                    flipView.addEventListener("pagecompleted", c);
                });
                WinJS.Promise
                    .join([
                        initialResizePromise,
                        pageCompletedPromise
                    ])
                    .then(() => {
                        executeTest(element, flipView, rawData, complete, useL0DomEvent, /* pageAlreadyCompleted */ true);
                    });
            };
        }

        [true, false].forEach(function (useL0DomEvent) {
            generateTest("horizontal", useL0DomEvent);
            generateTest("vertical", useL0DomEvent);
        });

    }
    generate("testFlipViewPageEvents", eventsTest);
}
LiveUnit.registerTestClass("WinJSTests.FlipViewEventsTests");
