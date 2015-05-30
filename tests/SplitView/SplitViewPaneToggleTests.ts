// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="SplitViewUtilities.ts" />

/// <reference path="../../typings/winjs/winjs.d.ts" />

module SplitViewTests {
    "use strict";
    
    var SplitViewPaneToggle = <typeof WinJS.UI.PrivateSplitViewPaneToggle>WinJS.UI.SplitViewPaneToggle;
    var testRoot: HTMLElement;
    var Utils = SplitViewTests.Utilities;
    var createSplitView: (options?: any) => WinJS.UI.PrivateSplitView;
    var createSplitViewPaneToggle: (element?: HTMLButtonElement, options?: any) => WinJS.UI.PrivateSplitViewPaneToggle;
    
    function makeCreateSplitViewPaneToggle(testRoot) {
        function createSplitViewPaneToggle(element?: HTMLButtonElement, options?: any): WinJS.UI.PrivateSplitViewPaneToggle {
            var splitViewPaneToggle = new SplitViewPaneToggle(element, options);
            testRoot.appendChild(splitViewPaneToggle.element);
            
            return splitViewPaneToggle;
        }
        return createSplitViewPaneToggle;
    }
    
    function assertPaneOpened(splitView: WinJS.UI.PrivateSplitView, splitViewPaneToggle: WinJS.UI.PrivateSplitViewPaneToggle): void {
        LiveUnit.Assert.isTrue(splitView.paneOpened, "SplitView pane should be open");
        LiveUnit.Assert.areEqual("true", splitViewPaneToggle.element.getAttribute("aria-expanded"),
            "SplitViewPaneToggle should have aria-expanded='true'");
    }

