// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    var _ElementResizeInstrument = <typeof WinJS.UI.PrivateElementResizeInstrument> Helper.require("WinJS/Controls/ElementResizeInstrument/_ElementResizeInstrument")._ElementResizeInstrument;

    var resizeEvent = _ElementResizeInstrument.EventNames.resize;
    var readyEvent = _ElementResizeInstrument.EventNames._ready;

    function disposeAndRemoveElement(element: HTMLElement) {
        if (element.winControl) {
            element.winControl.dispose();
        }
        WinJS.Utilities.disposeSubTree(element);
        if (element.parentElement) {
            element.parentElement.removeChild(element);
        }
    }

    function awaitInitialResizeEvent(resizeInstrument: WinJS.UI.PrivateElementResizeInstrument): WinJS.Promise<any> {
        // When the _ElementResizeHandler finishes loading, it will fire an initial resize event. Some tests may want
        // to account for that to avoid false positives in tests.
        return new WinJS.Promise((c) => {
            resizeInstrument.addEventListener(resizeEvent, function handleInitialResize() {
                resizeInstrument.removeEventListener(resizeEvent, handleInitialResize);
                c();
            });
        })
    }

    function allowTimeForAdditionalResizeEvents(): WinJS.Promise<any> {
        // Helper function used to let enough time pass for a resize event to occur, 
        // usually this is to capture any additional resize events that may have been pending,
        // particularly when we want to verify that no redundant events will be fired.
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
            // Setup creates a subTree of two elements "parent" and "child", 
            // and gives each its own _ElementResizeInstrument.
            LiveUnit.LoggingCore.logComment("In setup");

            // Host element for our subTree.
            this._element = document.createElement("DIV");

            // Create two elements (parent & child), each styled with percentage heights & widths and each with its own _ElementResizeInstrument.
            this._parent = document.createElement("DIV");
            this._child = document.createElement("DIV");

            this._parent.appendChild(this._child);
            this._element.appendChild(this._parent);
            document.body.appendChild(this._element);

            // Let host element be the nearest positioned ancestor of the parent element
            this._element.style.cssText = "position: relative; height: 800px; width: 800px;";

            // Parent and Child need to be positioned in order to have resizes detected by the resizeInstruments. Not necessary to set CSS offsets.
            var parentStyleText = "position: relative; width: 65%; maxWidth: inherit; minWidth: inherit; height: 65%; maxHeight: inherit; minHeight: inherit; padding: 0px;";
            var childStyleText = parentStyleText;

            this._parent.id = "parent";
            this._parent.style.cssText = parentStyleText;
            this._parentInstrument = new _ElementResizeInstrument();
            this._parent.appendChild(this._parentInstrument.element);

            this._child.id = "child";
            this._child.style.cssText = childStyleText;
            this._childInstrument = new _ElementResizeInstrument();
            this._child.appendChild(this._childInstrument.element);

        }

        tearDown() {
            if (this._element) {
                disposeAndRemoveElement(this._element)
                this._element = null;
                this._parent = null;
                this._child = null;
                this._parentInstrument = null;
                this._childInstrument = null;
            }
        }

        testInitialResizeEvent(complete) {
            // Verify that an _ElementResizeInstrument will asynchronously fire a "resize" event after it has 
            // been initialized and added to the DOM.

            // The _ElementResizeInstrument uses an <object> element and its contentWindow to detect resize events in whichever element the 
            // _ElementResizeInstrument is appended to. Some browsers will fire an async "resize" event for the <object> element automatically when 
            // it gets added to the DOM, others won't. In both cases it is up to the _ElementResizeHandler to make sure that an initial async "resize" 
            // event is always fired in all browsers. 

            var parentInstrumentReadyPromise = new WinJS.Promise((c) => {
                this._parentInstrument.addEventListener(readyEvent, c);
                this._parentInstrument.addedToDom();
            })

            var childInstrumentReadyPromise = new WinJS.Promise((c) => {
                this._childInstrument.addEventListener(readyEvent, c);
                this._childInstrument.addedToDom();
            })

            // The ready event is a private event used for unit tests. The ready event fires whenever the _ElementResizeInstrument's underlying 
            // <object> element has successfully loaded and the _ElementResizeInstrument has successfully hooked up a "resize" event listener
            // to the <object> element's contentWindow. 
            WinJS.Promise
                .join([
                // Verify that everything was hooked up correctly.
                    parentInstrumentReadyPromise,
                    childInstrumentReadyPromise,
                ]).then(() => {
                    // If everything was hooked up correctly, we expect an initial resize event from both instruments.
                    var parentInstrumentResizePromise = awaitInitialResizeEvent(this._parentInstrument);
                    var childInstrumentResizePromise = awaitInitialResizeEvent(this._childInstrument);

                    return WinJS.Promise
                        .join([
                            parentInstrumentResizePromise,
                            childInstrumentResizePromise,
                        ]);
                }).done(complete);
        }

        testInitialResizeEventFiresOnlyOnce(complete) {
            // Verify that in all browsers each _ElementResizeInstrument fires exactly one initial resize event.

            // The _ElementResizeInstrument uses an <object> element and its contentWindow to detect resize events in whichever element the 
            // _ElementResizeInstrument is appended to. Some browsers will fire an async "resize" event for the <object> element automatically when 
            // it gets added to the DOM, others won't. In both cases it is up to the _ElementResizeHandler to make sure that an initial aysnc "resize" 
            // event is always fired in all browsers. 

            this._parentInstrument.addedToDom();
            this._childInstrument.addedToDom();

            var expectedResizeCount = 1;
            var parentResizeCount = 0;
            var childResizeCount = 0;

            this._parentInstrument.addEventListener(resizeEvent, () => {
                parentResizeCount++;
            });

            this._childInstrument.addEventListener(resizeEvent, () => {
                childResizeCount++;
            })

            allowTimeForAdditionalResizeEvents()
                .done(() => {
                    LiveUnit.Assert.areEqual(expectedResizeCount, parentResizeCount, "Only 1 resize event should have been detected by the parent instrument");
                    LiveUnit.Assert.areEqual(expectedResizeCount, childResizeCount, "Only 1 resize event should have been detected by the child instrument");
                    complete();
                });
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

            this._parentInstrument.addedToDom();
            this._childInstrument.addedToDom();
            WinJS.Promise
                .join([
                    awaitInitialResizeEvent(this._parentInstrument),
                    awaitInitialResizeEvent(this._childInstrument)
                ])
                .then(() => {
                    this._childInstrument.addEventListener(resizeEvent, childResizeHandler);
                    this._parentInstrument.addEventListener(resizeEvent, parentFailEvent);

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
            this._childInstrument.addedToDom();
            awaitInitialResizeEvent(this._childInstrument)
                .then(() => {
                    this._childInstrument.addEventListener(resizeEvent, childResizeHandler);
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
            // Test expects child element to be styled with percentage height and width and that both the child element and the parent element
            // each have their own _ElementResizeInstrument.

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

            this._parentInstrument.addedToDom();
            this._childInstrument.addedToDom();
            WinJS.Promise
                .join([
                    awaitInitialResizeEvent(this._parentInstrument),
                    awaitInitialResizeEvent(this._childInstrument)
                ])
                .then(() => {

                    this._parentInstrument.addEventListener(resizeEvent, parentResizeHandler);
                    this._childInstrument.addEventListener(resizeEvent, childResizeHandler);

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
                LiveUnit.Assert.fail("disposed parentIstrument should never fire resize events");
            }

            function childFailResizeHandler(): void {
                LiveUnit.Assert.fail("disposed childInstrument should never fires resize events");
            }

            // Test disposing parent instrument immediately after addedToDom is called, some browsers may still be loading the <object> element at this point and we want to
            // make sure that we don't still try to hook the <object>'s content window asyncronously once the <object> finishes loading, if its already been disposed.
            // Verify that the parent instrument never fires an initial resize event.
            this._parentInstrument.addEventListener(resizeEvent, parentFailResizeHandler);
            this._parentInstrument.addedToDom();
            this._parentInstrument.dispose();
            LiveUnit.Assert.isTrue(this._parentInstrument._disposed);

            // Test that by disposing the child instrument after it is ready, 
            // it wont fire an initial resize event.
            new WinJS.Promise((c) => {
                this._childInstrument.addEventListener(readyEvent, c);
                this._childInstrument.addedToDom();
            })
                .then(() => {
                    this._childInstrument.addEventListener(resizeEvent, childFailResizeHandler);
                    this._childInstrument.dispose();
                    LiveUnit.Assert.isTrue(this._childInstrument._disposed);

                    // Now that both Instruments have been disposed, resizing the parent or child element should no longer fire events
                    this._parent.style.height = "10px";
                    this._child.style.height = "10px";

                    // Wait long enough to ensure events aren't being handled.
                    return allowTimeForAdditionalResizeEvents();
                })
                .done(() => {
                    // Disposing again should not cause any bad behavior
                    this._parentInstrument.dispose();
                    this._childInstrument.dispose();

                    complete();
                });
        }

        testReAppendToDomAndResizeAsynchronouslyExtended(complete) {
            // Make sure that removing and reappending an initialized _ElementResizeInstrument
            // Doesn't permanently stop our _ElementResizeInstrument from firing resize events.
            // This test is partially testing the browser to make sure that the "resize" listener 
            // we've added to the <object> element's contentWindow doesn't become permanently 
            // broken if it leaves and renters the DOM.

            // We understand that right now there is a period of time after the control has 
            // been re-appended into the DOM before it will start responding to size change 
            // events. The period of time varies depending on the browser, presumably this 
            // is because the browser hasn't run layout yet. We expect that developers can call
            // forceLayout() on any controls using _ElementResizeListeners to force the control 
            // to respond to size changes during this period of time where resize events are not
            // fired when size changes are made immediately after appending it to the DOM.
            var childResizeSignal: WinJS._Signal<any>;
            function childResizeHandler() {
                childResizeSignal.complete();
            }

            var parentResizeSignal: WinJS._Signal<any>;
            function parentResizeHandler() {
                parentResizeSignal.complete();
            }

            var parent = this._parent;
            var parentInstrument = this._parentInstrument;
            var childInstrument = this._childInstrument;

            parentInstrument.addedToDom();
            childInstrument.addedToDom();

            WinJS.Promise
                .join([
                    awaitInitialResizeEvent(this._parentInstrument),
                    awaitInitialResizeEvent(this._childInstrument)
                ])
                .then(() => {
                    parentInstrument.addEventListener(resizeEvent, parentResizeHandler);
                    childInstrument.addEventListener(resizeEvent, childResizeHandler);

                    // Test both instruments still fire "resize" after re-appending them to the
                    // DOM and then asynchronously updating the width of the parent element. 
                    parentResizeSignal = new WinJS._Signal();
                    childResizeSignal = new WinJS._Signal();

                    this._element.removeChild(parent);
                    return new WinJS.Promise((c) => {
                        window.requestAnimationFrame(c);
                    });
                })
                .then(() => {
                    this._element.appendChild(parent);
                    return WinJS.Promise.timeout(100);
                })
                .then(() => {
                    parent.style.width = "43%"
                    return WinJS.Promise.join([
                        parentResizeSignal.promise,
                        childResizeSignal.promise,
                    ]);
                })
                .done(() => {
                    complete();
                });
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests.ElementResizeInstrumentTests");