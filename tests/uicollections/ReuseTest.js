// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.ReuseTests = function () {
    "use strict";
    var newItems,
        disposedItemsCount,
        disposedItems,
        actionHistory = {};      // Stores dispose/render history for each item

    function pushAction(item, action) {
        if (!actionHistory[item.index]) {
            actionHistory[item.index] = [];
        }
        actionHistory[item.index].push(action);
    }

    function checkDisposeBeforeRender(index) {
        elementsEqual(["dispose", "render"], actionHistory[index]);
    }

    this.setUp = function (complete) {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "ReuseTests";
        newNode.innerHTML =
            "<div id='reuseTestPlaceholder'></div>" +
            "<div id='reuseTestTemplate' class='reuseTemplateClass'>" +
            "   <div></div>" +
            "</div>" +
            "<div id='reuseGroupTestTemplate' class='reuseGroupTemplateClass'>" +
            "   <div></div>" +
            "</div>"
        document.body.appendChild(newNode);

        newItems = 0;
        disposedItemsCount = 0;
        disposedItems = [];
        removeListviewAnimations();
        appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        var element = document.getElementById("ReuseTests");
        document.body.removeChild(element);
        restoreListviewAnimations();
        removeCSSFileFromHead("$(TESTDATA)/Listview.css");
    }

    function setupListView(element, layoutName) {
        function groupKey(data) {
            return data.group;
        }

        function groupData(data) {
            return { title: data.group };
        }

        function createRenderer() {
            return function renderer(itemPromise) {
                return itemPromise.then(function (item) {
                    var element = document.createElement("div");
                    element.style.width = element.style.height = "100px";
                    element.textContent = item.data.title;
                    return element;
                });
            };
        }

        var items = [];
        for (var i = 0; i < 100; i++) {
            var gKey = String.fromCharCode("A".charCodeAt(0) + Math.floor(i / 10));
            items.push({ group: gKey, title: "Tile" + gKey + i });
        }
        var list = new WinJS.Binding.List(items).createGrouped(groupKey, groupData);

        return new WinJS.UI.ListView(element, {
            layout: new WinJS.UI[layoutName](),
            itemDataSource: list.dataSource,
            itemTemplate: createRenderer(),
            groupDataSource: list.groups.dataSource,
            groupHeaderTemplate: createRenderer()
        });
    }

    function itemRenderer(id, async) {
        var source = document.getElementById(id).cloneNode(true);
        source.id = "";
        return function itemRenderer(itemPromise) {
            newItems++;
            var element = source.cloneNode(true);
            element.msRendererPromise =
                itemPromise.
                    then(function (item) {
                        WinJS.Utilities.markDisposable(element, function () {
                            pushAction(item, "dispose");
                            disposedItems.push(item.data.title);
                        });
                        pushAction(item, "render");
                        element.myDataConnectionExpando = item.data.id;
                        element.children[0].textContent = item.data.title;
                    });
            if (async) {
                return WinJS.Promise.timeout(Math.floor(Math.random() * 1000)).then(function () {
                    return element;
                });
            } else {
                return element;
            }
        };
    }

    function checkSelection(listview, index, selected) {
        var tile = listview.elementFromIndex(index).parentNode;
        LiveUnit.Assert.areEqual(selected, utilities.hasClass(tile, WinJS.UI._selectedClass));
    }

    function checkTile(listview, index) {
        var tile = listview.elementFromIndex(index),
            container = containerFrom(tile),
            left = Math.floor(index / 3) * 100,
            top = (index - 3 * Math.floor(index / 3)) * 100;

        LiveUnit.Assert.areEqual("Tile" + index, tile.textContent);
        LiveUnit.Assert.areEqual(left, offsetLeftFromSurface(listview, container), "Error in tile " + index);
        LiveUnit.Assert.areEqual(top, offsetTopFromSurface(listview, container), "Error in tile " + index);
    }

    function testDispose(layoutName, complete) {
        var element = document.getElementById("reuseTestPlaceholder"),
            myData = new WinJS.Binding.List();
        for (var i = 0; i < 300; i++) {
            myData.push({ title: i });
        }

        var listview = new WinJS.UI.ListView(element, {
            layout: new WinJS.UI[layoutName](),
            itemDataSource: myData.dataSource,
            itemTemplate: itemRenderer("reuseTestTemplate"),
        });
        var expectedReleasedItems = [];

        var tests = [
            // Make sure the initial state is what we are expecting
            function () {
                var expected = 9 * 3;
                LiveUnit.Assert.areEqual(expected, getRealizedCount(element));
                LiveUnit.Assert.areEqual(expected, newItems);
                LiveUnit.Assert.areEqual(0, disposedItemsCount);
                elementsEqual([], disposedItems);
            },

            // In the following tests, note that:
            // 0, 7, and 26 are realized items so manipulating them should trigger calls to dispose.
            // 45 and 100 are unrealized items so manipulating them should not trigger calls to dispose.

            // Ensure changing an item in the data source triggers a call to dispose
            function () {
                function checkChangeItem(index, newData, additionalDisposeItems) {
                    myData.setAt(index, newData);
                    expectedReleasedItems = expectedReleasedItems.concat(additionalDisposeItems);
                    elementsEqual(expectedReleasedItems, disposedItems);
                    // If the item was disposed, ensure it was disposed before it was rendered
                    if (additionalDisposeItems.length > 0) {
                        checkDisposeBeforeRender(index);
                    }
                    actionHistory = {};
                }

                actionHistory = {};
                checkChangeItem(0, { title: "Zero" }, [0]);
                checkChangeItem(45, { title: "Fourty-five" }, []);
                checkChangeItem(26, { title: "Twenty-six" }, [26]);
                checkChangeItem(7, { title: "Seven" }, [7]);
                checkChangeItem(100, { title: "One Hundred" }, []);
            },

            // Ensure removing items from the data source triggers a call to dispose
            function () {
                function removeItems(startIndex, howMany, additionalDisposeItems) {
                    myData.splice(startIndex, howMany);
                    expectedReleasedItems = expectedReleasedItems.concat(additionalDisposeItems);
                }

                removeItems(45, 1, []);
                removeItems(26, 1, ["Twenty-six"]);
                removeItems(0, 1, ["Zero"]);
                removeItems(1, 10, [2, 3, 4, 5, 6, "Seven", 8, 9, 10, 11]);
                removeItems(100, 1, []);

                waitForDeferredAction(listview)().then(function () {
                    // Unlike change notifications, remove notifications don't call dispose until
                    // the animation completes.
                    elementsEqual(expectedReleasedItems.sort(), disposedItems.sort());
                    complete();
                });
            }
        ];
        runTests(listview, tests);
    };

    // Ensures dispose is called due to the following data source changes:
    // - Item changed
    // - Item removed
    this.testDispose_GridLayout = function (complete) {
        testDispose("GridLayout", complete, false);
    };

    this.generateChangeSelected = function (layoutName) {
        this["testChangeSelected" + layoutName] = function (complete) {
            var items = [];
            for (var i = 0; i < 100; i++) {
                items.push({ title: "Tile" + i });
            }
            var list = new WinJS.Binding.List(items);

            function renderer(itemPromise, recycled) {
                return itemPromise.then(function (item) {
                    var element = recycled;
                    if (!element) {
                        element = document.createElement("div");
                        element.style.width = element.style.height = "100px";
                    }
                    element.textContent = item.data.title;
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "600px";
            newNode.style.height = "600px";
            document.body.appendChild(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer,
                layout: new WinJS.UI[layoutName]()
            });
            listView.selection.set(0);

            function checkTile(listview, index, text, selected) {
                var tile = listview.elementFromIndex(index),
                    wrapper = tile.parentNode;
                LiveUnit.Assert.areEqual(text, tile.textContent);
                LiveUnit.Assert.areEqual(selected, utilities.hasClass(wrapper, WinJS.UI._selectedClass));
                LiveUnit.Assert.areEqual(selected, tile.getAttribute("aria-selected") === "true");
                LiveUnit.Assert.areEqual(selected, WinJS.UI._isSelectionRendered(wrapper));
            }

            var tests = [
                function () {
                    checkTile(listView, 0, "Tile0", true);
                    checkTile(listView, 1, "Tile1", false);
                    list.setAt(0, { title: "Changed" });
                    return true;
                },
                function () {
                    checkTile(listView, 0, "Changed", true);
                    checkTile(listView, 1, "Tile1", false);
                    document.body.removeChild(newNode);
                    complete();
                },
            ];
            runTests(listView, tests);
        };
    };
    this.generateChangeSelected("ListLayout");

    this.generateAriaCleanup = function (layoutName) {
        this["testAriaCleanup" + layoutName] = function (complete) {
            var items = [];
            for (var i = 0; i < 100; i++) {
                items.push({ title: "Tile" + i });
            }
            var list = new WinJS.Binding.List(items);

            function renderer(itemPromise, recycled) {
                return itemPromise.then(function (item) {
                    var element = recycled;
                    if (!element) {
                        element = document.createElement("div");
                        element.style.width = element.style.height = "100px";
                    }
                    element.textContent = item.data.title;
                    return element;
                });
            }

            var newNode = document.createElement("div");
            newNode.style.width = "300px";
            newNode.style.height = "300px";
            document.body.appendChild(newNode);
            var listView = new WinJS.UI.ListView(newNode, {
                itemDataSource: list.dataSource,
                itemTemplate: renderer
            });
            listView.selection.set([0, 1, 2, 3]);

            waitForReady(listView)().then(function () {
                LiveUnit.Assert.areEqual(4, newNode.querySelectorAll("[aria-selected='true']").length);
                listView.ensureVisible(99);
                return waitForDeferredAction(listView)();
            }).then(function () {
                LiveUnit.Assert.areEqual(0, newNode.querySelectorAll("[aria-selected='true']").length);
                listView.ensureVisible(0);
                return waitForDeferredAction(listView)();
            }).then(function () {
                LiveUnit.Assert.areEqual(4, newNode.querySelectorAll("[aria-selected='true']").length);
                document.body.removeChild(newNode);
                complete();
            })
        };
    };
    this.generateAriaCleanup("GridLayout");

    // Check that items, group headers, and grouping elements are not leaked in the DOM
    // after the user scrolls. For example, check that there isn't a win-item in the DOM
    // which isn't associated with any of the realized items.
    function domCleanupAfterScrollingTest(layoutName, complete) {
        function expectedNumberOfItemsInDom() {
            var count = 0;
            listView._view.items.each(function (index, itemElement, itemData) {
                count++;
            });
            return count;
        }

        function expectedNumberOfGroupsInDom() {
            return listView._groups.groups.reduce(function (count, group) {
                return group.elements || group.header ? count + 1 : count;
            }, 0);
        }

        var newNode = document.createElement("div");
        newNode.style.width = "300px";
        newNode.style.height = "300px";
        document.body.appendChild(newNode);
        var listView = setupListView(newNode, layoutName);

        var tests = [
            function () {
                listView.ensureVisible(99);
                return true;
            },
            function () {
                listView.ensureVisible(0);
                return true;
            },
            function () {
                // Wait 1 second for the ARIA attributes to be set. Then we can find the
                // grouping elements in the DOM by their role.
                setTimeout(function () {
                    LiveUnit.Assert.areEqual(expectedNumberOfItemsInDom(),
                        listView._canvas.querySelectorAll(".win-item").length,
                        "Incorrect number of items in the DOM");
                    LiveUnit.Assert.areEqual(expectedNumberOfGroupsInDom(),
                        listView._canvas.querySelectorAll(".win-groupheader").length,
                        "Incorrect number of group headers in the DOM");

                    document.body.removeChild(newNode);
                    complete();
                }, 1000);
            },
        ];
        runTests(listView, tests);
    }
    this.testDomCleanupAfterScrolling_GridLayout = function (complete) {
        domCleanupAfterScrollingTest("GridLayout", complete);
    };
};

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ReuseTests");