    function assertHasClass(element: HTMLElement, className: string, msg: string): void {
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(element, className), msg);
    }

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. oninvoked) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(registerForEvent: (splitViewPaneToggle: WinJS.UI.PrivateSplitViewPaneToggle, eventName: string, handler: Function) => void) {
        var splitViewPaneToggle = createSplitViewPaneToggle();

        var counter = 0;
        registerForEvent(splitViewPaneToggle, "invoked", () => {
            LiveUnit.Assert.areEqual(1, counter, "invoked fired out of order");
            counter++;
        });

        LiveUnit.Assert.areEqual(0, counter, "before click: wrong number of events fired");
        counter++;

        splitViewPaneToggle._invoked();
        LiveUnit.Assert.areEqual(2, counter, "after click: wrong number of events fired");
    }
    
    //
    // Things the SplitViewPaneToggle keeps in sync:
    //  - SplitView's paneOpened
    //  - SplitViewPaneToggle's aria-expanded
    // Inputs
    //  - SplitViewPaneToggle is invoked
    //  - SplitView's paneOpened property changes
    //  - SplitViewPaneToggle's aria-expanded attribute changes
    //
    
    function testChangingPaneToggleState(args: { firesInvokedEvent: boolean; togglePaneState: (splitViewPaneToggle: WinJS.UI.PrivateSplitViewPaneToggle, splitView: WinJS.UI.PrivateSplitView) => void; }) {
        var invokedFired = false;
        var onInvoked = () => {
            invokedFired = true;
        };
        var verifyInvokedEvent = () => {
            if (args.firesInvokedEvent) {
                LiveUnit.Assert.isTrue(invokedFired, "SplitViewPaneToggle's invoked event should have fired");
            } else {
                LiveUnit.Assert.isFalse(invokedFired, "SplitViewPaneToggle's invoked event should not have fired");
            }
        };
        
        var splitView = Utils.useSynchronousAnimations(createSplitView());
        var splitViewPaneToggle = createSplitViewPaneToggle(null, {
            splitView: splitView.element,
            oninvoked: onInvoked
        });
        
        LiveUnit.Assert.isFalse(splitView.paneOpened, "Test expected SplitView to start out closed");
        LiveUnit.Assert.areEqual("false", splitViewPaneToggle.element.getAttribute("aria-expanded"),
            "Test expected SplitViewPaneToggle's aria-expanded attribute to start out 'false'");
        
        invokedFired = false;
        args.togglePaneState(splitViewPaneToggle, splitView);
        verifyInvokedEvent();
        LiveUnit.Assert.isTrue(splitView.paneOpened, "SplitView should have been opened by SplitViewPaneToggle");
        LiveUnit.Assert.areEqual("true", splitViewPaneToggle.element.getAttribute("aria-expanded"),
            "SplitViewPaneToggle's aria-expanded attribute should be 'true'");
        
        invokedFired = false;
        args.togglePaneState(splitViewPaneToggle, splitView);
        verifyInvokedEvent();
        LiveUnit.Assert.isFalse(splitView.paneOpened, "SplitView should have been closed by SplitViewPaneToggle");
        LiveUnit.Assert.areEqual("false", splitViewPaneToggle.element.getAttribute("aria-expanded"),
            "SplitViewPaneToggle's aria-expanded attribute should be 'false'");
    }

    export class SplitViewPaneToggleTests {
        setUp() {
            testRoot = document.createElement("div");
            // Give it an id so that we can use it in styles to make sure our styles win over the defaults.
            // We encourage apps to do the same.
            testRoot.id = "test-root";
            createSplitView = Utils.makeCreateSplitView(testRoot);
            createSplitViewPaneToggle = makeCreateSplitViewPaneToggle(testRoot);
            document.body.appendChild(testRoot);
        }

        tearDown() {
            WinJS.Utilities.disposeSubTree(testRoot);
            Helper.removeElement(testRoot);
        }

        testDomLevel0Events() {
            testEvents((splitViewPaneToggle: WinJS.UI.PrivateSplitViewPaneToggle, eventName: string, handler: Function) => {
                splitViewPaneToggle["on" + eventName] = handler;
            });
        }

        testDomLevel2Events() {
            testEvents((splitViewPaneToggle: WinJS.UI.PrivateSplitViewPaneToggle, eventName: string, handler: Function) => {
                splitViewPaneToggle.addEventListener(eventName, handler);
            });
        }

        // Verify that if we don't pass an element to the SplitViewPaneToggle's constructor, it creates
        // one for us and initializes its DOM structure correctly.
        testInitializationWithoutElement() {
            var splitViewPaneToggle = createSplitViewPaneToggle();
            
            LiveUnit.Assert.areEqual("BUTTON", splitViewPaneToggle.element.tagName, "SplitViewPaneToggle's element should be a button");
            assertHasClass(splitViewPaneToggle.element, SplitViewPaneToggle._ClassNames.splitViewPaneToggle, "splitViewPaneToggle.element is missing class");
            LiveUnit.Assert.isFalse(splitViewPaneToggle.element.hasAttribute("aria-controls"), "SplitViewPaneToggle shouldn't have aria-controls attribute");
            LiveUnit.Assert.isFalse(splitViewPaneToggle.element.hasAttribute("aria-expanded"), "SplitViewPaneToggle shouldn't have aria-expanded attribute");
        }

        // Verify that if we pass an element containing markup to the SplitViewPaneToggle's constructor, it correctly
        // initializes its DOM.
        testInitializationWithElement() {
            var element = document.createElement("button");
            element.className = "myCustomClass";
            var splitViewPaneToggle = createSplitViewPaneToggle(element);
            
            LiveUnit.Assert.areEqual(element, splitViewPaneToggle.element, "SplitViewPaneToggle should have used the element that was passed to it");
            LiveUnit.Assert.areEqual("BUTTON", element.tagName, "SplitViewPaneToggle's element should be a button");
            assertHasClass(element, SplitViewPaneToggle._ClassNames.splitViewPaneToggle, "splitViewPaneToggle.element is missing class");
            assertHasClass(element, "myCustomClass", "splitViewPaneToggle.element is missing class");
            LiveUnit.Assert.isFalse(element.hasAttribute("aria-controls"), "SplitViewPaneToggle shouldn't have aria-controls attribute");
            LiveUnit.Assert.isFalse(element.hasAttribute("aria-expanded"), "SplitViewPaneToggle shouldn't have aria-expanded attribute");
        }

        testInitializingProperties() {
            var splitView = Utils.useSynchronousAnimations(createSplitView());
            var splitViewPaneToggle = createSplitViewPaneToggle(null, {
                splitView: splitView.element
            });
            
            LiveUnit.Assert.areEqual(splitView.element, splitViewPaneToggle.splitView, "splitView property has wrong value after initialization");
            LiveUnit.Assert.areEqual(splitView.element.id, splitViewPaneToggle.element.getAttribute("aria-controls"),
                "SplitViewPaneToggle has wrong value for aria-controls attribute");
        }

        testChangingProperties() {
            var splitView = Utils.useSynchronousAnimations(createSplitView());
            var splitViewPaneToggle = createSplitViewPaneToggle();
            
            splitViewPaneToggle.splitView = splitView.element;
            LiveUnit.Assert.areEqual(splitView.element, splitViewPaneToggle.splitView, "splitView property has wrong value after setting it");
            LiveUnit.Assert.areEqual(splitView.element.id, splitViewPaneToggle.element.getAttribute("aria-controls"),
                "SplitViewPaneToggle has wrong value for aria-controls attribute");
        }
        
        // Verify that the SplitViewPaneToggle correctly syncs with the SplitView when the
        // SplitViewPaneToggle is created before the SplitView. This may happen during
        // WinJS.UI.processAll because instantiation order depends on the order in which
        // the controls appear in the DOM.
        testInitializingSplitViewPaneToggleBeforeSplitView() {
            var splitViewElement = document.createElement("div");
            testRoot.appendChild(splitViewElement);
            
            var splitViewPaneToggle = createSplitViewPaneToggle(null, {
                splitView: splitViewElement
            });
            var splitView = Utils.useSynchronousAnimations(new SplitView(splitViewElement, {
                paneOpened: true
            }));
            
            LiveUnit.Assert.isTrue(splitView.paneOpened, "SplitView should have started out as open");
            
            LiveUnit.Assert.areEqual("true", splitViewPaneToggle.element.getAttribute("aria-expanded"),
                "SplitViewPaneToggle's aria-expanded attribute should be 'true'");
            LiveUnit.Assert.areEqual(splitView.element.id, splitViewPaneToggle.element.getAttribute("aria-controls"),
                "SplitViewPaneToggle has wrong value for aria-controls attribute");
        }
        
        testInvoking() {
            testChangingPaneToggleState({
                firesInvokedEvent: true,
                togglePaneState: function (splitViewPaneToggle, splitView) {
                    splitViewPaneToggle._invoked();
                }
            });
        }
        
        testMutatingAriaExpanded() {
            testChangingPaneToggleState({
                firesInvokedEvent: false,
                togglePaneState: function (splitViewPaneToggle, splitView) {
                    var ariaExpanded = splitViewPaneToggle.element.getAttribute("aria-expanded") === "true";
                    splitViewPaneToggle.element.setAttribute("aria-expanded", ariaExpanded ? "false" : "true");
                }
            });
        }
        
        testMutatingSplitView() {
            testChangingPaneToggleState({
                firesInvokedEvent: false,
                togglePaneState: function (splitViewPaneToggle, splitView) {
                    splitView.paneOpened = !splitView.paneOpened;
                }
            });
        }
        
        testDispose() {
            function failEventHandler(eventName) {
                return function () {
                    LiveUnit.Assert.fail(eventName + ": shouldn't have run due to control being disposed");
                };
            }

            var splitView = Utils.useSynchronousAnimations(createSplitView());
            var splitViewPaneToggle = createSplitViewPaneToggle(null, {
                splitView: splitView.element,
                oninvoked: failEventHandler("invoked")
            });
            
            LiveUnit.Assert.isFalse(splitView.paneOpened, "Test expected SplitView to start out closed");
            
            splitViewPaneToggle.dispose();
            LiveUnit.Assert.isTrue(splitViewPaneToggle._disposed, "SplitViewPaneToggle didn't mark itself as disposed");
            
            splitViewPaneToggle._invoked();
            LiveUnit.Assert.isFalse(splitView.paneOpened, "SplitView should still be closed");
            splitViewPaneToggle.dispose();
            
        }
    }
}
LiveUnit.registerTestClass("SplitViewTests.SplitViewPaneToggleTests");
