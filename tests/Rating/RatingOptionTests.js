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
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="RatingUtils.js"/>


var OptionTests = function () {
    var ratingUtils = new RatingUtils();

    this.setUp = function (complete) {
        ratingUtils.setUp().then(complete);
    };

    this.tearDown = function () {
        ratingUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------
    // maxRating Tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Default = function () {
        ratingUtils.instantiate("rating");

        // try changing maxRating after instantiation
        ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating) });

        // Set userRating to a value between 1 and maxRating
        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });

        // Try to set userRating to a value greater than maxRating, expecting coercion
        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(ratingUtils.defaultMaxRating + 1, ratingUtils.defaultMaxRating + 10) });

        // Try to set averageRating to a value between 1 and maxRating
        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

        // Try to set averageRating to a value greater than maxRating, expecting coercion
        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(ratingUtils.defaultMaxRating + 0.1, ratingUtils.defaultMaxRating + 10) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Random = function () {
        for (var i = 1; i < 8; ++i) {
            var max = i + ratingUtils.randomNewMaxRating(Math.pow(2, i), ratingUtils.defaultMaxRating);
            ratingUtils.instantiate("rating", { maxRating: max });

            // Try changing maxRating after instantiation, expecting coercion
            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomNewMaxRating(50, max) });

            // Set userRating to a value between 1 and maxRating
            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, max) });

            // Try to set userRating to a value greater than max, expecting coercion
            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(max + 1, max + 20) });

            // Try to set averageRating to a value between 1 and maxRating
            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, max) });

            // Try to set averageRating to a value greater than maxRating, expecting coercion
            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(max + 1, max + 20) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_0 = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { maxRating: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Null = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { maxRating: null });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Undefined = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { maxRating: undefined });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Negatives = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomInt(-50, -1) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_NumbersAsStrings = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomInt(1, 50).toString() });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    // averageRating Tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Integer_Default = function () {
        ratingUtils.instantiate("rating", { averageRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Integer_CustomMax = function () {
        for (var i = 0; i < 10; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
            ratingUtils.instantiate("rating", { maxRating: newMax, averageRating: ratingUtils.randomInt(1, newMax) });
            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, newMax) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Float_Default = function () {
        ratingUtils.instantiate("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Floats_CustomMax = function () {
        for (var i = 0; i < 10; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
            ratingUtils.instantiate("rating", { maxRating: newMax, averageRating: ratingUtils.random(1, newMax) });
            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, newMax) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_DefaultMax = function () {
        ratingUtils.instantiate("rating", { averageRating: ratingUtils.defaultMaxRating });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_CustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);

        ratingUtils.instantiate("rating", { maxRating: newMax });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: newMax });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_0 = function () {
        ratingUtils.instantiate("rating", { averageRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Null = function () {
        ratingUtils.instantiate("rating", { averageRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: null });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(ratingUtils.defaultMaxRating + 1, ratingUtils.defaultMaxRating * 2) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_GreaterThanCustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
        ratingUtils.instantiate("rating", { maxRating: newMax });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(newMax + 1, newMax * 2) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Undefined = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { averageRating: undefined });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Negatives = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(-50, -0.01) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_NumbersAsStrings = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating).toString() });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    // userRating tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Default = function () {
        ratingUtils.instantiate("rating", { userRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 2 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_CustomMax = function () {
        for (var i = 0; i < 10; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
            ratingUtils.instantiate("rating", { maxRating: newMax, userRating: ratingUtils.randomInt(1, newMax) });
            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, newMax) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.defaultMaxRating });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_CustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
        ratingUtils.instantiate("rating", { maxRating: newMax });

        ratingUtils.setOptionsAndVerify("rating", { userRating: newMax });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_0 = function () {
        ratingUtils.instantiate("rating", { userRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Null = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: 2 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: null });

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.defaultMaxRating - 1 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: null });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_GreaterThanDefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(ratingUtils.defaultMaxRating + 1, ratingUtils.defaultMaxRating * 2) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_GreaterThanCustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
        ratingUtils.instantiate("rating", { maxRating: newMax });

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(newMax + 1, newMax * 2) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Float_Default = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Floats_CustomMax = function () {
        for (var i = 0; i < 10; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, newMax) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Undefined = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: undefined });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Negatives = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(-50, -1) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_NumbersAsStrings = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating).toString() });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    // disabled tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_true = function () {
        ratingUtils.instantiate("rating", { disabled: true });

        // Should still be able to set options to whatever we want as disabled only affects user input
        ratingUtils.setOptionsAndVerify("rating", { userRating: 4 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 1 });

        ratingUtils.setOptionsAndVerify("rating", { disabled: false });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 2 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_false = function () {
        ratingUtils.instantiate("rating", { disabled: false });

        // Should still be able to set options to whatever we want as disabled only affects user input
        ratingUtils.setOptionsAndVerify("rating", { userRating: 4 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 1 });

        ratingUtils.setOptionsAndVerify("rating", { disabled: true });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 2 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_Invalid_Numbers = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { disabled: 1 });
        ratingUtils.setOptionsAndVerify("rating", { disabled: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_Invalid_Strings = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { disabled: "true" });
        ratingUtils.setOptionsAndVerify("rating", { disabled: "false" });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating", { disabled: true });

            ratingUtils.setOptionsAndVerify("rating", { disabled: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    // enableClear tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_true = function () {
        ratingUtils.instantiate("rating", { enableClear: true });

        // Should still be able to set options to whatever we want as enableClear only affects user input
        ratingUtils.setOptionsAndVerify("rating", { userRating: 4 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });

        ratingUtils.setOptionsAndVerify("rating", { enableClear: false });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 4 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_false = function () {
        ratingUtils.instantiate("rating", { enableClear: false });

        // Should still be able to set options to whatever we want as enableClear only affects user input
        ratingUtils.setOptionsAndVerify("rating", { userRating: 4 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });

        ratingUtils.setOptionsAndVerify("rating", { enableClear: true });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 4 });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: 1 });
        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_Invalid_Numbers = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { enableClear: 1 });
        ratingUtils.setOptionsAndVerify("rating", { enableClear: 0 });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_Invalid_Strings = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { enableClear: "true" });
        ratingUtils.setOptionsAndVerify("rating", { enableClear: "false" });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating", { enableClear: true });

            ratingUtils.setOptionsAndVerify("rating", { enableClear: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------
    // tooltipStrings tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_PlainText_DefaultMax = function () {
        var tooltipStrings = [
                "I hated it!",
                "I didn't like it.",
                "It was Okay",
                "I liked it.",
                "I loved it!"
        ];

        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_PlainText_DefaultMax_UpdateIndividually = function () {
        var tooltipStrings = [
                "I hated it!",
                "I didn't like it.",
                "It was Okay",
                "I liked it.",
                "I loved it!"
        ];

        var rating = ratingUtils.instantiate("rating");

        for (var i = 0; i < rating.maxRating; ++i) {
            try {
                rating.tooltipStrings[i] = tooltipStrings[i];
            } catch (e) {
                LiveUnit.Assert.fail("Setting tooltip " + i + " to \"" + tooltipStrings[i] + "\" threw exception: " + e.Message);
            }

            ratingUtils.setOptionsAndVerify("rating"); // Use verification in setOptionsAndVerify to verify we didn't break anything
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_PlainText_CustomMax = function () {
        for (var i = 0; i < 10; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

            var tooltipStrings = new Array();

            for (var j = 0; j < newMax; ++j) {
                tooltipStrings[j] = ratingUtils.randomString(25);
            }

            ratingUtils.instantiate("rating", { maxRating: newMax });

            ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_PlainText_CustomMax_UpdateIndividually = function () {
        var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

        var tooltipStrings = new Array();

        for (var j = 0; j < newMax; ++j) {
            tooltipStrings[j] = ratingUtils.randomString(25);
        }

        ratingUtils.instantiate("rating", { maxRating: newMax });

        for (var i = 0; i < rating.maxRating; ++i) {
            try {
                rating.tooltipStrings[i] = tooltipStrings[i];
            } catch (e) {
                LiveUnit.Assert.fail("Setting tooltip " + i + " to \"" + tooltipStrings[i] + "\" threw exception: " + e.Message);
            }

            ratingUtils.setOptionsAndVerify("rating"); // Use verification in setOptionsAndVerify to verify we didn't break anything
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_HTML_DefaultMax = function () {
        var tooltipStrings = [
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true),
                ratingUtils.randomHTML(ratingUtils.randomInt(1, 10), true)
        ];

        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_HTML_CustomMax = function () {
        for (var i = 0; i < 5; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

            var tooltipStrings = new Array();
            for (var j = 0; j < newMax; ++j) {
                tooltipStrings[j] = ratingUtils.randomHTML(ratingUtils.randomInt(1, 5), true);
            }

            ratingUtils.instantiate("rating", { maxRating: newMax });

            ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_Null_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: null });
    };
    
    
    
    


    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_NullStrings_DefaultMax = function () {
        var tooltipStrings = [null, null, null, null, null, null];

        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_NULL_CustomMax = function () {
        for (var i = 0; i < 5; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

            ratingUtils.instantiate("rating", { maxRating: newMax });

            ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: null });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_NullStrings_CustomMax = function () {
        var tooltipStrings = [null, null, null, null, null, null, null];

        ratingUtils.instantiate("rating", { maxRating: tooltipStrings.length - 1 });

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_TooFew_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3"] });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_TooFew_CustomMax = function () {
        for (var i = 0; i < 5; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

            var tooltipStrings = new Array();
            var tooltips = ratingUtils.randomInt(1, newMax - 1);

            for (var j = 0; j < tooltips; ++j) {
                tooltipStrings[j] = ratingUtils.randomHTML(ratingUtils.randomInt(1, 5), true);
            }

            ratingUtils.instantiate("rating", { maxRating: newMax });

            ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_TooMany_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3", "tooltip4", "tooltip5", "tooltip6"] });
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_TooMany_CustomMax = function () {
        for (var i = 0; i < 5; ++i) {
            var newMax = ratingUtils.randomNewMaxRating(25, ratingUtils.defaultMaxRating);

            var tooltipStrings = new Array();
            var tooltips = ratingUtils.randomInt(newMax + 1, newMax * 2);

            for (var j = 0; j < tooltips; ++j) {
                tooltipStrings[j] = ratingUtils.randomHTML(ratingUtils.randomInt(1, 5), true);
            }

            ratingUtils.instantiate("rating", { maxRating: newMax });

            ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_Invalid_Number = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: 5 }, true);
    };
    
    
    
    

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_Invalid_String = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: "Bad Tooltips" }, true);
    };
    
    
    
    
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("OptionTests");