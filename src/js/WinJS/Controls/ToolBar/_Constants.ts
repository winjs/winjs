// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
import _CommandingSurfaceConstants = require("../CommandingSurface/_Constants");

// toolbar class names
export var ClassNames = {
    controlCssClass: "win-toolbar",
    disposableCssClass: "win-disposable",
    actionAreaCssClass: "win-toolbar-actionarea",
    overflowButtonCssClass: "win-toolbar-overflowbutton",
    spacerCssClass: "win-toolbar-spacer",
    ellipsisCssClass: "win-toolbar-ellipsis",
    overflowAreaCssClass: "win-toolbar-overflowarea",
    contentFlyoutCssClass: "win-toolbar-contentflyout",
    emptytoolbarCssClass: "win-toolbar-empty",
    menuCssClass: "win-menu",
    menuContainsToggleCommandClass: "win-menu-containstogglecommand",
    menuContainsFlyoutCommandClass: "win-menu-containsflyoutcommand",
    openingClass: "win-toolbar-opening",
    openedClass: "win-toolbar-opened",
    closingClass: "win-toolbar-closing",
    closedClass: "win-toolbar-closed",
    compactClass: "win-toolbar-closeddisplaycompact",
    fullClass: "win-toolbar-closeddisplayfull",
    overflowTopClass: "win-toolbar-overflowtop",
    overflowBottomClass: "win-toolbar-overflowbottom",
    placeHolderCssClass: "win-toolbar-placeholder",
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

// Constants for commands
export var typeSeparator = "separator";
export var typeContent = "content";
export var typeButton = "button";
export var typeToggle = "toggle";
export var typeFlyout = "flyout";

export var commandSelector = ".win-command";

export var primaryCommandSection = "primary";
export var secondaryCommandSection = "secondary";