// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module VDSLogging {
    "use strict";

    var Promise = WinJS.Promise;
    var UI = WinJS.UI;

    function logGetStack() {
        var newLimit = currentOptions().stackTraceLimit;
        if (newLimit <= 0) {
            return "Stack tracing is currently turned off, to turn it on set VDSLogger.options.stackTraceLimit to a value > 0.";
        }
        var oldLimit = Error['stackTraceLimit'];
        Error['stackTraceLimit'] = newLimit || oldLimit;
        try {
            try {
                throw new Error();
            } catch (e) {
                return e.stack;
            }
        } finally {
            Error['stackTraceLimit'] = oldLimit;
        }
    }

    function ASSERT(condition, message, data?) {
        if (!condition) {
            var terminationArg = {
                stack: logGetStack(),
                description: {
                    message: message,
                    data: data
                },
                number: 0,
            };
            var log = currentOptions().log || console.log.bind(console);
            log("ASSERT FAILURE: " + message + "\n\nAbout to call MSApp.terminateApp with: " + JSON.stringify(terminationArg));
            debugger;
            MSApp.terminateApp(terminationArg);
        }
    }

    var nopArgProcessor = function (args) { return ""; }
    var timingIds = 0;


    class Logger {

        className;
        timing;
        entry;
        exit;
        log;
        handleTracking;
        include;
        object;

        constructor(className, options, object) {
            this.className = className;
            this.timing = options.timing;
            this.entry = options.entry;
            this.exit = options.exit;
            this.log = options.log || console.log.bind(console);
            this.handleTracking = options.handleTracking;
            this.include = options.include || /.*/;
            this.object = object
        }

        wrap(name, argProcessor = nopArgProcessor, resultProcessor?, entryTracker?, resultLogger?) {
            if (!this.include.test(name)) {
                return;
            }
            var v = this.object[name];
            if (!v) {
                return;
            }
            if (typeof v !== "function") {
                return;
            }
            var log = this.log;
            var className = this.className;
            var fullName = "" + this.className + "::" + name + " ";
            var message = function () {
                return fullName;
            };
            if (this.timing) {
                var logStopAfterPromise;
                var timingTarget = v;
                v = function logTiming() {
                    var timingId = " (id:" + (++timingIds) + ")";
                    var prefix = fullName + argProcessor(arguments);
                    WinJS.Utilities._writeProfilerMark(prefix + timingId + ",StartTM");
                    try {
                        var result = timingTarget.apply(this, arguments);
                        if (Promise.is(result)) {
                            logStopAfterPromise = function () {
                                WinJS.Utilities._writeProfilerMark(prefix + timingId + ",StopTM");
                            }
                            result.then(logStopAfterPromise, logStopAfterPromise);
                        }
                    } finally {
                        if (!logStopAfterPromise) {
                            WinJS.Utilities._writeProfilerMark(prefix + timingId + ",StopTM");
                        }
                    }
                    return result;
                };
            }
            if (this.entry || this.exit) {
                var entryExitTarget = v;
                var logEntry = this.entry;
                var logExit = this.exit;
                v = function logEnterOrExit() {
                    var message = fullName +  argProcessor(arguments);
                    logEntry && log(message + (logExit ? ", Entry" : ""));
                    var result = entryExitTarget.apply(this, arguments);
                    logExit && log(message + (logEntry ? ", Exit" : ""));
                    return result;
                };
            }
            if (entryTracker) {
                var entryTrackerTarget = v;
                v = function logEntryTracker() {
                    entryTracker(arguments);
                    return entryTrackerTarget.apply(this, arguments);
                }
            }
            if (resultProcessor) {
                var resultTarget = v;
                v = function logProcessResult() {
                    var result = resultTarget.apply(this, arguments);
                    result = resultProcessor(result, this);
                    return result;
                };
            }
            if (resultLogger) {
                var resultLoggerTarget = v;
                v = function logResult() {
                    var result = resultLoggerTarget.apply(this, arguments);
                    log(fullName + resultLogger(result, this));
                    return result;
                }
            }
            this.object[name] = v;
        }

    }

    // ListBinding / Handle ref-counting table

    var bindings = [];

    function logRetain(handleTracking, listBindingId, args) {
        logCheckForListBindingUseAfterRelease(listBindingId);
        var slot = args[0];
        var handle = slot.handle;
        if (handleTracking) {
            var binding = bindings[listBindingId];
            ASSERT(binding.live, "Retaining item after ListBinding has already been released", binding);
            var handleEntry = binding.handleTable[handle];
            if (handleEntry) {
                ASSERT(handleEntry.refCount > 0 || handleEntry.releaseCount > 0, "Handle must be live if it already exists", handleEntry);
                handleEntry.retainStacks.push(logGetStack());
                handleEntry.refCount++;
            } else {
                binding.handleTable[handle] = {
                    retainStacks: [logGetStack()],
                    releaseStacks: [],
                    // The number of times the refCount has reached 0
                    releaseCount: 0,
                    refCount: 1,
                };
                binding.outstandingHandleCount++;
            }
        }
    }
    function logRelease(handleTracking, listBindingId, args) {
        logCheckForListBindingUseAfterRelease(listBindingId);
        var handle = args[0];
        if (handleTracking) {
            var binding = bindings[listBindingId];
            ASSERT(binding.live, "Releasing item after ListBinding has already been released", binding);
            var handleEntry = binding.handleTable[handle];
            ASSERT(handleEntry, "Missing handle entry for handle: " + handle, handleEntry);
            handleEntry.releaseStacks.push(logGetStack());
            handleEntry.refCount--;
            ASSERT(handleEntry.refCount >= 0, "Extra release called for handle: " + handle, handleEntry);
            if (handleEntry.refCount === 0) {
                binding.outstandingHandleCount--;
                handleEntry.releaseCount++;
            }
        }
    }
    function logCreateListBinding(handleTracking, listBindingId) {
        bindings[listBindingId] = {
            id: listBindingId,
            creationStack: logGetStack(),
            outstandingHandleCount: 0,
            handleTable: {},
            live: true
        };
    }
    function logReleaseListBinding(handleTracking, listBindingId) {
        var binding = bindings[listBindingId];
        ASSERT(!!binding, "Binding was used after the bindings list had been reset, did you call VDSLogging.off() before your scenario was done?");
        ASSERT(binding.live, "ListBinding may only be released once!", binding);
        binding.releaseStack = logGetStack();
        binding.releasing = true;
    }
    function logPostReleaseListBinding(handleTracking, listBindingId) {
        var binding = bindings[listBindingId];
        ASSERT(!!binding, "Binding was used after the bindings list had been reset, did you call VDSLogging.off() before your scenario was done?");
        ASSERT(binding.live, "ListBinding may only be released once!", binding);
        ASSERT(binding.releasing, "ListBinding must still be in the process of releasing!", binding);
        ASSERT(binding.outstandingHandleCount === 0, "ListBinding must have no outstanding handles when released", binding);
        binding.releasing = false;
        binding.live = false;
    }
    function logCheckForListBindingUseAfterRelease(listBindingId) {
        var binding = bindings[listBindingId];
        ASSERT(!!binding, "Binding was used after the bindings list had been reset, did you call VDSLogging.off() before your scenario was done?");
        ASSERT(binding.live, "ListBinding methods may not be used after the binding has been released!", binding);
    }

    //
    // Logging for VDS, default logging is ref-counting retain/release
    //

    var defaultOptions = {
        include: /createListBinding|_retainItem|_releaseItem|release/,
        handleTracking: true,
        logVDS: true,
        stackTraceLimit: 0 // Make > 0 to capture stacks of <depth>. Can be SLOW.
    };

    var listBindingIds = 0;
    var dataAdapterIds = 0;

    // arg processors
    function slotFirstHandleProperty(args) {
        return handle(args[0].handle);
    }

    function description(d) {
        return "description: '" + d + "'";
    }
    function count(c) {
        return "count: " + c;
    }
    function index(i) {
        return "index: " + i;
    }
    function key(k) {
        return "key: '" + k + "'";
    }
    function handle(h) {
        return "handle: '" + h + "'";
    }
    function itemPromise(ip) {
        return "{ " + handle(ip.handle) + (typeof ip.index === "number" ? (", " + index(ip.index)) : "") + ", then: (value) }";
    }
    function item(i) {
        return "{ " + handle(i.handle) + ", " + key(i.key) + (typeof i.index === "number" ? ", " + index(i.index) : "") + ", data: " + JSON.stringify(i.data) + " }";
    }
    function handleOrItem(h) {
        return typeof h === "string" ? handle(h) : item(h);
    }

    function sig(...f) {
        var s = function (def, v) { return typeof def === "function" ? def(v) : def; }
        switch (f.length) {
            case 0:
                return function () { return ""; };
            case 1:
                return function (args) { return s(f[0], args[0]); };
            case 2:
                return function (args) { return s(f[0], args[0]) + ", " + s(f[1], args[1]); };
            case 3:
                return function (args) { return s(f[0], args[0]) + ", " + s(f[1], args[1]) + ", " + s(f[2], args[2]); };
            case 4:
                return function (args) { return s(f[0], args[0]) + ", " + s(f[1], args[1]) + ", " + s(f[2], args[2]) + ", " + s(f[3], args[3]); }
            case 5:
                return function (args) { return s(f[0], args[0]) + ", " + s(f[1], args[1]) + ", " + s(f[2], args[2]) + ", " + s(f[3], args[3]) + ", " + s(f[4], args[4]); }
            default:
                return function (args) {
                    var results = [];
                    for (var i = 0, len = args.length; i < len; i++) {
                        results.push(s(args[i], arguments[i]));
                    }
                    return results.join(", ");
                };
        }
    }

    // This is a entryTracker and therefore gets a list of args, the first of which is the ListDataNotificationHandler, the
    //  first arg is bound to the dataAdapterId.
    // This is the handler given to the ListDataAdapter;
    function wrapListDataNotificationHandler(dataAdapterId, args) {
        var options = currentOptions();
        if (options.logNotifications && args[0]) {
            var logger = new Logger("VDS::ListDataAdapater(" + dataAdapterId + ")_Notifications", options, args[0]);

            logger.wrap("invalidateAll", sig());
            logger.wrap("reload", sig());

            logger.wrap("beginNotifications", sig());
            logger.wrap("inserted", sig(item, key, key, index, "(prev, next)"));
            logger.wrap("changed", sig(item));
            logger.wrap("moved", sig(item, key, key, index, index, "(prev, next, old, new)"));
            logger.wrap("removed", sig(key, index));
            logger.wrap("endNotifications", sig());
        }
    }

    // This is a entryTracker and therefore gets a list of args, the first of which is the ListDataAdapter
    function wrapDataAdapter(args) {
        var options = currentOptions();
        if (options.logAdapter) {
            var dataAdapterId = (++dataAdapterIds);
            var logger = new Logger("VDS::ListDataAdapter(" + dataAdapterId + ")", options, args[0]);

            logger.wrap("setNotificationHandler",
                null,
                null,
                wrapListDataNotificationHandler.bind(null, dataAdapterId)
            );
            logger.wrap("getCount");
            logger.wrap("itemsFromStart", sig(count));
            logger.wrap("itemsFromEnd", sig(count));
            logger.wrap("itemsFromKey", sig(key, count, count, "(before, after)"));
            logger.wrap("itemsFromIndex", sig(index, count, count, "(before, after)"));
            logger.wrap("itemsFromDescription", sig(description, count, count, "(before, after)"));

            logger.wrap("insertAtStart", sig(key));
            logger.wrap("insertBefore", sig(key));
            logger.wrap("insertAfter", sig(key));
            logger.wrap("insertAtEnd", sig(key));
            logger.wrap("change", sig(key));
            logger.wrap("moveToStart", sig(key));
            logger.wrap("moveBefore", sig(key, key, "(key, next)"));
            logger.wrap("moveAfter", sig(key, key, "(key, prev)"));
            logger.wrap("moveToEnd", sig(key));
            logger.wrap("remove", sig(key));
        }
    }

    // This is a entryTracker and therefore gets a list of args, the first of which is the ListNotificationHandler
    // This is the handler given to the ListBinding, it's not clear how to associate it with a list binding
    function wrapListNotificationHandler(args) {
        var options = currentOptions();
        if (options.logNotifications && args[0]) {
            var logger = new Logger("VDS::ListBinding_Notifications", options, args[0]);

            logger.wrap("beginNotifications", sig());
            logger.wrap("inserted", sig(itemPromise, handle, handle, "(prev, next)"));
            logger.wrap("changed", sig(item, item, "(new, old)"));
            logger.wrap("moved", sig(itemPromise, handle, handle, "(prev, next)"));
            logger.wrap("removed", sig(handle));
            logger.wrap("indexChanged", sig(handle, index, index, "(new, old)"));
            logger.wrap("countChanged", sig(count, count, "(new, old)"));
            logger.wrap("endNotifications", sig());

            logger.wrap("reload", sig());
        }
    }

    // This is a result processor and therefore must return its result
    function wrapListBinding(listBinding) {
        var options = currentOptions();
        var listBindingId = (++listBindingIds);
        var logger = new Logger("VDS::ListBinding(" + listBindingId + ")", options, listBinding);

        logCreateListBinding(logger.handleTracking, listBindingId);

        logger.wrap("_retainItem",
            slotFirstHandleProperty,
            null,
            logRetain.bind(null, logger.handleTracking, listBindingId)
        );
        logger.wrap("_releaseItem",
            sig(handleOrItem),
            null,
            logRelease.bind(null, logger.handleTracking, listBindingId)
        );

        var useAfterRelease = logCheckForListBindingUseAfterRelease.bind(null, listBindingId);
        logger.wrap("jumpToItem", sig(item), null, useAfterRelease);
        logger.wrap("current", null, null, useAfterRelease);
        logger.wrap("previous", null, null, useAfterRelease);
        logger.wrap("next", null, null, useAfterRelease);
        logger.wrap("first", null, null, useAfterRelease);
        logger.wrap("last", null, null, useAfterRelease);
        // captured by _releaseItem
        //result.releaseItem;
        logger.wrap("release", null, null, logReleaseListBinding.bind(null, logger.handleTracking, listBindingId));
        logger.wrap("fromKey", sig(key), null, useAfterRelease);
        logger.wrap("fromIndex", sig(index), null, useAfterRelease);
        logger.wrap("fromDescription", sig(description), null, useAfterRelease);

        return listBinding;
    }

    // This is a result processor and therefore must return its result
    function wrapVirtualizedDataSource(result, vds) {
        var options = currentOptions();
        if (options.logVDS) {
            var logger = new Logger("VDS", options, vds);

            logger.wrap("createListBinding",
                null,
                wrapListBinding,
                wrapListNotificationHandler
            );

            logger.wrap("invalidateAll");
            logger.wrap("getCount");
            logger.wrap("itemFromKey", sig(key));
            logger.wrap("itemFromIndex", sig(index));
            logger.wrap("itemFromDescription", sig(description));

            logger.wrap("beginEdits");
            logger.wrap("insertAtStart", sig(key));
            logger.wrap("insertBefore", sig(key));
            logger.wrap("insertAfter", sig(key));
            logger.wrap("insertAtEnd", sig(key));
            logger.wrap("change", sig(key));
            logger.wrap("moveToStart", sig(key));
            logger.wrap("moveBefore", sig(key));
            logger.wrap("moveAfter", sig(key));
            logger.wrap("moveToEnd", sig(key));
            logger.wrap("remove", sig(key))
            logger.wrap("endEdits");
        }

        // now do the wrapping
        return result;
    };

    function currentOptions():IOptions {
        return VDSLogging.options || defaultOptions;
    }

    // We have to start somewhere, in this case we start at the _baseDataSourceConstructor member
    var _baseDataSourceConstructor = WinJS.UI.VirtualizedDataSource.prototype['_baseDataSourceConstructor'];

    export interface IOptions {
        entry?: boolean;
        exit?: boolean;
        timing?: boolean;
        log?: (msg) => void;
        handleTracking: boolean;
        include: RegExp;
        logVDS: boolean;
        logAdapter?: boolean;
        logNotifications?: boolean;
        stackTraceLimit: number;
    }
    // Options are:
    //
    //  entry: <boolean>            whether to log upon entry to the functions
    //  exit: <boolean>             whether to log upon exit from the functions
    //  timing: <boolean>           whether to log WinJS.Utilities._writeProfilerMark StartTM/StopTM pairs for the functions
    //  log: <function>             log function to be written to, default is console.log
    //  handleTracking: <boolean>   whether to track item handle ref-counts, requires include to be a superset of /createListBinding|_retainItem|_releaseItem|release/
    //  include: <regex>            functions to apply the above options to, applied against function name
    //  logVDS: <boolean>           whether to log methods on the VirtualizedDataSource
    //  logAdapter: <boolean>       whether to log methods on the ListDataAdapter which is passed to the VDS
    //  logNotifications: <boolean> whether to log notifications from the VDS or Data Adapter
    //  stackTraceLimit: <number>   maximum stack frames to capture in logging which captures stacks (handle table)
    //
    // For instance, here is the options object which just does handle-tracking (which happens to be the default):
    //
    //  VDSLogging.options = {
    //      entry: true,
    //      log: function () { },
    //      include: /createListBinding|_retainItem|_releaseItem|release/,
    //      handleTracking: true,
    //      logVDS: true,
    //      stackTraceLimit: 100
    //  };
    //
    // Or here is the options object which just does logging of calls to the ListDataAdapter's itemsFrom* methods with timing:
    //
    //  VDSLogging.options = {
    //      timing: true,
    //      logAdapter: true,
    //      include: /itemsFrom.*/
    //  };
    //
    // Or here is the version which shows all the entry calls for everything it knows how to log:
    //
    //  VDSLogging.options = {
    //      entry: true,
    //      log: console.log.bind(console),
    //      logVDS: true,
    //      logNotifications: true,
    //      logAdapter: true,
    //      stackTraceLimit: 0,
    //      include: /.*/
    //  };
    //
    export var options: IOptions;

    export function on() {
        if (WinJS.UI.VirtualizedDataSource.prototype['_baseDataSourceConstructor'] === _baseDataSourceConstructor) {
            var options = VDSLogging.options || defaultOptions;
            var l = new Logger("VDS", {}, WinJS.UI.VirtualizedDataSource.prototype);
            l.wrap(
                "_baseDataSourceConstructor",
                null,
                wrapVirtualizedDataSource,
                wrapDataAdapter
                );
        }
        }

    export function off() {
        bindings = [];
        WinJS.UI.VirtualizedDataSource.prototype['_baseDataSourceConstructor'] = _baseDataSourceConstructor;
    }

}