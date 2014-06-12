// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    './Core/_Base',
    './Promise/_StateMachine'
    ], function signalInit(_Base, _StateMachine) {
    "use strict";

    var SignalPromise = _Base.Class.derive(_StateMachine.PromiseStateMachine,
        function (cancel) {
            this._oncancel = cancel;
            this._setState(_StateMachine.state_created);
            this._run();
        }, {
            _cancelAction: function () { this._oncancel && this._oncancel(); },
            _cleanupAction: function () { this._oncancel = null; }
        }, {
            supportedForProcessing: false
        }
    );

    var Signal = _Base.Class.define(
        function Signal_ctor(oncancel) {
            this._promise = new SignalPromise(oncancel);
        }, {
            promise: {
                get: function () { return this._promise; }
            },

            cancel: function Signal_cancel() {
                this._promise.cancel();
            },
            complete: function Signal_complete(value) {
                this._promise._completed(value);
            },
            error: function Signal_error(value) {
                this._promise._error(value);
            },
            progress: function Signal_progress(value) {
                this._promise._progress(value);
            }
        }, {
            supportedForProcessing: false,
        }
    );

    _Base.Namespace.define("WinJS", {
        _Signal: Signal
    });

    return Signal;
});