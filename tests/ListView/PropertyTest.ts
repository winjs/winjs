// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <deploy src="../TestData/" />

module WinJSTests {

    "use strict";

    var isPhone = WinJS.Utilities.isPhone;
    var publicProperties = {
        selectionMode: {
            exists: true,
            getValidValues: function () {
                return isPhone ? [WinJS.UI.SelectionMode.none, WinJS.UI.SelectionMode.multi] : [WinJS.UI.SelectionMode.none, WinJS.UI.SelectionMode.single, WinJS.UI.SelectionMode.multi];
            },
            getInvalidValues: function () {
                return isPhone ? ['', WinJS.UI.SelectionMode.single, 'mul'] : ['', 'sing', 'mul'];
            }
        },
        tapBehavior: {
            getValidValues: function () {
                return isPhone ? [WinJS.UI.TapBehavior.none, WinJS.UI.TapBehavior.invokeOnly, WinJS.UI.TapBehavior.toggleSelect] : [WinJS.UI.TapBehavior.none, WinJS.UI.TapBehavior.invokeOnly, WinJS.UI.TapBehavior.toggleSelect, WinJS.UI.TapBehavior.directSelect];
            },
            getInvalidValues: function () {
                return isPhone ? [WinJS.UI.TapBehavior.directSelect] : [];
            }
        },
        groupHeaderTapBehavior: {
            getValidValues: function () {
                return [WinJS.UI.GroupHeaderTapBehavior.none, WinJS.UI.GroupHeaderTapBehavior.invoke];
            },
            getInvalidValues: function () {
                return [];
            }
        },
        indexOfFirstVisible: {
            setupListView: function (listView) { listView.itemDataSource.insertAtStart(null, {}); return WinJS.Promise.timeout(); },
            getValidValues: function () {
                return [0];
            },
            getInvalidValues: function () {
                return [-1];
            }
        },
        itemDataSource: {
            getValidValues: function () {
                return [new WinJS.Binding.List().dataSource];
            },
            getInvalidValues: function () {
                // ListView does not handle invalid values of dataSource
                return;
            }
        },
        groupDataSource: {
            getValidValues: function () {
                return [new WinJS.Binding.List().dataSource];
            },
            getInvalidValues: function () {
                // ListView does not handle invalid values of dataSource
                return;
            }
        },
        itemTemplate: {
            getValidValues: function () {
                return [function (itemPromise) { return document.createElement("div"); }];
            },
            getInvalidValues: function () {
                return ["template"];
            }
        },
        groupHeaderTemplate: {
            getValidValues: function () {
                return [function (itemPromise) { return document.createElement("div"); }];
            },
            getInvalidValues: function () {
                return ["template"];
            }
        },
        currentItem: {
            setupListView: function (listView) {
                var list = new WinJS.Binding.List([{}, {}]);
                var glist = list.createGrouped(function groupKey(item) { return "0"; }, function groupData(item) { return { group: "0" }; });
                listView.itemDataSource = glist.dataSource;
                listView.groupDataSource = glist.groups.dataSource;
                return WinJS.Promise.timeout(500); // Need to give DOM time to paint otherwise the call to setActive() fails.
            },
            getValidValues: function () {
                return [
                    { index: 0 },
                    { index: 0, hasFocus: false },
                    { index: 0, hasFocus: true, showFocus: true },
                    { index: 0, hasFocus: true, showFocus: false },
                    { key: "0" },
                    { key: "0", hasFocus: false },
                    { key: "0", hasFocus: true, showFocus: true },
                    { key: "0", hasFocus: true, showFocus: false },

                    { index: 0, type: WinJS.UI.ObjectType.item },
                    { index: 0, hasFocus: false, type: WinJS.UI.ObjectType.item },
                    { index: 0, hasFocus: true, showFocus: true, type: WinJS.UI.ObjectType.item },
                    { index: 0, hasFocus: true, showFocus: false, type: WinJS.UI.ObjectType.item },
                    { key: "0", type: WinJS.UI.ObjectType.item },
                    { key: "0", hasFocus: false, type: WinJS.UI.ObjectType.item },
                    { key: "0", hasFocus: true, showFocus: true, type: WinJS.UI.ObjectType.item },
                    { key: "0", hasFocus: true, showFocus: false, type: WinJS.UI.ObjectType.item },

                    { index: 0, type: WinJS.UI.ObjectType.groupHeader },
                    { index: 0, hasFocus: false, type: WinJS.UI.ObjectType.groupHeader },
                    { index: 0, hasFocus: true, showFocus: true, type: WinJS.UI.ObjectType.groupHeader },
                    { index: 0, hasFocus: true, showFocus: false, type: WinJS.UI.ObjectType.groupHeader },
                    { key: "0", type: WinJS.UI.ObjectType.groupHeader },
                    { key: "0", hasFocus: false, type: WinJS.UI.ObjectType.groupHeader },
                    { key: "0", hasFocus: true, showFocus: true, type: WinJS.UI.ObjectType.groupHeader },
                    { key: "0", hasFocus: true, showFocus: false, type: WinJS.UI.ObjectType.groupHeader }
                ];
            },
            getInvalidValues: function () {
                // ListView does not handle invalid values of currentItem
                return;
            },
            validate: function (listView, value) {
                if (+value.index === value.index) {
                    LiveUnit.Assert.areEqual(value.index, listView.currentItem.index);
                } else {
                    // Key must have been specified
                    LiveUnit.Assert.areEqual(value.key, listView.currentItem.key);
                }

                LiveUnit.Assert.areEqual(value.hasFocus ? true : listView.element.contains(document.activeElement), listView.currentItem.hasFocus);
                LiveUnit.Assert.areEqual(value.showFocus ? true : false, listView.currentItem.showFocus);

                if (value.type !== WinJS.UI.ObjectType.groupHeader) {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.item, listView.currentItem.type);

                    var itemElement = listView.elementFromIndex(listView.currentItem.index);
                    if (value.hasFocus) {
                        LiveUnit.Assert.areEqual(document.activeElement, itemElement);
                    }

                    if (value.showFocus) {
                        LiveUnit.Assert.areEqual(1, itemElement.parentNode.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
                        LiveUnit.Assert.isTrue(WinJS.Utilities._matchesSelector(itemElement.parentNode, "." + WinJS.UI._itemFocusClass));

                        var focusOutlineElement = itemElement.parentNode.querySelector("." + WinJS.UI._itemFocusOutlineClass);
                        if (isPhone) {
                            LiveUnit.Assert.areEqual("transparent", getComputedStyle(focusOutlineElement).outlineColor);
                            LiveUnit.Assert.areEqual("none", getComputedStyle(focusOutlineElement).outlineStyle);
                            LiveUnit.Assert.areEqual("0px", getComputedStyle(focusOutlineElement).outlineWidth);
                        } else {
                            LiveUnit.Assert.areNotEqual("transparent", getComputedStyle(focusOutlineElement).outlineColor);
                            LiveUnit.Assert.areEqual("dashed", getComputedStyle(focusOutlineElement).outlineStyle);
                            LiveUnit.Assert.areEqual("2px", getComputedStyle(focusOutlineElement).outlineWidth);
                        }
                    } else {
                        LiveUnit.Assert.areEqual(0, itemElement.parentNode.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
                        LiveUnit.Assert.isFalse(WinJS.Utilities._matchesSelector(itemElement.parentNode, "." + WinJS.UI._itemFocusClass));
                    }
                } else {
                    LiveUnit.Assert.areEqual(WinJS.UI.ObjectType.groupHeader, listView.currentItem.type);

                    var groupHeaderElement = listView.element.querySelector("." + WinJS.UI._headerClass);
                    if (value.hasFocus) {
                        LiveUnit.Assert.areEqual(document.activeElement, groupHeaderElement);
                    }

                    if (value.showFocus) {
                        LiveUnit.Assert.isTrue(WinJS.Utilities._matchesSelector(groupHeaderElement, "." + WinJS.UI._itemFocusClass));

                        if (isPhone) {
                            LiveUnit.Assert.areEqual("transparent", getComputedStyle(groupHeaderElement).outlineColor);
                            LiveUnit.Assert.areEqual("none", getComputedStyle(groupHeaderElement).outlineStyle);
                        } else {
                            LiveUnit.Assert.areNotEqual("transparent", getComputedStyle(groupHeaderElement).outlineColor);
                            LiveUnit.Assert.areEqual("dotted", getComputedStyle(groupHeaderElement).outlineStyle);
                        }
                    } else {
                        LiveUnit.Assert.isFalse(WinJS.Utilities._matchesSelector(groupHeaderElement, "." + WinJS.UI._itemFocusClass));
                    }
                }
            }
        },
        layout: {
            getValidValues: function () {
                return (isPhone || !Helper.Browser.supportsCSSGrid) ?
                    [
                        new WinJS.UI.ListLayout({ orientation: WinJS.UI.Orientation.horizontal }),
                        new WinJS.UI.ListLayout({ orientation: WinJS.UI.Orientation.vertical }),
                        new WinJS.UI.GridLayout({ orientation: WinJS.UI.Orientation.horizontal }),
                        new WinJS.UI.GridLayout({ orientation: WinJS.UI.Orientation.vertical })
                    ] :
                    [
                        new WinJS.UI.ListLayout({ orientation: WinJS.UI.Orientation.horizontal }),
                        new WinJS.UI.ListLayout({ orientation: WinJS.UI.Orientation.vertical }),
                        new WinJS.UI.GridLayout({ orientation: WinJS.UI.Orientation.horizontal }),
                        new WinJS.UI.GridLayout({ orientation: WinJS.UI.Orientation.vertical }),
                        new WinJS.UI.CellSpanningLayout()
                    ];
            },
            getInvalidValues: function () {
                return isPhone ? [] : [];
            },
            validate: function (listView, value) {
                LiveUnit.Assert.areEqual(value, listView.layout);

                if (value.orientation === WinJS.UI.Orientation.horizontal) {
                    // Check for .win-horizontal
                    LiveUnit.Assert.isTrue(WinJS.Utilities._matchesSelector(listView._viewport, "." + WinJS.UI._horizontalClass));
                    LiveUnit.Assert.areEqual("auto", getComputedStyle(listView._viewport).overflowX);
                    LiveUnit.Assert.areEqual("hidden", getComputedStyle(listView._viewport).overflowY);
                } else {
                    LiveUnit.Assert.isTrue(WinJS.Utilities._matchesSelector(listView._viewport, "." + WinJS.UI._verticalClass));
                    LiveUnit.Assert.areEqual("hidden", getComputedStyle(listView._viewport).overflowX);
                    LiveUnit.Assert.areEqual("auto", getComputedStyle(listView._viewport).overflowY);
                }
            }
        },
        itemsDraggable: {
            getValidValues: function () {
                return isPhone ? [false] : [true, false];
            },
            getInvalidValues: function () {
                return isPhone ? [true] : [];
            }
        },
        itemsReorderable: {
            getValidValues: function () {
                return isPhone ? [false] : [true, false];
            },
            getInvalidValues: function () {
                return isPhone ? [true] : [];
            }
        }
    };

    export class PropertyTests {


        // This setup function will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "PropertyTests";
            newNode.innerHTML = "<div id='test1'></div>";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            var element = document.getElementById("PropertyTests");
            document.body.removeChild(element);
        }

        // Tests the winControl property after listView initialization
        testWinControl(complete) {
            LiveUnit.LoggingCore.logComment("In testWinControl");

            var testElement = document.getElementById("test1"),
                listView = new WinJS.UI.ListView(testElement);

            Helper.ListView.validateListView(listView);
            LiveUnit.Assert.isTrue(listView === testElement.winControl);
            complete();
        }
    }

