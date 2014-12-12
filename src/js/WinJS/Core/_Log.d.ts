// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

export interface ILogOptions {
    type?: string;
    action?: (message: string, tags: string, type: string) => void;
    excludeTags?: string;
    tags?: string;
}

/**
 * Configures a logger that writes messages containing the specified tags to the JavaScript console.
 * @param options The tags for messages to log. Multiple tags should be separated by spaces. May contain type, tags, excludeTags and action properties.
**/
export declare function startLog(options?: ILogOptions): void;
export declare function startLog(tags?: string): void;

/**
 * Removes the WinJS logger that had previously been set up.
**/
export declare function stopLog(): void;

/**
 * Adds tags and type to a logging message.
 * @param message The message to be formatted.
 * @param tag The tag(s) to be applied to the message. Multiple tags should be separated by spaces.
 * @param type The type of the message.
 * @returns The formatted message.
**/
export declare function formatLog(message: string, tag: string, type: string): string;

/**
 * You can provide an implementation of this method yourself, or use WinJS.Utilities.startLog to create one that logs to the JavaScript console.
 * @param message The message to log.
 * @param tags The tag or tags to categorize the message (winjs, winjs controls, etc.).
 * @param type The type of message (error, warning, info, etc.).
**/
export declare function log(message: string, tags?: string, type?: string): void;
export declare function log(message: () => string, tags?: string, type?: string): void;