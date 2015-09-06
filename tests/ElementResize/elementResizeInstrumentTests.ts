// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    var _ElementResizeInstrument = <typeof WinJS.UI.PrivateElementResizeInstrument> Helper.require("WinJS/Controls/ElementResizeInstrument/_ElementResizeInstrument")._ElementResizeInstrument;

    function disposeAndRemoveElement(element: HTMLElement) {
        if (element.winControl) {
            element.winControl.dispose();
        }
        WinJS.Utilities.disposeSubTree(element);
        if (element.parentElement) {
            element.parentElement.removeChild(element);
        }
    }

    function awaitInitialResizeEvents(): WinJS.Promise<any> {
        // In some browsers, when the _ElementResizeHandler finishes loading, the underlying <object> element will fire an 
        // initial async window resize event. Burn 300ms to allow that event to fire, so we don't test against false positives
        return WinJS.Promise.timeout(300);
    }

    function allowTimeForAdditionalResizeEvents(): WinJS.Promise<any> {
        // Helper function used to let enough time pass for a resize event to occur, 
        // usually this is to detect capture any additional resize events that may have been pending.
        return WinJS.Promise.timeout(300);
    }

    export class ElementResizeInstrumentTests {
        "use strict";

        _element: HTMLElement;
        _parent: HTMLElement;
        _child: HTMLElement;
        _parentInstrument: WinJS.UI.PrivateElementResizeInstrument;
        _childInstrument: WinJS.UI.PrivateElementResizeInstrument;

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            // Host element for tests
            this._element = document.createElement("DIV");

            // Create two elements (parent & child), each styled with percentage heights & widths and each with its own _ElementResizeInstrument.
            this._parent = document.createElement("DIV");
            this._child = document.createElement("DIV");

            this._parent.appendChild(this._child);
            this._element.appendChild(this._parent);
            document.body.appendChild(this._element);

            // Let host element be the nearest positioned ancestor of the parent element
            this._element.style.cssText = "position: relative; height: 800px; width: 800px;";

            var parentStyleText = "position: relative; width: 65%; maxWidth: inherit; minWidth: inherit; height: 65%; maxHeight: inherit; minHeight: inherit; padding: 0px;";
            var childStyleText = parentStyleText;

            //this._parent.id = "parent";
            //this._parent.style.cssText = parentStyleText;
            //this._parentInstrument = new _ElementResizeInstrument();
            //this._parent.appendChild(this._parentInstrument.element);

            //this._child.id = "child";
            //this._child.style.cssText = childStyleText;
            //this._childInstrument = new _ElementResizeInstrument();
            //this._child.appendChild(this._childInstrument.element);

        }

        tearDown() {
            if (this._element) {
                disposeAndRemoveElement(this._element)
                this._element = null;
                this._parent = null;
                this._child = null;
                //this._parentInstrument = null;
                //this._childInstrument = null;
            }
        }

        //testChildElementResize(complete) {
        //    // Verifies that when both the parent and child elements have _ElementResizeInstruments, resizing 
        //    // the child element will trigger child resize events, but will not trigger parent resize events.

        //    function parentFailEvent(): void {
        //        LiveUnit.Assert.fail("Size changes to the child element should not trigger resize events in the parent element.");
        //    }

        //    var childStyle = this._child.style;
        //    var childResizedCounter = 0;
        //    var expectedChildResizeEvents = 7;
        //    var childResizedSignal: WinJS._Signal<any>;
        //    function childResizeHandler(): void {
        //        childResizedCounter++;
        //        childResizedSignal.complete();
        //    }

        //    var parentLoadingPromise = new WinJS.Promise((c) => {
        //        this._parentInstrument.addEventListener("loaded", c);
        //        this._parentInstrument.addedToDom();
        //    });

        //    var childLoadingPromise = new WinJS.Promise((c) => {
        //        this._childInstrument.addEventListener("loaded", c);
        //        this._childInstrument.addedToDom();
        //    });
        //    WinJS.Promise
        //        .join([
        //            parentLoadingPromise,
        //            childLoadingPromise,
        //        ])
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            this._childInstrument.addEventListener("resize", childResizeHandler);
        //            this._parentInstrument.addEventListener("resize", parentFailEvent);

        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.width = "50%";
        //            return childResizedSignal.promise;
        //        })
        //        .then(() => {
        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.height = "50%";
        //            return childResizedSignal.promise;
        //        })
        //        .then(() => {
        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.padding = "5px";
        //            return childResizedSignal.promise;
        //        })
        //        .then(() => {
        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.maxWidth = "40%";
        //            return childResizedSignal.promise;
        //        })
        //        .then(() => {
        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.maxHeight = "40%";
        //            return childResizedSignal.promise;
        //        })
        //        .then(() => {
        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.minWidth = "60%";
        //            return childResizedSignal.promise;
        //        })
        //        .then(() => {
        //            childResizedSignal = new WinJS._Signal();
        //            childStyle.minHeight = "60%";
        //            return childResizedSignal.promise;
        //        }).done(function () {
        //            LiveUnit.Assert.areEqual(expectedChildResizeEvents, childResizedCounter, "Incorrect number of resize events fired for child element");
        //            complete();
        //        });
        //}

        //testResizeEventsAreBatched(complete) {
        //    var childStyle = this._child.style;
        //    var childResizedCounter = 0;
        //    var expectedChildResizeEvents = 1;
        //    function childResizeHandler(): void {
        //        childResizedCounter++;
        //    }

        //    var childLoadingPromise = new WinJS.Promise((c) => {
        //        this._childInstrument.addEventListener("loaded", c);
        //        this._childInstrument.addedToDom();
        //    })

        //    childLoadingPromise
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            this._childInstrument.addEventListener("resize", childResizeHandler);
        //            childStyle.width = "50%";
        //            getComputedStyle(this._child);
        //            childStyle.height = "50%";
        //            getComputedStyle(this._child);
        //            childStyle.padding = "5px";

        //            // Wait long enough to make sure only one resize event was fired.
        //            return allowTimeForAdditionalResizeEvents();
        //        })
        //        .done(() => {
        //            LiveUnit.Assert.areEqual(expectedChildResizeEvents, childResizedCounter,
        //                "Batched 'resize' events should cause the event handler to fire EXACTLY once.");
        //            complete();
        //        });
        //}

        //testParentElementResize(complete) {
        //    // Verifies that changes to the dimensions of the parent element trigger resize events for both the parent and the child element.
        //    // Test expects child element to be styled with percentage height and width.

        //    var parentStyle = this._parent.style;

        //    var parentHandlerCounter = 0;
        //    var expectedParentHandlerCalls = 2;
        //    var parentResizedSignal: WinJS._Signal<any>;
        //    function parentResizeHandler(): void {
        //        parentHandlerCounter++;
        //        parentResizedSignal.complete();
        //    }

        //    var childHandlerCounter = 0;
        //    var expectedChildHandlerCalls = 2;
        //    var childResizedSignal: WinJS._Signal<any>;
        //    function childResizeHandler(): void {
        //        childHandlerCounter++;
        //        childResizedSignal.complete();
        //    }

        //    var parentLoadingPromise = new WinJS.Promise((c) => {
        //        this._parentInstrument.addEventListener("loaded", c);
        //        this._parentInstrument.addedToDom();
        //    });

        //    var childLoadingPromise = new WinJS.Promise((c) => {
        //        this._childInstrument.addEventListener("loaded", c);
        //        this._childInstrument.addedToDom();
        //    });

        //    WinJS.Promise
        //        .join([
        //            parentLoadingPromise,
        //            childLoadingPromise,
        //        ])
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {

        //            this._parentInstrument.addEventListener("resize", parentResizeHandler);
        //            this._childInstrument.addEventListener("resize", childResizeHandler);

        //            parentResizedSignal = new WinJS._Signal();
        //            childResizedSignal = new WinJS._Signal();

        //            parentStyle.height = "50%";

        //            return WinJS.Promise.join([
        //                parentResizedSignal.promise,
        //                childResizedSignal.promise,
        //            ]);
        //        })
        //        .then(() => {
        //            parentResizedSignal = new WinJS._Signal();
        //            childResizedSignal = new WinJS._Signal();

        //            parentStyle.width = "50%";

        //            return WinJS.Promise.join([
        //                parentResizedSignal.promise,
        //                childResizedSignal.promise,
        //            ]);
        //        })
        //        .done(() => {
        //            LiveUnit.Assert.areEqual(expectedParentHandlerCalls, parentHandlerCounter,
        //                "Batched 'resize' events should cause the parent handler to fire EXACTLY once.");
        //            LiveUnit.Assert.areEqual(expectedChildHandlerCalls, childHandlerCounter,
        //                "Batched 'resize' events should cause the child handler to fire EXACTLY once.");
        //            complete();
        //        });
        //}

        //testDispose(complete) {
        //    function parentFailResizeHandler(): void {
        //        LiveUnit.Assert.fail("Changes to the parent element should not fire resize events since the instrument was disposed");
        //    }

        //    function childFailResizeHandler(): void {
        //        LiveUnit.Assert.fail("Changes to the child element should not fire resize events since the instrument was disposed");
        //    }

        //    // Test disposing parent instrument immediately after addedToDom is called, some browsers may still be loading the <object> element at this point and we want to
        //    // make sure that we don't still try to hook the <object>'s content window asyncronously once the <object> finishes loading, if its already been disposed.
        //    this._parentInstrument.addedToDom();
        //    this._parentInstrument.addEventListener("resize", parentFailResizeHandler);
        //    this._parentInstrument.dispose();
        //    LiveUnit.Assert.isTrue(this._parentInstrument._disposed);

        //    // Test disposing child instrument after it has completely loaded.
        //    new WinJS.Promise((c) => {
        //        this._childInstrument.addEventListener("loaded", c);
        //        this._childInstrument.addedToDom();
        //    })
        //        .then(() => {
        //            this._childInstrument.addEventListener("resize", childFailResizeHandler);
        //            this._childInstrument.dispose();
        //            LiveUnit.Assert.isTrue(this._childInstrument._disposed);

        //            // Now that both Instruments have been disposed, resizing the parent or child element should no longer fire events
        //            this._parent.style.height = "10px";
        //            this._child.style.height = "10px";

        //            // Wait long enough to ensure events aren't being handled.
        //            return allowTimeForAdditionalResizeEvents();
        //        })
        //        .done(() => {
        //            // Disposing again should not cause any bad behavior
        //            this._parentInstrument.dispose();
        //            this._childInstrument.dispose();

        //            complete();
        //        });
        //}

        //testReAppendToDomAndResizeSynchronously(complete) {
        //    // Make sure that removing and reappending an initialized _ElementResizeInstrument
        //    // Doesn't permanently stop our _ElementResizeInstrument from firing resize events.
        //    // This test is partially testing the browser to make sure that the "resize" listener 
        //    // we've added to the <object> element's contentWindow doesn't become permanently 
        //    // broken.
        //    var childResizeSignal: WinJS._Signal<any>;
        //    function childResizeHandler() {
        //        childResizeSignal.complete();
        //    }

        //    var parentResizeSignal: WinJS._Signal<any>;
        //    function parentResizeHandler() {
        //        parentResizeSignal.complete();
        //    }

        //    var parent = this._parent;
        //    var parentInstrument = this._parentInstrument;
        //    var childInstrument = this._childInstrument;

        //    var parentLoadingPromise = new WinJS.Promise((c) => {
        //        parentInstrument.addEventListener("loaded", () => {
        //            c();
        //        });
        //        parentInstrument.addedToDom();
        //    });

        //    var childLoadingPromise = new WinJS.Promise((c) => {
        //        childInstrument.addEventListener("loaded", () => {
        //            c();
        //        });
        //        childInstrument.addedToDom();
        //    });

        //    WinJS.Promise
        //        .join([childLoadingPromise, parentLoadingPromise])
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            parentInstrument.addEventListener("resize", parentResizeHandler);
        //            childInstrument.addEventListener("resize", childResizeHandler);

        //            // Test both instruments still fire resize after synchronously 
        //            // removing, adding and updating the height of the parent element.
        //            parentResizeSignal = new WinJS._Signal();
        //            childResizeSignal = new WinJS._Signal();

        //            this._element.removeChild(parent);
        //            this._element.appendChild(parent);
        //            parent.style.height = "42%"
        //            return WinJS.Promise.join([
        //                parentResizeSignal.promise,
        //                childResizeSignal.promise,
        //            ]);
        //        })
        //        .done(() => {
        //            complete();
        //        })
        //}

        //testReAppendToDomAndResizeAsynchronously(complete) {
        //    // Make sure that removing and reappending an initialized _ElementResizeInstrument
        //    // Doesn't permanently stop our _ElementResizeInstrument from firing resize events.
        //    // This test is partially testing the browser to make sure that the "resize" listener 
        //    // we've added to the <object> element's contentWindow doesn't become permanently 
        //    // broken.
        //    var childResizeSignal: WinJS._Signal<any>;
        //    function childResizeHandler() {
        //        childResizeSignal.complete();
        //    }

        //    var parentResizeSignal: WinJS._Signal<any>;
        //    function parentResizeHandler() {
        //        parentResizeSignal.complete();
        //    }

        //    var parent = this._parent;
        //    var parentInstrument = this._parentInstrument;
        //    var childInstrument = this._childInstrument;

        //    var parentLoadingPromise = new WinJS.Promise((c) => {
        //        parentInstrument.addEventListener("loaded", () => {
        //            c();
        //        });
        //        parentInstrument.addedToDom();
        //    });

        //    var childLoadingPromise = new WinJS.Promise((c) => {
        //        childInstrument.addEventListener("loaded", () => {
        //            c();
        //        });
        //        childInstrument.addedToDom();
        //    });

        //    WinJS.Promise
        //        .join([childLoadingPromise, parentLoadingPromise])
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            parentInstrument.addEventListener("resize", parentResizeHandler);
        //            childInstrument.addEventListener("resize", childResizeHandler);

        //            // Test both instruments still fire resize after asynchronously
        //            // removing, adding and updating the width of the parent element.
        //            parentResizeSignal = new WinJS._Signal();
        //            childResizeSignal = new WinJS._Signal();

        //            this._element.removeChild(parent);
        //            return WinJS.Promise.timeout(0);
        //        })
        //        .then(() => {
        //            this._element.appendChild(parent);
        //            return WinJS.Promise.timeout(0);
        //        })
        //        .then(() => {
        //            parent.style.width = "43%"
        //            return WinJS.Promise.join([
        //                parentResizeSignal.promise,
        //                childResizeSignal.promise,
        //            ]);
        //        })
        //        .done(() => {
        //            complete();
        //        })

        //}

        //testInitializedOutsideDom(complete) {
        //    var childResizeSignal: WinJS._Signal<any>;
        //    function childResizeHandler() {
        //        childResizeSignal.complete();
        //    }

        //    var parentResizeSignal: WinJS._Signal<any>;
        //    function parentResizeHandler() {
        //        parentResizeSignal.complete();
        //    }

        //    this._element.removeChild(this._parent);

        //    var childLoadedPromise = new WinJS.Promise((c) => {
        //        // Verify that when our ancestor isn't in the DOM at the time we call addedToDom,
        //        // The _ElementResizeInstrument will still fire the loaded event after the ancestor
        //        // is added to the DOM.
        //        this._childInstrument.addEventListener("loaded", () => {
        //            c();
        //        });
        //        this._childInstrument.addedToDom();
        //        this._element.appendChild(this._parent);
        //    });
        //    childLoadedPromise
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            // Verify resize event works as expected.
        //            childResizeSignal = new WinJS._Signal();
        //            this._childInstrument.addEventListener("resize", childResizeHandler);
        //            this._child.style.width = "50%";
        //            return childResizeSignal.promise;
        //        })
        //        .then(() => {
        //            this._element.removeChild(this._parent);
        //            var parentLoadedPromise = new WinJS.Promise((c) => {
        //                // Verify that when an _ElementResizeListener's host isn't in the DOM at the time 
        //                // addedToDom is called, that the _ElementResizeInstrument will still fire the loaded 
        //                // event after host is added to the DOM.
        //                this._parentInstrument.addEventListener("loaded", () => {
        //                    c();
        //                });
        //                this._parentInstrument.addedToDom();
        //                this._element.appendChild(this._parent);
        //            });
        //            return parentLoadedPromise;
        //        })
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            // Verify resize event works as expected.
        //            childResizeSignal = new WinJS._Signal();
        //            parentResizeSignal = new WinJS._Signal();

        //            this._parentInstrument.addEventListener("resize", parentResizeHandler);
        //            this._parent.style.width = "50%";
        //            return WinJS.Promise.join([parentResizeSignal, childResizeSignal]);
        //        })
        //        .done(complete);
        //}

        //testInitializedOutsideDomAsync(complete) {
        //    var childResizeSignal: WinJS._Signal<any>;
        //    function childResizeHandler() {
        //        childResizeSignal.complete();
        //    }

        //    var parentResizeSignal: WinJS._Signal<any>;
        //    function parentResizeHandler() {
        //        parentResizeSignal.complete();
        //    }

        //    this._element.removeChild(this._parent);

        //    var childLoadedPromise = new WinJS.Promise((c) => {
        //        // Verify that when our ancestor isn't in the DOM at the time we call addedToDom,
        //        // The _ElementResizeInstrument will still fire the loaded event after the ancestor
        //        // is added to the DOM.
        //        this._childInstrument.addEventListener("loaded", () => {
        //            c();
        //        });
        //        this._childInstrument.addedToDom();
        //        WinJS.Promise.timeout(0).then(() => {
        //            this._element.appendChild(this._parent);
        //        });
        //    });
        //    childLoadedPromise
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            // Verify resize event works as expected.
        //            childResizeSignal = new WinJS._Signal();
        //            this._childInstrument.addEventListener("resize", childResizeHandler);
        //            this._child.style.width = "50%";
        //            return childResizeSignal.promise;
        //        })
        //        .then(() => {
        //            this._element.removeChild(this._parent);
        //            var parentLoadedPromise = new WinJS.Promise((c) => {
        //                // Verify that when an _ElementResizeListener's host isn't in the DOM at the time 
        //                // addedToDom is called, that the _ElementResizeInstrument will still fire the loaded 
        //                // event after host is added to the DOM.
        //                this._parentInstrument.addEventListener("loaded", () => {
        //                    c();
        //                });
        //                this._parentInstrument.addedToDom();
        //                this._element.appendChild(this._parent);
        //            });
        //            return parentLoadedPromise;
        //        })
        //        .then(awaitInitialResizeEvents)
        //        .then(() => {
        //            // Verify resize event works as expected.
        //            childResizeSignal = new WinJS._Signal();
        //            parentResizeSignal = new WinJS._Signal();

        //            this._parentInstrument.addEventListener("resize", parentResizeHandler);
        //            this._parent.style.width = "50%";
        //            return WinJS.Promise.join([parentResizeSignal, childResizeSignal]);
        //        })
        //        .done(complete);
        //}

        testObjectScenario1(complete) {
            var scenario = 1;
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);

            syncWorkSignal.complete();

        }
        testObjectScenario2(complete) {
            var scenario = 2;
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            objEl.data = dataText;

            syncWorkSignal.complete();
        }
        testObjectScenario3(complete) {
            var scenario = 3;
            this._element.parentElement.removeChild(this._element);
            var objEl = getnewObj();;
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            this._element.appendChild(objEl);
            syncWorkSignal.complete();
        }
        testObjectScenario4(complete) {
            var scenario = 4;
            this._element.parentElement.removeChild(this._element);
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            objEl.data = dataText;
            this._element.appendChild(objEl);
            syncWorkSignal.complete();
        }
        testObjectScenario5(complete) {
            var scenario = 5;
            this._element.parentElement.removeChild(this._element);
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            this._element.appendChild(objEl);
            objEl.data = dataText;
            syncWorkSignal.complete();
        }
        testObjectScenario6(complete) {
            var scenario = 6;
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            this._element.appendChild(objEl);
            syncWorkSignal.complete();
        }
        testObjectScenario7(complete) {
            var scenario = 7;
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            objEl.data = dataText;
            this._element.appendChild(objEl);
            syncWorkSignal.complete();
        }
        testObjectScenario8(complete) {
            var scenario = 8;
            var objEl = getnewObj();
            var syncWorkSignal = setUpTest(objEl, scenario, complete);
            this._element.appendChild(objEl);
            objEl.data = dataText;
            syncWorkSignal.complete();
        }

    }

    function setUpTest(ObjEl: HTMLObjectElement, scenario: number, callback: () => void) {

        var loadedSync = true;
        var resizeSync = true;
        var signal = new WinJS._Signal();
        var msg = scenario + "! ";

        ObjEl.onload = () => {

            var report = scenario + ", loadedSync, " + loadedSync + "  X  ";
            msg += report;
            //console.log(report);

            ObjEl.contentDocument.defaultView.addEventListener("resize", function handler() {
                ObjEl.contentDocument.defaultView.removeEventListener("resize", handler);
                report = scenario + ", resizeSync, " + resizeSync + "  X  "
                msg += report;
                //console.log(report);
                var resizeDate = new Date();
                report = scenario + ", ms: " + Math.abs(resizeDate.getTime() - loadedDate.getTime()) + "  X  "
                msg += report;
                //console.log(report)
                LiveUnit.LoggingCore.logComment(msg);
                LiveUnit.Assert.areEqual(0, msg);
                failPromise.cancel();
                callback();
            });

            var loadedDate = new Date();

            resizeSync = false;

        };

        signal.promise
            .then(() => {
                loadedSync = false;
            });

        var failPromise = WinJS.Promise
            .timeout(4500)
            .then(() => {
                LiveUnit.LoggingCore.logComment(msg);
                LiveUnit.Assert.areEqual(0, msg);
                callback();
            });

        return signal;
    }

    var dataText = "about:blank";

    function getnewObj() {

        var objEl = <HTMLObjectElement>document.createElement("OBJECT");
        objEl.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
        objEl.type = 'text/html';

        return objEl;
    }

}
LiveUnit.registerTestClass("CorsicaTests.ElementResizeInstrumentTests");