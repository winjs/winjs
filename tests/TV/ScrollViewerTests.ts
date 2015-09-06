// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../TestLib/Helper.ts" />
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />

module CorsicaTests {
    "use strict";

    var Keys = WinJS.Utilities.Key;

    function waitForScrollDone(element: HTMLElement) {
        return new WinJS.Promise(c => {
            element.addEventListener("MSManipulationStateChanged", function handler(e: MSManipulationEvent) {
                if (e.currentState !== MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED) {
                    return;
                }
                element.removeEventListener("MSManipulationStateChanged", handler);
                c();
            });
        });
    }

    export class ScrollViewerTests {
        leftButton: HTMLButtonElement;
        rightButton: HTMLButtonElement;
        sv: WinJS.UI.ScrollViewer;

        setUp() {
            var testRoot = document.createElement("div");
            testRoot.id = "testRoot";
            testRoot.style.position = "relative";
            testRoot.style.width = "100%";
            testRoot.style.height = "100%";
            document.body.appendChild(testRoot);

            this.leftButton = document.createElement("button");
            this.leftButton.style.position = "absolute";
            this.leftButton.style.width = "100px";
            this.leftButton.style.height = "20px";
            this.leftButton.style.left = "0";
            this.leftButton.style.top = "0";
            testRoot.appendChild(this.leftButton);

            var el = document.createElement("div");
            el.id = "testScrollViewer";
            el.style.position = "absolute";
            el.style.left = "100px";
            el.style.top = "0";
            el.style.width = "300px";
            el.style.height = "400px";
            var child = document.createElement("div");
            child.tabIndex = 0;
            child.style.height = "10000px";
            child.style.width = "100%";
            el.appendChild(child);
            testRoot.appendChild(el);

            this.rightButton = document.createElement("button");
            this.rightButton.style.position = "absolute";
            this.rightButton.style.width = "100px";
            this.rightButton.style.height = "20px";
            this.rightButton.style.left = "400px";
            this.rightButton.style.top = "0";
            testRoot.appendChild(this.rightButton);

            this.sv = new WinJS.UI.ScrollViewer(el);
        }

        tearDown() {
            var testRoot = <HTMLDivElement>document.querySelector("#testRoot");
            if (testRoot) {
                WinJS.Utilities.disposeSubTree(testRoot);
                testRoot.parentElement.removeChild(testRoot);
            }
        }

        testEmptyConstructor() {
            new WinJS.UI.ScrollViewer();
        }

        testTextMode(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;

                var origScrollPosition = this.sv._scrollingContainer.scrollTop;

                LiveUnit.Assert.isTrue(this.sv.element.classList.contains("win-scrollviewer-scrollmode-text"));
                LiveUnit.Assert.isTrue(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode"));
                LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                // Normal text mode should not auto-activate on focus
                this.sv._scrollingContainer.focus();

                WinJS.Promise.timeout(200)
                    .then(() => {
                        LiveUnit.Assert.areEqual(this.sv._scrollingContainer, document.activeElement);
                        LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                        // Try scrolling while SV is inactive
                        Helper.keydown(document.activeElement, Keys.downArrow);
                        Helper.keydown(document.activeElement, Keys.pageDown);

                        return WinJS.Promise.timeout(200);
                    }).then(() => {
                        LiveUnit.Assert.areEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop, "Should not scroll since the SV is not yet active");

                        this.sv._setActive();
                        LiveUnit.Assert.isTrue(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                        // Try scrolling down by a small amount
                        Helper.keydown(document.activeElement, Keys.downArrow);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).done(() => {
                        LiveUnit.Assert.isTrue(this.sv._scrollingContainer.scrollTop > origScrollPosition);
                        complete();
                    });
            };
        }

        testNonModalTextMode(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;
                this.sv.scrollMode = WinJS.UI.ScrollMode.nonModalText;

                var origScrollPosition = this.sv._scrollingContainer.scrollTop;

                LiveUnit.Assert.isTrue(this.sv.element.classList.contains("win-scrollviewer-scrollmode-text"));
                LiveUnit.Assert.isTrue(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode"));
                LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                // Non-modal text mode should auto-activate on focus
                this.sv._scrollingContainer.focus();
                WinJS.Promise.timeout(200)
                    .then(() => {
                        LiveUnit.Assert.areEqual(this.sv._scrollingContainer, document.activeElement);
                        LiveUnit.Assert.isTrue(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                        // Try scrolling by a small amount
                        Helper.keydown(document.activeElement, Keys.downArrow);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).done(() => {
                        LiveUnit.Assert.isTrue(this.sv._scrollingContainer.scrollTop > origScrollPosition);
                        complete();
                    });
            };
        }

        testListMode(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;
                this.sv.scrollMode = WinJS.UI.ScrollMode.list;

                var origScrollPosition = this.sv._scrollingContainer.scrollTop;

                LiveUnit.Assert.isTrue(this.sv.element.classList.contains("win-scrollviewer-scrollmode-list"));
                LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode"));
                LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                // Focusing the ScrollViewer in List mode should delegate focus to the first focusable element within it
                this.sv._scrollingContainer.focus();
                WinJS.Promise.timeout(200)
                    .then(() => {
                        LiveUnit.Assert.areEqual(this.sv._scrollingContainer.firstElementChild, document.activeElement);

                        // Try scrolling by a small amount, should not work
                        Helper.keydown(document.activeElement, Keys.downArrow);
                        return WinJS.Promise.timeout(200);
                    }).then(() => {
                        LiveUnit.Assert.areEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop);

                        // Try scrolling by a large amount, should not work
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.pageDown);

                        return WinJS.Promise.timeout(200);
                    }).done(() => {
                        LiveUnit.Assert.areEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop);

                        complete();
                    });
            };
        }

