// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>

declare var Windows;

module AutoSuggestBoxTests {
    "use strict";

    var Key = WinJS.Utilities.Key;
    var AutoSuggestBox = <typeof WinJS.UI.PrivateAutoSuggestBox> WinJS.UI.AutoSuggestBox;

    function waitForSuggestionFlyoutRender(asb) {
        return new WinJS.Promise(function (c) {
            function register() {
                asb._repeater.addEventListener("iteminserted", handle);
                asb._repeater.addEventListener("itemremoved", handle);
            }

            function unregister() {
                asb._repeater.removeEventListener("iteminserted", handle);
                asb._repeater.removeEventListener("itemremoved", handle);
            }

            function handle() {
                unregister();
                WinJS.Promise.timeout().then(c);
            }

            register();
        });
    }

    // Util functions
    function createCustomEvent(type, details?) {
        var ev = <CustomEvent> document.createEvent("CustomEvent");
        ev.initCustomEvent(type, true, true, details);
        return ev;
    }

    function mockInputContext(inputElement, compositionStartOffset, compositionEndOffset, alternatives) {
        //mock msGetInputContext so we can have more control over the events
        inputElement.msGetInputContext = function () {
            return {
                getCompositionAlternatives: function () {
                    return alternatives;
                },
                getCandidateWindowClientRect: function () {
                    return {
                        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0
                    };
                },
                compositionEndOffset: compositionEndOffset,
                compositionStartOffset: compositionStartOffset
            }
        };
    };

    function verifyLinguisticDetails(linguisticDetails, expectedCompStart, expectedCompLength, expectedAlternatives) {
        LiveUnit.Assert.isNotNull(linguisticDetails);
        LiveUnit.Assert.isNotNull(linguisticDetails.queryTextCompositionStart);
        LiveUnit.Assert.areEqual(expectedCompStart, linguisticDetails.queryTextCompositionStart, "Unexpected composition string start.");
        LiveUnit.Assert.isNotNull(linguisticDetails.queryTextCompositionLength);
        LiveUnit.Assert.areEqual(expectedCompLength, linguisticDetails.queryTextCompositionLength, "Unexpected composition string length.");
        LiveUnit.Assert.isNotNull(linguisticDetails.queryTextAlternatives);
        LiveUnit.Assert.areEqual(expectedAlternatives.length, linguisticDetails.queryTextAlternatives.length, "Unexpected number of alternatives");
        for (var i = 0; i < expectedAlternatives.length; i++) {
            LiveUnit.Assert.areEqual(expectedAlternatives[i], linguisticDetails.queryTextAlternatives[i], "Unexpected alternative value");
        }
    };

    export class AutoSuggestBoxTests {
        setUp() {
            // This is the setup function that will be called at the beginning of each test function.
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the ASB element");
            var asbElement = document.createElement('div');
            asbElement.id = "ASBID";
            document.body.appendChild(asbElement);
            var asb: WinJS.UI.PrivateAutoSuggestBox = new AutoSuggestBox(asbElement, { searchHistoryDisabled: true });
            LiveUnit.LoggingCore.logComment("ASB has been instantiated.");
            LiveUnit.Assert.isNotNull(asb, "ASB element should not be null when instantiated.");
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("ASBID");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }
        
        // Test functions
        testInitTest = function () {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");

            // verify asb element
            LiveUnit.Assert.isNotNull(asb.element);

            // verify input element
            LiveUnit.Assert.isNotNull(asb._inputElement);

            // verify flyout
            LiveUnit.Assert.isNotNull(asb._flyoutElement);

            // verify repeater
            LiveUnit.Assert.isNotNull(asb._repeaterElement);
        };

        testASBNullInstantiation = function () {
            // Test ASB Instantiation with null element
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the ASB with null element");
            var asb = new AutoSuggestBox(null);
            LiveUnit.Assert.isNotNull(asb, "ASB instantiation was null when sent a null element.");
        }

        testASBMultipleInstantiation() {
            // Test multiple instantiation of the same ASB DOM element
            this.testASBMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };

            // Get the ASB element from the DOM
            var asbElement = <HTMLElement>document.querySelector("#ASBID");
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the ASB element again");
            new AutoSuggestBox(asbElement);
        }

        testPublicApiSurfaceFunctions() {
            // This test only verifies the API surface. It does not test the functionality.
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Waiting for control...");
            LiveUnit.LoggingCore.logComment("Verifying...");
            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (asb[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from ASB");
                }

                LiveUnit.Assert.isNotNull(asb[functionName]);
                LiveUnit.Assert.areEqual("function", typeof (asb[functionName]), functionName + " exists on ASB, but it isn't a function");
            }
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
            verifyFunction("dispose");
            verifyFunction("setLocalContentSuggestionSettings");
        }

