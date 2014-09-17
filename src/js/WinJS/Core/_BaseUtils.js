// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './_Global',
    './_Base',
    './_BaseCoreUtils',
    './_ErrorFromName',
    './_Resources',
    './_Trace',
    '../Promise',
    '../Scheduler'
    ], function baseUtilsInit(exports, _Global, _Base, _BaseCoreUtils, _ErrorFromName, _Resources, _Trace, Promise, Scheduler) {
    "use strict";

    var strings = {
        get notSupportedForProcessing() { return "Value is not supported within a declarative processing context, if you want it to be supported mark it using WinJS.Utilities.markSupportedForProcessing. The value was: '{0}'"; }
    };

    var requestAnimationWorker;
    var requestAnimationId = 0;
    var requestAnimationHandlers = {};
    var isPhone = false;
    var validation = false;
    var platform = _Global.navigator.platform;
    var isiOS = platform === "iPhone" || platform === "iPad" || platform === "iPod";

    function nop(v) {
        return v;
    }

    function getMemberFiltered(name, root, filter) {
        return name.split(".").reduce(function (currentNamespace, name) {
            if (currentNamespace) {
                return filter(currentNamespace[name]);
            }
            return null;
        }, root);
    }

    function getMember(name, root) {
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
        return getMemberFiltered(name, root || _Global, nop);
    }

    function getCamelCasedName(styleName) {
        // special case -moz prefixed styles because their JS property name starts with Moz
        if (styleName.length > 0 && styleName.indexOf("-moz") !== 0 && styleName.charAt(0) === "-") {
            styleName = styleName.slice(1);
        }
        return styleName.replace(/\-[a-z]/g, function (x) { return x[1].toUpperCase(); });
    }

    function addPrefixToCamelCasedName(prefix, name) {
        if (prefix === "") {
            return name;
        }

        return prefix + name.charAt(0).toUpperCase() + name.slice(1);
    }

    function addPrefixToCSSName(prefix, name) {
        return (prefix !== "" ? "-" + prefix.toLowerCase() + "-" : "") + name;
    }

    function getBrowserStyleEquivalents() {
        // not supported in WebWorker
        if (!_Global.document) {
            return {};
        }

        var equivalents = {},
            docStyle = _Global.document.documentElement.style,
            stylePrefixesToTest = ["", "webkit", "ms", "Moz"],
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
                "grid-column",
                "grid-columns",
                "grid-column-span",
                "grid-row",
                "grid-rows",
                "grid-row-span",
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
                "touch-action",
                "overflow-style",
                "user-select" // used for Template Compiler test
            ],
            prefixesUsedOnStyles = {};

        for (var i = 0, len = styles.length; i < len; i++) {
            var originalName = styles[i],
                styleToTest = getCamelCasedName(originalName);
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
                if ((prefix + eventToTest.eventObject) in _Global) {
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
        equivalents["manipulationStateChanged"] = ("MSManipulationEvent" in _Global ? "ManipulationEvent" : null);
        return equivalents;
    }
    
    // Returns a function which, when called, will call *fn*. However,
    // if called multiple times, it will only call *fn* at most once every
    // *delay* milliseconds. Multiple calls during the throttling period
    // will be coalesced into a single call to *fn* with the arguments being
    // the ones from the last call received during the throttling period.
    // Note that, due to the throttling period, *fn* may be invoked asynchronously
    // relative to the time it was called so make sure its arguments are still valid
    // (for example, eventObjects will not be valid).
    //
    // Example usage. If you want your key down handler to run once every 100 ms,
    // you could do this:
    //   var onKeyDown = throttledFunction(function (keyCode) {
    //     // do something with keyCode
    //   });
    //   element.addEventListener("keydown", function (eventObject) { onKeyDown(eventObject.keyCode); });
    //
    function throttledFunction(delay, fn) {
        var throttlePromise = null;
        var pendingCallPromise = null;
        var nextContext = null;
        var nextArgs = null;
    
        function makeThrottlePromise() {
            return Promise.timeout(delay).then(function () {
                throttlePromise = null;
            });
        }
    
        return function () {
            if (pendingCallPromise) {
                nextContext = this;
                nextArgs = [].slice.call(arguments, 0);
            } else if (throttlePromise) {
                nextContext = this;
                nextArgs = [].slice.call(arguments, 0);
                pendingCallPromise = throttlePromise.then(function () {
                    var context = nextContext;
                    nextContext = null;
                    var args = nextArgs;
                    nextArgs = null;
                    throttlePromise = makeThrottlePromise();
                    pendingCallPromise = null;
                    fn.apply(context, args);
                });
            } else {
                throttlePromise = makeThrottlePromise();
                fn.apply(this, arguments);
            }
        };
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        // Used for mocking in tests
        _setHasWinRT: {
            value: function (value) {
                _BaseCoreUtils.hasWinRT = value;
            },
            configurable: false,
            writable: false,
            enumerable: false
        },

        /// <field type="Boolean" locid="WinJS.Utilities.hasWinRT" helpKeyword="WinJS.Utilities.hasWinRT">Determine if WinRT is accessible in this script context.</field>
        hasWinRT: {
            get: function () { return _BaseCoreUtils.hasWinRT; },
            configurable: false,
            enumerable: true
        },

        // Used for mocking in tests
        _setIsiOS: {
            value: function (value) {
                isiOS = value;
            },
            configurable: false,
            writable: false,
            enumerable: false
        },

        _isiOS: {
            get: function () { return isiOS; },
            configurable: false,
            enumerable: true
        },

        _getMemberFiltered: getMemberFiltered,

        getMember: getMember,

        _browserStyleEquivalents: getBrowserStyleEquivalents(),
        _browserEventEquivalents: getBrowserEventEquivalents(),
        _getCamelCasedName: getCamelCasedName,

        ready: function ready(callback, async) {
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
            return new Promise(function (c, e) {
                function complete() {
                    if (callback) {
                        try {
                            callback();
                            c();
                        }
                        catch (err) {
                            e(err);
                        }
                    } else {
                        c();
                    }
                }

                var readyState = ready._testReadyState;
                if (!readyState) {
                    if (_Global.document) {
                        readyState = _Global.document.readyState;
                    } else {
                        readyState = "complete";
                    }
                }
                if (readyState === "complete" || (_Global.document && _Global.document.body !== null)) {
                    if (async) {
                        Scheduler.schedule(function WinJS_Utilities_ready() {
                            complete();
                        }, Scheduler.Priority.normal, null, "WinJS.Utilities.ready");
                    } else {
                        complete();
                    }
                } else {
                    _Global.addEventListener("DOMContentLoaded", complete, false);
                }
            });
        },

        /// <field type="Boolean" locid="WinJS.Utilities.strictProcessing" helpKeyword="WinJS.Utilities.strictProcessing">Determines if strict declarative processing is enabled in this script context.</field>
        strictProcessing: {
            get: function () { return true; },
            configurable: false,
            enumerable: true,
        },

        markSupportedForProcessing: {
            value: _BaseCoreUtils.markSupportedForProcessing,
            configurable: false,
            writable: false,
            enumerable: true
        },

        requireSupportedForProcessing: {
            value: function (value) {
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

                supportedForProcessing = supportedForProcessing && value !== _Global;
                supportedForProcessing = supportedForProcessing && value !== _Global.location;
                supportedForProcessing = supportedForProcessing && !(value instanceof _Global.HTMLIFrameElement);
                supportedForProcessing = supportedForProcessing && !(typeof value === "function" && !value.supportedForProcessing);

                switch (_Global.frames.length) {
                    case 0:
                        break;

                    case 1:
                        supportedForProcessing = supportedForProcessing && value !== _Global.frames[0];
                        break;

                    default:
                        for (var i = 0, len = _Global.frames.length; supportedForProcessing && i < len; i++) {
                            supportedForProcessing = supportedForProcessing && value !== _Global.frames[i];
                        }
                        break;
                }

                if (supportedForProcessing) {
                    return value;
                }

                throw new _ErrorFromName("WinJS.Utilities.requireSupportedForProcessing", _Resources._formatString(strings.notSupportedForProcessing, value));
            },
            configurable: false,
            writable: false,
            enumerable: true
        },

        _setImmediate: _BaseCoreUtils._setImmediate,

        _requestAnimationFrame: _Global.requestAnimationFrame ? _Global.requestAnimationFrame.bind(_Global) : function (handler) {
            var handle = ++requestAnimationId;
            requestAnimationHandlers[handle] = handler;
            requestAnimationWorker = requestAnimationWorker || _Global.setTimeout(function () {
                var toProcess = requestAnimationHandlers;
                var now = Date.now();
                requestAnimationHandlers = {};
                requestAnimationWorker = null;
                Object.keys(toProcess).forEach(function (key) {
                    toProcess[key](now);
                });
            }, 16);
            return handle;
        },

        _cancelAnimationFrame: _Global.cancelAnimationFrame ? _Global.cancelAnimationFrame.bind(_Global) : function (handle) {
            delete requestAnimationHandlers[handle];
        },

        // Allows the browser to finish dispatching its current set of events before running
        // the callback.
        _yieldForEvents: _Global.setImmediate ? _Global.setImmediate.bind(_Global) : function (handler) {
            _Global.setTimeout(handler, 0);
        },

        // Allows the browser to notice a DOM modification before running the callback.
        _yieldForDomModification: _Global.setImmediate ? _Global.setImmediate.bind(_Global) : function (handler) {
            _Global.setTimeout(handler, 0);
        },
        
        _throttledFunction: throttledFunction,

        _shallowCopy: function _shallowCopy(a) {
            // Shallow copy a single object.
            return this._mergeAll([a]);
        },

        _merge: function _merge(a, b) {
            // Merge 2 objects together into a new object
            return this._mergeAll([a, b]);
        },

        _mergeAll: function _mergeAll(list) {
            // Merge a list of objects together
            var o = {};
            list.forEach(function (part) {
                Object.keys(part).forEach(function (k) {
                    o[k] = part[k];
                });
            });
            return o;
        },

        _getProfilerMarkIdentifier: function _getProfilerMarkIdentifier(element) {
            var profilerMarkIdentifier = "";
            if (element.id) {
                profilerMarkIdentifier += " id='" + element.id + "'";
            }
            if (element.className) {
                profilerMarkIdentifier += " class='" + element.className + "'";
            }
            return profilerMarkIdentifier;
        },

        _now: function _now() {
            return (_Global.performance && _Global.performance.now && _Global.performance.now()) || Date.now();
        },

        _traceAsyncOperationStarting: _Trace._traceAsyncOperationStarting,
        _traceAsyncOperationCompleted: _Trace._traceAsyncOperationCompleted,
        _traceAsyncCallbackStarting: _Trace._traceAsyncCallbackStarting,
        _traceAsyncCallbackCompleted: _Trace._traceAsyncCallbackCompleted,

        /// <field type="Boolean" locid="WinJS.Utilities.isPhone" helpKeyword="WinJS.Utilities.isPhone">Determine if we are currently running in the Phone.</field>
        isPhone: {
            get: function () { return isPhone; },
            configurable: false,
            enumerable: true
        },
        _setIsPhone: {
            set: function (value) {
                isPhone = value;
            }
        }
    });

    _Base.Namespace._moduleDefine(exports, "WinJS", {
        validation: {
            get: function () {
                return validation;
            },
            set: function (value) {
                validation = value;
            }
        }
    });

    // strictProcessing also exists as a module member
    _Base.Namespace.define("WinJS", {
        strictProcessing: {
            value: function () {
                /// <signature helpKeyword="WinJS.strictProcessing">
                /// <summary locid="WinJS.strictProcessing">
                /// Strict processing is always enforced, this method has no effect.
                /// </summary>
                /// </signature>
            },
            configurable: false,
            writable: false,
            enumerable: false
        }
    });
});

