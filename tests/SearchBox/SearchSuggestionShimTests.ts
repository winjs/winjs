// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../TestLib/util.ts" />

module SearchBoxTests {

    var SSM = Helper.require("WinJS/Controls/SearchBox/_SearchSuggestionManagerShim");

    function createSSM(suggestionsRequestedCallback?, vectorChangedCallback?) {
        var ssm = new SSM._SearchSuggestionManagerShim();
        if (suggestionsRequestedCallback) {
            ssm.addEventListener("suggestionsrequested", suggestionsRequestedCallback);
        }
        if (vectorChangedCallback) {
            ssm.suggestions.addEventListener("vectorchanged", vectorChangedCallback);
        }
        return ssm;
    }

    function suggestionsAreEqual(expectedSuggestions, ssm, errorMessage) {
        var array = ssm.suggestions.map(function (item) {
            return item.text;
        });
        Helper.Assert.areArraysEqual(expectedSuggestions, array, errorMessage);
    }

    export class SuggestionShimTests  {

       testSuggestionVectorShim() {
            var numFired = 0;
            var expectedNumFired = 0;
            var expectedCollectionChange = null;
            var expectedIndex = null;

            var ssm = createSSM(null, function vectorChangedCallback(e) {
                LiveUnit.Assert.areEqual(expectedCollectionChange, e.detail.collectionChange);
                LiveUnit.Assert.areEqual(expectedIndex, e.detail.index);
                numFired++;
            });
            expectedCollectionChange = SSM._CollectionChange.itemInserted;
            expectedIndex = 0;
            expectedNumFired++;
            ssm.suggestions.insert(0, "data");
            LiveUnit.Assert.areEqual(expectedNumFired, numFired);

            expectedCollectionChange = SSM._CollectionChange.itemInserted;
            expectedIndex = 1;
            expectedNumFired++;
            ssm.suggestions.insert(1, "data");
            LiveUnit.Assert.areEqual(expectedNumFired, numFired);

            expectedCollectionChange = SSM._CollectionChange.itemRemoved;
            expectedIndex = 1;
            expectedNumFired++;
            ssm.suggestions.remove(1);
            LiveUnit.Assert.areEqual(expectedNumFired, numFired);

            expectedCollectionChange = SSM._CollectionChange.itemRemoved;
            expectedIndex = 0;
            expectedNumFired++;
            ssm.suggestions.remove(0);
            LiveUnit.Assert.areEqual(expectedNumFired, numFired);

            expectedCollectionChange = SSM._CollectionChange.reset;
            expectedIndex = 0;
            expectedNumFired++;
            ssm.suggestions.reset();
            LiveUnit.Assert.areEqual(expectedNumFired, numFired);
        }

        testSearchSuggestionCollectionShim() {
            var suggestion1 = "test suggestion 1";
            var suggestion2 = "test suggestion 2";
            var suggestion3 = "test suggestion 3";
            var separator1 = "test separator 1";
            var separator2 = "test separator 2";

            var resultText = "text";
            var resultDetail = "text detail";
            var resultTag = { someProp: 1 };
            var resultImageUrl = "url";
            var resultImageAltText = "image alt text";

            var ssm = createSSM(function suggestionsRequestedCallback(e) {
                e.detail.request.searchSuggestionCollection.appendQuerySuggestion(suggestion1);
                e.detail.request.searchSuggestionCollection.appendSearchSeparator(separator1);
                e.detail.request.searchSuggestionCollection.appendQuerySuggestions([suggestion2, suggestion3]);
                e.detail.request.searchSuggestionCollection.appendSearchSeparator(separator2);
                e.detail.request.searchSuggestionCollection.appendResultSuggestion(resultText, resultDetail, resultTag, resultImageUrl, resultImageAltText);
            });
            ssm.setQuery("");

            var actualValues = ssm.suggestions.map(function (item) {
                return item.text + item.kind;
            });

            Helper.Assert.areArraysEqual([
                suggestion1 + SSM._SearchSuggestionKind.Query,
                separator1 + SSM._SearchSuggestionKind.Separator,
                suggestion2 + SSM._SearchSuggestionKind.Query,
                suggestion3 + SSM._SearchSuggestionKind.Query,
                separator2 + SSM._SearchSuggestionKind.Separator,
                resultText + SSM._SearchSuggestionKind.Result
            ], actualValues, "Suggestion manager messages should match");

            var resultSuggestion = ssm.suggestions[5];
            LiveUnit.Assert.areEqual(resultDetail, resultSuggestion.detailText);
            LiveUnit.Assert.areEqual(resultTag, resultSuggestion.tag);
            LiveUnit.Assert.areEqual(resultImageUrl, resultSuggestion.imageUrl);
            LiveUnit.Assert.areEqual(resultImageAltText, resultSuggestion.imageAlternateText);
            LiveUnit.Assert.areEqual(null, resultSuggestion.image);
        }

