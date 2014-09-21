// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>


module WinJSTests {

    "use strict";

    var pageSelectedEvent = "pagecompleted";

    // Create NavigationTests object
    export class NavigationTests {
        

        //
        // Function: SetUp
        //
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            CommonUtilities.getIEInfo();
            // We want to recreate the flipper element between each test so we start fresh.
            FlipperUtils.addFlipperDom();
        }

        //
        // Function: tearDown
        //
        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            // We want to tear town the flipper element between each test so we start fresh.
            FlipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperNext
        //
        testFlipperNext = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            var currentPage = flipper.currentPage;
            LiveUnit.LoggingCore.logComment("Current Page Before Next: " + currentPage);
            LiveUnit.Assert.isTrue(currentPage === 0, "Flipper didn't start at Index 0");

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (!FlipperUtils.ensureNext(flipper, signalTestCaseCompleted)) {
                    LiveUnit.Assert.fail("Unable to flip to next.");
                }
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }

        //
        // Test: testFlipperPrevious
        //
        testFlipperPrevious = function (signalTestCaseCompleted) {
            var startPage = 5;
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { currentPage: startPage });
            var currentPage = flipper.currentPage;
            LiveUnit.Assert.areEqual(currentPage, startPage, "Failed to instantiate flipper with " +
                " a start page of " + startPage);
            LiveUnit.LoggingCore.logComment("Current Page Before Previous: " + currentPage);

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (!FlipperUtils.ensurePrevious(flipper, signalTestCaseCompleted)) {
                    LiveUnit.Assert.fail("Unable to flip to previous.");
                }
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }

        //
        // Test: testFlipperCurrentPage via setting currentPage
        //
        testFlipperCurrentPage = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            var cachedPage = 2;
            var currentPage = flipper.currentPage;
            LiveUnit.LoggingCore.logComment("Attempting to flip to page in cache (" + cachedPage + ")...");
            LiveUnit.LoggingCore.logComment("Current page before flip: " + currentPage);

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                FlipperUtils.ensureCurrentPage(flipper, cachedPage,
                    LiveUnit.GetWrappedCallback(TestCurrentPageInitial));
            });
            flipper.addEventListener(pageSelectedEvent, verify);

            function TestCurrentPageInitial() {
                currentPage = flipper.currentPage;
                LiveUnit.LoggingCore.logComment("Current page after flip: " + currentPage);
                LiveUnit.Assert.areEqual(cachedPage, flipper.currentPage, "Page after flip should be: " + cachedPage);
                LiveUnit.LoggingCore.logComment("Attempt to flip to adjacent page...");
                FlipperUtils.ensureCurrentPage(flipper, cachedPage + 1,
                    LiveUnit.GetWrappedCallback(TestCurrentPageAdjacent));

                function TestCurrentPageAdjacent() {
                    currentPage = flipper.currentPage;
                    var notCachedPage = currentPage - (cachedPage + 1);
                    LiveUnit.LoggingCore.logComment("Current page after flip: " + currentPage);
                    LiveUnit.Assert.areEqual(cachedPage + 1, currentPage, "Page after flip should be: " +
                        (cachedPage + 1));
                    LiveUnit.LoggingCore.logComment("Attempt to flip to page outside of cache: " + notCachedPage);
                    FlipperUtils.ensureCurrentPage(flipper, notCachedPage,
                        LiveUnit.GetWrappedCallback(TestCurrentPageNotCached));

                    function TestCurrentPageNotCached() {
                        LiveUnit.LoggingCore.logComment("Current page after flip: " + flipper.currentPage);
                        LiveUnit.Assert.areEqual(notCachedPage, flipper.currentPage, "Page after flip should be: " +
                            notCachedPage);
                        signalTestCaseCompleted();
                    }
                }
            }
        }

        //
        // Test: testFlipperJumpToSamePage via setting currentPage
        //
        testFlipperJumpToSamePage = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            var page = flipper.currentPage;
            var eventTriggered = false;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function () {
                eventTriggered = true;
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Current Page: " + flipper.currentPage);
                LiveUnit.LoggingCore.logComment("Tried to jump to page " + page);
                LiveUnit.LoggingCore.logComment("Event for pagevisibility was fired which should not have occured.");
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                LiveUnit.LoggingCore.logComment("Attempting to flip to same page (same as current): " + page);
                flipper.addEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                flipper.currentPage = page;
            });
            flipper.addEventListener(pageSelectedEvent, verify);

            setTimeout(LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                if (eventTriggered) {
                    LiveUnit.Assert.fail("Event for pagevisibility was fired which should not have occured.");
                }
                else {
                    LiveUnit.LoggingCore.logComment("It appears that currentPage did not trigger the " +
                        " pagevisibility event as expected.");
                    signalTestCaseCompleted();
                }
            }), FlipperUtils.NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperNextBorder
        //
        testFlipperNextBorder = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { currentPage: 6 });
            var curPage = flipper.currentPage;
            var eventTriggered = false;
            var returnValue;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function () {
                eventTriggered = true;
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Current Page: " + flipper.currentPage);
                LiveUnit.LoggingCore.logComment("Tried to flip to next page.");
            });

            if (curPage != 6) {
                LiveUnit.Assert.fail("Unable to stage for border test");
            }

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                LiveUnit.LoggingCore.logComment("Current Page Before flipping to Next page: " + curPage);
                flipper.addEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                returnValue = flipper.next();
            });
            flipper.addEventListener(pageSelectedEvent, verify);

            setTimeout(LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Next method returned: " + returnValue);
                if (eventTriggered) {
                    LiveUnit.Assert.fail("Event for pagevisibility was fired which should not have occured.");
                }
                else {
                    LiveUnit.LoggingCore.logComment("It appears that next() did not trigger the pagevisibility event as expected.");
                }
                if (returnValue) {
                    LiveUnit.Assert.fail("Next method should not have returned " + returnValue);
                }
                else {
                    LiveUnit.LoggingCore.logComment("Current Page After Attempt To Flip: " + flipper.currentPage);
                    LiveUnit.Assert.areEqual(flipper.currentPage, curPage, "Should not be able to flip past last page.");
                    LiveUnit.LoggingCore.logComment("SUCCESS: Unable to flip to Next page.");
                    signalTestCaseCompleted();
                }
            }), FlipperUtils.NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperPreviousBorder
        //
        testFlipperPreviousBorder = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            var curPage = flipper.currentPage;
            var eventTriggered = false;
            var returnValue;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function () {
                eventTriggered = true;
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Current Page: " + flipper.currentPage);
                LiveUnit.LoggingCore.logComment("Tried to flip to next page.");
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                LiveUnit.LoggingCore.logComment("Current Page Before flipping to Previous page: " + curPage);
                flipper.addEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                returnValue = flipper.previous();
            });
            flipper.addEventListener(pageSelectedEvent, verify);

            setTimeout(LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Previous method returned: " + returnValue);
                if (eventTriggered) {
                    LiveUnit.Assert.fail("Event for pagevisibility was fired which should not have occured.");
                }
                else {
                    LiveUnit.LoggingCore.logComment("It appears that previous() did not trigger the pagevisibility event as expected.");
                }
                if (returnValue) {
                    LiveUnit.Assert.fail("Previous method should not have returned " + returnValue);
                }
                else {
                    LiveUnit.LoggingCore.logComment("Current Page After Attempt To Flip: " + flipper.currentPage);
                    LiveUnit.Assert.areEqual(flipper.currentPage, curPage, "Should not be able to flip before first page.");
                    LiveUnit.LoggingCore.logComment("SUCCESS: Unable to flip to Previous page.");
                    signalTestCaseCompleted();
                }
            }), FlipperUtils.NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperJumpToInvalidPage via currentPage
        //
        testFlipperJumpToInvalidPage = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            var startPage = flipper.currentPage;
            var page = 500;
            var eventTriggered = false;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function () {
                eventTriggered = true;
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Current Page: " + flipper.currentPage);
                LiveUnit.LoggingCore.logComment("Tried to jump to page " + page);
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                flipper.addEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                LiveUnit.LoggingCore.logComment("Attempt to set currentPage: " + page);
                LiveUnit.LoggingCore.logComment("Current Page Before Flip: " + flipper.currentPage);
                flipper.currentPage = page;
            });
            flipper.addEventListener(pageSelectedEvent, verify);

            setTimeout(LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                if (eventTriggered) {
                    // There are 7 pages in the flipper
                    var lastPageIndex = 6;
                    LiveUnit.Assert.areEqual(lastPageIndex, flipper.currentPage, "Current page: " + flipper.currentPage +
                        " after navigating to an out of range index is not the last page: " + lastPageIndex);
                    signalTestCaseCompleted();
                }
                else {
                    LiveUnit.LoggingCore.logComment("It appears that setting the currentPage to " + page +
                        " did not trigger the pagevisibility event as expected");
                    LiveUnit.LoggingCore.logComment("Current Page After Attempt To Flip: " + flipper.currentPage);
                }
            }), FlipperUtils.NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperJumpToRandom
        //
        testFlipperJumpToRandom = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID());
            var flipperSize = 7;
            var jumpCount = 0;
            var oldPage = flipper.currentPage;
            var pageToJumpTo = pseudorandom(flipperSize);

            function pseudorandom(upto) {
                return Math.floor(Math.random() * upto);
            }

            var nextJumpCallBack = function () {
                LiveUnit.Assert.areEqual(flipper.currentPage, pageToJumpTo, "Jumped from " + oldPage + " to " + pageToJumpTo);
                if (jumpCount < 30) {
                    jumpCount++;
                    oldPage = flipper.currentPage;
                    do {
                        pageToJumpTo = pseudorandom(flipperSize);
                    } while (pageToJumpTo === oldPage);
                    LiveUnit.LoggingCore.logComment("Jumping from " + oldPage + " to " + pageToJumpTo);
                    FlipperUtils.ensureCurrentPage(flipper, pageToJumpTo, nextJumpCallBack);
                }
                else {
                    signalTestCaseCompleted();
                }
            };

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                LiveUnit.Assert.areEqual(flipper.currentPage, 0, "Flipper started at current page");
                LiveUnit.LoggingCore.logComment("Jumping from " + oldPage + " to " + pageToJumpTo);

                while (pageToJumpTo === oldPage) {
                    pageToJumpTo = pseudorandom(flipperSize);
                }
                FlipperUtils.ensureCurrentPage(flipper, pageToJumpTo, nextJumpCallBack);
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }

        //
        // Test: testFlipperItemVisible
        //
        testFlipperItemVisible = function (signalTestCaseCompleted) {
            var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID()),
                pages = FlipperUtils.basicFlipperHtmlIDs();

            var checkVisibleItems = LiveUnit.GetWrappedCallback(function (flipDir) {
                var currentPage = flipper.currentPage;
                LiveUnit.LoggingCore.logComment("Current Page After Flip " + flipDir + ": " + currentPage);
                LiveUnit.LoggingCore.logComment("Check all pages, ensure " + pages[currentPage] +
                    " is the only page that is visible via DOM.");
                for (var pageIndex in pages) {
                    LiveUnit.LoggingCore.logComment("Testing " + pages[pageIndex] + " vs. " + pages[currentPage]);
                    if (FlipperUtils.isFlipperItemVisible(pages[pageIndex])) {
                        if (pages[pageIndex] !== pages[currentPage]) {
                            LiveUnit.Assert.fail(pages[pageIndex] + ": Should NOT be in view, but it is.");
                        }
                    }
                    else {
                        if (pages[pageIndex] === pages[currentPage]) {
                            LiveUnit.Assert.fail(pages[pageIndex] + ": Should be in view, but it is not.");
                        }
                    }
                }
                if (flipDir === 'next') {
                    if (currentPage < pages.length - 1) {
                        if (FlipperUtils.ensureNext(flipper, nextCompleted)) {
                            LiveUnit.LoggingCore.logComment("Flip to next page returned true.");
                        }
                        else {
                            LiveUnit.Assert.fail("Flip to next page failed.");
                        }
                    }
                    else {
                        if (FlipperUtils.ensurePrevious(flipper, previousCompleted)) {
                            LiveUnit.LoggingCore.logComment("Flip to previous page returned true.");
                        }
                        else {
                            LiveUnit.Assert.fail("Flip to previous page failed.");
                        }
                    }
                }
                else {
                    if (currentPage > 0) {
                        if (FlipperUtils.ensurePrevious(flipper, previousCompleted)) {
                            LiveUnit.LoggingCore.logComment("Flip to previous page returned true.");
                        }
                        else {
                            LiveUnit.Assert.fail("Flip to previous page failed.");
                        }
                    }
                    else {
                        signalTestCaseCompleted();
                    }
                }
            });

            var nextCompleted = LiveUnit.GetWrappedCallback(function () {
                checkVisibleItems("next");
            });

            var previousCompleted = LiveUnit.GetWrappedCallback(function () {
                checkVisibleItems("previous");
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (FlipperUtils.ensureNext(flipper, nextCompleted)) {
                    LiveUnit.LoggingCore.logComment("Flip to next page returned true.");
                }
                else {
                    LiveUnit.Assert.fail("Flip to next page failed.");
                }
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }
    }

}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.NavigationTests");
