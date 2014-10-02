// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />


declare var Debug;

module CorsicaTests {

    "use strict";

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

    export class AsyncCausalityChain {

        OperationStarting: any[];
        OperationCompleted: any[];
        CallbackStarting: any[];
        CallbackCompleted: any[];
        realTraceAsyncOperationStarting;
        realTraceAsyncOperationCompleted;
        realTraceAsyncCallbackStarting;
        realTraceAsyncCallbackCompleted;

        setUp() {
            this.OperationStarting = [];
            this.OperationCompleted = [];
            this.CallbackStarting = [];
            this.CallbackCompleted = [];
            this.realTraceAsyncOperationStarting = WinJS.Utilities._traceAsyncOperationStarting;
            this.realTraceAsyncOperationCompleted = WinJS.Utilities._traceAsyncOperationCompleted;
            this.realTraceAsyncCallbackStarting = WinJS.Utilities._traceAsyncCallbackStarting;
            this.realTraceAsyncCallbackCompleted = WinJS.Utilities._traceAsyncCallbackCompleted;

            WinJS.Utilities._require(['WinJS/Core/_Trace'], (_Trace) => {

                _Trace._traceAsyncOperationStarting = (name) => {
                    this.OperationStarting.push({ id: this.OperationStarting.length, name: name });
                    return this.OperationStarting.length - 1;
                };
                _Trace._traceAsyncOperationCompleted = (id, status)  => {
                    this.OperationCompleted.push({ id: id, status: status });
                };
                _Trace._traceAsyncCallbackStarting = (id) => {
                    this.CallbackStarting.push({ id: id });
                };
                _Trace._traceAsyncCallbackCompleted = () => {
                    this.CallbackCompleted.push({});
                };
            });
        }

        tearDown() {

            WinJS.Utilities._require(['WinJS/Core/_Trace'], (_Trace)  => {
                _Trace._traceAsyncOperationStarting = this.realTraceAsyncOperationStarting;
                _Trace._traceAsyncOperationCompleted = this.realTraceAsyncOperationCompleted;
                _Trace._traceAsyncCallbackStarting = this.realTraceAsyncCallbackStarting;
                _Trace._traceAsyncCallbackCompleted = this.realTraceAsyncCallbackCompleted;
            });
        }

        verify(expected) {
            if (expected.opStartingCount !== undefined && expected.opStartingCount >= 0) {
                LiveUnit.Assert.areEqual(expected.opStartingCount, this.OperationStarting.length);
            }
            if (expected.opCompletedCount !== undefined && expected.opCompletedCount >= 0) {
                LiveUnit.Assert.areEqual(expected.opCompletedCount, this.OperationCompleted.length);
            }
            if (expected.callbackStartingCount !== undefined && expected.callbackStartingCount >= 0) {
                LiveUnit.Assert.areEqual(expected.callbackStartingCount, this.CallbackStarting.length);
            }
            if (expected.callbackCompletedCount !== undefined && expected.callbackCompletedCount >= 0) {
                LiveUnit.Assert.areEqual(expected.callbackCompletedCount, this.CallbackCompleted.length);
            }
        }

        testSchedulerSchedule(complete) {
            var job = WinJS.Utilities.Scheduler.schedule((jobInfo) => {
                this.verify({
                    opStartingCount: 1,
                    opCompletedCount: 0,
                    callbackStartingCount: 1
                });
                LiveUnit.Assert.areEqual(0, this.CallbackStarting[0].id);

                WinJS.Utilities._setImmediate(() => {
                    this.verify({
                        opStartingCount: 1,
                        opCompletedCount: 1,
                        callbackStartingCount: 1,
                        callbackCompletedCount: 1
                    });
                    LiveUnit.Assert.areEqual(0, this.OperationCompleted[0].id);
                    LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_SUCCESS, this.OperationCompleted[0].status);
                    complete();
                });
            });
            this.verify({
                opStartingCount: 1
            });
            LiveUnit.Assert.areEqual("WinJS.Utilities.Scheduler.schedule: " + job.id, this.OperationStarting[0].name)
    }

        testSchedulerCancel() {
            var job = WinJS.Utilities.Scheduler.schedule(function (jobInfo) {
            });

            this.verify({
                opStartingCount: 1
            });
            job.cancel();
            this.verify({
                opStartingCount: 1,
                opCompletedCount: 1
            });
            LiveUnit.Assert.areEqual((<any>job)._asyncOpID, this.OperationCompleted[0].id);
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_CANCELED, this.OperationCompleted[0].status);
        }

        testPromiseThen(complete) {
        var p = new WinJS.Promise(function (c, e, p) {
            WinJS.Utilities._setImmediate(c);
        });

        p.then(() => {
            this.verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1
            });
            LiveUnit.Assert.areEqual("WinJS.Promise.then", this.OperationStarting[0].name)
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_SUCCESS, this.OperationCompleted[0].status);
            LiveUnit.Assert.areEqual(0, this.OperationCompleted[0].id);
            LiveUnit.Assert.areEqual(0, this.CallbackStarting[0].id);
        });

        this.verify({
            opStartingCount: 1
        });
        WinJS.Utilities._setImmediate(() => {
            this.verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1,
                callbackCompletedCount: 1
            });
            complete();
        });
    }

    testPromiseInitError(complete) {
        initUnhandledErrors();

        var p = new WinJS.Promise(function (c, e, p) {
            WinJS.Utilities._setImmediate(e);
        });

        p.then(null, () => {
            this.verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1
            });
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_ERROR, this.OperationCompleted[0].status);
            LiveUnit.Assert.areEqual(0, this.OperationCompleted[0].id);
            LiveUnit.Assert.areEqual(0, this.CallbackStarting[0].id);
        });

        this.verify({
            opStartingCount: 1
        });
        WinJS.Utilities._setImmediate(() => {
            this.verify({
                opStartingCount: 1,
                opCompletedCount: 1,
                callbackStartingCount: 1,
                callbackCompletedCount: 1
            });
            validateUnhandledErrors();
            complete();
        });
    }

    testPromiseCancel(complete) {
        var p = new WinJS.Promise(function (c, e, p) {
            WinJS.Utilities._setImmediate(c);
        });

        p.then(null, function () { });

        this.verify({
            opStartingCount: 1
        });
        p.cancel();
        WinJS.Utilities._setImmediate(() => {
            this.verify({
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
    }

    testSchedulerJobWithYield(complete) {
        var that = this;
        var i = 0;
        var jobCompleted = null;
        var p = new WinJS.Promise(function (c) {
            jobCompleted = c;
        });

        var work = (jobInfo) => {
            this.verify({
                opCompletedCount: 0,
                callbackStartingCount: 1 + i,
                callbackCompletedCount: 0 + i
            });
            if (i++ < 3) {
                jobInfo.setWork(work);
            } else {
                jobCompleted();
            }
        };

        var job = WinJS.Utilities.Scheduler.schedule(work);

        p.then(function () {
            LiveUnit.Assert.areEqual(1, that.OperationCompleted.length);
            LiveUnit.Assert.areEqual(Debug.MS_ASYNC_OP_STATUS_SUCCESS, that.OperationCompleted[0].status);
            complete();
        });
    }
};

}

if ((<any>window).Debug && Debug.msTraceAsyncCallbackStarting) {
    LiveUnit.registerTestClass("CorsicaTests.AsyncCausalityChain");
}