// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../TestLib/util.ts" />

(function () {
    "use strict";

    WinJS.Namespace.define("OverlayHelpers", {
        show: function (overlay) {
            return Helper.waitForFocusWithin(overlay.element, function () { overlay.show(); });
        },

        disposeAndRemove: function disposeAndRemove(element) {
            if (element) {
                if (element.dispose) {
                    element.dispose();
                } else if (element.winControl) {
                    element.winControl.dispose();
                } else {
                    WinJS.Utilities.disposeSubTree(element);
                }
                element.parentElement && element.parentElement.removeChild(element);
            }
        },

        createBackClickEvent: function createBackClickEvent() {
            var fakeWinRTBackPressedEvent = { handled: false };
            return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
        },

        Assert: {
            dismissesWhenLosingFocus: function dismissesWhenLosingFocus(options) {
                return new WinJS.Promise(function (complete) {
                    var overlay = options.overlay;
                    var externalElement = options.focusTo;

                    OverlayHelpers.show(overlay).then(function () {
                        LiveUnit.Assert.isTrue(overlay.element.contains(document.activeElement), "Focus should initially be within the Overlay");
                        LiveUnit.Assert.isFalse(overlay.hidden, "Overlay should initially be visible");

                        return Helper.focus(externalElement);
                    }).then(function () {
                        LiveUnit.Assert.areEqual(externalElement, document.activeElement, "Focus should have moved outside of the Overlay");
                        LiveUnit.Assert.isTrue(overlay.hidden, "Overlay should have hid because it lost focus");

                        complete();
                    });
                });
            },

            remainsVisibleWhenMovingFocusInternally: function remainsVisibleWhenMovingFocusInternally(options) {
                return new WinJS.Promise(function (complete) {
                    var overlay = options.overlay;
                    var focusFrom = options.focusFrom;
                    var focusTo = options.focusTo;

                    OverlayHelpers.show(overlay).then(function () {
                        LiveUnit.Assert.areEqual(focusFrom, document.activeElement, "Unexpected element initially has focus");
                        LiveUnit.Assert.isFalse(overlay.hidden, "Overlay should initially be visible");

                        return Helper.focus(focusTo);
                    }).then(function () {
                        LiveUnit.Assert.areEqual(focusTo, document.activeElement, "Expected element didn't receive focus");
                        LiveUnit.Assert.isFalse(overlay.hidden, "Overlay should have remained visible when moving focus within it");

                        complete();
                    });
                });
            }
        }
    });
})();