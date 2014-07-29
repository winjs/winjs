// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.AsyncCausalityChain = function () {
    var self = this;
    var lvUnhandledErrors = {};

    function errorEventHandler(evt) {
        var details = evt.detail;
        var id = details.id;
        if (!details.parent) {
            lvUnhandledErrors[id] = details;
        } else if (details.handler) {
            delete lvUnhandledErrors[id];
        }
    }

    function initUnhandledErrors() {
        lvUnhandledErrors = {};
        WinJS.Promise.addEventListener("error", errorEventHandler);
    }

    function validateUnhandledErrors() {
        WinJS.Promise.removeEventListener("error", errorEventHandler);
        LiveUnit.Assert.areEqual(0, Object.keys(lvUnhandledErrors).length, "Unhandled errors found");
    }

    this.setUp = function () {
        self.OperationStarting = [];
        self.OperationCompleted = [];
        self.CallbackStarting = [];
        self.CallbackCompleted = [];
        self.realTraceAsyncOperationStarting = WinJS.Utilities._traceAsyncOperationStarting;
        self.realTraceAsyncOperationCompleted = WinJS.Utilities._traceAsyncOperationCompleted;
        self.realTraceAsyncCallbackStarting = WinJS.Utilities._traceAsyncCallbackStarting;
        self.realTraceAsyncCallbackCompleted = WinJS.Utilities._traceAsyncCallbackCompleted;

        WinJS.Utilities._require(['WinJS/Core/_Trace'], function(_Trace) {

            _Trace._traceAsyncOperationStarting = function (name) {
                self.OperationStarting.push({ id: self.OperationStarting.length, name: name });
                return self.OperationStarting.length - 1;
            };
            _Trace._traceAsyncOperationCompleted = function (id, status) {
                self.OperationCompleted.push({ id: id, status: status });
            };
            _Trace._traceAsyncCallbackStarting = function (id) {
                self.CallbackStarting.push({ id: id });
            };
            _Trace._traceAsyncCallbackCompleted = function () {
                self.CallbackCompleted.push({});
            };
        });
    };

    this.tearDown = function () {

        WinJS.Utilities._require(['WinJS/Core/_Trace'], function(_Trace) {
            _Trace._traceAsyncOperationStarting = self.realTraceAsyncOperationStarting;
            _Trace._traceAsyncOperationCompleted = self.realTraceAsyncOperationCompleted;
            _Trace._traceAsyncCallbackStarting = self.realTraceAsyncCallbackStarting;
            _Trace._traceAsyncCallbackCompleted = self.realTraceAsyncCallbackCompleted;
        });
    };

    function verify(expected) {
        if (expected.opStartingCount !== undefined && expected.opStartingCount >= 0) {
            LiveUnit.Assert.areEqual(expected.opStartingCount, self.OperationStarting.length);
        }
        if (expected.opCompletedCount !== undefined && expected.opCompletedCount >= 0) {
            LiveUnit.Assert.areEqual(expected.opCompletedCount, self.OperationCompleted.length);
        }
        if (expected.callbackStartingCount !== undefined && expected.callbackStartingCount >= 0) {
            LiveUnit.Assert.areEqual(expected.callbackStartingCount, self.CallbackStarting.length);
        }
        if (expected.callbackCompletedCount !== undefined && expected.callbackCompletedCount >= 0) {
            LiveUnit.Assert.areEqual(expected.callbackCompletedCount, self.CallbackCompleted.length);
        }
    }

    this.testSchedulerSchedule = function (complete) {
        var that = this;
        var job = WinJS.Utilities.Scheduler.schedule(function (jobInfo) {
            verify({
                opStartingCount: 1,
                opCompletedCount: 0,
                callbackStartingCount: 1
            });
            LiveUnit.Assert.areEqual(0, that.CallbackStarting[0].id);

            WinJS.Utilities._setImmediate(function () {
                verify({
                    opStartingCount: 1,
                    opCompletedCount: 1,
                    callbackStartingCount: 1,
                    callbackCompletedCount: 1
                });
                LiveUnit.Assert.areEqual(0, that.OperationCompleted[0].id);
                LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_SUCCESS, that.OperationCompleted[0].status);
                complete();
            });
        });
        verify({
            opStartingCount: 1
        });
        LiveUnit.Assert.areEqual("WinJS.Utilities.Scheduler.schedule: " + job.id, this.OperationStarting[0].name)
    };

    this.testSchedulerCancel = function () {
        var job = WinJS.Utilities.Scheduler.schedule(function (jobInfo) {
        });

        verify({
            opStartingCount: 1
        });
        job.cancel();
        verify({
            opStartingCount: 1,
            opCompletedCount: 1
        });
        LiveUnit.Assert.areEqual(job._asyncOpID, this.OperationCompleted[0].id);
        LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_CANCELED, this.OperationCompleted[0].status);
    };

    this.testPromiseThen = function (complete) {
        var p = new WinJS.Promise(function (c, e, p) {
            WinJS.Utilities._setImmediate(c);
        });

        var that = this;
        p.then(function () {
            verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1
            });
            LiveUnit.Assert.areEqual("WinJS.Promise.then", that.OperationStarting[0].name)
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_SUCCESS, that.OperationCompleted[0].status);
            LiveUnit.Assert.areEqual(0, that.OperationCompleted[0].id);
            LiveUnit.Assert.areEqual(0, that.CallbackStarting[0].id);
        });

        verify({
            opStartingCount: 1
        });
        WinJS.Utilities._setImmediate(function () {
            verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1,
                callbackCompletedCount: 1
            });
            complete();
        });
    };

    this.testPromiseInitError = function (complete) {
        initUnhandledErrors();

        var that = this;

        var p = new WinJS.Promise(function (c, e, p) {
            WinJS.Utilities._setImmediate(e);
        });

        p.then(null, function () {
            verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1
            });
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_ERROR, that.OperationCompleted[0].status);
            LiveUnit.Assert.areEqual(0, that.OperationCompleted[0].id);
            LiveUnit.Assert.areEqual(0, that.CallbackStarting[0].id);
        });

        verify({
            opStartingCount: 1
        });
        WinJS.Utilities._setImmediate(function () {
            verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1,
                callbackCompletedCount: 1
            });
            validateUnhandledErrors();
            complete();
        });
    };

    this.testPromiseCancel = function (complete) {
        var p = new WinJS.Promise(function (c, e, p) {
            WinJS.Utilities._setImmediate(c);
        });

        p.then(null, function () { });

        verify({
            opStartingCount: 1
        });
        p.cancel();
        WinJS.Utilities._setImmediate(function () {
            verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1,
                callbackCompletedCount: 1
            });
            complete();
        });
        LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_CANCELED, this.OperationCompleted[0].status);
        LiveUnit.Assert.areEqual(0, this.OperationCompleted[0].id);
        LiveUnit.Assert.areEqual(0, this.CallbackStarting[0].id);
    };

    this.testSchedulerJobWithYield = function (complete) {
        var that = this;
        var i = 0;
        var jobCompleted = null;
        var p = new WinJS.Promise(function (c) {
            jobCompleted = c;
        });

        var job = WinJS.Utilities.Scheduler.schedule(function work(jobInfo) {
            verify({
                opCompletedCount: 0,
                callbackStartingCount: 1 + i,
                callbackCompletedCount: 0 + i
            });
            if (i++ < 3) {
                jobInfo.setWork(work);
            } else {
                jobCompleted();
            }
        });

        p.then(function () {
            LiveUnit.Assert.areEqual(1, that.OperationCompleted.length);
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_SUCCESS, that.OperationCompleted[0].status);
            complete();
        });
    };
};

if (window.Debug && Debug.msTraceAsyncCallbackStarting) {
    LiveUnit.registerTestClass("CorsicaTests.AsyncCausalityChain");
}