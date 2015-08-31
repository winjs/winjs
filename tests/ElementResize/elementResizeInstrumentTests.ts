// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    var _ElementResizeInstrument = WinJS.UI._ElementResizeInstrument;

    function disposeAndRemoveElement(element: HTMLElement) {
        if (element.winControl) {
            element.winControl.dispose();
        }
        WinJS.Utilities.disposeSubTree(element);
        if (element.parentElement) {
            element.parentElement.removeChild(element);
        }
    }

    function useSynchronousResizeEventHandling(instrument: WinJS.UI._ElementResizeInstrument) {
        // Remove delay for batching edits, and render changes synchronously.
        instrument._batchResizeEvents = (handleResizeFn) => {
            handleResizeFn();
        }
    }

    export class ElementResizeInstrumentTests {
        "use strict";

        _element: HTMLElement;
        _parent: HTMLElement;
        _child: HTMLElement;
        _parentResizeInstrument: WinJS.UI._ElementResizeInstrument;
        _childResizeInstrument: WinJS.UI._ElementResizeInstrument;

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

            var testInitialization = true;
            function parentResizeHandler(): void {
                if (testInitialization) {
                    return;
                }
                LiveUnit.Assert.fail("Size changes to the child element should not trigger resize events in the parent element.");
            }


            var childStyle = this._child.style;
            var childResizedCounter = 0;
            var expectedChildResizeEvents = 7;
            var childResizedSignal: WinJS._Signal<any>;
            function childResizeHandler(): void {
                if (testInitialization) {
                    return;
                };
                childResizedCounter++;
                childResizedSignal.complete();
            }

            WinJS.Promise.join([
                this._parentResizeInstrument.monitorAncestor(parentResizeHandler),
                this._childResizeInstrument.monitorAncestor(childResizeHandler),
            ])
                .then(() => {
                    // The first time monitorAncestor() is called, it triggers the _DlementResizeInstrument's <object> contentWindow to load.
                    // When this happens, the <object> element in some browsers will fire an initial window resize event.
                    // Burn 500ms to allow those events to fire, so we don't test against false positives
                    return WinJS.Promise.timeout(500);
                })
                .then(() => {
                    testInitialization = false;
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

            WinJS.Promise.join([
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
                    ])
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

            WinJS.Promise.join([
                this._parentResizeInstrument.monitorAncestor(parentResizeHandler),
                this._childResizeInstrument.monitorAncestor(childResizeHandler),
            ])
                .then(() => {
                    this._parentResizeInstrument.dispose();
                    this._childResizeInstrument.dispose();

                    LiveUnit.Assert.isTrue(this._parentResizeInstrument._disposed);
                    LiveUnit.Assert.isTrue(this._childResizeInstrument._disposed);

                    // Resizing the parent or child element should no longer fire events
                    this._parent.style.height = "10px";
                    this._child.style.height = "10px";

                    return WinJS.Promise.timeout(500);
                })
                .done(() => {
                    // Disposing again should not cause any bad behavior
                    this._parentResizeInstrument.dispose();
                    this._childResizeInstrument.dispose();

                    complete();
                })
        }

        testRepeatMonitorings(complete) {
            // Verify that calling monitorAncestor a second time with a new resizeHandler will also decommission the old resize handler.

            var childStyle = this._child.style;

            var firstHandlerCounter = 0;
            var expectedFirstHandlerCalls = 1;
            var firstHandlerSignal: WinJS._Signal<any>;
            function firstResizeHandler(): void {
                firstHandlerCounter++;
                firstHandlerSignal.complete();
            }

            var secondHandlerCounter = 0;
            var expectedSecondHandlerCalls = 1;
            var secondHandlerSignal: WinJS._Signal<any>;
            function secondResizeHandler(): void {
                secondHandlerCounter++;
                secondHandlerSignal.complete();
            }

            this._childResizeInstrument.monitorAncestor(firstResizeHandler)
                .then(() => {
                    firstHandlerSignal = new WinJS._Signal();
                    childStyle.width = "50%";
                    return firstHandlerSignal.promise;
                })
                .then(() => {
                    // Calling Monitor with a new resizeHandler should also decommission the old resize handler.
                    return this._childResizeInstrument.monitorAncestor(secondResizeHandler);
                })
                .then(() => {
                    secondHandlerSignal = new WinJS._Signal();
                    childStyle.height = "50%";

                    // Wait 500ms to ensure that the first handler isn't firing anymore.
                    return WinJS.Promise.join([
                        secondHandlerSignal.promise,
                        WinJS.Promise.timeout(500)
                    ]);
                })
                .done(() => {
                    LiveUnit.Assert.areEqual(expectedFirstHandlerCalls, firstHandlerCounter, "firstResizeHandler fired incorrect amount of times");
                    LiveUnit.Assert.areEqual(expectedSecondHandlerCalls, secondHandlerCounter, "secondResizeHandler fired incorrect amount of times");

                    complete();
                });
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests.ElementResizeInstrumentTests");