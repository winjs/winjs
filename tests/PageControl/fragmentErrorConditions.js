// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/util.ts" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};
var testsAlreadyRun = testsAlreadyRun || [];

var fragmentErrorConditions = function () {
    "use strict";
    function getFilename(urlString) {
        // given an url like: "ms-wwa://webunit-8wekyb3d8bbwe/externalScriptSyntaxError.js",
        // return just the filename part: externalScriptSyntaxError.js
        var x = urlString.split('/');
        return x[x.length - 1];
    }


    // since these tests load fragments with KNOWN errors, only run under wwahost to avoid the IE error dialog.
    // if someone wants to run under IE in the future (or as a special manual test), they can just change
    // dontRunUnderThisHost = true;.
    var dontRunUnderThisHost = !isWinRTEnabled();
    var errors = [];
    var hit;

    function fragmentErrorConditions_errorHandler(event) {
        // add error event details to the errors array for later checking.

        // Not using the event.currentTarget.event.errorMessage field because it gets localized and
        // would make test fail on localized builds.  Not using errorline field in case they change the detection.
        // The important thing is that an error is raised so checking for correct filename is sufficient.
        errors.push(getFilename(event.currentTarget.event.errorUrl));

        // this tells wwahost the error has been handled so the test can continue
        return true;
    }

    function initializeTest() {
        // initialize variables and remove the webunit global error handler which calls complete() for many fragment load errors
        // and messes up this test.

        try {
            hit = 0;
            errors = [];
            WinJS.UI.Fragments.clearCache();
            window.addEventListener("error", fragmentErrorConditions_errorHandler);

            // remove the webunit global handler which will call complete() if you encounter an error during fragment loading
            window.removeEventListener("error", LiveUnit.exceptionHandler, false);
        } catch (ex) {
            // restore the webunit global error handler in case it was removed.  If already added, re-adding doesn't generate error.
            window.addEventListener("error", LiveUnit.exceptionHandler, false);

            LiveUnit.Assert.fail("unhandled exception from initializeTest(), webunit global error handler restored.  Exception=" + ex);
        }
    }

    function cleanupTest() {
        window.removeEventListener("error", fragmentErrorConditions_errorHandler);

        // restore the webunit global error handler
        window.addEventListener("error", LiveUnit.exceptionHandler, false);
    }

    this.xtestFragmentBad_ExternalScriptNotFound = function (complete) {
        // win8:629584 APPHOST9623 error not catchable via javascript global error event listener
        // this test relies on script loading which only occurs once per context.  If this test has already been run in this
        // script context, then don't do the actual test.
        var testName = "testFragmentBad_ExternalScriptNotFound";
        if (dontRunUnderThisHost || testsAlreadyRun.indexOf(testName) >= 0) {
            complete();
            return;
        } else {
            testsAlreadyRun.push(testName);
        }

        var fragFile = "FragmentBad_ScriptTagNotFound.html";
        initializeTest();

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes a script tag referencing a script not present,        <script src="bad\scriptFileNotFound.js"></script>

                IE F12 javascript console shows:
                SCRIPT1014: Invalid character
                scriptFileNotFound.js, line 1 character 1

                win8express javascript console shows:
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad\scriptFileNotFound.js due to the following error: -2146697211.
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad\scriptFileNotFound.js due to the following error: -2146697211.
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad\scriptFileNotFound.js due to the following error: -2146697211.
                SCRIPT1014: Invalid character
                File: scriptFileNotFound.js, line: 1 column: 1
                */
                if (isWinRTEnabled()) {
                    LiveUnit.Assert.isTrue(errors[0] === "bad\\scriptFileNotFound.js", "got=" + errors[0]);
                } else {
                    LiveUnit.Assert.isTrue(errors.length === 0, "expected errors.length == 0, got=" + errors.length);
                }
                LiveUnit.Assert.areEqual("file:FragmentBad_ScriptTagNotFound.html", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.xtestFragmentBad_ScriptTagNotClosed = function (complete) {
        // win8:629584 APPHOST9623 error not catchable via javascript global error event listener
        var testName = "testFragmentBad_ScriptTagNotClosed";

        // this test relies on script loading which only occurs once per context.  If this test has already been run in this
        // script context, then don't do the actual test.
        if (dontRunUnderThisHost || testsAlreadyRun.indexOf(testName) >= 0) {
            complete();
            return;
        } else {
            testsAlreadyRun.push(testName);
        }

        initializeTest();
        var fragFile = "FragmentBad_ScriptTagNotClosed.html";

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes a script tag that isn't closed properly           <script src="scriptFileNotFound.js"></script

                IE F12 javascript console shows:
                HTML1501: Unexpected end of file.
                FragmentBad_ScriptTagNotClosed.html, line 18 character 8

                win8express javascript console shows:
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/scriptFileNotFound.js due to the following error: -2146697211.
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/scriptFileNotFound.js due to the following error: -2146697211.
                SCRIPT1014: Invalid character
                File: scriptFileNotFound.js, line: 1 column: 1
                */
                if (isWinRTEnabled()) {
                    LiveUnit.Assert.isTrue(errors[0] === "scriptFileNotFound.js", "got=" + errors[0]);
                } else {
                    LiveUnit.Assert.isTrue(errors.length === 0, "got=" + errors.length);
                }
                LiveUnit.Assert.areEqual(0, docfrag.childNodes.length, "expecting docfrag.childNodes.length === 0, got=" + docfrag.childNodes.length);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.xtestFragmentBad_ExternalScriptSyntaxError = function (complete) {
        // win8:629584 APPHOST9623 error not catchable via javascript global error event listener
        var testName = "testFragmentBad_ExternalScriptSyntaxError";

        // this test relies on script loading which only occurs once per context.  If this test has already been run in this
        // script context, then don't do the actual test.
        if (dontRunUnderThisHost || testsAlreadyRun.indexOf(testName) >= 0) {
            complete();
            return;
        } else {
            testsAlreadyRun.push(testName);
        }

        initializeTest();
        var fragFile = "FragmentBad_ExternalScriptSyntaxError.html";

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes a script tag to external JS script that contains a syntax error           function foo elements, options) {

                IE F12 javascript console shows:
                SCRIPT1005: Expected '('
                FragmentBad_ScriptSyntaxError.js, line 2 character 50

                win8express javascript console shows:
                SCRIPT1005: Expected '('
                File: FragmentBad_ScriptSyntaxError.js, line: 2 column: 50
                */

                // note, this fragment JS file has a JSB extension to avoid errors when webunit is scanning *.JS for tests
                LiveUnit.Assert.isTrue(errors[0] === "FragmentBad_ScriptSyntaxError.jsb", "got=" + errors[0]);
                LiveUnit.Assert.areEqual("file:FragmentBad_ExternalScriptSyntaxError.html", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.testFragmentBad_ExternalCSSNotFound = function (complete) {
        var testName = "testFragmentBad_ExternalCSSNotFound";

        if (dontRunUnderThisHost) {
            complete();
            return;
        }

        var fragFile = "FragmentBad_ExternalCSSNotFound.html";
        initializeTest();

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes a link to a CSS file not present              <link rel="stylesheet" href="bad/CSSFileNotFound.css" />

                IE F12 javascript console shows: no messages.   IE completely ignores the link tag to not found CSS..

                win8express javascript console shows: these messages in the console window (not catchable by window.onerror):
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad/CSSFileNotFound.css due to the following error: -2146697211.
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad/CSSFileNotFound.css due to the following error: -2146697211.
                */
                LiveUnit.Assert.isTrue(errors.length === 0, "expected errors.length from window.onerror == 0, got=" + errors.length);
                LiveUnit.Assert.areEqual("file:FragmentBad_ExternalCSSNotFound.html", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.testFragmentBad_CSSLinkTagNotClosed = function (complete) {
        var testName = "testFragmentBad_CSSLinkTagNotClosed";

        if (dontRunUnderThisHost) {
            complete();
            return;
        }

        initializeTest();
        var fragFile = "FragmentBad_CSSLinkTagNotClosed.html";

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes a CSS link tag that isn't closed properly         <link rel="stylesheet" href="bad/CSSFileNotFound.css"

                IE F12 javascript console shows:
                HTML1409: Invalid attribute name character. Attribute names should not contain ("),('),(<), or (=).
                FragmentBad_CSSLinkTagNotClosed.html, line 11 character 1
                HTML1422: Malformed start tag. A self closing slash should be followed by a U+003E GREATER-THAN SIGN (>).
                FragmentBad_CSSLinkTagNotClosed.html, line 11 character 3

                win8express javascript console shows: these messages (not catchable by window.onerror):  dev11 bug#304412 to decode error codes
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad/CSSFileNotFound.css due to the following error: -2146697211.
                WWA9623: Windows Web Application Host was unable to resolve ms-wwa://webunit-8wekyb3d8bbwe/bad/CSSFileNotFound.css due to the following error: -2146697211.
                */
                LiveUnit.Assert.isTrue(errors.length === 0, "expected errors.length from window.onerror == 0, got=" + errors.length);
                LiveUnit.Assert.areEqual("file:FragmentBad_CSSLinkTagNotClosed.html", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.testFragmentBad_ExternalCSSWithSyntaxError = function (complete) {
        var testName = "testFragmentBad_ExternalCSSWithSyntaxError";

        if (dontRunUnderThisHost) {
            complete();
            return;
        }

        initializeTest();
        var fragFile = "FragmentBad_ExternalCSSWithSyntaxError.html";

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment links to an external CSS file which contains syntax errors             XXXXXXXmargin-left 120px

                IE F12 javascript console shows: no warnings

                win8express javascript console shows: no warnings
                */
                LiveUnit.Assert.isTrue(errors.length === 0, "expected errors.length from window.onerror == 0, got=" + errors.length);
                LiveUnit.Assert.areEqual("file:FragmentBad_ExternalCSSWithSyntaxError.html", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.xtestFragmentBad_InternalJSSyntaxError = function (complete) {
        var testName = "testFragmentBad_InternalJSSyntaxError";

        // this test relies on script loading which only occurs once per context.  If this test has already been run in this
        // script context, then don't do the actual test.
        if (dontRunUnderThisHost || testsAlreadyRun.indexOf(testName) >= 0) {
            complete();
            return;
        } else {
            testsAlreadyRun.push(testName);
        }
        initializeTest();
        var fragFile = "FragmentBad_InternalJSSyntaxError.html";

        // We are purposefully causing a condition that would otherwise terminate the application.
        //
        var errorHandler = function () { return true; }
        WinJS.Application.addEventListener("error", errorHandler);

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes internal <script> with syntax errors          function init { this script has intentional syntax errors;

                IE F12 javascript console shows:
                SCRIPT1005: Expected '('
                FragmentBad_InternalJSSyntaxError.html, line 10 character 23

                win8express javascript console shows:
                SCRIPT1005: Expected '('
                File: index.html, line: 2 column: 23
                */
                LiveUnit.Assert.isTrue(errors[0] === "index.html", "got=" + errors[0]);
                LiveUnit.Assert.areEqual("file:FragmentBad_InternalJSSyntaxError.html", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            then(function() {
                // We are purposefully causing a condition that would otherwise terminate the application.
                //
                var errorHandler = function () { return true; }
                WinJS.Application.removeEventListener("error", errorHandler);
                cleanupTest();
            })
            .done(complete)
    }

    this.testFragmentBad_InternalCSSSyntaxError = function (complete) {
        var testName = "testFragmentBad_InternalCSSSyntaxError";

        if (dontRunUnderThisHost) {
            complete();
            return;
        }

        initializeTest();
        var fragFile = "FragmentBad_InternalCSSSyntaxError.html";

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes internal <style> with syntax errors like      background ========= red;

                IE F12 javascript console shows: no messages
                win8express javascript console shows: no messages
                */
                LiveUnit.Assert.isTrue(errors.length === 0, "expected errors.length from window.onerror == 0, got=" + errors.length);
                LiveUnit.Assert.areEqual("file:FragmentBad_InternalCSSSyntaxError", docfrag.childNodes[1].textContent, "got docfrag.childNodes[1].textContent = " + docfrag.childNodes[1].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }

    this.testFragmentBad_InternalHTMLSyntaxError = function (complete) {
        var testName = "testFragmentBad_InternalHTMLSyntaxError";

        if (dontRunUnderThisHost) {
            complete();
            return;
        }

        initializeTest();
        var fragFile = "FragmentBad_InternalHTMLSyntaxError.html";

        WinJS.UI.Fragments.renderCopy(fragFile).
            then(function (docfrag) {
                hit++;

                /*
                fragment includes HTML with syntax errors (missing opening body tag, unterminated class name string      class="myClass>

                IE F12 javascript console shows:
                HTML1411: Unexpected end of file.
                FragmentBad_InternalHTMLSyntaxError.html, line 18 character 8

                win8express javascript console shows: this message (not catchable via window.onerror)
                HTML1419: Unexpected keyword in DOCTYPE. Expected "PUBLIC" or "SYSTEM".
                File: index.html, line: 2 column: 16
                */
                LiveUnit.Assert.isTrue(errors.length === 0, "expected errors.length from window.onerror == 0, got=" + errors.length);
                LiveUnit.Assert.areEqual("file:FragmentBad_InternalHTMLSyntaxError", docfrag.childNodes[0].textContent, "got docfrag.childNodes[0].textContent = " + docfrag.childNodes[0].textContent);
            }).
            then(function () {
                LiveUnit.Assert.isTrue(hit === 1, "expecting hit === 1, got=" + hit);
            }).
            then(null, unhandledTestError).
            done(function () {
                cleanupTest();
                complete();
            });
    }


};

LiveUnit.registerTestClass("fragmentErrorConditions");