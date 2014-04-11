// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    export var log;

    export module Utilities {
        var spaceR = /\s+/g;
        var typeR = /^(error|warn|info|log)$/;

        export function formatLog(message:string, tag:string, type:string);
        export function formatLog(message:Function, tag:string, type:string);
        export function formatLog(message:any, tag:string, type:string) {
            /// <signature helpKeyword="WinJS.Utilities.formatLog">
            /// <summary locid="WinJS.Utilities.formatLog">
            /// Adds tags and type to a logging message.
            /// </summary>
            /// <param name="message" type="String" locid="WinJS.Utilities.startLog_p:message">The message to format.</param>
            /// <param name="tag" type="String" locid="WinJS.Utilities.startLog_p:tag">
            /// The tag(s) to apply to the message. Separate multiple tags with spaces.
            /// </param>
            /// <param name="type" type="String" locid="WinJS.Utilities.startLog_p:type">The type of the message.</param>
            /// <returns type="String" locid="WinJS.Utilities.startLog_returnValue">The formatted message.</returns>
            /// </signature>
            var m = message;
            if (typeof (m) === "function") { m = m(); }

            return ((type && typeR.test(type)) ? ("") : (type ? (type + ": ") : "")) +
                (tag ? tag.replace(spaceR, ":") + ": " : "") +
                m;
        }
        function defAction(message:string, tag:string, type:string) {
            var m = WinJS.Utilities.formatLog(message, tag, type);
            console[(type && typeR.test(type)) ? type : "log"](m);
        }
        function escape(s:string) {
            // \s (whitespace) is used as separator, so don't escape it
            return s.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
        }

        export interface ILogAction {
            (message:string, tag:string, type:string):void;
        }

        export interface ILogOptions {
            type: string;
            excludeTags: string;
            tags: string;
            action: ILogAction;
        }

        interface IResult extends ILogAction {
            next: ILogAction;
        };

        export function startLog(options:string);
        export function startLog(options:ILogOptions);
        export function startLog(options:any) {
            /// <signature helpKeyword="WinJS.Utilities.startLog">
            /// <summary locid="WinJS.Utilities.startLog">
            /// Configures a logger that writes messages containing the specified tags from WinJS.log to console.log.
            /// </summary>
            /// <param name="options" type="String" locid="WinJS.Utilities.startLog_p:options">
            /// The tags for messages to log. Separate multiple tags with spaces.
            /// </param>
            /// </signature>
            /// <signature>
            /// <summary locid="WinJS.Utilities.startLog2">
            /// Configure a logger to write WinJS.log output.
            /// </summary>
            /// <param name="options" type="Object" locid="WinJS.Utilities.startLog_p:options2">
            /// May contain .type, .tags, .excludeTags and .action properties.
            ///  - .type is a required tag.
            ///  - .excludeTags is a space-separated list of tags, any of which will result in a message not being logged.
            ///  - .tags is a space-separated list of tags, any of which will result in a message being logged.
            ///  - .action is a function that, if present, will be called with the log message, tags and type. The default is to log to the console.
            /// </param>
            /// </signature>
            options = options || {};
            if (typeof options === "string") {
                options = { tags: options };
            }
            var el = options.type && new RegExp("^(" + escape(options.type).replace(spaceR, " ").split(" ").join("|") + ")$");
            var not = options.excludeTags && new RegExp("(^|\\s)(" + escape(options.excludeTags).replace(spaceR, " ").split(" ").join("|") + ")(\\s|$)", "i");
            var has = options.tags && new RegExp("(^|\\s)(" + escape(options.tags).replace(spaceR, " ").split(" ").join("|") + ")(\\s|$)", "i");
            var action = options.action || defAction;

            if (!el && !not && !has && !WinJS.log) {
                WinJS.log = action;
                return;
            }

            var result:IResult = <IResult>function (message:string, tag:string, type:string) {
                if (!((el && !el.test(type))          // if the expected log level is not satisfied
                    || (not && not.test(tag))         // if any of the excluded categories exist
                    || (has && !has.test(tag)))) {    // if at least one of the included categories doesn't exist
                        action(message, tag, type);
                    }

                result.next && result.next(message, tag, type);
            };
            result.next = WinJS.log;
            WinJS.log = result;
        }
        
        export function stopLog() {
            /// <signature helpKeyword="WinJS.Utilities.stopLog">
            /// <summary locid="WinJS.Utilities.stopLog">
            /// Removes the previously set up logger.
            /// </summary>
            /// </signature>
            delete WinJS.log;
        }
    }
}
