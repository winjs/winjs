// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="ContentDialogUtilities.ts" />
/// <deploy src="../TestData/" />

module ContentDialogTests {
    "use strict";

    var ContentDialog = <typeof WinJS.UI.PrivateContentDialog>WinJS.UI.ContentDialog;
    var testRoot: HTMLElement;
    var Utils = ContentDialogTests.Utilities;
    var createDialog;

    export class FocusTests {
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
        
        testInitialFocusWithoutFocusableContent(complete) {
            var dialog = Utils.useSynchronousAnimations(createDialog({ innerHTML: "Some text" }));

            Helper.waitForFocusWithin(dialog.element, function () { dialog.show(); }).then(function () {
                LiveUnit.Assert.areEqual(
                    dialog.element.querySelector("." + ContentDialog._ClassNames.dialog),
                    document.activeElement,
                    "When no content is focusable, the dialog itself should receive focus"
                );
                dialog.hide();
                Helper.validateUnhandledErrors();
                complete();
            });
        }

        testInitialFocusWithFocusableContent(complete) {
            var innerHTML =
                'Some text' +
                '<button class="customButton1">Custom Button 1</button>' +
                '<button class="customButton2">Custom Button 2</button>' +
                '<button class="customButton3">Custom Button 3</button>';

            var dialog = Utils.useSynchronousAnimations(createDialog({ innerHTML: innerHTML }));

            Helper.waitForFocusWithin(dialog.element, function () { dialog.show(); }).then(function () {
                LiveUnit.Assert.areEqual(
                    dialog.element.querySelector("." + ContentDialog._ClassNames.dialog),
                    document.activeElement,
                    "The dialog itself should receive focus"
                );
                dialog.hide();
                Helper.validateUnhandledErrors();
                complete();
            });
        }

        testFocusIsRestoredAfterHiding(complete) {
            testRoot.innerHTML =
                'Some text' +
                '<button class="externalButton1">External Button 1</button>' +
                '<button class="externalButton2">External Button 2</button>' +
                '<button class="externalButton3">External Button 3</button>';
            var externalButton2 = <HTMLElement>testRoot.querySelector(".externalButton2");

            var innerHTML =
                'Some text' +
                '<button class="customButton1">Custom Button 1</button>' +
                '<button class="customButton2">Custom Button 2</button>' +
                '<button class="customButton3">Custom Button 3</button>';
            var dialog = Utils.useSynchronousAnimations(createDialog({ innerHTML: innerHTML }));

            Helper.focus(externalButton2).then(function () {
                LiveUnit.Assert.areEqual(externalButton2, document.activeElement,
                    "externalButton2 should have received focus");
                return Helper.waitForFocusWithin(dialog.element, function () { dialog.show(); });
            }).then(function () {
                LiveUnit.Assert.isTrue((<any>dialog.element).contains(document.activeElement),
                    "Focus should moved into the dialog");
                Helper.waitForFocus(externalButton2, function () { dialog.hide(); });
            }).then(function () {
                LiveUnit.Assert.areEqual(externalButton2, document.activeElement,
                    "Focus should have been restored to externalButton2 after hiding the dialog");
                Helper.validateUnhandledErrors();
                complete();
            });
        }
    }
    
    var disabledTestRegistry = {
        testInitialFocusWithoutFocusableContent: Helper.Browsers.firefox,
        testInitialFocusWithFocusableContent: Helper.Browsers.firefox,
        testFocusIsRestoredAfterHiding: Helper.Browsers.firefox
    };
    Helper.disableTests(FocusTests, disabledTestRegistry);
}
LiveUnit.registerTestClass("ContentDialogTests.FocusTests");