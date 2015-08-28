// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="RatingUtils.ts"/>

module WinJSTests {
    "use strict";

    export class RatingKeyboardTests {


        setUp(complete) {
            RatingUtils.setUp().then(complete);
        }

        tearDown() {
            RatingUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------

        testRating_Focus = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = {
                1: {
                    action: function () { RatingUtils.focus(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 0,
                    styleExpected: "tentative",
                    ariaExpected: "user",
                    userRatingExpected: 0
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Focus_ShowingUser = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating",
                {
                    userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating),
                    averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating)
                }
                );

            // Register the test actions we will be taking
            var actions = {
                1: {
                    action: function () { RatingUtils.focus(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: rating.userRating,
                    userRatingExpected: rating.userRating,
                    styleExpected: "user",
                    ariaExpected: "user"
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Focus_ShowingAverage = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = {
                1: {
                    action: function () { RatingUtils.focus(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 0,
                    styleExpected: "tentative",
                    ariaExpected: "average",
                    userRatingExpected: 0
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = {
                1: {
                    action: function () { RatingUtils.focus(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 0,
                    userRatingExpected: 0,
                    styleExpected: "tentative",
                    ariaExpected: "user"
                },
                2: {
                    action: function () { RatingUtils.blur(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    userRatingExpected: 0
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Blur_ShowingUser = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating",
                {
                    userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating),
                    averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating)
                }
                );

            // Register the test actions we will be taking
            var actions = {
                1: {
                    action: function () { RatingUtils.focus(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: rating.userRating,
                    userRatingExpected: rating.userRating,
                    styleExpected: "user",
                    ariaExpected: "user"
                },
                2: {
                    action: function () { RatingUtils.blur(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    userRatingExpected: rating.userRating
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Blur_ShowingAverage = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating",
                {
                    averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating)
                }
                );

            // Register the test actions we will be taking
            var actions = {
                1: {
                    action: function () { RatingUtils.focus(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 0,
                    userRatingExpected: 0,
                    styleExpected: "tentative",
                    ariaExpected: "average"
                },
                2: {
                    action: function () { RatingUtils.blur(document.getElementById("rating")); },
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    userRatingExpected: 0
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Enter key tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.enter);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Tab key tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.tab);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Right arrow key tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Default_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Default_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Default_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Default_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_AverageRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_AverageRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_AverageRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_AverageRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_UserRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_UserRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_UserRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_UserRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_RatingAtMax_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_RatingAtMax_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_RatingAtMax_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_RatingAtMax_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Disabled_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Disabled_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Disabled_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Disabled_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_NoClear_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_NoClear_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_NoClear_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_NoClear_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.rightArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Multiple = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing right key " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.rightArrow); },
                    expectedEvents: { previewchange: (rating.userRating + i <= rating.maxRating) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating + i >= rating.maxRating) ? rating.maxRating : rating.userRating + i,
                    userRatingExpected: rating.userRating
                };
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses,
                userRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Right_Multiple_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var max = RatingUtils.randomNewMaxRating(20, RatingUtils.defaultMaxRating);
            var rating = RatingUtils.instantiate("rating", { maxRating: max, userRating: RatingUtils.randomInt(1, max - 2) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing right key " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.rightArrow); },
                    expectedEvents: { previewchange: (rating.userRating + i <= rating.maxRating) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating + i >= rating.maxRating) ? rating.maxRating : rating.userRating + i,
                    userRatingExpected: rating.userRating
                };
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses,
                userRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Up arrow key tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Default_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Default_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Default_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Default_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_AverageRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_AverageRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_AverageRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_AverageRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_UserRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_UserRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_UserRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_UserRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_RatingAtMax_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_RatingAtMax_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_RatingAtMax_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_RatingAtMax_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Disabled_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Disabled_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Disabled_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Disabled_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_NoClear_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_NoClear_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_NoClear_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_NoClear_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.upArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Multiple = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating - 2) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing up key " + keyPresses + " times.");


            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.upArrow); },
                    expectedEvents: { previewchange: (rating.userRating + i <= rating.maxRating) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating + i >= rating.maxRating) ? rating.maxRating : rating.userRating + i,
                    userRatingExpected: rating.userRating
                };
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses,
                userRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Up_Multiple_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var max = RatingUtils.randomNewMaxRating(20, RatingUtils.defaultMaxRating);
            var rating = RatingUtils.instantiate("rating", { maxRating: max, userRating: RatingUtils.randomInt(1, max - 2) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing up key " + keyPresses + " times.");


            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.upArrow); },
                    expectedEvents: { previewchange: (rating.userRating + i <= rating.maxRating) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating + i >= rating.maxRating) ? rating.maxRating : rating.userRating + i,
                    userRatingExpected: rating.userRating
                };
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses,
                userRatingExpected: (rating.userRating + keyPresses >= rating.maxRating) ? rating.maxRating : rating.userRating + keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Left Arrow Key Tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Default_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Default_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Default_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Default_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_AverageRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_AverageRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_AverageRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_AverageRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_UserRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_UserRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_UserRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_UserRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_RatingAtMax_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_RatingAtMax_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_RatingAtMax_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_RatingAtMax_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Disabled_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Disabled_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Disabled_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Disabled_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_NoClear_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_NoClear_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_NoClear_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_NoClear_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.leftArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Multiple = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing left key " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.leftArrow); },
                    expectedEvents: { previewchange: (rating.userRating - i >= 0) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating - i <= 0) ? 0 : rating.userRating - i,
                    userRatingExpected: rating.userRating
                };

                if (rating.userRating - i <= 0) {
                    actions[i + 1].clearRatingTooltipExpected = true;
                }
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses,
                userRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Left_Multiple_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var max = RatingUtils.randomNewMaxRating(20, RatingUtils.defaultMaxRating);
            var rating = RatingUtils.instantiate("rating", { maxRating: max, userRating: RatingUtils.randomInt(2, max) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing left key " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.leftArrow); },
                    expectedEvents: { previewchange: (rating.userRating - i >= 0) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating - i <= 0) ? 0 : rating.userRating - i,
                    userRatingExpected: rating.userRating
                };

                if (rating.userRating - i <= 0) {
                    actions[i + 1].clearRatingTooltipExpected = true;
                }
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses,
                userRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Down Arrow Key Tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Default_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Default_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Default_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Default_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating");

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_AverageRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_AverageRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_AverageRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_AverageRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_UserRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_UserRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_UserRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_UserRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_RatingAtMax_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_RatingAtMax_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_RatingAtMax_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_RatingAtMax_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.defaultMaxRating });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Disabled_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Disabled_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Disabled_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Disabled_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_NoClear_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenBlurActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_NoClear_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEscapeActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_NoClear_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenEnterActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_NoClear_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            RatingUtils.instantiate("rating", { userRating: 1, enableClear: false });

            // Register the test actions we will be taking
            var actions = RatingUtils.generateKeydownThenTabActions(document.getElementById("rating"), WinJS.Utilities.Key.downArrow);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Multiple = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(2, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing down key " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.downArrow); },
                    expectedEvents: { previewchange: (rating.userRating - i >= 0) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating - i <= 0) ? 0 : rating.userRating - i,
                    userRatingExpected: rating.userRating
                };

                if (rating.userRating - i <= 0) {
                    actions[i + 1].clearRatingTooltipExpected = true;
                }
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses,
                userRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Down_Multiple_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var max = RatingUtils.randomNewMaxRating(20, RatingUtils.defaultMaxRating);
            var rating = RatingUtils.instantiate("rating", { maxRating: max, userRating: RatingUtils.randomInt(2, max) });

            // Register the test actions we will be taking
            var actions = new Object();

            actions[1] = {
                action: function () { window['async'].ratingUtils.focus(rating.element); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                userRatingExpected: rating.userRating,
                styleExpected: "user",
                ariaExpected: "user"
            };

            var keyPresses = RatingUtils.randomInt(2, rating.maxRating);

            LiveUnit.LoggingCore.logComment("Pressing down key " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                actions[i + 1] = {
                    action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.downArrow); },
                    expectedEvents: { previewchange: (rating.userRating - i >= 0) ? 1 : 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: (rating.userRating - i <= 0) ? 0 : rating.userRating - i,
                    userRatingExpected: rating.userRating
                };

                if (rating.userRating - i <= 0) {
                    actions[i + 1].clearRatingTooltipExpected = true;
                }
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses,
                userRatingExpected: (rating.userRating - keyPresses <= 0) ? 0 : rating.userRating - keyPresses
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------
        // Number Key Tests
        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Default_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating");

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenBlurActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Default_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating");

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEscapeActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Default_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating");

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEnterActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Default_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating");

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenTabActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_AverageRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenBlurActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_AverageRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEscapeActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_AverageRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEnterActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_AverageRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenTabActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_UserRating_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenBlurActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_UserRating_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEscapeActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_UserRating_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEnterActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_UserRating_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenTabActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Disabled_Cancel_Blur = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenBlurActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Disabled_Cancel_Escape = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEscapeActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Disabled_Commit_Enter = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenEnterActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Disabled_Commit_Tab = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating), disabled: true });

            // Register the test actions we will be taking

            var key = 0;
            if (Math.floor(Math.random() * 2)) {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
            } else {
                key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
            }

            var actions = RatingUtils.generateKeydownThenTabActions(rating.element, key);

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Multiple_Default = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: RatingUtils.randomInt(0, RatingUtils.defaultMaxRating) });

            // Register the test actions we will be taking

            var actions = new Object();

            actions[1] = {
                action: function () { RatingUtils.focus(document.getElementById("rating")); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                styleExpected: (rating.userRating) ? "user" : "tentative",
                ariaExpected: "user",
                userRatingExpected: rating.userRating
            };

            var keyPresses = RatingUtils.randomInt(2, 10);

            LiveUnit.LoggingCore.logComment("Pressing random number keys " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                var key = 0;
                if (Math.floor(Math.random() * 2)) {
                    key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
                    LiveUnit.LoggingCore.logComment("Key " + i + " (action " + (i + 1) + "): " + (key - WinJS.Utilities.Key.num0));
                } else {
                    key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
                    LiveUnit.LoggingCore.logComment("Key " + i + " (action " + (i + 1) + "): " + (key - WinJS.Utilities.Key.numPad0));
                }

                actions[i + 1] = RatingUtils.generateKeydownActions(rating.element, key)[2];
                if (actions[i + 1].tentativeRatingExpected === actions[i].tentativeRatingExpected) {
                    actions[i + 1].expectedEvents.previewchange = 0;
                } else {
                    actions[i + 1].expectedEvents.previewchange = 1;
                }
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: (actions[keyPresses + 1].tentativeRatingExpected === rating.userRating) ? 0 : 1, cancel: 0 },
                tentativeRatingExpected: actions[keyPresses + 1].tentativeRatingExpected,
                userRatingExpected: actions[keyPresses + 1].tentativeRatingExpected
            };
            actions[keyPresses + 3] = {
                action: function () { window['async'].ratingUtils.blur(rating.element); },
                expectedEvents: { previewchange: 0, change: 0, cancel: (rating.disabled) ? 0 /* Win8 631856 */ : (actions[keyPresses + 1].tentativeRatingExpected === rating.userRating) ? 1 : 0 },
                tentativeRatingExpected: null,
                userRatingExpected: rating.userRating
            }

        // Run the test
        RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_Multiple_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var max = RatingUtils.randomNewMaxRating(20, RatingUtils.defaultMaxRating);
            var rating = RatingUtils.instantiate("rating", { maxRating: max, userRating: RatingUtils.randomInt(0, max) });

            // Register the test actions we will be taking

            var actions = new Object();

            actions[1] = {
                action: function () { RatingUtils.focus(document.getElementById("rating")); },
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: rating.userRating,
                styleExpected: (rating.userRating) ? "user" : "tentative",
                ariaExpected: "user",
                userRatingExpected: rating.userRating
            };

            var keyPresses = RatingUtils.randomInt(2, 10);

            LiveUnit.LoggingCore.logComment("Pressing random number keys " + keyPresses + " times.");

            for (var i = 1; i <= keyPresses; ++i) {
                var key = 0;
                if (Math.floor(Math.random() * 2)) {
                    key = RatingUtils.randomInt(WinJS.Utilities.Key.num0, WinJS.Utilities.Key.num9);
                    LiveUnit.LoggingCore.logComment("Key " + i + " (action " + (i + 1) + "): " + (key - WinJS.Utilities.Key.num0));
                } else {
                    key = RatingUtils.randomInt(WinJS.Utilities.Key.numPad0, WinJS.Utilities.Key.numPad9);
                    LiveUnit.LoggingCore.logComment("Key " + i + " (action " + (i + 1) + "): " + (key - WinJS.Utilities.Key.numPad0));
                }

                actions[i + 1] = RatingUtils.generateKeydownActions(rating.element, key)[2];
                if (actions[i + 1].tentativeRatingExpected === actions[i].tentativeRatingExpected) {
                    actions[i + 1].expectedEvents.previewchange = 0;
                } else {
                    actions[i + 1].expectedEvents.previewchange = 1;
                }
            }

            actions[keyPresses + 2] = {
                action: function () { window['async'].ratingUtils.keyDown(rating.element, WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: (actions[keyPresses + 1].tentativeRatingExpected === rating.userRating) ? 0 : 1, cancel: 0 },
                tentativeRatingExpected: actions[keyPresses + 1].tentativeRatingExpected,
                userRatingExpected: actions[keyPresses + 1].tentativeRatingExpected
            };
            actions[keyPresses + 3] = {
                action: function () { window['async'].ratingUtils.blur(rating.element); },
                expectedEvents: { previewchange: 0, change: 0, cancel: (rating.disabled) ? 0 /* Win8 631856 */ : (actions[keyPresses + 1].tentativeRatingExpected === rating.userRating) ? 1 : 0 },
                tentativeRatingExpected: null,
                userRatingExpected: rating.userRating
            }

        // Run the test
        RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_0_enableClear_true = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: 3, enableClear: true });

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted,
                RatingUtils.generateKeydownThenTabActions(
                    rating.element,
                    WinJS.Utilities.Key.num0
                    )
                );
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_Numbers_0_enableClear_false = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: 3, enableClear: false });

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted,
                RatingUtils.generateKeydownThenTabActions(
                    rating.element,
                    WinJS.Utilities.Key.num0
                    )
                );
        };







        //-----------------------------------------------------------------------------------

        testRating_Keyboard_InvalidKey = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating", { userRating: 3, enableClear: false });

            // Generate any random key code other than those the control recognizes (0-1, ESC, TAB, and Arrow keys)
            var randomKey = 0;
            do {
                randomKey = Math.round(Math.random() * 256);
            } while (
                randomKey >= WinJS.Utilities.Key.num0 && randomKey <= WinJS.Utilities.Key.num9 ||
                randomKey >= WinJS.Utilities.Key.numPad0 && randomKey <= WinJS.Utilities.Key.numPad9 ||
                randomKey === WinJS.Utilities.Key.leftArrow ||
                randomKey === WinJS.Utilities.Key.rightArrow ||
                randomKey === WinJS.Utilities.Key.upArrow ||
                randomKey === WinJS.Utilities.Key.downArrow ||
                randomKey === WinJS.Utilities.Key.enter ||
                randomKey === WinJS.Utilities.Key.tab ||
                randomKey === WinJS.Utilities.Key.home ||
                randomKey === WinJS.Utilities.Key.end ||
                randomKey === WinJS.Utilities.Key.escape
                );

            // Run the test
            // Note that generateKeydownThenTabActions pushes a keypress for our randomKey onto the queue
            //  while expecting 0 previewchange, 0 change, and 0 cancel events.  The underlying events
            //  harness code in RatingUtils.js has a timeout mechanism built in making it pops in
            //  and verify the right number of events (in this case 0) were thrown between each test action
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted,
                RatingUtils.generateKeydownThenTabActions(
                    rating.element,
                    randomKey
                    )
                );
        };







