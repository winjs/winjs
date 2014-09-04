// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.ts" />
/// <reference path="../TestLib/ListViewHelpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.SemanticZoomWithListViewTests = function () {
    "use strict";

    var zoomedInListViewId = "SezoLVTestsZoomedInListView";
    var zoomedOutListViewId = "SezoLVTestsZoomedOutListView";
    var sezoRootId = "SemanticZoomWithListViewTestsRoot";
    var zoomedInItemsPerZoomedOutItem = 10;
    var defaultWidth = 500;
    var defaultHeight = 500;
    // Even with animations disabled, these tests can take a good 5-6 seconds if each item is tested individually. We'll skip ahead by testStep instead of
    // going through each item.
    var testStep = 7;
    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");

        function addNode(id, parent) {
            var newNode = document.createElement("div");
            newNode.id = id;
            newNode.style.width = defaultWidth + "px";
            newNode.style.height = defaultHeight + "px";
            (parent ? parent : document.body).appendChild(newNode);
            return newNode;
        }
        var root = addNode(sezoRootId);
        addNode(zoomedInListViewId, root);
        addNode(zoomedOutListViewId, root);
        removeListviewAnimations();

        //WinBlue: 298587
        this._oldMaxTimePerCreateContainers = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;
    };
    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = this._oldMaxTimePerCreateContainers;
        function removeNode(id) {
            var element = document.getElementById(id);
            element.parentNode.removeChild(element);
        }
        removeNode(zoomedOutListViewId);
        removeNode(zoomedInListViewId);
        removeNode(sezoRootId);
        restoreListviewAnimations();
    }


    this.generate = function (name, disableAnimations, testFunction) {
        function generateTest(that, direction, grouped, headersAbove, rtl, layoutName) {
            var fullName = name + layoutName + "_" + direction + (grouped ? "_grouped_" + (headersAbove ? "headersOnTop_" : "headersOnLeft_") : "_") + (rtl ? "rtl" : "ltr");
            that[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);
                var root = document.getElementById(sezoRootId),
                    inView = document.getElementById(zoomedInListViewId),
                    outView = document.getElementById(zoomedOutListViewId);

                root.style.direction = rtl ? "rtl" : "ltr";
                var inDetails = buildGenericListView(inView, {
                    orientation: direction,
                    layout: layoutName,
                    rtl: rtl,
                    grouped: grouped,
                    viewWidth: defaultWidth,
                    viewHeight: defaultHeight,
                    headersAbove: headersAbove,
                });
                var outDetails = buildGenericListView(outView, {
                    orientation: direction,
                    layout: layoutName,
                    rtl: rtl,
                    viewWidth: defaultWidth,
                    viewHeight: defaultHeight,
                    itemsCount: Math.floor(inDetails.layoutInfo.itemsCount / zoomedInItemsPerZoomedOutItem)
                });
                var inListView = inDetails.listView,
                    outListView = outDetails.listView,
                    sezo = new WinJS.UI.SemanticZoom(root, {});
                function onLoadingStateChanged() {
                    if (inListView.loadingState === "complete" && outListView.loadingState === "complete") {
                        inListView.removeEventListener("loadingstatechanged", onLoadingStateChanged);
                        outListView.removeEventListener("loadingstatechanged", onLoadingStateChanged);
                        testFunction(sezo, inDetails, outDetails, rtl, complete);
                    }
                }
                inListView.addEventListener("loadingstatechanged", onLoadingStateChanged);
                outListView.addEventListener("loadingstatechanged", onLoadingStateChanged);
            };
        }

        var that = this;

        // Cover all pair combinations of configurations.
        Helper.pairwise({
            direction: ["horizontal", "vertical"],
            grouped: [true, false],
            headersAbove: [true, false],
            rtl: [true, false],
            layoutName: ["ListLayout", "GridLayout"]
        },[
            // Some configurations are more important because they've found bugs in the past,
            // so configure them explicitly

            // Scenario 1: Horizontal grouped grid with headers to the side (with and without RTL)
            { direction: "horizontal", grouped: true, headersAbove: false, rtl: true, layoutName: "GridLayout"},
            { direction: "horizontal", grouped: true, headersAbove: false, rtl: false, layoutName: "GridLayout"},
            // Scenario 2: Vertical grouped grid with headers above
            { direction: "vertical", grouped: true, headersAbove: true, rtl: false, layoutName: "GridLayout"}
        ]).forEach(function(testCase) {
            generateTest(that, testCase.direction, testCase.grouped, testCase.headersAbove, testCase.rtl, testCase.layoutName);
        });
    }

    var originalIsAnimationEnabled = null;
    function disableUIAnimations() {
        if (!originalIsAnimationEnabled) {
            originalIsAnimationEnabled = WinJS.UI.isAnimationEnabled.bind(WinJS.UI);
            WinJS.UI.isAnimationEnabled = function () {
                return false;
            };
        }
    }
    function enableUIAnimations() {
        if (originalIsAnimationEnabled) {
            WinJS.UI.isAnimationEnabled = originalIsAnimationEnabled;
            originalIsAnimationEnabled = null;
        }
    }

    function generateMouseWheelEventInSezo(sezo, targetElement, zoomIn, rtl, offset) {
        offset = offset || { x: 5, y: 5 };
        var elementRect = targetElement.getBoundingClientRect();
        var fakeEventObject = {
            clientX: elementRect[rtl ? "right" : "left"] + (rtl ? -offset.x : offset.x),
            clientY: elementRect.top + offset.y,
            preventDefault: function () { },
            stopPropagation: function () { },
            srcElement: sezo.element,
            wheelDelta: zoomIn ? 1 : -1,
            ctrlKey: true
        };

        sezo._onMouseWheel(fakeEventObject);
    }

    function ensureIndexVisible(listView, index) {
        var signal = new WinJS._Signal();
        if (listView.loadingState !== "itemsLoading" && listView.indexOfFirstVisible <= index && listView.indexOfLastVisible >= index) {
            signal.complete();
        } else {
            var onLoadingStateChanged = function () {
                if (listView.loadingState === "complete" && listView.indexOfFirstVisible <= index && listView.indexOfLastVisible >= index) {
                    listView.removeEventListener("loadingstatechanged", onLoadingStateChanged);
                    signal.complete();
                }
            }
            listView.addEventListener("loadingstatechanged", onLoadingStateChanged);
            listView.ensureVisible(index);
        }
        return signal.promise;
    }

    this.generate("testZoomInOutMapping", true, function (sezo, inViewDetails, outViewDetails, rtl, complete) {
        var inListView = inViewDetails.listView,
            outListView = outViewDetails.listView;

        var currentZoomedInIndex = 0,
            currentZoomedOutIndex = 0;

        function inToOutMappingFunction(item) {
            LiveUnit.Assert.isFalse(sezo.zoomedOut);
            LiveUnit.Assert.areEqual(currentZoomedInIndex, item.index);
            return {
                groupIndexHint: Math.floor(item.index / zoomedInItemsPerZoomedOutItem)
            };
        }
        function outToInMappingFunction(item) {
            LiveUnit.Assert.isTrue(sezo.zoomedOut);
            LiveUnit.Assert.areEqual(currentZoomedOutIndex, item.index);
            return {
                firstItemIndexHint: item.index * zoomedInItemsPerZoomedOutItem
            };
        }

        sezo.zoomedOutItem = inToOutMappingFunction;
        sezo.zoomedInItem = outToInMappingFunction;
        disableUIAnimations();
        function testNextItem() {
            if (sezo.zoomedOut) {
                ensureIndexVisible(outListView, currentZoomedOutIndex).then(function () {
                    generateMouseWheelEventInSezo(sezo, outListView.elementFromIndex(currentZoomedOutIndex), true, rtl);
                });
            } else {
                ensureIndexVisible(inListView, currentZoomedInIndex).then(function () {
                    generateMouseWheelEventInSezo(sezo, inListView.elementFromIndex(currentZoomedInIndex), false, rtl);
                });
            }
        };

        var middleGroup = Math.floor(outViewDetails.layoutInfo.itemsCount / 3);
        var lastGroup = outViewDetails.layoutInfo.itemsCount - 1;
        var zoomedInIndicies = [
            // first group
            0,
            zoomedInItemsPerZoomedOutItem - 1,
            // middleGroup group
            (middleGroup * zoomedInItemsPerZoomedOutItem),
            (middleGroup * zoomedInItemsPerZoomedOutItem) + (zoomedInItemsPerZoomedOutItem / 2) | 0,
            (middleGroup * zoomedInItemsPerZoomedOutItem) + zoomedInItemsPerZoomedOutItem - 1,
            // last group
            (lastGroup * zoomedInItemsPerZoomedOutItem),
            (lastGroup * zoomedInItemsPerZoomedOutItem) + zoomedInItemsPerZoomedOutItem - 1,
            // exit condition
            Number.MAX_VALUE,
        ];

        sezo.addEventListener("zoomchanged", function () {
            if (sezo.zoomedOut) {
                currentZoomedInIndex = zoomedInIndicies.shift();
            } else {
                currentZoomedOutIndex = Math.floor(currentZoomedInIndex / zoomedInItemsPerZoomedOutItem);
            }
            if (currentZoomedInIndex >= inViewDetails.layoutInfo.itemsCount) {
                enableUIAnimations();
                complete();
            } else {
                WinJS.Utilities._setImmediate(testNextItem);
            }
        });

        testNextItem();
    });
};
if (WinJS.UI.SemanticZoom) {
    LiveUnit.registerTestClass("WinJSTests.SemanticZoomWithListViewTests");
}