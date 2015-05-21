// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />

module CorsicaTests {
    var testElementId = "accent-test-element"
    var testElement: HTMLDivElement;
    var Accents = WinJS.UI._Accents;

    function getDynamicStyleElement() {
        return document.head.querySelector("#WinJSAccentsStyle");
    }

    export class AccentTests {
        setUp() {
            testElement = document.createElement("div");
            testElement.id = testElementId;
            document.body.appendChild(testElement);
        }

        tearDown() {
            document.body.parentElement.classList.remove("win-ui-light");
            testElement && testElement.parentElement && testElement.parentElement.removeChild(testElement);
            testElement = null;
            Accents._reset();
        }

        testCreateAccentRuleSimple(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);

            Accents.createAccentRule("#accent-test-element", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element") !== -1);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                complete();
            });
        }

        testCreateAccentRuleInverse(complete) {
            document.body.parentElement.classList.add("win-ui-light");

            var cs = getComputedStyle(testElement);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectRestInverse], cs.backgroundColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHoverInverse], cs.columnRuleColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectPressInverse], cs.outlineColor);

            Accents.createAccentRule("#accent-test-element", [
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "column-rule-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);

            Accents.createAccentRule("#accent-test-element", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectRestInverse], getComputedStyle(testElement).backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectHoverInverse], getComputedStyle(testElement).columnRuleColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectPressInverse], getComputedStyle(testElement).outlineColor);
                complete();
            });
        }

        testCreateAccentRuleInverseNoLeadingToken(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], getComputedStyle(testElement).color);

            Accents.createAccentRule("randomTag", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("randomTag") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf(".win-ui-light randomTag") !== -1);
                LiveUnit.Assert.isFalse(getDynamicStyleElement().textContent.indexOf(".win-ui-lightrandomTag") !== -1);

                complete();
            });
        }

        testCreateHoverSelectors(complete) {
            Accents.createAccentRule("#accent-test-element:hover", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("html.win-hoverable #accent-test-element:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("html.win-hoverable#accent-test-element:hover") !== -1);
                complete();
            });
        }

        testCreateHoverSelectorsNoLeadingToken(complete) {
            Accents.createAccentRule("randomTag:hover", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("randomTag:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("html.win-hoverable randomTag:hover") !== -1);
                LiveUnit.Assert.isFalse(getDynamicStyleElement().textContent.indexOf("html.win-hoverablerandomTag:hover") !== -1);
                complete();
            });
        }

        testCreateHoverSelectorNoHoverRule(complete) {
            Accents.createAccentRule("#accent-test-element:hover", [{ name: "color", value: Accents.ColorTypes.accent }], true);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element:hover") !== -1);
                LiveUnit.Assert.isFalse(getDynamicStyleElement().textContent.indexOf("html.win-hoverable #accent-test-element:hover") !== -1);
                LiveUnit.Assert.isFalse(getDynamicStyleElement().textContent.indexOf("html.win-hoverable#accent-test-element:hover") !== -1);
                complete();
            });
        }

        testMultipleSelectors(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);

            Accents.createAccentRule("#accent-test-element, #foo", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#foo") !== -1);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                complete();
            });
        }

        testMultipleSelectorsWithWhitespace(complete) {
            Accents.createAccentRule("   #accent-test-element     ,   #foo     ", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#foo") !== -1);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                complete();
            });
        }

        testMultipleSelectorsInverse(complete) {
            document.body.parentElement.classList.add("win-ui-light");

            var cs = getComputedStyle(testElement);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectRestInverse], cs.backgroundColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHoverInverse], cs.columnRuleColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectPressInverse], cs.outlineColor);

            Accents.createAccentRule("#accent-test-element, randomTag", [
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "column-rule-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);

            Accents.createAccentRule("randomTag, #accent-test-element", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("randomTag") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf(".win-ui-light #accent-test-element") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf(".win-ui-light#accent-test-element") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf(".win-ui-light randomTag") !== -1);
                LiveUnit.Assert.isFalse(getDynamicStyleElement().textContent.indexOf(".win-ui-lightrandomTag") !== -1);

                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectRestInverse], getComputedStyle(testElement).backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectHoverInverse], getComputedStyle(testElement).columnRuleColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectPressInverse], getComputedStyle(testElement).outlineColor);
                complete();
            });
        }

        testMultipleSelectorsWithHover(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);

            Accents.createAccentRule("#accent-test-element, #randomId:hover, randomTag2:hover", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#randomId:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("randomTag2:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("html.win-hoverable #randomId:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("html.win-hoverable#randomId:hover") !== -1);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("html.win-hoverable randomTag2:hover") !== -1);
                LiveUnit.Assert.isFalse(getDynamicStyleElement().textContent.indexOf("html.win-hoverablerandomTag2:hover") !== -1);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                complete();
            });
        }

        testMultiPropertyRule(complete) {
            var cs = getComputedStyle(testElement);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], cs.color);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectRest], cs.backgroundColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], cs.columnRuleColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectPress], cs.outlineColor);

            Accents.createAccentRule("#accent-test-element", [
                { name: "color", value: Accents.ColorTypes.accent },
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "column-rule-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);
            WinJS.Promise.timeout().done(() => {
                cs = getComputedStyle(testElement);
                LiveUnit.Assert.isTrue(getDynamicStyleElement().textContent.indexOf("#accent-test-element") !== -1);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], cs.color);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectRest], cs.backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectHover], cs.columnRuleColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectPress], cs.outlineColor);
                complete();
            });
        }
    }
}
    LiveUnit.registerTestClass("CorsicaTests.AccentTests");