        testScrolling(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;

                // The scrolling indicators should show up-disabled, down-enabled
                LiveUnit.Assert.isFalse(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-up"));
                LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-down"));

                this.sv._scrollingContainer.focus();
                this.sv._setActive();

                var origScrollPosition = this.sv._scrollingContainer.scrollTop;
                var smallDelta = 0;
                var largeDelta = 0;

                // Try scrolling down by a small amount
                Helper.keydown(document.activeElement, Keys.downArrow);
                waitForScrollDone(this.sv._scrollingContainer)
                    .then(() => {
                        smallDelta = this.sv._scrollingContainer.scrollTop - origScrollPosition;
                        LiveUnit.Assert.isTrue(this.sv._scrollingContainer.scrollTop > origScrollPosition);
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-up"));
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-down"));

                        // Try scrolling down by a large amount
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.pageDown);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).then(() => {
                        largeDelta = this.sv._scrollingContainer.scrollTop - origScrollPosition;
                        LiveUnit.Assert.isTrue(largeDelta > smallDelta);
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-up"));
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-down"));

                        // Try scrolling up by a small amount
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.upArrow);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).then(() => {
                        LiveUnit.Assert.areEqual(-smallDelta, this.sv._scrollingContainer.scrollTop - origScrollPosition);
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-up"));
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-down"));

                        // Try scrolling up by a large amount
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.pageUp);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).then(() => {
                        LiveUnit.Assert.areEqual(-largeDelta, this.sv._scrollingContainer.scrollTop - origScrollPosition);
                        LiveUnit.Assert.isFalse(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-up"));
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-down"));

                        // Scroll to end, indcators should show up-enabled, down-disabled
                        this.sv._scrollingContainer.scrollTop = this.sv._scrollingContainer.scrollHeight - this.sv.element.offsetHeight;

                        return WinJS.Promise.timeout(100);
                    }).then(() => {
                        LiveUnit.Assert.isTrue(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-up"));
                        LiveUnit.Assert.isFalse(this.sv._scrollingIndicatorElement.classList.contains("win-scrollable-down"));

                        // ScrollViewer should deactivate on focus loss
                        this.rightButton.focus();
                        return WinJS.Promise.timeout(100);
                    }).done(() => {
                        LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                        complete();
                    });
            };
        }

        testLeftRightKeysExitsActiveMode(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;

                this.sv._scrollingContainer.focus();
                LiveUnit.Assert.areEqual(this.sv._scrollingContainer, document.activeElement);
                this.sv._setActive();

                // Exit the ScrollViewer to the left
                Helper.keydown(document.activeElement, Keys.leftArrow);
                LiveUnit.Assert.areEqual(this.leftButton, document.activeElement);

                this.sv._scrollingContainer.focus();
                LiveUnit.Assert.areEqual(this.sv._scrollingContainer, document.activeElement);
                this.sv._setActive();

                // Exit the ScrollViewer to the right
                Helper.keydown(document.activeElement, Keys.rightArrow);
                LiveUnit.Assert.areEqual(this.rightButton, document.activeElement);

                complete();
            };
        }

        testVUIActivation(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;

                // VUI should start off disabled
                LiveUnit.Assert.isFalse(this.sv.element.classList.contains("win-voice-voicemodeactive"));

                // VUI should be active in active state
                var evt = <CustomEvent>document.createEvent("CustomEvent");
                evt["state"] = "active";
                evt.initCustomEvent("listeningstatechanged", true, false, null);
                this.sv._scrollingIndicatorElement.dispatchEvent(evt);
                LiveUnit.Assert.isTrue(this.sv.element.classList.contains("win-voice-voicemodeactive"));

                // VUI should remain active in disambig state
                var evt = <CustomEvent>document.createEvent("CustomEvent");
                evt["state"] = "disambiguation";
                evt.initCustomEvent("listeningstatechanged", true, false, null);
                this.sv._scrollingIndicatorElement.dispatchEvent(evt);
                LiveUnit.Assert.isTrue(this.sv.element.classList.contains("win-voice-voicemodeactive"));

                // VUI should be disabled in inactive state
                var evt = <CustomEvent>document.createEvent("CustomEvent");
                evt["state"] = "inactive";
                evt.initCustomEvent("listeningstatechanged", true, false, null);
                this.sv._scrollingIndicatorElement.dispatchEvent(evt);
                LiveUnit.Assert.isFalse(this.sv.element.classList.contains("win-voice-voicemodeactive"));

                complete();
            };
        }

