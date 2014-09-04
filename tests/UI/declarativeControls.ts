// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />


module CorsicaTests {

    "use strict";

    var DeclTest = function (element, options) {
        return options;
    };
    (<any>DeclTest).supportedForProcessing = true;
    window["DeclTest"] = DeclTest;

    var AsyncDeclTest = function (element, options, complete) {
        setTimeout(complete, 32);
        return options;
    };
    (<any>AsyncDeclTest).supportedForProcessing = true;
    window["AsyncDeclTest"] = AsyncDeclTest;

    var leafCount = 0;
    var containerCount = 0;
    var ContainerTestLeaf = function (element, options) {
        leafCount++;
    };
    (<any>ContainerTestLeaf).supportedForProcessing = true;
    window["ContainerTestLeaf"] = ContainerTestLeaf;
    var ContainerTestContainer = function (element, options) {
        containerCount++;
    };
    (<any>ContainerTestContainer).isDeclarativeControlContainer = true;
    (<any>ContainerTestContainer).supportedForProcessing = true;
    window["ContainerTestContainer"] = ContainerTestContainer;

    var SupportedForProcessingControl = function (element, options) {
        element.winControl = this;
        WinJS.UI.setOptions(this, options);
    };
    (<any>SupportedForProcessingControl).supportedForProcessing = true;
    window["SupportedForProcessingControl"] = SupportedForProcessingControl;

    var NotSupportedForProcessingControl = function (element, options) {
        element.winControl = this;
        WinJS.UI.setOptions(this, options);
    };
    window["NotSupportedForProcessingControl"] = NotSupportedForProcessingControl;

