// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function applicationInit(global, WinJS) {
    "use strict";

    global.Debug && (global.Debug.setNonUserCodeExceptions = true);

    var Scheduler = WinJS.Utilities.Scheduler;

    var checkpointET = "checkpoint",
        unloadET = "unload",
        activatedET = "activated",
        loadedET = "loaded",
        readyET = "ready",
        errorET = "error",
        settingsET = "settings",
        backClickET = "backclick";

    var outstandingPromiseErrors;
    var eventQueue = [];
    var eventQueueJob = null;
    var eventQueuedSignal = null;
    var running = false;
    var registered = false;
    // check for WinRT & document, which means we will disabled application WinRT stuff in web worker context
    //
    var useWinRT = WinJS.Utilities.hasWinRT && global.document;

    var ListenerType = WinJS.Class.mix(WinJS.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), WinJS.Utilities.eventMixin);
    var listeners = new ListenerType();
    var pendingDeferrals = {};
    var pendingDeferralID = 0;

    function safeSerialize(obj) {
        var str;
        try {
            str = JSON.stringify(obj);
        }
        catch (err) {
            // primitives, undefined, null, etc, all get serialized fine. In the
            // case that stringify fails (typically due to circular graphs) we 
            // just show "[object]". While we may be able to tighten the condition
            // for the exception, we never way this serialize to fail.
            // 
            // Note: we make this be a JSON string, so that consumers of the log
            // can always call JSON.parse.
            str = JSON.stringify("[object]");
        }
        return str;
    }

    var terminateAppHandler = function (data, e) {
        debugger;
        // This is the unhandled exception handler in WinJS. This handler is invoked whenever a promise
        // has an exception occur that is not handled (via an error handler passed to then() or a call to done()).
        //
        // To see the original exception stack, look at data.stack.
        // For more information on debugging and exception handling go to http://go.microsoft.com/fwlink/p/?LinkId=253583.
        MSApp.terminateApp(data);
    };

    function captureDeferral(obj) {
        var id = "def" + (pendingDeferralID++);
        return { deferral: pendingDeferrals[id] = obj.getDeferral(), id: id }
    }
    function completeDeferral(deferral, deferralID) {
        // If we have a deferralID we our table to find the
        // deferral. Since we remove it on completion, this
        // ensures that we never double notify a deferral
        // in the case of a user call "Application.stop" in 
        // the middle of processing an event
        //
        if (deferralID) {
            deferral = pendingDeferrals[deferralID];
            delete pendingDeferrals[deferralID];
        }
        if (deferral) {
            deferral.complete();
        }
    }
    function cleanupAllPendingDeferrals() {
        if (pendingDeferrals) {
            Object.keys(pendingDeferrals).forEach(function (k) {
                pendingDeferrals[k].complete();
            });
            pendingDeferrals = {};
        }
    }

    function dispatchEvent(eventRecord) {
        WinJS.Utilities._writeProfilerMark("WinJS.Application:Event_" + eventRecord.type + ",StartTM");

        var waitForPromise = WinJS.Promise.as();
        eventRecord.setPromise = function (promise) {
            /// <signature helpKeyword="WinJS.Application.eventRecord.setPromise">
            /// <summary locid="WinJS.Application.event.setPromise">
            /// Used to inform the application object that asynchronous work is being performed, and that this
            /// event handler should not be considered complete until the promise completes. 
            /// </summary>
            /// <param name="promise" type="WinJS.Promise" locid="WinJS.Application.eventRecord.setPromise_p:promise">
            /// The promise to wait for.
            /// </param>
            /// </signature>
            waitForPromise = waitForPromise.then(function () { return promise; });
        };
        eventRecord.detail = eventRecord.detail || {};
        if (typeof (eventRecord.detail) === "object") {
            eventRecord.detail.setPromise = eventRecord.setPromise;
        }

        try {
            if (listeners._listeners) {
                var handled = false;
                l = listeners._listeners[eventRecord.type];
                if (l) {
                    l.forEach(function dispatchOne(e) {
                        handled = e.listener(eventRecord) || handled;
                    });
                }
            }

            // Fire built in listeners last, for checkpoint this is important
            // as it lets our built in serialization see any mutations to
            // app.sessionState
            //
            var l = builtInListeners[eventRecord.type];
            if (l) {
                l.forEach(function dispatchOne(e) { e(eventRecord, handled); });
            }
        }
        catch (err) {
            queueEvent({ type: errorET, detail: err });
        }


        function cleanup(r) {
            WinJS.Utilities._writeProfilerMark("WinJS.Application:Event_" + eventRecord.type + ",StopTM");

            if (eventRecord._deferral) {
                completeDeferral(eventRecord._deferral, eventRecord._deferralID);
            }
            return r;
        }

        return waitForPromise.then(cleanup, function (r) {
            r = cleanup(r);
            if (r && r.name === "Canceled") {
                return;
            }
            return WinJS.Promise.wrapError(r);
        });
    }

    function createEventQueuedSignal() {
        if (!eventQueuedSignal) {
            eventQueuedSignal = new WinJS._Signal();
            eventQueuedSignal.promise.done(function () {
                eventQueuedSignal = null;
            }, function () {
                eventQueuedSignal = null;
            });
        }
        return eventQueuedSignal;
    }

    function drainOneEvent(queue) {
        function drainError(err) {
            queueEvent({ type: errorET, detail: err });
        }

        if (queue.length === 0) {
            return createEventQueuedSignal().promise;
        } else {
            return dispatchEvent(queue.shift()).then(null, drainError);
        }
    }

    // Drains the event queue via the scheduler
    //
    function drainQueue(jobInfo) {
        function drainNext() {
            return drainQueue;
        }

        var queue = jobInfo.job._queue;

        if (queue.length === 0 && eventQueue.length > 0) {
            queue = jobInfo.job._queue = copyAndClearQueue();
        }

        jobInfo.setPromise(drainOneEvent(queue).then(drainNext, drainNext));
    }

    function startEventQueue() {
        function markSync() {
            sync = true;
        }

        var queue = [];
        var sync = true;
        var promise;

        // Drain the queue as long as there are events and they complete synchronously
        //
        while (sync) {
            if (queue.length === 0 && eventQueue.length > 0) {
                queue = copyAndClearQueue();
            }

            sync = false;
            promise = drainOneEvent(queue);
            promise.done(markSync, markSync);
        }

        // Schedule a job which will be responsible for draining events for the
        //  lifetime of the application.
        //
        eventQueueJob = Scheduler.schedule(function Application_pumpEventQueue(jobInfo) {
            function drainNext() {
                return drainQueue;
            }
            jobInfo.setPromise(promise.then(drainNext, drainNext));
        }, Scheduler.Priority.high, null, "WinJS.Application._pumpEventQueue");
        eventQueueJob._queue = queue;
    }

    function queueEvent(eventRecord) {
        /// <signature helpKeyword="WinJS.Application.queueEvent">
        /// <summary locid="WinJS.Application.queueEvent">
        /// Queues an event to be processed by the WinJS.Application event queue.
        /// </summary>
        /// <param name="eventRecord" type="Object" locid="WinJS.Application.queueEvent_p:eventRecord">
        /// The event object is expected to have a type property that is
        /// used as the event name when dispatching on the WinJS.Application
        /// event queue. The entire object is provided to event listeners
        /// in the detail property of the event.
        /// </param>
        /// </signature>
        WinJS.Utilities._writeProfilerMark("WinJS.Application:Event_" + eventRecord.type + " queued,Info");
        eventQueue.push(eventRecord);
        if (running && eventQueuedSignal) {
            eventQueuedSignal.complete(drainQueue);
        }
    }

    function copyAndClearQueue() {
        var queue = eventQueue;
        eventQueue = [];
        return queue;
    }

    var builtInListeners = {
        activated: [
            function Application_activatedHandler() {
                queueEvent({ type: readyET });
            }
        ],
        checkpoint: [
            function Application_checkpointHandler(e) {
                // comes from state.js
                WinJS.Application._oncheckpoint(e);
            }
        ],
        error: [
            function Application_errorHandler(e, handled) {
                if (handled) {
                    return;
                }

                WinJS.log && WinJS.log(safeSerialize(e), "winjs", "error");

                if (useWinRT && WinJS.Application._terminateApp) {
                    var data = e.detail;
                    var number = data && (data.number || (data.exception && (data.exception.number || data.exception.code)) || (data.error && data.error.number) || data.errorCode || 0);
                    var terminateData = {
                        description: safeSerialize(data),
                        // note: because of how we listen to events, we rarely get a stack
                        stack: data && (data.stack || (data.exception && (data.exception.stack || data.exception.message)) || (data.error && data.error.stack) || null),
                        errorNumber: number,
                        number: number
                    };
                    WinJS.Application._terminateApp(terminateData, e);
                }
            }
        ],
        backclick: [
            function Application_backClickHandler(e, handled) {
                if (handled) {
                    e._winRTBackPressedEvent.handled = true;
                } else if (WinJS.Navigation.canGoBack) {
                    WinJS.Navigation.back();
                    e._winRTBackPressedEvent.handled = true;
                }
            }
        ],
    };

    // loaded == DOMContentLoaded
    // activated == after WinRT Activated
    // ready == after all of the above
    //
    function activatedHandler(e) {
        var def = captureDeferral(e.activatedOperation);
        WinJS.Application._loadState(e).then(function () {
            queueEvent({ type: activatedET, detail: e, _deferral: def.deferral, _deferralID: def.id });
        });
    }
    function suspendingHandler(e) {
        var def = captureDeferral(e.suspendingOperation);
        WinJS.Application.queueEvent({ type: checkpointET, _deferral: def.deferral, _deferralID: def.id });
    }
    function domContentLoadedHandler(e) {
        queueEvent({ type: loadedET });
        if (!useWinRT) {
            var activatedArgs = {
                arguments: "",
                kind: "Windows.Launch",
                previousExecutionState: 0 //Windows.ApplicationModel.Activation.ApplicationExecutionState.NotRunning
            };
            WinJS.Application._loadState(activatedArgs).then(function () {
                queueEvent({ type: activatedET, detail: activatedArgs });
            });
        }
    }
    function beforeUnloadHandler(e) {
        cleanupAllPendingDeferrals();
        queueEvent({ type: unloadET });
    }
    function errorHandler(e) {
        var flattenedError = {};
        for (var k in e) {
            flattenedError[k] = e[k];
        }
        var data;
        var handled = true;
        var prev = WinJS.Application._terminateApp;
        try {
            WinJS.Application._terminateApp = function (d, e) {
                handled = false;
                data = d;
                if (prev !== terminateAppHandler) {
                    prev(d, e);
                }
            }
            dispatchEvent({
                type: errorET,
                detail: {
                    error: flattenedError,
                    errorLine: e.lineno,
                    errorCharacter: e.colno,
                    errorUrl: e.filename,
                    errorMessage: e.message
                }
            });
        } finally {
            WinJS.Application._terminateApp = prev;
        }
        return handled;
    }
    function promiseErrorHandler(e) {
        //
        // e.detail looks like: { exception, error, promise, handler, id, parent }
        //
        var details = e.detail;
        var id = details.id;

        // If the error has a parent promise then this is not the origination of the
        //  error so we check if it has a handler, and if so we mark that the error
        //  was handled by removing it from outstandingPromiseErrors
        //
        if (details.parent) {
            if (details.handler && outstandingPromiseErrors) {
                delete outstandingPromiseErrors[id];
            }
            return;
        }

        // If this is the first promise error to occur in this period we need to schedule
        //  a helper to come along after a setImmediate that propagates any remaining
        //  errors to the application's queue.
        //
        var shouldScheduleErrors = !outstandingPromiseErrors;

        // Indicate that this error was orignated and needs to be handled
        //
        outstandingPromiseErrors = outstandingPromiseErrors || [];
        outstandingPromiseErrors[id] = details;

        if (shouldScheduleErrors) {
            Scheduler.schedule(function Application_async_promiseErrorHandler() {
                var errors = outstandingPromiseErrors;
                outstandingPromiseErrors = null;
                errors.forEach(function (error) {
                    queueEvent({ type: errorET, detail: error });
                });
            }, Scheduler.Priority.high, null, "WinJS.Application._queuePromiseErrors");
        }
    }

    // capture this early
    //
    if (global.document) {
        document.addEventListener("DOMContentLoaded", domContentLoadedHandler, false);
    }

    function commandsRequested(e) {
        var event = { e: e, applicationcommands: undefined };
        listeners.dispatchEvent(settingsET, event);
    }

    function hardwareButtonBackPressed(winRTBackPressedEvent) {
        // Fire WinJS.Application 'backclick' event. If the winRTBackPressedEvent is not handled, the app will get suspended.            
        var eventRecord = { type: backClickET };
        Object.defineProperty(eventRecord, "_winRTBackPressedEvent", {
            value: winRTBackPressedEvent,
            enumerable: false
        });
        dispatchEvent(eventRecord);
    }

    function register() {
        if (!registered) {
            registered = true;
            global.addEventListener("beforeunload", beforeUnloadHandler, false);

            if (useWinRT) {
                global.addEventListener("error", errorHandler, false);

                var wui = Windows.UI.WebUI.WebUIApplication;
                wui.addEventListener("activated", activatedHandler, false);
                wui.addEventListener("suspending", suspendingHandler, false);

                if ((<any>window).Windows && Windows.UI && Windows.UI.ApplicationSettings && Windows.UI.ApplicationSettings.SettingsPane && Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView) {
                    var settingsPane = Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView();
                    settingsPane.addEventListener("commandsrequested", commandsRequested);
                }

                // Code in WinJS.Application for phone. This integrates WinJS.Application into the hardware back button.
                if ((<any>window).Windows && Windows.Phone && Windows.Phone.UI.Input.HardwareButtons) {
                    Windows.Phone.UI.Input.HardwareButtons.addEventListener("backpressed", hardwareButtonBackPressed);
                }
            }

            WinJS.Promise.addEventListener("error", promiseErrorHandler);
        }
    }
    function unregister() {
        if (registered) {
            registered = false;
            global.removeEventListener("beforeunload", beforeUnloadHandler, false);

            if (useWinRT) {
                global.removeEventListener("error", errorHandler, false);

                var wui = Windows.UI.WebUI.WebUIApplication;
                wui.removeEventListener("activated", activatedHandler, false);
                wui.removeEventListener("suspending", suspendingHandler, false);

                if ((<any>window).Windows && Windows.UI && Windows.UI.ApplicationSettings && Windows.UI.ApplicationSettings.SettingsPane && Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView) {
                    var settingsPane = Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView();
                    settingsPane.removeEventListener("commandsrequested", commandsRequested);
                }

                // Code in WinJS.Application for phone. This integrates WinJS.Application into the hardware back button.
                if ((<any>window).Windows && Windows.Phone && Windows.Phone.UI.Input.HardwareButtons) {
                    Windows.Phone.UI.Input.HardwareButtons.removeEventListener("backpressed", hardwareButtonBackPressed);
                }
            }

            WinJS.Promise.removeEventListener("error", promiseErrorHandler);
        }
    }

    WinJS.Namespace.define("WinJS.Application", {
        stop: function () {
            /// <signature helpKeyword="WinJS.Application.stop">
            /// <summary locid="WinJS.Application.stop">
            /// Stops application event processing and resets WinJS.Application
            /// to its initial state.
            /// </summary>
            /// </signature>

            // Need to clear out the event properties explicitly to clear their backing
            //  state.
            //
            this.onactivated = null;
            this.oncheckpoint = null;
            this.onerror = null;
            this.onloaded = null;
            this.onready = null;
            this.onsettings = null;
            this.onunload = null;
            listeners = new ListenerType();
            WinJS.Application.sessionState = {};
            running = false;
            copyAndClearQueue();
            eventQueueJob && eventQueueJob.cancel();
            eventQueueJob = null;
            eventQueuedSignal = null;
            unregister();
            cleanupAllPendingDeferrals();
        },

        addEventListener: function (eventType, listener, capture) {
            /// <signature helpKeyword="WinJS.Application.addEventListener">
            /// <summary locid="WinJS.Application.addEventListener">
            /// Adds an event listener to the control.
            /// </summary>
            /// <param name="eventType" locid="WinJS.Application.addEventListener_p:eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Application.addEventListener_p:listener">
            /// The listener to invoke when the event is raised.
            /// </param>
            /// <param name="capture" locid="WinJS.Application.addEventListener_p:capture">
            /// true to initiate capture; otherwise, false.
            /// </param>
            /// </signature>
            listeners.addEventListener(eventType, listener, capture);
        },
        removeEventListener: function (eventType, listener, capture) {
            /// <signature helpKeyword="WinJS.Application.removeEventListener">
            /// <summary locid="WinJS.Application.removeEventListener">
            /// Removes an event listener from the control.
            /// </summary>
            /// <param name="eventType" locid="WinJS.Application.removeEventListener_p:eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Application.removeEventListener_p:listener">
            /// The listener to remove.
            /// </param>
            /// <param name="capture" locid="WinJS.Application.removeEventListener_p:capture">
            /// Specifies whether or not to initiate capture.
            /// </param>
            /// </signature>
            listeners.removeEventListener(eventType, listener, capture);
        },

        checkpoint: function () {
            /// <signature helpKeyword="WinJS.Application.checkpoint">
            /// <summary locid="WinJS.Application.checkpoint">
            /// Queues a checkpoint event.
            /// </summary>
            /// </signature>
            queueEvent({ type: checkpointET });
        },

        start: function () {
            /// <signature helpKeyword="WinJS.Application.start">
            /// <summary locid="WinJS.Application.start">
            /// Starts processing events in the WinJS.Application event queue.
            /// </summary>
            /// </signature>
            register();
            running = true;
            startEventQueue();
        },

        queueEvent: queueEvent,

        _terminateApp: terminateAppHandler,

    });

    Object.defineProperties(WinJS.Application, WinJS.Utilities.createEventProperties(checkpointET, unloadET, activatedET, loadedET, readyET, settingsET, errorET, backClickET));
})(this, WinJS);
