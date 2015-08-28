// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/TestDataSource.ts"/>
// <reference path="../TestData/ListView.less.css" />

module WinJSTests {

    "use strict";

    var testRootEl;

    function createSezo(layoutOptions, gids, gds, sezoOptions?) {
        var sezoDiv = document.getElementById("sezoDiv"),
            listDiv1 = <HTMLElement>sezoDiv.children[0],
            listDiv2 = <HTMLElement>sezoDiv.children[1],
            layoutName = layoutOptions.type,
            orientation = layoutOptions.orientation,
            list1 = new WinJS.UI.ListView(listDiv1, {
                itemDataSource: gids,
                itemTemplate: Helper.syncJSTemplate,
                groupDataSource: gds,
                groupHeaderTemplate: Helper.syncJSTemplate,
                layout: new WinJS.UI[layoutName]({ orientation: orientation })
            }),
            list2 = new WinJS.UI.ListView(listDiv2, {
                itemDataSource: gds,
                itemTemplate: Helper.syncJSTemplate,
                layout: new WinJS.UI[layoutName]({ orientation: orientation })
            }),
            sezo = <WinJS.UI.ISemanticZoom> new WinJS.UI.SemanticZoom(sezoDiv, (sezoOptions ? sezoOptions : {}));

        // Verify accessibility
        var checkAttribute = function (element, attribute, expectedValue) {
            var values = element.getAttribute(attribute).match(expectedValue),
                value = values ? values[0] : null;

            LiveUnit.LoggingCore.logComment("Expected " + attribute + ": " + expectedValue + " Actual: " + value);
            LiveUnit.Assert.areEqual(value, expectedValue, "Expected " + attribute + ": " + expectedValue +
                " Actual: " + value);
        };

        checkAttribute(sezo.element, "role", "ms-semanticzoomcontainer");
        checkAttribute(sezo.element, "aria-checked", sezo.zoomedOut.toString());
        var button = sezo.element.querySelector(".win-semanticzoom-button");
        if (button) {
            checkAttribute(sezo.element.querySelector(".win-semanticzoom-button"), "aria-hidden", "true");
        }

        return sezo;
    }

    function createSezoWithBindingList(layoutOptions, itemCount, sezoOptions?) {
        var bl = Helper.createBindingList(itemCount),
            groupBL = bl.createGrouped(Helper.groupKey, Helper.groupData),
            sezo = createSezo(layoutOptions, groupBL.dataSource, groupBL.groups.dataSource, sezoOptions);

        return sezo;
    }

    function createSezoWithVDS(layoutOptions, itemCount, sezoOptions) {
        var vds = Helper.createTestDataSource(itemCount),
            groupVDS = WinJS.UI.computeDataSourceGroups(vds, Helper.groupKey, Helper.groupData),
            sezo = createSezo(layoutOptions, groupVDS, groupVDS.groups, sezoOptions);
        return sezo;
    }

