// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
"use strict";

var fvUnhandledErrors = {};

function errorEventHandler(evt) {
    var details = evt.detail;
    var id = details.id;
    if (!details.parent) {
        fvUnhandledErrors[id] = details;
    } else if (details.handler) {
        delete fvUnhandledErrors[id];
    }
}

function initUnhandledErrors() {
    fvUnhandledErrors = {};
    WinJS.Promise.addEventListener("error", errorEventHandler);
}

function validateUnhandledErrors() {
    WinJS.Promise.removeEventListener("error", errorEventHandler);
    LiveUnit.Assert.areEqual(0, Object.keys(fvUnhandledErrors).length, "Unhandled errors found");
}

function createArraySource(count, targetWidths, targetHeights, datasourceTag) {
    var data = [];
    datasourceTag = (datasourceTag ? datasourceTag : "");

    for (var i = 0; i < count; i++) {
        data.push({
            itemId: datasourceTag + "genericItem" + i,
            title: datasourceTag + "Generic FlipView Item " + i,
            data1: datasourceTag + "GenericData" + i,
            data2: "OtherData" + i,
            width: (targetWidths ? targetWidths[(targetWidths.length > i ? i : targetWidths.length - 1)] : "100%"),
            height: (targetHeights ? targetHeights[(targetHeights.length > i ? i : targetHeights.length - 1)] : "100%"),
            className: datasourceTag + "genericRenderedItem"
        });
    }

    return {
        dataSource: TestComponents.simpleSynchronousArrayDataSource(data),
        rawData: data
    };
}

function validateInternalBuffers(flipview) {
    var keys = Object.keys(flipview._pageManager._itemsManager._elementMap);
    var bufferKeys = [];
    flipview._pageManager._forEachPage(function (page) {
        if (page && page.elementUniqueID) {
            bufferKeys.push(page.elementUniqueID);
        }
    });

    for (var i = 0, len = keys.length; i < len; i++) {
        var key = keys[i];
        var foundKey = false;
        for (var j = 0, len2 = bufferKeys.length; j < len2; j++) {
            if (bufferKeys[j] === key) {
                foundKey = true;
            }
        }
        if (!foundKey) {
            LiveUnit.Assert.fail("Flipview buffer missing key " + key)
        }
    }

    for (var i = 0, len = bufferKeys.length; i < len; i++) {
        var key = bufferKeys[i];
        var foundKey = false;
        for (var j = 0, len2 = keys.length; j < len2; j++) {
            if (keys[j] === key) {
                foundKey = true;
            }
        }
        if (!foundKey) {
            LiveUnit.Assert.fail("ItemsManager buffer missing key " + key)
        }
    }
}

// Takes in a flipview or flipview.element and action that triggers a pagecompleted event
// Returns a promise that fulfills when the event is fired
function waitForFlipViewReady(flipview, action, usePageSelected) {
    return new WinJS.Promise(function (c, e, p) {
        var event = usePageSelected ? "pageselected" : "pagecompleted";
        LiveUnit.LoggingCore.logComment("Listening to " + event + "event");
        flipview.addEventListener(event, function eventHandler(ev) {
            flipview.removeEventListener(event, eventHandler);
            LiveUnit.LoggingCore.logComment(event + " event fired");
            // Fulfill the promise
            c();
        });
        // Perform the action
        if (action) action();
    });
}

function getElementFromContainer(container) {
    // From a root container, the firstElementChild is the win-item div, and the second is the element itself
    return container.firstElementChild.firstElementChild;
}

function getDisplayedElement(flipView) {
    // Whenever the element has focus we actually have 3 children in the elementRoot instead of 1, two extra
    // because the tab manager inserts a div before and after the actual element.
    var elementRoot = flipView._pageManager._currentPage.elementRoot;
    return elementRoot.children.length === 3 ? elementRoot.children[1] : elementRoot.firstElementChild;
}

function nodeInView(flipView, pageContainer) {
    var pageLeft = pageContainer.offsetLeft,
        pageRight = pageLeft + pageContainer.offsetWidth,
        pageTop = pageContainer.offsetTop,
        pageBottom = pageTop + pageContainer.offsetHeight;

    var viewport = flipView._panningDivContainer;
    return (viewport.scrollLeft <= pageLeft && viewport.scrollLeft + viewport.offsetWidth >= pageRight &&
            viewport.scrollTop <= pageTop && viewport.scrollTop + viewport.offsetHeight >= pageBottom);
}

