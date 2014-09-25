// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Instantiation test cases for the Rating JavaScript control.  Note that a large
//       percent of the verifications in this file come as part of ratingUtils.instantiate
//
//  Author: sehume
//
//-----------------------------------------------------------------------------
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="RatingUtils.ts"/>

module WinJSTests {
    "use strict";

    var ratingUtils = RatingUtils;
    export class RatingInstantiationTests {


        setUp(complete) {
            ratingUtils.setUp().then(complete);
        }

        tearDown() {
            ratingUtils.cleanUp();
        }

        //-----------------------------------------------------------------------------------

        testRating_Instantiation = function () {
            var rating = ratingUtils.instantiate("rating");

            LiveUnit.Assert.areEqual(undefined, rating.options, "Verify rating.options() (deprecated in M3) is no longer defined on the control.");
            ratingUtils.verifyFunction(rating, "addEventListener");
            ratingUtils.verifyFunction(rating, "removeEventListener");

        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_FromNull = function () {
            var rating = ratingUtils.instantiate(null);

            ratingUtils.verifyFunction(rating, "addEventListener");
            ratingUtils.verifyFunction(rating, "removeEventListener");

        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_WithOptions = function () {
            ratingUtils.instantiate("rating", { maxRating: 10, userRating: 7, averageRating: 5, disabled: !Math.floor(Math.random() * 2) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_FromNull_WithOptions = function () {
            var rating = ratingUtils.instantiate(null, { maxRating: 10, userRating: 7, averageRating: 5, disabled: !Math.floor(Math.random() * 2) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_DynamicAdd = function () {
            // Create the control, and then add it to the pag
            var ratingElement = document.createElement("div");
            ratingElement.id = "rating2";

            ratingUtils.instantiate(ratingElement, { maxRating: 10, userRating: ratingUtils.randomInt(0, 10), averageRating: ratingUtils.random(0, 10) });

            LiveUnit.LoggingCore.logComment("Adding element to page.");
            document.body.appendChild(ratingElement);

            // Make sure the control appears correctly
            ratingUtils.verifyLayout(ratingElement);

            // make sure rating still works by setting some options on it and running full validation code upon doing so
            ratingUtils.setOptionsAndVerify(ratingElement, { maxRating: 5, userRating: ratingUtils.randomInt(0, 5), averageRating: ratingUtils.random(0, 5) });

        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_DynamicAdd_AverageRating1 = function () {
            // Create the control, and then add it to the page
            var ratingElement = document.createElement("div");
            ratingElement.id = "rating2";
            ratingUtils.instantiate(ratingElement, { maxRating: 10, userRating: 0, averageRating: 1 });

            LiveUnit.LoggingCore.logComment("Adding element to page");
            document.body.appendChild(ratingElement);

            // Make sure the control appears correctly
            ratingUtils.verifyLayout(ratingElement);

            // make sure rating still works by setting some options on it and running full validation code upon doing so
            ratingUtils.setOptionsAndVerify(ratingElement, { maxRating: 5, userRating: ratingUtils.randomInt(0, 5), averageRating: ratingUtils.random(0, 5) });

        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_Span = function () {
            ratingUtils.addTag("span", "ratingSpan");
            var rating = ratingUtils.instantiate("ratingSpan");
            ratingUtils.removeElementById("ratingSpan");
        };

        //-----------------------------------------------------------------------------------

        testRating_dir_LTR = function () {
            var ratingElem = ratingUtils.addTag("div", "rating_dir", { dir: "ltr" });
            var rating = ratingUtils.instantiate("rating_dir");
        };

        //-----------------------------------------------------------------------------------

        testRating_dir_RTL = function () {
            document.getElementById("rating").setAttribute("dir", "rtl");
            var rating = ratingUtils.instantiate("rating");
        };

        //-----------------------------------------------------------------------------------

        testRating_dir_RTL_IncreasedMax = function () {
            document.getElementById("rating").setAttribute("dir", "rtl");
            var rating = ratingUtils.instantiate("rating", { maxRating: 25, averageRating: 10.2 });

            ratingUtils.setOptionsAndVerify("rating", { averageRating: 2.75 });
            ratingUtils.setOptionsAndVerify("rating", { averageRating: 27 });

            ratingUtils.setOptionsAndVerify("rating", { userRating: 15 });
            ratingUtils.setOptionsAndVerify("rating", { userRating: 32 });
        };

        //-----------------------------------------------------------------------------------

        testRating_dir_RTL_Readonly = function () {
            document.getElementById("rating").setAttribute("dir", "rtl");
            var rating = ratingUtils.instantiate("rating", { maxRating: 25, averageRating: 10.2, disabled: true });

            ratingUtils.setOptionsAndVerify("rating", { averageRating: 2.75 });
            ratingUtils.setOptionsAndVerify("rating", { averageRating: 27 });

            ratingUtils.setOptionsAndVerify("rating", { userRating: 15 });
            ratingUtils.setOptionsAndVerify("rating", { userRating: 32 });
        };

        //-----------------------------------------------------------------------------------

        testRating_dir_Swap = function () {
            var ratingElem = document.getElementById("rating");

            var rating = ratingUtils.instantiate("rating", { maxRating: 25 });

            // swap dir 10 times
            for (var i = 0; i < 10; ++i) {
                ratingElem.dir = (ratingElem.dir === "rtl") ? "ltr" : "rtl";
                ratingUtils.verifyLayout("rating");

                // Set averageRating and userRating to interesting rules to validate layout wasn't broken during the direction swap.
                ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, rating.maxRating) });
                ratingUtils.setOptionsAndVerify("rating", { averageRating: rating.maxRating + 1 });

                ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, rating.maxRating) });
                ratingUtils.setOptionsAndVerify("rating", { userRating: rating.maxRating + 1 });

                // Every so often, explicitly make sure the control is showing an averageRating when we swap direction
                if (Math.floor(Math.random() * 2)) {
                    ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
                }
            }

        };

        //-----------------------------------------------------------------------------------
        // maxRating Tests
        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Random = function () {
            for (var i = 1; i < 8; ++i) {
                var newMax = i + ratingUtils.randomNewMaxRating(Math.pow(2, i), ratingUtils.defaultMaxRating);
                ratingUtils.instantiate("rating", { maxRating: newMax });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Invalid_0 = function () {
            ratingUtils.instantiate("rating", { maxRating: 0 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Invalid_Null = function () {
            ratingUtils.instantiate("rating", { maxRating: null });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Invalid_Undefined = function () {
            ratingUtils.instantiate("rating", { maxRating: undefined });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Invalid_Negatives = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { maxRating: ratingUtils.randomInt(-50, -1) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Invalid_NumbersAsStrings = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { maxRating: Number(ratingUtils.randomInt(1, 50)).toString() });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };


        //-----------------------------------------------------------------------------------

        testRating_Instantiation_MaxRating_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { maxRating: ratingUtils.randomString(35) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------
        // averageRating Tests
        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Default = function () {
            ratingUtils.instantiate("rating", { averageRating: 3 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);


                ratingUtils.instantiate("rating", { maxRating: newMax, averageRating: ratingUtils.random(1, newMax) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Float_Default = function () {
            ratingUtils.instantiate("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Floats_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

                ratingUtils.instantiate("rating", { maxRating: newMax, averageRating: ratingUtils.random(1, newMax) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_DefaultMax = function () {
            ratingUtils.instantiate("rating", { averageRating: ratingUtils.defaultMaxRating });
        };

        //-----------------------------------------------------------------------------------


        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_0 = function () {
            ratingUtils.instantiate("rating", { averageRating: 0 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_Null = function () {
            ratingUtils.instantiate("rating", { averageRating: null });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_GreaterThanDefaultMax = function () {
            ratingUtils.instantiate("rating", { averageRating: ratingUtils.randomInt(ratingUtils.defaultMaxRating + 1, 50) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_GreaterThanCustomMax = function () {
            var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

            ratingUtils.instantiate("rating", { maxRating: newMax, averageRating: ratingUtils.randomInt(newMax + 1, 50) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_Undefined = function () {
            ratingUtils.instantiate("rating", { averageRating: undefined });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_Negatives = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { averageRating: ratingUtils.random(-50, -0.01) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_NumbersAsStrings = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { averageRating: Number(ratingUtils.random(1, ratingUtils.defaultMaxRating)).toString() });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_AverageRating_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { averageRating: ratingUtils.randomString(35) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------
        // userRating tests
        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Default = function () {
            ratingUtils.instantiate("rating", { userRating: 3 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);

                ratingUtils.instantiate("rating", { maxRating: newMax, userRating: ratingUtils.randomInt(1, newMax) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_DefaultMax = function () {
            ratingUtils.instantiate("rating", { userRating: ratingUtils.defaultMaxRating });
        };


        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_0 = function () {
            ratingUtils.instantiate("rating", { userRating: 0 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_Null = function () {
            ratingUtils.instantiate("rating", { userRating: null });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_GreaterThanDefaultMax = function () {
            ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(ratingUtils.defaultMaxRating + 1, ratingUtils.defaultMaxRating * 2) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_GreaterThanCustomMax = function () {
            var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
            ratingUtils.instantiate("rating", { maxRating: newMax, userRating: ratingUtils.randomInt(newMax + 1, newMax * 2) });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_Float_Default = function () {
            ratingUtils.instantiate("rating", { userRating: 3.1 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_Floats_CustomMax = function () {
            for (var i = 0; i < 10; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);

                ratingUtils.instantiate("rating", { maxRating: newMax, userRating: ratingUtils.randomInt(1, newMax) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_Undefined = function () {
            ratingUtils.instantiate("rating", { userRating: undefined });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_Negatives = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(-50, -1) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_NumbersAsStrings = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating).toString() });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_UserRating_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { userRating: ratingUtils.randomString(35) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------
        // disabled tests
        //-----------------------------------------------------------------------------------

        testRating_Instantiation_disabled_true = function () {
            ratingUtils.instantiate("rating", { disabled: true });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_disabled_false = function () {
            ratingUtils.instantiate("rating", { disabled: false });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_disabled_Invalid_Numbers = function () {
            ratingUtils.instantiate("rating", { disabled: 1 });
            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
            ratingUtils.instantiate("rating", { disabled: 0 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_disabled_Invalid_Strings = function () {
            ratingUtils.instantiate("rating", { disabled: "true" });
            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
            ratingUtils.instantiate("rating", { disabled: "false" });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_disabled_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { disabled: ratingUtils.randomString(35) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------
        // enableClear tests
        //-----------------------------------------------------------------------------------

        testRating_Instantiation_enableClear_true = function () {
            ratingUtils.instantiate("rating", { enableClear: true });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_enableClear_false = function () {
            ratingUtils.instantiate("rating", { enableClear: false });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_enableClear_Invalid_Numbers = function () {
            ratingUtils.instantiate("rating", { enableClear: 1 });
            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
            ratingUtils.instantiate("rating", { enableClear: 0 });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_enableClear_Invalid_Strings = function () {
            ratingUtils.instantiate("rating", { enableClear: "true" });
            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
            ratingUtils.instantiate("rating", { enableClear: "false" });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_enableClear_Invalid_Nonsense = function () {
            for (var i = 0; i < 10; ++i) {
                ratingUtils.instantiate("rating", { enableClear: ratingUtils.randomString(35) });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------
        // tooltipStrings tests
        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_PlainText_DefaultMax = function () {
            var tooltipStrings = [
                "I hated it!",
                "I didn't like it.",
                "It was Okay",
                "I liked it.",
                "I loved it!"
            ];

            ratingUtils.instantiate("rating", { tooltipStrings: tooltipStrings });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_PlainText_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

                var tooltipStrings = new Array();

                for (var j = 0; j < newMax; ++j) {
                    tooltipStrings[j] = ratingUtils.randomString(25);
                }

                ratingUtils.instantiate("rating", { maxRating: newMax, tooltipStrings: tooltipStrings });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_HTML_DefaultMax = function () {
            var tooltipStrings = [
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true)
            ];

            ratingUtils.instantiate("rating", { tooltipStrings: tooltipStrings });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_HTML_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);


                var tooltipStrings = new Array();
                for (var j = 0; j < newMax; ++j) {
                    tooltipStrings[j] = ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true);
                }

                ratingUtils.instantiate("rating", { maxRating: newMax, tooltipStrings: tooltipStrings });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_NULL_DefaultMax = function () {
            ratingUtils.instantiate("rating", { tooltipStrings: null });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_NULL_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

                ratingUtils.instantiate("rating", { maxRating: newMax, tooltipStrings: null });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_TooFew_DefaultMax = function () {
            ratingUtils.instantiate("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3"] });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_TooFew_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

                var tooltipStrings = new Array();
                var tooltips = ratingUtils.randomInt(1, newMax - 1);

                for (var j = 0; j < tooltips; ++j) {
                    tooltipStrings[j] = ratingUtils.randomHTML(ratingUtils.randomInt(1, 5), true);
                }

                ratingUtils.instantiate("rating", { maxRating: newMax, tooltipStrings: tooltipStrings });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_TooManyDefaultMax = function () {
            ratingUtils.instantiate("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3", "tooltip4", "tooltip5", "tooltip6"] });
        };

        //-----------------------------------------------------------------------------------

        testRating_Instantiation_tooltipStrings_TooMany_CustomMax = function () {
            for (var i = 0; i < 5; ++i) {
                var newMax = ratingUtils.randomNewMaxRating(20, ratingUtils.defaultMaxRating);

                var tooltipStrings = new Array();
                var tooltips = ratingUtils.randomInt(newMax + 1, 2 * newMax);

                for (var j = 0; j < tooltips; ++j) {
                    tooltipStrings[j] = ratingUtils.randomHTML(ratingUtils.randomInt(1, 5), true);
                }

                ratingUtils.instantiate("rating", { maxRating: newMax, tooltipStrings: tooltipStrings });

                ratingUtils.removeElementById("rating");
                ratingUtils.addTag("div", "rating");
            }
        };
    };
}
// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RatingInstantiationTests");