        //-----------------------------------------------------------------------------------

        testRating_Set_aria_valuenow_Random = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = RatingUtils.instantiate("rating",
                {
                    userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating),
                    averageRating: RatingUtils.random(0, RatingUtils.defaultMaxRating)
                }
                );

            // Register the test actions we will be taking
            var newRating = RatingUtils.randomInt(0, RatingUtils.defaultMaxRating);

            LiveUnit.LoggingCore.logComment("Setting aria-valuenow to " + newRating);

            var actions = {
                1: {
                    action: function (newAriaValueNow) {
                        return function () { document.getElementById("rating").setAttribute("aria-valuenow", newAriaValueNow); };
                    } (newRating),
                    expectedEvents: { previewchange: 0, change: (rating.userRating !== newRating) ? 1 : 0, cancel: 0 },
                    tentativeRatingExpected: newRating,
                    userRatingExpected: newRating
                }
            };

            // Run the test
            RatingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };
    };
    
    var disabledTestRegistry = {
        testRating_Set_aria_valuenow_Random: Helper.BrowserCombos.onlyIE,
        testRating_Keyboard_Up_Multiple_CustomMax: Helper.BrowserCombos.all,
        testRating_Keyboard_Right_Multiple_CustomMax: Helper.BrowserCombos.all
    }
    Helper.disableTests(RatingKeyboardTests, disabledTestRegistry);
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RatingKeyboardTests");
