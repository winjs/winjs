// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <reference path="../TestLib/ItemsManager/TestDataSource.js" />
/// <reference path="../TestLib/ItemsManager/UnitTestsCommon.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.SelectionManagerTest = function () {
    "use strict";

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function () {

        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "SelectionManagerTest";
        newNode.innerHTML =
            "<div id='currentItemTest' style='width:350px; height:350px'></div>" +
            "<div id='simpleTemplate' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
        document.body.appendChild(newNode);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        var element = document.getElementById("SelectionManagerTest");
        document.body.removeChild(element);
    }

    function createDataSource(async) {
        return createDataSourceImpl(async, 26);
    }

    function createDataSourceImpl(async, count) {

        var dataSource = {
            itemsFromKey: function (key, countBefore, countAfter) {
                var index = key.charCodeAt(0) - "a".charCodeAt(0);
                return this.itemsFromIndex(index, countBefore, countAfter);
            },

            itemsFromIndex: function (index, countBefore, countAfter) {
                return new WinJS.Promise(function (complete, error) {
                    if (index >= 0 && index < count) {
                        var startIndex = Math.max(0, index - countBefore),
                            endIndex = Math.min(index + countAfter, count - 1),
                            size = endIndex - startIndex + 1;

                        var items = [];
                        for (var i = startIndex; i < startIndex + size; i++) {
                            items.push({
                                key: String.fromCharCode("a".charCodeAt(0) + i),
                                data: {
                                    letter: String.fromCharCode("A".charCodeAt(0) + i)
                                }
                            });
                        }

                        var retVal = {
                            items: items,
                            offset: index - startIndex,
                            totalCount: count,
                            absoluteIndex: index
                        };

                        if (async) {
                            WinJS.Promise.timeout(50).then(function () {
                                complete(retVal);
                            });
                        } else {
                            complete(retVal);
                        }
                    } else {
                        complete({});
                    }
                });
            },

            getCount: function () {
                return WinJS.Promise.wrap(count);
            }
        };

        return new WinJS.UI.ListDataSource(dataSource);
    }

    function compareArrays(expected, actual) {
        LiveUnit.Assert.areEqual(expected.length, actual.length);
        for (var i = 0; i < expected.length; i++) {
            LiveUnit.Assert.areEqual(JSON.stringify(expected[i]), JSON.stringify(actual[i]));
        }
    }

    function compareRanges(expected, actual) {
        compareArrays(expected.map(function (value) {
            return {
                firstIndex: value.firstIndex,
                lastIndex: value.lastIndex,
                firstKey: String.fromCharCode("a".charCodeAt(0) + value.firstIndex),
                lastKey: String.fromCharCode("a".charCodeAt(0) + value.lastIndex)
            };
        }), actual);
    }

    function compareIndices(expected, actual) {
        compareArrays(expected, actual.map(function (value) {
            return {
                firstIndex: value.firstIndex,
                lastIndex: value.lastIndex
            };
        }));
    }

    function checkTileSelection(listview, index, selected) {
        var tile = listview.elementFromIndex(index).parentNode;
        LiveUnit.Assert.areEqual(selected, utilities.hasClass(tile, WinJS.UI._selectedClass));
    }

    function realizedCount(listView) {
        return listView._element.querySelectorAll(".win-item").length;
    }

    function createListBinding(retainedItems, dataSource) {
        if (dataSource) {
            var listBinding = dataSource.createListBinding({
                beginNotifications: function () {
                },

                endNotifications: function () {
                },

                indexChanged: function (item, newIndex, oldIndex) {
                },

                itemAvailable: function (item, placeholder) {
                },

                countChanged: function (newCount, oldCount) {
                },

                changed: function (newItem, oldItem) {
                },

                removed: function (itemHandle, mirage) {
                },

                inserted: function (itemPromise, previousHandle, nextHandle) {
                },

                moved: function (itemPromise, previousHandle, nextHandle) {
                },

                reload: function () {
                }
            });

            traceRefCounts(retainedItems, listBinding);

            return listBinding;
        } else {
            return null;
        }
    }

    function traceRefCounts(retainedItems, listBinding) {
        function incrementRefCount(handle) {
            var record = retainedItems[handle];
            if (!record) {
                retainedItems[handle] = {
                    count: 0
                };
                record = retainedItems[handle];
            }
            record.count++;
        }

        function decrementRefCount(handle) {
            var record = retainedItems[handle];
            if (record && --record.count === 0) {
                delete retainedItems[handle];
            }
        }

        var retainItem = listBinding._retainItem;
        if (retainItem) {
            listBinding._retainItem = function (slot, listenerID) {
                retainItem.apply(this, arguments);
                incrementRefCount(slot.handle);
            };
        }

        var releaseItem = listBinding._releaseItem;
        if (releaseItem) {
            listBinding._releaseItem = function (handle) {
                releaseItem.apply(this, arguments);
                decrementRefCount(handle);
            };
        }

        var addRef = listBinding._addRef;
        if (addRef) {
            listBinding._addRef = function (item, index) {
                addRef.apply(this, arguments);
                if (item.index === index) {
                    incrementRefCount(item.handle);
                }
            };
        }

        var release = listBinding._release;
        if (release) {
            listBinding._release = function (item, index) {
                release.apply(this, arguments);
                decrementRefCount(item.handle);
            };
        }
    }

    function validate(selection, retainedItems, realizedItems) {
        var realizedHandles = {}
        if (realizedItems === +realizedItems) {
            var listBinding = selection._getListBinding();
            for (var i = 0 ; i < realizedItems; i++) {
                var handle = listBinding.fromIndex(i).handle;
                realizedHandles[handle] = true;
            }
        }

        var selectionHandles = [];
        for (var i = 0; i < selection._ranges.length; i++) {
            var range = selection._ranges[i];
            LiveUnit.Assert.isTrue(range.firstIndex <= range.lastIndex);
            LiveUnit.Assert.isTrue(!i || selection._ranges[i - 1].lastIndex < range.firstIndex);

            LiveUnit.Assert.isTrue(range.firstPromise.index === range.firstIndex);
            LiveUnit.Assert.isTrue(range.lastPromise.index === range.lastIndex);
            selectionHandles.push(range.firstPromise.handle);
            selectionHandles.push(range.lastPromise.handle);
        }

        if (retainedItems) {
            var retainedHandles = [];
            var keys = Object.keys(retainedItems);
            for (var i = 0, len = keys.length; i < len; i++) {
                var handle = keys[i],
                    itemRecord = retainedItems[handle],
                    refCount = itemRecord.count;

                if (realizedHandles[handle]) {
                    refCount--;
                }

                LiveUnit.Assert.isTrue(refCount >= 0 && refCount <= 2);

                for (var n = 0; n < refCount; n++) {
                    retainedHandles.push(keys[i]);
                }
            }

            selectionHandles.sort();
            retainedHandles.sort();
            compareArrays(selectionHandles, retainedHandles);
        }
    }

    function createSite(dataSource, retainedItems) {
        return {
            _itemsManager: {
                dataSource: dataSource,
                _listBinding: createListBinding(retainedItems, dataSource)
            },
            _itemsCount: function () {
                return dataSource.getCount();
            }
        };
    }

    this.testItemSet = function (complete) {
        var listView = {
            _itemsManager: {
                dataSource: createDataSource()
            }
        };
        var set = new WinJS.UI._ItemSet(listView, [{ firstIndex: 0, lastIndex: 2 }, { firstIndex: 4, lastIndex: 4 }]);
        LiveUnit.Assert.isFalse(set.isEverything());
        compareIndices([{ firstIndex: 0, lastIndex: 2 }, { firstIndex: 4, lastIndex: 4 }], set.getRanges());
        compareArrays([0, 1, 2, 4], set.getIndices());
        LiveUnit.Assert.areEqual(4, set.count());

        var emptySet = new WinJS.UI._ItemSet(listView, []);
        LiveUnit.Assert.isFalse(emptySet.isEverything());
        compareIndices([], emptySet.getRanges());
        compareArrays([], emptySet.getIndices());

        LiveUnit.Assert.areEqual(0, emptySet.count());

        var all = new WinJS.UI._ItemSet(listView, [{ firstIndex: 0, lastIndex: 5 }], 6);
        LiveUnit.Assert.isTrue(all.isEverything());
        compareIndices([{ firstIndex: 0, lastIndex: 5 }], all.getRanges());
        compareArrays([0, 1, 2, 3, 4, 5], all.getIndices());

        LiveUnit.Assert.areEqual(6, all.count());

        set.getItems().then(function (items) {
            compareArrays(["A", "B", "C", "E"], items.map(function (item) {
                return item.data.letter;
            }));

            complete();
        });
    };

    this.testSelectionSetIndex = function (complete) {
        var dataSource = createDataSource(),
            retainedItems = {},
            site = createSite(dataSource, retainedItems),
            selection = new WinJS.UI._Selection(site);

        selection.set(10).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 10, lastIndex: 10 }], selection.getRanges());
            compareArrays([10], selection.getIndices());

            return selection.set("foo");
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([], selection.getRanges());

            selection.clear();
            compareRanges([], selection.getRanges());
            LiveUnit.Assert.areEqual(0, selection.count());

            return selection.set([{ firstIndex: 0, lastIndex: 2 }, 4]);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 2 }, { firstIndex: 4, lastIndex: 4 }], selection.getRanges());
            compareArrays([0, 1, 2, 4], selection.getIndices());

            return selection.set({ firstIndex: 6 });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([], selection.getRanges());

            return selection.set({ firstIndex: 6, lastIndex: "foo" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([], selection.getRanges());

            return selection.set([0, 2, 4]);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 2, lastIndex: 2 }, { firstIndex: 4, lastIndex: 4 }], selection.getRanges());

            selection.set([]);
            compareRanges([], selection.getRanges());
            LiveUnit.Assert.areEqual(0, selection.count());

            return selection.set([0, 1, 2, 4]);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }, { firstIndex: 4, lastIndex: 4 }], selection.getRanges());

            return selection.set([4, 2, 1, 0]);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }, { firstIndex: 4, lastIndex: 4 }], selection.getRanges());

            return selection.set(null);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([], selection.getRanges());
            complete();
        });
    };

    this.testSelectionAddIndex = function (complete) {
        var dataSource = createDataSource(),
            retainedItems = {},
            site = createSite(dataSource, retainedItems),
            selection = new WinJS.UI._Selection(site);

        selection.add(0).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }], selection.getRanges());
            return selection.add(0);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }], selection.getRanges());
            return selection.add(6);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 6, lastIndex: 6 }], selection.getRanges());
            return selection.add(1);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 6, lastIndex: 6 }], selection.getRanges());
            return selection.add(2);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }, { firstIndex: 6, lastIndex: 6 }], selection.getRanges());
            return selection.add([11, null]);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }, { firstIndex: 6, lastIndex: 6 }, { firstIndex: 11, lastIndex: 11 }], selection.getRanges());
            return selection.add(10000000);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }, { firstIndex: 6, lastIndex: 6 }, { firstIndex: 11, lastIndex: 11 }], selection.getRanges());
            complete();
        });
    };

    this.testSelectionAddIndexRanges = function (complete) {

        function test(dataSource) {
            var retainedItems = {},
                site = createSite(dataSource, retainedItems),
                selection = new WinJS.UI._Selection(site);

            return selection.add({ firstIndex: 2, lastIndex: 3 }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 3 }], selection.getRanges());
                return selection.add({ firstIndex: 8, lastIndex: 9 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 3 }, { firstIndex: 8, lastIndex: 9 }], selection.getRanges());
                return selection.add({ firstIndex: 5, lastIndex: 6 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 3 }, { firstIndex: 5, lastIndex: 6 }, { firstIndex: 8, lastIndex: 9 }], selection.getRanges());
                return selection.add({ firstIndex: 0, lastIndex: 0 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 2, lastIndex: 3 }, { firstIndex: 5, lastIndex: 6 }, { firstIndex: 8, lastIndex: 9 }], selection.getRanges());

                // merging first
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 1, lastIndex: 5 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 1, lastIndex: 5 }, { firstIndex: 7, lastIndex: 9 }], selection.getRanges());

                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 2, lastIndex: 5 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 5 }, { firstIndex: 7, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 3, lastIndex: 5 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 5 }, { firstIndex: 7, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 4, lastIndex: 5 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 5 }, { firstIndex: 7, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 5, lastIndex: 5 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 5, lastIndex: 5 }, { firstIndex: 7, lastIndex: 9 }], selection.getRanges());
                // merging last
                selection.set([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 8, lastIndex: 10 }]);
                return selection.add({ firstIndex: 5, lastIndex: 7 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 5, lastIndex: 7 }, { firstIndex: 8, lastIndex: 10 }], selection.getRanges());
                selection.set([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 8, lastIndex: 10 }]);
                return selection.add({ firstIndex: 5, lastIndex: 8 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 5, lastIndex: 10 }], selection.getRanges());
                selection.set([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 8, lastIndex: 10 }]);
                return selection.add({ firstIndex: 5, lastIndex: 9 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 5, lastIndex: 10 }], selection.getRanges());
                selection.set([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 8, lastIndex: 10 }]);
                return selection.add({ firstIndex: 5, lastIndex: 10 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 5, lastIndex: 10 }], selection.getRanges());
                selection.set([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 8, lastIndex: 10 }]);
                return selection.add({ firstIndex: 5, lastIndex: 11 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 3 }, { firstIndex: 5, lastIndex: 11 }], selection.getRanges());

                // both
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 0, lastIndex: 11 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 11 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 2, lastIndex: 9 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 3, lastIndex: 8 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 4, lastIndex: 7 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 7, lastIndex: 9 }]);
                return selection.add({ firstIndex: 5, lastIndex: 6 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 4 }, { firstIndex: 5, lastIndex: 6 }, { firstIndex: 7, lastIndex: 9 }], selection.getRanges());
                selection.set([{ firstIndex: 2, lastIndex: 9 }]);
                return selection.add([20, 10, 13]);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 9 }, { firstIndex: 10, lastIndex: 10 }, { firstIndex: 13, lastIndex: 13 }, { firstIndex: 20, lastIndex: 20 }], selection.getRanges());
            });
        }

        test(createDataSource()).then(function () {
            return test(createDataSource(true));
        }).then(complete);
    };

    this.testSelectionRemoveIndex = function (complete) {

        function test(dataSource) {
            var retainedItems = {},
                site = createSite(dataSource, retainedItems),
                selection = new WinJS.UI._Selection(site);

            return selection.set([{ firstIndex: 0, lastIndex: 7 }, { firstIndex: 9, lastIndex: 10 }]).then(function () {
                validate(selection, retainedItems);

                return selection.remove([3, 7, 9, 10]);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 0, lastIndex: 2 }, { firstIndex: 4, lastIndex: 6 }], selection.getRanges());
                return selection.remove(0);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 1, lastIndex: 2 }, { firstIndex: 4, lastIndex: 6 }], selection.getRanges());
                return selection.remove(2);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 1, lastIndex: 1 }, { firstIndex: 4, lastIndex: 6 }], selection.getRanges());
                return selection.remove(1);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 6 }], selection.getRanges());
                return selection.remove(5);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 4 }, { firstIndex: 6, lastIndex: 6 }], selection.getRanges());
                return selection.remove(100);
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 4 }, { firstIndex: 6, lastIndex: 6 }], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 0, lastIndex: 1 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 7 }], selection.getRanges());

                return selection.remove({ firstIndex: 8, lastIndex: 9 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 7 }], selection.getRanges());

                return selection.remove({ firstIndex: 1, lastIndex: 4 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 5, lastIndex: 7 }], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 1, lastIndex: 5 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 6, lastIndex: 7 }], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 1, lastIndex: 7 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 4, lastIndex: 7 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 0, lastIndex: 10 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 5, lastIndex: 6 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 4 }, { firstIndex: 7, lastIndex: 7 }], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 4, lastIndex: 8 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 5, lastIndex: 8 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 4 }], selection.getRanges());

                selection.set([{ firstIndex: 4, lastIndex: 7 }]);
                return selection.remove({ firstIndex: 7, lastIndex: 8 });
            }).then(function () {
                validate(selection, retainedItems);

                compareRanges([{ firstIndex: 4, lastIndex: 6 }], selection.getRanges());
            });
        }

        test(createDataSource()).then(function () {
            return test(createDataSource(true));
        }).then(complete);
    };

    this.testSelectionWithItems = function (complete) {
        var dataSource = createDataSource(),
            retainedItems = {},
            site = createSite(dataSource, retainedItems),
            selection = new WinJS.UI._Selection(site);

        site._itemsManager._listBinding.fromIndex(1).then(function (item) {
            return selection.set(item);
        }).then(function () {
            validate(selection, retainedItems);
            compareRanges([{ firstIndex: 1, lastIndex: 1 }], selection.getRanges());

            complete();
        });
    };

    this.testSelectionAll = function (complete) {
        var dataSource = createDataSource(),
            retainedItems = {},
            site = createSite(dataSource, retainedItems),
            selection = new WinJS.UI._Selection(site);

        selection.selectAll().then(function () {
            validate(selection, retainedItems);

            LiveUnit.Assert.isTrue(selection.isEverything());
            compareIndices([{ firstIndex: 0, lastIndex: 25 }], selection.getRanges());
            var array = [];
            for (var i = 0; i < 26; i++) {
                array.push(i);
            }
            compareArrays(array, selection.getIndices());
            return dataSource.getCount();
        }).then(function (count) {
            validate(selection, retainedItems);

            LiveUnit.Assert.areEqual(count, selection.count());
            return selection.set(0);
        }).then(function () {
            validate(selection, retainedItems);

            LiveUnit.Assert.isFalse(selection.isEverything());
            compareIndices([{ firstIndex: 0, lastIndex: 0 }], selection.getRanges());
            LiveUnit.Assert.areEqual(1, selection.count());

            return selection.selectAll();
        }).then(function () {
            validate(selection, retainedItems);

            return selection.add(5);
        }).then(function () {
            validate(selection, retainedItems);

            LiveUnit.Assert.isTrue(selection.isEverything());
            compareIndices([{ firstIndex: 0, lastIndex: 25 }], selection.getRanges());

            return selection.remove(5);
        }).then(function () {
            validate(selection, retainedItems);

            LiveUnit.Assert.isFalse(selection.isEverything());
            compareIndices([{ firstIndex: 0, lastIndex: 4 }, { firstIndex: 6, lastIndex: 25 }], selection.getRanges());
            return selection.set({ firstIndex: 0, lastIndex: Number.MAX_VALUE });
        }).then(function () {
            validate(selection, retainedItems);

            LiveUnit.Assert.isTrue(selection.isEverything());

            complete();
        });
    };

    this.testSelectAllOnEmptyDataSource = function (complete) {
        var dataSource = createDataSourceImpl(false, 0),
            retainedItems = {},
            site = createSite(dataSource, retainedItems),
            selection = new WinJS.UI._Selection(site);

        selection.selectAll().then(function () {
            complete();
        });
    };

    this.testSelectionWithKeys = function (complete) {
        var dataSource = createDataSource(),
            retainedItems = {},
            site = createSite(dataSource, retainedItems),
            selection = new WinJS.UI._Selection(site);
        LiveUnit.Assert.areEqual(0, selection.count());

        selection.set({ key: "b" }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 1, lastIndex: 1 }], selection.getRanges());

            return selection.set({ firstKey: "c", lastKey: "d" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 2, lastIndex: 3 }], selection.getRanges());

            return selection.remove({ key: "c" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 3, lastIndex: 3 }], selection.getRanges());

            return selection.remove({ firstKey: "c", lastKey: "e" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([], selection.getRanges());

            return selection.add({ key: "c" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 2, lastIndex: 2 }], selection.getRanges());

            return selection.add({ key: "d" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 2, lastIndex: 2 }, { firstIndex: 3, lastIndex: 3 }], selection.getRanges());

            return selection.add({ firstKey: "a" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 2, lastIndex: 2 }, { firstIndex: 3, lastIndex: 3 }], selection.getRanges());

            return selection.add({ firstKey: "f", lastKey: "g" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 2, lastIndex: 2 }, { firstIndex: 3, lastIndex: 3 }, { firstIndex: 5, lastIndex: 6 }], selection.getRanges());

            return selection.set({ firstKey: "a", firstIndex: 10, lastKey: "b", lastIndex: 11 });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 1 }], selection.getRanges());

            retainedItems = {};
            dataSource = createDataSource(true);
            site = createSite(dataSource, retainedItems);
            selection = new WinJS.UI._Selection(site);

            return selection.set([{ firstKey: "a", lastKey: "a" }, { firstKey: "b", lastKey: "b" }, { firstKey: "d", lastKey: "e" }]);
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 3, lastIndex: 4 }], selection.getRanges());

            return selection.set({ firstKey: "$", lastKey: "%" });
        }).then(function () {
            validate(selection, retainedItems);

            compareRanges([], selection.getRanges());
            complete();
        });
    };


    var selectionUpdated = 0,
        selectionChanging = 0,
        selectionChanged = 0;

    function setupSelectionManager(dataSource, retainedItems) {
        var selectionManager = new WinJS.UI._SelectionManager({
            _versionManager: new WinJS.UI._VersionManager(),
            _selectionAllowed: function () {
                return true;
            },
            _multiSelection: function () {
                return this._selectionMode === "multi";
            },
            _selectionMode: "multi",
            _updateSelection: function () {
                selectionUpdated++;
            },
            _itemsManager: {
                dataSource: dataSource,
                _listBinding: createListBinding(retainedItems, dataSource)
            },
            _itemsCount: function () {
                return dataSource.getCount();
            }
        });

        selectionManager._fireSelectionChanging = function () {
            selectionChanging++;
            return WinJS.Promise.wrap(true);
        };
        selectionManager._fireSelectionChanged = function () {
            selectionChanged++;
        };

        return selectionManager;
    }

    this.testSelectionManager = function (complete) {

        function test(dataSource) {

            var retainedItems = {};
            selectionUpdated = 0;
            selectionChanging = 0;
            selectionChanged = 0;

            var selection = setupSelectionManager(dataSource, retainedItems);
            LiveUnit.Assert.areEqual(0, selection.count());
            LiveUnit.Assert.isFalse(selection.isEverything());
            LiveUnit.Assert.isFalse(selection._isIncluded(0));
            LiveUnit.Assert.isFalse(selection._isIncluded(1));
            compareRanges([], selection.getRanges());

            return selection.set([0, 1, 2]).then(function () {
                validate(selection._selected, retainedItems);

                LiveUnit.Assert.isTrue(selection._isIncluded(0));
                LiveUnit.Assert.isTrue(selection._isIncluded(1));
                LiveUnit.Assert.isTrue(selection._isIncluded(2));
                LiveUnit.Assert.isFalse(selection._isIncluded(3));
                LiveUnit.Assert.isFalse(selection.isEverything());
                compareRanges([{ firstIndex: 0, lastIndex: 0 }, { firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }], selection.getRanges());
                LiveUnit.Assert.areEqual(1, selectionChanging);
                LiveUnit.Assert.areEqual(1, selectionChanged);
                LiveUnit.Assert.areEqual(1, selectionUpdated);
                return selection.getItems();
            }).then(function (items) {
                compareArrays(["A", "B", "C"], items.map(function (item) {
                    return item.data.letter;
                }));

                return selection.clear();
            }).then(function () {
                validate(selection._selected, retainedItems);

                compareRanges([], selection.getRanges());
                LiveUnit.Assert.areEqual(2, selectionChanging);
                LiveUnit.Assert.areEqual(2, selectionChanged);
                LiveUnit.Assert.areEqual(2, selectionUpdated);

                return selection.set({ firstIndex: 1, lastIndex: 3 });
            }).then(function () {
                validate(selection._selected, retainedItems);

                compareRanges([{ firstIndex: 1, lastIndex: 3 }], selection.getRanges());
                return selection.add(5);
            }).then(function () {
                validate(selection._selected, retainedItems);

                compareRanges([{ firstIndex: 1, lastIndex: 3 }, { firstIndex: 5, lastIndex: 5 }], selection.getRanges());
                LiveUnit.Assert.areEqual(4, selectionChanging);
                LiveUnit.Assert.areEqual(4, selectionChanged);
                LiveUnit.Assert.areEqual(4, selectionUpdated);

                return selection.remove(6);
            }).then(function () {
                validate(selection._selected, retainedItems);

                compareRanges([{ firstIndex: 1, lastIndex: 3 }, { firstIndex: 5, lastIndex: 5 }], selection.getRanges());

                return selection.remove(1);
            }).then(function () {
                validate(selection._selected, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 3 }, { firstIndex: 5, lastIndex: 5 }], selection.getRanges());
                LiveUnit.Assert.areEqual(6, selectionChanging);
                LiveUnit.Assert.areEqual(6, selectionChanged);
                LiveUnit.Assert.areEqual(6, selectionUpdated);

                selection._fireSelectionChanging = function () {
                    selectionChanging++;
                    return WinJS.Promise.wrap(false);
                };
                return selection.set([0, 1]);
            }).then(function () {
                validate(selection._selected, retainedItems);

                compareRanges([{ firstIndex: 2, lastIndex: 3 }, { firstIndex: 5, lastIndex: 5 }], selection.getRanges());
                LiveUnit.Assert.areEqual(7, selectionChanging);
                LiveUnit.Assert.areEqual(6, selectionChanged);
                LiveUnit.Assert.areEqual(6, selectionUpdated);

                selection._fireSelectionChanging = function (newSelection) {
                    selectionChanging++;
                    newSelection.set([9, 10]);
                    return WinJS.Promise.wrap(true);
                };
                return selection.set([0, 1]);
            }).then(function () {
                compareIndices([{ firstIndex: 9, lastIndex: 9 }, { firstIndex: 10, lastIndex: 10 }], selection.getRanges());
                LiveUnit.Assert.areEqual(8, selectionChanging);
                LiveUnit.Assert.areEqual(7, selectionChanged);
                LiveUnit.Assert.areEqual(7, selectionUpdated);

                LiveUnit.Assert.areEqual(2, selection.count());
                compareArrays([9, 10], selection.getIndices());
            });
        }

        LiveUnit.LoggingCore.logComment("synchronous data source");
        test(createDataSource()).then(function () {
            LiveUnit.LoggingCore.logComment("asynchronous data source");
            return test(createDataSource(true));
        }).then(complete);
    };

    this.generateSelectionChanging = function (layoutName) {
        this["testSelectionChanging" + layoutName] = function (complete) {
            var element = document.createElement("div");
            document.body.appendChild(element);

            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    label: "Item" + i
                });
            }

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: (new WinJS.Binding.List(data)).dataSource,
                selectionMode: "multi"
            });

            whenLoadingComplete(listView, function () {
                listView.selection.set(0).then(function () {
                    checkTileSelection(listView, 0, true);
                    checkTileSelection(listView, 1, false);

                    var promise;
                    listView.addEventListener("selectionchanging", function (eventObject) {
                        promise = WinJS.Promise.timeout(100);
                        promise.then(function () {
                            compareIndices([{ firstIndex: 1, lastIndex: 1 }, { firstIndex: 2, lastIndex: 2 }], eventObject.detail.newSelection.getRanges());
                            eventObject.detail.newSelection.remove(1);
                        });
                        eventObject.detail.setPromise(promise)
                    }, false);

                    listView.selection.set([1, 2]);

                    checkTileSelection(listView, 1, false);
                    checkTileSelection(listView, 2, false);

                    return promise.then(function () {
                        return WinJS.Promise.timeout();
                    });
                }).then(function () {
                    checkTileSelection(listView, 1, false);
                    checkTileSelection(listView, 2, true);

                    document.body.removeChild(element);
                    complete();
                });
            });
        };
    };
    this.generateSelectionChanging("GridLayout");

    this.testFocus = function () {
        var selection = setupSelectionManager(null, null);

        var focused = selection._getFocused();
        LiveUnit.Assert.areEqual("item", focused.type);
        LiveUnit.Assert.areEqual(0, focused.index);

        selection._setFocused({ type: "item", index: 1 });
        focused = selection._getFocused();
        LiveUnit.Assert.areEqual("item", focused.type);
        LiveUnit.Assert.areEqual(1, focused.index);
    };

    this.generateChainingAsyncChanges = function (layoutName) {
        this["testChainingAsyncChanges" + layoutName] = function (complete) {

            function createAsyncDataSource(async) {
                var count = 1000;

                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        return new WinJS.Promise(function (complete, error) {
                            if (index < count) {
                                var startIndex = Math.max(0, index - countBefore),
                                    endIndex = Math.min(index + countAfter, count - 1),
                                    size = endIndex - startIndex + 1;

                                var items = [];
                                for (var i = startIndex; i < startIndex + size; i++) {
                                    items.push({
                                        key: i.toString(),
                                        data: {
                                            label: "Tile" + i
                                        }
                                    });
                                }

                                var retVal = {
                                    items: items,
                                    offset: index - startIndex,
                                    totalCount: count,
                                    absoluteIndex: index
                                };

                                WinJS.Promise.timeout(50).then(function () {
                                    complete(retVal);
                                });
                            } else {
                                complete({});
                            }
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.wrap(count);
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: createAsyncDataSource(),
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.label;
                        element.style.width = "100px";
                        element.style.height = "100px";
                        return element;
                    });
                }
            });

            whenLoadingComplete(listView, function () {
                var promises = [];
                promises.push(listView.selection.add(0));
                promises.push(listView.selection.add(100));
                promises.push(listView.selection.add(200));
                promises.push(listView.selection.add(300));
                promises.push(listView.selection.add(400));
                promises.push(listView.selection.remove(400));
                WinJS.Promise.join(promises).then(function () {

                    elementsEqual([0, 100, 200, 300], listView.selection.getIndices());

                    checkTileSelection(listView, 0, true);
                    checkTileSelection(listView, 1, false);

                    document.body.removeChild(element);
                    complete();
                });
            });
        };
    };
    this.generateChainingAsyncChanges("GridLayout");

    function editsOutsideOfRealizedRange(layoutName, dataSource, splice, move) {
        return new WinJS.Promise(function (complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.label;
                        element.style.width = element.style.height = "100px";
                        return element;
                    });
                }
            });

            var retainedItems = {};
            traceRefCounts(retainedItems, listView._itemsManager._listBinding);

            listView.selection.set([{ firstIndex: 0, lastIndex: 2 }, 10, { firstIndex: 97, lastIndex: 99 }]);

            function checkSelection(expected) {
                listView.selection.getItems().then(function (items) {
                    var labels = [];
                    for (var i = 0; i < items.length; ++i) {
                        labels.push(items[i].data.label);
                    }
                    elementsEqual(expected, labels);
                });
            }

            waitForReady(listView)().then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10", "T97", "T98", "T99"]);
                compareArrays([0, 1, 2, 10, 97, 98, 99], listView.selection.getIndices());
                return splice(7, 1);
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10", "T97", "T98", "T99"]);
                compareArrays([0, 1, 2, 9, 96, 97, 98], listView.selection.getIndices());
                return splice(7, 0, {
                    label: "New"
                });
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10", "T97", "T98", "T99"]);
                compareArrays([0, 1, 2, 10, 97, 98, 99], listView.selection.getIndices());
                return splice(98, 0, {
                    label: "New"
                });
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10", "T97", "New", "T98", "T99"]);
                compareArrays([0, 1, 2, 10, 97, 98, 99, 100], listView.selection.getIndices());
                return splice(80, 0, {
                    label: "New"
                });
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10", "T97", "New", "T98", "T99"]);
                compareArrays([0, 1, 2, 10, 98, 99, 100, 101], listView.selection.getIndices());
                return splice(100, 1);
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10", "T97", "New", "T99"]);
                compareArrays([0, 1, 2, 10, 98, 99, 100], listView.selection.getIndices());
                return splice(98, 1);
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                checkSelection(["T0", "T1", "T2", "T10"]);
                compareArrays([0, 1, 2, 10], listView.selection.getIndices());

                return listView.selection.add({ firstIndex: 90, lastIndex: 92 });
            }).then(waitForReady(listView, -1)).
            then(function () {
                compareArrays([0, 1, 2, 10, 90, 91, 92], listView.selection.getIndices());
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                return move(92, 50);
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareArrays([0, 1, 2, 10], listView.selection.getIndices());

                document.body.removeChild(element);
                complete();
            });
        });
    }

    this.generateEditsOutsideOfRealizedRange_BindingList = function (layoutName) {
        this["testEditsOutsideOfRealizedRange_BindingList" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    label: "T" + i
                });
            }

            var list = new WinJS.Binding.List(data);

            editsOutsideOfRealizedRange(layoutName, list.dataSource, list.splice.bind(list), list.move.bind(list)).then(complete);
        };
    };
    this.generateEditsOutsideOfRealizedRange_BindingList("GridLayout");

    function VDSWrapper(dataSource) {
        var uniqueId = 1000;

        this.splice = function splice(index, howMany, item) {
            var promise = WinJS.Promise.wrap();

            dataSource.beginEdits();
            if (howMany) {
                var indices = [];
                for (var i = 0; i < howMany; i++) {
                    indices.push(index + i);
                }
                promise = getDataObjects(dataSource, indices).then(function (dataObjects) {
                    for (var i = 0; i < dataObjects.length; i++) {
                        dataSource.remove(dataObjects[i].key);
                    }
                });
            }
            if (item) {
                promise = promise.then(function () {
                    return getDataObjects(dataSource, [index]);
                }).then(function (dataObjects) {
                    dataSource.insertBefore(uniqueId.toString(), item, dataObjects[0].key);
                    uniqueId++;
                });
            }

            return promise.then(function () {
                dataSource.endEdits();
            });
        };

        this.move = function (oldIndex, newIndex) {
            var that = this;
            return getDataObjects(dataSource, [oldIndex, newIndex]).then(function (dataObjects) {
                return dataSource.moveBefore(dataObjects[0].key, dataObjects[1].key);
            });
        };

        this.push = function (item) {
            return dataSource.insertAtEnd(uniqueId.toString(), item);
        };
    }

    this.generateEditsOutsideOfRealizedRange_VDS = function (layoutName) {
        this["testEditsOutsideOfRealizedRange_VDS" + layoutName] = function (complete) {

            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    label: "T" + i
                });
            }

            var dataSource = TestComponents.simpleSynchronousArrayDataSource(data);
            var wrapper = new VDSWrapper(dataSource);

            editsOutsideOfRealizedRange(layoutName, dataSource, wrapper.splice.bind(wrapper), wrapper.move.bind(wrapper)).then(complete);
        };
    };
    this.generateEditsOutsideOfRealizedRange_VDS("GridLayout");

    function editsWithSelectAll(layoutName, dataSource, splice, push) {
        return new WinJS.Promise(function (complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.label;
                        element.style.width = element.style.height = "100px";
                        return element;
                    });
                }
            });

            var retainedItems = {};
            traceRefCounts(retainedItems, listView._itemsManager._listBinding);

            listView.selection.selectAll();

            function checkTile(listview, index, text, selected) {
                var tile = listview.elementFromIndex(index),
                    wrapper = tile.parentNode;
                LiveUnit.Assert.areEqual(text, tile.textContent);
                LiveUnit.Assert.areEqual(selected, utilities.hasClass(wrapper, WinJS.UI._selectedClass));
            }

            waitForReady(listView)().then(function () {
                for (var i = 0; i < 12; i++) {
                    checkTile(listView, i, "Tile" + i, true);
                }
                LiveUnit.Assert.isTrue(listView.selection.isEverything());

                return splice(0, 1);
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareIndices([], listView.selection.getRanges());
                listView.selection.selectAll();
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareIndices([{ firstIndex: 0, lastIndex: 98 }], listView.selection.getRanges());

                return splice(0, 0, { label: "NewTile0" });
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareIndices([{ firstIndex: 1, lastIndex: 99 }], listView.selection.getRanges());

                return splice(3, 0, { label: "NewTile1" });
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareIndices([{ firstIndex: 1, lastIndex: 100 }], listView.selection.getRanges());

                return splice(10, 1);
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareIndices([{ firstIndex: 1, lastIndex: 99 }], listView.selection.getRanges());

                return listView.selection.selectAll();
            }).then(waitForReady(listView, -1)).
            then(function () {
                validate(listView.selection._selected, retainedItems, realizedCount(listView));

                compareIndices([{ firstIndex: 0, lastIndex: 99 }], listView.selection.getRanges());
                LiveUnit.Assert.isTrue(listView.selection.isEverything());

                return push({ label: "NewTile" });
            }).then(waitForReady(listView, -1)).
            then(function () {
                compareIndices([{ firstIndex: 0, lastIndex: 99 }], listView.selection.getRanges());
                LiveUnit.Assert.isFalse(listView.selection.isEverything());

                document.body.removeChild(element);
                complete();
            });
        });
    }

    this.generateEditsWithSelectAll_BindingList = function (layoutName) {
        this["testEditsWithSelectAll_BindingList" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    label: "Tile" + i
                });
            }

            var list = new WinJS.Binding.List(data);

            editsWithSelectAll(layoutName, list.dataSource, list.splice.bind(list), list.push.bind(list)).then(complete);
        };
    };
    this.generateEditsWithSelectAll_BindingList("GridLayout");

    this.generateEditsWithSelectAll_VDS = function (layoutName) {
        this["testEditsWithSelectAll_VDS" + layoutName] = function (complete) {
            var data = [];
            for (var i = 0; i < 100; i++) {
                data.push({
                    label: "Tile" + i
                });
            }

            var dataSource = TestComponents.simpleSynchronousArrayDataSource(data);
            var wrapper = new VDSWrapper(dataSource);

            editsWithSelectAll(layoutName, dataSource, wrapper.splice.bind(wrapper), wrapper.push.bind(wrapper)).then(complete);
        };
    };
    this.generateEditsWithSelectAll_VDS("GridLayout");

    this.generateSelectionDispose = function (layoutName) {
        this["testSelectionDispose" + layoutName] = function (complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }
            var list = (new WinJS.Binding.List(items));

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.title;
                        element.style.width = element.style.height = "100px";
                        return element;
                    });
                }
            });

            var retainedItems = {};
            traceRefCounts(retainedItems, listView._itemsManager._listBinding);

            listView.selection.set([{ firstIndex: 0, lastIndex: 2 }, 10, { firstIndex: 97, lastIndex: 99 }]);
            var tests = [
                function () {
                    var selection = listView.selection._selected;
                    validate(selection, retainedItems, realizedCount(listView));

                    document.body.removeChild(element);

                    setTimeout(function () {
                        validate(selection, retainedItems);
                        complete();
                    }, 2000);
                }
            ];
            runTests(listView, tests);
        };
    };
    this.generateSelectionDispose("GridLayout");

    this.generateSelectionEventsAfterEdits = function (layoutName) {
        this["testSelectionEventsAfterEdits" + layoutName] = function (complete) {
            var element = document.createElement("div");
            element.style.width = "300px";
            element.style.height = "300px";
            document.body.appendChild(element);

            var items = [];
            for (var i = 0; i < 100; ++i) {
                items[i] = { title: "Tile" + i };
            }
            var list = (new WinJS.Binding.List(items));

            var listView = new WinJS.UI.ListView(element, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: list.dataSource,
                itemTemplate: function (itemPromise) {
                    return itemPromise.then(function (item) {
                        var element = document.createElement("div");
                        element.textContent = item.data.title;
                        element.style.width = element.style.height = "100px";
                        return element;
                    });
                }
            });

            var retainedItems = {};
            traceRefCounts(retainedItems, listView._itemsManager._listBinding);

            listView.selection.set([{ firstIndex: 5, lastIndex: 10 }, { firstIndex: 20, lastIndex: 25 }]);

            var expectedRanges,
                changingCount = 0,
                changedCount = 0;

            listView.addEventListener("selectionchanging", function (eventObject) {
                compareIndices(expectedRanges, eventObject.detail.newSelection.getRanges());
                changingCount++;
            }, false);

            listView.addEventListener("selectionchanged", function (eventObject) {
                changedCount++;
            }, false);

            var tests = [
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));

                    expectedRanges = [{ firstIndex: 4, lastIndex: 9 }, { firstIndex: 19, lastIndex: 24 }];

                    list.splice(0, 1);
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(0, changingCount);
                    LiveUnit.Assert.areEqual(0, changedCount);

                    expectedRanges = [{ firstIndex: 18, lastIndex: 23 }];

                    list.splice(4, 1);
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(1, changingCount);
                    LiveUnit.Assert.areEqual(1, changedCount);

                    expectedRanges = [{ firstIndex: 18, lastIndex: 22 }];

                    list.splice(19, 1);
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(2, changingCount);
                    LiveUnit.Assert.areEqual(2, changedCount);

                    expectedRanges = [{ firstIndex: 18, lastIndex: 23 }];

                    list.splice(19, 0, { title: "NewTile1" });
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(3, changingCount);
                    LiveUnit.Assert.areEqual(3, changedCount);

                    expectedRanges = [{ firstIndex: 19, lastIndex: 24 }];

                    list.splice(1, 0, { title: "NewTile2" });
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(3, changingCount);
                    LiveUnit.Assert.areEqual(3, changedCount);

                    expectedRanges = [{ firstIndex: 18, lastIndex: 24 }];

                    list.move(0, 21);
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(4, changingCount);
                    LiveUnit.Assert.areEqual(4, changedCount);

                    expectedRanges = [{ firstIndex: 18, lastIndex: 23 }];

                    list.move(20, 80);
                    return true;
                },
                function () {
                    validate(listView.selection._selected, retainedItems, realizedCount(listView));
                    compareIndices(expectedRanges, listView.selection.getRanges());

                    LiveUnit.Assert.areEqual(5, changingCount);
                    LiveUnit.Assert.areEqual(5, changedCount);

                    document.body.removeChild(element);
                    complete();
                }
            ];
            runTests(listView, tests);
        };
    };
    this.generateSelectionEventsAfterEdits("GridLayout");

    function getSlowDS() {
        var data = [];
        for (var i = 0; i < 100; i++) {
            data.push({ title: 'item' + i });
        }
        var controller = {
            directivesForMethod: function (method, args) {
                return {
                    callMethodSynchronously: false,
                    sendChangeNotifications: false,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1,
                    delay: 1000
                };
            }
        }
        var abilities = null;
        return TestComponents.createTestDataSource(data, controller, abilities);
    }

    this.generateResetSelectionOnSlowDS = function (layoutName) {
        this["testResetSelectionOnSlowDS" + layoutName] = function (complete) {
            var testDS = getSlowDS();

            var testDiv = document.querySelector("#SelectionManagerTest");
            var lvElement = document.createElement("div");
            testDiv.appendChild(lvElement);
            var listView = new WinJS.UI.ListView(lvElement, { layout: new WinJS.UI[layoutName]() });

            waitForReady(listView)().
                then(function () {
                    listView.itemDataSource = testDS;
                    listView.selection.set([{ key: '10' }]);
                    listView.itemDataSource = new WinJS.Binding.List(listView.itemDataSource.testDataAdapter.getItems()).dataSource;
                    return waitForReady(listView)();
                }).
                then(function () {
                    return listView.selection.set([{ key: '0' }]);
                }).
                then(function () {
                    LiveUnit.Assert.areEqual([0].toString(), listView.selection.getIndices().toString());
                    var selectedInDom = listView.element.querySelectorAll(".win-selectioncheckmark");
                    LiveUnit.Assert.areEqual(1, selectedInDom.length);
                }).
                then(function () {
                    return listView.selection.set([]);
                }).
                then(function () {
                    LiveUnit.Assert.areEqual([].toString(), listView.selection.getIndices().toString());
                    var selectedInDom = listView.element.querySelectorAll(".win-selectioncheckmark");
                    LiveUnit.Assert.areEqual(0, selectedInDom.length);
                }).
                done(complete);
        };
    };
    this.generateResetSelectionOnSlowDS("GridLayout");

    this.generateInvalidSelection = function (layoutName) {
        this["testInvalidSelection" + layoutName] = function (complete) {
            var testDS = getSlowDS();

            var testDiv = document.querySelector("#SelectionManagerTest");
            var lvElement = document.createElement("div");
            testDiv.appendChild(lvElement);
            var listView = new WinJS.UI.ListView(lvElement, {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: testDS
            });
            listView.selection.set([{ key: 'foo' }]);
            waitForReady(listView)().
                then(function () {
                    LiveUnit.Assert.areEqual([].toString(), listView.selection.getIndices().toString());
                    var selectedInDom = listView.element.querySelectorAll(".win-selectioncheckmark");
                    LiveUnit.Assert.areEqual(0, selectedInDom.length);
                }).
                then(function () {
                    return listView.selection.set([0]);
                }).
                then(function () {
                    LiveUnit.Assert.areEqual([0].toString(), listView.selection.getIndices().toString());
                    var selectedInDom = listView.element.querySelectorAll(".win-selectioncheckmark");
                    LiveUnit.Assert.areEqual(1, selectedInDom.length);
                }).
                done(complete);
        };
    };
    this.generateInvalidSelection("GridLayout");

    this.testSelectionWithSlowDataSourceAfterScrolling = function (complete) {
        initUnhandledErrors();
        var testDS = getSlowDS();

        var testDiv = document.querySelector("#SelectionManagerTest");
        var lvElement = document.createElement("div");
        lvElement.style.width = "200px";
        lvElement.style.height = "1000px"
        testDiv.appendChild(lvElement);
        var listView = new WinJS.UI.ListView(lvElement, {
            itemDataSource: testDS,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.textContent = item.data.title;
                    element.style.width = element.style.height = "100px";
                    return element;
                });
            }
        });
        waitForReady(listView)().then(function () {
            listView.addEventListener("loadingstatechanged", function loadingStateHandler() {
                if (listView.loadingState === "viewPortLoaded") {
                    listView.removeEventListener("loadingstatechanged", loadingStateHandler);
                    WinJS.Promise.timeout(20).then(function () {
                        listView.selection.add(98);
                    });
                }
            });
            listView.ensureVisible(98);
        });
        waitForReady(listView)().
            then(validateUnhandledErrorsOnIdle).
            done(complete);
    }
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.SelectionManagerTest");
