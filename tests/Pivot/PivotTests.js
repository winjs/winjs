// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var WinJSTests = WinJSTests || {};

WinJSTests.PivotTests = function () {
    "use strict";

    var pivotWrapperEl;
    this.setUp = function () {
        pivotWrapperEl = document.createElement('div');
        pivotWrapperEl.style.cssText = "width: 320px; height: 480px; background-color: #777;"
        document.body.appendChild(pivotWrapperEl);
    };

    this.tearDown = function () {
        document.body.removeChild(pivotWrapperEl);
    };

    var instances = 0;
    WinJSTests.PivotTestsFakeControl = WinJS.Class.define(function (element, options) {
        instances++;
    });

    function simulateTap(element) {
        element.scrollIntoView(false);
        var elementRect = element.getBoundingClientRect();
        var event = document.createEvent("PointerEvent");
        var clientX = Math.floor(elementRect.left + (elementRect.width / 2));
        var clientY = Math.floor(elementRect.top + (elementRect.height / 2));
        //PointerEvent.initPointerEvent(typeArg, canBubbleArg, cancelableArg, viewArg, detailArg, screenXArg, screenYArg, clientXArg, clientYArg, ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg, buttonArg, relatedTargetArg, offsetXArg, offsetYArg, widthArg, heightArg, pressure, rotation, tiltX, tiltY, pointerIdArg, pointerType, hwTimestampArg, isPrimary); 
        event.initPointerEvent("click", true, true, window, {}, clientX + window.screenLeft, clientY + window.screenTop, clientX, clientY, false, false, false, false, 0, document.querySelector(".win-pivot"), elementRect.width / 2, elementRect.height / 2, 20, 20, 0, 0, 0, 0, 0, "touch", Date.now(), true);
        element.dispatchEvent(event);
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

    function waitForNextItemAnimationStart(pivot) {
        return new WinJS.Promise(function (c, e, p) {
            pivot.element.addEventListener(WinJS.UI.Pivot._EventName.itemAnimationStart, test);

            function test() {
                pivot.element.removeEventListener(WinJS.UI.Pivot._EventName.itemAnimationStart, test);
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

    this.testTitle = function testTitle() {
        var pivot = new WinJS.UI.Pivot(undefined, {
            title: "test"
        });

        var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[2];

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
        LiveUnit.Assert.areEqual("", pivot.title, "Title");
        LiveUnit.Assert.areEqual("", pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle).textContent, "Title");
        LiveUnit.Assert.areEqual("none", getComputedStyle(pivot.element.querySelector("." + WinJS.UI.Pivot._ClassName.pivotTitle)).display, "Title display");
    };

    this.testRemovals = function testRemovals(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            selectedIndex: 2,
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

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

    this.testClickHeader = function testClickHeader(complete) {
        var pivotItemCount = 5;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

            var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[2];
            simulateTap(nextItemHeader);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

            var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[2];
            simulateTap(nextItemHeader);

            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

            var nextItemHeader = pivot.element.querySelectorAll("." + WinJS.UI.Pivot._ClassName.pivotHeader)[2];
            simulateTap(nextItemHeader);

            return waitForNextItemAnimationEnd(pivot)
        }).done(function () {
            LiveUnit.Assert.areEqual(3, pivot.selectedIndex, "Correct selectedIndex");

            complete();
        });
    };

    this.testLocked = function (complete) {
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
                LiveUnit.Assert.areEqual("auto", pivotViewportComputedStyle.overflowX);
                LiveUnit.Assert.areEqual("hidden", pivotViewportComputedStyle.overflowY);

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
                LiveUnit.Assert.areEqual("auto", pivotViewportComputedStyle.overflowX);
                LiveUnit.Assert.areEqual("hidden", pivotViewportComputedStyle.overflowY);
                LiveUnit.Assert.areEqual(pivotItemCount + 1, countVisiblePivotItemHeaders(pivot), "Not all headers were visible");

                complete();
            });
    };

    this.testHeaderCount = function (complete) {
        var pivotItemCount = 2;
        instances = 0;
        var pivot = new WinJS.UI.Pivot(undefined, {
            items: new WinJS.Binding.List(getPivotItemsProgrammatically(pivotItemCount))
        });

        pivotWrapperEl.appendChild(pivot.element);

        waitForNextItemAnimationEnd(pivot).then(function () {
            LiveUnit.Assert.areEqual(3, pivot._headersContainerElement.children.length);

            // Zoom next
            WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).then(function () {
            LiveUnit.Assert.areEqual(3, pivot._headersContainerElement.children.length);

            // Zoom next
            WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
            return waitForNextItemAnimationEnd(pivot);
        }).done(function () {
            LiveUnit.Assert.areEqual(4, pivot._headersContainerElement.children.length);
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

    if (WinJS.UI.isAnimationEnabled()) {

        this.testFlip = function testFlip(complete) {
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
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom next
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom next
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom previous
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom previous
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

                // Zoom previous
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
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

                center = pivot._viewportElement.scrollLeft;
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });

                // Don't wait until the current flip operation completes:
                return WinJS.Promise.timeout();
            }).then(function () {
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex, "Correct selectedIndex");

                // Interrupt animation with more panning:
                pivot._viewportElement.scrollLeft = center + pivot._viewportElement.offsetWidth;
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });

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

            WinJS.Promise.timeout().then(function () {
                // Test constructor/refresh
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.api, pivot._navMode);

                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
                LiveUnit.Assert.areEqual(0, pivot.selectedIndex);

                // Test selectedIndex
                pivot.selectedIndex = 1;
                return WinJS.Promise.timeout();
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.api, pivot._navMode);
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

                // Test selectedItem
                pivot.selectedItem = pivot.items.getAt(2);
                return WinJS.Promise.timeout();
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.api, pivot._navMode);
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
                LiveUnit.Assert.areEqual(2, pivot.selectedIndex);
                complete();
            });
        };

        this.testNavigateViaInertia = function testNavigateViaInertia(complete) {
            if (!window.msZoomTo) {
                LiveUnit.LoggingCore.logComment("This test simulates panning using msZoomTo which is not supported on this platform.");
                complete();
                return;
            }
            if (!window.MSManipulationEvent) {
                LiveUnit.LoggingCore.logComment("This test relies on MSManipulationStateChanged events which are not supported on this platform.");
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
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft + pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return WinJS.Promise.timeout();
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.inertia, pivot._navMode);
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

                // Pan left
                WinJS.Utilities._zoomTo(pivot._viewportElement, { contentX: pivot._viewportElement.scrollLeft - pivot._viewportElement.offsetWidth, contentY: 0, viewportX: 0, viewportY: 0 });
                return WinJS.Promise.timeout();
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
                pivot._viewportElement.scrollLeft += 50;
                return WinJS.Promise.timeout();
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.scroll, pivot._navMode);
                return waitForNextItemAnimationEnd(pivot);
            }).then(function () {
                LiveUnit.Assert.areEqual(WinJS.UI.Pivot._NavigationModes.none, pivot._navMode);
                LiveUnit.Assert.areEqual(1, pivot.selectedIndex);

                // Pan left
                pivot._viewportElement.scrollLeft -= 50;
                return WinJS.Promise.timeout();
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
                left = pivot._viewportElement.scrollLeft;
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
    }
};

if (WinJS.UI.Pivot) {
    LiveUnit.registerTestClass("WinJSTests.PivotTests");
}
