// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";

    var safeHTML = "<div data-win-control='MyControl'></div>";
    var safeHTMLAttributeName = "data-win-control";
    var safeHTMLAttributeValue = "MyControl";
    var unsafeHTML = "<div custom-attribute='value'></div>";
    var unsafeHTMLAttributeName = "custom-attribute";
    var unsafeHTMLAttributeValue = "value";

    function runTest(setter, setterArgs, testFunc) {
        var div = document.createElement("div");
        document.body.appendChild(div);
        try {
            var exception = false;
            try {
                setter.apply(this, [div].concat(setterArgs));
            } catch (e) {
                exception = true;
            }
            testFunc(exception, div);
        } finally {
            document.body.removeChild(div);
        }
    }

    // The OuterHTML tests demolish the DIV itself thus preventing us from easily testing the result.
    // So here we create a dummy DIV to be stomped.
    function createDivAndCallFunc(func) {
        return function (element, html) {
            var div = document.createElement("div");
            element.appendChild(div);
            func(div, html);
        }
    }

    export class SafeHTML {

        testSetInnerHTML() {
            runTest(WinJS.Utilities.setInnerHTML, [safeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(safeHTMLAttributeValue, div.firstChild.getAttribute(safeHTMLAttributeName));
            });

            runTest(WinJS.Utilities.setInnerHTML, [unsafeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isTrue(exceptionThrown);
            });
        }

        testSetInnerHTMLUnsafe() {
            runTest(WinJS.Utilities.setInnerHTMLUnsafe, [safeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(safeHTMLAttributeValue, div.firstChild.getAttribute(safeHTMLAttributeName));
            });

            runTest(WinJS.Utilities.setInnerHTMLUnsafe, [unsafeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(unsafeHTMLAttributeValue, div.firstChild.getAttribute(unsafeHTMLAttributeName));
            });
        }

        testSetOuterHTM() {
            runTest(createDivAndCallFunc(WinJS.Utilities.setOuterHTML), [safeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(safeHTMLAttributeValue, div.firstChild.getAttribute(safeHTMLAttributeName));
            });

            runTest(createDivAndCallFunc(WinJS.Utilities.setOuterHTML), [unsafeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isTrue(exceptionThrown);
            });
        }

        testSetOuterHTMLUnsafe() {
            runTest(createDivAndCallFunc(WinJS.Utilities.setOuterHTMLUnsafe), [safeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(safeHTMLAttributeValue, div.firstChild.getAttribute(safeHTMLAttributeName));
            });

            runTest(createDivAndCallFunc(WinJS.Utilities.setOuterHTMLUnsafe), [unsafeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(unsafeHTMLAttributeValue, div.firstChild.getAttribute(unsafeHTMLAttributeName));
            });
        }

        testInsertAdjacentHTML() {
            runTest(WinJS.Utilities.insertAdjacentHTML, ["afterBegin", safeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(safeHTMLAttributeValue, div.firstChild.getAttribute(safeHTMLAttributeName));
            });

            runTest(WinJS.Utilities.insertAdjacentHTML, ["afterBegin", unsafeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isTrue(exceptionThrown);
            });
        }

        testInsertAdjacentHTMLUnsafe() {
            runTest(WinJS.Utilities.insertAdjacentHTMLUnsafe, ["afterBegin", safeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(safeHTMLAttributeValue, div.firstChild.getAttribute(safeHTMLAttributeName));
            });

            runTest(WinJS.Utilities.insertAdjacentHTMLUnsafe, ["afterBegin", unsafeHTML], function (exceptionThrown, div) {
                LiveUnit.Assert.isFalse(exceptionThrown);
                LiveUnit.Assert.areEqual(unsafeHTMLAttributeValue, div.firstChild.getAttribute(unsafeHTMLAttributeName));
            });
        }
    };
}

if (window.msIsStaticHTML) {
    LiveUnit.registerTestClass("CorsicaTests.SafeHTML");
}