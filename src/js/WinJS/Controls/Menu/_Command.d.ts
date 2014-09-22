// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Flyout = require("../../Controls/Flyout");

/**
 * Represents a command to be displayed in a Menu object.
**/
export declare class MenuCommand {
    //#region Constructors

    /**
     * Creates a new MenuCommand object.
     * @constructor 
     * @param element The DOM element that will host the control.
     * @param options The set of properties and values to apply to the new MenuCommand.
    **/
    constructor(element?: HTMLElement, options?: any);

    //#endregion Constructors

    //#region Methods

    /**
     * Registers an event handler for the specified event.
     * @param type The event type to register. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to associate with the event.
     * @param useCapture Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Disposes this control.
    **/
    dispose(): void;

    /**
     * Removes an event handler that the addEventListener method registered.
     * @param type The event type to unregister. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to remove.
     * @param useCapture Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;


    /**
     * Handles the menu click event
    **/
    _handleMenuClick(event: any): void;


    /**
     * Handles the menu mouse over event
    **/
    _handleMouseOver(): void;


    /**
     * Handles the menu mouse move event
    **/
    _handleMouseMove(): void;


    /**
     * Handles the menu mouse out event
    **/
    _handleMouseOut(): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets a value that indicates whether the MenuCommand is disabled.
    **/
    disabled: boolean;

    /**
     * Gets the DOM element that hosts the MenuCommand.
    **/
    element: HTMLElement;

    /**
     * Adds an extra CSS class during construction.
    **/
    extraClass: string;

    /**
     * Gets or sets the Flyout object displayed by this command. The specified flyout is shown when the MenuCommand's button is invoked.
    **/
    flyout: Flyout.Flyout;

    /**
     * Gets a value that indicates whether the MenuCommand is hidden or in the process of becoming hidden.
    **/
    hidden: boolean;

    /**
     * Gets the element identifier (ID) of the command.
    **/
    id: string;

    /**
     * Gets or sets the label of the command.
    **/
    label: string;

    /**
     * Gets or sets the function to be invoked when the command is clicked.
    **/
    onclick: Function;

    /**
     * Gets or sets the selected state of a toggle button.
    **/
    selected: boolean;

    /**
     * Gets the type of the command.
    **/
    type: string;

    //#endregion Properties
}

