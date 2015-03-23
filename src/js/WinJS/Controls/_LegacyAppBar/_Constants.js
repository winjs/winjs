// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
     'exports',
     '../../Core/_Base',
], function appBarConstantsInit(exports, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, null, {
        // AppBar class names.
        appBarClass: "win-navbar",
        firstDivClass: "win-firstdiv",
        finalDivClass: "win-finaldiv",
        invokeButtonClass: "win-navbar-invokebutton",
        ellipsisClass: "win-navbar-ellipsis",
        primaryCommandsClass: "win-primarygroup",
        secondaryCommandsClass: "win-secondarygroup",
        commandLayoutClass: "win-commandlayout",
        menuLayoutClass: "win-menulayout",
        topClass: "win-top",
        bottomClass: "win-bottom",
        showingClass : "win-navbar-opening",
        shownClass : "win-navbar-opened",
        hidingClass : "win-navbar-closing",
        hiddenClass: "win-navbar-closed",
        compactClass: "win-navbar-compact",
        minimalClass: "win-navbar-minimal",
        menuContainerClass: "win-navbar-menu",

        // Constants for AppBar placement
        appBarPlacementTop: "top",
        appBarPlacementBottom: "bottom",

        // Constants for AppBar layouts
        appBarLayoutCustom: "custom",
        appBarLayoutCommands: "commands",
        appBarLayoutMenu: "menu",

        // Constant for AppBar invokebutton width
        appBarInvokeButtonWidth: 32,

        // Constants for Commands
        typeSeparator: "separator",
        typeContent: "content",
        typeButton: "button",
        typeToggle: "toggle",
        typeFlyout: "flyout",
        appBarCommandClass: "win-command",
        appBarCommandGlobalClass: "win-global",
        appBarCommandSelectionClass: "win-selection",
        sectionSelection: "selection", /* deprecated, use sectionSecondary */
        sectionGlobal: "global", /* deprecated, use sectionPrimary */
        sectionPrimary: "primary",
        sectionSecondary: "secondary",

        // Constants for Menus
        menuCommandClass: "win-command",
        menuCommandButtonClass: "win-command-button",
        menuCommandToggleClass: "win-command-toggle",
        menuCommandFlyoutClass: "win-command-flyout",
        menuCommandFlyoutActivatedClass: "win-command-flyout-activated",
        menuCommandSeparatorClass: "win-command-separator",
        _menuCommandInvokedEvent: "_invoked", // Private event
        menuClass: "win-menu",
        menuContainsToggleCommandClass: "win-menu-containstogglecommand",
        menuContainsFlyoutCommandClass: "win-menu-containsflyoutcommand",
        menuCommandHoverDelay: 400,

        // Other class names
        overlayClass: "win-overlay",
        flyoutClass: "win-flyout",
        flyoutLightClass: "win-ui-light",
        settingsFlyoutClass: "win-settingsflyout",
        scrollsClass: "win-scrolls",

        // Constants for AppBarCommand full-size widths.
        separatorWidth: 34,
        buttonWidth: 68,

        narrowClass: "win-narrow",
        wideClass: "win-wide",
        _clickEatingAppBarClass: "win-appbarclickeater",
        _clickEatingFlyoutClass: "win-flyoutmenuclickeater",
        _visualViewportClass: "win-visualviewport-space",

        // Event names
        commandVisibilityChanged: "commandvisibilitychanged",
    });
});