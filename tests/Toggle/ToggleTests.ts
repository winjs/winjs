// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />

module WinJSTests {

    'use strict';

    var labelOnLongValue = 'A pretty long ON string';
    var labelOffLongValue = 'A pretty long OFF string';

    // Describe all possible inputs to Toggle
    var possibleInputs = {
        checked: [true, false],
        disabled: [true, false],
        rtl: [true, false],
        labelOn: ['1', labelOnLongValue],
        labelOff: ['0', labelOffLongValue],
        title: ['A title', 'A title that is much longer and should be wrapped to a second line']
    };

    // Describe any special combinations of inputs that we definitely want to test
    var interestingInputs = [
        { checked: true, disabled: true },
        { labelOn: labelOnLongValue, labelOff: '0' }
    ];

    // Generate test combinations of init options to toggle
    var testCases = Helper.pairwise(possibleInputs, interestingInputs);

    export class ToggleSwitchTests {

        setUp() {
            var container = document.createElement('div');
            container.id = 'toggleswitch-tests';
            document.body.appendChild(container);
        }

        tearDown() {
            var container = document.querySelector('#toggleswitch-tests');
            document.body.removeChild(container);
        }

        testInstantiation() {
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

                // Clean up
                if (testCase.rtl) {
                    container.removeAttribute('lang');
                }
                container.removeChild(toggle.element);
            });
        }

        testClick() {
            var container = document.querySelector('#toggleswitch-tests');

            testCases.forEach(function (testCase) {
                var toggle = new WinJS.UI.ToggleSwitch(null, testCase);
                container.appendChild(toggle.element);
                var toggleClickRegion = <HTMLElement>toggle.element.querySelector('.win-toggleswitch-clickregion');

                // Simulate clicking the toggle and store some before/after info
                var oldState = toggle.checked;
                var oldPosition = toggleClickRegion.offsetLeft;
                Helper.mouseDownUsingMiP(toggleClickRegion);
                Helper.mouseUpUsingMiP(toggleClickRegion);
                var newState = toggle.checked;
                var newPosition = toggleClickRegion.offsetLeft;

                // Test that the toggle did the right thing with regards to disabled state
                if (testCase.disabled) {
                    LiveUnit.Assert.areEqual(oldState, newState, 'Toggle should not change state when clicked while disabled');
                } else {
                    LiveUnit.Assert.areNotEqual(oldState, newState, 'Toggle should change state when clicked');
                }

                // Test that the toggle didn't move when toggled (possibly due to long ON label + short OFF label)
                LiveUnit.Assert.areEqual(oldPosition, newPosition, 'Toggle Switch should not move when toggled');

                container.removeChild(toggle.element);
            });
        }

        testTap() {
            var container = document.querySelector('#toggleswitch-tests');

            testCases.forEach(function (testCase) {
                var toggle = new WinJS.UI.ToggleSwitch(null, testCase);
                container.appendChild(toggle.element);
                var toggleClickRegion = toggle.element.querySelector('.win-toggleswitch-clickregion');

                // Test that the toggle reacts properly to a tap
                var oldState = toggle.checked;
                Helper.touchDown(toggleClickRegion);
                Helper.touchUp(toggleClickRegion);
                var newState = toggle.checked;

                if (testCase.disabled) {
                    LiveUnit.Assert.areEqual(oldState, newState, 'Toggle should not change state when tapped while disabled');
                } else {
                    LiveUnit.Assert.areNotEqual(oldState, newState, 'Toggle should change state when tapped');
                }

                container.removeChild(toggle.element);
            });
        }

        testThumbDragToOtherSide() {
            var container = document.querySelector('#toggleswitch-tests');

            testCases.forEach(function (testCase) {
                if (testCase.rtl) {
                    container.setAttribute('lang', 'ar');
                }

                var toggle = <WinJS.UI.PrivateToggleSwitch>new WinJS.UI.ToggleSwitch(null, testCase);
                container.appendChild(toggle.element);
                var toggleThumb = <HTMLElement>toggle.element.querySelector('.win-toggleswitch-thumb');
                var toggleClickRegion = <HTMLElement>toggle.element.querySelector('.win-toggleswitch-clickregion');
                var toggleThumbRect = toggleThumb.getBoundingClientRect();

                // Try dragging the thumb from one side to the other
                var direction = toggle.checked ? -1 : 1;
                if (testCase.rtl) {
                    direction *= -1;
                }

                // We don't really need to create an actual pointer event to do the testing,
                // as toggle only cares about a few properties on the event
                var pointerEvent = {
                    preventDefault: function () { },
                    get detail() { return { originalEvent: this }; },
                    pageX: toggleThumbRect.left + 1,
                    pageY: toggleThumbRect.top + 1,
                    pointerId: 1,
                    pointerType: WinJS.Utilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH
                };

                // Send a pointer down event to begin the drag
                var oldThumbPos = toggleThumb.offsetLeft;
                var oldState = toggle.checked;
                toggle._pointerDownHandler(pointerEvent);

                // Send a pointer move event to move the thumb to the other side
                pointerEvent.pageX += toggleClickRegion.offsetWidth * direction;
                toggle._pointerMoveHandler(pointerEvent);

                // Verify thumb didn't move when disabled
                if (toggle.disabled) {
                    LiveUnit.Assert.areEqual(toggleThumb.offsetLeft, oldThumbPos, 'Toggle thumb should not move when dragged while disabled');
                }

                // Send a pointer up event to end the drag
                toggle._pointerUpHandler(pointerEvent);

                // Verify the toggle changed
                if (toggle.disabled) {
                    LiveUnit.Assert.areEqual(oldState, toggle.checked, 'Toggle should not change when thumb is dragged while disabled');
                } else {
                    LiveUnit.Assert.areNotEqual(oldState, toggle.checked, 'Toggle should change when thumb is dragged to other side and released');
                }

                // Cleanup
                if (testCase.rtl) {
                    container.removeAttribute('lang');
                }
                container.removeChild(toggle.element);
            });
        }

        testChangedEvent() {
            testCases.forEach(function (testCase) {
                var toggle = new WinJS.UI.ToggleSwitch(null, testCase);

                var changedEventFired = false;
                toggle.addEventListener('change', function () {
                    changedEventFired = true;
                });

                toggle.checked = !toggle.checked;
                LiveUnit.Assert.isTrue(changedEventFired, 'Toggle should fire change event when toggled');
            });
        }
    }
    
    var disabledTestRegistry = {
        testThumbDragToOtherSide: Helper.Browsers.ie11
    };
    Helper.disableTests(ToggleSwitchTests, disabledTestRegistry);

}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass('WinJSTests.ToggleSwitchTests');
