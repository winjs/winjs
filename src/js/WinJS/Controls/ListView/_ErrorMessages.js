// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
        'exports',
        '../../Core/_Base',
        '../../Core/_Resources'
    ], function errorMessagesInit(exports, _Base, _Resources) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, null, {

        modeIsInvalid: {
            get: function () { return "Invalid argument: mode must be one of following values: 'none', 'single' or 'multi'."; }
        },

        loadingBehaviorIsDeprecated: {
            get: function () { return "Invalid configuration: loadingBehavior is deprecated. The control will default this property to 'randomAccess'. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        pagesToLoadIsDeprecated: {
            get: function () { return "Invalid configuration: pagesToLoad is deprecated. The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        pagesToLoadThresholdIsDeprecated: {
            get: function () { return "Invalid configuration: pagesToLoadThreshold is deprecated.  The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        automaticallyLoadPagesIsDeprecated: {
            get: function () { return "Invalid configuration: automaticallyLoadPages is deprecated. The control will default this property to false. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        invalidTemplate: {
            get: function () { return "Invalid template: Templates must be created before being passed to the ListView, and must contain a valid tree of elements."; }
        },

        loadMorePagesIsDeprecated: {
            get: function () { return "loadMorePages is deprecated. Invoking this function will not have any effect. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        disableBackdropIsDeprecated: {
            get: function () { return "Invalid configuration: disableBackdrop is deprecated. Style: .win-listview .win-container.win-backdrop { background-color:transparent; } instead."; }
        },

        backdropColorIsDeprecated: {
            get: function () { return "Invalid configuration: backdropColor is deprecated. Style: .win-listview .win-container.win-backdrop { rgba(155,155,155,0.23); } instead."; }
        },

        itemInfoIsDeprecated: {
            get: function () { return "GridLayout.itemInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout."; }
        },

        groupInfoIsDeprecated: {
            get: function () { return "GridLayout.groupInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout."; }
        },

        resetItemIsDeprecated: {
            get: function () { return "resetItem may be altered or unavailable in future versions. Instead, mark the element as disposable using WinJS.Utilities.markDisposable."; }
        },

        resetGroupHeaderIsDeprecated: {
            get: function () { return "resetGroupHeader may be altered or unavailable in future versions. Instead, mark the header element as disposable using WinJS.Utilities.markDisposable."; }
        },
        
        maxRowsIsDeprecated: {
            get: function() { return "GridLayout.maxRows may be altered or unavailable in future versions. Instead, use the maximumRowsOrColumns property."; }
        }
    });

});