    function zoomAndVerify(sezo, startIndex, input) {
        var listDiv1 = document.getElementById("child1"),
            listDiv2 = document.getElementById("child2"),
            list1 = listDiv1.winControl,
            list2 = listDiv2.winControl,
            zoomItem;

        function VerifyIsVisible(listView, index) {
            LiveUnit.Assert.isTrue(index >= listView.indexOfFirstVisible, "Expecting index (" + index + ") >= indexOfFirstVisible (" + listView.indexOfFirstVisible + ")");
            LiveUnit.Assert.isTrue(index <= listView.indexOfLastVisible, "Expecting index (" + index + ") <= indexOfFirstVisible (" + listView.indexOfLastVisible + ")");
        }

        return Helper.ListView.waitForReady(list1)().
            then(function () {
                list1.indexOfFirstVisible = startIndex;
                return Helper.ListView.waitForReady(list1)();
            }).
            then(function () {
                // Hit test on the listView to get the item at the viewport center
                var style = getComputedStyle(sezo.element),
                    centerX = WinJS.Utilities.getScrollPosition(list1._viewport).scrollLeft + (parseInt(style.width, 10) / 2),
                    centerY = list1._viewport.scrollTop + parseInt(style.height, 10) / 2,
                    centerItemIndex = -1;

                var hitTest = list1.layout.hitTest(centerX, centerY);
                if (+hitTest.index === hitTest.index) {
                    centerItemIndex = hitTest.index;
                }

                LiveUnit.Assert.isTrue(centerItemIndex >= 0, "Hit test failed. Index of item at viewport center: " + centerItemIndex);
                // Get the item from datasource
                return list1.itemDataSource.itemFromIndex(centerItemIndex);
            }).
            then(function (itemAtIndex) {
                // Save it for verification
                zoomItem = itemAtIndex;

                return new WinJS.Promise(function (c, e, p) {
                    sezo.addEventListener("zoomchanged", handler);

                    function handler(ev) {
                        sezo.removeEventListener("zoomchanged", handler);

                        // Yield so that listView can finish the pending work
                        var item = list2.zoomableView.getCurrentItem.call(list2.zoomableView);
                        WinJS.Utilities._setImmediate(function () {
                            c(item);
                        });
                    }

                    // Zoom out
                    // The sezo behavior when zooming with api and button is same even though they are separate
                    // code paths internally

                    if (input === "Api") {
                        sezo.zoomedOut = true;
                    } else if (input === "Button") {
                        sezo._onSeZoButtonZoomOutClick();
                    }
                });
            }).
            then(Helper.ListView.waitForReady(list2)).
            then(function (currentItem: any) {
                // currentItem in the zoomed out view should be a group item.
                // zoomItem should be belonging to this group.

                var expectedCurrItem = {
                    key: Helper.groupKey(zoomItem),
                    data: Helper.groupData(zoomItem)
                };

                LiveUnit.Assert.areEqual(expectedCurrItem.key, currentItem.item.key, "Zoomed out to wrong group");
                LiveUnit.Assert.areEqual(JSON.stringify(expectedCurrItem.data), JSON.stringify(currentItem.item.data),
                    "Zoomed out to wrong group");

                // Verify currentItem is visible
                VerifyIsVisible(list2, currentItem.item.index);
            });
    }

    function keyboardZoomAndVerify(sezo, startIndex) {
        var listDiv1 = document.getElementById("child1"),
            listDiv2 = document.getElementById("child2"),
            list1 = listDiv1.winControl,
            list2 = listDiv2.winControl,
            zoomItem;

        function VerifyIsVisible(listView, index) {
            LiveUnit.Assert.isTrue(index >= listView.indexOfFirstVisible, "Expecting index (" + index + ") >= indexOfFirstVisible (" + listView.indexOfFirstVisible + ")");
            LiveUnit.Assert.isTrue(index <= listView.indexOfLastVisible, "Expecting index (" + index + ") <= indexOfFirstVisible (" + listView.indexOfLastVisible + ")");
        }

        return Helper.ListView.waitForReady(list1)().
            then(function () {
                list1.indexOfFirstVisible = startIndex;

                return Helper.ListView.waitForReady(list1)();
            }).
            then(function () {
                // Get the item from datasource
                return list1.itemDataSource.itemFromIndex(startIndex);
            }).
            then(function (itemAtIndex) {
                // Save it for verification
                zoomItem = itemAtIndex;

                return new WinJS.Promise(function (c, e, p) {
                    sezo.addEventListener("zoomchanged", handler);

                    function handler(ev) {
                        sezo.removeEventListener("zoomchanged", handler);

                        // Yield so that listView can finish the pending work
                        var item = list2.zoomableView.getCurrentItem.call(list2.zoomableView);
                        WinJS.Utilities._setImmediate(function () {
                            c(item);
                        });
                    }

                    // Set focus on item at startIndex
                    list1.currentItem = { index: startIndex, hasFocus: true };

                    // Zoom out by calling the _onKeyDown handler in sezo
                    var eventObj = {
                        ctrlKey: true,
                        keyCode: WinJS.Utilities.Key.subtract,
                        stopPropagation: function () { },
                        preventDefault: function () { }
                    };
                    sezo._onKeyDown(eventObj);
                });
            }).
            then(function (currentItem: any) {
                // currentItem in the zoomed out view should be a group item.
                // zoomItem should be belonging to this group.

                var expectedCurrItem = {
                    key: Helper.groupKey(zoomItem),
                    data: Helper.groupData(zoomItem)
                };

                LiveUnit.Assert.areEqual(expectedCurrItem.key, currentItem.item.key, "Zoomed out to wrong group");
                LiveUnit.Assert.areEqual(JSON.stringify(expectedCurrItem.data), JSON.stringify(currentItem.item.data),
                    "Zoomed out to wrong group");

                // Verify currentItem is visible
                VerifyIsVisible(list2, currentItem.item.index);
            });
    }

