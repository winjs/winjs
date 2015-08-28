// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>

declare var Windows;

module SearchBoxTests {
    "use strict";

    function waitForSuggestionFlyoutRender(sb) {
        return new WinJS.Promise(function (c) {
            function register() {
                sb._repeater.addEventListener("iteminserted", handle);
                sb._repeater.addEventListener("itemremoved", handle);
            }

            function unregister() {
                sb._repeater.removeEventListener("iteminserted", handle);
                sb._repeater.removeEventListener("itemremoved", handle);
            }

            function handle() {
                unregister();
                WinJS.Promise.timeout().then(c);
            }

            register();
        });
    }

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

        testLegacyClassNames(complete) {
            var searchBox: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("SearchBoxID").winControl;
            searchBox.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendQuerySuggestions(["Test query Suggestion1 test", "Test query Suggestion2 test"]);
                e.detail.searchSuggestionCollection.appendSearchSeparator("Separator");
                e.detail.searchSuggestionCollection.appendResultSuggestion("Test result Suggestion4 test", "Query suggestion4 detailed text", "tag4", WinJS.UI.SearchBox.createResultSuggestionImage("http://fakeurl"), "");

                waitForSuggestionFlyoutRender(searchBox).then(() => {
                    LiveUnit.Assert.isTrue(searchBox.element.classList.contains("win-searchbox"));
                    LiveUnit.Assert.isTrue(searchBox.element.classList.contains("win-searchbox-input-focus"));

                    var el: HTMLElement = <any>searchBox.element.querySelector(".win-searchbox-input");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-input"));

                    el = <any>searchBox.element.querySelector(".win-searchbox-flyout");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-flyout"));

                    el = <any>searchBox.element.querySelector(".win-searchbox-suggestion-result");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-suggestion-result"));

                    el = <any>searchBox.element.querySelector(".win-searchbox-suggestion-result-text");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-suggestion-result-text"));

                    el = <any>searchBox.element.querySelector(".win-searchbox-suggestion-result-detailed-text");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-suggestion-result-detailed-text"));

                    el = <any>searchBox.element.querySelector(".win-searchbox-suggestion-query");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-suggestion-query"));

                    el = <any>searchBox.element.querySelector(".win-searchbox-suggestion-separator");
                    LiveUnit.Assert.isTrue(el && el.classList.contains("win-autosuggestbox-suggestion-separator"));

                    searchBox.disabled = true;
                    LiveUnit.Assert.isTrue(searchBox.element.classList.contains("win-searchbox-disabled"));

                    complete();
                });
            });
            searchBox._inputElement.value = "a";
            searchBox._inputElement.focus();
        }

        testInitializeDisabledSearchBox() {
            var sb = new WinJS.UI.SearchBox(null, { disabled: true });
        }
    };
    
    var disabledTestRegistry = {
        testFocusOnKeyboardInputBringsUpSuggestions: Helper.Browsers.firefox,
        testLegacyClassNames: Helper.Browsers.firefox
    };
    Helper.disableTests(SearchBoxTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("SearchBoxTests.SearchBoxTests");