function elementInView(flipView, element) {
    if (!element.parentNode) {
        return false;
    }
    // Element.parentNode.parentNode.parentNode gets through the various flexboxes that contain an element and returns the element's root div positioned inside of the flipview panning area
    return nodeInView(flipView, element.parentNode.parentNode.parentNode);
}

function currentPageInView(flipView) {
    return nodeInView(flipView, flipView._pageManager._currentPage.pageRoot);
}

function basicInstantRenderer(itemPromise) {
    var rootElement = document.createElement("div");
    rootElement.style.width = "100%";
    rootElement.style.height = "100%";
    rootElement.style.backgroundColor = "#AAAAAA";
    rootElement.textContent = "FlipView Placeholder";
    return {
        element: rootElement,
        renderComplete: itemPromise.then(function (itemData) {
            if (itemData) {
                rootElement.className = itemData.className;
                rootElement.style.position = "relative";
                rootElement.style.width = itemData.data.width;
                rootElement.style.height = itemData.data.height;
                rootElement.textContent = "";
                var titleElement = document.createElement("div"),
                    dataElement = document.createElement("div");
                titleElement.textContent = itemData.data.title;
                dataElement.textContent = itemData.data.data1;
                rootElement.appendChild(titleElement);
                rootElement.appendChild(dataElement);
                rootElement.style.backgroundColor = "#AAFFAA";
            }
        })
    };
}

basicInstantRenderer.verifyOutput = function (renderedItem, rawData) {
    LiveUnit.LoggingCore.logComment("Verifying item matches what should have been rendered");
    var titleElement = renderedItem.firstElementChild,
        dataElement = titleElement.nextElementSibling;

    LiveUnit.Assert.areEqual(titleElement.textContent, rawData.title);
    LiveUnit.Assert.areEqual(dataElement.textContent, rawData.data1);
    LiveUnit.Assert.isTrue(!dataElement.nextElementSibling);
};

function alternateBasicInstantRenderer(itemPromise) {
    var rootElement = document.createElement("div");
    rootElement.style.width = "100%";
    rootElement.style.height = "100%";
    rootElement.style.backgroundColor = "#AAAAAA";
    rootElement.textContent = "FlipView Placeholder";
    return {
        element: rootElement,
        renderComplete: itemPromise.then(function (itemData) {
            rootElement.className = itemData.className;
            rootElement.style.position = "relative";
            rootElement.style.width = itemData.data.width;
            rootElement.style.height = itemData.data.height;
            rootElement.id = itemData.data.itemId;
            rootElement.textContent = "";
            var titleElement = document.createElement("div"),
                dataElement = document.createElement("div"),
                dataElement2 = document.createElement("div");
            titleElement.textContent = "ALT" + itemData.data.title;
            dataElement.textContent = "ALT" + itemData.data.data1,
            dataElement2.textContent = "ALT" + itemData.data.data2;
            rootElement.appendChild(titleElement);
            rootElement.appendChild(dataElement);
            rootElement.appendChild(dataElement2);
            rootElement.style.backgroundColor = "#BBFFCC";
        })
    };
}

alternateBasicInstantRenderer.verifyOutput = function (renderedItem, rawData) {
    LiveUnit.LoggingCore.logComment("Verifying item matches what should have been rendered");
    LiveUnit.Assert.areEqual(renderedItem.id, rawData.itemId);
    var titleElement = renderedItem.firstElementChild,
        dataElement = titleElement.nextElementSibling,
        dataElement2 = dataElement.nextElementSibling;

    LiveUnit.Assert.areEqual(titleElement.textContent, "ALT" + rawData.title);
    LiveUnit.Assert.areEqual(dataElement.textContent, "ALT" + rawData.data1);
    LiveUnit.Assert.areEqual(dataElement2.textContent, "ALT" + rawData.data2);
    LiveUnit.Assert.isTrue(!dataElement2.nextElementSibling);
};

