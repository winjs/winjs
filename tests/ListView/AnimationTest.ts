// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";
    var ITEMS_COUNT = 5;
    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    function getDataSource(count = ITEMS_COUNT) {
        var rawData = [];
        for (var i = 0; i < count; i++) {
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

    function verifyListLayout(listView) {
        var list = listView.itemDataSource.list;
        for (var i = 0; i < list.length; i++) {
            var element = listView.elementFromIndex(i),
                container = Helper.ListView.containerFrom(element);
            LiveUnit.Assert.areEqual(list.getItem(i).data.itemInfo, element.textContent);
            LiveUnit.Assert.areEqual(i * 50, Helper.ListView.offsetTopFromSurface(listView, container));
            LiveUnit.Assert.areEqual(0, Helper.ListView.offsetLeftFromSurface(listView, container));
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
                container = Helper.ListView.containerFrom(element);
            LiveUnit.Assert.areEqual(list.getItem(i).data.itemInfo, element.textContent);
            var expectedLeft = col * 50;
            if (rtl) {
                expectedLeft = listView._canvas.offsetWidth - expectedLeft - container.offsetWidth;
            }
            LiveUnit.Assert.areEqual(row * 50, Helper.ListView.offsetTopFromSurface(listView, container));
            LiveUnit.Assert.areEqual(expectedLeft, Helper.ListView.offsetLeftFromSurface(listView, container));
            row++;
            row = row % expectedRows;
            if (row == 0) {
                col++;
            }
        }
    }

    export class ListViewAnimationTest {

        // This is the setup function that will be called at the beginning of each test function.
        setUp() {

            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "AnimationTest";
            newNode.style.width = "500px";
            newNode.style.height = "500px";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("AnimationTest");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }
    };

    function generateDelayedEntranceAnimation(layoutName) {
        ListViewAnimationTest.prototype["testDelayedEntranceAnimation" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";

            var entranceAnimationCount = 0;
            WinJS.Utilities["_addEventListener"](element, "animationstart", function (e) {
                if (e.animationName.indexOf("enterContent") !== -1) {
                    entranceAnimationCount++;
                }
            });
            var countAnimationHandlerCalled = 0,
                delayedPromiseDone = false;
            var animationEventHandler = function (e) {
                countAnimationHandlerCalled++;
                LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                LiveUnit.Assert.areEqual(WinJS.UI.ListViewAnimationType.entrance, e.detail.type);
                var delayPromise = WinJS.Promise.timeout(1000).then(function () {
                    LiveUnit.Assert.areEqual(0, entranceAnimationCount);
                    delayedPromiseDone = true;
                });
                e.detail.setPromise(delayPromise);
            };

            var listView;
            var viewCompleteEventHandler = function (e) {
                if (listView && listView.loadingState === "complete") {
                    LiveUnit.Assert.areEqual(1, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(1, entranceAnimationCount);
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

    function generateSkippedEntranceAnimation(layoutName) {
        ListViewAnimationTest.prototype["testSkippedEntranceAnimation" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            var entranceAnimationCount = 0;
            WinJS.Utilities["_addEventListener"](element, "animationstart", function (e) {
                if (e.animationName.indexOf("enterContent") !== -1) {
                    entranceAnimationCount++;
                }
            });
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
                    LiveUnit.Assert.areEqual(0, entranceAnimationCount);
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

    function generateSkippedContentTransition(layoutName) {
        ListViewAnimationTest.prototype["testSkippedContentTransition" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            var entranceAnimationCount = 0;
            WinJS.Utilities["_addEventListener"](element, "animationstart", function (e) {
                if (e.animationName.indexOf("enterContent") !== -1) {
                    entranceAnimationCount++;
                }
            });
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
                    LiveUnit.Assert.areEqual(1, entranceAnimationCount);
                    listView.itemDataSource = getDataSource();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual(2, countAnimationHandlerCalled);
                    LiveUnit.Assert.areEqual(1, entranceAnimationCount);
                    element.removeEventListener("contentanimating", animationEventHandler, false);
                    complete();
                }
            ];

            Helper.ListView.runTests(listView, tests);
        };
    };

    function generateInterruptedEntranceAnimationWithContentTransitionPlayed(layoutName) {
        ListViewAnimationTest.prototype["testInterruptedEntranceAnimationWithContentTransitionPlayed" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            var entranceAnimationCount = 0;
            WinJS.Utilities["_addEventListener"](element, "animationstart", function (e) {
                if (e.animationName.indexOf("enterContent") !== -1) {
                    entranceAnimationCount++;
                }
            });
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
                    LiveUnit.Assert.areEqual(1, entranceAnimationCount);
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

    function generateInterruptedEntranceAnimationWithNoContentTransitionPlayed(layoutName) {
        ListViewAnimationTest.prototype["testInterruptedEntranceAnimationWithNoContentTransitionPlayed" + layoutName] = function (complete) {
            // This test is only useful on a machine that has animations enabled.
            if (!WinJS.UI.isAnimationEnabled()) {
                complete();
                return;
            }
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            var entranceAnimationCount = 0;
            WinJS.Utilities["_addEventListener"](element, "animationstart", function (e) {
                if (e.animationName.indexOf("enterContent") !== -1) {
                    entranceAnimationCount++;
                }
            });
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
                    LiveUnit.Assert.areEqual(0, entranceAnimationCount);
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
        generateDelayedEntranceAnimation("GridLayout");
        generateSkippedEntranceAnimation("GridLayout");
        generateSkippedContentTransition("GridLayout");
        generateInterruptedEntranceAnimationWithContentTransitionPlayed("GridLayout");
        generateInterruptedEntranceAnimationWithNoContentTransitionPlayed("GridLayout");
    }

    function generateAnimationEventsWithAnimationsDisabled(layoutName) {
        ListViewAnimationTest.prototype["testAnimationEventsWithAnimationsDisabled" + layoutName] = function (complete) {
            var element = document.getElementById("AnimationTest");
            element.style.height = "150px";
            element.style.direction = "ltr";
            var entranceAnimationCount = 0;
            WinJS.Utilities["_addEventListener"](element, "animationstart", function (e) {
                if (e.animationName.indexOf("enterContent") !== -1) {
                    entranceAnimationCount++;
                }
            });
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
            var listView = new ListView(element, { itemDataSource: getDataSource(), itemTemplate: basicRenderer, layout: new WinJS.UI[layoutName]() });
            listView._animationsDisabled = function () {
                return true;
            }
            initializationComplete = true;

            var tests = [
                function () {
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), entranceAnimationCount);
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), countAnimationHandlerCalled);
                    listView.itemDataSource = getDataSource();
                    return true;
                },
                function () {
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), entranceAnimationCount);
                    LiveUnit.Assert.areEqual((offByOne ? 1 : 0), countAnimationHandlerCalled);
                    complete();
                }
            ];

            Helper.ListView.runTests(listView, tests);
        };
    };
    generateAnimationEventsWithAnimationsDisabled("GridLayout");
    
     var disabledTestRegistry = {
        testDelayedEntranceAnimationGridLayout: [
            Helper.Browsers.safari,
            Helper.Browsers.chrome,
            Helper.Browsers.android
        ],
        testSkippedContentTransitionGridLayout: [
            Helper.Browsers.safari,
            Helper.Browsers.chrome,
            Helper.Browsers.android
        ],
        testInterruptedEntranceAnimationWithContentTransitionPlayedGridLayout: [
            Helper.Browsers.safari,
            Helper.Browsers.chrome,
            Helper.Browsers.android
        ]
    };
    Helper.disableTests(ListViewAnimationTest, disabledTestRegistry);
}
LiveUnit.registerTestClass("WinJSTests.ListViewAnimationTest");
