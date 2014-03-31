// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.ListViewAnimationTest = function () {
    "use strict";
    var ITEMS_COUNT = 5;
    var animationHelperHook = null;
    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function () {

        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "AnimationTest";
        newNode.style.width = "500px";
        newNode.style.height = "500px";
        document.body.appendChild(newNode);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        if (animationHelperHook) {
            animationHelperHook.cleanup();
            animationHelperHook = null;
        }
        var element = document.getElementById("AnimationTest");
        if (element) {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        }
    }

    function getDataSource(count) {
        var rawData = [];
        for (var i = 0; i < (count ? count : ITEMS_COUNT) ; i++) {
            rawData.push({ itemInfo: "Tile" + i });
        }

        return new WinJS.Binding.List(rawData).dataSource;
    }

    function basicRenderer(itemPromise) {
        var element = document.createElement("div");
        element.style.width = "50px";
        element.style.height = "50px";
        return {
            element: element,
            renderComplete: itemPromise.then(function (item) {
                element.textContent = item.data.itemInfo;
            })
        };
    }

    function hookAnimationsHelper() {
        var realFunctions = {};
        realFunctions.animateEntrance = WinJS.UI._ListViewAnimationHelper.animateEntrance;
        
        var animationCallsRecord = {
            entranceAnimation: 0
        };
        animationCallsRecord.reset = function () {
            animationCallsRecord.entranceAnimation = 0;
        };
        animationCallsRecord.cleanup = function () {
            WinJS.UI._ListViewAnimationHelper.animateEntrance = realFunctions.animateEntrance;
        };
        WinJS.UI._ListViewAnimationHelper.animateEntrance = function (canvas, firstEntrance) {
            animationCallsRecord.entranceAnimation++;
            return realFunctions.animateEntrance(canvas, firstEntrance);
        };
        return animationCallsRecord;
    }

    this.generate = function (name, testFunction) {
        function generateTest(that, animationsEnabled, rtl, layoutName) {
            var fullName = name + layoutName + (animationsEnabled ? "_animationsEnabled_" : "_animationsDisabled_") + (rtl ? "rtl" : "ltr");
            that[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);

                var animationCounts = animationHelperHook = hookAnimationsHelper();

                var element = document.getElementById("AnimationTest");
                if (layoutName === "GridLayout") {
                    element.style.height = "150px";
                }
                element.style.direction = rtl ? "rtl" : "ltr";
                animationCounts.reset();
                var listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });
                listView._animationsDisabled = function () {
                    return !animationsEnabled;
                }

                testFunction(listView, animationCounts, animationsEnabled, ((layoutName === "ListLayout") ? verifyListLayout : verifyGridLayout), complete);
            };
        }

        var that = this;
        function generateTestSuite(layoutName) {
            generateTest(that, true, true, layoutName);
            generateTest(that, true, false, layoutName);
            generateTest(that, false, true, layoutName);
            generateTest(that, false, false, layoutName);
        }

        // UNDONE
        /*
        generateTestSuite("ListLayout");
        generateTestSuite("GridLayout");
        */
    }

    function verifyListLayout(listView) {
        var list = listView.itemDataSource.list;
        for (var i = 0; i < list.length; i++) {
            var element = listView.elementFromIndex(i),
                container = containerFrom(element);
            LiveUnit.Assert.areEqual(list.getItem(i).data.itemInfo, element.textContent);
            LiveUnit.Assert.areEqual(i * 50, offsetTopFromSurface(listView, container));
            LiveUnit.Assert.areEqual(0, offsetLeftFromSurface(listView, container));
        }
    }

    function verifyGridLayout(listView, expectedRows) {
        var list = listView.itemDataSource.list,
            row = 0,
            col = 0,
            rtl = (listView._element.style.direction === "rtl");
        if (!expectedRows) {
            expectedRows = 3;
        }
        for (var i = 0; i < list.length; i++) {
            var element = listView.elementFromIndex(i),
                container = containerFrom(element);
            LiveUnit.Assert.areEqual(list.getItem(i).data.itemInfo, element.textContent);
            var expectedLeft = col * 50;
            if (rtl) {
                expectedLeft = listView._canvas.offsetWidth - expectedLeft - container.offsetWidth;
            }
            LiveUnit.Assert.areEqual(row * 50, offsetTopFromSurface(listView, container));
            LiveUnit.Assert.areEqual(expectedLeft, offsetLeftFromSurface(listView, container));
            row++;
            row = row % expectedRows;
            if (row == 0) {
                col++;
            }
        }
    }

    this.generateDelayedEntranceAnimation = function (layoutName) {
        this["testDelayedEntranceAnimation" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";

            animationHelperHook = hookAnimationsHelper();
            animationHelperHook.reset();
            var countAnimationHandlerCalled = 0,
                delayedPromiseDone = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                LiveUnit.Assert.areEqual(WinJS.UI.ListViewAnimationType.entrance, e.detail.type);
                var delayPromise = WinJS.Promise.timeout(1000).then(function () {
                    LiveUnit.Assert.areEqual(0, animationHelperHook.entranceAnimation);
                    delayedPromiseDone = true;
                });
                e.detail.setPromise(delayPromise);
            };

            var listView;
            var viewCompleteEventHandler = function (e) {
                if (listView && listView.loadingState === "complete") {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(1, animationHelperHook.entranceAnimation);
                    element.removeEventListener("contentanimating", animationEventHandler, false);
                    element.removeEventListener("loadingstatechanged", viewCompleteEventHandler, false);
                    complete();
                }
            };
            element.addEventListener("contentanimating", animationEventHandler, false);
            element.addEventListener("loadingstatechanged", viewCompleteEventHandler, false);
            listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });
        };
    };
    if (!WinJS.Utilities.isPhone) {
        this.generateDelayedEntranceAnimation("GridLayout");
    }

    this.generateSkippedEntranceAnimation = function (layoutName) {
        this["testSkippedEntranceAnimation" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            animationHelperHook = hookAnimationsHelper();
            animationHelperHook.reset();
            var countAnimationHandlerCalled = 0,
                delayedPromiseDone = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                LiveUnit.Assert.areEqual(WinJS.UI.ListViewAnimationType.entrance, e.detail.type);
                e.preventDefault();
            };

            var listView;
            var viewCompleteEventHandler = function (e) {
                if (listView && listView.loadingState === "complete") {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(0, animationHelperHook.entranceAnimation);
                    element.removeEventListener("contentanimating", animationEventHandler, false);
                    element.removeEventListener("loadingstatechanged", viewCompleteEventHandler, false);
                    complete();
                }
            };
            element.addEventListener("contentanimating", animationEventHandler, false);
            element.addEventListener("loadingstatechanged", viewCompleteEventHandler, false);
            listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });
        };
    };
    if (!WinJS.Utilities.isPhone) {
        this.generateSkippedEntranceAnimation("GridLayout");
    }

    this.generateSkippedContentTransition = function (layoutName) {
        this["testSkippedContentTransition" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            animationHelperHook = hookAnimationsHelper();
            animationHelperHook.reset();
            var countAnimationHandlerCalled = 0,
                delayedPromiseDone = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                if (e.detail.type === WinJS.UI.ListViewAnimationType.entrance) {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                } else if (e.detail.type === WinJS.UI.ListViewAnimationType.contentTransition) {
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    e.preventDefault();
                } else {
                    LiveUnit.Assert.fail("Got an animation event with an unexpected type");
                }
            };
            element.addEventListener("contentanimating", animationEventHandler, false);
            var listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });
            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(1, animationHelperHook.entranceAnimation);
                    listView.itemDataSource = getDataSource();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(1, animationHelperHook.entranceAnimation);
                    element.removeEventListener("contentanimating", animationEventHandler, false);
                    complete();
                }
            ];

            runTests(listView, tests);
        };
    };
    if (!WinJS.Utilities.isPhone) {
        this.generateSkippedContentTransition("GridLayout");
    }

    this.generateInterruptedEntranceAnimationWithContentTransitionPlayed = function (layoutName) {
        this["testInterruptedEntranceAnimationWithContentTransitionPlayed" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            animationHelperHook = hookAnimationsHelper();
            animationHelperHook.reset();
            var countAnimationHandlerCalled = 0,
                delayedPromiseDone = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                if (e.detail.type === WinJS.UI.ListViewAnimationType.entrance) {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                    e.detail.setPromise(WinJS.Promise.timeout(6000).then(function () {
                        delayedPromiseDone = true;
                    }));
                } else if (e.detail.type === WinJS.UI.ListViewAnimationType.contentTransition) {
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    LiveUnit.Assert.isFalse(delayedPromiseDone);
                } else {
                    LiveUnit.Assert.fail("Got an animation event with an unexpected type");
                }
            };
            var listView,
                interruptionDone = false;
            var viewCompleteEventHandler = function (e) {
                if (listView && listView.loadingState === "complete") {
                    LiveUnit.Assert.isTrue(interruptionDone);
                    LiveUnit.Assert.isFalse(delayedPromiseDone);
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(1, animationHelperHook.entranceAnimation);
                    element.removeEventListener("contentanimating", animationEventHandler, false);
                    element.removeEventListener("loadingstatechanged", viewCompleteEventHandler, false);
                    complete();
                }
            };
            element.addEventListener("contentanimating", animationEventHandler, false);
            element.addEventListener("loadingstatechanged", viewCompleteEventHandler, false);
            listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });

            WinJS.Promise.timeout(1000).then(function () {
                interruptionDone = true;
                listView.itemDataSource = getDataSource();
            });
        };
    };
    if (!WinJS.Utilities.isPhone) {
        this.generateInterruptedEntranceAnimationWithContentTransitionPlayed("GridLayout");
    }

    this.generateInterruptedEntranceAnimationWithNoContentTransitionPlayed = function (layoutName) {
        this["testInterruptedEntranceAnimationWithNoContentTransitionPlayed" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            animationHelperHook = hookAnimationsHelper();
            animationHelperHook.reset();
            var countAnimationHandlerCalled = 0,
                delayedPromiseDone = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                if (e.detail.type === WinJS.UI.ListViewAnimationType.entrance) {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                    e.detail.setPromise(WinJS.Promise.timeout(6000).then(function () {
                        delayedPromiseDone = true;
                    }));
                } else if (e.detail.type === WinJS.UI.ListViewAnimationType.contentTransition) {
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    LiveUnit.Assert.isFalse(delayedPromiseDone);
                    e.preventDefault();
                } else {
                    LiveUnit.Assert.fail("Got an animation event with an unexpected type");
                }
            };
            var listView,
                interruptionDone = false;
            var viewCompleteEventHandler = function (e) {
                if (listView && listView.loadingState === "complete") {
                    LiveUnit.Assert.isTrue(interruptionDone);
                    LiveUnit.Assert.isFalse(delayedPromiseDone);
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(0, animationHelperHook.entranceAnimation);
                    element.removeEventListener("contentanimating", animationEventHandler, false);
                    element.removeEventListener("loadingstatechanged", viewCompleteEventHandler, false);
                    complete();
                }
            };
            element.addEventListener("contentanimating", animationEventHandler, false);
            element.addEventListener("loadingstatechanged", viewCompleteEventHandler, false);
            listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });

            WinJS.Promise.timeout(1000).then(function () {
                interruptionDone = true;
                listView.itemDataSource = getDataSource();
            });
        };
    };
    if (!WinJS.Utilities.isPhone) {
        this.generateInterruptedEntranceAnimationWithNoContentTransitionPlayed("GridLayout");
    }

    this.generateAnimationEventsWithAnimationsDisabled = function (layoutName) {
        this["testAnimationEventsWithAnimationsDisabled" + layoutName] = function (complete) {
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            animationHelperHook = hookAnimationsHelper();
            animationHelperHook.reset();
            var countAnimationHandlerCalled = 0,
                // Since we're hacking the ListView's animations disabled function via setting _animationsDisabled below, it's possible that a synchronous listview will
                // complete and fire viewstatecomplete + entrance animation events before we've had a chance to override animations disabled. If that happens a couple counts
                // will be off by one, so this boolean is used to account for that error
                offByOne = false,
                delayedPromiseDone = false;

            var initializationComplete = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                if (!initializationComplete) {
                    offByOne = true;
                }
            };

            element.addEventListener("contentanimating", animationEventHandler, false);
            var listView = new WinJS.UI.ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });
            listView._animationsDisabled = function () {
                return true;
            }
            initializationComplete = true;

            var tests = [
                function () {
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), animationHelperHook.entranceAnimation);
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), countAnimationHandlerCalled);
                    listView.itemDataSource = getDataSource();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), animationHelperHook.entranceAnimation);
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), countAnimationHandlerCalled);
                    complete();
                }
            ];

            runTests(listView, tests);
        };
    };
    this.generateAnimationEventsWithAnimationsDisabled("GridLayout");
};

LiveUnit.registerTestClass("WinJSTests.ListViewAnimationTest");
