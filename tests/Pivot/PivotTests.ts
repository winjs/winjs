// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module WinJSTests {

    "use strict";

    var Pivot = <typeof WinJS.UI.PrivatePivot>WinJS.UI.Pivot;
    var PivotItem = <typeof WinJS.UI.PrivatePivotItem>WinJS.UI.PivotItem;

    var Keys = WinJS.Utilities.Key;
    var PT_MOUSE = WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE || "mouse";
    var PT_TOUCH = WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
    var pivotWidth = 320;

    var pointerName = "Mouse";
    var initFuncName = "initMouseEvent";
    if (window['PointerEvent']) {
        pointerName = "Pointer";
        initFuncName = "initPointerEvent";
    } else if (window['MSPointerEvent']) {
        pointerName = "MSPointer";
        initFuncName = "initPointerEvent";
    }

    var supportsSnap = !!(WinJS.Utilities._supportsSnapPoints && HTMLElement.prototype.msZoomTo);

    var pivotWrapperEl;

    var instances = 0;
    export class PivotTestsFakeControl {
        constructor(element, options) {
            instances++;
        }
        static supportedForProcessing = true;
    }

    function fireKeyEvent(type, element, key, locale?) {
        var event: any = document.createEvent("Event");
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
        if (!window['MSPointerEvent']) {
            WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE = pointerType || PT_TOUCH;
        }
        element.dispatchEvent(event);
        if (!window['MSPointerEvent']) {
            WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE = PT_MOUSE;
        }
    }

    function simulateTap(element, x = 0, y = 0, pointerType = "mouse") {
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
        var pivot = new Pivot(undefined, {
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
        var pivotItem = new PivotItem(pivotItemEl, {
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
            pivot.element.addEventListener(Pivot._EventNames.itemAnimationEnd, test);

            function test() {
                pivot.element.removeEventListener(Pivot._EventNames.itemAnimationEnd, test);
                c();
            }
        });
    }

    function waitForNextSelectionChanged(pivot) {
        return new WinJS.Promise(function (c, e, p) {
            pivot.element.addEventListener(Pivot._EventNames.selectionChanged, test);

            function test() {
                pivot.element.removeEventListener(Pivot._EventNames.selectionChanged, test);
                c();
            }
        });
    }

    function verifyAllHiddenExcept(pivot, index) {
        for (var i = 0; i < pivot.items.length; i++) {
            var item = pivot.items.getAt(i);
            var itemComputedStyle = getComputedStyle(item.element);
            if (index === i) {
                LiveUnit.Assert.areNotEqual("none", itemComputedStyle.display, "Item should have been visible");
            } else {
                LiveUnit.Assert.areEqual("none", itemComputedStyle.display, "Item should have been hidden");
            }
        }
    }

    function verifySelectedItem(pivot, index) {
        var pivotItem = pivot.items.getAt(index);
        LiveUnit.Assert.areEqual(index, pivot.selectedIndex, "Correct selectedIndex");
        LiveUnit.Assert.areEqual(pivotItem, pivot.selectedItem);
        LiveUnit.Assert.areEqual(pivotItem.header, pivot.element.querySelector("." + Pivot._ClassNames.pivotHeaderSelected).textContent);
    }

    function monkeyPatch(obj, funcName, callback, callbackThis?) {
        var func = obj[funcName];
        obj[funcName] = function () {
            callback.apply(callbackThis, arguments);
            func.apply(obj, arguments);
        };
    }

    function runContentVisibilityTest(complete, rtl) {
        var pivotItemCount = 5;
        instances = 0;
        var pivotDiv = document.createElement("div");
        pivotDiv.dir = rtl ? "rtl" : "";
        var pivot = new Pivot(pivotDiv, {
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

    function runKeyboardHeaderToHeader(complete, rtl) {
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

    function runHeaderTrackSwipeNavigation(complete, rtl) {
        var itemCount = 5;
        var pivot = createAndAppendPivotWithItems(itemCount);

        if (!pivot.element.classList.contains(Pivot._ClassNames.pivotNoSnap)) {
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

    function runContentSwipeNavigation(complete, rtl) {
        var itemCount = 5;
        var pivot = createAndAppendPivotWithItems(itemCount);

        if (!pivot.element.classList.contains(Pivot._ClassNames.pivotNoSnap)) {
            LiveUnit.LoggingCore.logComment("Header swipe gesture detection only supported in no-snap mode.");
            complete();
            return;
        }

        if (rtl) {
            pivot.element.style.direction = "rtl";
        }

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            simulatePointerDown(pivot.element, 100, 10, PT_TOUCH);
            return WinJS.Promise.timeout();
        }).then(function () {
            simulatePointerUp(pivot.element, 10, 30, PT_TOUCH);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual((rtl ? (itemCount - 1) : 1), pivot.selectedIndex);

            simulatePointerDown(pivot.element, 100, 30, PT_TOUCH);
            return WinJS.Promise.timeout();
        }).then(function () {
            simulatePointerUp(pivot.element, 200, 10, PT_TOUCH);
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            // Now set the opt-out class on pivot and navigation should no longer occur
            pivot.element.classList.add("win-pivot-disablecontentswipenavigation");
            simulatePointerDown(pivot.element, 100, 10, PT_TOUCH);
            return WinJS.Promise.timeout();
        }).then(function () {
            pivot._headersState.handleNavigation = function () {
                LiveUnit.Assert.fail("Navigation should not occur with content swipe disabled.");
            };

            simulatePointerUp(pivot.element, 10, 30, PT_TOUCH);
            return WinJS.Promise.timeout(100);
        }).done(function () {
            complete();
        });
    };

    function runNavButtons(complete, rtl) {
        var itemCount = 5;
        var pivot = createAndAppendPivotWithItems(itemCount);

        if (rtl) {
            pivot.element.style.direction = "rtl";
        }

        var leftButton = null;
        var rightButton = null;
        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

            leftButton = document.querySelector("." + Pivot._ClassNames.pivotNavButtonPrev);
            rightButton = document.querySelector("." + Pivot._ClassNames.pivotNavButtonNext);

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

    function skipWide(test) {
        test.skipWideTest = true;
        return test;
    }

    export class PivotTests {



        setUp() {
            pivotWrapperEl = document.createElement('div');
            pivotWrapperEl.style.cssText = "width: " + pivotWidth + "px; height: 480px; background-color: #777;";
            document.body.appendChild(pivotWrapperEl);
        }

        tearDown() {
            WinJS.Utilities.disposeSubTree(pivotWrapperEl);
            document.body.removeChild(pivotWrapperEl);
        }
        
        testLoad = function testLoad(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
            });

            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.areEqual(pivotItemCount, pivot.items.length, "Correct # of items found");
                LiveUnit.Assert.areEqual(1, instances, "Only 1 pivot item loaded");
                LiveUnit.Assert.areEqual(pivotItemCount, pivot.element.querySelectorAll('.' + PivotItem._ClassName.pivotItem).length, "Correct Pivot Item dom elements found");
                complete();
            });
        };

        testParseLoad = function testParseLoad(complete) {
            var pivotItemCount = 5;
            instances = 0;

            var pivotEl = document.createElement('div');
            var markup = getPivotItemsMarkup(pivotItemCount);
            pivotEl.innerHTML = markup;
            var pivot = new Pivot(pivotEl);

            waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.areEqual(pivotItemCount, pivot.items.length, "Correct # of items found");
                LiveUnit.Assert.areEqual(1, instances, "Only 1 pivot item loaded");
                LiveUnit.Assert.areEqual(pivotItemCount, pivot.element.querySelectorAll('.' + PivotItem._ClassName.pivotItem).length, "Correct Pivot Item dom elements found");
                complete();
            });
        };

        testTitle = skipWide(function testTitle(complete) {
            var pivot = new Pivot(undefined, {
                title: "test"
            });
            pivotWrapperEl.appendChild(pivot.element);

            LiveUnit.Assert.areEqual("test", pivot.title, "Title");
            LiveUnit.Assert.areEqual("test", pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle).textContent, "Title");
            LiveUnit.Assert.areEqual("block", getComputedStyle(pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle)).display, "Title display");

            pivot.title = "test2";
            LiveUnit.Assert.areEqual("test2", pivot.title, "Title");
            LiveUnit.Assert.areEqual("test2", pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle).textContent, "Title");
            LiveUnit.Assert.areEqual("block", getComputedStyle(pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle)).display, "Title display");

            pivot.title = "";
            LiveUnit.Assert.areEqual("", pivot.title, "Title");
            LiveUnit.Assert.areEqual("", pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle).textContent, "Title");
            LiveUnit.Assert.areEqual("none", getComputedStyle(pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle)).display, "Title display");

            pivot = new Pivot(undefined, {
                title: ""
            });
            WinJS.Utilities.empty(pivotWrapperEl);
            pivotWrapperEl.appendChild(pivot.element);
            LiveUnit.Assert.areEqual("", pivot.title, "Title");
            LiveUnit.Assert.areEqual("", pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle).textContent, "Title");
            LiveUnit.Assert.areEqual("none", getComputedStyle(pivot.element.querySelector("." + Pivot._ClassNames.pivotTitle)).display, "Title display");
            complete();
        });

        testRemovals = function testRemovals(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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

        testInserts = function testInserts(complete) {
            var index = 0;

            var pivot = new Pivot();
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

        testChange = function testChange(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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

        testSelectedIndex = function testSelectedIndex(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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

        testSelectedItem = function testSelectedItem(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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
                pivot = new Pivot(undefined, {
                    items: pivot.items,
                    selectedItem: pivot.items.getAt(2)
                });
                pivotWrapperEl.appendChild(pivot.element);

                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                verifySelectedItem(pivot, 2);

                // Set to an invalid PivotItem
                pivot.selectedItem = new PivotItem();
                return WinJS.Promise.timeout();
            }).done(function () {
                verifySelectedItem(pivot, 2);

                complete();
            });
        };

        testClickHeader = function testClickHeader(complete, isWideTest) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
            });

            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

                var nextItemHeader = pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader)[isWideTest ? pivot.selectedIndex + 1 : 2];
                simulateTap(nextItemHeader);

                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

                var nextItemHeader = pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader)[isWideTest ? pivot.selectedIndex + 1 : 2];
                simulateTap(nextItemHeader);

                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

                var nextItemHeader = pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader)[isWideTest ? pivot.selectedIndex + 1 : 2];
                simulateTap(nextItemHeader);

                return waitForNextItemAnimationEnd(pivot)
            }).done(function () {
                LiveUnit.Assert.areEqual(3, pivot.selectedIndex, "Correct selectedIndex");

                complete();
            });
        };

        testLocked = function (complete, isWideTest) {
            function countVisiblePivotItemHeaders(pivot) {
                var visiblePivotItemHeaders = 0;
                var pivotItemHeaders = pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader);
                for (var i = 0, len = pivotItemHeaders.length; i < len; i++) {
                    var computedStyle = getComputedStyle(pivotItemHeaders[i]);
                    if (parseFloat(computedStyle.opacity) > 0 && computedStyle.visibility === "visible" && computedStyle.display !== "none") {
                        visiblePivotItemHeaders++;
                    }
                }
                return visiblePivotItemHeaders;
            }

            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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

        testHeaderCount = function (complete, isWideTest) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
            });

            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).then(function () {
                LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 1, pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader).length);

                // Zoom next
                pivot._goNext();
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 1, pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader).length);

                // Zoom prev
                pivot._goPrevious();
                return waitForNextItemAnimationEnd(pivot);
            }).done(function () {
                LiveUnit.Assert.areEqual(isWideTest ? pivotItemCount : pivotItemCount + 2, pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotHeader).length);
                complete();
            });
        };

        // WPB: 259987
        xtestAriaTree = function (complete) {
            function verifyHeadersAria(pivot) {
                //Verify container for headers
                var pivotHeadersContainer = pivot._headersContainerElement;
                LiveUnit.Assert.areEqual("tablist", pivotHeadersContainer.getAttribute("role"), "Role of headers container");

                //Verify # of headers visible to screen reader:
                var hiddenHeaders = [];
                var visibleHeaders = [];
                var selectedHeaders = [];
                var headerElCollection = pivotHeadersContainer.querySelectorAll("." + Pivot._ClassNames.pivotHeader);
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
            var pivot = new Pivot(undefined, {
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
                LiveUnit.Assert.isTrue(pivot.selectedItem.element.contains(<HTMLElement>document.activeElement));
                verifyHeadersAria(pivot);

                //Verify selectedItem
                var selectedItemEl = pivot.selectedItem.element;
                LiveUnit.Assert.areEqual("tabpanel", selectedItemEl.getAttribute("role"), "Role of selected item");
            }).
                done(complete);
        };

        testFlip = function testFlip(complete) {
            if (!supportsSnap) {
                LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
                complete();
                return;
            }

            // Use zoomTo
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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
                LiveUnit.Assert.areEqual(3, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom next
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(4, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom next
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom previous
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(4, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom previous
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).done(function () {
                LiveUnit.Assert.areEqual(3, pivot.selectedIndex, "Correct selectedIndex");

                complete();
            });
        };

        // WPBlue: 272771 Test is not reliable in WebUnit. Should be run using Zeus.
        xtestFlipFlip = function testFlipFlip(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
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
                WinJS.Utilities.setScrollPosition(pivot._viewportElement, { scrollLeft: center + pivot._viewportElement.offsetWidth, scrollTop: 0 });
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });

                return waitForNextItemAnimationEnd(pivot);
            }).done(function () {
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

                complete();
            });
        };

        testNavigateViaAPI = function testNavigateViaAPI(complete) {
            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
            });

            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

                // Test selectedIndex
                pivot.selectedIndex = 1;
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

                // Test selectedItem
                pivot.selectedItem = pivot.items.getAt(2);
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
                complete();
            });
        };

        testNavigateViaInertia = function testNavigateViaInertia(complete) {
            if (!supportsSnap) {
                LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
                complete();
                return;
            }
            if (Object.keys(window['MSManipulationEvent'].prototype).indexOf("inertiaDestinationX") === -1) {
                LiveUnit.LoggingCore.logComment("This test relies on inertiaDestination APIs which are not supported on this platform.");
                complete();
                return;
            }

            var pivotItemCount = 5;
            instances = 0;
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
            });

            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

                // Pan right
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

                // Pan left
                pivot._viewportElement.msZoomTo({ contentX: WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                complete();
            });
        };

        testContentVisibleInLTR = function testContentVisibleInRTL(complete) {
            runContentVisibilityTest(complete, false);
        };

        testContentVisibleInRTL = function testContentVisibleInRTL(complete) {
            runContentVisibilityTest(complete, true);
        };

        testEmptyPivotRecentersCorrectly = function (complete) {
            if (!supportsSnap) {
                LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
                complete();
                return;
            }

            var pivotDiv = document.createElement("div");
            var pivot = new Pivot(pivotDiv);
            pivotWrapperEl.appendChild(pivot.element);
            setTimeout(function () {
                LiveUnit.Assert.areNotEqual(0, pivot._getViewportWidth());
                LiveUnit.Assert.areEqual(WinJS.Utilities.getScrollPosition(pivot._viewportElement).scrollLeft, pivot._getViewportWidth());
                complete();
            });
        };

        testClickHeadersFastDoesNotCauseUnexpectedNavigation = function testClickHeadersFastDoesNotCauseUnexpectedNavigation(complete, isWideTest) {
            var pivot = createAndAppendPivotWithItems(5);
            waitForNextItemAnimationEnd(pivot).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                var headers: any = document.querySelectorAll("." + Pivot._ClassNames.pivotHeader);
                headers[isWideTest ? 1 : 2].click();
                headers[isWideTest ? 2 : 3].click();
                return waitForNextItemAnimationEnd(pivot);
            }).done(function () {
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
                complete();
            });
        };



        testHeaderTrackSwipeNavigationLTR = function testHeaderTrackSwipeNavigationLTR(complete) {
            runHeaderTrackSwipeNavigation(complete, false);
        };

        testHeaderTrackSwipeNavigationRTL = function testHeaderTrackSwipeNavigationRTL(complete) {
            runHeaderTrackSwipeNavigation(complete, true);
        };


        testContentSwipeNavigationLTR = function testContentSwipeNavigationLTR(complete) {
            runContentSwipeNavigation(complete, false);
        };

        testContentSwipeNavigationRTL = function testContentSwipeNavigationRTL(complete) {
            runContentSwipeNavigation(complete, true);
        };

        testHeaderTrackSwipeNavigationWhileLocked = function testHeaderTrackSwipeNavigationWhileLocked(complete) {
            var pivot = createAndAppendPivotWithItems(3);
            pivot.locked = true;

            if (!pivot.element.classList.contains(Pivot._ClassNames.pivotNoSnap)) {
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
                    LiveUnit.Assert.fail("shouldn't happen");
                });

                simulatePointerUp(pivot._headersContainerElement, 10, 30, PT_TOUCH);
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                complete();
            });
        };

        testMaxHeaderWidth = skipWide(function testMaxHeaderWidth(complete) {
            var pivotItem1 = new PivotItem(null, {
                header: "Very very very very very very long pivot item header text blah"
            });
            var pivotItem2 = new PivotItem(null, {
                header: "Item 1"
            });
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List([pivotItem1, pivotItem2])
            });
            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).done(function () {
                var headers = document.querySelectorAll("." + Pivot._ClassNames.pivotHeader);
                var longHeader = <HTMLElement>headers[1];
                var width = parseInt(getComputedStyle(pivot._headerItemsElement).width);
                LiveUnit.Assert.areEqual(Math.floor(width * 0.8), parseInt(longHeader.style.width));
                complete();
            });
        });



        testNavButtonsLTR = skipWide(function testNavButtonsLTR(complete) {
            runNavButtons(complete, false);
        });

        testNavButtonsRTL = skipWide(function testNavButtonsRTL(complete) {
            runNavButtons(complete, true);
        });


        testNavButtonsWhileLocked = skipWide(function testNavButtonsWhileLocked(complete) {
            var pivot = createAndAppendPivotWithItems(5);
            pivot.locked = true;

            return waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

                monkeyPatch(pivot, "_loadItem", function (index) {
                    LiveUnit.Assert.fail("shouldn't happen");
                });

                (<HTMLElement>document.querySelector("." + Pivot._ClassNames.pivotNavButtonPrev)).click();
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                complete();
            });
        });

        testShowHideNavButtonsMouse = skipWide(function testShowHideNavButtonsMouse(complete) {
            var pivot = createAndAppendPivotWithItems(5);

            return waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_MOUSE);
                LiveUnit.Assert.isTrue(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                firePointerEvent("pointerout", pivot._headersContainerElement, 0, 0, PT_MOUSE);
                LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                complete();
            });
        });

        testShowNavButtonsTouch = skipWide(function testShowHideNavButtonsTouch(complete) {
            var pivot = createAndAppendPivotWithItems(5);

            return waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_TOUCH);
                LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                complete();
            });
        });

        testNoNavButtonsWithOnePivotItem = skipWide(function testShowHideNavButtonsTouch(complete) {
            var pivot = createAndAppendPivotWithItems(1);

            return waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.areEqual(0, pivot.element.querySelectorAll("." + Pivot._ClassNames.pivotNavButton).length);
                complete();
            });
        });

        testShowNavButtonsWhileLocked = skipWide(function testShowNavButtonsWhileLocked(complete) {
            var pivot = createAndAppendPivotWithItems(5);
            pivot.locked = true;

            return waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_MOUSE);
                LiveUnit.Assert.isFalse(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                complete();
            });
        });

        testNavButtonsPosition = skipWide(function testNavButtonsPosition(complete) {
            var pivot = createAndAppendPivotWithItems(5);

            return waitForNextItemAnimationEnd(pivot).done(function () {
                firePointerEvent("pointerenter", pivot._headersContainerElement, 0, 0, PT_MOUSE);
                LiveUnit.Assert.isTrue(pivot._headersContainerElement.classList.contains(Pivot._ClassNames.pivotShowNavButtons));

                var leftButton = <HTMLElement> document.elementFromPoint(pivot.element.offsetLeft + 10, pivot.element.offsetTop + 40);
                LiveUnit.Assert.isTrue(leftButton.classList.contains(Pivot._ClassNames.pivotNavButtonPrev));

                var rightButton = <HTMLElement> document.elementFromPoint(pivot.element.offsetLeft + pivot.element.offsetWidth - 10, pivot.element.offsetTop + 40);
                LiveUnit.Assert.isTrue(rightButton.classList.contains(Pivot._ClassNames.pivotNavButtonNext));

                complete();
            });
        });



        testKeyboardHeaderToHeaderLTR = function testKeyboardHeaderToHeaderLTR(complete) {
            runKeyboardHeaderToHeader(complete, false);
        };

        testKeyboardHeaderToHeaderRTL = function testKeyboardHeaderToHeaderRTL(complete) {
            runKeyboardHeaderToHeader(complete, true);
        };

        testKeyboardHeaderToHeaderWhileLocked = function testKeyboardHeaderToHeaderWhileLocked(complete) {
            var pivot = createAndAppendPivotWithItems(5);
            pivot.locked = true;

            return waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                pivot._headersContainerElement.children[1].focus();

                monkeyPatch(pivot, "_loadItem", function () {
                    LiveUnit.Assert.fail("shouldn't happen");
                });

                fireKeyEvent("keydown", pivot._headersContainerElement, Keys.leftArrow);
                fireKeyEvent("keydown", pivot._headersContainerElement, Keys.pageUp);
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                complete();
            });
        };

        testHeaderPosition = function testHeaderPosition(complete, isWideTest) {
            var pivot = createAndAppendPivotWithItems(5);
            pivot.selectedIndex = 3;

            waitForNextItemAnimationEnd(pivot).done(function () {
                var item = pivot.items.getAt(pivot.selectedIndex);
                var headerContainer = (<HTMLElement>pivot.element.querySelector(".win-pivot-header")).parentElement;
                LiveUnit.Assert.areEqual(item.header, headerContainer.children[isWideTest ? pivot.selectedIndex : 1].textContent);
                complete();
            });
        };

        testHeadersStateTransition = skipWide(function testHeadersStateTransition(complete) {
            var pivot = createAndAppendPivotWithItems(5);
            pivot.selectedIndex = 2;

            var item = pivot.items.getAt(pivot.selectedIndex);

            waitForNextItemAnimationEnd(pivot).then(function () {
                // We should be in overflow mode, so the selected header should always be at index 1
                var headerContainer = (<HTMLElement>pivot.element.querySelector(".win-pivot-header")).parentElement;

                LiveUnit.Assert.areEqual(item.header, headerContainer.children[1].textContent);

                // Resize to static mode
                pivot.element.parentElement.style.width = "10000px";
                pivot.forceLayout();
                return pivot._headersState._transitionAnimation;
            }).then(function () {
                // We should be in static mode, so the selected header should appear in order
                var headerContainer = (<HTMLElement>pivot.element.querySelector(".win-pivot-header")).parentElement;

                LiveUnit.Assert.areEqual(item.header, headerContainer.children[pivot.selectedIndex].textContent);

                // Resize back to overflow mode
                pivot.element.parentElement.style.width = pivotWidth + "px";
                pivot.forceLayout();
                return pivot._headersState._transitionAnimation;
            }).done(function () {
                // We should be back in overflow mode, so the selected header should always be at index 1
                var headerContainer = (<HTMLElement>pivot.element.querySelector(".win-pivot-header")).parentElement;

                LiveUnit.Assert.areEqual(item.header, headerContainer.children[1].textContent);
                complete();
            });
        });

        testChangePivotItemCountFrom1To2BackTo1 = function (complete, isWideTest) {
            var pivot = createAndAppendPivotWithItems(1);
            pivot.items.getAt(0).header = "The header must be long in order for a single pivot item to put the pivot into overflow headers state.";

            waitForNextItemAnimationEnd(pivot).then(function () {
                // Check that the pivot was initialized with viewport overflow hidden since we only have 1 item
                LiveUnit.Assert.areEqual("hidden", pivot._viewportElement.style.overflow);

                // Adding an item should clear the overflow state which goes down a very specific codepath that
                // is only hit when adding items to the pivot with the initial count === 1
                pivot.items.push(new PivotItem(null, { header: "new header" }));
                LiveUnit.Assert.areEqual("", pivot._viewportElement.style.overflow);

                // Reducing the item count back down to 1 should restore overflow hidden style
                pivot.items.splice(1, 1);
                LiveUnit.Assert.areEqual("hidden", pivot._viewportElement.style.overflow);

                complete();
            });
        };

        testAnimationDirectionInStaticMode = skipWide(function (complete) {
            pivotWrapperEl.style.width = "10000px";
            var pivot = createAndAppendPivotWithItems(5);

            var goPreviousExpected = false;
            var headers;
            waitForNextItemAnimationEnd(pivot).then(function () {
                monkeyPatch(pivot._headersState, "handleNavigation", function (goPrevious, index, oldIndex) {
                    LiveUnit.Assert.areEqual(!!goPreviousExpected, !!goPrevious);
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
        });


        testFractionalControlSizeDoesNotCauseInfiniteNavigation = skipWide(function (complete) {
            if (!supportsSnap) {
                LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
                complete();
                return;
            }

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5))
            });
            pivotWrapperEl.style.width = (pivotWidth + 0.21) + "px";
            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).then(function () {
                var headers = document.querySelectorAll("." + Pivot._ClassNames.pivotHeader);
                pivot._viewportElement.msZoomTo({ contentX: pivot._viewportElement.scrollLeft + 100 });

                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                pivot._headersState.handleNavigation = function () {
                    LiveUnit.Assert.fail("Navigation should not occur with content swipe disabled.");
                };
                return WinJS.Promise.timeout(500);
            }).done(function () {
                complete();
            });
        });

        testCustomContentHeaders = function (complete) {
            var left = document.createElement("div");
            var right = document.createElement("div");

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5)),
                customLeftHeader: left,
                customRightHeader: right,
            });
            pivotWrapperEl.appendChild(pivot.element);
            waitForNextItemAnimationEnd(pivot).done(function () {
                LiveUnit.Assert.areEqual(left, document.querySelector(".win-pivot-header-leftcustom").firstElementChild);
                LiveUnit.Assert.areEqual(right, document.querySelector(".win-pivot-header-rightcustom").firstElementChild);
                complete();
            });
        };

        testForceLayoutRelayoutsCustomContentHeaders = function (complete) {
            var left = document.createElement("div");
            var right = document.createElement("div");
            left.style.width = right.style.width = "50px";

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5)),
                customLeftHeader: left,
                customRightHeader: right,
            });
            pivotWrapperEl.appendChild(pivot.element);

            var headersWidth = 0;
            waitForNextItemAnimationEnd(pivot).then(function () {
                headersWidth = pivot._getHeaderItemsWidth();
                left.style.width = right.style.width = "75px";
                return WinJS.Promise.timeout(0);
            }).then(function () {
                LiveUnit.Assert.areEqual(headersWidth, pivot._getHeaderItemsWidth());
                pivot.forceLayout();
                return WinJS.Promise.timeout(0);
            }).done(function () {
                LiveUnit.Assert.areEqual(headersWidth - 50, pivot._getHeaderItemsWidth());
                complete();
            });
        };

        testSettingCustomContentHeaderRelayouts = function (complete) {
            var left = document.createElement("div");
            var right = document.createElement("div");
            left.style.width = right.style.width = "50px";

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5)),
                customLeftHeader: left,
                customRightHeader: right,
            });
            pivotWrapperEl.appendChild(pivot.element);

            var headersWidth = 0;
            waitForNextItemAnimationEnd(pivot).then(function () {
                headersWidth = pivot._getHeaderItemsWidth();
                left.style.width = "75px";
                return WinJS.Promise.timeout(0);
            }).then(function () {
                LiveUnit.Assert.areEqual(headersWidth, pivot._getHeaderItemsWidth());
                pivot.customLeftHeader = left;
                return WinJS.Promise.timeout(0);
            }).then(function () {
                LiveUnit.Assert.areEqual(headersWidth - 25, pivot._getHeaderItemsWidth());
                right.style.width = "75px";
                return WinJS.Promise.timeout(0);
            }).then(function () {
                LiveUnit.Assert.areEqual(headersWidth - 25, pivot._getHeaderItemsWidth());
                pivot.customRightHeader = right;
                return WinJS.Promise.timeout(0);
            }).done(function () {
                LiveUnit.Assert.areEqual(headersWidth - 50, pivot._getHeaderItemsWidth());
                complete();
            });
        };

        testSettingCustomContentHeaderToNullDoesNotCrash = function (complete) {
            var left = document.createElement("div");
            var right = document.createElement("div");
            left.style.width = right.style.width = "50px";

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5)),
                customLeftHeader: left,
                customRightHeader: right,
            });
            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).done(function () {
                pivot.customLeftHeader = null;
                pivot.customRightHeader = null;
                LiveUnit.Assert.isNull(document.querySelector(".win-pivot-header-leftcustom").firstElementChild);
                LiveUnit.Assert.isNull(document.querySelector(".win-pivot-header-rightcustom").firstElementChild);
                complete();
            });
        };

        testSelectionChangedEventFiresAfterSelectedIndexIsUpdated = function (complete) {
            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5)),
            });
            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).done(function () {
                pivot.addEventListener("selectionchanged", () => {
                    LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
                    complete();
                });

                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
                pivot.selectedIndex = 2;
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);
            });
        };

        testCustomHeadersDoNotGetTouchOccluded = function (complete) {
            var left = document.createElement("div");
            var right = document.createElement("div");
            left.style.width = right.style.width = "50px";

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(5)),
            });
            pivotWrapperEl.appendChild(pivot.element);

            // Tell pivot we are in touch mode
            pivot.element.classList.add("win-pivot-touch");

            waitForNextItemAnimationEnd(pivot).done(function () {
                if (pivot.element.classList.contains("win-pivot-nosnap")) {
                    LiveUnit.LoggingCore.logComment("This test relies on SnapPoints APIs which are not supported on this platform.");
                    complete();
                    return;
                }

                var viewport = pivot.element.querySelector(".win-pivot-viewport");

                // With no custom headers set, the viewport should span over the headers
                LiveUnit.Assert.areNotEqual(0, parseFloat(getComputedStyle(viewport).marginTop));

                // Left custom header is set, viewport should not span over the headers
                pivot.customLeftHeader = left;
                LiveUnit.Assert.areEqual(0, parseFloat(getComputedStyle(viewport).marginTop));

                // Left custom header removed, the viewport should span over the headers
                pivot.customLeftHeader = null;
                LiveUnit.Assert.areNotEqual(0, parseFloat(getComputedStyle(viewport).marginTop));

                // Right custom header is set, viewport should not span over the headers
                pivot.customRightHeader = right;
                LiveUnit.Assert.areEqual(0, parseFloat(getComputedStyle(viewport).marginTop));

                // Right custom header removed, the viewport should span over the headers
                pivot.customRightHeader = null;
                LiveUnit.Assert.areNotEqual(0, parseFloat(getComputedStyle(viewport).marginTop));

                // Both custom headers set, viewport should not span over the headers
                pivot.customLeftHeader = left;
                pivot.customRightHeader = right;
                LiveUnit.Assert.areEqual(0, parseFloat(getComputedStyle(viewport).marginTop));

                complete();
            });
        };

        testHeadersTabStory = function (complete) {
            /*
                The Story
                The entire headers container is a single tabbable element, none of the individual headers are tabstops.
                However, in narrator mode, the headers container is not accessible and instead, each individual header
                is accessible so each header's state and label can be narrated.
             */

            var pivot = new Pivot(undefined, {
                items: new WinJS.Binding.List(getPivotItemsProgrammatically(2)),
            });
            pivotWrapperEl.appendChild(pivot.element);

            waitForNextItemAnimationEnd(pivot).done(function () {
                var headersContainer = <HTMLElement>pivot.element.querySelector(".win-pivot-headers");

                LiveUnit.Assert.areNotEqual(-1, headersContainer.tabIndex);

                var headers = headersContainer.querySelectorAll(".win-pivot-header");
                for (var i = 0; i < headers.length; i++) {
                    var header = <HTMLElement>headers[i];
                    LiveUnit.Assert.areEqual(-1, header.tabIndex);
                }

                complete();
            });
        };
    }

    Object.keys(PivotTests).forEach(function (key) {
        if (key.indexOf("test") !== 0) {
            return;
        }

        var origTestFunc = PivotTests[key];
        if (origTestFunc.skipWideTest) {
            return;
        }

        PivotTests.prototype[key + "_Wide"] = function (complete) {
            pivotWrapperEl.style.width = "10000px";
            origTestFunc.call(this, complete, true);
        };
    });
    
    var disabledTestRegistry = {
        testLocked: Helper.Browsers.ie11,
        testFlip: Helper.Browsers.ie11, 
        testEmptyPivotRecentersCorrectly: Helper.Browsers.ie11, 
        testFractionalControlSizeDoesNotCauseInfiniteNavigation: Helper.Browsers.ie11
    };
    Helper.disableTests(PivotTests, disabledTestRegistry);
}

LiveUnit.registerTestClass("WinJSTests.PivotTests");

