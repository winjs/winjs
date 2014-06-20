// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>

var SearchBoxTests = SearchBoxTests || {};

if (!window.Windows) {

    SearchBoxTests.WebOnlyTests = function () {
        "use strict";

        var Key = WinJS.Utilities.Key;

        // This is the setup function that will be called at the beginning of each test function.
        this.setUp = function searchBoxTest_setup() {
            setupMockWinRT();
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the SearchBox element");
            var searchBoxElement = document.createElement('div');
            searchBoxElement.id = "SearchBoxID";
            document.body.appendChild(searchBoxElement);
            var searchBox = new WinJS.UI.SearchBox(searchBoxElement);
            LiveUnit.LoggingCore.logComment("SearchBox has been instantiated.");
            LiveUnit.Assert.isNotNull(searchBox, "SearchBox element should not be null when instantiated.");
        };

        this.tearDown = function searchBoxTest_tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            cleanUpMockWinRT();
            var element = document.getElementById("SearchBoxID");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        };

        // Test functions
        this.testSuggestionsrequested = function searchBoxTest_suggestionsrequested() {
            // Verifies if test suggestion requested event fires when input changes in the search box.
            var searchBox = document.getElementById("SearchBoxID").winControl;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");
            searchBox.addEventListener("suggestionsrequested", function searchBoxTest_suggestionsrequested_listener(event) {
                LiveUnit.Assert.isFalse(eventFired, "suggestionsrequested fired multiple times");
                eventFired = true;
            });
            _mockWinRTManager._fireEvent("suggestionsrequested", { request: { searchSuggestionCollection: {} } });
            LiveUnit.Assert.isTrue(eventFired, "suggestionsrequested event was not fired");
        };

        this.testsearchfocusrequested = function searchBoxTest_searchfocusrequested() {
            // Verifies if focus requested event is fired when searchfocusrequested is enabled and
            // focus is put on input element.
            var searchBox = document.getElementById("SearchBoxID").winControl;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");
            searchBox.addEventListener("receivingfocusonkeyboardinput", function searchBoxTest_searchfocusrequested_listener(event) {
                LiveUnit.LoggingCore.logComment("Gotback event receivingfocusonkeyboardinput.");
                LiveUnit.Assert.isFalse(eventFired, "receivingfocusonkeyboardinput fired twice");
                eventFired = true;
            });
            searchBox.focusOnKeyboardInput = true;
            _mockWinRTManager._fireEvent("requestingfocusonkeyboardinput", { request: { searchSuggestionCollection: {} } });
            LiveUnit.Assert.isTrue(eventFired, "receivingfocusonkeyboardinput not fired");
            LiveUnit.Assert.areEqual(searchBox._inputElement, document.activeElement, "SearchBox input element did not get focus after focus requested event.");
        };

        this.testNosearchfocusrequested = function searchBoxTest_testNosearchfocusrequested() {
            // Verifies if no focus requested event is fired when searchfocusrequested is disabled
            var searchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            searchBox.addEventListener("receivingfocusonkeyboardinput", function searchBoxTest_testNosearchfocusrequested_listener(event) {
                LiveUnit.LoggingCore.logComment("Gotback event receivingfocusonkeyboardinput.");
                LiveUnit.Assert.isTrue(false, "receivingfocusonkeyboardinput is not supposed to fire.");
            });
            _mockWinRTManager._fireEvent("requestingfocusonkeyboardinput", { request: { searchSuggestionCollection: {} } });
        };

        this.testSuggestionsDisplayed = function searchBoxTest_testSuggestionsDisplayed() {
            // Verify whether all suggestions are rendered.
            var searchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");

            searchBox._inputElement.value = "a";
            searchBox._inputOrImeChangeHandler(null);

            var suggestion1 = searchBox._repeater.elementFromIndex(0);
            LiveUnit.Assert.isTrue((suggestion1.textContent.indexOf("Test query Suggestion1 test") >= 0), "Suggestion1 text is not displayed.");

            var suggestion2 = searchBox._repeater.elementFromIndex(1);
            LiveUnit.Assert.isTrue((suggestion2.textContent.indexOf("Test query Suggestion2 test") >= 0), "Suggestion1 text is not displayed.");

            var suggestion3 = searchBox._repeater.elementFromIndex(2);
            LiveUnit.Assert.isTrue((suggestion3.textContent.indexOf("Separator") >= 0), "Suggestion1 text is not displayed.");

            var suggestion4 = searchBox._repeater.elementFromIndex(3);
            LiveUnit.Assert.isTrue((suggestion4.textContent.indexOf("Test result Suggestion3 test") >= 0), "Suggestion1 text is not displayed.");
            LiveUnit.Assert.isTrue((suggestion4.textContent.indexOf("Query suggestion3 detailed text") >= 0), "Suggestion1 detailed text is not displayed.");

            var suggestion5 = searchBox._repeater.elementFromIndex(4);
            LiveUnit.Assert.isTrue((suggestion5.textContent.indexOf("Test result Suggestion4 test") >= 0), "Suggestion1 text is not displayed.");
            LiveUnit.Assert.isTrue((suggestion5.textContent.indexOf("Query suggestion4 detailed text") >= 0), "Suggestion1 detailed text is not displayed.");
        };

        this.testQuerySuggestionSelected = function searchBoxTest_testQuerySuggestionSelected() {
            var searchBox = document.getElementById("SearchBoxID").winControl;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");
            searchBox.addEventListener("querysubmitted", function searchBoxTest_querySubmitted_listener(event) {
                LiveUnit.Assert.areEqual("Test query Suggestion1 test", event.detail.queryText, "Query text not matching suggestion text");
                LiveUnit.Assert.isFalse(eventFired, "querysubmitted fired multiple times");
                eventFired = true;
            });
            searchBox._inputElement.value = "a";
            searchBox._inputOrImeChangeHandler(null);
            // Click on the first suggestion.
            searchBox._repeater.elementFromIndex(0).click();
            LiveUnit.Assert.isTrue(eventFired, "querysubmitted event was not fired");
        };

        this.testResultSuggestionSelected = function searchBoxTest_testResultSuggestionSelected() {
            var searchBox = document.getElementById("SearchBoxID").winControl;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");

            searchBox.addEventListener("resultsuggestionchosen", function searchBoxTest_resultsuggestionchosen_listener(event) {
                LiveUnit.Assert.areEqual("tag3", event.detail.tag, "Query text not matching suggestion tag");
                LiveUnit.Assert.isFalse(eventFired, "resultsuggestionchosen fired multiple times");
                eventFired = true;
            });

            searchBox._inputElement.value = "a";
            searchBox._inputOrImeChangeHandler(null);

            // Click on the first suggestion.
            searchBox._repeater.elementFromIndex(3).click();
            LiveUnit.Assert.isTrue(eventFired, "resultsuggestionchosen event was not fired");
        };

        this.testChooseSuggestionOnEnterEnabled = function searchBoxTest_ChooseSuggestionOnEnterEnabled(complete) {
            var searchBox = document.getElementById("SearchBoxID").winControl;
            searchBox.chooseSuggestionOnEnter = true;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");

            searchBox.addEventListener("querysubmitted", function searchBoxTest_querysubmitted_listener(event) {
                LiveUnit.Assert.areEqual("Test query Suggestion1 test", event.detail.queryText, "Query text not matching input");
                LiveUnit.Assert.areEqual("ja-JP", event.detail.language, "Query text language not matching input");
                LiveUnit.Assert.isFalse(eventFired, "querysubmitted fired multiple times");
                eventFired = true;
            });
            searchBox._inputElement.value = "Test query";
            searchBox._inputOrImeChangeHandler(null);
            searchBox._inputElement.focus();
            WinJS.Promise.timeout().done(function () {
                CommonUtilities.keydown(searchBox._inputElement, Key.enter, "ja-JP");
                LiveUnit.Assert.isTrue(eventFired, "querysubmitted event was not fired");
                complete();
            });
        };

        this.testSetLocalContentSuggestionSettings = function searchBoxTest_testSetLocalContentSuggestionSettings() {
            var searchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            var localSettings = { Test: "Object1" };
            searchBox.setLocalContentSuggestionSettings(localSettings);
            LiveUnit.Assert.areEqual(localSettings, _mockWinRTManager._localSettings, "Unable to set searchBox.setLocalContentSuggestionSettings");
        };

        // Todo: Move this to basic tests once it passes in local context.
        this.testSearchHistoryContext = function searchBoxTest_testSearchHistoryContext() {
            var searchBox = document.getElementById("SearchBoxID").winControl;
            var testContext = "Test Context";
            searchBox.searchHistoryContext = testContext;
            LiveUnit.Assert.areEqual(testContext, searchBox.searchHistoryContext, "Unable to set searchBox.searchHistoryContext");
        };

        // Todo: Move this to basic tests once it passes in local context.
        this.testSearchHistoryDisabled = function searchBoxTest_testSearchHistoryDisabled() {
            var searchBox = document.getElementById("SearchBoxID").winControl;
            LiveUnit.LoggingCore.logComment("Waiting for control...");
            var testContext = "Test Context";
            searchBox.searchHistoryDisabled = true;
            LiveUnit.Assert.areEqual(true, searchBox.searchHistoryDisabled, "Unable to set searchBox.searchHistoryDisabled");
            searchBox.searchHistoryDisabled = false;
            LiveUnit.Assert.areEqual(false, searchBox.searchHistoryDisabled, "Unable to set searchBox.searchHistoryDisabled");
        };

        // Mock winrt classes

        var SearchSuggestion = WinJS.Class.define(function (kind, text, tag, detailText, image, imageAlternateText) {

            this._kind = kind;
            this._text = text;
            this._tag = tag;
            this._detailText = detailText;
            this._image = image;
            this._imageAlternateText = imageAlternateText;

        }, {

            kind: {
                get: function () {
                    return this._kind;
                },
                set: function (value) {
                    this._kind = value;
                }
            },

            text: {
                get: function () {
                    return this._text;
                },
                set: function (value) {
                    this._text = value;
                }
            },

            tag: {
                get: function () {
                    return this._tag;
                },
                set: function (value) {
                    this._tag = value;
                }
            },

            detailText: {
                get: function () {
                    return this._detailText;
                },
                set: function (value) {
                    this._detailText = value;
                }
            },

            image: {
                get: function () {
                    return this._image;
                },
                set: function (value) {
                    this._image = value;
                }
            },

            imageAlternateText: {
                get: function () {
                    return this._imageAlternateText;
                },
                set: function (value) {
                    this._imageAlternateText = value;
                }
            },

        });

        function updateHits(query, item) {
            item.hits = [];
            if (query.length > item.text.length) {
                return;
            }

            var i = 0;
            while (i < item.text.length) {
                var hitPos = item.text.indexOf(query, i);
                if (hitPos >= 0) {
                    item.hits.push({ StartPosition: hitPos, Length: query.length });
                    i = hitPos + 1;
                }
                else {
                    break;
                }
            }
        }

        function insertSuggestions(vector, queryText) {
            // Add suggestions to be displayed.
            var suggestion1 = new SearchSuggestion(
                    0,
                    "Test query Suggestion1 test",
                    "tag1",
                    null,
                    null,
                    null);

            var suggestion2 = new SearchSuggestion(
                0,
                "Test query Suggestion2 test",
                "tag2",
                null,
                null,
                null);

            var suggestion3 = new SearchSuggestion(
                2,
                "Separator",
                null,
                null,
                null,
                null);

            var suggestion4 = new SearchSuggestion(
                1,
                "Test result Suggestion3 test",
                "tag3",
                "Query suggestion3 detailed text",
                null,
                null);
            suggestion4.imageUrl = "testImageUrl4.jpg";

            var suggestion5 = new SearchSuggestion(
                1,
                "Test result Suggestion4 test",
                "tag4",
                "Query suggestion4 detailed text",
                null,
                null);
            suggestion5.imageUrl = "testImageUrl5.jpg";

            vector._insertElement(0, suggestion1);
            vector._insertElement(1, suggestion2);
            vector._insertElement(2, suggestion3);
            vector._insertElement(3, suggestion4);
            vector._insertElement(4, suggestion5);
        }

        function updateHitsForAllSuggestions(vector, queryText) {
            for (var i = 0; i < vector.length; i++) {
                // Skip separator
                if (vector[i].kind != 2) {
                    updateHits(queryText, vector[i]);
                    vector._updateElement(i);
                }
            }
        }

        function removeSuggestions(vector, queryText) {
            // Remove last 5 suggestions
            vector._removeElement(vector.length - 1);
            vector._removeElement(vector.length - 1);
            vector._removeElement(vector.length - 1);
            vector._removeElement(vector.length - 1);
            vector._removeElement(vector.length - 1);
        }

        function createSuggestionVector() {
            var SearchSuggestions = [];
            SearchSuggestions._events = {};

            window.MockSearchSuggestions = SearchSuggestions;

            SearchSuggestions._resetVector = function () {
                this.splice(0, this.length);
                this._fireEvent("vectorchanged", {
                    collectionChange: Windows.Foundation.Collections.CollectionChange.reset,
                    index: 0
                });
            };
            SearchSuggestions._insertElement = function (index, data) {
                this.splice(index, 0, data);
                this._fireEvent("vectorchanged", {
                    collectionChange: Windows.Foundation.Collections.CollectionChange.itemInserted,
                    index: index
                });
            };
            SearchSuggestions._removeElement = function (index) {
                this.splice(index, 1);
                this._fireEvent("vectorchanged", {
                    collectionChange: Windows.Foundation.Collections.CollectionChange.itemRemoved,
                    index: index
                });
            };
            SearchSuggestions._updateElement = function (index) {
                this._fireEvent("vectorchanged", {
                    collectionChange: Windows.Foundation.Collections.CollectionChange.itemChanged,
                    index: index
                });
            };
            SearchSuggestions._fireEvent = function (type, eventObject) {
                var eventListeners = this._events[type] || [];
                for (var i = 0; i < eventListeners.length; i++) {
                    eventListeners[i](eventObject);
                }
            };
            SearchSuggestions.addEventListener = function (type, callback) {
                this._events[type] = this._events[type] || [];
                this._events[type].push(callback);
            };
            SearchSuggestions.removeEventListener = function (type, callback) {
                var index = this._events[type].indexOf(callback);
                if (index !== -1) {
                    this._events[type].splice(index, 1);
                }
            };
            return SearchSuggestions;
        }

        var SearchSuggestionManager = WinJS.Class.define(function () {
            this._searchSuggestions = createSuggestionVector();
            this._events = {};
        }, {
            suggestions: {
                get: function () {
                    return this._searchSuggestions;
                }
            },
            _fireEvent: function (type, eventObject) {
                var eventListeners = this._events[type] || [];
                for (var i = 0; i < eventListeners.length; i++) {
                    eventListeners[i](eventObject);
                }
            },
            addEventListener: function (type, callback) {
                this._events[type] = this._events[type] || [];
                this._events[type].push(callback);
            },
            removeEventListener: function (type, callback) {
                var index = this._events[type].indexOf(callback);
                if (index !== -1) {
                    this._events[type].splice(index, 1);
                }
            },
            setQuery: function MockWinrt_setQuery(queryText, language, linguisticDetails) {
                if (queryText.length < ((this._searchSuggestions.length) / 5)) {
                    removeSuggestions(this._searchSuggestions, queryText);
                }
                else if (queryText != "") {
                    insertSuggestions(this._searchSuggestions, queryText);
                }
                updateHitsForAllSuggestions(this._searchSuggestions, queryText);
            },
            addToHistory: function MockWinrt_addToHistory(queryText, language) {
            },
            setLocalContentSuggestionSettings: function MockWinrt_setLocalContentSuggestionSettings(settings) {
                this._localSettings = settings;
            }
        });

        function setupMockWinRT() {
            if (!window._mockWinRTManager) {
                window._mockWinRTManager = null;
                window.Windows = {
                    ApplicationModel: {
                        Search: {
                            Core: {
                                SearchSuggestionManager: function () {
                                    _mockWinRTManager = new SearchSuggestionManager();
                                    return _mockWinRTManager;
                                }
                            }
                        }
                    },
                    Foundation: {
                        Collections: {
                            CollectionChange: {
                                reset: 'reset',
                                itemInserted: 'itemInserted',
                                itemRemoved: 'itemRemoved',
                                itemChanged: 'itemChanged',
                            }
                        }
                    }
                };
                window._prevValueHasWinrt = WinJS.Utilities.hasWinRT;
                WinJS.Utilities._setHasWinRT(false);
            }
        }

        function cleanUpMockWinRT() {
            if (window._mockWinRTManager) {
                delete window._mockWinRTManager;
                delete window.Windows;
                WinJS.Utilities._setHasWinRT(window._prevValueHasWinrt);
                delete window._prevValueHasWinrt;
            }
        }
    };

    LiveUnit.registerTestClass("SearchBoxTests.WebOnlyTests");
}