    (function generatePropertyTests() {
        for (var i in publicProperties) {
            (function (i) {
                PropertyTests.prototype["testGetAndSet_" + i] = function (complete) {
                    LiveUnit.LoggingCore.logComment("isPhone: " + isPhone);

                    var testElement = document.getElementById("test1"),
                        listView = new WinJS.UI.ListView(testElement);

                    var promise = WinJS.Promise.wrap();
                    if (publicProperties[i].setupListView) {
                        promise = WinJS.Promise.as(publicProperties[i].setupListView(listView));
                    }

                    promise.done(function () {
                        var validCases = publicProperties[i].getValidValues();
                        for (var x in validCases) {
                            listView[i] = validCases[x];

                            if (publicProperties[i].validate) {
                                publicProperties[i].validate(listView, validCases[x]);
                            } else {
                                // Default validation
                                LiveUnit.Assert.areEqual(validCases[x], listView[i]);
                            }
                        }

                        var invalidCases = publicProperties[i].getInvalidValues();
                        for (var x in invalidCases) {
                            var oldValue = listView[i];
                            try {
                                listView[i] = invalidCases[x];
                            } catch (e) {

                            }
                            LiveUnit.Assert.areEqual(oldValue, listView[i]);
                        }

                        complete();
                    });
                };
            })(i);
        }
    })();
    
    var disabledTestRegistry = {
        testGetAndSet_indexOfFirstVisible: [
            Helper.Browsers.chrome,
            Helper.Browsers.safari,
            Helper.Browsers.firefox,
            Helper.Browsers.android
        ]
    };
    Helper.disableTests(PropertyTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.PropertyTests");