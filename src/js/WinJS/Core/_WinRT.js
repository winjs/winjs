// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './_Global',
], function logInit(exports, _Global) {
    "use strict";

    function lookup(parts) {
        var current = _Global;
        for (var i = 0, len = parts.length; current && i < len; i++) {
            current = current[parts[i]];
        }
        return current;
    }

    Object.defineProperty(exports, "msSetWeakWinRTProperty", {
        get: function () { return _Global.msSetWeakWinRTProperty; }
    });

    Object.defineProperty(exports, "msGetWeakWinRTProperty", {
        get: function () { return _Global.msSetWeakWinRTProperty; }
    });

    exports.Windows = {

        ApplicationModel: {

            DesginMode: {
                
                get designModeEnabled() { return lookup(["Windows", "ApplicationModel", "DesignMode", "designModeEnabled"]); },

            },

        },

        Foundation: {

            get Uri() { return lookup(["Windows", "Foundation", "Uri"]); },

        },

        Storage: {

            get ApplicationData() { return lookup(["Windows", "Storage", "ApplicationData"]); },
            get CreationCollisionOption() { return lookup(["Windows", "Storage", "CreationCollisionOption"]); },
            get FileIO() { return lookup(["Windows", "Storage", "FileIO"]); },
            get StorageHelpers() { return lookup(["Windows", "Storage", "StorageHelpers"]); },

        },

        UI: {

            Core: {

                get AnimationMetrics() { return lookup(["Windows", "UI", "Core", "AnimationMetrics"]); },

            },

            Input: {

                get EdgeGesture() { return lookup(["Windows", "UI", "Input", "EdgeGesture"]); },

            },

            ViewManagement: {

                get InputPane() { return lookup(["Windows", "UI", "ViewManagement", "InputPane"]); },
                get UISettings() { return lookup(["Windows", "UI", "ViewManagement", "UISettings"]); },

            },

            WebUI: {

                Core: {

                    get WebUICommandBar() { return lookup(["Windows", "UI", "WebUI", "Core", "WebUICommandBar"]); },

                }

            }

        }

    };
    
});
