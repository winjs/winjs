// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
/// <deploy src="../TestData/" />

module WinJSTests {
    var Keys = WinJS.Utilities.Key;

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

        testFindNextFocusElementWithUnfocusableReferenceElementAndInitialFocus() {
            var layout = [
                this.rootContainer,
                createAndAppendFocusableElement(50, 50, this.rootContainer, "1", "div", 150, 150),
                createAndAppendFocusableElement(200, 50, this.rootContainer, "2", "button", 150, 150),
            ];

            layout[1].setAttribute("tabIndex", "");
            layout[2].focus();

            var target = WinJS.UI.XYFocus.findNextFocusElement("right", { referenceElement: layout[1] });
            LiveUnit.Assert.areEqual(layout[2], target);
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
            WinJS.UI.XYFocus._xyFocus("left");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);

            WinJS.UI.XYFocus._xyFocus("down");
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            // Move focus right from 2, then left and we should end up at 2 again
            WinJS.UI.XYFocus._xyFocus("right");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            WinJS.UI.XYFocus._xyFocus("left");
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);
        }

        testXYFocusHistoryWithFractionalPixels() {
            /**
             *  ??????????????????????????????
             *  ?             ??             ?
             *  ?             ??      2      ?
             *  ?             ??             ?
             *  ?      1      ????????????????
             *  ?             ??             ?
             *  ?             ??      3      ?
             *  ?             ??             ?
             *  ??????????????????????????????
             *
             * Normally, if focus was on 3, left would resolve to 2 since 2 occupies a bigger portion of 3's shadow.
             * However, if focus initially was on 1, then was moved right to 3, then a following left should resolve to 1.
            **/

            var layout = [
                this.rootContainer,
                createAndAppendFocusableElement(50, 50.25, this.rootContainer, "1", "button", 428, 212),
                createAndAppendFocusableElement(480, 50.25, this.rootContainer, "2", "button", 104, 104),
                createAndAppendFocusableElement(480, 158.25, this.rootContainer, "3", "button", 104, 104)
            ];

            // Move focus left from 3 to 1
            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            WinJS.UI.XYFocus._xyFocus("left");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);

            // Move focus right from 1 should land us on 3 again
            WinJS.UI.XYFocus._xyFocus("right");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
        }

        testPreventXYFocusViaFocusChangingEvent() {
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

        testPreventXYFocusViaKeyDownPreventDefault() {
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var eventReceived = false;
            layout[3].addEventListener("keydown", e => {
                eventReceived = true;
                e.preventDefault()
            });

            Helper.keydown(layout[3], Keys.GamepadDPadUp);
            LiveUnit.Assert.isTrue(eventReceived);
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
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

        testXYFocusDefaultMappings(complete) {
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

            doKeydown(layout[3], Keys.GamepadLeftThumbstickUp, layout[1]);
            waitForFocus(window, layout[1])
                .then(() => {
                    doKeydown(layout[1], Keys.GamepadLeftThumbstickDown, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], Keys.GamepadLeftThumbstickLeft, layout[2]);
                    return waitForFocus(window, layout[2]);
                }).then(() => {
                    doKeydown(layout[2], Keys.GamepadLeftThumbstickRight, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], Keys.GamepadDPadUp, layout[1]);
                    return waitForFocus(window, layout[1]);
                }).then(() => {
                    doKeydown(layout[1], Keys.GamepadDPadDown, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], Keys.GamepadDPadLeft, layout[2]);
                    return waitForFocus(window, layout[2]);
                }).then(() => {
                    doKeydown(layout[2], Keys.GamepadDPadRight, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], Keys.NavigationUp, layout[1]);
                    return waitForFocus(window, layout[1]);
                }).then(() => {
                    doKeydown(layout[1], Keys.NavigationDown, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], Keys.NavigationLeft, layout[2]);
                    return waitForFocus(window, layout[2]);
                }).then(() => {
                    doKeydown(layout[2], Keys.NavigationRight, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).done(() => {
                    LiveUnit.Assert.areEqual(12, numEventsReceived);
                    complete();
                });
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

            WinJS.UI.XYFocus.keyCodeMap["up"].push(Keys.w);
            WinJS.UI.XYFocus.keyCodeMap["down"].push(Keys.s);
            WinJS.UI.XYFocus.keyCodeMap["left"].push(Keys.a);
            WinJS.UI.XYFocus.keyCodeMap["right"].push(Keys.d);
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            doKeydown(layout[3], Keys.w, layout[1]);
            waitForFocus(window, layout[1])
                .then(() => {
                    doKeydown(layout[1], Keys.s, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], Keys.a, layout[2]);
                    return waitForFocus(window, layout[2]);
                }).then(() => {
                    doKeydown(layout[2], Keys.d, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).done(() => {
                    LiveUnit.Assert.areEqual(4, numEventsReceived);
                    complete();
                });
        }

        testFocusChangedEvent(complete) {
            WinJS.UI.XYFocus.addEventListener("focuschanged", (e: WinJS.UI.XYFocus.XYFocusEvent) => {
                LiveUnit.Assert.areEqual(layout[3], e.detail.previousFocusElement);
                LiveUnit.Assert.areEqual(layout[1], document.activeElement);
                LiveUnit.Assert.areEqual(Keys.GamepadDPadUp, e.detail.keyCode);
                complete();
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            Helper.keydown(layout[3], Keys.GamepadDPadUp);
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

        testSuspended(complete) {
            var expectDefaultPrevented = true;
            var completeTest = false;
            document.addEventListener("keydown", function testSuspendedKeyDownHandler(e: KeyboardEvent) {
                LiveUnit.Assert.areEqual(expectDefaultPrevented, e.defaultPrevented);
                LiveUnit.Assert.areEqual(expectedActiveElement, document.activeElement);
                if (completeTest) {
                    document.removeEventListener("keydown", testSuspendedKeyDownHandler);
                    complete();
                }
            });

            var layout = createCrossLayout(this.rootContainer);
            layout[3].classList.add("win-xyfocus-suspended");

            layout[2].focus();
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            var expectedActiveElement = layout[3];
            Helper.keydown(document.activeElement, Keys.GamepadDPadRight);
            waitForFocus(window, layout[3]).done(() => {
                expectDefaultPrevented = false;
                completeTest = true;
                Helper.keydown(document.activeElement, Keys.GamepadDPadRight);
            });
        }

        testSuspendedContainer(complete) {
            document.addEventListener("keydown", function testSuspendedKeyDownHandler(e: KeyboardEvent) {
                LiveUnit.Assert.isFalse(e.defaultPrevented);
                LiveUnit.Assert.areEqual(expectedActiveElement, document.activeElement);
                document.removeEventListener("keydown", testSuspendedKeyDownHandler);
                complete();
            });

            var layout = createCrossLayout(this.rootContainer);
            layout[0].classList.add("win-xyfocus-suspended");

            layout[2].focus();
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);
            var expectedActiveElement = layout[2];
            Helper.keydown(document.activeElement, Keys.GamepadDPadRight);
        }

        testSuspendedToggleMode(complete) {
            var completeTest = false;
            document.addEventListener("keydown", function testSuspendedKeyDownHandler(e: KeyboardEvent) {
                LiveUnit.Assert.isFalse(e.defaultPrevented);
                LiveUnit.Assert.isFalse(layout[2].classList.contains("win-xyfocus-togglemode-active"));
                if (completeTest) {
                    document.removeEventListener("keydown", testSuspendedKeyDownHandler);
                    complete();
                }
            });

            var layout = createCrossLayout(this.rootContainer);
            layout[2].classList.add("win-xyfocus-togglemode");
            layout[2].focus();
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            // Assert that a suspended toggle mode element does not toggle
            layout[2].classList.add("win-xyfocus-suspended");
            Helper.keydown(document.activeElement, Keys.GamepadA);

            // Assert that a toggle mode element in a suspended container does not toggle
            layout[2].classList.remove("win-xyfocus-suspended");
            layout[0].classList.add("win-xyfocus-suspended");
            completeTest = true;
            Helper.keydown(document.activeElement, Keys.GamepadA);
        }

        testToggleMode(complete) {
            var expectDefaultPrevented = true;
            var completeTest = false;
            var callbackSignal: WinJS._Signal<void> = null;
            document.addEventListener("keydown", function testToggleModeKeyDownHandler(e: KeyboardEvent) {
                LiveUnit.Assert.areEqual(expectDefaultPrevented, e.defaultPrevented);
                callbackSignal && callbackSignal.complete();
                if (completeTest) {
                    document.removeEventListener("keydown", testToggleModeKeyDownHandler);
                    complete();
                }
            });

            var layout = createCrossLayout(this.rootContainer);
            layout[3].classList.add("win-xyfocus-togglemode");

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            Helper.keydown(document.activeElement, Keys.GamepadDPadRight);
            waitForFocus(window, layout[4])
                .then(() => {
                    Helper.keydown(document.activeElement, Keys.GamepadDPadLeft);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    callbackSignal = new WinJS._Signal<void>();
                    Helper.keydown(document.activeElement, Keys.GamepadA);
                    return callbackSignal.promise;
                }).then(() => {
                    LiveUnit.Assert.isTrue(layout[3].classList.contains("win-xyfocus-togglemode-active"));
                    expectDefaultPrevented = false;
                    callbackSignal = new WinJS._Signal<void>();
                    Helper.keydown(document.activeElement, Keys.GamepadDPadRight);
                    return callbackSignal.promise;
                }).then(() => {
                    expectDefaultPrevented = true;
                    callbackSignal = new WinJS._Signal<void>();
                    Helper.keydown(document.activeElement, Keys.GamepadB);
                    return callbackSignal.promise;
                }).done(() => {
                    completeTest = true;
                    callbackSignal = null;
                    LiveUnit.Assert.isFalse(layout[3].classList.contains("win-xyfocus-togglemode-active"));
                    Helper.keydown(document.activeElement, Keys.GamepadDPadRight);
                });
        }

        testIFrameRemovalUnregistersWithXYFocus(complete) {
            var iframeEl = <HTMLIFrameElement>createAndAppendFocusableElement(100, 100, this.rootContainer, null, "iframe", 200, 200);
            iframeEl.src = "XYFocusPage.html";
            var that = this;
            window.addEventListener("message", function windowMessage(e: MessageEvent) {
                if (e.data["msWinJSXYFocusControlMessage"] && e.data["msWinJSXYFocusControlMessage"].type === "register") {
                    var origCount = WinJS.UI.XYFocus._iframeHelper.count();
                    window.removeEventListener("message", windowMessage);
                    iframeEl.contentWindow.addEventListener("unload", () => {
                        LiveUnit.Assert.areEqual(origCount - 1, WinJS.UI.XYFocus._iframeHelper.count());
                        complete();
                    });
                    iframeEl.parentElement.removeChild(iframeEl);
                }
            });
        }

        testXYFocusWorksWithElementsThatSpanTheCurrentViewport(complete) {
            var layout: HTMLElement[] = [
                this.rootContainer,
                <HTMLIFrameElement>createAndAppendFocusableElement(100, 100, this.rootContainer, null, "button", 200, 200),
                <HTMLIFrameElement>createAndAppendFocusableElement(300, -100, this.rootContainer, null, "button", 200, 100000)
            ];
            layout[1].focus();
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);

            Helper.keydown(layout[1], Keys.GamepadDPadRight);
            waitForFocus(window, layout[2]).done(complete);
        }

        testXYFocusWithNoActiveElementDoesNotCauseExceptions() {
            var body = document.body;
            document.body.parentElement.removeChild(body);
            Helper.keydown(document.documentElement, Keys.GamepadDPadUp);
            document.documentElement.appendChild(body);
        }

        testIFrameWithFocusableBody(complete) {
            /*
                [BUTTON] [IFRAME] [BUTTON]
            */

            var leftButton = createAndAppendFocusableElement(0, 0, this.rootContainer, null, "button", 200, 200);

            var iframeEl = <HTMLIFrameElement>createAndAppendFocusableElement(210, 0, this.rootContainer, null, "iframe", 200, 200);
            iframeEl.src = "BlankXYFocusPageWithFocusableBody.html";
            var iframeWin = (<HTMLIFrameElement>iframeEl).contentWindow;

            var rightButton = createAndAppendFocusableElement(420, 0, this.rootContainer, null, "button", 200, 200);

            window.addEventListener("message", function ready(e: MessageEvent) {
                // The first crossframe message indicates that the iframe has loaded.
                window.removeEventListener("message", ready);

                leftButton.focus();
                LiveUnit.Assert.areEqual(leftButton, document.activeElement);

                WinJS.UI.XYFocus._xyFocus("right");
                LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                WinJS.Promise.timeout(500).then(function () {
                    LiveUnit.Assert.areEqual(iframeEl, document.activeElement, "Focus should not be automatically exiting the iframe");
                    iframeWin["WinJS"].UI.XYFocus._xyFocus("right");
                    return waitForFocus(window, rightButton);
                }).done(complete);
            });
        }

        testIFrameWithUnfocusableBody(complete) {
            /*
                [BUTTON] [IFRAME] [BUTTON]
            */

            var leftButton = createAndAppendFocusableElement(0, 0, this.rootContainer, null, "button", 200, 200);

            var iframeEl = <HTMLIFrameElement>createAndAppendFocusableElement(210, 0, this.rootContainer, null, "iframe", 200, 200);
            iframeEl.src = "BlankXYFocusPageWithFocusableBody.html";
            var iframeWin = (<HTMLIFrameElement>iframeEl).contentWindow;

            var rightButton = createAndAppendFocusableElement(420, 0, this.rootContainer, null, "button", 200, 200);

            window.addEventListener("message", function ready(e: MessageEvent) {
                // The first crossframe message indicates that the iframe has loaded.
                window.removeEventListener("message", ready);

                // Make the body inside the iframe unfocusable
                iframeWin.document.body.tabIndex = -1;

                leftButton.focus();
                LiveUnit.Assert.areEqual(leftButton, document.activeElement);

                // Going right from the left button should focus the iframe but the iframe should immediately
                // signal back a dFocusExit to the right which gets us to the expected right button.
                WinJS.UI.XYFocus._xyFocus("right");
                LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                waitForFocus(window, rightButton).done(complete);
            });
        }
    }
    
    var disabledTestRegistry = {
        testIFrameRemovalUnregistersWithXYFocus: [
            Helper.Browsers.safari,
            Helper.Browsers.chrome,
            Helper.Browsers.android
        ],
        testXYFocusHistory: [
            Helper.Browsers.chrome,
            Helper.Browsers.android
        ]
    };
    Helper.disableTests(XYFocusTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("WinJSTests.XYFocusTests");
