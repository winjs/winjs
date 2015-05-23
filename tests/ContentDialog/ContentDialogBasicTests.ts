// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="ContentDialogUtilities.ts" />
/// <deploy src="../TestData/" />

module ContentDialogTests {
    "use strict";

    enum Position {center, top}

    interface IPositioningAndSizingAssertions {
        desc: string;
        windowWidth: number;
        windowHeight: number;
        contentWidth: number;
        contentHeight: number;
        expectedDialogWidth: number;
        expectedDialogHeight: number;
        expectedDialogHorizontalPosition: Position;
        expectedDialogVerticalPosition: Position;
    }

    var testRoot: HTMLElement;
    var Utils = ContentDialogTests.Utilities;
    var createDialog;

    var defaultMinDialogWidth = 320;
    var defaultMaxDialogWidth = 456;
    var defaultMinDialogHeight = 184;
    var defaultMaxDialogHeight = 758;
    var dialogVerticallyCenteredThreshold = 640; // Hard coded. Not configurable by app developers.

    function isVisible(element) {
        var style = getComputedStyle(element);
        return style.display !== "none" && style.visibility === "visible" && +style.opacity === 1;
    }

    function assertDialogIsDisposed(dialog: WinJS.UI.PrivateContentDialog) {
        LiveUnit.Assert.isTrue(dialog._disposed, "ContentDialog didn't mark itself as disposed");
        LiveUnit.Assert.areEqual("Disposed", dialog._state.name, "ContentDialog didn't move into the disposed state");
    }

    function assertAreBoundingClientRectValuesEqual(expected, actual, message) {
        // Use a tolerance of 1 because Safari truncates floats returned by getBoundingClientRect while
        // other browsers return the floating point value.
        Helper.Assert.areFloatsEqual(expected, actual, message, 1);
    }

    function assertProperties(dialog: WinJS.UI.ContentDialog, providedOptions) {
        providedOptions = providedOptions || {};
        var defaultOptions: IContentDialogOptions = {
            title: "",
            primaryCommandText: "",
            secondaryCommandText: "",
            primaryCommandDisabled: false,
            secondaryCommandDisabled: false
        };
        var validPropreties = Object.keys(defaultOptions);
        Helper.Assert.areKeysValid(providedOptions, validPropreties);
        var options: IContentDialogOptions = WinJS.Utilities._merge(defaultOptions, providedOptions);

        var title = dialog.element.querySelector("." + ContentDialog._ClassNames.title);
        LiveUnit.Assert.areEqual(options.title !== "", isVisible(title), "title element has unexpected visibility");
        LiveUnit.Assert.areEqual(options.title, title.textContent, "title element has unexpected textContent");
        LiveUnit.Assert.areEqual(options.title, dialog.title, "title has unexpected value");

        var primaryCommand = <HTMLButtonElement>dialog.element.querySelector("." + ContentDialog._ClassNames.primaryCommand);
        LiveUnit.Assert.areEqual(options.primaryCommandText, dialog.primaryCommandText,
            "primaryCommandText has unexpected value");
        LiveUnit.Assert.areEqual(options.primaryCommandText, primaryCommand.textContent,
            "primaryCommand element has unexpected textContent");
        LiveUnit.Assert.areEqual(options.primaryCommandText !== "", isVisible(primaryCommand),
            "primaryCommand element has unexpected visibility");
        LiveUnit.Assert.areEqual(options.primaryCommandDisabled, primaryCommand.disabled,
            "primaryCommand element has unexpected disabled state");

        var secondaryCommand = <HTMLButtonElement>dialog.element.querySelector("." + ContentDialog._ClassNames.secondaryCommand);
        LiveUnit.Assert.areEqual(options.secondaryCommandText, dialog.secondaryCommandText,
            "secondaryCommandText has unexpected value");
        LiveUnit.Assert.areEqual(options.secondaryCommandText, secondaryCommand.textContent,
            "secondaryCommand element has unexpected textContent");
        LiveUnit.Assert.areEqual(options.secondaryCommandText !== "", isVisible(secondaryCommand),
            "secondaryCommand element has unexpected visibility");
        LiveUnit.Assert.areEqual(options.secondaryCommandDisabled, secondaryCommand.disabled,
            "secondaryCommand element has unexpected disabled state");
    }

