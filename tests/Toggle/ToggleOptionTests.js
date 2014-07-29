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
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>
/// <reference path="ToggleUtils.js"/>


var ToggleOptionTests = function() {
    var toggleUtils = new ToggleUtils();
    var commonUtils = new CommonUtils();

    this.setUp = function(complete) {
        toggleUtils.setUp().then(complete);
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





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetAfterCreation = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {title: title});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToEmptyString = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title}); // Set to something else at creation since the default title is the empty string
        toggleUtils.setOptionsAndVerify("toggle", {title: ""});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToLongString = function() {
        var title = commonUtils.randomString(4096);
        toggleUtils.instantiate("toggle", {title: title});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToHTML = function() {
        var title = 'I am a <span style="color: purple;">pretty</span> toggle switch';
        toggleUtils.instantiate("toggle", {title: title});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Title_SetToNumber = function() {
        var title = "I am a toggle switch";
        toggleUtils.instantiate("toggle", {title: title} );
        // If argument validation is added, this should most likely be changed to expect failure.
        // The same applies to most cases of setting a value to null/undefined/an unexpected data type.
        toggleUtils.setOptionsAndVerify("toggle", {title: 1234567890});
    };


    //-----------------------------------------------------------------------------------
    //
    // labelOn Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetAtCreation = function() {
        var labelOn = "Yes";
        toggleUtils.instantiate("toggle", {labelOn: labelOn} ); // toggleUtils.instantiate does all the necessary verification
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetAfterCreation = function() {
        var labelOn = "Yes";
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {labelOn: labelOn});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToEmptyString = function() {
        var labelOn = "Yes";
        toggleUtils.instantiate("toggle", {labelOn: labelOn}); // Set to something else at creation since the default labelOn is the empty string
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: ""});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToLongString = function() {
        var labelOn = commonUtils.randomString(4096);
        toggleUtils.instantiate("toggle", {labelOn: labelOn});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToHTML = function() {
        var labelOn = '<span style="color: green;">Yes</span>';
        toggleUtils.instantiate("toggle", {labelOn: labelOn});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToNumber = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: 1234567890});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToNull = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: null});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOn_SetToUndefined = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOn: undefined});
    };





    //-----------------------------------------------------------------------------------
    //
    // labelOff Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetAtCreation = function() {
        var labelOff = "No";
        toggleUtils.instantiate("toggle", {labelOff: labelOff} ); // toggleUtils.instantiate does all the necessary verification
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetAfterCreation = function() {
        var labelOff = "No";
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {labelOff: labelOff});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToEmptyString = function() {
        var labelOff = "No";
        toggleUtils.instantiate("toggle", {labelOff: labelOff}); // Set to something else at creation since the default labelOff is the empty string
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: ""});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToLongString = function() {
        var labelOff = commonUtils.randomString(4096);
        toggleUtils.instantiate("toggle", {labelOff: labelOff});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToHTML = function() {
        var labelOff = '<span style="color: green;">No</span>';
        toggleUtils.instantiate("toggle", {labelOff: labelOff});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToNumber = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: 1234567890});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToNull = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: null});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_LabelOff_SetToUndefined = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsAndVerify("toggle", {labelOff: undefined});
    };





    //-----------------------------------------------------------------------------------
    //
    // checked Tests
    //
    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetAtCreation = function() {
        toggleUtils.instantiate("toggle", {checked: true} ); // toggleUtils.instantiate does all the necessary verification
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetTrueAfterCreation = function() {
        toggleUtils.instantiate("toggle", {checked: false} );
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {checked: true});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetFalseAfterCreation = function() {
        toggleUtils.instantiate("toggle", {checked: true} );
        toggleUtils.setOptionsAndVerify("toggle", {checked: false});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToNumberZero = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: 0});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToNumberOne = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: 1});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToString = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: "Yes, please and thank you"});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToNull = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: null});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Checked_SetToUndefined = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {checked: undefined});
    };





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





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetTrueAfterCreation = function() {
        toggleUtils.instantiate("toggle", {disabled: false} );
        toggleUtils.setOptionsDirectlyAndVerify("toggle", {disabled: true});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetFalseAfterCreation = function() {
        toggleUtils.instantiate("toggle", {disabled: true} );
        toggleUtils.setOptionsAndVerify("toggle", {disabled: false});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToNumberZero = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: 0});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToNumberOne = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: 1});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToString = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: "Yes, please and thank you"});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToNull = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: null});
    };





    //-----------------------------------------------------------------------------------
    this.testToggle_Options_Disabled_SetToUndefined = function() {
        toggleUtils.instantiate("toggle");
        toggleUtils.setOptionsAndVerify("toggle", {disabled: undefined});
    };




};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("ToggleOptionTests");