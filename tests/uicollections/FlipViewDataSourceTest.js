// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/ItemsManager/TestDataSource.js" />
/// <reference path="../TestLib/ItemsManager/UnitTestsCommon.js" />
/// <reference path="FlipperHelpers.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.FlipViewDatasourceTests = function () {
    "use strict";

    var COUNT = 6;

    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "BasicFlipView";
        newNode.style.width = "400px";
        newNode.style.height = "400px";
        document.body.appendChild(newNode);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        var element = document.getElementById("BasicFlipView");
        if (element) {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        }
    }

    this.generate = function (name, testFunction) {
        function generateTest(that, orientation) {
            that[name + "_" + orientation] = function (complete) {
                var element = document.getElementById("BasicFlipView"),
                    testData = createArraySource(COUNT, ["400px"], ["400px"]),
                    rawData = testData.rawData,
                    flipView = new WinJS.UI.FlipView(element, {itemDataSource: testData.dataSource, itemTemplate: basicInstantRenderer, orientation: orientation});
                setupQuickAnimations(flipView);
                testFunction(element, flipView, rawData, complete);
            };
        }

        generateTest(this, "horizontal");
        generateTest(this, "vertical");
    }
    this.generate("testFlipViewDatasourceProperty", datasourceTest);
    this.generate("testFlipViewRendererProperty", rendererTest);
    this.generate("testFlipViewDSAndRendererDuringAnimation", changeDuringAnimationTest);
    this.generate("testFlipViewChangeToNullDataSource", changeToNullDataSource);
    this.generate("testFlipViewInsertAndChangeInDataSource", insertAndChangeInDatasource);
    this.generate("testFlipViewShiftAndChangeInDataSource", shiftAndChangeInDatasource);
    this.generate("testFlipViewNavigateAndSpliceTwiceInDataSource", navigateAndSpliceTwiceInDataSource);
    this.generate("testFlipViewInsertJumpAndChangeInDataSource", insertJumpAndChangeInDataSource);
    
    function navigateAndSpliceTwiceInDataSource(element, flipView, rawData, complete) {
        var data = [
            { title: "New Delhi", data1: "India" },
            { title: "Redmond", data1: "America" }
        ];
        var list = new WinJS.Binding.List(data);
        var tests = [
            function () {
                var ds = list.dataSource;
                flipView.itemDataSource = ds;
            },
            function () {
                flipView.next();
                list.splice(2, 1);
                list.splice(1, 1);
                WinJS.Promise.timeout(2000).then(function () {
                    LiveUnit.Assert.areEqual("New DelhiIndia", flipView._pageManager._currentPage.element.textContent);
                    complete();
                });
            }
        ];
        runFlipViewTests(flipView, tests);
    }

    function insertJumpAndChangeInDataSource(element, flipView, rawData, complete) {
        var data = [
            { title: "New Delhi", data1: "India" },
            { title: "Redmond", data1: "America" },
            { title: "Seattle", data1: "America" }
        ];
        var list = new WinJS.Binding.List(data);
        var tests = [
            function () {
                var ds = list.dataSource;
                flipView.itemDataSource = ds;
            },
            function () {
                // Insert
                list.unshift({ title: "Bellevue", data1: "America" });

                // Jump
                flipView.currentPage = 0;

                WinJS.Utilities._setImmediate(function () {
                    // Change
                    list.setAt(0, { title: "Tampa", data1: "America" });
                    LiveUnit.Assert.areEqual("TampaAmerica", flipView._pageManager._currentPage.element.textContent);
                    complete();
                });
            }
        ];
        runFlipViewTests(flipView, tests);
    }

    function insertAndChangeInDatasource(element, flipView, rawData, complete) {
        var data = [
            { title: "New Delhi", data1: "India" },
            { title: "Redmond", data1: "America" }
        ];
        var list = new WinJS.Binding.List(data);
        var tests = [
            function () {
                var ds = list.dataSource;
                flipView.itemDataSource = ds;
            },
            function () {
                list.push({ title: "Tampa", data1: "US" });
                list.setAt(2, { title: "Boston", data1: "US" });
                list.setAt(2, { title: "Seattle", data1: "US" });
                flipView.currentPage = 2;
            },
            function () {
                LiveUnit.Assert.areEqual("SeattleUS", flipView._pageManager._currentPage.element.textContent);
                complete();
            }
        ];
        runFlipViewTests(flipView, tests);
    }

    function shiftAndChangeInDatasource(element, flipView, rawData, complete) {
        var data = [
            { title: "Tokio", data1: "Japan" },
            { title: "Paris", data1: "France" }
        ];
        var list = new WinJS.Binding.List(data);
        var tests = [
            function () {
                var ds = list.dataSource;
                flipView.itemDataSource = ds;
            },
            function () {
                list.shift({ title: "Atlanta", data1: "US" });
                list.setAt(0, { title: "Miami", data1: "US" });
                list.setAt(0, { title: "San Jose", data1: "US" });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual("San JoseUS", flipView._pageManager._currentPage.element.textContent);
                complete();
            }
        ];
        runFlipViewTests(flipView, tests);
    }

    function verifyDisplayedItem(flipView, rawData) {
        LiveUnit.LoggingCore.logComment("Verifying displayed page is correct");
        LiveUnit.Assert.isTrue(currentPageInView(flipView));
        flipView.itemTemplate.verifyOutput(getDisplayedElement(flipView), rawData);
    }

    function verifyNoOldDataRemains(element, className) {
        LiveUnit.Assert.areEqual(0, element.querySelectorAll(className).length);
    }
    
    function datasourceTest(element, flipView, rawData, complete) {
        var otherSource = createArraySource(COUNT * 2, ["400px"], ["400px"], "newData"),
            otherRawData = otherSource.rawData,
            pageInvisible,
            pageVisible,
            oldCurrentPage;

        flipView.addEventListener("pagevisibilitychanged", function (e) {
            if (e.detail.visible) {
                pageVisible = e.target;
            } else {
                pageInvisible = e.target;
            }
        }, false);
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[1]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(2, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[2]);
                flipView.currentPage = 5;
            },
            function () {
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[5]);
                oldCurrentPage = getDisplayedElement(flipView);
                pageVisible = null;
                pageInvisible = null;
                flipView.itemDataSource = otherSource.dataSource;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyDisplayedItem(flipView, otherRawData[0]);
                LiveUnit.Assert.areEqual(pageInvisible, oldCurrentPage);
                LiveUnit.Assert.areEqual(pageVisible, getDisplayedElement(flipView));
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyDisplayedItem(flipView, otherRawData[1]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(2, flipView.currentPage);
                verifyDisplayedItem(flipView, otherRawData[2]);
                flipView.currentPage = 11;
            },
            function () {
                LiveUnit.Assert.areEqual(11, flipView.currentPage);
                verifyDisplayedItem(flipView, otherRawData[11]);
                LiveUnit.Assert.isFalse(flipView.next());
                complete();
            },
        ];

        runFlipViewTests(flipView, tests);
    }

    function rendererTest(element, flipView, rawData, complete) {
        var pageInvisible,
            pageVisible,
            oldCurrentPage;

        flipView.addEventListener("pagevisibilitychanged", function (e) {
            if (e.detail.visible) {
                pageVisible = e.target;
            } else {
                pageInvisible = e.target;
            }
        }, false);
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[1]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(2, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[2]);
                flipView.currentPage = 5;
            },
            function () {
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[5]);
                pageInvisible = null;
                pageVisible = null;
                oldCurrentPage = getDisplayedElement(flipView);
                flipView.itemTemplate = alternateBasicInstantRenderer;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyDisplayedItem(flipView, rawData[0]);
                LiveUnit.Assert.areEqual(pageInvisible, oldCurrentPage);
                LiveUnit.Assert.areEqual(pageVisible, getDisplayedElement(flipView));
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[1]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(2, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[2]);
                flipView.currentPage = 5;
            },
            function () {
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[5]);
                LiveUnit.Assert.isFalse(flipView.next());
                complete();
            },
        ];

        runFlipViewTests(flipView, tests);
    }

    function changeDuringAnimationTest(element, flipView, rawData, complete) {
        var otherSource = createArraySource(COUNT * 2, ["400px"], ["400px"], "newData"),
            otherRawData = otherSource.rawData;
        var tests = [
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyDisplayedItem(flipView, rawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                flipView.itemDataSource = otherSource.dataSource;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyDisplayedItem(flipView, otherRawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyDisplayedItem(flipView, otherRawData[1]);
                flipView.currentPage = 5;
            },
            function () {
                verifyNoOldDataRemains(element, rawData[0].className);
                LiveUnit.Assert.areEqual(5, flipView.currentPage);
                verifyDisplayedItem(flipView, otherRawData[5]);
                flipView.currentPage = 0;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyDisplayedItem(flipView, otherRawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                flipView.itemTemplate = alternateBasicInstantRenderer;
            },
            function () {
                LiveUnit.Assert.areEqual(0, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyNoOldDataRemains(element, otherRawData[0].className);
                verifyDisplayedItem(flipView, otherRawData[0]);
                LiveUnit.Assert.isTrue(flipView.next());
            },
            function () {
                LiveUnit.Assert.areEqual(1, flipView.currentPage);
                verifyNoOldDataRemains(element, rawData[0].className);
                verifyNoOldDataRemains(element, otherRawData[0].className);
                verifyDisplayedItem(flipView, otherRawData[1]);
                complete();
            }
        ];
        runFlipViewTests(flipView, tests);
    }

    function changeToNullDataSource(element, flipView, rawData, complete) {
        var tests = [
            function () {
                flipView.itemDataSource = null;
                return true;
            },
            function () {
                flipView.count().done(function(count) {
                    LiveUnit.Assert.areEqual(0, count);
                    complete();
                });
            }
        ];
        runFlipViewTests(flipView, tests);
    }

    this.testBatchNotificationMoveThenRemove = function (complete) {
        initUnhandledErrors();

        var element = document.createElement("div");
        document.body.appendChild(element);

        var bl = new WinJS.Binding.List();
        var currentCount = 1;
        for (var i = 0; i < 6; i++) {
            bl.push({ title: i });
            currentCount++;
        }

        var fv = new WinJS.UI.FlipView(element, {
            itemDataSource: bl.dataSource,
            currentPage: 3,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (value) {
                    var el = document.createElement("div");
                    el.textContent = value.data.title;
                    el.style.height = el.style.width = "100px";
                    el.style.backgroundColor = "teal";
                    return el;
                });
            }
        });

        var dsChanged = false;
        fv.addEventListener("pagecompleted", function updateDS() {
            if (!dsChanged) {
                bl.dataSource.beginEdits();

                // move index 4 to 1
                bl.move(4, 1);

                //remove at 4
                bl.splice(4, 1);

                bl.dataSource.endEdits();

                dsChanged = true;
            } else {
                validateUnhandledErrors();
                validateInternalBuffers(fv);
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
                complete();
            }
        });
    };

    this.testReleasedItemAfterInsertAtIndexOne = function (complete) {
        initUnhandledErrors();

        var element = document.createElement("div");
        document.body.appendChild(element);

        var bl = new WinJS.Binding.List();
        var currentCount = 1;
        for (var i = 0; i < 6; i++) {
            bl.push({ title: i });
            currentCount++;
        }

        var fv = new WinJS.UI.FlipView(element, {
            itemDataSource: bl.dataSource,
            currentPage: 0,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (value) {
                    var el = document.createElement("div");
                    el.textContent = value.data.title;
                    el.style.height = el.style.width = "100px";
                    el.style.backgroundColor = "teal";
                    return el;
                });
            }
        });

        fv.addEventListener("pagecompleted", function updateDS() {
            bl.splice(1, 0, { title: "new" });

            fv._pageManager._notificationsEndedSignal.promise.then(function () {
                validateUnhandledErrors();
                validateInternalBuffers(fv);
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
                complete();
            });
        });
    };

    this.testBatchOfRandomChanges = function (complete) {
        initUnhandledErrors();

        var element = document.createElement("div");
        document.body.appendChild(element);

        var bl = new WinJS.Binding.List();
        for (var i = 0; i < 20; i++) {
            bl.push({ title: String.fromCharCode(97 + i) });
        }

        var fv = new WinJS.UI.FlipView(element, {
            itemDataSource: bl.dataSource,
            currentPage:4,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (value) {
                    var el = document.createElement("div");
                    el.textContent = value.data.title;
                    el.style.height = el.style.width = "100px";
                    return el;
                });
            }
        });

        fv.addEventListener("pagecompleted", function () {
             bl.dataSource.beginEdits();

            //add item at index 3
            bl.splice(3, 0, { title: "new1" });

            //remove at 5
            bl.splice(5, 1);

            // move index 4 to 1
            bl.move(4, 1);

            //remove at 4
            bl.splice(4, 1);

            //add item at index 3
            bl.splice(3, 0, { title: "new2" });

            bl.dataSource.endEdits();

            fv._pageManager._notificationsEndedSignal.promise.then(function () {
                validateUnhandledErrors();
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.element.textContent, "f");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.element.textContent, "g");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.next.element.textContent, "h");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.element.textContent, "c");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.prev.element.textContent, "new2");
                document.body.removeChild(element);
                complete();
            });
        });
    };

    this.testBatchOfMoveThenDeleteAtSameIndex = function (complete) {
        initUnhandledErrors();

        var element = document.createElement("div");
        document.body.appendChild(element);

        var bl = new WinJS.Binding.List();
        for (var i = 0; i < 20; i++) {
            bl.push({ title: String.fromCharCode(97 + i) });
        }

        var fv = new WinJS.UI.FlipView(element, {
            itemDataSource: bl.dataSource,
            currentPage: 2,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (value) {
                    var el = document.createElement("div");
                    el.textContent = value.data.title;
                    el.style.height = el.style.width = "100px";
                    return el;
                });
            }
        });

        fv.addEventListener("pagecompleted", function () {
            bl.dataSource.beginEdits();

            // move index 4 to 1
            bl.move(4, 1);

            //remove at 4
            bl.splice(4, 1);

            bl.dataSource.endEdits();

            fv._pageManager._notificationsEndedSignal.promise.then(function () {
                validateUnhandledErrors();
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.element.textContent, "c");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.element.textContent, "f");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.next.element.textContent, "g");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.element.textContent, "b");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.prev.element.textContent, "e");
                document.body.removeChild(element);
                complete();
            });
        });
    };

    this.testUpdateCurrentElementThenBatchOfRandomChanges = function (complete) {
        initUnhandledErrors();

        var element = document.createElement("div");
        document.body.appendChild(element);

        var bl = new WinJS.Binding.List();
        for (var i = 0; i < 20; i++) {
            bl.push({ title: String.fromCharCode(97 + i) });
        }

        var fv = new WinJS.UI.FlipView(element, {
            itemDataSource: bl.dataSource,
            currentPage: 1,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (value) {
                    var el = document.createElement("div");
                    el.textContent = value.data.title;
                    el.style.height = el.style.width = "100px";
                    return el;
                });
            }
        });

        fv.addEventListener("pagecompleted", function () {
            bl.setAt(1, { title: "changed" });

            bl.dataSource.beginEdits();
               
            //add item at index 3
            bl.splice(3, 0, { title: "new 1" });

            //remove at 5
            bl.splice(5, 1);

            // move index 4 to 1
            bl.move(4, 1);

            //remove at 4
            bl.splice(4, 1);

            //add item at index 3
            bl.splice(3, 0, { title: "new2" });

            bl.dataSource.endEdits();
            fv._pageManager._notificationsEndedSignal.promise.then(function () {
                validateUnhandledErrors();
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.element.textContent, "changed");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.element.textContent, "new2");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.next.element.textContent, "c");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.element.textContent, "d");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.prev.element.textContent, "a");
                document.body.removeChild(element);
                complete();
            });
        });
    };

    this.testChangesMovingCurrentViewportThenDeleteItem = function (complete) {
        initUnhandledErrors();

        var element = document.createElement("div");
        document.body.appendChild(element);

        var bl = new WinJS.Binding.List();
        for (var i = 0; i < 20; i++) {
            bl.push({ title: String.fromCharCode(97 + i) });
        }

        var fv = new WinJS.UI.FlipView(element, {
            itemDataSource: bl.dataSource,
            currentPage: 1,
            itemTemplate: function (itemPromise) {
                return itemPromise.then(function (value) {
                    var el = document.createElement("div");
                    el.textContent = value.data.title;
                    el.style.height = el.style.width = "100px";
                    return el;
                });
            }
        });

        fv.addEventListener("pagecompleted", function () {
            bl.dataSource.beginEdits();

            // move index 3 to 1
            bl.move(3, 1);

            //remove at 3
            bl.splice(3, 1);

            bl.dataSource.endEdits();

            //remove at 1
            bl.splice(1, 1);

            fv._pageManager._notificationsEndedSignal.promise.then(function () {
                validateUnhandledErrors();
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.element.textContent, "b");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.element.textContent, "e");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.next.next.element.textContent, "f");
                LiveUnit.Assert.areEqual(fv._pageManager._currentPage.prev.element.textContent, "a");
                LiveUnit.Assert.isTrue(!fv._pageManager._currentPage.prev.prev.element);
                document.body.removeChild(element);
                complete();
            });
        });
    };
};

LiveUnit.registerTestClass("WinJSTests.FlipViewDatasourceTests");