        testAsyncSearchSuggestionsRequestedHandler(complete) {
            var syncSuggestion = "sync suggestion";
            var asyncSuggestion = "async suggestion";

            var deferralCompletion = new WinJS._Signal();
            var ssm = createSSM(function suggestionsRequestedCallback(e) {
                var deferral = e.detail.request.getDeferral();
                e.detail.request.searchSuggestionCollection.appendQuerySuggestion(syncSuggestion);
                WinJS.Promise.timeout(0).then(function () {
                    e.detail.request.searchSuggestionCollection.appendQuerySuggestion(asyncSuggestion);
                    deferral.complete();
                    deferralCompletion.complete();
                });
            });
            ssm.setQuery("");
            LiveUnit.Assert.areEqual(0, ssm.suggestions.length);

            deferralCompletion.promise.done(function () {
                suggestionsAreEqual([syncSuggestion, asyncSuggestion], ssm, "suggestions should match");
                complete();
            });
        }

        testHistoryOrderingPolicies() {
            // This test tests multiple history/suggestion ordering policies where each policy requires
            // a very specific starting state of the SSM. Instead of authoring a test for each policy,
            // the order in which policies are tested reduces alot of code duplication and maintenance.
            // The idea here is to have policy 1's final state be the initial state of policy 2, whose
            // final state is the initial state of policy 3, and so on.

            var query1 = "test history 1";
            var query2 = "test history 2";
            var query3 = "test history 3";
            var suggestion1 = "test suggestion 1";
            var suggestion2 = "test suggestion 2";
            var suggestion3 = "test suggestion 3";
            var inputQuery = "test";

            var ssm = createSSM(function suggestionsRequestedCallback(e) {
                LiveUnit.Assert.areEqual(inputQuery, e.detail.request.queryText);
                e.detail.request.searchSuggestionCollection.appendQuerySuggestions([suggestion1, suggestion2, suggestion3]);
            });

            // 1: History entry appears
            ssm.addToHistory(query1);
            ssm.setQuery(inputQuery);
            suggestionsAreEqual([
                query1,
                suggestion1,
                suggestion2,
                suggestion3
            ], ssm, "Assert failures in policy 1");

            // 2: Most recent history entry goes on top
            ssm.addToHistory(query3);
            ssm.addToHistory(query2);
            suggestionsAreEqual([
                query2,
                query3,
                query1,
                suggestion1,
                suggestion2,
                suggestion3
            ], ssm, "Assert failures in policy 2");

            // 3: Suggestion entries don't duplicate entries and reorders
            ssm.addToHistory(suggestion2);
            suggestionsAreEqual([
                suggestion2,
                query2,
                query3,
                query1,
                suggestion1,
                suggestion3
            ], ssm, "Assert failures in policy 3");

            // 4: History doesn't duplicate entries and reorders
            ssm.addToHistory(query1);
            var policy4ExpectedState = [
                query1,
                suggestion2,
                query2,
                query3,
                suggestion1,
                suggestion3
            ];
            suggestionsAreEqual(policy4ExpectedState, ssm, "Assert failures in policy 4");

            // 5: Disabling history restores suggestions
            ssm.searchHistoryEnabled = false;
            ssm.setQuery(inputQuery);
            var policy5ExpectedState = [
                suggestion1,
                suggestion2,
                suggestion3
            ];
            suggestionsAreEqual(policy5ExpectedState, ssm, "Assert failures in policy 5");

            // 6: Re-enabling history restores state back to policy 4
            ssm.searchHistoryEnabled = true;
            ssm.setQuery(inputQuery);
            suggestionsAreEqual(policy4ExpectedState, ssm, "Assert failures in policy 6");

            // 7: Switching history context restores suggestions (same as policy 5)
            ssm.searchHistoryContext = "another context";
            ssm.setQuery(inputQuery);
            suggestionsAreEqual(policy5ExpectedState, ssm, "Assert failures in policy 7");

            // 8: Restoring history context restores state back to scenario 4/6
            ssm.searchHistoryContext = "";
            ssm.setQuery(inputQuery);
            suggestionsAreEqual(policy4ExpectedState, ssm, "Assert failures in policy 8");

            // 9: Non-prefix matching query does not show history and restores suggestions (same as policy 5)
            var origInputQuery = inputQuery;
            inputQuery = origInputQuery.slice(1);
            ssm.setQuery(inputQuery);
            suggestionsAreEqual(policy5ExpectedState, ssm, "Assert failures in policy 9");
            inputQuery = origInputQuery;

            // 10: Clearing history restores suggestions (same as policy 5, but irreversible)
            ssm.clearHistory();
            ssm.setQuery(inputQuery);
            suggestionsAreEqual(policy5ExpectedState, ssm, "Assert failures in policy 10");
        }

        testSSMDoesNotCommitBlankQueryToHistory() {
            var ssm = createSSM(null, function (e) {
                LiveUnit.Assert.fail("SSM should not commit blank query to history");
            });

            ssm.addToHistory("");
        }
    };
}
LiveUnit.registerTestClass("SearchBoxTests.SuggestionShimTests");
