// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="../TestLib/NavBar/NavBarUtils.js"/>

var WinJSTests = WinJSTests || {};

WinJSTests.NavBarLayoutTests = function () {
    "use strict";

    var Key = WinJS.Utilities.Key;
    var canElementResize = null;
    
    function fireWindowResize() {
        var event = document.createEvent("Event");
        event.initEvent("resize", false, false);
        window.dispatchEvent(event);
    }

    this.setUp = function (complete) {
        LiveUnit.LoggingCore.logComment("In setup");
        this._elementWrapper = document.createElement("div");
        var newNode = document.createElement("div");
        newNode.id = "container";
        newNode.style.width = "500px";
        newNode.style.backgroundColor = "darkgreen";
        this._elementWrapper.appendChild(newNode);
        document.body.appendChild(this._elementWrapper);
        this._element = newNode;
        CommonUtilities.detectMsElementResize(function(canResize) {
            canElementResize = canResize;
            complete();
        });
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        if (this._elementWrapper) {
            WinJS.Utilities.disposeSubTree(this._elementWrapper);
            document.body.removeChild(this._elementWrapper);
            this._elementWrapper = null;
            this._element = null;
        }
    };

    var navUtils = NavBarUtils;

    // Dimension from the redlines
    // \\REDMOND\win\Teams\Windesign\WinBlue\Personality\Controls\Nav bar\MP
    var NavBarCommandSize = {
        cmdWidth: 210,
        cmdHeight: 50,
        buttonContentWidthNoSplit: 190,
        buttonContentWidthWithSplit: 153,
        buttonWidth: 168,
        buttonHeight: 50,
        splitButtonWidth: 40,
        splitButtonHeight: 50,
        iconWidth: 40,
        iconHeight: 40,
        labelWidthNoSplitButton: 150,
        labelWidthWithSplitButton: 113,
        labelHeight: 40
    };

    var NavBarContainerSize = {
        height: 90,
        pageIndicatorWidth: 40,
        pageIndicatorHeight: 4,
        navarrowHeight: 50,
        navarrowWidth: 17
    };

    var ShownNavBarSize = {
        minHeight: 60,
        height: 90
    };
    var that = this;

    (function () {
        function generateTest(rtl, fixedSize) {
            return function (complete) {
                if (rtl) {
                    that._element.dir = "rtl";
                }
                var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
                    // No split button
                    data: navUtils.getNavBarCommandsData(6, true, true, true, true, true, false),
                    fixedSize: fixedSize
                });

                // Verify NavBarCommand dimensions
                var firstNavCmdEl = that._element.querySelector(".win-navbarcommand");
                LiveUnit.Assert.areEqual(NavBarCommandSize.cmdWidth, firstNavCmdEl.offsetWidth,
                    "Incorrect NavBarCommand width");
                LiveUnit.Assert.areEqual(NavBarCommandSize.cmdHeight, firstNavCmdEl.offsetHeight,
                    "Incorrect NavBarCommand height");

                // Verify button dimensions
                var buttonEl = firstNavCmdEl.querySelector(".win-navbarcommand-button");
                LiveUnit.Assert.areEqual(NavBarCommandSize.cmdWidth, buttonEl.offsetWidth,
                    "Incorrect NavBarCommand button width");
                // WinBlue: 164498 - The bug will probably be won't fixed
                //var buttonContentEl = buttonEl.querySelector(".win-navbarcommand-button-content");
                //LiveUnit.Assert.areEqual(NavBarCommandSize.buttonContentWidthNoSplit, buttonContentEl.offsetWidth,
                //    "Incorrect NavBarCommand button content width");

                // Verify icon dimensions
                var iconEl = firstNavCmdEl.querySelector(".win-navbarcommand-icon");
                LiveUnit.Assert.areEqual(NavBarCommandSize.iconWidth, iconEl.offsetWidth,
                    "Incorrect NavBarCommand icon width");
                LiveUnit.Assert.areEqual(NavBarCommandSize.iconHeight, iconEl.offsetHeight,
                    "Incorrect NavBarCommand icon height");

                // Verify label dimensions

                // WinBlue: 163558 - The bug will probably be won't fixed
                // Should probably update the test to verify the current values
                //var labelEl = firstNavCmdEl.querySelector(".win-navbarcommand-label");
                //LiveUnit.Assert.areEqual(NavBarCommandSize.labelWidthNoSplitButton, labelEl.offsetWidth,
                //    "Incorrect NavBarCommand label width");
                //LiveUnit.Assert.areEqual(NavBarCommandSize.labelHeight, labelEl.offsetHeight,
                //    "Incorrect NavBarCommand label height");

                complete();

            };
        };

        that["testNavBarCommandLayoutNoSplitButtonFixedSize_LTR"] = generateTest(false, true);
        that["testNavBarCommandLayoutNoSplitButtonFixedSize_RTL"] = generateTest(true, true);
    })();

    (function () {
        function generateTest(rtl, fixedSize) {
            return function (complete) {
                if (rtl) {
                    that._element.dir = "rtl";
                }

                var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
                    // With split button
                    data: navUtils.getNavBarCommandsData(6, true, true, true, true, true, true),
                    fixedSize: fixedSize
                });

                // Verify NavBarCommand dimensions
                var firstNavCmdEl = that._element.querySelector(".win-navbarcommand");
                LiveUnit.Assert.areEqual(NavBarCommandSize.cmdWidth, firstNavCmdEl.offsetWidth,
                    "Incorrect NavBarCommand width");
                LiveUnit.Assert.areEqual(NavBarCommandSize.cmdHeight, firstNavCmdEl.offsetHeight,
                    "Incorrect NavBarCommand height");

                // Verify button dimensions
                var buttonEl = firstNavCmdEl.querySelector(".win-navbarcommand-button");
                LiveUnit.Assert.areEqual(NavBarCommandSize.buttonWidth, buttonEl.offsetWidth,
                    "Incorrect NavBarCommand button width");
                LiveUnit.Assert.areEqual(NavBarCommandSize.buttonHeight, buttonEl.offsetHeight,
                    "Incorrect NavBarCommand button height");
                // WinBlue: 164498 - The bug will probably be won't fixed
                //var buttonContentEl = buttonEl.querySelector(".win-navbarcommand-button-content");
                //LiveUnit.Assert.areEqual(NavBarCommandSize.buttonContentWidthWithSplit, buttonContentEl.offsetWidth,
                //    "Incorrect NavBarCommand button content width");

                // Verify icon dimensions
                var iconEl = firstNavCmdEl.querySelector(".win-navbarcommand-icon");
                LiveUnit.Assert.areEqual(NavBarCommandSize.iconWidth, iconEl.offsetWidth,
                    "Incorrect NavBarCommand icon width");
                LiveUnit.Assert.areEqual(NavBarCommandSize.iconHeight, iconEl.offsetHeight,
                    "Incorrect NavBarCommand icon height");

                // Verify label dimensions
                // WinBlue: 163558 - The bug will probably be won't fixed
                // Should probably update the test to verify the current values
                //var labelEl = firstNavCmdEl.querySelector(".win-navbarcommand-label");
                //LiveUnit.Assert.areEqual(NavBarCommandSize.labelWidthWithSplitButton, labelEl.offsetWidth,
                //    "Incorrect NavBarCommand label width");
                //LiveUnit.Assert.areEqual(NavBarCommandSize.labelHeight, labelEl.offsetHeight,
                //    "Incorrect NavBarCommand label height");

                // Verify split button dimensions
                var splitButtonEl = firstNavCmdEl.querySelector(".win-navbarcommand-splitbutton");
                LiveUnit.Assert.areEqual(NavBarCommandSize.splitButtonWidth, splitButtonEl.offsetWidth,
                    "Incorrect NavBarCommand split button width");
                LiveUnit.Assert.areEqual(NavBarCommandSize.splitButtonHeight, splitButtonEl.offsetHeight,
                    "Incorrect NavBarCommand split button height");

                complete();
            }
        }

        that["testNavBarCommandLayoutWithSplitButtonFixedSize_LTR"] = generateTest(false, true);
        that["testNavBarCommandLayoutWithSplitButtonFixedSize_RTL"] = generateTest(true, true);
    })();

    (function () {
        function generateTest(rtl, fixedSize) {
            return function (complete) {
                if (rtl) {
                    that._element.dir = "rtl";
                }

                var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
                    // With split button
                    data: navUtils.getNavBarCommandsData(8, true, true, true, true, true, true),
                    fixedSize: fixedSize
                });

                // Verify height
                LiveUnit.Assert.areEqual(NavBarContainerSize.height, that._element.offsetHeight,
                    "Incorrect NavBarContainer height");

                // Verify page indicators
                var pageIndicatorEl = that._element.querySelector(".win-navbarcontainer-pageindicator");
                var computedStyle = getComputedStyle(pageIndicatorEl);
                LiveUnit.Assert.areEqual(NavBarContainerSize.pageIndicatorHeight, parseInt(computedStyle.height, 10),
                    "Incorrect NavBarContainer pageindicator height");
                LiveUnit.Assert.areEqual(NavBarContainerSize.pageIndicatorWidth, parseInt(computedStyle.width, 10),
                    "Incorrect NavBarContainer pageindicator width");

                // Verify navarrows
                var leftArrowEl = that._element.querySelector(".win-navbarcontainer-navleft"),
                    rightArrowEl = that._element.querySelector(".win-navbarcontainer-navright");
                LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowWidth, leftArrowEl.offsetWidth,
                    "Incorrect left navarrow width");
                LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowWidth, rightArrowEl.offsetWidth,
                    "Incorrect right navarrow width");
                LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowHeight, leftArrowEl.offsetHeight,
                    "Incorrect left navarrow height");
                LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowHeight, rightArrowEl.offsetHeight,
                    "Incorrect right navarrow height");

                var rows = 1,
                    cols = 2,
                    cmdsPerPage = rows * cols,
                    navArrowMargin = 30,
                    marginBetweenCmd = 10,
                    numberOfcmds = 8;

                var navbarCmds = that._element.querySelectorAll(".win-navbarcommand");
                LiveUnit.Assert.areEqual(numberOfcmds, navbarCmds.length);

                var expectedOffsetLeft,
                    expectedOffsetTop = 20,
                    currentPage,
                    colInPage,
                    pageWidth = navArrowMargin + (2 * (NavBarCommandSize.cmdWidth + marginBetweenCmd)) + navArrowMargin;

                if (!rtl) {
                    // LTR
                    // Verify layout of navbarCommands
                    for (var i = 0, len = navbarCmds.length; i < len; i++) {
                        // Zero based
                        currentPage = Math.floor(i / cmdsPerPage);
                        colInPage = i % cmdsPerPage;
                        expectedOffsetLeft = (currentPage * pageWidth) + navArrowMargin +
                            (colInPage * (marginBetweenCmd + NavBarCommandSize.cmdWidth));

                        LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                        LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                    }
                } else {
                    // RTL
                    var rtlConstant = -(3 * pageWidth);
                    for (var i = navbarCmds.length - 1; i >= 0; i--) {
                        // Zero based
                        currentPage = Math.floor((numberOfcmds - 1 - i) / cmdsPerPage);
                        colInPage = 1 - (i % cmdsPerPage);
                        // In RTL mode, origin (0,0) for offsetLeft calculation is different from LTR mode
                        // Hence we need to adjust the offsetLeft by a constant value
                        expectedOffsetLeft = rtlConstant + (currentPage * pageWidth) + navArrowMargin +
                            marginBetweenCmd + (colInPage * (marginBetweenCmd + NavBarCommandSize.cmdWidth));

                        LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                        LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                    }
                }

                complete();
            };
        }

        that["testNavBarContainerLayoutSingleRowFixedSize_LTR"] = generateTest(false, true);
        that["testNavBarContainerLayoutSingleRowFixedSize_RTL"] = generateTest(true, true);
    })();

    (function () {
        function generateTest(rtl, fixedSize, forceLayout) {
            return function (complete) {
                if (rtl) {
                    that._element.dir = "rtl";
                }

                var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
                    // With split button
                    data: navUtils.getNavBarCommandsData(8, true, true, true, true, true, true),
                    fixedSize: fixedSize
                });

                // Resize
                that._element.style.width = "600px";
                if (forceLayout) {
                    navbarContainer.forceLayout();
                } else if (!canElementResize) {
                    fireWindowResize();
                }

                // Wait for the resize to fire
                WinJS.Promise.timeout(50).then(function () {
                    // Verify height
                    LiveUnit.Assert.areEqual(NavBarContainerSize.height, that._element.offsetHeight,
                        "Incorrect NavBarContainer height");

                    // Verify page indicators
                    var pageIndicatorEl = that._element.querySelector(".win-navbarcontainer-pageindicator");
                    var computedStyle = getComputedStyle(pageIndicatorEl);
                    LiveUnit.Assert.areEqual(NavBarContainerSize.pageIndicatorHeight, parseInt(computedStyle.height, 10),
                        "Incorrect NavBarContainer pageindicator height");
                    LiveUnit.Assert.areEqual(NavBarContainerSize.pageIndicatorWidth, parseInt(computedStyle.width, 10),
                        "Incorrect NavBarContainer pageindicator width");

                    // Verify navarrows
                    var leftArrowEl = that._element.querySelector(".win-navbarcontainer-navleft"),
                        rightArrowEl = that._element.querySelector(".win-navbarcontainer-navright");
                    LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowWidth, leftArrowEl.offsetWidth,
                        "Incorrect left navarrow width");
                    LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowWidth, rightArrowEl.offsetWidth,
                        "Incorrect right navarrow width");
                    LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowHeight, leftArrowEl.offsetHeight,
                        "Incorrect left navarrow height");
                    LiveUnit.Assert.areEqual(NavBarContainerSize.navarrowHeight, rightArrowEl.offsetHeight,
                        "Incorrect right navarrow height");

                    var rows = 1,
                        cols = 2,
                        cmdsPerPage = rows * cols,
                        navArrowMargin = 30,
                        marginBetweenCmd = 10,
                        numberOfcmds = 8;

                    var navbarCmds = that._element.querySelectorAll(".win-navbarcommand");
                    LiveUnit.Assert.areEqual(numberOfcmds, navbarCmds.length);

                    var expectedOffsetLeft,
                        expectedOffsetTop = 20,
                        currentPage,
                        colInPage,
                        emptySpace = 100,
                        pageWidth = navArrowMargin + (2 * (NavBarCommandSize.cmdWidth + marginBetweenCmd)) + emptySpace + navArrowMargin;

                    if (!rtl) {
                        // LTR
                        // Verify layout of navbarCommands
                        for (var i = 0, len = navbarCmds.length; i < len; i++) {
                            // Zero based
                            currentPage = Math.floor(i / cmdsPerPage);
                            colInPage = i % cmdsPerPage;
                            expectedOffsetLeft = (currentPage * pageWidth) + navArrowMargin +
                                (colInPage * (marginBetweenCmd + NavBarCommandSize.cmdWidth));

                            LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                            LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                        }
                    } else {
                        // RTL
                        var rtlConstant = -(3 * pageWidth);
                        for (var i = navbarCmds.length - 1; i >= 0; i--) {
                            // Zero based
                            currentPage = Math.floor((numberOfcmds - 1 - i) / cmdsPerPage);
                            colInPage = 1 - (i % cmdsPerPage);
                            // In RTL mode, origin (0,0) for offsetLeft calculation is different from LTR mode
                            // Hence we need to adjust the offsetLeft by a constant value
                            expectedOffsetLeft = rtlConstant + emptySpace + (currentPage * pageWidth) + navArrowMargin +
                                marginBetweenCmd + (colInPage * (marginBetweenCmd + NavBarCommandSize.cmdWidth));

                            LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                            LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                        }
                    }

                    complete();
                });
            };
        }
          
        that["testNavBarContainerLayoutSingleRowFixedSizeResize_LTR"] = generateTest(false, true, false);
        that["testNavBarContainerLayoutSingleRowFixedSizeResize_RTL"] = generateTest(true, true, false);
        that["testNavBarContainerLayoutSingleRowFixedSizeResizeWithForceLayout_LTR"] = generateTest(false, true, true);
        that["testNavBarContainerLayoutSingleRowFixedSizeResizeWithForceLayout_RTL"] = generateTest(true, true, true);
    })();

    (function () {
        function generateTest(rtl) {
            return function (complete) {
                if (rtl) {
                    that._element.dir = "rtl";
                }
                var viewportWidth = 600;
                that._element.style.width = viewportWidth + "px";

                var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
                    // With split button
                    data: navUtils.getNavBarCommandsData(8, true, true, true, true, true, true)
                });

                var rows = 1,
                    cols = 2,
                    cmdsPerPage = rows * cols,
                    navArrowMargin = 30,
                    marginBetweenCmd = 10,
                    numberOfcmds = 8;

                var navbarCmds = that._element.querySelectorAll(".win-navbarcommand");
                LiveUnit.Assert.areEqual(numberOfcmds, navbarCmds.length);

                var expectedCmdWidth = (viewportWidth - (2 * navArrowMargin) - ((cols - 1) * marginBetweenCmd)) / cols;

                for (var i = 0; i < navbarCmds.length; i++) {
                    var cmd = navbarCmds[i];
                    var actualWidth = parseInt(getComputedStyle(cmd).width, 10);
                    LiveUnit.Assert.areEqual(expectedCmdWidth, actualWidth, "Unexpected NavBarCommand width");
                }

                var expectedOffsetLeft,
                    expectedOffsetTop = 20,
                    currentPage,
                    colInPage,
                    pageWidth = viewportWidth;

                if (!rtl) {
                    // LTR
                    // Verify layout of navbarCommands
                    for (var i = 0, len = navbarCmds.length; i < len; i++) {
                        // Zero based
                        currentPage = Math.floor(i / cmdsPerPage);
                        colInPage = i % cmdsPerPage;
                        expectedOffsetLeft = (currentPage * pageWidth) + navArrowMargin +
                            (colInPage * (marginBetweenCmd + expectedCmdWidth));

                        LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                        LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                    }
                } else {
                    // RTL
                    var rtlConstant = -(3 * pageWidth);
                    for (var i = navbarCmds.length - 1; i >= 0; i--) {
                        // Zero based
                        currentPage = Math.floor((numberOfcmds - 1 - i) / cmdsPerPage);
                        colInPage = 1 - (i % cmdsPerPage);
                        // In RTL mode, origin (0,0) for offsetLeft calculation is different from LTR mode
                        // Hence we need to adjust the offsetLeft by a constant value
                        expectedOffsetLeft = rtlConstant + (currentPage * pageWidth) + navArrowMargin +
                            (colInPage * (marginBetweenCmd + expectedCmdWidth));

                        LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                        LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                    }
                }

                complete();
            };
        }

        that["testNavBarContainerLayoutSingleRow_LTR"] = generateTest(false);
        that["testNavBarContainerLayoutSingleRow_RTL"] = generateTest(true);
    })();

    (function () {
        function generateTest(rtl, forceLayout) {
            return function (complete) {
                if (rtl) {
                    that._element.dir = "rtl";
                }
                var viewportWidth = 600;
                that._element.style.width = viewportWidth + "px";

                var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
                    // With split button
                    data: navUtils.getNavBarCommandsData(8, true, true, true, true, true, true)
                });

                // Resize
                that._element.style.width = "700px";
                viewportWidth = 700;
                if (forceLayout) {
                    navbarContainer.forceLayout();
                } else if (!canElementResize) {
                    fireWindowResize();
                }

                // Wait for the resize event to fire
                WinJS.Promise.timeout(50).then(function () {
                    var rows = 1,
                        cols = 2,
                        cmdsPerPage = rows * cols,
                        navArrowMargin = 30,
                        marginBetweenCmd = 10,
                        numberOfcmds = 8;

                    var navbarCmds = that._element.querySelectorAll(".win-navbarcommand");
                    LiveUnit.Assert.areEqual(numberOfcmds, navbarCmds.length);

                    var expectedCmdWidth = (viewportWidth - (2 * navArrowMargin) - ((cols - 1) * marginBetweenCmd)) / cols;

                    for (var i = 0; i < navbarCmds.length; i++) {
                        var cmd = navbarCmds[i];
                        var actualWidth = parseInt(getComputedStyle(cmd).width, 10);
                        LiveUnit.Assert.areEqual(expectedCmdWidth, actualWidth, "Unexpected NavBarCommand width");
                    }

                    var expectedOffsetLeft,
                        expectedOffsetTop = 20,
                        currentPage,
                        colInPage,
                        pageWidth = viewportWidth;

                    if (!rtl) {
                        // LTR
                        // Verify layout of navbarCommands
                        for (var i = 0, len = navbarCmds.length; i < len; i++) {
                            // Zero based
                            currentPage = Math.floor(i / cmdsPerPage);
                            colInPage = i % cmdsPerPage;
                            expectedOffsetLeft = (currentPage * pageWidth) + navArrowMargin +
                                (colInPage * (marginBetweenCmd + expectedCmdWidth));

                            LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                            LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                        }
                    } else {
                        // RTL
                        var rtlConstant = -(3 * pageWidth);
                        for (var i = navbarCmds.length - 1; i >= 0; i--) {
                            // Zero based
                            currentPage = Math.floor((numberOfcmds - 1 - i) / cmdsPerPage);
                            colInPage = 1 - (i % cmdsPerPage);
                            // In RTL mode, origin (0,0) for offsetLeft calculation is different from LTR mode
                            // Hence we need to adjust the offsetLeft by a constant value
                            expectedOffsetLeft = rtlConstant + (currentPage * pageWidth) + navArrowMargin +
                                (colInPage * (marginBetweenCmd + expectedCmdWidth));

                            LiveUnit.Assert.areEqual(expectedOffsetLeft, navbarCmds[i].offsetLeft, "Incorrect offsetLeft");
                            LiveUnit.Assert.areEqual(expectedOffsetTop, navbarCmds[i].offsetTop, "Incorrect offsetTop");
                        }
                    }

                    complete();
                });
            };
        }
        
        that["testNavBarContainerLayoutSingleRowResize_LTR"] = generateTest(false, false);
        that["testNavBarContainerLayoutSingleRowResize_RTL"] = generateTest(true, false);
        that["testNavBarContainerLayoutSingleRowResizeWithForceLayout_LTR"] = generateTest(false, true);
        that["testNavBarContainerLayoutSingleRowResizeWithForceLayout_RTL"] = generateTest(true, true);
    })();

    this.testNavBarContainerVerticalLayoutMaxHeight = function (complete) {
        var navbarContainer = new WinJS.UI.NavBarContainer(that._element, {
            layout: WinJS.UI.Orientation.vertical,
            data: navUtils.getNavBarCommandsData(20, true, false, false, false, false, true)
        });
        var expectedMaxHeight = 270;
        LiveUnit.Assert.areEqual(expectedMaxHeight, that._element.offsetHeight);
        complete();
    };

    // Verifies that the NavBar focus state is reset when the NavBar is hidden and then shown.
    this.testNavBarFocusOnHideAndShow = function (complete) {
        var navbarEl = document.createElement("div"),
            navbarContainerEl = document.createElement("div");

        this._element.appendChild(navbarEl);
        navbarEl.appendChild(navbarContainerEl);
        navbarContainerEl.style.backgroundColor = "brown";

        var navbar = new WinJS.UI.NavBar(navbarEl);
        var navbarContainer = new WinJS.UI.NavBarContainer(navbarContainerEl, {
            data: navUtils.getNavBarCommandsData(20, true, false, false, false, false, true)
        });

        navbar.show();

        function waitForScrollComplete(viewportEl) {
            return new WinJS.Promise(function (c, e, p) {
                // Wait time needs to be more than time required to perform UI action
                var waitTime = 300;
                function completeForReal() {
                    viewportEl.removeEventListener("scroll", handler);
                    c();
                }
                var timeout = setTimeout(completeForReal, waitTime);

                function handler(e) {
                    clearTimeout(timeout);
                    timeout = setTimeout(completeForReal, waitTime);
                };
                viewportEl.addEventListener("scroll", handler);
            });
        }

        CommonUtilities.waitForEvent(navbar, "aftershow").
        then(function () {
            // Move focus to the last command
            var firstNavItem = navbarContainer._surfaceEl.children[0].winControl;
            var lastNavItem = navbarContainer._surfaceEl.children[19].winControl;

            CommonUtilities.keydown(firstNavItem._buttonEl, Key.end);
            LiveUnit.Assert.areEqual(lastNavItem._buttonEl, document.activeElement);
            LiveUnit.Assert.areEqual(19, navbarContainer.currentIndex);

            return waitForScrollComplete(navbarContainerEl.querySelector(".win-navbarcontainer-viewport"));
        }).
        then(function () {
            var lastNavItem = navbarContainer._surfaceEl.children[19].winControl;

            // Open the split button
            lastNavItem._splitButtonEl.click();
            LiveUnit.Assert.isTrue(lastNavItem.splitOpened);

            // Hide the navbar
            navbar.hide();
            return CommonUtilities.waitForEvent(navbar, "afterhide");
        }).
        then(function () {
            // Show the navbar
            navbar.show();
            return CommonUtilities.waitForEvent(navbar, "aftershow");
        }).
        then(function () {
            // Verify the focus state was reset
            var firstNavItem = navbarContainer._surfaceEl.children[0].winControl;
            var lastNavItem = navbarContainer._surfaceEl.children[19].winControl;
            LiveUnit.Assert.areEqual(firstNavItem._buttonEl, document.activeElement);
            LiveUnit.Assert.areEqual(0, navbarContainer.currentIndex);
            LiveUnit.Assert.isFalse(lastNavItem.splitOpened);

            complete();
        });
    };

    this.testNavBarAriaProperties = function (complete) {
        var navbarEl = document.createElement("div"),
            navbarContainerEl = document.createElement("div");

        this._element.appendChild(navbarEl);
        navbarEl.appendChild(navbarContainerEl);
        navbarContainerEl.style.backgroundColor = "brown";

        var navbar = new WinJS.UI.NavBar(navbarEl);
        var navbarContainer = new WinJS.UI.NavBarContainer(navbarContainerEl, {
            data: navUtils.getNavBarCommandsData(20, true, false, false, false, false, true)
        });

        function checkAttribute(element, attribute, expectedValue) {
            var values = element.getAttribute(attribute).match(expectedValue),
                value = values ? values[0] : null;

            LiveUnit.Assert.areEqual(value, expectedValue, "Expected " + attribute + ": " + expectedValue +
                " Actual: " + value);
        }

        // Verify the NavBarContainer aria properties
        var viewportEl = navbarContainerEl.querySelector(".win-navbarcontainer-viewport");
        checkAttribute(viewportEl, "role", "group");
        checkAttribute(viewportEl, "aria-label", WinJS.Resources._getWinJSString("ui/navBarContainerViewportAriaLabel").value);

        // Verify the NavBarCommand aria properties
        var navbarCmds = navbarContainerEl.querySelectorAll(".win-navbarcommand");
        for (var i = 0; i < navbarCmds.length; i++) {
            var cmd = navbarCmds[i].winControl;
            checkAttribute(cmd._buttonEl, "role", "button");
            checkAttribute(cmd._splitButtonEl, "aria-expanded", "false");
        }

        navbar.show();

        CommonUtilities.waitForEvent(navbar, "aftershow").
            then(function () {
                // Click on split button and verify aria-expanded
                var splitEl = navbarCmds[0].winControl._splitButtonEl;
                splitEl.click();
                checkAttribute(splitEl, "aria-expanded", "true");
                splitEl.click();
                checkAttribute(splitEl, "aria-expanded", "false");
                complete();
            });
    };

    this.testShownNavBarMinHeight = function (complete) {
        var navbarEl = document.createElement("div");
        this._element.appendChild(navbarEl);
        var navbar = new WinJS.UI.NavBar(navbarEl);

        // Hidden NavBar gets its min-height from AppBar. Show NavBar first to get accurate height measurement of empty NavBar.
        navbar.addEventListener('aftershow', function () {
            LiveUnit.Assert.areEqual(ShownNavBarSize.minHeight, navbarEl.offsetHeight,
            "Incorrect NavBar height");
            complete();
        }, false);
        navbar.show();
    };

    this.testShownNavBarHeight = function (complete) {
        var navbarEl = document.createElement("div");
        this._element.appendChild(navbarEl);
        var navbar = new WinJS.UI.NavBar(navbarEl);

        var navbarContainerEl = document.createElement("div");
        navbarEl.appendChild(navbarContainerEl);
        var navbarContainer = new WinJS.UI.NavBarContainer(navbarContainerEl, {
            // With split button
            data: navUtils.getNavBarCommandsData(6, true, true, true, true, true, true)
        });

        // Hidden NavBar's children won't have dimensions because of AppBar. Show it first to get accurate height measurement of NavBar with contents.
        navbar.addEventListener('aftershow', function () {
            LiveUnit.Assert.areEqual(ShownNavBarSize.height, navbarEl.offsetHeight,
            "Incorrect NavBar height");
            complete();
        }, false);
        navbar.show();
    };
};

LiveUnit.registerTestClass("WinJSTests.NavBarLayoutTests");

