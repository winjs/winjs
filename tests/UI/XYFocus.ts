// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

/// <deploy src="../TestData/" />

module WinJSTests {
    var highlightStyle = document.createElement("style");
    highlightStyle.innerHTML = "button:focus { background-color: red; }";

    function createAndAppendFocusableElement(x: number, y: number, container: HTMLElement, textContent?: string, tagName = "button", width = 150, height = 150) {
        var e = document.createElement(tagName);
        e.style.position = "absolute";
        e.style.width = width + "px";
        e.style.height = height + "px";
        e.style.minWidth = e.style.minHeight = "0px";
        e.style.left = x + "px";
        e.style.top = y + "px";
        e.tabIndex = 0;

        e["width"] = width;
        e["height"] = height;

        if (textContent) {
            e.textContent = textContent;
        }
        container.appendChild(e);
        return e;
    }

    function createCrossLayout(container?: HTMLElement, tagName = "button") {
        /*
         *   1
         * 2 3 4
         *   5
         */

        if (!container) {
            container = document.createElement("div");
            container.style.position = "absolute";
            container.style.width = container.style.height = "600px";
        }
        return [
            container,
            createAndAppendFocusableElement(250, 50, container, "1", tagName),
            createAndAppendFocusableElement(50, 250, container, "2", tagName),
            createAndAppendFocusableElement(250, 250, container, "3", tagName),
            createAndAppendFocusableElement(450, 250, container, "4", tagName),
            createAndAppendFocusableElement(250, 450, container, "5", tagName)
        ];
    }

    function spinWait(evaluator: () => boolean) {
        return new WinJS.Promise<void>(c => {
            var count = 0;
            var handle = setInterval(() => {
                if (++count === 100) {
                    clearInterval(handle);
                    evaluator();    // Step into this call to debug the evaluator
                    throw "test timeout";
                }
                if (evaluator()) {
                    c();
                    clearInterval(handle);
                }
            }, 50);
        });
    }

    function waitForFocus(w: Window, e: HTMLElement) {
        return spinWait(() => w.document.activeElement === e);
    }

    export class XYFocusTests {
        rootContainer: HTMLDivElement;

        setUp() {
            document.body.appendChild(highlightStyle);
            this.rootContainer = document.createElement("div");
            this.rootContainer.style.position = "relative";
            document.body.appendChild(this.rootContainer);
            WinJS.UI.XYFocus.focusRoot = this.rootContainer;
        }

        tearDown() {
            document.body.removeChild(highlightStyle);
            this.rootContainer.parentElement.removeChild(this.rootContainer);
            this.rootContainer = null;
            WinJS.UI.XYFocus.focusRoot = null;
            WinJS.UI.XYFocus.disableXYFocus();

            // Clear event listeners
            WinJS.UI.XYFocus["_listeners"].focuschanging = [];
            WinJS.UI.XYFocus["_listeners"].focuschanged = [];
        }

