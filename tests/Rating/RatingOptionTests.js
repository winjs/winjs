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
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="RatingUtils.js"/>


var OptionTests = function () {
    var ratingUtils = new RatingUtils();

    this.setUp = function (complete) {
        ratingUtils.setUp(complete);
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
    this.testRating_Options_MaxRating_Default["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Default["Priority"] = "feature";
    this.testRating_Options_MaxRating_Default["Description"] = "Test setting maxRating on a default rating control (expecting failure)";
    this.testRating_Options_MaxRating_Default["Category"] = "Options";

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
    this.testRating_Options_MaxRating_Random["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Random["Priority"] = "feature";
    this.testRating_Options_MaxRating_Random["Description"] = "Test setting maxRating on ratings controls with varying default maxRating values (expecting failure)";
    this.testRating_Options_MaxRating_Random["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_0 = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { maxRating: 0 });
    };
    this.testRating_Options_MaxRating_Invalid_0["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Invalid_0["Priority"] = "feature";
    this.testRating_Options_MaxRating_Invalid_0["Description"] = "Test setting maxRating option to 0";
    this.testRating_Options_MaxRating_Invalid_0["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Null = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { maxRating: null });
    };
    this.testRating_Options_MaxRating_Invalid_Null["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Invalid_Null["Priority"] = "feature";
    this.testRating_Options_MaxRating_Invalid_Null["Description"] = "Test setting maxRating option to null";
    this.testRating_Options_MaxRating_Invalid_Null["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Undefined = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { maxRating: undefined });
    };
    this.testRating_Options_MaxRating_Invalid_Undefined["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Invalid_Undefined["Priority"] = "feature";
    this.testRating_Options_MaxRating_Invalid_Undefined["Description"] = "Test setting maxRating option to undefined";
    this.testRating_Options_MaxRating_Invalid_Undefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Negatives = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomInt(-50, -1) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_MaxRating_Invalid_Negatives["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Invalid_Negatives["Priority"] = "feature";
    this.testRating_Options_MaxRating_Invalid_Negatives["Description"] = "Test setting maxRating option to random negative numbers";
    this.testRating_Options_MaxRating_Invalid_Negatives["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_NumbersAsStrings = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomInt(1, 50).toString() });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_MaxRating_Invalid_NumbersAsStrings["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Invalid_NumbersAsStrings["Priority"] = "feature";
    this.testRating_Options_MaxRating_Invalid_NumbersAsStrings["Description"] = "Test setting maxRating option to random negative numbers";
    this.testRating_Options_MaxRating_Invalid_NumbersAsStrings["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_MaxRating_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { maxRating: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_MaxRating_Invalid_Nonsense["Owner"] = "sehume";
    this.testRating_Options_MaxRating_Invalid_Nonsense["Priority"] = "feature";
    this.testRating_Options_MaxRating_Invalid_Nonsense["Description"] = "Test setting maxRating option to random nonsense strings";
    this.testRating_Options_MaxRating_Invalid_Nonsense["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    // averageRating Tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Integer_Default = function () {
        ratingUtils.instantiate("rating", { averageRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });
    };
    this.testRating_Options_AverageRating_Integer_Default["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Integer_Default["Priority"] = "feature";
    this.testRating_Options_AverageRating_Integer_Default["Description"] = "Test setting averageRating option to an integer on default control";
    this.testRating_Options_AverageRating_Integer_Default["Category"] = "Options";

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
    this.testRating_Options_AverageRating_Integer_CustomMax["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Integer_CustomMax["Priority"] = "feature";
    this.testRating_Options_AverageRating_Integer_CustomMax["Description"] = "Test setting averageRating option to an integer on rating control with custom max";
    this.testRating_Options_AverageRating_Integer_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Float_Default = function () {
        ratingUtils.instantiate("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating) });

    };
    this.testRating_Options_AverageRating_Float_Default["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Float_Default["Priority"] = "feature";
    this.testRating_Options_AverageRating_Float_Default["Description"] = "Test averageRating option set to random floating point values";
    this.testRating_Options_AverageRating_Float_Default["Category"] = "Options";

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
    this.testRating_Options_AverageRating_Floats_CustomMax["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Floats_CustomMax["Priority"] = "feature";
    this.testRating_Options_AverageRating_Floats_CustomMax["Description"] = "Test averageRating option set to random floating point values";
    this.testRating_Options_AverageRating_Floats_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_DefaultMax = function () {
        ratingUtils.instantiate("rating", { averageRating: ratingUtils.defaultMaxRating });
    };
    this.testRating_Options_AverageRating_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_AverageRating_DefaultMax["Priority"] = "feature";
    this.testRating_Options_AverageRating_DefaultMax["Description"] = "Test averageRating option set equal to the default max.";
    this.testRating_Options_AverageRating_DefaultMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_CustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);

        ratingUtils.instantiate("rating", { maxRating: newMax });
        ratingUtils.setOptionsAndVerify("rating", { averageRating: newMax });
    };
    this.testRating_Options_AverageRating_CustomMax["Owner"] = "sehume";
    this.testRating_Options_AverageRating_CustomMax["Priority"] = "feature";
    this.testRating_Options_AverageRating_CustomMax["Description"] = "Test averageRating option set equal to a random max.";
    this.testRating_Options_AverageRating_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_0 = function () {
        ratingUtils.instantiate("rating", { averageRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: 0 });
    };
    this.testRating_Options_AverageRating_0["Owner"] = "sehume";
    this.testRating_Options_AverageRating_0["Priority"] = "feature";
    this.testRating_Options_AverageRating_0["Description"] = "Test setting averageRating option to 0";
    this.testRating_Options_AverageRating_0["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Null = function () {
        ratingUtils.instantiate("rating", { averageRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: null });
    };
    this.testRating_Options_AverageRating_Invalid_Null["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_Null["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_Null["Description"] = "Test setting averageRating option to null";
    this.testRating_Options_AverageRating_Invalid_Null["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(ratingUtils.defaultMaxRating + 1, ratingUtils.defaultMaxRating * 2) });
    };
    this.testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax["Description"] = "Test averageRating option set greater than the default max.";
    this.testRating_Options_AverageRating_Invalid_GreaterThanDefaultMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_GreaterThanCustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
        ratingUtils.instantiate("rating", { maxRating: newMax });

        ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(newMax + 1, newMax * 2) });
    };
    this.testRating_Options_AverageRating_Invalid_GreaterThanCustomMax["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_GreaterThanCustomMax["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_GreaterThanCustomMax["Description"] = "Test averageRating option set greater than a random max";
    this.testRating_Options_AverageRating_Invalid_GreaterThanCustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Undefined = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { averageRating: undefined });
    };
    this.testRating_Options_AverageRating_Invalid_Undefined["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_Undefined["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_Undefined["Description"] = "Test setting averageRating option to undefined";
    this.testRating_Options_AverageRating_Invalid_Undefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Negatives = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(-50, -0.01) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_AverageRating_Invalid_Negatives["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_Negatives["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_Negatives["Description"] = "Test setting averageRating option to random negative numbers";
    this.testRating_Options_AverageRating_Invalid_Negatives["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_NumbersAsStrings = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.random(1, ratingUtils.defaultMaxRating).toString() });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_AverageRating_Invalid_NumbersAsStrings["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_NumbersAsStrings["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_NumbersAsStrings["Description"] = "Test setting averageRating option to random numbers, converted to strings";
    this.testRating_Options_AverageRating_Invalid_NumbersAsStrings["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_AverageRating_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { averageRating: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_AverageRating_Invalid_Nonsense["Owner"] = "sehume";
    this.testRating_Options_AverageRating_Invalid_Nonsense["Priority"] = "feature";
    this.testRating_Options_AverageRating_Invalid_Nonsense["Description"] = "Test setting averageRating option to random nonsense strings";
    this.testRating_Options_AverageRating_Invalid_Nonsense["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    // userRating tests
    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Default = function () {
        ratingUtils.instantiate("rating", { userRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 2 });
    };
    this.testRating_Options_UserRating_Default["Owner"] = "sehume";
    this.testRating_Options_UserRating_Default["Priority"] = "feature";
    this.testRating_Options_UserRating_Default["Description"] = "Test userRating option on default control";
    this.testRating_Options_UserRating_Default["Category"] = "Options";

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
    this.testRating_Options_UserRating_CustomMax["Owner"] = "sehume";
    this.testRating_Options_UserRating_CustomMax["Priority"] = "feature";
    this.testRating_Options_UserRating_CustomMax["Description"] = "Test userRating option on rating control with custom max";
    this.testRating_Options_UserRating_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.defaultMaxRating });
    };
    this.testRating_Options_UserRating_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_UserRating_DefaultMax["Priority"] = "feature";
    this.testRating_Options_UserRating_DefaultMax["Description"] = "Test userRating option set equal to the default max.";
    this.testRating_Options_UserRating_DefaultMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_CustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
        ratingUtils.instantiate("rating", { maxRating: newMax });

        ratingUtils.setOptionsAndVerify("rating", { userRating: newMax });
    };
    this.testRating_Options_UserRating_CustomMax["Owner"] = "sehume";
    this.testRating_Options_UserRating_CustomMax["Priority"] = "feature";
    this.testRating_Options_UserRating_CustomMax["Description"] = "Test userRating option set equal to a random max.";
    this.testRating_Options_UserRating_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_0 = function () {
        ratingUtils.instantiate("rating", { userRating: 3 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: 0 });
    };
    this.testRating_Options_UserRating_0["Owner"] = "sehume";
    this.testRating_Options_UserRating_0["Priority"] = "feature";
    this.testRating_Options_UserRating_0["Description"] = "Test setting userRating option to 0";
    this.testRating_Options_UserRating_0["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Null = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: 2 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: null });

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.defaultMaxRating - 1 });

        ratingUtils.setOptionsAndVerify("rating", { userRating: null });
    };
    this.testRating_Options_UserRating_Invalid_Null["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_Null["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_Null["Description"] = "Test setting userRating option to null";
    this.testRating_Options_UserRating_Invalid_Null["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_GreaterThanDefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(ratingUtils.defaultMaxRating + 1, ratingUtils.defaultMaxRating * 2) });
    };
    this.testRating_Options_UserRating_Invalid_GreaterThanDefaultMax["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_GreaterThanDefaultMax["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_GreaterThanDefaultMax["Description"] = "Test userRating option set greater than the default max.";
    this.testRating_Options_UserRating_Invalid_GreaterThanDefaultMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_GreaterThanCustomMax = function () {
        var newMax = ratingUtils.randomNewMaxRating(50, ratingUtils.defaultMaxRating);
        ratingUtils.instantiate("rating", { maxRating: newMax });

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(newMax + 1, newMax * 2) });
    };
    this.testRating_Options_UserRating_Invalid_GreaterThanCustomMax["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_GreaterThanCustomMax["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_GreaterThanCustomMax["Description"] = "Test userRating option set greater than a random max";
    this.testRating_Options_UserRating_Invalid_GreaterThanCustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Float_Default = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating) });
    };
    this.testRating_Options_UserRating_Invalid_Float_Default["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_Float_Default["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_Float_Default["Description"] = "Test userRating option set to random floating point values";
    this.testRating_Options_UserRating_Invalid_Float_Default["Category"] = "Options";

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
    this.testRating_Options_UserRating_Invalid_Floats_CustomMax["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_Floats_CustomMax["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_Floats_CustomMax["Description"] = "Test userRating option set to random floating point values";
    this.testRating_Options_UserRating_Invalid_Floats_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Undefined = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { userRating: undefined });
    };
    this.testRating_Options_UserRating_Invalid_Undefined["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_Undefined["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_Undefined["Description"] = "Test setting userRating option to undefined";
    this.testRating_Options_UserRating_Invalid_Undefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Negatives = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(-50, -1) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_UserRating_Invalid_Negatives["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_Negatives["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_Negatives["Description"] = "Test setting userRating option to random negative numbers";
    this.testRating_Options_UserRating_Invalid_Negatives["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_NumbersAsStrings = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomInt(1, ratingUtils.defaultMaxRating).toString() });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_UserRating_Invalid_NumbersAsStrings["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_NumbersAsStrings["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_NumbersAsStrings["Description"] = "Test setting userRating option to random numbers, converted to strings";
    this.testRating_Options_UserRating_Invalid_NumbersAsStrings["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_UserRating_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating");

            ratingUtils.setOptionsAndVerify("rating", { userRating: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_UserRating_Invalid_Nonsense["Owner"] = "sehume";
    this.testRating_Options_UserRating_Invalid_Nonsense["Priority"] = "feature";
    this.testRating_Options_UserRating_Invalid_Nonsense["Description"] = "Test setting userRating option to random nonsense strings";
    this.testRating_Options_UserRating_Invalid_Nonsense["Category"] = "Options";

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
    this.testRating_Options_disabled_true["Owner"] = "sehume";
    this.testRating_Options_disabled_true["Priority"] = "feature";
    this.testRating_Options_disabled_true["Description"] = "Test disabled Option set to 'true'";
    this.testRating_Options_disabled_true["Category"] = "Options";

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
    this.testRating_Options_disabled_false["Owner"] = "sehume";
    this.testRating_Options_disabled_false["Priority"] = "feature";
    this.testRating_Options_disabled_false["Description"] = "Test disabled Option set to 'false'";
    this.testRating_Options_disabled_false["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_Invalid_Numbers = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { disabled: 1 });
        ratingUtils.setOptionsAndVerify("rating", { disabled: 0 });
    };
    this.testRating_Options_disabled_Invalid_Numbers["Owner"] = "sehume";
    this.testRating_Options_disabled_Invalid_Numbers["Priority"] = "feature";
    this.testRating_Options_disabled_Invalid_Numbers["Description"] = "Test setting disabled option to 1 or 0";
    this.testRating_Options_disabled_Invalid_Numbers["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_Invalid_Strings = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { disabled: "true" });
        ratingUtils.setOptionsAndVerify("rating", { disabled: "false" });
    };
    this.testRating_Options_disabled_Invalid_Strings["Owner"] = "sehume";
    this.testRating_Options_disabled_Invalid_Strings["Priority"] = "feature";
    this.testRating_Options_disabled_Invalid_Strings["Description"] = "Test setting disabled option to the strings 'true' or 'false'";
    this.testRating_Options_disabled_Invalid_Strings["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_disabled_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating", { disabled: true });

            ratingUtils.setOptionsAndVerify("rating", { disabled: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_disabled_Invalid_Nonsense["Owner"] = "sehume";
    this.testRating_Options_disabled_Invalid_Nonsense["Priority"] = "feature";
    this.testRating_Options_disabled_Invalid_Nonsense["Description"] = "Test setting disabled option to random nonsense strings";
    this.testRating_Options_disabled_Invalid_Nonsense["Category"] = "Options";

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
    this.testRating_Options_enableClear_true["Owner"] = "sehume";
    this.testRating_Options_enableClear_true["Priority"] = "IDX";
    this.testRating_Options_enableClear_true["Description"] = "Test enableClear Option set to 'true'";
    this.testRating_Options_enableClear_true["Category"] = "Options";

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
    this.testRating_Options_enableClear_false["Owner"] = "sehume";
    this.testRating_Options_enableClear_false["Priority"] = "IDX";
    this.testRating_Options_enableClear_false["Description"] = "Test enableClear Option set to 'false'";
    this.testRating_Options_enableClear_false["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_Invalid_Numbers = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { enableClear: 1 });
        ratingUtils.setOptionsAndVerify("rating", { enableClear: 0 });
    };
    this.testRating_Options_enableClear_Invalid_Numbers["Owner"] = "sehume";
    this.testRating_Options_enableClear_Invalid_Numbers["Priority"] = "IDX";
    this.testRating_Options_enableClear_Invalid_Numbers["Description"] = "Test setting enableClear option to 1 or 0";
    this.testRating_Options_enableClear_Invalid_Numbers["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_Invalid_Strings = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { enableClear: "true" });
        ratingUtils.setOptionsAndVerify("rating", { enableClear: "false" });
    };
    this.testRating_Options_enableClear_Invalid_Strings["Owner"] = "sehume";
    this.testRating_Options_enableClear_Invalid_Strings["Priority"] = "IDX";
    this.testRating_Options_enableClear_Invalid_Strings["Description"] = "Test setting enableClear option to the strings 'true' or 'false'";
    this.testRating_Options_enableClear_Invalid_Strings["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_enableClear_Invalid_Nonsense = function () {
        for (var i = 0; i < 10; ++i) {
            ratingUtils.instantiate("rating", { enableClear: true });

            ratingUtils.setOptionsAndVerify("rating", { enableClear: ratingUtils.randomString(35) });

            ratingUtils.removeElementById("rating");
            ratingUtils.addTag("div", "rating");
        }
    };
    this.testRating_Options_enableClear_Invalid_Nonsense["Owner"] = "sehume";
    this.testRating_Options_enableClear_Invalid_Nonsense["Priority"] = "IDX";
    this.testRating_Options_enableClear_Invalid_Nonsense["Description"] = "Test setting enableClear option to random nonsense strings";
    this.testRating_Options_enableClear_Invalid_Nonsense["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax["Priority"] = "feature";
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax["Description"] = "Test setting tooltipStrings to plain text";
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax_UpdateIndividually["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax_UpdateIndividually["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax_UpdateIndividually["Description"] = "Test setting tooltipStrings to plain text on a per-tooltip basis";
    this.testRating_Options_tooltipStrings_PlainText_DefaultMax_UpdateIndividually["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_PlainText_CustomMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_PlainText_CustomMax["Priority"] = "feature";
    this.testRating_Options_tooltipStrings_PlainText_CustomMax["Description"] = "Test setting tooltipStrings to plain text with custom maxRating ";
    this.testRating_Options_tooltipStrings_PlainText_CustomMax["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_PlainText_CustomMax_UpdateIndividually["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_PlainText_CustomMax_UpdateIndividually["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_PlainText_CustomMax_UpdateIndividually["Description"] = "Test setting tooltipStrings to plain text on a per-tooltip basis with custom maxRating";
    this.testRating_Options_tooltipStrings_PlainText_CustomMax_UpdateIndividually["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_HTML_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_HTML_DefaultMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_HTML_DefaultMax["Description"] = "Test setting tooltipStrings to random HTML text";
    this.testRating_Options_tooltipStrings_HTML_DefaultMax["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_HTML_CustomMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_HTML_CustomMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_HTML_CustomMax["Description"] = "Test setting tooltipStrings to random HTML text";
    this.testRating_Options_tooltipStrings_HTML_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_Null_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: null });
    };
    this.testRating_Options_tooltipStrings_Null_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_Null_DefaultMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_Null_DefaultMax["Description"] = "Test setting tooltipStrings to null on a control with default maxRating";
    this.testRating_Options_tooltipStrings_Null_DefaultMax["Category"] = "Options";


    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_NullStrings_DefaultMax = function () {
        var tooltipStrings = [null, null, null, null, null, null];

        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
    };
    this.testRating_Options_tooltipStrings_NullStrings_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_NullStrings_DefaultMax["Priority"] = "feature";
    this.testRating_Options_tooltipStrings_NullStrings_DefaultMax["Description"] = "Test setting tooltipStrings to null";
    this.testRating_Options_tooltipStrings_NullStrings_DefaultMax["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_NULL_CustomMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_NULL_CustomMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_NULL_CustomMax["Description"] = "Test setting tooltipStrings to null on a control with defaul maxRating";
    this.testRating_Options_tooltipStrings_NULL_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_NullStrings_CustomMax = function () {
        var tooltipStrings = [null, null, null, null, null, null, null];

        ratingUtils.instantiate("rating", { maxRating: tooltipStrings.length - 1 });

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: tooltipStrings });
    };
    this.testRating_Options_tooltipStrings_NullStrings_CustomMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_NullStrings_CustomMax["Priority"] = "feature";
    this.testRating_Options_tooltipStrings_NullStrings_CustomMax["Description"] = "Test setting tooltipStrings to null";
    this.testRating_Options_tooltipStrings_NullStrings_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_TooFew_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3"] });
    };
    this.testRating_Options_tooltipStrings_TooFew_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_TooFew_DefaultMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_TooFew_DefaultMax["Description"] = "Test providing fewer than 5 tooltips";
    this.testRating_Options_tooltipStrings_TooFew_DefaultMax["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_TooFew_CustomMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_TooFew_CustomMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_TooFew_CustomMax["Description"] = "Test providing fewer than a custom max number of tooltips";
    this.testRating_Options_tooltipStrings_TooFew_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_TooMany_DefaultMax = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: ["tooltip1", "tooltip1", "tooltip3", "tooltip4", "tooltip5", "tooltip6"] });
    };
    this.testRating_Options_tooltipStrings_TooMany_DefaultMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_TooMany_DefaultMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_TooMany_DefaultMax["Description"] = "Test providing more than 5 tooltips to a rating control with default max";
    this.testRating_Options_tooltipStrings_TooMany_DefaultMax["Category"] = "Options";

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
    this.testRating_Options_tooltipStrings_TooMany_CustomMax["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_TooMany_CustomMax["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_TooMany_CustomMax["Description"] = "Test providing greater than a custom max number of tooltips";
    this.testRating_Options_tooltipStrings_TooMany_CustomMax["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_Invalid_Number = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: 5 }, true);
    };
    this.testRating_Options_tooltipStrings_Invalid_Number["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_Invalid_Number["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_Invalid_Number["Description"] = "Test setting tooltipStrings to a Number";
    this.testRating_Options_tooltipStrings_Invalid_Number["Category"] = "Options";

    //-----------------------------------------------------------------------------------

    this.testRating_Options_tooltipStrings_Invalid_String = function () {
        ratingUtils.instantiate("rating");

        ratingUtils.setOptionsAndVerify("rating", { tooltipStrings: "Bad Tooltips" }, true);
    };
    this.testRating_Options_tooltipStrings_Invalid_String["Owner"] = "sehume";
    this.testRating_Options_tooltipStrings_Invalid_String["Priority"] = "IDX";
    this.testRating_Options_tooltipStrings_Invalid_String["Description"] = "Test setting tooltipStrings to a String";
    this.testRating_Options_tooltipStrings_Invalid_String["Category"] = "Options";
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("OptionTests");