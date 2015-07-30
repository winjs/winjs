// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

/// <deploy src="../TestData/" />

module WinJSTests {
    interface ListeningModeStateChangedEvent extends CustomEvent {
        label: string;
        state: string;
    }

    var ListeningModeStateChangedEventName = "ListeningStateChanged";
    var DisambiguationText = "Item One";

    function fireActiveMode(element: HTMLElement, label: string) {
        var e = <ListeningModeStateChangedEvent>document.createEvent("CustomEvent");
        e.initCustomEvent(ListeningModeStateChangedEventName, true, false, null);
        e.state = "active";
        e.label = label;
        element.dispatchEvent(e);
    }

    function fireDisambigMode(element: HTMLElement, label: string) {
        var e = <ListeningModeStateChangedEvent>document.createEvent("CustomEvent");
        e.initCustomEvent(ListeningModeStateChangedEventName, true, false, null);
        e.state = "disambiguation";
        e.label = label;
        element.dispatchEvent(e);
    }

    function fireInactiveMode(element: HTMLElement) {
        var e = <ListeningModeStateChangedEvent>document.createEvent("CustomEvent");
        e.initCustomEvent(ListeningModeStateChangedEventName, true, false, null);
        e.state = "inactive";
        e.label = null;
        element.dispatchEvent(e);
    }

    function simulateVuiStateChanges(
        element: HTMLElement,
        activeHandler: (e: ListeningModeStateChangedEvent) => any,
        disambigHandler: (e: ListeningModeStateChangedEvent) => any,
        inactiveHandler: (e: ListeningModeStateChangedEvent) => any,
        completeHandler?: Function) {

        function handler(e: ListeningModeStateChangedEvent) {
            if (e.target !== element) {
                return;
            }
            switch (e.state) {
                case "active":
                    activeHandler(e);
                    break;

                case "disambiguation":
                    disambigHandler(e);
                    break;

                case "inactive":
                    inactiveHandler(e);

                    break;
            }
        }

        document.addEventListener(ListeningModeStateChangedEventName, handler);
        var origText = element.textContent;
        var activeText = element.getAttribute("aria-label")

        // Inactive > Active > Inactive
        fireActiveMode(element, activeText);
        fireInactiveMode(element);

        // Inactive > Active > Disambiguation > Inactive
        fireActiveMode(element, activeText);
        fireDisambigMode(element, DisambiguationText);
        fireInactiveMode(element);

        // Inactive > Active > Disambiguation > Active > Inactive
        fireActiveMode(element, activeText);
        fireDisambigMode(element, DisambiguationText);
        fireActiveMode(element, activeText);
        fireInactiveMode(element);

        // Inactive > Active > Disambiguation > Active > Disambiguation > Inactive
        fireActiveMode(element, activeText);
        fireDisambigMode(element, DisambiguationText);
        fireActiveMode(element, activeText);
        fireDisambigMode(element, DisambiguationText);
        fireInactiveMode(element);

        document.removeEventListener(ListeningModeStateChangedEventName, handler);
        completeHandler && completeHandler();
    }

    export class VUITests {
        testContainer: HTMLElement;

        setUp() {
            this.testContainer = document.createElement("div");
            document.body.appendChild(this.testContainer);
        }

        tearDown() {
            this.testContainer.parentElement.removeChild(this.testContainer);
            this.testContainer = null;
        }

        testButton() {
            var inactiveText = "Inactive Text";
            var activeText = "Active Text";

            var button = document.createElement("button");
            button.textContent = inactiveText;
            button.setAttribute("aria-label", activeText);
            this.testContainer.appendChild(button);

            simulateVuiStateChanges(button,
                e => {
                    // Active
                    LiveUnit.Assert.isTrue(button.classList.contains("win-vui-active"));
                    LiveUnit.Assert.isFalse(button.classList.contains("win-vui-disambiguation"));
                    LiveUnit.Assert.areEqual(activeText, button.textContent);
                },
                e => {
                    // Disambig
                    LiveUnit.Assert.isTrue(button.classList.contains("win-vui-active"));
                    LiveUnit.Assert.isTrue(button.classList.contains("win-vui-disambiguation"));
                    LiveUnit.Assert.areEqual(DisambiguationText, button.textContent);
                },
                e => {
                    // Inactive
                    LiveUnit.Assert.isFalse(button.classList.contains("win-vui-active"));
                    LiveUnit.Assert.isFalse(button.classList.contains("win-vui-disambiguation"));
                    LiveUnit.Assert.areEqual(inactiveText, button.textContent);
                });
        }

        testButtonWithChildren() {
            var activeText = "Active Text";

            var button = document.createElement("button");
            button.setAttribute("aria-label", activeText);
            button.innerHTML = "A button <span>with</span> two <span>spans</span> in it";
            this.testContainer.appendChild(button);

            var span1 = button.children[0];
            var span2 = button.children[1];

            var inactiveText = button.textContent;

            simulateVuiStateChanges(button,
                e => {
                    // Active
                    LiveUnit.Assert.areEqual(activeText, button.textContent);
                },
                e => {
                    // Disambig
                    LiveUnit.Assert.areEqual(DisambiguationText, button.textContent);
                },
                e => {
                    // Inactive
                    LiveUnit.Assert.areEqual(inactiveText, button.textContent);
                    LiveUnit.Assert.areEqual(2, button.childElementCount);
                    LiveUnit.Assert.isTrue(button.children[0] === span1);
                    LiveUnit.Assert.isTrue(button.children[1] === span2);
                });
        }

        testButtonFreezesSize() {
            var activeText = "This text is so long it is going to make the button grow ridiculously!!";

            var button = document.createElement("button");
            button.textContent = "Hello World";
            button.setAttribute("aria-label", activeText);
            this.testContainer.appendChild(button);

            var origWidth = parseFloat(getComputedStyle(button).width);
            var origHeight = parseFloat(getComputedStyle(button).height);

            if ((origWidth | 0) !== button.offsetWidth) {
                // On IE11, getComputedStyle returns the wrong actual dimensions, skip test
                return;
            }

            simulateVuiStateChanges(button,
                e => {
                    // Active
                    var cs = getComputedStyle(button);
                    LiveUnit.Assert.areEqual(origWidth, parseFloat(cs.width));
                    LiveUnit.Assert.areEqual(origHeight, parseFloat(cs.height));
                },
                e => {
                    // Disambig
                    var cs = getComputedStyle(button);
                    LiveUnit.Assert.areEqual(origWidth, parseFloat(cs.width));
                    LiveUnit.Assert.areEqual(origHeight, parseFloat(cs.height));
                },
                e => {
                    // Inactive
                    var cs = getComputedStyle(button);
                    LiveUnit.Assert.areEqual(origWidth, parseFloat(cs.width));
                    LiveUnit.Assert.areEqual(origHeight, parseFloat(cs.height));
                });
        }
    }
}
LiveUnit.registerTestClass("WinJSTests.VUITests");
