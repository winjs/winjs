// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/ItemsManager/TestDataSource.js" />
/// <reference path="../TestLib/ItemsManager/UnitTestsCommon.js" />
/// <reference path="flipperhelpers.js" />
/// <reference path="../TestLib/util.js" />

var WinJSTests = WinJSTests || {};
var globTest = {};

WinJSTests.FlipperInstantiationTests = function () {
    "use strict";
    var that = this;

    this.testNavigationWithSizeInPercent = function (complete) {
        var elem = document.createElement("div");
        elem.id = "flipper";
        elem.style.width = "50%";
        elem.style.height = "50%";
        document.body.appendChild(elem);

        function template(itemPromise) {
            return itemPromise.then(function (item) {
                var root = document.createElement("div");
                root.innerHTML = "Microsoft " + item.data;
                return root;
            });            
        }

        var ds = new WinJS.Binding.List([1, 2, 3, 4, 5, 6, 7]);
        var flipView = new WinJS.UI.FlipView(elem, {
            itemTemplate: template,
            itemDataSource: ds.dataSource
        });

        waitForFlipViewReady(flipView).
        then(function () {
            var promiseChain = WinJS.Promise.timeout();
            var i = 0;

            asyncWhile(
                function () { return i < 6; },
                function () {
                    promiseChain = promiseChain.then(function () {
                        return waitForFlipViewReady(flipView, function () {
                            flipView.next();
                        });
                    });
                    i++;
                }
            );
            return promiseChain;
        }).
        done(function () {
            // Cleanup
            WinJS.Utilities.disposeSubTree(elem);
            document.body.removeChild(elem);
            complete();
        });
    };


    this.testSimpleTemplate = function (complete) {
        var host = document.createElement("div");
        host.style.width = "400px";
        host.style.height = "400px";
        document.body.appendChild(host);

        function template(itemPromise) {
            var root = document.createElement("div");
            root.innerHTML = "Microsoft";
            return root;            
        }

        var ds = new WinJS.Binding.List([1, 2, 3, 4, 5, 6, 7]);
        var flipView = new WinJS.UI.FlipView(host, {
            itemTemplate: template,
            itemDataSource: ds.dataSource
        });

        flipView.addEventListener("pagecompleted", function (ev) {
            WinJS.Utilities.disposeSubTree(host);
            document.body.removeChild(host);
            complete();
        });
        
    };

    this.testNoNavigationOnResize = function (complete) {
        var flipperElement = document.createElement('div'),
            startPage = 0,
            flipper;

        document.body.appendChild(flipperElement);

        var onComplete = function (ev) {
            flipperElement.removeEventListener("pagecompleted", onComplete);

            // Attach another handler
            var afterComplete = function (ev) {
                LiveUnit.Assert.fail("Pagecompleted shouldn't have fired after resize");
            };
            flipperElement.addEventListener("pagecompleted", afterComplete);

            // Resize flipview
            flipperElement.style.width = "600px";

            // Wait and then complete the test
            WinJS.Promise.timeout(500).then(function () {
                // Check the currentPage is same as before
                LiveUnit.Assert.areEqual(startPage, flipper.currentPage, "Current Page should not have changed");

                // Done
                WinJS.Utilities.disposeSubTree(flipperElement);
                document.body.removeChild(flipperElement);
                complete();
            });
            
        };               
        flipperElement.addEventListener("pagecompleted", onComplete);

        flipper = new WinJS.UI.FlipView(flipperElement, {
            itemDataSource: Helper.createBindingList(10).dataSource,
            itemTemplate: Helper.syncJSTemplate
        });
    };

    this.testNoNavigationOnFocus = function (complete) {
        var flipperElement = document.createElement('div'),
            startPage = 0,
            flipper;

        document.body.appendChild(flipperElement);

        var onComplete = function (ev) {
            flipperElement.removeEventListener("pagecompleted", onComplete);

            // Attach another handler
            var afterComplete = function (ev) {
                LiveUnit.Assert.fail("Pagecompleted shouldn't have fired after resize");
            };
            flipperElement.addEventListener("pagecompleted", afterComplete);

            // Set the focus on the flipview
            flipperElement.focus();

            // Wait and then complete the test
            WinJS.Promise.timeout(500).then(function () {
                // Check the currentPage is same as before
                LiveUnit.Assert.areEqual(startPage, flipper.currentPage, "Current Page should not have changed");

                // Done
                WinJS.Utilities.disposeSubTree(flipperElement);
                document.body.removeChild(flipperElement);
                complete();
            });
            
        };               
        flipperElement.addEventListener("pagecompleted", onComplete);

        flipper = new WinJS.UI.FlipView(flipperElement, {
            itemDataSource: Helper.createBindingList(10).dataSource,
            itemTemplate: Helper.syncJSTemplate
        });
    };

    (function () {
        function generateTest(ds) {
            return function (complete) {
                var flipperElement = document.createElement('div'),
                    flipper;

                document.body.appendChild(flipperElement);

                var onComplete = function (ev) {
                    flipperElement.removeEventListener("pagecompleted", onComplete);

                    flipperElement.addEventListener("pagecompleted", function (ev) {
                        // Done
                        WinJS.Utilities.disposeSubTree(flipperElement);
                        document.body.removeChild(flipperElement);
                        complete();
                    });

                    // Move a non-current item in datasource
                    flipper.itemDataSource.itemFromIndex(4).then(function (item) {
                        // Move the item to end
                        flipper.itemDataSource.moveToEnd(item.key).then(function () {
                            // Jump to the end
                            flipper.currentPage = 9;
                        });
                    });
                };               

                flipper = new WinJS.UI.FlipView(flipperElement, {
                    itemDataSource: ds,
                    onpagecompleted: onComplete, 
                    itemTemplate: Helper.syncJSTemplate
                });
            }
        }
        
        var bl = Helper.createBindingList(10).dataSource;

        that["testMoveItemAndJumpBL"] = generateTest(bl);
    }) ();

    this.testDeleteItemAndOrientationChange = function (complete) {
        var flipperElement = document.createElement('div'),
            flipper;

        document.body.appendChild(flipperElement);

        var onComplete = function (ev) {
            flipperElement.removeEventListener("pagecompleted", onComplete);

            // Attach another handler
            var afterComplete = function (ev) {
                // Item has been deleted and orientation changed
                // Verify the item is displayed on screen

                var expectedText = "title1", 
                    currentText = flipper._pageManager._currentPage.element.textContent.trim();

                LiveUnit.Assert.areEqual(expectedText, currentText, "FlipView is not displaying the expected page");

                // Done
                WinJS.Utilities.disposeSubTree(flipperElement);
                document.body.removeChild(flipperElement);
                complete();
            };
            flipperElement.addEventListener("datasourcecountchanged", afterComplete);

            // Delete item
            flipper.itemDataSource.itemFromIndex(0).then(function (item) {
                flipper.itemDataSource.remove(item.key);
            
                // Change orientation without waiting for pagecompleted
                flipper.orientation = "vertical";
            });
        };               
        flipperElement.addEventListener("pagecompleted", onComplete);

        flipper = new WinJS.UI.FlipView(flipperElement, {
            itemDataSource: Helper.createBindingList(10).dataSource,
            itemTemplate: Helper.syncJSTemplate
        });
    }; 

    (function () {
        function generateTest(fromDS, toDS) {
            return function (complete) {
                var flipperElement = document.createElement('div'),
                    flipper;

                document.body.appendChild(flipperElement);

                var onComplete = function (ev) {
                    flipperElement.removeEventListener("pagecompleted", onComplete);

                    flipperElement.addEventListener("pagecompleted", function (ev) {
                        // Done
                        WinJS.Utilities.disposeSubTree(flipperElement);
                        document.body.removeChild(flipperElement);
                        complete();
                    });
                    // Update the itemDataSource
                    flipper.itemDataSource = toDS;
                };               

                flipper = new WinJS.UI.FlipView(flipperElement, {
                    itemDataSource: fromDS,
                    onpageselected: onComplete, 
                    itemTemplate: Helper.syncJSTemplate
                });
            }
        }
        
        var bl = Helper.createBindingList(10).dataSource,
            vds = Helper.createTestDataSource(10),
            emptyBL = Helper.createBindingList(0).dataSource,
            emptyVDS = Helper.createTestDataSource(0);

        that["testUpdateToEmptyBindingList"] = generateTest(vds, emptyBL);
        that["testUpdateToEmptyVDS"] = generateTest(bl, emptyVDS);
    })();

    (function () {
        function generateTest(currentPage) {
            return function (complete) {
                var element = document.createElement('div');

                globTest.vds = Helper.createTestDataSource(20);

                document.body.appendChild(element);
                element.innerHTML = '<div class="flipperTemplate" data-win-control="WinJS.Binding.Template">' +
                    '<div data-win-bind="innerHTML: title; style.width: itemWidth; style.height: itemHeight;"></div></div>' +
                    '<div class="flipperDiv" data-win-control="WinJS.UI.FlipView" data-win-options="{ currentPage: '+ 
                    currentPage + ', onpagecompleted: globTest.onComplete, itemDataSource: globTest.vds, itemTemplate: ' + 
                    'select(' + "'" + '.flipperTemplate' + "'" + ') }"></div>';


                globTest.onComplete = WinJS.Utilities.markSupportedForProcessing(function (ev) {
                    // Verify 
                    var flipper = element.querySelector(".flipperDiv").winControl;
                    LiveUnit.Assert.areEqual(flipper.currentPage, currentPage, "Flipper didn't instantiate at the expected page");
                    
                    // Done
                    WinJS.Utilities.disposeSubTree(element);
                    document.body.removeChild(element);
                    complete();                    
                });

                WinJS.UI.processAll(element);
            }
        }

        that["testHTMLInstantiationWithCurrentPageAtStart"] = generateTest(0);
        that["testHTMLInstantiationWithCurrentPageAtMiddle"] = generateTest(10);
        that["testHTMLInstantiationWithCurrentPageAtEnd"] = generateTest(19);
    })();

    (function () {
        function generateTest(ds) {
            return function (complete) {
                var flipperElement = document.createElement('div'),
                    flipper;

                document.body.appendChild(flipperElement);

                var onComplete = function (ev) {
                    // Verify 
                    flipper.count().then(function (count) {
                        LiveUnit.Assert.areEqual(0, count, "Unexpected flipper count");

                        // Done
                        WinJS.Utilities.disposeSubTree(flipperElement);
                        document.body.removeChild(flipperElement);
                        complete();
                    }, function (er) {
                        LiveUnit.Assert.fail("Flipper failed to return count");
                    });
                };               

                flipper = new WinJS.UI.FlipView(flipperElement, {
                    itemDataSource: ds,
                    onpageselected: onComplete, 
                    itemTemplate: Helper.syncJSTemplate
                });
            }
        }

        // Disabling the tests for now, as pageselected is never fired.
        // Win8: 901271
        that["xtestFlipViewEmptyBindingList"] = generateTest(Helper.createBindingList(0).dataSource);
        that["xtestFlipViewEmptyVDS"] = generateTest(Helper.createTestDataSource(0));
    })();

    (function () {
        function generateTest(ds, action) {
            return function (complete) {
                var flipperElement = document.createElement('div'),
                    flipper,
                    before,
                    after;

                document.body.appendChild(flipperElement);

                var onComplete = function (ev) {
                    flipperElement.removeEventListener("pagecompleted", onComplete);

                    // Grab the currently visible element
                    before = flipper._pageManager._currentPage.element.innerHTML;

                    flipperElement.addEventListener("pagecompleted", function (ev) {
                        // Grab the currently visible element and compare to the previously current element
                        after = flipper._pageManager._currentPage.element.innerHTML;

                        // Verify 
                        LiveUnit.Assert.areEqual(after, before, "Current Page elements are different");

                        // Done
                        WinJS.Utilities.disposeSubTree(flipperElement);
                        document.body.removeChild(flipperElement);
                        complete();
                    });

                    // Perform action
                    action();
                };
                flipperElement.addEventListener("pagecompleted", onComplete);

                flipper = new WinJS.UI.FlipView(flipperElement, {
                    itemDataSource: ds,
                    itemTemplate: Helper.syncJSTemplate
                });
            }
        }

        // I should be able to use datasources across tests
        var bl = Helper.createBindingList(10),
            vds = Helper.createTestDataSource(10),
            setItemTemplate = function () {
                var flipperElement = document.getElementsByClassName("win-flipview")[0],
                    flipper = flipperElement.winControl;

                flipper.itemTemplate = flipper.itemTemplate;
            },
            setItemDataSource = function () {
                var flipperElement = document.getElementsByClassName("win-flipview")[0],
                    flipper = flipperElement.winControl;

                flipper.itemDataSource = flipper.itemDataSource;
            };

        that["testBindingListSetItemDataSource"] = generateTest(bl.dataSource, setItemDataSource);
        that["testBindingListSetItemTemplate"] = generateTest(bl.dataSource, setItemTemplate);
        that["testVDSSetItemDataSource"] = generateTest(vds, setItemDataSource);
        that["testVDSSetItemTemplate"] = generateTest(vds, setItemTemplate);
    })();

    function testDefaultSurfaceChaining(flipView) {
        var element = flipView.element,
            surface = element.querySelector(".win-surface");

        // Verify if win-surface class was applied
        LiveUnit.Assert.isNotNull(surface, "win-surface class was not set");

        // Verify the value of scrollChaining when touch is supported
        if (flipView._environmentSupportsTouch) {
            var style = document.defaultView.getComputedStyle(surface, null)[WinJS.Utilities._browserStyleEquivalents["scroll-chaining"].scriptName];
            LiveUnit.Assert.areEqual(style, "none", "Default value is not set to none");
        }
    }

    this.testFlipperInstantiation = function (signalTestCaseCompleted) {
        var flipperElement = document.createElement('div');
        document.body.appendChild(flipperElement);
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element");
        var flipper = new WinJS.UI.FlipView(flipperElement);
        LiveUnit.LoggingCore.logComment("Flipper has been instantiated.");
        LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");
        testDefaultSurfaceChaining(flipper);

        function verifyFunction(functionName) {
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (flipper[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from flipper");
            }

            LiveUnit.Assert.isNotNull(flipper[functionName]);
            LiveUnit.Assert.isTrue(typeof (flipper[functionName]) === "function", functionName + " exists on flipper, but it isn't a function");
        }

        verifyFunction("next");
        verifyFunction("previous");
        verifyFunction("count");
        verifyFunction("forceLayout");
        verifyFunction("setCustomAnimations");
        WinJS.Utilities.disposeSubTree(flipperElement);
        document.body.removeChild(flipperElement);
        signalTestCaseCompleted();
    }

    // Test Flipper Instantiation with null element
    this.testFlipperNullInstantiation = function (signalTestCaseCompleted) {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper with null element");
        var flipper = new WinJS.UI.FlipView(null);
        LiveUnit.Assert.isNotNull(flipper.element, "should have created an element");
        document.body.appendChild(flipper.element);
        testDefaultSurfaceChaining(flipper);
        WinJS.Utilities.disposeSubTree(flipper.element);
        document.body.removeChild(flipper.element);
        signalTestCaseCompleted();
    }

    this.testEmptyFlipperFunctions = function (signalTestCaseCompleted) {
        var flipperElement = document.createElement("div");
        document.body.appendChild(flipperElement);
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element");
        var flipper = new WinJS.UI.FlipView(flipperElement);
        LiveUnit.LoggingCore.logComment("Flipper has been instantiated.");
        LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");
        testDefaultSurfaceChaining(flipper);

        LiveUnit.Assert.areEqual(flipper.currentPage, 0, "Verifying that currentPage is 0");
        LiveUnit.Assert.isFalse(flipper.next(), "Verifying that we can't flip to next");
        LiveUnit.Assert.areEqual(flipper.currentPage, 0, "Verifying that currentPage is 0");
        LiveUnit.Assert.isFalse(flipper.previous(), "Verifying that we can't flip to previous");
        WinJS.Utilities.disposeSubTree(flipperElement);
        document.body.removeChild(flipperElement);
        signalTestCaseCompleted();
    }

    this.testFlipperParams = function (signalTestCaseCompleted) {
        function testGoodInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a flipper using good parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            var options = {};
            options[paramName] = value;
            document.body.appendChild(div);
            var flipper = new WinJS.UI.FlipView(div, options);
            LiveUnit.Assert.isNotNull(flipper);
            testDefaultSurfaceChaining(flipper);
            WinJS.Utilities.disposeSubTree(div);
            document.body.removeChild(div);
        }

        testGoodInitOption("orientation", "horizontal");
        testGoodInitOption("orientation", "vertical");
        testGoodInitOption("orientation", "HoRiZONTal");
        testGoodInitOption("orientation", "verTical");
        testGoodInitOption("currentPage", 0);
        signalTestCaseCompleted();
    }

    this.testFlipperElement = function (signalTestCaseCompleted) {
        var flipperElement = document.createElement('div');
        flipperElement.id = "myFlipViewDiv";
        document.body.appendChild(flipperElement);
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flipper element");
        var flipper = new WinJS.UI.FlipView(flipperElement);
        LiveUnit.LoggingCore.logComment("Verify that the element property is correct");
        LiveUnit.Assert.areEqual(flipperElement, flipper.element);
        testDefaultSurfaceChaining(flipper);
        WinJS.Utilities.disposeSubTree(flipperElement);
        document.body.removeChild(flipperElement);
        signalTestCaseCompleted();
    }

    this.testFlipperEventsInConstructorOptions = function (signalTestCaseCompleted) {
        var flipperElement = document.createElement('div');
        flipperElement.id = "myFlipViewDiv";
        document.body.appendChild(flipperElement);

        var pageVisiblityChangedCalled = false;
        var pageSelectedCalled = false;
        var testData = createArraySource(1, ["400px"], ["400px"]),
            rawData = testData.rawData,
            options = { 
                itemDataSource: testData.dataSource,
                itemTemplate: basicInstantRenderer,
                onpagevisibilitychanged: function() {
                    pageVisiblityChangedCalled = true;
                },
                onpageselected: function() {
                    pageSelectedCalled = true;
                },
                onpagecompleted: function() {
                    LiveUnit.Assert.isTrue(pageVisiblityChangedCalled);
                    LiveUnit.Assert.isTrue(pageSelectedCalled);
                    document.body.removeChild(flipperElement);
                    signalTestCaseCompleted();
                }
            };
        var flipView = new WinJS.UI.FlipView(flipperElement, options);
    };
    
    this.testFlipViewDispose = function (complete) {
        var flipperElement = document.createElement('div');
        flipperElement.id = "myFlipViewDiv";
        document.body.appendChild(flipperElement);

        var dispose = function () {
            if (this.disposed) {
                LiveUnit.Assert.fail("Disposed was called again.");
            }
            this.disposed = true;
            itemsAlive--;
        };

        var data = [1, 2, 3, 4, 5, 6, 7];
        var list = new WinJS.Binding.List(data);
        var itemsAlive = 0;

        var fv = new WinJS.UI.FlipView(flipperElement);
        fv.itemTemplate = function (itemPromise) {
            return itemPromise.then(function (item) {
                var div = document.createElement("div");
                div.textContent = item.data;
                WinJS.Utilities.addClass(div, "win-disposable");
                div.dispose = dispose.bind(div);
                itemsAlive++;
                return div;
            });
        };

        fv.addEventListener("pagecompleted", function () {
            LiveUnit.Assert.isTrue(itemsAlive > 0);
            fv.dispose();
            LiveUnit.Assert.areEqual(itemsAlive, 0, "At least one element wasn't cleaned up.");
            document.body.removeChild(flipperElement);
            complete();
        });

        fv.itemDataSource = list.dataSource;
    };

    this.testFlipViewDisposeDuringVirtualization = function (complete) {
        var dispose = function () {
            if (this.disposed) {
                LiveUnit.Assert.fail("Disposed was called again.");
            }
            this.disposed = true;
            itemsAlive--;

            if (!disposing && this.textContent != "1") {
                LiveUnit.Assert.fail("An unexpected item was released.");
            }
            firstItemDisposed = true;
        };

        var data = [1, 2, 3, 4, 5, 6, 7];
        var list = new WinJS.Binding.List(data);
        var itemsAlive = 0;

        var fv = new WinJS.UI.FlipView();
        fv.element.id = "fv";
        document.body.appendChild(fv.element);
        fv.itemTemplate = function (itemPromise) {
            return itemPromise.then(function (item) {
                var div = document.createElement("div");
                div.textContent = item.data;
                WinJS.Utilities.addClass(div, "win-disposable");
                div.dispose = dispose.bind(div);
                itemsAlive++;
                return div;
            });
        };

        var firstItemDisposed = false;
        var disposing = false;
        var call = 0;
        fv.addEventListener("pagecompleted", function () {
            if (call === 0) {
                // Initialized, should be in this state: [1], 2, 3. (This notation means that
                // pages 1, 2, and 3 are realized and page 1 is the current page.)
                LiveUnit.Assert.isFalse(firstItemDisposed, "The first page shouldn't have been disposed.");
                fv.next();
            } else if (call === 1) {
                // First next was called, should be in this state: 1, [2], 3, 4
                LiveUnit.Assert.isFalse(firstItemDisposed, "The first page shouldn't have been disposed.");
                fv.next();
            } else if (call === 2) {
                // Second next was called, should be in this state: 1, 2, [3], 4, 5
                LiveUnit.Assert.isFalse(firstItemDisposed, "The first page shouldn't have been disposed.");
                fv.next();
            } else if (call === 3) {
                // Third next was called, should be in this state: 2, 3, [4], 5, 6. Verify that page 1 has been unrealized.
                LiveUnit.Assert.isTrue(firstItemDisposed, "The first page should have been disposed, but was not.");

                disposing = true;
                fv.dispose();
                document.body.removeChild(fv.element);
                complete();
            }
            call++;
        });

        fv.itemDataSource = list.dataSource;
    };
}

LiveUnit.registerTestClass("WinJSTests.FlipperInstantiationTests");
