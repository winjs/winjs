// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="navigator.ts" />
/// <reference path="navigationUtils.ts" />
/// <deploy src="page.html" />
/// <deploy src="page.js" />

module WinJSTests {
    "use strict";

    var util = NavigationUtils;
    var nav = WinJS.Navigation;

    function unHandledError(error) {
        LiveUnit.Assert.fail("unHandledError: ");
    }

    function verifyOnScreen(element) {
        var assert = LiveUnit.Assert;
        assert.isTrue(document.body.contains(element));
        var rects = element.getClientRects();
        assert.areEqual(1, rects.length);
        var rect = rects[0];
        assert.isTrue(rect.left >= 0);
        assert.isTrue(rect.top >= 0);
        assert.isTrue(rect.right > 0);
        assert.isTrue(rect.bottom > 0);
        // we also need to make sure it is in the parentRect, so it is fully onScreen
        var parentRects = element.parentNode.getClientRects();
        assert.areEqual(1, parentRects.length);
        var parentRect = parentRects[0];
        assert.isTrue(parentRect.left >= 0);
        assert.isTrue(parentRect.top >= 0);
        assert.isTrue(parentRect.right > 0);
        assert.isTrue(parentRect.bottom > 0);
        assert.isTrue(parentRect.left <= rect.left);
        assert.isTrue(parentRect.top <= rect.top);
        assert.isTrue(parentRect.right >= rect.right);
        assert.isTrue(parentRect.bottom >= rect.bottom);
    }

    var inPageBackButtonContainerSelector = "#backButtonContainer";
    var inPageNextPageButtonSelector = "#nextPage";
    var inPageRandomPageButtonSelector = "#randomPage";
    var inPageIndexSelector = "#pageIndex";
    var _element;
    var _pageControl = null;
    var _backButtonContainer = null;
    var _nextPageButton = null;
    var _randomPageButton = null;
    var _pageIndex;

    function _initialize() {
        return util.createPageControl(_element).then(function (pageControl) {
            _pageControl = pageControl;
            _loadPageControlContent();
        });
    }

    function _loadPageControlContent() {
        _backButtonContainer = _pageControl._element.querySelector(inPageBackButtonContainerSelector);
        _nextPageButton = _pageControl._element.querySelector(inPageNextPageButtonSelector);
        _randomPageButton = _pageControl._element.querySelector(inPageRandomPageButtonSelector);
        _pageIndex = parseInt(_pageControl._element.querySelector(inPageIndexSelector).textContent);
    }

    function helper_createBackButton(type?) {
        _loadPageControlContent();
        if (type == "HTML") {
            return util.createBackButtonWithHTML(_backButtonContainer);
        } else {
            return util.createBackButtonWithJS(_backButtonContainer);
        }
    }

    function helper_NavigateToPage(index) {
        return nav.navigate(_pageControl.home, { pageIndex: index });
    }

    function helper_VerifyCurrentPageIndex(index) {
        _loadPageControlContent();
        LiveUnit.Assert.areEqual(index, _pageIndex);
        return WinJS.Promise.wrap();
    }

    function helper_VerifyNavigatedToPage(action, index) {

        return new WinJS.Promise(function (complete) {
            var completed = false;
            var listener = function () {
                _loadPageControlContent();
                nav.removeEventListener("navigated", listener);
                LiveUnit.Assert.areEqual(index, _pageIndex);
                completed = true;
                complete();
            };

            nav.addEventListener("navigated", listener);
            WinJS.Promise.timeout(2000).then(function () {
                if (!completed) {
                    nav.removeEventListener("navigated", listener);
                    LiveUnit.Assert.fail("Navigation didn't happen");
                }
            });

            action();
        });
    }

    function helper_VerifyNoNavigationHappened(action) {

        return new WinJS.Promise(function (complete) {
            var completed = false;
            var listener = function () {
                if (!completed) {
                    nav.removeEventListener("navigated", listener);
                    LiveUnit.Assert.fail("Navigation happened which is not expected");
                }
            };

            nav.addEventListener("navigated", listener);
            WinJS.Promise.timeout(2000).then(function () {
                nav.removeEventListener("navigated", listener);
                completed = true;
                complete();
            });

            action();
        });
    };

