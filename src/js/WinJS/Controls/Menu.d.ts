// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import MenuCommand = require("Menu/_Command");

/**
 * Represents a menu flyout for displaying commands.
**/
export declare class Menu {
    //#region Constructors

    /**
     * Creates a new Menu object.
     * @constructor 
     * @param element The DOM element that will host the control.
     * @param options The set of properties and values to apply to the new Menu.
    **/
    constructor(element?: HTMLElement, options?: any);

    //#endregion Constructors

    //#region Events

    /**
     * Occurs immediately after the Menu is hidden.
     * @param eventInfo An object that contains information about the event.
    **/
    onafterhide(eventInfo: Event): void;

    /**
     * Occurs after the Menu is shown.
     * @param eventInfo An object that contains information about the event.
    **/
    onaftershow(eventInfo: Event): void;

    /**
     * Occurs before the Menu is hidden.
     * @param eventInfo An object that contains information about the event.
    **/
    onbeforehide(eventInfo: Event): void;

    /**
     * Occurs before a hidden Menu is shown.
     * @param eventInfo An object that contains information about the event.
    **/
    onbeforeshow(eventInfo: Event): void;

    //#endregion Events

    //#region Methods

    /**
     * Registers an event handler for the specified event.
     * @param type The event type to register. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to associate with the event.
     * @param useCapture Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Releases resources held by this Menu. Call this method when the Menu is no longer needed. After calling this method, the Menu becomes unusable.
    **/
    dispose(): void;

    /**
     * Returns the MenuCommand object identified by id.
     * @param id The element identifier (ID) of the command to be returned.
     * @returns The command identified by id.
    **/
    getCommandById(id: string): MenuCommand.MenuCommand;

    /**
     * Hides the Menu.
    **/
    hide(): void;

    /**
     * Hides the specified commands of the Menu.
     * @param commands The commands to hide. The array elements may be MenuCommand objects, or the string identifiers (IDs) of commands.
     * @param immediate The parameter immediate is not supported and may be altered or unavailable in the future. true to hide the commands immediately, without animating them; otherwise, false.
    **/
    hideCommands(commands: any[], immediate: boolean): void;

    /**
     * Removes an event handler that the addEventListener method registered.
     * @param type The event type to unregister. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to remove.
     * @param useCapture Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Shows the Menu, if hidden, regardless of other states.
     * @param anchor Required. The DOM element to anchor the Menu.
     * @param placement The placement of the Menu to the anchor: top, bottom, left, right, auto, autohorizontal, or autovertical
     * @param alignment For top or bottom placement, the alignment of the Menu to the anchor's edge: center, left, or right.
    **/
    show(anchor: HTMLElement, placement: string, alignment: string): void;

    /**
     * Shows the specified commands of the Menu.
     * @param commands The commands to show. The array elements may be Menu objects, or the string identifiers (IDs) of commands.
     * @param immediate The parameter immediate is not supported and may be altered or unavailable in the future. true to show the commands immediately, without animating them; otherwise, false.
    **/
    showCommands(commands: any[], immediate: boolean): void;

    /**
     * Shows the specified commands of the Menu while hiding all other commands.
     * @param commands The commands to show. The array elements may be MenuCommand objects, or the string identifiers (IDs) of commands.
     * @param immediate The parameter immediate is not supported and may be altered or unavailable in the future. true to show the specified commands (and hide the others) immediately, without animating them; otherwise, false.
    **/
    showOnlyCommands(commands: any[], immediate: boolean): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the default alignment to be used for this Menu.
    **/
    alignment: string;

    /**
     * Gets or sets the default anchor to be used for this Menu.
    **/
    anchor: HTMLElement;

    /**
     * Sets the MenuCommand objects that appear in the menu.
    **/
    commands: MenuCommand.MenuCommand[];

    /**
     * Gets the DOM element that hosts the Menu.
    **/
    element: HTMLElement;

    /**
     * Gets a value that indicates whether the Menu is hidden or in the process of becoming hidden.
    **/
    hidden: boolean;

    /**
     * Gets or sets the default placement to be used for this Menu.
    **/
    placement: string;

    //#endregion Properties

}
