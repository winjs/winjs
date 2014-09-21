// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

"use strict";
// ListView Variables
var DEF_OUTERTESTDIV_ID = 'outerTestDiv'; // id of outer div element surrounding the placeholder element
var DEF_ITEMRENDERERCONTAINER_ID = 'itemTemplateContainer';
var DEF_DUMMYITEMRENDERER_ID = 'itemTemplate1';

var DEF_LISTVIEW_HEIGHT,
    DEF_LISTVIEW_WIDTH,
    DEF_LISTVIEW_ITEM_WIDTH,
    DEF_LISTVIEW_ITEM_HEIGHT,
    DEF_LISTVIEW_HEADER_HEIGHT,
    DEF_LISTVIEW_HEADER_WIDTH,
    DEF_LISTVIEW_HEADER_FONT_SIZE,
    DEF_LISTVIEW_HEADER_LEADING_MARGIN,
    DEF_LISTVIEW_HEADER_GROUP_MARGIN,
    DEF_TOTAL_ITEMS,
    DEF_TOTAL_GROUPS,
    DEF_LISTVIEWCONTAINER_ID,
    DEF_TESTCSS_ID,
    DEF_ITEM_DATA;

// Initialize Defaults
SetDefaults();

var DEFAULT_PAGE_MARGIN = 48;
var DEFAULT_ITEM_PEEK = 48;

///
//  Set Default Constants
function SetDefaults() {
    /// <summary>
    ///     Sets up Default globals that may be modified during tests.
    /// </summary>
    /// <returns type="Void"/>
    DEF_LISTVIEW_HEIGHT = 500;
    DEF_LISTVIEW_WIDTH = 500;
    DEF_LISTVIEW_ITEM_WIDTH = Math.floor(DEF_LISTVIEW_HEIGHT / 5 - DEF_LISTVIEW_HEIGHT / 16);
    DEF_LISTVIEW_ITEM_HEIGHT = Math.floor(DEF_LISTVIEW_WIDTH / 5 - DEF_LISTVIEW_WIDTH / 16);
    DEF_LISTVIEW_HEADER_HEIGHT = 120;
    DEF_LISTVIEW_HEADER_WIDTH = 120;
    DEF_LISTVIEW_HEADER_LEADING_MARGIN = 0;             // default from uicollections.css
    DEF_LISTVIEW_HEADER_GROUP_MARGIN = 70;              // default from uicollections.css
    DEF_TOTAL_GROUPS = 26;
    DEF_TOTAL_ITEMS = 100;
    DEF_LISTVIEWCONTAINER_ID = 'listviewContainer';     // id of div placeholder element for listview
    DEF_TESTCSS_ID = 'testCss';                         // id of div element to test CSS styles
    DEF_ITEM_DATA = { title: "InsertedTile", content: "InsertedContent" };
}

///
//  Expected Values
///
module Expected {
    // TODO: There is only one type of control, CollectionView. The verification code checks for
    // the type of the control when checking the layout. That will have to be refactored. Or just
    // remove everything related to control.
    export var Control = { List: 'list', Grid: 'grid' };
    export var Height = { Negative: -1, Medium: Math.floor(DEF_LISTVIEW_HEIGHT / 5 - DEF_LISTVIEW_HEIGHT / 16), Large: DEF_LISTVIEW_HEIGHT, Exceeds: DEF_LISTVIEW_HEIGHT + 1, Default: 30 };
    export var Width = { Negative: -1, Medium: Math.floor(DEF_LISTVIEW_WIDTH / 5 - DEF_LISTVIEW_WIDTH / 16), Large: DEF_LISTVIEW_WIDTH, Exceeds: DEF_LISTVIEW_WIDTH + 1, Default: 30 };
    export var Horizontal = { Grid: true, List: false };
    export var Interaction = { Invalid: 'invalid', Multiselection: 'multi', Singleselection: 'single', Browse: 'none', Static: 'none', None: 'none' };
    export var SelectionMode = { Invalid: 'invalid', Multi: 'multi', Single: 'single', None: 'none' };
    // TODO: Do we still need margin for grid layout with groups?
    export var GroupMargin = { Small: 1, Medium: 50, Large: 100 };
    export var GroupHeaderPosition = { Invalid: 'invalid', Left: 'left', Top: 'top' };
    export var Reorder = { Invalid: 'invalid', True: true, False: false };
    export var Exception = {
        ElementIsInvalid: "Invalid argument: ListView expects valid DOM element as the first argument.",
        LayoutIsInvalid: "Invalid argument: layout must be one of following values: 'verticalgrid', 'horizontalgrid' or 'list'.",
        ModeIsInvalid: "Invalid argument: mode must be one of following values: 'static', 'browse', 'singleselection' or 'multiselection'.",
        SizeIsInvalid: "Invalid argument: itemWidth and itemHeight must be non-negative numbers.",
        NonNegativeInvalid: "Invalid argument: index must be a non-negative integer.",
        NullException: "'null' is null or not an object",
        IndexInvalid: "Invalid argument: index is invalid."
    };
    export var Direction = { ltr: "ltr", rtl: "rtl" };
    export var ClassName = {
        ListView: "win-listview",                               // Applied to element to which listview control is attached
        Viewport: "win-viewport",                               // Applied to the listview viewport div
        Horizontal: "win-horizontal",                           // Applied to the listview viewport div in the grid layout
        Vertical: "win-vertical",                               // Applied to the listview viewport div in the list layout
        Surface: "win-surface",                                 // Applied to the panning surface of the listview
        Progress: "win-progress",                               // Applied to the progress indicator element used in listview
        Container: "win-container",                             // Applied to the container div of each listview
        Item: "win-item",                                       // Applied to the each item in listview
        Pressed: "win-item.win-pressed",                        // Applied to the pressed item
        Selected: "win-selected",                               // Applied to the selected items
        GroupHeader: "win-groupheader",                         // Applied to the group headers in the grouped grid layout
        DragImage: "win-dragimage",                             // Applied to the items being dragged
        DragCount: "win-dragcount",                             // Applied to the items being ?? TODO
        DragOverlay: "win-dragoverlay",                         // Applied to the items being ?? TODO
        SelectionBackground: "win-selectionbackground",         // Applied to the div used as the selection background
        SelectionCheckmark: "win-selectioncheckmark",           // Applied to the selection checkmark element
        SelectionHint: "win-selectionhint",                     // Applied to the selection hint element
        RTL: "win-rtl"                                          // Applied to the listview element in rtl mode
    };
    // TODO: Remove 2 below
    export var Items = { Default: "default", VariableSize: "variablesize", GroupedContent: "groupedcontent" };
    export var GroupHeader = { GroupByAlphabetContent: "groupbyalphabetcontent", GroupByAlphabetContent2: "groupbyalphabetcontent2" };
}
function GridDefaults() {
    this.itemHeight = 0;
    this.itemWidth = 0;
    this.itemDataSource = null;
    this.horizontal = Expected.Horizontal.Grid;
    this.selectionMode = Expected.SelectionMode.Multi;
    this.reorderable = false;
}

function ListDefaults() {
    this.itemHeight = 0;
    this.itemWidth = 0;
    this.itemDataSource = null;
    this.horizontal = Expected.Horizontal.List;
    this.selectionMode = Expected.SelectionMode.Multi;
    this.reorderable = false;
}
