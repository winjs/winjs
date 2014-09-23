// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

module WinJSTests {

    var HubSection = <typeof WinJS.UI.PrivateHubSection>WinJS.UI.HubSection;

    export class HubSectionsTests {
        "use strict";

        testContentElement() {
            var hubEl = document.createElement('div');
            hubEl.innerHTML = '<div class="mike"></div>';
            var firstChild = hubEl.firstChild;
            var hubSection = new HubSection(hubEl);

            // The content inside a hub sections hould be reparented inside of contentElement.
            LiveUnit.Assert.areEqual(firstChild, hubSection.contentElement.firstChild, "First child match");
        }

        testHeader() {
            var hubSection = new HubSection(undefined, { header: "hubSectionHeader" });
            LiveUnit.Assert.areEqual('', hubSection._headerContentElement.textContent, "No content default.");

            hubSection._setHeaderTemplate(function (itemData) {
                var element = document.createElement('div');
                element.textContent = itemData.header;
                return element;
            });
            LiveUnit.Assert.areEqual("hubSectionHeader", hubSection._headerContentElement.textContent, "Text match");

            hubSection.header = "OtherContent";
            LiveUnit.Assert.areEqual("OtherContent", hubSection._headerContentElement.textContent, "Text match");
        }
    };
}
LiveUnit.registerTestClass("WinJSTests.HubSectionsTests");