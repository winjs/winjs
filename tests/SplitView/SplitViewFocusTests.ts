// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="SplitViewUtilities.ts" />

/// <reference path="../../typings/winjs/winjs.d.ts" />

module SplitViewTests {
    "use strict";

    var testRoot: HTMLElement;
    var Utils = SplitViewTests.Utilities;
    var createSplitView: (options?: any) => WinJS.UI.PrivateSplitView;

    export class FocusTests {
        setUp() {
            testRoot = document.createElement("div");
            // Give it an id so that we can use it in styles to make sure our styles win over the defaults.
            // We encourage apps to do the same.
            testRoot.id = "test-root";
            createSplitView = Utils.makeCreateSplitView(testRoot);
            document.body.appendChild(testRoot);
        }

        tearDown() {
            WinJS.Utilities.disposeSubTree(testRoot);
            Helper.removeElement(testRoot);
            document.documentElement.removeAttribute("lang");
        }

        testFocusWhenOpeningAndClosingPane() {
            var splitView = Utils.useSynchronousAnimations(createSplitView({
                paneHTML: '<input class="pane-textbox" type="text" />',
                contentHTML: '<input class="content-textbox-1" type="text" /><input class="content-textbox-2" type="text" />'
            }));
            
            var contentTextBox2 = <HTMLElement>splitView.element.querySelector(".content-textbox-2");
            contentTextBox2.focus();
            // Ensure focus is outside of the SplitView's pane before we open it
            LiveUnit.Assert.areEqual(contentTextBox2, document.activeElement,
                "Test setup failed: content-textbox-2 should have focus");
            
            splitView.openPane();
            LiveUnit.Assert.areEqual(splitView._dom.pane, document.activeElement,
                "When SplitView opened, it should have focused the pane element");
            
            splitView.closePane();
            LiveUnit.Assert.areEqual(contentTextBox2, document.activeElement,
                "Focus should have been restored to content-textbox-2 when SplitView closed");
        }
    }
}
LiveUnit.registerTestClass("SplitViewTests.FocusTests");
