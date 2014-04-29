// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Rating control mouse tests utilizing simulated UI interaction we can
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
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="../TestLib/util.js"/>
/// <reference path="RatingUtils.js"/>

RatingMouseTests = function () {
    var ratingUtils = new RatingUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function (complete) {
        ratingUtils.setUp(complete);
    };

    this.tearDown = function () {
        ratingUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Lowest = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };





    this.testRating_Hover_Lowest.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Lowest_ShowingAverage = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Hover_Lowest_ShowingAverage.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Lowest_ShowingUser = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating",
            {
                userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
                averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating)
            }
        );

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Hover_Lowest_ShowingUser.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Lowest_Disabled = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating",
            {
                userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
                averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating),
                disabled: true
            }
        );

        // Register the test actions we will be taking
        var actions = ratingUtils.generateMouseHoverActions(
            rating.element.childNodes[0], 1, rating.userRating
        );

        // Since we are disabled, don't expect any events from doing this
        for (var i = 1; i <= 2; ++i) {
            actions[i].expectedEvents.previewchange = 0;
            actions[i].expectedEvents.change = 0;
            actions[i].expectedEvents.cancel = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Hover_Lowest_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Highest = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
            )
        );
    };

    this.testRating_Hover_Highest.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Highest_ShowingAverage = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating], ratingUtils.defaultMaxRating, rating.userRating
            )
        );
    };

    this.testRating_Hover_Highest_ShowingAverage.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Highest_ShowingUser = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
            )
        );
    };

    this.testRating_Hover_Highest_ShowingUser.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Highest_IncreasedMax = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { maxRating: 20, userRating: 15 });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                rating.element.childNodes[rating.maxRating - 1], rating.maxRating, rating.userRating
            )
        );
    };

    this.testRating_Hover_Highest_IncreasedMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Highest_Disabled = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3, disabled: true });

        // Register the test actions we will be taking
        var actions = ratingUtils.generateMouseHoverActions(
            rating.element.childNodes[ratingUtils.defaultMaxRating - 1], 1, rating.userRating
        );

        // Since we are disabled, don't expect any events from doing this
        for (var i = 1; i <= 2; ++i) {
            actions[i].expectedEvents.previewchange = 0;
            actions[i].expectedEvents.change = 0;
            actions[i].expectedEvents.cancel = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Hover_Highest_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Random = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating",
            {
                userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
                averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating)
            }
        );

        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateMouseHoverActions(
                starToClick, newRating, rating.userRating
            )
        );
    };

    this.testRating_Hover_Random.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Random_RemoveEventListener_PreviewChange = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating",
            {
                userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
                averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating)
            }
        );

        rating.removeEventListener("previewchange", ratingUtils.previewchangeListener, false);

        // Register the test actions we will be taking
        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        var actions = ratingUtils.generateMouseHoverActions(
            starToClick, newRating, rating.userRating
        );

        // Since we removed our previewchange handler, don't expect any previewchange events from doing this
        for (var i = 1; i <= 2; ++i) {
            actions[i].expectedEvents.previewchange = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Hover_Random_RemoveEventListener_PreviewChange.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Hover_Random_RemoveEventListener_Cancel = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating",
            {
                userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
                averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating)
            }
        );

        rating.removeEventListener("cancel", ratingUtils.cancelListener, false);

        // Register the test actions we will be taking
        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        var actions = ratingUtils.generateMouseHoverActions(
            starToClick, newRating, rating.userRating
        );

        // Since we removed our cancel handler, don't expect any cancel events from doing this
        for (var i = 1; i <= 2; ++i) {
            actions[i].expectedEvents.cancel = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Hover_Random_RemoveEventListener_Cancel.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Lowest = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Click_Lowest.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Lowest_ShowingAverage = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { averageRating: 3.4 });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Click_Lowest_ShowingAverage.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Lowest_ShowingUser = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3, averageRating: 1.3 });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Click_Lowest_ShowingUser.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Lowest_Disabled = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3, averageRating: 1.3, disabled: true });

        // Register the test actions we will be taking
        var actions = ratingUtils.generateClickActions(
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

    this.testRating_Click_Lowest_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Lowest_SetToMin = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 1 });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Click_Lowest_SetToMin.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Lowest_CustomMax = function (signalTestCaseCompleted) {
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
            ratingUtils.generateClickActions(
                rating.element.childNodes[0], 1, rating.userRating
            )
        );
    };

    this.testRating_Click_Lowest_CustomMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Highest = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
            )
        );
    };

    this.testRating_Click_Highest.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Highest_ShowingAverage = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { averageRating: 3.4 });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating], ratingUtils.defaultMaxRating, rating.userRating
            )
        );
    };

    this.testRating_Click_Highest_ShowingAverage.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Highest_ShowingUser = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, rating.userRating
            )
        );
    };

    this.testRating_Click_Highest_ShowingUser.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Highest_Disabled = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3, disabled: true });

        // Register the test actions we will be taking
        var actions = ratingUtils.generateClickActions(
             rating.element.childNodes[ratingUtils.defaultMaxRating - 1], 1, rating.userRating
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

    this.testRating_Click_Highest_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Highest_SetToMax = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.defaultMaxRating });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[ratingUtils.defaultMaxRating - 1], ratingUtils.defaultMaxRating, ratingUtils.defaultMaxRating
            )
        );
    };

    this.testRating_Click_Highest_SetToMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Highest_CustomMax = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var customMax = ratingUtils.randomInt(1, 20),
            customUserRating = (Math.floor(Math.random() * 2)) ? ratingUtils.randomInt(1, customMax) : 0;

        var rating = ratingUtils.instantiate("rating", { maxRating: customMax, userRating: customUserRating });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[customMax - 1], customMax, customUserRating
            )
        );
    };

    this.testRating_Click_Highest_CustomMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_CurrentRating = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(
                rating.element.childNodes[rating.userRating - 1], rating.userRating, rating.userRating
            )
        );
    };

    this.testRating_Click_CurrentRating.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_CurrentRating_RemoveEventListener_Cancel = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

        rating.removeEventListener("cancel", ratingUtils.cancelListener, false);

        // Register the test actions we will be taking
        var actions = ratingUtils.generateClickActions(
            rating.element.childNodes[rating.userRating - 1], rating.userRating, rating.userRating
        );

        // Since we removed our cancel event listener, don't expect any cancel events from doing this
        for (var i = 1; i <= 4; ++i) {
            actions[i].expectedEvents.cancel = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_CurrentRating_RemoveEventListener_Cancel.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_All_Increasing = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        var newRating = 0,
            starToClick = null;

        // Register the test actions we will be taking
        var actions = {};
        for (var i = 0; i < 4 * ratingUtils.defaultMaxRating; ++i) {
            // Clicking takes 4 events - over, down, up, off - so throw each event every 4th iteration through this loop
            //  (this also explains the "4 * ratingUtils.defaultMaxRating;" in the for loop above)
            switch (i % 4 + 1) {
                case 1:
                    newRating = Math.round(i / 4) + 1;
                    starToClick = rating.element.childNodes[newRating - 1];
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }(starToClick),
                        expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                        tentativeRatingExpected: newRating,
                        styleExpected: "tentative",
                        userRatingExpected: newRating - 1
                    };
                    break;
                case 2:
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseDown(star); }; }(starToClick),
                        expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                    };
                    break;
                case 3:
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseUp(star); }; }(starToClick),
                        expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                        tentativeRatingExpected: newRating,
                        userRatingExpected: newRating
                    };
                    break;
                case 4:
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseOver(star, null); }; }(starToClick),
                        expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                    };
                    break;
            }
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_All_Increasing.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_All_Decreasing = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        var newRating = 0,
            starToClick = null;

        // Register the test actions we will be taking
        var actions = {};
        for (var i = 0; i < 4 * ratingUtils.defaultMaxRating; ++i) {
            // Clicking takes 4 events - over, down, up, off - so throw each event every 4th iteration through this loop
            //  (this also explains the "4 * ratingUtils.defaultMaxRating;" in the for loop above)
            switch (i % 4 + 1) {
                case 1:
                    newRating = ratingUtils.defaultMaxRating - Math.round(i / 4),
                    starToClick = rating.element.childNodes[newRating - 1];

                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }(starToClick),
                        expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                        tentativeRatingExpected: newRating,
                        styleExpected: "tentative",
                        userRatingExpected: (i === 0) ? 0 : newRating + 1
                    };
                    break;
                case 2:
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseDown(star); }; }(starToClick),
                        expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                    };
                    break;
                case 3:
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseUp(star); }; }(starToClick),
                        expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                        tentativeRatingExpected: newRating,
                        userRatingExpected: newRating
                    };
                    break;
                case 4:
                    actions[i + 1] = {
                        action: function (star) { return function () { ratingUtils.mouseOver(star, null); }; }(starToClick),
                        expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                    };
                    break;
            }
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_All_Decreasing.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Random = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(starToClick, newRating, 0));
    };

    this.testRating_Click_Random.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Random_CustomMax = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var customMax = ratingUtils.randomInt(1, 20),
            customUserRating = (Math.floor(Math.random() * 2)) ? ratingUtils.randomInt(1, customMax) : 0;

        var rating = ratingUtils.instantiate("rating", { maxRating: customMax, userRating: customUserRating });

        var newRating = ratingUtils.randomInt(1, customMax),
            starToClick = rating.element.childNodes[newRating - 1];

        // Run the test
        ratingUtils.startAsyncEventTest(
            signalTestCaseCompleted,
            ratingUtils.generateClickActions(starToClick, newRating, customUserRating));
    };

    this.testRating_Click_Random_CustomMax.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Random_Disabled = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3, disabled: true });

        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        // Register the test actions we will be taking
        var actions = ratingUtils.generateClickActions(starToClick, newRating, 0);

        // Since we are disabled, don't expect any events from doing this
        for (var i = 1; i <= 4; ++i) {
            actions[i].expectedEvents.previewchange = 0;
            actions[i].expectedEvents.change = 0;
            actions[i].expectedEvents.cancel = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_Random_Disabled.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Random_RemoveEventListener_PreviewChange = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        rating.removeEventListener("previewchange", ratingUtils.previewchangeListener, false);

        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        // Register the test actions we will be taking
        var actions = ratingUtils.generateClickActions(starToClick, newRating, 0);

        // Since we are removed our previewchange listener, don't expect any previewchange events from doing this
        for (var i = 1; i <= 4; ++i) {
            actions[i].expectedEvents.previewchange = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_Random_RemoveEventListener_PreviewChange.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_Random_RemoveEventListener_Change = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating");

        rating.removeEventListener("change", ratingUtils.changeListener, false);

        var newRating = ratingUtils.randomInt(1, ratingUtils.defaultMaxRating),
            starToClick = rating.element.childNodes[newRating - 1];

        // Register the test actions we will be taking
        var actions = ratingUtils.generateClickActions(starToClick, newRating, 0);

        // Since we are removed our change listener, don't expect any change events from doing this
        for (var i = 1; i <= 4; ++i) {
            actions[i].expectedEvents.change = 0;
        }

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_Random_RemoveEventListener_Change.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Scrub_Forward = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3 });

        // Register the test actions we will be taking

        // This test validates that "scrubbing" (mouse down on one star and release on another) properly sets the rating.
        //  In this case, we drag from the second star to the fifth star.
        var actions = {
            // Hover star 2
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[1]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 2,
                styleExpected: "tentative",
                userRatingExpected: 3
            },
            // MouseDown on star 2
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[1]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Drag to star 3
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[1], rating.element.childNodes[2]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 3,
                styleExpected: "tentative",
                userRatingExpected: 3
            },

            // Drag to star 4
            4: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[2], rating.element.childNodes[3]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 4,
                styleExpected: "tentative",
                userRatingExpected: 3
            },
            // Drag to star 5
            5: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[3], rating.element.childNodes[4]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 5,
                styleExpected: "tentative",
                userRatingExpected: 3
            },
            // Release on star 5, expecting change event
            6: {
                action: function (star) { return function () { ratingUtils.mouseUp(star); }; }
                    (rating.element.childNodes[4]),
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: 5,
                userRatingExpected: 5
            },
            // Move off
            7: {
                action: function (star) { return function () { ratingUtils.mouseOver(star, null); }; }
                    (rating.element.childNodes[4]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Scrub_Forward.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Scrub_Backward = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 7, maxRating: 12 });

        // Register the test actions we will be taking

        // This test validates that "scrubbing" (mouse down on one star and release on another) properly sets the rating.
        //  In this case, we drag from the eleventh star of a rating control with increased maxRating to the eigth star.
        var actions = {
            // Hover star 11
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[10]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 11,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // MouseDown on star 11
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[10]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Drag to star 10
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[10], rating.element.childNodes[9]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 10,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Drag to star 9
            4: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[9], rating.element.childNodes[8]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 9,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Hover to star 8
            5: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[8], rating.element.childNodes[7]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 8,
                styleExpected: "tentative",
                userRatingExpected: 7
            },
            // Release on star 8, expecting change event
            6: {
                action: function (star) { return function () { ratingUtils.mouseUp(star); }; }
                    (rating.element.childNodes[7]),
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: 8,
                userRatingExpected: 8
            },
            // Move off
            7: {
                action: function (star) { return function () { ratingUtils.mouseOver(star, null); }; }
                    (rating.element.childNodes[4]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Scrub_Backward.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Scrub_NoChange = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8 });

        // Register the test actions we will be taking

        // This test validates that "scrubbing" (mouse down on one star and release on another) doesn't throw
        //  a change event if you happen to release on the current rating.
        var actions = {
            // Hover star 5
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[4]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 5,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // MouseDown on star 5
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[4]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Hover to star 6
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[4], rating.element.childNodes[5]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 6,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // Hover to star 7
            4: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[5], rating.element.childNodes[6]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 7,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // Hover back to star 6
            5: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[6], rating.element.childNodes[5]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 6,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // Release on star 6 - since our starting userRating was 6, no event
            6: {
                action: function (star) { return function () { ratingUtils.mouseUp(star); }; }
                    (rating.element.childNodes[5]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Move off - since no change, cancel
            7: {
                action: function (star) { return function () { ratingUtils.mouseOver(star); }; }
                    (rating.element.childNodes[5]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                tentativeRatingExpected: null,
                userRatingExpected: 6
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Scrub_NoChange.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Scrub_ClearRating = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8 });

        // Register the test actions we will be taking

        // This test validates that "scrubbing" (mouse down on one star and release on another) from one
        //  star all the way off the left side of the control causes the control to "clear" its value
        var actions = {

            // Hover star 3
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[2]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 3,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // MouseDown on star 3
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[2]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Hover to star 2
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[2], rating.element.childNodes[1]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 2,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // Hover to star 1
            4: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
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
                        window.async.ratingUtils.mouseOver(star, null);

                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = commonUtils.createPointerEvent();
                        commonUtils.initPointerEvent(event, "pointermove", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                        star.dispatchEvent(event);
                    };
                }(rating.element.childNodes[0]),
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

                        var event = commonUtils.createPointerEvent();
                        commonUtils.initPointerEvent(event, "pointerup", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                        star.dispatchEvent(event);
                    };
                }(rating.element.childNodes[0]),
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: 0,
                styleExpected: "user",
                userRatingExpected: 0
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Scrub_ClearRating.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Scrub_ClearRating_enableClear_false = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 6, maxRating: 8, enableClear: false });

        // Register the test actions we will be taking

        // This test validates that "scrubbing" (touch down on one star and release on another) from one
        //  star all the way off the left side of the control causes the control to "clear" its value
        var actions = {

            // Hover star 3
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[2]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 3,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // MouseDown on star 3
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[2]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Hover to star 2
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[2], rating.element.childNodes[1]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 2,
                styleExpected: "tentative",
                userRatingExpected: 6
            },
            // Hover to star 1
            4: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
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
                        window.async.ratingUtils.mouseOver(star, null);

                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = commonUtils.createPointerEvent();
                        commonUtils.initPointerEvent(event, "pointermove", true, true, window, 0,
                            window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                        star.dispatchEvent(event);
                    };
                }(rating.element.childNodes[0]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Release off left side of control, this should set the value to 1 and throw a change
            6: {
                action: function (star) {
                    return function () {
                        var rect = window.async.ratingUtils.getClientRect(star);

                        var event = commonUtils.createPointerEvent();
                        commonUtils.initPointerEvent(event, "pointerup", true, true, window, 0, window.screenLeft + rect.left - 2, window.screenTop + rect.center.y, rect.left - 2, rect.center.y, false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                        star.dispatchEvent(event);
                    };
                }(rating.element.childNodes[0]),
                expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                tentativeRatingExpected: 1,
                styleExpected: "user",
                userRatingExpected: 1
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Scrub_ClearRating_enableClear_false.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Click_PointerCancel = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 3 });

        // Register the test actions we will be taking

        var actions = {
            // Hover star 2
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[1]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 2,
                styleExpected: "tentative",
                userRatingExpected: 3
            },
            // MouseDown on star 2
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[1]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Throw an pointercancel.  This should throw a 'cancel' and leave the value set to '3'
            3: {
                action: function (star) { return function () { ratingUtils.touchCancel(star); }; }(rating.element.childNodes[1]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                tentativeRatingExpected: null,
                styleExpected: "user",
                userRatingExpected: 3
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Click_PointerCancel.timeout = 30000;

    //-----------------------------------------------------------------------------------

    this.testRating_Scrub_PointerCancel = function (signalTestCaseCompleted) {
        // Setup the page for test case
        var rating = ratingUtils.instantiate("rating", { userRating: 4 });

        // Register the test actions we will be taking

        var actions = {
            // Hover star 2
            1: {
                action: function (star) { return function () { ratingUtils.mouseOver(null, star); }; }
                    (rating.element.childNodes[1]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 2,
                styleExpected: "tentative",
                userRatingExpected: 4
            },
            // MouseDown on star 2
            2: {
                action: function (star) { return function () { ratingUtils.mouseDown(star); }; }
                    (rating.element.childNodes[1]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
            },
            // Hover to star 3, this should throw a preview
            3: {
                action: function (fromElement, toElement) { return function () { ratingUtils.mouseOver(fromElement, toElement); }; }
                    (rating.element.childNodes[1], rating.element.childNodes[2]),
                expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                tentativeRatingExpected: 3,
                styleExpected: "tentative",
                userRatingExpected: 4
            },
            // Throw an pointercancel.  This should throw a 'cancel' and leave the value set to '4'
            4: {
                action: function (star) { return function () { ratingUtils.touchCancel(star); }; }(rating.element.childNodes[2]),
                expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                tentativeRatingExpected: null,
                styleExpected: "user",
                userRatingExpected: 4
            }
        };

        // Run the test
        ratingUtils.startAsyncEventTest(signalTestCaseCompleted, actions);
    };

    this.testRating_Scrub_PointerCancel.timeout = 30000;
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("RatingMouseTests");
