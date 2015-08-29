// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'exports',
    './_Global',
    './_Base',
], function winrtInit(exports, _Global, _Base) {
    "use strict";

    exports.msGetWeakWinRTProperty = _Global.msGetWeakWinRTProperty;
    exports.msSetWeakWinRTProperty = _Global.msSetWeakWinRTProperty;

    var APIs = [
        "Windows.ApplicationModel.DesignMode.designModeEnabled",
        "Windows.ApplicationModel.Resources.Core.ResourceContext",
        "Windows.ApplicationModel.Resources.Core.ResourceManager",
        "Windows.ApplicationModel.Search.SearchQueryLinguisticDetails",
        "Windows.Data.Text.SemanticTextQuery",
        "Windows.Foundation.Collections.CollectionChange",
        "Windows.Foundation.Diagnostics",
        "Windows.Foundation.Uri",
        "Windows.Globalization.ApplicationLanguages",
        "Windows.Globalization.Calendar",
        "Windows.Globalization.DateTimeFormatting",
        "Windows.Globalization.Language",
        "Windows.Phone.UI.Input.HardwareButtons",
        "Windows.Storage.ApplicationData",
        "Windows.Storage.CreationCollisionOption",
        "Windows.Storage.BulkAccess.FileInformationFactory",
        "Windows.Storage.FileIO",
        "Windows.Storage.FileProperties.ThumbnailType",
        "Windows.Storage.FileProperties.ThumbnailMode",
        "Windows.Storage.FileProperties.ThumbnailOptions",
        "Windows.Storage.KnownFolders",
        "Windows.Storage.Search.FolderDepth",
        "Windows.Storage.Search.IndexerOption",
        "Windows.Storage.Streams.RandomAccessStreamReference",
        "Windows.UI.ApplicationSettings.SettingsEdgeLocation",
        "Windows.UI.ApplicationSettings.SettingsCommand",
        "Windows.UI.ApplicationSettings.SettingsPane",
        "Windows.UI.Core.AnimationMetrics",
        "Windows.UI.Core.SystemNavigationManager",
        "Windows.UI.Input.EdgeGesture",
        "Windows.UI.Input.EdgeGestureKind",
        "Windows.UI.Input.PointerPoint",
        "Windows.UI.ViewManagement.HandPreference",
        "Windows.UI.ViewManagement.InputPane",
        "Windows.UI.ViewManagement.UIColorType",
        "Windows.UI.ViewManagement.UISettings",
        "Windows.UI.WebUI.Core.WebUICommandBar",
        "Windows.UI.WebUI.Core.WebUICommandBarBitmapIcon",
        "Windows.UI.WebUI.Core.WebUICommandBarClosedDisplayMode",
        "Windows.UI.WebUI.Core.WebUICommandBarIconButton",
        "Windows.UI.WebUI.Core.WebUICommandBarSymbolIcon",
        "Windows.UI.WebUI.WebUIApplication",
    ];

    // If getForCurrentView fails, it is an indication that we are running in a WebView without
    // a CoreWindow where some WinRT APIs are not available. In this case, we just treat it as
    // if no WinRT APIs are available.
    var isCoreWindowAvailable = false;
    try {
        _Global.Windows.UI.ViewManagement.InputPane.getForCurrentView();
        isCoreWindowAvailable = true;
    } catch (e) { }

    APIs.forEach(function (api) {
        var parts = api.split(".");
        var leaf = {};
        leaf[parts[parts.length - 1]] = {
            get: function () {
                if (isCoreWindowAvailable) {
                    return parts.reduce(function (current, part) { return current ? current[part] : null; }, _Global);
                } else {
                    return null;
                }
            }
        };
        _Base.Namespace.defineWithParent(exports, parts.slice(0, -1).join("."), leaf);
    });
});
