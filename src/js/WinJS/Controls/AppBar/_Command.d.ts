// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Flyout = require("../Flyout");

export interface ICommand {
    //#region Methods

    /**
     * Registers an event handler for the specified event.
     * @param type The event type to register.
     * @param listener The event handler function to associate with the event.
     * @param useCapture Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Releases resources held by this AppBarCommand. Call this method when the AppBarCommand is no longer needed. After calling this method, the AppBarCommand becomes unusable.
    **/
    dispose(): void;

    /**
     * Removes an event handler that the addEventListener method registered.
     * @param type The event type to unregister. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to remove.
     * @param useCapture Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets a value that indicates whether the AppBarCommand is disabled.
    **/
    disabled: boolean;

    /**
     * Gets the DOM element that hosts the AppBarCommand.
    **/
    element: HTMLElement;

    /**
     * Adds an extra CSS class during construction.
    **/
    extraClass: string;

    /**
     * Gets or sets the HTMLElement with a 'content' type AppBarCommand that should receive focus whenever focus moves by the user pressing HOME or the arrow keys, from the previous AppBarCommand to this AppBarCommand.
    **/
    firstElementFocus: HTMLElement;

    /**
     * Gets or sets the Flyout object displayed by this command. The specified flyout is shown when the AppBarCommand's button is invoked.
    **/
    flyout: Flyout.Flyout;

    /**
     * Gets or sets a value that indicates whether the AppBarCommand is hiding or in the process of becoming hidden.
    **/
    hidden: boolean;

    /**
     * Gets or sets the icon of the AppBarCommand.
    **/
    icon: string;

    /**
     * Gets the element identifier (ID) of the command.
    **/
    id: string;

    /**
     * Gets or sets the label of the command.
    **/
    label: string;

    /**
     * Gets or sets the HTMLElement with a 'content' type AppBarCommand that should receive focus whenever focus moves by the user pressing END or the arrow keys, from the previous AppBarCommand to this AppBarCommand.
    **/
    lastElementFocus: HTMLElement;

    /**
     * Gets or sets the function to be invoked when the command is clicked.
    **/
    onclick: Function;

    /**
     * Gets or sets the section of the app bar that the command is in.
    **/
    section: string;

    /**
     * Gets or sets the selected state of a toggle button.
    **/
    selected: boolean;

    /**
     * Gets or sets the tooltip of the command.
    **/
    tooltip: string;

    /**
     * Gets or sets the type of the command.
    **/
    type: string;

    /**
      * Gets or sets the priority of the command.
     **/
    priority: number;

    winControl: ICommand

    //#endregion Properties
}

/**
 * Represents a command to be displayed in an app bar.
**/
export declare class AppBarCommand implements ICommand {
    //#region Constructors

    /**
     * Creates a new AppBarCommand object.
     * @constructor 
     * @param element The DOM element that will host the control.
     * @param options The set of properties and values to apply to the new AppBarCommand.
    **/
    constructor(element?: HTMLElement, options?: any);

    //#endregion Constructors

    //#region Methods

    /**
     * Registers an event handler for the specified event.
     * @param type The event type to register.
     * @param listener The event handler function to associate with the event.
     * @param useCapture Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void;

    /**
     * Releases resources held by this AppBarCommand. Call this method when the AppBarCommand is no longer needed. After calling this method, the AppBarCommand becomes unusable.
    **/
    dispose(): void;

    /**
     * Removes an event handler that the addEventListener method registered.
     * @param type The event type to unregister. It must be beforeshow, beforehide, aftershow, or afterhide.
     * @param listener The event handler function to remove.
     * @param useCapture Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets a value that indicates whether the AppBarCommand is disabled.
    **/
    disabled: boolean;

    /**
     * Gets the DOM element that hosts the AppBarCommand.
    **/
    element: HTMLElement;

    /**
     * Adds an extra CSS class during construction.
    **/
    extraClass: string;

    /**
     * Gets or sets the HTMLElement with a 'content' type AppBarCommand that should receive focus whenever focus moves by the user pressing HOME or the arrow keys, from the previous AppBarCommand to this AppBarCommand.
    **/
    firstElementFocus: HTMLElement;

    /**
     * Gets or sets the Flyout object displayed by this command. The specified flyout is shown when the AppBarCommand's button is invoked.
    **/
    flyout: Flyout.Flyout;

    /**
     * Gets or sets a value that indicates whether the AppBarCommand is hiding or in the process of becoming hidden.
    **/
    hidden: boolean;

    /**
     * Gets or sets the icon of the AppBarCommand.
    **/
    icon: string;

    /**
     * Gets the element identifier (ID) of the command.
    **/
    id: string;

    /**
     * Gets or sets the label of the command.
    **/
    label: string;

    /**
     * Gets or sets the HTMLElement with a 'content' type AppBarCommand that should receive focus whenever focus moves by the user pressing END or the arrow keys, from the previous AppBarCommand to this AppBarCommand.
    **/
    lastElementFocus: HTMLElement;

    /**
     * Gets or sets the function to be invoked when the command is clicked.
    **/
    onclick: Function;

    /**
     * Gets the section of the app bar that the command is in.
    **/
    section: string;

    /**
     * Gets or sets the selected state of a toggle button.
    **/
    selected: boolean;

    /**
     * Gets or sets the tooltip of the command.
    **/
    tooltip: string;

    /**
     * Gets the type of the command.
    **/
    type: string;

    /**
     * Gets the type of the command.
    **/
    priority: number;


    winControl: ICommand
    //#endregion Properties

}