    function testHide(args) {
        var expectedReason = args.expectedReason;
        var hideAction = args.hideAction;

        var dialog = Utils.useSynchronousAnimations(createDialog());

        var beforeHideReason;
        dialog.onbeforehide = function (eventObject) {
            beforeHideReason = eventObject.detail.result;
        };
        var afterHideReason;
        dialog.onafterhide = function (eventObject) {
            afterHideReason = eventObject.detail.result;
        };

        var showReason;
        dialog.show().then(function (hideInfo) {
            showReason = hideInfo.result;
        });
        hideAction(dialog);
        LiveUnit.Assert.areEqual(expectedReason, beforeHideReason,
            "beforeHide received unexpected dismissal reason");
        LiveUnit.Assert.areEqual(expectedReason, afterHideReason,
            "afterHide received unexpected dismissal reason");
        LiveUnit.Assert.areEqual(expectedReason, showReason,
            "show's promise completed with unexpected dismissal reason");
    }

    function verifyTabIndices(dialog: WinJS.UI.PrivateContentDialog, lowestTabIndex: number, highestTabIndex: number) {
        // lowest tab index
        LiveUnit.Assert.areEqual(lowestTabIndex, +dialog._dom.startBodyTab.tabIndex,
            "startBodyTab doesn't match content's lowest tab index");

        // highest tab index
        LiveUnit.Assert.areEqual(highestTabIndex, +dialog._dom.commands[0].tabIndex,
            "primaryCommand doesn't match content's highest tab index");
        LiveUnit.Assert.areEqual(highestTabIndex, +dialog._dom.commands[1].tabIndex,
            "secondaryCommand doesn't match content's highest tab index");
        LiveUnit.Assert.areEqual(highestTabIndex, dialog._dom.endBodyTab.tabIndex,
            "endBodyTab doesn't match content's highest tab index");
    }

    export class BasicTests {
        setUp() {
            Helper.initUnhandledErrors();
            testRoot = document.createElement("div");
            createDialog = Utils.makeCreateDialog(testRoot);
            document.body.appendChild(testRoot);
        }

        tearDown() {
            Helper.cleanupUnhandledErrors();
            WinJS.Utilities.disposeSubTree(testRoot);
            var parent = testRoot.parentNode;
            parent && parent.removeChild(testRoot);
        }

        testEventsWithAnimations(complete) {
            var dialog = createDialog();

            var counter = 0;
            dialog.onbeforeshow = function () {
                LiveUnit.Assert.areEqual(0, counter, "beforeshow fired out of order");
                counter++;
                LiveUnit.Assert.isTrue(dialog.hidden, "beforeshow: dialog should be in hidden state");
                LiveUnit.Assert.isFalse(isVisible(dialog.element), "beforeshow: dialog should not be visible on screen");
            };
            dialog.onaftershow = function () {
                LiveUnit.Assert.areEqual(1, counter, "aftershow fired out of order");
                counter++;
                LiveUnit.Assert.isFalse(dialog.hidden, "aftershow: dialog should not be in hidden state");
                LiveUnit.Assert.isTrue(isVisible(dialog.element), "aftershow: dialog should be visible on screen");
                dialog.hide();
            };
            dialog.onbeforehide = function () {
                LiveUnit.Assert.areEqual(2, counter, "beforehide fired out of order");
                counter++;
                LiveUnit.Assert.isFalse(dialog.hidden, "beforehide: dialog should not be in hidden state");
                LiveUnit.Assert.isTrue(isVisible(dialog.element), "beforehide: dialog should be visible on screen");
            };
            dialog.onafterhide = function () {
                LiveUnit.Assert.areEqual(4, counter, "afterhide fired out of order");
                counter++;
                LiveUnit.Assert.isTrue(dialog.hidden, "afterhide: dialog should be in hidden state");
                LiveUnit.Assert.isFalse(isVisible(dialog.element), "afterhide: dialog should not be visible on screen");
                Helper.validateUnhandledErrors();
                complete();
            };

            dialog.show().then(function (eventObject) {
                LiveUnit.Assert.areEqual(3, counter, "show's promise completed out of order");
                counter++;
                LiveUnit.Assert.isTrue(dialog.hidden, "show's promise: dialog should be in hidden state");
                // Still visible because we haven't played the exit animation yet.
                LiveUnit.Assert.isTrue(isVisible(dialog.element), "show's promise: dialog should be visible on screen");
            });
        }

