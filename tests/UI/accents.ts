// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />

module CorsicaTests {
    var testElementId = "accent-test-element";
    var testElementId2 = "foo";
    var testElement: HTMLDivElement;
    var testElement2: HTMLDivElement;
    var Accents = WinJS.UI._Accents;

    function getDynamicStyleElement() {
        return document.head.querySelector("#WinJSAccentsStyle");
    }

    export class AccentTests {
        setUp() {
            testElement = document.createElement("div");
            testElement2 = document.createElement("div");
            testElement.id = testElementId;
            testElement2.id = testElementId;
            document.body.appendChild(testElement);
            document.body.appendChild(testElement2);
        }

        tearDown() {
            document.body.parentElement.classList.remove("win-ui-light");
            testElement && testElement.parentElement && testElement.parentElement.removeChild(testElement);
            testElement2 && testElement2.parentElement && testElement2.parentElement.removeChild(testElement2);
            testElement = testElement2 = null;
            Accents._reset();
        }

        testCreateAccentRuleSimple(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);

            Accents.createAccentRule("#accent-test-element", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                complete();
            });
        }

        testCreateAccentRuleInverse(complete) {
            document.body.parentElement.classList.add("win-ui-light");

            var cs = getComputedStyle(testElement);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectRestInverse], cs.backgroundColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], cs.columnRuleColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectPressInverse], cs.outlineColor);

            Accents.createAccentRule("#accent-test-element", [
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "column-rule-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);

            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectRestInverse], getComputedStyle(testElement).backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], getComputedStyle(testElement).columnRuleColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectPressInverse], getComputedStyle(testElement).outlineColor);
                complete();
            });
        }

        testCreateAccentRuleInverseNoLeadingToken(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], getComputedStyle(testElement).color);

            Accents.createAccentRule("randomTag", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "randomTag");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light randomTag");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, ".win-ui-lightrandomTag");
                complete();
            });
        }

        testCreateHoverSelectors(complete) {
            Accents.createAccentRule("#accent-test-element:hover", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable #accent-test-element:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable#accent-test-element:hover");
                complete();
            });
        }

        testCreateHoverSelectorsNoLeadingToken(complete) {
            Accents.createAccentRule("randomTag:hover", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "randomTag:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable randomTag:hover");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, "html.win-hoverablerandomTag:hover");
                complete();
            });
        }

        testCreateHoverSelectorNoHoverRule(complete) {
            Accents.createAccentRule("#accent-test-element:hover", [{ name: "color", value: Accents.ColorTypes.accent }], true);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element:hover");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, "html.win-hoverable #accent-test-element:hover");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, "html.win-hoverable#accent-test-element:hover");
                complete();
            });
        }

        testMultipleSelectors(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);

            Accents.createAccentRule("#accent-test-element, #foo", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#foo");
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement2).color);
                complete();
            });
        }

        testMultipleSelectorsWithWhitespace(complete) {
            Accents.createAccentRule("   #accent-test-element     ,   #foo     ", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#foo");
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement2).color);
                complete();
            });
        }

        testMultipleSelectorsInverse(complete) {
            document.body.parentElement.classList.add("win-ui-light");

            var cs = getComputedStyle(testElement);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectRestInverse], cs.backgroundColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], cs.columnRuleColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectPressInverse], cs.outlineColor);

            Accents.createAccentRule("randomTag, #accent-test-element", [
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "column-rule-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);

            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "randomTag");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light #accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light randomTag");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, ".win-ui-lightrandomTag");

                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectRestInverse], getComputedStyle(testElement).backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], getComputedStyle(testElement).columnRuleColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectPressInverse], getComputedStyle(testElement).outlineColor);
                complete();
            });
        }

        testMultipleSelectorsWithHover(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], getComputedStyle(testElement).color);

            Accents.createAccentRule("#accent-test-element, #randomId:hover, randomTag2:hover", [{ name: "color", value: Accents.ColorTypes.accent }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#randomId:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "randomTag2:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable #randomId:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable#randomId:hover");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable randomTag2:hover");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, "html.win-hoverablerandomTag2:hover");
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
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
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