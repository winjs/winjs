// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";

    var list,
        proxy,
        first,
        second,
        focused,
        invoked,
        currentMode,
        layoutToDataIndex,
        Key = WinJS.Utilities.Key;

    var ListView = <typeof WinJS.UI.PrivateListView> WinJS.UI.ListView;

    var callbacks = [];
    var oldRequestAnimationFrame;
    var oldHasWinRT;
    var _oldMaxTimePerCreateContainers;
    var defaultPrevented;

    function mockRequestAnimationFrame() {
        window.requestAnimationFrame = function (callback) {
            callbacks.push(callback);
            return 0;
        };
    }

    function forceRequestAnimationFrames() {
        while (callbacks.length) {
            callbacks.shift()();
        }
    }

    function createKeyEvent(element, key, preventDefaultHandler?, stopPropagationHandler?, altKey?, ctrlKey?, shiftKey?) {
        return {
            keyCode: key,
            target: element,
            altKey: altKey,
            ctrlKey: ctrlKey,
            shiftKey: shiftKey,
            stopPropagation: function () {
                if (stopPropagationHandler) {
                    stopPropagationHandler();
                }
            },
            preventDefault: function () {
                if (preventDefaultHandler) {
                    preventDefaultHandler();
                }
            }
        };
    }

    function isEmptyArray(array) {
        LiveUnit.Assert.areEqual(array.length, 0);
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

    function createModeForTabTests(element) {
        var mode = new WinJS.UI._SelectionMode({
            _element: element,
            _isZombie: function () { return true; },
            _selection: {
                _getFocused: function () {
                    return mode._focused;
                }
            },
            _changeFocus: function (entity) {
                mode._focused = entity;
                if (entity.type === WinJS.UI.ObjectType.item) {
                    mode.site._groupFocusCache.updateCache("" + Math.floor(entity.index / 10), "" + entity.index, entity.index);
                }
                mode.site.focus();
            },
            _groups: {
                groupFromItem: function (index) {
                    return Math.floor(index / 10);
                },
                group: function (index) {
                    return {
                        key: "" + index
                    };
                },
                fromKey: function (key) {
                    return {
                        group: {
                            startIndex: +key * 10
                        }
                    };
                },
                length: function () {
                    return 100;
                },
            },
            _lastFocusedElementInGroupTrack: { type: WinJS.UI.ObjectType.item, index: -1 },
            _rtl: function () {
                return false;
            },
            _supportsGroupHeaderKeyboarding: true
        });
        mode.site._groupFocusCache = new WinJS.UI._GroupFocusCache(mode.site);
        mode.site.focus = function () {
            mode.site._hasKeyboardFocus = true;
        };
        mode.site.unfocus = function () {
            mode.site._hasKeyboardFocus = false;
        };
        mode.site._changeFocus({ type: WinJS.UI.ObjectType.item, index: 0 });
        return mode;
    }

    function createMode() {
        var mode = new WinJS.UI._SelectionMode({
            _groups: new WinJS.UI._NoGroups(this),
            _versionManager: new WinJS.UI._VersionManager(),
            _element: list,
            _viewport: list,
            _canvas: list,
            _canvasProxy: proxy,
            _cachedCount: 10,
            _isZombie: function () { return true; },
            _selection: {
                focused: { type: WinJS.UI.ObjectType.item, index: 0 },
                clear: function () {
                },
                set: function () {
                },
                _isIncluded: function () {
                    return false;
                },
                _getFocused: function () {
                    return focused;
                },
                _setFocused: function (f) {
                    focused = f;
                },
                getRanges: function () {
                    return [];
                }
            },
            _options: {},
            keyboardFocusedItem: { type: WinJS.UI.ObjectType.item, index: 0 },
            _lastFocusedElementInGroupTrack: { type: WinJS.UI.ObjectType.item, index: -1 },
            _unsetFocusOnItem: function () {
                this.keyboardFocusedItem = -1;
            },
            _setFocusOnItem: function (item) {
                this.keyboardFocusedItem = item;
            },
            scrollPosition: 0,
            _getViewportLength: function () {
                return 350;
            },
            _setupTabOrder: function () {
            },
            addEventListener: function () {
            },
            removeEventListener: function () {
            },
            ensureVisible: function () {
            },
            _rtl: function () {
                return false;
            },
            _view: {
                getAdjacent: function (oldFocus, direction) {
                    return mode.site._layout.getKeyboardNavigatedItem(oldFocus, null, direction);
                },
                items: {
                    _itemFrom: function (element) {
                        while (element && element !== first && element !== second) {
                            element = element.parentNode;
                        }
                        return element;
                    },
                    index: function (element) {
                        switch (this._itemFrom(element)) {
                            case first:
                                return 0;
                            case second:
                                return 1;
                        }
                    },
                    itemDataAt: function (index) {
                        var element = index ? second : first;
                        return {
                            element: element,
                            container: element,
                            itemBox: element
                        };
                    },
                    itemAt: function (index) {
                        return this.itemDataAt(index).element;
                    },
                    containerAt: function (index) {
                        return this.itemDataAt(index).container;
                    },
                    itemBoxAt: function (index) {
                        return this.itemDataAt(index).itemBox;
                    }
                },
                lastItemIndex: function () {
                    return 8;
                }
            },
            _changeFocus: function (newFocus) {
                focused = newFocus;
                this.keyboardFocusedItem = newFocus;
            },
            _selectOnTap: function () {
                return false;
            },
            _selectionAllowed: function () {
                return false;
            },
            _selectFocused: function () {
                return false;
            },
            _renderSelection: function () {
            },
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
            _groupsEnabled: function () {
                return false;
            }
        });
        mode._fireInvokeEvent = function (entity) {
            invoked = entity;
        };

        return mode;
    }

    // As a side effect, this will scroll the browser to make the element visible
    function createPointerUpEvent(element) {
        element.scrollIntoView(false);
        var rect = element.getBoundingClientRect();
        // Simulate clicking the middle of the element
        return {
            target: element,
            clientX: (rect.left + rect.right) / 2,
            clientY: (rect.top + rect.bottom) / 2,
            defaultPrevented: false,
            preventDefault: function () {
                this.defaultPrevented = true;
            },
            button: undefined
        };
    }

    export class BrowseModeTests {



        // This is the setup function that will be called at the beginning of each test function.
        setUp() {

            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = "BrowseModeTests";
            newNode.innerHTML =
            "<div id='list' style='width:350px; height:400px'></div>" +
            "<div id='proxy'>" +
            "<div id='first'>" +
            "<div>Label</div>" +
            "</div>" +
            "<div id='second'>" +
            "<div>Label</div>" +
            "</div>" +
            "</div>";
            document.body.appendChild(newNode);

            list = document.getElementById("list");
            proxy = document.getElementById("proxy");
            first = document.getElementById("first");
            second = document.getElementById("second");

            proxy.setPointerCapture = function () { };
            proxy.releasePointerCapture = function () { };
            list.setPointerCapture = function () { };
            list.releasePointerCapture = function () { };

            callbacks = [];
            oldRequestAnimationFrame = window.requestAnimationFrame;

            oldHasWinRT = WinJS.Utilities.hasWinRT;
            WinJS.Utilities._setHasWinRT(false);

            focused = { type: WinJS.UI.ObjectType.item, index: 0 };
            invoked = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };
            currentMode = null;
            layoutToDataIndex = [];
            defaultPrevented = false;

            //WinBlue: 298587
            _oldMaxTimePerCreateContainers = WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers;
            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = Number.MAX_VALUE;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            WinJS.UI._VirtualizeContentsView._maxTimePerCreateContainers = _oldMaxTimePerCreateContainers;
            window.requestAnimationFrame = oldRequestAnimationFrame;
            WinJS.Utilities._setHasWinRT(oldHasWinRT);

            var element = document.getElementById("BrowseModeTests");
            document.body.removeChild(element);
        }
        
        // Test methods
        // Any child objects that start with "test" are automatically test methods
        testSimpleClick(complete) {
            LiveUnit.LoggingCore.logComment("In testSimpleClick");
            mockRequestAnimationFrame();

            var browseMode = createMode();

            invoked = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };

            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            browseMode.onPointerDown({ target: first, button: WinJS.UI._LEFT_MSPOINTER_BUTTON, preventDefault: function () { } });
            forceRequestAnimationFrames();
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            browseMode.onPointerUp(createPointerUpEvent(first));
            browseMode.onclick();
            WinJS.Utilities._setImmediate(function () {
                LiveUnit.Assert.areEqual(0, invoked.index);
                LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
                complete();
            });
        }

        testInvokeEvent(complete) {
            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }

            var listView = new ListView(list, {
                itemDataSource: new WinJS.Binding.List(items).dataSource
            });
            Helper.ListView.waitForReady(listView, -1)().then(function () {
                var gotItemInvokedEvent = false;
                listView.addEventListener("iteminvoked", function () {
                    gotItemInvokedEvent = true;
                });

                listView.tapBehavior = WinJS.UI.TapBehavior.none;
                listView.selectionMode = WinJS.UI.SelectionMode.none;
                var firstItem = listView.elementFromIndex(0);
                listView._mode.onKeyDown(createKeyEvent(firstItem, Key.enter));
                LiveUnit.Assert.isFalse(gotItemInvokedEvent);

                listView.tapBehavior = WinJS.UI.TapBehavior.invokeOnly;
                listView._mode.onKeyDown(createKeyEvent(firstItem, Key.enter));
                LiveUnit.Assert.isTrue(gotItemInvokedEvent);
                gotItemInvokedEvent = false;

                listView.tapBehavior = WinJS.UI.TapBehavior.toggleSelect;
                listView.selectionMode = WinJS.UI.SelectionMode.single;
                listView._mode.onKeyDown(createKeyEvent(firstItem, Key.enter));
                LiveUnit.Assert.isTrue(gotItemInvokedEvent);
                gotItemInvokedEvent = false;

                listView.selectionMode = WinJS.UI.SelectionMode.multi;
                listView._mode.onKeyDown(createKeyEvent(firstItem, Key.enter));
                LiveUnit.Assert.isFalse(gotItemInvokedEvent);

                complete();
            });
        }

        // Verify that right-click doesn't trigger the pressed visual when selection is disabled
        testRightClickDisabled(complete) {
            LiveUnit.LoggingCore.logComment("In testRightClickDisabled");
            mockRequestAnimationFrame();

            var browseMode = createMode();
            browseMode.site._selectionMode = "none";

            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            browseMode.onPointerDown({ target: first, button: WinJS.UI._RIGHT_MSPOINTER_BUTTON, preventDefault: function () { } });
            forceRequestAnimationFrames();
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            browseMode.onPointerUp(createPointerUpEvent(first));
            browseMode.onclick();
            WinJS.Utilities._setImmediate(function () {
                LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
                complete();
            });
        }

        testDownMoveUp(complete) {
            LiveUnit.LoggingCore.logComment("In testDownMoveUp");
            mockRequestAnimationFrame();

            var browseMode = createMode();

            invoked = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));

            browseMode.onPointerDown({ target: first, button: WinJS.UI._LEFT_MSPOINTER_BUTTON, preventDefault: function () { } });
            forceRequestAnimationFrames();

            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, invoked.index);

            browseMode.onPointerUp(createPointerUpEvent(second));
            browseMode.onclick();
            WinJS.Utilities._setImmediate(function () {
                LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
                LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));
                complete();
            });
        }

        testMoveUp() {
            LiveUnit.LoggingCore.logComment("In testMoveUp");

            var browseMode = createMode();

            invoked = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));

            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));
            LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, invoked.index);

            browseMode.onPointerUp(createPointerUpEvent(second));
            browseMode.onclick();
            LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, invoked.index);
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));
        }

        testDownMoveBackUp(complete) {
            LiveUnit.LoggingCore.logComment("In testDownMoveBackUp");
            mockRequestAnimationFrame();

            var browseMode = createMode();

            invoked = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));

            browseMode.onPointerDown({ target: first, button: WinJS.UI._LEFT_MSPOINTER_BUTTON, preventDefault: function () { } });
            forceRequestAnimationFrames();

            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, invoked.index);

            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
            LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));
            LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, invoked.index);

            browseMode.onPointerUp(createPointerUpEvent(first));
            browseMode.onclick();
            WinJS.Utilities._setImmediate(function () {
                LiveUnit.Assert.areEqual(0, invoked.index);
                LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(first, WinJS.UI._pressedClass));
                LiveUnit.Assert.isTrue(!WinJS.Utilities.hasClass(second, WinJS.UI._pressedClass));
                complete();
            });
        }

        testKeyboard() {
            var Key = WinJS.Utilities.Key;
            var browseMode = createMode();

            // We're pretending to be a 3x3 horizontal grid here
            browseMode.site._layout = {
                getKeyboardNavigatedItem: function (entity, element, keyPressed) {
                    if (keyPressed === WinJS.Utilities.Key.upArrow) {
                        return WinJS.Promise.wrap({ type: WinJS.UI.ObjectType.item, index: entity.index - 1 });
                    } else if (keyPressed === WinJS.Utilities.Key.downArrow) {
                        return WinJS.Promise.wrap({ type: WinJS.UI.ObjectType.item, index: entity.index + 1 });
                    } else if (keyPressed === WinJS.Utilities.Key.leftArrow) {
                        return WinJS.Promise.wrap({ type: WinJS.UI.ObjectType.item, index: entity.index - 3 });
                    } else if (keyPressed === WinJS.Utilities.Key.rightArrow) {
                        return WinJS.Promise.wrap({ type: WinJS.UI.ObjectType.item, index: entity.index + 3 });
                    } else if (keyPressed === WinJS.Utilities.Key.pageUp) {
                        return WinJS.Promise.wrap({ type: WinJS.UI.ObjectType.item, index: 0 });
                    } else if (keyPressed === WinJS.Utilities.Key.pageDown) {
                        return WinJS.Promise.wrap({ type: WinJS.UI.ObjectType.item, index: 8 });
                    }
                }
            };

            var ensureVisibleCalled = false;
            browseMode.site.ensureVisible = function (index) {
                ensureVisibleCalled = true;
            }

            function createKeyEvent(key) {
                return {
                    keyCode: key,
                    target: first,
                    stopPropagation: function () { },
                    preventDefault: function () { }
                };
            }

            browseMode.onKeyDown(createKeyEvent(Key.upArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 1);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 2);
            browseMode.onKeyDown(createKeyEvent(Key.upArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 1);
            browseMode.onKeyDown(createKeyEvent(Key.leftArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 1);
            browseMode.onKeyDown(createKeyEvent(Key.rightArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 4);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 5);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 6);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 7);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            ensureVisibleCalled = false;
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            browseMode.onKeyDown(createKeyEvent(Key.rightArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            browseMode.onKeyDown(createKeyEvent(Key.rightArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            browseMode.onKeyDown(createKeyEvent(Key.home));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);
            ensureVisibleCalled = false;
            browseMode.onKeyDown(createKeyEvent(Key.home));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);
            browseMode.onKeyDown(createKeyEvent(Key.end));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            ensureVisibleCalled = false;
            browseMode.onKeyDown(createKeyEvent(Key.end));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);

            browseMode.onKeyDown(createKeyEvent(Key.pageDown));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            ensureVisibleCalled = false;
            browseMode.onKeyDown(createKeyEvent(Key.pageDown));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            browseMode.onKeyDown(createKeyEvent(Key.leftArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 5);
            browseMode.onKeyDown(createKeyEvent(Key.pageDown));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            browseMode.onKeyDown(createKeyEvent(Key.pageUp));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);

            invoked = { type: WinJS.UI.ObjectType.item, index: WinJS.UI._INVALID_INDEX };
            browseMode.onKeyDown(createKeyEvent(Key.end));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 8);
            browseMode.onKeyDown(createKeyEvent(Key.enter));
            LiveUnit.Assert.areEqual(invoked.index, 8);

            browseMode.onKeyDown(createKeyEvent(Key.home));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);
            function onKeyboardNavigating_handler(event) {
                if (event.detail.newFocus > 4) {
                    event.preventDefault();
                }
            }
            document.body.addEventListener("keyboardnavigating", onKeyboardNavigating_handler);
            browseMode.onKeyDown(createKeyEvent(Key.end));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);
            browseMode.onKeyDown(createKeyEvent(Key.rightArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 3);
            browseMode.onKeyDown(createKeyEvent(Key.rightArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 3);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 4);
            browseMode.onKeyDown(createKeyEvent(Key.downArrow));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 4);
            browseMode.onKeyDown(createKeyEvent(Key.pageDown));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 4);
            browseMode.onKeyDown(createKeyEvent(Key.pageUp));
            LiveUnit.Assert.areEqual(browseMode.site.keyboardFocusedItem.index, 0);
            document.body.removeEventListener("keyboardnavigating", onKeyboardNavigating_handler);
        }

    testInvocableHeaders(complete) {
            var host = <HTMLElement>document.querySelector("#list");
            host.style.position = "absolute"; //this test requires the element not to scroll
            host.style.top = "0";

            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: i + "" });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 2) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 2) + "" };
                });

            var lv = new ListView(host);
            lv.itemTemplate = lv.groupHeaderTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.width = "50px";
                    div.style.height = "50px";
                    div.style.backgroundColor = "red";
                    return div;
                });
            };
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;

            var numInvokes = 0;
            var gotEventFromOnEvent = 0;
            lv.ongroupheaderinvoked = function (e) {
                LiveUnit.Assert.areEqual(e.detail.groupHeaderIndex, 2);
                if (++gotEventFromOnEvent === 2 && numInvokes === 2) {
                    complete();
                }
            };
            lv.addEventListener("groupheaderinvoked", function (e) {
                LiveUnit.Assert.areEqual(e.detail.groupHeaderIndex, 2);
                if (++numInvokes === 2 && gotEventFromOnEvent === 2) {
                    complete();
                }
            });

            lv.indexOfFirstVisible = 4; //ensure group 2 is visible on the screen
            Helper.ListView.waitForReady(lv, -1)().then(function () {
                var header = lv.element.querySelectorAll(".win-groupheader")[2];
                lv._changeFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 2 }, true, false, false, true);
                lv._mode.onKeyDown({ target: header, keyCode: 13, stopPropagation: function () { }, preventDefault: function () { } });

                var e = createPointerUpEvent(header);
                e.button = WinJS.UI._LEFT_MSPOINTER_BUTTON;
                lv._mode.onPointerDown(e);
                lv._mode.onPointerUp(e);
            });
        }

        testTabbingToHeaderFromChildElementDrawsFocusRect(complete) {
            var data = [];
            for (var i = 0; i < 20; i++) {
                data.push({ data: i });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 2) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 2) + "" };
                });

            var lv = new ListView();
            lv.layout['groupHeaderPosition'] = "left";
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;
            lv.groupHeaderTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.style.width = "200px";
                    div.style.height = "200px";

                    var innerDiv = document.createElement("div");
                    innerDiv.innerHTML = item.data.data;

                    var button = document.createElement("input");
                    button.classList.add("testHeaderButtonClass");
                    button.type = "button";
                    button.value = "button";

                    div.appendChild(innerDiv);
                    div.appendChild(button);

                    return div;
                });
            };
            document.body.appendChild(lv.element);

            var headerButton;
            Helper.ListView.waitForReady(lv, -1)().then(function () {
                headerButton = document.querySelector(".testHeaderButtonClass");
                headerButton.focus();

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    lv._keyboardFocusInbound = true;
                    headerButton.parentNode.focus();

                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.isTrue(headerButton.parentNode.classList.contains(WinJS.UI._itemFocusClass));
                    document.body.removeChild(lv.element);
                    complete();
                });
        }

        testPointerDownOnHeaderAndUpOnItemShouldNotInvoke(complete) {
            var host = <HTMLElement>document.querySelector("#list");
            host.style.position = "absolute"; //this test requires the element not to scroll
            host.style.top = "0";

            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: i + "" });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 2) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 2) + "" };
                });

            var lv = new ListView(host);
            lv.itemTemplate = lv.groupHeaderTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.textContent = item.data.data;
                    div.style.width = "50px";
                    div.style.height = "50px";
                    div.style.backgroundColor = "red";
                    return div;
                });
            };
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;

            lv.addEventListener("groupheaderinvoked", function (e) {
                LiveUnit.Assert.fail("group header should not be invoked");
            });

            lv.indexOfFirstVisible = 4; //ensure group 2 is visible on the screen
            Helper.ListView.waitForReady(lv, -1)().then(function () {
                var header = lv.element.querySelector(".win-groupheader");
                var item = lv.element.querySelector(".win-item");

                var e = createPointerUpEvent(header);
                e.button = WinJS.UI._LEFT_MSPOINTER_BUTTON;
                lv._mode.onPointerDown(e);

                e = createPointerUpEvent(item);
                e.button = WinJS.UI._LEFT_MSPOINTER_BUTTON;
                lv._mode.onPointerUp(e);

                return Helper.ListView.waitForReady(lv, -1)();
            }).done(function () {
                    complete();
                });
        }

        testOnTabExiting() {
            // This test mode mimics a ListView with infinite number of groups,
            // where each group has 10 items: group0 has items 0-9, group1 has items 10-19, etc
            var prevent = false;
            var element = document.createElement("div");
            element.addEventListener("keyboardnavigating", function (e) {
                if (prevent) {
                    e.preventDefault();
                }
            });
            var mode = createModeForTabTests(element);

            mode.site._changeFocus({ type: WinJS.UI.ObjectType.item, index: 11 });

            // Tab forward from item11, but prevent navigation
            prevent = true;
            mode.onTabExiting({ detail: 1, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(11, mode.site._selection._getFocused().index);
            prevent = false;

            // Tab forward from item11, should go to group1
            mode.onTabExiting({ detail: 1, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(1, mode.site._selection._getFocused().index);

            // Tab backwards from group1, but prevent navigation
            prevent = true;
            mode.onTabExiting({ detail: 0, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(1, mode.site._selection._getFocused().index);
            prevent = false;

            // Tab backwards from group1, should go to item11
            mode.onTabExiting({ detail: 0, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(11, mode.site._selection._getFocused().index);

            // Tab backwards from item11, leaving listView, should not change our internal focus state
            mode.onTabExiting({ detail: 0, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(11, mode.site._selection._getFocused().index);

            // Tab forward from group1, leaving listView, should not change our internal focus state
            mode.site._changeFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 1 });
            mode.onTabExiting({ detail: 1, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(1, mode.site._selection._getFocused().index);

        }

        testOnTabEntered() {
            // This test mode mimics a ListView with infinite number of groups,
            // where each group has 10 items: group0 has items 0-9, group1 has items 10-19, etc
            var fireCount = 0;
            var element = document.createElement("div");
            element.addEventListener("keyboardnavigating", function (e) {
                fireCount++;
            });
            var mode = createModeForTabTests(element);

            mode.site._changeFocus({ type: WinJS.UI.ObjectType.item, index: 11 });
            mode.site.unfocus();

            // Tab forward into the listView, focus should go to item11
            var curFireCount = fireCount;
            mode.onTabEntered({ detail: 1, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(11, mode.site._selection._getFocused().index);
            LiveUnit.Assert.areEqual(curFireCount, fireCount);

            mode.site._changeFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 1 });
            mode.site.unfocus();

            // Tab forward into the listView, focus should go to item11
            // even though the last focused entity was a header
            curFireCount = fireCount;
            mode.onTabEntered({ detail: 1, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(11, mode.site._selection._getFocused().index);
            LiveUnit.Assert.areEqual(curFireCount + 1, fireCount);

            mode.site._changeFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 1 });
            mode.site.unfocus();

            // Tab backwards into the listView, focus should go to header1
            curFireCount = fireCount;
            mode.onTabEntered({ detail: 0, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(1, mode.site._selection._getFocused().index);
            LiveUnit.Assert.areEqual(curFireCount, fireCount);

            mode.site._changeFocus({ type: WinJS.UI.ObjectType.item, index: 11 });
            mode.site.unfocus();

            // Tab backwards into the listView, focus should go to header1
            // even though the last focused entity was an item
            curFireCount = fireCount;
            mode.onTabEntered({ detail: 0, preventDefault: function () { } });
            LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, mode.site._selection._getFocused().type);
            LiveUnit.Assert.areEqual(1, mode.site._selection._getFocused().index);
            LiveUnit.Assert.areEqual(curFireCount + 1, fireCount);
        }

        testResetPointerStateAfterPressingEnterOnHeader(complete) {
            Helper.initUnhandledErrors();

            var data = [];
            for (var i = 0; i < 10; i++) {
                data.push({ data: i + "" });
            }
            var list = new WinJS.Binding.List(data);
            var glist = list.createGrouped(function (item) {
                return Math.floor(item.data / 2) + "";
            }, function (item) {
                    return { data: Math.floor(item.data / 2) + "" };
                });

            var lv = new ListView(<HTMLElement>document.querySelector("#list"));
            lv.itemDataSource = glist.dataSource;
            lv.groupDataSource = glist.groups.dataSource;

            Helper.ListView.waitForReady(lv, -1)().
                then(function () {
                    lv.currentItem = { type: WinJS.UI.ObjectType.groupHeader, index: 0 };
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.enter));
                    lv._mode._itemEventsHandler.resetPointerDownState();

                    return Helper.ListView.waitForReady(lv, -1)();
                }).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testKeyboardingBeforeTreeCreated(complete) {
            Helper.initUnhandledErrors();

            var placeholder = document.createElement("div");
            placeholder.style.width = "300px";
            placeholder.style.height = "300px";
            document.body.appendChild(placeholder);

            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }
            var list = new WinJS.Binding.List(items);


            var layout = {
                initialize: function (site, groups) {
                }
            };
            var layouSignal = new WinJS._Signal();

            Object.defineProperty(layout, "numberOfItemsPerItemsBlock", {
                get: function () {
                    return layouSignal.promise;
                }
            });

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                layout: layout
            });

            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.end));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.home));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.leftArrow));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.rightArrow));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.upArrow));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.downArrow));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.pageUp));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.pageDown));
            listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.enter));

            layouSignal.complete(10);

            Helper.ListView.waitForReady(listView)().
                then(Helper.validateUnhandledErrorsOnIdle).
                done(function () {

                    document.body.removeChild(placeholder);
                    complete();
                });
        }


        testKeyboardReorderStopsPropagationOnArrowKeyUp(complete) {
            if (!WinJS.Utilities.isPhone) {
                return complete();
            }
            var placeholder = document.createElement("div");
            placeholder.style.width = "300px";
            placeholder.style.height = "300px";
            document.body.appendChild(placeholder);

            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }
            var list = new WinJS.Binding.List(items);

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemsReorderable: true
            });

            var count = 0;
            function incCount() {
                count++;
            }
            Helper.ListView.waitForReady(listView, -1)().done(function () {
                listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.alt));
                listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.shift, null, null, true));
                listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.leftArrow, null, null, true, false, true));

                listView._mode.onKeyUp(createKeyEvent(listView._canvas, Key.leftArrow, incCount, incCount, true, false, true));

                LiveUnit.Assert.areEqual(2, count);

                listView.dispose();
                document.body.removeChild(placeholder);
                complete();
            });
        }

        testKeyboardReorderStopsPropagationOnShiftThenArrowKeyUp(complete) {
            if (!WinJS.Utilities.isPhone) {
                return complete();
            }
            var placeholder = document.createElement("div");
            placeholder.style.width = "300px";
            placeholder.style.height = "300px";
            document.body.appendChild(placeholder);

            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }
            var list = new WinJS.Binding.List(items);

            var listView = new ListView(placeholder, {
                itemDataSource: list.dataSource,
                itemsReorderable: true
            });

            var count = 0;
            function incCount() {
                count++;
            }
            Helper.ListView.waitForReady(listView, -1)().done(function () {
                listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.alt));
                listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.shift, null, null, true));
                listView._mode.onKeyDown(createKeyEvent(listView._canvas, Key.leftArrow, null, null, true, false, true));

                listView._mode.onKeyUp(createKeyEvent(listView._canvas, Key.shift, null, null, true));
                listView._mode.onKeyUp(createKeyEvent(listView._canvas, Key.leftArrow, incCount, incCount, true));

                LiveUnit.Assert.areEqual(2, count);

                listView.dispose();
                document.body.removeChild(placeholder);
                complete();
            });
        }

    };

    function generateChangeDataSourceInInvoke(layoutName) {
        BrowseModeTests.prototype["testChangeDataSourceInInvoke" + layoutName] = function (complete) {
            var bindingList1 = new WinJS.Binding.List(["a", "b", "c", "d"]);

            var listView = new ListView(list, {
                itemDataSource: bindingList1.dataSource,
                layout: new WinJS.UI[layoutName](),
                itemTemplate: function (itemPromise) {
                    var element = document.createElement("div");
                    element.style.width = "100";
                    element.style.height = "100";
                    element.style.backgroundColor = "#777";
                    return {
                        element: element,
                        renderComplete: itemPromise.then(function (item) {
                            element.textContent = '' + item.data;
                        })
                    };
                }
            });

            listView._canvas.setPointerCapture = function () { };
            var tests = [function () {
                var elements = list.querySelectorAll('.win-container');
                LiveUnit.Assert.areEqual(4, elements.length);
                // Click on the 4th item and then switch to a data source with 3 items
                listView._currentMode().onPointerDown({ target: elements[3], button: WinJS.UI._LEFT_MSPOINTER_BUTTON, preventDefault: function () { } });
                listView._currentMode().onPointerUp(createPointerUpEvent(elements[3]));
                listView._currentMode().onclick();
            }, function () {
                    var elements = list.querySelectorAll('.win-container');
                    LiveUnit.Assert.areEqual(3, elements.length);

                    // Press enter on the 3rd item and then switch to a data source with 2 items
                    listView._selection._setFocused({ type: WinJS.UI.ObjectType.item, index: 2 }, true);
                    listView._currentMode().onKeyDown({
                        target: elements[2],
                        preventDefault: function () { },
                        stopPropagation: function () { },
                        keyCode: WinJS.Utilities.Key.enter
                    });
                }, function () {
                    var elements = list.querySelectorAll('.win-container');
                    LiveUnit.Assert.areEqual(2, elements.length);
                    complete();
                }];

            var i = 0;

            listView.addEventListener('iteminvoked', function () {
                if (i === 0) {
                    var bindingList2 = new WinJS.Binding.List(["x", "y", "z"]);
                    listView.itemDataSource = bindingList2.dataSource;
                    i++;
                } else {
                    var bindingList2 = new WinJS.Binding.List(["first", "second"]);
                    listView.itemDataSource = bindingList2.dataSource;
                }
            });

            Helper.ListView.runTests(listView, tests);
        };
    };
    generateChangeDataSourceInInvoke("GridLayout");

    function generateInvokeOnUnrealizedItem(layoutName) {
        BrowseModeTests.prototype["testInvokeOnUnrealizedItem" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 1000; i++) {
                data.push("Item" + i);
            }
            var bindingList = new WinJS.Binding.List(data);

            var listView = new ListView(list, {
                itemDataSource: bindingList.dataSource,
                layout: new WinJS.UI[layoutName](),
                itemTemplate: function (itemPromise) {
                    var element = document.createElement("div");
                    element.style.width = "100px";
                    element.style.height = "100px";
                    return {
                        element: element,
                        renderComplete: itemPromise.then(function (item) {
                            element.textContent = item.data;
                        })
                    };
                },
                currentItem: {
                    index: 4,
                    hasFocus: true
                }
            });

            listView._canvas.setPointerCapture = function () { };

            var expectingInvokeEvent = false,
                gotInvokeEvent = false,
                targetElement = null;

            listView.addEventListener('iteminvoked', function (e) {
                LiveUnit.Assert.isTrue(expectingInvokeEvent);
                gotInvokeEvent = true;
                if (expectingInvokeEvent) {
                    expectingInvokeEvent = false;
                }
            });

            Helper.ListView.waitForDeferredAction(listView)().then(function () {
                targetElement = listView._tabManager.childFocus;
                expectingInvokeEvent = true;
                LiveUnit.Assert.areEqual("Item4", targetElement.textContent);

                listView._currentMode().onKeyDown({
                    target: targetElement,
                    preventDefault: function () { },
                    stopPropagation: function () { },
                    keyCode: WinJS.Utilities.Key.enter
                });

                return WinJS.Promise.timeout();
            }).then(function () {
                    LiveUnit.Assert.isTrue(targetElement === listView._tabManager.childFocus);
                    LiveUnit.Assert.isTrue(gotInvokeEvent);
                    gotInvokeEvent = false;
                    var scrollPos = WinJS.Utilities.getScrollPosition(listView._viewport);
                    scrollPos.scrollLeft += 5000;
                    WinJS.Utilities.setScrollPosition(listView._viewport, scrollPos);

                    return Helper.ListView.waitForDeferredAction(listView)();
                }).then(function () {
                    LiveUnit.Assert.isFalse(listView.element.contains(targetElement));
                    LiveUnit.Assert.isTrue(targetElement !== listView._tabManager.childFocus);

                    listView._currentMode().onKeyDown({
                        target: targetElement,
                        preventDefault: function () { },
                        stopPropagation: function () { },
                        keyCode: WinJS.Utilities.Key.enter
                    });

                    // Give the test some time to see if it fires an invoke event on enter. It shouldn't fire an invoke event here.
                    setTimeout(function () {
                        LiveUnit.Assert.isFalse(gotInvokeEvent);
                        complete();
                    }, 500);
                });
        };
    };
    generateInvokeOnUnrealizedItem("GridLayout");

    function generateEnsureVisibleNegative(layoutName) {
        BrowseModeTests.prototype["testEnsureVisibleNegative" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 1000; i++) {
                data.push("Item" + i);
            }
            var bindingList = new WinJS.Binding.List(data);

            var listView = new WinJS.UI.ListView(list, {
                itemDataSource: bindingList.dataSource,
                layout: new WinJS.UI[layoutName](),
            });

            Helper.initUnhandledErrors();
            var range;
            var promiseErrorsTimeout = setTimeout(function () {
                Helper.validateUnhandledErrors();
            }, 9900);
            var ensureVisibleIndices = [999, -1];
            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    listView.ensureVisible(ensureVisibleIndices[0]);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    range = {
                        indexOfFirstVisible: listView.indexOfFirstVisible,
                        indexOfLastVisible: listView.indexOfLastVisible
                    };
                    LiveUnit.Assert.isTrue(ensureVisibleIndices[0] >= range.indexOfFirstVisible && ensureVisibleIndices[0] <= range.indexOfLastVisible);
                    listView.ensureVisible(ensureVisibleIndices[1]);
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(range.indexOfFirstVisible, listView.indexOfFirstVisible);
                    clearTimeout(promiseErrorsTimeout);
                }).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        };
    };
    generateEnsureVisibleNegative("GridLayout");

    function generateEnsureVisibleEmpty(layoutName) {
        BrowseModeTests.prototype["testEnsureVisibleEmpty" + layoutName] = function (complete) {
            var data = [];
            var bindingList = new WinJS.Binding.List(data);

            var listView = new WinJS.UI.ListView(list, {
                itemDataSource: bindingList.dataSource,
                layout: new WinJS.UI[layoutName](),
            });

            Helper.initUnhandledErrors();
            var range;
            var promiseErrorsTimeout = setTimeout(function () {
                Helper.validateUnhandledErrors();
            }, 9900);
            var ensureVisibleIndices = [999, -1];
            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    listView.ensureVisible(ensureVisibleIndices[0]);
                    return WinJS.Promise.timeout(500);
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(-1, listView.indexOfFirstVisible);
                    listView.ensureVisible(ensureVisibleIndices[1]);
                    return WinJS.Promise.timeout(500);
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(-1, listView.indexOfFirstVisible);
                    clearTimeout(promiseErrorsTimeout);
                }).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }
    };
    generateEnsureVisibleEmpty("GridLayout");

    function generateIndexOfFirstVisibleNegative(layoutName) {
        BrowseModeTests.prototype["testIndexOfFirstVisibleNegative" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 1000; i++) {
                data.push("Item" + i);
            }
            var bindingList = new WinJS.Binding.List(data);

            var listView = new WinJS.UI.ListView(list, {
                itemDataSource: bindingList.dataSource,
                layout: new WinJS.UI[layoutName](),
            });

            Helper.initUnhandledErrors();
            var range;
            var promiseErrorsTimeout = setTimeout(function () {
                Helper.validateUnhandledErrors();
            }, 9900);
            var indexOfFirstVisibleIndices = [999, -1];
            Helper.ListView.waitForReady(listView, -1)().
                then(function () {
                    listView.indexOfFirstVisible = indexOfFirstVisibleIndices[0];
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    range = {
                        indexOfFirstVisible: listView.indexOfFirstVisible,
                        indexOfLastVisible: listView.indexOfLastVisible
                    };
                    LiveUnit.Assert.isTrue(indexOfFirstVisibleIndices[0] >= range.indexOfFirstVisible && indexOfFirstVisibleIndices[0] <= range.indexOfLastVisible);
                    listView.indexOfFirstVisible = indexOfFirstVisibleIndices[1];
                    return Helper.ListView.waitForReady(listView, -1)();
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(range.indexOfFirstVisible, listView.indexOfFirstVisible);
                    clearTimeout(promiseErrorsTimeout);
                }).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        };
    };
    generateIndexOfFirstVisibleNegative("GridLayout");

    function generateEnsureVisibleScroll(layoutName) {
        BrowseModeTests.prototype["testEnsureVisibleScroll" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 1000; i++) {
                data.push("Item" + i);
            }
            var bindingList = new WinJS.Binding.List(data);

            var listView = new WinJS.UI.ListView(list, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: bindingList.dataSource
            });

            var visibleAt900;
            Helper.ListView.waitForReady(listView)().
                then(function () {
                    listView.ensureVisible(900);
                    return Helper.ListView.waitForReady(listView)();
                }).
                then(function () {
                    visibleAt900 = listView.indexOfFirstVisible;
                    LiveUnit.Assert.isTrue(listView.indexOfFirstVisible > 10);
                    listView.ensureVisible(0);
                    return Helper.ListView.waitForReady(listView)();
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(0, listView.indexOfFirstVisible);
                    listView.ensureVisible(900);
                    return Helper.ListView.waitForReady(listView)();
                }).
                then(function () {
                    LiveUnit.Assert.areEqual(visibleAt900, listView.indexOfFirstVisible);
                    listView.ensureVisible(-1);
                    return Helper.ListView.waitForReady(listView)();
                }).
                then(function () {
                    // invalid request should be ignored
                    LiveUnit.Assert.areEqual(visibleAt900, listView.indexOfFirstVisible);
                    return Helper.ListView.waitForReady(listView)();
                }).
                done(complete, function (e) {
                    throw "Unexpected exception: " + e;
                });
        };
    };
    generateEnsureVisibleScroll("GridLayout");

    function generateHeaderKeyboardNavigationTest(layout) {
        function groupKey(item) {
            return item.groupKey;
        }

        function groupData(item) {
            return { key: groupKey(item), title: groupKey(item) };
        }

        function createKeyEvent(element, key) {
            return {
                keyCode: key,
                target: element,
                stopPropagation: function () { },
                preventDefault: function () { }
            };
        }

        var a = "A".charCodeAt(0),
            items = [];

        for (var i = 0; i < 100; ++i) {
            items[i] = {
                title: "Item " + i,
                groupKey: String.fromCharCode(a + Math.floor(i / 5))
            };
        }
        var data = new WinJS.Binding.List(items).createGrouped(groupKey, groupData);

        BrowseModeTests.prototype["testHeaderKeyboardNavigation" + layout] = function (complete) {
            var lv = new ListView(list);
            lv.layout = new WinJS.UI[layout];
            lv.itemDataSource = data.dataSource;
            lv.groupDataSource = data.groups.dataSource;

            function setFocus(entity) {
                function getEntity(entity) {
                    if (entity.type === "item") {
                        return lv.elementFromIndex(entity.index);
                    } else {
                        return lv.element.querySelectorAll(".win-groupheadercontainer")[entity.index];
                    }
                }

                function waitForFocus(element) {
                    return new WinJS.Promise(function (c) {
                        var token = setInterval(function () {
                            if (document.activeElement === element || element.contains(document.activeElement)) {
                                clearInterval(token);
                                c();
                            }
                        }, 100);
                    });
                }

                return WinJS.Promise.wrap().then(function () {
                    // Ensure that entity is visible so that we'll be able to give it focus
                    lv.ensureVisible(entity);
                    return Helper.ListView.waitForReady(lv)();
                }).then(function () {
                        // Give entity focus and when it receives focus, the returned promise completes
                        lv.currentItem = {
                            type: entity.type, index: entity.index,
                            hasFocus: true, showFocus: true
                        };
                        // Sometimes setActive will throw so the item won't receive focus. To allow the
                        // test to continue when this happens, use a timeout as a fallback.
                        return WinJS.Promise.any([waitForFocus(getEntity(entity)), WinJS.Promise.timeout(500)]);
                    });
            }

            // Let's wait until the tree is fully created
            Helper.ListView.waitForAllContainers(lv).then(function () {
                // Navigating backwards
                return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 5 });
            }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), (layout === "ListLayout" ? Key.upArrow : Key.leftArrow)));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    LiveUnit.Assert.areEqual(4, lv.currentItem.index);

                    // Navigating forwards
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 5 });
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), (layout === "ListLayout" ? Key.downArrow : Key.rightArrow)));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    LiveUnit.Assert.areEqual(6, lv.currentItem.index);

                    // Lower bound check
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 0 });
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), (layout === "ListLayout" ? Key.upArrow : Key.leftArrow)));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    LiveUnit.Assert.areEqual(0, lv.currentItem.index);

                    // Upper bound check
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 19 });
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), (layout === "ListLayout" ? Key.downArrow : Key.rightArrow)));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    LiveUnit.Assert.areEqual(19, lv.currentItem.index);

                    // Home
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 5 });
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.home));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    LiveUnit.Assert.areEqual(0, lv.currentItem.index);

                    // End
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 5 });
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.end));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    LiveUnit.Assert.areEqual(19, lv.currentItem.index);

                    // Page up
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 5 });
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.pageUp));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, lv.currentItem.type);

                    // Page down
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 5 });
                }).then(function () {
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.pageDown));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, lv.currentItem.type);
                    lv.header = document.createElement("div");
                    lv.footer = document.createElement("div");
                    return setFocus({ type: WinJS.UI.ObjectType.groupHeader, index: 0 });
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.leftArrow));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.header, lv.currentItem.type);
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.end));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.footer, lv.currentItem.type);
                    lv.header = null;
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.home));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    lv.header = document.createElement("div");
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.leftArrow));
                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.header, lv.currentItem.type);
                    lv.footer = null;
                    lv._mode.onKeyDown(createKeyEvent(document.querySelector(".win-groupheader"), Key.end));

                    return Helper.ListView.waitForReady(lv, -1)();
                }).done(function () {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                    complete();
                });
        };
    };
    generateHeaderKeyboardNavigationTest("ListLayout");
    generateHeaderKeyboardNavigationTest("GridLayout");

    function generateLastFocusedItemIndexChangeForGroupHeaderTest(layout) {
        function groupKey(item) {
            return item.groupKey;
        }

        function groupData(item) {
            return { key: groupKey(item), title: groupKey(item) };
        }

        function createKeyEvent(element, key) {
            return {
                keyCode: key,
                target: element,
                stopPropagation: function () { },
                preventDefault: function () { }
            };
        }

        var a = "A".charCodeAt(0),
            items = [];

        for (var i = 0; i < 100; ++i) {
            items[i] = {
                title: "Item " + i,
                groupKey: String.fromCharCode(a + Math.floor(i / 5))
            };
        }
        var data = new WinJS.Binding.List(items).createGrouped(groupKey, groupData);

        BrowseModeTests.prototype["testLastFocusedItemIndexChangeForGroupHeader" + layout] = function (complete) {
            var lv = new ListView(list);
            lv.layout = new WinJS.UI[layout];
            lv.itemDataSource = data.dataSource;
            lv.groupDataSource = data.groups.dataSource;

            Helper.ListView.waitForReady(lv)().then(function () {
                // Focus item, go to group header, remove last focused item from the group and go to item track again, focus should go on first item of the group
                lv.currentItem = { type: WinJS.UI.ObjectType.groupHeader, index: 4 };
                lv.currentItem = { type: WinJS.UI.ObjectType.item, index: 22 };
                lv._mode.onTabExiting({ detail: 1, preventDefault: function () { } });
                LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                lv.itemDataSource.remove("22");
                lv._mode.onTabExiting({ detail: 0, preventDefault: function () { } });
                LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, lv.currentItem.type);
                LiveUnit.Assert.areEqual(20, lv.currentItem.index);

                // Focus item, go to group header, insert item at the place of last focused item from the group and go to item track again
                // Focus should go on last visited item not on new inserted item or not on first item of the group
                lv.currentItem = { type: WinJS.UI.ObjectType.groupHeader, index: 18 };
                lv.currentItem = { type: WinJS.UI.ObjectType.item, index: 93 };
                var itemKey = lv.currentItem.key;
                lv._mode.onTabExiting({ detail: 1, preventDefault: function () { } });
                LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, lv.currentItem.type);
                LiveUnit.Assert.areEqual(18, lv.currentItem.index);
                lv.itemDataSource.insertAfter("newItem92", { title: "S", groupKey: "S" }, "91");
                lv.itemDataSource.insertAfter("newItem94", { title: "S", groupKey: "S" }, "93");
                lv.itemDataSource.insertAfter("newItem93", { title: "S", groupKey: "S" }, "92");
                lv.itemDataSource.insertAfter("newItem95", { title: "S", groupKey: "S" }, "94");
                lv._mode.onTabExiting({ detail: 0, preventDefault: function () { } });
                LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, lv.currentItem.type);
                LiveUnit.Assert.areEqual(itemKey, lv.currentItem.key);

                complete();
            });
        };
    }
    generateLastFocusedItemIndexChangeForGroupHeaderTest("ListLayout");
    generateLastFocusedItemIndexChangeForGroupHeaderTest("GridLayout");

    function generateOffscreenPageKeysTest(layout) {
        function groupKey(item) {
            return item.groupKey;
        }

        function groupData(item) {
            return { key: groupKey(item), title: groupKey(item) };
        }

        function createKeyEvent(element, key) {
            return {
                keyCode: key,
                target: element,
                stopPropagation: function () { },
                preventDefault: function () { }
            };
        }

        var a = "A".charCodeAt(0),
            items = [];

        for (var i = 0; i < 100; ++i) {
            items[i] = {
                title: "Item " + i,
                groupKey: String.fromCharCode(a + Math.floor(i / 5))
            };
        }
        var data = new WinJS.Binding.List(items).createGrouped(groupKey, groupData);

        BrowseModeTests.prototype["testOffscreenPageKeys" + layout] = function (complete) {
            var lv = new ListView(list);
            lv.layout = new WinJS.UI[layout];
            lv.itemDataSource = data.dataSource;
            lv.groupDataSource = data.groups.dataSource;
            lv.currentItem = { type: WinJS.UI.ObjectType.item, index: 1 };
            var origScrollPos;
            var indexOfFirstVisible;
            Helper.ListView.waitForReady(lv)().then(function () {
                origScrollPos = lv.scrollPosition;
                lv.scrollPosition = 1000;

                return Helper.ListView.waitForReady(lv, -1)();
            }).then(function () {
                    indexOfFirstVisible = lv.indexOfFirstVisible;
                    lv._mode.onKeyDown(createKeyEvent(lv.element, Key.pageDown));

                    return Helper.ListView.waitForReady(lv, -1)();
                }).then(function () {
                    LiveUnit.Assert.areNotEqual(indexOfFirstVisible, lv.indexOfFirstVisible);
                    complete();
                });
        };
    };
    generateOffscreenPageKeysTest("ListLayout");
    generateOffscreenPageKeysTest("GridLayout");
    
    var disabledTestRegistry = {
        testTabbingToHeaderFromChildElementDrawsFocusRect: Helper.Browsers.firefox
    };
    Helper.disableTests(BrowseModeTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.BrowseModeTests");