    // Define a property on window with a long unicode string
    window["\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123"] = "data";

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail("There was an unhandled error in your test: " + msg);
        } catch (ex) { }
    }

    export class DeclarativeControls {



        testSetControl() {
            var control = {};
            var element = document.createElement("div");
            element.winControl = control;
            LiveUnit.Assert.isTrue(control === element.winControl);
        }

        testContainers() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='ContainerTestContainer'><div data-win-control='ContainerTestLeaf'></div></div>";
            leafCount = 0;
            containerCount = 0;
            WinJS.UI.processAll(holder);
            LiveUnit.Assert.areEqual(1, containerCount);
            LiveUnit.Assert.areEqual(0, leafCount);
            WinJS.UI.processAll(holder);
            LiveUnit.Assert.areEqual(1, containerCount);
            LiveUnit.Assert.areEqual(0, leafCount);
            WinJS.UI.processAll(<Element>holder.firstChild.firstChild);
            LiveUnit.Assert.areEqual(1, containerCount);
            LiveUnit.Assert.areEqual(1, leafCount);
        }

        testBasicDeclaration() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div>";
            WinJS.UI.process(<Element>holder.firstChild);
            var control = (<HTMLElement>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(123, control.test);
        }

        testBasicDeclarationWhitespace() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='  DeclTest  ' data-win-options='{test:123}'></div>";
            WinJS.UI.process(<Element>holder.firstChild);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(123, control.test);
        }

        testBasicAsyncDeclaration(complete) {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("AsyncDeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("AsyncDeclTest")(5, 5, function () { }), 5);

            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='AsyncDeclTest' data-win-options='{test:123}'></div>";
            WinJS.UI.process(<Element>holder.firstChild).then(function (control) {
                LiveUnit.Assert.areEqual(123, control.test);
                complete();
            });
        }

        testCallbackBasicDeclaration() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div>";

            var callbackCount = 0;
            var callback = function () {
                callbackCount++;
            };

            WinJS.UI.process(<Element>holder.firstChild).then(callback);
            LiveUnit.Assert.areEqual(1, callbackCount);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(123, control.test);
        }

        testCallbackForElementWithoutControl() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var element = document.createElement("div");

            var callbackCount = 0;
            var callback = function () {
                callbackCount++;
            };

            WinJS.UI.process(element).then(callback);
            LiveUnit.Assert.areEqual(1, callbackCount);
        }

        testCallbackBasicDeclarationWithProcessAllOnRootWithControl() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div>";

            var callbackCount = 0;
            var callback = function () {
                callbackCount++;
            };

            WinJS.UI.processAll(<Element>holder.firstChild).then(callback);
            LiveUnit.Assert.areEqual(1, callbackCount);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(123, control.test);
        }

        testCallbackBasicDeclarationWithProcessAll() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div><div data-win-control='DeclTest' data-win-options='{test:134}'></div>";

            var callbackCount = 0;
            var callback = function () {
                callbackCount++;
            };

            WinJS.UI.processAll(holder).then(callback);
            LiveUnit.Assert.areEqual(1, callbackCount);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(123, control.test);
            control = (<Element>holder.lastChild).winControl;
            LiveUnit.Assert.areEqual(134, control.test);
        }

        testCallbackBasicDeclarationWithProcessAllWithoutControls() {
            LiveUnit.Assert.isTrue(WinJS.Utilities.getMember("DeclTest"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember("DeclTest")(5, 5), 5);

            var holder = document.createElement("div");

            var callbackCount = 0;
            var callback = function () {
                callbackCount++;
            };

            WinJS.UI.processAll(holder).then(callback);
            LiveUnit.Assert.areEqual(1, callbackCount);
        }

        testInvalidDeclaration() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='NotDeclTest' data-win-options='{test:123}'></div>";
            var hadException = false;
            var control;
            WinJS.UI.process(<Element>holder.firstChild).then(
                function (c) { control = c; },
                function (e) {
                    LiveUnit.Assert.areEqual("Invalid data-win-control attribute", e);
                    hadException = true;
                });

            LiveUnit.Assert.isFalse(hadException);
            LiveUnit.Assert.areEqual(undefined, control);
        }

        testProcessAll() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(123, control.test);
        }

        testOptions1() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test1:\"blah blah blah\", test2:-55.22}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual("blah blah blah", control.test1);
            LiveUnit.Assert.areEqual(-55.22, control.test2);
        }

        testOptions2() {
            var holder = document.createElement("div");

            window['blahblah'] = "Testing...";

            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test1:blahblah, test2:true, test3: false}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual("Testing...", control.test1);
            LiveUnit.Assert.areEqual(true, control.test2);
            LiveUnit.Assert.areEqual(false, control.test3);

            delete window['blahblah'];
        }

        testOptions3() {
            var holder = document.createElement("div");

            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{\"test1 with spaces\":-42, \"test2 with spaces\":+53.6, \"test3 with spaces\": +.55}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(-42, control["test1 with spaces"]);
            LiveUnit.Assert.areEqual(53.6, control["test2 with spaces"]);
            LiveUnit.Assert.areEqual(0.55, control["test3 with spaces"]);
        }

        testOptions4() {
            var holder = document.createElement("div");

            window['testOptions4Function'] = function () { };

            // used in this test
            WinJS.Utilities.markSupportedForProcessing(window['testOptions4Function']);

            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test1:+55, test2:null, test3: testOptions4Function}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(55, control.test1);
            LiveUnit.Assert.areEqual(null, control.test2);
            LiveUnit.Assert.areEqual(window['testOptions4Function'], control.test3);
            delete window['testOptions4Function'];
        }

        testOptions5() {
            var holder = document.createElement("div");
            window['blahblah'] = "Testing...";

            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options=\"{ test1: blahblah, test3: 'false' }\"></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual("Testing...", control.test1);
            LiveUnit.Assert.areEqual("false", control.test3);

            delete window['blahblah'];
        }

        testOptions6() {
            var holder = document.createElement("div");
            window['blahblah'] = { a: 20, b: { c: 30, d: 40 } };


            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options=\"{ test1: blahblah, test2: blahblah.a, test3: blahblah.b.c, test4: blahblah.b.d }\"></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(window['blahblah'], control.test1);
            LiveUnit.Assert.areEqual(20, control.test2);
            LiveUnit.Assert.areEqual(30, control.test3);
            LiveUnit.Assert.areEqual(40, control.test4);


            delete window['blahblah'];
        }


        testOptions8() {
            var holder = document.createElement("div");

            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options=\"{ test1:function() { alert('foo'); } }\"></div>";
            var hitCatch = false;
            WinJS.UI.processAll(holder).then(null, function () { hitCatch = true; });
            LiveUnit.Assert.isTrue(hitCatch);
        }

        testManyControls() {
            var holder = document.createElement("div");
            var control;

            for (var i = 0; i < 1000; i++) {
                control = document.createElement("div");
                control.setAttribute("data-win-control", "DeclTest");
                control.setAttribute("data-win-options", "{test:" + i + "}");
                holder.appendChild(control);
            }
            WinJS.UI.processAll(holder);
            for (i = 0; i < 1000; i++) {
                control = holder.children[i].winControl;
                LiveUnit.Assert.areEqual(i, control.test);
            }

        }

        // Test an options with value/property of a long unicode string
        testLocalizedOptions1() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test1:\"\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123\", \u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123:-55.22}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual("\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123", control.test1);
            LiveUnit.Assert.areEqual(-55.22, control["\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123"], "Can't name option property something localized");
        }

        testLocalizedOptions2() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test1:\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123, test2: \u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123}'></div>";
            WinJS.UI.processAll(holder);
            var control = (<Element>holder.firstChild).winControl;
            LiveUnit.Assert.areEqual(window["\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123"], control.test1);
            LiveUnit.Assert.areEqual(window["\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123"], control.test2);
        }

        testControlDocumentFragment(complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div>";

            WinJS.UI.Fragments.clearCache(holder);
            var frag = document.createElement("div");
            WinJS.UI.Fragments.renderCopy(holder).then(function (docfrag) {
                frag.appendChild(docfrag);
                WinJS.UI.Fragments.clearCache(holder);

                var docFrag = document.createDocumentFragment();
                docFrag.appendChild(frag);

                WinJS.UI.processAll(<any>docFrag);
                var control = (<Element>docFrag.firstChild.firstChild).winControl;
                LiveUnit.Assert.areEqual(123, control.test);
                complete();
            });
        }

        testControlFragment(complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{test:123}'></div>";

            WinJS.UI.Fragments.clearCache(holder);
            var frag = document.createElement("div");
            WinJS.UI.Fragments.renderCopy(holder).then(function (docfrag) {
                frag.appendChild(docfrag);
                WinJS.UI.Fragments.clearCache(holder);

                WinJS.UI.process(<Element>frag.firstChild);
                var control = (<Element>frag.firstChild).winControl;
                LiveUnit.Assert.areEqual(123, control.test);
                complete();
            });
        }


        testOptionQueryExpressionBasicNotFoundElement(complete) {

            var holder = document.createElement("div");
            document.body.appendChild(holder);

            try {
                holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{a: select(\".test\")}'></div>";
                WinJS.UI.processAll(holder);
                var control = (<Element>holder.firstChild).winControl;
                LiveUnit.Assert.areEqual(null, control.a);
            }
            finally {
                WinJS.Utilities.disposeSubTree(holder);
                document.body.removeChild(holder);
                complete();
            }
        }

        testOptionQueryExpressionBasicFindElementById_LookupFromRoot_AtRootScope(complete) {

            var testElement = document.createElement("div");
            testElement.id = "test";
            testElement.className = "root";
            var holder = document.createElement("div");
            document.body.appendChild(testElement);
            document.body.appendChild(holder);

            try {
                holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{a: select(\"#test\")}'></div>";
                WinJS.UI.processAll(holder);
                var control = (<Element>holder.firstChild).winControl;
                LiveUnit.Assert.areEqual("DIV", control.a.tagName);
                LiveUnit.Assert.areEqual("test", control.a.id);
                LiveUnit.Assert.areEqual("root", control.a.className);
            }
            finally {
                WinJS.Utilities.disposeSubTree(holder);
                WinJS.Utilities.disposeSubTree(testElement);
                document.body.removeChild(testElement);
                document.body.removeChild(holder);
                complete();
            }


        }

        testOptionQueryExpressionBasicFindElementById_LookupFromRoot_AtCurrentScope(complete) {

            var holder = document.createElement("div");
            document.body.appendChild(holder);
            try {
                holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{a: select(\"#test\")}'></div>";
                var currentTestElement = document.createElement("div");
                currentTestElement.id = "test";
                currentTestElement.className = "current";
                holder.appendChild(currentTestElement);
                WinJS.UI.processAll(holder);
                var control = (<Element>holder.firstChild).winControl;
                LiveUnit.Assert.areEqual("DIV", control.a.tagName);
                LiveUnit.Assert.areEqual("test", control.a.id);
                LiveUnit.Assert.areEqual("current", control.a.className);
            }
            finally {
                WinJS.Utilities.disposeSubTree(holder);
                document.body.removeChild(holder);
                complete();
            }
        }

        testOptionQueryExpressionBasicFindElementByClass_LookupFromRoot(complete) {

            //The one at root should be selected
            var rootTestElement = document.createElement("div");
            rootTestElement.className = "test";
            rootTestElement.id = "root";
            document.body.appendChild(rootTestElement);
            var holder = document.createElement("div");
            document.body.appendChild(holder);

            try {
                holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{a: select(\".test\")}'></div>";
                var currentTestElement = document.createElement("div");
                currentTestElement.className = "test";
                currentTestElement.id = "current";
                holder.appendChild(currentTestElement);
                WinJS.UI.processAll(holder);
                var control = (<Element>holder.firstChild).winControl;
                LiveUnit.Assert.areEqual("DIV", control.a.tagName);
                LiveUnit.Assert.areEqual("test", control.a.className);
                LiveUnit.Assert.areEqual("root", control.a.id);
            }
            finally {
                WinJS.Utilities.disposeSubTree(holder);
                WinJS.Utilities.disposeSubTree(rootTestElement);
                document.body.removeChild(holder);
                document.body.removeChild(rootTestElement);
                complete();
            }


        }

        testOptionQueryExpressionBasicFindElementByClass_LookupFromParent(complete) {

            //The one at root should be selected
            var holderParentElement = document.createElement("div");
            holderParentElement.className = "test";
            holderParentElement.id = "parent";
            document.body.appendChild(holderParentElement);
            var holder = document.createElement("div");
            holderParentElement.appendChild(holder);

            try {
                holder.innerHTML = "<div data-win-control='DeclTest' data-win-options='{a: select(\".test\")}'></div>";
                var currentTestElement = document.createElement("div");
                currentTestElement.className = "test";
                currentTestElement.id = "current";
                holder.appendChild(currentTestElement);
                WinJS.UI.processAll(holder);
                var control = (<Element>holder.firstChild).winControl;
                LiveUnit.Assert.areEqual("DIV", control.a.tagName);
                LiveUnit.Assert.areEqual("test", control.a.className);
                LiveUnit.Assert.areEqual("parent", control.a.id);
            }
            finally {
                WinJS.Utilities.disposeSubTree(holderParentElement);
                document.body.removeChild(holderParentElement);
                complete();
            }

        }

        testOptionQueryExpressionBasicFindElementByClass_FragmentNotParented_LookupFromFragment(complete) {

            var mainTreeTestElement = document.createElement("div");
            mainTreeTestElement.className = "test";
            mainTreeTestElement.id = "root";
            document.body.appendChild(mainTreeTestElement);

            var holder = document.createElement("div");
            document.body.appendChild(holder);

            var frag = document.createElement("div");

            holder.innerHTML = "<div><div data-win-control='DeclTest' data-win-options='{a: select(\".test\")}'></div></div>";
            var fragTestElement = document.createElement("div");
            fragTestElement.className = "test";
            fragTestElement.id = "fragment";
            holder.appendChild(fragTestElement);

            WinJS.UI.Fragments.clearCache(holder);
            WinJS.UI.Fragments.renderCopy(holder)
                .then(function (docfrag) {
                    frag.appendChild(docfrag);
                    WinJS.UI.Fragments.clearCache(holder);
                    document.body.appendChild(frag);
                    return WinJS.UI.processAll(document.body);
                })
                .then(function () {
                    var control = frag.querySelector("[data-win-control=DeclTest]").winControl;
                    LiveUnit.Assert.areEqual("DIV", control.a.tagName);
                    LiveUnit.Assert.areEqual("test", control.a.className);
                    LiveUnit.Assert.areEqual("fragment", control.a.id);
                })
                .then(null, errorHandler)
                .then(function () {
                    WinJS.Utilities.disposeSubTree(mainTreeTestElement);
                    WinJS.Utilities.disposeSubTree(holder);
                    WinJS.Utilities.disposeSubTree(frag);
                    document.body.removeChild(mainTreeTestElement);
                    document.body.removeChild(holder);
                    document.body.removeChild(frag);
                })
                .then(complete);
        }

        testOptionQueryExpressionBasicFindElementByClass_FragmentParented_LookupFromFragment(complete) {

            var mainTreeTestElement = document.createElement("div");
            mainTreeTestElement.className = "test";
            mainTreeTestElement.id = "root";

            try {
                var holder = document.createElement("div");
                holder.innerHTML = "<div><div data-win-control='DeclTest' data-win-options='{a: select(\".test\")}'></div></div>";
                var fragTestElement = document.createElement("div");
                fragTestElement.className = "test";
                fragTestElement.id = "fragment";
                holder.appendChild(fragTestElement);

                WinJS.UI.Fragments.clearCache(holder);
                WinJS.UI.Fragments.renderCopy(holder, mainTreeTestElement);
                document.body.appendChild(mainTreeTestElement);
                WinJS.UI.processAll(document.body);

                var control = (<Element>mainTreeTestElement.firstChild.firstChild).winControl;
                LiveUnit.Assert.areEqual("DIV", control.a.tagName);
                LiveUnit.Assert.areEqual("test", control.a.className);
                LiveUnit.Assert.areEqual("root", control.a.id);
            }
            finally {
                WinJS.Utilities.disposeSubTree(mainTreeTestElement);
                document.body.removeChild(mainTreeTestElement);
                complete();
            }
        }

        testOptionQueryExpressionBasicFindElementByClass_LocalTemplate_LookupFromWithinTemplate(complete) {

            var holder = document.createElement("div");
            holder.innerHTML = "<div id='test'><div data-win-control='DeclTest' data-win-options='{a: select(\"#test\") }' data-win-bind=\"textContent: text\"></div></div>";
            var data = { text: "sometext" };

            var template = new WinJS.Binding.Template(holder);

            template.render(data)
                .then(function (d) {
                    LiveUnit.Assert.areEqual("sometext", d.textContent);
                    LiveUnit.Assert.areEqual("DIV", (<Element>d.firstChild.firstChild).winControl.a.tagName);
                    LiveUnit.Assert.areEqual("test", (<Element>d.firstChild.firstChild).winControl.a.id);
                })
                .then(null, errorHandler)
                .then(complete);
        }

        testScopedSelect() {
            var docfrag = document.createDocumentFragment();
            var d = document.createElement("div");
            docfrag.appendChild(d);
            d.className = "root";
            d.innerHTML = "<div class='myClass'><div class='element'>element</div></div><div class='myClass2'>myClass2</div>";
            (<any>d.children[0]).msParentSelectorScope = true;
            (<any>d.children[1]).msParentSelectorScope = true;

            var element = <HTMLElement>d.querySelector(".element");
            LiveUnit.Assert.areEqual(d.children[0], WinJS.UI.scopedSelect(".myClass", element));
            LiveUnit.Assert.areEqual(d.children[1], WinJS.UI.scopedSelect(".myClass2", element));
            LiveUnit.Assert.areEqual((<HTMLElement>d.children[0]).children[0], WinJS.UI.scopedSelect(".element", element));
            LiveUnit.Assert.areEqual(d, WinJS.UI.scopedSelect(".root", element));
        }



        testRequireSupportedForProcessing_StrictProcessing() {
            try {
                var f = function () { };
                WinJS.Utilities.requireSupportedForProcessing(f);
                LiveUnit.Assert.fail("should not get here when strictProcessing");
            } catch (e) {
                LiveUnit.Assert.areEqual("WinJS.Utilities.requireSupportedForProcessing", e.name);
            }

            try {
                var f2 = function () { };
                WinJS.Utilities.markSupportedForProcessing(f2);
                WinJS.Utilities.requireSupportedForProcessing(f2);
            } catch (e) {
                LiveUnit.Assert.fail("should not get here when strictProcessing");
            }
        }

        testUsingNotSupportedForProcessingCtor_StrictProcessing(complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='NotSupportedForProcessingControl' data-win-options='{ test: 123 }'></div>";
            WinJS.UI.processAll(<Element>holder.firstChild).then(
                function () {
                    LiveUnit.Assert.fail("should not get here when strictProcessing");
                },
                function (e) {
                    LiveUnit.Assert.areEqual("WinJS.Utilities.requireSupportedForProcessing", e.name);
                }
                )
                .then(null, errorHandler)
                .then(complete);
        }

        testUsingNotSupportedForProcessingValue_StrictProcessing(complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='SupportedForProcessingControl' data-win-options='{ something: eval }'></div>";
            WinJS.UI.processAll(<Element>holder.firstChild).then(
                function () {
                    LiveUnit.Assert.fail("should not get here when strictProcessing");
                },
                function (e) {
                    LiveUnit.Assert.areEqual("WinJS.Utilities.requireSupportedForProcessing", e.name);
                }
                )
                .then(null, errorHandler)
                .then(complete);
        }

        testUsingWindow_StrictProcessing(complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div data-win-control='SupportedForProcessingControl' data-win-options='{ something: window }'></div>";
            WinJS.UI.processAll(<Element>holder.firstChild).then(
                function () {
                    LiveUnit.Assert.fail("should not get here when strictProcessing");
                },
                function (e) {
                    LiveUnit.Assert.areEqual("WinJS.Utilities.requireSupportedForProcessing", e.name);
                }
                )
                .then(null, errorHandler)
                .then(complete);
        }


    };

}

LiveUnit.registerTestClass("CorsicaTests.DeclarativeControls");
