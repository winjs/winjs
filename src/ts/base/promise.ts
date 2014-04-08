// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    export interface IPromise<T> {
        done(complete?: (result: T) => any, error?: (error) => any, progress?: (progress: any) => any);
        then<U>(complete: (result: T) => IPromise<U>, error?: (error: any) => IPromise<U>, progress?: (progress: any) => void): IPromise<U>;
        then<U>(complete: (result: T) => IPromise<U>, error?: (error: any) => U, progress?: (progress: any) => void): IPromise<U>;
        then<U>(complete: (result: T) => IPromise<U>, error?: (error: any) => void, progress?: (progress: any) => void): IPromise<U>;
        then<U>(complete: (result: T) => U, error?: (error: any) => IPromise<U>, progress?: (progress: any) => void): IPromise<U>;
        then<U>(complete: (result: T) => U, error?: (error: any) => U, progress?: (progress: any) => void): IPromise<U>;
        then<U>(complete: (result: T) => U, error?: (error: any) => void, progress?: (progress: any) => void): IPromise<U>;
        cancel();
    }

    var global:any = self;
    global.Debug && (global.Debug.setNonUserCodeExceptions = true);

    var ListenerType = WinJS.Class.mix(WinJS.Class.define(null, { /*empty*/ }, { supportedForProcessing: false }), WinJS.Utilities.eventMixin);
    var promiseEventListeners = new ListenerType();
    // make sure there is a listeners collection so that we can do a more trivial check below
    promiseEventListeners._listeners = {};
    var errorET = "error";
    var canceledName = "Canceled";
    var tagWithStack:any = false;
    var tag = {
        promise: 0x01,
        thenPromise: 0x02,
        errorPromise: 0x04,
        exceptionPromise: 0x08,
        completePromise: 0x10,
        all: 0x0
    };
    tag.all = tag.promise | tag.thenPromise | tag.errorPromise | tag.exceptionPromise | tag.completePromise;

    //
    // Global error counter, for each error which enters the system we increment this once and then
    // the error number travels with the error as it traverses the tree of potential handlers.
    //
    // When someone has registered to be told about errors (WinJS.Promise.callonerror) promises
    // which are in error will get tagged with a ._errorId field. This tagged field is the
    // contract by which nested promises with errors will be identified as chaining for the
    // purposes of the callonerror semantics. If a nested promise in error is encountered without
    // a ._errorId it will be assumed to be foreign and treated as an interop boundary and
    // a new error id will be minted.
    //
    var error_number = 1;

    //
    // The state machine has a interesting hiccup in it with regards to notification, in order
    // to flatten out notification and avoid recursion for synchronous completion we have an
    // explicit set of *_notify states which are responsible for notifying their entire tree
    // of children. They can do this because they know that immediate children are always
    // ThenPromise instances and we can therefore reach into their state to access the
    // _listeners collection.
    //
    // So, what happens is that a Promise will be fulfilled through the _completed or _error
    // messages at which point it will enter a *_notify state and be responsible for to move
    // its children into an (as appropriate) success or error state and also notify that child's
    // listeners of the state transition, until leaf notes are reached.
    //

    interface IState {
        name: string;
        enter(promise:_PromiseStateMachine<any>):void;
        cancel(promise:_PromiseStateMachine<any>):void;
        done(promise, onComplete, onError, onProgress):void;
        then(promise, onComplete, onError, onProgress):void;
        _completed(promise, value):void;
        _error(promise, value, onerrorDetails, context):void;
        _notify(promise, queue):void;
        _progress(promise, value):void;
        _setCompleteValue(promise, value):void;
        _setErrorValue(promise, value, onerrorDetails, context):void;
    };

    var state_created : IState,              // -> working
        state_working : IState,              // -> error | error_notify | success | success_notify | canceled | waiting
        state_waiting : IState,              // -> error | error_notify | success | success_notify | waiting_canceled
        state_waiting_canceled : IState,     // -> error | error_notify | success | success_notify | canceling
        state_canceled : IState,             // -> error | error_notify | success | success_notify | canceling
        state_canceling : IState,            // -> error_notify
        state_success_notify : IState,       // -> success
        state_success : IState,              // -> .
        state_error_notify : IState,         // -> error
        state_error : IState;                // -> .

    // Noop function, used in the various states to indicate that they don't support a given
    // message. Named with the somewhat cute name '_' because it reads really well in the states.

    function _() { }

    // Initial state
    //
    state_created = {
        name: "created",
        enter: function (promise) {
            promise._setState(state_working);
        },
        cancel: _,
        done: _,
        then: _,
        _completed: _,
        _error: _,
        _notify: _,
        _progress: _,
        _setCompleteValue: _,
        _setErrorValue: _
    };

    // Ready state, waiting for a message (completed/error/progress), able to be canceled
    //
    state_working = {
        name: "working",
        enter: _,
        cancel: function (promise) {
            promise._setState(state_canceled);
        },
        done: done,
        then: then,
        _completed: completed,
        _error: error,
        _notify: _,
        _progress: progress,
        _setCompleteValue: setCompleteValue,
        _setErrorValue: setErrorValue
    };

    // Waiting state, if a promise is completed with a value which is itself a promise
    // (has a then() method) it signs up to be informed when that child promise is
    // fulfilled at which point it will be fulfilled with that value.
    //
    state_waiting = {
        name: "waiting",
        enter: function (promise) {
            var waitedUpon = promise._value;
            // We can special case our own intermediate promises which are not in a 
            //  terminal state by just pushing this promise as a listener without 
            //  having to create new indirection functions
            if (waitedUpon instanceof ThenPromise &&
                waitedUpon._state !== state_error &&
                waitedUpon._state !== state_success) {
                pushListener(waitedUpon, { promise: promise });
            } else {
                var error:any = function (value) {
                    if (waitedUpon._errorId) {
                        promise._chainedError(value, waitedUpon);
                    } else {
                        // Because this is an interop boundary we want to indicate that this 
                        //  error has been handled by the promise infrastructure before we
                        //  begin a new handling chain.
                        //
                        callonerror(promise, value, detailsForHandledError, waitedUpon, error);
                        promise._error(value);
                    }
                };
                error.handlesOnError = true;
                waitedUpon.then(
                    promise._completed.bind(promise),
                    error,
                    promise._progress.bind(promise)
                );
            }
        },
        cancel: function (promise) {
            promise._setState(state_waiting_canceled);
        },
        done: done,
        then: then,
        _completed: completed,
        _error: error,
        _notify: _,
        _progress: progress,
        _setCompleteValue: setCompleteValue,
        _setErrorValue: setErrorValue
    };

    // Waiting canceled state, when a promise has been in a waiting state and receives a
    // request to cancel its pending work it will forward that request to the child promise
    // and then waits to be informed of the result. This promise moves itself into the
    // canceling state but understands that the child promise may instead push it to a
    // different state.
    //
    state_waiting_canceled = {
        name: "waiting_canceled",
        enter: function (promise) {
            // Initiate a transition to canceling. Triggering a cancel on the promise
            // that we are waiting upon may result in a different state transition
            // before the state machine pump runs again.
            promise._setState(state_canceling);
            var waitedUpon = promise._value;
            if (waitedUpon.cancel) {
                waitedUpon.cancel();
            }
        },
        cancel: _,
        done: done,
        then: then,
        _completed: completed,
        _error: error,
        _notify: _,
        _progress: progress,
        _setCompleteValue: setCompleteValue,
        _setErrorValue: setErrorValue
    };

    // Canceled state, moves to the canceling state and then tells the promise to do
    // whatever it might need to do on cancelation.
    //
    state_canceled = {
        name: "canceled",
        enter: function (promise) {
            // Initiate a transition to canceling. The _cancelAction may change the state
            // before the state machine pump runs again.
            promise._setState(state_canceling);
            promise._cancelAction();
        },
        cancel: _,
        done: done,
        then: then,
        _completed: completed,
        _error: error,
        _notify: _,
        _progress: progress,
        _setCompleteValue: setCompleteValue,
        _setErrorValue: setErrorValue
    };

    // Canceling state, commits to the promise moving to an error state with an error
    // object whose 'name' and 'message' properties contain the string "Canceled"
    //
    state_canceling = {
        name: "canceling",
        enter: function (promise) {
            var error = new Error(canceledName);
            error.name = error.message;
            promise._value = error;
            promise._setState(state_error_notify);
        },
        cancel: _,
        done: _,
        then: _,
        _completed: _,
        _error: _,
        _notify: _,
        _progress: _,
        _setCompleteValue: _,
        _setErrorValue: _
    };

    // Success notify state, moves a promise to the success state and notifies all children
    //
    state_success_notify = {
        name: "complete_notify",
        enter: function (promise) {
            promise.done = CompletePromise.prototype.done;
            promise.then = CompletePromise.prototype.then;
            if (promise._listeners) {
                var queue = [promise];
                var p;
                while (queue.length) {
                    p = queue.shift();
                    p._state._notify(p, queue);
                }
            }
            promise._setState(state_success);
        },
        cancel: _,
        done: null, /*error to get here */
        then: null, /*error to get here */
        _completed: _,
        _error: _,
        _notify: notifySuccess,
        _progress: _,
        _setCompleteValue: _,
        _setErrorValue: _
    };

    // Success state, moves a promise to the success state and does NOT notify any children.
    // Some upstream promise is owning the notification pass.
    //
    state_success = {
        name: "success",
        enter: function (promise) {
            promise.done = CompletePromise.prototype.done;
            promise.then = CompletePromise.prototype.then;
            promise._cleanupAction();
        },
        cancel: _,
        done: null, /*error to get here */
        then: null, /*error to get here */
        _completed: _,
        _error: _,
        _notify: notifySuccess,
        _progress: _,
        _setCompleteValue: _,
        _setErrorValue: _
    };

    // Error notify state, moves a promise to the error state and notifies all children
    //
    state_error_notify = {
        name: "error_notify",
        enter: function (promise) {
            promise.done = ErrorPromise.prototype.done;
            promise.then = ErrorPromise.prototype.then;
            if (promise._listeners) {
                var queue = [promise];
                var p;
                while (queue.length) {
                    p = queue.shift();
                    p._state._notify(p, queue);
                }
            }
            promise._setState(state_error);
        },
        cancel: _,
        done: null, /*error to get here*/
        then: null, /*error to get here*/
        _completed: _,
        _error: _,
        _notify: notifyError,
        _progress: _,
        _setCompleteValue: _,
        _setErrorValue: _
    };

    // Error state, moves a promise to the error state and does NOT notify any children.
    // Some upstream promise is owning the notification pass.
    //
    state_error = {
        name: "error",
        enter: function (promise) {
            promise.done = ErrorPromise.prototype.done;
            promise.then = ErrorPromise.prototype.then;
            promise._cleanupAction();
        },
        cancel: _,
        done: null, /*error to get here*/
        then: null, /*error to get here*/
        _completed: _,
        _error: _,
        _notify: notifyError,
        _progress: _,
        _setCompleteValue: _,
        _setErrorValue: _
    };

    //
    // The statemachine implementation follows a very particular pattern, the states are specified
    // as static stateless bags of functions which are then indirected through the state machine
    // instance (a Promise). As such all of the functions on each state have the promise instance
    // passed to them explicitly as a parameter and the Promise instance members do a little
    // dance where they indirect through the state and insert themselves in the argument list.
    //
    // We could instead call directly through the promise states however then every caller
    // would have to remember to do things like pumping the state machine to catch state transitions.
    //

    export class _PromiseStateMachine<T> implements IPromise<T> {

        static supportedForProcessing = false;

        public _listeners = null;
        public _nextState = null;
        public _state = null;
        public _value = null;
        public _stack = null;

        constructor() {
            if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.thenPromise))) {
                this._stack = WinJS.Promise._getStack();
            }
        }

        public cancel() {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.cancel">
            /// <summary locid="WinJS.PromiseStateMachine.cancel">
            /// Attempts to cancel the fulfillment of a promised value. If the promise hasn't
            /// already been fulfilled and cancellation is supported, the promise enters
            /// the error state with a value of Error("Canceled").
            /// </summary>
            /// </signature>
            this._state.cancel(this);
            this._run();
        }

        public done(onComplete?: (result: T) => any, onError?: (error) => any, onProgress?: (prog: any) => any) {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.done">
            /// <summary locid="WinJS.PromiseStateMachine.done">
            /// Allows you to specify the work to be done on the fulfillment of the promised value,
            /// the error handling to be performed if the promise fails to fulfill
            /// a value, and the handling of progress notifications along the way.
            ///
            /// After the handlers have finished executing, this function throws any error that would have been returned
            /// from then() as a promise in the error state.
            /// </summary>
            /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.done_p:onComplete">
            /// The function to be called if the promise is fulfilled successfully with a value.
            /// The fulfilled value is passed as the single argument. If the value is null,
            /// the fulfilled value is returned. The value returned
            /// from the function becomes the fulfilled value of the promise returned by
            /// then(). If an exception is thrown while executing the function, the promise returned
            /// by then() moves into the error state.
            /// </param>
            /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onError">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument. If it is null, the error is forwarded.
            /// The value returned from the function is the fulfilled value of the promise returned by then().
            /// </param>
            /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onProgress">
            /// the function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// </signature>
            this._state.done(this, onComplete, onError, onProgress);
        }

        public then<U>(complete: (result: T) => IPromise<U>, error?: (error: any) => IPromise<U>): IPromise<U>;
        public then<U>(complete: (result: T) => IPromise<U>, error?: (error: any) => U): IPromise<U>;
        public then<U>(complete: (result: T) => IPromise<U>, error?: (error: any) => void): IPromise<U>;
        public then<U>(complete: (result: T) => U, error?: (error: any) => IPromise<U>): IPromise<U>;
        public then<U>(complete: (result: T) => U, error?: (error: any) => U): IPromise<U>;
        public then<U>(complete: (result: T) => U, error?: (error: any) => void): IPromise<U>;
        public then<U>(onComplete?, onError?, onProgress?): IPromise<U> {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.then">
            /// <summary locid="WinJS.PromiseStateMachine.then">
            /// Allows you to specify the work to be done on the fulfillment of the promised value,
            /// the error handling to be performed if the promise fails to fulfill
            /// a value, and the handling of progress notifications along the way.
            /// </summary>
            /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.then_p:onComplete">
            /// The function to be called if the promise is fulfilled successfully with a value.
            /// The value is passed as the single argument. If the value is null, the value is returned.
            /// The value returned from the function becomes the fulfilled value of the promise returned by
            /// then(). If an exception is thrown while this function is being executed, the promise returned
            /// by then() moves into the error state.
            /// </param>
            /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onError">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument. If it is null, the error is forwarded.
            /// The value returned from the function becomes the fulfilled value of the promise returned by then().
            /// </param>
            /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onProgress">
            /// The function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.PromiseStateMachine.then_returnValue">
            /// The promise whose value is the result of executing the complete or
            /// error function.
            /// </returns>
            /// </signature>
            
            return this._state.then(this, onComplete, onError, onProgress);
        }

        public _chainedError(value, context) {
            var result = this._state._error(this, value, detailsForChainedError, context);
            this._run();
            return result;
        }

        public _completed(value) {
            var result = this._state._completed(this, value);
            this._run();
            return result;
        }

        public _error(value) {
            var result = this._state._error(this, value, detailsForError);
            this._run();
            return result;
        }

        public _progress(value) {
            this._state._progress(this, value);
        }

        public _setState(state) {
            this._nextState = state;
        }

        public _setCompleteValue(value) {
            this._state._setCompleteValue(this, value);
            this._run();
        }

        public _setChainedErrorValue(value, context) {
            var result = this._state._setErrorValue(this, value, detailsForChainedError, context);
            this._run();
            return result;
        }
        
        public _setExceptionValue(value) {
            var result = this._state._setErrorValue(this, value, detailsForException);
            this._run();
            return result;
        }
        
        public _run() {
            while (this._nextState) {
                this._state = this._nextState;
                this._nextState = null;
                this._state.enter(this);
            }
        }

        public _cancelAction() { 
            /* override in child class */
        }

        public _cleanupAction() { 
            /* override in child class */
        }
    }

    //
    // Implementations of shared state machine code.
    //

    function completed(promise, value) {
        var targetState;
        if (value && typeof value === "object" && typeof value.then === "function") {
            targetState = state_waiting;
        } else {
            targetState = state_success_notify;
        }
        promise._value = value;
        promise._setState(targetState);
    }
    function createErrorDetails(exception, error, promise, id, parent = undefined, handler?) {
        return {
            exception: exception,
            error: error,
            promise: promise,
            handler: handler,
            id: id,
            parent: parent
        };
    }
    function detailsForHandledError(promise, errorValue, context, handler) {
        var exception = context._isException;
        var errorId = context._errorId;
        return createErrorDetails(
            exception ? errorValue : null,
            exception ? null : errorValue,
            promise,
            errorId,
            context,
            handler
        );
    }
    function detailsForChainedError(promise, errorValue, context) {
        var exception = context._isException;
        var errorId = context._errorId;
        setErrorInfo(promise, errorId, exception);
        return createErrorDetails(
            exception ? errorValue : null,
            exception ? null : errorValue,
            promise,
            errorId,
            context
        );
    }
    function detailsForError(promise, errorValue) {
        var errorId = ++error_number;
        setErrorInfo(promise, errorId);
        return createErrorDetails(
            null,
            errorValue,
            promise,
            errorId
        );
    }
    function detailsForException(promise, exceptionValue) {
        var errorId = ++error_number;
        setErrorInfo(promise, errorId, true);
        return createErrorDetails(
            exceptionValue,
            null,
            promise,
            errorId
        );
    }
    function done(promise, onComplete, onError, onProgress) {
        var asyncOpID = WinJS.Utilities._traceAsyncOperationStarting("WinJS.Promise.done");
        pushListener(promise, { c: onComplete, e: onError, p: onProgress, asyncOpID: asyncOpID });
    }
    function error(promise, value, onerrorDetails, context) {
        promise._value = value;
        callonerror(promise, value, onerrorDetails, context);
        promise._setState(state_error_notify);
    }
    function notifySuccess(promise, queue) {
        var value = promise._value;
        var listeners = promise._listeners;
        if (!listeners) {
            return;
        }
        promise._listeners = null;
        var i, len;
        for (i = 0, len = Array.isArray(listeners) ? listeners.length : 1; i < len; i++) {
            var listener = len === 1 ? listeners : listeners[i];
            var onComplete = listener.c;
            var target = listener.promise;

            WinJS.Utilities._traceAsyncOperationCompleted(listener.asyncOpID, global.Debug && Debug.MS_ASYNC_OP_STATUS_SUCCESS);

            if (target) {
                WinJS.Utilities._traceAsyncCallbackStarting(listener.asyncOpID);
                try {
                    target._setCompleteValue(onComplete ? onComplete(value) : value);
                } catch (ex) {
                    target._setExceptionValue(ex);
                } finally {
                    WinJS.Utilities._traceAsyncCallbackCompleted();
                }
                if (target._state !== state_waiting && target._listeners) {
                    queue.push(target);
                }
            } else {
                CompletePromise.prototype.done.call(promise, onComplete);
            }
        }
    }
    function notifyError(promise, queue) {
        var value = promise._value;
        var listeners = promise._listeners;
        if (!listeners) {
            return;
        }
        promise._listeners = null;
        var i, len;
        for (i = 0, len = Array.isArray(listeners) ? listeners.length : 1; i < len; i++) {
            var listener = len === 1 ? listeners : listeners[i];
            var onError = listener.e;
            var target = listener.promise;

            var errorID = global.Debug && (value && value.name === canceledName ? Debug.MS_ASYNC_OP_STATUS_CANCELED : Debug.MS_ASYNC_OP_STATUS_ERROR);
            WinJS.Utilities._traceAsyncOperationCompleted(listener.asyncOpID, errorID);

            if (target) {
                var asyncCallbackStarted = false;
                try {
                    if (onError) {
                        WinJS.Utilities._traceAsyncCallbackStarting(listener.asyncOpID);
                        asyncCallbackStarted = true;
                        if (!onError.handlesOnError) {
                            callonerror(target, value, detailsForHandledError, promise, onError);
                        }
                        target._setCompleteValue(onError(value))
                    } else {
                        target._setChainedErrorValue(value, promise);
                    }
                } catch (ex) {
                    target._setExceptionValue(ex);
                } finally {
                    if (asyncCallbackStarted) {
                        WinJS.Utilities._traceAsyncCallbackCompleted();
                    }
                }
                if (target._state !== state_waiting && target._listeners) {
                    queue.push(target);
                }
            } else {
                ErrorPromise.prototype.done.call(promise, null, onError);
            }
        }
    }
    function callonerror(promise, value, onerrorDetailsGenerator, context?, handler?) {
        if (promiseEventListeners._listeners[errorET]) {
            if (value instanceof Error && value.message === canceledName) {
                return;
            }
            promiseEventListeners.dispatchEvent(errorET, onerrorDetailsGenerator(promise, value, context, handler));
        }
    }
    function progress(promise, value) {
        var listeners = promise._listeners;
        if (listeners) {
            var i, len;
            for (i = 0, len = Array.isArray(listeners) ? listeners.length : 1; i < len; i++) {
                var listener = len === 1 ? listeners : listeners[i];
                var onProgress = listener.p;
                if (onProgress) {
                    try { onProgress(value); } catch (ex) { }
                }
                if (!(listener.c || listener.e) && listener.promise) {
                    listener.promise._progress(value);
                }
            }
        }
    }
    function pushListener(promise, listener) {
        var listeners = promise._listeners;
        if (listeners) {
            // We may have either a single listener (which will never be wrapped in an array)
            // or 2+ listeners (which will be wrapped). Since we are now adding one more listener
            // we may have to wrap the single listener before adding the second.
            listeners = Array.isArray(listeners) ? listeners : [listeners];
            listeners.push(listener);
        } else {
            listeners = listener;
        }
        promise._listeners = listeners;
    }
    // The difference beween setCompleteValue()/setErrorValue() and complete()/error() is that setXXXValue() moves
    // a promise directly to the success/error state without starting another notification pass (because one
    // is already ongoing).
    function setErrorInfo(promise, errorId, isException?) {
        promise._isException = isException || false;
        promise._errorId = errorId;
    }
    function setErrorValue(promise, value, onerrorDetails, context) {
        promise._value = value;
        callonerror(promise, value, onerrorDetails, context);
        promise._setState(state_error);
    }
    function setCompleteValue(promise, value) {
        var targetState;
        if (value && typeof value === "object" && typeof value.then === "function") {
            targetState = state_waiting;
        } else {
            targetState = state_success;
        }
        promise._value = value;
        promise._setState(targetState);
    }
    function then(promise, onComplete, onError, onProgress) {
        var result = new ThenPromise(promise);
        var asyncOpID = WinJS.Utilities._traceAsyncOperationStarting("WinJS.Promise.then");
        pushListener(promise, { promise: result, c: onComplete, e: onError, p: onProgress, asyncOpID: asyncOpID });
        return result;
    }

    //
    // Internal implementation detail promise, ThenPromise is created when a promise needs
    // to be returned from a then() method.
    //
    class ThenPromise<T> extends _PromiseStateMachine<T> {

        static supportedForProcessing = false;

        private _creator = null;

        constructor (creator) {

            super();

            this._creator = creator;
            this._setState(state_created);
            this._run();
        } 

        public _cancelAction() { 
            if (this._creator) { this._creator.cancel(); } 
        }
        public _cleanupAction() { 
            this._creator = null; 
        }
        
    }

    //
    // Slim promise implementations for already completed promises, these are created
    // under the hood on synchronous completion paths as well as by WinJS.Promise.wrap
    // and WinJS.Promise.wrapError.
    //

    class ErrorPromise<T> implements IPromise<T> {
        static supportedForProcessing = false
        private _value;
        private _stack;
        constructor(value, errorFunc = detailsForError) {

            if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.thenPromise))) {
                this._stack = WinJS.Promise._getStack();
            }

            this._value = value;
            callonerror(this, value, errorFunc);
        }
        public cancel() {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.cancel">
            /// <summary locid="WinJS.PromiseStateMachine.cancel">
            /// Attempts to cancel the fulfillment of a promised value. If the promise hasn't
            /// already been fulfilled and cancellation is supported, the promise enters
            /// the error state with a value of Error("Canceled").
            /// </summary>
            /// </signature>
        }
        public done(unused, onError) {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.done">
            /// <summary locid="WinJS.PromiseStateMachine.done">
            /// Allows you to specify the work to be done on the fulfillment of the promised value,
            /// the error handling to be performed if the promise fails to fulfill
            /// a value, and the handling of progress notifications along the way.
            ///
            /// After the handlers have finished executing, this function throws any error that would have been returned
            /// from then() as a promise in the error state.
            /// </summary>
            /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.done_p:onComplete">
            /// The function to be called if the promise is fulfilled successfully with a value.
            /// The fulfilled value is passed as the single argument. If the value is null,
            /// the fulfilled value is returned. The value returned
            /// from the function becomes the fulfilled value of the promise returned by
            /// then(). If an exception is thrown while executing the function, the promise returned
            /// by then() moves into the error state.
            /// </param>
            /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onError">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument. If it is null, the error is forwarded.
            /// The value returned from the function is the fulfilled value of the promise returned by then().
            /// </param>
            /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onProgress">
            /// the function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// </signature>
            var value = this._value;
            if (onError) {
                try {
                    if (!onError.handlesOnError) {
                        callonerror(null, value, detailsForHandledError, this, onError);
                    }
                    var result = onError(value);
                    if (result && typeof result === "object" && typeof result.done === "function") {
                        // If a promise is returned we need to wait on it.
                        result.done();
                    }
                    return;
                } catch (ex) {
                    value = ex;
                }
            }
            if (value instanceof Error && value.message === canceledName) {
                // suppress cancel
                return;
            }
            // force the exception to be thrown asyncronously to avoid any try/catch blocks
            //
            WinJS.Utilities.Scheduler.schedule(function Promise_done_rethrow() {
                throw value;
            }, WinJS.Utilities.Scheduler.Priority.normal, null, "WinJS.Promise._throwException");
        }
        public then(unused, onError) {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.then">
            /// <summary locid="WinJS.PromiseStateMachine.then">
            /// Allows you to specify the work to be done on the fulfillment of the promised value,
            /// the error handling to be performed if the promise fails to fulfill
            /// a value, and the handling of progress notifications along the way.
            /// </summary>
            /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.then_p:onComplete">
            /// The function to be called if the promise is fulfilled successfully with a value.
            /// The value is passed as the single argument. If the value is null, the value is returned.
            /// The value returned from the function becomes the fulfilled value of the promise returned by
            /// then(). If an exception is thrown while this function is being executed, the promise returned
            /// by then() moves into the error state.
            /// </param>
            /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onError">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument. If it is null, the error is forwarded.
            /// The value returned from the function becomes the fulfilled value of the promise returned by then().
            /// </param>
            /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onProgress">
            /// The function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.PromiseStateMachine.then_returnValue">
            /// The promise whose value is the result of executing the complete or
            /// error function.
            /// </returns>
            /// </signature>

            // If the promise is already in a error state and no error handler is provided
            // we optimize by simply returning the promise instead of creating a new one.
            //
            if (!onError) { return this; }
            var result;
            var value = this._value;
            try {
                if (!onError.handlesOnError) {
                    callonerror(null, value, detailsForHandledError, this, onError);
                }
                result = new CompletePromise(onError(value));
            } catch (ex) {
                // If the value throw from the error handler is the same as the value
                // provided to the error handler then there is no need for a new promise.
                //
                if (ex === value) {
                    result = this;
                } else {
                    result = new ExceptionPromise(ex);
                }
            }
            return result;
        }
    }

    class ExceptionPromise<T> extends ErrorPromise<T> {
        static supportedForProcessing = false;
        constructor(value) {
            super(value, detailsForException);
        }
    }

    class CompletePromise<T> implements IPromise<T> {
        static supportedForProcessing = false;
        public _value;
        public _stack;

        constructor(value) {

            if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.thenPromise))) {
                this._stack = WinJS.Promise._getStack();
            }

            if (value && typeof value === "object" && typeof value.then === "function") {
                var result = new ThenPromise(null);
                result._setCompleteValue(value);
                return result;
            }
            this._value = value;
        } 
        public cancel() {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.cancel">
            /// <summary locid="WinJS.PromiseStateMachine.cancel">
            /// Attempts to cancel the fulfillment of a promised value. If the promise hasn't
            /// already been fulfilled and cancellation is supported, the promise enters
            /// the error state with a value of Error("Canceled").
            /// </summary>
            /// </signature>
        }
        public done(onComplete) {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.done">
            /// <summary locid="WinJS.PromiseStateMachine.done">
            /// Allows you to specify the work to be done on the fulfillment of the promised value,
            /// the error handling to be performed if the promise fails to fulfill
            /// a value, and the handling of progress notifications along the way.
            ///
            /// After the handlers have finished executing, this function throws any error that would have been returned
            /// from then() as a promise in the error state.
            /// </summary>
            /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.done_p:onComplete">
            /// The function to be called if the promise is fulfilled successfully with a value.
            /// The fulfilled value is passed as the single argument. If the value is null,
            /// the fulfilled value is returned. The value returned
            /// from the function becomes the fulfilled value of the promise returned by
            /// then(). If an exception is thrown while executing the function, the promise returned
            /// by then() moves into the error state.
            /// </param>
            /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onError">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument. If it is null, the error is forwarded.
            /// The value returned from the function is the fulfilled value of the promise returned by then().
            /// </param>
            /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onProgress">
            /// the function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// </signature>
            if (!onComplete) { return; }
            try {
                var result = onComplete(this._value);
                if (result && typeof result === "object" && typeof result.done === "function") {
                    result.done();
                }
            } catch (ex) {
                // force the exception to be thrown asynchronously to avoid any try/catch blocks
                WinJS.Utilities.Scheduler.schedule(function Promise_done_rethrow() {
                    throw ex;
                }, WinJS.Utilities.Scheduler.Priority.normal, null, "WinJS.Promise._throwException");
            }
        }
        public then<U>(onComplete):IPromise<U> {
            /// <signature helpKeyword="WinJS.PromiseStateMachine.then">
            /// <summary locid="WinJS.PromiseStateMachine.then">
            /// Allows you to specify the work to be done on the fulfillment of the promised value,
            /// the error handling to be performed if the promise fails to fulfill
            /// a value, and the handling of progress notifications along the way.
            /// </summary>
            /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.then_p:onComplete">
            /// The function to be called if the promise is fulfilled successfully with a value.
            /// The value is passed as the single argument. If the value is null, the value is returned.
            /// The value returned from the function becomes the fulfilled value of the promise returned by
            /// then(). If an exception is thrown while this function is being executed, the promise returned
            /// by then() moves into the error state.
            /// </param>
            /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onError">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument. If it is null, the error is forwarded.
            /// The value returned from the function becomes the fulfilled value of the promise returned by then().
            /// </param>
            /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onProgress">
            /// The function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.PromiseStateMachine.then_returnValue">
            /// The promise whose value is the result of executing the complete or
            /// error function.
            /// </returns>
            /// </signature>
            try {
                // If the value returned from the completion handler is the same as the value
                // provided to the completion handler then there is no need for a new promise.
                //
                var newValue = onComplete ? onComplete(this._value) : this._value;
                return newValue === this._value ? this : new CompletePromise(newValue);
            } catch (ex) {
                return new ExceptionPromise(ex);
            }
        }
    }

    //
    // Promise is the user-creatable WinJS.Promise object.
    //

    function timeout(timeoutMS) {
        var id;
        return new WinJS.Promise(
            function (c) {
                if (timeoutMS) {
                    id = setTimeout(c, timeoutMS);
                } else {
                    WinJS.Utilities._setImmediate(c);
                }
            },
            function () {
                if (id) {
                    clearTimeout(id);
                }
            }
        );
    }

    function timeoutWithPromise(timeout, promise) {
        var cancelPromise = function () { promise.cancel(); }
        var cancelTimeout = function () { timeout.cancel(); }
        timeout.then(cancelPromise);
        promise.then(cancelTimeout, cancelTimeout);
        return promise;
    }

    var staticCanceledPromise;

    export interface KeyValuePair<K, V> {
        key: K;
        value: V;
    }

    export class Promise<T> extends _PromiseStateMachine<T> {

        private _oncancel = null;

        constructor(init: (c: (result?: T) => void, e: (error?) => void, p: (progress?) => void) => any, oncancel?: Function) {
            /// <signature helpKeyword="WinJS.Promise">
            /// <summary locid="WinJS.Promise">
            /// A promise provides a mechanism to schedule work to be done on a value that
            /// has not yet been computed. It is a convenient abstraction for managing
            /// interactions with asynchronous APIs.
            /// </summary>
            /// <param name="init" type="Function" locid="WinJS.Promise_p:init">
            /// The function that is called during construction of the  promise. The function
            /// is given three arguments (complete, error, progress). Inside this function
            /// you should add event listeners for the notifications supported by this value.
            /// </param>
            /// <param name="oncancel" optional="true" locid="WinJS.Promise_p:oncancel">
            /// The function to call if a consumer of this promise wants
            /// to cancel its undone work. Promises are not required to
            /// support cancellation.
            /// </param>
            /// </signature>

            super();

            this._oncancel = oncancel;
            this._setState(state_created);
            this._run();

            try {
                var complete = this._completed.bind(this);
                var error = this._error.bind(this);
                var progress = this._progress.bind(this);
                init(complete, error, progress);
            } catch (ex) {
                this._setExceptionValue(ex);
            }
        }

        public _cancelAction() {
            if (this._oncancel) {
                try { this._oncancel(); } catch (ex) { }
            }
        }

        public _cleanupAction() { 
            this._oncancel = null; 
        }
         
        static addEventListener(eventType: "error", listener: (e: CustomEvent) => any, capture?:boolean);
        static addEventListener(eventType: string, listener: (e: CustomEvent) => any, capture?:boolean);
        static addEventListener(eventType: string, listener: (e: CustomEvent) => any, capture?:boolean) {
            /// <signature helpKeyword="WinJS.Promise.addEventListener">
            /// <summary locid="WinJS.Promise.addEventListener">
            /// Adds an event listener to the control.
            /// </summary>
            /// <param name="eventType" locid="WinJS.Promise.addEventListener_p:eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Promise.addEventListener_p:listener">
            /// The listener to invoke when the event is raised.
            /// </param>
            /// <param name="capture" locid="WinJS.Promise.addEventListener_p:capture">
            /// Specifies whether or not to initiate capture.
            /// </param>
            /// </signature>
            promiseEventListeners.addEventListener(eventType, listener, capture);
        }
        static any<T>(values: Promise<T>[]): IPromise<KeyValuePair<string, IPromise<T>>> {
            /// <signature helpKeyword="WinJS.Promise.any">
            /// <summary locid="WinJS.Promise.any">
            /// Returns a promise that is fulfilled when one of the input promises
            /// has been fulfilled.
            /// </summary>
            /// <param name="values" type="Array" locid="WinJS.Promise.any_p:values">
            /// An array that contains promise objects or objects whose property
            /// values include promise objects.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.any_returnValue">
            /// A promise that on fulfillment yields the value of the input (complete or error).
            /// </returns>
            /// </signature>
            return new Promise(
                function (complete, error, progress) {
                    var keys = Object.keys(values);
                    var errors = Array.isArray(values) ? [] : {};
                    if (keys.length === 0) {
                        complete();
                    }
                    var canceled = 0;
                    keys.forEach(function (key) {
                        Promise.as(values[key]).then(
                            function () { complete({ key: key, value: values[key] }); },
                            function (e) {
                                if (e instanceof Error && e.name === canceledName) {
                                    if ((++canceled) === keys.length) {
                                        complete(WinJS.Promise.cancel);
                                    }
                                    return;
                                }
                                error({ key: key, value: values[key] });
                            }
                        );
                    });
                },
                function () {
                    var keys = Object.keys(values);
                    keys.forEach(function (key) {
                        var promise = Promise.as(values[key]);
                        if (typeof promise.cancel === "function") {
                            promise.cancel();
                        }
                    });
                }
            );
        }
        static as<T>(value?: T): IPromise<T>;
        static as<P>(value?: Promise<P>): IPromise<P> {
            /// <signature helpKeyword="WinJS.Promise.as">
            /// <summary locid="WinJS.Promise.as">
            /// Returns a promise. If the object is already a promise it is returned;
            /// otherwise the object is wrapped in a promise.
            /// </summary>
            /// <param name="value" locid="WinJS.Promise.as_p:value">
            /// The value to be treated as a promise.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.as_returnValue">
            /// A promise.
            /// </returns>
            /// </signature>
            if (value && typeof value === "object" && typeof value.then === "function") {
                return value;
            }
            return new (<any>CompletePromise)(value);
        }
        /// <field type="WinJS.Promise" helpKeyword="WinJS.Promise.cancel" locid="WinJS.Promise.cancel">
        /// Canceled promise value, can be returned from a promise completion handler
        /// to indicate cancelation of the promise chain.
        /// </field>
        static get cancel():IPromise<any> {
            return (staticCanceledPromise = staticCanceledPromise || new ErrorPromise(new WinJS.ErrorFromName(canceledName)));
            
        }

        static dispatchEvent(eventType: "error", details);
        static dispatchEvent(eventType: string, details);
        static dispatchEvent(eventType: string, details) {
            /// <signature helpKeyword="WinJS.Promise.dispatchEvent">
            /// <summary locid="WinJS.Promise.dispatchEvent">
            /// Raises an event of the specified type and properties.
            /// </summary>
            /// <param name="eventType" locid="WinJS.Promise.dispatchEvent_p:eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name="details" locid="WinJS.Promise.dispatchEvent_p:details">
            /// The set of additional properties to be attached to the event object.
            /// </param>
            /// <returns type="Boolean" locid="WinJS.Promise.dispatchEvent_returnValue">
            /// Specifies whether preventDefault was called on the event.
            /// </returns>
            /// </signature>
            return promiseEventListeners.dispatchEvent(eventType, details);
        }
        static is(value:any):boolean {
            /// <signature helpKeyword="WinJS.Promise.is">
            /// <summary locid="WinJS.Promise.is">
            /// Determines whether a value fulfills the promise contract.
            /// </summary>
            /// <param name="value" locid="WinJS.Promise.is_p:value">
            /// A value that may be a promise.
            /// </param>
            /// <returns type="Boolean" locid="WinJS.Promise.is_returnValue">
            /// true if the specified value is a promise, otherwise false.
            /// </returns>
            /// </signature>
            return value && typeof value === "object" && typeof value.then === "function";
        }

        static join<T>(values: Promise<T>[]): IPromise<T[]>;
        static join<T>(values: { [keys: string]: IPromise<T> }): IPromise<{ [keys: string]: T }>;
        static join(values: any): IPromise<any> {
            /// <signature helpKeyword="WinJS.Promise.join">
            /// <summary locid="WinJS.Promise.join">
            /// Creates a promise that is fulfilled when all the values are fulfilled.
            /// </summary>
            /// <param name="values" type="Object" locid="WinJS.Promise.join_p:values">
            /// An object whose fields contain values, some of which may be promises.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.join_returnValue">
            /// A promise whose value is an object with the same field names as those of the object in the values parameter, where
            /// each field value is the fulfilled value of a promise.
            /// </returns>
            /// </signature>
            return new Promise(
                function (complete, error, progress) {
                    var keys = Object.keys(values);
                    var errors = Array.isArray(values) ? [] : {};
                    var results = Array.isArray(values) ? [] : {};
                    var undefineds = 0;
                    var pending = keys.length;
                    var argDone = function (key) {
                        if ((--pending) === 0) {
                            var errorCount = Object.keys(errors).length;
                            if (errorCount === 0) {
                                complete(results);
                            } else {
                                var canceledCount = 0;
                                keys.forEach(function (key) {
                                    var e = errors[key];
                                    if (e instanceof Error && e.name === canceledName) {
                                        canceledCount++;
                                    }
                                });
                                if (canceledCount === errorCount) {
                                    complete(WinJS.Promise.cancel);
                                } else {
                                    error(errors);
                                }
                            }
                        } else {
                            progress({ Key: key, Done: true });
                        }
                    };
                    keys.forEach(function (key) {
                        var value = values[key];
                        if (value === undefined) {
                            undefineds++;
                        } else {
                            Promise.as(value).then(
                                function (value) { results[key] = value; argDone(key); },
                                function (value) { errors[key] = value; argDone(key); }
                            );
                        }
                    });
                    pending -= undefineds;
                    if (pending === 0) {
                        complete(results);
                        return;
                    }
                },
                function () {
                    Object.keys(values).forEach(function (key) {
                        var promise = Promise.as(values[key]);
                        if (typeof promise.cancel === "function") {
                            promise.cancel();
                        }
                    });
                }
            );
        }

        static removeEventListener(eventType: "error", listener: (e: CustomEvent) => any, capture: boolean);
        static removeEventListener(eventType: string, listener: (e: CustomEvent) => any, capture: boolean);
        static removeEventListener(eventType: string, listener: (e: CustomEvent) => any, capture: boolean) {
            /// <signature helpKeyword="WinJS.Promise.removeEventListener">
            /// <summary locid="WinJS.Promise.removeEventListener">
            /// Removes an event listener from the control.
            /// </summary>
            /// <param name='eventType' locid="WinJS.Promise.removeEventListener_eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name='listener' locid="WinJS.Promise.removeEventListener_listener">
            /// The listener to remove.
            /// </param>
            /// <param name='capture' locid="WinJS.Promise.removeEventListener_capture">
            /// Specifies whether or not to initiate capture.
            /// </param>
            /// </signature>
            promiseEventListeners.removeEventListener(eventType, listener, capture);
        }

        static supportedForProcessing = false;

        static then<T>(value:any, onComplete: (result: T) => any, onError: (error:any) => any, onProgress: (progress:any) => any):IPromise<T> {
            /// <signature helpKeyword="WinJS.Promise.then">
            /// <summary locid="WinJS.Promise.then">
            /// A static version of the promise instance method then().
            /// </summary>
            /// <param name="value" locid="WinJS.Promise.then_p:value">
            /// the value to be treated as a promise.
            /// </param>
            /// <param name="onComplete" type="Function" locid="WinJS.Promise.then_p:complete">
            /// The function to be called if the promise is fulfilled with a value.
            /// If it is null, the promise simply
            /// returns the value. The value is passed as the single argument.
            /// </param>
            /// <param name="onError" type="Function" optional="true" locid="WinJS.Promise.then_p:error">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument.
            /// </param>
            /// <param name="onProgress" type="Function" optional="true" locid="WinJS.Promise.then_p:progress">
            /// The function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.then_returnValue">
            /// A promise whose value is the result of executing the provided complete function.
            /// </returns>
            /// </signature>
            return Promise.as(value).then(onComplete, onError, onProgress);
        }

        static thenEach<T>(values: IPromise<T>[], onComplete: (result: T) => any, onError?: (error) => any, onProgress?: (progress?) => any): IPromise<T[]>;
        static thenEach<T>(values: { [keys: string]: IPromise<T> }, onComplete: (result: any) => any, onError?: (error) => any, onProgress?: (progress?) => any): IPromise<{ [keys: string]: T }>;
        static thenEach<T>(values: any, onComplete: (result: T) => any, onError?: (error) => any, onProgress?: (progress?) => any): IPromise<any> {
            /// <signature helpKeyword="WinJS.Promise.thenEach">
            /// <summary locid="WinJS.Promise.thenEach">
            /// Performs an operation on all the input promises and returns a promise
            /// that has the shape of the input and contains the result of the operation
            /// that has been performed on each input.
            /// </summary>
            /// <param name="values" locid="WinJS.Promise.thenEach_p:values">
            /// A set of values (which could be either an array or an object) of which some or all are promises.
            /// </param>
            /// <param name="onComplete" type="Function" locid="WinJS.Promise.thenEach_p:complete">
            /// The function to be called if the promise is fulfilled with a value.
            /// If the value is null, the promise returns the value.
            /// The value is passed as the single argument.
            /// </param>
            /// <param name="onError" type="Function" optional="true" locid="WinJS.Promise.thenEach_p:error">
            /// The function to be called if the promise is fulfilled with an error. The error
            /// is passed as the single argument.
            /// </param>
            /// <param name="onProgress" type="Function" optional="true" locid="WinJS.Promise.thenEach_p:progress">
            /// The function to be called if the promise reports progress. Data about the progress
            /// is passed as the single argument. Promises are not required to support
            /// progress.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.thenEach_returnValue">
            /// A promise that is the result of calling Promise.join on the values parameter.
            /// </returns>
            /// </signature>
            var result:any = Array.isArray(values) ? [] : {};
            Object.keys(values).forEach(function (key) {
                result[key] = Promise.as(values[key]).then(onComplete, onError, onProgress);
            });
            return Promise.join(result);
        }

        static timeout<T>(time: number, promise: IPromise<T>): IPromise<T>;
        static timeout(time: number, promise?: IPromise<any>): IPromise<any> {
            /// <signature helpKeyword="WinJS.Promise.timeout">
            /// <summary locid="WinJS.Promise.timeout">
            /// Creates a promise that is fulfilled after a timeout.
            /// </summary>
            /// <param name="timeout" type="Number" optional="true" locid="WinJS.Promise.timeout_p:timeout">
            /// The timeout period in milliseconds. If this value is zero or not specified
            /// setImmediate is called, otherwise setTimeout is called.
            /// </param>
            /// <param name="promise" type="Promise" optional="true" locid="WinJS.Promise.timeout_p:promise">
            /// A promise that will be canceled if it doesn't complete before the
            /// timeout has expired.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.timeout_returnValue">
            /// A promise that is completed asynchronously after the specified timeout.
            /// </returns>
            /// </signature>
            var to = timeout(time);
            return promise ? timeoutWithPromise(to, promise) : to;
        }

        static wrap<T>(value?: IPromise<T>): IPromise<T>;
        static wrap<T>(value?: T): IPromise<T>;
        static wrap<T>(value?:any): IPromise<T> {
            /// <signature helpKeyword="WinJS.Promise.wrap">
            /// <summary locid="WinJS.Promise.wrap">
            /// Wraps a non-promise value in a promise. You can use this function if you need
            /// to pass a value to a function that requires a promise.
            /// </summary>
            /// <param name="value" locid="WinJS.Promise.wrap_p:value">
            /// Some non-promise value to be wrapped in a promise.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.wrap_returnValue">
            /// A promise that is successfully fulfilled with the specified value
            /// </returns>
            /// </signature>
            return new (<any>CompletePromise)(value);
        }
        static wrapError(error?: any): IPromise<any> {
            /// <signature helpKeyword="WinJS.Promise.wrapError">
            /// <summary locid="WinJS.Promise.wrapError">
            /// Wraps a non-promise error value in a promise. You can use this function if you need
            /// to pass an error to a function that requires a promise.
            /// </summary>
            /// <param name="error" locid="WinJS.Promise.wrapError_p:error">
            /// A non-promise error value to be wrapped in a promise.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Promise.wrapError_returnValue">
            /// A promise that is in an error state with the specified value.
            /// </returns>
            /// </signature>
            return new ErrorPromise(error);
        }

        private static get _veryExpensiveTagWithStack() { 
            return tagWithStack; 
        }
        private static set _veryExpensiveTagWithStack(value) { 
            tagWithStack = value;
        }
        private static _veryExpensiveTagWithStack_tag = tag;

        public static _getStack() {
            if (global.Debug && Debug.debuggerEnabled) {
                try { throw new Error(); } catch (e) { return e.stack; }
            }
        }

        public static _cancelBlocker(input) {
            //
            // Returns a promise which on cancelation will still result in downstream cancelation while
            //  protecting the promise 'input' from being  canceled which has the effect of allowing 
            //  'input' to be shared amoung various consumers.
            //
            if (!Promise.is(input)) {
                return Promise.wrap(input);
            }
            var complete;
            var error;
            var output = new WinJS.Promise<any>(
                function (c, e, p) {
                    complete = c;
                    error = e;
                },
                function () {
                    complete = null;
                    error = null;
                }
            );
            input.then(
                function (v) { complete && complete(v); },
                function (e) { error && error(e); }
            );
            return output;
        }

        public onerror: (e: CustomEvent) => any;
    }
    Object.defineProperties(Promise, WinJS.Utilities.createEventProperties(errorET));

    export class _SignalPromise<T> extends _PromiseStateMachine<T> {
        static supportedForProcessing = false;

        private _oncancel;

        constructor(cancel) {
            super();
            this._oncancel = cancel;
            this._setState(state_created);
            this._run();
        }
        public _cancelAction() { 
            this._oncancel && this._oncancel(); 
        }
        public _cleanupAction() { 
            this._oncancel = null; 
        }

    }

    export class _Signal<T> {
        static supportedForProcessing = false;
        private _promise:_SignalPromise<T>;

        constructor(oncancel) {
            this._promise = new _SignalPromise<T>(oncancel);
        }
        public get promise() { 
            return this._promise; 
        }

        public cancel() {
            this._promise.cancel();
        }

        public complete(value) {
            this._promise._completed(value);
        }
        public error(value) {
            this._promise._error(value);
        }
        public progress(value) {
            this._promise._progress(value);
        }

    }

}