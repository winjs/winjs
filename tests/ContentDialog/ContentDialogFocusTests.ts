// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
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
            testRoot = document.createElement("div");
            createDialog = Utils.makeCreateDialog(testRoot);
            document.body.appendChild(testRoot);
        }
        
        tearDown() {
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
                    dialog.element.querySelector(".customButton1"),
                    document.activeElement,
                    "The first focusable element in the dialog's content should have received focus"
                );
                dialog.hide();
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
                complete();
            });
        }
    }
}
LiveUnit.registerTestClass("ContentDialogTests.FocusTests");