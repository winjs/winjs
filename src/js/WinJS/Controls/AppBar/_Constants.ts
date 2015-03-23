// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
import _CommandingSurfaceConstants = require("../CommandingSurface/_Constants");

// appbar class names
export var ClassNames = {
    controlCssClass: "win-appbar",
    disposableCssClass: "win-disposable",
    actionAreaCssClass: "win-appbar-actionarea",
    overflowButtonCssClass: "win-appbar-overflowbutton",
    spacerCssClass: "win-appbar-spacer",
    ellipsisCssClass: "win-appbar-ellipsis",
    overflowAreaCssClass: "win-appbar-overflowarea",
    contentFlyoutCssClass: "win-appbar-contentflyout",
    emptyappbarCssClass: "win-appbar-empty",
    menuCssClass: "win-menu",
    menuContainsToggleCommandClass: "win-menu-containstogglecommand",
    openingClass: "win-appbar-opening",
    openedClass: "win-appbar-opened",
    closingClass: "win-appbar-closing",
    closedClass: "win-appbar-closed",
    noneClass: "win-appbar-closeddisplaynone",
    minimalClass: "win-appbar-closeddisplayminimal",
    compactClass: "win-appbar-closeddisplaycompact",
    fullClass: "win-appbar-closeddisplayfull",
    placementTopClass: "win-appbar-top",
    placementBottomClass: "win-appbar-bottom",
};

export var EventNames = {
    beforeOpen: "beforeopen",
    afterOpen: "afteropen",
    beforeClose: "beforeclose",
    afterClose: "afterclose"
};

export var controlMinWidth: number = _CommandingSurfaceConstants.controlMinWidth;

export var defaultClosedDisplayMode = "compact";
export var defaultOpened = false;
export var defaultPlacement = "bottom";

// Constants for commands
export var typeSeparator = "separator";
export var typeContent = "content";
export var typeButton = "button";
export var typeToggle = "toggle";
export var typeFlyout = "flyout";

export var commandSelector = ".win-command";

export var primaryCommandSection = "primary";
export var secondaryCommandSection = "secondary";