// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_BaseCoreUtils',
    '../Core/_Base'
    ], function uiInit(exports, _BaseCoreUtils, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        eventHandler: function (handler) {
            /// <signature helpKeyword="WinJS.UI.eventHandler">
            /// <summary locid="WinJS.UI.eventHandler">
            /// Marks a event handler function as being compatible with declarative processing.
            /// </summary>
            /// <param name="handler" type="Object" locid="WinJS.UI.eventHandler_p:handler">
            /// The handler to be marked as compatible with declarative processing.
            /// </param>
            /// <returns type="Object" locid="WinJS.UI.eventHandler_returnValue">
            /// The input handler.
            /// </returns>
            /// </signature>
            return _BaseCoreUtils.markSupportedForProcessing(handler);
        },
        /// <field locid="WinJS.UI.Orientation" helpKeyword="WinJS.UI.Orientation">
        /// Orientation options for a control's property
        /// </field>
        Orientation: {
            /// <field locid="WinJS.UI.Orientation.horizontal" helpKeyword="WinJS.UI.Orientation.horizontal">
            /// Horizontal
            /// </field>
            horizontal: "horizontal",
            /// <field locid="WinJS.UI.Orientation.vertical" helpKeyword="WinJS.UI.Orientation.vertical">
            /// Vertical
            /// </field>
            vertical: "vertical"
        },

        CountResult: {
            unknown: "unknown"
        },

        CountError: {
            noResponse: "noResponse"
        },

        DataSourceStatus: {
            ready: "ready",
            waiting: "waiting",
            failure: "failure"
        },

        FetchError: {
            noResponse: "noResponse",
            doesNotExist: "doesNotExist"
        },

        EditError: {
            noResponse: "noResponse",
            canceled: "canceled",
            notPermitted: "notPermitted",
            noLongerMeaningful: "noLongerMeaningful"
        },

        /// <field locid="WinJS.UI.ListView.ObjectType" helpKeyword="WinJS.UI.ObjectType">
        /// Specifies the type of an IListViewEntity.
        /// </field>
        ObjectType: {
            /// <field locid="WinJS.UI.ListView.ObjectType.item" helpKeyword="WinJS.UI.ObjectType.item">
            /// This value represents a ListView item.
            /// </field>
            item: "item",
            /// <field locid="WinJS.UI.ListView.ObjectType.groupHeader" helpKeyword="WinJS.UI.ObjectType.groupHeader">
            /// This value represents a ListView group header.
            /// </field>
            groupHeader: "groupHeader",
            /// <field locid="WinJS.UI.ListView.ObjectType.listHeader" helpKeyword="WinJS.UI.ObjectType.listHeader">
            /// This value represents the ListView's header.
            /// </field>
            listHeader: "listHeader",
            /// <field locid="WinJS.UI.ListView.ObjectType.listFooter" helpKeyword="WinJS.UI.ObjectType.listFooter">
            /// This value represents the ListView's footer.
            /// </field>
            listFooter: "listFooter",
        },

        /// <field locid="WinJS.UI.ListView.SelectionMode" helpKeyword="WinJS.UI.SelectionMode">
        /// Specifies the selection mode for a ListView.
        /// </field>
        SelectionMode: {
            /// <field locid="WinJS.UI.ListView.SelectionMode.none" helpKeyword="WinJS.UI.SelectionMode.none">
            /// Items cannot be selected.
            /// </field>
            none: "none",
            /// <field locid="WinJS.UI.ListView.SelectionMode.single" helpKeyword="WinJS.UI.SelectionMode.single">
            /// A single item may be selected.
            /// <compatibleWith platform="Windows" minVersion="8.0"/>
            /// </field>
            single: "single",
            /// <field locid="WinJS.UI.ListView.SelectionMode.multi" helpKeyword="WinJS.UI.SelectionMode.multi">
            /// Multiple items may be selected.
            /// </field>
            multi: "multi"
        },

        /// <field locid="WinJS.UI.TapBehavior" helpKeyword="WinJS.UI.TapBehavior">
        /// Specifies how an ItemContainer or items in a ListView respond to the tap interaction.
        /// </field>
        TapBehavior: {
            /// <field locid="WinJS.UI.TapBehavior.directSelect" helpKeyword="WinJS.UI.TapBehavior.directSelect">
            /// Tapping the item invokes it and selects it. Navigating to the item with the keyboard changes the
            /// the selection so that the focused item is the only item that is selected.
            /// <compatibleWith platform="Windows" minVersion="8.0"/>
            /// </field>
            directSelect: "directSelect",
            /// <field locid="WinJS.UI.TapBehavior.toggleSelect" helpKeyword="WinJS.UI.TapBehavior.toggleSelect">
            /// Tapping the item invokes it. If the item was selected, tapping it clears the selection. If the item wasn't
            /// selected, tapping the item selects it.
            /// Navigating to the item with the keyboard does not select or invoke it.
            /// </field>
            toggleSelect: "toggleSelect",
            /// <field locid="WinJS.UI.TapBehavior.invokeOnly" helpKeyword="WinJS.UI.TapBehavior.invokeOnly">
            /// Tapping the item invokes it. Navigating to the item with keyboard does not select it or invoke it.
            /// </field>
            invokeOnly: "invokeOnly",
            /// <field locid="WinJS.UI.TapBehavior.none" helpKeyword="WinJS.UI.TapBehavior.none">
            /// Nothing happens.
            /// </field>
            none: "none"
        },

        /// <field locid="WinJS.UI.SwipeBehavior" helpKeyword="WinJS.UI.SwipeBehavior">
        /// Specifies whether items are selected when the user performs a swipe interaction.
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        SwipeBehavior: {
            /// <field locid="WinJS.UI.SwipeBehavior.select" helpKeyword="WinJS.UI.SwipeBehavior.select">
            /// The swipe interaction selects the items touched by the swipe.
            /// </field>
            select: "select",
            /// <field locid="WinJS.UI.SwipeBehavior.none" helpKeyword="WinJS.UI.SwipeBehavior.none">
            /// The swipe interaction does not change which items are selected.
            /// </field>
            none: "none"
        },

        /// <field locid="WinJS.UI.GroupHeaderTapBehavior" helpKeyword="WinJS.UI.GroupHeaderTapBehavior">
        /// Specifies how group headers in a ListView respond to the tap interaction.
        /// </field>
        GroupHeaderTapBehavior: {
            /// <field locid="WinJS.UI.GroupHeaderTapBehavior.invoke" helpKeyword="WinJS.UI.GroupHeaderTapBehavior.invoke">
            /// Tapping the group header invokes it.
            /// </field>
            invoke: "invoke",
            /// <field locid="WinJS.UI.GroupHeaderTapBehavior.none" helpKeyword="WinJS.UI.GroupHeaderTapBehavior.none">
            /// Nothing happens.
            /// </field>
            none: "none"
        }

    });

});
