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
            //this._element.appendChild(this._child);
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

            function parentFailEvent(): void {
                LiveUnit.Assert.fail("Size changes to the child element should not trigger resize events in the parent element.");
            }

            var childStyle = this._child.style;
            var childResizedCounter = 0;
            var expectedChildResizeEvents = 7;
            var childResizedSignal: WinJS._Signal<any>;
            function childResizeHandler(): void {
                childResizedCounter++;
                childResizedSignal.complete();
            }

            var parentLoadingPromise = new WinJS.Promise((c) => {
                this._parentResizeInstrument.addEventListener("loaded", c);
                this._parentResizeInstrument.addedToDom();
            });

            var childLoadingPromise = new WinJS.Promise((c) => {
                this._childResizeInstrument.addEventListener("loaded", c);
                this._childResizeInstrument.addedToDom();
            });
            WinJS.Promise
                .join([
                    parentLoadingPromise,
                    childLoadingPromise,
                ])
                .then(awaitInitialResizeEvents)
                .then(() => {
                    this._childResizeInstrument.addEventListener("resize", childResizeHandler);
                    this._parentResizeInstrument.addEventListener("resize", parentFailEvent);

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

            var childLoadingPromise = new WinJS.Promise((c) => {
                this._childResizeInstrument.addEventListener("loaded", c);
                this._childResizeInstrument.addedToDom();
            })

            childLoadingPromise
                .then(awaitInitialResizeEvents)
                .then(() => {
                    this._childResizeInstrument.addEventListener("resize", childResizeHandler);
                    childStyle.width = "50%";
                    getComputedStyle(this._child);
                    childStyle.height = "50%";
                    getComputedStyle(this._child);
                    childStyle.padding = "5px";

                    // Wait long enough to make sure only one resize event was fired.
                    return allowTimeForAdditionalResizeEvents();
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
            var expectedParentHandlerCalls = 2;
            var parentResizedSignal: WinJS._Signal<any>;
            function parentResizeHandler(): void {
                parentHandlerCounter++;
                parentResizedSignal.complete();
            }

            var childHandlerCounter = 0;
            var expectedChildHandlerCalls = 2;
            var childResizedSignal: WinJS._Signal<any>;
            function childResizeHandler(): void {
                childHandlerCounter++;
                childResizedSignal.complete();
            }

            var parentLoadingPromise = new WinJS.Promise((c) => {
                this._parentResizeInstrument.addEventListener("loaded", c);
                this._parentResizeInstrument.addedToDom();
            });

            var childLoadingPromise = new WinJS.Promise((c) => {
                this._childResizeInstrument.addEventListener("loaded", c);
                this._childResizeInstrument.addedToDom();
            })

            WinJS.Promise
                .join([
                    parentLoadingPromise,
                    childLoadingPromise,
                ])
                .then(awaitInitialResizeEvents)
                .then(() => {

                    this._parentResizeInstrument.addEventListener("resize", parentResizeHandler);
                    this._childResizeInstrument.addEventListener("resize", childResizeHandler);

                    parentResizedSignal = new WinJS._Signal();
                    childResizedSignal = new WinJS._Signal();

                    parentStyle.height = "50%";

                    return WinJS.Promise.join([
                        parentResizedSignal.promise,
                        childResizedSignal.promise,
                    ]);
                })
                .then(() => {
                    parentResizedSignal = new WinJS._Signal();
                    childResizedSignal = new WinJS._Signal();

                    parentStyle.width = "50%";

                    return WinJS.Promise.join([
                        parentResizedSignal.promise,
                        childResizedSignal.promise,
                    ]);
                })
                //.then(() => {
                //    parentResizedSignal = new WinJS._Signal();
                //    childResizedSignal = new WinJS._Signal();

                //    parentStyle.padding = "5px";

                //    return WinJS.Promise.join([
                //        parentResizedSignal.promise,
                //        childResizedSignal.promise,
                //    ]);
                //})
                .done(() => {
                    LiveUnit.Assert.areEqual(expectedParentHandlerCalls, parentHandlerCounter,
                        "Batched 'resize' events should cause the parent handler to fire EXACTLY once.");
                    LiveUnit.Assert.areEqual(expectedChildHandlerCalls, childHandlerCounter,
                        "Batched 'resize' events should cause the child handler to fire EXACTLY once.");
                    complete();
                });
        }

        testDispose(complete) {
            function parentFailResizeHandler(): void {
                LiveUnit.Assert.fail("Changes to the parent element should not fire resize events since the instrument was disposed");
            }

            function childFailResizeHandler(): void {
                LiveUnit.Assert.fail("Changes to the child element should not fire resize events since the instrument was disposed");
            }

            // Test disposing parent instrument immediately after addedToDom is called, some browsers may still be loading the <object> element at this point and we want to
            // make sure that we don't still try to hook the <object>'s content window asyncronously once the <object> finishes loading, if its already been disposed.
            this._parentResizeInstrument.addedToDom();
            this._parentResizeInstrument.addEventListener("resize", parentFailResizeHandler);
            this._parentResizeInstrument.dispose();
            LiveUnit.Assert.isTrue(this._parentResizeInstrument._disposed);


            // Test disposing child instrument after it has completely loaded.
            new WinJS.Promise((c) => {
                this._childResizeInstrument.addEventListener("loaded", c);
                this._childResizeInstrument.addedToDom();
            })
                .then(() => {
                    this._childResizeInstrument.addEventListener("resize", childFailResizeHandler);
                    this._childResizeInstrument.dispose();
                    LiveUnit.Assert.isTrue(this._childResizeInstrument._disposed);

                    // Now that both Instruments have been disposed, resizing the parent or child element should no longer fire events
                    this._parent.style.height = "10px";
                    this._child.style.height = "10px";

                    // Wait long enough to ensure events aren't being handled.
                    return allowTimeForAdditionalResizeEvents();
                })
                .done(() => {
                    // Disposing again should not cause any bad behavior
                    this._parentResizeInstrument.dispose();
                    this._childResizeInstrument.dispose();

                    complete();
                });
        }

    }
}
LiveUnit.registerTestClass("CorsicaTests.ElementResizeInstrumentTests");