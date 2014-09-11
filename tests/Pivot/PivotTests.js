// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var WinJSTests = WinJSTests || {};

WinJSTests.PivotTests = function () {
    "use strict";

    var Keys = WinJS.Utilities.Key;
    var PT_MOUSE = WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE || "mouse";
    var PT_TOUCH = WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
    var pivotWidth = 320;

    var pointerName = "Mouse";
    var initFuncName = "initMouseEvent";
    if (window.PointerEvent) {
        pointerName = "Pointer";
        initFuncName = "initPointerEvent";
    } else if (window.MSPointerEvent) {
        pointerName = "MSPointer";
        initFuncName = "initPointerEvent";
    }

    var snapPointsDetectionFunc = WinJS.Utilities._detectSnapPointsSupport.bind(WinJS.Utilities);
    var supportsSnap = null;
    WinJS.Utilities._detectSnapPointsSupport = function () {
        return WinJS.Promise.timeout(50).then(function () {
            return supportsSnap;
        });
    };

    var pivotWrapperEl;
    this.setUp = function (complete) {
        pivotWrapperEl = document.createElement('div');
        pivotWrapperEl.style.cssText = "width: " + pivotWidth + "px; height: 480px; background-color: #777;"
        document.body.appendChild(pivotWrapperEl);
        if (supportsSnap === null) {
            snapPointsDetectionFunc().done(function (value) {
                supportsSnap = value;
                complete();
            });
        } else {
            complete();
        }
    };

    this.tearDown = function () {
        WinJS.Utilities.disposeSubTree(pivotWrapperEl);
        document.body.removeChild(pivotWrapperEl);
    };

    var instances = 0;
    WinJSTests.PivotTestsFakeControl = WinJS.Class.define(function (element, options) {
        instances++;
    });

    function fireKeyEvent(type, element, key, locale) {
        var event = document.createEvent("Event");
        //KeyboardEvent.initKeyboardEvent(typeArg, canBubbleArg, cancelableArg, viewArg, keyArg, locationArg, modifiersListArg, repeat, locale); 
        event.initEvent(type, true, true);
        event.keyCode = key;
        event.locale = locale || "en-US";
        element.dispatchEvent(event);
    }

    function firePointerEvent(type, element, clientX, clientY, pointerType) {
        //PointerEvent.initPointerEvent(typeArg, canBubbleArg, cancelableArg, viewArg, detailArg, screenXArg, screenYArg, clientXArg, clientYArg, ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg, buttonArg, relatedTargetArg, offsetXArg, offsetYArg, widthArg, heightArg, pressure, rotation, tiltX, tiltY, pointerIdArg, pointerType, hwTimestampArg, isPrimary); 
        var elementRect = element.getBoundingClientRect();
        var event = document.createEvent(pointerName + "Event");
        WinJS.Utilities["_" + initFuncName](event, type, true, true, window, {}, clientX + window.screenLeft, clientY + window.screenTop, clientX, clientY, false, false, false, false, 0, document.querySelector(".win-pivot"), elementRect.width / 2, elementRect.height / 2, 20, 20, 0, 0, 0, 0, 0, pointerType, Date.now(), true);
        if (!window.MSPointerEvent) {
            WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE = pointerType || PT_TOUCH;
        }
        element.dispatchEvent(event);
        if (!window.MSPointerEvent) {
            WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE = PT_MOUSE;
        }
    }

    function simulateTap(element, x, y, pointerType) {
        simulatePointerDown(element, x, y, pointerType);
        simulatePointerUp(element, x, y, pointerType);

        var elementRect = element.getBoundingClientRect();
        var clientX = Math.floor(elementRect.left + x);
        var clientY = Math.floor(elementRect.top + y);

        firePointerEvent("click", element, clientX, clientY, pointerType);
    }

    function simulatePointerDown(element, x, y, pointerType) {
        element.scrollIntoView(false);
        var elementRect = element.getBoundingClientRect();
        var clientX = Math.floor(elementRect.left + x);
        var clientY = Math.floor(elementRect.top + y);

        firePointerEvent("pointerdown", element, clientX, clientY, pointerType);
    }

    function simulatePointerUp(element, x, y, pointerType) {
        element.scrollIntoView(false);
        var elementRect = element.getBoundingClientRect();
        var clientX = Math.floor(elementRect.left + x);
        var clientY = Math.floor(elementRect.top + y);

        firePointerEvent("pointerup", element, clientX, clientY, pointerType);
    }

    function createAndAppendPivotWithItems(count) {
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(count))
        });
        pivotWrapperEl.appendChild(pivot.element);
        return pivot;
    }

    function getPivotItemsProgrammatically(count) {
        // Returns array of Pivot Item Objects (for setting pivot items programatically)
        count = count || 10;
        var pivotItems = [];
        for (var i = 0; i < count; i++) {
            pivotItems.push(getPivotItemProgrammatically(i));
        }
        return pivotItems;
    }

    function getPivotItemProgrammatically(key) {
        // Returns a single Pivot Item Object
        var pivotItemEl = document.createElement('div');
        pivotItemEl.innerHTML = '<div data-win-control="WinJSTests.PivotTestsFakeControl" style="width:100%; height: 100%; background-color: #777;">Content for pivot item ' + key + '<a href="#"> focus anchor </a></div>';
        var pivotItem = new WinJS.UI.PivotItem(pivotItemEl, {
            header: 'Item ' + key,
            key: key
        });
        return pivotItem;
    }

    function getPivotItemsMarkup(count) {
        // Returns markup for a bunch of Pivot Items (for parsing markup tests)
        count = count || 10;
        var markup = '';
        for (var i = 0; i < count; i++) {
            markup += getPivotItemMarkup(i);
        }
        return markup;
    }

    function getPivotItemMarkup(key) {
        // Returns markup for a single Pivot Item
        return '<div data-win-control="WinJS.UI.PivotItem" data-win-options="{ header: \'Item ' + key + '\' }">' +
            '<div data-win-control="WinJSTests.PivotTestsFakeControl" style="width:100%; height: 100%; background-color: #777;">Content for pivot item ' + key + '<a href="#"> focus anchor </a></div>' +
        '</div>';
    }

    function waitForNextItemAnimationEnd(pivot) {
        return new WinJS.Promise(function (c, e, p) {
            pivot.element.addEventListener(WinJS.UI.Pivot._EventName.itemAnimationEnd, test);

            function test() {
                pivot.element.removeEventListener(WinJS.UI.Pivot._EventName.itemAnimationEnd, test);
                c();
            }
        });
    }

    function waitForNextSelectionChanged(pivot) {
        return new WinJS.Promise(function (c, e, p) {
            pivot.element.addEventListener(WinJS.UI.Pivot._EventName.selectionChanged, test);

            function test() {
                pivot.element.removeEventListener(WinJS.UI.Pivot._EventName.selectionChanged, test);
                c();
            }
        });
    }

    function verifyAllHiddenExcept(pivot, index) {
        for (var i = 0; i < pivot.items.length; i++) {
            var item = pivot.items.getAt(i);
            var itemComputedStyle = getComputedStyle(item.element);
            if (index === i) {
                LiveUnit.Assert.areEqual("visible", itemComputedStyle.visibility, "Item should have been visible");
            } else {
                LiveUnit.Assert.areEqual("hidden", itemComputedStyle.visibility, "Item should have been hidden");
            }
        }
    }

    function verifySelectedItem(pivot, index) {
        var pivotItem = pivot.items.getAt(index);
        LiveUnit.Assert.areEqual(index, pivot.selectedIndex, "Correct selectedIndex");
        LiveUnit.Assert.areEqual(pivotItem, pivot.selectedItem);
        LiveUnit.Assert.areEqual(pivotItem.header, pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotHeaderSelected).textContent);
    }

    function monkeyPatch(obj, funcName, callback, callbackThis) {
        var func = obj[funcName];
        obj[funcName] = function () {
            callback.apply(callbackThis, arguments);
            func.apply(obj, arguments);
        };
    }

    this.testLoad = function testLoad(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.areEqual(pivotItemCount, pivot.items.length, "Correct # of items found");
            LiveUnit.Assert.areEqual(1, instances, "Only 1 pivot item loaded");
            LiveUnit.Assert.areEqual(pivotItemCount, pivot.element.querySelectorAll('.' + WinJS.UI.PivotItem._ClassName.pivotItem).length, "Correct Pivot Item dom elements found");
            complete();
        });
    };

    this.testParseLoad = function testParseLoad(complete) {
        var pivotItemCount = 5;
        instances = 0;

        var pivotEl = document.createElement('div');
        var markup = getPivotItemsMarkup(pivotItemCount);
        pivotEl.innerHTML = markup;
        var pivot = new WinJS.UI.Pivot(pivotEl);

        waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.areEqual(pivotItemCount, pivot.items.length, "Correct # of items found");
            LiveUnit.Assert.areEqual(1, instances, "Only 1 pivot item loaded");
            LiveUnit.Assert.areEqual(pivotItemCount, pivot.element.querySelectorAll('.' + WinJS.UI.PivotItem._ClassName.pivotItem).length, "Correct Pivot Item dom elements found");
            complete();
        });
    };

    this.testTitle = function testTitle(complete) {
        var pivot = new WinJS.UI.Pivot(undefined, {
            title: "test"
        });
        pivotWrapperEl.appendChild(pivot.element);

        LiveUnit.Assert.areEqual("test", pivot.title, "Title");
        LiveUnit.Assert.areEqual("test", pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle).textContent, "Title");
        LiveUnit.Assert.areEqual("block", getComputedStyle(pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle)).display, "Title display");

        pivot.title = "test2";
        LiveUnit.Assert.areEqual("test2", pivot.title, "Title");
        LiveUnit.Assert.areEqual("test2", pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle).textContent, "Title");
        LiveUnit.Assert.areEqual("block", getComputedStyle(pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle)).display, "Title display");

        pivot.title = "";
        LiveUnit.Assert.areEqual("", pivot.title, "Title");
        LiveUnit.Assert.areEqual("", pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle).textContent, "Title");
        LiveUnit.Assert.areEqual("none", getComputedStyle(pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle)).display, "Title display");

        pivot = new WinJS.UI.Pivot(undefined, {
            title: ""
        });
        WinJS.Utilities.empty(pivotWrapperEl);
        pivotWrapperEl.appendChild(pivot.element);
        LiveUnit.Assert.areEqual("", pivot.title, "Title");
        LiveUnit.Assert.areEqual("", pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle).textContent, "Title");
        LiveUnit.Assert.areEqual("none", getComputedStyle(pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle)).display, "Title display");
        complete();
    };

    this.testRemovals = function testRemovals(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            selectedIndex: 2,
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });
        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 2);

            // Remove from the front
            pivot.items.shift();

            // Synchronously it renders the headers again and updates the index.
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 1);

            // Remove from the end
            pivot.items.pop();

            // Synchronously it renders the headers again and updates the index.
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 1);

            // Remove the one in view.
            pivot.items.splice(1, 1);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 1);

            // Remove the one in view.
            pivot.items.splice(1, 1);
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 0);

            // Remove the last one.
            pivot.items.pop();
            LiveUnit.Assert.areEqual(-1, pivot.selectedIndex, "Correct selectedIndex");

            complete();
        });
    };

    this.testInserts = function testInserts(complete) {
        var index = 0;

        var pivot = new WinJS.UI.Pivot();
        pivotWrapperEl.appendChild(pivot.element);

        // Timeout to deal with refresh schedule high.
        WinJS.Promise.timeout().then(function () {
            pivot.items.push(getPivotItemProgrammatically(index++));

            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 0);

            // Insert after:
            pivot.items.push(getPivotItemProgrammatically(index++));

            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 0);

            // Insert before:
            pivot.items.unshift(getPivotItemProgrammatically(index++));

            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");
            verifyAllHiddenExcept(pivot, 1);

            complete();
        });
    };

    this.testChange = function testChange(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            selectedIndex: 2,
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            //Change before
            var newPivotItem = getPivotItemProgrammatically("New0");
            pivot.items.setAt(0, newPivotItem);

            LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
            verifyAllHiddenExcept(pivot, 2);

            //Change after
            var newPivotItem = getPivotItemProgrammatically("New3");
            pivot.items.setAt(3, newPivotItem);

            LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
            verifyAllHiddenExcept(pivot, 2);

            //Change current
            var newPivotItem = getPivotItemProgrammatically("New2");
            pivot.items.setAt(2, newPivotItem);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
            LiveUnit.Assert.isTrue(pivot.selectedItem.contentElement.textContent.indexOf("New2") !== -1, "Key not found in contentElement");

            complete();
        }).done();
    };

    this.testSelectedIndex = function testSelectedIndex(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            selectedIndex: 2,
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            verifySelectedItem(pivot, 2);

            pivot.selectedIndex = 1;
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            verifySelectedItem(pivot, 1);

            pivot.selectedIndex = 0;
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            verifySelectedItem(pivot, 0);

            // Set to an invalid index
            pivot.selectedIndex = 100;
            return WinJS.Promise.timeout();
        }).done(function () {
            verifySelectedItem(pivot, 0);

            complete();
        });
    };

    this.testSelectedItem = function testSelectedItem(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            verifySelectedItem(pivot, 0);

            pivot.selectedItem = pivot.items.getAt(2);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            verifySelectedItem(pivot, 2);

            pivot.selectedItem = pivot.items.getAt(1);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            verifySelectedItem(pivot, 1);

            // Remove first pivot control and build a new one
            pivot.element.parentNode.removeChild(pivot.element);
            pivot = new WinJS.UI.Pivot(undefined, {
                items: pivot.items,
                selectedItem: pivot.items.getAt(2)
            });
            pivotWrapperEl.appendChild(pivot.element);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            verifySelectedItem(pivot, 2);

            // Set to an invalid PivotItem
            pivot.selectedItem = new WinJS.UI.PivotItem();
            return WinJS.Promise.timeout();
        }).done(function () {
            verifySelectedItem(pivot, 2);

            complete();
        });
    };

    this.testClickHeader = function testClickHeader(complete, isWideTest) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

            var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[isWideTest ? pivot.selectedIndex + 1 : 2];
            simulateTap(nextItemHeader);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

            var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[isWideTest ? pivot.selectedIndex + 1 : 2];
            simulateTap(nextItemHeader);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

            var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[isWideTest ? pivot.selectedIndex + 1 : 2];
            simulateTap(nextItemHeader);

            return waitForNextItemAnimationEnd(pivot)
        }).done(function () {
            LiveUnit.Assert.areEqual(3, pivot.selectedIndex, "Correct selectedIndex");

            complete();
        });
    };

    this.testLocked = function (complete, isWideTest) {
        function countVisiblePivotItemHeaders(pivot) {
            var visiblePivotItemHeaders = 0;
            var pivotItemHeaders = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader);
            for (var i = 0, len = pivotItemHeaders.length; i < len; i++) {
                var computedStyle = getComputedStyle(pivotItemHeaders[i]);
                if (computedStyle.opacity > 0 && computedStyle.visibility === "visible" && computedStyle.display !== "none") {
                    visiblePivotItemHeaders++;
                }
            }
            return visiblePivotItemHeaders;
        }

        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).
            then(function () {
                var pivotViewportComputedStyle = getComputedStyle(pivot._viewportElement);
                if (supportsSnap) {
                    // When snap points aren't supported, the overflow is always hidden
                    LiveUnit.Assert.areEqual("auto", pivotViewportComputedStyle.overflowX);
                    LiveUnit.Assert.areEqual("hidden", pivotViewportComputedStyle.overflowY);
                }

                // Lock the Pivot
                pivot.locked = true;
                pivotViewportComputedStyle = getComputedStyle(pivot._viewportElement);
                LiveUnit.Assert.areEqual("hidden", pivotViewportComputedStyle.overflowX);
                LiveUnit.Assert.areEqual("hidden", pivotViewportComputedStyle.overflowY);
                LiveUnit.Assert.areEqual(1, countVisiblePivotItemHeaders(pivot), "More than one PivotItem Header was visible");

                var selectedIndex = pivot.selectedIndex;
                simulateTap(pivot.element.querySelectorAll('.win-pivot-header')[2]);
                return WinJS.Promise.timeout().then(function () {
                    return selectedIndex;
                });
            }).
            done(function (selectedIndex) {
                LiveUnit.Assert.areEqual(selectedIndex, pivot.selectedIndex);

                // Unlock the Pivot
                pivot.locked = false;
                var pivotViewportComputedStyle = getComputedStyle(pivot._viewportElement);
                if (supportsSnap) {
                    LiveUnit.Assert.areEqual("auto", pivotViewportComputedStyle.overflowX);
                    LiveUnit.Assert.areEqual("hidden", pivotViewportComputedStyle.overflowY);
                }
                LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 1, countVisiblePivotItemHeaders(pivot), "Not all headers were visible");

                complete();
            });
    };

    this.testHeaderCount = function (complete, isWideTest) {
        var pivotItemCount = 2;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 1, pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader).length);

            // Zoom next
            pivot._goNext();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 1, pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader).length);

            // Zoom prev
            pivot._goPrevious();
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 2, pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader).length);
            complete();
        });
    };

    // WPB: 259987
    this.xtestAriaTree = function (complete) {
        function verifyHeadersAria(pivot) {
            //Verify container for headers
            var pivotHeadersContainer = pivot._headersContainerElement;
            LiveUnit.Assert.areEqual("tablist", pivotHeadersContainer.getAttribute("role"), "Role of headers container");

            //Verify # of headers visible to screen reader:
            var hiddenHeaders = [];
            var visibleHeaders = [];
            var selectedHeaders = [];
            var headerElCollection = pivotHeadersContainer.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader);
            for (var i = 0, len = headerElCollection.length; i < len; i++) {
                var headerEl = headerElCollection[i];
                var isVisible = headerEl.getAttribute("aria-hidden") !== "true";
                var isSelected = headerEl.getAttribute("aria-selected") === "true";

                if (isVisible) {
                    visibleHeaders.push(headerEl);
                } else {
                    hiddenHeaders.push(headerEl);
                }

                if (isSelected) {
                    selectedHeaders.push(headerEl);
                }
            }
            var pivotItemCount = pivot.items.length;
            LiveUnit.Assert.areEqual(pivotItemCount, visibleHeaders.length);
            LiveUnit.Assert.areEqual(1, selectedHeaders.length);
        }

        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);
        waitForNextItemAnimationEnd(pivot).
            then(function () {
                verifyHeadersAria(pivot);

                //Verify viewport
                var viewportElement = pivot._viewportElement;
                LiveUnit.Assert.areEqual("group", viewportElement.getAttribute("role"), "Role of viewport");
                LiveUnit.Assert.isNotNull(viewportElement.getAttribute("aria-label"), "aria-label of viewport");

                //Verify selectedItem
                var selectedItemEl = pivot.selectedItem.element;
                LiveUnit.Assert.areEqual("tabpanel", selectedItemEl.getAttribute("role"), "Role of selected item");

                pivot.element.focus();
                pivot.selectedIndex++;
                return waitForNextItemAnimationEnd(pivot);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(pivot.selectedItem.element.contains(document.activeElement));
                verifyHeadersAria(pivot);

                //Verify selectedItem
                var selectedItemEl = pivot.selectedItem.element;
                LiveUnit.Assert.areEqual("tabpanel", selectedItemEl.getAttribute("role"), "Role of selected item");
            }).
            done(complete);
    };

    this.testFlip = function testFlip(complete) {
        if (!supportsSnap) {
            LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
            complete();
            return;
        }

        if (!WinJS.Utilities._supportsZoomTo) {
            LiveUnit.LoggingCore.logComment("This test relies on ZoomTo APIs which are not supported on this platform.");
            complete();
            return;
        }

        // Use zoomTo
        var pivotItemCount = 3;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

            // Zoom next
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

            // Zoom next
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

            // Zoom next
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

            // Zoom previous
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

            // Zoom previous
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

            // Zoom previous
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

            complete();
        });
    };

    // WPBlue: 272771 Test is not reliable in WebUnit. Should be run using Zeus.
    this.xtestFlipFlip = function testFlipFlip(complete) {
        var pivotItemCount = 3;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        var center = 0;
        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

            center = WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft;
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });

            // Don't wait until the current flip operation completes:
            return WinJS.Promise.timeout();
        }).then(function () {
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

            // Interrupt animation with more panning:
            WinJS.Utilities.setScrollPosition(pivot._viewportElement, { scrollLeft: center + pivot._viewportElement.offsetWidth });
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });

            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

            complete();
        });
    };

    this.testNavigateViaAPI = function testNavigateViaAPI(complete) {
        var pivotItemCount = 3;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextSelectionChanged(pivot).then(function () {
            // Test constructor/refresh
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.api, pivot._navMode);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            // Test selectedIndex
            pivot.selectedIndex = 1;
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.api, pivot._navMode);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

            // Test selectedItem
            pivot.selectedItem = pivot.items.getAt(2);
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.api, pivot._navMode);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
            complete();
        });
    };

    this.testNavigateViaInertia = function testNavigateViaInertia(complete) {
        if (!WinJS.Utilities._supportsZoomTo) {
            LiveUnit.LoggingCore.logComment("This test simulates panning using msZoomTo which is not supported on this platform.");
            complete();
            return;
        }
        if (!supportsSnap) {
            LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
            complete();
            return;
        }
        if (Object.keys(window.MSManipulationEvent.prototype).indexOf("inertiaDestinationX") === -1) {
            LiveUnit.LoggingCore.logComment("This test relies on inertiaDestination APIs which are not supported on this platform.");
            complete();
            return;
        }

        var pivotItemCount = 3;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            // Pan right
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextSelectionChanged(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.inertia, pivot._navMode);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

            // Pan left
            pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextSelectionChanged(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.inertia, pivot._navMode);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            complete();
        });
    };

    this.testNavigateViaScroll = function testNavigateViaScroll(complete) {
        if (!supportsSnap) {
            LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
            complete();
            return;
        }
        var pivotItemCount = 3;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            // Scroll right
            WinJS.Utilities.setScrollPosition(pivot._viewportElement, { scrollLeft: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + 50 });
            return waitForNextSelectionChanged(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.scroll, pivot._navMode);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

            // Pan left
            WinJS.Utilities.setScrollPosition(pivot._viewportElement, { scrollLeft: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - 50 });
            return waitForNextSelectionChanged(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.scroll, pivot._navMode);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            complete();
        });
    };

    this.runContentVisibilityTest = function (complete, rtl) {
        var pivotItemCount = 3;
        instances = 0;
        var pivotDiv = document.createElement("div");
        pivotDiv.dir = rtl ? "rtl" : "";
        var pivot = new WinJS.UI.Pivot(pivotDiv, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        var width = 0;
        var left = 0;
        var right = 0;
        function isInViewport(e) {
            var eLeft = rtl ? width - e.offsetLeft - e.offsetWidth : e.offsetLeft;
            return left <= eLeft && right > eLeft;
        }

        waitForNextItemAnimationEnd(pivot).then(function () {
            width = pivot._viewportElement.scrollWidth;
            left = WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft;
            right = left + pivot._viewportElement.offsetWidth;

            // Test first item
            LiveUnit.Assert.isTrue(isInViewport(pivot.selectedItem.element));

            pivot._goNext();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            // Test second item
            LiveUnit.Assert.isTrue(isInViewport(pivot.selectedItem.element));
            pivot._goNext();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            // Test third item
            LiveUnit.Assert.isTrue(isInViewport(pivot.selectedItem.element));
            pivot._goNext();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            // Test wrapping around to first item
            LiveUnit.Assert.isTrue(isInViewport(pivot.selectedItem.element));
            pivot._goPrevious();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            // Test wrapping around to last item
            LiveUnit.Assert.isTrue(isInViewport(pivot.selectedItem.element));
            pivot._goPrevious();
            complete();
        });
    };

    this.testContentVisibleInLTR = function testContentVisibleInRTL(complete) {
        this.runContentVisibilityTest(complete, false);
    };

    this.testContentVisibleInRTL = function testContentVisibleInRTL(complete) {
        this.runContentVisibilityTest(complete, true);
    };

    this.testEmptyPivotRecentersCorrectly = function (complete) {
        if (!supportsSnap) {
            LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
            complete();
            return;
        }

        var pivotDiv = document.createElement("div");
        var pivot = new WinJS.UI.Pivot(pivotDiv);
        pivotWrapperEl.appendChild(pivot.element);
        setTimeout(function () {
            LiveUnit.Assert.areNotEqual(0, pivot._viewportWidth);
            LiveUnit.Assert.areEqual(WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft, pivot._currentScrollTargetLocation);
            complete();
        });
    };

    this.testClickHeadersFastDoesNotCauseUnexpectedNavigation = function testClickHeadersFastDoesNotCauseUnexpectedNavigation(complete, isWideTest) {
        var pivot = createAndAppendPivotWithItems(5);
        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            var headers = document.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader);
            headers[isWideTest ? 1 : 2].click();
            headers[isWideTest ? 2 : 3].click();
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
            complete();
        });
    };

    this.runHeaderTrackSwipeNavigation = function runHeaderTrackSwipeNavigation(complete, rtl) {
        var itemCount = 3;
        var pivot = createAndAppendPivotWithItems(itemCount);

        if (!pivot.element.classList.contains(WinJS.UI.Pivot._ClassName.pivotNoSnap)) {
            LiveUnit.LoggingCore.logComment("Header swipe gesture detection only supported in no-snap mode.");
            complete();
            return;
        }

        if (rtl) {
            pivot.element.style.direction = "rtl";
        }

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            simulatePointerDown(pivot._headersContainerElement, 100, 10, PT_TOUCH);
            return WinJS.Promise.timeout();
        }).then(function () {
            simulatePointerUp(pivot._headersContainerElement, 10, 30, PT_TOUCH);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? (itemCount - 1) : 1), pivot.selectedIndex);

            simulatePointerDown(pivot._headersContainerElement, 100, 30, PT_TOUCH);
            return WinJS.Promise.timeout();
        }).then(function () {
            simulatePointerUp(pivot._headersContainerElement, 200, 10, PT_TOUCH);
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            complete();
        });
    };

    this.testHeaderTrackSwipeNavigationLTR = function testHeaderTrackSwipeNavigationLTR(complete) {
        this.runHeaderTrackSwipeNavigation(complete, false);
    };

    this.testHeaderTrackSwipeNavigationRTL = function testHeaderTrackSwipeNavigationRTL(complete) {
        this.runHeaderTrackSwipeNavigation(complete, true);
    };

    this.testHeaderTrackSwipeNavigationWhileLocked = function testHeaderTrackSwipeNavigationWhileLocked(complete) {
        var pivot = createAndAppendPivotWithItems(3);
        pivot.locked = true;

        if (!pivot.element.classList.contains(WinJS.UI.Pivot._ClassName.pivotNoSnap)) {
            LiveUnit.LoggingCore.logComment("Header swipe gesture detection only supported in no-snap mode.");
            complete();
            return;
        }

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            simulatePointerDown(pivot._headersContainerElement, 100, 10, PT_TOUCH);
            return WinJS.Promise.timeout();
        }).done(function () {
            monkeyPatch(pivot, "_loadItem", function () {
                LiveUnit.Assert.fail();
            });

            simulatePointerUp(pivot._headersContainerElement, 10, 30, PT_TOUCH);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            complete();
        });
    };

    this.testMaxHeaderWidth = function testMaxHeaderWidth(complete) {
        var pivotItem1 = new WinJS.UI.PivotItem(null, {
            header: "Very very very very very very long pivot item header text blah"
        });
        var pivotItem2 = new WinJS.UI.PivotItem(null, {
            header: "Item 1"
        });
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List([pivotItem1, pivotItem2])
        });
        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).done(function () {
            var headers = document.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader);
            var longHeader = headers[1];
            LiveUnit.Assert.areEqual(parseInt(pivotWidth * 0.8), parseInt(longHeader.style.maxWidth));
            complete();
        });
    };
    this.testMaxHeaderWidth.skipWideTest = true;

    this.runNavButtons = function runNavButtons(complete, rtl) {
        var itemCount = 5;
        var pivot = createAndAppendPivotWithItems(itemCount);

        if (rtl) {
            pivot.element.style.direction = "rtl";
        }

        var leftButton = null;
        var rightButton = null;
        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            leftButton = document.querySelector("." + WinJS.UI.Pivot._ClassName.pivotNavButtonPrev);
            rightButton = document.querySelector("." + WinJS.UI.Pivot._ClassName.pivotNavButtonNext);

            leftButton.click();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? 1 : (itemCount - 1)), pivot.selectedIndex);

            rightButton.click();
            rightButton.click();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? (itemCount - 1) : 1), pivot.selectedIndex);
            complete();
        });
    };

    this.testNavButtonsLTR = function testNavButtonsLTR(complete) {
        this.runNavButtons(complete, false);
    };
    this.testNavButtonsLTR.skipWideTest = true;

    this.testNavButtonsRTL = function testNavButtonsRTL(complete) {
        this.runNavButtons(complete, true);
    };
    this.testNavButtonsRTL.skipWideTest = true;

    this.testNavButtonsWhileLocked = function testNavButtonsWhileLocked(complete) {
        var pivot = createAndAppendPivotWithItems(5);
        pivot.locked = true;

        return waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            monkeyPatch(pivot, "_loadItem", function (index) {
                LiveUnit.Assert.fail();
            });

            document.querySelector("." + WinJS.UI.Pivot._ClassName.pivotNavButtonPrev).click();
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            complete();
        });
    };
    this.testNavButtonsWhileLocked.skipWideTest = true;

    this.testShowHideNavButtonsMouse = function testShowHideNavButtonsMouse(complete) {
        var pivot = createAndAppendPivotWithItems(5);

        return waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_MOUSE);
            LiveUnit.Assert.isTrue(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            firePointerEvent("pointerout", pivot._headersContainerElement, 0, 0, PT_MOUSE);
            LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            complete();
        });
    };
    this.testShowHideNavButtonsMouse.skipWideTest = true;

    this.testShowNavButtonsTouch = function testShowHideNavButtonsTouch(complete) {
        var pivot = createAndAppendPivotWithItems(5);

        return waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_TOUCH);
            LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            complete();
        });
    };
    this.testShowNavButtonsTouch.skipWideTest = true;

    this.testNoNavButtonsWithOnePivotItem = function testShowHideNavButtonsTouch(complete) {
        var pivot = createAndAppendPivotWithItems(1);

        return waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotNavButton).length);
            complete();
        });
    };
    this.testNoNavButtonsWithOnePivotItem.skipWideTest = true;

    this.testShowNavButtonsWhileLocked = function testShowNavButtonsWhileLocked(complete) {
        var pivot = createAndAppendPivotWithItems(5);
        pivot.locked = true;

        return waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_MOUSE);
            LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            complete();
        });
    };
    this.testShowNavButtonsWhileLocked.skipWideTest = true;

    this.testNavButtonsPosition = function testNavButtonsPosition(complete) {
        var pivot = createAndAppendPivotWithItems(5);

        return waitForNextItemAnimationEnd(pivot).done(function () {
            firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_MOUSE);
            LiveUnit.Assert.isTrue(pivot._headersContainerElement.classList.contains(WinJS.UI.Pivot._ClassName.pivotShowNavButtons));

            var leftButton = document.elementFromPoint(pivot.element.offsetLeft + 10, pivot.element.offsetTop + 50);
            LiveUnit.Assert.isTrue(leftButton.classList.contains(WinJS.UI.Pivot._ClassName.pivotNavButtonPrev));

            var rightButton = document.elementFromPoint(pivot.element.offsetLeft + pivot.element.offsetWidth - 10, pivot.element.offsetTop + 50);
            LiveUnit.Assert.isTrue(rightButton.classList.contains(WinJS.UI.Pivot._ClassName.pivotNavButtonNext));

            complete();
        });
    };
    this.testNavButtonsPosition.skipWideTest = true;

    this.runKeyboardHeaderToHeader = function runKeyboardHeaderToHeader(complete, rtl) {
        var itemCount = 5;
        var pivot = createAndAppendPivotWithItems(itemCount);

        if (rtl) {
            pivot.element.style.direction = "rtl";
        }

        return waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            pivot._headersContainerElement.children[1].focus();

            fireKeyEvent("keydown", pivot._headersContainerElement, Keys.leftArrow);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? 1 : (itemCount - 1)), pivot.selectedIndex);

            fireKeyEvent("keydown", pivot._headersContainerElement, Keys.pageUp);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? 2 : (itemCount - 2)), pivot.selectedIndex);

            fireKeyEvent("keydown", pivot._headersContainerElement, Keys.rightArrow);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? 1 : (itemCount - 1)), pivot.selectedIndex);

            fireKeyEvent("keydown", pivot._headersContainerElement, Keys.pageDown);
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            complete();
        });
    };

    this.testKeyboardHeaderToHeaderLTR = function testKeyboardHeaderToHeaderLTR(complete) {
        this.runKeyboardHeaderToHeader(complete, false);
    };

    this.testKeyboardHeaderToHeaderRTL = function testKeyboardHeaderToHeaderRTL(complete) {
        this.runKeyboardHeaderToHeader(complete, true);
    };

    this.testKeyboardHeaderToHeaderWhileLocked = function testKeyboardHeaderToHeaderWhileLocked(complete) {
        var pivot = createAndAppendPivotWithItems(5);
        pivot.locked = true;

        return waitForNextItemAnimationEnd(pivot).done(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            pivot._headersContainerElement.children[1].focus();

            monkeyPatch(pivot, "_loadItem", function () {
                LiveUnit.Assert.fail();
            });

            fireKeyEvent("keydown", pivot._headersContainerElement, Keys.leftArrow);
            fireKeyEvent("keydown", pivot._headersContainerElement, Keys.pageUp);
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            complete();
        });
    };

    this.testHeaderPosition = function testHeaderPosition(complete, isWideTest) {
        var pivot = createAndAppendPivotWithItems(5);
        pivot.selectedIndex = 3;

        waitForNextItemAnimationEnd(pivot).done(function () {
            var item = pivot.items.getAt(pivot.selectedIndex);
            var headerContainer = pivot.element.querySelector(".win-pivot-header").parentElement;
            LiveUnit.Assert.areEqual(item.header, headerContainer.children[isWideTest ? pivot.selectedIndex : 1].textContent);
            complete();
        });
    };

    this.testHeadersStateTransition = function testHeadersStateTransition(complete) {
        var pivot = createAndAppendPivotWithItems(5);
        pivot.selectedIndex = 2;

        var item = pivot.items.getAt(pivot.selectedIndex);

        waitForNextItemAnimationEnd(pivot).then(function () {
            // We should be in overflow mode, so the selected header should always be at index 1
            var headerContainer = pivot.element.querySelector(".win-pivot-header").parentElement;

            LiveUnit.Assert.areEqual(item.header, headerContainer.children[1].textContent);

            // Resize to static mode
            pivot.element.parentElement.style.width = "10000px";
            pivot.forceLayout();
            return pivot._headersState._transitionAnimation;
        }).then(function () {
            // We should be in static mode, so the selected header should appear in order
            var headerContainer = pivot.element.querySelector(".win-pivot-header").parentElement;

            LiveUnit.Assert.areEqual(item.header, headerContainer.children[pivot.selectedIndex].textContent);

            // Resize back to overflow mode
            pivot.element.parentElement.style.width = pivotWidth + "px";
            pivot.forceLayout();
            return pivot._headersState._transitionAnimation;
        }).done(function () {
            // We should be back in overflow mode, so the selected header should always be at index 1
            var headerContainer = pivot.element.querySelector(".win-pivot-header").parentElement;

            LiveUnit.Assert.areEqual(item.header, headerContainer.children[1].textContent);
            complete();
        });
    };
    this.testHeadersStateTransition.skipWideTest = true;

    this.testChangePivotItemCountFrom1To2BackTo1 = function (complete, isWideTest) {
        var pivot = createAndAppendPivotWithItems(1);
        pivot.items.getAt(0).header = "The header must be long in order for a single pivot item to put the pivot into overflow headers state.";

        waitForNextItemAnimationEnd(pivot).then(function () {
            // Check that the pivot was initialized with viewport overflow hidden since we only have 1 item
            LiveUnit.Assert.areEqual("hidden", pivot._viewportElement.style.overflow);

            // Adding an item should clear the overflow state which goes down a very specific codepath that
            // is only hit when adding items to the pivot with the initial count === 1
            pivot.items.push(new WinJS.UI.PivotItem(null, { header: "new header" }));
            LiveUnit.Assert.areEqual("", pivot._viewportElement.style.overflow);

            // Reducing the item count back down to 1 should restore overflow hidden style
            pivot.items.splice(1, 1);
            LiveUnit.Assert.areEqual("hidden", pivot._viewportElement.style.overflow);

            complete();
        });
    };

    this.testAnimationDirectionInStaticMode = function (complete) {
        pivotWrapperEl.style.width = "10000px";
        var pivot = createAndAppendPivotWithItems(5);

        var goPreviousExpected = false;
        var headers;
        waitForNextItemAnimationEnd(pivot).then(function () {
            monkeyPatch(pivot._headersState, "handleNavigation", function (goPrevious, index, oldIndex) {
                LiveUnit.Assert.areEqual(goPreviousExpected, goPrevious);
            });

            headers = document.querySelectorAll(".win-pivot-header");
            headers[1].click();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            goPreviousExpected = true;
            headers[0].click();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            goPreviousExpected = false;
            headers[4].click();
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            goPreviousExpected = true;
            headers[0].click();
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            complete();
        });
    };
    this.testAnimationDirectionInStaticMode.skipWideTest = true;

    var that = this;
    Object.keys(this).forEach(function (key) {
        if (key.indexOf("test") !== 0) {
            return;
        }

        var origTestFunc = that[key];
        if (origTestFunc.skipWideTest) {
            return;
        }

        that[key + "_Wide"] = function (complete) {
            pivotWrapperEl.style.width = "10000px";
            origTestFunc.call(this, complete, true);
        };
    });
};

if (WinJS.UI.Pivot) {
    LiveUnit.registerTestClass("WinJSTests.PivotTests");
}
