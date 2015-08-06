// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'exports',
    './Core/_Global',
    './Core/_WinRT',
    './Core/_Base',
    './Core/_Events',
    './Core/_Log',
    './Core/_WriteProfilerMark',
    './Application/_State',
    './Navigation',
    './Promise',
    './_Signal',
    './Scheduler',
    './Utilities/_ElementUtilities'
], function applicationInit(exports, _Global, _WinRT, _Base, _Events, _Log, _WriteProfilerMark, _State, Navigation, Promise, _Signal, Scheduler, _ElementUtilities) {
    "use strict";

    _Global.Debug && (_Global.Debug.setNonUserCodeExceptions = true);

    var checkpointET = "checkpoint",
        unloadET = "unload",
        activatedET = "activated",
        loadedET = "loaded",
        readyET = "ready",
        errorET = "error",
        settingsET = "settings",
        backClickET = "backclick",
        beforeRequestingFocusOnKeyboardInputET = "beforerequestingfocusonkeyboardinput",
        requestingFocusOnKeyboardInputET = "requestingfocusonkeyboardinput",
        edgyStartingET = "edgystarting",
        edgyCompletedET = "edgycompleted",
        edgyCanceledET = "edgycanceled";

    var outstandingPromiseErrors;
    var eventQueue = [];
    var eventQueueJob = null;
    var eventQueuedSignal = null;
    var running = false;
    var registered = false;

    var ListenerType = _Base.Class.mix(_Base.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), _Events.eventMixin);
    var listeners = new ListenerType();
    var createEvent = _Events._createEventProperty;
    var pendingDeferrals = {};
    var pendingDeferralID = 0;
    var TypeToSearch = {
        _registered: false,

        updateRegistration: function Application_TypeToSearch_updateRegistration() {
            var ls = listeners._listeners && listeners._listeners[requestingFocusOnKeyboardInputET] || [];
            if (!TypeToSearch._registered && ls.length > 0) {
                TypeToSearch._updateKeydownCaptureListeners(_Global.top, true /*add*/);
                TypeToSearch._registered = true;
            }
            if (TypeToSearch._registered && ls.length === 0) {
                TypeToSearch._updateKeydownCaptureListeners(_Global.top, false /*add*/);
                TypeToSearch._registered = false;
            }
        },

        _keydownCaptureHandler: function Application_TypeToSearch_keydownCaptureHandler(event) {
            if (TypeToSearch._registered && TypeToSearch._shouldKeyTriggerTypeToSearch(event)) {
                requestingFocusOnKeyboardInput();
            }
        },

        _frameLoadCaptureHandler: function Application_TypeToSearch_frameLoadCaptureHandler(event) {
            if (TypeToSearch._registered) {
                TypeToSearch._updateKeydownCaptureListeners(event.target.contentWindow, true /*add*/);
            }
        },

        _updateKeydownCaptureListeners: function Application_TypeToSearch_updateKeydownCaptureListeners(win, add) {
            if (!win) {
                // This occurs when this handler gets called from an IFrame event that is no longer in the DOM
                // and therefore does not have a valid contentWindow object.
                return;
            }

            // Register for child frame keydown events in order to support FocusOnKeyboardInput
            // when focus is in a child frame.  Also register for child frame load events so
            // it still works after frame navigations.
            // Note: This won't catch iframes added programmatically later, but that can be worked
            // around by toggling FocusOnKeyboardInput off/on after the new iframe is added.
            try {
                if (add) {
                    win.document.addEventListener('keydown', TypeToSearch._keydownCaptureHandler, true);
                } else {
                    win.document.removeEventListener('keydown', TypeToSearch._keydownCaptureHandler, true);
                }
            } catch (e) { // if the IFrame crosses domains, we'll get a permission denied error
            }

            if (win.frames) {
                for (var i = 0, l = win.frames.length; i < l; i++) {
                    var childWin = win.frames[i];
                    TypeToSearch._updateKeydownCaptureListeners(childWin, add);

                    try {
                        if (add) {
                            if (childWin.frameElement) {
                                childWin.frameElement.addEventListener('load', TypeToSearch._frameLoadCaptureHandler, true);
                            }
                        } else {
                            if (childWin.frameElement) {
                                childWin.frameElement.removeEventListener('load', TypeToSearch._frameLoadCaptureHandler, true);
                            }
                        }
                    } catch (e) { // if the IFrame crosses domains, we'll get a permission denied error
                    }
                }
            }
        },

        _shouldKeyTriggerTypeToSearch: function Application_TypeToSearch_shouldKeyTriggerTypeToSearch(event) {
            var shouldTrigger = false;
            // First, check if a metaKey is pressed (only applies to MacOS). If so, do nothing here.
            if (!event.metaKey) {
                // We also don't handle CTRL/ALT combinations, unless ALTGR is also set. Since there is no shortcut for checking AltGR,
                // we need to use getModifierState, however, Safari currently doesn't support this.
                if ((!event.ctrlKey && !event.altKey) || (event.getModifierState && event.getModifierState("AltGraph"))) {
                    // Show on most keys for visible characters like letters, numbers, etc.
                    switch (event.keyCode) {
                        case 0x30:  //0x30 0 key
                        case 0x31:  //0x31 1 key
                        case 0x32:  //0x32 2 key
                        case 0x33:  //0x33 3 key
                        case 0x34:  //0x34 4 key
                        case 0x35:  //0x35 5 key
                        case 0x36:  //0x36 6 key
                        case 0x37:  //0x37 7 key
                        case 0x38:  //0x38 8 key
                        case 0x39:  //0x39 9 key

                        case 0x41:  //0x41 A key
                        case 0x42:  //0x42 B key
                        case 0x43:  //0x43 C key
                        case 0x44:  //0x44 D key
                        case 0x45:  //0x45 E key
                        case 0x46:  //0x46 F key
                        case 0x47:  //0x47 G key
                        case 0x48:  //0x48 H key
                        case 0x49:  //0x49 I key
                        case 0x4A:  //0x4A J key
                        case 0x4B:  //0x4B K key
                        case 0x4C:  //0x4C L key
                        case 0x4D:  //0x4D M key
                        case 0x4E:  //0x4E N key
                        case 0x4F:  //0x4F O key
                        case 0x50:  //0x50 P key
                        case 0x51:  //0x51 Q key
                        case 0x52:  //0x52 R key
                        case 0x53:  //0x53 S key
                        case 0x54:  //0x54 T key
                        case 0x55:  //0x55 U key
                        case 0x56:  //0x56 V key
                        case 0x57:  //0x57 W key
                        case 0x58:  //0x58 X key
                        case 0x59:  //0x59 Y key
                        case 0x5A:  //0x5A Z key

                        case 0x60:  // VK_NUMPAD0,             //0x60 Numeric keypad 0 key
                        case 0x61:  // VK_NUMPAD1,             //0x61 Numeric keypad 1 key
                        case 0x62:  // VK_NUMPAD2,             //0x62 Numeric keypad 2 key
                        case 0x63:  // VK_NUMPAD3,             //0x63 Numeric keypad 3 key
                        case 0x64:  // VK_NUMPAD4,             //0x64 Numeric keypad 4 key
                        case 0x65:  // VK_NUMPAD5,             //0x65 Numeric keypad 5 key
                        case 0x66:  // VK_NUMPAD6,             //0x66 Numeric keypad 6 key
                        case 0x67:  // VK_NUMPAD7,             //0x67 Numeric keypad 7 key
                        case 0x68:  // VK_NUMPAD8,             //0x68 Numeric keypad 8 key
                        case 0x69:  // VK_NUMPAD9,             //0x69 Numeric keypad 9 key
                        case 0x6A:  // VK_MULTIPLY,            //0x6A Multiply key
                        case 0x6B:  // VK_ADD,                 //0x6B Add key
                        case 0x6C:  // VK_SEPARATOR,           //0x6C Separator key
                        case 0x6D:  // VK_SUBTRACT,            //0x6D Subtract key
                        case 0x6E:  // VK_DECIMAL,             //0x6E Decimal key
                        case 0x6F:  // VK_DIVIDE,              //0x6F Divide key

                        case 0xBA:  // VK_OEM_1,               //0xBA Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ';:' key
                        case 0xBB:  // VK_OEM_PLUS,            //0xBB For any country/region, the '+' key
                        case 0xBC:  // VK_OEM_COMMA,           //0xBC For any country/region, the ',' key
                        case 0xBD:  // VK_OEM_MINUS,           //0xBD For any country/region, the '-' key
                        case 0xBE:  // VK_OEM_PERIOD,          //0xBE For any country/region, the '.' key
                        case 0xBF:  // VK_OEM_2,               //0xBF Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '/?' key
                        case 0xC0:  // VK_OEM_3,               //0xC0 Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '`~' key

                        case 0xDB:  // VK_OEM_4,               //0xDB Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '[{' key
                        case 0xDC:  // VK_OEM_5,               //0xDC Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '\|' key
                        case 0xDD:  // VK_OEM_6,               //0xDD Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ']}' key
                        case 0xDE:  // VK_OEM_7,               //0xDE Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the 'single-quote/double-quote' key
                        case 0xDF:  // VK_OEM_8,               //0xDF Used for miscellaneous characters; it can vary by keyboard.

                        case 0xE2:  // VK_OEM_102,             //0xE2 Either the angle bracket key or the backslash key on the RT 102-key keyboard

                        case 0xE5:  // VK_PROCESSKEY,          //0xE5 IME PROCESS key

                        case 0xE7:  // VK_PACKET,              //0xE7 Used to pass Unicode characters as if they were keystrokes. The VK_PACKET key is the low word of a 32-bit Virtual Key value used for non-keyboard input methods. For more information, see Remark in KEYBDINPUT, SendInput, WM_KEYDOWN, and WM_KEYUP
                            shouldTrigger = true;
                            break;
                    }
                }
            }
            return shouldTrigger;
        }
    };

    function safeSerialize(obj) {
        var str;
        try {
            var seenObjects = [];
            str = JSON.stringify(obj, function (key, value) {
                if (value === _Global) {
                    return "[window]";
                } else if (value instanceof _Global.HTMLElement) {
                    return "[HTMLElement]";
                } else if (typeof value === "function") {
                    return "[function]";
                } else if (typeof value === "object") {
                    if (value === null) {
                        return value;
                    } else if (seenObjects.indexOf(value) === -1) {
                        seenObjects.push(value);
                        return value;
                    } else {
                        return "[circular]";
                    }
                } else {
                    return value;
                }

            });
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

    function fatalErrorHandler(e) {
        _Log.log && _Log.log(safeSerialize(e), "winjs", "error");

        if (_Global.document && exports._terminateApp) {
            var data = e.detail;
            var number = data && (data.number || (data.exception && (data.exception.number || data.exception.code)) || (data.error && data.error.number) || data.errorCode || 0);
            var terminateData = {
                description: safeSerialize(data),
                // note: because of how we listen to events, we rarely get a stack
                stack: data && (data.stack || (data.exception && (data.exception.stack || data.exception.message)) || (data.error && data.error.stack) || null),
                errorNumber: number,
                number: number
            };
            exports._terminateApp(terminateData, e);
        }
    }

    function defaultTerminateAppHandler(data, e) {
        /*jshint unused: false*/
        // This is the unhandled exception handler in WinJS. This handler is invoked whenever a promise
        // has an exception occur that is not handled (via an error handler passed to then() or a call to done()).
        //
        // To see the original exception stack, look at data.stack.
        // For more information on debugging and exception handling go to http://go.microsoft.com/fwlink/p/?LinkId=253583.

        debugger; // jshint ignore:line
        if (_Global.MSApp) {
            _Global.MSApp.terminateApp(data);
        }
    }

    var terminateAppHandler = defaultTerminateAppHandler;

    function captureDeferral(obj) {
        var id = "def" + (pendingDeferralID++);
        return { deferral: pendingDeferrals[id] = obj.getDeferral(), id: id };
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
        _WriteProfilerMark("WinJS.Application:Event_" + eventRecord.type + ",StartTM");

        var waitForPromise = Promise.as();
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
        eventRecord._stoppedImmediatePropagation = false;
        eventRecord.stopImmediatePropagation = function () {
            eventRecord._stoppedImmediatePropagation = true;
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
                    for (var i = 0, len = l.length; i < len && !eventRecord._stoppedImmediatePropagation; i++) {
                        handled = l[i].listener(eventRecord) || handled;
                    }
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
            if (eventRecord.type === errorET) {
                fatalErrorHandler(eventRecord);
            } else {
                queueEvent({ type: errorET, detail: err });
            }
        }


        function cleanup(r) {
            _WriteProfilerMark("WinJS.Application:Event_" + eventRecord.type + ",StopTM");

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
            return Promise.wrapError(r);
        });
    }

    function createEventQueuedSignal() {
        if (!eventQueuedSignal) {
            eventQueuedSignal = new _Signal();
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
        _WriteProfilerMark("WinJS.Application:Event_" + eventRecord.type + " queued,Info");
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
                _State._oncheckpoint(e, exports);
            }
        ],
        error: [
            function Application_errorHandler(e, handled) {
                if (handled) {
                    return;
                }
                fatalErrorHandler(e);
            }
        ],
        backclick: [
            function Application_backClickHandler(e, handled) {
                if (handled) {
                    e._winRTBackPressedEvent.handled = true;
                } else if (Navigation.canGoBack) {
                    Navigation.back();
                    e._winRTBackPressedEvent.handled = true;
                }
            }
        ],
        beforerequestingfocusonkeyboardinput: [
            function Application_beforeRequestingFocusOnKeyboardInputHandler(e, handled) {
                if (!handled) {
                    dispatchEvent({ type: requestingFocusOnKeyboardInputET });
                }
            }
        ]
    };

    // loaded == DOMContentLoaded
    // activated == after WinRT Activated
    // ready == after all of the above
    //
    function activatedHandler(e) {
        var def = captureDeferral(e.activatedOperation);
        _State._loadState(e).then(function () {
            queueEvent({ type: activatedET, detail: e, _deferral: def.deferral, _deferralID: def.id });
        });
    }
    function suspendingHandler(e) {
        var def = captureDeferral(e.suspendingOperation);
        queueEvent({ type: checkpointET, _deferral: def.deferral, _deferralID: def.id });
    }
    function domContentLoadedHandler() {
        queueEvent({ type: loadedET });
        if (!(_Global.document && _WinRT.Windows.UI.WebUI.WebUIApplication)) {
            var activatedArgs = {
                arguments: "",
                kind: "Windows.Launch",
                previousExecutionState: 0 //_WinRT.Windows.ApplicationModel.Activation.ApplicationExecutionState.NotRunning
            };
            _State._loadState(activatedArgs).then(function () {
                queueEvent({ type: activatedET, detail: activatedArgs });
            });
        }
    }
    function beforeUnloadHandler() {
        cleanupAllPendingDeferrals();
        queueEvent({ type: unloadET });
    }
    function errorHandler(e) {
        var flattenedError = {};
        for (var key in e) {
            flattenedError[key] = e[key];
        }
        var data;
        var handled = true;
        var prev = exports._terminateApp;
        try {
            exports._terminateApp = function (d, e) {
                handled = false;
                data = d;
                if (prev !== defaultTerminateAppHandler) {
                    prev(d, e);
                }
            };
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
            exports._terminateApp = prev;
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

        // Work around browsers that don't serialize exceptions
        if (details.exception instanceof Error) {
            var error = {
                stack: details.exception.stack,
                message: details.exception.message
            };
            details.exception = error;
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
    if (_Global.document) {
        _Global.document.addEventListener("DOMContentLoaded", domContentLoadedHandler, false);
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

    function requestingFocusOnKeyboardInput() {
        // Built in listener for beforeRequestingFocusOnKeyboardInputET will trigger
        // requestingFocusOnKeyboardInputET if it wasn't handled.
        dispatchEvent({ type: beforeRequestingFocusOnKeyboardInputET });
    }

    function edgyStarting(eventObject) {
        dispatchEvent({ type: edgyStartingET, kind: eventObject.kind });
    }

    function edgyCompleted(eventObject) {
        dispatchEvent({ type: edgyCompletedET, kind: eventObject.kind });
    }

    function edgyCanceled(eventObject) {
        dispatchEvent({ type: edgyCanceledET, kind: eventObject.kind });
    }

    function register() {
        if (!registered) {
            registered = true;
            _Global.addEventListener("beforeunload", beforeUnloadHandler, false);

            // None of these are enabled in web worker
            if (_Global.document) {
                _Global.addEventListener("error", errorHandler, false);
                if (_WinRT.Windows.UI.WebUI.WebUIApplication) {

                    var wui = _WinRT.Windows.UI.WebUI.WebUIApplication;
                    wui.addEventListener("activated", activatedHandler, false);
                    wui.addEventListener("suspending", suspendingHandler, false);
                }

                if (_WinRT.Windows.UI.ApplicationSettings.SettingsPane) {
                    var settingsPane = _WinRT.Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView();
                    settingsPane.addEventListener("commandsrequested", commandsRequested);
                }

                // This integrates WinJS.Application into the hardware or OS-provided back button.
                if (_WinRT.Windows.UI.Core.SystemNavigationManager) {
                    // On Win10 this accomodates hardware buttons (phone), 
                    // the taskbar's tablet mode button, and the optional window frame back button.
                    var navManager = _WinRT.Windows.UI.Core.SystemNavigationManager.getForCurrentView();
                    navManager.addEventListener("backrequested", hardwareButtonBackPressed);
                } else if (_WinRT.Windows.Phone.UI.Input.HardwareButtons) {
                    // For WP 8.1
                    _WinRT.Windows.Phone.UI.Input.HardwareButtons.addEventListener("backpressed", hardwareButtonBackPressed);
                }

                if (_WinRT.Windows.UI.Input.EdgeGesture) {
                    var edgy = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                    edgy.addEventListener("starting", edgyStarting);
                    edgy.addEventListener("completed", edgyCompleted);
                    edgy.addEventListener("canceled", edgyCanceled);
                }
            }

            Promise.addEventListener("error", promiseErrorHandler);
        }
    }
    function unregister() {
        if (registered) {
            registered = false;
            _Global.removeEventListener("beforeunload", beforeUnloadHandler, false);

            // None of these are enabled in web worker
            if (_Global.document) {
                if (_WinRT.Windows.UI.WebUI.WebUIApplication) {
                    _Global.removeEventListener("error", errorHandler, false);

                    var wui = _WinRT.Windows.UI.WebUI.WebUIApplication;
                    wui.removeEventListener("activated", activatedHandler, false);
                    wui.removeEventListener("suspending", suspendingHandler, false);
                }

                if (_WinRT.Windows.UI.ApplicationSettings.SettingsPane) {
                    var settingsPane = _WinRT.Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView();
                    settingsPane.removeEventListener("commandsrequested", commandsRequested);
                }

                if (_WinRT.Windows.UI.Core.SystemNavigationManager) {
                    var navManager = _WinRT.Windows.UI.Core.SystemNavigationManager.getForCurrentView();
                    navManager.removeEventListener("backrequested", hardwareButtonBackPressed);
                } else if (_WinRT.Windows.Phone.UI.Input.HardwareButtons) {
                    _WinRT.Windows.Phone.UI.Input.HardwareButtons.removeEventListener("backpressed", hardwareButtonBackPressed);
                }

                if (_WinRT.Windows.UI.Input.EdgeGesture) {
                    var edgy = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                    edgy.removeEventListener("starting", edgyStarting);
                    edgy.removeEventListener("completed", edgyCompleted);
                    edgy.removeEventListener("canceled", edgyCanceled);
                }
            }

            Promise.removeEventListener("error", promiseErrorHandler);
        }
    }

    var publicNS = _Base.Namespace._moduleDefine(exports, "WinJS.Application", {
        stop: function Application_stop() {
            /// <signature helpKeyword="WinJS.Application.stop">
            /// <summary locid="WinJS.Application.stop">
            /// Stops application event processing and resets WinJS.Application
            /// to its initial state.
            /// </summary>
            /// </signature>

            // Need to clear out the event properties explicitly to clear their backing
            //  state.
            //
            publicNS.onactivated = null;
            publicNS.oncheckpoint = null;
            publicNS.onerror = null;
            publicNS.onloaded = null;
            publicNS.onready = null;
            publicNS.onsettings = null;
            publicNS.onunload = null;
            publicNS.onbackclick = null;
            listeners = new ListenerType();
            _State.sessionState = {};
            running = false;
            copyAndClearQueue();
            eventQueueJob && eventQueueJob.cancel();
            eventQueueJob = null;
            eventQueuedSignal = null;
            unregister();
            TypeToSearch.updateRegistration();
            cleanupAllPendingDeferrals();
        },

        addEventListener: function Application_addEventListener(eventType, listener, capture) {
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
            if (eventType === requestingFocusOnKeyboardInputET) {
                TypeToSearch.updateRegistration();
            }
        },
        removeEventListener: function Application_removeEventListener(eventType, listener, capture) {
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
            if (eventType === requestingFocusOnKeyboardInputET) {
                TypeToSearch.updateRegistration();
            }
        },

        checkpoint: function Application_checkpoint() {
            /// <signature helpKeyword="WinJS.Application.checkpoint">
            /// <summary locid="WinJS.Application.checkpoint">
            /// Queues a checkpoint event.
            /// </summary>
            /// </signature>
            queueEvent({ type: checkpointET });
        },

        start: function Application_start() {
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

        // Like queueEvent but fires the event synchronously. Useful in tests.
        _dispatchEvent: dispatchEvent,

        _terminateApp: {
            get: function Application_terminateApp_get() {
                return terminateAppHandler;
            },
            set: function Application_terminateApp_set(value) {
                terminateAppHandler = value;
            }
        },

        _applicationListener: _Base.Namespace._lazy(function () {
            // Use _lazy because publicNS can't be referenced in its own definition
            return new _ElementUtilities._GenericListener("Application", publicNS);
        }),

        /// <field type="Function" locid="WinJS.Application.oncheckpoint" helpKeyword="WinJS.Application.oncheckpoint">
        /// Occurs when receiving Process Lifetime Management (PLM) notification or when the checkpoint function is called.
        /// </field>
        oncheckpoint: createEvent(checkpointET),
        /// <field type="Function" locid="WinJS.Application.onunload" helpKeyword="WinJS.Application.onunload">
        /// Occurs when the application is about to be unloaded.
        /// </field>
        onunload: createEvent(unloadET),
        /// <field type="Function" locid="WinJS.Application.onactivated" helpKeyword="WinJS.Application.onactivated">
        /// Occurs when Windows Runtime activation has occurred.
        /// The name of this event is "activated" (and also "mainwindowactivated".)
        /// This event occurs after the loaded event and before the ready event.
        /// </field>
        onactivated: createEvent(activatedET),
        /// <field type="Function" locid="WinJS.Application.onloaded" helpKeyword="WinJS.Application.onloaded">
        /// Occurs after the DOMContentLoaded event, which fires after the page has been parsed but before all the resources are loaded.
        /// This event occurs before the activated event and the ready event.
        /// </field>
        onloaded: createEvent(loadedET),
        /// <field type="Function" locid="WinJS.Application.onready" helpKeyword="WinJS.Application.onready">
        /// Occurs when the application is ready. This event occurs after the onloaded event and the onactivated event.
        /// </field>
        onready: createEvent(readyET),
        /// <field type="Function" locid="WinJS.Application.onsettings" helpKeyword="WinJS.Application.onsettings">
        /// Occurs when the settings charm is invoked.
        /// </field>
        onsettings: createEvent(settingsET),
        /// <field type="Function" locid="WinJS.Application.onerror" helpKeyword="WinJS.Application.onerror">
        /// Occurs when an unhandled error has been raised.
        /// </field>
        onerror: createEvent(errorET),
        /// <field type="Function" locid="WinJS.Application.onbackclick" helpKeyword="WinJS.Application.onbackclick">
        /// Raised when the users clicks the backbutton on a Windows Phone.
        /// </field>
        onbackclick: createEvent(backClickET)


    });
});