        testFindNextFocusElement() {
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var target = WinJS.UI.XYFocus.findNextFocusElement("left");
            LiveUnit.Assert.areEqual(layout[2], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("right");
            LiveUnit.Assert.areEqual(layout[4], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("up");
            LiveUnit.Assert.areEqual(layout[1], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("down");
            LiveUnit.Assert.areEqual(layout[5], target);
        }

        testFindNextFocusElementWithReferenceElement() {
            var layout = createCrossLayout(this.rootContainer);

            var target = WinJS.UI.XYFocus.findNextFocusElement("left", { referenceElement: layout[4] });
            LiveUnit.Assert.areEqual(layout[3], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("right", { referenceElement: layout[2] });
            LiveUnit.Assert.areEqual(layout[3], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("up", { referenceElement: layout[5] });
            LiveUnit.Assert.areEqual(layout[3], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("down", { referenceElement: layout[1] });
            LiveUnit.Assert.areEqual(layout[3], target);
        }

        testFindNextFocusElementWithNoInitialFocus() {
            var layout = createCrossLayout(this.rootContainer);

            document.body.focus();
            LiveUnit.Assert.areEqual(document.body, document.activeElement);

            var target = WinJS.UI.XYFocus.findNextFocusElement("right");
            LiveUnit.Assert.isNotNull(target);
        }

        testMoveFocus() {
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var target = WinJS.UI.XYFocus.moveFocus("left");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            target = WinJS.UI.XYFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            target = WinJS.UI.XYFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);

            target = WinJS.UI.XYFocus.moveFocus("down");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
        }

        testFocusRoot() {
            var left = createCrossLayout();
            var right = createCrossLayout();
            right[0].style.top = "0px";
            right[0].style.left = "700px";

            this.rootContainer.appendChild(left[0]);
            this.rootContainer.appendChild(right[0]);

            left[3].focus();
            LiveUnit.Assert.areEqual(left[3], document.activeElement);

            WinJS.UI.XYFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(left[4], document.activeElement);

            // Moving right should NOT move out of the left container
            var target = WinJS.UI.XYFocus.moveFocus("right", { focusRoot: left[0] });
            LiveUnit.Assert.areEqual(left[4], document.activeElement);
            LiveUnit.Assert.isNull(target);

            // Try the same as above using global focus root settings
            WinJS.UI.XYFocus.focusRoot = left[0];
            target = WinJS.UI.XYFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(left[4], document.activeElement);
            LiveUnit.Assert.isNull(target);

            // Focus should move across containers w/o focus root settings
            WinJS.UI.XYFocus.focusRoot = null;
            target = WinJS.UI.XYFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(right[2], document.activeElement);
        }

        testXYFocusHistory() {
            /**
             * ??????????????? ???????????????
             * ?      1      ? ?             ?
             * ??????????????? ?             ?
             * ??????????????? ?             ?
             * ?             ? ?      3      ?
             * ?      2      ? ?             ?
             * ?             ? ?             ?
             * ??????????????? ???????????????
             *
             * Normally, if focus was on 3, left would resolve to 2 since 2 occupies a bigger portion of 3's shadow.
             * However, if focus initially was on 1, then was moved right to 3, then a following left should resolve to 1.
            **/

            var layout = [
                this.rootContainer,
                createAndAppendFocusableElement(50, 50, this.rootContainer, "1", "button", 200, 100),
                createAndAppendFocusableElement(50, 200, this.rootContainer, "2", "button", 200, 300),
                createAndAppendFocusableElement(350, 50, this.rootContainer, "3", "button", 200, 450)
            ];

            // Move focus left from 3
            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            WinJS.UI.XYFocus.moveFocus("left");
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            // Move focus right from 1, then left and we should end up at 1 again
            layout[1].focus();
            WinJS.UI.XYFocus._xyFocus("right");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            WinJS.UI.XYFocus._xyFocus("left");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);
        }

        testPreventXYFocus() {
            var eventReceived = false;
            WinJS.UI.XYFocus.addEventListener("focuschanging", (e: WinJS.UI.XYFocus.XYFocusEvent) => {
                LiveUnit.Assert.areEqual(layout[1], e.detail.nextFocusElement);
                e.preventDefault();
                eventReceived = true;
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            WinJS.UI.XYFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            LiveUnit.Assert.isTrue(eventReceived);
        }

        testOverrideAttribute() {
            var layout = createCrossLayout(this.rootContainer);
            for (var i = 1; i < layout.length; i++) {
                layout[i].id = "btn" + i;
            }
            layout[3].setAttribute("data-win-focus", "{ left: '#btn4', right: '#btn2', up: '#btn5', down: '#btn1' }");

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var target = WinJS.UI.XYFocus.findNextFocusElement("up");
            LiveUnit.Assert.areEqual(layout[5], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("down");
            LiveUnit.Assert.areEqual(layout[1], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("left");
            LiveUnit.Assert.areEqual(layout[4], target);

            target = WinJS.UI.XYFocus.findNextFocusElement("right");
            LiveUnit.Assert.areEqual(layout[2], target);
        }

        testXYFocusWithDisabledElements() {
            var layout = createCrossLayout(this.rootContainer);
            layout[3].disabled = true;

            layout[5].focus();
            LiveUnit.Assert.areEqual(layout[5], document.activeElement);

            WinJS.UI.XYFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);
        }

        testXYFocusWithTabIndex() {
            var layout = createCrossLayout(this.rootContainer, "div");
            layout[3].tabIndex = -1;

            layout[5].focus();
            LiveUnit.Assert.areEqual(layout[5], document.activeElement);

            WinJS.UI.XYFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);

            layout[3].tabIndex = 0;
            WinJS.UI.XYFocus.moveFocus("down");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
        }

        testXYFocusEnabled(complete) {
            function doKeydown(targetElement: HTMLElement, keyCode: number, expNextEl: HTMLElement) {
                expectedKeyCode = keyCode;
                expectedNextElement = expNextEl;
                Helper.keydown(targetElement, keyCode);
            }

            var numEventsReceived = 0;
            var expectedKeyCode = -1;
            var expectedNextElement: HTMLElement;
            WinJS.UI.XYFocus.addEventListener("focuschanging", (e: WinJS.UI.XYFocus.XYFocusEvent) => {
                LiveUnit.Assert.areEqual(expectedKeyCode, e.detail.keyCode);
                LiveUnit.Assert.areEqual(expectedNextElement, e.detail.nextFocusElement);
                numEventsReceived++;
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            doKeydown(layout[3], WinJS.Utilities.Key.upArrow, layout[1]);
            setTimeout(() => {
                // Make sure XYFocus did not move focus w/o being enabled
                LiveUnit.Assert.areEqual(layout[3], document.activeElement);

                WinJS.UI.XYFocus.enableXYFocus();

                doKeydown(layout[3], WinJS.Utilities.Key.upArrow, layout[1]);
                waitForFocus(window, layout[1])
                    .then(() => {
                        doKeydown(layout[1], WinJS.Utilities.Key.downArrow, layout[3]);
                        return waitForFocus(window, layout[3]);
                    }).then(() => {
                        doKeydown(layout[3], WinJS.Utilities.Key.leftArrow, layout[2]);
                        return waitForFocus(window, layout[2]);
                    }).then(() => {
                        doKeydown(layout[2], WinJS.Utilities.Key.rightArrow, layout[3]);
                        return waitForFocus(window, layout[3]);
                    }).then(() => {
                        // Disable XYFocus and check that subsequent keypresses don't move focus
                        WinJS.UI.XYFocus.disableXYFocus();
                        doKeydown(layout[3], WinJS.Utilities.Key.upArrow, layout[1]);
                        return WinJS.Promise.timeout(1000);
                    }).done(() => {
                        LiveUnit.Assert.areEqual(4, numEventsReceived);
                        complete();
                    });
            }, 1000);
        }

        testXYFocusWithCustomKeyMappings(complete) {
            function doKeydown(targetElement: HTMLElement, keyCode: number, expNextEl: HTMLElement) {
                expectedKeyCode = keyCode;
                expectedNextElement = expNextEl;
                Helper.keydown(targetElement, keyCode);
            }

            var numEventsReceived = 0;
            var expectedKeyCode = -1;
            var expectedNextElement: HTMLElement;
            WinJS.UI.XYFocus.addEventListener("focuschanging", (e: WinJS.UI.XYFocus.XYFocusEvent) => {
                LiveUnit.Assert.areEqual(expectedKeyCode, e.detail.keyCode);
                LiveUnit.Assert.areEqual(expectedNextElement, e.detail.nextFocusElement);
                numEventsReceived++;
            });

            WinJS.UI.XYFocus.enableXYFocus();
            WinJS.UI.XYFocus.keyCodeMap["up"].push(WinJS.Utilities.Key.w);
            WinJS.UI.XYFocus.keyCodeMap["down"].push(WinJS.Utilities.Key.s);
            WinJS.UI.XYFocus.keyCodeMap["left"].push(WinJS.Utilities.Key.a);
            WinJS.UI.XYFocus.keyCodeMap["right"].push(WinJS.Utilities.Key.d);
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            doKeydown(layout[3], WinJS.Utilities.Key.w, layout[1]);
            waitForFocus(window, layout[1])
                .then(() => {
                    doKeydown(layout[1], WinJS.Utilities.Key.s, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], WinJS.Utilities.Key.a, layout[2]);
                    return waitForFocus(window, layout[2]);
                }).then(() => {
                    doKeydown(layout[2], WinJS.Utilities.Key.d, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).done(() => {
                    LiveUnit.Assert.areEqual(4, numEventsReceived);
                    complete();
                });
        }

        testFocusChangedEvent(complete) {
            WinJS.UI.XYFocus.enableXYFocus();
            WinJS.UI.XYFocus.addEventListener("focuschanged", (e: WinJS.UI.XYFocus.XYFocusEvent) => {
                LiveUnit.Assert.areEqual(layout[3], e.detail.previousFocusElement);
                LiveUnit.Assert.areEqual(layout[1], document.activeElement);
                LiveUnit.Assert.areEqual(WinJS.Utilities.Key.upArrow, e.detail.keyCode);
                complete();
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            Helper.keydown(layout[3], WinJS.Utilities.Key.upArrow);
        }

        testXYFocusInIFrame(complete) {
            /**
             *        1 2
             *      ???????
             *    8 ? 0 1 ? 3
             *    7 ? 2 3 ? 4
             *      ???????
             *        6 5
            **/

            var layout = [
                this.rootContainer,
                createAndAppendFocusableElement(125, 25, this.rootContainer, "1", "button", 50, 50),
                createAndAppendFocusableElement(200, 25, this.rootContainer, "2", "button", 50, 50),

                createAndAppendFocusableElement(300, 125, this.rootContainer, "3", "button", 50, 50),
                createAndAppendFocusableElement(300, 200, this.rootContainer, "4", "button", 50, 50),

                createAndAppendFocusableElement(200, 300, this.rootContainer, "5", "button", 50, 50),
                createAndAppendFocusableElement(125, 300, this.rootContainer, "6", "button", 50, 50),

                createAndAppendFocusableElement(25, 200, this.rootContainer, "7", "button", 50, 50),
                createAndAppendFocusableElement(25, 125, this.rootContainer, "8", "button", 50, 50),

            ];
            var iframeEl = <HTMLIFrameElement>createAndAppendFocusableElement(100, 100, this.rootContainer, null, "iframe", 175, 175);
            iframeEl.src = "XYFocusPage.html";
            var iframeWin = (<HTMLIFrameElement>iframeEl).contentWindow;
            var iframeLayout: Array<HTMLButtonElement>;

            window.addEventListener("message", function ready(e: MessageEvent) {
                // The first crossframe message indicates that the iframe has loaded.
                window.removeEventListener("message", ready);
                iframeLayout = <any>iframeWin.document.querySelectorAll("button");

                layout[1].focus();
                LiveUnit.Assert.areEqual(layout[1], document.activeElement);

                WinJS.UI.XYFocus._xyFocus("down");
                LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                waitForFocus(iframeWin, iframeLayout[0])
                    .then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("right");
                        return waitForFocus(iframeWin, iframeLayout[1]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("up");
                        return waitForFocus(window, layout[2]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("down");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[1]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("right");
                        return waitForFocus(window, layout[3]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("left");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[1]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("down");
                        return waitForFocus(iframeWin, iframeLayout[3]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("right");
                        return waitForFocus(window, layout[4]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("left");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[3]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("down");
                        return waitForFocus(window, layout[5]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("up");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[3]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("left");
                        return waitForFocus(iframeWin, iframeLayout[2]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("down");
                        return waitForFocus(window, layout[6]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("up");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[2]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("left");
                        return waitForFocus(window, layout[7]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("right");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[2]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("up");
                        return waitForFocus(iframeWin, iframeLayout[0]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("left");
                        return waitForFocus(window, layout[8]);
                    }).then(() => {
                        WinJS.UI.XYFocus._xyFocus("right");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[0]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.XYFocus._xyFocus("up");
                        return waitForFocus(window, layout[1]);
                    }).done(complete);
            });
        }
    }
}
LiveUnit.registerTestClass("WinJSTests.XYFocusTests");
