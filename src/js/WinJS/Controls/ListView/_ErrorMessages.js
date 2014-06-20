// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
        'exports',
        '../../Core/_Base',
        '../../Core/_Resources'
    ], function errorMessagesInit(exports, _Base, _Resources) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, null, {

        modeIsInvalid: {
            get: function () { return _Resources._getWinJSString("ui/modeIsInvalid").value; }
        },

        loadingBehaviorIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/loadingBehaviorIsDeprecated").value; }
        },

        pagesToLoadIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/pagesToLoadIsDeprecated").value; }
        },

        pagesToLoadThresholdIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/pagesToLoadThresholdIsDeprecated").value; }
        },

        automaticallyLoadPagesIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/automaticallyLoadPagesIsDeprecated").value; }
        },

        invalidTemplate: {
            get: function () { return _Resources._getWinJSString("ui/invalidTemplate").value; }
        },

        loadMorePagesIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/loadMorePagesIsDeprecated").value; }
        },

        disableBackdropIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/disableBackdropIsDeprecated").value; }
        },

        backdropColorIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/backdropColorIsDeprecated").value; }
        },

        itemInfoIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/itemInfoIsDeprecated").value; }
        },

        groupInfoIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/groupInfoIsDeprecated").value; }
        },

        resetItemIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/resetItemIsDeprecated").value; }
        },

        resetGroupHeaderIsDeprecated: {
            get: function () { return _Resources._getWinJSString("ui/resetGroupHeaderIsDeprecated").value; }
        },
        
        maxRowsIsDeprecated: {
            get: function() { return _Resources._getWinJSString("ui/maxRowsIsDeprecated").value; }
        }
    });

});
