/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

//-----------------------------------------------------------------------------
//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//
//  Abstract:
//
//      Rating control touch tests utilizing simulated UI interaction we can
//      perform exclusively in JavaScript without any additional tools.
//
//  Author: sehume
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="..\TestLib\LegacyLiveUnit\commonutils.js"/>
/// <reference path="RatingUtils.js"/>

RatingTouchTests = function () {
    var ratingUtils = new RatingUtils();

    this.setUp = function () {
        ratingUtils.setUp();
    };

    this.tearDown = function () {
        ratingUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Lowest = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Lowest["Owner"] = "sehume";
    this.testRating_Tap_Lowest["Priority"] = "feature";
    this.testRating_Tap_Lowest["Description"] = "Test tapping on the first star in a default rating";
    this.testRating_Tap_Lowest["Category"] = "touch";
    this.testRating_Tap_Lowest["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Lowest.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Lowest_ShowingAverage = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Lowest_ShowingAverage["Owner"] = "sehume";
    this.testRating_Tap_Lowest_ShowingAverage["Priority"] = "feature";
    this.testRating_Tap_Lowest_ShowingAverage["Description"] = "Test tapping on the first star in a rating control showing an average rating";
    this.testRating_Tap_Lowest_ShowingAverage["Category"] = "touch";
    this.testRating_Tap_Lowest_ShowingAverage["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Lowest_ShowingAverage.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Lowest_ShowingUser = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Lowest_ShowingUser["Owner"] = "sehume";
    this.testRating_Tap_Lowest_ShowingUser["Priority"] = "feature";
    this.testRating_Tap_Lowest_ShowingUser["Description"] = "Test tapping on the first star in a rating control showing a user rating";
    this.testRating_Tap_Lowest_ShowingUser["Category"] = "touch";
    this.testRating_Tap_Lowest_ShowingUser["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Lowest_ShowingUser.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Lowest_Disabled = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Lowest_Disabled["Owner"] = "sehume";
    this.testRating_Tap_Lowest_Disabled["Priority"] = "feature";
    this.testRating_Tap_Lowest_Disabled["Description"] = "Test tapping on the first star in a rating control in disabled state, expecting no events.";
    this.testRating_Tap_Lowest_Disabled["Category"] = "touch";
    this.testRating_Tap_Lowest_Disabled["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Lowest_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Lowest_SetToMin = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Lowest_SetToMin["Owner"] = "sehume";
    this.testRating_Tap_Lowest_SetToMin["Priority"] = "feature";
    this.testRating_Tap_Lowest_SetToMin["Description"] = "Test tapping on the first star in a rating control with userRating already set to 1";
    this.testRating_Tap_Lowest_SetToMin["Category"] = "touch";
    this.testRating_Tap_Lowest_SetToMin["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Lowest_SetToMin.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Lowest_CustomMax = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Lowest_CustomMax["Owner"] = "sehume";
    this.testRating_Tap_Lowest_CustomMax["Priority"] = "feature";
    this.testRating_Tap_Lowest_CustomMax["Description"] = "Test tapping on the first star in a rating control with a custom max";
    this.testRating_Tap_Lowest_CustomMax["Category"] = "touch";
    this.testRating_Tap_Lowest_CustomMax["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Lowest_CustomMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Highest = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Highest["Owner"] = "sehume";
    this.testRating_Tap_Highest["Priority"] = "feature";
    this.testRating_Tap_Highest["Description"] = "Test tapping on the highest star in the default rating control";
    this.testRating_Tap_Highest["Category"] = "touch";
    this.testRating_Tap_Highest["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Highest.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Highest_ShowingAverage = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Highest_ShowingAverage["Owner"] = "sehume";
    this.testRating_Tap_Highest_ShowingAverage["Priority"] = "feature";
    this.testRating_Tap_Highest_ShowingAverage["Description"] = "Test tapping on the highest star in a rating control showing an average rating";
    this.testRating_Tap_Highest_ShowingAverage["Category"] = "touch";
    this.testRating_Tap_Highest_ShowingAverage["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Highest_ShowingAverage.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Highest_ShowingUser = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Highest_ShowingUser["Owner"] = "sehume";
    this.testRating_Tap_Highest_ShowingUser["Priority"] = "feature";
    this.testRating_Tap_Highest_ShowingUser["Description"] = "Test tapping on the highest star in a rating control showing a user rating";
    this.testRating_Tap_Highest_ShowingUser["Category"] = "touch";
    this.testRating_Tap_Highest_ShowingUser["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Highest_ShowingUser.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Highest_Disabled = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Highest_Disabled["Owner"] = "sehume";
    this.testRating_Tap_Highest_Disabled["Priority"] = "feature";
    this.testRating_Tap_Highest_Disabled["Description"] = "Test tapping on the highest star in a rating control in disabled state, expecting no events.";
    this.testRating_Tap_Highest_Disabled["Category"] = "touch";
    this.testRating_Tap_Highest_Disabled["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Highest_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Highest_SetToMax = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Highest_SetToMax["Owner"] = "sehume";
    this.testRating_Tap_Highest_SetToMax["Priority"] = "feature";
    this.testRating_Tap_Highest_SetToMax["Description"] = "Test tapping on the last star in a rating control with userRating already set to max";
    this.testRating_Tap_Highest_SetToMax["Category"] = "touch";
    this.testRating_Tap_Highest_SetToMax["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Highest_SetToMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Highest_CustomMax = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Highest_CustomMax["Owner"] = "sehume";
    this.testRating_Tap_Highest_CustomMax["Priority"] = "feature";
    this.testRating_Tap_Highest_CustomMax["Description"] = "Test tapping on the highest star in a custom rating control";
    this.testRating_Tap_Highest_CustomMax["Category"] = "touch";
    this.testRating_Tap_Highest_CustomMax["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Highest_CustomMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_CurrentRating = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_CurrentRating["Owner"] = "sehume";
    this.testRating_Tap_CurrentRating["Priority"] = "feature";
    this.testRating_Tap_CurrentRating["Description"] = "Test tapping on the current user rating";
    this.testRating_Tap_CurrentRating["Category"] = "mouse";
    this.testRating_Tap_CurrentRating["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_CurrentRating.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel["Owner"] = "sehume";
    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel["Priority"] = "feature";
    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel["Description"] = "Test tapping on the current user rating after removing the 'cancel' event listener (which this interaction throws).";
    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel["Category"] = "touch";
    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_CurrentRating_RemoveEventListener_Cancel.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_All_Increasing = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_All_Increasing["Owner"] = "sehume";
    this.testRating_Tap_All_Increasing["Priority"] = "feature";
    this.testRating_Tap_All_Increasing["Description"] = "Test tapping on each of the stars in a default rating control from first to last";
    this.testRating_Tap_All_Increasing["Category"] = "touch";
    this.testRating_Tap_All_Increasing["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_All_Increasing.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_All_Decreasing = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_All_Decreasing["Owner"] = "sehume";
    this.testRating_Tap_All_Decreasing["Priority"] = "feature";
    this.testRating_Tap_All_Decreasing["Description"] = "Test tapping on each of the stars in a default rating control from last to first";
    this.testRating_Tap_All_Decreasing["Category"] = "touch";
    this.testRating_Tap_All_Decreasing["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_All_Decreasing.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Random = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Random["Owner"] = "sehume";
    this.testRating_Tap_Random["Priority"] = "feature";
    this.testRating_Tap_Random["Description"] = "Test tapping on a random star in a default rating.";
    this.testRating_Tap_Random["Category"] = "touch";
    this.testRating_Tap_Random["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Random.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Random_Disabled = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Random_Disabled["Owner"] = "sehume";
    this.testRating_Tap_Random_Disabled["Priority"] = "feature";
    this.testRating_Tap_Random_Disabled["Description"] = "Test randomly tapping stars in a disabled rating control, expecting no events.";
    this.testRating_Tap_Random_Disabled["Category"] = "touch";
    this.testRating_Tap_Random_Disabled["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Random_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Tap_Random_RemoveEventListener_Change = function (signalTestCaseCompleted) {
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
    this.testRating_Tap_Random_RemoveEventListener_Change["Owner"] = "sehume";
    this.testRating_Tap_Random_RemoveEventListener_Change["Priority"] = "feature";
    this.testRating_Tap_Random_RemoveEventListener_Change["Description"] = "Test tapping on a random star in a default rating after removing the 'change' event listener.";
    this.testRating_Tap_Random_RemoveEventListener_Change["Category"] = "touch";
    this.testRating_Tap_Random_RemoveEventListener_Change["LiveUnit.IsAsync"] = true;
    this.testRating_Tap_Random_RemoveEventListener_Change.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Scrub_Forward = function (signalTestCaseCompleted) {
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
    this.testRating_Touch_Scrub_Forward["Owner"] = "sehume";
    this.testRating_Touch_Scrub_Forward["Priority"] = "feature";
    this.testRating_Touch_Scrub_Forward["Description"] = "Test scrubbing to pick a rating, scrubbing forward from 2 to 5";
    this.testRating_Touch_Scrub_Forward["Category"] = "touch";
    this.testRating_Touch_Scrub_Forward["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Scrub_Forward.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Scrub_Backward = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 7, maxRating: 12 });

        // Register the test actions we will be taking

        // This test validates that "scrubbing" (touch down on one star and release on another) properly sets the rating.
        //  In this case, we drag from the eleventh star of a rating control with increased maxRating to the eigth star.
        var actions = {
            // touchOver star 11, expecting no event
            1: {
                action: function (star) { return function () { ratingUtils.touchOver(null, star); }; }
                (rating.element.childNodes[10]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // TouchDown on star 11, expecting preview
            2: {
                action: function (star) { return function () { ratingUtils.touchDown(star); }; }
                (rating.element.childNodes[10]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 11,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Hover to star 10
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                (rating.element.childNodes[10], rating.element.childNodes[9]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 10,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Hover to star 9
            4: {
                action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                (rating.element.childNodes[9], rating.element.childNodes[8]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 9,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Hover to star 8
            5: {
                action: function (fromElement, toElement) { return function () { ratingUtils.touchOver(fromElement, toElement); }; }
                (rating.element.childNodes[8], rating.element.childNodes[7]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 8,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Release on star 8, expecting change
            6: {
                action: function (star) { return function () { ratingUtils.touchUp(star); }; }
                (rating.element.childNodes[7]),
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: 8,
                userRatingExpected: 8
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
    this.testRating_Touch_Scrub_Backward["Owner"] = "sehume";
    this.testRating_Touch_Scrub_Backward["Priority"] = "feature";
    this.testRating_Touch_Scrub_Backward["Description"] = "Test scrubbing to pick a rating, scrubbing backward from 11 to 8";
    this.testRating_Touch_Scrub_Backward["Category"] = "touch";
    this.testRating_Touch_Scrub_Backward["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Scrub_Backward.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Scrub_NoChange = function (signalTestCaseCompleted) {
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
    this.testRating_Touch_Scrub_NoChange["Owner"] = "sehume";
    this.testRating_Touch_Scrub_NoChange["Priority"] = "feature";
    this.testRating_Touch_Scrub_NoChange["Description"] = "Test scrubbing to pick a rating and landing on starting rating";
    this.testRating_Touch_Scrub_NoChange["Category"] = "touch";
    this.testRating_Touch_Scrub_NoChange["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Scrub_NoChange.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Scrub_ClearRating = function (signalTestCaseCompleted) {
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
                        window.async.ratingUtils.touchOver(star, null);

                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = document.createEvent("PointerEvent");
                        event.initPointerEvent("pointermove", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
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
                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = document.createEvent("PointerEvent");
                        event.initPointerEvent("pointerup", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
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
    this.testRating_Touch_Scrub_ClearRating["Owner"] = "sehume";
    this.testRating_Touch_Scrub_ClearRating["Priority"] = "feature";
    this.testRating_Touch_Scrub_ClearRating["Description"] = "Test scrubbing off the left side of the control to clear your rating";
    this.testRating_Touch_Scrub_ClearRating["Category"] = "touch";
    this.testRating_Touch_Scrub_ClearRating["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Scrub_ClearRating.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Scrub_ClearRating_enableClear_false = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8, enableClear: false});

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
                        window.async.ratingUtils.touchOver(star, null);

                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = document.createEvent("PointerEvent");
                        event.initPointerEvent("pointermove", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                        star.dispatchEvent(event);
                    };
                } (rating.element.childNodes[0]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Release off left side of control, this should set the value to 1 and throw a change
            6: {
                action: function (star) {
                    return function () {
                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = document.createEvent("PointerEvent");
                        event.initPointerEvent("pointerup", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
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
    this.testRating_Touch_Scrub_ClearRating_enableClear_false["Owner"] = "sehume";
    this.testRating_Touch_Scrub_ClearRating_enableClear_false["Priority"] = "feature";
    this.testRating_Touch_Scrub_ClearRating_enableClear_false["Description"] = "Test scrubbing off the left side of the control to clear your rating on a control that doesn't allow you to do so.";
    this.testRating_Touch_Scrub_ClearRating_enableClear_false["Category"] = "touch";
    this.testRating_Touch_Scrub_ClearRating_enableClear_false["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Scrub_ClearRating_enableClear_false.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Tap_PointerCancel = function (signalTestCaseCompleted) {
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
    this.testRating_Touch_Tap_PointerCancel["Owner"] = "sehume";
    this.testRating_Touch_Tap_PointerCancel["Priority"] = "feature";
    this.testRating_Touch_Tap_PointerCancel["Description"] = "Test receiving pointercancel event mid-tap";
    this.testRating_Touch_Tap_PointerCancel["Category"] = "touch";
    this.testRating_Touch_Tap_PointerCancel["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Tap_PointerCancel.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Touch_Scrub_PointerCancel = function (signalTestCaseCompleted) {
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
    this.testRating_Touch_Scrub_PointerCancel["Owner"] = "sehume";
    this.testRating_Touch_Scrub_PointerCancel["Priority"] = "feature";
    this.testRating_Touch_Scrub_PointerCancel["Description"] = "Test receiving pointercancel event mid-scrub";
    this.testRating_Touch_Scrub_PointerCancel["Category"] = "touch";
    this.testRating_Touch_Scrub_PointerCancel["LiveUnit.IsAsync"] = true;
    this.testRating_Touch_Scrub_PointerCancel.timeout = 30000;
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("RatingTouchTests");
