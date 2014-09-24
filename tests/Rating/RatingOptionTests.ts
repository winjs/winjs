// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Option test cases for the Rating JavaScript control.  Note that a large
//       percent of the verifications in this file (such as verifying all options
//       are actually set when passed to options) come as part of ratingUtils.setOptionsAndVerify
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
    export class OptionTests {
        

        setUp(complete) {
            RatingUtils.setUp().then(complete);
        }

        tearDown() {
            RatingUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------
        // maxRating Tests
        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Default = function () {
            RatingUtils.instantiate("rating");

            // try changing maxRating after instantiation
            RatingUtils.setOptionsAndVerify("rating", { maxRating: RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating) });

            // Set userRating to a value between 1 and maxRating
            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });

            // Try to set userRating to a value greater than maxRating, expecting coercion
            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(RatingUtils.defaultMaxRating + 1, RatingUtils.defaultMaxRating + 10) });

            // Try to set averageRating to a value between 1 and maxRating
            RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            // Try to set averageRating to a value greater than maxRating, expecting coercion
            RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(RatingUtils.defaultMaxRating + 0.1, RatingUtils.defaultMaxRating + 10) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Random = function () {
            for (var i = 1; i < 8; ++i) {
                var max = i + RatingUtils.randomNewMaxRating(Math.pow(2, i), RatingUtils.defaultMaxRating);
                RatingUtils.instantiate("rating", { maxRating: max });

                // Try changing maxRating after instantiation, expecting coercion
                RatingUtils.setOptionsAndVerify("rating", { maxRating: RatingUtils.randomNewMaxRating(50, max) });

                // Set userRating to a value between 1 and maxRating
                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(1, max) });

                // Try to set userRating to a value greater than max, expecting coercion
                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(max + 1, max + 20) });

                // Try to set averageRating to a value between 1 and maxRating
                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(1, max) });

                // Try to set averageRating to a value greater than maxRating, expecting coercion
                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(max + 1, max + 20) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Invalid_0 = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { maxRating: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Invalid_Null = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { maxRating: null });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Invalid_Undefined = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { maxRating: undefined });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Invalid_Negatives = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { maxRating: RatingUtils.randomInt(-50, -1) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Invalid_NumbersAsStrings = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { maxRating: RatingUtils.randomInt(1, 50).toString() });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_MaxRating_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { maxRating: RatingUtils.randomString(35) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------
        // averageRating Tests
        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Integer_Default = function () {
            RatingUtils.instantiate("rating", { averageRating: 3 });

            RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Integer_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);
                RatingUtils.instantiate("rating", { maxRating: newMax, averageRating: RatingUtils.randomInt(1, newMax) });
                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(1, newMax) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Float_Default = function () {
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

            RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating) });

        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Floats_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);
                RatingUtils.instantiate("rating", { maxRating: newMax, averageRating: RatingUtils.random(1, newMax) });
                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(1, newMax) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_DefaultMax = function () {
            RatingUtils.instantiate("rating", { averageRating: RatingUtils.defaultMaxRating });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_CustomMax = function () {
            var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);

            RatingUtils.instantiate("rating", { maxRating: newMax });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: newMax });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_0 = function () {
            RatingUtils.instantiate("rating", { averageRating: 3 });

            RatingUtils.setOptionsAndVerify("rating", { averageRating: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_Null = function () {
            RatingUtils.instantiate("rating", { averageRating: 3 });

            RatingUtils.setOptionsAndVerify("rating", { averageRating: null });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(RatingUtils.defaultMaxRating + 1, RatingUtils.defaultMaxRating * 2) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_GreaterThanCustomMax = function () {
            var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);
            RatingUtils.instantiate("rating", { maxRating: newMax });

            RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(newMax + 1, newMax * 2) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_Undefined = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { averageRating: undefined });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_Negatives = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(-50, -0.01) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_NumbersAsStrings = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.random(1, RatingUtils.defaultMaxRating).toString() });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_AverageRating_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { averageRating: RatingUtils.randomString(35) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------
        // userRating tests
        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Default = function () {
            RatingUtils.instantiate("rating", { userRating: 3 });

            RatingUtils.setOptionsAndVerify("rating", { userRating: 2 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);
                RatingUtils.instantiate("rating", { maxRating: newMax, userRating: RatingUtils.randomInt(1, newMax) });
                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(1, newMax) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_DefaultMax = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.defaultMaxRating });
        };








        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_0 = function () {
            RatingUtils.instantiate("rating", { userRating: 3 });

            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_Null = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { userRating: 2 });

            RatingUtils.setOptionsAndVerify("rating", { userRating: null });

            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.defaultMaxRating - 1 });

            RatingUtils.setOptionsAndVerify("rating", { userRating: null });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_GreaterThanDefaultMax = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(RatingUtils.defaultMaxRating + 1, RatingUtils.defaultMaxRating * 2) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_GreaterThanCustomMax = function () {
            var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);
            RatingUtils.instantiate("rating", { maxRating: newMax });

            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(newMax + 1, newMax * 2) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_Float_Default = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating) });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_Floats_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(50, RatingUtils.defaultMaxRating);
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(1, newMax) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_Undefined = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { userRating: undefined });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_Negatives = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(-50, -1) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_NumbersAsStrings = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomInt(1, RatingUtils.defaultMaxRating).toString() });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_UserRating_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating");

                RatingUtils.setOptionsAndVerify("rating", { userRating: RatingUtils.randomString(35) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------
        // disabled tests
        //-----------------------------------------------------------------------------------

        testRating_Options_disabled_true = function () {
            RatingUtils.instantiate("rating", { disabled: true });

            // Should still be able to set options to whatever we want as disabled only affects user input
            RatingUtils.setOptionsAndVerify("rating", { userRating: 4 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 1 });

            RatingUtils.setOptionsAndVerify("rating", { disabled: false });

            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 2 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_disabled_false = function () {
            RatingUtils.instantiate("rating", { disabled: false });

            // Should still be able to set options to whatever we want as disabled only affects user input
            RatingUtils.setOptionsAndVerify("rating", { userRating: 4 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 1 });

            RatingUtils.setOptionsAndVerify("rating", { disabled: true });

            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 2 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_disabled_Invalid_Numbers = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { disabled: 1 });
            RatingUtils.setOptionsAndVerify("rating", { disabled: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_disabled_Invalid_Strings = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { disabled: "true" });
            RatingUtils.setOptionsAndVerify("rating", { disabled: "false" });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_disabled_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating", { disabled: true });

                RatingUtils.setOptionsAndVerify("rating", { disabled: RatingUtils.randomString(35) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------
        // enableClear tests
        //-----------------------------------------------------------------------------------

        testRating_Options_enableClear_true = function () {
            RatingUtils.instantiate("rating", { enableClear: true });

            // Should still be able to set options to whatever we want as enableClear only affects user input
            RatingUtils.setOptionsAndVerify("rating", { userRating: 4 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });

            RatingUtils.setOptionsAndVerify("rating", { enableClear: false });

            RatingUtils.setOptionsAndVerify("rating", { userRating: 4 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_enableClear_false = function () {
            RatingUtils.instantiate("rating", { enableClear: false });

            // Should still be able to set options to whatever we want as enableClear only affects user input
            RatingUtils.setOptionsAndVerify("rating", { userRating: 4 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });

            RatingUtils.setOptionsAndVerify("rating", { enableClear: true });

            RatingUtils.setOptionsAndVerify("rating", { userRating: 4 });
            RatingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
            RatingUtils.setOptionsAndVerify("rating", { userRating: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_enableClear_Invalid_Numbers = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { enableClear: 1 });
            RatingUtils.setOptionsAndVerify("rating", { enableClear: 0 });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_enableClear_Invalid_Strings = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { enableClear: "true" });
            RatingUtils.setOptionsAndVerify("rating", { enableClear: "false" });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_enableClear_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                RatingUtils.instantiate("rating", { enableClear: true });

                RatingUtils.setOptionsAndVerify("rating", { enableClear: RatingUtils.randomString(35) });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------
        // tooltipStrings tests
        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_PlainText_DefaultMax = function () {
            var tooltipStrings = [
                "I hated it!",
                "I didn't like it.",
                "It was Okay",
                "I liked it.",
                "I loved it!"
            ];

            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_PlainText_DefaultMax_UpdateIndividually = function () {
            var tooltipStrings = [
                "I hated it!",
                "I didn't like it.",
                "It was Okay",
                "I liked it.",
                "I loved it!"
            ];

            var rating = RatingUtils.instantiate("rating");

            for (var i = 0; i < rating.maxRating; ++i) {
                try {
                    rating.tooltipStrings[i] = tooltipStrings[i];
                } catch (e) {
                    LiveUnit.Assert.fail("Setting tooltip " + i + " to \"" + tooltipStrings[i] + "\" threw exception: " + e.Message);
                }

                RatingUtils.setOptionsAndVerify("rating"); // Use verification in setOptionsAndVerify to verify we didn't break anything
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_PlainText_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(25, RatingUtils.defaultMaxRating);

                var tooltipStrings = new Array();

                for (var j = 0; j < newMax; ++j) {
                    tooltipStrings[j] = RatingUtils.randomString(25);
                }

                RatingUtils.instantiate("rating", { maxRating: newMax });

                RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };








        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_HTML_DefaultMax = function () {
            var tooltipStrings = [
                RatingUtils.randomHTML(RatingUtils.randomInt(1, 10), true),
                RatingUtils.randomHTML(RatingUtils.randomInt(1, 10), true),
                RatingUtils.randomHTML(RatingUtils.randomInt(1, 10), true),
                RatingUtils.randomHTML(RatingUtils.randomInt(1, 10), true),
                RatingUtils.randomHTML(RatingUtils.randomInt(1, 10), true)
            ];

            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_HTML_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(25, RatingUtils.defaultMaxRating);

                var tooltipStrings = new Array();
                for (var j = 0; j < newMax; ++j) {
                    tooltipStrings[j] = RatingUtils.randomHTML(RatingUtils.randomInt(1, 5), true);
                }

                RatingUtils.instantiate("rating", { maxRating: newMax });

                RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_Null_DefaultMax = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: null });
        };






        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_NullStrings_DefaultMax = function () {
            var tooltipStrings = [null, null, null, null, null, null];

            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_NULL_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(25, RatingUtils.defaultMaxRating);

                RatingUtils.instantiate("rating", { maxRating: newMax });

                RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: null });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_NullStrings_CustomMax = function () {
            var tooltipStrings = [null, null, null, null, null, null, null];

            RatingUtils.instantiate("rating", { maxRating: tooltipStrings.length - 1 });

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_TooFew_DefaultMax = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3"] });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_TooFew_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(25, RatingUtils.defaultMaxRating);

                var tooltipStrings = new Array();
                var tooltips = RatingUtils.randomInt(1, newMax - 1);

                for (var j = 0; j < tooltips; ++j) {
                    tooltipStrings[j] = RatingUtils.randomHTML(RatingUtils.randomInt(1, 5), true);
                }

                RatingUtils.instantiate("rating", { maxRating: newMax });

                RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_TooMany_DefaultMax = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3", "tooltip4", "tooltip5", "tooltip6"] });
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_TooMany_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = RatingUtils.randomNewMaxRating(25, RatingUtils.defaultMaxRating);

                var tooltipStrings = new Array();
                var tooltips = RatingUtils.randomInt(newMax + 1, newMax * 2);

                for (var j = 0; j < tooltips; ++j) {
                    tooltipStrings[j] = RatingUtils.randomHTML(RatingUtils.randomInt(1, 5), true);
                }

                RatingUtils.instantiate("rating", { maxRating: newMax });

                RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

                RatingUtils.removeElementById("rating");
                RatingUtils.addTag("div", "rating");
            }
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_Invalid_Number = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: 5 }, true);
        };





        //-----------------------------------------------------------------------------------

        testRating_Options_tooltipStrings_Invalid_String = function () {
            RatingUtils.instantiate("rating");

            RatingUtils.setOptionsAndVerify("rating", { tooltipStrings: "Bad Tooltips" }, true);
        };




    };
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.OptionTests");