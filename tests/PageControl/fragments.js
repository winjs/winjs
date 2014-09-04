// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/util.ts" />
/// <deploy src="../TestData/" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.Fragments = function () {
    "use strict";
    function assertCacheIsClear(expectedClear) {
        // javascript doesn't have an intrinsic way to test for an empty object
        var cacheContents = JSON.stringify(WinJS.UI.Fragments._cacheStore);
        var cacheIsClear = (cacheContents === "{}");

        if (expectedClear) {
            LiveUnit.Assert.isTrue(cacheIsClear, "expected cache to be clear, instead cache contains=" + cacheContents);
        } else {
            LiveUnit.Assert.isFalse(cacheIsClear, "expected cache contents, instead cache contains " + cacheContents);
        }
    }

    function assertCacheContents(key) {
        var x = WinJS.UI.Fragments._cacheStore[key.toLowerCase()];
        LiveUnit.Assert.isTrue(x !== undefined, "id from cache returned undefined, id=" + key );
    }

    this.testForceLocal = function () {
        // uri -> "should be ms-appx"
        var testUris = [
            ["blob:12345678", true],
            ["ms-appdata:///roaming/foo.txt", true],
            ["ms-appdata:/roaming/foo.txt", true],
            ["ms-appdata:roaming/foo.txt", true],
            ["for/bar.html", false],
            ["For/Bar.html", false],
            ["http://for/bar.html", true],
            ["ms-appx:///for/bar.html", false],
            ["MS-APPX:///FOR/BAR.HTML", false],
            ["ms-appx:/for/bar.html", false],
            ["ms-appx://packagename/for/bar.html", false],
            ["ms-appx:packagename/for/bar.html", false],
            ["///for/bar.html", false],
            ["//mypackage/for/bar.html", false],
            ["/for/bar.html", false],
            ["1234", false],
            ["%20%20/bar.html", false],
            ["\\\\somesite\\foo.txt", true],
            ["someprotocol://foo", true],
            ["mailto://chrisan@microsoft.com", true],
            ["ftp://chrisan@microsoft.com", true],
            ["1234:123:123:1324://foo", true],
            ["ms-appx%20:///foo", false], // browser treats this as relative
            ["file://\\\\somesite\\foo.txt", true]
        ];

        var mapped = testUris.map(function (item) {
            try {
                var res = WinJS.UI.Fragments._forceLocal(item[0]);
                if (WinJS.Utilities.hasWinRT) {
                    LiveUnit.Assert.isFalse(item[1], "'" + item[0] + "' should not throw when resolving");
                }
                return res;
            }
            catch (e) {
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasWinRT, "should never throw in web context");
                LiveUnit.Assert.isTrue(item[1], "'" + item[0] + "' should throw when resolving");
                return null;
            }
        });

        function checkResolvesToAppx(uri) {
            var a = document.createElement("a");
            a.href = uri;
            var absolute = a.href.toLowerCase();
            var start = absolute.substring(0, 8);
            LiveUnit.Assert.areEqual("ms-appx:", absolute.substring(0, 8), "'" + uri + "' should be resolved by platform to ms-appx");
        }

        if (WinJS.Utilities.hasWinRT) {
            mapped.forEach(function (item, index) {
                if (item) {
                    checkResolvesToAppx(item);
                }
            });
        }
        else {
            mapped.forEach(function (item, index) {
                LiveUnit.Assert.areEqual(testUris[index][0], item);
            });
        }
    }

    this.testClearCache = function () {
        // validate clearCache() really clears the cache
        WinJS.UI.Fragments.clearCache();
        assertCacheIsClear(true);
    }

    this.testCacheMiss = function() {
        // test getting something bogus from the cache yields undefined
        WinJS.UI.Fragments.clearCache();
        assertCacheIsClear(true);

        var x = WinJS.UI.Fragments._cacheStore["idNotFoundddddddddd"];
        LiveUnit.Assert.isTrue(x === undefined, "expected retrieving bogus id from cache to return undefined, instead=" + x );
    }

    this.testSingleElementFragment = function (complete) {
        // load fragment that only has a single <h1></h1> tag
        WinJS.UI.Fragments.clearCache();
        assertCacheIsClear(true);

        var temp = document.createElement("span");
        var fragfile = "$(TESTDATA)/FragmentSingleElement.html";

        WinJS.UI.Fragments.render(fragfile, temp).
            then(function (docfrag) {
                // cache should be empty after render()
                assertCacheIsClear(true);

                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                LiveUnit.Assert.areEqual(1, temp.children.length, "expect #children == 1");
                LiveUnit.Assert.areEqual("common header element", temp.children[0].textContent, "expected textContent == 'common header element'");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testRemoveEmptyString = function() {
        // validate removing "" doesn't throw exception
        WinJS.UI.Pages._remove("");
        // nothing to assert here
    }

    this.testRemoveMissingFile = function() {
        // validate removing missing fragment name doesn't throw exception
        WinJS.UI.Pages._remove("adjf123RFEyreupqw.html");
        // nothing to assert here
    }

    this.xtestGetEmptyString = function () {
        // bug #485848, get() needs WinJS validation
        // "get" with loading empty string
        var x = WinJS.UI.Pages.get("");
        LiveUnit.Assert.isTrue(x === undefined, "get returned=[" + x + "]; expected undefined when calling WinJS.UI.Pages.get('')");
    };

    this.xtestGetMissingFile = function () {
        // bug #485848, get() needs WinJS validation
        // "get" with loading missing file
        var fragfile = "adfd123poupou";
        var x = WinJS.UI.Pages.get(fragfile);
        LiveUnit.Assert.isTrue(x === undefined, "get returned=[" + x + "]; expected undefined when calling WinJS.UI.Pages.get(" + fragfile + ")");
    };

    this.xtestFragmentFilenameWithSpaces = function(complete) {
    // bug: 479803 testcase passes, but "binplace" build process doesn't like filename withspaces, investigating workaround.
        // load from a fragment file that has spaces in the name
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("span");

        WinJS.UI.Fragments.render("Fragment filename spaces.htm", temp).
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                LiveUnit.Assert.areEqual(1, temp.children.length, "expect #children == 1");
                LiveUnit.Assert.areEqual("common header element", temp.children[0].textContent, "expected textContent == 'common header element'");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testFragmentHTMExtension = function (complete) {
        // load fragment that has a .HTM (not .HTML) extension.
        // Fragment only has a single <h1></h1> tag
        WinJS.UI.Fragments.clearCache();
        assertCacheIsClear(true);

        var temp = document.createElement("span");
        var fragfile = "$(TESTDATA)/FragmentHTMExtension.HTM";

        WinJS.UI.Fragments.render(fragfile, temp).
            then(function (docfrag) {
                // cache should be empty after render()
                assertCacheIsClear(true);

                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                LiveUnit.Assert.areEqual(1, temp.children.length, "expect #children == 1");
                LiveUnit.Assert.areEqual("common header element", temp.children[0].textContent, "expected textContent == 'common header element'");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testElementCloning = function (complete) {
        var holder = document.createElement("div");
        holder.innerHTML =
            "<div id='frag1'><div class='a'></div></div>";

        WinJS.UI.Fragments.clearCache(holder.firstChild);
        var cloned = document.createElement("div");
        WinJS.UI.Fragments.renderCopy(holder.firstChild).
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                cloned.appendChild(docfrag);
                // wrapper element
                //
                LiveUnit.Assert.areEqual(cloned.tagName, "DIV");
                LiveUnit.Assert.areEqual(cloned.id, "");

                // cloned element
                //
                LiveUnit.Assert.areEqual(cloned.firstChild.className, "a");

                WinJS.UI.Fragments.clearCache(holder.firstChild);
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testRemoteFragmentLoading = function (complete) {
        var temp = document.createElement("div");
        var fragfile = "$(TESTDATA)/FragmentBasic.html";
        WinJS.UI.Fragments.renderCopy(fragfile).
            then(function (docfrag) {
                assertCacheContents(fragfile);

                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testRemoteFragmentLoading2 = function (complete) {
        // try null param to renderCopy
        var temp = document.createElement("div");
        var fragfile = "$(TESTDATA)/FragmentBasic.html";
        WinJS.UI.Fragments.renderCopy(fragfile, null).
            then(function (docfrag) {
                assertCacheContents(fragfile);

                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testRemoteFragmentLoadingAppend = function (complete) {
        var temp = document.createElement("div");
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentBasic.html", temp).
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testRemoteFragmentLoadingNoCopy = function (complete) {
        var temp = document.createElement("div");
        WinJS.UI.Fragments.render("$(TESTDATA)/FragmentBasic.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testRemoteFragmentLoadingAppendNoCopy = function (complete) {
        var temp = document.createElement("div");
        WinJS.UI.Fragments.render("$(TESTDATA)/FragmentBasic.html", temp).
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testFragmentWithScriptAndStyles  = function (complete) {
        var temp = document.createElement("div");
        document.body.appendChild(temp);
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentWithScriptAndStyles.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                fragmentWithScriptAndStylesLoad(docfrag, { text : 'option1' });
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(2, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("rgb(255, 0, 0)", getComputedStyle(temp.children[0]).backgroundColor, "Referenced style should have been applied and colored the generated element");
                LiveUnit.Assert.areEqual("option1", temp.children[0].textContent, "Loaded script should have run and updated the body for the generated element");
                LiveUnit.Assert.areEqual("woot!", temp.children[1].textContent, "Inline script should have been parsed and added to the document");
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testFragmentWithScriptAndStylesNoBody  = function (complete) {
        var temp = document.createElement("div");
        document.body.appendChild(temp);
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentWithScriptAndStylesNoBody.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                fragmentWithScriptAndStylesLoadNoBody(docfrag, { text: 'option1' });
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(1, document.head.querySelectorAll("[data-magic='testFragmentWithScriptAndStylesNoBody']").length, "should have cloned the custom attribute on style");
                LiveUnit.Assert.areEqual(2, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("rgb(255, 0, 0)", getComputedStyle(temp.children[0]).backgroundColor, "Referenced style should have been applied and colored the generated element");
                LiveUnit.Assert.areEqual("option1", temp.children[0].textContent, "Loaded script should have run and updated the body for the generated element");
                LiveUnit.Assert.areEqual("woot!", temp.children[1].textContent, "Inline script should have been parsed and added to the document");
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(null, unhandledTestError).
            then(complete);
    }

	this.testFragmentWithScriptAndStylesNoBodyNoLoad  = function (complete) {
        var temp = document.createElement("div");
        document.body.appendChild(temp);
	    WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentWithScriptAndStylesNoBodyNoLoad.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(2, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("rgb(255, 0, 0)", getComputedStyle(temp.children[0]).backgroundColor, "Referenced style should have been applied and colored the generated element");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Loaded script should have not run and updated the body for the generated element");
                LiveUnit.Assert.areEqual("Another test.", temp.children[1].textContent, "Inline script should have been parsed and added to the document");
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testFragmentWithExternalScriptAndStyles  = function (complete) {
        var temp = document.createElement("div");
        document.body.appendChild(temp);
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentWithExternalScriptAndStyles.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                fragmentWithExternalScriptAndStylesLoad(docfrag);
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(1, document.head.querySelectorAll("[data-magic='testFragmentWithExternalScriptAndStyles']").length, "should have cloned the custom attribute on style");
                LiveUnit.Assert.areEqual(4, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("rgb(255, 0, 0)", getComputedStyle(temp.children[3]).backgroundColor, "Referenced style should have been applied and colored the generated element");
                LiveUnit.Assert.areEqual("hit", temp.children[3].textContent, "Loaded script should have run and updated the body for the generated element");
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.xtestFragmentWithWinJSReferences = function(complete) {
        // bug#522041 scripts get loaded twice if script tags differ by '\' or '/'
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("div");
        document.body.appendChild(temp);

        // page1.html contains <script> references to WinJS*
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/page1.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                temp.appendChild(docfrag);
                LiveUnit.Assert.areEqual(1, temp.children.length, "expecting 1 children, got=" + temp.children.length);
            }).
            then(null, unhandledTestError).
            then(function() {
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(complete);
    }

    this.testFragmentWithNamespaceLoad  = function (complete) {
        var temp = document.createElement("div");
        document.body.appendChild(temp);
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentWithNamespaceLoad.html").
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                Fragment.Test.init(docfrag, { text: 'options' });
                temp.appendChild(docfrag);
            }).
            then(function () {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("options", temp.children[0].textContent, "Loaded script should have run and updated the body for the generated element");
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testCustomFragmentLoader = function () {
        var frag =
            "<!DOCTYPE html>\r\n" +
            "<!-- saved from url=(0014)about:internet -->\r\n" +
            "<html xmlns='http://www.w3.org/1999/xhtml'>\r\n" +
            "<head>\r\n" +
            "    <title>Test Control</title>\r\n" +
            "</head>\r\n" +
            "<body>\r\n" +
            "    <div>This is just a test.</div>\r\n" +
            "</body>\r\n" +
            "</html>\r\n";

        var old = WinJS.UI.Fragments._getFragmentContents;



        WinJS.UI.Fragments._getFragmentContents = function getFragmentContents(href) {
            return WinJS.Promise.as(frag);
        };

        try {
            var rendered = false;
            var temp = document.createElement("div");
            WinJS.UI.Fragments.clearCache("$(TESTDATA)/FragmentBasic.html");
            WinJS.UI.Fragments.render("$(TESTDATA)/FragmentBasic.html", temp).
                then(function () {
                    LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                    LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
                    rendered = true;
                }
            );
            LiveUnit.Assert.isTrue(rendered, "should have rendered synchronously");
        }
        finally {
            WinJS.UI.Fragments._getFragmentContents = old;
        }
    }

    this.testCacheRenderCopy = function (complete) {
        // load fragment into cache, then call renderCopy
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("div");

        WinJS.UI.Fragments.cache("$(TESTDATA)/FragmentBasic.html").
            then(function () { return WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentBasic.html", temp); }).
            then(function () {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testCacheRender = function (complete) {
        // load fragment into cache, then call render
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("div");
        var fragfile = "$(TESTDATA)/FragmentBasic.html";

        WinJS.UI.Fragments.cache(fragfile).
            then(function() { assertCacheContents(fragfile); }).
            then(function() { return WinJS.UI.Fragments.render(fragfile, temp); }).
            then(function() {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

    this.testCacheCacheRender = function(complete) {
        // load fragment into cache twice, then call render
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("div");
        var fragfile = "$(TESTDATA)/FragmentBasic.html";

        WinJS.UI.Fragments.cache(fragfile).
            then(function () { return WinJS.UI.Fragments.cache(fragfile); }).
            then(function () { assertCacheContents(fragfile); }).
            then(function() { return WinJS.UI.Fragments.render(fragfile, temp); }).
            then(function() {
                LiveUnit.Assert.areEqual(1, temp.children.length, "Missing expected child");
                LiveUnit.Assert.areEqual("This is just a test.", temp.children[0].textContent, "Text content does not match");
            }).
            then(null, unhandledTestError).
            then(complete);
    };

    this.testFragmentWith2WinJSControls = function (complete) {
    // bug# 478740
    // load fragment with 2 WinJS elements
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("div");

        WinJS.UI.Fragments.render("$(TESTDATA)/Fragment2WinJSControls.html", temp).
            then(function () {
            // after it loads, verify there's 1 element with id=datepicker
            LiveUnit.Assert.areEqual(1, temp.querySelectorAll("#datepicker").length);

            // activate the WinJS controls loaded from the template
            WinJS.UI.processAll(temp).
            then(function () {
                // after processAll(), there should be a SELECT element with class "win-date"
                var dateElement = temp.querySelectorAll(".win-datepicker-date");
                LiveUnit.Assert.isNotNull(dateElement, "expected dateElement is not null");
            });
        }).
        then(null, unhandledTestError).
        then(complete);
    }

    this.testRelativePaths = function (complete) {
        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/Subdirectory/RelativePathFragments.html").
            then(function (docfrag) {
                LiveUnit.Assert.areNotEqual(-1, docfrag.querySelector("IMG").src.indexOf("/Subdirectory/"));
                LiveUnit.Assert.areNotEqual(-1, docfrag.querySelector("A").href.indexOf("/Subdirectory/"));

                // These two would have been loaded in our main document
                var scripts = document.querySelectorAll("SCRIPT");
                var haveScript = false;
                var i, len;
                for (i = 0, len = scripts.length; i < len; i++) {
                    if (scripts[i].src.indexOf("/Subdirectory/") !== -1) {
                        haveScript = true;
                        break;
                    }
                }
                LiveUnit.Assert.isTrue(haveScript);
                var links = document.querySelectorAll("LINK");
                var haveLink = false;
                for (i = 0, len = links.length; i < len; i++) {
                    if (links[i].href.indexOf("/Subdirectory/") !== -1) {
                        haveLink = true;
                        break;
                    }
                }
                LiveUnit.Assert.isTrue(haveLink);
            }).
            then(null, unhandledTestError).
            then(complete);
    };

    this.testBlankFragmentName = function (complete) {
    // bug #480533 this test generates expected error under wwahost, but not under IE
        if (!isWinRTEnabled()) {
            complete();
            return;
        }

        var temp = document.createElement("div");
        WinJS.UI.Fragments.renderCopy("").
            then(function (docfrag) {
                LiveUnit.Assert.fail("expected error message loading blank fragment name");
            }).
            then(null, function (errorMsg) {
                LiveUnit.Assert.isNotNull(errorMsg);
            }).
            then(complete);
    }

    this.testFragmentNotFound = function (complete) {
    // bug #480533 this test generates expected error under wwahost, but not under IE
        if (!isWinRTEnabled()) {
            complete();
            return;
        }

        var temp = document.createElement("div");
        WinJS.UI.Fragments.renderCopy("bogusFragmentFileName.html").
            then(function (docfrag) {
            LiveUnit.Assert.fail("expected error message loading bogus fragment name");
        }).
            then(null, function (errorMsg) {
            LiveUnit.Assert.isNotNull(errorMsg);
        }).
        then(complete);
    }

    this.testFragmentFindmeInternal = function (complete) {
        // load fragment that includes body + script, then call function to access element
        var temp = document.createElement("div");
        document.body.appendChild(temp);

        WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentFindmeInternal.html").
        then(function (docfrag) {
            LiveUnit.Assert.isNotNull(docfrag, "docfrag isNotNull");
            temp.appendChild(docfrag);

            // call a function loaded via the fragment
            var x = findmeInternal();
            LiveUnit.Assert.isNotNull(x, "findmeInternal() return isNotNull");
        }).
        then(function () {
        }).
        then(null, unhandledTestError).
        then(function () {
            WinJS.Utilities.disposeSubTree(temp);
            document.body.removeChild(temp);
        }).
        then(complete);
    }

    if (WinJS.UI.DatePicker) {
        this.testFragmentControlCombo = function (complete) {
            // load fragment with combination of winJS + standard controls, wire up events and validate they fire
            var temp = document.createElement("div");
            document.body.appendChild(temp);

            WinJS.UI.Fragments.renderCopy("$(TESTDATA)/FragmentControlCombo.html").
            then(function (docfrag) {
                // initialization occurs here

                LiveUnit.Assert.isNotNull(docfrag, "docfrag isNotNull");
                temp.appendChild(docfrag);

                // initialize the loaded fragment contents which looks for fragment elements that were just appended to the document
                fcc_initialize();
            }).
            then(function () {
                // test the fragment here
                LiveUnit.Assert.areEqual(1, fcc_getCount(), "expecting count == 1 after calling initialize()");

                // make sure standard control events work
                LiveUnit.Assert.isNotNull(document.getElementById('fcc_testSelect'));
                fcc_fireOnchange(document.getElementById('fcc_testSelect'));
                LiveUnit.Assert.areEqual(2, fcc_getCount(), "expecting count == 2 after firing testSelect onchange");

                // make sure WinJS control events work
                LiveUnit.Assert.isNotNull(datepicker.querySelector('.win-datepicker-month'), "unable to query for month element");
                fcc_fireOnchange(datepicker.querySelector('.win-datepicker-month'));
                LiveUnit.Assert.areEqual(3, fcc_getCount(), "expecting count == 3 after firing onchange for month element");
            }).
            then(null, unhandledTestError).
            then(function () {
                // test clean
                WinJS.Utilities.disposeSubTree(temp);
                document.body.removeChild(temp);
            }).
            then(complete);
        };
    }

    this.testJSExecutesOnce = function (complete) {
        var fragfile;

        // there's couple differences in the code inside fragments runs under IE, so I'm using
        // two different fragment files:
        // a) under IE, global fragment code needs to wait for DOMContentLoaded before accessing the DOM
        // b) under IE, need to include a <script> tag to include base.js to define WinJS.Utilities.ready()
        //    The <script> tag generates error under wwahost:
        //       !!!!CorsicaTests.Fragments.testJSExecutesOnce: Cannot redefine non-configurable
        //       property 'oncontextchanged' when trying to append <script> tag for base.js
        if (isWinRTEnabled()) {
            fragfile = "$(TESTDATA)/FragmentJSExecutesOnce.html";
        } else {
            fragfile = "$(TESTDATA)/FragmentJSExecutesOnce(ie).html";
        }

        // load the same fragment file 3 times
        WinJS.UI.Fragments.renderCopy(fragfile).
        then(function() {
            return WinJS.UI.Fragments.renderCopy(fragfile);
        }).
        then(function() {
            return WinJS.UI.Fragments.renderCopy(fragfile);
        }).
        then(function () {
            // Verify fragment able to append an element
            var x = document.querySelectorAll('#FragmentJSExecutesOnce');
            LiveUnit.Assert.isTrue(x.length === 1, "expecting only 1 element with id='FragmentJSExecutesOnce'" );
        }).
        then(null, unhandledTestError).
        then(function () {
            // don't clean this up the element.  Code should only execute once so we need to leave an indicator
            // that the fragment has already been run once
            //    document.body.removeChild(document.getElementById('FragmentJSExecutesOnce'));
        }).
        then(complete);
    }

    this.testVariableAccess = function (complete) {
        // verify global JS code inside the fragment code can access a variable declared in the main page

        if (! isWinRTEnabled()) {
            // bug#496135  - fragments: global JS code executes twice under IE (IFrame)
            complete();
            return;
        }

        var fragfile = "$(TESTDATA)/FragmentVariableAccess.html";

        // note: global variables get stuck onto the window object
        window.myFragLoadCounter = window.myFragLoadCounter || 1;

        // load the same fragment file 3 times
        WinJS.UI.Fragments.renderCopy(fragfile).
        then(function() {
            return WinJS.UI.Fragments.renderCopy(fragfile);
        }).
        then(function() {
            return WinJS.UI.Fragments.renderCopy(fragfile);
        }).
        then(function () {
            // First time test runs, fragment loads and increments counter and expected counter is *1*.
            // If test is run again in the same script context (like from /debug mode), myFragLoadCounter has
            // already been defined so should still be *2* assuming fragment JS code doesn't get double executed
            LiveUnit.Assert.isTrue(myFragLoadCounter == 2, "expecting myFragLoadCounter == 2, got=" + myFragLoadCounter);
            //cleanup:
            window.myFragLoadCounter = null;
        }).
        then(null, unhandledTestError).
        then(complete);
    }

    this.testRenderImplProducingTracesForHref = function(complete) {
        var realWriteProfilerMark = WinJS.UI.Fragments._writeProfilerMark;
        WinJS.UI.Fragments._writeProfilerMark = function (mark) {
            WinJS.UI.Fragments._writeProfilerMark = realWriteProfilerMark;
            var prefix = "WinJS.UI.Fragments:render href='destination.html'[";
            var suffix = "],StartTM";
            LiveUnit.Assert.isTrue(mark.indexOf(prefix) == 0, "expecting to start with " + prefix + ", got " + mark);
            LiveUnit.Assert.isTrue(mark.indexOf(suffix, mark.length - suffix.length) !== -1, "expecting to end with " + suffix + ", got " + mark);
            complete();
        };

        try {
            WinJS.UI.Fragments.renderCopy("destination.html");
        } catch(e) {
        }
    };

    this.testRenderImplProducingTracesForElement = function(complete) {
        var realWriteProfilerMark = WinJS.UI.Fragments._writeProfilerMark;
        WinJS.UI.Fragments._writeProfilerMark = function (mark) {
            WinJS.UI.Fragments._writeProfilerMark = realWriteProfilerMark;
            var prefix = "WinJS.UI.Fragments:render id='testId' class='class1 class2'[";
            var suffix = "],StartTM";
            LiveUnit.Assert.isTrue(mark.indexOf(prefix) == 0, "expecting to start with " + prefix + ", got " + mark);
            LiveUnit.Assert.isTrue(mark.indexOf(suffix, mark.length - suffix.length) !== -1, "expecting to end with " + suffix + ", got " + mark);
            complete();
        };

        var element = document.createElement("div");
        element.id = "testId";
        element.className = "class1 class2";
        try {
            WinJS.UI.Fragments.renderCopy(element);
        } catch(e) {
        }
    };
};

LiveUnit.registerTestClass("CorsicaTests.Fragments");
