// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.js"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

var NavigationTests = null;

(function() {

    // Create NavigationTests object
    NavigationTests = function() {
        var flipperUtils = new FlipperUtils();
        var commonUtils = CommonUtilities;
        var pageSelectedEvent = "pagecompleted";

        //
        // Function: SetUp
        //
        this.setUp = function() {
            LiveUnit.LoggingCore.logComment("In setup");
            commonUtils.getIEInfo();
            // We want to recreate the flipper element between each test so we start fresh.
            flipperUtils.addFlipperDom();
        }

        //
        // Function: tearDown
        //
        this.tearDown = function() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            // We want to tear town the flipper element between each test so we start fresh.
            flipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperNext
        //
        this.testFlipperNext = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            var currentPage = flipper.currentPage;
            LiveUnit.LoggingCore.logComment("Current Page Before Next: " + currentPage);
            LiveUnit.Assert.isTrue(currentPage === 0, "Flipper didn't start at Index 0");

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (!flipperUtils.ensureNext(flipper, signalTestCaseCompleted)) {
                    LiveUnit.Assert.fail("Unable to flip to next.");
                }
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }

        //
        // Test: testFlipperPrevious
        //
        this.testFlipperPrevious = function(signalTestCaseCompleted) {
            var startPage = 5;
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: startPage });
            var currentPage = flipper.currentPage;
            LiveUnit.Assert.areEqual(currentPage, startPage, "Failed to instantiate flipper with " +
                " a start page of " + startPage);
            LiveUnit.LoggingCore.logComment("Current Page Before Previous: " + currentPage);

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (!flipperUtils.ensurePrevious(flipper, signalTestCaseCompleted)) {
                    LiveUnit.Assert.fail("Unable to flip to previous.");
                }
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }

        //
        // Test: testFlipperCurrentPage via setting currentPage
        //
        this.testFlipperCurrentPage = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            var cachedPage = 2;
            var currentPage = flipper.currentPage;
            LiveUnit.LoggingCore.logComment("Attempting to flip to page in cache (" + cachedPage + ")...");
            LiveUnit.LoggingCore.logComment("Current page before flip: " + currentPage);

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                flipperUtils.ensureCurrentPage(flipper, cachedPage,
                    LiveUnit.GetWrappedCallback(TestCurrentPageInitial));
            });
            flipper.addEventListener(pageSelectedEvent, verify);

            function TestCurrentPageInitial() {
                currentPage = flipper.currentPage;
                LiveUnit.LoggingCore.logComment("Current page after flip: " + currentPage);
                LiveUnit.Assert.areEqual(cachedPage, flipper.currentPage, "Page after flip should be: " + cachedPage);
                LiveUnit.LoggingCore.logComment("Attempt to flip to adjacent page...");
                flipperUtils.ensureCurrentPage(flipper, cachedPage + 1,
                    LiveUnit.GetWrappedCallback(TestCurrentPageAdjacent));

                function TestCurrentPageAdjacent() {
                    currentPage = flipper.currentPage;
                    var notCachedPage = currentPage - (cachedPage + 1);
                    LiveUnit.LoggingCore.logComment("Current page after flip: " + currentPage);
                    LiveUnit.Assert.areEqual(cachedPage + 1, currentPage, "Page after flip should be: " +
                        (cachedPage + 1));
                    LiveUnit.LoggingCore.logComment("Attempt to flip to page outside of cache: " + notCachedPage);
                    flipperUtils.ensureCurrentPage(flipper, notCachedPage,
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
        this.testFlipperJumpToSamePage = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            var page = flipper.currentPage;
            var eventTriggered = false;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function() {
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

            setTimeout(LiveUnit.GetWrappedCallback(function() {
                flipper.removeEventListener("pagevisibilitychanged", pageVisibilityEventTriggered, false);
                if (eventTriggered) {
                    LiveUnit.Assert.fail("Event for pagevisibility was fired which should not have occured.");
                }
                else {
                    LiveUnit.LoggingCore.logComment("It appears that currentPage did not trigger the " +
                        " pagevisibility event as expected.");
                    signalTestCaseCompleted();
                }
            }), NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperNextBorder
        //
        this.testFlipperNextBorder = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: 6 });
            var curPage = flipper.currentPage;
            var eventTriggered = false;
            var returnValue;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function() {
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

            setTimeout(LiveUnit.GetWrappedCallback(function() {
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
            }), NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperPreviousBorder
        //
        this.testFlipperPreviousBorder = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            var curPage = flipper.currentPage;
            var eventTriggered = false;
            var returnValue;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function() {
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

            setTimeout(LiveUnit.GetWrappedCallback(function() {
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
            }), NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperJumpToInvalidPage via currentPage
        //
        this.testFlipperJumpToInvalidPage = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            var startPage = flipper.currentPage;
            var page = 500;
            var eventTriggered = false;
            var pageVisibilityEventTriggered = LiveUnit.GetWrappedCallback(function() {
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

            setTimeout(LiveUnit.GetWrappedCallback(function() {
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
            }), NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperJumpToRandom
        //
        this.testFlipperJumpToRandom = function (signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            var flipperSize = 7;
            var jumpCount = 0;
            var oldPage = flipper.currentPage;
            var pageToJumpTo = pseudorandom(flipperSize);

            function pseudorandom(upto) {
                return Math.floor(Math.random() * upto);
            }

            var nextJumpCallBack = function() {
                LiveUnit.Assert.areEqual(flipper.currentPage, pageToJumpTo, "Jumped from " + oldPage + " to " + pageToJumpTo);
                if (jumpCount < 30) {
                    jumpCount++;
                    oldPage = flipper.currentPage;
                    do {
                        pageToJumpTo = pseudorandom(flipperSize);
                    } while (pageToJumpTo === oldPage);
                    LiveUnit.LoggingCore.logComment("Jumping from " + oldPage + " to " + pageToJumpTo);
                    flipperUtils.ensureCurrentPage(flipper, pageToJumpTo, nextJumpCallBack);
                }
                else {
                    signalTestCaseCompleted();
                }
            };

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                LiveUnit.Assert.areEqual(flipper.currentPage, 0, "Flipper started at current page");
                LiveUnit.LoggingCore.logComment("Jumping from " + oldPage + " to " + pageToJumpTo);

                while(pageToJumpTo === oldPage) {
                    pageToJumpTo = pseudorandom(flipperSize);
                }
                flipperUtils.ensureCurrentPage(flipper, pageToJumpTo, nextJumpCallBack);
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }

        //
        // Test: testFlipperItemVisible
        //
        this.testFlipperItemVisible = function(signalTestCaseCompleted) {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID()),
                pages = flipperUtils.basicFlipperHtmlIDs();

            var checkVisibleItems = LiveUnit.GetWrappedCallback(function(flipDir) {
                var currentPage = flipper.currentPage;
                LiveUnit.LoggingCore.logComment("Current Page After Flip " + flipDir + ": " + currentPage);
                LiveUnit.LoggingCore.logComment("Check all pages, ensure " + pages[currentPage] +
                    " is the only page that is visible via DOM.");
                for (var pageIndex in pages) {
                    LiveUnit.LoggingCore.logComment("Testing " + pages[pageIndex] + " vs. " + pages[currentPage]);
                    if (flipperUtils.isFlipperItemVisible(pages[pageIndex])) {
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
                        if (flipperUtils.ensureNext(flipper, nextCompleted)) {
                            LiveUnit.LoggingCore.logComment("Flip to next page returned true.");
                        }
                        else {
                            LiveUnit.Assert.fail("Flip to next page failed.");
                        }
                    }
                    else {
                        if (flipperUtils.ensurePrevious(flipper, previousCompleted)) {
                            LiveUnit.LoggingCore.logComment("Flip to previous page returned true.");
                        }
                        else {
                            LiveUnit.Assert.fail("Flip to previous page failed.");
                        }
                    }
                }
                else {
                    if (currentPage > 0) {
                        if (flipperUtils.ensurePrevious(flipper, previousCompleted)) {
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

            var nextCompleted = LiveUnit.GetWrappedCallback(function() {
                checkVisibleItems("next");
            });

            var previousCompleted = LiveUnit.GetWrappedCallback(function() {
                checkVisibleItems("previous");
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (flipperUtils.ensureNext(flipper, nextCompleted)) {
                    LiveUnit.LoggingCore.logComment("Flip to next page returned true.");
                }
                else {
                    LiveUnit.Assert.fail("Flip to next page failed.");
                }
            });
            flipper.addEventListener(pageSelectedEvent, verify);
        }
    }
    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("NavigationTests");
} ());
