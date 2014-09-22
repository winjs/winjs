// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
///<reference path="LegacyLiveUnit/CommonUtils.ts" />


    "use strict";
    var utilities = WinJS.Utilities,
        constants = {
            dimensions: {
                itemHeight: 70,
                itemWidth: 70,
            },
            aria: {
                listViewRole: "listbox",
                itemRole: "option",
                multiSelectable: {
                    true: "true",
                    false: "false"
                }
            }
        },
        templates = {
            syncJSTemplate: function (itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.id = item.data.title;
                    utilities.addClass(element, "syncJSTemplate");
                    element.style.width = item.data.itemWidth;
                    element.style.height = item.data.itemHeight;
                    element.innerHTML = "<div>" + item.data.title + "</div>";
                    return element;
                });
            },
            asyncJSTemplate: function (itemPromise) {
                return itemPromise.then(function (item) {
                    // TODO: Fill in the details later
                });
            }
        },
        defaultOptions = function () {
            return {
                selectionMode: WinJS.UI.SelectionMode.multi,
                tapBehavior: WinJS.UI.TapBehavior.invokeOnly,
                swipeBehavior: WinJS.UI.SwipeBehavior.select,
                scrollPosition: 0
            };
        };

    function _ASSERT(condition) {
        LiveUnit.Assert.isTrue(!!condition);
    }

    function _TRACE(text) {
        LiveUnit.LoggingCore.logComment(text);
    }

    WinJS.UI['ListDataSource'] = WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (listDataAdapter) {
        this._baseDataSourceConstructor(listDataAdapter);
    });

    function checkAttribute(element, attribute, expectedValue) {
        var values = element.getAttribute(attribute).match(expectedValue),
            value = values ? values[0] : null;

        LiveUnit.Assert.areEqual(value, expectedValue, "Expected " + attribute + ": " + expectedValue +
            " Actual: " + value);
    }

    // Returns a number between 0 to parameter
    function randomNumber(upto) {
        return Math.floor(Math.random() * (upto + 1));
    };

    function validateListView(listView) {
        // Check properties and methods
        LiveUnit.Assert.isTrue(listView);
        LiveUnit.Assert.isTrue(listView.itemDataSource);
        LiveUnit.Assert.isTrue(listView.layout);
        LiveUnit.Assert.isTrue(listView.selectionMode);
        LiveUnit.Assert.isTrue(listView.swipeBehavior);
        LiveUnit.Assert.isTrue(listView.tapBehavior);
        LiveUnit.Assert.isTrue(listView.loadingState);
        LiveUnit.Assert.isTrue(listView.selection);
        LiveUnit.Assert.isTrue(listView.tapBehavior);
        LiveUnit.Assert.isTrue(listView.zoomableView);
        LiveUnit.Assert.isTrue(listView.itemTemplate && (typeof listView.itemTemplate === "function"));
        LiveUnit.Assert.isTrue(listView.addEventListener && (typeof listView.addEventListener === "function"));
        LiveUnit.Assert.isTrue(listView.removeEventListener && (typeof listView.removeEventListener === "function"));
        LiveUnit.Assert.isTrue(listView.elementFromIndex && (typeof listView.elementFromIndex === "function"));
        LiveUnit.Assert.isTrue(listView.indexOfElement && (typeof listView.indexOfElement === "function"));
        LiveUnit.Assert.isTrue(listView.ensureVisible && (typeof listView.ensureVisible === "function"));
        LiveUnit.Assert.isTrue(listView.forceLayout && (typeof listView.forceLayout === "function"));

        var element = listView.element,
            viewport = listView._viewport,
            surface = listView._canvas;

        // Check for proper css classes
        checkAttribute(element, "class", WinJS.UI._listViewClass);
        checkAttribute(viewport, "class", WinJS.UI._viewportClass);
        var horizontal;
        horizontal = (listView.layout.orientation === "horizontal");
        checkAttribute(viewport, "class", (horizontal ? WinJS.UI._horizontalClass : WinJS.UI._verticalClass));
        checkAttribute(surface, "class", WinJS.UI._scrollableClass);

        // Check for accessibility attributes
        // 592099 ListView needs to set the aria attributes on the DOM elements before the loadingState is set to complete
        // TODO: Uncomment following lines after the above bug is fixed
        //checkAttribute(element, "role", constants.aria.listViewRole);
        //checkAttribute(element, "aria-multiselectable", ((listView.selectionMode === "multi") ? "true" : "false"));

        return true;
    }

    function validateResetFocusState(listView, context, listViewIsEmpty = false) {
        var childFocus = listView._tabManager.childFocus;

        LiveUnit.Assert.areEqual(0, listView.currentItem.index, "ListView's currentItem wasn't reset " + context);
        if (listViewIsEmpty) {
            LiveUnit.Assert.areEqual(null, childFocus, "_tabManager's childFocus wasn't reset " + context);
        } else {
            LiveUnit.Assert.isTrue(childFocus === listView.elementFromIndex(0) || childFocus === null, "_tabManager's childFocus wasn't reset " + context);
        }
    }


    function waitForDeferredAction(listView) {
        if (listView.winControl) { listView = listView.winControl; }

        return function (x?) {
            return new WinJS.Promise(function (complete) {
                function waitForDeferredAction_handler() {
                    listView.removeEventListener("accessibilityannotationcomplete", waitForDeferredAction_handler, false);
                    WinJS.Utilities._setImmediate(function () {
                        complete(x);
                    });
                }

                listView.addEventListener("accessibilityannotationcomplete", waitForDeferredAction_handler, false);
            });
        }
    }

    function waitForReady(listView, delay?) {
        if (listView.winControl) { listView = listView.winControl; }
        return function (x?):WinJS.Promise<any> {
            return new WinJS.Promise(function (c, e, p) {
                function waitForReady_handler() {
                    LiveUnit.LoggingCore.logComment("waitForReady_handler, listView.loadingState:" + listView.loadingState);
                    if (listView.loadingState === "complete") {
                        listView.removeEventListener("loadingstatechanged", waitForReady_handler, false);
                        waitForReady_work();
                    }
                }

                function waitForReady_work() {
                    if (listView._versionManager.locked) {
                        listView._versionManager.unlocked.then(waitForReady_work);
                    } else if (listView.loadingState !== "complete") {
                        listView.addEventListener("loadingstatechanged", waitForReady_handler, false);
                    } else {
                        WinJS.Utilities.Scheduler.schedulePromiseIdle(null, "ListViewWaitForReadyComplete").then(function() {
                            c(x);
                        });
                    }
                }

                function waitForReady_start() {
                    WinJS.Utilities.Scheduler.schedulePromiseIdle(null, "ListViewWaitForReady").then(waitForReady_work);
                }

                LiveUnit.LoggingCore.logComment("listView.loadingState: " + listView.loadingState);
                if (delay) {
                    if (delay < 0) {
                        WinJS.Utilities._setImmediate(waitForReady_start);
                    } else {
                        setTimeout(waitForReady_start, delay);
                    }
                } else {
                    waitForReady_work();
                }
            });
        };
    }

    function waitForState(listView, state, delay) {
        if (listView.winControl) { listView = listView.winControl; }

        return function (x?) {
            return new WinJS.Promise(function (c, e, p) {
                function waitForReady_handler() {
                    LiveUnit.LoggingCore.logComment("waitForReady_handler: ListView loadingState = " + listView.loadingState);
                    if (listView.loadingState === state) {
                        listView.removeEventListener("loadingstatechanged", waitForReady_handler, false);
                        c(x);
                    }
                }

                function waitForReady_work() {
                    LiveUnit.LoggingCore.logComment("waitForReady_work ListView loadingState = " + listView.loadingState);
                    if (listView.loadingState !== state) {
                        listView.addEventListener("loadingstatechanged", waitForReady_handler, false);
                    }
                    else {
                        c(x);
                    }
                }

                if (delay) {
                    if (delay < 0) {
                        WinJS.Utilities._setImmediate(waitForReady_work);
                    }
                    else {
                        setTimeout(waitForReady_work, delay);
                    }
                }
                else {
                    waitForReady_work();
                }
            });
        }
    }

    function waitForAllContainers(listView) {
        if (listView.winControl) { listView = listView.winControl; }

        return waitForReady(listView, -1)().then(function () {
            return listView._view._creatingContainersWork ? listView._view._creatingContainersWork.promise : null;
        }).then(function () {
                return listView._view._getLayoutCompleted();
        }).then(function () {
            return waitForReady(listView, -1)();
        });
    }

    function waitForNotReady(listView) {
        if (listView.winControl) { listView = listView.winControl; }

        return function (x) {
            return new WinJS.Promise(function (c, e, p) {
                function waitForNotReady_handler() {
                    if (listView.loadingState !== 'complete') {
                        listView.removeEventListener('loadingstatechanged', waitForNotReady_handler);
                        c(x);
                    }
                }

                if (listView.loadingState === 'complete') {
                    listView.addEventListener('loadingstatechanged', waitForNotReady_handler);
                } else {
                    c(x);
                }
            });
        }
    }

    function whenLoadingComplete(listview, func) {
        function checkAndExecute() {
            if (listview.loadingState === "complete") {
                func();
            }
        }

        listview.addEventListener("loadingstatechanged", LiveUnit.GetWrappedCallback(checkAndExecute), false);
        checkAndExecute();
    }

    function runTests(listview, tests) {
        var current = 0;

        function stateChanged() {
            while (current < tests.length && listview.loadingState === "complete") {
                LiveUnit.LoggingCore.logComment("executing test " + current);
                if (tests[current++]()) {
                    break;
                }
            }
        }
        WinJS.Utilities._setImmediate(function () {
            whenLoadingComplete(listview, stateChanged);
        });
    }

    function createAsyncRenderer(templateId, width, height, targetId?, delay?) {
        var templateElement = <HTMLElement>document.getElementById(templateId).cloneNode(true);
        templateElement.id = "";
        var templateText = templateElement.innerHTML;

        function process(item) {
            var pattern = /{{(\w+)}}/g;
            return templateText.replace(pattern, function (str, field) {
                var value = item.data[field];
                return value !== undefined ? value : str;
            });
        }

        return function renderer(itemPromise) {
            var element = <HTMLElement>templateElement.cloneNode(false);
            element.style.width = width + "px";
            element.style.height = height + "px";
            element.style.display = "block";
            element.textContent = "Loading";
            var renderComplete = itemPromise.then(function (item) {
                element.innerHTML = process(item);
                if (targetId) {
                    element.id = targetId + item.index;
                }
                return WinJS.Promise.timeout(delay);
            });
            return {
                element: element,
                renderComplete: renderComplete
            };
        };
    }

    function createRenderer(templateId, targetId?) {
        var element = <HTMLElement>document.getElementById(templateId).cloneNode(true);
        element.id = "";
        var temp = element.outerHTML;
        return function renderer(itemPromise) {
            return itemPromise.then(function (item) {
                var pattern = /{{(\w+)}}/g;
                var text = temp.replace(pattern, function (str, field) {
                    var value = item.data[field];
                    return value !== undefined ? value : str;
                });
                var element:HTMLElement = document.createElement("div");
                element.innerHTML = text;
                element = <HTMLElement>element.firstChild;
                element.style.display = "block";
                if (targetId) {
                    element.id = targetId + item.index;
                }
                return element;
            });
        };
    }

    function viewport(element) {
        return element.winControl._viewport;
    }

    function canvas(element) {
        return element.winControl._canvas;
    }

    function itemCanvas(element) {
        return element.winControl._itemCanvas;
    }

    function extend(target, source) {
        target = target || {};
        for (var fieldname in source) {
            if (!target.hasOwnProperty(fieldname)) {
                target[fieldname] = source[fieldname];
            }
        }
        return target;
    }

    function getDataObjects(dataSource, indices) {
        var listBinding = dataSource.createListBinding(),
            promises = [];

        for (var i = 0; i < indices.length; ++i) {
            promises.push(listBinding.fromIndex(indices[i]));
        }

        return WinJS.Promise.join(promises).then(function (items) {
            listBinding.release();
            return items;
        });
    }

    function getRealizedCount(element) {
        var containers = element.querySelectorAll("." + WinJS.UI._containerClass),
            count = 0;

        for (var i = 0; i < containers.length; i++) {
            count += containers[i].childNodes.length ? 1 : 0;
        }

        return count;
    }

    function getItemsCount(canvas) {
        var count = 0;
        for (var i = 0; i < canvas.childNodes.length; i++) {
            if (canvas.childNodes[i].className.indexOf(WinJS.UI._containerClass) !== -1 && canvas.childNodes[i].innerHTML !== "") {
                count++;
            }
        }

        return count;
    }


    function elementsEqual(expectedArray, actualArray) {
        if (expectedArray === actualArray) {
            return;
        }

        if ((expectedArray === undefined && actualArray !== undefined) ||
            (expectedArray !== undefined && actualArray === undefined)) {
            LiveUnit.Assert.isTrue(false);
        }

        if ((expectedArray === null && actualArray !== null) ||
            (expectedArray !== null && actualArray === null)) {
            LiveUnit.Assert.isTrue(false);
        }

        LiveUnit.Assert.areEqual(expectedArray.length, actualArray.length);

        for (var i = 0; i < expectedArray.length; i++) {
            LiveUnit.Assert.areEqual(expectedArray[i], actualArray[i]);
        }
    }

    function setItemsOut(rtl, affectedItems, inserted, removed) {
        var positionProperty = (rtl ? "right" : "left");
        function forEachItem(map, callback) {
            var itemIDs = Object.keys(map);
            for (var i = 0; i < itemIDs.length; i++) {
                callback(map[itemIDs[i]]);
            }
        }
        forEachItem(affectedItems, function (record) {
            record.element.style[positionProperty] = record.left + "px";
            record.element.style.top = record.top + "px";
        });
        forEachItem(removed, function (record) {
            if (record.element.parentNode) {
                record.element.parentNode.removeChild(record.element);
            }
        });
        forEachItem(inserted, function (record) {
            record.element.style.opacity = 1.0;
        });
    }

    function createTrivialAnimationTracker() {
        return {
            getCompletionPromise: function () {
                return WinJS.Promise.wrap();
            }
        };
    }

    var trivialAnimationHelper = {
        animateEntrance: function () {
            return WinJS.Promise.wrap();
        },
        fadeInElement: function (e) {
            return WinJS.Promise.wrap();
        },
        fadeOutElement: function (e) {
            return WinJS.Promise.wrap();
        }
    }
    var realAnimationHelper = {
    },
    realHelperRecorded = false;
    function removeListviewAnimations() {
        var functions;
        if (!realHelperRecorded) {
            functions = Object.keys(WinJS.UI._ListViewAnimationHelper);
            for (var i = 0; i < functions.length; i++) {
                realAnimationHelper[functions[i]] = WinJS.UI._ListViewAnimationHelper[functions[i]];
            }
            realHelperRecorded = true;
        }
        functions = Object.keys(trivialAnimationHelper);
        for (var i = 0; i < functions.length; i++) {
            WinJS.UI._ListViewAnimationHelper[functions[i]] = trivialAnimationHelper[functions[i]];
        }
    }
    function restoreListviewAnimations() {
        if (realHelperRecorded) {
            var functions = Object.keys(realAnimationHelper);
            for (var i = 0; i < functions.length; i++) {
                WinJS.UI._ListViewAnimationHelper[functions[i]] = realAnimationHelper[functions[i]];
            }
        }
    }

    function containerFrom(element) {
        while (element && !WinJS.Utilities.hasClass(element, WinJS.UI._containerClass)) {
            element = element.parentNode;
        }
        return element;
    }

    function headerContainerFrom(listView, element) {
        var layout = listView.layout;
        while (element && !WinJS.Utilities.hasClass(element, WinJS.UI._headerContainerClass)) {
            element = element.parentNode;
        }
        return element;
    }

    function offsetLeftFromSurface(listView, element) {
        return WinJS.Utilities.getPosition(element).left - WinJS.Utilities.getPosition(listView._canvas).left;
    }

    function offsetRightFromSurface(listView, element) {
        var surfacePos:any = WinJS.Utilities.getPosition(listView._canvas),
            elementPos:any = WinJS.Utilities.getPosition(element);
        surfacePos.right = surfacePos.left + surfacePos.width;
        elementPos.right = elementPos.left + elementPos.width;
        return surfacePos.right - elementPos.right;
    }

    function offsetTopFromSurface(listView, element) {
        return WinJS.Utilities.getPosition(element).top - WinJS.Utilities.getPosition(listView._canvas).top;
    }

    function getBasicColorString(rVal, gVal, bVal) {
        rVal = ((rVal || 0) % 16).toString(16);
        gVal = ((gVal || 0) % 16).toString(16);
        bVal = ((bVal || 0) % 16).toString(16);
        return "#" + rVal + rVal + gVal + gVal + bVal + bVal;
    }
    function getBasicDataSource(itemsCount, grouped, itemsPerGroup):WinJS.Binding.ListBaseWithMutators<any> {
        var rawData = [];
        for (var i = 0; i < itemsCount; i++) {
            rawData.push({ index: i });
        }
        var list = new WinJS.Binding.List(rawData);
        if (!grouped) {
            return list;
        }

        return list.createGrouped(function (item) {
            return "Group" + Math.floor(item.index / itemsPerGroup);
        }, function (item) {
            return { title: "Group" + Math.floor(item.index / itemsPerGroup) };
        });
    }
    function basicRenderer(itemPromise) {
        var element = document.createElement("div");
        return {
            element: element,
            renderComplete: itemPromise.then(function (item) {
                element.textContent = "Item" + item.data.index;
                element.style.backgroundColor = getBasicColorString(0, 0, item.data.index);
            })
        };
    }
    function basicHeaderRenderer(itemPromise) {
        var element = document.createElement("div");
        return {
            element: element,
            renderComplete: itemPromise.then(function (item) {
                element.textContent = item.data.title;
                element.style.backgroundColor = getBasicColorString(0, 15, item.data.index);
            })
        };
    }

    function calcExpectedItemBarAndSlot(itemIndex, options) {
        if (options.grouped) {
            var itemGroup = Math.floor(itemIndex / options.itemsPerGroup);
            itemIndex -= (options.itemsPerGroup * itemGroup);
        }
        var barInGroup = Math.floor(itemIndex / options.itemsPerBar);
        var slotInBar = itemIndex % options.itemsPerBar;
        return {
            bar: barInGroup,
            slot: slotInBar,
        }
    }
    function calcExpectedItemStart(itemIndex, options) {
        var itemGroup = 0,
            barsPerGroup = 0;
        if (options.grouped) {
            itemGroup = Math.floor(itemIndex / options.itemsPerGroup);
            barsPerGroup = Math.ceil(options.itemsPerGroup / options.itemsPerBar);
            itemIndex -= (options.itemsPerGroup * itemGroup);
        }
        var barInGroup = Math.floor(itemIndex / options.itemsPerBar);
        return ((options.headersInline ? options.headerSize : 0) + barInGroup * options.itemSize) +
                (options.grouped ? (itemGroup * ((options.headersInline ? options.headerSize : 0) + barsPerGroup * options.itemSize)) : 0) +
                (options.grouped ? ((itemGroup + 1) * options.groupLeaderOffset) : 0) +
                (options.horizontal ? options.canvasMargins[options.rtl ? "right" : "left"] : options.canvasMargins.top);
    }
    function calcExpectedItemEnd(itemIndex, options) {
        return calcExpectedItemStart(itemIndex, options) + options.itemSize;
    }
    function computeExpectedLayoutInformation(options) {
        var currentAbsoluteIndex = 0;
        var currentPosition = options.groupLeaderOffset + (options.horizontal ? options.canvasMargins.left : options.canvasMargins.top);
        var layoutInfo = {
            horizontal: options.horizontal,
            groupsInfo: [],
            grouped: options.grouped,
            headersInline: options.headersInline,
            itemsPerBar: options.itemsPerBar,
            itemsCount: options.itemsCount,
            itemsPerGroup: options.itemsPerGroup
        };
        options.itemSize = options.horizontal ? options.totalItemWidth : options.totalItemHeight;
        for (var i = 0; i < options.groupsCount; i++) {
            layoutInfo.groupsInfo.push({
                start: currentPosition,
                bars: [],
                items: []
            });
            for (var j = 0; j < options.maxGroupSize && currentAbsoluteIndex < options.itemsCount; j++) {
                var itemLayoutLocation = calcExpectedItemBarAndSlot(currentAbsoluteIndex, options);
                var expectedStart = calcExpectedItemStart(currentAbsoluteIndex, options);
                var expectedEnd = calcExpectedItemEnd(currentAbsoluteIndex, options);
                var itemDetails = {
                    start: expectedStart,
                    end: expectedEnd,
                    bar: itemLayoutLocation.bar,
                    slot: itemLayoutLocation.slot,
                    absoluteIndex: currentAbsoluteIndex,
                    left: (options.horizontal ? expectedStart : (options.canvasMargins.top + itemLayoutLocation.slot * options.totalItemWidth + (options.grouped && !options.headersInline ? options.headerSize : 0))),
                    top: (!options.horizontal ? expectedStart : (options.canvasMargins[options.rtl ? "right" : "left"] + itemLayoutLocation.slot * options.totalItemHeight + (options.grouped && !options.headersInline ? options.headerSize : 0))),
                    itemWidth: null,
                    itemHeight: null
                };
                itemDetails.left += options.itemMargins.left;
                itemDetails.top += options.itemMargins.top;
                itemDetails.itemWidth = options.totalItemWidth - (options.itemMargins.left + options.itemMargins.right);
                itemDetails.itemHeight = options.totalItemHeight - (options.itemMargins.top + options.itemMargins.bottom);
                currentPosition = Math.max(currentPosition, expectedStart);
                if (layoutInfo.groupsInfo[i].bars.length <= itemLayoutLocation.bar) {
                    layoutInfo.groupsInfo[i].bars.push([]);
                }
                layoutInfo.groupsInfo[i].bars[itemDetails.bar].push(itemDetails);
                layoutInfo.groupsInfo[i].items.push(itemDetails);
                currentAbsoluteIndex++;
            }

            layoutInfo.groupsInfo[i].end = currentPosition = layoutInfo.groupsInfo[i].items[layoutInfo.groupsInfo[i].items.length - 1].end;
        }
        return layoutInfo;
    }

    var uniqueCounter = 0;
    function addStylesForView(root, options) {
        var styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
        if (!root.id) {
            root.id = WinJS.Utilities._uniqueID(root);
        }
        var styleClass = "generatedListView" + uniqueCounter++;
        WinJS.Utilities.addClass(root, styleClass);
        var rootClass = "#" + root.id + "." + styleClass;
        var rules = [rootClass + " {width: " + options.viewWidth + "px; height: " + options.viewHeight + "px;}",
                     rootClass + " .win-surface {margin: " + options.canvasMargins.top + "px " + options.canvasMargins.right + "px " + options.canvasMargins.bottom + "px " + options.canvasMargins.left + "px;}",
                     rootClass + " .win-container {margin: " + options.itemMargins.top + "px " + options.itemMargins.right + "px " + options.itemMargins.bottom + "px " + options.itemMargins.left + "px;}",
                     rootClass + " .win-container, .win-item {width: " + options.itemWidth + "px; height: " + options.itemHeight + "px;}"
        ];
        if (options.grouped) {
            rules.push(rootClass + " .win-groupheadercontainer, .win-groupheader {width: " + options.headerSize + "px; height: " + options.headerSize + "px;padding: 0;}");
            rules.push(rootClass + " .win-horizontal .win-groupleader {" + (options.rtl ? "margin-right" : "margin-left") + ": " + options.groupLeaderOffset + "px;}");
            rules.push(rootClass + " .win-vertical .win-groupleader {margin-top: " + options.groupLeaderOffset + "px;}");
        }


        var sheet = <CSSStyleSheet>styleElement.sheet;
        for (var i = 0; i < rules.length; i++) {
            sheet.insertRule(rules[i], sheet.cssRules.length);
        }

        return styleElement;
    }

    var defaultItemSize = 100;
    var defaultHeaderSize = 100;
    var defaultItemsCount = 100;
    var defaultItemsPerGroup = 10;
    var defaultViewWidth = 500;
    var defaultViewHeight = 500;
    var defaultGroupLeaderOffset = 100;
    var defaultListOrientation = "vertical";
    var defaultGridOrientation = "horizontal";
    var defaultLayout = "GridLayout";
    var defaultMargins = { left: 0, right: 0, top: 0, bottom: 0 };
    var defaultHeadersAbove = false;

    function getMarginOptions(marginsProvided) {
        marginsProvided = marginsProvided || { left: 0, right: 0, top: 0, bottom: 0 };
        if (marginsProvided.left === undefined) {
            marginsProvided.left = defaultMargins.left;
        }
        if (marginsProvided.right === undefined) {
            marginsProvided.right = defaultMargins.right;
        }
        if (marginsProvided.top === undefined) {
            marginsProvided.top = defaultMargins.top;
        }
        if (marginsProvided.bottom === undefined) {
            marginsProvided.bottom = defaultMargins.bottom;
        }
        return marginsProvided;
    }

    function buildGenericListView(root, options) {
        options = options || {};
        options.itemWidth = options.itemWidth || defaultItemSize;
        options.itemHeight = options.itemHeight || defaultItemSize;
        options.itemsCount = options.itemsCount || defaultItemsCount;
        options.itemMargins = getMarginOptions(options.itemMargins);
        options.canvasMargins = getMarginOptions(options.canvasMargins);
        options.layout = options.layout || defaultLayout;
        options.rtl = options.rtl || false;
        options.itemTemplate = options.itemTemplate || basicRenderer;
        options.viewWidth = options.viewWidth || defaultViewWidth;
        options.viewHeight = options.viewHeight || defaultViewHeight;
        if (options.grouped) {
            options.headerSize = options.headerSize || defaultHeaderSize;
            options.itemsPerGroup = options.itemsPerGroup || defaultItemsPerGroup;
            options.headerTemplate = options.headerTemplate || basicHeaderRenderer;
            options.headersAbove = (options.headersAbove !== undefined ? !!options.headersAbove : defaultHeadersAbove);
            options.groupLeaderOffset = (options.groupLeaderOffset !== undefined ? options.groupLeaderOffset : defaultGroupLeaderOffset);
        }

        var usingListLayout = (options.layout === "ListLayout");
        options.orientation = options.orientation || (usingListLayout ? defaultListOrientation : defaultGridOrientation);
        options.horizontal = (options.orientation === "horizontal");
        options.totalItemHeight = options.itemHeight + options.itemMargins.top + options.itemMargins.bottom;
        options.totalItemWidth = options.itemWidth + options.itemMargins.left + options.itemMargins.right;

        if (options.forceOneItemPerBar || usingListLayout) {
            if (options.horizontal) {
                var totalAvailableHeight = options.viewHeight - options.canvasMargins.top;
                if (options.grouped && options.headersAbove) {
                    totalAvailableHeight -= options.headerSize;
                }

                if (options.forceOneItemPerBar) {
                    options.canvasMargins.bottom = totalAvailableHeight - options.totalItemHeight;
                } else {
                    options.itemHeight = totalAvailableHeight;
                }
            } else {
                var totalAvailableWidth = options.viewWidth - options.canvasMargins.left;
                if (options.grouped && !options.headersAbove) {
                    totalAvailableWidth -= options.headerSize;
                }

                if (options.forceOneItemPerBar) {
                    options.canvasMargins.right = totalAvailableWidth - options.totalItemWidth;
                } else {
                    options.itemWidth = totalAvailableWidth;
                }
            }
        }

        options.availableLayoutWidth = options.viewWidth - (options.canvasMargins.left + options.canvasMargins.right);
        options.availableLayoutHeight = options.viewHeight - (options.canvasMargins.top + options.canvasMargins.bottom);
        options.expectedItemsPerBar = (usingListLayout ? 1 : (options.horizontal ? Math.floor(options.availableLayoutHeight / options.totalItemHeight) : Math.floor(options.availableLayoutWidth / options.totalItemWidth)));
        options.headersInline = (options.grouped ? ((options.horizontal && !options.headersAbove) || (!options.horizontal && options.headersAbove)) : false);
        options.itemsPerBar = Math.max((options.headersInline || !options.grouped ? options.expectedItemsPerBar : options.expectedItemsPerBar - 1), 1);
        options.groupsCount = (options.grouped ? Math.ceil(options.itemsCount / options.itemsPerGroup) : 1);
        options.lastBarInGroup = (options.grouped ? Math.floor(options.itemsPerGroup / options.itemsPerBar) : Math.floor(options.itemsCount / options.itemsPerBar));
        options.maxGroupSize = (options.grouped ? options.itemsPerGroup : options.itemsCount);

        if (options.rtl) {
            var temp = options.itemMargins.left;
            options.itemMargins.left = options.itemMargins.right;
            options.itemMargins.right = temp;
            temp = options.canvasMargins.left;
            options.canvasMargins.left = options.canvasMargins.right;
            options.canvasMargins.right = temp;
        }

        var layoutInfo = computeExpectedLayoutInformation(options);
        var styleElement = addStylesForView(root, options);
        root.style.direction = options.rtl ? "rtl" : "ltr";
        var bindingList = <WinJS.Binding.GroupedSortedListProjection<any>> getBasicDataSource(options.itemsCount, options.grouped, options.itemsPerGroup);
        var layoutOptions:any = {
            orientation: options.orientation
        };
        var viewOptions:any = {
            itemDataSource: bindingList.dataSource,
            itemTemplate: options.itemTemplate,
        };
        if (options.grouped) {
            layoutOptions.groupHeaderPosition = (options.headersAbove ? WinJS.UI.HeaderPosition.top : WinJS.UI.HeaderPosition.left);
            viewOptions.groupDataSource = bindingList.groups.dataSource;
            viewOptions.groupHeaderTemplate = options.headerTemplate;
        }
        viewOptions.layout = new WinJS.UI[options.layout](layoutOptions);
        var listView = new WinJS.UI.ListView(root, viewOptions);
        var originalDispose = listView.dispose.bind(listView);
        listView.dispose = function () {
            originalDispose();
            document.head.removeChild(styleElement);
        };
        return {
            listView: listView,
            layoutInfo: layoutInfo
        };
    }

    function skipFirstAnimation(listView) {
        var firstAnimation = true;
        listView.addEventListener("contentanimating", function (eventObject) {
            if (firstAnimation) {
                firstAnimation = false;
                eventObject.preventDefault();
            }
        });
    }