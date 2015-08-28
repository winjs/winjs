// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/Helper.ts" />

module WinJSTests {

    "use strict";

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    function post(v?) {
        return WinJS.Promise.timeout().
            then(function () { return v; });
    }

    // Posts using the same technique as "runNext"
    //
    function schedule(v) {
        return new WinJS.Promise(function (c) {
            WinJS.Utilities.Scheduler.schedule(function () {
                c(v);
            }, WinJS.Utilities.Scheduler.Priority.normal);
        });
    }

    export class ParallelWorkQueueTests {

        testSimpleQueue() {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(1);
            function push(v) {
                return function () { return WinJS.Promise.wrap().then(function () { log.push(v); }) };
            };
            q.queue(push(1));
            q.queue(push(2));
            q.queue(push(3));
            q.queue(push(4));
            LiveUnit.Assert.areEqual(1, log[0]);
            LiveUnit.Assert.areEqual(2, log[1]);
            LiveUnit.Assert.areEqual(3, log[2]);
            LiveUnit.Assert.areEqual(4, log[3]);
            LiveUnit.Assert.areEqual(4, log.length);
        }

        testSimpleAsyncQueueSort1(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(1);
            function push(v) {
                return function () { return post().then(function () { log.push(v); }) };
            };
            q.queue(push(1), 1);
            q.queue(push(2), 2);
            q.queue(push(3), 3);
            q.queue(push(4), 4);

            q.sort(function (a, b) { return b - a; });

            post().
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(1, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(4, log[1]);
                    LiveUnit.Assert.areEqual(2, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(4, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(3, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(4, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(2, log[3]);
                    LiveUnit.Assert.areEqual(4, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testSimpleAsyncQueue1(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(1);
            function push(v) {
                return function () { return post().then(function () { log.push(v); }) };
            };
            q.queue(push(1));
            q.queue(push(2));
            q.queue(push(3));
            q.queue(push(4));
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(1, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(2, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(3, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(4, log[3]);
                    LiveUnit.Assert.areEqual(4, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testSimpleAsyncQueue2(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(2);
            function push(v) {
                return function () { return post().then(function () { log.push(v); }) };
            };
            q.queue(push(1));
            q.queue(push(2));
            q.queue(push(3));
            q.queue(push(4));
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(2, log.length);
                }).
                then(schedule). // double post is for the async "runNext" that happens when a
                then(post).     // work item doesn't complete synchronously
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(4, log[3]);
                    LiveUnit.Assert.areEqual(4, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testSimpleAsyncQueue6(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(6);
            function push(v) {
                return function () { return post().then(function () { log.push(v); }) };
            };
            q.queue(push(1));
            q.queue(push(2));
            q.queue(push(3));
            q.queue(push(4));
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(4, log[3]);
                    LiveUnit.Assert.areEqual(4, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testReturnValue(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(6);
            function push(v) {
                return function () { return post().then(function () { log.push(v); return v; }) };
            };
            q.queue(push(1)).then(function (v) { LiveUnit.Assert.areEqual(1, v); });
            q.queue(push(2)).then(function (v) { LiveUnit.Assert.areEqual(2, v); });
            q.queue(push(3)).then(function (v) { LiveUnit.Assert.areEqual(3, v); });
            q.queue(push(4)).then(function (v) { LiveUnit.Assert.areEqual(4, v); });
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(4, log[3]);
                    LiveUnit.Assert.areEqual(4, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testErrorValue(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(6);
            function push(v) {
                return function () { return post().then(function () { log.push(v); return WinJS.Promise.wrapError(v); }) };
            };
            q.queue(push(1)).then(function () { LiveUnit.Assert.fail("should have returned an error"); }, function (v) { LiveUnit.Assert.areEqual(1, v); });
            q.queue(push(2)).then(function () { LiveUnit.Assert.fail("should have returned an error"); }, function (v) { LiveUnit.Assert.areEqual(2, v); });
            q.queue(push(3)).then(function () { LiveUnit.Assert.fail("should have returned an error"); }, function (v) { LiveUnit.Assert.areEqual(3, v); });
            q.queue(push(4)).then(function () { LiveUnit.Assert.fail("should have returned an error"); }, function (v) { LiveUnit.Assert.areEqual(4, v); });
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(3, log[2]);
                    LiveUnit.Assert.areEqual(4, log[3]);
                    LiveUnit.Assert.areEqual(4, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testRecursiveChaining(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(6);
            function push(v) {
                return function () {
                    return post().
                        then(function () {
                            log.push(v);
                            if (v > 1) {
                                q.queue(push(v - 1));
                            }
                        });
                };
            };
            q.queue(push(3));
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(3, log[0]);
                    LiveUnit.Assert.areEqual(1, log.length);
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.areEqual(3, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(2, log.length);
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.areEqual(3, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(1, log[2]);
                    LiveUnit.Assert.areEqual(3, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testReentrantChaining(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(6);

            function push(v, post) {
                return function () {
                    return post().
                        then(function () {
                            log.push(v);
                            if (v > 1) {
                                q.queue(push(v - 1, WinJS.Promise.wrap));
                            }
                        });
                };
            };
            q.queue(push(3, post));
            post().
                then(function () {
                    LiveUnit.Assert.areEqual(3, log[0]);
                    LiveUnit.Assert.areEqual(2, log[1]);
                    LiveUnit.Assert.areEqual(1, log[2]);
                    LiveUnit.Assert.areEqual(3, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }

        testQuickCancel6(complete) {
            var log = [];
            var q = new WinJS.UI._ParallelWorkQueue(6);
            function push(v) {
                return function () {
                return post().
                        then(post).
                        then(function () {
                            log.push(v);
                        })
                };
            };
            var a = q.queue(push(1));
            var b = q.queue(push(2));
            var c = q.queue(push(3));
            var d = q.queue(push(4));
            b.cancel();
            d.cancel();

            post().
                then(post).
                then(function () {
                    LiveUnit.Assert.areEqual(1, log[0]);
                    LiveUnit.Assert.areEqual(3, log[1]);
                    LiveUnit.Assert.areEqual(2, log.length);
                }).
                then(null, errorHandler).
                then(complete);
        }
    }
    var disabledTestRegistry = {
        testSimpleAsyncQueue1: Helper.Browsers.android,
		testSimpleAsyncQueue2: Helper.Browsers.android,
		testSimpleAsyncQueue6: Helper.Browsers.android,
		testQuickCancel6: Helper.Browsers.android,
		testRecursiveChaining: Helper.Browsers.android,
		testSimpleAsyncQueueSort1: Helper.Browsers.android
    };
    Helper.disableTests(ParallelWorkQueueTests, disabledTestRegistry);
}

LiveUnit.registerTestClass('WinJSTests.ParallelWorkQueueTests');