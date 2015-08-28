// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/Helper.ts" />

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
            Accents._reset();
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
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], cs.borderBottomColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectPressInverse], cs.outlineColor);

            Accents.createAccentRule("#accent-test-element", [
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "border-bottom-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);

            WinJS.Promise.timeout().done(() => {
                var expectedlistSelectPressInverseColor = Accents._colors[Accents.ColorTypes._listSelectPressInverse];

                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectRestInverse], getComputedStyle(testElement).backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], getComputedStyle(testElement).borderBottomColor);

                // Some browsers end up computing 'rgba(x,x,x,0.7)' to 'rgba(x,x,x,0.70196)' so we have to change the assertion
                LiveUnit.Assert.stringContains(getComputedStyle(testElement).outlineColor, (expectedlistSelectPressInverseColor.substr(0, expectedlistSelectPressInverseColor.length - 2)));
                complete();
            });
        }

        testCreateAccentRuleInverseHover(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], getComputedStyle(testElement).color);

            Accents.createAccentRule("html.win-hoverable #accent-test-element", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable #accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable .win-ui-light #accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable .win-ui-light#accent-test-element");
                complete();
            });
        }

        testCreateAccentRuleInverseHoverNoLeadingToken(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], getComputedStyle(testElement).color);

            Accents.createAccentRule("html.win-hoverable randomTag", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable randomTag");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable .win-ui-light randomTag");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, "html.win-hoverable .win-ui-lightrandomTag");
                complete();
            });
        }

        testCreateAccentRuleInverseHoverWithWhitespace(complete) {
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], getComputedStyle(testElement).color);

            Accents.createAccentRule("  html.win-hoverable   #accent-test-element    ", [{ name: "color", value: Accents.ColorTypes.listSelectHover }]);
            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable #accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable .win-ui-light #accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "html.win-hoverable .win-ui-light#accent-test-element");
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
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], cs.borderBottomColor);

            Accents.createAccentRule("randomTag, #accent-test-element", [
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "border-bottom-color", value: Accents.ColorTypes.listSelectHover },
            ]);

            WinJS.Promise.timeout().done(() => {
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "randomTag");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light #accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light#accent-test-element");
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, ".win-ui-light randomTag");
                LiveUnit.Assert.stringDoesNotContain(getDynamicStyleElement().textContent, ".win-ui-lightrandomTag");

                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectRestInverse], getComputedStyle(testElement).backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes._listSelectHoverInverse], getComputedStyle(testElement).borderBottomColor);
                complete();
            });
        }

        testMultiPropertyRule(complete) {
            var cs = getComputedStyle(testElement);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.accent], cs.color);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectRest], cs.backgroundColor);
            LiveUnit.Assert.areNotEqual(Accents._colors[Accents.ColorTypes.listSelectHover], cs.borderBottomColor);

            Accents.createAccentRule("#accent-test-element", [
                { name: "color", value: Accents.ColorTypes.accent },
                { name: "background-color", value: Accents.ColorTypes.listSelectRest },
                { name: "border-bottom-color", value: Accents.ColorTypes.listSelectHover },
                { name: "outline-color", value: Accents.ColorTypes.listSelectPress },
            ]);
            WinJS.Promise.timeout().done(() => {
                var expectedlistSelectPressColor = Accents._colors[Accents.ColorTypes.listSelectPress];
                cs = getComputedStyle(testElement);
                LiveUnit.Assert.stringContains(getDynamicStyleElement().textContent, "#accent-test-element");
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.accent], cs.color);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectRest], cs.backgroundColor);
                LiveUnit.Assert.areEqual(Accents._colors[Accents.ColorTypes.listSelectHover], cs.borderBottomColor);

                // Some browsers end up computing 'rgba(x,x,x,0.9)' to 'rgba(x,x,x,0.90196)' so we have to change the assertion
                LiveUnit.Assert.stringContains(getComputedStyle(testElement).outlineColor, (expectedlistSelectPressColor.substr(0, expectedlistSelectPressColor.length - 2)));
                complete();
            });
        }
        
        verifyThemeDetection(args: {
            iframeSrc: string;
            verify(iframeWinJS: typeof WinJS): void;
            complete(): void;
        }) {
            var iframe = document.createElement("iframe");
            iframe.src = args.iframeSrc;
            iframe.width = "500";
            iframe.height = "500";
            iframe.onload = function () {
                var iframeGlobal = iframe.contentWindow;
                var iframeWinJS = <typeof WinJS>(<any>iframe.contentWindow).WinJS;
                args.verify(iframeWinJS);
                args.complete();
            };
            testElement.appendChild(iframe);
        }
        
        testThemeDetectionUiDark(complete) {
            this.verifyThemeDetection({
                iframeSrc: "$(TESTDATA)/WinJSSandbox.html",
                verify: (iframeWinJS) => {
                    LiveUnit.Assert.isTrue(iframeWinJS.UI._Accents._isDarkTheme,
                        "Accent color system should have detected the dark stylesheet theme");
                },
                complete: complete
            });
        }
        
        testThemeDetectionUiLight(complete) {
            this.verifyThemeDetection({
                iframeSrc: "$(TESTDATA)/WinJSSandboxLight.html",
                verify: (iframeWinJS) => {
                    LiveUnit.Assert.isFalse(iframeWinJS.UI._Accents._isDarkTheme,
                        "Accent color system should have detected the light stylesheet theme");
                },
                complete: complete
            });
        }

        testAccentsInDisplayNoneIFrameDoesNotCrash(complete) {
            var iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = "$(TESTDATA)/WinJSSandbox.html";
            document.body.appendChild(iframe);
            iframe.contentWindow.onerror = () => {
                LiveUnit.Assert.fail("Exception in loading WinJS in a display:none iframe");
            };
            iframe.onload = complete;
        }
    }
    
    var disabledTestRegistry = {
        testCreateAccentRuleSimple: Helper.Browsers.android,
        testCreateAccentRuleInverseHover: Helper.Browsers.android,
        testCreateAccentRuleInverseHoverWithWhitespace: Helper.Browsers.android,
		testCreateAccentRuleInverse: Helper.Browsers.android
    };
    Helper.disableTests(AccentTests, disabledTestRegistry);
}
    LiveUnit.registerTestClass("CorsicaTests.AccentTests");