        testBeforeShowIsCancelable() {
            var dialog = Utils.useSynchronousAnimations(createDialog());
            var showCanceled = false;

            dialog.onbeforeshow = function (eventObject) {
                eventObject.preventDefault();
            };
            dialog.onaftershow = function (eventObject) {
                LiveUnit.Assert.fail("aftershow shouldn't have fired due to beforeshow being canceled");
            };
            dialog.onbeforehide = function (eventObject) {
                LiveUnit.Assert.fail("beforehide shouldn't have fired due to beforeshow being canceled");
            };
            dialog.onafterhide = function (eventObject) {
                LiveUnit.Assert.fail("afterhide shouldn't have fired due to beforeshow being canceled");
            };

            dialog.show().then(function () {
                LiveUnit.Assert.fail("Show should not have completed successfully");
            }, function (e) {
                showCanceled = true;
                LiveUnit.Assert.areEqual("Canceled", e && e.name, "Show promise should have been canceled");
            });
            LiveUnit.Assert.isTrue(dialog.hidden, "ContentDialog should still be hidden");
            LiveUnit.Assert.isTrue(showCanceled, "show's cancelation handler should have run");
            Helper.validateUnhandledErrors();
        }

        testBeforeHideIsCancelable() {
            function showShouldNotHaveCompleted() {
                LiveUnit.Assert.fail("show should not have completed");
            }

            var dialog = Utils.useSynchronousAnimations(createDialog());

            dialog.show().then(showShouldNotHaveCompleted, showShouldNotHaveCompleted);
            dialog.onbeforehide = function (eventObject) {
                eventObject.preventDefault();
            };
            dialog.onafterhide = function (eventObject) {
                LiveUnit.Assert.fail("Hide should have been canceled");
            };
            dialog.hide();
            LiveUnit.Assert.isFalse(dialog.hidden, "ContentDialog should still be shown");
            Helper.validateUnhandledErrors();
        }

        testPrimaryClick() {
            testHide({
                expectedReason: "primary",
                hideAction: function (dialog) {
                    dialog.element.querySelector("." + ContentDialog._ClassNames.primaryCommand).click();
                }
            });
            Helper.validateUnhandledErrors();
        }

        testSecondaryClick() {
            testHide({
                expectedReason: "secondary",
                hideAction: function (dialog) {
                    dialog.element.querySelector("." + ContentDialog._ClassNames.secondaryCommand).click();
                }
            });
            Helper.validateUnhandledErrors();
        }

        testHideDefaultReason() {
            testHide({
                expectedReason: "none",
                hideAction: function (dialog) {
                    dialog.hide();
                }
            });
            Helper.validateUnhandledErrors();
        }

        testHideCustomReason() {
            testHide({
                expectedReason: "a custom reason",
                hideAction: function (dialog) {
                    dialog.hide("a custom reason");
                }
            });
            Helper.validateUnhandledErrors();
        }

        testHideWithEscapeKey() {
            testHide({
                expectedReason: "none",
                hideAction: function (dialog) {
                    Helper.keydown(dialog.element, WinJS.Utilities.Key.escape);
                }
            });
            Helper.validateUnhandledErrors();
        }

        testHideWithHardwareBackButton() {
            var backClickEvent = {
                type: 'backclick',
                _winRTBackPressedEvent: { handled: false }
            };

            testHide({
                expectedReason: "none",
                hideAction: function (dialog) {
                    WinJS.Application._dispatchEvent(backClickEvent);
                }
            });
            LiveUnit.Assert.isTrue(backClickEvent._winRTBackPressedEvent.handled,
                "ContentDialog should have marked the backclick event as handled");
            Helper.validateUnhandledErrors();
        }

