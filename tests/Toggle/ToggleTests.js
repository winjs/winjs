// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.js" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js" />

var WinJSTests = WinJSTests || {};

WinJSTests.ToggleSwitchTests = function () {
    'use strict';

    // Describe all possible inputs to Toggle
    var possibleInputs = {
        checked: [true, false],
        disabled: [true, false],
        rtl: [true, false],
        labelOn: ['1', 'A pretty long string'],
        labelOff: ['0', 'Another pretty long string'],
        title: ['A title', 'A title that is much longer and should be wrapped to a second line']
    };

    // Describe any special combinations of inputs that we definitely want to test
    var interestingInputs = [
        {checked: true, disabled: true}
    ];

    // Generate test combinations of init options to toggle
    var testCases = Helper.pairwise(possibleInputs, interestingInputs);

    this.setUp = function () {
        var container = document.createElement('div');
        container.id = 'toggleswitch-tests';
        document.body.appendChild(container);
    }

    this.tearDown = function () {
        var container = document.querySelector('#toggleswitch-tests');
        document.body.removeChild(container);
    }

    this.testInstantiation = function testInstantiation() {
        // Test instantiating the toggle for each case we got
        testCases.forEach(function (testCase) {
            // Set lang attribute to RTL if necessary
            var container = document.querySelector('#toggleswitch-tests');
            if (testCase.rtl) {
                container.setAttribute('lang', 'ar');
            }

            // Create the toggle
            var toggle;
            try {
                toggle = new WinJS.UI.ToggleSwitch(null, testCase);
            } catch (e) {
                LiveUnit.Assert.fail('Exception occurred during instantiation: ' + e + ' - Options: ' + JSON.stringify(testCase));
            }
            container.appendChild(toggle.element);

            // Test default values
            if (!testCase.labelOn) {
                var expected = WinJS.Resources._getWinJSString("ui/on").value;
                LiveUnit.Assert.areEqual(expected, toggle.labelOn, 'Labels should default to WinJS resource strings');
            }
            if (!testCase.labelOff) {
                var expected = WinJS.Resources._getWinJSString("ui/off").value;
                LiveUnit.Assert.areEqual(expected, toggle.labelOff, 'Labels should default to WinJS resource strings');
            }
            if (!testCase.title) {
                LiveUnit.Assert.areEqual(0, toggle.title.length, 'Title text should default to 0 length string');
            }

            // Test that labels hide and show properly
            var labelOn = toggle.element.querySelector('.win-toggleswitch-value-on');
            var labelOff = toggle.element.querySelector('.win-toggleswitch-value-off');
            var labelOnStyle = window.getComputedStyle(labelOn);
            var labelOffStyle = window.getComputedStyle(labelOff);
            if (toggle.checked) {
                LiveUnit.Assert.areNotEqual('hidden', labelOnStyle.visibility, 'labelOn display should be visible when toggle is checked');
                LiveUnit.Assert.areEqual('hidden', labelOffStyle.visibility, 'labelOff display should be invisible when toggle is checked');
            } else {
                LiveUnit.Assert.areEqual('hidden', labelOnStyle.visibility, 'labelOn display should be invisible when toggle is not checked');
                LiveUnit.Assert.areNotEqual('hidden', labelOffStyle.visibility, 'labelOff display should be visible when toggle is not checked');
            }

            // Some other one off cases
            if (toggle.disabled && testCase.checked) {
                LiveUnit.Assert.isTrue(toggle.checked, 'Toggle should be able to be initialized in the checked, disabled state');
            }

            // Test that fill sizes update properly based on checked / rtl setting
            var fillLower = toggle.element.querySelector('.win-toggleswitch-fill-lower');
            var fillUpper = toggle.element.querySelector('.win-toggleswitch-fill-upper');
            if (testCase.rtl && '-ms-flex' in document.documentElement.style) {
                if (toggle.checked) {
                    LiveUnit.Assert.areEqual(0, fillLower.offsetWidth, 'Lower fill should be 0 width when checked in RTL');
                    LiveUnit.Assert.isTrue(fillUpper.offsetWidth > 0, 'Upper fill should be > 0 width when checked in RTL');
                } else {
                    LiveUnit.Assert.isTrue(fillLower.offsetWidth > 0, 'Lower fill should be > 0 width when unchecked in RTL');
                    LiveUnit.Assert.areEqual(0, fillUpper.offsetWidth, 'Upper fill should be 0 width when unchecked in RTL');
                }
            } else {
                if (toggle.checked) {
                    LiveUnit.Assert.areEqual(0, fillUpper.offsetWidth, 'Upper fill should be 0 width when checked');
                    LiveUnit.Assert.isTrue(fillLower.offsetWidth > 0, 'Lower fill should be > 0 width when checked');
                } else {
                    LiveUnit.Assert.isTrue(fillUpper.offsetWidth > 0, 'Upper fill should be > 0 width when unchecked');
                    LiveUnit.Assert.areEqual(0, fillLower.offsetWidth, 'Lower fill should be 0 width when unchecked');
                }
            }

            // Clean up
            if (testCase.rtl) {
                container.removeAttribute('lang');
            }
            container.removeChild(toggle.element);
        });
    };

    this.testClick = function testMouse() {
        var container = document.querySelector('#toggleswitch-tests');

        testCases.forEach(function (testCase) {
            var toggle = new WinJS.UI.ToggleSwitch(null, testCase);
            container.appendChild(toggle.element);
            var toggleClickRegion = toggle.element.querySelector('.win-toggleswitch-clickregion');

            // Test that the toggle reacts properly to a click
            var oldState = toggle.checked;
            CommonUtilities.mouseDownUsingMiP(toggleClickRegion);
            CommonUtilities.mouseUpUsingMiP(toggleClickRegion);
            var newState = toggle.checked;

            if (testCase.disabled) {
                LiveUnit.Assert.areEqual(oldState, newState, 'Toggle should not change state when clicked while disabled');
            } else {
                LiveUnit.Assert.areNotEqual(oldState, newState, 'Toggle should change state when clicked');
            }

            container.removeChild(toggle.element);
        });
    };

    this.testTap = function testMouse() {
        var container = document.querySelector('#toggleswitch-tests');

        testCases.forEach(function (testCase) {
            var toggle = new WinJS.UI.ToggleSwitch(null, testCase);
            container.appendChild(toggle.element);
            var toggleClickRegion = toggle.element.querySelector('.win-toggleswitch-clickregion');

            // Test that the toggle reacts properly to a tap
            var oldState = toggle.checked;
            CommonUtilities.touchDown(toggleClickRegion);
            CommonUtilities.touchUp(toggleClickRegion);
            var newState = toggle.checked;

            if (testCase.disabled) {
                LiveUnit.Assert.areEqual(oldState, newState, 'Toggle should not change state when tapped while disabled');
            } else {
                LiveUnit.Assert.areNotEqual(oldState, newState, 'Toggle should change state when tapped');
            }

            container.removeChild(toggle.element);
        });
    };
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass('WinJSTests.ToggleSwitchTests');