    export class SemanticZoomTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            testRootEl = document.createElement("div");
            testRootEl.className = "file-listview-css";

            var newNode = document.createElement("div");
            newNode.id = "SemanticZoomTests";
            newNode.innerHTML =
            "<div id='sezoDiv' style='width:500px; height:500px'><div id='child1'></div><div id='child2'></div></div>";
            testRootEl.appendChild(newNode);
            document.body.appendChild(testRootEl);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.Utilities.disposeSubTree(testRootEl);
            document.body.removeChild(testRootEl);
        }





        testSezoButtonVisibilityOnLock(complete) {
            var sezo = createSezoWithBindingList({ type: "GridLayout", orientation: WinJS.UI.Orientation.horizontal }, 500),
                listDiv1 = document.getElementById("child1"),
                listDiv2 = document.getElementById("child2"),
                buttonClass = "win-semanticzoom-button";
            if (WinJS.Utilities.isPhone) {
                complete();
            } else {
                Helper.ListView.waitForReady(listDiv1.winControl)().
                    then(function () {
                        // Button is shown only on mouse move and pen hover
                        // Ensure the button is visible
                        var button = <HTMLElement>document.getElementsByClassName(buttonClass)[0];
                        sezo._showSemanticZoomButton();

                        // Lock the sezo
                        sezo.locked = true;

                        // Wait for the fadeOut animation to finish before checking the visibility again
                        return WinJS.Promise.timeout(500).then(function () {
                            LiveUnit.Assert.areEqual("hidden", button.style.visibility, "Button should be hidden");
                        });
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            }
        }



        testOutOfBoundsGridLayout(complete) {
            var sezoDiv = document.getElementById("sezoDiv"),
                listDiv1 = document.getElementById("child1"),
                listDiv2 = document.getElementById("child2");
            function simpleRenderer(itemPromise) {
                var el = document.createElement("div");
                el.style.width = "50px";
                el.style.height = "50px";
                return {
                    element: el,
                    renderComplete: itemPromise.then(function (d) {
                        el.textContent = d.data;
                    })
                };
            }
            var inView = new WinJS.UI.ListView(listDiv1, {
                itemDataSource: new WinJS.Binding.List([1, 2, 3]).dataSource,
                itemTemplate: simpleRenderer,
                layout: new WinJS.UI.GridLayout()
            });
            var outView = new WinJS.UI.ListView(listDiv2, {
                itemDataSource: new WinJS.Binding.List([1, 2, 3]).dataSource,
                itemTemplate: simpleRenderer,
                layout: new WinJS.UI.GridLayout()
            });
            function doNothingMappingFunction(item) {
                return {
                    groupIndexHint: 0,
                    firstItemIndexHint: 0,
                };
            }
            var sezoRect = sezoDiv.getBoundingClientRect();
            var fakeEventObject: any = {
                clientX: sezoRect.left + sezoDiv.offsetWidth - 100,
                clientY: sezoRect.top + 50,
                preventDefault: function () { },
                stopPropagation: function () { },
                srcElement: sezoDiv,
                ctrlKey: true
            };
            WinJS.Promise.join([Helper.ListView.waitForReady(inView)(), Helper.ListView.waitForReady(outView)()]).then(function () {
                var sezo = <WinJS.UI.ISemanticZoom> new WinJS.UI.SemanticZoom(sezoDiv, {
                    zoomedInItem: doNothingMappingFunction,
                    zoomedOutItem: doNothingMappingFunction
                });

                function onZoomedOut() {
                    sezo.removeEventListener("zoomchanged", onZoomedOut);
                    sezo.addEventListener("zoomchanged", onZoomedIn);
                    fakeEventObject.wheelDelta = 1;
                    sezo._onMouseWheel(fakeEventObject);
                }
                function onZoomedIn() {
                    sezo.removeEventListener("zoomchanged", onZoomedIn);
                    WinJS.Utilities._setImmediate(complete);
                }
                sezo.addEventListener("zoomchanged", onZoomedOut);
                fakeEventObject.wheelDelta = -1;
                sezo._onMouseWheel(fakeEventObject);
            });
        }

        testSezoSizeTruncation(complete) {
            var width = "1000.4px";
            var height = "800.3px";

            var lv1 = new WinJS.UI.ListView();
            var lv2 = new WinJS.UI.ListView();

            var sezoDiv = document.createElement("div");
            sezoDiv.style.width = width;
            sezoDiv.style.height = height;
            testRootEl.appendChild(sezoDiv);
            sezoDiv.appendChild(lv1.element);
            sezoDiv.appendChild(lv2.element);

            var sezo = new WinJS.UI.SemanticZoom(sezoDiv);

            WinJS.Utilities._setImmediate(function () {
                var csSezo = getComputedStyle(sezoDiv);
                var csLv1 = getComputedStyle(lv1.element);
                var csLv2 = getComputedStyle(lv2.element);

                LiveUnit.Assert.areEqual(csSezo.width, csLv1.width);
                LiveUnit.Assert.areEqual(csSezo.width, csLv2.width);

                LiveUnit.Assert.areEqual(csSezo.height, csLv1.height);
                LiveUnit.Assert.areEqual(csSezo.height, csLv2.height);

                complete();
            });
        }

        testSezoPinching() {
            var sezoDiv = document.getElementById("sezoDiv"),
                childDiv1 = document.getElementById("child1"),
                childDiv2 = document.getElementById("child2");

            childDiv1.winControl = {
                zoomableView: {
                    pinching: false,
                    getPanAxis: function () {
                        return "horizontal";
                    },
                    configureForZoom: function () {
                        //noop
                    }
                }
            }

        childDiv2.winControl = {
                zoomableView: {
                    pinching: false,
                    getPanAxis: function () {
                        return "horizontal";
                    },
                    configureForZoom: function () {
                        //noop
                    }
                }
            }

        var sezo = <WinJS.UI.ISemanticZoom> new WinJS.UI.SemanticZoom(sezoDiv);

            LiveUnit.Assert.areEqual(false, childDiv1.winControl.zoomableView.pinching);
            LiveUnit.Assert.areEqual(false, childDiv2.winControl.zoomableView.pinching);

            sezo._pinching = true;
            LiveUnit.Assert.areEqual(true, childDiv1.winControl.zoomableView.pinching);
            LiveUnit.Assert.areEqual(true, childDiv2.winControl.zoomableView.pinching);

            sezo._pinching = false;
            LiveUnit.Assert.areEqual(false, childDiv1.winControl.zoomableView.pinching);
            LiveUnit.Assert.areEqual(false, childDiv2.winControl.zoomableView.pinching);
        }
    };

    (function () {
        function generateTest(input) {
            ['GridLayout', 'ListLayout'].forEach(function (layoutName) {
                [WinJS.UI.Orientation.vertical, WinJS.UI.Orientation.horizontal].forEach(function (orientation) {
                    function generateTest1(dsType, index) {
                        return function (complete) {
                            var sezo = dsType({ type: layoutName, orientation: orientation }, 1000),
                                listDiv1 = document.getElementById("child1"),
                                listDiv2 = document.getElementById("child2"),
                                list1 = listDiv1.winControl,
                                list2 = listDiv2.winControl;

                            Helper.ListView.waitForReady(list1)().
                                then(function () {
                                    switch (input) {
                                        case "Api":
                                        case "Button":
                                            return zoomAndVerify(sezo, index, input);
                                            break;

                                        case "Keyboard":
                                            return keyboardZoomAndVerify(sezo, index);
                                            break;

                                        // TODO: add tests for touch inputs
                                        default:
                                    }
                                }).
                                done(complete, function (er) {
                                    throw er;
                                });
                        };
                    }

                    // These tests verify the API zoom feature
                    SemanticZoomTests.prototype["test" + input + "ZoomFromStartBindingList_" + layoutName + "_" + orientation] = generateTest1(createSezoWithBindingList, 0);
                    SemanticZoomTests.prototype["test" + input + "ZoomFromMiddleBindingList_" + layoutName + "_" + orientation] = generateTest1(createSezoWithBindingList, 500);
                    SemanticZoomTests.prototype["test" + input + "ZoomFromEndBindingList_" + layoutName + "_" + orientation] = generateTest1(createSezoWithBindingList, 999);
                    SemanticZoomTests.prototype["test" + input + "ZoomFromStartVDS_" + layoutName + "_" + orientation] = generateTest1(createSezoWithVDS, 0);
                    SemanticZoomTests.prototype["test" + input + "ZoomFromMiddleVDS_" + layoutName + "_" + orientation] = generateTest1(createSezoWithVDS, 500);
                    SemanticZoomTests.prototype["test" + input + "ZoomFromEndVDS_" + layoutName + "_" + orientation] = generateTest1(createSezoWithVDS, 999);
                });
            });
        }

        generateTest("Keyboard");
        generateTest("Api");
        generateTest("Button");
    })();

    (function () {
        function generateTest(layoutName, resize) {
            return function (complete) {
                var sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 200),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2");

                Helper.ListView.waitForReady(listDiv1.winControl)().
                    then(function () {
                        // Verify the visibility and opacity for in and out views
                        LiveUnit.Assert.areEqual("visible", getComputedStyle(sezo._viewportIn).visibility,
                            "Zoomed in view is not visible");
                        LiveUnit.Assert.areEqual("hidden", getComputedStyle(sezo._viewportOut).visibility,
                            "Zoomed out view is not hidden");
                        LiveUnit.Assert.areEqual("1", getComputedStyle(sezo._canvasIn).opacity,
                            "Zoomed in view is not visible");
                        LiveUnit.Assert.areEqual("0", getComputedStyle(sezo._canvasOut).opacity,
                            "Zoomed out view is not hidden");

                        return new WinJS.Promise(function (c, e, p) {
                            sezo.addEventListener("zoomchanged", function (ev) {
                                // Yield so that listView can finish the pending work
                                WinJS.Utilities._setImmediate(c);
                            });

                            sezo.zoomedOut = !sezo.zoomedOut;

                            if (resize) {
                                sezo.element.style.width = "400px";
                            }
                        });
                    }).
                    then(function () {
                        var isPhone = WinJS.Utilities.isPhone;
                        // Verify the visibility and opacity for in and out views
                        LiveUnit.Assert.areEqual((isPhone ? "visible" : "hidden"), getComputedStyle(sezo._viewportIn).visibility,
                            "Zoomed in view is " + (isPhone ? "" : "not") + "hidden");
                        LiveUnit.Assert.areEqual("visible", getComputedStyle(sezo._viewportOut).visibility,
                            "Zoomed out view is not visible");
                        LiveUnit.Assert.areEqual((isPhone ? "1" : "0"), getComputedStyle(sezo._canvasIn).opacity,
                            "Zoomed in view is " + (isPhone ? "" : "not") + "hidden");
                        LiveUnit.Assert.areEqual("1", getComputedStyle(sezo._canvasOut).opacity,
                            "Zoomed out view is not visible");
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        SemanticZoomTests.prototype["testSezoOpacityAndVisibilityWithResizeGridLayout"] = generateTest("GridLayout", true);
        SemanticZoomTests.prototype["testSezoOpacityAndVisibilityWithoutResizeGridLayout"] = generateTest("GridLayout", false);
    })();

    (function () {
        function generateTest(layoutName, dsType) {
            return function (complete) {
                var sezo = dsType({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 200, { initiallyZoomedOut: true }),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2");

                Helper.ListView.waitForReady(listDiv2.winControl)().
                    then(function () {
                        // Verify the zoomed out view is visible
                        LiveUnit.Assert.isTrue(sezo.zoomedOut, "Sezo didn't start with zoomed out view when initiallyZoomedOut = true");

                        // Verify the sezo button is not visible when not on phone, and doesn't exist when on phone
                        if (WinJS.Utilities.isPhone) {
                            LiveUnit.Assert.isTrue(sezo.element.querySelectorAll(".win-semanticzoom-button").length === 0);
                        } else {
                            LiveUnit.Assert.areEqual(sezo.element.querySelector(".win-semanticzoom-button").style.visibility, "hidden",
                                "Sezo button is visible in the zoomed out view when it shouldn't be");
                        }
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        SemanticZoomTests.prototype["testStartZoomedOutBindingListGridLayout"] = generateTest("GridLayout", createSezoWithBindingList);
        SemanticZoomTests.prototype["testStartZoomedOutVDSGridLayout"] = generateTest("GridLayout", createSezoWithVDS);
    })();

    (function () {
        function generateTest(layoutName, button) {
            return function (complete) {
                var sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 200, { enableButton: button }),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2");

                Helper.ListView.waitForReady(listDiv1.winControl)().
                    then(function () {
                        // Verify you are in zoomed in view
                        LiveUnit.Assert.isFalse(sezo.zoomedOut, "Sezo didn't start with zoomed in view");

                        if (button && !WinJS.Utilities.isPhone) {
                            // Verify the button is present
                            LiveUnit.Assert.isNotNull(sezo.element.querySelector(".win-semanticzoom-button"), "Sezo button is not present");

                            // Button should be visible only on mousemove. Verify button is hidden
                            LiveUnit.Assert.areEqual((<HTMLElement>sezo.element.querySelector(".win-semanticzoom-button")).style.visibility, "hidden",
                                "Sezo button is visible when it shouldn't be");
                        } else {
                            // Verify the button is not present
                            LiveUnit.Assert.isNull(sezo.element.querySelector(".win-semanticzoom-button"),
                                "Sezo button is present in the DOM when it shouldn't be");
                        }
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        SemanticZoomTests.prototype["testSezoButtonEnabledGridLayout"] = generateTest("GridLayout", true);
        SemanticZoomTests.prototype["testSezoButtonDisabledGridLayout"] = generateTest("GridLayout", false);
    })();

    (function () {
        ["GridLayout", "ListLayout"].forEach(function (layoutName) {
            function generateTest(layoutName, dsType) {
                return function (complete) {
                    var sezo = dsType({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 500),
                        listDiv1 = document.getElementById("child1"),
                        listDiv2 = document.getElementById("child2");

                    Helper.ListView.waitForReady(listDiv1.winControl)().
                        then(function () {
                            // Wait for 2 seconds for the Aria worker to execute
                            return WinJS.Promise.timeout(2000);
                        }).
                        done(complete, function (er) {
                            throw er;
                        });
                };
            }

            SemanticZoomTests.prototype["testWaitForAriaWorkerSezoBindingList_" + layoutName] = generateTest(layoutName, createSezoWithBindingList);
            SemanticZoomTests.prototype["testWaitForAriaWorkerSezoVDS_" + layoutName] = generateTest(layoutName, createSezoWithVDS);
        });
    })();

    (function () {
        function generateTest(fromLayout, toLayout) {
            return function (complete) {
                var sezo = createSezoWithBindingList({ type: fromLayout, orientation: WinJS.UI.Orientation.horizontal }, 500),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2");

                WinJS.Promise.join([Helper.ListView.waitForReady(listDiv1.winControl)(), Helper.ListView.waitForReady(listDiv2.winControl)()]).
                    then(function () {
                        return Helper.waitForEvent(sezo, "zoomchanged", function () {
                            // Zoom
                            sezo.zoomedOut = !sezo.zoomedOut;
                            // Change listView layouts without waiting for zoomchanged event shouldn't throw
                            listDiv1.winControl.layout = new WinJS.UI[toLayout]();
                            listDiv2.winControl.layout = new WinJS.UI[toLayout]();
                        });
                    }).
                    then(function () {
                        return WinJS.Promise.join([Helper.ListView.waitForReady(listDiv1.winControl)(), Helper.ListView.waitForReady(listDiv2.winControl)()]);
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        // WinBlue: 169137 regression test
        SemanticZoomTests.prototype["testChangingListViewLayoutDuringZoomGridToList"] = generateTest("GridLayout", "ListLayout");
        SemanticZoomTests.prototype["testChangingListViewLayoutDuringZoomListToGrid"] = generateTest("ListLayout", "GridLayout");

    })();

    (function () {
        function generateTest(layoutName, sezoOptions) {
            return function (complete) {
                var sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 500, sezoOptions),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2"),
                    startView = sezo.zoomedOut;

                WinJS.Promise.timeout().
                    then(function () {
                        sezo.locked = true;
                        sezo.addEventListener("zoomchanged", function (ev) {
                            LiveUnit.Assert.fail("Zoomchanged should not fire when sezo is locked");
                        });
                        sezo.zoomedOut = !sezo.zoomedOut;
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        // Verify that view didn't change
                        LiveUnit.Assert.areEqual(startView, sezo.zoomedOut, "View changed even though sezo was locked");
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        // Test setting the locked property outside the constructor
        SemanticZoomTests.prototype["testLockedZoomedInViewPropertyGridLayout"] = generateTest("GridLayout", { initiallyZoomedOut: false });
        SemanticZoomTests.prototype["testLockedZoomedOutViewPropertyGridLayout"] = generateTest("GridLayout", { initiallyZoomedOut: true });
    })();

    (function () {
        function generateTest(layoutName, sezoOptions) {
            return function (complete) {
                sezoOptions.locked = true;
                var sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 500, sezoOptions),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2"),
                    startView = sezo.zoomedOut;

                WinJS.Promise.timeout().
                    then(function () {
                        sezo.addEventListener("zoomchanged", function (ev) {
                            LiveUnit.Assert.fail("Zoomchanged should not fire when sezo is locked");
                        });
                        sezo.zoomedOut = !sezo.zoomedOut;
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        // Verify that view didn't change
                        LiveUnit.Assert.areEqual(startView, sezo.zoomedOut, "View changed even though sezo was locked");
                    }).
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        // Test the locked property in constructor
        SemanticZoomTests.prototype["testLockedZoomedInViewCtorGridLayout"] = generateTest("GridLayout", { initiallyZoomedOut: false });
        SemanticZoomTests.prototype["testLockedZoomedOutViewCtorGridLayout"] = generateTest("GridLayout", { initiallyZoomedOut: true });
    })();

    (function () {
        function generateTest(layoutName, dsType) {
            return function (complete) {
                var sezo = dsType({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 0),
                    listDiv1 = document.getElementById("child1"),
                    listDiv2 = document.getElementById("child2");

                Helper.ListView.waitForReady(listDiv1.winControl)().
                    done(complete, function (er) {
                        throw er;
                    });
            };
        }

        SemanticZoomTests.prototype["testEmptySezoBindingListGridLayout"] = generateTest("GridLayout", createSezoWithBindingList);
        SemanticZoomTests.prototype["testEmptySezoVDSGridLayout"] = generateTest("GridLayout", createSezoWithVDS);
    })();

    function generateSezoOnZoomChangedOption(layoutName) {
        SemanticZoomTests.prototype["testSezoOnZoomChangedOption" + layoutName] = function (complete) {

            function zoomChangedHandler(e) {
                WinJS.Utilities._setImmediate(complete);
            }

            var sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 10, { onzoomchanged: zoomChangedHandler }),
                listDiv1 = document.getElementById("child1"),
                listDiv2 = document.getElementById("child2");

            sezo.zoomedOut = !sezo.zoomedOut;
        };
    }
    generateSezoOnZoomChangedOption("GridLayout");

    function generateDefaultAriaLabel(layoutName) {
        SemanticZoomTests.prototype["testDefaultAriaLabel" + layoutName] = function (complete) {
            var sezoDiv = document.getElementById("sezoDiv"),
                listDiv1 = document.getElementById("child1"),
                listDiv2 = document.getElementById("child2"),
                sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 10);
            // Verify the default aria-label is empty string
            var label = sezoDiv.getAttribute("aria-label");
            LiveUnit.Assert.areEqual(label, "", "Default aria-label is not empty");
            complete();
        };
    }
    generateDefaultAriaLabel("GridLayout");

    function generateSettingAriaLabel(layoutName) {
        SemanticZoomTests.prototype["testSettingAriaLabel" + layoutName] = function (complete) {
            var sezoDiv = document.getElementById("sezoDiv"),
                listDiv1 = document.getElementById("child1"),
                listDiv2 = document.getElementById("child2"),
                mylabel = "mylabel",
                sezo;

            // Set the aria-label
            sezoDiv.setAttribute("aria-label", mylabel);

            sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 10);

            // Verify the aria-label is set
            var actualLabel = sezoDiv.getAttribute("aria-label");
            LiveUnit.Assert.areEqual(mylabel, actualLabel, "aria-label is wrong");
            complete();
        };
    };
    generateSettingAriaLabel("GridLayout");

    function generateSezoDispose(layoutName) {
        SemanticZoomTests.prototype["testDisposeSezo" + layoutName] = function (complete) {
            var sezoDiv = document.getElementById("sezoDiv"),
                listDiv1 = document.getElementById("child1"),
                listDiv2 = document.getElementById("child2"),
                sezo = createSezoWithBindingList({ type: layoutName, orientation: WinJS.UI.Orientation.horizontal }, 10);

            LiveUnit.Assert.isTrue(sezo.dispose);
            LiveUnit.Assert.isFalse(sezo._disposed);

            sezo.dispose();
            LiveUnit.Assert.isTrue(sezo._disposed);
            complete();
        };
    }
    generateSezoDispose("GridLayout");
    
    var disabledTestRegistry = {
        testSezoOpacityAndVisibilityWithResizeGridLayout: [
			Helper.Browsers.android,
			Helper.Browsers.chrome
		]
    };
    Helper.disableTests(SemanticZoomTests, disabledTestRegistry);
}


LiveUnit.registerTestClass("WinJSTests.SemanticZoomTests");