        testDisposeWhileShown() {
            var errorHandler1Ran = false;
            var errorHandler2Ran = false;
            var dialog = Utils.useSynchronousAnimations(createDialog());
            dialog.show().then(function () {
                LiveUnit.Assert.fail("Show shouldn't have completed successfully. Control is disposed.");
            }, function (error) {
                errorHandler1Ran = true;
                LiveUnit.Assert.areEqual(error.name, "WinJS.UI.ContentDialog.ControlDisposed",
                    "Show should have errored due to control being disposed");
            });
            dialog.dispose();
            assertDialogIsDisposed(dialog);
            dialog.show().then(function () {
                LiveUnit.Assert.fail("Show shouldn't have completed successfully. Control is disposed.");
            }, function (error) {
                errorHandler2Ran = true;
                LiveUnit.Assert.areEqual(error.name, "WinJS.UI.ContentDialog.ControlDisposed",
                    "Show should have errored due to control being disposed");
            });
            LiveUnit.Assert.isTrue(errorHandler1Ran, "show's error handler should have run");
            LiveUnit.Assert.isTrue(errorHandler2Ran, "show's error handler should have run");
            // These calls shouldn't throw any exceptions
            dialog.hide();
            dialog.dispose();
            Helper.validateUnhandledErrors();
        }

        testDisposeWhileHidden() {
            var errorHandler1Ran = false;
            var errorHandler2Ran = false;
            var dialog = Utils.useSynchronousAnimations(createDialog());
            dialog.show();
            dialog.hide();
            dialog.dispose();
            assertDialogIsDisposed(dialog);
            // These calls shouldn't throw any exceptions
            dialog.hide();
            dialog.dispose();
            Helper.validateUnhandledErrors();
        }

        testInitializingProperties() {
            var optionsRecords = [
                null,
                { title: "A title" },
                { primaryCommandText: "Yes!" },
                { secondaryCommandText: "Nay" },
                { title: "A title", primaryCommandText: "Yes!", secondaryCommandText: "Nay" },
                {
                    title: "A title",
                    primaryCommandText: "OK", primaryCommandDisabled: true,
                    secondaryCommandText: "Cancel", secondaryCommandDisabled: false
                }
            ];

            optionsRecords.forEach(function (options) {
                var dialog = Utils.useSynchronousAnimations(new ContentDialog(null, options));
                testRoot.appendChild(dialog.element);
                dialog.show();

                assertProperties(dialog, options);

                dialog.hide();
            });
            Helper.validateUnhandledErrors();
        }

        testChangingProperties() {
            function applyChanges(changes) {
                Object.keys(changes).forEach(function (propertyName) {
                    dialog[propertyName] = changes[propertyName];
                    currentConfig[propertyName] = changes[propertyName];
                });
            }

            var propertiesToChange = [
                { title: "My Title" },
                { title: "" },
                { primaryCommandText: "Yes!" },
                { primaryCommandDisabled: true },
                { primaryCommandDisabled: false },
                { primaryCommandText: "" },
                { secondaryCommandText: "Nay" },
                { secondaryCommandDisabled: true },
                { secondaryCommandDisabled: false },
                { secondaryCommandText: "" }
            ];

            var currentConfig = {};
            var dialog = Utils.useSynchronousAnimations(new ContentDialog(null, currentConfig));
            testRoot.appendChild(dialog.element);
            dialog.show();

            // Change properties while dialog is showing
            propertiesToChange.forEach(function (changes) {
                applyChanges(changes);
                assertProperties(dialog, currentConfig);
            });

            // Change properties while dialog is hidden
            propertiesToChange.forEach(function (changes) {
                dialog.hide();
                applyChanges(changes);
                dialog.show();
                assertProperties(dialog, currentConfig);
            });
            Helper.validateUnhandledErrors();
        }

