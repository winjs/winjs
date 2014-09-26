// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>

declare var Windows;

module SearchBoxTests {
    "use strict";

    export class SearchBoxTests {
        setUp() {
            // This is the setup function that will be called at the beginning of each test function.
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the SearchBox element");
            var searchBoxElement = document.createElement('div');
            searchBoxElement.id = "SearchBoxID";
            document.body.appendChild(searchBoxElement);
            var searchBox: WinJS.UI.SearchBox = new WinJS.UI.SearchBox(searchBoxElement, { searchHistoryDisabled: true });
            LiveUnit.LoggingCore.logComment("SearchBox has been instantiated.");
            LiveUnit.Assert.isNotNull(searchBox, "SearchBox element should not be null when instantiated.");
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("SearchBoxID");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }

        // Test functions
        testInitTest = function () {
            var searchBox: WinJS.UI.SearchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");

            // verify search glyph
            LiveUnit.Assert.isNotNull(searchBox["_buttonElement"]);
        };

        testPublicApiSurfaceProperties() {
            // This test only verifies the API surface. It does not test the functionality.
            var searchBox: WinJS.UI.SearchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            function verifyProperty(propertyName, propertyType) {
                LiveUnit.LoggingCore.logComment("Verifying that property " + propertyName + " exists");
                if (searchBox[propertyName] === undefined) {
                    LiveUnit.Assert.fail(propertyName + " missing from SearchBox");
                }

                LiveUnit.Assert.isNotNull(searchBox[propertyName]);
                LiveUnit.Assert.areEqual(propertyType, typeof (searchBox[propertyName]), propertyName + " exists on SearchBox, but it isn't the right property type");
            }
            verifyProperty("focusOnKeyboardInput", "boolean");
        }

        testSimpleFunctions() {
            var searchBox: WinJS.UI.SearchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");

            LiveUnit.Assert.areEqual(false, searchBox.focusOnKeyboardInput, "Incorrect default value for focusOnKeyboardInput");
            var focusOnKeyboardInput = true;
            searchBox.focusOnKeyboardInput = focusOnKeyboardInput;
            LiveUnit.Assert.areEqual(focusOnKeyboardInput, searchBox.focusOnKeyboardInput, "Unable to set searchBox.queryText");

            LiveUnit.Assert.isFalse(searchBox.disabled, "Incorrect default value for disabled");
            LiveUnit.Assert.isFalse(searchBox["_buttonElement"].disabled, "Incorrect default value for disabled for button element.");
            searchBox.disabled = true;
            LiveUnit.Assert.isTrue(searchBox.disabled, "Unable to set searchBox.disabled");
            LiveUnit.Assert.isTrue(searchBox["_buttonElement"].disabled, "SearchBox did not disable button element.");
        }

        testQuerySubmitted() {
            var searchBox: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("SearchBoxID").winControl;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");
            searchBox.addEventListener("querysubmitted", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.areEqual("Test query", event.detail.queryText, "Query text not matching input");
                eventFired = true;
            });

            searchBox._inputElement.value = "Test query";
            searchBox["_buttonElement"].click();
            LiveUnit.Assert.isTrue(eventFired, "QuerySubmitted event was not fired");
        }

        testFocusOnKeyboardInputBringsUpSuggestions(complete) {
            if (WinJS.Utilities.hasWinRT) {
                LiveUnit.LoggingCore.logComment("This test tests web implementation of Type-To-Search and has no value when WinRT is available");
                complete();
                return;
            }

            var searchBox: WinJS.UI.SearchBox = document.getElementById("SearchBoxID").winControl;
            searchBox.focusOnKeyboardInput = true;
            searchBox.addEventListener("suggestionsrequested", function (e) {
                complete();
            });
            Helper.keydown(document, WinJS.Utilities.Key.t);
        }

        testFocusOnKeyboardInputDoesNotBringUpSuggestionsWhenDisabled(complete) {
            if (WinJS.Utilities.hasWinRT) {
                LiveUnit.LoggingCore.logComment("This test tests web implementation of Type-To-Search and has no value when WinRT is available");
                complete();
                return;
            }

            var searchBox: WinJS.UI.SearchBox = document.getElementById("SearchBoxID").winControl;
            searchBox.addEventListener("suggestionsrequested", function (e) {
                LiveUnit.Assert.fail("suggestions should not be requested");
            });
            Helper.keydown(document, WinJS.Utilities.Key.t);
            WinJS.Promise.timeout().done(complete);
        }
    };
}
LiveUnit.registerTestClass("SearchBoxTests.SearchBoxTests");