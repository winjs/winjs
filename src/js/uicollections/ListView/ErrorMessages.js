// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function errorMessagesInit(global, WinJS, undefined) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI._strings", {

        modeIsInvalid: {
            get: function () { return WinJS.Resources._getWinJSString("ui/modeIsInvalid").value; }
        },

        loadingBehaviorIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/loadingBehaviorIsDeprecated").value; }
        },

        pagesToLoadIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/pagesToLoadIsDeprecated").value; }
        },

        pagesToLoadThresholdIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/pagesToLoadThresholdIsDeprecated").value; }
        },

        automaticallyLoadPagesIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/automaticallyLoadPagesIsDeprecated").value; }
        },

        invalidTemplate: {
            get: function () { return WinJS.Resources._getWinJSString("ui/invalidTemplate").value; }
        },

        loadMorePagesIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/loadMorePagesIsDeprecated").value; }
        },

        disableBackdropIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/disableBackdropIsDeprecated").value; }
        },

        backdropColorIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/backdropColorIsDeprecated").value; }
        },

        itemInfoIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/itemInfoIsDeprecated").value; }
        },

        groupInfoIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/groupInfoIsDeprecated").value; }
        },

        resetItemIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/resetItemIsDeprecated").value; }
        },

        resetGroupHeaderIsDeprecated: {
            get: function () { return WinJS.Resources._getWinJSString("ui/resetGroupHeaderIsDeprecated").value; }
        },
        
        maxRowsIsDeprecated: {
            get: function() { return WinJS.Resources._getWinJSString("ui/maxRowsIsDeprecated").value; }
        }
    });

})(this, WinJS);