        testHiddenProperty(complete) {
            // The dialog created for this test doesn't use synchronous animations, so that the test can verify that changes to the hidden property are applied immediately even with animations
            // playing on the content dialog as it shows/hides
            var dialog = createDialog(); 

            dialog.addEventListener("aftershow", function () {
                LiveUnit.Assert.isFalse(dialog.hidden);
                dialog.hidden = true;
                LiveUnit.Assert.isTrue(dialog.hidden);
                dialog.addEventListener("afterhide", function () {
                    LiveUnit.Assert.isTrue(dialog.hidden);
                    complete();
                });
            });
            LiveUnit.Assert.isTrue(dialog.hidden);
            dialog.hidden = false;
            LiveUnit.Assert.isFalse(dialog.hidden);
        }

        testTabIndexOfZeroIsHighest() {
            var innerHTML =
                '<div tabIndex="4">4</div>' +
                '<div tabIndex="5">5</div>' +
                '<div class="aParent">' +
                    '<div tabIndex="7">7</div>' +
                    '<div tabIndex="8">8</div>' +
                    '<div tabIndex="0">0</div>' + // highest
                    '<div tabIndex="6">6</div>' +
                '</div>' +
                '<div tabIndex="2">2</div>' + // lowest
                '<div tabIndex="3">3</div>';
            var lowestTabIndex = 2;
            var highestTabIndex = 0;

            var dialog = Utils.useSynchronousAnimations(createDialog({ innerHTML: innerHTML }));

            dialog.show();
            verifyTabIndices(dialog, lowestTabIndex, highestTabIndex);
            Helper.validateUnhandledErrors();
        }

        testTabIndices() {
            var innerHTML =
                '<div tabIndex="4">4</div>' +
                '<div tabIndex="5">5</div>' +
                '<div class="aParent">' +
                    '<div tabIndex="7">7</div>' +
                    '<div tabIndex="8">8</div>' + // highest
                    '<div tabIndex="6">6</div>' +
                '</div>' +
                '<div tabIndex="2">2</div>' + // lowest
                '<div tabIndex="3">3</div>';
            var lowestTabIndex = 2;
            var highestTabIndex = 8;

            var dialog = Utils.useSynchronousAnimations(createDialog({ innerHTML: innerHTML }));

            dialog.show();
            verifyTabIndices(dialog, lowestTabIndex, highestTabIndex);

            // Test that dialog updates its tab indices after the user presses
            // the tab key
            //
            lowestTabIndex = 1;
            highestTabIndex = 9;
            var newLowest = document.createElement("div");
            newLowest.tabIndex = lowestTabIndex;
            var newHighest = document.createElement("div");
            newHighest.tabIndex = highestTabIndex;
            dialog._dom.content.appendChild(newHighest);
            dialog.element.querySelector(".aParent").appendChild(newLowest);

            // Tab key should cause the dialog to update its tab indices
            Helper.keydown(dialog.element, WinJS.Utilities.Key.tab);

            verifyTabIndices(dialog, lowestTabIndex, highestTabIndex);
            Helper.validateUnhandledErrors();
        }

