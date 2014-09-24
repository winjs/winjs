// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Rating control touch tests utilizing simulated UI interaction we can
//      perform exclusively in JavaScript without any additional tools.
//
//  Author: sehume
//
//-----------------------------------------------------------------------------
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="RatingUtils.ts"/>

module WinJSTests {
    "use strict";

    var ratingUtils = RatingUtils;
    var commonUtils = CommonUtilities;
    export class RatingTouchTests {


        setUp(complete) {
            ratingUtils.setUp().then(complete);
        }

        tearDown() {
            ratingUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------

        testRating_Tap_Lowest = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating");

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[0], 1, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Lowest_ShowingAverage = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { averageRating: 3.4 });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[0], 1, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Lowest_ShowingUser = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 3, averageRating: 1.3 });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[0], 1, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Lowest_Disabled = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 3, averageRating: 1.3, disabled: true });

            // Register the test actions we will be taking
            var actions = ratingUtils.generateTapActions(
                rating.element.childNodes[0], 1, rating.userRating
                );

            // Since we are disabled, don't expect any events from doing this
            for (var i = 1; i <= 4; ++i) {
                actions[i].expectedEvents.previewchange = 0;
                actions[i].expectedEvents.change = 0;
                actions[i].expectedEvents.cancel = 0;
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Lowest_SetToMin = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 1 });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[0], 1, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Lowest_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var customMax = ratingUtils.randomInt(1, 20);

            var rating = ratingUtils.instantiate("rating",
                {
                    maxRating: customMax,
                    userRating: (Math.floor(Math.random() * 2)) ? ratingUtils.randomInt(1, customMax) : 0,
                    averageRating: (Math.floor(Math.random() * 2)) ? ratingUtils.random(1, customMax) : 0
                }
                );

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[0], 1, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Highest = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating");

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Highest_ShowingAverage = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { averageRating: 3.4 });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[ratingUtils.defaultMaxRating], ratingUtils.defaultMaxRating, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Highest_ShowingUser = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Highest_Disabled = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 3, disabled: true });

            // Register the test actions we will be taking
            var actions = ratingUtils.generateTapActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
                );

            // Since we are disabled, don't expect any events from doing this
            for (var i = 1; i <= 4; ++i) {
                actions[i].expectedEvents.previewchange = 0;
                actions[i].expectedEvents.change = 0;
                actions[i].expectedEvents.cancel = 0;
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Highest_SetToMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.defaultMaxRating });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, ratingUtils.defaultMaxRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Highest_CustomMax = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var customMax = ratingUtils.randomInt(1, 20),
                customUserRating = (Math.floor(Math.random() * 2)) ? ratingUtils.randomInt(1, customMax) : 0;

            var rating = ratingUtils.instantiate("rating", { maxRating: customMax, userRating: customUserRating });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[customMax - 1], customMax, customUserRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_CurrentRating = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

            // Run the test
            ratingUtils.startAsyncEventTest(
                signalTestCaseCompleted,
                ratingUtils.generateTapActions(
                    rating.element.childNodes[rating.userRating - 1], rating.userRating, rating.userRating
                    )
                );
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_CurrentRating_RemoveEventListener_Cancel = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

            rating.removeEventListener("cancel", ratingUtils.cancelListener, false);

            // Register the test actions we will be taking
            var actions = ratingUtils.generateTapActions(
                rating.element.childNodes[rating.userRating - 1], rating.userRating, rating.userRating
                );

            // Since we removed our cancel event listener, don't expect any cancel events from doing this
            for (var i = 1; i <= 4; ++i) {
                actions[i].expectedEvents.cancel = 0;
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_All_Increasing = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating");

            var newRating = 0,
                starToTap = null;

            // Register the test actions we will be taking
            var actions = {};
            for (var i = 0; i < 4 * ratingUtils.defaultMaxRating; ++i) {
                // Tapping takes 4 events - over, down, up, off - so throw each event every 4th iteration through this loop
                //  (this also explains the "4 * ratingUtils.defaultMaxRating;" in the for loop above)
                switch (i % 4 + 1) {
                    case 1:
                        newRating = Math.round(i / 4) + 1;
                        starToTap = rating.element.childNodes[newRating - 1];
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchOver(null, star); }; } (starToTap),
                            expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                        };
                        break;
                    case 2:
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchDown(star); }; } (starToTap),
                            expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                            tentativeRatingExpected: newRating,
                            styleExpected: "tentative",
                            userRatingExpected: newRating - 1
                        };
                        break;
                    case 3:
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchUp(star); }; } (starToTap),
                            expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                            tentativeRatingExpected: newRating,
                            userRatingExpected: newRating
                        };
                        break;
                    case 4:
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchOver(star, null); }; } (starToTap),
                            expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                        };
                        break;
                }
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_All_Decreasing = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating");

            var newRating = 0,
                starToTap = null;

            // Register the test actions we will be taking
            var actions = {};
            for (var i = 0; i < 4 * ratingUtils.defaultMaxRating; ++i) {
                // Tapping takes 4 events - over, down, up, off - so throw each event every 4th iteration through this loop
                //  (this also explains the "4 * ratingUtils.defaultMaxRating;" in the for loop above)
                switch (i % 4 + 1) {
                    case 1:
                        newRating = ratingUtils.defaultMaxRating - Math.round(i / 4),
                        starToTap = rating.element.childNodes[newRating - 1];

                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchOver(null, star); }; } (starToTap),
                            expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                        };
                        break;
                    case 2:
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchDown(star); }; } (starToTap),
                            expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                            tentativeRatingExpected: newRating,
                            styleExpected: "tentative",
                            userRatingExpected: (i === 1) ? 0 : newRating + 1
                        };
                        break;
                    case 3:
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchUp(star); }; } (starToTap),
                            expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                            tentativeRatingExpected: newRating,
                            userRatingExpected: newRating
                        };
                        break;
                    case 4:
                        actions[i + 1] = {
                            action: function (star) { return function () { ratingUtils.touchOver(star, null); }; } (starToTap),
                            expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                        };
                        break;
                }
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Random = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating");

            var newRating = ratingUtils.randomInt(2, ratingUtils.defaultMaxRating - 1),
                starToTap = rating.element.childNodes[newRating - 1];

            // Register the test actions we will be taking
            var actions = ratingUtils.generateTapActions(
                starToTap, newRating, 0
                );

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Random_Disabled = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 3, disabled: true });

            var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
                starToTap = rating.element.childNodes[newRating - 1];

            // Register the test actions we will be taking
            var actions = ratingUtils.generateTapActions(
                starToTap, newRating, rating.userRating
                );

            // Since we are disabled, don't expect any events from doing this
            for (var i = 1; i <= 4; ++i) {
                actions[i].expectedEvents.previewchange = 0;
                actions[i].expectedEvents.change = 0;
                actions[i].expectedEvents.cancel = 0;
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Tap_Random_RemoveEventListener_Change = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating");

            rating.removeEventListener("change", ratingUtils.changeListener, false);

            var newRating = ratingUtils.randomInt(2, ratingUtils.defaultMaxRating - 1),
                starToTap = rating.element.childNodes[newRating - 1];

            // Register the test actions we will be taking
            var actions = ratingUtils.generateTapActions(
                starToTap, newRating, 0
                );

            // Since we removed our change event listener, don't expect any change events from doing this
            for (var i = 1; i <= 4; ++i) {
                actions[i].expectedEvents.change = 0;
            }

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Scrub_Forward = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 3 });

            // Register the test actions we will be taking

            // This test validates that "scrubbing" (touch down on one star and release on another) properly sets the rating.
            //  In this case, we drag from the second star to the fifth star.
            var actions = {
                // touchOver star 2, expecting no event
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 2, this should throw a preview
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 2,
                    styleExpected: "tentative",
                    userRatingExpected: 3
                },
                // Drag to star 3
                3: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[1], rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 3,
                    styleExpected: "tentative",
                    userRatingExpected: 3
                },
                // Drag to star 4
                4: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[2], rating.element.childNodes[3]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 4,
                    styleExpected: "tentative",
                    userRatingExpected: 3
                },
                // Drag to star 5
                5: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[3], rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 5,
                    styleExpected: "tentative",
                    userRatingExpected: 3
                },
                // Release on star 5, expecting change event
                6: {
                    action: function (star) { return function () { ratingUtils.touchUp(star); }; }
                        (rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                    tentativeRatingExpected: 5,
                    userRatingExpected: 5
                },
                // Move off
                7: {
                    action: function (star) { return function () { ratingUtils.touchOver(star, null); }; }
                        (rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Scrub_Backward = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 4, maxRating: 8 });

            // Register the test actions we will be taking

            // This test validates that "scrubbing" (touch down on one star and release on another) properly sets the rating.
            //  In this case, we drag from the 8th star of a rating control with increased maxRating to the 5th star.
            var actions = {
                // touchOver star 8, expecting no event
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; }
                        (rating.element.childNodes[7]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 8, expecting preview
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; }
                        (rating.element.childNodes[7]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 8,
                    styleExpected: "tentative",
                    userRatingExpected: 4
                },
                // Hover to star 7
                3: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[7], rating.element.childNodes[6]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 7,
                    styleExpected: "tentative",
                    userRatingExpected: 4
                },
                // Hover to star 6
                4: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[6], rating.element.childNodes[5]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 6,
                    styleExpected: "tentative",
                    userRatingExpected: 4
                },
                // Hover to star 5
                5: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[5], rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 5,
                    styleExpected: "tentative",
                    userRatingExpected: 4
                },
                // Release on star 5, expecting change
                6: {
                    action: function (star) { return function () { ratingUtils.touchUp(star); }; }
                        (rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                    tentativeRatingExpected: 5,
                    userRatingExpected: 5
                },
                // Move off
                7: {
                    action: function (star) { return function () { ratingUtils.touchOver(star, null); }; }
                        (rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Scrub_NoChange = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8 });

            // Register the test actions we will be taking

            // This test validates that "scrubbing" (touch down on one star and release on another) doesn't throw
            //  a change event if you happen to release on the current rating.
            var actions = {

                // Hover star 5
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; }
                        (rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 5
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; }
                        (rating.element.childNodes[4]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 5,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover to star 6
                3: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[4], rating.element.childNodes[5]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 6,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover to star 7
                4: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[5], rating.element.childNodes[6]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 7,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover back to star 6
                5: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[6], rating.element.childNodes[5]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 6,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Release on star 6, since our starting userRating was 6, no event
                6: {
                    action: function (star) { return function () { ratingUtils.touchUp(star); }; }
                        (rating.element.childNodes[5]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // Move off - since no change, cancel
                7: {
                    action: function (star) { return function () { ratingUtils.touchOver(star, null); }; }
                        (rating.element.childNodes[5]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    userRatingExpected: 6
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Scrub_ClearRating = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8 });

            // Register the test actions we will be taking

            // This test validates that "scrubbing" (touch down on one star and release on another) from one
            //  star all the way off the left side of the control causes the control to "clear" its value
            var actions = {

                // Hover star 3
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; }
                        (rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 3
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; }
                        (rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 3,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover to star 2
                3: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[2], rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 2,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover to star 1
                4: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[1], rating.element.childNodes[0]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 1,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover off left side of control
                5: {
                    action: function (star) {
                        return function () {
                            window['async'].ratingUtils.touchOver(star, null);

                            var rect = window['async'].ratingUtils.getClientRect(star);

                            var event = commonUtils.createPointerEvent("touch");
                            commonUtils.initPointerEvent(event, "pointermove", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, "touch", 0, true);
                            star.dispatchEvent(event);
                        };
                    } (rating.element.childNodes[0]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 0,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Release off left side of control, this should clear the rating and throw a change
                6: {
                    action: function (star) {
                        return function () {
                            var rect = window['async'].ratingUtils.getClientRect(star);

                            var event = commonUtils.createPointerEvent("touch");
                            commonUtils.initPointerEvent(event, "pointerup", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, "touch", 0, true);
                            star.dispatchEvent(event);
                        };
                    } (rating.element.childNodes[0]),
                    expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                    tentativeRatingExpected: 0,
                    styleExpected: "user",
                    userRatingExpected: 0
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Scrub_ClearRating_enableClear_false = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8, enableClear: false });

            // Register the test actions we will be taking

            // This test validates that "scrubbing" (touch down on one star and release on another) from one
            //  star all the way off the left side of the control causes the control to "clear" its value
            var actions = {

                // Hover star 3
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; }
                        (rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 3
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; }
                        (rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 3,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover to star 2
                3: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[2], rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 2,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover to star 1
                4: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[1], rating.element.childNodes[0]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 1,
                    styleExpected: "tentative",
                    userRatingExpected: 6
                },
                // Hover off left side of control, expecting no event (since we can't make the value less than 1)
                5: {
                    action: function (star) {
                        return function () {
                            window['async'].ratingUtils.touchOver(star, null);

                            var rect = window['async'].ratingUtils.getClientRect(star);

                            var event = commonUtils.createPointerEvent("touch");
                            commonUtils.initPointerEvent(event, "pointermove", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, "touch", 0, true);
                            star.dispatchEvent(event);
                        };
                    } (rating.element.childNodes[0]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // Release off left side of control, this should set the value to 1 and throw a change
                6: {
                    action: function (star) {
                        return function () {
                            var rect = window['async'].ratingUtils.getClientRect(star);

                            var event = commonUtils.createPointerEvent("touch");
                            commonUtils.initPointerEvent(event, "pointerup", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, "touch", 0, true);
                            star.dispatchEvent(event);
                        };
                    } (rating.element.childNodes[0]),
                    expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                    tentativeRatingExpected: 1,
                    styleExpected: "user",
                    userRatingExpected: 1
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Tap_PointerCancel = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 3 });

            // Register the test actions we will be taking

            var actions = {
                // touchOver star 2, expecting no event
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 2, this should throw a preview
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 2,
                    styleExpected: "tentative",
                    userRatingExpected: 3
                },
                // Throw an pointercancel.  This should throw a 'cancel' and leave the value set to '3'
                3: {
                    action: function (star) { return function () { ratingUtils.touchCancel(star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    styleExpected: "user",
                    userRatingExpected: 3
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };



        //-----------------------------------------------------------------------------------

        testRating_Touch_Scrub_PointerCancel = function (signalTestCaseCompleted) {
            // Setup the page for test case
            var rating = ratingUtils.instantiate("rating", { userRating: 4 });

            // Register the test actions we will be taking

            var actions = {
                // touchOver star 2, expecting no event
                1: {
                    action: function (star) { return function () { ratingUtils.touchOver(null, star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                // TouchDown on star 2, this should throw a preview
                2: {
                    action: function (star) { return function () { ratingUtils.touchDown(star); }; } (rating.element.childNodes[1]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 2,
                    styleExpected: "tentative",
                    userRatingExpected: 4
                },

                // Hover to star 3, this should throw a preview
                3: {
                    action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                        (rating.element.childNodes[1], rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: 3,
                    styleExpected: "tentative",
                    userRatingExpected: 4
                },
                // Throw an pointercancel.  This should throw a 'cancel' and leave the value set to '4'
                4: {
                    action: function (star) { return function () { ratingUtils.touchCancel(star); }; } (rating.element.childNodes[2]),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    styleExpected: "user",
                    userRatingExpected: 4
                }
            };

            // Run the test
            ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
        };


    };
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RatingTouchTests");
