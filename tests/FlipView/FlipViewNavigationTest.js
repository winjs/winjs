// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/ItemsManager/TestDataSource.js" />
/// <reference path="../TestLib/ItemsManager/UnitTestsCommon.js" />
/// <reference path="FlipperHelpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.FlipViewNavigationTests = function () {
    "use strict";

    var COUNT = 6;
    var JUMPSCOUNT = 10;

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "BasicFlipView";
        newNode.style.width = "400px";
        newNode.style.height = "400px";
        document.body.appendChild(newNode);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        var element = document.getElementById("BasicFlipView");
        if (element) {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        }
    }

    this.generate = function (name, testFunction) {
        function generateTest(that, orientation) {
            that[name + "_" + orientation] = function (complete) {
                var element = document.getElementById("BasicFlipView"),
                    testData = createArraySource(COUNT, ["4200px"], ["4200px"]),
                    rawData = testData.rawData,
                    flipView;
                
                element.style.width = "4200px";
                element.style.height = "4200px";

                flipView = new WinJS.UI.FlipView(element, { itemDataSource: testData.dataSource, itemTemplate: basicInstantRenderer, orientation: orientation });
                setupQuickAnimations(flipView);
                testFunction(element, flipView, rawData, complete);
            };
        }

        generateTest(this, "horizontal");
        generateTest(this, "vertical");
    }
    this.generate("testFlipViewOn4KDisplay", navigationTest);
    
    this.generate = function (name, testFunction) {
        function generateTest(that, orientation) {
            that[name + "_" + orientation] = function (complete) {
                var element = document.getElementById("BasicFlipView"),
                    testData = createArraySource(COUNT, ["400px"], ["400px"]),
                    rawData = testData.rawData,
                    flipView = new WinJS.UI.FlipView(element, {itemDataSource: testData.dataSource, itemTemplate: basicInstantRenderer, orientation: orientation});
                setupQuickAnimations(flipView);
                testFunction(element, flipView, rawData, complete);
            };
        }

        generateTest(this, "horizontal");
        generateTest(this, "vertical");
    }
    this.generate("testBasicFlipViewNavigation", navigationTest);
    this.generate("testJumpToNavigation", jumpToTest);
    this.generate("testScrollChangedByNarrator", narratorScrollChangedTest);

    function narratorScrollChangedTest(element, flipview, rawData, complete) {
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, flipview.currentPage);
                if (flipview.orientation === "horizontal") {
                    flipview._panningDivContainer.scrollLeft += 400;
                } else {
                    flipview._panningDivContainer.scrollTop += 400;
                }
                // This should trigger a scroll position changed, and eventually 
                // a pageselected event. This simulates the 1-finger swipe
                // scenario with the narrator touch
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipview.currentPage);
                flipview.currentPage = 0;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipview.currentPage);
                complete();
            }
        ];
        runFlipViewTests(flipview, tests);
    }
    
    function verifyDisplayedItem(flipView, rawData) {
        LiveUnit.LoggingCore.logComment("Verifying displayed page is correct");
        LiveUnit.Assert.isTrue(currentPageInView(flipView));
        flipView.itemTemplate.verifyOutput(getDisplayedElement(flipView), rawData);
    }
    
    function navigationTest(element, flipView, rawData, complete) {
        var tests = [];
        for (var i = 0; i < COUNT - 1; i++) {
            var getWrappedNext = function getWrappedNext (targetIndex) {
                return function () {
                    LiveUnit.LoggingCore.logComment("Should be at " + targetIndex);
                    LiveUnit.Assert.areEqual(targetIndex, flipView.currentPage);
                    verifyDisplayedItem(flipView, rawData[targetIndex]);
                    LiveUnit.LoggingCore.logComment("Flipping ahead");
                    LiveUnit.Assert.isTrue(flipView.next());
                }
            };
            tests.push(getWrappedNext(i));
        }

        tests.push(function() {
            LiveUnit.LoggingCore.logComment("Should now be at end, flipView.next should fail");
            LiveUnit.Assert.areEqual(COUNT - 1, flipView.currentPage);
            verifyDisplayedItem(flipView, rawData[COUNT - 1]);
            LiveUnit.Assert.isFalse(flipView.next());     
            return true; 
        });

        for (var i = COUNT - 1; i > 0; i--) {
            var getWrappedPrevious = function getWrappedPrevious (targetIndex) {
                return function () {
                    LiveUnit.LoggingCore.logComment("Should be at " + targetIndex);
                    LiveUnit.Assert.areEqual(targetIndex, flipView.currentPage);
                    verifyDisplayedItem(flipView, rawData[targetIndex]);
                    LiveUnit.LoggingCore.logComment("Flipping back");
                    LiveUnit.Assert.isTrue(flipView.previous());
                }
            };
            tests.push(getWrappedPrevious(i));
        }

        tests.push(function() {
            LiveUnit.LoggingCore.logComment("Should now be at beginning, flipView.previous should fail");
            LiveUnit.Assert.areEqual(0, flipView.currentPage);
            verifyDisplayedItem(flipView, rawData[0]);
            LiveUnit.Assert.isFalse(flipView.previous());   
            complete();   
        });

        runFlipViewTests(flipView, tests);
    }
    
    function jumpToTest(element, flipView, rawData, complete) {
        var tests = [],
            lastIndex = 0;
        for (var i = 0; i < JUMPSCOUNT; i++) {
            var getWrappedJump = function getWrappedJump (targetIndex, lastIndex) {
                return function () {
                    // Validate aria-flowto attributes
                    var curr = flipView._pageManager._currentPage;
                    LiveUnit.Assert.areEqual(flipView._pageManager._bufferAriaStartMarker.getAttribute("aria-flowto"), curr.element.id);
                    var next = curr.next;
                    if (next && next.element) {
                        LiveUnit.Assert.areEqual(curr.element.getAttribute("aria-flowto"), next.element.id);
                        LiveUnit.Assert.areEqual(next.element.getAttribute("x-ms-aria-flowfrom"), curr.element.id);
                        var nextOfNext = curr.next.next;
                        if (nextOfNext && nextOfNext.element) {
                            LiveUnit.Assert.areEqual(next.element.getAttribute("aria-flowto"), nextOfNext.element.id);
                            LiveUnit.Assert.areEqual(nextOfNext.element.getAttribute("x-ms-aria-flowfrom"), next.element.id);
                            LiveUnit.Assert.areEqual(nextOfNext.element.getAttribute("aria-flowto"), flipView._pageManager._bufferAriaEndMarker.id);
                        }
                    }
                    var prev = curr.prev;
                    if (prev && prev.element) {
                        LiveUnit.Assert.areEqual(prev.element.getAttribute("aria-flowto"), curr.element.id);
                        LiveUnit.Assert.areEqual(curr.element.getAttribute("x-ms-aria-flowfrom"), prev.element.id);
                        var prevOfPrev = curr.prev.prev;
                        if (prevOfPrev && prevOfPrev.element) {
                            LiveUnit.Assert.areEqual(prevOfPrev.element.getAttribute("aria-flowto"), prev.element.id);
                            LiveUnit.Assert.areEqual(prev.element.getAttribute("x-ms-aria-flowfrom"), prevOfPrev.element.id);
                        }
                    }

                    LiveUnit.LoggingCore.logComment("Should be at " + lastIndex);
                    LiveUnit.Assert.areEqual(lastIndex, flipView.currentPage);
                    verifyDisplayedItem(flipView, rawData[lastIndex]);
                    LiveUnit.LoggingCore.logComment("Flipping to " + targetIndex);
                    flipView.currentPage = targetIndex;
                    return targetIndex === lastIndex;
                }
            };

            var nextIndex = pseudorandom(COUNT);
            tests.push(getWrappedJump(nextIndex, lastIndex));
            lastIndex = nextIndex;
        }
        tests.push(function() {
            if (flipView.currentPage === 0) {
                return true;
            }
            flipView.currentPage = 0;
        });
        tests.push(function() {
            flipView.currentPage = COUNT + 1;
        });
        tests.push(function() {
            LiveUnit.Assert.areEqual(COUNT - 1, flipView.currentPage);
            verifyDisplayedItem(flipView, rawData[COUNT - 1]);
            flipView.currentPage = -9999;
        });
        tests.push(function() {
            LiveUnit.Assert.areEqual(0, flipView.currentPage);
            verifyDisplayedItem(flipView, rawData[0]);
            complete();
        });

        runFlipViewTests(flipView, tests);
    }

    this.testZoombieFlipViewDuringNavigation = function (complete) {
        var element = document.getElementById("BasicFlipView"),
            testData = createArraySource(COUNT, ["400px"], ["400px"]),
            rawData = testData.rawData,
            flipView = new WinJS.UI.FlipView(element, { itemDataSource: testData.dataSource, itemTemplate: basicInstantRenderer });
            flipView.addEventListener("pageselected", function pageSelectedHandler() {
                flipView.removeEventListener("pageselected", pageSelectedHandler);
                LiveUnit.Assert.areEqual(0, flipView.currentPage);

                flipView.currentPage = 3;
                flipView.element.textContent = null;
                //Ensure that we don't get a JS exception when the animation completes
                setTimeout(complete, 1000);
            });
    }

    this.testCurrentPageDuringNavigationAnimation = function (complete) {
        var element = document.getElementById("BasicFlipView"),
            testData = createArraySource(COUNT, ["400px"], ["400px"]),
            rawData = testData.rawData,
            flipView = new WinJS.UI.FlipView(element, { itemDataSource: testData.dataSource, itemTemplate: basicInstantRenderer });

        flipView.addEventListener("pageselected", function pageSelectedHandler() {
            flipView.removeEventListener("pageselected", pageSelectedHandler);
            LiveUnit.Assert.areEqual(0, flipView.currentPage);
            // Go to the next page, and while it is animating, go back to the previous page. We should
            // end up in the first page.
            flipView.next();
        });

        var pageVisibleCount = 0,
            pageInvisibleCount = 0;
        flipView.addEventListener("pagevisibilitychanged", function pageVisibilityHandler(ev) {
            ev.detail.visible ? pageVisibleCount++ : pageInvisibleCount++;
            if (pageInvisibleCount === 2) {
                LiveUnit.Assert.areEqual(0, flipView.currentPage, "Flipview did not end in the first page");
                flipView.removeEventListener("pagevisibilitychanged", pageVisibilityHandler);
                complete();
            }
            WinJS.Utilities.Scheduler.schedule(function () {
                if (pageVisibleCount === 1) {
                    LiveUnit.Assert.isTrue(flipView._animating);
                    LiveUnit.Assert.areEqual(1, flipView.currentPage);
                    LiveUnit.Assert.isTrue(flipView._animating);
                    flipView.previous();
                }
            }, WinJS.Utilities.Scheduler.Priority.normal);
        });
    };
};

LiveUnit.registerTestClass("WinJSTests.FlipViewNavigationTests");