        testPositioningAndSizing(complete) {
            function testCasesWithLimits(limits: { minDialogWidth: number; maxDialogWidth: number; minDialogHeight: number; maxDialogHeight: number }) {
                return [
                    // Vertical alignment
                    {
                        desc: "Dialog is vertically centered (when window height > dialogVerticallyCenteredThreshold)",
                        windowHeight: dialogVerticallyCenteredThreshold + 10,
                        contentHeight: limits.minDialogHeight,
                        expectedDialogVerticalPosition: Position.center
                    },
                    {
                        desc: "Dialog snaps to top of window (when window height < dialogVerticallyCenteredThreshold)",
                        windowHeight: dialogVerticallyCenteredThreshold - 10,
                        contentHeight: limits.minDialogHeight,
                        expectedDialogVerticalPosition: Position.top
                    },

                    // Height: window height > dialog max
                    {
                        desc: "Dialog grows to min height (when window height > dialog max)",
                        windowHeight: limits.maxDialogHeight + 10,
                        contentHeight: 0,
                        expectedDialogHeight: limits.minDialogHeight,
                        expectedDialogVerticalPosition: Position.center
                    },
                    {
                        desc: "Dialog's height grows with its content and doesn't exceed max (when window height > dialog max)",
                        windowHeight: limits.maxDialogHeight + 10,
                        contentHeight: limits.maxDialogHeight + 100,
                        expectedDialogHeight: limits.maxDialogHeight,
                        expectedDialogVerticalPosition: Position.center
                    },

                    // Height: window height < dialog max
                    {
                        desc: "Dialog's height can't get smaller than min (when window is smaller than dialog min)",
                        windowHeight: limits.minDialogHeight - 10,
                        contentHeight: 0,
                        expectedDialogHeight: limits.minDialogHeight,
                        // Vertical alignment doesn't matter when window height < dialog min
                    },

                    {
                        desc: "Dialog's height sizes to content (when window height < dialog's max and window height > 2 * dialog's height)",
                        windowHeight: 2 * limits.minDialogHeight + 10,
                        contentHeight: 0,
                        expectedDialogHeight: limits.minDialogHeight,
                        expectedDialogVerticalPosition: Position.top
                    },
                    {
                        desc: "Dialog's height sizes to window's (when window height < dialog's max and window height < 2 * dialog's height)",
                        windowHeight: 2 * limits.minDialogHeight - 10,
                        contentHeight: 0,
                        expectedDialogHeight: 2 * limits.minDialogHeight - 10,
                        expectedDialogVerticalPosition: Position.top
                    },

                    // Width and horizontal alignment (always horizontally centered)
                    {
                        desc: "Dialog's width sizes to window's",
                        windowWidth: limits.minDialogWidth + 10,
                        contentWidth: limits.maxDialogWidth,
                        expectedDialogWidth: limits.minDialogWidth + 10,
                        expectedDialogHorizontalPosition: Position.center
                    },
                    {
                        desc: "Dialog's width doesn't exceed max",
                        windowWidth: limits.maxDialogWidth + 10,
                        contentWidth: 0,
                        expectedDialogWidth: limits.maxDialogWidth,
                        expectedDialogHorizontalPosition: Position.center
                    },
                    {
                        desc: "Dialog's width can't get smaller than min",
                        windowWidth: limits.minDialogWidth - 10,
                        contentWidth: 0,
                        expectedDialogWidth: limits.minDialogWidth,
                        // Horizontal alignment doesn't matter when window width < dialog min
                    }
                ];
            }

            var iframe = document.createElement("iframe");
            iframe.src = "$(TESTDATA)/WinJSSandbox.html";
            iframe.width = "" + (defaultMaxDialogWidth + 10);
            iframe.height = "" + (defaultMaxDialogHeight + 10);
            iframe.onload = function () {
                function processValues(providedValues) {
                    var defaultValues: IPositioningAndSizingAssertions = {
                        desc: "",
                        windowWidth: defaultMaxDialogWidth + 10,
                        windowHeight: defaultMaxDialogHeight + 10,
                        contentWidth: 5,
                        contentHeight: 5,

                        expectedDialogWidth: undefined,
                        expectedDialogHeight: undefined,
                        expectedDialogHorizontalPosition: undefined,
                        expectedDialogVerticalPosition: undefined
                    };

                    Helper.Assert.areKeysValid(providedValues, Object.keys(defaultValues));
                    var values: IPositioningAndSizingAssertions = WinJS.Utilities._merge(defaultValues, providedValues);
                    return values;
                }
                function applyValues(values) {
                    iframe.width = "" + values.windowWidth;
                    iframe.height = "" + values.windowHeight;
                    spacerEl.style.width = values.contentWidth + "px";
                    spacerEl.style.height = values.contentHeight + "px";
                }
                function assertValues(values) {
                    var bodyRect = dialog.element.querySelector("." + ContentDialog._ClassNames.dialog).getBoundingClientRect();

                    // Width
                    if (values.expectedDialogWidth !== undefined) {
                        assertAreBoundingClientRectValuesEqual(values.expectedDialogWidth, bodyRect.width,
                            "Dialog has unexpected width. " + values.desc);
                    }
                    // Height
                    if (values.expectedDialogHeight !== undefined) {
                        assertAreBoundingClientRectValuesEqual(values.expectedDialogHeight, bodyRect.height,
                            "Dialog has unexpected height. " + values.desc);
                    }
                    // Horizontal alignment
                    if (values.expectedDialogHorizontalPosition === Position.center) {
                        assertAreBoundingClientRectValuesEqual((values.windowWidth - bodyRect.width) / 2, bodyRect.left,
                            "Dialog should be horizontally centered. " + values.desc);
                    } else if (values.expectedDialogHorizontalPosition !== undefined) {
                        LiveUnit.Assert.fail("Test provided invalid value for expectedDialogHorizontalPosition: " +
                            values.expectedDialogHorizontalPosition + ". " + values.desc);
                    }
                    // Vertical alignment
                    if (values.expectedDialogVerticalPosition === Position.center) {
                        assertAreBoundingClientRectValuesEqual((values.windowHeight - bodyRect.height) / 2, bodyRect.top,
                            "Dialog should be vertically centered. " + values.desc);
                    } else if (values.expectedDialogVerticalPosition === Position.top) {
                        assertAreBoundingClientRectValuesEqual(0, bodyRect.top, "Dialog should be positioned at top of window. " + values.desc);
                    } else if (values.expectedDialogVerticalPosition !== undefined) {
                        LiveUnit.Assert.fail("Test provided invalid value for expectedDialogVerticalPosition: " +
                            values.expectedDialogVerticalPosition + ". " + values.desc);
                    }
                }
                function forceBrowserLayout() {
                    dialogEl.style.display = 'none';
                    dialogEl.offsetHeight;
                    dialogEl.style.display = '';
                }
                function doTestCases(testCases) {
                    return new WinJS.Promise(function (done) {
                        function doOneTestCase(index) {
                            if (index < testCases.length) {
                                var values = processValues(testCases[index]);
                                applyValues(values);
                                // Written in this strange way (a requestAnimationFrame and a call to forceBrowserLayout)
                                // to ensure that the browser is done with layout when we do the assertions. Mobile Safari
                                // was particularly stubborn about finishing layout.
                                requestAnimationFrame(function () {
                                    forceBrowserLayout();
                                    assertValues(values);
                                    doOneTestCase(index + 1);
                                });
                            } else {
                                done();
                            }
                        }

                        doOneTestCase(0);
                    });
                }

                var iframeGlobal = iframe.contentWindow;
                var dialogEl = iframeGlobal.document.createElement("div");
                var spacerEl = iframeGlobal.document.createElement("div");
                dialogEl.appendChild(spacerEl);
                var dialog = Utils.useSynchronousAnimations(new (<any>iframeGlobal).WinJS.UI.ContentDialog(dialogEl, {
                    title: "A Title",
                    primaryCommandText: "OK",
                    secondaryCommandText: "Cancel"
                }));
                iframeGlobal.document.body.appendChild(dialog.element);

                dialog.show();

                // Default dialog min/max width/height
                var defaultTestCases = testCasesWithLimits({
                    minDialogWidth: defaultMinDialogWidth,
                    maxDialogWidth: defaultMaxDialogWidth,
                    minDialogHeight: defaultMinDialogHeight,
                    maxDialogHeight: defaultMaxDialogHeight
                });
                doTestCases(defaultTestCases).then(function () {
                    // Custom dialog min/max width/height
                    var customLimits = {
                        minDialogWidth: 123,
                        maxDialogWidth: 549,
                        minDialogHeight: defaultMinDialogHeight,
                        maxDialogHeight: defaultMaxDialogHeight
                    };
                    var dialogBody = <HTMLElement>dialog.element.querySelector("." + ContentDialog._ClassNames.dialog);
                    dialogBody.style.minWidth = customLimits.minDialogWidth + "px";
                    dialogBody.style.maxWidth = customLimits.maxDialogWidth + "px";
                    dialogBody.style.minHeight = customLimits.minDialogHeight + "px";
                    dialogBody.style.maxHeight = customLimits.maxDialogHeight + "px";
                    return doTestCases(testCasesWithLimits(customLimits));
                }).then(function () {
                    dialog.hide();
                    Helper.validateUnhandledErrors();
                    complete();
                });
            };
            testRoot.appendChild(iframe);
        }
    }
}
LiveUnit.registerTestClass("ContentDialogTests.BasicTests");
