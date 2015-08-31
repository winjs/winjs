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

    export class ElementResizeInstrumentTests {
        "use strict";

        _element: HTMLElement;
        _parent: HTMLElement;
        _child: HTMLElement;
        _parentResizeInstrument: WinJS.UI.PrivateElementResizeInstrument;
        _childResizeInstrument: WinJS.UI.PrivateElementResizeInstrument;

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

            this._parent.id = "parent";
            this._parent.style.cssText = parentStyleText;
            this._parentResizeInstrument = new _ElementResizeInstrument();
            this._parent.appendChild(this._parentResizeInstrument.element);

            this._child.id = "child";
            this._child.style.cssText = childStyleText;
            this._childResizeInstrument = new _ElementResizeInstrument();
            this._child.appendChild(this._childResizeInstrument.element);
        }

        tearDown() {
            if (this._element) {
                disposeAndRemoveElement(this._element)
                this._element = null;
                this._parent = null;
                this._child = null;
                this._parentResizeInstrument = null;
                this._childResizeInstrument = null;
            }
        }

        testChildElementResize(complete) {
            // Verifies that when both the parent and child elements have _ElementResizeInstruments, resizing 
            // the child element will trigger child resize events, but will not trigger parent resize events.

            var initializingTest = true;
            function parentResizeHandler(): void {
                if (initializingTest) {
                    return;
                }
                LiveUnit.Assert.fail("Size changes to the child element should not trigger resize events in the parent element.");
            }

            var childStyle = this._child.style;
            var childResizedCounter = 0;
            var expectedChildResizeEvents = 7;
            var childResizedSignal: WinJS._Signal<any>;
            function childResizeHandler(): void {
                if (initializingTest) {
                    return;
                };
                childResizedCounter++;
                childResizedSignal.complete();
            }

            WinJS.Promise
                .join([
                    this._parentResizeInstrument.monitorAncestor(parentResizeHandler),
                    this._childResizeInstrument.monitorAncestor(childResizeHandler),
                ])
                .then(() => {
                    // The first time monitorAncestor() is called, it triggers the _ElementResizeInstrument's <object> contentWindow to load.
                    // When this happens, the <object> element in some browsers will fire an initial window resize event.
                    // Burn 500ms to allow those events to fire, so we don't test against false positives
                    return WinJS.Promise.timeout(500);
                })
                .then(() => {
                    initializingTest = false;
                    childResizedSignal = new WinJS._Signal();
                    childStyle.width = "50%";
                    return childResizedSignal.promise;
                })
                .then(() => {
                    childResizedSignal = new WinJS._Signal();
                    childStyle.height = "50%";
                    return childResizedSignal.promise;
                })
                .then(() => {
                    childResizedSignal = new WinJS._Signal();
                    childStyle.padding = "5px";
                    return childResizedSignal.promise;
                })
                .then(() => {
                    childResizedSignal = new WinJS._Signal();
                    childStyle.maxWidth = "40%";
                    return childResizedSignal.promise;
                })
                .then(() => {
                    childResizedSignal = new WinJS._Signal();
                    childStyle.maxHeight = "40%";
                    return childResizedSignal.promise;
                })
                .then(() => {
                    childResizedSignal = new WinJS._Signal();
                    childStyle.minWidth = "60%";
                    return childResizedSignal.promise;
                })
                .then(() => {
                    childResizedSignal = new WinJS._Signal();
                    childStyle.minHeight = "60%";
                    return childResizedSignal.promise;
                }).done(function () {
                    LiveUnit.Assert.areEqual(expectedChildResizeEvents, childResizedCounter, "Incorrect number of resize events fired for child element");
                    complete();
                });
        }

        testResizeEventsAreBatched(complete) {
            var childStyle = this._child.style;
            var childResizedCounter = 0;
            var expectedChildResizeEvents = 1;
            function childResizeHandler(): void {
                childResizedCounter++;
            }
            this._childResizeInstrument.monitorAncestor(childResizeHandler)
                .then(() => {

                    childStyle.width = "50%";
                    getComputedStyle(this._child);
                    childStyle.height = "50%";
                    getComputedStyle(this._child);
                    childStyle.padding = "5px";
                    getComputedStyle(this._child);

                    // Wait long enough to make sure only one resize event was fired.
                    return WinJS.Promise.timeout(500);
                })
                .done(() => {
                    LiveUnit.Assert.areEqual(expectedChildResizeEvents, childResizedCounter,
                        "Batched 'resize' events should cause the event handler to fire EXACTLY once.");
                    complete();
                });
        }

        testParentElementResize(complete) {
            // Verifies that changes to the dimensions of the parent element trigger resize events for both the parent and the child element.
            // Test expects child element to be styled with percentage height and width.

            var parentStyle = this._parent.style;

            var parentHandlerCounter = 0;
            var expectedParentHandlerCalls = 1;
            var parentResizedSignal: WinJS._Signal<any>;
            function parentResizeHandler(): void {
                parentHandlerCounter++;
                parentResizedSignal.complete();
            }

            var childHandlerCounter = 0;
            var expectedChildHandlerCalls = 1;
            var childResizedSignal: WinJS._Signal<any>;
            function childResizeHandler(): void {
                childHandlerCounter++;
                childResizedSignal.complete();
            }

            WinJS.Promise
                .join([
                    this._parentResizeInstrument.monitorAncestor(parentResizeHandler),
                    this._childResizeInstrument.monitorAncestor(childResizeHandler),
                ])
                .then(() => {
                    parentResizedSignal = new WinJS._Signal();
                    childResizedSignal = new WinJS._Signal();

                    parentStyle.height = "50%";
                    getComputedStyle(this._parent);
                    parentStyle.width = "50%";
                    getComputedStyle(this._parent);

                    // Burn 500ms to make sure resize events are batched and we only get one for the parent and one for the child.
                    return WinJS.Promise.join([
                        parentResizedSignal.promise,
                        childResizedSignal.promise,
                        WinJS.Promise.timeout(500),
                    ]);
                })
                .done(() => {
                    LiveUnit.Assert.areEqual(expectedParentHandlerCalls, parentHandlerCounter,
                        "Batched 'resize' events should cause the parent handler to fire EXACTLY once.");
                    LiveUnit.Assert.areEqual(expectedChildHandlerCalls, childHandlerCounter,
                        "Batched 'resize' events should cause the child handler to fire EXACTLY once.");

                    complete();
                });
        }

        testDispose(complete) {
            function parentResizeHandler(): void {
                LiveUnit.Assert.fail("Changes to the parent element should not fire resize events since the instrument was disposed");
            }

            function childResizeHandler(): void {
                LiveUnit.Assert.fail("Changes to the child element should not fire resize events since the instrument was disposed");
            }

            var parentPromiseCanceled = false;
            function parentPromiseErrorHandler() {
                parentPromiseCanceled = true;
            }

            var parentMonitoringPromise = this._parentResizeInstrument.monitorAncestor(parentResizeHandler);
            var childMonitoringPromise = this._childResizeInstrument.monitorAncestor(childResizeHandler);

            // Test disposing parent instrument immediately, while monitoring is still not ready.
            parentMonitoringPromise.then(() => { }, parentPromiseErrorHandler);
            this._parentResizeInstrument.dispose();
            LiveUnit.Assert.isTrue(parentPromiseCanceled, "disposeing parent instrument should have canceled parent monitoring promise");
            LiveUnit.Assert.isTrue(this._parentResizeInstrument._disposed);

            // Test disposing child instrument after monitoring is ready.
            childMonitoringPromise
                .then(() => {
                    this._childResizeInstrument.dispose(); 
                    LiveUnit.Assert.isTrue(this._childResizeInstrument._disposed);

                    // Now that both Instruments have been disposed, resizing the parent or child element should no longer fire events
                    this._parent.style.height = "10px";
                    this._child.style.height = "10px";

                    // Wait long enough to ensure events aren't being handled.
                    return WinJS.Promise.timeout(500);
                })
                .done(() => {
                    // Disposing again should not cause any bad behavior
                    this._parentResizeInstrument.dispose();
                    this._childResizeInstrument.dispose();

                    complete();
                });
        }

        testRepeatMonitorings(complete) {
            // Verifies that multiple calls to monitorAncestor(resizeHandlerFn) will only ever result one resize listener being fired, 
            // and the latest resizeHandlerFn being called.

            var childStyle = this._child.style;

            function firstResizeHandler(): void {
                LiveUnit.Assert.fail("This handler should never fire! firstResizeHandler is expected to be replaced by secondResizeHandler" +
                    " synchronously during the second call to monitorAncestor(fn)");
            }

            var firstMonitoringCanceled = false;
            function handleFirstMonitoringCanceled(): void {
                firstMonitoringCanceled = true;
            }

            var secondHandlerCounter = 0;
            var expectedSecondHandlerCalls = 1;
            var secondHandlerSignal: WinJS._Signal<any>;
            function secondResizeHandler(): void {
                secondHandlerCounter++;
                secondHandlerSignal.complete();
            }

            var thirdHandlerCounter = 0;
            var expectedThirdHandlerCalls = 1;
            var thirdHandlerSignal: WinJS._Signal<any>;
            function thirdResizeHandler(): void {
                thirdHandlerCounter++;
                thirdHandlerSignal.complete();
            }

            // Call monitorAncestor twice immediately to verify that there is not a race condition where two reize handlers 
            // get set on the <object> element's content window while waiting for the initial <object> load event.
            var firstMonitoringPromise = this._childResizeInstrument.monitorAncestor(firstResizeHandler);
            var secondMonitoringPromise = this._childResizeInstrument.monitorAncestor(secondResizeHandler);

            // The first monitoring promise should be canceled and its resize handler should NEVER fire.
            firstMonitoringPromise
                .then(() => { }, handleFirstMonitoringCanceled);

            secondMonitoringPromise
                .then(() => {
                    secondHandlerSignal = new WinJS._Signal();
                    childStyle.width = "50%";
                    return secondHandlerSignal.promise;
                })
                .then(() => {
                    // Verify that calling monitorAncestor with a new resizeHandler after the old resizeHandler has been established 
                    // Will successfully replace the old resizeHandler with the new one.
                    return this._childResizeInstrument.monitorAncestor(thirdResizeHandler);
                })
                .then(() => {
                    thirdHandlerSignal = new WinJS._Signal();
                    childStyle.height = "50%";

                    // Wait 500ms to ensure that the first and second handlers aren't firing.
                    return WinJS.Promise.join([
                        thirdHandlerSignal.promise,
                        WinJS.Promise.timeout(500)
                    ]);
                })
                .done(() => {
                    LiveUnit.Assert.isTrue(firstMonitoringCanceled, "first monitoringAncestor promise should have been canceled");
                    LiveUnit.Assert.areEqual(expectedSecondHandlerCalls, secondHandlerCounter, "secondResizeHandler fired incorrect amount of times");
                    LiveUnit.Assert.areEqual(expectedThirdHandlerCalls, thirdHandlerCounter, "thirdResizeHandler fired incorrect amount of times");

                    complete();
                });
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests.ElementResizeInstrumentTests");