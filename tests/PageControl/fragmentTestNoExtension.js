// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/util.ts" />
/// <deploy src="../TestData/" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.FragmentTestNoExtension = function () {
    "use strict";
    // tests in this file use the "FragmentNoFileExtension" which causes problems trying to debug inside VS
    // since this fragment is only deployed for tests that use testdata.  Tests that don't use test data won't
    // deploy "FragmentNoFileExtension" and the webunit*.wwaproj file doesn't include it.
    //
    // If you want to debug this in VS, you'll need to explicitly add "FragmentNoFileExtension" to the
    // VS project before deploying APPX via VS.

    this.xtestFragmentNoFileExtension = function (complete) {
    // bug# 478702 fragments: unable to load fragment file without extension (silently fails)
        // load from a fragment file that doesn't have any extension
        WinJS.UI.Fragments.clearCache();

        var temp = document.createElement("span");

        WinJS.UI.Fragments.render("FragmentNoFileExtension", temp).
            then(function (docfrag) {
                LiveUnit.Assert.isNotNull(docfrag, "docfrag should never be null after successful render");
                LiveUnit.Assert.areEqual(1, temp.children.length, "expect #children == 1");
                LiveUnit.Assert.areEqual("common header element", temp.children[0].textContent, "expected textContent == 'common header element'");
            }).
            then(null, unhandledTestError).
            then(complete);
    }

};

LiveUnit.registerTestClass("CorsicaTests.FragmentTestNoExtension");