// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    var strings = {
        get notSupportedForProcessing() { return WinJS.Resources._getWinJSString("base/notSupportedForProcessing").value; }
    };

    function nop(v) {
        return v;
    }

    function addPrefixToCamelCasedName(prefix, name) {
        if (prefix === "") {
            return name;
        }

        return prefix + name.charAt(0).toUpperCase() + name.slice(1);
    }

    function addPrefixToCSSName(prefix, name) {
        return (prefix !== "" ? "-" + prefix + "-" : "") + name;
    }

    function getBrowserStyleEquivalents() {
        // not supported in WebWorker
        if (!self.document) {
            return {};
        }

        var equivalents:any = {},
            docStyle = document.documentElement.style,
            stylePrefixesToTest = ["", "webkit", "ms"], // It may be necessary to update the function getCamelCasedName to handle moz prefixes, if moz is added to this array
            styles = ["animation",
                "transition",
                "transform",
                "animation-name",
                "animation-duration",
                "animation-delay",
                "animation-timing-function",
                "animation-iteration-count",
                "animation-direction",
                "animation-fill-mode",
                "transform-origin",
                "transition-property",
                "transition-duration",
                "transition-delay",
                "transition-timing-function",
                "scroll-snap-points-x",
                "scroll-snap-points-y",
                "scroll-chaining",
                "scroll-limit",
                "scroll-limit-x-max",
                "scroll-limit-x-min",
                "scroll-limit-y-max",
                "scroll-limit-y-min",
                "scroll-snap-type",
                "scroll-snap-x",
                "scroll-snap-y",
                "overflow-style",
            ],
            prefixesUsedOnStyles = {};

        for (var i = 0, len = styles.length; i < len; i++) {
            var originalName = styles[i],
                styleToTest = WinJS.Utilities._getCamelCasedName(originalName);
            for (var j = 0, prefixLen = stylePrefixesToTest.length; j < prefixLen; j++) {
                var prefix = stylePrefixesToTest[j];
                var styleName = addPrefixToCamelCasedName(prefix, styleToTest);
                if (styleName in docStyle) {
                    // Firefox doesn't support dashed style names being get/set via script. (eg, something like element.style["transform-origin"] = "" wouldn't work).
                    // For each style translation we create, we'll make a CSS name version and a script name version for it so each can be used where appropriate.
                    var cssName = addPrefixToCSSName(prefix, originalName);
                    equivalents[originalName] = {
                        cssName: cssName,
                        scriptName: styleName
                    };
                    prefixesUsedOnStyles[originalName] = prefix;
                    break;
                }
            }
        }

        // Special cases:
        equivalents.animationPrefix = addPrefixToCSSName(prefixesUsedOnStyles["animation"], "");
        equivalents.keyframes = addPrefixToCSSName(prefixesUsedOnStyles["animation"], "keyframes");

        return equivalents;
    }

    function getBrowserEventEquivalents() {
        var equivalents = {};
        var animationEventPrefixes = ["", "WebKit"],
            animationEvents = [
                {
                    eventObject: "TransitionEvent",
                    events: ["transitionStart", "transitionEnd"]
                },
                {
                    eventObject: "AnimationEvent",
                    events: ["animationStart", "animationEnd"]
                }
            ];

        for (var i = 0, len = animationEvents.length; i < len; i++) {
            var eventToTest = animationEvents[i],
                chosenPrefix = "";
            for (var j = 0, prefixLen = animationEventPrefixes.length; j < prefixLen; j++) {
                var prefix = animationEventPrefixes[j];
                if ((prefix + eventToTest.eventObject) in self) {
                    chosenPrefix = prefix.toLowerCase();
                    break;
                }
            }
            for (var j = 0, eventsLen = eventToTest.events.length; j < eventsLen; j++) {
                var eventName = eventToTest.events[j];
                equivalents[eventName] = addPrefixToCamelCasedName(chosenPrefix, eventName);
                if (chosenPrefix === "") {
                    // Transition and animation events are case sensitive. When there's no prefix, the event name should be in lowercase.
                    // In IE, Chrome and Firefox, an event handler listening to transitionend will be triggered properly, but transitionEnd will not.
                    // When a prefix is provided, though, the event name needs to be case sensitive.
                    // IE and Firefox will trigger an animationend event handler correctly, but Chrome won't trigger webkitanimationend -- it has to be webkitAnimationEnd.
                    equivalents[eventName] = equivalents[eventName].toLowerCase();
                }
            }
        }

        // Non-standardized events
        equivalents["manipulationStateChanged"] = ("MSManipulationEvent" in self ? "ManipulationEvent" : null);
        return equivalents;
    }

    // Establish members of "WinJS.Utilities" namespace
    export module Utilities {

        // Used for mocking in tests
        export function _setHasWinRT(value:boolean):void {
            WinJS.Utilities.hasWinRT = value;
        }

        /// <field type="Boolean" locid="WinJS.Utilities.hasWinRT" helpKeyword="WinJS.Utilities.hasWinRT">Determine if WinRT is accessible in this script context.</field>
        export var hasWinRT:boolean = !!(<any>self).Windows;

        export function _getMemberFiltered(name, root, filter) {
            return name.split(".").reduce(function (currentNamespace, name) {
                if (currentNamespace) {
                    return filter(currentNamespace[name]);
                }
                return null;
            }, root);
        }

        export function getMember(name:string, root?:any) {
            /// <signature helpKeyword="WinJS.Utilities.getMember">
            /// <summary locid="WinJS.Utilities.getMember">
            /// Gets the leaf-level type or namespace specified by the name parameter.
            /// </summary>
            /// <param name="name" locid="WinJS.Utilities.getMember_p:name">
            /// The name of the member.
            /// </param>
            /// <param name="root" locid="WinJS.Utilities.getMember_p:root">
            /// The root to start in. Defaults to the global object.
            /// </param>
            /// <returns type="Object" locid="WinJS.Utilities.getMember_returnValue">
            /// The leaf-level type or namespace in the specified parent namespace.
            /// </returns>
            /// </signature>
            if (!name) {
                return null;
            }
            return _getMemberFiltered(name, root || self, nop);
        }

        // This may need to be updated for Mozilla prefixes, where the script name of a prefixed CSS name is supposed to be capitalized (eg, MozTransitionDuration).
        // We currently don't have any styles that use a -moz- prefix, so this function doesn't test for that case right now.
        export function _getCamelCasedName(styleName) {
            if (styleName.length > 0 && styleName.charAt(0) === "-") {
                styleName = styleName.slice(1);
            }
            return styleName.replace(/\-[a-z]/g, function (x) { return x[1].toUpperCase(); });
        }

        export var _browserStyleEquivalents = getBrowserStyleEquivalents();
        export var _browserEventEquivalents = getBrowserEventEquivalents();

        export function ready(callback?:Function, async?:boolean): WinJS.Promise<any> {
            /// <signature helpKeyword="WinJS.Utilities.ready">
            /// <summary locid="WinJS.Utilities.ready">
            /// Ensures that the specified function executes only after the DOMContentLoaded event has fired
            /// for the current page.
            /// </summary>
            /// <returns type="WinJS.Promise" locid="WinJS.Utilities.ready_returnValue">A promise that completes after DOMContentLoaded has occurred.</returns>
            /// <param name="callback" optional="true" locid="WinJS.Utilities.ready_p:callback">
            /// A function that executes after DOMContentLoaded has occurred.
            /// </param>
            /// <param name="async" optional="true" locid="WinJS.Utilities.ready_p:async">
            /// If true, the callback is executed asynchronously.
            /// </param>
            /// </signature>
            return new WinJS.Promise(function (c, e) {
                function complete() {
                    if (callback) {
                        try {
                            callback();
                            c();
                        }
                        catch (err) {
                            e(err);
                        }
                    }
                    else {
                        c();
                    }
                }

                var readyState = WinJS.Utilities.testReadyState;
                if (!readyState) {
                    if (self.document) {
                        readyState = document.readyState;
                    }
                    else {
                        readyState = "complete";
                    }
                }
                if (readyState === "complete" || (self.document && document.body !== null)) {
                    if (async) {
                        WinJS.Utilities.Scheduler.schedule(function WinJS_Utilities_ready() {
                            complete();
                        }, WinJS.Utilities.Scheduler.Priority.normal, null, "WinJS.Utilities.ready");
                    }
                    else {
                        complete();
                    }
                }
                else {
                    self.addEventListener("DOMContentLoaded", complete, false);
                }
            });
        }

        /// <field type="Boolean" locid="WinJS.Utilities.strictProcessing" helpKeyword="WinJS.Utilities.strictProcessing">Determines if strict declarative processing is enabled in this script context.</field>
        export var strictProcessing:boolean = true;

        export interface ISupportedForProcessing {
            (any): any;
            supportedForProcessing: boolean;
        }

        export function markSupportedForProcessing(func:Function):Function {
            /// <signature helpKeyword="WinJS.Utilities.markSupportedForProcessing">
            /// <summary locid="WinJS.Utilities.markSupportedForProcessing">
            /// Marks a function as being compatible with declarative processing, such as WinJS.UI.processAll
            /// or WinJS.Binding.processAll.
            /// </summary>
            /// <param name="func" type="Function" locid="WinJS.Utilities.markSupportedForProcessing_p:func">
            /// The function to be marked as compatible with declarative processing.
            /// </param>
            /// <returns type="Function" locid="WinJS.Utilities.markSupportedForProcessing_returnValue">
            /// The input function.
            /// </returns>
            /// </signature>
            (<ISupportedForProcessing><any>func).supportedForProcessing = true;
            return func;
        }

        export function requireSupportedForProcessing(value: ISupportedForProcessing): ISupportedForProcessing {
            /// <signature helpKeyword="WinJS.Utilities.requireSupportedForProcessing">
            /// <summary locid="WinJS.Utilities.requireSupportedForProcessing">
            /// Asserts that the value is compatible with declarative processing, such as WinJS.UI.processAll
            /// or WinJS.Binding.processAll. If it is not compatible an exception will be thrown.
            /// </summary>
            /// <param name="value" type="Object" locid="WinJS.Utilities.requireSupportedForProcessing_p:value">
            /// The value to be tested for compatibility with declarative processing. If the
            /// value is a function it must be marked with a property 'supportedForProcessing'
            /// with a value of true.
            /// </param>
            /// <returns type="Object" locid="WinJS.Utilities.requireSupportedForProcessing_returnValue">
            /// The input value.
            /// </returns>
            /// </signature>
            var supportedForProcessing = true;

            supportedForProcessing = supportedForProcessing && !(value === <any>self);
            supportedForProcessing = supportedForProcessing && !(value === (<any>self).location);
            supportedForProcessing = supportedForProcessing && !(value instanceof HTMLIFrameElement);
            supportedForProcessing = supportedForProcessing && !(typeof value === "function" && !value.supportedForProcessing);

            switch (self.frames.length) {
                case 0:
                    break;

                case 1:
                    supportedForProcessing = supportedForProcessing && !(value === self.frames[0]);
                    break;

                default:
                    for (var i = 0, len = self.frames.length; supportedForProcessing && i < len; i++) {
                        supportedForProcessing = supportedForProcessing && !(value === self.frames[i]);
                    }
                    break;
            }

            if (supportedForProcessing) {
                return value;
            }

            throw new WinJS.ErrorFromName("WinJS.Utilities.requireSupportedForProcessing", WinJS.Resources._formatString(strings.notSupportedForProcessing, value));
        }
        
        export var _setImmediate = self.setImmediate ? self.setImmediate.bind(self) : function (handler) {
            setTimeout(handler, 0);
        };
        
        // Allows the browser to finish dispatching its current set of events before running
        // the callback.
        export var _yieldForEvents = self.setImmediate ? self.setImmediate.bind(self) : function (handler) {
            setTimeout(handler, 0);
        };
        
        // Allows the browser to notice a DOM modification before running the callback.
        export var _yieldForDomModification = self.setImmediate ? self.setImmediate.bind(self) : function (handler) {
            setTimeout(handler, 0);
        };

        export var _shallowCopy = function _shallowCopy(a) {
            // Shallow copy a single object.
            return this._mergeAll([a]);
        };

        export var _merge = function _merge(a, b) {
            // Merge 2 objects together into a new object
            return this._mergeAll([a, b]);
        };

        export var _mergeAll = function _mergeAll(list) {
            // Merge a list of objects together
            var o = {};
            list.forEach(function (part) {
                Object.keys(part).forEach(function (k) {
                    o[k] = part[k];
                });
            });
            return o;
        };
        
        export var _getProfilerMarkIdentifier = function _getProfilerMarkIdentifier(element) {
            var profilerMarkIdentifier = "";
            if (element.id) {
                profilerMarkIdentifier += " id='" + element.id + "'";
            }
            if (element.className) {
                profilerMarkIdentifier += " class='" + element.className + "'";
            }
            return profilerMarkIdentifier;
        };

        export var _now = function _now() {
            return (self.performance && performance.now()) || Date.now();
        };

        export var _traceAsyncOperationStarting = ((<any>self).Debug && Debug.msTraceAsyncOperationStarting && Debug.msTraceAsyncOperationStarting.bind((<any>self).Debug)) || nop;
        export var _traceAsyncOperationCompleted = ((<any>self).Debug && Debug.msTraceAsyncOperationCompleted && Debug.msTraceAsyncOperationCompleted.bind((<any>self).Debug)) || nop;
        export var _traceAsyncCallbackStarting = ((<any>self).Debug && Debug.msTraceAsyncCallbackStarting && Debug.msTraceAsyncCallbackStarting.bind((<any>self).Debug)) || nop;
        export var _traceAsyncCallbackCompleted = ((<any>self).Debug && Debug.msTraceAsyncCallbackCompleted && Debug.msTraceAsyncCallbackCompleted.bind((<any>self).Debug)) || nop;
    }

    export var validation = false;
    export function strictProcessing() {
        /// <signature helpKeyword="WinJS.strictProcessing">
        /// <summary locid="WinJS.strictProcessing">
        /// Strict processing is always enforced, this method has no effect.
        /// </summary>
        /// </signature>
    }
}