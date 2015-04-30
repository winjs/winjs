// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

// CommandingSurface class names
export var ClassNames = {
    controlCssClass: "win-commandingsurface",
    disposableCssClass: "win-disposable",
    actionAreaCssClass: "win-commandingsurface-actionarea",
    actionAreaContainerCssClass: "win-commandingsurface-actionareacontainer",
    overflowButtonCssClass: "win-commandingsurface-overflowbutton",
    spacerCssClass: "win-commandingsurface-spacer",
    ellipsisCssClass: "win-commandingsurface-ellipsis",
    overflowAreaCssClass: "win-commandingsurface-overflowarea",
    overflowAreaContainerCssClass: "win-commandingsurface-overflowareacontainer",
    contentFlyoutCssClass: "win-commandingsurface-contentflyout",
    emptyCommandingSurfaceCssClass: "win-commandingsurface-empty",
    menuCssClass: "win-menu",
    menuContainsToggleCommandClass: "win-menu-containstogglecommand",
    openedClass: "win-commandingsurface-opened",
    closingClass: "win-commandingsurface-closing",
    closedClass: "win-commandingsurface-closed",
    noneClass: "win-commandingsurface-closeddisplaynone",
    minimalClass: "win-commandingsurface-closeddisplayminimal",
    compactClass: "win-commandingsurface-closeddisplaycompact",
    fullClass: "win-commandingsurface-closeddisplayfull",
    overflowTopClass: "win-commandingsurface-overflowtop",
    overflowBottomClass: "win-commandingsurface-overflowbottom",
};

export var EventNames = {
    beforeOpen: "beforeopen",
    afterOpen: "afteropen",
    beforeClose: "beforeclose",
    afterClose: "afterclose",

    commandPropertyMutated: "_commandpropertymutated",
};

export var actionAreaCommandWidth = 68;
export var actionAreaSeparatorWidth = 34;
export var actionAreaOverflowButtonWidth = 32;
export var overflowCommandHeight = 44;
export var overflowSeparatorHeight = 12;

export var controlMinWidth = actionAreaOverflowButtonWidth;
export var overflowAreaMaxWidth = 480;

export var heightOfMinimal = 24;
export var heightOfCompact = 48;

export var contentMenuCommandDefaultLabel = "Custom content";

export var defaultClosedDisplayMode = "compact";
export var defaultOpened = false;
export var defaultOverflowDirection = "bottom";

// Constants for commands
export var typeSeparator = "separator";
export var typeContent = "content";
export var typeButton = "button";
export var typeToggle = "toggle";
export var typeFlyout = "flyout";

export var commandSelector = ".win-command"; 

export var primaryCommandSection = "primary";
export var secondaryCommandSection = "secondary";
