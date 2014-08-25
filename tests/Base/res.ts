// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />


module WinJSTests {

    "use strict";

    var strings = {
        simpleResource: { value: "hello" },
        simpleResourceLang: { value: "hello", lang: "en-us" },
        color: { value: "red" },
        colorLang: { value: "red", lang: "jp" },
        nestedResource: { value: "<div id='one' data-win-res='{textContent:\"simpleResource\"}'></div>" },
        nestedResourceLang: { value: "<div id='one' data-win-res='{textContent:\"simpleResourceLang\"}'></div>" },
        nestedResourceTopLang: { value: "<div id='one' data-win-res='{textContent:\"simpleResource\"}'></div>", lang: "fr" },
        nestedResourceConflictLang: { value: "<div id='one' data-win-res='{textContent:\"simpleResourceLang\"}'></div>", lang: "fr" }
    };

    function withCustomGet(f) {
        var old = WinJS.Resources.getString;
        try {
            WinJS.Resources.getString = function (resourceId) {
                return strings[resourceId] || { value: resourceId, empty: true };
            };

            f();
        }
        finally {
            WinJS.Resources.getString = old;
        }
    }

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    export class DeclResources {

        testSimple() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{textContent:\"simpleResource\"}'></div>");

                WinJS.Resources.processAll(d);

                var child = d.querySelector("#one");
                LiveUnit.Assert.areEqual("hello", child.textContent);
            });
        }

        testValidationMissingResource(complete) {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{textContent:\"invalidResource\"}'></div>");

                var old = WinJS.validation;
                WinJS.validation = true;
                WinJS.Resources.processAll(d)
                    .then(
                    function success() {
                        LiveUnit.Assert.fail("processAll should throw");
                    },
                    function error(e) {
                        // @TODO, can't do this check b/c we are overriding custom lookup so we don't find the format string for the error message ;)
                        //
                        //LiveUnit.Assert.isTrue(e.indexOf("invalidResource") !== -1, "should have the name of the missing resource");
                    }
                    )
                    .then(null, errorHandler)
                    .then(function () {
                        WinJS.validation = old;
                    })
                    .then(complete);
            });
        }

        testSimpleLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{textContent:\"simpleResourceLang\"}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");

                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("en-us", child.lang);
            });
        }

        // UNDONE: blocked by WIN8:425876
       testAttributeLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{attributes:{\"aria-label\":\"simpleResourceLang\"}}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");

                LiveUnit.Assert.areEqual("hello", child.getAttribute("aria-label"));
                LiveUnit.Assert.areEqual("en-us", child.lang);
            });
        }
        testAttributeLang2() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{attributes:{arialabel:\"simpleResourceLang\"}}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");

                LiveUnit.Assert.areEqual("hello", child.getAttribute("arialabel"));
                LiveUnit.Assert.areEqual("en-us", child.lang);
            });
        }
        testDotted() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{textContent:\"simpleResource\", style: { backgroundColor: \"color\" }}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("red", child.style.backgroundColor);
            });
        }

        testDottedLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{textContent:\"simpleResource\", style: { backgroundColor: \"colorLang\" }}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("jp", child.lang);
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("red", child.style.backgroundColor);
            });
        }

        testDottedConflictLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{textContent:\"simpleResourceLang\", style: { backgroundColor: \"colorLang\" }}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("jp", child.lang); // last lang wins, declaration order
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("red", child.style.backgroundColor);
            });
        }

        testDottedConflictLangRev() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='one' data-win-res='{ style: { backgroundColor: \"colorLang\" }, textContent:\"simpleResourceLang\" }'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("en-us", child.lang); // last lang wins, declaration order
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("red", child.style.backgroundColor);
            });
        }

        testNested() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='two' data-win-res='{innerHTML:\"nestedResource\"}'></div>");

                WinJS.Resources.processAll(d);

                var child = d.querySelector("#one");
                LiveUnit.Assert.areEqual("hello", child.textContent);
            });
        }

        testNestedLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='two' data-win-res='{innerHTML:\"nestedResourceLang\"}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("en-us", child.lang);
            });
        }

        testNestedTopLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='two' data-win-res='{innerHTML:\"nestedResourceTopLang\"}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("", child.lang);

                var top = <HTMLElement>d.querySelector("#two");
                LiveUnit.Assert.areEqual("fr", top.lang);

            });
        }

        testNestedConflictLang() {
            withCustomGet(function () {
                var d = document.createElement("div");
                WinJS.Utilities.setInnerHTMLUnsafe(d, "<div id='two' data-win-res='{innerHTML:\"nestedResourceConflictLang\"}'></div>");

                WinJS.Resources.processAll(d);

                var child = <HTMLElement>d.querySelector("#one");
                LiveUnit.Assert.areEqual("hello", child.textContent);
                LiveUnit.Assert.areEqual("en-us", child.lang);

                var top = <HTMLElement>d.querySelector("#two");
                LiveUnit.Assert.areEqual("fr", top.lang);

            });
        }

        testEvents() {
            withCustomGet(function () {
                var value = 0;
                var scaleValue = 1;
                var langValue = "EN-US";

                WinJS.Resources.addEventListener("contextchanged", function (e) {
                    if (e.detail.qualifier === "Scale") {
                        scaleValue = e.detail.changed;
                    }
                }, false);

                WinJS.Resources.addEventListener("contextchanged", function (e) {
                    if (e.detail.qualifier === "Language") {
                        langValue = e.detail.changed;
                    }
                }, false);

                WinJS.Resources.addEventListener("changed", function () {
                    value++;
                }, false);

                WinJS.Resources.dispatchEvent('contextchanged', { qualifier: "Scale", changed: 3 });
                LiveUnit.Assert.areEqual(scaleValue, 3);

                WinJS.Resources.dispatchEvent('contextchanged', { qualifier: "Language", changed: "JA-JP" });
                LiveUnit.Assert.areEqual(langValue, "JA-JP");

                WinJS.Resources.dispatchEvent('changed', {});
                LiveUnit.Assert.areEqual(value, 1);
            });
        }

    }

}
LiveUnit.registerTestClass("WinJSTests.DeclResources");