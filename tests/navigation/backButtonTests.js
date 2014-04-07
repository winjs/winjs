// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="navigator.js" />
/// <reference path="navigationUtils.js" />
/// <deploy src="page.html" />
/// <deploy src="page.js" />

(function () {
    "use strict";

    var util = WinJS.Navigation.Tests.Utilities;
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

    WinJS.Namespace.define("WinJSTests", {
        BackButtonTests: WinJS.Class.define(function () {
            this.setUp = function BackButtonTests_setUp() {
                LiveUnit.LoggingCore.logComment("In setup");
                var newNode = document.createElement("div");
                newNode.id = "BackButtonTests";
                document.body.appendChild(newNode);
                this._element = newNode;
            };

            this.tearDown = function BackButtonTests_tearDown() {
                LiveUnit.LoggingCore.logComment("In tearDown");
                if (this._element) {
                    WinJS.Utilities.disposeSubTree(this._element);
                    document.body.removeChild(this._element);
                    this._element = null;
                }

                nav.history = {
                    backStack: null,
                    forwardStack: null,
                    current: null,
                };

                this._pageControl = null;
                this._backButtonContainer = null;
                this._nextPageButton = null;
                this._randomPageButton = null;
            };

            this._initialize = function BackButtonTests__initialize() {
                var that = this;
                return util.createPageControl(this._element).then(function (pageControl) {
                    that._pageControl = pageControl;
                    that._loadPageControlContent();
                });
            };

            this._loadPageControlContent = function BackButtonTests__loadPageControlContent() {
                var pageControl = this._pageControl;
                this._backButtonContainer = pageControl._element.querySelector(inPageBackButtonContainerSelector);
                this._nextPageButton = pageControl._element.querySelector(inPageNextPageButtonSelector);
                this._randomPageButton = pageControl._element.querySelector(inPageRandomPageButtonSelector);
                this._pageIndex = parseInt(pageControl._element.querySelector(inPageIndexSelector).textContent);
            };

            this.test_existence_createInPageControlHTML = function BackButtonTests_test_existence_createInPageControlHTML(complete) {
                var that = this;
                this._initialize().then(function () {
                    util.createBackButtonWithHTML(that._backButtonContainer).then(function (backButton) {
                        verifyOnScreen(backButton._element);
                        complete();
                    });
                });
            };

            this.test_existence_createInPageControlJS = function BackButtonTests_test_existence_createInPageControlJS(complete) {
                var that = this;
                this._initialize().then(function () {
                    util.createBackButtonWithJS(that._backButtonContainer).then(function (backButton) {
                        verifyOnScreen(backButton._element);
                        complete();
                    });
                });
            };

            this.test_existence_createOutOfPageControlHTML = function BackButtonTests_test_existence_createOutOfPageControlHTML(complete) {
                var that = this;
                this._initialize().then(function () {
                    util.createBackButtonWithHTML(that._element).then(function (backButton) {
                        verifyOnScreen(backButton._element);
                        complete();
                    });
                });
            };

            this.test_existence_createOutOfPageControlJS = function BackButtonTests_test_existence_createOutOfPageControlJS(complete) {
                var that = this;
                this._initialize().then(function () {
                    util.createBackButtonWithJS(that._element).then(function (backButton) {
                        verifyOnScreen(backButton._element);
                        complete();
                    });
                });
            };

            this.test_styling_className = function BackButtonTests_test_styling_className(complete) {
                var that = this;
                this._initialize().then(function () {
                    util.createBackButtonWithJS(that._backButtonContainer).then(function (backButton) {
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(backButton._element, "win-navigation-backbutton"));
                        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(backButton._element.childNodes[0], "win-back"));
                        complete();
                    });
                });
            };

            this.test_interaction_click = function BackButtonTests_test_interaction_click(complete) {
                var that = this;
                this._initialize().then(function () {
                    return that.helper_NavigateToPage(1);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(complete, unHandledError);
            };

            this.test_interaction_click_nothingInHistory = function BackButtonTests_test_interaction_click_nothingInHistory(complete) {
                var that = this;
                this._initialize().then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNoNavigationHappened(function () { backButton._element.click(); });
                }).then(complete, unHandledError);
            };

            this.test_interaction_click_3times = function BackButtonTests_test_interaction_click_3times(complete) {
                var that = this;
                this._initialize().then(function () {
                    return that.helper_NavigateToPage(1);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return that.helper_NavigateToPage(2);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(2);
                }).then(function () {
                    return that.helper_NavigateToPage(3);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(3);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 2);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(complete, unHandledError);
            };

            this.test_interaction_click_3times_but2available = function BackButtonTests_test_interaction_click_3times_but2available(complete) {
                var that = this;
                this._initialize().then(function () {
                    return that.helper_NavigateToPage(1);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return that.helper_NavigateToPage(2);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(2);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNoNavigationHappened(function () { backButton._element.click(); });
                }).then(complete, unHandledError);
            };

            this.test_userWorkflow = function BackButtonTests_test_userWorkflow(complete){
                var that = this;
                this._initialize().then(function () {
                    return that.helper_NavigateToPage(1);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(1);
                }).then(function () {
                    return that.helper_NavigateToPage(2);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(2);
                }).then(function () {
                    return that.helper_NavigateToPage(3);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(3);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 2);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return that.helper_NavigateToPage(4);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(4);
                }).then(function () {
                    return that.helper_NavigateToPage(5);
                }).then(function () {
                    return that.helper_VerifyCurrentPageIndex(5);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 4);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 1);
                }).then(function () {
                    return that.helper_createBackButton();
                }).then(function (backButton) {
                    return that.helper_VerifyNavigatedToPage(function () { backButton._element.click(); }, 0);
                }).then(complete, unHandledError);
            };

            this.helper_createBackButton = function (type) {
                this._loadPageControlContent();
                if (type == "HTML") {
                    return util.createBackButtonWithHTML(this._backButtonContainer);
                } else {
                    return util.createBackButtonWithJS(this._backButtonContainer);
                }
            };

            this.helper_NavigateToPage = function (index) {
                return nav.navigate(this._pageControl.home, { pageIndex: index });
            };

            this.helper_VerifyCurrentPageIndex = function (index) {
                this._loadPageControlContent();
                LiveUnit.Assert.areEqual(index, this._pageIndex);
                return WinJS.Promise.wrap();
            };

            this.helper_VerifyNavigatedToPage = function (action, index) {
                var that = this;
                return new WinJS.Promise(function (complete) {
                    var completed = false;
                    var listener = function () {
                        that._loadPageControlContent();
                        nav.removeEventListener("navigated", listener);
                        LiveUnit.Assert.areEqual(index, that._pageIndex);
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
            };

            this.helper_VerifyNoNavigationHappened = function (action) {
                var that = this;
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
        }),
    });

    LiveUnit.registerTestClass("WinJSTests.BackButtonTests");
})();