function verifyFlipViewPagePositions(flipView) {
    var width = flipView._flipviewDiv.offsetWidth,
        height = flipView._flipviewDiv.offsetHeight,
        scrollLeft = flipView._panningDivContainer.scrollLeft,
        scrollTop = flipView._panningDivContainer.scrollTop,
        horizontal = flipView.orientation === "horizontal",
        itemSpacing = flipView.itemSpacing,
        pages = [],
        currentPageIndex = -1;

    LiveUnit.Assert.areEqual(0, (horizontal ? scrollTop : scrollLeft));
    flipView._pageManager._forEachPage(function (curr) {
        if (curr.element) {
            pages.push(curr);
            if (curr === flipView._pageManager._currentPage) {
                currentPageIndex = pages.length - 1;
            }
        }
    });

    if (currentPageIndex === -1) {
        // Empty flipview, nothing to verify
        LiveUnit.Assert.isTrue(!flipView._pageManager._currentPage.element);
        return;
    }

    var currentPageLocation = (horizontal ? pages[currentPageIndex].pageRoot.offsetLeft : pages[currentPageIndex].pageRoot.offsetTop);
    for (var i = 0; i < currentPageIndex; i++) {
        var pageLeft = pages[i].pageRoot.offsetLeft,
            pageTop = pages[i].pageRoot.offsetTop;

        LiveUnit.Assert.isFalse(nodeInView(flipView, pages[i]));
        LiveUnit.Assert.areEqual(0, (horizontal ? pageTop : pageLeft));
        var expectedPosition = currentPageLocation - ((horizontal ? width : height) + itemSpacing) * (currentPageIndex - i);
        LiveUnit.Assert.areEqual(0, (horizontal ? pageTop : pageLeft));
        LiveUnit.Assert.areEqual(expectedPosition, (horizontal ? pageLeft : pageTop));
    }
    for (var i = currentPageIndex + 1; i < pages.length; i++) {
        var pageLeft = pages[i].pageRoot.offsetLeft,
            pageTop = pages[i].pageRoot.offsetTop;

        LiveUnit.Assert.isFalse(nodeInView(flipView, pages[i]));
        LiveUnit.Assert.areEqual(0, (horizontal ? pageTop : pageLeft));
        var expectedPosition = currentPageLocation + ((horizontal ? width : height) + itemSpacing) * (i - currentPageIndex);
        LiveUnit.Assert.areEqual(0, (horizontal ? pageTop : pageLeft));
        LiveUnit.Assert.areEqual(expectedPosition, (horizontal ? pageLeft : pageTop));
    }
}

function runFlipViewTests(flipView, tests, usePageCompletedEvent) {
    var currentTest = 0;

    function runNextTest() {
        WinJS.Utilities._setImmediate(function () {
            if (currentTest < tests.length) {
                verifyFlipViewPagePositions(flipView);
                var moveOn = tests[currentTest++]();
                if (moveOn) {
                    runNextTest();
                }
            }
        });
    }

    function pageEventHandler(event) {
        runNextTest();
    }

    WinJS.Promise.timeout(500).then(function() {
        flipView.addEventListener(usePageCompletedEvent ? "pagecompleted" : "pageselected", pageEventHandler, false);
        runNextTest();
    });
}

function quickNext(curr, next, horizontal) {
    var locationProp = (horizontal ? "left" : "top"),
        sizeProp = (horizontal ? "offsetWidth" : "offsetHeight"),
        offset = next[sizeProp];

    next.style[locationProp] = offset + "px";
    return quickMoveTransition([curr, next], -offset, horizontal);
}

function quickPrevious(curr, prev, horizontal) {
    var locationProp = (horizontal ? "left" : "top"),
        sizeProp = (horizontal ? "offsetWidth" : "offsetHeight"),
        offset = prev[sizeProp];

    prev.style[locationProp] = -offset + "px";
    return quickMoveTransition([curr, prev], offset, horizontal);
}

function quickMoveTransition(elements, offset, horizontal) {
    var transitionInfo = {
        property: WinJS.Utilities._browserStyleEquivalents["transform"].cssName,
        delay: 0,
        duration: 50,
        timing: "ease-out",
        to: (horizontal ? "translateX(" + offset + "px)" : "translateY(" + offset + "px)")
    };

    return WinJS.UI.executeTransition(elements, transitionInfo);
}

function setupQuickAnimations(flipView) {
    function wrappedNext(curr, next) {
        return quickNext(curr, next, flipView.orientation === "horizontal");
    }
    function wrappedPrevious(curr, next) {
        return quickPrevious(curr, next, flipView.orientation === "horizontal");
    }
    flipView.setCustomAnimations({
        next: wrappedNext,
        previous: wrappedPrevious,
        jump: wrappedNext
    });
}

var seed = 0;
function pseudorandom(nMax) {
    seed = (seed + 0.81282849124) * 2375.238208308;
    seed -= Math.floor(seed);

    return Math.floor(seed * nMax);
};