        testVUIScrolling(complete) {
            if (!HTMLElement.prototype.setActive) {
                LiveUnit.LoggingCore.logComment("This test relies on IE specific focus APIs.");
                complete();
                return;
            }

            this.sv._refreshDone = () => {
                this.sv._refreshDone = null;

                // Make sure the scroller is focused and the ScrollViewer is still inactive
                this.sv._scrollingContainer.focus();
                LiveUnit.Assert.areEqual(this.sv._scrollingContainer, document.activeElement);
                LiveUnit.Assert.isFalse(this.sv._scrollingContainer.classList.contains("win-xyfocus-togglemode-active"));

                // Try scrolling by large amounts, should fail
                var origScrollPosition = this.sv._scrollingContainer.scrollTop;
                Helper.keydown(document.activeElement, Keys.pageDown);
                Helper.keydown(document.activeElement, Keys.pageDown);
                Helper.keydown(document.activeElement, Keys.pageUp);
                WinJS.Promise.timeout(200)
                    .then(() => {
                        LiveUnit.Assert.areEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop);

                        // Simulate VUI active
                        this.sv._vuiActive = true;

                        // Try scrolling by a small amounts, should not work
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.downArrow);
                        Helper.keydown(document.activeElement, Keys.downArrow);
                        Helper.keydown(document.activeElement, Keys.upArrow);

                        return WinJS.Promise.timeout(200);
                    }).then(() => {
                        LiveUnit.Assert.areEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop);

                        // Try scrolling by a large amount, should work
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.pageDown);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).then(() => {
                        LiveUnit.Assert.areNotEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop);

                        // Try scrolling by a large amount, should work
                        origScrollPosition = this.sv._scrollingContainer.scrollTop;
                        Helper.keydown(document.activeElement, Keys.pageUp);

                        return waitForScrollDone(this.sv._scrollingContainer);
                    }).done(() => {
                        LiveUnit.Assert.areNotEqual(origScrollPosition, this.sv._scrollingContainer.scrollTop);

                        complete();
                    });
            };
        }
    }
}

LiveUnit.registerTestClass("CorsicaTests.ScrollViewerTests");