        testPublicApiSurfaceProperties() {
            // This test only verifies the API surface. It does not test the functionality.
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            function verifyProperty(propertyName, propertyType) {
                LiveUnit.LoggingCore.logComment("Verifying that property " + propertyName + " exists");
                if (asb[propertyName] === undefined) {
                    LiveUnit.Assert.fail(propertyName + " missing from ASB");
                }

                LiveUnit.Assert.isNotNull(asb[propertyName]);
                LiveUnit.Assert.areEqual(propertyType, typeof (asb[propertyName]), propertyName + " exists on ASB, but it isn't the right property type");
            }
            verifyProperty("chooseSuggestionOnEnter", "boolean");
            verifyProperty("searchHistoryContext", "string");
            verifyProperty("searchHistoryDisabled", "boolean");
            verifyProperty("queryText", "string");
            verifyProperty("placeholderText", "string");
            verifyProperty("disabled", "boolean");
        }

        testASBDispose() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = new AutoSuggestBox();
            LiveUnit.Assert.isTrue(asb.dispose);
            LiveUnit.Assert.isFalse(asb._disposed);
            asb.dispose();
            LiveUnit.Assert.isTrue(asb._disposed);
            asb.dispose();
        }

        testASBDisposeSubTree() {
            var asbParent = document.createElement('div');
            var asbElement = document.createElement('div');
            var asb: WinJS.UI.PrivateAutoSuggestBox = new AutoSuggestBox(asbElement);
            asbParent.appendChild(asbElement);
            document.body.appendChild(asbParent);
            LiveUnit.Assert.isTrue(asb.dispose);
            LiveUnit.Assert.isFalse(asb._disposed);
            WinJS.Utilities.disposeSubTree(asbParent);
            LiveUnit.Assert.isTrue(asb._disposed);
            asb.dispose();

            document.body.removeChild(asbParent);
        }

        testSimpleFunctions() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");

            var testPlaceHolder = "Test placeholder";
            asb.placeholderText = testPlaceHolder;
            LiveUnit.Assert.areEqual(testPlaceHolder, asb.placeholderText, "Unable to set placeholderText");

            var testQuery = "Test queryText";
            asb.queryText = testQuery;
            LiveUnit.Assert.areEqual(testQuery, asb.queryText, "Unable to set queryText");

            LiveUnit.Assert.areEqual(false, asb.chooseSuggestionOnEnter, "Incorrect default value for chooseSuggestionOnEnterDisabled");
            var chooseSuggestionOnEnter = true;
            asb.chooseSuggestionOnEnter = chooseSuggestionOnEnter;
            LiveUnit.Assert.areEqual(chooseSuggestionOnEnter, asb.chooseSuggestionOnEnter, "Unable to set chooseSuggestionOnEnter");

            LiveUnit.Assert.isFalse(asb.disabled, "Incorrect default value for disabled");
            LiveUnit.Assert.isFalse(asb._inputElement.disabled, "Incorrect default value for disabled for input element.");
            asb.disabled = true;
            LiveUnit.Assert.isTrue(asb.disabled, "Unable to set disabled");
            LiveUnit.Assert.isTrue(asb._inputElement.disabled, "ASB did not disable input element.");
        }

        testQueryChanged() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");

            var eventFired = false;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.areEqual("Test query", event.detail.queryText, "Query text not matching input");
                if (!window['Windows']) {
                    //in web context, we match based on event details
                    LiveUnit.Assert.areEqual("ja", event.detail.language, "Query text language not matching input");
                } else {
                    //in local context, we should match the WinRT API
                    LiveUnit.Assert.areEqual(Windows.Globalization.Language.currentInputMethodLanguageTag, event.detail.language, "Query text language not matching input");
                }
                LiveUnit.Assert.isFalse(eventFired, "Querychanged fired multiple times");
                eventFired = true;
            });

            // This is to test the input language
            Helper.keydown(asb._inputElement, Key.rightArrow, "ja");

            LiveUnit.Assert.areEqual("ja", asb._lastKeyPressLanguage);
            asb._inputElement.value = "Test query";
            asb._inputOrImeChangeHandler(null);
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
        }

        testQuerySubmitted() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var eventFired = false;
            LiveUnit.LoggingCore.logComment("Verifying...");
            asb.addEventListener("querysubmitted", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.areEqual("Test query", event.detail.queryText, "Query text not matching input");
                if (!window['Windows']) {
                    //in web context, we match based on event details
                    LiveUnit.Assert.areEqual("ja-JP", event.detail.language, "Query text language not matching input");
                } else {
                    //in local context, we should match the WinRT API
                    LiveUnit.Assert.areEqual(Windows.Globalization.Language.currentInputMethodLanguageTag, event.detail.language, "Query text language not matching input");
                }
                LiveUnit.Assert.isFalse(eventFired, "QuerySubmitted fired multiple times");
                eventFired = true;
            });

            // This is to test the input language
            Helper.keydown(asb._inputElement, Key.rightArrow, "ja");
            LiveUnit.Assert.areEqual("ja", asb._lastKeyPressLanguage);
            asb._inputElement.value = "Test query";
            Helper.keydown(asb._inputElement, Key.enter, "ja-JP");
            LiveUnit.Assert.isTrue(eventFired, "QuerySubmitted event was not fired");
        }

        testHitSortAndMerge() {
            var result;
            var testSingleHit = [{ startPosition: 2, length: 3 }];
            result = AutoSuggestBox._sortAndMergeHits(testSingleHit);
            LiveUnit.Assert.areEqual(1, result.length, "testSingleHit: Did not receive correct number of results");
            LiveUnit.Assert.areEqual(2, result[0].startPosition, "testSingleHit: Did not receive correct startPosition");
            LiveUnit.Assert.areEqual(3, result[0].length, "testSingleHit: Did not receive correct length");

            var testSort = [{ startPosition: 20, length: 4 }, { startPosition: 10, length: 3 }];
            result = AutoSuggestBox._sortAndMergeHits(testSort);
            LiveUnit.Assert.areEqual(2, result.length, "testSort: Did not receive correct number of results");
            LiveUnit.Assert.areEqual(10, result[0].startPosition, "testSort: Did not receive correct startPosition");
            LiveUnit.Assert.areEqual(3, result[0].length, "testSort: Did not receive correct length");
            LiveUnit.Assert.areEqual(20, result[1].startPosition, "testSort: Did not receive correct startPosition");
            LiveUnit.Assert.areEqual(4, result[1].length, "testSort: Did not receive correct length");

            var testMergeInside = [{ startPosition: 20, length: 1 }, { startPosition: 19, length: 3 }];
            result = AutoSuggestBox._sortAndMergeHits(testMergeInside);
            LiveUnit.Assert.areEqual(1, result.length, "testMergeInside: Did not receive correct number of results");
            LiveUnit.Assert.areEqual(19, result[0].startPosition, "testMergeInside: Did not receive correct startPosition");
            LiveUnit.Assert.areEqual(3, result[0].length, "testMergeInside: Did not receive correct length");

            var testMergeOverlap = [{ startPosition: 20, length: 5 }, { startPosition: 18, length: 5 }];
            result = AutoSuggestBox._sortAndMergeHits(testMergeOverlap);
            LiveUnit.Assert.areEqual(1, result.length, "testMergeOverlap : Did not receive correct number of results");
            LiveUnit.Assert.areEqual(18, result[0].startPosition, "testMergeOverlap : Did not receive correct startPosition");
            LiveUnit.Assert.areEqual(7, result[0].length, "testMergeOverlap: Did not receive correct length");

            var testMergeAdjacent = [{ startPosition: 20, length: 2 }, { startPosition: 17, length: 3 }];
            result = AutoSuggestBox._sortAndMergeHits(testMergeAdjacent);
            LiveUnit.Assert.areEqual(1, result.length, "testMergeAdjacent : Did not receive correct number of results");
            LiveUnit.Assert.areEqual(17, result[0].startPosition, "testMergeAdjacent : Did not receive correct startPosition");
            LiveUnit.Assert.areEqual(5, result[0].length, "testMergeAdjacent: Did not receive correct length");
        }

        test428216() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var eventsCalled = [];
            asb.addEventListener(AutoSuggestBox._EventNames.querychanged, function (ev) {
                eventsCalled.push(AutoSuggestBox._EventNames.querychanged);
            });

            var inputElement = asb._inputElement;

            //mock msGetInputContext so we can have more control over the events
            var endOffset = 0;
            inputElement.msGetInputContext = function () {
                return <any>{
                    getCompositionAlternatives: function () {
                        return [];
                    },
                    getCandidateWindowClientRect: function () {
                        return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
                    },
                    compositionEndOffset: endOffset,
                    compositionStartOffset: 0
                }
            };

            // When using IME: compositionstart -> compositionupdate -> input -> compositionupdate -> input -> compositionend
            inputElement.value = 'a';
            inputElement.dispatchEvent(createCustomEvent("compositionstart"));
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            inputElement.dispatchEvent(createCustomEvent("input"));

            endOffset++;
            inputElement.value += 'b';
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            inputElement.dispatchEvent(createCustomEvent("input"));

            inputElement.dispatchEvent(createCustomEvent("compositionend"));

            LiveUnit.Assert.areEqual(2, eventsCalled.length, "queryChanged was called more than twice");
        }

        testKoreanIMEKeyboarding() {
            // Korean keyboarding - IME will finalize on keydown for up/down/enter/tab so make sure we discard the composition end event
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var inputElement = asb._inputElement
            var that = this;

            var changedEventFired = false;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.isFalse(changedEventFired, "Querychanged fired multiple times");
                changedEventFired = true;
            });

            var submittedEventFired = false;
            asb.addEventListener("querysubmitted", function asbTest_querySubmitted_listener(event) {
                LiveUnit.Assert.isFalse(submittedEventFired, "QuerySubmitted fired multiple times");
                submittedEventFired = true;
            });

            // Enter key
            LiveUnit.LoggingCore.logComment("Testing Enter key.");

            changedEventFired = false;
            inputElement.value = 'a';
            mockInputContext(inputElement, 1, 1, []);
            inputElement.dispatchEvent(createCustomEvent("compositionstart"));
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.isTrue(changedEventFired, "QueryChanged event was not fired");

            submittedEventFired = false;
            Helper.keydown(inputElement, Key.enter, "ko");
            LiveUnit.Assert.isTrue(submittedEventFired, "QuerySubmitted event was not fired");

            // make sure this event is filtered out (Korean IME finalized on key down event, but still passes key to app)
            changedEventFired = false;
            mockInputContext(inputElement, 0, 0, []);
            inputElement.dispatchEvent(createCustomEvent("compositionend"));
            LiveUnit.Assert.isFalse(changedEventFired, "QueryChanged event was fired");

            Helper.keyup(inputElement, Key.enter, "ko");

            // ensure query events are still fired after key is released
            changedEventFired = false;
            inputElement.value = 'ab';
            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.isTrue(changedEventFired, "QueryChanged event was not fired");

            // Up/Down/Tab keys
            var keys = [Key.upArrow, Key.downArrow, Key.tab];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                LiveUnit.LoggingCore.logComment("Testing " + key + " key.");

                changedEventFired = false;
                inputElement.value = 'a';
                mockInputContext(inputElement, 1, 1, []);
                inputElement.dispatchEvent(createCustomEvent("compositionstart"));
                inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
                inputElement.dispatchEvent(createCustomEvent("input"));
                LiveUnit.Assert.isTrue(changedEventFired, "QueryChanged event was not fired");

                Helper.keydown(inputElement, key, "ko");

                // make sure this event is filtered out (Korean IME finalized on key down event, but still passes key to app)
                changedEventFired = false;
                mockInputContext(inputElement, 0, 0, []);
                inputElement.dispatchEvent(createCustomEvent("compositionend"));
                LiveUnit.Assert.isFalse(changedEventFired, "QueryChanged event was fired");

                Helper.keyup(inputElement, key, "ko");

                // ensure query events are still fired after key is released
                changedEventFired = false;
                inputElement.value = 'ab';
                inputElement.dispatchEvent(createCustomEvent("input"));
                LiveUnit.Assert.isTrue(changedEventFired, "QueryChanged event was not fired");
            }
        }

        testQueryChangeAfterFocusLoss(complete) {
            // Ensure after a focus loss on tab/enter that we still get query change events
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var inputElement = asb._inputElement;
            var that = this;

            var otherInputElement = document.createElement("input");
            otherInputElement.type = "text";
            document.body.appendChild(otherInputElement);

            var changedEventFired = false;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.isFalse(changedEventFired, "Querychanged fired multiple times");
                changedEventFired = true;
            });

            // make sure the input actually has focus, otherwise we don't get the focusout event
            inputElement.focus();
            LiveUnit.Assert.areEqual(inputElement, document.activeElement);

            var keys = [Key.tab, Key.enter, Key.upArrow, Key.downArrow]; // only Tab (always moves focus) & Enter (if apps handles QuerySubmitted and moves focus) are actually expected to occur; include up/down for test completeness only

            function runTest(key) {
                return WinJS.Promise.wrap().then(function () {
                    LiveUnit.LoggingCore.logComment("Testing " + key + " key.");

                    Helper.keydown(inputElement, key, "en-US");
                    otherInputElement.focus();

                    return WinJS.Promise.timeout();
                }).then(function () {
                        LiveUnit.Assert.areEqual(otherInputElement, document.activeElement);

                        // key up event goes to another control & never reaches inputElement
                        Helper.keyup(otherInputElement, key, "en-US");

                        // now put focus back
                        inputElement.focus();

                        return WinJS.Promise.timeout();
                    }).then(function () {
                        LiveUnit.Assert.areEqual(inputElement, document.activeElement);

                        // ensure query events are still fired
                        changedEventFired = false;
                        inputElement.value = 'a' + key;
                        inputElement.dispatchEvent(createCustomEvent("input"));
                        LiveUnit.Assert.isTrue(changedEventFired, "QueryChanged event was not fired");
                    });
            }

            runTest(Key.tab).then(function () {
                return runTest(Key.enter);
            }).then(function () {
                    return runTest(Key.upArrow);
                }).then(function () {
                    return runTest(Key.downArrow);
                }).done(function () {
                    document.body.removeChild(otherInputElement);
                    complete();
                });
        }

        testQueryChangeAfterIMEEaten() {
            // Ensure after the IME ate the enter/tab keys that we still get query change events
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var inputElement = asb._inputElement;
            var that = this;

            var changedEventFired = false;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.isFalse(changedEventFired, "Querychanged fired multiple times");
                changedEventFired = true;
            });

            // make sure the input actually has focus, otherwise we don't get the focusout event
            inputElement.focus();
            LiveUnit.Assert.areEqual(inputElement, document.activeElement);

            var key = Key.enter;
            LiveUnit.LoggingCore.logComment("Testing " + key + " key.");

            Helper.keydown(inputElement, key, "zh-Hans-CN");
            // key up event was eaten by the IME (actually due to Trident bug BLUE:394522)

            // ensure query events are still fired
            changedEventFired = false;
            inputElement.value = 'a' + key;
            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.isTrue(changedEventFired, "QueryChanged event was not fired");
        }

        testBasicLinguisticAlternatives() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var inputElement = asb._inputElement;

            var eventFired = false;
            var eventQueryText = null;
            var eventLinguisticDetails = null;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.isNotNull(event);
                LiveUnit.Assert.isNotNull(event.detail);
                LiveUnit.Assert.isNotNull(event.detail.queryText);
                eventQueryText = event.detail.queryText;
                LiveUnit.Assert.isNotNull(event.detail.linguisticDetails);
                eventLinguisticDetails = event.detail.linguisticDetails;
                LiveUnit.Assert.isFalse(eventFired, "Querychanged fired multiple times");
                eventFired = true;
            });

            // no alternatives case (but has composition string)
            inputElement.value = 'ab';
            mockInputContext(inputElement, 1, 2, []);
            inputElement.dispatchEvent(createCustomEvent("compositionstart"));
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
            LiveUnit.Assert.areEqual("ab", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 1, 1, []);

            // simple alternative case
            inputElement.value = 'ab';
            mockInputContext(inputElement, 0, 2, ['c', 'df', 'ghi']);
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
            LiveUnit.Assert.areEqual("ab", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 2, ['c', 'df', 'ghi']);

            // alternatives with finalized text (substitution) case
            inputElement.value = 'precompsuffix';
            mockInputContext(inputElement, 3, 7, ['c', 'df', 'ghi', 'same', 'longer']);
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
            LiveUnit.Assert.areEqual("precompsuffix", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 3, 4, ['precsuffix', 'predfsuffix', 'preghisuffix', 'presamesuffix', 'prelongersuffix']);
        }

        testBasicIMEConversion() {
            // IME chooses a candidate, get a string change during finalize, alternatives go away
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var inputElement = asb._inputElement;

            var eventFired = false;
            var eventQueryText = null;
            var eventLinguisticDetails = null;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.isNotNull(event);
                LiveUnit.Assert.isNotNull(event.detail);
                LiveUnit.Assert.isNotNull(event.detail.queryText);
                eventQueryText = event.detail.queryText;
                LiveUnit.Assert.isNotNull(event.detail.linguisticDetails);
                eventLinguisticDetails = event.detail.linguisticDetails;
                LiveUnit.Assert.isFalse(eventFired, "Querychanged fired multiple times");
                eventFired = true;
            });

            inputElement.value = '';
            mockInputContext(inputElement, 0, 0, []);
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionstart"));
            LiveUnit.Assert.isFalse(eventFired, "QueryChanged event was incorrectly fired");

            inputElement.value = 'b';
            mockInputContext(inputElement, 0, 1, ['c', 'd']);
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
            LiveUnit.Assert.areEqual("b", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 1, ['c', 'd']);

            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.areEqual("b", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 1, ['c', 'd']);

            inputElement.value = 'f'; // conversion
            mockInputContext(inputElement, 0, 1, []); // still composition at this step
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
            LiveUnit.Assert.areEqual("f", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 1, []);

            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.areEqual("f", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 1, []);

            inputElement.value = 'f';
            mockInputContext(inputElement, 0, 0, []); // composition ended
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionend"));
            LiveUnit.Assert.areEqual("f", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 0, []);
        }

        testFinalizeAndSubmitWithAlternatives() {
            // IMEs that keep alternatives on enter to finalize if there is no string change, and keep on submit (JPN, CHS, CHT Bopomofo)
            var that = this;
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var inputElement = asb._inputElement;

            var eventFired = false;
            var eventQueryText = null;
            var eventLinguisticDetails = null;
            asb.addEventListener("querychanged", function asbTest_queryChanged_listener(event) {
                LiveUnit.Assert.isNotNull(event);
                LiveUnit.Assert.isNotNull(event.detail);
                LiveUnit.Assert.isNotNull(event.detail.queryText);
                eventQueryText = event.detail.queryText;
                LiveUnit.Assert.isNotNull(event.detail.linguisticDetails);
                eventLinguisticDetails = event.detail.linguisticDetails;
                LiveUnit.Assert.isFalse(eventFired, "Querychanged fired multiple times");
                eventFired = true;
            });

            var submitEventFired = false;
            var submitEventQueryText = null;
            var submitEventLinguisticDetails = null;
            asb.addEventListener("querysubmitted", function asbTest_querySubmitted_listener(event) {
                LiveUnit.Assert.isNotNull(event);
                LiveUnit.Assert.isNotNull(event.detail);
                LiveUnit.Assert.isNotNull(event.detail.queryText);
                submitEventQueryText = event.detail.queryText;
                LiveUnit.Assert.isNotNull(event.detail.linguisticDetails);
                submitEventLinguisticDetails = event.detail.linguisticDetails;
                LiveUnit.Assert.isFalse(submitEventFired, "Querychanged fired multiple times");
                submitEventFired = true;
            });

            inputElement.value = '';
            mockInputContext(inputElement, 0, 0, []);
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionstart"));
            LiveUnit.Assert.isFalse(eventFired, "QueryChanged event was incorrectly fired");

            inputElement.value = 'bcompd';
            mockInputContext(inputElement, 1, 5, ['x', 'y', 'z']);
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionupdate"));
            LiveUnit.Assert.isTrue(eventFired, "QueryChanged event was not fired");
            LiveUnit.Assert.areEqual("bcompd", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 1, 4, ['bxd', 'byd', 'bzd']);

            inputElement.value = 'bcompd';
            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.areEqual("bcompd", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 1, 4, ['bxd', 'byd', 'bzd']);

            inputElement.value = 'bcompd';
            mockInputContext(inputElement, 0, 0, ['x', 'y', 'z']); // composition ended, but alternatives kept
            eventFired = false;
            inputElement.dispatchEvent(createCustomEvent("compositionend"));
            LiveUnit.Assert.areEqual("bcompd", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 0, ['bxd', 'byd', 'bzd']);

            inputElement.value = 'bcompd';
            inputElement.dispatchEvent(createCustomEvent("input"));
            LiveUnit.Assert.areEqual("bcompd", eventQueryText);
            verifyLinguisticDetails(eventLinguisticDetails, 0, 0, ['bxd', 'byd', 'bzd']);

            // user submits via enter key
            submitEventFired = false;
            Helper.keydown(asb._inputElement, Key.enter, "ja");
            LiveUnit.Assert.isTrue(submitEventFired, "QuerySubmitted event was not fired");
            LiveUnit.Assert.areEqual("bcompd", submitEventQueryText);
            verifyLinguisticDetails(submitEventLinguisticDetails, 0, 0, ['bxd', 'byd', 'bzd']);

            Helper.keyup(asb._inputElement, Key.enter, "ja");
        }

        testSearchHistoryContext() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            var testContext = "Test Context";
            asb.searchHistoryContext = testContext;
            LiveUnit.Assert.areEqual(testContext, asb.searchHistoryContext, "Unable to set searchHistoryContext");
        }

        testSearchHistoryDisabled() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Waiting for control...");
            var testContext = "Test Context";
            asb.searchHistoryDisabled = true;
            LiveUnit.Assert.areEqual(true, asb.searchHistoryDisabled, "Unable to set searchHistoryDisabled");
            asb.searchHistoryDisabled = false;
            LiveUnit.Assert.areEqual(false, asb.searchHistoryDisabled, "Unable to set searchHistoryDisabled");
        }

        testSuggestionsDisplayed(complete) {
            // Verify whether all suggestions are rendered.
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            asb.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendQuerySuggestions(["Test query Suggestion1 test", "Test query Suggestion2 test"]);
                e.detail.searchSuggestionCollection.appendSearchSeparator("Separator");
                e.detail.searchSuggestionCollection.appendResultSuggestion("Test result Suggestion3 test", "Query suggestion3 detailed text", "tag3", AutoSuggestBox.createResultSuggestionImage("http://fakeurl"), "");
                e.detail.searchSuggestionCollection.appendResultSuggestion("Test result Suggestion4 test", "Query suggestion4 detailed text", "tag4", AutoSuggestBox.createResultSuggestionImage("http://fakeurl"), "");

                waitForSuggestionFlyoutRender(asb).done(function () {
                    var suggestion1 = asb._repeater.elementFromIndex(0);
                    LiveUnit.Assert.isTrue((suggestion1.textContent.indexOf("Test query Suggestion1 test") >= 0), "Suggestion1 text is not displayed.");

                    var suggestion2 = asb._repeater.elementFromIndex(1);
                    LiveUnit.Assert.isTrue((suggestion2.textContent.indexOf("Test query Suggestion2 test") >= 0), "Suggestion2 text is not displayed.");

                    var suggestion3 = asb._repeater.elementFromIndex(2);
                    LiveUnit.Assert.isTrue((suggestion3.textContent.indexOf("Separator") >= 0), "Suggestion3 text is not displayed.");

                    var suggestion4 = asb._repeater.elementFromIndex(3);
                    LiveUnit.Assert.isTrue((suggestion4.textContent.indexOf("Test result Suggestion3 test") >= 0), "Suggestion3 text is not displayed.");
                    LiveUnit.Assert.isTrue((suggestion4.textContent.indexOf("Query suggestion3 detailed text") >= 0), "Suggestion3 detailed text is not displayed.");

                    var suggestion5 = asb._repeater.elementFromIndex(4);
                    LiveUnit.Assert.isTrue((suggestion5.textContent.indexOf("Test result Suggestion4 test") >= 0), "Suggestion4 text is not displayed.");
                    LiveUnit.Assert.isTrue((suggestion5.textContent.indexOf("Query suggestion4 detailed text") >= 0), "Suggestion4 detailed text is not displayed.");

                    complete();
                });
            });
            asb._inputElement.value = "a";
            asb._inputElement.focus();
        }

        testQuerySuggestionSelected(complete) {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            asb.addEventListener("querysubmitted", function asbTest_querySubmitted_listener(event) {
                LiveUnit.Assert.areEqual("Test query Suggestion1 test", event.detail.queryText, "Query text not matching suggestion text");
                complete();
            });
            asb.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendQuerySuggestion("Test query Suggestion1 test");

                waitForSuggestionFlyoutRender(asb).done(function () {
                    // Select the first suggestion.
                    Helper.touchDown(asb._repeater.elementFromIndex(0));
                    Helper.touchUp(asb._repeater.elementFromIndex(0));
                });
            });
            asb._inputElement.value = "a";
            asb._inputElement.focus();
        }

        testResultSuggestionSelected(complete) {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            LiveUnit.LoggingCore.logComment("Verifying...");
            asb.addEventListener("resultsuggestionchosen", function asbTest_resultsuggestionchosen_listener(event) {
                LiveUnit.Assert.areEqual("tag3", event.detail.tag, "Query text not matching suggestion tag");
                complete();
            });
            asb.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendResultSuggestion("Test result Suggestion3 test", "Query suggestion3 detailed text", "tag3", AutoSuggestBox.createResultSuggestionImage("http://fakeurl"), "");

                waitForSuggestionFlyoutRender(asb).done(function () {
                    // Select the first suggestion.
                    Helper.touchDown(asb._repeater.elementFromIndex(0));
                    Helper.touchUp(asb._repeater.elementFromIndex(0));
                });
            });
            asb._inputElement.value = "a";
            asb._inputElement.focus();
        }

        testSuggestionSelectionWithNarrator(complete) {
            var expectCallback = false;

            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            asb.addEventListener("resultsuggestionchosen", function asbTest_resultsuggestionchosen_listener(event) {
                if (!expectCallback) {
                    LiveUnit.Assert.fail("unexpected callback");
                }
                complete();
            });

            asb.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendResultSuggestion("Test result Suggestion3 test", "Query suggestion3 detailed text", "tag3", AutoSuggestBox.createResultSuggestionImage("http://fakeurl"), "");

                waitForSuggestionFlyoutRender(asb).done(function () {
                    var element = asb._repeater.elementFromIndex(0);

                    // Simulate mouse/touch scenario - Mouse/Touch go thru pointer events then click event. In this scenario,
                    // the click event should NOT invoke the selection.
                    expectCallback = false;
                    Helper.touchDown(element);
                    element.click();

                    // Simulate narrator click - Fire click w/o going thru pointer events, here we expect an invocation
                    asb._isFlyoutPointerDown = false;
                    expectCallback = true;
                    element.click();
                });
            });
            asb._inputElement.value = "a";
            asb._inputElement.focus();
        }

        testChooseSuggestionOnEnterEnabled(complete) {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            asb.chooseSuggestionOnEnter = true;
            LiveUnit.LoggingCore.logComment("Verifying...");

            asb.addEventListener("querysubmitted", function asbTest_querysubmitted_listener(event) {
                LiveUnit.Assert.areEqual("Test query Suggestion1 test", event.detail.queryText, "Query text not matching input");
                if (!WinJS.Utilities.hasWinRT) {
                    LiveUnit.Assert.areEqual("ja-JP", event.detail.language, "Query text language not matching input");
                }
                complete();
            });
            asb.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendQuerySuggestion("Test query Suggestion1 test");

                WinJS.Utilities._setImmediate(function () {
                    Helper.keydown(asb._inputElement, Key.enter, "ja-JP");
                });
            });
            asb._inputElement.value = "Test query";
            asb._inputElement.focus();
        }

        testAttemptingToGetInputContextOnWPDoesNotThrowException() {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            asb._inputElement.msGetInputContext = (): any => {
                throw "test exception";
            };
            LiveUnit.Assert.isNull(asb._tryGetInputContext());
        }

        testArrowKeysOnSuggestionFlyout(complete) {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            asb.addEventListener("suggestionsrequested", function (e) {
                e.detail.searchSuggestionCollection.appendQuerySuggestion("1");
                e.detail.searchSuggestionCollection.appendQuerySuggestion("2");

                WinJS.Promise.timeout().then(function () {
                    Helper.keydown(asb._inputElement, Key.downArrow);
                    return WinJS.Promise.timeout();
                })
                    .then(function () {
                        LiveUnit.Assert.areEqual(0, document.querySelector(".win-autosuggestbox-flyout").scrollTop);

                        LiveUnit.Assert.areEqual("1", asb.element.querySelector(".win-autosuggestbox-suggestion-selected").textContent);
                        Helper.keydown(asb._inputElement, Key.downArrow);
                        return WinJS.Promise.timeout();
                    })
                    .then(function () {
                        LiveUnit.Assert.areEqual("2", asb.element.querySelector(".win-autosuggestbox-suggestion-selected").textContent);
                        Helper.keydown(asb._inputElement, Key.upArrow);
                        return WinJS.Promise.timeout();
                    })
                    .done(function () {
                        LiveUnit.Assert.areEqual("1", asb.element.querySelector(".win-autosuggestbox-suggestion-selected").textContent);
                        complete();
                    });
            });
            asb._inputElement.value = "Test query";
            asb._inputElement.focus();
        }

        testArrowKeysOnSuggestionFlyoutAbove(complete) {
            var asb: WinJS.UI.PrivateAutoSuggestBox = document.getElementById("ASBID").winControl;
            asb.element.style.position = "absolute";
            asb.element.style.bottom = "0";
            asb.addEventListener("suggestionsrequested", function (e) {
                for (var i = 1; i < 20; i++) {
                    e.detail.searchSuggestionCollection.appendQuerySuggestion("" + i);
                }

                WinJS.Promise.timeout().then(function () {
                    Helper.keydown(asb._inputElement, Key.upArrow);
                    return WinJS.Promise.timeout();
                })
                    .then(function () {
                        LiveUnit.Assert.areNotEqual(0, document.querySelector(".win-autosuggestbox-flyout").scrollTop);

                        LiveUnit.Assert.areEqual("1", asb.element.querySelector(".win-autosuggestbox-suggestion-selected").textContent);
                        Helper.keydown(asb._inputElement, Key.upArrow);
                        return WinJS.Promise.timeout();
                    })
                    .then(function () {
                        LiveUnit.Assert.areEqual("2", asb.element.querySelector(".win-autosuggestbox-suggestion-selected").textContent);
                        Helper.keydown(asb._inputElement, Key.downArrow);
                        return WinJS.Promise.timeout();
                    })
                    .done(function () {
                        LiveUnit.Assert.areEqual("1", asb.element.querySelector(".win-autosuggestbox-suggestion-selected").textContent);

                        complete();
                    });
            });
            asb._inputElement.value = "Test query";
            asb._inputElement.focus();
        }
    };
    
    var disabledTestRegistry = {
        testSuggestionsDisplayed: Helper.Browsers.firefox,
        testQueryChangeAfterFocusLoss:[Helper.Browsers.ie11, Helper.Browsers.firefox],
        testQuerySuggestionSelected: Helper.Browsers.firefox,
        testResultSuggestionSelected: Helper.Browsers.firefox,
        testSuggestionSelectionWithNarrator: Helper.Browsers.firefox,
        testChooseSuggestionOnEnterEnabled: Helper.Browsers.firefox,
        testArrowKeysOnSuggestionFlyout: Helper.Browsers.firefox,
        testArrowKeysOnSuggestionFlyoutAbove: Helper.Browsers.firefox,
    };
    Helper.disableTests(AutoSuggestBoxTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("AutoSuggestBoxTests.AutoSuggestBoxTests");