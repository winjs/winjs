// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Option test cases for the Toggle JavaScript control.  Note that a large
//       percent of the verifications in this file (such as verifying all options
//       are actually set when passed to options) come as part of toggleUtils.instantiate
//      Based on sehume's rating control tests.
//
//  Author: michabol
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/commonutils.js"/>
/// <reference path="ToggleUtils.js"/>


var ToggleOptionTests = function() {
    var toggleUtils = new ToggleUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function() {
        toggleUtils.setUp();
    };

    this.tearDown = function() {
        toggleUtils.cleanUp();
    };

    //-----------------------------------------------------------------------------------
    //
    // title Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetAtCreation = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title} ); // toggleUtils.instantiate does all the necessary verification
    };
    this.testToggle_Options_Title_SetAtCreation["Owner"] = "michabol";
    this.testToggle_Options_Title_SetAtCreation["Priority"] = "feature";
    this.testToggle_Options_Title_SetAtCreation["Description"] = "Test creating toggle control with a title";
    this.testToggle_Options_Title_SetAtCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetAfterCreation = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {title: title});
    };
    this.testToggle_Options_Title_SetAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_Title_SetAfterCreation["Priority"] = "feature";
    this.testToggle_Options_Title_SetAfterCreation["Description"] = "Test changing the title on a toggle control after creation";
    this.testToggle_Options_Title_SetAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToEmptyString = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title}); // Set to something else at creation since the default title is the empty string
        toggleUtils.setOptionsAndVerify("toggle", {title: ""});
    };
    this.testToggle_Options_Title_SetToEmptyString["Owner"] = "michabol";
    this.testToggle_Options_Title_SetToEmptyString["Priority"] = "feature";
    this.testToggle_Options_Title_SetToEmptyString["Description"] = "Test changing the title on a toggle control to the empty string";
    this.testToggle_Options_Title_SetToEmptyString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToLongString = function() {
        var title = commonUtils.randomString(4096);
        toggleUtils.instantiate("toggle", {title: title});
    };
    this.testToggle_Options_Title_SetToLongString["Owner"] = "michabol";
    this.testToggle_Options_Title_SetToLongString["Priority"] = "feature";
    this.testToggle_Options_Title_SetToLongString["Description"] = "Test changing the title on a toggle control to a long string";
    this.testToggle_Options_Title_SetToLongString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToHTML = function() {
        var title = 'I am a <span style="color: purple;">pretty</span> toggle switch';
        toggleUtils.instantiate("toggle", {title: title});
    };
    this.testToggle_Options_Title_SetToHTML["Owner"] = "michabol";
    this.testToggle_Options_Title_SetToHTML["Priority"] = "feature";
    this.testToggle_Options_Title_SetToHTML["Description"] = "Test changing the title on a toggle control to a snippet of HTML";
    this.testToggle_Options_Title_SetToHTML["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToNumber = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title} );
        // If argument validation is added, this should most likely be changed to expect failure.
        // The same applies to most cases of setting a value to null/undefined/an unexpected data type.
        toggleUtils.setOptionsAndVerify("toggle", {title: 1234567890});
    };
    this.testToggle_Options_Title_SetToNumber["Owner"] = "michabol";
    this.testToggle_Options_Title_SetToNumber["Priority"] = "feature";
    this.testToggle_Options_Title_SetToNumber["Description"] = "Test changing title on a toggle control to a number";
    this.testToggle_Options_Title_SetToNumber["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToNull = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title} );
        toggleUtils.setOptionsAndVerify("toggle", {title: null});
    };
    this.testToggle_Options_Title_SetToNull["Owner"] = "michabol";
    this.testToggle_Options_Title_SetToNull["Priority"] = "feature";
    this.testToggle_Options_Title_SetToNull["Description"] = "Test changing title on a toggle control to null";
    this.testToggle_Options_Title_SetToNull["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToUndefined = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title} );
        toggleUtils.setOptionsAndVerify("toggle", {title: undefined});
    };
    this.testToggle_Options_Title_SetToUndefined["Owner"] = "michabol";
    this.testToggle_Options_Title_SetToUndefined["Priority"] = "feature";
    this.testToggle_Options_Title_SetToUndefined["Description"] = "Test changing title on a toggle control to undefined";
    this.testToggle_Options_Title_SetToUndefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    //
    // labelOn Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetAtCreation = function() {
        var labelOn = "Yes";
        toggleUtils.instantiate("toggle", {labelOn: labelOn} ); // toggleUtils.instantiate does all the necessary verification
    };
    this.testToggle_Options_LabelOn_SetAtCreation["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetAtCreation["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetAtCreation["Description"] = "Test creating toggle control with labelOn set";
    this.testToggle_Options_LabelOn_SetAtCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetAfterCreation = function() {
        var labelOn = "Yes";
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {labelOn: labelOn});
    };
    this.testToggle_Options_LabelOn_SetAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetAfterCreation["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetAfterCreation["Description"] = "Test changing labelOn on a toggle control after creation";
    this.testToggle_Options_LabelOn_SetAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToEmptyString = function() {
        var labelOn = "Yes";
        toggleUtils.instantiate("toggle", {labelOn: labelOn}); // Set to something else at creation since the default labelOn is the empty string
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: ""});
    };
    this.testToggle_Options_LabelOn_SetToEmptyString["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetToEmptyString["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetToEmptyString["Description"] = "Test changing labelOn on a toggle control to the empty string";
    this.testToggle_Options_LabelOn_SetToEmptyString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToLongString = function() {
        var labelOn = commonUtils.randomString(4096);
        toggleUtils.instantiate("toggle", {labelOn: labelOn});
    };
    this.testToggle_Options_LabelOn_SetToLongString["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetToLongString["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetToLongString["Description"] = "Test changing labelOn on a toggle control to a long string";
    this.testToggle_Options_LabelOn_SetToLongString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToHTML = function() {
        var labelOn = '<span style="color: green;">Yes</span>';
        toggleUtils.instantiate("toggle", {labelOn: labelOn});
    };
    this.testToggle_Options_LabelOn_SetToHTML["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetToHTML["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetToHTML["Description"] = "Test changing labelOn on a toggle control to a snippet of HTML";
    this.testToggle_Options_LabelOn_SetToHTML["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToNumber = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: 1234567890});
    };
    this.testToggle_Options_LabelOn_SetToNumber["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetToNumber["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetToNumber["Description"] = "Test changing labelOn on a toggle control to a number";
    this.testToggle_Options_LabelOn_SetToNumber["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToNull = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: null});
    };
    this.testToggle_Options_LabelOn_SetToNull["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetToNull["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetToNull["Description"] = "Test changing labelOn on a toggle control to null";
    this.testToggle_Options_LabelOn_SetToNull["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToUndefined = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: undefined});
    };
    this.testToggle_Options_LabelOn_SetToUndefined["Owner"] = "michabol";
    this.testToggle_Options_LabelOn_SetToUndefined["Priority"] = "feature";
    this.testToggle_Options_LabelOn_SetToUndefined["Description"] = "Test changing labelOn on a toggle control to undefined";
    this.testToggle_Options_LabelOn_SetToUndefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    //
    // labelOff Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetAtCreation = function() {
        var labelOff = "No";
        toggleUtils.instantiate("toggle", {labelOff: labelOff} ); // toggleUtils.instantiate does all the necessary verification
    };
    this.testToggle_Options_LabelOff_SetAtCreation["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetAtCreation["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetAtCreation["Description"] = "Test creating toggle control with labelOff set";
    this.testToggle_Options_LabelOff_SetAtCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetAfterCreation = function() {
        var labelOff = "No";
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {labelOff: labelOff});
    };
    this.testToggle_Options_LabelOff_SetAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetAfterCreation["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetAfterCreation["Description"] = "Test changing labelOff on a toggle control after creation";
    this.testToggle_Options_LabelOff_SetAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToEmptyString = function() {
        var labelOff = "No";
        toggleUtils.instantiate("toggle", {labelOff: labelOff}); // Set to something else at creation since the default labelOff is the empty string
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: ""});
    };
    this.testToggle_Options_LabelOff_SetToEmptyString["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetToEmptyString["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetToEmptyString["Description"] = "Test changing labelOff on a toggle control to the empty string";
    this.testToggle_Options_LabelOff_SetToEmptyString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToLongString = function() {
        var labelOff = commonUtils.randomString(4096);
        toggleUtils.instantiate("toggle", {labelOff: labelOff});
    };
    this.testToggle_Options_LabelOff_SetToLongString["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetToLongString["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetToLongString["Description"] = "Test changing labelOff on a toggle control to a long string";
    this.testToggle_Options_LabelOff_SetToLongString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToHTML = function() {
        var labelOff = '<span style="color: green;">No</span>';
        toggleUtils.instantiate("toggle", {labelOff: labelOff});
    };
    this.testToggle_Options_LabelOff_SetToHTML["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetToHTML["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetToHTML["Description"] = "Test changing labelOff on a toggle control to a snippet of HTML";
    this.testToggle_Options_LabelOff_SetToHTML["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToNumber = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: 1234567890});
    };
    this.testToggle_Options_LabelOff_SetToNumber["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetToNumber["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetToNumber["Description"] = "Test changing labelOff on a toggle control to a number";
    this.testToggle_Options_LabelOff_SetToNumber["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToNull = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: null});
    };
    this.testToggle_Options_LabelOff_SetToNull["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetToNull["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetToNull["Description"] = "Test changing labelOff on a toggle control to null";
    this.testToggle_Options_LabelOff_SetToNull["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToUndefined = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: undefined});
    };
    this.testToggle_Options_LabelOff_SetToUndefined["Owner"] = "michabol";
    this.testToggle_Options_LabelOff_SetToUndefined["Priority"] = "feature";
    this.testToggle_Options_LabelOff_SetToUndefined["Description"] = "Test changing labelOff on a toggle control to undefined";
    this.testToggle_Options_LabelOff_SetToUndefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    //
    // checked Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetAtCreation = function() {
        toggleUtils.instantiate("toggle", {checked: true} ); // toggleUtils.instantiate does all the necessary verification
    };
    this.testToggle_Options_Checked_SetAtCreation["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetAtCreation["Priority"] = "feature";
    this.testToggle_Options_Checked_SetAtCreation["Description"] = "Test creating toggle control with checked set";
    this.testToggle_Options_Checked_SetAtCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetTrueAfterCreation = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {checked: true});
    };
    this.testToggle_Options_Checked_SetTrueAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetTrueAfterCreation["Priority"] = "feature";
    this.testToggle_Options_Checked_SetTrueAfterCreation["Description"] = "Test changing checked to true on a toggle control after creation";
    this.testToggle_Options_Checked_SetTrueAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetFalseAfterCreation = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {checked: false});
    };
    this.testToggle_Options_Checked_SetFalseAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetFalseAfterCreation["Priority"] = "feature";
    this.testToggle_Options_Checked_SetFalseAfterCreation["Description"] = "Test changing checked to false on a toggle control after creation";
    this.testToggle_Options_Checked_SetFalseAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToNumberZero = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: 0});
    };
    this.testToggle_Options_Checked_SetToNumberZero["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetToNumberZero["Priority"] = "feature";
    this.testToggle_Options_Checked_SetToNumberZero["Description"] = "Test changing checked to the number 0 on a toggle control";
    this.testToggle_Options_Checked_SetToNumberZero["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToNumberOne = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: 1});
    };
    this.testToggle_Options_Checked_SetToNumberOne["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetToNumberOne["Priority"] = "feature";
    this.testToggle_Options_Checked_SetToNumberOne["Description"] = "Test changing checked to the number 1 on a toggle control";
    this.testToggle_Options_Checked_SetToNumberOne["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToString = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: "Yes, please and thank you"});
    };
    this.testToggle_Options_Checked_SetToString["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetToString["Priority"] = "feature";
    this.testToggle_Options_Checked_SetToString["Description"] = "Test changing checked to a string on a toggle control";
    this.testToggle_Options_Checked_SetToString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToNull = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: null});
    };
    this.testToggle_Options_Checked_SetToNull["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetToNull["Priority"] = "feature";
    this.testToggle_Options_Checked_SetToNull["Description"] = "Test changing checked to null on a toggle control";
    this.testToggle_Options_Checked_SetToNull["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToUndefined = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: undefined});
    };
    this.testToggle_Options_Checked_SetToUndefined["Owner"] = "michabol";
    this.testToggle_Options_Checked_SetToUndefined["Priority"] = "feature";
    this.testToggle_Options_Checked_SetToUndefined["Description"] = "Test changing checked to undefined on a toggle control";
    this.testToggle_Options_Checked_SetToUndefined["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    //
    // disabled Tests
    // Note: This only tests that the attribute can be get and set. Behavior when
    //       the control is disabled is tested elsewhere.
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetAtCreation = function() {
        toggleUtils.instantiate("toggle", {disabled: true} ); // toggleUtils.instantiate does all the necessary verification
    };
    this.testToggle_Options_Disabled_SetAtCreation["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetAtCreation["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetAtCreation["Description"] = "Test creating toggle control with disabled set";
    this.testToggle_Options_Disabled_SetAtCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetTrueAfterCreation = function() {
        toggleUtils.instantiate("toggle", {disabled: false} );
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {disabled: true});
    };
    this.testToggle_Options_Disabled_SetTrueAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetTrueAfterCreation["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetTrueAfterCreation["Description"] = "Test changing disabled to true on a toggle control after creation";
    this.testToggle_Options_Disabled_SetTrueAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetFalseAfterCreation = function() {
        toggleUtils.instantiate("toggle", {disabled: true} );
        toggleUtils.setOptionsAndVerify("toggle", {disabled: false});
    };
    this.testToggle_Options_Disabled_SetFalseAfterCreation["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetFalseAfterCreation["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetFalseAfterCreation["Description"] = "Test changing disabled to false on a toggle control after creation";
    this.testToggle_Options_Disabled_SetFalseAfterCreation["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToNumberZero = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: 0});
    };
    this.testToggle_Options_Disabled_SetToNumberZero["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetToNumberZero["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetToNumberZero["Description"] = "Test changing disabled to the number 0 on a toggle control";
    this.testToggle_Options_Disabled_SetToNumberZero["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToNumberOne = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: 1});
    };
    this.testToggle_Options_Disabled_SetToNumberOne["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetToNumberOne["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetToNumberOne["Description"] = "Test changing disabled to the number 1 on a toggle control";
    this.testToggle_Options_Disabled_SetToNumberOne["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToString = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: "Yes, please and thank you"});
    };
    this.testToggle_Options_Disabled_SetToString["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetToString["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetToString["Description"] = "Test changing disabled to a string on a toggle control";
    this.testToggle_Options_Disabled_SetToString["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToNull = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: null});
    };
    this.testToggle_Options_Disabled_SetToNull["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetToNull["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetToNull["Description"] = "Test changing disabled to null on a toggle control";
    this.testToggle_Options_Disabled_SetToNull["Category"] = "Options";

    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToUndefined = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: undefined});
    };
    this.testToggle_Options_Disabled_SetToUndefined["Owner"] = "michabol";
    this.testToggle_Options_Disabled_SetToUndefined["Priority"] = "feature";
    this.testToggle_Options_Disabled_SetToUndefined["Description"] = "Test changing disabled to undefined on a toggle control";
    this.testToggle_Options_Disabled_SetToUndefined["Category"] = "Options";
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("ToggleOptionTests");