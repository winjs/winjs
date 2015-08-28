// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="HubUtils.ts" />
// <reference path="HubUtils.css" />

module HubTests {

    "use strict";

    var HubSection = <typeof WinJS.UI.PrivateHubSection>WinJS.UI.HubSection;
    var Hub = <typeof WinJS.UI.PrivateHub>WinJS.UI.Hub;

    // This is the setup function that will be called at the beginning of each test function.
    var hostId = "HubTests";
    var hostSelector = "#" + hostId;
    var HubUtils = HubTests.Utilities;

    function InitTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        LiveUnit.LoggingCore.logComment("Waiting for control...");

        return HubUtils.waitForReady(control)().then(() => {
            LiveUnit.LoggingCore.logComment("Verifying...");

            HubUtils.verifyOrientation(control, config.orientation);

            //use the control's current template if none was defined by config
            HubUtils.verifySections(control, config.sectionsArray, config.headerTemplate || control.headerTemplate);
        });
    }

    function LoadingStateChangedTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        var i = 0;
        var sectionsLoadedIndex = i;
        var completeIndex = i;
        var loadingIndex = i;
        LiveUnit.Assert.areEqual(Hub.LoadingState.loading, control.loadingState, "Loading state should start in loading");
        i++;
        return HubUtils.waitForReady(control)().
            then(function () {
                completeIndex = i;
                LiveUnit.Assert.isTrue(completeIndex > sectionsLoadedIndex, "Expecting complete to fire after sectionsLoaded event");
                LiveUnit.Assert.areEqual(Hub.LoadingState.complete, control.loadingState, "Loading state should finish in complete");
            }, function () {
                LiveUnit.Assert.fail("An error was reported by waitForReady");
            }, function () {
                if (control.loadingState === Hub.LoadingState.sectionsLoaded) {
                    sectionsLoadedIndex = i;
                    LiveUnit.Assert.isTrue(sectionsLoadedIndex > loadingIndex, "Sections loaded Event should fire after loading event");
                    i++;
                } else if (control.loadingState === Hub.LoadingState.loading) {
                    loadingIndex = i;
                    i++;
                } else {
                    LiveUnit.Assert.fail("Unrecognized loading state: " + control.loadingState);
                }
            });
    }

    function RemoveFromDOMTest(testHost, config) {
        return WinJS.Promise.timeout().then(function () {
            var control = testHost.querySelector(".win-hub").winControl;
            testHost.removeChild(control.element);
            testHost.innerHTML = "";
            HubUtils.insertHub(testHost, config);
            return InitTest(testHost, config);
        });
    }

    function RehydrationTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        return HubUtils.waitForReady(control)().
            then(function () {
                //scrollable region
                var scrollRange = HubUtils.getScrollRange(control);
                var scrollMax = scrollRange.max;
                var scrollMin = scrollRange.min;
                var scrollDest = 0;

                if (scrollMin < scrollMax) {
                    scrollDest = Math.floor(Math.random() * (scrollMax - scrollMin) + scrollMin);
                }

                control.scrollPosition = scrollDest;
                LiveUnit.Assert.areEqual(scrollDest, control.scrollPosition);

                //remove the hub, wait for a layout, then readd it
                //this simulates what a navigation would do
                testHost.removeChild(control.element);
                testHost.innerHTML = "";
                return WinJS.Promise.timeout().then(function () { return scrollDest; });
            }).
            then(function (scrollDest) {
                testHost.appendChild(control.element);
                control.scrollPosition = scrollDest;

                LiveUnit.Assert.areEqual(scrollDest, control.scrollPosition);
                HubUtils.verifySections(control, config.sectionsArray, config.headerTemplate || control.headerTemplate);
            });
    }

    function SwapOrientationTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        return HubUtils.waitForReady(control)().
            then(function () {
                HubUtils.verifyOrientation(control, config.orientation);

                //update the internal representation
                if (config.orientation === WinJS.UI.Orientation.vertical) {
                    config.orientation = WinJS.UI.Orientation.horizontal;
                } else {
                    config.orientation = WinJS.UI.Orientation.vertical;
                }

                control.orientation = config.orientation;
                return HubUtils.waitForReady(control)();
            }).
            then(function () {
                HubUtils.verifyOrientation(control, config.orientation);
            });
    }

    function HeaderInvokedTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;

        return new WinJS.Promise(function (c, e, p) {

            //grab a map of all headers elements
            HubUtils.waitForReady(control)().then(function () {
                var headerElements = HubUtils.getAllHeaderElements(control);
                LiveUnit.LoggingCore.logComment(headerElements.length + " headers found");
                if (headerElements.length > 0) {
                    var interactiveHeaderCount = 0;

                    control.addEventListener(Hub._EventName.headerInvoked, function (ev) {
                        interactiveHeaderCount--;
                        LiveUnit.Assert.isFalse(config.sectionsArray[ev.detail.index].isHeaderStatic, "Header element " + ev.detail.index + " not expected to be interactive");
                    });
                    for (var i = 0; i < headerElements.length; i++) {
                        var element = headerElements[i];
                        if (!config.sectionsArray[i].isHeaderStatic) {
                            LiveUnit.LoggingCore.logComment("Header #" + i + " is interactive!");
                            interactiveHeaderCount++;
                        }
                        element.firstElementChild.click();
                    }
                    LiveUnit.Assert.areEqual(0, interactiveHeaderCount, "A header's invoke event was not fired");
                    c();

                } else {
                    LiveUnit.LoggingCore.logComment("No headers found in this configuration, skipping test");
                    c();
                }
            });
        });
    }

    function SwapHeaderTemplateTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;

        return new WinJS.Promise(function (c, e, p) {
            function myCustomTemplate(item) {
                var el = document.createElement("div");
                el.textContent = "Test";
                return el;
            }

            var oldTemplate;
            HubUtils.waitForReady(control)().then(function () {
                oldTemplate = control.headerTemplate;
                control.headerTemplate = myCustomTemplate;
                return HubUtils.waitForReady(control)();
            }).then(function () {
                    HubUtils.verifySections(control, config.sectionsArray, myCustomTemplate);
                    control.headerTemplate = null;

                    //verify that the headerTemplate actually changes
                    LiveUnit.Assert.areNotEqual(myCustomTemplate, control.headerTemplate);
                    LiveUnit.Assert.areNotEqual(config.headerTemplate, control.headerTemplate);

                    return HubUtils.waitForReady(control)();
                }).done(function () {
                    HubUtils.verifySections(control, config.sectionsArray, control.headerTemplate);

                    //reset the template back to match the input config
                    control.headerTemplate = oldTemplate;
                    c();
                });
        });
    }

    function SetSectionOnScreenTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        var sectionsLength = config.sectionsArray.length;

        function setAndVerifySectionOnScreen(control, sectionOnScreen) {
            return new WinJS.Promise(function (c, e, p) {
                control.sectionOnScreen = sectionOnScreen;

                HubUtils.waitForReady(control)().done(function () {
                    function verifySectionOnScreen(control, expectedValue) {
                        var scrollRange = HubUtils.getScrollRange(control);
                        var surfaceSpacers = HubUtils.getSurfaceSpacers(control);
                        var isLTR = (getComputedStyle(control.element).direction === "ltr");
                        var sectionElement = control.element.querySelectorAll("." + HubSection._ClassName.hubSection)[expectedValue];
                        var sectionElementRect = sectionElement.getBoundingClientRect();
                        var viewportRect = control._viewportElement.getBoundingClientRect();

                        //either the sectionOnScreen was updated successfully or control scrolled as far as possible
                        if (expectedValue === control.sectionOnScreen) {

                            //when section on screen is updated successfully, the alignment needs to be correct
                            if (control.orientation === WinJS.UI.Orientation.horizontal) {
                                //TODO switch this for RTL
                                if (isLTR) {
                                    LiveUnit.Assert.isTrue(Math.abs(surfaceSpacers.left + viewportRect.left - sectionElementRect.left) <= .002, "Distance is more than .002 px");
                                } else {
                                    LiveUnit.Assert.isTrue(Math.abs(viewportRect.right - surfaceSpacers.right - sectionElementRect.right) <= .002, "Distance is more than .002 px");
                                }
                            } else {
                                //vertical Hub
                                LiveUnit.Assert.isTrue(Math.abs(surfaceSpacers.top + viewportRect.top - sectionElementRect.top) <= .002, "Distance is more than .002 px");
                            }
                        } else {

                            //else the control is scrolled as far as possible
                            LiveUnit.Assert.isTrue(control.scrollPosition === scrollRange.max || control.scrollPosition === scrollRange.min, "Scroll position should be at max or min");

                            if (control.orientation === WinJS.UI.Orientation.horizontal) {
                                if (isLTR) {
                                    LiveUnit.Assert.isTrue(sectionElementRect.left >= surfaceSpacers.left + viewportRect.left, "Left edge should be on screen");
                                } else {

                                    //RTL
                                    LiveUnit.Assert.isTrue(sectionElementRect.right <= viewportRect.right - surfaceSpacers.right, "Right edge should be on screen");
                                }
                            } else { //orientation === WinJS.UI.Orientation.vertical
                                LiveUnit.Assert.isTrue(sectionElementRect.top >= surfaceSpacers.top + viewportRect.top, "Top edge should be on screen");
                            }
                        }
                    }

                    verifySectionOnScreen(control, sectionOnScreen);
                    c();
                });
            });
        }

        function iterateAllSections(control, currentSection, decreasing) {
            if (currentSection < sectionsLength && currentSection >= 0) {
                return setAndVerifySectionOnScreen(control, currentSection).then(function () {
                    return iterateAllSections(control, decreasing ? currentSection - 1 : currentSection + 1, decreasing);
                });
            }
        }

        return HubUtils.waitForReady(control)().
            then(function () {
                var currentSectionOnScreen = control.sectionOnScreen;
                var currentScrollPos = control.scrollPosition;
                control.sectionOnScreen = currentSectionOnScreen;
                LiveUnit.Assert.areEqual(currentSectionOnScreen, control.sectionOnScreen, "Expecting control to not move");
                LiveUnit.Assert.areEqual(currentScrollPos, control.scrollPosition, "Expecting control to not scroll");

                return iterateAllSections(control, currentSectionOnScreen, false);
            }).then(function () {
                var currentSectionOnScreen = control.sectionOnScreen;
                return iterateAllSections(control, currentSectionOnScreen, true);
            });
    }

    function GetSectionOnScreenTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;

        return HubUtils.waitForReady(control)().
            then(function () {
                var currentScrollPosition = 42; //starting scroll position for test
                var increment = 44; //how far to increment on each iteration
                var scrollRange = HubUtils.getScrollRange(control);

                var index = HubUtils.findCurrentSectionOnScreen(control);
                LiveUnit.Assert.areEqual(index, control.sectionOnScreen);

                function loop() {
                    return new WinJS.Promise(function (c, e, p) {
                        //set scroll position
                        currentScrollPosition = Math.min(scrollRange.max, currentScrollPosition + increment);
                        control.scrollPosition = currentScrollPosition;

                        WinJS.Utilities._setImmediate(function () {
                            //hit test for sectionOnScreen
                            var index = HubUtils.findCurrentSectionOnScreen(control);
                            LiveUnit.Assert.areEqual(index, control.sectionOnScreen);
                            c();
                        });
                    });
                }
                function continueCondition() {
                    return WinJS.Promise.wrap(currentScrollPosition < scrollRange.max);
                }

                //loop
                return Helper.asyncWhile(continueCondition, loop);
            });
    }

    function GetScrollPosTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        return HubUtils.waitForReady(control)().
            then(function () {
                var scrollProperty = control.orientation === WinJS.UI.Orientation.horizontal ? "scrollLeft" : "scrollTop";
                var scrollRange = HubUtils.getScrollRange(control);
                var scroller = control.element.firstElementChild;
                var currentScrollPosition = WinJS.Utilities.getScrollPosition(scroller)[scrollProperty];
                var increment = 44;

                function loop() {
                    return new WinJS.Promise(function (c) {
                        currentScrollPosition = Math.min(currentScrollPosition + increment, scrollRange.max);
                        var newPosition: any = {};
                        newPosition[scrollProperty] = currentScrollPosition;
                        WinJS.Utilities.setScrollPosition(scroller, newPosition);

                        Helper.waitForScroll(control._viewportElement).then(function () {
                            LiveUnit.Assert.areEqual(currentScrollPosition, control.scrollPosition);
                            c();
                        });
                    });
                }

                function continueCondition() {
                    return WinJS.Promise.wrap(currentScrollPosition < scrollRange.max);
                }
                return Helper.asyncWhile(continueCondition, loop);
            });
    }

    function SetScrollPosTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        return HubUtils.waitForReady(control)().
            then(function () {
                var scrollProperty = control.orientation === WinJS.UI.Orientation.horizontal ? "scrollLeft" : "scrollTop";
                var scrollRange = HubUtils.getScrollRange(control);
                var scroller = control.element.firstElementChild;
                var currentScrollPosition = control.scrollPosition;
                var increment = 44;

                function loop() {
                    return new WinJS.Promise(function (c) {
                        currentScrollPosition = Math.min(currentScrollPosition + increment, scrollRange.max);
                        control.scrollPosition = currentScrollPosition;

                        Helper.waitForScroll(control._viewportElement).then(function () {
                            LiveUnit.Assert.areEqual(currentScrollPosition, WinJS.Utilities.getScrollPosition(scroller)[scrollProperty]);
                            c();
                        });
                    });
                }

                function continueCondition() {
                    return WinJS.Promise.wrap(currentScrollPosition < scrollRange.max);
                }
                return Helper.asyncWhile(continueCondition, loop);
            });
    }

    function SwapSectionsTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        var newSections = [new HubSection()];
        var oldSections = control.sections;

        return HubUtils.waitForReady(control)().
            then(function () {
                control.sections = new WinJS.Binding.List(newSections);
                return HubUtils.waitForReady(control)();
            }).
            then(function () {
                HubUtils.verifySections(control, newSections, control.headerTemplate);

                control.sections = oldSections;
                return HubUtils.waitForReady(control)();
            }).
            then(function () {
                HubUtils.verifySections(control, oldSections.slice(), control.headerTemplate);
            });
    }

    function DeleteAllTest(testHost, config) {
        var control = testHost.querySelector(".win-hub").winControl;
        return HubUtils.waitForReady(control)().
            then(function () {
                control.sections.length = 0;
                return WinJS.Promise.timeout(WinJS.UI._animationTimeAdjustment(3000));
            }).
            then(function () {
                LiveUnit.Assert.areEqual(0, document.body.querySelectorAll('progress').length, "Expecting no progress indicators in DOM");
            });
    }

    export class BasicTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = hostId;
            newNode.style.minHeight = "1024px";
            newNode.style.minWidth = "768px";
            newNode.style.height = "100%";
            newNode.style.width = "100%";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            var element = document.getElementById(hostId);
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }

        // Test functions
    }

    HubUtils.test(BasicTests.prototype, hostSelector, "Init", InitTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "LoadingStateChanged", LoadingStateChangedTest), { priority: 0 };
    HubUtils.test(BasicTests.prototype, hostSelector, "RemoveFromDOMTest", RemoveFromDOMTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "RehydrationTest", RehydrationTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "SwapOrientation", SwapOrientationTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "SwapHeaderTemplateTest", SwapHeaderTemplateTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "HeaderInvokedTest", HeaderInvokedTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "SetSectionOnScreenTest", SetSectionOnScreenTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "GetSectionOnScreenTest", GetSectionOnScreenTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "GetScrollPosTest", GetScrollPosTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "SetScrollPosTest", SetScrollPosTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "SwapSectionsTest", SwapSectionsTest, { priority: 0 });
    HubUtils.test(BasicTests.prototype, hostSelector, "DeleteAll", DeleteAllTest, { priority: 1 });
}

LiveUnit.registerTestClass("HubTests.BasicTests");