    export class BackButtonTests {
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "BackButtonTests";
            document.body.appendChild(newNode);
            _element = newNode;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            if (_element) {
                WinJS.Utilities.disposeSubTree(_element);
                document.body.removeChild(_element);
                _element = null;
            }

            nav.history = {
                backStack: null,
                forwardStack: null,
                current: null,
            };

            _pageControl = null;
            _backButtonContainer = null;
            _nextPageButton = null;
            _randomPageButton = null;
        }



        test_existence_createInPageControlHTML = function BackButtonTests_test_existence_createInPageControlHTML(complete) {
            _initialize().then(function () {
                util.createBackButtonWithHTML(_backButtonContainer).then(function (backButton) {
                    verifyOnScreen(backButton._element);
                    complete();
                });
            });
        };

        test_existence_createInPageControlJS = function BackButtonTests_test_existence_createInPageControlJS(complete) {
            _initialize().then(function () {
                util.createBackButtonWithJS(_backButtonContainer).then(function (backButton) {
                    verifyOnScreen(backButton._element);
                    complete();
                });
            });
        };

        test_existence_createOutOfPageControlHTML = function BackButtonTests_test_existence_createOutOfPageControlHTML(complete) {
            _initialize().then(function () {
                util.createBackButtonWithHTML(_element).then(function (backButton) {
                    verifyOnScreen(backButton._element);
                    complete();
                });
            });
        };

        test_existence_createOutOfPageControlJS = function BackButtonTests_test_existence_createOutOfPageControlJS(complete) {
            _initialize().then(function () {
                util.createBackButtonWithJS(_element).then(function (backButton) {
                    verifyOnScreen(backButton._element);
                    complete();
                });
            });
        };

        test_styling_className = function BackButtonTests_test_styling_className(complete) {
            _initialize().then(function () {
                util.createBackButtonWithJS(_backButtonContainer).then(function (backButton) {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(backButton._element, "win-navigation-backbutton"));
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(backButton._element.childNodes[0], "win-back"));
                    complete();
                });
            });
        };

        test_interaction_click = function BackButtonTests_test_interaction_click(complete) {

            _initialize().then(function () {
                return helper_NavigateToPage(1);
            }).then(function () {
                    return helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(complete, unHandledError);
        };

        test_interaction_click_nothingInHistory = function BackButtonTests_test_interaction_click_nothingInHistory(complete) {

            _initialize().then(function () {
                return helper_createBackButton();
            }).then(function (backButton) {
                    return helper_VerifyNoNavigationHappened(function () { backButton._element.click(); });
                }).then(complete, unHandledError);
        };

        test_interaction_click_3times = function BackButtonTests_test_interaction_click_3times(complete) {

            _initialize().then(function () {
                return helper_NavigateToPage(1);
            }).then(function () {
                    return helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return helper_NavigateToPage(2);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(2);
                }).then(function () {
                    return helper_NavigateToPage(3);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(3);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 2);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(complete, unHandledError);
        };

        test_interaction_click_3times_but2available = function BackButtonTests_test_interaction_click_3times_but2available(complete) {

            _initialize().then(function () {
                return helper_NavigateToPage(1);
            }).then(function () {
                    return helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return helper_NavigateToPage(2);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(2);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNoNavigationHappened(function () { backButton._element.click(); });
                }).then(complete, unHandledError);
        };

        test_userWorkflow = function BackButtonTests_test_userWorkflow(complete) {

            _initialize().then(function () {
                return helper_NavigateToPage(1);
            }).then(function () {
                    return helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return helper_NavigateToPage(2);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(2);
                }).then(function () {
                    return helper_NavigateToPage(3);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(3);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 2);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return helper_NavigateToPage(4);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(4);
                }).then(function () {
                    return helper_NavigateToPage(5);
                }).then(function () {
                    return helper_VerifyCurrentPageIndex(5);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 4);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return helper_createBackButton();
                }).then(function (backButton) {
                    return helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(complete, unHandledError);
        };
    }



}

LiveUnit.registerTestClass("WinJSTests.BackButtonTests");