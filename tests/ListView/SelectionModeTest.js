// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.SelectionModeTests = function () {
    "use strict";

    var Key = utilities.Key;

    var list, proxy, items, invoked;

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function () {

        LiveUnit.LoggingCore.logComment("In setup");
        list = document.createElement("div");
        list.id = "SelectionModeTests";

        proxy = document.createElement("div");
        list.appendChild(proxy);

        proxy.setPointerCapture = function () { };
        proxy.releasePointerCapture = function () { };
        list.setPointerCapture = function () { };
        list.releasePointerCapture = function () { };

        items = [];
        for (var i = 0; i < 10; ++i) {
            items[i] = document.createElement("div");
            items[i].textContent = "Tile " + i;
            list.appendChild(items[i]);
        }
        document.body.appendChild(list);

        this.oldHasWinRT = WinJS.Utilities.hasWinRT;
        this.oldRenderSelection = WinJS.UI._ItemEventsHandler.renderSelection;
        WinJS.Utilities._setHasWinRT(false);

        invoked = { type: "item", index: -1 };
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        WinJS.Utilities._setHasWinRT(this.oldHasWinRT);
        WinJS.UI._ItemEventsHandler.renderSelection = this.oldRenderSelection;

        var element = document.getElementById("SelectionModeTests");
        document.body.removeChild(element);
    }

    function verifySelection(mode, expected) {
        if (!Array.isArray(expected)) {
            expected = [expected];
        }
        elementsEqual(expected, mode.site._selection.getIndices());
    }

    function eventOnElement(element) {
        var rect = element.getBoundingClientRect();
        // Simulate clicking the middle of the element
        return {
            target: element,
            clientX: (rect.left + rect.right) / 2,
            clientY: (rect.top + rect.bottom) / 2,
            defaultPrevented: false,
            preventDefault: function () {
                this.defaultPrevented = true;
            }
        };
    }

    // As a side effect, this will scroll the browser to make the clicked element visible
    function click(mode, eventObject) {
        var target = eventObject.target,
            elementCoords;

        invoked = { type: "item", index: -1 };
        if (typeof eventObject.button !== "number") {
            eventObject.button = WinJS.UI._LEFT_MSPOINTER_BUTTON;
        }

        target.scrollIntoView(false);
        elementCoords = eventOnElement(target);
        eventObject.clientX = elementCoords.clientX;
        eventObject.clientY = elementCoords.clientY;
        eventObject.preventDefault = function () { };

        mode.onPointerDown(eventObject);
        mode.onPointerUp(eventObject);
        mode.onclick();
    }

    function rightClick(mode, eventObject) {
        eventObject.button = WinJS.UI._RIGHT_MSPOINTER_BUTTON;
        click(mode, eventObject);
    }

    function createEvent(key, shiftKey, ctrlKey) {
        return {
            keyCode: key,
            shiftKey: shiftKey,
            ctrlKey: ctrlKey,
            target: items[0],
            stopPropagation: function () { },
            preventDefault: function () { }
        };
    }

    function createMode(site) {
        var mode = new WinJS.UI._SelectionMode(site);
        mode._fireInvokeEvent = function (entity) {
            invoked = entity;
        };
        return mode;
    }

    function createSite(configuration) {
        var dataSource = (new WinJS.Binding.List([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).dataSource;
        var selectionManager = new WinJS.UI._SelectionManager({});

        selectionManager._fireSelectionChanging = function () {
            return WinJS.Promise.wrap(true);
        };
        selectionManager._fireSelectionChanged = function () { };

        var site = {
            itemDataSource: dataSource,
            _groups: new WinJS.UI._NoGroups(),
            _versionManager: new WinJS.UI._VersionManager(),
            _selectionMode: configuration.selectionMode,
            _tap: configuration.tap,
            _swipeBehavior: WinJS.UI.SwipeBehavior[configuration.crossSlide ? "select" : "none"],
            _isZombie: function () { return true; },
            _element: list,
            _viewport: list,
            _canvas: list,
            _itemCanvas: list,
            _canvasProxy: proxy,
            _rtl: function () {
                return window.getComputedStyle(site._canvas, null).direction === "rtl";
            },
            keyboardFocusedItem: { type: "item", index: 0 },
            _updateSelection: function () {
            },
            _unsetFocusOnItem: function () {
                this.keyboardFocusedItem = { type: "item", index: -1 };
            },
            _setFocusOnItem: function (item) {
                this.keyboardFocusedItem = item;
            },
            _setupTabOrder: function () {
            },
            addEventListener: function () {
            },
            removeEventListener: function () {
            },
            ensureVisible: function () {
            },
            _selection: selectionManager,
            _getItemPosition: function (index) {
                return {
                    then: function (callback) {
                        callback({
                            left: 0,
                            top: 0,
                            contentWidth: 100,
                            contentHeight: 100
                        });
                    }
                };
            },
            _layout: {
                // We're pretending to be a 3x3 horizontal grid here
                getKeyboardNavigatedItem: function (entity, element, keyPressed) {
                    if (keyPressed === WinJS.Utilities.Key.upArrow) {
                        return WinJS.Promise.wrap({ type: "item", index: Math.max(0, entity.index - 1) });
                    } else if (keyPressed === WinJS.Utilities.Key.downArrow) {
                        return WinJS.Promise.wrap({ type: "item", index: entity.index + 1 });
                    } else if (keyPressed === WinJS.Utilities.Key.leftArrow) {
                        return WinJS.Promise.wrap({ type: "item", index: ((entity.index - 3 < 0) ? entity.index : entity.index - 3) });
                    } else {
                        return WinJS.Promise.wrap({ type: "item", index: entity.index + 3 });
                    }
                }
            },
            _changeFocus: function (newFocus, skipSelection, ctrlKeyDown) {
                this._selection._setFocused(newFocus);
                this.keyboardFocusedItem = newFocus;
                if (!skipSelection && this._selectFocused(ctrlKeyDown)) {
                    this._selection.set([{ index: newFocus }]);
                }
            },
            _selectionAllowed: function () {
                return this._selectionMode !== "none";
            },
            _multiSelection: function () {
                return this._selectionMode === "multi";
            },
            _selectOnTap: function () {
                return this._tap === "toggleSelect" || this._tap === "directSelect";
            },
            _selectFocused: function ListView_selectFocused(ctrlKeyDown) {
                return this._tap === WinJS.UI.TapBehavior.directSelect && this._selectionMode === WinJS.UI.SelectionMode.multi && !ctrlKeyDown;
            },
            _renderSelection: function () {
            },
            _getItemOffset: function (index) {
                return {
                    then: function (callback) {
                        callback({
                            begin: 0,
                            end: 100
                        });
                    }
                };
            },
            _convertFromCanvasCoordinates: function (range) {
                return range;
            },
            _batchViewUpdates: function (stage, priority, functor) {
                functor();
            },
            _getViewportLength: function () {
                return 350;
            },
            _view: {
                getAdjacent: function (oldFocus, direction) {
                    return site._layout.getKeyboardNavigatedItem(oldFocus, null, direction);
                },
                items: {
                    index: function (element) {
                        var itemElement = element;
                        for (var i = 0; i < items.length; ++i) {
                            if (items[i] === itemElement) {
                                return i;
                            }
                        }
                        return -1;
                    },
                    itemAt: function (index) {
                        return items[index];
                    },
                    itemBoxAt: function (index) {
                        return items[index];
                    },
                    containerAt: function (index) {
                        return items[index];
                    },
                    containerFrom: function (element) {
                        while (element && this.index(element) === -1) {
                            element = element.parentNode;
                        }
                        return element;
                    },
                    itemDataAt: function (index) {
                        return {
                            element: items[index],
                            itemBox: items[index],
                            container: items[index]
                        };
                    }
                },
                groups: null,
                // We're pretending to be a 3x3 horizontal grid here
                finalItem: function () {
                    return WinJS.Promise.wrap(8);
                }
            },
            _itemsCount: function () {
                return dataSource.getCount();
            },
            _itemsManager: {
                dataSource: dataSource,
                _listBinding: dataSource.createListBinding()
            }
        };
        WinJS.UI._ItemEventsHandler.renderSelection = function () { };
        selectionManager._listView = site;
        return site;
    }

    // Verifies shift selection (mouse) using all combinations of left, right, and ctrl click.
    // Options:
    // - createSite: required
    // - shiftLeftClickIsAdditive: a boolean representing whether or not a shift+left-click
    //   (no ctrl key) should add to the current selection rather than destroying it.
    function verifyRangeSelectionWithClick(options) {

        // options: site (required), shouldBeAdditive, shiftKey, rightClick, ctrlKey
        // When shouldBeAdditive is true, verifies that the current selection 
        // is maintained and the range is added to it. Otherwise, verifies that
        // the range becomes selected and all other items become deselected.
        function verify(options) {
            var mode = createMode(options.site);
            var doClick = options.rightClick ? rightClick : click;

            doClick(mode, { target: items[2], ctrlKey: true });
            verifySelection(mode, [2]);
            LiveUnit.Assert.areEqual(-1, invoked.index);

            doClick(mode, { target: items[0], shiftKey: true, ctrlKey: options.ctrlKey });
            verifySelection(mode, [0, 1, 2]);
            LiveUnit.Assert.areEqual(-1, invoked.index);

            doClick(mode, { target: items[5], ctrlKey: true });
            verifySelection(mode, [0, 1, 2, 5]);
            LiveUnit.Assert.areEqual(-1, invoked.index);

            doClick(mode, { target: items[8], shiftKey: true, ctrlKey: options.ctrlKey });
            verifySelection(mode, options.shouldBeAdditive ? [0, 1, 2, 5, 6, 7, 8] : [5, 6, 7, 8]);
            LiveUnit.Assert.areEqual(-1, invoked.index);
        }

        [true, false].forEach(function (rightClick) {
            [true, false].forEach(function (ctrlKey) {
                var shiftKeyOnly = !rightClick && !ctrlKey;

                verify({
                    shouldBeAdditive: shiftKeyOnly ? options.shiftLeftClickIsAdditive : true,
                    site: options.createSite(),
                    rightClick: rightClick,
                    ctrlKey: ctrlKey
                });
            });
        });
    }

    // Verifies shift selection (keyboard) using the up and down arrows with and without the control key
    // Options:
    // - createSite: required
    // - shiftArrowIsAdditive: a boolean representing whether or not a shift+arrow
    //   (no ctrl key) should add to the current selection rather than destroying it.
    function verifyRangeSelectionWithKeyboard(options) {

        // options: site (required), shouldBeAdditive, shiftKey, ctrlKey
        // When shouldBeAdditive is true, verifies that the current selection 
        // is maintained and the range is added to it. Otherwise, verifies that
        // the range becomes selected and all other items become deselected.
        function verify(options) {
            var site = options.site;
            var mode = createMode(site);
            var shiftKey = true;

            verifySelection(mode, []);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 0);

            // Move to index 3
            mode.onKeyDown(createEvent(Key.downArrow));
            mode.onKeyDown(createEvent(Key.downArrow));
            mode.onKeyDown(createEvent(Key.downArrow));
            verifySelection(mode, []);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 3);

            // Test range selection using the up arrow

            mode.onKeyDown(createEvent(Key.upArrow, shiftKey, options.ctrlKey));
            verifySelection(mode, [2, 3]);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 2);

            mode.onKeyDown(createEvent(Key.upArrow, shiftKey, options.ctrlKey));
            verifySelection(mode, [1, 2, 3]);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);

            // Move to index 5 while maintaining the current selection
            mode.onKeyDown(createEvent(Key.downArrow, false, true));
            mode.onKeyDown(createEvent(Key.downArrow, false, true));
            mode.onKeyDown(createEvent(Key.downArrow, false, true));
            mode.onKeyDown(createEvent(Key.downArrow, false, true));
            verifySelection(mode, [1, 2, 3]);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 5);

            // Test range selection using the down arrow

            var expectedSelection = options.shouldBeAdditive ? [1, 2, 3] : [];

            mode.onKeyDown(createEvent(Key.downArrow, shiftKey, options.ctrlKey));
            expectedSelection.push(5);
            expectedSelection.push(6);
            verifySelection(mode, expectedSelection);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 6);

            mode.onKeyDown(createEvent(Key.downArrow, shiftKey, options.ctrlKey));
            expectedSelection.push(7);
            verifySelection(mode, expectedSelection);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 7);

            mode.onKeyDown(createEvent(Key.downArrow, shiftKey, options.ctrlKey));
            expectedSelection.push(8);
            verifySelection(mode, expectedSelection);
            LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        }

        [true, false].forEach(function (ctrlKey) {
            var shiftKeyOnly = !ctrlKey;

            verify({
                shouldBeAdditive: shiftKeyOnly ? options.shiftArrowIsAdditive : true,
                site: options.createSite(),
                ctrlKey: ctrlKey
            });
        });
    }

    this.testStatic = function () {
        var mode = createMode(createSite({
            selectionMode: "none",
            tap: "none",
            crossSlide: true
        }));

        click(mode, { target: items[2] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(2, invoked.index);

        click(mode, { target: items[0], shiftKey: true });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[2], shiftKey: true, ctrlKey: true });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[0], ctrlKey: true });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[0] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);
    };

    this.testContentLibrarySingle = function () {
        var mode = createMode(createSite({
            selectionMode: "single",
            tap: "invokeOnly",
            crossSlide: true
        }));

        click(mode, { target: items[2] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(2, invoked.index);

        click(mode, { target: items[0], shiftKey: true });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[0], ctrlKey: true });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[2], shiftKey: true, ctrlKey: true });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[0] });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(0, invoked.index);

        click(mode, { target: items[0], ctrlKey: true });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[1] });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[1] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);
    };

    this.testContentLibraryMulti = function () {
        var siteConfig = {
            selectionMode: "multi",
            tap: "invokeOnly",
            crossSlide: true
        };
        var site = createSite(siteConfig);
        var mode = createMode(site);

        click(mode, { target: items[2] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(2, invoked.index);

        click(mode, { target: items[0], shiftKey: true });
        verifySelection(mode, [0, 1, 2]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        site._selection._pivot = 1;
        mode.onKeyDown(createEvent(Key.escape));
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, site._selection._pivot, "Selection pivot wasn't reset when hitting escape");

        click(mode, { target: items[0], ctrlKey: true });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[1], ctrlKey: true });
        verifySelection(mode, [0, 1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[1], ctrlKey: true });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[0] });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(0, invoked.index);

        rightClick(mode, { target: items[1] });
        verifySelection(mode, [0, 1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[0] });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[4] });
        verifySelection(mode, [1]);

        mode.onKeyDown(createEvent(Key.leftArrow, true));
        verifySelection(mode, [1, 2, 3, 4]);

        mode.onKeyDown(createEvent(Key.leftArrow, true));
        verifySelection(mode, [1, 2, 3, 4]);

        verifyRangeSelectionWithClick({
            shiftLeftClickIsAdditive: false,
            createSite: function () { return createSite(siteConfig); }
        });
    };

    this.testContentLibraryMultiKeyboard = function () {
        var siteConfig = {
            selectionMode: "multi",
            tap: "invokeOnly",
            crossSlide: true
        };

        verifyRangeSelectionWithKeyboard({
            shiftArrowIsAdditive: false,
            createSite: function () { return createSite(siteConfig); }
        });
    };

    function blockSelectWithTap(eventObject) {
        eventObject.detail.preventTapBehavior();
    }

    this.testMasterDetailSingle = function () {
        var mode = createMode(createSite({
            selectionMode: "single",
            tap: "directSelect",
            crossSlide: false
        }));

        click(mode, { target: items[2] });
        verifySelection(mode, [2]);
        LiveUnit.Assert.areEqual(2, invoked.index);

        click(mode, { target: items[1] });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(1, invoked.index);

        click(mode, { target: items[1] });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(1, invoked.index);

        click(mode, { target: items[0], shiftKey: true });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[2], shiftKey: true, ctrlKey: true });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[1], ctrlKey: true });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[1] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        list.addEventListener("selectionchanging", blockSelectWithTap, false);
        click(mode, { target: items[2] });
        verifySelection(mode, []);
        list.removeEventListener("selectionchanging", blockSelectWithTap, false);
    };

    this.testMasterDetailSingleKeyboard = function () {
        var site = createSite({
            selectionMode: "single",
            tap: "directSelect",
            crossSlide: false
        });
        var mode = createMode(site);

        function verifyEvent(eventArgs, expectedSelection) {
            invoked = { type: "item", index: -1 };
            mode.onKeyDown(createEvent.apply(null, eventArgs));
            verifySelection(mode, expectedSelection);
            LiveUnit.Assert.areEqual(-1, invoked.index);
        }

        // These should not modify the selection
        verifyEvent([Key.menu], []);
        verifyEvent([Key.F10, true], []);               // shift+F10

        // These should modify the selection
        verifyEvent([Key.space], [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        verifyEvent([Key.enter, false, true], [1]);     // ctrl+enter
    };

    this.testMasterDetailMulti = function () {
        var siteConfig = {
            selectionMode: "multi",
            tap: "directSelect",
            crossSlide: true
        };
        var mode = createMode(createSite(siteConfig));

        click(mode, { target: items[2] });
        verifySelection(mode, [2]);
        LiveUnit.Assert.areEqual(2, invoked.index);

        click(mode, { target: items[1] });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(1, invoked.index);

        click(mode, { target: items[1] });
        verifySelection(mode, [1]);
        LiveUnit.Assert.areEqual(1, invoked.index);

        click(mode, { target: items[0], shiftKey: true });
        verifySelection(mode, [0, 1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[2], ctrlKey: true });
        verifySelection(mode, [0, 1, 2]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[2], ctrlKey: true });
        verifySelection(mode, [0, 1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[2] });
        verifySelection(mode, [0, 1, 2]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        rightClick(mode, { target: items[2] });
        verifySelection(mode, [0, 1]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        list.addEventListener("selectionchanging", blockSelectWithTap, false);
        click(mode, { target: items[2] });
        verifySelection(mode, [0, 1]);
        list.removeEventListener("selectionchanging", blockSelectWithTap, false);

        verifyRangeSelectionWithClick({
            shiftLeftClickIsAdditive: false,
            createSite: function () { return createSite(siteConfig); }
        });
    };

    this.testMasterDetailMultiKeyboard = function () {
        var siteConfig = {
            selectionMode: "multi",
            tap: "directSelect",
            crossSlide: true
        };

        verifyRangeSelectionWithKeyboard({
            shiftArrowIsAdditive: false,
            createSite: function () { return createSite(siteConfig); }
        });
    };


    this.testPickerSingleMode = function () {
        var mode = createMode(createSite({
            selectionMode: "single",
            tap: "toggleSelect",
            crossSlide: true
        }));

        click(mode, { target: items[2] });
        verifySelection(mode, [2]);
        LiveUnit.Assert.areEqual(2, invoked.index);

        click(mode, { target: items[0], shiftKey: true });
        verifySelection(mode, [2]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[3], shiftKey: true, ctrlKey: true });
        verifySelection(mode, [2]);
        LiveUnit.Assert.areEqual(-1, invoked.index);

        click(mode, { target: items[0] });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(0, invoked.index);

        click(mode, { target: items[0] });
        verifySelection(mode, []);
        LiveUnit.Assert.areEqual(0, invoked.index);

        list.addEventListener("selectionchanging", blockSelectWithTap, false);
        click(mode, { target: items[2] });
        verifySelection(mode, []);
        list.removeEventListener("selectionchanging", blockSelectWithTap, false);
    };

    this.testPickerSingleModeKeyboard = function () {
        var site = createSite({
            selectionMode: "single",
            tap: "toggleSelect",
            crossSlide: true
        });
        var mode = createMode(site);

        mode.onKeyDown(createEvent(Key.space));
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 2);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.upArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.leftArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.rightArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 4);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 5);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 6);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 7);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.rightArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.rightArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.home));
        mode.onKeyDown(createEvent(Key.space));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 0);
        verifySelection(mode, []);
        mode.onKeyDown(createEvent(Key.end));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        verifySelection(mode, []);
    };

    this.testPickerMultiMode = function () {
        var siteConfig = {
            selectionMode: "multi",
            tap: "toggleSelect",
            crossSlide: true
        };
        var mode = createMode(createSite(siteConfig));

        click(mode, { target: items[0] });
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(0, invoked.index);

        click(mode, { target: items[3] });
        verifySelection(mode, [0, 3]);
        LiveUnit.Assert.areEqual(3, invoked.index);

        click(mode, { target: items[5], shiftKey: true });
        verifySelection(mode, [0, 3, 4, 5]);

        click(mode, { target: items[5] });
        verifySelection(mode, [0, 3, 4]);

        list.addEventListener("selectionchanging", blockSelectWithTap, false);
        click(mode, { target: items[2] });
        verifySelection(mode, [0, 3, 4]);
        list.removeEventListener("selectionchanging", blockSelectWithTap, false);

        verifyRangeSelectionWithClick({
            shiftLeftClickIsAdditive: true,
            createSite: function () { return createSite(siteConfig); }
        });
    };

    this.testPickerMultiModeKeyboard = function () {
        var siteConfig = {
            selectionMode: "multi",
            tap: "toggleSelect",
            crossSlide: true
        };
        var site = createSite(siteConfig);
        var mode = createMode(site);

        verifySelection(mode, []);
        mode.onKeyDown(createEvent(Key.space));
        mode.onKeyDown(createEvent(Key.downArrow));
        verifySelection(mode, [0]);
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [0, 1]);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [0]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 2);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [0, 2]);
        mode.onKeyDown(createEvent(Key.upArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [0, 1, 2]);
        mode.onKeyDown(createEvent(Key.leftArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 1);
        verifySelection(mode, [0, 1, 2]);
        mode.onKeyDown(createEvent(Key.rightArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 4);
        verifySelection(mode, [0, 1, 2]);
        mode.onKeyDown(createEvent(Key.downArrow));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 5);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [0, 1, 2, 5]);

        mode.onKeyDown(createEvent(Key.home));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 0);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [1, 2, 5]);
        mode.onKeyDown(createEvent(Key.end));
        LiveUnit.Assert.areEqual(site.keyboardFocusedItem.index, 8);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [1, 2, 5, 8]);
        mode.onKeyDown(createEvent(Key.space));
        verifySelection(mode, [1, 2, 5]);

        verifyRangeSelectionWithKeyboard({
            shiftArrowIsAdditive: true,
            createSite: function () { return createSite(siteConfig); }
        });
    };

    (this.generatePickerMultiModeUITests = function generatePickerMultiModeUITests() {
        [
            { name: "GridLayout", type: WinJS.UI.GridLayout, orientation: WinJS.UI.Orientation.vertical },
            { name: "ListLayout", type: WinJS.UI.ListLayout }
        ].forEach(function (layoutDescriptor) {
            this["testPickerMultiModeUI_" + layoutDescriptor.name] = function () {
                var lv = new WinJS.UI.ListView(undefined, {
                    selectionMode: WinJS.UI.SelectionMode.none,
                    tapBehavior: WinJS.UI.TapBehavior.invokeOnly,
                    layout: layoutDescriptor
                });
                LiveUnit.Assert.areEqual(0, lv.element.querySelectorAll("." + WinJS.UI._selectionModeClass).length);

                lv.selectionMode = WinJS.UI.SelectionMode.multi;
                lv.tapBehavior = WinJS.UI.TapBehavior.toggleSelect;

                if (WinJS.Utilities.isPhone) {
                    LiveUnit.Assert.areEqual(1, lv.element.querySelectorAll("." + WinJS.UI._selectionModeClass).length);
                } else {
                    LiveUnit.Assert.areEqual(0, lv.element.querySelectorAll("." + WinJS.UI._selectionModeClass).length);
                }

                lv.selectionMode = WinJS.UI.SelectionMode.none;
                LiveUnit.Assert.areEqual(0, lv.element.querySelectorAll("." + WinJS.UI._selectionModeClass).length);

                lv.selectionMode = WinJS.UI.SelectionMode.multi;
                lv.tapBehavior = WinJS.UI.TapBehavior.invokeOnly;
                LiveUnit.Assert.areEqual(0, lv.element.querySelectorAll("." + WinJS.UI._selectionModeClass).length);
            };
        }.bind(this));
    }.bind(this))();

    // Ensure that onContextMenu calls preventDefault when an item is clicked and the selection mode is not none
    this.testContextMenu = function () {
        function testWithSelectionMode(selectionMode) {
            var mode = createMode(createSite({
                selectionMode: selectionMode,
                tap: "none",
                crossSlide: false
            })),
                eventObject;

            eventObject = eventOnElement(items[0]);
            mode.onContextMenu(eventObject);
            LiveUnit.Assert.areEqual(eventObject.defaultPrevented, selectionMode !== "none");

            eventObject = eventOnElement(list);
            mode.onContextMenu(eventObject);
            LiveUnit.Assert.areEqual(eventObject.defaultPrevented, false);
        }

        testWithSelectionMode("none");
        testWithSelectionMode("single");
        testWithSelectionMode("multi");
    };

    this.generateDataChangeInSelChangedHandler = function (layoutName) {
        this["testDataChangeInSelChangedHandler" + layoutName] = function (complete) {

            function test(tap, ctrl) {
                return new WinJS.Promise(function (complete) {
                    LiveUnit.LoggingCore.logComment("testing " + tap + " mode");
                    var myData = [];
                    for (var i = 0; i < 10; ++i) {
                        myData.push({ title: "Tile" + i });
                    }
                    var newNode = document.createElement("div");
                    newNode.style.width = "1000px";
                    newNode.style.height = "600px";
                    document.body.appendChild(newNode);
                    var listView = new WinJS.UI.ListView(newNode, {
                        itemDataSource: (new WinJS.Binding.List(myData)).dataSource,
                        selectionMode: "multi",
                        tapBehavior: tap

                    });
                    listView.addEventListener("selectionchanged", function (eventObject) {
                        listView.itemDataSource = (new WinJS.Binding.List([])).dataSource;
                        listView.layout = new WinJS.UI[layoutName]();
                    });

                    listView._canvas.setPointerCapture = function () {
                    };

                    runTests(listView, [
                        function () {
                            LiveUnit.Assert.areEqual(myData.length, newNode.querySelectorAll(".win-item").length);
                            click(listView._currentMode(), { target: listView.elementFromIndex(1), ctrlKey: ctrl });
                            return true;
                        },
                        function () {
                            LiveUnit.Assert.areEqual(0, newNode.querySelectorAll(".win-item").length);
                            document.body.removeChild(newNode);
                            complete();
                        }
                    ]);
                });
            }

            test("invokeOnly", true).then(function () {
                if (utilities.isPhone) {
                    return WinJS.Promise.wrap();
                } else {
                    return test("directSelect");
                }
            }).then(function () {
                return test("toggleSelect");
            }).then(complete);
        };
    };
    this.generateDataChangeInSelChangedHandler("GridLayout");
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.SelectionModeTests");
