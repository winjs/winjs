// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    "use strict";

    export class BaseUtilities {

        testGetMemberNull() {
            LiveUnit.Assert.areEqual(WinJS.Utilities.getMember(""), null);
        }

        testRequireSupportedForProcessingOnFunctionFromIFrame() {
            var iframe = document.createElement("iframe");
            iframe.id = "someframe";
            document.body.appendChild(iframe);
            try {
                var thrown = false;
                try {
                    WinJS.Utilities.requireSupportedForProcessing(iframe.contentWindow.scroll);
                } catch (e) {
                    thrown = true;
                }
                LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
            } finally {
                document.body.removeChild(iframe);

            }
        }

        testRequireSupportedForProcessingOnIFrameWindow() {
            var iframe = document.createElement("iframe");
            iframe.id = "someframe";
            document.body.appendChild(iframe);
            try {
                var thrown = false;
                try {
                    WinJS.Utilities.requireSupportedForProcessing(iframe.contentWindow);
                } catch (e) {
                    thrown = true;
                }
                LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
            } finally {
                document.body.removeChild(iframe);
            }
        }

        testRequireSupportedForProcessingOnIFrameElement() {
            var iframe = document.createElement("iframe");
            iframe.id = "someframe";
            document.body.appendChild(iframe);
            try {

                var thrown = false;
                try {
                    WinJS.Utilities.requireSupportedForProcessing(iframe);
                } catch (e) {
                    thrown = true;
                }
                LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
            } finally {
                document.body.removeChild(iframe);
            }
        }

        testRequireSupportedForProcessingOnWindowLocation() {
            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(window.location);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        }

        testRequireSupportedForProcessingOnDocumentLocation() {
            var thrown = false;
            try {
                WinJS.Utilities.requireSupportedForProcessing(document.location);
            } catch (e) {
                thrown = true;
            }
            LiveUnit.Assert.isTrue(thrown, "Exception should be thrown");
        }

    }
}

LiveUnit.registerTestClass("CorsicaTests.BaseUtilities");
